import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.112.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ZERNIO_API_KEY = Deno.env.get("ZERNIO_API_KEY") ?? "";
const TEMPLATE = "reporte_diario_agente";          // v1 (actual): un mensaje por agente + copia al admin
// v2 (decisión del dueño 01-oct-2026): el agente recibe solo lo suyo; el administrador recibe UN solo
// mensaje con lo suyo + el equipo + el total del negocio. Se usan solo cuando Meta las aprueba;
// mientras tanto sigue saliendo la v1 sin cortes.
const TEMPLATE_AGENTE_V2 = "reporte_diario_agente_v2";
const TEMPLATE_ADMIN_V2 = "reporte_diario_admin";
// Segundo mensaje diario solo para el administrador: acumulado de cada agente + cobrado hoy (dueño 02-oct-2026).
const TEMPLATE_ACUMULADO = "acumulado_agentes_diario";
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
const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
// Ciclos anteriores al actual (20 → 20), del más reciente al más viejo. «2026-08» = 20-ago → 20-sep.
function ciclosAnteriores(periodo: string, n: number) {
  const [y, m] = periodo.split("-").map(Number);
  const out: { periodo: string; etiqueta: string }[] = [];
  for (let i = 1; i <= n; i++) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    const mi = d.getUTCMonth();
    out.push({ periodo: `${d.getUTCFullYear()}-${String(mi + 1).padStart(2, "0")}`, etiqueta: `${MESES[mi]}-${MESES[(mi + 1) % 12]}` });
  }
  return out;
}
const CICLOS_HISTORIAL = 6;
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
// Meta rechaza (#132018) parámetros de plantilla con saltos de línea, tabulaciones o más de 4 espacios
// seguidos. Las listas van en una sola línea separadas por «•» y cada variable se limpia antes de enviar.
function limpiarParam(v: unknown) {
  return String(v ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim() || "-";
}
function compactar(lineas: string[], maxChars = 240) {
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
  return out.join(" ");
}

// Cobrado HOY por agente con la misma regla de fecha que seguros_resumen_ciclo_agente_core:
// transferencia/depósito cuentan el día en que se VALIDAN; efectivo y otros, el día del cobro.
// Los reversados no cuentan.
function fechaCobro(a: any) {
  if (a.metodo === "Transferencia" || a.metodo === "Depósito") {
    return a.validacion_estado === "validado" ? (a.validado_at || a.fecha || a.created_at) : null;
  }
  return a.fecha || a.created_at;
}
async function cobradoHoyPorAgente(ini: string, fin: string) {
  const { data, error } = await db.from("abonos")
    .select("agente_cobro,cliente_id,monto,metodo,validacion_estado,validado_at,fecha,created_at,estado,reversado_at")
    .or(`validado_at.gte.${ini},fecha.gte.${ini},created_at.gte.${ini}`);
  if (error) throw new Error(`abonos hoy: ${error.message}`);
  // agente → { total, porCliente: cliente_id → monto }
  const out = new Map<string, { total: number; porCliente: Map<string, number> }>();
  for (const a of data || []) {
    const t = fechaCobro(a);
    if (!t) continue;
    const ms = new Date(t).getTime();
    if (ms < new Date(ini).getTime() || ms >= new Date(fin).getTime()) continue;
    if (a.reversado_at || String(a.estado || "") === "Reversado") continue;
    const k = String(a.agente_cobro || "");
    if (!out.has(k)) out.set(k, { total: 0, porCliente: new Map() });
    const r = out.get(k)!;
    const m = Number(a.monto) || 0;
    r.total += m;
    const c = String(a.cliente_id || "");
    r.porCliente.set(c, (r.porCliente.get(c) || 0) + m);
  }
  return out;
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

async function plantillaAprobada(accountId: string, nombre = TEMPLATE) {
  const qs = new URLSearchParams({ accountId, status: "APPROVED", name: nombre, language: "es" });
  const r = await fetch(`https://zernio.com/api/v1/whatsapp/templates?${qs}`, {
    headers: { Authorization: `Bearer ${ZERNIO_API_KEY}` }, signal: AbortSignal.timeout(20000)
  });
  const j = await r.json().catch(() => null);
  const rows = j?.templates ?? j?.data?.templates ?? [];
  return r.ok && Array.isArray(rows) && rows.some((t: any) => t?.name === nombre && t?.language === "es" && t?.status === "APPROVED");
}
async function enviar(telefono: string, accountId: string, variables: string[], plantilla = TEMPLATE) {
  const r = await fetch("https://zernio.com/api/v1/inbox/conversations", {
    method: "POST",
    headers: { Authorization: `Bearer ${ZERNIO_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, participantId: telefono, templateName: plantilla, templateLanguage: "es", templateParams: variables }),
    signal: AbortSignal.timeout(20000)
  });
  const data = await r.json().catch(() => null);
  return { ok: r.ok && data?.success !== false, status: r.status, data };
}

// ===== Reporte v2 (01-oct-2026) =====
// Montos sin «.00» cuando son enteros: el mensaje se lee más limpio en el teléfono.
function fmtCorto(v: unknown) {
  const n = Number(v) || 0;
  const entero = Math.abs(n - Math.round(n)) < 0.005;
  return n.toLocaleString("en-US", { minimumFractionDigits: entero ? 0 : 2, maximumFractionDigits: entero ? 0 : 2 });
}
// «2026-09» → «20 sep–20 oct» (el ciclo empieza el 20 de ese mes y termina el 20 del siguiente).
function etiquetaCiclo(periodo: string) {
  const m = Number(periodo.split("-")[1]) - 1;
  return `20 ${MESES[m]}–20 ${MESES[(m + 1) % 12]}`;
}
function nombreCorto(v: unknown, max = 26) {
  const t = String(v || "Sin nombre").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}
// Los atrasados que más deben primero, cada uno en su propia línea fija de la plantilla
// (Meta no permite saltos de línea dentro de una variable). Faltantes → «—».
function cobrarPrimero(atrasados: any[], max = 26) {
  const orden = [...atrasados].sort((a, b) => b.monto - a.monto);
  const lineas = orden.slice(0, 3).map((x: any) => `${nombreCorto(x.c.nom, max)} — ${x.meses} mes${x.meses === 1 ? "" : "es"} — RD$ ${fmtCorto(x.monto)}`);
  if (!lineas.length) lineas.push("Ningún cliente atrasado 🎉");
  while (lineas.length < 3) lineas.push("—");
  return [...lineas, String(Math.max(0, orden.length - 3))];
}

const CUERPO_AGENTE_V2 = [
  "📊 *Cierre del día — {{1}}*",
  "Hola {{2}}, este es tu resumen de hoy en NEXUS PRO.",
  "",
  "💰 *DINERO DEL CICLO ({{3}})*",
  "• Tenías al empezar el ciclo: RD$ {{4}}",
  "• Cobraste en este ciclo: RD$ {{5}}",
  "• Entregaste a administración: RD$ {{6}}",
  "• *Queda en tu poder: RD$ {{7}}*",
  "(Efectivo RD$ {{8}} · Banco RD$ {{9}})",
  "",
  "📅 Ciclo anterior cobraste: RD$ {{10}}",
  "",
  "👥 *TUS CLIENTES*",
  "• Atrasados: {{11}} — deben RD$ {{12}}",
  "• En proceso: {{13}}",
  "• Nuevos hoy: {{14}}",
  "",
  "⚠️ *COBRAR PRIMERO*",
  "1. {{15}}",
  "2. {{16}}",
  "3. {{17}}",
  "Otros atrasados: {{18}} (ver NEXUS PRO)"
].join("\n");
const EJEMPLO_AGENTE_V2 = ["01/10/2026", "JUAN", "20 sep–20 oct", "333,190", "93,500", "80,000", "346,690", "190,500", "156,190", "264,500", "14", "52,300", "2", "0",
  "María Pérez — 3 meses — RD$ 9,000", "Pedro Gómez — 2 meses — RD$ 6,000", "Luis Díaz — 1 mes — RD$ 3,000", "11"];

const CUERPO_ADMIN_V2 = [
  "📊 *Cierre del día — {{1}}*",
  "Hola {{2}}, este es el resumen de hoy en NEXUS PRO.",
  "",
  "🏢 *NEGOCIO ({{3}})*",
  "• *Total cobrado: RD$ {{4}}*",
  "• Ciclo anterior: RD$ {{5}}",
  "",
  "💰 *TU DINERO*",
  "• Tenías al empezar el ciclo: RD$ {{6}}",
  "• Cobraste: RD$ {{7}}",
  "• Recibiste de agentes: RD$ {{8}}",
  "• *En tu poder: RD$ {{9}}*",
  "(Efectivo RD$ {{10}} · Banco RD$ {{11}})",
  "",
  "👥 *TUS CLIENTES*",
  "• Atrasados: {{12}} — deben RD$ {{13}}",
  "• En proceso: {{14}} · Nuevos hoy: {{15}}",
  "",
  "⚠️ *COBRAR PRIMERO*",
  "1. {{16}}",
  "2. {{17}}",
  "3. {{18}}",
  "Otros atrasados: {{19}}",
  "",
  "🧑‍💼 *AGENTE: {{20}}*",
  "• Cobró: RD$ {{21}}",
  "• Te entregó: RD$ {{22}}",
  "• En su poder: RD$ {{23}}",
  "• Atrasados: {{24}} — deben RD$ {{25}}",
  "• En proceso: {{26}}",
  "",
  "El detalle completo está en NEXUS PRO."
].join("\n");
const EJEMPLO_ADMIN_V2 = ["01/10/2026", "ANA", "20 sep–20 oct", "217,000", "409,300", "1,402,310", "123,500", "80,000", "1,605,810", "88,900", "1,516,910", "13", "41,200", "2", "0",
  "Luis Díaz — 4 meses — RD$ 12,000", "Rosa Peña — 2 meses — RD$ 8,000", "Juan Cruz — 1 mes — RD$ 6,500", "10",
  "JUAN", "93,500", "80,000", "346,690", "14", "52,300", "2"];

// Acumulado por agente DEL CICLO (20 → 20) + los clientes cobrados hoy, UNO POR LÍNEA (pedido del dueño).
// Meta no permite saltos de línea dentro de una variable ni repetir bloques, así que cada agente tiene
// 8 líneas fijas de clientes; las que sobran van con un carácter invisible (línea en blanco) y, si hay
// más clientes, la última dice «… y N más». Dos bloques fijos (hoy hay dos agentes: ESTERLIN y ROBINSON);
// si algún día hay más, los demás se agregan a la última línea del segundo bloque.
const SLOTS_CLIENTES = 8;
const CUERPO_ACUMULADO = [
  "📊 *ACUMULADO POR AGENTE*",
  "📅 Ciclo {{1}}",
  "🕖 Cierre del {{2}}",
  "",
  "━━━━━━━━━━━━━━",
  "👤 *{{3}}*",
  "Cobrado en el ciclo: *RD$ {{4}}*",
  "Cobrado hoy: *RD$ {{5}}* ({{6}})",
  "",
  "{{7}}",
  "{{8}}",
  "{{9}}",
  "{{10}}",
  "{{11}}",
  "{{12}}",
  "{{13}}",
  "{{14}}",
  "━━━━━━━━━━━━━━",
  "👤 *{{15}}*",
  "Cobrado en el ciclo: *RD$ {{16}}*",
  "Cobrado hoy: *RD$ {{17}}* ({{18}})",
  "",
  "{{19}}",
  "{{20}}",
  "{{21}}",
  "{{22}}",
  "{{23}}",
  "{{24}}",
  "{{25}}",
  "{{26}}",
  "━━━━━━━━━━━━━━",
  "💰 *TOTALES*",
  "Ciclo: *RD$ {{27}}*",
  "Hoy: *RD$ {{28}}*",
  "",
  "Detalle en NEXUS PRO."
].join("\n");
const EJ_LISTA = ["1. Ana Gómez — RD$ 6,500", "2. Orlando Reyes — RD$ 6,500", "3. Yesenia Siri — RD$ 5,000", "4. Ángel Bueno — RD$ 4,500",
  "5. Luis Pimentel — RD$ 4,500", "6. Nuris Pérez — RD$ 4,500", "7. Rey De Oleo — RD$ 4,000", "8. Domingo De Los Santos — RD$ 4,000"];
const EJEMPLO_ACUMULADO = ["20 sep–20 oct", "01/10/2026", "JUAN", "123,500", "39,500", "8 clientes", ...EJ_LISTA,
  "PEDRO", "93,500", "28,000", "8 clientes", ...EJ_LISTA, "217,000", "67,500"];
// Relleno de las líneas vacías. Si Meta lo rechazara, el envío se reintenta con «·».
const RELLENO = "\u200B";

// «ANA LUISA GOMEZ GARCIA» → «Ana Gomez»; respeta partículas («Domingo De Los Santos», «Rey De Oleo»).
const PARTICULAS = new Set(["DE", "DEL", "LA", "LAS", "LOS", "Y"]);
function nombreYApellido(v: unknown) {
  const t = String(v || "").trim().split(/\s+/).filter(Boolean);
  if (!t.length) return "Sin nombre";
  let i = t.length >= 4 && !PARTICULAS.has(t[1].toUpperCase()) ? 2 : 1;
  const out = [t[0]];
  while (i < t.length && PARTICULAS.has(t[i].toUpperCase())) out.push(t[i++]);
  if (i < t.length) out.push(t[i]);
  return out.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}
function listaClientesHoy(items: { nom: string; monto: number }[], relleno = RELLENO) {
  const orden = [...items].sort((a, b) => b.monto - a.monto);
  const linea = (x: any, k: number) => `${k + 1}. ${nombreYApellido(x.nom)} — RD$ ${fmtCorto(x.monto)}`;
  let out: string[];
  if (!orden.length) out = ["Sin cobros hoy"];
  else if (orden.length <= SLOTS_CLIENTES) out = orden.map(linea);
  else out = [...orden.slice(0, SLOTS_CLIENTES - 1).map(linea), `… y ${orden.length - (SLOTS_CLIENTES - 1)} más (ver NEXUS PRO)`];
  while (out.length < SLOTS_CLIENTES) out.push(relleno);
  return out;
}

// Vista previa del texto tal como lo verá el teléfono (para pruebas «dry» y para medir el largo).
function renderizar(cuerpo: string, vars: string[]) {
  return cuerpo.replace(/\{\{(\d+)\}\}/g, (_m, i) => vars[Number(i) - 1] ?? "");
}
// Meta limita el cuerpo de la plantilla a 1024 caracteres ya con las variables.
const MAX_CUERPO = 1000;

async function plantillaExiste(accountId: string, nombre: string) {
  const qs = new URLSearchParams({ accountId, name: nombre, language: "es" });
  const r = await fetch(`https://zernio.com/api/v1/whatsapp/templates?${qs}`, {
    headers: { Authorization: `Bearer ${ZERNIO_API_KEY}` }, signal: AbortSignal.timeout(20000)
  });
  const j = await r.json().catch(() => null);
  const rows = j?.templates ?? j?.data?.templates ?? [];
  const t = Array.isArray(rows) ? rows.find((x: any) => x?.name === nombre && x?.language === "es") : null;
  return t ? String(t.status || "DESCONOCIDO") : null;
}
// Somete a Meta (vía Zernio, mismo endpoint que whatsapp-plantilla-crear) solo las que no existen.
async function someterPlantillasV2(accountId: string) {
  const out: any[] = [];
  for (const [nombre, texto, ejemplo] of [[TEMPLATE_AGENTE_V2, CUERPO_AGENTE_V2, EJEMPLO_AGENTE_V2], [TEMPLATE_ADMIN_V2, CUERPO_ADMIN_V2, EJEMPLO_ADMIN_V2], [TEMPLATE_ACUMULADO, CUERPO_ACUMULADO, EJEMPLO_ACUMULADO]] as [string, string, string[]][]) {
    const estado = await plantillaExiste(accountId, nombre);
    if (estado) { out.push({ nombre, ya_existe: true, estado }); continue; }
    const r = await fetch("https://zernio.com/api/v1/whatsapp/templates", {
      method: "POST",
      headers: { Authorization: `Bearer ${ZERNIO_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, name: nombre, category: "UTILITY", language: "es",
        components: [{ type: "body", text: texto, example: { body_text: [ejemplo] } }] }),
      signal: AbortSignal.timeout(20000)
    });
    const data = await r.json().catch(() => null);
    out.push({ nombre, sometida: r.ok, status: r.status, data });
  }
  return out;
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
    const soloAdmin = body?.solo_admin === true;   // pruebas: solo la copia al administrador, no al agente
    const someter = body?.someter_plantillas === true;   // somete a Meta las plantillas v2 que falten
    const forzarV1 = body?.v1 === true;                  // pruebas: forzar el formato viejo

    const { data: cfg } = await db.from("whatsapp_config").select("zernio_account_id,activo").eq("activo", true).limit(1).maybeSingle();
    if (!cfg?.zernio_account_id) return json({ ok:false, error:"whatsapp_sin_configurar" }, 409);
    if (someter) return json({ ok:true, plantillas: await someterPlantillasV2(cfg.zernio_account_id) });
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

    // El administrador recibe, además del suyo, una copia del reporte de cada agente (decisión del dueño 27-sep-2026).
    const admins = (agentes || []).filter((x: any) => String(x.cargo || "").toUpperCase() === "ADMIN" && tel(x.tel));

    // Envía el reporte de «origen» a «destino». referencia_id = agente del reporte cuando es una copia al admin,
    // así el control de «ya enviado hoy» distingue el reporte propio de cada copia.
    async function entregar(destino: any, origen: any, variables: string[], plantilla = TEMPLATE) {
      const esCopia = String(destino.id) !== String(origen.id);
      const base = { agente_id: destino.id, referencia_id: esCopia ? origen.id : null, tipo: "reporte_diario_agente", plantilla_nombre: plantilla, plantilla_variables: variables };
      const telefono = tel(destino.tel);
      if (!telefono) {
        await db.from("whatsapp_mensajes").insert({ ...base, estado: "error", error_detalle: "agente sin WhatsApp registrado" });
        return { agente: origen.nom, destino: destino.nom, ok: false, motivo: "sin_whatsapp" };
      }
      if (!forzar) {
        let q = db.from("whatsapp_mensajes").select("id").eq("agente_id", destino.id).eq("plantilla_nombre", plantilla).eq("estado", "enviado").gte("created_at", hoy.ini).lt("created_at", hoy.fin);
        q = esCopia ? q.eq("referencia_id", origen.id) : q.is("referencia_id", null);
        const { data: ya } = await q.limit(1);
        if (ya?.length) return { agente: origen.nom, destino: destino.nom, ok: true, skip: true, motivo: "ya_enviado_hoy" };
      }
      let r;
      try { r = await enviar(telefono, cfg.zernio_account_id, variables, plantilla); }
      catch (e) { r = { ok:false, status:0, data:{ error:e instanceof Error ? e.message : String(e) } }; }
      if (r.ok) {
        const msgId = r.data?.data?.messageId ?? r.data?.messageId ?? null;
        await db.from("whatsapp_mensajes").insert({ ...base, estado: "enviado", zernio_message_id: msgId });
        return { agente: origen.nom, destino: destino.nom, ok: true, messageId: msgId };
      }
      await db.from("whatsapp_mensajes").insert({ ...base, estado: "error", error_detalle: JSON.stringify(r.data) });
      return { agente: origen.nom, destino: destino.nom, ok: false, status: r.status, detalle: r.data };
    }

    // v2 solo cuando Meta aprobó las dos plantillas nuevas; si no, sigue el formato v1 sin cortes.
    const v2Lista = !forzarV1 && (await plantillaAprobada(cfg.zernio_account_id, TEMPLATE_AGENTE_V2)) && (await plantillaAprobada(cfg.zernio_account_id, TEMPLATE_ADMIN_V2));
    const etiqueta = etiquetaCiclo(periodo);
    const periodoPrevio = ciclosAnteriores(periodo, 1)[0].periodo;

    // 1) Datos de cada agente activo (todos, aunque se pida uno solo: el admin necesita los del equipo).
    const infos: any[] = [];
    for (const a of (agentes || [])) {
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

      const [{ data: acumulado, error: acErr }, { data: resumen, error: rsErr }, { data: desglose }] = await Promise.all([
        db.rpc("seguros_acumulado_validado_agente", { p_agente_id: a.id }),
        db.rpc("seguros_resumen_ciclo_agente_core", { p_agente_id: a.id, p_periodo: periodo }),
        db.rpc("seguros_custodia_desglose_agente", { p_agente_id: a.id })
      ]);
      if (acErr) throw new Error(`acumulado ${a.nom}: ${acErr.message}`);
      if (rsErr) throw new Error(`ciclo ${a.nom}: ${rsErr.message}`);
      const row = Array.isArray(resumen) ? resumen[0] : resumen;
      // Desglose efectivo/banco dentro de la misma variable {{3}}; si falla, solo el total.
      const dg = Array.isArray(desglose) ? desglose[0] : desglose;
      const dgOk = !!dg && Number(dg.total) === Number(acumulado);
      const custodia = dgOk
        ? `${fmtMonto(acumulado)} (Efectivo RD$ ${fmtMonto(dg.efectivo)} / Banco RD$ ${fmtMonto(dg.banco)})`
        : fmtMonto(acumulado);

      // Cobrado por ciclo anterior (decisión del dueño 26-sep-2026). Se omiten los ciclos viejos en cero.
      const previos = ciclosAnteriores(periodo, CICLOS_HISTORIAL);
      const cobradosPrevios = await Promise.all(previos.map(async (c) => {
        const { data, error } = await db.rpc("seguros_resumen_ciclo_agente_core", { p_agente_id: a.id, p_periodo: c.periodo });
        const r = Array.isArray(data) ? data[0] : data;
        return { ...c, cobrado: error ? null : Number(r?.cobrado_validado) || 0 };
      }));
      const cobradoAnterior = cobradosPrevios[0]?.cobrado ?? 0;
      while (cobradosPrevios.length && cobradosPrevios[cobradosPrevios.length - 1].cobrado === 0) cobradosPrevios.pop();
      const historial = cobradosPrevios.filter((c) => c.cobrado !== null).map((c) => `${c.etiqueta} RD$ ${fmtMonto(c.cobrado)}`);
      const cobradoCiclo = historial.length
        ? `${fmtMonto(row?.cobrado_validado || 0)} · Ciclos anteriores: ${historial.join(" · ")}`
        : fmtMonto(row?.cobrado_validado || 0);

      // v1 (formato actual, 12 variables).
      const variables = [
        String(a.nom || "Agente"),
        fecha,
        custodia,
        cobradoCiclo,
        String(pendientes.length),
        compactar(pendientes.map((x:any) => `${x.c.nom || "Sin nombre"} — Cédula ${cedula(x.c)} — RD$ ${fmtMonto(x.monto)} pendiente`)),
        String(atrasados.length),
        compactar(atrasados.map((x:any) => `${x.c.nom || "Sin nombre"} — Cédula ${cedula(x.c)} — ${x.meses} mes${x.meses===1?"":"es"} atrasado${x.meses===1?"":"s"} — RD$ ${fmtMonto(x.monto)}`)),
        String(nuevos.length),
        compactar(nuevos.map((c:any) => `${c.nom || "Sin nombre"} — Cédula ${cedula(c)}`)),
        String(proceso.length),
        compactar(proceso.map((c:any) => `${c.nom || "Sin nombre"} — Cédula ${cedula(c)} — ${detalleProceso(c)}`))
      ].map(limpiarParam);

      // Cifras del ciclo para v2. Entregado = enviado a otros (transferencias confirmadas + depósitos de sus
      // clientes a la cuenta del admin); recibido = lo contrario. Una transferencia no es un cobro nuevo.
      const entregado = (Number(row?.transferido_confirmado) || 0) + (Number(row?.entregado_admin_directo) || 0);
      const recibido = (Number(row?.recibido_confirmado) || 0) + (Number(row?.directo_recibido) || 0);
      infos.push({
        a, variables, pendientes, atrasados, nuevos, proceso,
        esAdmin: String(a.cargo || "").toUpperCase() === "ADMIN",
        inicial: Number(row?.saldo_inicial) || 0,
        cobrado: Number(row?.cobrado_validado) || 0,
        cobradoAnterior: Number(cobradoAnterior) || 0,
        entregado, recibido,
        enPoder: Number(acumulado) || 0,
        efectivo: dgOk ? Number(dg.efectivo) || 0 : null,
        banco: dgOk ? Number(dg.banco) || 0 : null,
        deben: atrasados.reduce((t: number, x: any) => t + x.monto, 0),
        custodia, cobradoCiclo
      });
    }

    // Total real del negocio = suma de lo cobrado directamente por cada agente (activos o no).
    // Las transferencias y entregas solo mueven custodia: no se suman otra vez.
    const { data: todos } = await db.from("agentes").select("id");
    async function totalNegocio(p: string) {
      const filas = await Promise.all((todos || []).map((x: any) => db.rpc("seguros_resumen_ciclo_agente_core", { p_agente_id: x.id, p_periodo: p })));
      return filas.reduce((t: number, f: any) => { const r = Array.isArray(f.data) ? f.data[0] : f.data; return t + (Number(r?.cobrado_validado) || 0); }, 0);
    }
    const [negocioCiclo, negocioAnterior] = await Promise.all([totalNegocio(periodo), totalNegocio(periodoPrevio)]);

    const dinero = (v: number | null) => v === null ? "—" : fmtCorto(v);
    function varsAgenteV2(i: any, max = 26) {
      const entregaTxt = fmtCorto(i.entregado) + (i.recibido > 0.005 ? ` (recibiste RD$ ${fmtCorto(i.recibido)})` : "");
      return [fecha, String(i.a.nom || "Agente"), etiqueta, fmtCorto(i.inicial), fmtCorto(i.cobrado), entregaTxt,
        fmtCorto(i.enPoder), dinero(i.efectivo), dinero(i.banco), fmtCorto(i.cobradoAnterior),
        String(i.atrasados.length), fmtCorto(i.deben), String(i.proceso.length), String(i.nuevos.length),
        ...cobrarPrimero(i.atrasados, max)].map(limpiarParam);
    }
    // La plantilla del admin tiene un bloque fijo para UN agente (hoy: ROBINSON). Si algún día hay más,
    // los demás se resumen al final de la línea «En proceso» del bloque para no perderlos.
    function varsAdminV2(i: any, max = 26) {
      const equipo = infos.filter((x) => String(x.a.id) !== String(i.a.id) && !x.esAdmin);
      const ag = equipo[0];
      const otros = equipo.slice(1).map((x) => ` · ${x.a.nom}: cobró RD$ ${fmtCorto(x.cobrado)}, en su poder RD$ ${fmtCorto(x.enPoder)}`).join("");
      const bloque = ag
        ? [String(ag.a.nom || "Agente"), fmtCorto(ag.cobrado),
           fmtCorto(ag.entregado) + (ag.recibido > 0.005 ? ` (recibió RD$ ${fmtCorto(ag.recibido)})` : ""),
           fmtCorto(ag.enPoder), String(ag.atrasados.length), fmtCorto(ag.deben), String(ag.proceso.length) + otros]
        : ["Sin agentes activos", "0", "0", "0", "0", "0", "0"];
      return [fecha, String(i.a.nom || "Admin"), etiqueta, fmtCorto(negocioCiclo), fmtCorto(negocioAnterior),
        fmtCorto(i.inicial), fmtCorto(i.cobrado), fmtCorto(i.recibido), fmtCorto(i.enPoder), dinero(i.efectivo), dinero(i.banco),
        String(i.atrasados.length), fmtCorto(i.deben), String(i.proceso.length), String(i.nuevos.length),
        ...cobrarPrimero(i.atrasados, max), ...bloque].map(limpiarParam);
    }
    // Si el texto pasa del límite de Meta, se acortan los nombres de «cobrar primero».
    function ajustar(fn: (i: any, n: number) => string[], cuerpo: string, i: any) {
      for (const n of [26, 20, 14]) { const v = fn(i, n); if (renderizar(cuerpo, v).length <= MAX_CUERPO) return v; }
      return fn(i, 14);
    }

    // 2) Envío.
    const resultados: any[] = [];
    for (const i of infos) {
      const a = i.a;
      if (soloAgenteId && String(a.id) !== soloAgenteId) continue;
      const vAgente = ajustar(varsAgenteV2, CUERPO_AGENTE_V2, i);
      const vAdmin = i.esAdmin ? ajustar(varsAdminV2, CUERPO_ADMIN_V2, i) : null;

      if (dry) {
        resultados.push({ agente_id:a.id, agente:a.nom, periodo, acumulado:i.enPoder, efectivo:i.efectivo, banco:i.banco, custodia:i.custodia,
          cobrado_ciclo:i.cobradoCiclo, cobrado_validado:i.cobrado, pendientes:i.pendientes.length, atrasados:i.atrasados.length,
          nuevos:i.nuevos.length, en_proceso:i.proceso.length, telefono_valido:!!tel(a.tel), v2_aprobada: v2Lista,
          vista_v2: i.esAdmin ? renderizar(CUERPO_ADMIN_V2, vAdmin!) : renderizar(CUERPO_AGENTE_V2, vAgente) });
        continue;
      }

      if (v2Lista) {
        // v2: el agente recibe solo lo suyo; el admin recibe UN mensaje con lo suyo + el equipo.
        if (i.esAdmin) resultados.push(await entregar(a, a, vAdmin!, TEMPLATE_ADMIN_V2));
        else if (!soloAdmin) resultados.push(await entregar(a, a, vAgente, TEMPLATE_AGENTE_V2));
        continue;
      }

      // v1: el reporte propio de cada agente (el admin también recibe el suyo).
      if (!soloAdmin) resultados.push(await entregar(a, a, i.variables));
      // Copia al administrador del reporte de cada agente que no es admin (p. ej. ROBINSON).
      if (!i.esAdmin) {
        for (const ad of admins) resultados.push(await entregar(ad, a, i.variables));
      }
    }

    // 3) Acumulado por agente → solo administradores, un mensaje al día (cuando Meta aprueba la plantilla).
    const hoyMapa = await cobradoHoyPorAgente(hoy.ini, hoy.fin);
    const nomCliente = new Map(clientes.map((c: any) => [String(c.id), String(c.nom || "Sin nombre")]));
    const hoyDe = (i: any) => hoyMapa.get(String(i.a.id)) || { total: 0, porCliente: new Map<string, number>() };
    const orden = [...infos].sort((x, y) => y.cobrado - x.cobrado);
    const totalHoy = [...hoyMapa.values()].reduce((t, r) => t + r.total, 0);
    function varsAcumulado(relleno: string) {
      const slot = (i: any) => {
        if (!i) return ["—", "0", "0", "0 clientes", ...listaClientesHoy([], relleno)];
        const h = hoyDe(i);
        const n = h.porCliente.size;
        const items = [...h.porCliente.entries()].map(([id, monto]) => ({ nom: nomCliente.get(id) || "Sin nombre", monto }));
        return [String(i.a.nom || "Agente"), fmtCorto(i.cobrado), fmtCorto(h.total), `${n} cliente${n === 1 ? "" : "s"}`, ...listaClientesHoy(items, relleno)];
      };
      const b1 = slot(orden[0]), b2 = slot(orden[1]);
      const extra = orden.slice(2).map((i) => `${i.a.nom}: ciclo RD$ ${fmtCorto(i.cobrado)}, hoy RD$ ${fmtCorto(hoyDe(i).total)}`).join(" · ");
      if (extra) b2[b2.length - 1] = (b2[b2.length - 1] === relleno ? "" : b2[b2.length - 1] + " · ") + extra;
      // El relleno invisible no es espacio para limpiarParam, así que se conserva.
      return [etiqueta, fecha, ...b1, ...b2, fmtCorto(negocioCiclo), fmtCorto(totalHoy)].map(limpiarParam);
    }
    if (dry) {
      resultados.push({ acumulado_agentes: true, vista: renderizar(CUERPO_ACUMULADO, varsAcumulado(RELLENO)) });
    } else if (!soloAgenteId && (await plantillaAprobada(cfg.zernio_account_id, TEMPLATE_ACUMULADO))) {
      for (const ad of admins) {
        let r = await entregar(ad, ad, varsAcumulado(RELLENO), TEMPLATE_ACUMULADO);
        if (!r.ok && !r.skip) r = await entregar(ad, ad, varsAcumulado("·"), TEMPLATE_ACUMULADO);
        resultados.push(r);
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

    return json({ ok:true, dry, fecha, periodo, formato: v2Lista ? "v2" : "v1", total_negocio_ciclo: negocioCiclo, resultados });
  } catch (e) {
    console.error("whatsapp-reporte-diario-agentes", e);
    return json({ ok:false, error:e instanceof Error ? e.message : String(e) }, 500);
  }
});