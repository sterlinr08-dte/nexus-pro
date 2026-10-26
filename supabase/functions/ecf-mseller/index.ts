import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.112.2";
import { crearCliente, entornoValido, MSellerError } from "./_lib.ts";
import { actualizar, actualizarDoc, type Deps, emitir, emitirDebito, emitirNota, type Pendiente, seguimiento } from "./_emitir.ts";
import { rncValido } from "./_doc.ts";

// ecf-mseller — fase 1 de la factura electrónica (e-CF) con MSeller (dueño, 26-oct-2026: «ayúdame a integrarla en mi
// sistema»). Solo conecta y prueba: {accion:"estado"} dice qué secretos faltan (sin mostrarlos), {accion:"probar"} inicia
// sesión y hace una consulta de solo lectura, {accion:"consultar", ecf} lee un comprobante y {accion:"validar", documento}
// revisa un JSON con validate=true (no va a la DGII ni gasta secuencia).
// Secretos (Supabase → Edge Functions → Secrets): MSELLER_EMAIL, MSELLER_PASSWORD, MSELLER_API_KEY y, opcional,
// MSELLER_ENTORNO (TesteCF por defecto; CerteCF o eCF solo cuando la DGII lo apruebe).
// Acceso: un ADMIN activo con su sesión de NEXUS, la clave de servicio o una llave de prueba de un solo uso.
// Fase 5: {accion:"nota_credito", nota_id} emite la E34 de una devolución o anulación; {accion:"actualizar_nota", nota_id}.
// Nota de débito E33: {accion:"nota_debito", debito_id} y {accion:"actualizar_debito", debito_id} (pos_notas_debito).
// Fase 4: {accion:"seguimiento"} solo con x-cron-token (pg_cron cada 15 min, ver migración 20261026040000).
// Fase 3 (caja): {accion:"emitir", venta_id, tipo:31|32} y {accion:"actualizar", venta_id} los puede usar cualquier usuario
// de la caja con su sesión: la venta se lee CON su sesión (RLS: solo ve las de su organización) y el e-NCF sale de
// pos_siguiente_encf con su sesión (mi_organizacion()). Ver _emitir.ts.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const env = (k: string) => (Deno.env.get(k) || "").trim();
// Los secretos se leen en cada solicitud (un secreto nuevo o cambiado vale sin reiniciar); el cliente (y su token) se
// reutiliza mientras las credenciales no cambien.
let cache: { clave: string; cliente: ReturnType<typeof crearCliente> } | null = null;
function config() {
  const cred = { email: env("MSELLER_EMAIL"), password: env("MSELLER_PASSWORD"), apiKey: env("MSELLER_API_KEY"), entorno: entornoValido(env("MSELLER_ENTORNO")) };
  const faltan = (["MSELLER_EMAIL", "MSELLER_PASSWORD", "MSELLER_API_KEY"] as const).filter((k) => !env(k));
  if (faltan.length) return { cred, faltan, cliente: null };
  const clave = [cred.email, cred.password, cred.apiKey, cred.entorno].join("\u0000");
  if (cache?.clave !== clave) cache = { clave, cliente: crearCliente(cred) };
  return { cred, faltan, cliente: cache.cliente };
}

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lote-llave", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

async function autorizado(req: Request): Promise<boolean> {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (token === SERVICE_ROLE_KEY) return true;
  // Pruebas: llave de un solo uso vigente de _comprobante_lote_llaves (hash SHA-256, vence a los 30 min), como bauche-auto-leer.
  const llave = (req.headers.get("x-lote-llave") || "").trim();
  if (llave.length >= 32) {
    const h = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(llave)))].map((x) => x.toString(16).padStart(2, "0")).join("");
    const { data } = await db.from("_comprobante_lote_llaves").select("hash").eq("hash", h).gt("vence", new Date().toISOString()).maybeSingle();
    if (data) return true;
  }
  if (!token) return false;
  const { data: u } = await db.auth.getUser(token);
  if (!u?.user) return false;
  const { data: p } = await db.from("profiles").select("rol,activo").eq("id", u.user.id).maybeSingle();
  return !!p && p.rol === "admin" && p.activo !== false;
}

