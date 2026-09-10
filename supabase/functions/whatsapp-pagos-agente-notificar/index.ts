import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.112.2";

// NEXUS PRO · Avisos internos al agente por pagos bancarios y transferencias entre agentes.
// Solo acepta llamadas server-side con X-Internal-Secret. Nunca expone ZERNIO_API_KEY.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ZERNIO_API_KEY = (Deno.env.get("ZERNIO_API_KEY") || "").trim();
const INTERNAL_SECRET = (Deno.env.get("WHATSAPP_INTERNAL_SECRET") || "").trim();
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const TIMEOUT = 20000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
function tel(v: unknown): string | null {
  let d = String(v ?? "").replace(/\D/g, "");
  if (d.length === 10) d = "1" + d;
  return d.length >= 11 ? d : null;
}
function money(v: unknown): string {
  return (Number(v) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
async function zernio(url: string, init: RequestInit) {
  const r = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${ZERNIO_API_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) },
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const data = await r.json().catch(() => null);
  return { ok: r.ok && data?.success !== false, status: r.status, data };
}

const SPECS = {
  pago_pendiente_validacion: {
    name: "pago_pendiente_validacion_agente_v2",
    body: "Hola {{1}}. Tienes un pago pendiente de validar en NEXUS PRO por RD$ {{2}}. Cliente: {{3}}. Revisa el módulo Pagos por validar.",
    example: ["ROBINSON", "4,500.00", "JUAN PEREZ"],
  },
  pago_validado_resumen: {
    name: "pago_validado_resumen_agente",
    body: "Hola {{1}}. Validaste un pago de RD$ {{2}}. Tu monto acumulado validado en NEXUS PRO es RD$ {{3}}. Puedes consultarlo en el módulo de pagos.",
    example: ["ROBINSON", "4,500.00", "18,750.00"],
  },
  transferencia_confirmada_emisor: {
    name: "transferencia_confirmada_emisor",
    body: "Hola {{1}}. Tu transferencia de RD$ {{2}} a {{3}} fue confirmada. Tu monto acumulado en NEXUS PRO ahora es RD$ {{4}}. Consulta el detalle en NEXUS PRO.",
    example: ["ROBINSON", "20,000.00", "ESTERLIN", "5,000.00"],
  },
  transferencia_recibida: {
    name: "transferencia_recibida",
    body: "Hola {{1}}. Recibiste una transferencia de {{2}} por RD$ {{3}}. Tu monto acumulado en NEXUS PRO ahora es RD$ {{4}}. Consulta el detalle en NEXUS PRO.",
    example: ["ESTERLIN", "ROBINSON", "20,000.00", "60,000.00"],
  },
} as const;

type Tipo = keyof typeof SPECS;

async function config() {
  const { data } = await db.from("whatsapp_config").select("zernio_account_id").eq("activo", true).limit(1).maybeSingle();
  return data?.zernio_account_id ? String(data.zernio_account_id) : null;
}

async function registrar(agenteId: string, tipo: string, ref: string | null, tpl: string, vars: string[], estado: string, msgId?: string | null, error?: string | null) {
  await db.from("whatsapp_mensajes").insert({
    agente_id: agenteId,
    cliente_id: null,
    tipo,
    referencia_id: ref,
    plantilla_nombre: tpl,
    plantilla_variables: vars,
    estado,
    zernio_message_id: msgId ?? null,
    error_detalle: error ?? null,
  });
}

async function templateStatus(accountId: string, name: string) {
  const qs = new URLSearchParams({ accountId, name, language: "es" });
  const r = await zernio(`https://zernio.com/api/v1/whatsapp/templates?${qs.toString()}`, { method: "GET" });
  const arr = r.data?.templates ?? r.data?.data?.templates ?? [];
  const t = Array.isArray(arr) ? arr.find((x: any) => x?.name === name && String(x?.language || "es") === "es") : null;
  return { ok: r.ok, status: String(t?.status || "").toUpperCase(), found: !!t, raw: t };
}

async function asegurarPlantillas(accountId: string) {
  const out: any[] = [];
  for (const spec of Object.values(SPECS)) {
    const st = await templateStatus(accountId, spec.name);
    if (st.found) { out.push({ name: spec.name, status: st.status, created: false }); continue; }
    const r = await zernio("https://zernio.com/api/v1/whatsapp/templates", {
      method: "POST",
      body: JSON.stringify({
        accountId,
        name: spec.name,
        category: "UTILITY",
        language: "es",
        components: [{ type: "body", text: spec.body, example: { body_text: [spec.example] } }],
      }),
    });
    out.push({ name: spec.name, created: r.ok, status: r.ok ? "PENDING" : "ERROR", detalle: r.ok ? null : r.data });
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  if (!INTERNAL_SECRET || req.headers.get("X-Internal-Secret") !== INTERNAL_SECRET) return json({ ok: false, error: "no_autorizado" }, 401);
  if (!ZERNIO_API_KEY) return json({ ok: false, error: "zernio_no_configurado" }, 500);

  const body = await req.json().catch(() => ({}));
  const accountId = await config();
  if (!accountId) return json({ ok: false, error: "whatsapp_no_configurado" }, 409);

  if (body.accion === "asegurar_plantillas") {
    return json({ ok: true, templates: await asegurarPlantillas(accountId) });
  }

  const tipo = String(body.tipo || "") as Tipo;
  const spec = SPECS[tipo];
  const agenteId = String(body.agente_id || "");
  const referenciaId = body.referencia_id ? String(body.referencia_id) : null;
  const datos = body.datos && typeof body.datos === "object" ? body.datos : {};
  if (!spec || !agenteId) return json({ ok: false, error: "tipo_y_agente_requeridos" }, 400);

  const { data: agente } = await db.from("agentes").select("nom,tel").eq("id", agenteId).maybeSingle();
  if (!agente) return json({ ok: false, error: "agente_no_encontrado" }, 404);
  const telefono = tel(agente.tel);
  const nombre = String(agente.nom || "agente");

  let vars: string[];
  if (tipo === "pago_pendiente_validacion") {
    vars = [nombre, money(datos.monto), String(datos.cliente || "Cliente")];
  } else if (tipo === "pago_validado_resumen") {
    vars = [nombre, money(datos.monto), money(datos.acumulado)];
  } else if (tipo === "transferencia_confirmada_emisor") {
    vars = [nombre, money(datos.monto), String(datos.destino || "Agente"), money(datos.acumulado)];
  } else {
    vars = [nombre, String(datos.origen || "Agente"), money(datos.monto), money(datos.acumulado)];
  }

  if (!telefono) {
    await registrar(agenteId, tipo, referenciaId, spec.name, vars, "error", null, "agente sin WhatsApp registrado");
    return json({ ok: true, estado: "error", motivo: "sin_whatsapp" });
  }

  const st = await templateStatus(accountId, spec.name);
  if (!st.found || st.status !== "APPROVED") {
    const detalle = st.found ? `plantilla ${st.status || "sin estado"}; Meta todavía no la aprobó` : "plantilla no encontrada en Meta/Zernio";
    await registrar(agenteId, tipo, referenciaId, spec.name, vars, "error", null, detalle);
    return json({ ok: true, estado: "pendiente_meta", template_status: st.status || null });
  }

  try {
    const r = await zernio("https://zernio.com/api/v1/inbox/conversations", {
      method: "POST",
      body: JSON.stringify({ accountId, participantId: telefono, templateName: spec.name, templateLanguage: "es", templateParams: vars }),
    });
    if (!r.ok) {
      await registrar(agenteId, tipo, referenciaId, spec.name, vars, "error", null, JSON.stringify(r.data));
      return json({ ok: false, estado: "error", detalle: r.data }, 502);
    }
    const d = r.data?.data ?? r.data ?? {};
    await registrar(agenteId, tipo, referenciaId, spec.name, vars, "enviado", d.messageId ?? null);
    return json({ ok: true, estado: "enviado", messageId: d.messageId ?? null });
  } catch (e) {
    const detalle = e instanceof Error ? e.message : String(e);
    await registrar(agenteId, tipo, referenciaId, spec.name, vars, "error", null, detalle);
    return json({ ok: false, estado: "error", detalle }, 502);
  }
});
