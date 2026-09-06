import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// whatsapp-webhook — NEXUS PRO, recibe eventos de Zernio para la línea de Seguros (fase 2: inbox
// de dos vías). Adaptado de Bayolcell Taller (mismo proveedor, misma cuenta/equipo de Zernio).
//
// Punto crítico, confirmado en docs.zernio.com: los webhooks de Zernio son a nivel de EQUIPO
// (hasta 10 URLs), no por número/accountId — este endpoint va a recibir TAMBIÉN los eventos de
// las 5 líneas de Bayolcell Taller, y el webhook de Bayolcell Taller va a recibir los de esta
// línea de Seguros. Por eso el primer filtro real es por accountId contra whatsapp_config — todo
// lo que no coincida se ignora en silencio (200, sin escribir nada), nunca un error.
//
// nexus-pro es una sola organización con una sola línea de WhatsApp — a diferencia de Bayolcell
// Taller no hace falta sucursal_id/linea_id/leads/campañas; whatsapp_config ya tiene la única
// cuenta relevante.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("ZERNIO_WEBHOOK_SECRET") ?? "";
const ZERNIO_API_KEY = Deno.env.get("ZERNIO_API_KEY") ?? "";

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function esTelefono(v: unknown): v is string {
  return typeof v === "string" && /^\+?\d{7,15}$/.test(v);
}

// Misma regla que nxWa()/formatearTelefono en el resto de nexus-pro.
function normalizarTelefono(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 10) return "1" + digits;
  return digits;
}

function idMensaje(msg: any): string {
  return msg?.platformMessageId || msg?.id;
}

function identificarContacto(payload: any): string | null {
  const conv = payload.conversation || {};
  const msg = payload.message || {};
  if (esTelefono(conv.participantId)) return normalizarTelefono(conv.participantId);
  if (esTelefono(conv.participantUsername)) return normalizarTelefono(conv.participantUsername);
  if (conv.contactId) return `bsid:${conv.contactId}`;
  const scoped = msg.direction === "incoming" ? msg.sender?.businessScopedUserId : null;
  if (scoped) return `bsid:${scoped}`;
  return null;
}

