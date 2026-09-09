import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.112.2";

// NEXUS PRO · Recordatorio de atraso v2
// Recibe los periodos reales vencidos desde Postgres y conserva la plantilla Meta
// recordatorio_atraso, usando {{3}} como: "2 meses (julio y agosto)".

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ZERNIO_API_KEY = (Deno.env.get("ZERNIO_API_KEY") || "").trim();
const INTERNAL_SECRET = (Deno.env.get("WHATSAPP_INTERNAL_SECRET") || "").trim();
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const TIMEOUT = 20000;

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
function telefono(v: unknown): string | null {
  let d = String(v ?? "").replace(/\D/g, "");
  if (d.length === 10) d = "1" + d;
  return d.length >= 11 ? d : null;
}
function fmtMonto(v: unknown): string {
  return (Number(v) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function joinNatural(xs: string[]): string {
  if (xs.length <= 1) return xs[0] || "";
  if (xs.length === 2) return `${xs[0]} y ${xs[1]}`;
  return `${xs.slice(0,-1).join(", ")} y ${xs[xs.length-1]}`;
}
function descriptorPeriodos(raw: unknown, meses: number): string {
  const arr = Array.isArray(raw) ? raw.map(String).filter(Boolean) : [];
  if (!arr.length) return `${meses} mes${meses === 1 ? "" : "es"}`;
  const parsed = arr.map(p => {
    const m = /^(\d{4})-(\d{2})$/.exec(p);
    if (!m) return { year: "", label: p };
    const nombre = MESES[Number(m[2]) - 1] || p;
    return { year: m[1], label: nombre };
  });
  const years = [...new Set(parsed.map(x => x.year).filter(Boolean))];
  const labels = parsed.map(x => years.length <= 1 ? x.label : `${x.label} ${x.year}`);
  return `${meses} mes${meses === 1 ? "" : "es"} (${joinNatural(labels)})`;
}
async function registrar(clienteId: string, refId: string | null, variables: string[], estado: string, msgId?: string | null, error?: string | null) {
  await db.from("whatsapp_mensajes").insert({
    cliente_id: clienteId,
    agente_id: null,
    tipo: "atrasado",
    referencia_id: refId,
    plantilla_nombre: "recordatorio_atraso",
    plantilla_variables: variables,
    estado,
    zernio_message_id: msgId ?? null,
    error_detalle: error ?? null,
  });
}
async function zernio(accountId: string, participantId: string, variables: string[]) {
  const r = await fetch("https://zernio.com/api/v1/inbox/conversations", {
    method: "POST",
    headers: { Authorization: `Bearer ${ZERNIO_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, participantId, templateName: "recordatorio_atraso", templateLanguage: "es", templateParams: variables }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const data = await r.json().catch(() => null);
  return { ok: r.ok && data?.success !== false, status: r.status, data };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok:false, error:"method_not_allowed" }, 405);
  if (!INTERNAL_SECRET || req.headers.get("X-Internal-Secret") !== INTERNAL_SECRET) return json({ ok:false, error:"no_autorizado" }, 401);
  if (!ZERNIO_API_KEY) return json({ ok:false, error:"zernio_no_configurado" }, 500);

  try {
    const body = await req.json().catch(() => ({}));
    const clienteId = String(body.cliente_id || "").trim();
    const refId = body.referencia_id ? String(body.referencia_id) : null;
    const datos = body.datos || {};
    if (!clienteId) return json({ ok:false, error:"cliente_requerido" }, 400);

    const { data: c } = await db.from("clientes").select("nom,wa,whatsapp_optout_en").eq("id", clienteId).maybeSingle();
    if (!c) return json({ ok:false, error:"cliente_no_encontrado" }, 404);

    const meses = Math.max(1, Number(datos.meses) || 1);
    const descriptor = descriptorPeriodos(datos.periodos, meses);
    const variables = [String(c.nom || "cliente"), fmtMonto(datos.monto), descriptor];

    if (c.whatsapp_optout_en) {
      await registrar(clienteId, refId, variables, "error", null, "cliente con opt-out de WhatsApp");
      return json({ ok:true, estado:"error", motivo:"optout" });
    }
    const tel = telefono(c.wa);
    if (!tel) {
      await registrar(clienteId, refId, variables, "error", null, "cliente sin WhatsApp registrado");
      return json({ ok:true, estado:"error", motivo:"sin_whatsapp" });
    }
    const { data: cfg } = await db.from("whatsapp_config").select("zernio_account_id").eq("activo", true).limit(1).maybeSingle();
    if (!cfg?.zernio_account_id) {
      await registrar(clienteId, refId, variables, "sin_configurar");
      return json({ ok:true, estado:"sin_configurar" });
    }

    const r = await zernio(cfg.zernio_account_id, tel, variables);
    if (!r.ok) {
      await registrar(clienteId, refId, variables, "error", null, JSON.stringify(r.data));
      return json({ ok:false, estado:"error", detalle:r.data }, 502);
    }

    await registrar(clienteId, refId, variables, "enviado", r.data?.data?.messageId ?? null);
    await db.from("clientes").update({ ultimo_aviso_atraso_en: new Date().toISOString() }).eq("id", clienteId);
    if (refId) await db.from("facturas").update({ notificado_atraso_en: new Date().toISOString() }).eq("id", refId).is("notificado_atraso_en", null);
    return json({ ok:true, estado:"enviado", descriptor });
  } catch (e) {
    console.error("whatsapp-notificar-atraso-v2", e instanceof Error ? (e.stack || e.message) : String(e));
    return json({ ok:false, error:"error_interno" }, 500);
  }
});
