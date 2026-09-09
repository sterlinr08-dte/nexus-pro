import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.112.2";

// NEXUS PRO · Plantillas WhatsApp vía Zernio
// - listar: lee el estado real de plantillas desde Meta/Zernio
// - enviar: inicia/reabre una conversación con una plantilla aprobada
// Nunca expone ZERNIO_API_KEY al navegador.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ZERNIO_API_KEY = Deno.env.get("ZERNIO_API_KEY") ?? "";
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const TIMEOUT = 20000;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, prefer",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
function subDelJWT(req: Request): string | null {
  try {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const p = token.split(".")[1];
    const decoded = JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/")));
    return decoded.sub ?? null;
  } catch { return null; }
}
async function acceso(sub: string | null): Promise<{ ok: boolean; accountId: string | null }> {
  if (!sub) return { ok: false, accountId: null };
  const { data: pr } = await db.from("profiles").select("rol,usuario_sistema_id").eq("id", sub).maybeSingle();
  if (!pr?.rol || !pr.usuario_sistema_id) return { ok: false, accountId: null };
  const { data: us } = await db.from("usuarios_sistema").select("organizacion_id").eq("id", pr.usuario_sistema_id).maybeSingle();
  const { data: org } = await db.from("organizaciones").select("id").eq("slug", "nexus-pro").maybeSingle();
  if (!us?.organizacion_id || !org?.id || us.organizacion_id !== org.id) return { ok: false, accountId: null };
  const { data: cfg } = await db.from("whatsapp_config").select("zernio_account_id").eq("activo", true).limit(1).maybeSingle();
  return { ok: !!cfg?.zernio_account_id, accountId: cfg?.zernio_account_id ?? null };
}
function normalizarTelefono(v: unknown): string | null {
  let d = String(v ?? "").replace(/\D/g, "");
  if (d.length === 10) d = "1" + d;
  return d.length >= 11 ? d : null;
}
async function zernio(url: string, init: RequestInit): Promise<{ ok: boolean; status: number; data: any }> {
  const resp = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${ZERNIO_API_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) },
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const data = await resp.json().catch(() => null);
  return { ok: resp.ok && data?.success !== false, status: resp.status, data };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "metodo_no_permitido" }, 405);
  if (!ZERNIO_API_KEY) return json({ ok: false, error: "zernio_no_configurado" }, 500);

  try {
    const auth = await acceso(subDelJWT(req));
    if (!auth.ok || !auth.accountId) return json({ ok: false, error: "no_autorizado" }, 403);
    const body = await req.json().catch(() => ({}));
    const accion = String(body.accion || "listar");

    if (accion === "listar") {
      const qs = new URLSearchParams({ accountId: auth.accountId });
      const estado = String(body.estado || "").trim().toUpperCase();
      const nombre = String(body.nombre || "").trim();
      const idioma = String(body.idioma || "").trim();
      if (estado) qs.set("status", estado);
      if (nombre) qs.set("name", nombre);
      if (idioma) qs.set("language", idioma);
      const r = await zernio(`https://zernio.com/api/v1/whatsapp/templates?${qs.toString()}`, { method: "GET" });
      if (!r.ok) return json({ ok: false, error: "zernio_templates_error", status: r.status, detalle: r.data }, 502);
      return json({ ok: true, templates: r.data?.templates ?? r.data?.data?.templates ?? [] });
    }

    if (accion === "enviar") {
      const hiloId = String(body.hilo_id || "").trim();
      const templateName = String(body.template_name || "").trim();
      const templateLanguage = String(body.template_language || "es").trim();
      const templateParams = Array.isArray(body.template_params) ? body.template_params.map((x: unknown) => String(x ?? "")) : [];
      if (!hiloId || !templateName) return json({ ok: false, error: "faltan_campos" }, 400);

      const { data: hilo } = await db.from("whatsapp_hilos").select("id,telefono_e164,cliente_id,nombre_perfil").eq("id", hiloId).maybeSingle();
      if (!hilo) return json({ ok: false, error: "hilo_no_encontrado" }, 404);
      if (String(hilo.telefono_e164 || "").startsWith("bsid:")) return json({ ok: false, error: "hilo_sin_telefono_utilizable" }, 409);
      const telefono = normalizarTelefono(hilo.telefono_e164);
      if (!telefono) return json({ ok: false, error: "telefono_invalido" }, 400);

      // Validación fresca: la plantilla debe existir como APPROVED antes de intentar enviarla.
      const q = new URLSearchParams({ accountId: auth.accountId, status: "APPROVED", name: templateName, language: templateLanguage });
      const check = await zernio(`https://zernio.com/api/v1/whatsapp/templates?${q.toString()}`, { method: "GET" });
      const aprobadas = check.data?.templates ?? check.data?.data?.templates ?? [];
      if (!check.ok || !Array.isArray(aprobadas) || !aprobadas.some((t: any) => t?.name === templateName && t?.language === templateLanguage && t?.status === "APPROVED")) {
        return json({ ok: false, error: "plantilla_no_aprobada" }, 409);
      }

      const r = await zernio("https://zernio.com/api/v1/inbox/conversations", {
        method: "POST",
        body: JSON.stringify({
          accountId: auth.accountId,
          participantId: telefono,
          templateName,
          templateLanguage,
          templateParams,
        }),
      });
      if (!r.ok) return json({ ok: false, error: "zernio_envio_error", status: r.status, detalle: r.data }, 502);

      const data = r.data?.data ?? r.data ?? {};
      return json({ ok: true, messageId: data.messageId ?? null, conversationId: data.conversationId ?? null });
    }

    return json({ ok: false, error: "accion_invalida" }, 400);
  } catch (e) {
    console.error("whatsapp-plantillas-gestionar", e instanceof Error ? (e.stack || e.message) : String(e));
    return json({ ok: false, error: "error_interno" }, 500);
  }
});
