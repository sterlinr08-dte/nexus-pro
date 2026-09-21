import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.112.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ZERNIO_API_KEY = Deno.env.get("ZERNIO_API_KEY") ?? "";
const TEMPLATE = "resumen_ciclo_agente";
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
function fmtMonto(v: unknown) {
  return (Number(v) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function tel(v: unknown): string | null {
  let d = String(v ?? "").replace(/\D/g, "");
  if (d.length === 10) d = "1" + d;
  return d.length >= 11 ? d : null;
}
function periodoAnterior(periodo: string): string {
  const [y, m] = periodo.split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 2, 1));
  return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`;
}
function periodoSiguiente(periodo: string): string {
  const [y, m] = periodo.split("-").map(Number);
  const next = new Date(Date.UTC(y, m, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function plantillaAprobada(accountId: string) {
  const qs = new URLSearchParams({ accountId, status: "APPROVED", name: TEMPLATE, language: "es" });
  const r = await fetch(`https://zernio.com/api/v1/whatsapp/templates?${qs}`, {
    headers: { Authorization: `Bearer ${ZERNIO_API_KEY}` }, signal: AbortSignal.timeout(20000)
  });
  const j = await r.json().catch(() => null);
  const rows = j?.templates ?? j?.data?.templates ?? [];
  return r.ok && Array.isArray(rows) && rows.some((t: any) => t?.name === TEMPLATE && t?.language === "es" && t?.status === "APPROVED");
}

