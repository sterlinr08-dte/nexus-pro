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
// Los 3 tipos de evento (factura_generada, atrasado, pago_aplicado) son SIEMPRE mensajes
// iniciados por el negocio (el cliente no escribió primero), así que caen fuera de la ventana de
// 24h de Meta — se mandan como plantilla, nunca como texto libre. Contrato de plantilla
// verificado en vivo contra docs.zernio.com en la integración de Bayolcell Taller: POST
// .../messages con { messageType:"template", template:{ name, language,
// variableMapping:{ body_text:[[...]] } } }.
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

async function mandarPlantilla(telefono: string, accountId: string, nombre: string, variables: string[]): Promise<ResultadoZernio> {
  const body = {
    accountId,
    messageType: "template",
    template: { name: nombre, language: "es", variableMapping: { body_text: [variables] } },
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

function armarPlantilla(tipo: string, nombreCliente: string, datos: Record<string, unknown>): Plantilla | null {
  if (tipo === "factura_generada") {
    return { nombre: "factura_generada", variables: [nombreCliente, fmtMonto(datos.monto), periodoLegible(datos.periodo as string)] };
  }
  if (tipo === "atrasado") {
    const meses = Number(datos.meses) || 1;
    return { nombre: "recordatorio_atraso", variables: [nombreCliente, fmtMonto(datos.monto), `${meses} mes${meses === 1 ? "" : "es"}`] };
  }
  if (tipo === "pago_aplicado") {
    return { nombre: "pago_confirmado", variables: [nombreCliente, fmtMonto(datos.monto), fmtMonto(datos.saldo_actual)] };
  }
  return null;
}

async function registrar(clienteId: string, tipo: string, referenciaId: string | null, plantilla: Plantilla | null, estado: string, zernioMessageId?: string | null, errorDetalle?: string | null) {
  await db.from("whatsapp_mensajes").insert({
    cliente_id: clienteId,
    tipo,
    referencia_id: referenciaId,
    plantilla_nombre: plantilla?.nombre ?? null,
    plantilla_variables: plantilla?.variables ?? null,
    estado,
    zernio_message_id: zernioMessageId ?? null,
    error_detalle: errorDetalle ?? null,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  if (!INTERNAL_SECRET || req.headers.get("X-Internal-Secret") !== INTERNAL_SECRET) {
    return json({ ok: false, error: "no_autorizado" }, 401);
  }

  let body: { tipo?: string; cliente_id?: string; referencia_id?: string; datos?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "body_invalido" }, 400);
  }

  const { tipo, cliente_id, referencia_id, datos } = body;
  if (!tipo || !cliente_id) return json({ ok: false, error: "tipo_y_cliente_id_requeridos" }, 400);

  const { data: cliente } = await db.from("clientes").select("nom, wa").eq("id", cliente_id).maybeSingle();
  if (!cliente) return json({ ok: false, error: "cliente_no_encontrado" }, 404);

  const { data: config } = await db.from("whatsapp_config").select("zernio_account_id, activo").eq("activo", true).limit(1).maybeSingle();

  if (!config?.zernio_account_id) {
    await registrar(cliente_id, tipo, referencia_id ?? null, null, "sin_configurar");
    return json({ ok: true, estado: "sin_configurar" });
  }

  const plantilla = armarPlantilla(tipo, cliente.nom ?? "cliente", datos ?? {});
  if (!plantilla) {
    await registrar(cliente_id, tipo, referencia_id ?? null, null, "error", null, "tipo de evento desconocido: " + tipo);
    return json({ ok: false, error: "tipo_desconocido" }, 400);
  }

  const telefono = formatearTelefono(cliente.wa);
  if (!telefono) {
    await registrar(cliente_id, tipo, referencia_id ?? null, plantilla, "error", null, "cliente sin WhatsApp registrado");
    return json({ ok: true, estado: "error", motivo: "sin_whatsapp" });
  }

  try {
    const resultado = await mandarConReintento(telefono, config.zernio_account_id, plantilla.nombre, plantilla.variables);
    if (resultado.ok) {
      await registrar(cliente_id, tipo, referencia_id ?? null, plantilla, "enviado", resultado.data?.data?.messageId ?? null);
      return json({ ok: true, estado: "enviado" });
    }
    await registrar(cliente_id, tipo, referencia_id ?? null, plantilla, "error", null, JSON.stringify(resultado.data));
    return json({ ok: false, estado: "error", detalle: resultado.data }, 502);
  } catch (e) {
    const detalle = esTimeout(e) ? "timeout llamando a Zernio" : String(e);
    await registrar(cliente_id, tipo, referencia_id ?? null, plantilla, "error", null, detalle);
    return json({ ok: false, estado: "error", detalle }, 502);
  }
});
