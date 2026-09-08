import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.112.2";

// whatsapp-plantilla-crear — NEXUS PRO, somete una plantilla nueva de WhatsApp Business a revisión
// de Meta vía la API real de Zernio (POST /v1/whatsapp/templates, confirmado en vivo contra
// docs.zernio.com/platforms/whatsapp/templates). Llamada desde el navegador con la sesión del
// agente -- reusa el mismo ZERNIO_API_KEY ya configurado para whatsapp-notificar/whatsapp-envio-
// masivo, así que someter una plantilla nueva no requiere entrar a Meta Business Manager a mano.
// Meta tarda hasta 24h en aprobar/rechazar -- esta función solo confirma que Zernio recibió la
// sometida, no que Meta ya la aprobó (eso se ve en el webhook whatsapp.template.status_updated o
// en el dashboard de Zernio/Meta).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ZERNIO_API_KEY = Deno.env.get("ZERNIO_API_KEY") ?? "";
const ZERNIO_TIMEOUT_MS = 20000;

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

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
  } catch {
    return null;
  }
}

// Idéntico en espíritu a resolverAcceso() de whatsapp-envio-masivo/index.ts.
async function resolverAcceso(sub: string | null): Promise<{ autorizado: boolean; zernioAccountId: string | null }> {
  const sinAcceso = { autorizado: false, zernioAccountId: null };
  if (!sub) return sinAcceso;
  const { data: profile } = await db.from("profiles").select("rol, usuario_sistema_id").eq("id", sub).maybeSingle();
  if (!profile?.rol || !profile.usuario_sistema_id) return sinAcceso;
  const { data: us } = await db.from("usuarios_sistema").select("organizacion_id").eq("id", profile.usuario_sistema_id).maybeSingle();
  if (!us?.organizacion_id) return sinAcceso;
  const { data: org } = await db.from("organizaciones").select("id").eq("slug", "nexus-pro").maybeSingle();
  if (!org || org.id !== us.organizacion_id) return sinAcceso;
  const { data: config } = await db.from("whatsapp_config").select("zernio_account_id").eq("activo", true).limit(1).maybeSingle();
  if (!config?.zernio_account_id) return sinAcceso;
  return { autorizado: true, zernioAccountId: config.zernio_account_id };
}

type ComponenteBody = { type: "body"; text: string };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "metodo_no_permitido" }, 405);

  try {
    const sub = subDelJWT(req);
    const acceso = await resolverAcceso(sub);
    if (!acceso.autorizado) return json({ ok: false, error: "no_autorizado" }, 403);

    let body: { name?: string; category?: string; language?: string; components?: ComponenteBody[] };
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "body_invalido" }, 400);
    }

    const { name, category, language, components } = body;
    if (!name || !category || !language || !Array.isArray(components) || !components.length) {
      return json({ ok: false, error: "faltan_campos_requeridos" }, 400);
    }
    if (!["AUTHENTICATION", "UTILITY", "MARKETING"].includes(category)) {
      return json({ ok: false, error: "categoria_invalida" }, 400);
    }

    const zernioBody = { accountId: acceso.zernioAccountId, name, category, language, components };
    const resp = await fetch("https://zernio.com/api/v1/whatsapp/templates", {
      method: "POST",
      headers: { Authorization: `Bearer ${ZERNIO_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(zernioBody),
      signal: AbortSignal.timeout(ZERNIO_TIMEOUT_MS),
    });
    const data = await resp.json().catch(() => null);
    return json({ ok: resp.ok, status: resp.status, data });
  } catch (e) {
    console.error("whatsapp-plantilla-crear: excepcion no capturada:", e instanceof Error ? (e.stack || e.message) : String(e));
    return json({ ok: false, error: "error_interno" }, 500);
  }
});