// Lecturas con la sesión del usuario (RLS) y escrituras de los campos e-CF con la clave de servicio. La tarea programada
// (seguimiento) no tiene usuario: lee con la clave de servicio y nunca toma números nuevos (solo reintenta los ya asignados).
function depsCaja(token: string | null, cliente: Deps["cliente"]): Deps {
  const ub = token ? createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } }) : db;
  const falla = (e: { message: string } | null) => { if (e) throw new Error(e.message); };
  const tabla = (nombre: string, campos: string) => ({
    async leer(id: string) { const { data, error } = await ub.from(nombre).select(campos).eq("id", id).maybeSingle(); falla(error); return data as any; },
    async reclamar(id: string, libreAntesDe: string) {
      const { data, error } = await db.from(nombre).update({ ecf_enviado_at: new Date().toISOString() }).eq("id", id).is("ecf_track_id", null)
        .or(`ecf_enviado_at.is.null,ecf_enviado_at.lt.${libreAntesDe}`).select("id");
      falla(error); return !!data?.length;
    },
    async guardar(id: string, c: Record<string, unknown>) { const { error } = await db.from(nombre).update(c).eq("id", id); falla(error); },
  });
  const ECF = "ncf,ecf_tipo,ecf_estado,ecf_track_id,ecf_security_code,ecf_qr_url,ecf_firmado";
  const ventas = tabla("pos_ventas", "id,organizacion_id,estado,total,a_credito,credito_vencimiento,fecha,cliente_id,comprador_rnc,comprador_razon_social,cliente_nombre," + ECF);
  const leerVenta = ventas.leer;
  // El comprador sale de la ficha del cliente (pos_clientes.cedula), en el servidor: pos_registrar_venta_atomica
  // no guarda comprador_rnc. Se copia a la venta una sola vez, para que quede igual a lo que se envió.
  ventas.leer = async (id: string) => {
    const data = await leerVenta(id);
    if (data && !data.comprador_rnc && data.cliente_id) {
      const { data: c } = await ub.from("pos_clientes").select("nombre,cedula").eq("id", data.cliente_id).maybeSingle();
      const rnc = String(c?.cedula || "").replace(/\D/g, "");
      if (rncValido(rnc)) {
        data.comprador_rnc = rnc; data.comprador_razon_social = c?.nombre || data.cliente_nombre || null;
        await db.from("pos_ventas").update({ comprador_rnc: rnc, comprador_razon_social: data.comprador_razon_social }).eq("id", id);
      }
    }
    return data;
  };
  const tipos = async (ids: unknown[]) => {
    const u = [...new Set(ids.filter(Boolean))];
    const { data: ps } = u.length ? await db.from("pos_productos").select("id,tipo").in("id", u) : { data: [] };
    return new Set((ps || []).filter((p) => String(p.tipo || "").toLowerCase() === "servicio").map((p) => p.id));
  };
  const items = async (nombre: string, col: string, id: string) => {
    let q = ub.from(nombre).select("nombre,precio,cantidad,itbis,importe,producto_id").eq(col, id);
    if (nombre === "pos_venta_items") q = q.order("linea_orden", { ascending: true, nullsFirst: false });
    const { data, error } = await q; falla(error);
    const serv = await tipos((data || []).map((i) => i.producto_id));
    return (data || []).map((i) => ({ nombre: i.nombre, precio: Number(i.precio), cantidad: Number(i.cantidad), itbis: i.itbis !== false, importe: Number(i.importe), servicio: serv.has(i.producto_id) }));
  };
  return {
    cliente,
    ventas,
    notas: tabla("pos_devoluciones", "id,organizacion_id,venta_id,total,motivo,fecha,created_at,estado," + ECF),
    debitos: tabla("pos_notas_debito", "id,organizacion_id,venta_id,total,concepto,lleva_itbis,created_at,estado," + ECF),
    leerItems: (id) => items("pos_venta_items", "venta_id", id),
    leerItemsNota: (id) => items("pos_devolucion_items", "devolucion_id", id),
    async leerEmisor(org) {
      const { data } = await db.from("pos_config").select("ecf_rnc,ecf_razon_social,ecf_direccion").eq("organizacion_id", org).maybeSingle();
      return data ? { rnc: data.ecf_rnc || "", razonSocial: data.ecf_razon_social || "", direccion: data.ecf_direccion || "" } : null;
    },
    async vencimiento(org, tipo) {
      const { data } = await db.from("pos_ncf_secuencias").select("vencimiento").eq("organizacion_id", org).eq("tipo", tipo).eq("activo", true).limit(1).maybeSingle();
      return data?.vencimiento || null;
    },
    async siguienteEncf(tipo) {
      if (!token) return null; // sin usuario no hay organización (mi_organizacion): la tarea programada no toma números
      const { data, error } = await ub.rpc("pos_siguiente_encf", { p_tipo: tipo });
      falla(error); return data || null;
    },
  };
}

