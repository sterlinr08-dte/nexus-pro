// Emitir el e-CF de una venta del POS (fase 3). Separado de Deno.serve: las lecturas y escrituras llegan como funciones
// para probarlo con una base y un MSeller simulados.
// Orden (que nada se pierda ni se repita):
//  1) la venta ya tiene respuesta de MSeller → se devuelve tal cual (idempotente, no se reenvía);
//  2) se «reclama» la venta (ecf_enviado_at) para que dos toques a la vez no envíen dos veces;
//  3) se arma el JSON con un número de prueba para validar los datos ANTES de gastar un e-NCF;
//  4) se toma el e-NCF (pos_siguiente_encf, atómico) y se guarda en la venta ANTES de enviarlo;
//  5) se envía. Bien → se guardan QR, código de seguridad y seguimiento. Error 4xx → MSeller no lo registró: queda
//     «Error» con el mismo e-NCF para reintentar sin gastar otro. Error 5xx o sin red → queda «pendiente» y el
//     reintento primero CONSULTA ese e-NCF por si MSeller sí lo recibió.
import { armarEcf, type EmisorEcf, type ItemEcf, type VentaEcf } from "./_doc.ts";

export type VentaFila = VentaEcf & {
  id: string; organizacion_id: string; estado?: string | null; ncf?: string | null; ecf_tipo?: number | null;
  ecf_estado?: string | null; ecf_track_id?: string | null; ecf_security_code?: string | null; ecf_qr_url?: string | null; ecf_firmado?: string | null;
};
export type Deps = {
  leerVenta: (id: string) => Promise<VentaFila | null>;
  leerItems: (id: string) => Promise<ItemEcf[]>;
  leerEmisor: (org: string) => Promise<EmisorEcf | null>;
  vencimiento: (org: string, tipo: string) => Promise<string | null>;
  reclamar: (id: string, libreAntesDe: string) => Promise<boolean>;
  siguienteEncf: (tipo: string) => Promise<string | null>;
  guardar: (id: string, campos: Record<string, unknown>) => Promise<void>;
  cliente: { entorno: string; enviar: (doc: unknown) => Promise<{ status: number; datos: any }>; consultar: (ecf: string) => Promise<{ status: number; datos: any }> };
};
type Resultado = { ok: boolean; status: number; error?: string; [k: string]: unknown };

const salida = (v: Record<string, unknown>) => ({ ncf: v.ncf, ecf_estado: v.ecf_estado, ecf_security_code: v.ecf_security_code, ecf_qr_url: v.ecf_qr_url, ecf_firmado: v.ecf_firmado });
const mensaje = (d: any, st: number) => String(d?.message || d?.error || d?.mensaje || `MSeller respondió ${st}`).slice(0, 400);
// La respuesta del envío o de la consulta (docs «Consulta de documentos»): securityCode, qr_url, internalTrackId, signedDate
function camposRespuesta(d: any, entorno: string, ahoraIso: string) {
  return {
    ecf_entorno: entorno, ecf_security_code: d.securityCode || null, ecf_qr_url: d.qr_url || null,
    ecf_track_id: d.internalTrackId || null, ecf_firmado: d.signedDate || null, ecf_actualizado_at: ahoraIso, ecf_respuesta: d,
  };
}
const ESTADOS = ["En Cola", "Enviado a la DGII", "En Proceso", "Aceptado", "Aceptado Condicional", "Rechazado"];

