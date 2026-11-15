import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.112.2";

// Entrada a la empresa de DEMOSTRACIÓN del POS (15-nov-2026). Pública a propósito (verify_jwt=false).
// Nadie conoce la clave del usuario demo: en cada entrada se le pone una clave al azar y se inicia sesión con ella;
// se devuelve solo la sesión. Así un visitante no puede cambiar la clave y dejar fuera a los demás.
// El usuario demo NO es administrador y su empresa está aislada por RLS. Solo existe ese usuario fijo.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const DEMO_UID = "de300000-0000-4000-8000-000000000003";
const DEMO_MAIL = "demo@nexus-pro.local";
const ORIGENES = ["https://nexusprord.com", "https://www.nexusprord.com", "https://demo.nexusprord.com"];

function cors(req: Request) {
  const o = req.headers.get("origin") || "";
  return { "Access-Control-Allow-Origin": ORIGENES.includes(o) ? o : ORIGENES[0], "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
}

Deno.serve(async (req) => {
  const h = cors(req);
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...h, "Content-Type": "application/json", "Cache-Control": "no-store" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return json({ ok: false, error: "Método no permitido." }, 405);
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    // Dos visitantes a la vez pueden pisarse la clave: se reintenta.
    for (let i = 0; i < 3; i++) {
      const clave = crypto.randomUUID() + crypto.randomUUID();
      const { error: e1 } = await admin.auth.admin.updateUserById(DEMO_UID, { password: clave });
      if (e1) continue;
      const { data, error } = await anon.auth.signInWithPassword({ email: DEMO_MAIL, password: clave });
      if (!error && data?.session) {
        return json({ ok: true, access_token: data.session.access_token, refresh_token: data.session.refresh_token, expires_in: data.session.expires_in });
      }
    }
    return json({ ok: false, error: "La demostración está ocupada. Intente de nuevo." }, 503);
  } catch (_e) {
    return json({ ok: false, error: "No se pudo abrir la demostración." }, 500);
  }
});
