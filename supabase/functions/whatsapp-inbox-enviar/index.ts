import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// whatsapp-inbox-enviar — NEXUS PRO
// Envia texto, adjuntos, ubicacion y contactos desde el Inbox. Todas las llamadas
// vienen de un usuario autenticado y se vuelven a autorizar del lado del servidor.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ZERNIO_API_KEY = Deno.env.get("ZERNIO_API_KEY") ?? "";
const ZERNIO_TIMEOUT_MS = 20000;
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
function subDelJWT(req: Request): string | null {
  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    const payloadB64 = token.split(".")[1];
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
    return payload.sub ?? null;
  } catch { return null; }
}
async function resolverAcceso(sub: string | null): Promise<{ autorizado: boolean; agenteId: string | null }> {
  const sinAcceso = { autorizado: false, agenteId: null };
  if (!sub) return sinAcceso;
  const { data: profile } = await db.from("profiles").select("rol, usuario_sistema_id").eq("id", sub).maybeSingle();
  if (!profile?.rol || !profile.usuario_sistema_id) return sinAcceso;
  const { data: us } = await db.from("usuarios_sistema").select("organizacion_id, nom").eq("id", profile.usuario_sistema_id).maybeSingle();
  if (!us?.organizacion_id) return sinAcceso;
  const { data: org } = await db.from("organizaciones").select("id").eq("slug", "nexus-pro").maybeSingle();
  if (!org || org.id !== us.organizacion_id) return sinAcceso;
  let agenteId: string | null = null;
  if (us.nom) {
    const { data: agente } = await db.from("agentes").select("id").eq("activo", true).ilike("nom", us.nom).maybeSingle();
    agenteId = agente?.id ?? null;
  }
  return { autorizado: true, agenteId };
}

type ResultadoZernio = { ok: boolean; data: any; status: number };
type ContactoWa = {
  name: { formatted_name: string; first_name?: string; last_name?: string };
  phones?: Array<{ phone: string; type?: string; wa_id?: string }>;
  emails?: Array<{ email: string; type?: string }>;
};
type Body = {
  accion?: "presign";
  filename?: string;
  content_type?: string;
  hilo_id?: string;
  mensaje?: string;
  responde_a_id?: string | null;
  attachment_url?: string | null;
  attachment_type?: "image" | "video" | "audio" | "file";
  attachment_name?: string | null;
  voice_note?: boolean;
  location?: { latitude: number; longitude: number; name?: string; address?: string } | null;
  contacts?: ContactoWa[] | null;
};

function esTimeout(e: unknown): boolean {
  return e instanceof DOMException && e.name === "TimeoutError";
}
function esConversacionNoEncontrada(resultado: ResultadoZernio): boolean {
  return resultado.status === 404 && resultado.data?.code === "CONVERSATION_NOT_FOUND";
}
async function esperar(ms: number) { await new Promise((resolve) => setTimeout(resolve, ms)); }

async function zernioJson(url: string, body: Record<string, unknown>, idempotencyKey?: string): Promise<ResultadoZernio> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${ZERNIO_API_KEY}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(ZERNIO_TIMEOUT_MS),
  });
  const data = await resp.json().catch(() => null);
  return { ok: resp.ok && (data?.success !== false), data, status: resp.status };
}
async function mandarAZernio(conversationId: string, payload: Record<string, unknown>, idem: string): Promise<ResultadoZernio> {
  return await zernioJson(`https://zernio.com/api/v1/inbox/conversations/${encodeURIComponent(conversationId)}/messages`, payload, idem);
}
async function mandarConReintento(conversationId: string, payload: Record<string, unknown>): Promise<ResultadoZernio> {
  const idem = crypto.randomUUID();
  let resultado = await mandarAZernio(conversationId, payload, idem);
  for (let intento = 1; intento <= 2 && esConversacionNoEncontrada(resultado); intento++) {
    await esperar(2000);
    resultado = await mandarAZernio(conversationId, payload, idem);
  }
  return resultado;
}