async function verificarFirma(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!WEBHOOK_SECRET) {
    console.error("ZERNIO_WEBHOOK_SECRET no configurado — rechazando por seguridad");
    return false;
  }
  if (!signatureHeader) return false;
  const recibida = signatureHeader.startsWith("sha256=") ? signatureHeader.slice(7) : signatureHeader;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(WEBHOOK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const calculada = Array.from(new Uint8Array(sigBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (calculada.length !== recibida.length) return false;
  let diff = 0;
  for (let i = 0; i < calculada.length; i++) diff |= calculada.charCodeAt(i) ^ recibida.charCodeAt(i);
  if (diff !== 0) console.error("Firma HMAC no coincide");
  return diff === 0;
}

// El único filtro de "es esto mío" — todo evento de otra línea/negocio se descarta aquí, sin
// tocar la base de datos.
async function esNuestraCuenta(account: any): Promise<boolean> {
  const { data: config } = await db.from("whatsapp_config").select("zernio_account_id, whatsapp_numero, activo").eq("activo", true).limit(1).maybeSingle();
  if (!config?.zernio_account_id) return false;
  if (account?.id === config.zernio_account_id || account?.accountId === config.zernio_account_id) return true;
  if (account?.username && config.whatsapp_numero && normalizarTelefono(account.username) === normalizarTelefono(config.whatsapp_numero)) return true;
  return false;
}

async function buscarClientePorTelefono(telefonoE164: string): Promise<string | null> {
  if (telefonoE164.startsWith("bsid:")) return null;
  const digitos = telefonoE164.replace(/\D/g, "");
  const { data } = await db.from("clientes").select("id, wa").not("wa", "is", null);
  const match = (data ?? []).find((c: any) => normalizarTelefono(String(c.wa)) === digitos);
  return match?.id ?? null;
}

function tipoDeAdjunto(tipo: string | undefined): string {
  const t = (tipo || "").toLowerCase();
  if (t.includes("image") || t.includes("sticker")) return "imagen";
  if (t.includes("audio") || t.includes("voice")) return "audio";
  if (t.includes("video")) return "video";
  return "documento";
}

function resolverUrlAdjunto(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://zernio.com${url.startsWith("/") ? "" : "/"}${url}`;
}

async function guardarAdjunto(urlCruda: string, categoria: string): Promise<string | null> {
  try {
    const url = resolverUrlAdjunto(urlCruda);
    const headers: Record<string, string> = {};
    if (ZERNIO_API_KEY) headers["Authorization"] = `Bearer ${ZERNIO_API_KEY}`;
    const r = await fetch(url, { headers });
    if (!r.ok) {
      console.error("descarga de adjunto fallo, status:", r.status, "url:", url);
      return null;
    }
    const buf = await r.arrayBuffer();
    const contentType = r.headers.get("content-type") || "application/octet-stream";
    const ext = contentType.split("/")[1]?.split(";")[0]?.replace(/[^a-z0-9]/gi, "") || "bin";
    const path = `${categoria}/${crypto.randomUUID()}.${ext}`;
    const { error } = await db.storage.from("whatsapp-inbox-media").upload(path, buf, { contentType, upsert: false });
    if (error) {
      console.error("subir adjunto a storage error:", error.message);
      return null;
    }
    return path;
  } catch (e) {
    console.error("guardarAdjunto error:", e instanceof Error ? e.message : String(e));
    return null;
  }
}

async function buscarMensajeLocalPorWaId(waId: string): Promise<string | null> {
  const { data } = await db.from("whatsapp_hilo_mensajes").select("id").eq("wa_message_id", waId).maybeSingle();
  return data?.id ?? null;
}

async function procesarMensaje(payload: any) {
  const msg = payload.message || {};
  const telefonoE164 = identificarContacto(payload);
  if (!telefonoE164) {
    console.error("Mensaje sin telefono ni id de contacto identificable, se descarta");
    return;
  }

  const esEntrante = msg.direction === "incoming";
  const nombrePerfil = esEntrante ? (msg.sender?.name || null) : null;
  const ahora = new Date().toISOString();

  let tipoContenido = "text";
  let mediaPath: string | null = null;
  const adjuntos = Array.isArray(msg.attachments) ? msg.attachments : [];
  if (adjuntos.length > 0) {
    const primero = adjuntos[0];
    tipoContenido = tipoDeAdjunto(primero.type || primero.originalType || primero.mimeType);
    if (primero.url) mediaPath = await guardarAdjunto(primero.url, tipoContenido);
  }
  const textoCrudo = typeof msg.text === "string" ? msg.text.trim() : "";
  const cuerpo = textoCrudo === "[Unsupported message]"
    ? "[Contenido de WhatsApp no visible]"
    : (textoCrudo || (tipoContenido !== "text" ? `[${tipoContenido}]` : ""));

  const quotedWaId: string | null = payload.metadata?.quotedMessageId || null;
  const respondeAId = quotedWaId ? await buscarMensajeLocalPorWaId(quotedWaId) : null;

  const { data: hiloExistente } = await db
    .from("whatsapp_hilos")
    .select("id, cliente_id, no_leidos_count, nombre_perfil")
    .eq("telefono_e164", telefonoE164)
    .maybeSingle();

  let hiloId: string;
  let clienteId: string | null;

  if (hiloExistente) {
    hiloId = hiloExistente.id;
    clienteId = hiloExistente.cliente_id;
    if (!clienteId) clienteId = await buscarClientePorTelefono(telefonoE164);
    const actualizacion: Record<string, unknown> = {
      nombre_perfil: nombrePerfil ?? hiloExistente.nombre_perfil ?? undefined,
      ultimo_mensaje_at: ahora,
      ultimo_mensaje_preview: cuerpo.slice(0, 200),
      cliente_id: clienteId ?? undefined,
      updated_at: ahora,
    };
    if (esEntrante) {
      actualizacion.ultimo_inbound_at = ahora;
      actualizacion.no_leidos_count = (hiloExistente.no_leidos_count ?? 0) + 1;
    } else {
      actualizacion.ultima_respuesta_humana_at = ahora;
    }
    await db.from("whatsapp_hilos").update(actualizacion).eq("id", hiloId);
  } else {
    clienteId = await buscarClientePorTelefono(telefonoE164);
    const { data: nuevoHilo, error } = await db
      .from("whatsapp_hilos")
      .insert({
        telefono_e164: telefonoE164,
        cliente_id: clienteId,
        nombre_perfil: nombrePerfil,
        ultimo_mensaje_at: ahora,
        ultimo_inbound_at: esEntrante ? ahora : null,
        ultima_respuesta_humana_at: esEntrante ? null : ahora,
        ultimo_mensaje_preview: cuerpo.slice(0, 200),
        no_leidos_count: esEntrante ? 1 : 0,
      })
      .select("id")
      .single();
    if (error || !nuevoHilo) {
      console.error("crear hilo error:", error?.message);
      return;
    }
    hiloId = nuevoHilo.id;
  }

  const revisionPagoEstado = esEntrante && tipoContenido === "imagen" ? "pendiente" : "ninguna";

  const { error: msgError } = await db
    .from("whatsapp_hilo_mensajes")
    .upsert(
      {
        hilo_id: hiloId,
        direccion: esEntrante ? "in" : "out",
        tipo_contenido: tipoContenido,
        cuerpo,
        media_path: mediaPath,
        wa_message_id: idMensaje(msg),
        responde_a_id: respondeAId,
        estado: esEntrante ? "recibido" : "enviado",
        revision_pago_estado: revisionPagoEstado,
      },
      { onConflict: "wa_message_id", ignoreDuplicates: true }
    );
  if (msgError) console.error("insertar mensaje error:", msgError.message);
}

async function procesarEstadoMensaje(payload: any, evento: string) {
  const mapaEstado: Record<string, string> = {
    "message.delivered": "entregado",
    "message.read": "leido",
    "message.failed": "fallido",
  };
  const estado = mapaEstado[evento];
  if (!estado) return;
  const msg = payload.message || {};
  const idBuscado = idMensaje(msg);
  const errorDetalle = payload.error ? JSON.stringify(payload.error).slice(0, 500) : null;
  // Sin filtro por accountId aquí a propósito, igual que en Bayolcell Taller: un
  // wa_message_id de otra línea simplemente no existe en esta tabla, así que esto
  // es seguro aunque más ruidoso en los logs una vez que ambas líneas compartan webhook.
  const { error, count } = await db
    .from("whatsapp_hilo_mensajes")
    .update({ estado, error_detalle: errorDetalle }, { count: "exact" })
    .eq("wa_message_id", idBuscado);
  if (error) console.error("actualizar estado error:", error.message);
  else if (!count) console.error("actualizar estado: no se encontro mensaje con wa_message_id =", idBuscado);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok");
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const rawBody = await req.text();
  const firmaOk = await verificarFirma(rawBody, req.headers.get("X-Zernio-Signature"));
  if (!firmaOk) {
    console.error("Webhook rechazado: firma invalida o ausente");
    return new Response("Invalid signature", { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody);
    const account = payload.account || {};
    if (!(await esNuestraCuenta(account))) {
      // No es un error -- es tráfico de otra línea del mismo equipo de Zernio (ej. Bayolcell
      // Taller). Se ignora en silencio, sin tocar la base de datos.
      return new Response(JSON.stringify({ received: true, ignorado: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    const evento = payload.event as string;
    if (evento === "message.received" || evento === "message.sent") {
      await procesarMensaje(payload);
    } else if (evento === "message.delivered" || evento === "message.read" || evento === "message.failed") {
      await procesarEstadoMensaje(payload, evento);
    } else {
      console.error("Evento no manejado:", evento);
    }
  } catch (e) {
    console.error("whatsapp-webhook error:", e instanceof Error ? e.message : String(e));
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
