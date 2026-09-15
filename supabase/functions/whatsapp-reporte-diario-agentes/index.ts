import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.112.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ZERNIO_API_KEY = Deno.env.get("ZERNIO_API_KEY") ?? "";
const TEMPLATE = "reporte_diario_agente";
const TZ = "America/Santo_Domingo";
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
function rdPartes(now = new Date()) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(now).reduce((o: Record<string,string>, x) => { o[x.type] = x.value; return o; }, {});
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day) };
}
function fechaRD(now = new Date()) {
  return new Intl.DateTimeFormat("es-DO", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
function periodoCiclo(now = new Date()) {
  const { y, m, d } = rdPartes(now);
  const base = new Date(Date.UTC(y, m - 1, 1));
  if (d < 20) base.setUTCMonth(base.getUTCMonth() - 1);
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, "0")}`;
}
function ventanaHoyRD(now = new Date()) {
  const { y, m, d } = rdPartes(now);
  const ini = new Date(Date.UTC(y, m - 1, d, 4, 0, 0, 0));
  const fin = new Date(ini.getTime() + 86400000);
  return { ini: ini.toISOString(), fin: fin.toISOString() };
}
function totalFactura(f: any) {
  return Math.max(0, (Number(f.prima_base) || 0) + (Number(f.prima_deps) || 0));
}
function cedula(c: any) { return String(c.cedula || "Sin cédula").trim() || "Sin cédula"; }

const PEND_LABELS: Record<string,string> = {
  DOCUMENTACION_PENDIENTE:"Documentación", CEDULA_PENDIENTE:"Cédula", CARNET_PENDIENTE:"Carnet",
  DEPENDIENTE_PENDIENTE:"Dependiente", APROBACION_ARS:"Aprobación ARS", PRIMER_PAGO_PENDIENTE:"Primer pago",
  TRASLADO_EN_PROCESO:"Traslado", CAMBIO_PLAN_EN_PROCESO:"Cambio de plan", TSS_PENDIENTE:"TSS",
  FOTO_PENDIENTE:"Foto", CONTRATO_PENDIENTE:"Contrato", OTRO:"Otro"
};
function detalleProceso(c: any) {
  const raw = Array.isArray(c.pendientes_proceso) ? c.pendientes_proceso : [];
  const p = raw.map((x: any) => PEND_LABELS[String(x)] || String(x)).filter(Boolean);
  if (p.length) return `Pendiente: ${p.join(", ")}`;
  return String(c.motivo_proceso || c.nota_proceso || "En proceso").trim();
}
function compactar(lineas: string[], maxChars = 620) {
  if (!lineas.length) return "Sin casos pendientes";
  const out: string[] = [];
  let usados = 0;
  for (let i = 0; i < lineas.length; i++) {
    const linea = `• ${lineas[i]}`;
    const reserva = 55;
    if (usados + linea.length + 1 > maxChars - reserva && out.length) {
      const faltan = lineas.length - i;
      out.push(`• … y ${faltan} más. Ver NEXUS PRO.`);
      break;
    }
    out.push(linea);
    usados += linea.length + 1;
  }
  return out.join("\n");
}

async function cargarTodos(tabla: string, columnas: string) {
  const out: any[] = [];
  const paso = 1000;
  for (let desde = 0; ; desde += paso) {
    const { data, error } = await db.from(tabla).select(columnas).range(desde, desde + paso - 1);
    if (error) throw new Error(`${tabla}: ${error.message}`);
    const lote = data || [];
    out.push(...lote);
    if (lote.length < paso) break;
  }
  return out;
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
  if (req.method !== "POST") return json({ ok:false, error:"method_not_allowed" }, 405);
  try {
    const token = (req.headers.get("x-cron-token") || "").trim();
    const { data: sec } = await db.from("cron_secretos").select("valor").eq("nombre", "reporte_whatsapp").maybeSingle();
    if (!sec?.valor || token !== String(sec.valor)) return json({ ok:false, error:"no_autorizado" }, 401);
    if (!ZERNIO_API_KEY) return json({ ok:false, error:"zernio_no_configurado" }, 500);

    const body = await req.json().catch(() => ({}));
    const dry = body?.dry === true;
    const forzar = body?.forzar === true;
    const soloAgenteId = body?.solo_agente_id ? String(body.solo_agente_id) : null;

    const { data: cfg } = await db.from("whatsapp_config").select("zernio_account_id,activo").eq("activo", true).limit(1).maybeSingle();
    if (!cfg?.zernio_account_id) return json({ ok:false, error:"whatsapp_sin_configurar" }, 409);
    if (!dry && !(await plantillaAprobada(cfg.zernio_account_id))) return json({ ok:false, error:"plantilla_no_aprobada" }, 409);

    const [{ data: agentes, error: agErr }, clientes, facturas] = await Promise.all([
      db.from("agentes").select("id,nom,tel,cargo,activo").eq("activo", true).order("nom"),
      cargarTodos("clientes", "id,nom,cedula,agente_id,pagado,activo,created_at,estado_cliente,motivo_proceso,nota_proceso,pendientes_proceso"),
      cargarTodos("facturas", "id,cliente_id,periodo,prima_base,prima_deps,estado,created_at")
    ]);
    if (agErr) throw new Error(`agentes: ${agErr.message}`);

    const now = new Date();
    const periodo = periodoCiclo(now);
    const hoy = ventanaHoyRD(now);
    const fecha = fechaRD(now);
    const activos = clientes.filter((c: any) => c.activo !== false);
    const facValidas = facturas.filter((f: any) => f.estado !== "Anulada");
    const facPorCliente = new Map<string, any[]>();
    for (const f of facValidas) {
      const k = String(f.cliente_id || "");
      if (!k) continue;
      if (!facPorCliente.has(k)) facPorCliente.set(k, []);
      facPorCliente.get(k)!.push(f);
    }
    for (const arr of facPorCliente.values()) arr.sort((a,b) => String(a.periodo||"").localeCompare(String(b.periodo||"")) || String(a.created_at||"").localeCompare(String(b.created_at||"")));

    const resultados: any[] = [];
    for (const a of (agentes || [])) {
      if (soloAgenteId && String(a.id) !== soloAgenteId) continue;
      const cartera = activos.filter((c: any) => String(c.agente_id || "") === String(a.id));
      const pendientes: any[] = [];
      const atrasados: any[] = [];

      for (const c of cartera) {
        let credito = Math.max(0, Number(c.pagado) || 0);
        let mora = 0, mesesMora = 0, pendiente = 0;
        for (const f of facPorCliente.get(String(c.id)) || []) {
          const tot = totalFactura(f);
          if (tot <= 0) continue;
          const aplicado = Math.min(credito, tot);
          const saldo = Math.max(0, tot - aplicado);
          credito = Math.max(0, credito - aplicado);
          if (saldo <= 0.009) continue;
          if (String(f.periodo || "") <= periodo) { mora += saldo; mesesMora++; }
          else pendiente += saldo;
        }
        if (mora > 0.009) atrasados.push({ c, monto: mora, meses: mesesMora });
        else if (pendiente > 0.009) pendientes.push({ c, monto: pendiente });
      }

      const nuevos = cartera.filter((c: any) => c.created_at && c.created_at >= hoy.ini && c.created_at < hoy.fin);
      const proceso = cartera.filter((c: any) => c.estado_cliente === "EN_PROCESO");

      const [{ data: acumulado, error: acErr }, { data: resumen, error: rsErr }] = await Promise.all([
        db.rpc("seguros_acumulado_validado_agente", { p_agente_id: a.id }),
        db.rpc("seguros_resumen_ciclo_agente_core", { p_agente_id: a.id, p_periodo: periodo })
      ]);
      if (acErr) throw new Error(`acumulado ${a.nom}: ${acErr.message}`);
      if (rsErr) throw new Error(`ciclo ${a.nom}: ${rsErr.message}`);
      const row = Array.isArray(resumen) ? resumen[0] : resumen;

      const variables = [
        String(a.nom || "Agente"),
        fecha,
        fmtMonto(acumulado),
        fmtMonto(row?.cobrado_validado || 0),
        String(pendientes.length),
        compactar(pendientes.map((x:any) => `${x.c.nom || "Sin nombre"} — Cédula ${cedula(x.c)} — RD$ ${fmtMonto(x.monto)} pendiente`)),
        String(atrasados.length),
        compactar(atrasados.map((x:any) => `${x.c.nom || "Sin nombre"} — Cédula ${cedula(x.c)} — ${x.meses} mes${x.meses===1?"":"es"} atrasado${x.meses===1?"":"s"} — RD$ ${fmtMonto(x.monto)}`)),
        String(nuevos.length),
        compactar(nuevos.map((c:any) => `${c.nom || "Sin nombre"} — Cédula ${cedula(c)}`)),
        String(proceso.length),
        compactar(proceso.map((c:any) => `${c.nom || "Sin nombre"} — Cédula ${cedula(c)} — ${detalleProceso(c)}`))
      ];

      if (dry) {
        resultados.push({ agente_id:a.id, agente:a.nom, periodo, acumulado:Number(acumulado)||0, cobrado_validado:Number(row?.cobrado_validado)||0, pendientes:pendientes.length, atrasados:atrasados.length, nuevos:nuevos.length, en_proceso:proceso.length, telefono_valido:!!tel(a.tel) });
        continue;
      }

      const telefono = tel(a.tel);
      if (!telefono) {
        await db.from("whatsapp_mensajes").insert({ agente_id:a.id, tipo:"reporte_diario_agente", plantilla_nombre:TEMPLATE, plantilla_variables:variables, estado:"error", error_detalle:"agente sin WhatsApp registrado" });
        resultados.push({ agente:a.nom, ok:false, motivo:"sin_whatsapp" });
        continue;
      }

      if (!forzar) {
        const { data: ya } = await db.from("whatsapp_mensajes").select("id").eq("agente_id", a.id).eq("plantilla_nombre", TEMPLATE).eq("estado", "enviado").gte("created_at", hoy.ini).lt("created_at", hoy.fin).limit(1);
        if (ya?.length) { resultados.push({ agente:a.nom, ok:true, skip:true, motivo:"ya_enviado_hoy" }); continue; }
      }

      let r;
      try { r = await enviar(telefono, cfg.zernio_account_id, variables); }
      catch (e) { r = { ok:false, status:0, data:{ error:e instanceof Error ? e.message : String(e) } }; }
      if (r.ok) {
        const msgId = r.data?.data?.messageId ?? r.data?.messageId ?? null;
        await db.from("whatsapp_mensajes").insert({ agente_id:a.id, tipo:"reporte_diario_agente", plantilla_nombre:TEMPLATE, plantilla_variables:variables, estado:"enviado", zernio_message_id:msgId });
        resultados.push({ agente:a.nom, ok:true, messageId:msgId });
      } else {
        await db.from("whatsapp_mensajes").insert({ agente_id:a.id, tipo:"reporte_diario_agente", plantilla_nombre:TEMPLATE, plantilla_variables:variables, estado:"error", error_detalle:JSON.stringify(r.data) });
        resultados.push({ agente:a.nom, ok:false, status:r.status, detalle:r.data });
      }
    }

    try {
      await db.from("auto_notificaciones_log").insert({
        tipo:"REPORTE_DIARIO_WHATSAPP",
        titulo: dry ? "Reporte WhatsApp DRY" : "Reporte diario por WhatsApp",
        mensaje:`${dry?"Simulado":"Procesado"} para ${resultados.length} agente(s) · ${fecha} · ciclo ${periodo}`,
        estado: resultados.some((x:any)=>x.ok===false) ? "error" : "enviado",
        detalle: JSON.stringify(resultados)
      });
    } catch (_) {}

    return json({ ok:true, dry, fecha, periodo, resultados });
  } catch (e) {
    console.error("whatsapp-reporte-diario-agentes", e);
    return json({ ok:false, error:e instanceof Error ? e.message : String(e) }, 500);
  }
});