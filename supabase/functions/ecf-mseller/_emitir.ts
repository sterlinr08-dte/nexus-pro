// Emitir el e-CF de una venta (E31/E32, fase 3) o de su nota de crédito (E34, fase 5), y seguir su estado en la DGII
// (fase 4). Separado de Deno.serve: las lecturas y escrituras llegan como funciones para probarlo con una base y un
// MSeller simulados.
// Orden (que nada se pierda ni se repita), igual para facturas y notas:
//  1) el documento ya tiene respuesta de MSeller → se devuelve tal cual (idempotente, no se reenvía);
//  2) se «reclama» (ecf_enviado_at) para que dos toques a la vez no envíen dos veces;
//  3) se arma el JSON con un número de prueba para validar los datos ANTES de gastar un e-NCF;
//  4) se toma el e-NCF (pos_siguiente_encf, atómico) y se guarda ANTES de enviarlo;
//  5) se envía. Bien → se guardan QR, código de seguridad y seguimiento. Error 4xx → MSeller no lo registró: queda
//     «Error» con el mismo e-NCF para reintentar sin gastar otro. Error 5xx o sin red → queda «pendiente» y el
//     reintento primero CONSULTA ese e-NCF por si MSeller sí lo recibió.
import { armarEcf, type EmisorEcf, type ItemEcf, type VentaEcf } from "./_doc.ts";

