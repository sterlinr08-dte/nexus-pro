import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// whatsapp-notificar — NEXUS PRO, notificaciones automáticas de WhatsApp (fase 1: solo saliente).
//
// Llamada SOLO desde triggers/cron de Postgres (via pg_net), nunca desde el navegador — por eso
// no verifica un JWT de usuario, sino un secreto interno compartido (header X-Internal-Secret,
// guardado en Supabase Vault del lado de la base de datos y como secret de esta función del otro
// lado). verify_jwt está apagado en la config de esta función, igual que whatsapp-webhook en
// Bayolcell Taller (ese lo verifica con una firma HMAC de Zernio porque lo llama Zernio; este lo
// verifica con un secreto propio porque lo llama nuestra propia base de datos).
//
// Los 4 tipos de evento (factura_generada, atrasado, pago_aplicado, entrega_confirmada) son
// SIEMPRE mensajes iniciados por el negocio (el destinatario no escribió primero), así que caen
// fuera de la ventana de 24h de Meta — se mandan como plantilla, nunca como texto libre.
// Contrato de plantilla verificado en vivo contra docs.zernio.com en la integración de Bayolcell
// Taller: POST .../messages con { messageType:"template", template:{ name, language,
// variableMapping:{ body_text:[[...]] } } }.
//
// Destinatario: cliente (clientes.wa) O agente (agentes.tel) — el body trae cliente_id o
// agente_id, nunca los dos. entrega_confirmada (v3) es el único evento con destino agente:
// avisa cuánto tiene acumulado cuando cobra y deposita a SU PROPIA cuenta (trg_whatsapp_entrega_confirmada
// en Postgres, migración whatsapp_entrega_agente) — los otros 3 siguen siendo solo para clientes.
//
// Si `whatsapp_config` no existe o está inactiva (activo=false — el estado por defecto hasta que
// exista una cuenta real de Zernio), se registra el intento en whatsapp_mensajes con
// estado:'sin_configurar' y se responde 200 sin error: así todo el pipeline (triggers, cron,
// tablas) puede desplegarse y probarse hoy sin necesitar credenciales reales todavía.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ZERNIO_API_KEY = Deno.env.get("ZERNIO_API_KEY") ?? "";
const INTERNAL_SECRET = Deno.env.get("WHATSAPP_INTERNAL_SECRET") ?? "";
const ZERNIO_TIMEOUT_MS = 20000;

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
}

