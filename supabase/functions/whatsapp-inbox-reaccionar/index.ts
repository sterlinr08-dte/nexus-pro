import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// NEXUS PRO · WhatsApp Inbox · reacciones de mensaje
// Endpoint aislado: autoriza al usuario, reacciona en Zernio/WhatsApp y persiste
// solo la reaccion del agente sobre el mensaje local correspondiente.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ZERNIO_API_KEY = Deno.env.get("ZERNIO_API_KEY") ?? "";
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
function subDelJWT(req: Request): string | null {
  try {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const p = token.split(".")[1];
    const payload = JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/")));
    return payload.sub ?? null;
  } catch { return null; }
}
async function autorizado(sub: string | null): Promise<boolean> {
  if (!sub) return false;
  const { data: profile } = await db.from("profiles").select("rol,usuario_sistema_id").eq("id", sub).maybeSingle();
  if (!profile?.rol || !profile.usuario_sistema_id) return false;
  const { data: usuario } = await db.from("usuarios_sistema").select("organizacion_id").eq("id", profile.usuario_sistema_id).maybeSingle();
  if (!usuario?.organizacion_id) return false;
  const { data: org } = await db.from("organizaciones").select("id").eq("slug", "nexus-pro").maybeSingle();
  return !!org?.id && org.id === usuario.organizacion_id;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "metodo_no_permitido" }, 405);

  try {
    if (!(await autorizado(subDelJWT(req)))) return json({ ok: false, error: "no_autorizado" }, 403);
    const body = await req.json().catch(() => null) as null | { hilo_id?: string; mensaje_id?: string; emoji?: string; quitar?: boolean };
    const hiloId = String(body?.hilo_id || "").trim();
    const mensajeId = String(body?.mensaje_id || "").trim();
    const quitar = body?.quitar === true;
    const emoji = quitar ? "" : String(body?.emoji || "").trim();
    if (!hiloId || !mensajeId) return json({ ok: false, error: "faltan_datos" }, 400);
    if (!quitar && (!emoji || emoji.length > 16)) return json({ ok: false, error: "emoji_invalido" }, 400);

    const { data: mensaje } = await db.from("whatsapp_hilo_mensajes")
      .select("id,hilo_id,wa_message_id")
      .eq("id", mensajeId).eq("hilo_id", hiloId).maybeSingle();
    if (!mensaje) return json({ ok: false, error: "mensaje_no_encontrado" }, 404);
    if (!mensaje.wa_message_id) return json({ ok: false, error: "mensaje_sin_id_whatsapp", mensaje: "Este mensaje todavía no tiene un ID de WhatsApp para reaccionar." }, 409);

    const { data: hilo } = await db.from("whatsapp_hilos").select("id,telefono_e164").eq("id", hiloId).maybeSingle();
    if (!hilo?.telefono_e164) return json({ ok: false, error: "hilo_no_encontrado" }, 404);
    const { data: config } = await db.from("whatsapp_config").select("zernio_account_id").eq("activo", true).limit(1).maybeSingle();
    if (!config?.zernio_account_id) return json({ ok: false, error: "sin_configurar" }, 500);
    if (!ZERNIO_API_KEY) return json({ ok: false, error: "zernio_sin_api_key" }, 500);

    const conversationId = hilo.telefono_e164.startsWith("bsid:") ? hilo.telefono_e164.slice(5) : hilo.telefono_e164;
    const base = `https://zernio.com/api/v1/inbox/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(mensaje.wa_message_id)}/reactions`;
    let resp: Response;
    if (quitar) {
      const url = `${base}?accountId=${encodeURIComponent(config.zernio_account_id)}`;
      resp = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${ZERNIO_API_KEY}` },
        signal: AbortSignal.timeout(20000),
      });
    } else {
      resp = await fetch(base, {
        method: "POST",
        headers: { Authorization: `Bearer ${ZERNIO_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: config.zernio_account_id, emoji }),
        signal: AbortSignal.timeout(20000),
      });
    }
    const detalle = await resp.json().catch(() => null);
    if (!resp.ok || detalle?.success === false) {
      console.error("whatsapp-inbox-reaccionar: Zernio no-ok", resp.status, JSON.stringify(detalle));
      return json({ ok: false, error: "zernio_reaccion_error", mensaje: detalle?.message || detalle?.error || "WhatsApp no aceptó la reacción." }, resp.status >= 400 && resp.status < 500 ? resp.status : 502);
    }

    const { error: updateError } = await db.from("whatsapp_hilo_mensajes")
      .update({ reaccion_agente: quitar ? null : emoji }).eq("id", mensajeId).eq("hilo_id", hiloId);
    if (updateError) {
      console.error("whatsapp-inbox-reaccionar: no se pudo persistir", updateError.message);
      return json({ ok: false, error: "reaccion_enviada_no_guardada" }, 500);
    }
    return json({ ok: true, emoji: quitar ? null : emoji });
  } catch (e) {
    console.error("whatsapp-inbox-reaccionar:", e instanceof Error ? (e.stack || e.message) : String(e));
    return json({ ok: false, error: "error_interno" }, 500);
  }
});