async function presign(body: Body): Promise<Response> {
  const filename = String(body.filename || "").trim().slice(0, 180);
  const contentType = String(body.content_type || "application/octet-stream").trim().slice(0, 120);
  if (!filename) return json({ ok: false, error: "falta_filename" }, 400);
  const resultado = await zernioJson("https://zernio.com/api/v1/media/presign", { filename, contentType });
  if (!resultado.ok) return json({ ok: false, error: "zernio_presign_error", detalle: resultado.data }, resultado.status || 502);
  const d = resultado.data?.data || resultado.data || {};
  if (!d.uploadUrl || !d.publicUrl) return json({ ok: false, error: "presign_incompleto" }, 502);
  return json({ ok: true, uploadUrl: d.uploadUrl, publicUrl: d.publicUrl, expiresIn: d.expiresIn ?? null });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "metodo_no_permitido" }, 405);
  try { return await manejar(req); }
  catch (e) {
    console.error("whatsapp-inbox-enviar: excepcion no capturada:", e instanceof Error ? (e.stack || e.message) : String(e));
    return json({ ok: false, error: "error_interno" }, 500);
  }
});

async function manejar(req: Request): Promise<Response> {
  const sub = subDelJWT(req);
  const acceso = await resolverAcceso(sub);
  if (!acceso.autorizado) return json({ ok: false, error: "no_autorizado" }, 403);

  let body: Body;
  try { body = await req.json(); }
  catch { return json({ ok: false, error: "body_invalido" }, 400); }

  if (body.accion === "presign") return await presign(body);

  const hiloId = body.hilo_id;
  const mensaje = String(body.mensaje || "").trim();
  const respondeAId = body.responde_a_id ? String(body.responde_a_id) : null;
  const attachmentUrl = body.attachment_url ? String(body.attachment_url) : null;
  const attachmentType = body.attachment_type || null;
  const location = body.location || null;
  const contacts = Array.isArray(body.contacts) ? body.contacts : [];
  const tieneContenido = !!mensaje || !!attachmentUrl || !!location || contacts.length > 0;
  if (!hiloId) return json({ ok: false, error: "falta_hilo_id" }, 400);
  if (!tieneContenido) return json({ ok: false, error: "mensaje_vacio" }, 400);

  if (attachmentUrl && !["image", "video", "audio", "file"].includes(String(attachmentType))) {
    return json({ ok: false, error: "attachment_type_invalido" }, 400);
  }
  if (location && (!Number.isFinite(Number(location.latitude)) || !Number.isFinite(Number(location.longitude)))) {
    return json({ ok: false, error: "ubicacion_invalida" }, 400);
  }
  if (contacts.some(c => !c?.name?.formatted_name)) return json({ ok: false, error: "contacto_invalido" }, 400);

  const { data: hilo, error: hiloError } = await db.from("whatsapp_hilos").select("id, telefono_e164, ultimo_inbound_at").eq("id", hiloId).maybeSingle();
  if (hiloError || !hilo) return json({ ok: false, error: "hilo_no_encontrado" }, 404);

  let replyTo: string | null = null;
  if (respondeAId) {
    const { data: mensajeRespondido } = await db.from("whatsapp_hilo_mensajes")
      .select("id,wa_message_id").eq("id", respondeAId).eq("hilo_id", hiloId).maybeSingle();
    if (!mensajeRespondido) return json({ ok: false, error: "responde_a_id_invalido" }, 400);
    replyTo = mensajeRespondido.wa_message_id || null;
  }

  if (!hilo.ultimo_inbound_at) return json({ ok: false, error: "ventana_cerrada", mensaje: "Este hilo no tiene mensajes entrantes todavía." }, 409);
  const horasDesdeUltimoInbound = (Date.now() - new Date(hilo.ultimo_inbound_at).getTime()) / 3600000;
  if (horasDesdeUltimoInbound > 24) return json({ ok: false, error: "ventana_cerrada", mensaje: "Pasaron más de 24h desde el último mensaje del cliente." }, 409);

  const { data: config } = await db.from("whatsapp_config").select("zernio_account_id, activo").eq("activo", true).limit(1).maybeSingle();
  if (!config?.zernio_account_id) return json({ ok: false, error: "sin_configurar" }, 500);
  const conversationId = hilo.telefono_e164.startsWith("bsid:") ? hilo.telefono_e164.slice(5) : hilo.telefono_e164;

  const payload: Record<string, unknown> = { accountId: config.zernio_account_id };
  if (mensaje) payload.message = mensaje;
  if (attachmentUrl) {
    payload.attachmentUrl = attachmentUrl;
    payload.attachmentType = attachmentType;
    if (attachmentType === "file" && body.attachment_name) payload.attachmentName = String(body.attachment_name).slice(0, 180);
    if (attachmentType === "audio" && body.voice_note) payload.voiceNote = true;
  }
  if (location) payload.location = {
    latitude: Number(location.latitude), longitude: Number(location.longitude),
    ...(location.name ? { name: String(location.name).slice(0, 120) } : {}),
    ...(location.address ? { address: String(location.address).slice(0, 240) } : {}),
  };
  if (contacts.length) payload.contacts = contacts.slice(0, 5);
  if (replyTo) payload.replyTo = replyTo;

  let resultado: ResultadoZernio;
  try { resultado = await mandarConReintento(conversationId, payload); }
  catch (e) {
    console.error("whatsapp-inbox-enviar: fetch a Zernio fallo:", e instanceof Error ? e.message : String(e));
    if (esTimeout(e)) return json({ ok: false, error: "zernio_timeout", mensaje: "Zernio no respondió a tiempo. No reintentes automáticamente." }, 504);
    return json({ ok: false, error: "no_se_pudo_contactar_zernio" }, 502);
  }
  if (!resultado.ok) {
    console.error("whatsapp-inbox-enviar: Zernio respondio no-ok, status:", resultado.status, "data:", JSON.stringify(resultado.data));
    return json({ ok: false, error: "zernio_error", detalle: resultado.data }, 502);
  }

  const ahora = new Date().toISOString();
  const messageId = resultado.data?.data?.messageId ?? resultado.data?.messageId ?? null;
  // Los mensajes sin archivo se pueden registrar inmediatamente. Para archivos esperamos el
  // webhook message.sent, porque ese camino descarga la multimedia y la guarda en el bucket
  // privado whatsapp-inbox-media. Ubicacion/contacto no necesitan archivo, asi que se guardan
  // aqui y el webhook los deduplica por wa_message_id.
  const guardarLocal = !attachmentUrl;
  let mensajeInsertado: any = null;

  if (guardarLocal) {
    let tipoContenido = "text";
    let cuerpoLocal = mensaje;
    if (location) {
      tipoContenido = "ubicacion";
      const etiqueta = String(location.name || location.address || "Ubicación compartida");
      cuerpoLocal = `${etiqueta} · ${Number(location.latitude).toFixed(6)}, ${Number(location.longitude).toFixed(6)}`;
    } else if (contacts.length) {
      tipoContenido = "contacto";
      const c0 = contacts[0];
      const tel = c0?.phones?.[0]?.phone || c0?.phones?.[0]?.wa_id || "";
      cuerpoLocal = `Contacto · ${c0?.name?.formatted_name || "Contacto"}${tel ? ` · ${tel}` : ""}`;
    }
    const { data, error: insertError } = await db.from("whatsapp_hilo_mensajes").insert({
      hilo_id: hiloId,
      direccion: "out",
      tipo_contenido: tipoContenido,
      cuerpo: cuerpoLocal || (tipoContenido === "text" ? "" : `[${tipoContenido}]`),
      wa_message_id: messageId,
      responde_a_id: respondeAId,
      estado: "enviado",
      enviado_por_agente_id: acceso.agenteId,
    }).select("id,hilo_id,direccion,tipo_contenido,cuerpo,media_path,wa_message_id,responde_a_id,estado,error_detalle,enviado_por_agente_id,revision_pago_estado,abono_id,created_at").single();
    if (insertError) {
      console.error("whatsapp-inbox-enviar: no se pudo guardar el mensaje:", insertError.message);
      return json({ ok: false, error: "mensaje_enviado_no_guardado" }, 500);
    }
    mensajeInsertado = data;
  }

  const preview = mensaje || (attachmentType === "image" ? "Imagen" : attachmentType === "video" ? "Video" : attachmentType === "audio" ? "Audio" : attachmentUrl ? "Documento" : location ? "Ubicación" : contacts.length ? "Contacto" : "Mensaje");
  await db.from("whatsapp_hilos").update({
    ultimo_mensaje_at: ahora,
    ultimo_mensaje_preview: preview.slice(0, 200),
    ultima_respuesta_humana_at: ahora,
    updated_at: ahora,
  }).eq("id", hiloId);

  return json({ ok: true, messageId, mensaje: mensajeInsertado, espera_webhook: !!attachmentUrl });
}
