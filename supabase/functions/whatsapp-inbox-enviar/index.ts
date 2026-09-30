import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { type Body, crearEnviador } from "./_lib.ts";

// whatsapp-inbox-enviar — NEXUS PRO
// Envia texto, adjuntos, notas de voz, ubicacion y contactos desde el Inbox. Todas las llamadas
// vienen de un usuario autenticado y se vuelven a autorizar del lado del servidor. La lógica
// vive en _lib.ts (probada con dobles de Supabase y fetch).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ZERNIO_API_KEY = Deno.env.get("ZERNIO_API_KEY") ?? "";
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const enviador = crearEnviador({ db, zernioApiKey: ZERNIO_API_KEY });

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
function subDelJWT(req: Request): string | null {
  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    const payloadB64 = token.split(".")[1];
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
    return payload.sub ?? null;
  } catch { return null; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "metodo_no_permitido" }, 405);
  try {
    const acceso = await enviador.resolverAcceso(subDelJWT(req));
    if (!acceso.autorizado) return json({ ok: false, error: "no_autorizado" }, 403);

    let body: Body;
    try { body = await req.json(); }
    catch { return json({ ok: false, error: "body_invalido" }, 400); }

    const r = body.accion === "presign" ? await enviador.presign(body) : await enviador.manejarEnvio(body, acceso);
    return json(r.body, r.status);
  } catch (e) {
    console.error("whatsapp-inbox-enviar: excepcion no capturada:", e instanceof Error ? (e.stack || e.message) : String(e));
    return json({ ok: false, error: "error_interno" }, 500);
  }
});
