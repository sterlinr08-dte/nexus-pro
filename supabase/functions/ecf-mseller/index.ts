import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.112.2";
import { crearCliente, entornoValido, MSellerError } from "./_lib.ts";

// ecf-mseller — fase 1 de la factura electrónica (e-CF) con MSeller (dueño, 26-oct-2026: «ayúdame a integrarla en mi
// sistema»). Solo conecta y prueba: {accion:"estado"} dice qué secretos faltan (sin mostrarlos), {accion:"probar"} inicia
// sesión y hace una consulta de solo lectura, {accion:"consultar", ecf} lee un comprobante y {accion:"validar", documento}
// revisa un JSON con validate=true (no va a la DGII ni gasta secuencia). NO emite comprobantes: eso es la fase 2 (caja).
// Secretos (Supabase → Edge Functions → Secrets): MSELLER_EMAIL, MSELLER_PASSWORD, MSELLER_API_KEY y, opcional,
// MSELLER_ENTORNO (TesteCF por defecto; CerteCF o eCF solo cuando la DGII lo apruebe).
// Acceso: un ADMIN activo con su sesión de NEXUS, la clave de servicio o una llave de prueba de un solo uso.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const env = (k: string) => (Deno.env.get(k) || "").trim();
const cred = { email: env("MSELLER_EMAIL"), password: env("MSELLER_PASSWORD"), apiKey: env("MSELLER_API_KEY"), entorno: entornoValido(env("MSELLER_ENTORNO")) };
const faltan = (["MSELLER_EMAIL", "MSELLER_PASSWORD", "MSELLER_API_KEY"] as const).filter((k) => !env(k));
const cliente = faltan.length ? null : crearCliente(cred);

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "Método no permitido." }, 405);
  if (!(await autorizado(req))) return json({ ok: false, error: "Solo un administrador." }, 401);
  const b = await req.json().catch(() => ({}));
  const accion = String(b?.accion || "estado");
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
