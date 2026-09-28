import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.112.2";

// sentry-alerta-whatsapp (28-sep-2026) — cuando Sentry detecta un error nuevo en NEXUS PRO, STUDIO o Deluxe,
// avisa por WhatsApp SOLO al administrador (agentes.cargo = ADMIN). Nunca a clientes ni a otros agentes.
//
// Entradas:
//   · Webhook de Sentry (integración interna): firmado con HMAC-SHA256 del cuerpo usando el «Client Secret»
//     de la integración, guardado por el dueño en el secreto SENTRY_WEBHOOK_SECRET (nunca en el repo ni el chat).
//   · Acciones internas {accion: "asegurar_plantilla" | "prueba"}: header x-cron-token = cron_secretos('sentry_alerta').
//     Se disparan desde SQL (net.http_post) para que el token no salga de la base.
//
// Meta no acepta variables al principio ni al final del texto: por eso cierra con «Aviso automático…».
// Frenos: el mismo error (issue) se avisa como mucho 1 vez cada 6 h, y como máximo 10 avisos por hora en total.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ZERNIO_API_KEY = Deno.env.get("ZERNIO_API_KEY") ?? "";
const SENTRY_WEBHOOK_SECRET = Deno.env.get("SENTRY_WEBHOOK_SECRET") ?? "";
const TEMPLATE = "alerta_error_sistema";
const TEMPLATE_BODY = "Alerta de sistema: se detectó un error nuevo en {{1}}. Detalle: {{2}}. Ambiente: {{3}}. Puedes revisarlo aquí: {{4}} — Aviso automático de NEXUS PRO.";
const TEMPLATE_EXAMPLE = ["NEXUS PRO", "TypeError: no se pudo leer el cliente", "produccion", "https://esterlin-espinal.sentry.io/issues/123/"];
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Proyectos de Sentry → nombre del sistema (por slug y por id numérico).
const SISTEMAS: Record<string, string> = {
  javascript: "NEXUS PRO", "4512164132814848": "NEXUS PRO",
  studio: "STUDIO", "4512164258381824": "STUDIO",
  deluxe: "Deluxe Beauty Center", "4512164285906944": "Deluxe Beauty Center",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
function tel(v: unknown): string | null {
  let d = String(v ?? "").replace(/\D/g, "");
  if (d.length === 10) d = "1" + d;
  return d.length >= 11 ? d : null;
}
// Meta rechaza (#132018) parámetros con saltos de línea, tabulaciones o más de 4 espacios seguidos.
function limpiar(v: unknown, max = 180) {
  const s = String(v ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim() || "-";
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
async function hmacHex(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function igualSeguro(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function cuentaZernio() {
  const { data } = await db.from("whatsapp_config").select("zernio_account_id").eq("activo", true).limit(1).maybeSingle();
  return data?.zernio_account_id ?? null;
}
async function estadoPlantilla(accountId: string) {
  const qs = new URLSearchParams({ accountId, name: TEMPLATE, language: "es" });
  const r = await fetch(`https://zernio.com/api/v1/whatsapp/templates?${qs}`, {
    headers: { Authorization: `Bearer ${ZERNIO_API_KEY}` }, signal: AbortSignal.timeout(20000),
  });
  const j = await r.json().catch(() => null);
  const rows = j?.templates ?? j?.data?.templates ?? [];
  const t = Array.isArray(rows) ? rows.find((x: any) => x?.name === TEMPLATE && x?.language === "es") : null;
  return t ? String(t.status || "DESCONOCIDO") : null;
}
async function asegurarPlantilla(accountId: string) {
  const estado = await estadoPlantilla(accountId);
  if (estado) return { plantilla: TEMPLATE, estado, creada: false };
  const r = await fetch("https://zernio.com/api/v1/whatsapp/templates", {
    method: "POST",
    headers: { Authorization: `Bearer ${ZERNIO_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      accountId, name: TEMPLATE, category: "UTILITY", language: "es",
      components: [{ type: "body", text: TEMPLATE_BODY, example: { body_text: [TEMPLATE_EXAMPLE] } }],
    }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await r.json().catch(() => null);
  return { plantilla: TEMPLATE, estado: r.ok ? "PENDING" : "ERROR", creada: r.ok, detalle: r.ok ? null : data };
}

async function avisarAdmin(accountId: string, vars: string[], issueId: string, proyecto: string) {
  const { data: agentes } = await db.from("agentes").select("id,tel,cargo");
  const admins = (agentes || []).filter((a: any) => String(a.cargo || "").toUpperCase() === "ADMIN" && tel(a.tel));
  if (!admins.length) return { enviados: 0, error: "sin_admin_con_telefono" };
  let enviados = 0;
  const errores: unknown[] = [];
  for (const a of admins) {
    const r = await fetch("https://zernio.com/api/v1/inbox/conversations", {
      method: "POST",
      headers: { Authorization: `Bearer ${ZERNIO_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, participantId: tel(a.tel), templateName: TEMPLATE, templateLanguage: "es", templateParams: vars }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await r.json().catch(() => null);
    const ok = r.ok && data?.success !== false;
    await db.from("whatsapp_mensajes").insert({
      tipo: "alerta_sentry", agente_id: a.id, plantilla_nombre: TEMPLATE, plantilla_variables: vars,
      estado: ok ? "enviado" : "error", zernio_message_id: ok ? (data?.data?.messageId ?? null) : null,
      error_detalle: ok ? null : JSON.stringify({ status: r.status, data }).slice(0, 1000),
    });
    if (ok) enviados++; else errores.push({ status: r.status });
  }
  await db.from("sentry_alertas_log").insert({ issue_id: issueId, proyecto, enviados });
  return { enviados, errores };
}

// Extrae lo necesario del payload de Sentry (alerta «event_alert» o webhook «issue»).
function leerSentry(recurso: string, p: any) {
  const ev = p?.data?.event;
  const is = p?.data?.issue;
  if (recurso === "event_alert" && ev) {
    return {
      issueId: String(ev.issue_id ?? ev.groupID ?? ev.event_id ?? ""),
      proyecto: String(ev.project ?? ev.project_slug ?? ""),
      titulo: ev.title ?? ev.message ?? "Error",
      ambiente: ev.environment ?? "-",
      enlace: ev.web_url ?? ev.issue_url ?? "https://esterlin-espinal.sentry.io/issues/",
    };
  }
  if (recurso === "issue" && is && p?.action === "created") {
    return {
      issueId: String(is.id ?? ""),
      proyecto: String(is.project?.slug ?? is.project?.id ?? ""),
      titulo: is.title ?? "Error",
      ambiente: is.environment ?? "-",
      enlace: is.web_url ?? is.permalink ?? "https://esterlin-espinal.sentry.io/issues/",
    };
  }
  return null;
}

async function frenos(issueId: string) {
  const hace6h = new Date(Date.now() - 6 * 3600e3).toISOString();
  const hace1h = new Date(Date.now() - 3600e3).toISOString();
  const { count: repetido } = await db.from("sentry_alertas_log").select("id", { count: "exact", head: true }).eq("issue_id", issueId).gte("created_at", hace6h);
  if ((repetido ?? 0) > 0) return "mismo_error_avisado_hace_menos_de_6h";
  const { count: ultimaHora } = await db.from("sentry_alertas_log").select("id", { count: "exact", head: true }).gte("created_at", hace1h);
  if ((ultimaHora ?? 0) >= 10) return "limite_10_por_hora";
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  if (!ZERNIO_API_KEY) return json({ ok: false, error: "zernio_no_configurado" }, 500);
  const raw = await req.text();
  let body: any = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { return json({ ok: false, error: "body_invalido" }, 400); }

  try {
    // 1) Acciones internas (desde SQL con el token de cron_secretos).
    const token = (req.headers.get("x-cron-token") || "").trim();
    if (token) {
      const { data: sec } = await db.from("cron_secretos").select("valor").eq("nombre", "sentry_alerta").maybeSingle();
      if (!sec?.valor || !igualSeguro(token, String(sec.valor))) return json({ ok: false, error: "no_autorizado" }, 401);
      const accountId = await cuentaZernio();
      if (!accountId) return json({ ok: false, error: "whatsapp_no_configurado" }, 409);
      if (body.accion === "asegurar_plantilla") return json({ ok: true, ...(await asegurarPlantilla(accountId)) });
      if (body.accion === "prueba") {
        const estado = await estadoPlantilla(accountId);
        if (estado !== "APPROVED") return json({ ok: false, error: "plantilla_no_aprobada", estado });
        const vars = ["NEXUS PRO", "Prueba de alerta: esto no es un error real", "prueba", "https://esterlin-espinal.sentry.io/issues/"];
        return json({ ok: true, ...(await avisarAdmin(accountId, vars, `prueba-${Date.now()}`, "prueba")) });
      }
      return json({ ok: false, error: "accion_desconocida" }, 400);
    }

    // 2) Webhook de Sentry (firmado).
    if (!SENTRY_WEBHOOK_SECRET) return json({ ok: false, error: "sentry_no_configurado" }, 503);
    const firma = (req.headers.get("sentry-hook-signature") || "").trim().toLowerCase();
    if (!firma || !igualSeguro(firma, await hmacHex(SENTRY_WEBHOOK_SECRET, raw))) return json({ ok: false, error: "firma_invalida" }, 401);

    const recurso = (req.headers.get("sentry-hook-resource") || "").trim();
    const info = leerSentry(recurso, body);
    if (!info || !info.issueId) return json({ ok: true, ignorado: recurso || "sin_recurso" });

    const motivo = await frenos(info.issueId);
    if (motivo) return json({ ok: true, omitido: motivo });

    const accountId = await cuentaZernio();
    if (!accountId) return json({ ok: false, error: "whatsapp_no_configurado" }, 409);
    const sistema = SISTEMAS[info.proyecto] ?? (info.proyecto || "un sistema");
    const vars = [limpiar(sistema, 60), limpiar(info.titulo, 180), limpiar(info.ambiente, 30), limpiar(info.enlace, 200)];
    return json({ ok: true, ...(await avisarAdmin(accountId, vars, info.issueId, info.proyecto)) });
  } catch (e) {
    console.error("sentry-alerta-whatsapp:", e instanceof Error ? e.message : String(e));
    return json({ ok: false, error: "error_interno" }, 500);
  }
});
