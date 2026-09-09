import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.112.2";

// NEXUS PRO · Recordatorio manual neutral de pago pendiente
// Se invoca desde el filtro Cobranza del Inbox. No usa texto libre ni abre wa.me:
// siempre usa la plantilla Meta aprobada `recordatorio_pago_pendiente` vía Zernio.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ZERNIO_API_KEY = (Deno.env.get("ZERNIO_API_KEY") || "").trim();
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
async function acceso(sub: string | null): Promise<boolean> {
  if (!sub) return false;
  const { data: pr } = await db.from("profiles").select("rol,usuario_sistema_id").eq("id", sub).maybeSingle();
  if (!pr?.rol || !pr.usuario_sistema_id) return false;
  const { data: us } = await db.from("usuarios_sistema").select("organizacion_id").eq("id", pr.usuario_sistema_id).maybeSingle();
  const { data: org } = await db.from("organizaciones").select("id").eq("slug", "nexus-pro").maybeSingle();
  return !!(us?.organizacion_id && org?.id && us.organizacion_id === org.id);
}
function telefono(v: unknown): string | null {
  let d = String(v ?? "").replace(/\D/g, "");
  if (d.length === 10) d = "1" + d;
  return d.length >= 11 ? d : null;
}
function fmtMonto(v: unknown): string {
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
async function registrar(clienteId: string, referenciaId: string | null, variables: string[], estado: string, messageId: string | null = null, detalle: string | null = null) {
  const { error } = await db.from("whatsapp_mensajes").insert({
    cliente_id: clienteId,
    agente_id: null,
    tipo: "recordatorio_pago_pendiente",
    referencia_id: referenciaId,
    plantilla_nombre: "recordatorio_pago_pendiente",
    plantilla_variables: variables,
    estado,
    zernio_message_id: messageId,
    error_detalle: detalle,
  });
  if (error) console.error("registrar recordatorio pendiente:", error.message);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "metodo_no_permitido" }, 405);
  if (!ZERNIO_API_KEY) return json({ ok: false, error: "zernio_no_configurado" }, 500);

  try {
    if (!(await acceso(subDelJWT(req)))) return json({ ok: false, error: "no_autorizado" }, 403);
    const body = await req.json().catch(() => ({}));
    const hiloId = String(body.hilo_id || "").trim();
    if (!hiloId) return json({ ok: false, error: "hilo_requerido" }, 400);

    const { data: hilo } = await db.from("whatsapp_hilos").select("id,cliente_id,telefono_e164").eq("id", hiloId).maybeSingle();
    if (!hilo?.cliente_id) return json({ ok: false, error: "hilo_sin_cliente" }, 409);

    const { data: cliente } = await db.from("clientes")
      .select("id,nom,wa,pagado,whatsapp_optout_en")
      .eq("id", hilo.cliente_id).maybeSingle();
    if (!cliente) return json({ ok: false, error: "cliente_no_encontrado" }, 404);
    if (cliente.whatsapp_optout_en) {
      const vars = [String(cliente.nom || "cliente"), "0.00"];
      await registrar(cliente.id, null, vars, "error", null, "cliente con opt-out de WhatsApp");
      return json({ ok: false, error: "cliente_optout" }, 409);
    }

    const { data: facturas, error: ef } = await db.from("facturas")
      .select("id,periodo,prima_base,prima_deps,estado")
      .eq("cliente_id", cliente.id)
      .neq("estado", "Anulada")
      .order("periodo", { ascending: true });
    if (ef) throw ef;

    let credito = Number(cliente.pagado) || 0;
    let saldo = 0;
    let primeraPendienteId: string | null = null;
    let primeraPendientePeriodo: string | null = null;
    for (const f of (facturas || [])) {
      const total = (Number(f.prima_base) || 0) + (Number(f.prima_deps) || 0);
      const aplicado = Math.min(Math.max(credito, 0), total);
      const restante = Math.max(0, total - aplicado);
      credito = Math.max(0, credito - aplicado);
      if (restante > 0.009) {
        saldo += restante;
        if (!primeraPendienteId) {
          primeraPendienteId = f.id;
          primeraPendientePeriodo = f.periodo || null;
        }
      }
    }
    if (saldo <= 0.009 || !primeraPendienteId) return json({ ok: false, error: "sin_saldo_pendiente" }, 409);

    const numero = telefono(cliente.wa || hilo.telefono_e164);
    const nombre = String(cliente.nom || "cliente");
    const variables = [nombre, fmtMonto(saldo)];
    if (!numero) {
      await registrar(cliente.id, primeraPendienteId, variables, "error", null, "cliente sin WhatsApp válido");
      return json({ ok: false, error: "telefono_invalido" }, 409);
    }

    // Evita doble toque accidental, sin imponer una cadencia comercial a una acción manual.
    const desde = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: reciente } = await db.from("whatsapp_mensajes")
      .select("id")
      .eq("cliente_id", cliente.id)
      .eq("tipo", "recordatorio_pago_pendiente")
      .eq("estado", "enviado")
      .gte("created_at", desde)
      .limit(1);
    if (reciente?.length) return json({ ok: true, duplicado: true, monto: saldo, periodo: primeraPendientePeriodo });

    const { data: cfg } = await db.from("whatsapp_config").select("zernio_account_id").eq("activo", true).limit(1).maybeSingle();
    const accountId = cfg?.zernio_account_id;
    if (!accountId) {
      await registrar(cliente.id, primeraPendienteId, variables, "sin_configurar", null, "WhatsApp NEXUS PRO sin cuenta activa");
      return json({ ok: false, error: "whatsapp_no_configurado" }, 409);
    }

    // Validación fresca: solo se envía si Meta sigue mostrando la plantilla como APPROVED.
    const qs = new URLSearchParams({ accountId, status: "APPROVED", name: "recordatorio_pago_pendiente", language: "es" });
    const check = await zernio(`https://zernio.com/api/v1/whatsapp/templates?${qs.toString()}`, { method: "GET" });
    const plantillas = check.data?.templates ?? check.data?.data?.templates ?? [];
    const aprobada = check.ok && Array.isArray(plantillas) && plantillas.some((t: any) =>
      t?.name === "recordatorio_pago_pendiente" && t?.language === "es" && t?.status === "APPROVED"
    );
    if (!aprobada) {
      await registrar(cliente.id, primeraPendienteId, variables, "error", null, "plantilla recordatorio_pago_pendiente no aprobada en Meta");
      return json({ ok: false, error: "plantilla_no_aprobada" }, 409);
    }

    const envio = await zernio("https://zernio.com/api/v1/inbox/conversations", {
      method: "POST",
      body: JSON.stringify({
        accountId,
        participantId: numero,
        templateName: "recordatorio_pago_pendiente",
        templateLanguage: "es",
        templateParams: variables,
      }),
    });
    if (!envio.ok) {
      await registrar(cliente.id, primeraPendienteId, variables, "error", null, JSON.stringify(envio.data));
      return json({ ok: false, error: "zernio_envio_error", status: envio.status }, 502);
    }

    const data = envio.data?.data ?? envio.data ?? {};
    await registrar(cliente.id, primeraPendienteId, variables, "enviado", data.messageId ?? null, null);
    return json({ ok: true, monto: saldo, periodo: primeraPendientePeriodo, messageId: data.messageId ?? null });
  } catch (e) {
    console.error("whatsapp-recordatorio-pendiente-manual", e instanceof Error ? (e.stack || e.message) : String(e));
    return json({ ok: false, error: "error_interno" }, 500);
  }
});