export async function emitir(p: { ventaId: string; tipo?: number }, deps: Deps, ahora: () => number = Date.now): Promise<Resultado> {
  const iso = () => new Date(ahora()).toISOString();
  const v = await deps.leerVenta(p.ventaId);
  if (!v) return { ok: false, status: 404, error: "Venta no encontrada." };
  if (v.ecf_track_id) return { ok: true, status: 200, ya: true, ...salida(v as Record<string, unknown>) };
  const tipo = Number(v.ecf_tipo || p.tipo); // si ya se le asignó un tipo, ese manda
  if (tipo !== 31 && tipo !== 32) return { ok: false, status: 400, error: "Tipo de factura electrónica inválido (31 o 32)." };
  if (v.ncf && !new RegExp(`^E${tipo}\\d{10}$`).test(String(v.ncf))) return { ok: false, status: 409, error: `Esta venta ya tiene el comprobante ${v.ncf}.` };
  if (v.estado && v.estado !== "completada") return { ok: false, status: 409, error: "La venta no está completada." };
  if (!(await deps.reclamar(v.id, new Date(ahora() - 90_000).toISOString()))) return { ok: false, status: 409, error: "Esta factura ya se está enviando. Espere unos segundos." };
  const soltar = () => deps.guardar(v.id, { ecf_enviado_at: null });

  const [items, emisor, venc] = await Promise.all([deps.leerItems(v.id), deps.leerEmisor(v.organizacion_id), tipo === 31 ? deps.vencimiento(v.organizacion_id, "E31") : Promise.resolve(null)]);
  const armar = (encf: string) => armarEcf({ tipo: tipo as 31 | 32, encf, venta: v, items, emisor: emisor || { rnc: "", razonSocial: "", direccion: "" }, vencimientoSecuencia: venc, ahora });
  try { armar(`E${tipo}0000000000`); } catch (e) { await soltar(); return { ok: false, status: 400, error: (e as Error).message }; }

  let encf = new RegExp(`^E${tipo}\\d{10}$`).test(String(v.ncf || "")) ? String(v.ncf) : "";
  if (encf && v.ecf_estado === "pendiente") {
    // un intento anterior quedó sin respuesta: ¿lo recibió MSeller?
    const c = await deps.cliente.consultar(encf);
    if (c.status < 300 && c.datos?.securityCode) {
      const campos = { ...camposRespuesta(c.datos, deps.cliente.entorno, iso()), ecf_estado: ESTADOS.includes(c.datos.status) ? c.datos.status : "En Cola" };
      await deps.guardar(v.id, campos);
      return { ok: true, status: 200, recuperada: true, ...salida({ ncf: encf, ...campos }) };
    }
  }
  if (!encf) {
    encf = (await deps.siguienteEncf(`E${tipo}`)) || "";
    if (!encf) { await soltar(); return { ok: false, status: 409, error: `No hay números E${tipo} disponibles. Agregue la secuencia autorizada por la DGII en Ajustes.` }; }
    await deps.guardar(v.id, { ncf: encf, ecf_tipo: tipo, ecf_entorno: deps.cliente.entorno, ecf_estado: "pendiente", ecf_respuesta: null });
  }

  let r: { status: number; datos: any };
  try { r = await deps.cliente.enviar(armar(encf)); }
  catch (e) {
    await deps.guardar(v.id, { ecf_estado: "pendiente", ecf_enviado_at: null, ecf_actualizado_at: iso() });
    return { ok: false, status: 502, pendiente: true, ncf: encf, error: "No se pudo hablar con MSeller. La factura quedó pendiente; se puede reintentar." };
  }
  if (r.status < 300 && r.datos?.securityCode) {
    const campos = { ...camposRespuesta(r.datos, deps.cliente.entorno, iso()), ecf_estado: "En Cola" };
    await deps.guardar(v.id, campos);
    return { ok: true, status: 200, ...salida({ ncf: encf, ...campos }) };
  }
  const definitivo = r.status >= 400 && r.status < 500;
  await deps.guardar(v.id, { ecf_estado: definitivo ? "Error" : "pendiente", ecf_respuesta: r.datos, ecf_enviado_at: null, ecf_actualizado_at: iso() });
  return { ok: false, status: definitivo ? 422 : 502, pendiente: !definitivo, ncf: encf, codigo: r.datos?.code || null, error: mensaje(r.datos, r.status) };
}

// Pide a MSeller el estado actual de una venta ya enviada (lo usa el historial; la fase 4 lo hará en lote).
export async function actualizar(ventaId: string, deps: Pick<Deps, "leerVenta" | "guardar" | "cliente">, ahora: () => number = Date.now): Promise<Resultado> {
  const v = await deps.leerVenta(ventaId);
  if (!v || !/^E3[12]\d{10}$/.test(String(v.ncf || ""))) return { ok: false, status: 404, error: "Esta venta no tiene factura electrónica." };
  const c = await deps.cliente.consultar(String(v.ncf));
  if (c.status === 404) return { ok: true, status: 200, ...salida(v as Record<string, unknown>) };
  if (c.status >= 300 || !c.datos) return { ok: false, status: 502, error: mensaje(c.datos, c.status) };
  const campos: Record<string, unknown> = { ecf_actualizado_at: new Date(ahora()).toISOString(), ecf_respuesta: c.datos };
  if (ESTADOS.includes(c.datos.status)) campos.ecf_estado = c.datos.status;
  if (c.datos.securityCode) Object.assign(campos, { ecf_security_code: c.datos.securityCode, ecf_qr_url: c.datos.qr_url || v.ecf_qr_url || null, ecf_track_id: c.datos.internalTrackId || v.ecf_track_id || null });
  await deps.guardar(v.id, campos);
  return { ok: true, status: 200, ...salida({ ...v, ...campos }) };
}