// Misma regla que nxWa() en index.html: quita todo lo que no sea dígito; si quedan 10 dígitos les
// antepone '1' (código de país RD/NANP); si el resultado no llega a 11 dígitos, no hay WhatsApp.
function formatearTelefono(num: string | null | undefined): string | null {
  let d = String(num ?? "").replace(/\D/g, "");
  if (d.length === 10) d = "1" + d;
  return d.length >= 11 ? d : null;
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function periodoLegible(periodo: string | null | undefined): string {
  const p = String(periodo ?? "").split("-");
  if (p.length !== 2) return String(periodo ?? "");
  const mes = MESES[Number(p[1]) - 1];
  return mes ? `${mes} ${p[0]}` : String(periodo);
}

function fmtMonto(n: unknown): string {
  const v = Number(n) || 0;
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type ResultadoZernio = { ok: boolean; data: any; status: number };

function esTimeout(e: unknown): boolean {
  return e instanceof DOMException && e.name === "TimeoutError";
}

function esConversacionNoEncontrada(resultado: ResultadoZernio): boolean {
  return resultado.status === 404 && resultado.data?.code === "CONVERSATION_NOT_FOUND";
}

async function esperar(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

// Fix 2026-09-07: el campo "messageType" no existe en la API real de Zernio (no esta en el
// schema del endpoint /v1/inbox/conversations/{id}/messages, confirmado leyendo la doc real
// en docs.zernio.com/messages/send-inbox-message) y "template" NO lleva {name, language,
// variableMapping} directo -- va envuelto en "elements": [{name, language, components}], con
// components en el formato estandar de la Cloud API de Meta ([{type:"body", parameters:[...]}]).
// El shape viejo hacia que Zernio no reconociera "template" como valido, cayera a "no hay
// contenido" y rechazara el envio con 400 "Message, attachment, or interactive content is
// required" -- confirmado en vivo, nunca se habia probado un envio real con plantilla antes
// (ni aca ni en Bayolcell Taller, que usa el mismo shape viejo en whatsapp-enviar).
function armarComponents(variables: string[]): { type: string; parameters: { type: string; text: string }[] }[] {
  return [{ type: "body", parameters: variables.map((v) => ({ type: "text", text: v })) }];
}

async function mandarPlantilla(telefono: string, accountId: string, nombre: string, variables: string[]): Promise<ResultadoZernio> {
  const body = {
    accountId,
    template: { elements: [{ name: nombre, language: "es", components: armarComponents(variables) }] },
  };
  const resp = await fetch(`https://zernio.com/api/v1/inbox/conversations/${encodeURIComponent(telefono)}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ZERNIO_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(ZERNIO_TIMEOUT_MS),
  });
  const data = await resp.json().catch(() => null);
  return { ok: resp.ok && !!data?.success, data, status: resp.status };
}

// Ver whatsapp-enviar de Bayolcell Taller (fix 2026-09-05): un 404 CONVERSATION_NOT_FOUND es
// inequívoco (Zernio nunca procesó el envío), así que reintentar es seguro — a diferencia de un
// 5xx/timeout, donde el mensaje pudo haber salido igual del lado de Zernio.
async function mandarConReintento(telefono: string, accountId: string, nombre: string, variables: string[]): Promise<ResultadoZernio> {
  let resultado = await mandarPlantilla(telefono, accountId, nombre, variables);
  for (let intento = 1; intento <= 2 && esConversacionNoEncontrada(resultado); intento++) {
    await esperar(2000);
    resultado = await mandarPlantilla(telefono, accountId, nombre, variables);
  }
  return resultado;
}

type Plantilla = { nombre: string; variables: string[] };

// nombreDestino es del cliente o del agente, según cuál de los dos venga en la llamada — la
// plantilla no necesita saber cuál es, solo el texto que va en la variable {{1}}.
function armarPlantilla(tipo: string, nombreDestino: string, datos: Record<string, unknown>): Plantilla | null {
  if (tipo === "factura_generada") {
    return { nombre: "factura_generada", variables: [nombreDestino, fmtMonto(datos.monto), periodoLegible(datos.periodo as string)] };
  }
  if (tipo === "atrasado") {
    const meses = Number(datos.meses) || 1;
    return { nombre: "recordatorio_atraso", variables: [nombreDestino, fmtMonto(datos.monto), `${meses} mes${meses === 1 ? "" : "es"}`] };
  }
  if (tipo === "pago_aplicado") {
    return { nombre: "pago_confirmado", variables: [nombreDestino, fmtMonto(datos.monto), fmtMonto(datos.saldo_actual)] };
  }
  // Entrega confirmada (destino agente): monto = lo que acaba de depositar en este cobro,
  // acumulado = transferencias_saldo_disponible_agente() -- lo que el agente tiene en su poder
  // en total en este momento, no solo lo de este cobro.
  if (tipo === "entrega_confirmada") {
    return { nombre: "entrega_confirmada", variables: [nombreDestino, fmtMonto(datos.monto), fmtMonto(datos.acumulado)] };
  }
  return null;
}

// clienteId/agenteId: exactamente uno de los dos, nunca los dos a la vez ni ninguno (ya se validó
// antes de llamar aquí) — whatsapp_mensajes tiene un CHECK que lo exige también del lado de la base.
async function registrar(clienteId: string | null, agenteId: string | null, tipo: string, referenciaId: string | null, plantilla: Plantilla | null, estado: string, zernioMessageId?: string | null, errorDetalle?: string | null) {
  await db.from("whatsapp_mensajes").insert({
    cliente_id: clienteId,
    agente_id: agenteId,
    tipo,
    referencia_id: referenciaId,
    plantilla_nombre: plantilla?.nombre ?? null,
    plantilla_variables: plantilla?.variables ?? null,
    estado,
    zernio_message_id: zernioMessageId ?? null,
    error_detalle: errorDetalle ?? null,
  });
}

// Se queda como estaba: marca la PRIMERA vez que ESA factura en particular entró en un aviso --
// ya no decide si se avisa (eso lo hace whatsapp_detectar_atrasados con la cadencia por cliente,
// ver marcarClienteAvisadoAtraso), es solo rastro histórico por si sirve para auditoría.
async function marcarAtrasoNotificado(tipo: string, referenciaId: string | null | undefined) {
  if (tipo !== "atrasado" || !referenciaId) return;
  const { error } = await db
    .from("facturas")
    .update({ notificado_atraso_en: new Date().toISOString() })
    .eq("id", referenciaId)
    .is("notificado_atraso_en", null);
  if (error) console.error("marcar atraso notificado error:", error.message);
}

// Cadencia real del recordatorio (decisión del dueño, auditoría 2026-09-06): un aviso de atraso
// se repite cada N días MIENTRAS el cliente siga debiendo -- whatsapp_detectar_atrasados() lee
// este campo para decidir si ya toca volver a avisarle. Se marca SOLO en éxito confirmado, nunca
// en error/timeout/sin_configurar, para que un intento fallido se reintente en la próxima corrida
// del cron en vez de darse por hecho.
async function marcarClienteAvisadoAtraso(tipo: string, clienteId: string) {
  if (tipo !== "atrasado") return;
  const { error } = await db
    .from("clientes")
    .update({ ultimo_aviso_atraso_en: new Date().toISOString() })
    .eq("id", clienteId);
  if (error) console.error("marcar cliente avisado atraso error:", error.message);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  if (!INTERNAL_SECRET || req.headers.get("X-Internal-Secret") !== INTERNAL_SECRET) {
    return json({ ok: false, error: "no_autorizado" }, 401);
  }

  let body: { tipo?: string; cliente_id?: string; agente_id?: string; referencia_id?: string; datos?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "body_invalido" }, 400);
  }

  const { tipo, cliente_id, agente_id, referencia_id, datos } = body;
  if (!tipo || (!cliente_id && !agente_id)) return json({ ok: false, error: "tipo_y_destino_requeridos" }, 400);

  // Destinatario: cliente (clientes.wa) o agente (agentes.tel) -- nunca los dos, el llamador
  // (trigger de Postgres) siempre manda uno solo.
  let nombreDestino: string;
  let telCrudo: string | null | undefined;
  if (agente_id) {
    const { data: agente } = await db.from("agentes").select("nom, tel").eq("id", agente_id).maybeSingle();
    if (!agente) return json({ ok: false, error: "agente_no_encontrado" }, 404);
    nombreDestino = agente.nom ?? "agente";
    telCrudo = agente.tel;
  } else {
    const { data: cliente } = await db.from("clientes").select("nom, wa").eq("id", cliente_id!).maybeSingle();
    if (!cliente) return json({ ok: false, error: "cliente_no_encontrado" }, 404);
    nombreDestino = cliente.nom ?? "cliente";
    telCrudo = cliente.wa;
  }

  const { data: config } = await db.from("whatsapp_config").select("zernio_account_id, activo").eq("activo", true).limit(1).maybeSingle();

  if (!config?.zernio_account_id) {
    await registrar(cliente_id ?? null, agente_id ?? null, tipo, referencia_id ?? null, null, "sin_configurar");
    return json({ ok: true, estado: "sin_configurar" });
  }

  const plantilla = armarPlantilla(tipo, nombreDestino, datos ?? {});
  if (!plantilla) {
    await registrar(cliente_id ?? null, agente_id ?? null, tipo, referencia_id ?? null, null, "error", null, "tipo de evento desconocido: " + tipo);
    return json({ ok: false, error: "tipo_desconocido" }, 400);
  }

  const telefono = formatearTelefono(telCrudo);
  if (!telefono) {
    const motivo = agente_id ? "agente sin WhatsApp registrado" : "cliente sin WhatsApp registrado";
    await registrar(cliente_id ?? null, agente_id ?? null, tipo, referencia_id ?? null, plantilla, "error", null, motivo);
    return json({ ok: true, estado: "error", motivo: "sin_whatsapp" });
  }

  try {
    const resultado = await mandarConReintento(telefono, config.zernio_account_id, plantilla.nombre, plantilla.variables);
    if (resultado.ok) {
      await registrar(cliente_id ?? null, agente_id ?? null, tipo, referencia_id ?? null, plantilla, "enviado", resultado.data?.data?.messageId ?? null);
      await marcarAtrasoNotificado(tipo, referencia_id);
      if (cliente_id) await marcarClienteAvisadoAtraso(tipo, cliente_id);
      return json({ ok: true, estado: "enviado" });
    }
    await registrar(cliente_id ?? null, agente_id ?? null, tipo, referencia_id ?? null, plantilla, "error", null, JSON.stringify(resultado.data));
    return json({ ok: false, estado: "error", detalle: resultado.data }, 502);
  } catch (e) {
    const detalle = esTimeout(e) ? "timeout llamando a Zernio" : String(e);
    await registrar(cliente_id ?? null, agente_id ?? null, tipo, referencia_id ?? null, plantilla, "error", null, detalle);
    return json({ ok: false, estado: "error", detalle }, 502);
  }
});
