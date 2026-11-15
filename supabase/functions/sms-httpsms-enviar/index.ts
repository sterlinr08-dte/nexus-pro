import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.112.2";

// httpSMS (https://httpsms.com): envía un SMS usando un Android como pasarela. POST /v1/messages/send,
// encabezado x-api-Key, cuerpo {content, from, to} en E.164.
// Secretos: HTTPSMS_API_KEY y HTTPSMS_FROM_NUMBER.
//
// 15-nov-2026 (seguridad multiempresa): antes bastaba la llave pública del sistema y el consentimiento lo mandaba
// quien llamaba. Ahora:
//   1. exige una sesión real (auth.getUser) de un usuario activo;
//   2. el destinatario tiene que ser un cliente de la empresa de ese usuario (se busca con SU sesión, bajo RLS);
//   3. el consentimiento se lee de la ficha del cliente (pos_clientes.acepta_whatsapp), no del cuerpo;
//   4. el mensaje tiene un largo máximo.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const HTTPSMS_URL = "https://api.httpsms.com/v1/messages/send";
const MAX_LARGO = 480;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { headers: { ...CORS, "Content-Type": "application/json" }, status });

export function aE164(telRaw: string): string | null {
  const d = telRaw.replace(/\D/g, "");
  if (telRaw.trim().startsWith("+") && d.length >= 10) return "+" + d;
  if (d.length === 10) return "+1" + d;
  if (d.length === 11 && d.startsWith("1")) return "+" + d;
  return null;
}
const ult10 = (t: string) => t.replace(/\D/g, "").slice(-10);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "Método no permitido" }, 405);

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const { data: u } = token && token !== ANON_KEY && token !== SERVICE_ROLE_KEY ? await db.auth.getUser(token) : { data: null };
  if (!u?.user) return json({ ok: false, error: "Inicie sesión en NEXUS." }, 401);
  const { data: p } = await db.from("profiles").select("rol,activo").eq("id", u.user.id).maybeSingle();
  if (!p || !p.rol || p.activo === false) return json({ ok: false, error: "No autorizado." }, 403);

  const API_KEY = (Deno.env.get("HTTPSMS_API_KEY") || "").trim();
  const FROM_NUMBER = (Deno.env.get("HTTPSMS_FROM_NUMBER") || "").trim();
  if (!API_KEY || !FROM_NUMBER) return json({ ok: false, error: "El envío de SMS no está configurado." }, 500);

  try {
    const body = await req.json().catch(() => ({}));
    const telefonoRaw = String(body.telefono || "").trim();
    const mensaje = String(body.mensaje || "").trim();
    if (!telefonoRaw) return json({ ok: false, error: "Falta el teléfono del destinatario" }, 400);
    if (!mensaje) return json({ ok: false, error: "Falta el mensaje a enviar" }, 400);
    if (mensaje.length > MAX_LARGO) return json({ ok: false, error: "El mensaje es demasiado largo." }, 400);
    const to = aE164(telefonoRaw);
    if (!to) return json({ ok: false, error: "El teléfono no tiene un formato reconocible." }, 400);

    // El destinatario debe ser un cliente de la empresa de quien llama, con el consentimiento marcado en su ficha.
    const ub = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
    const fin = ult10(to);
    const { data: clis, error } = await ub.from("pos_clientes").select("telefono,acepta_whatsapp").ilike("telefono", `%${fin.slice(-4)}`).limit(200);
    if (error) return json({ ok: false, error: "No se pudo verificar el cliente." }, 500);
    const cli = (clis || []).find((c: { telefono: string | null }) => ult10(String(c.telefono || "")) === fin);
    if (!cli) return json({ ok: false, error: "Ese teléfono no es de un cliente de su empresa." }, 403);
    if (cli.acepta_whatsapp !== true) return json({ ok: false, error: "Este cliente no acepta avisos automáticos. No se envió nada." }, 400);

    const resp = await fetch(HTTPSMS_URL, { method: "POST", headers: { "x-api-Key": API_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ content: mensaje, from: FROM_NUMBER, to }) });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return json({ ok: false, error: "httpSMS rechazó el envío (" + resp.status + ")." }, 500);
    return json({ ok: true, message_id: data?.data?.id || null, status: data?.data?.status || null });
  } catch (_e) {
    return json({ ok: false, error: "No se pudo enviar el SMS." }, 500);
  }
});
