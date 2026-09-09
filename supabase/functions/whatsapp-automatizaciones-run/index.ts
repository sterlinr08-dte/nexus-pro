import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.112.2";

// NEXUS PRO · Motor horario de reglas inteligentes
// Ejecuta reglas configuradas en whatsapp_reglas_custom.
// Lo llama pg_cron via X-Internal-Secret; nunca expone ZERNIO_API_KEY al navegador.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ZERNIO_API_KEY = (Deno.env.get("ZERNIO_API_KEY") || "").trim();
const INTERNAL_SECRET = (Deno.env.get("WHATSAPP_INTERNAL_SECRET") || "").trim();
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const ZERNIO_TIMEOUT = 20000;

type Regla = {
  id: string;
  organizacion_id: string;
  nombre: string;
  activo: boolean;
  trigger_tipo: string;
  trigger_dias: number;
  accion_tipo: "crear_tarea" | "whatsapp_plantilla";
  accion_config: Record<string, any>;
  repetir_dias: number;
};
type Candidato = { cliente_id: string; entidad_id: string | null; huella: string; contexto: Record<string, any> };

type Cliente = {
  id: string;
  nom: string | null;
  wa: string | null;
  agente_id: string | null;
  ars: string | null;
  plan: string | null;
  numero_poliza: string | null;
  fecha_fin: string | null;
  responsable_seguimiento: string | null;
  whatsapp_optout_en: string | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
function telefono(v: unknown): string | null {
  let d = String(v ?? "").replace(/\D/g, "");
  if (d.length === 10) d = "1" + d;
  return d.length >= 11 ? d : null;
}
function str(v: unknown): string { return v == null ? "" : String(v); }
function contextoGet(ctx: Record<string, any>, key: string): string {
  const parts = key.split(".");
  let v: any = ctx;
  for (const p of parts) v = v && typeof v === "object" ? v[p] : undefined;
  return str(v);
}
function resolverParametro(key: string, c: Cliente, regla: Regla, ctx: Record<string, any>): string {
  switch (key) {
    case "cliente.nombre": return str(c.nom || "cliente");
    case "cliente.ars": return str(c.ars);
    case "cliente.plan": return str(c.plan);
    case "cliente.numero_poliza": return str(c.numero_poliza);
    case "cliente.fecha_fin": return c.fecha_fin ? new Date(c.fecha_fin).toLocaleDateString("es-DO") : "";
    case "cliente.responsable": return str(c.responsable_seguimiento);
    case "regla.dias": return String(Number(regla.trigger_dias) || 0);
    default:
      if (key.startsWith("contexto.")) return contextoGet(ctx, key.slice(9));
      if (key.startsWith("texto:")) return key.slice(6);
      return "";
  }
}
async function registrar(regla: Regla, cand: Candidato, estado: "ok" | "error" | "omitido", detalle: string, extra: Record<string, any> = {}) {
  const { error } = await db.from("whatsapp_reglas_ejecuciones").insert({
    organizacion_id: regla.organizacion_id,
    regla_id: regla.id,
    cliente_id: cand.cliente_id,
    entidad_id: cand.entidad_id || null,
    huella: cand.huella,
    accion_tipo: regla.accion_tipo,
    estado,
    detalle: detalle.slice(0, 1000),
    contexto: { ...(cand.contexto || {}), ...extra },
  });
  if (error) console.error("registrar ejecución:", error.message);
}
async function yaEjecutada(regla: Regla, cand: Candidato): Promise<boolean> {
  let q = db.from("whatsapp_reglas_ejecuciones")
    .select("created_at")
    .eq("regla_id", regla.id)
    .eq("huella", cand.huella)
    .eq("estado", "ok")
    .order("created_at", { ascending: false })
    .limit(1);
  if ((Number(regla.repetir_dias) || 0) > 0) {
    const desde = new Date(Date.now() - Number(regla.repetir_dias) * 86400000).toISOString();
    q = q.gte("created_at", desde);
  }
  const { data, error } = await q;
  if (error) throw error;
  return !!data?.length;
}
async function obtenerCliente(id: string): Promise<Cliente | null> {
  const { data, error } = await db.from("clientes")
    .select("id,nom,wa,agente_id,ars,plan,numero_poliza,fecha_fin,responsable_seguimiento,whatsapp_optout_en")
    .eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Cliente | null;
}
async function crearTarea(regla: Regla, cand: Candidato, cliente: Cliente) {
  const cfg = regla.accion_config || {};
  const venceDias = Math.max(0, Math.min(365, Number(cfg.vence_dias ?? 1) || 0));
  const vence = new Date(Date.now() + venceDias * 86400000).toISOString();
  const titulo = str(cfg.titulo || regla.nombre || "Seguimiento automático").slice(0, 160);
  const prioridad = ["baja", "media", "alta", "urgente"].includes(str(cfg.prioridad).toLowerCase()) ? str(cfg.prioridad).toLowerCase() : "media";
  const asignado = cfg.asignar === "agente_cliente" ? cliente.agente_id : null;
  const { error } = await db.from("crm_tareas").insert({
    cliente_id: cliente.id,
    titulo,
    tipo: "seguimiento",
    prioridad,
    estado: "pendiente",
    vence_en: vence,
    asignado_agente_id: asignado || null,
  });
  if (error) throw error;
}
async function zernio(url: string, init: RequestInit) {
  const r = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${ZERNIO_API_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) },
    signal: AbortSignal.timeout(ZERNIO_TIMEOUT),
  });
  const data = await r.json().catch(() => null);
  return { ok: r.ok && data?.success !== false, status: r.status, data };
}
async function enviarPlantilla(regla: Regla, cand: Candidato, cliente: Cliente) {
  if (cliente.whatsapp_optout_en) return { omitido: true, detalle: "cliente con baja de WhatsApp (opt-out)" };
  if (!ZERNIO_API_KEY) throw new Error("ZERNIO_API_KEY no configurada");
  const tel = telefono(cliente.wa);
  if (!tel) throw new Error("cliente sin WhatsApp válido");
  const cfg = regla.accion_config || {};
  const name = str(cfg.template_name).trim();
  const language = str(cfg.template_language || "es").trim() || "es";
  if (!name) throw new Error("regla sin plantilla configurada");

  const { data: waCfg } = await db.from("whatsapp_config").select("zernio_account_id").eq("activo", true).limit(1).maybeSingle();
  const accountId = waCfg?.zernio_account_id;
  if (!accountId) throw new Error("WhatsApp NEXUS PRO no configurado");

  const qs = new URLSearchParams({ accountId, status: "APPROVED", name, language });
  const check = await zernio(`https://zernio.com/api/v1/whatsapp/templates?${qs.toString()}`, { method: "GET" });
  const templates = check.data?.templates ?? check.data?.data?.templates ?? [];
  const approved = Array.isArray(templates) && templates.some((t: any) => t?.name === name && t?.language === language && t?.status === "APPROVED");
  if (!check.ok || !approved) throw new Error("plantilla no aprobada en Meta");

  const keys = Array.isArray(cfg.param_keys) ? cfg.param_keys.map(String) : [];
  const params = keys.map((k: string) => resolverParametro(k, cliente, regla, cand.contexto || {}));
  const send = await zernio("https://zernio.com/api/v1/inbox/conversations", {
    method: "POST",
    body: JSON.stringify({
      accountId,
      participantId: tel,
      templateName: name,
      templateLanguage: language,
      templateParams: params,
    }),
  });
  if (!send.ok) throw new Error(`Zernio rechazó el envío (${send.status})`);
  const d = send.data?.data ?? send.data ?? {};
  return { omitido: false, detalle: "plantilla enviada", messageId: d.messageId ?? null, conversationId: d.conversationId ?? null };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  if (!INTERNAL_SECRET || req.headers.get("X-Internal-Secret") !== INTERNAL_SECRET) return json({ ok: false, error: "no_autorizado" }, 401);

  try {
    const { data: reglas, error: eReglas } = await db.from("whatsapp_reglas_custom").select("*").eq("activo", true);
    if (eReglas) throw eReglas;
    let evaluadas = 0, ejecutadas = 0, omitidas = 0, errores = 0;

    for (const raw of (reglas || []) as Regla[]) {
      const regla = raw as Regla;
      const { data: candidatos, error: eCand } = await db.rpc("whatsapp_regla_candidatos", { p_trigger_tipo: regla.trigger_tipo, p_dias: regla.trigger_dias });
      if (eCand) { console.error("candidatos", regla.id, eCand.message); errores++; continue; }

      for (const cand of (candidatos || []) as Candidato[]) {
        evaluadas++;
        try {
          if (await yaEjecutada(regla, cand)) { omitidas++; continue; }
          const cliente = await obtenerCliente(cand.cliente_id);
          if (!cliente) { await registrar(regla, cand, "omitido", "cliente no encontrado"); omitidas++; continue; }

          if (regla.accion_tipo === "crear_tarea") {
            await crearTarea(regla, cand, cliente);
            await registrar(regla, cand, "ok", "tarea creada automáticamente");
            ejecutadas++;
            continue;
          }

          if (regla.accion_tipo === "whatsapp_plantilla") {
            const r = await enviarPlantilla(regla, cand, cliente);
            if (r.omitido) { await registrar(regla, cand, "omitido", r.detalle); omitidas++; }
            else { await registrar(regla, cand, "ok", r.detalle, { message_id: r.messageId, conversation_id: r.conversationId }); ejecutadas++; }
            continue;
          }

          await registrar(regla, cand, "error", "acción desconocida");
          errores++;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await registrar(regla, cand, "error", msg);
          errores++;
        }
      }
    }

    return json({ ok: true, reglas: (reglas || []).length, evaluadas, ejecutadas, omitidas, errores });
  } catch (e) {
    console.error("whatsapp-automatizaciones-run", e instanceof Error ? (e.stack || e.message) : String(e));
    return json({ ok: false, error: "error_interno" }, 500);
  }
});