type Ecf = {
  id: string; organizacion_id: string; ncf?: string | null; ecf_tipo?: number | null; ecf_estado?: string | null;
  ecf_track_id?: string | null; ecf_security_code?: string | null; ecf_qr_url?: string | null; ecf_firmado?: string | null;
};
export type VentaFila = VentaEcf & Ecf & { estado?: string | null };
export type DebitoFila = Ecf & { venta_id: string; total: number; concepto: string; lleva_itbis: boolean; created_at?: string | null; estado?: string | null };
export type NotaFila = Ecf & { venta_id: string; total: number; motivo?: string | null; fecha?: string | null; created_at?: string | null; estado?: string | null };
export type Tabla<T> = {
  leer: (id: string) => Promise<T | null>;
  reclamar: (id: string, libreAntesDe: string) => Promise<boolean>;
  guardar: (id: string, campos: Record<string, unknown>) => Promise<void>;
};
export type Cliente = { entorno: string; enviar: (doc: unknown) => Promise<{ status: number; datos: any }>; consultar: (ecf: string) => Promise<{ status: number; datos: any }> };
export type Deps = {
  ventas: Tabla<VentaFila>;
  notas: Tabla<NotaFila>;
  debitos: Tabla<DebitoFila>;
  leerItems: (ventaId: string) => Promise<ItemEcf[]>;
  leerItemsNota: (notaId: string) => Promise<ItemEcf[]>;
  leerEmisor: (org: string) => Promise<EmisorEcf | null>;
  vencimiento: (org: string, tipo: string) => Promise<string | null>;
  siguienteEncf: (tipo: string) => Promise<string | null>;
  cliente: Cliente;
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
export const ESTADOS = ["En Cola", "Enviado a la DGII", "En Proceso", "Aceptado", "Aceptado Condicional", "Rechazado"];
const reEncf = (tipo: number) => new RegExp(`^E${tipo}\\d{10}$`);

// Pasos 2 a 5, comunes a facturas y notas
async function procesar(fila: Ecf, tipo: number, tabla: Tabla<any>, armar: (encf: string) => unknown, deps: Deps, ahora: () => number, extra: Record<string, unknown> = {}): Promise<Resultado> {
  const iso = () => new Date(ahora()).toISOString();
  if (!(await tabla.reclamar(fila.id, new Date(ahora() - 90_000).toISOString()))) return { ok: false, status: 409, error: "Este comprobante ya se está enviando. Espere unos segundos." };
  const soltar = () => tabla.guardar(fila.id, { ecf_enviado_at: null });
  try { armar(`E${tipo}0000000000`); } catch (e) { await soltar(); return { ok: false, status: 400, error: (e as Error).message }; }

  let encf = reEncf(tipo).test(String(fila.ncf || "")) ? String(fila.ncf) : "";
  if (encf && fila.ecf_estado === "pendiente") {
    // un intento anterior quedó sin respuesta: ¿lo recibió MSeller?
    const c = await deps.cliente.consultar(encf);
    if (c.status < 300 && c.datos?.securityCode) {
      const campos = { ...camposRespuesta(c.datos, deps.cliente.entorno, iso()), ecf_estado: ESTADOS.includes(c.datos.status) ? c.datos.status : "En Cola" };
      await tabla.guardar(fila.id, campos);
      return { ok: true, status: 200, recuperada: true, ...salida({ ncf: encf, ...campos }) };
    }
  }
  if (!encf) {
    encf = (await deps.siguienteEncf(`E${tipo}`)) || "";
    if (!encf) { await soltar(); return { ok: false, status: 409, error: `No hay números E${tipo} disponibles. Agregue la secuencia autorizada por la DGII en Ajustes.` }; }
    await tabla.guardar(fila.id, { ncf: encf, ecf_tipo: tipo, ecf_entorno: deps.cliente.entorno, ecf_estado: "pendiente", ecf_respuesta: null, ...extra });
  }

  let r: { status: number; datos: any };
  try { r = await deps.cliente.enviar(armar(encf)); }
  catch (_e) {
    await tabla.guardar(fila.id, { ecf_estado: "pendiente", ecf_enviado_at: null, ecf_actualizado_at: iso() });
    return { ok: false, status: 502, pendiente: true, ncf: encf, error: "No se pudo hablar con MSeller. El comprobante quedó pendiente; se puede reintentar." };
  }
  if (r.status < 300 && r.datos?.securityCode) {
    const campos = { ...camposRespuesta(r.datos, deps.cliente.entorno, iso()), ecf_estado: "En Cola" };
    await tabla.guardar(fila.id, campos);
    return { ok: true, status: 200, ...salida({ ncf: encf, ...campos }) };
  }
  const definitivo = r.status >= 400 && r.status < 500;
  await tabla.guardar(fila.id, { ecf_estado: definitivo ? "Error" : "pendiente", ecf_respuesta: r.datos, ecf_enviado_at: null, ecf_actualizado_at: iso() });
  return { ok: false, status: definitivo ? 422 : 502, pendiente: !definitivo, ncf: encf, codigo: r.datos?.code || null, error: mensaje(r.datos, r.status) };
}

export async function emitir(p: { ventaId: string; tipo?: number }, deps: Deps, ahora: () => number = Date.now): Promise<Resultado> {
  const v = await deps.ventas.leer(p.ventaId);
  if (!v) return { ok: false, status: 404, error: "Venta no encontrada." };
  if (v.ecf_track_id) return { ok: true, status: 200, ya: true, ...salida(v as Record<string, unknown>) };
  const tipo = Number(v.ecf_tipo || p.tipo); // si ya se le asignó un tipo, ese manda
  if (tipo !== 31 && tipo !== 32) return { ok: false, status: 400, error: "Tipo de factura electrónica inválido (31 o 32)." };
  if (v.ncf && !reEncf(tipo).test(String(v.ncf))) return { ok: false, status: 409, error: `Esta venta ya tiene el comprobante ${v.ncf}.` };
  if (v.estado && v.estado !== "completada") return { ok: false, status: 409, error: "La venta no está completada." };
  const [items, emisor, venc] = await Promise.all([deps.leerItems(v.id), deps.leerEmisor(v.organizacion_id), tipo === 31 ? deps.vencimiento(v.organizacion_id, "E31") : Promise.resolve(null)]);
  const armar = (encf: string) => armarEcf({ tipo: tipo as 31 | 32, encf, venta: v, items, emisor: emisor || { rnc: "", razonSocial: "", direccion: "" }, vencimientoSecuencia: venc, ahora });
  return procesar(v, tipo, deps.ventas, armar, deps, ahora);
}

// Nota de crédito E34 de una devolución o anulación (pos_devoluciones). Solo si la factura original llegó a MSeller:
// si nunca se registró, no hay nada que modificar ante la DGII.
export async function emitirNota(p: { notaId: string }, deps: Deps, ahora: () => number = Date.now): Promise<Resultado> {
  const n = await deps.notas.leer(p.notaId);
  if (!n) return { ok: false, status: 404, error: "Nota de crédito no encontrada." };
  if (n.ecf_track_id) return { ok: true, status: 200, ya: true, ...salida(n as Record<string, unknown>) };
  if (n.ncf && !reEncf(34).test(String(n.ncf))) return { ok: false, status: 409, error: `Esta nota ya tiene el comprobante ${n.ncf}.` };
  const v = await deps.ventas.leer(n.venta_id);
  if (!v || !/^E3[12]\d{10}$/.test(String(v.ncf || ""))) return { ok: false, status: 409, error: "La factura original no es electrónica." };
  if (!v.ecf_track_id && !v.ecf_security_code) return { ok: false, status: 409, sinOriginal: true, error: "La factura original no llegó a la DGII; no hace falta nota de crédito electrónica." };
  const total = Number(n.total);
  if (!(total > 0) || total > Number(v.total) + 0.01) return { ok: false, status: 400, error: "El monto de la nota no es válido." };
  const [items, emisor] = await Promise.all([deps.leerItemsNota(n.id), deps.leerEmisor(n.organizacion_id)]);
  const codigo: 1 | 3 = total >= Number(v.total) - 0.01 ? 1 : 3;
  const venta: VentaEcf = { total, fecha: n.created_at || null, comprador_rnc: v.comprador_rnc, comprador_razon_social: v.comprador_razon_social, cliente_nombre: v.cliente_nombre };
  const armar = (encf: string) => armarEcf({ tipo: 34, encf, venta, items, emisor: emisor || { rnc: "", razonSocial: "", direccion: "" }, referencia: { ncf: String(v.ncf), fecha: String(v.fecha || ""), codigo, razon: n.motivo }, ahora });
  return procesar(n, 34, deps.notas, armar, deps, ahora);
}

// Nota de débito E33: un cargo adicional sobre una factura electrónica que ya llegó a MSeller. Una sola línea (el concepto).
export async function emitirDebito(p: { debitoId: string }, deps: Deps, ahora: () => number = Date.now): Promise<Resultado> {
  const n = await deps.debitos.leer(p.debitoId);
  if (!n) return { ok: false, status: 404, error: "Nota de débito no encontrada." };
  if (n.ecf_track_id) return { ok: true, status: 200, ya: true, ...salida(n as Record<string, unknown>) };
  if (n.ncf && !reEncf(33).test(String(n.ncf))) return { ok: false, status: 409, error: `Esta nota ya tiene el comprobante ${n.ncf}.` };
  if (n.estado && n.estado !== "emitida") return { ok: false, status: 409, error: "La nota de débito está anulada." };
  const v = await deps.ventas.leer(n.venta_id);
  if (!v || !/^E3[12]\d{10}$/.test(String(v.ncf || ""))) return { ok: false, status: 409, error: "La factura original no es electrónica." };
  if (!v.ecf_track_id && !v.ecf_security_code) return { ok: false, status: 409, sinOriginal: true, error: "La factura original no llegó a la DGII; primero hay que enviarla." };
  const emisor = await deps.leerEmisor(n.organizacion_id);
  const venc = await deps.vencimiento(n.organizacion_id, "E33");
  const items: ItemEcf[] = [{ nombre: n.concepto, precio: Number(n.total), cantidad: 1, itbis: !!n.lleva_itbis, importe: Number(n.total), servicio: true }];
  const venta: VentaEcf = { total: Number(n.total), fecha: n.created_at || null, comprador_rnc: v.comprador_rnc, comprador_razon_social: v.comprador_razon_social, cliente_nombre: v.cliente_nombre };
  const armar = (encf: string) => armarEcf({ tipo: 33, encf, venta, items, emisor: emisor || { rnc: "", razonSocial: "", direccion: "" }, vencimientoSecuencia: venc, referencia: { ncf: String(v.ncf), fecha: String(v.fecha || ""), codigo: 3, razon: n.concepto }, ahora });
  return procesar(n, 33, deps.debitos, armar, deps, ahora);
}

// Pide a MSeller el estado actual de un comprobante ya enviado. Se guarda el estado de la DGII (Aceptado, Rechazado…).
export async function actualizarDoc<T extends Ecf>(id: string, tabla: Tabla<T>, cliente: Cliente, ahora: () => number = Date.now): Promise<Resultado> {
  const v = await tabla.leer(id);
  if (!v || !/^E3[1-4]\d{10}$/.test(String(v.ncf || ""))) return { ok: false, status: 404, error: "Este documento no tiene comprobante electrónico." };
  const c = await cliente.consultar(String(v.ncf));
  if (c.status === 404) return { ok: true, status: 200, ...salida(v as Record<string, unknown>) };
  if (c.status >= 300 || !c.datos) return { ok: false, status: 502, error: mensaje(c.datos, c.status) };
  const campos: Record<string, unknown> = { ecf_actualizado_at: new Date(ahora()).toISOString(), ecf_respuesta: c.datos };
  if (ESTADOS.includes(c.datos.status)) campos.ecf_estado = c.datos.status;
  if (c.datos.securityCode) Object.assign(campos, { ecf_security_code: c.datos.securityCode, ecf_qr_url: c.datos.qr_url || v.ecf_qr_url || null, ecf_track_id: c.datos.internalTrackId || v.ecf_track_id || null });
  await tabla.guardar(v.id, campos);
  return { ok: true, status: 200, ...salida({ ...v, ...campos }) };
}
export const actualizar = (ventaId: string, deps: Pick<Deps, "ventas" | "cliente">, ahora: () => number = Date.now) => actualizarDoc(ventaId, deps.ventas, deps.cliente, ahora);

// Fase 4: la tarea programada (cada 15 min) revisa los comprobantes que esperan a la DGII y reintenta los pendientes que
// ya tienen e-NCF (sin gastar otro número). Un error en uno no detiene a los demás.
export type Pendiente = { tabla: "ventas" | "notas" | "debitos"; id: string; ecf_estado: string };
export async function seguimiento(pendientes: Pendiente[], deps: Deps, ahora: () => number = Date.now) {
  const cuenta: Record<string, number> = { revisados: 0, aceptados: 0, rechazados: 0, reenviados: 0, errores: 0 };
  for (const p of pendientes) {
    cuenta.revisados++;
    try {
      const tabla = p.tabla === "ventas" ? deps.ventas : p.tabla === "notas" ? deps.notas : deps.debitos;
      const r = p.ecf_estado === "pendiente"
        ? (p.tabla === "ventas" ? await emitir({ ventaId: p.id }, deps, ahora) : p.tabla === "notas" ? await emitirNota({ notaId: p.id }, deps, ahora) : await emitirDebito({ debitoId: p.id }, deps, ahora))
        : await actualizarDoc(p.id, tabla as Tabla<Ecf>, deps.cliente, ahora);
      if (p.ecf_estado === "pendiente" && r.ok) cuenta.reenviados++;
      if (r.ecf_estado === "Aceptado" || r.ecf_estado === "Aceptado Condicional") cuenta.aceptados++;
      if (r.ecf_estado === "Rechazado") cuenta.rechazados++;
      if (!r.ok) cuenta.errores++;
    } catch (_e) { cuenta.errores++; }
  }
  return cuenta;
}