async function enviar(telefono: string, accountId: string, variables: string[]) {
  const r = await fetch("https://zernio.com/api/v1/inbox/conversations", {
    method: "POST",
    headers: { Authorization: `Bearer ${ZERNIO_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, participantId: telefono, templateName: TEMPLATE, templateLanguage: "es", templateParams: variables }),
    signal: AbortSignal.timeout(20000)
  });
  const data = await r.json().catch(() => null);
  return { ok: r.ok && data?.success !== false, status: r.status, data };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  try {
    const token = (req.headers.get("x-cron-token") || "").trim();
    const { data: sec } = await db.from("cron_secretos").select("valor").eq("nombre", "reporte_whatsapp").maybeSingle();
    if (!sec?.valor || token !== String(sec.valor)) return json({ ok: false, error: "no_autorizado" }, 401);
    if (!ZERNIO_API_KEY) return json({ ok: false, error: "zernio_no_configurado" }, 500);

    const body = await req.json().catch(() => ({}));
    const dry = body?.dry === true;
    const forzar = body?.forzar === true;
    const periodoExplicito = body?.periodo ? String(body.periodo) : null;

    const { data: cfg } = await db.from("whatsapp_config").select("zernio_account_id,activo").eq("activo", true).limit(1).maybeSingle();
    if (!cfg?.zernio_account_id) return json({ ok: false, error: "whatsapp_sin_configurar" }, 409);
    if (!dry && !(await plantillaAprobada(cfg.zernio_account_id))) return json({ ok: false, error: "plantilla_no_aprobada" }, 409);

    // Obtener el cierre más reciente (o el periodo explícito)
    let cierreQuery = db.from("seguros_cierres_ciclo").select("id,periodo,cerrado_at,total_negocio_cobrado");
    if (periodoExplicito) {
      cierreQuery = cierreQuery.eq("periodo", periodoExplicito);
    } else {
      cierreQuery = cierreQuery.order("cerrado_at", { ascending: false }).limit(1);
    }
    const { data: cierres, error: cErr } = await cierreQuery;
    if (cErr) throw new Error(`cierres: ${cErr.message}`);
    if (!cierres?.length) return json({ ok: false, error: "sin_cierre_disponible" }, 404);
    const cierre = cierres[0];
    const periodoCerrado = cierre.periodo;
    const periodoAnt = periodoAnterior(periodoCerrado);
    const periodoNuevo = periodoSiguiente(periodoCerrado);

    // Agentes del ciclo cerrado
    const { data: agCerrado, error: acErr } = await db.from("seguros_cierres_ciclo_agentes")
      .select("agente_id,agente,cargo,saldo_inicial,cobrado_validado,transferido_confirmado,recibido_confirmado,entregado_admin_directo,directo_recibido,saldo_final")
      .eq("cierre_id", cierre.id);
    if (acErr) throw new Error(`agentes cierre: ${acErr.message}`);
    if (!agCerrado?.length) return json({ ok: false, error: "cierre_sin_agentes" }, 404);

    // Buscar cierre anterior para comparación
    const { data: cierreAnt } = await db.from("seguros_cierres_ciclo")
      .select("id,periodo").eq("periodo", periodoAnt).maybeSingle();
    let agAnterior: any[] = [];
    if (cierreAnt?.id) {
      const { data } = await db.from("seguros_cierres_ciclo_agentes")
        .select("agente_id,cobrado_validado,saldo_final")
        .eq("cierre_id", cierreAnt.id);
      agAnterior = data || [];
    }
    const antPorAgente = new Map(agAnterior.map((a: any) => [String(a.agente_id), a]));

    // Teléfonos de agentes activos
    const { data: agentes } = await db.from("agentes").select("id,nom,tel,activo").eq("activo", true);
    const telPorId = new Map((agentes || []).map((a: any) => [String(a.id), tel(a.tel)]));

    const resultados: any[] = [];
    for (const ac of agCerrado) {
      const ant = antPorAgente.get(String(ac.agente_id));
      const variables = [
        String(ac.agente || "Agente"),                        // 1: nombre
        periodoCerrado,                                       // 2: periodo cerrado
        fmtMonto(ac.cobrado_validado),                        // 3: cobrado ciclo cerrado
        fmtMonto(ac.entregado_admin_directo),                 // 4: entregado a admin
        fmtMonto(ac.transferido_confirmado),                  // 5: transferido
        fmtMonto(ac.recibido_confirmado),                     // 6: recibido
        fmtMonto(ac.saldo_final),                             // 7: saldo final ciclo cerrado
        ant ? periodoAnt : "N/A",                             // 8: periodo anterior
        ant ? fmtMonto(ant.cobrado_validado) : "0.00",        // 9: cobrado anterior
        ant ? fmtMonto(ant.saldo_final) : "0.00",             // 10: saldo final anterior
        periodoNuevo,                                         // 11: nuevo ciclo
        fmtMonto(ac.saldo_final)                              // 12: saldo inicial = saldo final cerrado
      ];

      if (dry) {
        resultados.push({ agente_id: ac.agente_id, agente: ac.agente, variables });
        continue;
      }

      const telefono = telPorId.get(String(ac.agente_id));
      if (!telefono) {
        await db.from("whatsapp_mensajes").insert({ agente_id: ac.agente_id, tipo: "resumen_ciclo_agente", plantilla_nombre: TEMPLATE, plantilla_variables: variables, estado: "error", error_detalle: "agente sin WhatsApp registrado" });
        resultados.push({ agente: ac.agente, ok: false, motivo: "sin_whatsapp" });
        continue;
      }

      if (!forzar) {
        const { data: ya } = await db.from("whatsapp_mensajes").select("id")
          .eq("agente_id", ac.agente_id).eq("plantilla_nombre", TEMPLATE).eq("estado", "enviado")
          .ilike("plantilla_variables->>1", periodoCerrado).limit(1);
        if (ya?.length) { resultados.push({ agente: ac.agente, ok: true, skip: true, motivo: "ya_enviado_este_ciclo" }); continue; }
      }

      let r;
      try { r = await enviar(telefono, cfg.zernio_account_id, variables); }
      catch (e) { r = { ok: false, status: 0, data: { error: e instanceof Error ? e.message : String(e) } }; }
      if (r.ok) {
        const msgId = r.data?.data?.messageId ?? r.data?.messageId ?? null;
        await db.from("whatsapp_mensajes").insert({ agente_id: ac.agente_id, tipo: "resumen_ciclo_agente", plantilla_nombre: TEMPLATE, plantilla_variables: variables, estado: "enviado", zernio_message_id: msgId });
        resultados.push({ agente: ac.agente, ok: true, messageId: msgId });
      } else {
        await db.from("whatsapp_mensajes").insert({ agente_id: ac.agente_id, tipo: "resumen_ciclo_agente", plantilla_nombre: TEMPLATE, plantilla_variables: variables, estado: "error", error_detalle: JSON.stringify(r.data) });
        resultados.push({ agente: ac.agente, ok: false, status: r.status, detalle: r.data });
      }
    }

    try {
      await db.from("auto_notificaciones_log").insert({
        tipo: "RESUMEN_CICLO_WHATSAPP",
        titulo: dry ? "Resumen ciclo DRY" : "Resumen ciclo cerrado por WhatsApp",
        mensaje: `${dry ? "Simulado" : "Procesado"} para ${resultados.length} agente(s) · ciclo ${periodoCerrado}`,
        estado: resultados.some((x: any) => x.ok === false) ? "error" : "enviado",
        detalle: JSON.stringify(resultados)
      });
    } catch (_) {}

    return json({ ok: true, dry, periodo: periodoCerrado, periodo_anterior: periodoAnt, periodo_nuevo: periodoNuevo, resultados });
  } catch (e) {
    console.error("whatsapp-resumen-ciclo-agentes", e);
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