// Lista de comprobantes que esperan a la DGII (o quedaron pendientes con e-NCF ya asignado), los más viejos primero
async function listarPendientes(): Promise<Pendiente[]> {
  const ESPERA = ["En Cola", "Enviado a la DGII", "En Proceso"];
  const hace2min = new Date(Date.now() - 120_000).toISOString();
  const out: Pendiente[] = [];
  for (const [nombre, t] of [["pos_ventas", "ventas"], ["pos_devoluciones", "notas"], ["pos_notas_debito", "debitos"]] as const) {
    const { data: a } = await db.from(nombre).select("id,ecf_estado").in("ecf_estado", ESPERA).or(`ecf_actualizado_at.is.null,ecf_actualizado_at.lt.${hace2min}`).order("ecf_actualizado_at", { ascending: true, nullsFirst: true }).limit(40);
    let qb = db.from(nombre).select("id,ecf_estado").eq("ecf_estado", "pendiente").like("ncf", "E%");
    if (nombre !== "pos_devoluciones") qb = qb.neq("estado", "anulada"); // una venta o nota de débito anulada no se envía
    const { data: b } = await qb.or(`ecf_enviado_at.is.null,ecf_enviado_at.lt.${hace2min}`).limit(20);
    for (const r of [...(a || []), ...(b || [])]) out.push({ tabla: t, id: r.id, ecf_estado: r.ecf_estado });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "Método no permitido." }, 405);
  const b = await req.json().catch(() => ({}));
  const accion = String(b?.accion || "estado");
  if (accion === "seguimiento") {
    // Solo la tarea programada: encabezado x-cron-token = cron_secretos('ecf_seguimiento')
    const tk = (req.headers.get("x-cron-token") || "").trim();
    const { data: sec } = await db.from("cron_secretos").select("valor").eq("nombre", "ecf_seguimiento").maybeSingle();
    if (!sec?.valor || tk !== String(sec.valor)) return json({ ok: false, error: "no_autorizado" }, 401);
    const { cliente } = config();
    if (!cliente) return json({ ok: false, error: "Faltan secretos de MSeller." }, 400);
    const pend = await listarPendientes();
    const r = await seguimiento(pend, depsCaja(null, cliente));
    if (r.revisados) console.log("ecf-mseller seguimiento", JSON.stringify(r));
    return json({ ok: true, ...r });
  }
  if (["emitir", "actualizar", "nota_credito", "actualizar_nota", "nota_debito", "actualizar_debito"].includes(accion)) {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    const { data: u } = token && token !== SERVICE_ROLE_KEY ? await db.auth.getUser(token) : { data: null };
    if (!u?.user) return json({ ok: false, error: "Inicie sesión en NEXUS." }, 401);
    const ventaId = String(b?.venta_id || b?.nota_id || b?.debito_id || "");
    if (!/^[0-9a-f-]{36}$/i.test(ventaId)) return json({ ok: false, error: "Falta el documento." }, 400);
    const { faltan, cliente } = config();
    if (!cliente) return json({ ok: false, error: "La factura electrónica no está configurada (faltan datos de MSeller).", faltan }, 400);
    try {
      const deps = depsCaja(token, cliente);
      const r = accion === "emitir" ? await emitir({ ventaId, tipo: Number(b?.tipo) || undefined }, deps)
        : accion === "nota_credito" ? await emitirNota({ notaId: ventaId }, deps)
        : accion === "actualizar_nota" ? await actualizarDoc(ventaId, deps.notas, cliente)
        : accion === "nota_debito" ? await emitirDebito({ debitoId: ventaId }, deps)
        : accion === "actualizar_debito" ? await actualizarDoc(ventaId, deps.debitos, cliente)
        : await actualizar(ventaId, deps);
      return json({ entorno: cliente.entorno, ...r }, r.status);
    } catch (e) {
      const msg = e instanceof MSellerError ? e.message : "No se pudo completar la factura electrónica.";
      console.error("ecf-mseller", accion, e instanceof Error ? e.message : String(e));
      return json({ ok: false, error: msg }, 502);
    }
  }
  if (!(await autorizado(req))) return json({ ok: false, error: "Solo un administrador." }, 401);
  const { cred, faltan, cliente } = config();
  if (accion === "estado") return json({ ok: !faltan.length, entorno: cred.entorno, faltan });
  if (!cliente) return json({ ok: false, error: "Faltan secretos de MSeller.", faltan }, 400);
  try {
    if (accion === "probar") return json({ entorno: cliente.entorno, ...(await cliente.probar()) });
    if (accion === "consultar") {
      const ecf = String(b?.ecf || "").trim();
      if (!/^E\d{12}$/.test(ecf)) return json({ ok: false, error: "e-NCF inválido (ej. E320000000001)." }, 400);
      const r = await cliente.consultar(ecf);
      return json({ ok: r.status < 400, entorno: cliente.entorno, ...r });
    }
    if (accion === "validar") {
      if (!b?.documento?.ECF) return json({ ok: false, error: "Falta documento.ECF." }, 400);
      const r = await cliente.validar(b.documento);
      return json({ ok: r.status < 400, entorno: cliente.entorno, ...r });
    }
    return json({ ok: false, error: "Acción desconocida." }, 400);
  } catch (e) {
    if (e instanceof MSellerError) return json({ ok: false, entorno: cliente.entorno, sesion: false, status: e.status, codigo: e.codigo, error: e.message }, 502);
    console.error("ecf-mseller:", e instanceof Error ? e.message : String(e));
    return json({ ok: false, error: "No se pudo hablar con MSeller." }, 502);
  }
});
