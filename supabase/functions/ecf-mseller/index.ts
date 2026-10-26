import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.112.2";
import { crearCliente, entornoValido, MSellerError } from "./_lib.ts";
import { actualizar, type Deps, emitir } from "./_emitir.ts";
import { rncValido } from "./_doc.ts";

// ecf-mseller — fase 1 de la factura electrónica (e-CF) con MSeller (dueño, 26-oct-2026: «ayúdame a integrarla en mi
// sistema»). Solo conecta y prueba: {accion:"estado"} dice qué secretos faltan (sin mostrarlos), {accion:"probar"} inicia
// sesión y hace una consulta de solo lectura, {accion:"consultar", ecf} lee un comprobante y {accion:"validar", documento}
// revisa un JSON con validate=true (no va a la DGII ni gasta secuencia).
// Secretos (Supabase → Edge Functions → Secrets): MSELLER_EMAIL, MSELLER_PASSWORD, MSELLER_API_KEY y, opcional,
// MSELLER_ENTORNO (TesteCF por defecto; CerteCF o eCF solo cuando la DGII lo apruebe).
// Acceso: un ADMIN activo con su sesión de NEXUS, la clave de servicio o una llave de prueba de un solo uso.
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

// Lecturas con la sesión del usuario (RLS) y escrituras de los campos e-CF con la clave de servicio.
function depsCaja(token: string, cliente: Deps["cliente"]): Deps {
  const ub = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const falla = (e: { message: string } | null) => { if (e) throw new Error(e.message); };
  return {
    cliente,
    async leerVenta(id) {
      const { data, error } = await ub.from("pos_ventas").select("id,organizacion_id,estado,total,a_credito,credito_vencimiento,fecha,cliente_id,comprador_rnc,comprador_razon_social,cliente_nombre,ncf,ecf_tipo,ecf_estado,ecf_track_id,ecf_security_code,ecf_qr_url,ecf_firmado").eq("id", id).maybeSingle();
      falla(error);
      // El comprador sale de la ficha del cliente (pos_clientes.cedula), en el servidor: pos_registrar_venta_atomica
      // no guarda comprador_rnc. Se copia a la venta una sola vez, para que quede igual a lo que se envió.
      if (data && !data.comprador_rnc && data.cliente_id) {
        const { data: c } = await ub.from("pos_clientes").select("nombre,cedula").eq("id", data.cliente_id).maybeSingle();
        const rnc = String(c?.cedula || "").replace(/\D/g, "");
        if (rncValido(rnc)) {
          data.comprador_rnc = rnc; data.comprador_razon_social = c?.nombre || data.cliente_nombre || null;
          await db.from("pos_ventas").update({ comprador_rnc: rnc, comprador_razon_social: data.comprador_razon_social }).eq("id", id);
        }
      }
      return data;
    },
    async leerItems(id) {
      const { data, error } = await ub.from("pos_venta_items").select("nombre,precio,cantidad,itbis,importe,producto_id,linea_orden").eq("venta_id", id).order("linea_orden", { ascending: true, nullsFirst: false });
      falla(error);
      const ids = [...new Set((data || []).map((i) => i.producto_id).filter(Boolean))];
      const { data: ps } = ids.length ? await db.from("pos_productos").select("id,tipo").in("id", ids) : { data: [] };
      const serv = new Set((ps || []).filter((p) => String(p.tipo || "").toLowerCase() === "servicio").map((p) => p.id));
      return (data || []).map((i) => ({ nombre: i.nombre, precio: Number(i.precio), cantidad: Number(i.cantidad), itbis: i.itbis !== false, importe: Number(i.importe), servicio: serv.has(i.producto_id) }));
    },
    async leerEmisor(org) {
      const { data } = await db.from("pos_config").select("ecf_rnc,ecf_razon_social,ecf_direccion").eq("organizacion_id", org).maybeSingle();
      return data ? { rnc: data.ecf_rnc || "", razonSocial: data.ecf_razon_social || "", direccion: data.ecf_direccion || "" } : null;
    },
    async vencimiento(org, tipo) {
      const { data } = await db.from("pos_ncf_secuencias").select("vencimiento").eq("organizacion_id", org).eq("tipo", tipo).eq("activo", true).limit(1).maybeSingle();
      return data?.vencimiento || null;
    },
    async reclamar(id, libreAntesDe) {
      const { data, error } = await db.from("pos_ventas").update({ ecf_enviado_at: new Date().toISOString() }).eq("id", id).is("ecf_track_id", null)
        .or(`ecf_enviado_at.is.null,ecf_enviado_at.lt.${libreAntesDe}`).select("id");
      falla(error); return !!data?.length;
    },
    async siguienteEncf(tipo) {
      const { data, error } = await ub.rpc("pos_siguiente_encf", { p_tipo: tipo });
      falla(error); return data || null;
    },
    async guardar(id, campos) { const { error } = await db.from("pos_ventas").update(campos).eq("id", id); falla(error); },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "Método no permitido." }, 405);
  const b = await req.json().catch(() => ({}));
  const accion = String(b?.accion || "estado");
  if (accion === "emitir" || accion === "actualizar") {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    const { data: u } = token && token !== SERVICE_ROLE_KEY ? await db.auth.getUser(token) : { data: null };
    if (!u?.user) return json({ ok: false, error: "Inicie sesión en NEXUS." }, 401);
    const ventaId = String(b?.venta_id || "");
    if (!/^[0-9a-f-]{36}$/i.test(ventaId)) return json({ ok: false, error: "Falta la venta." }, 400);
    const { faltan, cliente } = config();
    if (!cliente) return json({ ok: false, error: "La factura electrónica no está configurada (faltan datos de MSeller).", faltan }, 400);
    try {
      const deps = depsCaja(token, cliente);
      const r = accion === "emitir" ? await emitir({ ventaId, tipo: Number(b?.tipo) || undefined }, deps) : await actualizar(ventaId, deps);
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
