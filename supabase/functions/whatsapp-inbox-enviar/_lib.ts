// Lógica de whatsapp-inbox-enviar separada de Deno.serve para poder probarla con un cliente
// Supabase y un fetch simulados. index.ts solo arma dependencias, autentica y despacha.

export type Db = {
  from(tabla: string): any;
  storage: { from(bucket: string): any };
};

export type Deps = {
  db: Db;
  zernioApiKey: string;
  fetchFn?: typeof fetch;
  ahora?: () => Date;
  timeoutMs?: number;
};

export type Acceso = { autorizado: boolean; agenteId: string | null };
export type ResultadoZernio = { ok: boolean; data: any; status: number };
export type ContactoWa = {
  name: { formatted_name: string; first_name?: string; last_name?: string };
  phones?: Array<{ phone: string; type?: string; wa_id?: string }>;
  emails?: Array<{ email: string; type?: string }>;
};
export type Body = {
  accion?: "presign";
  filename?: string;
  content_type?: string;
  hilo_id?: string;
  mensaje?: string;
  responde_a_id?: string | null;
  attachment_url?: string | null;
  attachment_type?: "image" | "video" | "audio" | "file";
  attachment_name?: string | null;
  attachment_mime?: string | null;
  attachment_size?: number | null;
  media_path?: string | null;
  voice_note?: boolean;
  reenviado?: boolean;
  location?: { latitude: number; longitude: number; name?: string; address?: string } | null;
  contacts?: ContactoWa[] | null;
};

export type Respuesta = { status: number; body: Record<string, unknown> };

export const BUCKET = "whatsapp-inbox-media";
export const ESQUEMA_MEDIA_LOCAL = "nexus-media:";
export const VIGENCIA_URL_FIRMADA_S = 7 * 24 * 3600;
export const ZERNIO_BASE = "https://zernio.com/api/v1";

// Enum exacto de POST /media/presign (OpenAPI Zernio v1.164.1). Todo lo demás (docx, xlsx, pptx,
// txt, csv, zip, application/octet-stream) responde 400 INVALID_FIELD_VALUE.
export const MIME_PRESIGN_ZERNIO = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/mpeg", "video/quicktime", "video/avi", "video/x-msvideo", "video/webm", "video/x-m4v",
  "application/pdf",
  "audio/mpeg", "audio/mp4", "audio/aac", "audio/ogg", "audio/wav", "audio/webm", "audio/x-m4a",
]);

const MIME_POR_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
  mp4: "video/mp4", "3gp": "video/3gpp", mov: "video/quicktime", webm: "video/webm",
  mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/ogg", wav: "audio/wav", amr: "audio/amr", weba: "audio/webm",
  pdf: "application/pdf", txt: "text/plain", csv: "text/csv", zip: "application/zip",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const EXTENSION_POR_MIME: Record<string, string> = Object.fromEntries(
  Object.entries(MIME_POR_EXTENSION).filter(([ext]) => !["jpeg", "oga", "opus", "weba"].includes(ext)).map(([ext, mime]) => [mime, ext]),
);

export function extensionDe(nombre: string): string {
  const m = /\.([a-z0-9]{1,8})$/i.exec(String(nombre || "").trim());
  return m ? m[1].toLowerCase() : "";
}

export function limpiarMime(v: unknown): string {
  const s = String(v || "").split(";")[0].trim().toLowerCase();
  return s === "application/octet-stream" ? "" : s;
}

export function inferirMime(nombre: string, declarado?: unknown): string {
  return limpiarMime(declarado) || MIME_POR_EXTENSION[extensionDe(nombre)] || "";
}

export function extensionParaMime(mime: string, nombre?: string): string {
  return extensionDe(nombre || "") || EXTENSION_POR_MIME[mime] || (mime.split("/")[1] || "bin").replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin";
}

export function esRutaMediaLocal(path: unknown): path is string {
  return typeof path === "string" && /^out\/[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(path);
}

export function tipoContenidoDe(attachmentType: string | null): string {
  return ({ image: "imagen", video: "video", audio: "audio", file: "documento" } as Record<string, string>)[attachmentType || ""] || "documento";
}

export function esTimeout(e: unknown): boolean {
  return e instanceof DOMException && e.name === "TimeoutError";
}
function esConversacionNoEncontrada(resultado: ResultadoZernio): boolean {
  return resultado.status === 404 && resultado.data?.code === "CONVERSATION_NOT_FOUND";
}

function limpiar<T extends Record<string, unknown>>(o: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== "") out[k] = v;
  return out as Partial<T>;
}

export function crearEnviador(deps: Deps) {
  const db = deps.db;
  const fetchFn = deps.fetchFn ?? fetch;
  const ahora = deps.ahora ?? (() => new Date());
  const timeoutMs = deps.timeoutMs ?? 20000;
  const apiKey = deps.zernioApiKey;

  const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const respuesta = (body: Record<string, unknown>, status = 200): Respuesta => ({ status, body });

  async function resolverAcceso(sub: string | null): Promise<Acceso> {
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

  async function zernioJson(url: string, body: Record<string, unknown>, idempotencyKey?: string): Promise<ResultadoZernio> {
    const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    const resp = await fetchFn(url, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    const data = await resp.json().catch(() => null);
    return { ok: resp.ok && (data?.success !== false), data, status: resp.status };
  }

  async function zernioMultipart(url: string, form: FormData, idempotencyKey: string): Promise<ResultadoZernio> {
    const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}`, "Idempotency-Key": idempotencyKey };
    const resp = await fetchFn(url, { method: "POST", headers, body: form, signal: AbortSignal.timeout(timeoutMs * 2) });
    const data = await resp.json().catch(() => null);
    return { ok: resp.ok && (data?.success !== false), data, status: resp.status };
  }

  const urlMensajes = (conversationId: string) => `${ZERNIO_BASE}/inbox/conversations/${encodeURIComponent(conversationId)}/messages`;

  async function mandarConReintento(conversationId: string, payload: Record<string, unknown>): Promise<ResultadoZernio> {
    const idem = crypto.randomUUID();
    let resultado = await zernioJson(urlMensajes(conversationId), payload, idem);
    for (let intento = 1; intento <= 2 && esConversacionNoEncontrada(resultado); intento++) {
      await esperar(2000);
      resultado = await zernioJson(urlMensajes(conversationId), payload, idem);
    }
    return resultado;
  }

  async function descargar(url: string): Promise<{ blob: Blob; mime: string } | null> {
    try {
      const r = await fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (!r.ok) return null;
      const mime = limpiarMime(r.headers.get("content-type")) || "application/octet-stream";
      const buf = await r.arrayBuffer();
      return { blob: new Blob([buf], { type: mime }), mime };
    } catch (e) {
      console.error("whatsapp-inbox-enviar: no se pudo descargar el adjunto para multipart:", e instanceof Error ? e.message : String(e));
      return null;
    }
  }

  // Nota de voz: la vía JSON (attachmentUrl + voiceNote) exige ogg/opus; para m4a (Safari) y webm
  // (Chrome) la vía multipart de Zernio transcodifica. Si la descarga o el multipart fallan, se
  // vuelve a la vía JSON de siempre (con otra Idempotency-Key: misma key + otro body = 422).
  async function mandarNotaDeVoz(conversationId: string, payload: Record<string, unknown>, attachmentUrl: string, nombre: string): Promise<ResultadoZernio> {
    const archivo = await descargar(attachmentUrl);
    if (archivo && archivo.mime !== "audio/ogg") {
      try {
        const form = new FormData();
        form.set("accountId", String(payload.accountId));
        form.set("voiceNote", "true");
        if (payload.message) form.set("message", String(payload.message));
        if (payload.replyTo) form.set("replyTo", String(payload.replyTo));
        form.set("attachment", archivo.blob, `${nombre}.${extensionParaMime(archivo.mime)}`);
        const r = await zernioMultipart(urlMensajes(conversationId), form, crypto.randomUUID());
        if (r.ok) return r;
        console.error("whatsapp-inbox-enviar: multipart de nota de voz fallo, status:", r.status, JSON.stringify(r.data)?.slice(0, 300));
      } catch (e) {
        console.error("whatsapp-inbox-enviar: multipart de nota de voz excepcion:", e instanceof Error ? e.message : String(e));
      }
    }
    return await mandarConReintento(conversationId, payload);
  }

  // presign: para los MIME que Zernio acepta, su presign de siempre; para el resto (docx, xlsx,
  // pptx, txt, csv, zip…) una URL firmada de subida al bucket privado whatsapp-inbox-media. En ese
  // caso publicUrl es "nexus-media:<path>" y el envío la convierte en URL firmada de 7 días para
  // Zernio. El frontend no necesita distinguir: hace PUT a uploadUrl y manda publicUrl igual.
  async function presign(body: Body): Promise<Respuesta> {
    const filename = String(body.filename || "").trim().slice(0, 180);
    if (!filename) return respuesta({ ok: false, error: "falta_filename" }, 400);
    const mime = inferirMime(filename, body.content_type);
    if (!mime) return respuesta({ ok: false, error: "tipo_de_archivo_desconocido", mensaje: "No se pudo determinar el tipo del archivo." }, 400);

    if (MIME_PRESIGN_ZERNIO.has(mime)) {
      const resultado = await zernioJson(`${ZERNIO_BASE}/media/presign`, { filename, contentType: mime });
      if (resultado.ok) {
        const d = resultado.data?.data || resultado.data || {};
        if (!d.uploadUrl || !d.publicUrl) return respuesta({ ok: false, error: "presign_incompleto" }, 502);
        return respuesta({ ok: true, via: "zernio", mime, uploadUrl: d.uploadUrl, publicUrl: d.publicUrl, expiresIn: d.expiresIn ?? null });
      }
      if (resultado.status !== 400) return respuesta({ ok: false, error: "zernio_presign_error", detalle: resultado.data }, resultado.status || 502);
      console.error("whatsapp-inbox-enviar: presign de Zernio rechazo", mime, "— se usa el bucket propio");
    }

    const path = `out/${crypto.randomUUID()}.${extensionParaMime(mime, filename)}`;
    const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data?.signedUrl) return respuesta({ ok: false, error: "storage_presign_error", detalle: error?.message ?? null }, 502);
    return respuesta({ ok: true, via: "supabase", mime, uploadUrl: data.signedUrl, publicUrl: `${ESQUEMA_MEDIA_LOCAL}${path}`, media_path: path, expiresIn: 7200 });
  }

  async function manejarEnvio(body: Body, acceso: Acceso): Promise<Respuesta> {
    const hiloId = body.hilo_id;
    const mensaje = String(body.mensaje || "").trim();
    const respondeAId = body.responde_a_id ? String(body.responde_a_id) : null;
    let attachmentUrl = body.attachment_url ? String(body.attachment_url) : null;
    const attachmentType = body.attachment_type || null;
    const attachmentName = body.attachment_name ? String(body.attachment_name).slice(0, 180) : null;
    const location = body.location || null;
    const contacts = Array.isArray(body.contacts) ? body.contacts : [];
    const reenviado = body.reenviado === true;
    const tieneContenido = !!mensaje || !!attachmentUrl || !!location || contacts.length > 0;
    if (!hiloId) return respuesta({ ok: false, error: "falta_hilo_id" }, 400);
    if (!tieneContenido) return respuesta({ ok: false, error: "mensaje_vacio" }, 400);

    if (attachmentUrl && !["image", "video", "audio", "file"].includes(String(attachmentType))) {
      return respuesta({ ok: false, error: "attachment_type_invalido" }, 400);
    }
    if (location && (!Number.isFinite(Number(location.latitude)) || !Number.isFinite(Number(location.longitude)))) {
      return respuesta({ ok: false, error: "ubicacion_invalida" }, 400);
    }
    if (contacts.some((c) => !c?.name?.formatted_name)) return respuesta({ ok: false, error: "contacto_invalido" }, 400);

    // Archivo alojado en nuestro bucket (presign vía supabase): Zernio recibe una URL firmada.
    let mediaPath: string | null = esRutaMediaLocal(body.media_path) ? body.media_path : null;
    if (attachmentUrl && attachmentUrl.startsWith(ESQUEMA_MEDIA_LOCAL)) {
      const path = attachmentUrl.slice(ESQUEMA_MEDIA_LOCAL.length);
      if (!esRutaMediaLocal(path)) return respuesta({ ok: false, error: "media_path_invalido" }, 400);
      mediaPath = path;
    }
    if (attachmentUrl && mediaPath && attachmentUrl.startsWith(ESQUEMA_MEDIA_LOCAL)) {
      const { data, error } = await db.storage.from(BUCKET).createSignedUrl(mediaPath, VIGENCIA_URL_FIRMADA_S);
      if (error || !data?.signedUrl) return respuesta({ ok: false, error: "archivo_no_encontrado", detalle: error?.message ?? null }, 400);
      attachmentUrl = data.signedUrl;
    }

    const { data: hilo, error: hiloError } = await db.from("whatsapp_hilos").select("id, telefono_e164, ultimo_inbound_at").eq("id", hiloId).maybeSingle();
    if (hiloError || !hilo) return respuesta({ ok: false, error: "hilo_no_encontrado" }, 404);

    let replyTo: string | null = null;
    if (respondeAId) {
      const { data: mensajeRespondido } = await db.from("whatsapp_hilo_mensajes")
        .select("id,wa_message_id").eq("id", respondeAId).eq("hilo_id", hiloId).maybeSingle();
      if (!mensajeRespondido) return respuesta({ ok: false, error: "responde_a_id_invalido" }, 400);
      replyTo = mensajeRespondido.wa_message_id || null;
    }

    if (!hilo.ultimo_inbound_at) return respuesta({ ok: false, error: "ventana_cerrada", mensaje: "Este hilo no tiene mensajes entrantes todavía." }, 409);
    const horasDesdeUltimoInbound = (ahora().getTime() - new Date(hilo.ultimo_inbound_at).getTime()) / 3600000;
    if (horasDesdeUltimoInbound > 24) return respuesta({ ok: false, error: "ventana_cerrada", mensaje: "Pasaron más de 24h desde el último mensaje del cliente." }, 409);

    const { data: config } = await db.from("whatsapp_config").select("zernio_account_id, activo").eq("activo", true).limit(1).maybeSingle();
    if (!config?.zernio_account_id) return respuesta({ ok: false, error: "sin_configurar" }, 500);
    const conversationId = hilo.telefono_e164.startsWith("bsid:") ? hilo.telefono_e164.slice(5) : hilo.telefono_e164;

    const payload: Record<string, unknown> = { accountId: config.zernio_account_id };
    if (mensaje) payload.message = mensaje;
    if (attachmentUrl) {
      payload.attachmentUrl = attachmentUrl;
      payload.attachmentType = attachmentType;
      if (attachmentType === "file" && attachmentName) payload.attachmentName = attachmentName;
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
    try {
      resultado = attachmentUrl && attachmentType === "audio" && body.voice_note
        ? await mandarNotaDeVoz(conversationId, payload, attachmentUrl, `nota-voz-${Date.now()}`)
        : await mandarConReintento(conversationId, payload);
    } catch (e) {
      console.error("whatsapp-inbox-enviar: fetch a Zernio fallo:", e instanceof Error ? e.message : String(e));
      if (esTimeout(e)) return respuesta({ ok: false, error: "zernio_timeout", mensaje: "Zernio no respondió a tiempo. No reintentes automáticamente." }, 504);
      return respuesta({ ok: false, error: "no_se_pudo_contactar_zernio" }, 502);
    }
    if (!resultado.ok) {
      console.error("whatsapp-inbox-enviar: Zernio respondio no-ok, status:", resultado.status, "data:", JSON.stringify(resultado.data));
      return respuesta({ ok: false, error: "zernio_error", detalle: resultado.data }, 502);
    }

    const ahoraIso = ahora().toISOString();
    const messageId = resultado.data?.data?.messageId ?? resultado.data?.messageId ?? null;

    // Siempre se guarda la fila local (también con adjunto): así el agente ve su envío al instante.
    // Para adjuntos subidos por presign de Zernio, media_path llega después: el webhook message.sent
    // encuentra la fila por wa_message_id, descarga el archivo y la completa.
    let tipoContenido = "text";
    let cuerpoLocal = mensaje;
    const meta: Record<string, unknown> = {};
    if (attachmentUrl) {
      tipoContenido = tipoContenidoDe(attachmentType);
      cuerpoLocal = mensaje || attachmentName || `[${tipoContenido}]`;
      const media = limpiar({
        mime: limpiarMime(body.attachment_mime) || (mediaPath ? inferirMime(mediaPath) : "") || undefined,
        nombre: attachmentName || undefined,
        tamano: Number(body.attachment_size) > 0 ? Math.round(Number(body.attachment_size)) : undefined,
      });
      if (Object.keys(media).length) meta.media = media;
    } else if (location) {
      tipoContenido = "ubicacion";
      const etiqueta = String(location.name || location.address || "Ubicación compartida");
      const lat = Number(location.latitude), lng = Number(location.longitude);
      cuerpoLocal = `${etiqueta} · ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      meta.ubicacion = limpiar({ lat, lng, nombre: location.name ? String(location.name).slice(0, 120) : undefined, direccion: location.address ? String(location.address).slice(0, 240) : undefined });
    } else if (contacts.length) {
      tipoContenido = "contacto";
      const c0 = contacts[0];
      const tel = c0?.phones?.[0]?.phone || c0?.phones?.[0]?.wa_id || "";
      cuerpoLocal = `Contacto · ${c0?.name?.formatted_name || "Contacto"}${tel ? ` · ${tel}` : ""}`;
      meta.contactos = contacts.slice(0, 5).map((c) => {
        const telefonos = (c.phones || []).map((p) => String(p?.phone || p?.wa_id || "").trim()).filter(Boolean);
        return telefonos.length ? { nombre: c.name.formatted_name, telefonos } : { nombre: c.name.formatted_name };
      });
    }

    const { data: mensajeInsertado, error: insertError } = await db.from("whatsapp_hilo_mensajes").insert({
      hilo_id: hiloId,
      direccion: "out",
      tipo_contenido: tipoContenido,
      cuerpo: cuerpoLocal || (tipoContenido === "text" ? "" : `[${tipoContenido}]`),
      media_path: mediaPath,
      wa_message_id: messageId,
      responde_a_id: respondeAId,
      estado: "enviado",
      enviado_por_agente_id: acceso.agenteId,
      reenviado,
      meta,
    }).select("*").single();
    if (insertError) {
      console.error("whatsapp-inbox-enviar: no se pudo guardar el mensaje:", insertError.message);
      return respuesta({ ok: false, error: "mensaje_enviado_no_guardado", messageId }, 500);
    }

    const preview = mensaje || (attachmentType === "image" ? "Imagen" : attachmentType === "video" ? "Video" : attachmentType === "audio" ? "Audio" : attachmentUrl ? (attachmentName || "Documento") : location ? "Ubicación" : contacts.length ? "Contacto" : "Mensaje");
    await db.from("whatsapp_hilos").update({
      ultimo_mensaje_at: ahoraIso,
      ultimo_mensaje_preview: preview.slice(0, 200),
      ultima_respuesta_humana_at: ahoraIso,
      updated_at: ahoraIso,
    }).eq("id", hiloId);

    return respuesta({ ok: true, messageId, mensaje: mensajeInsertado, espera_webhook: !!attachmentUrl && !mediaPath });
  }

  return { resolverAcceso, presign, manejarEnvio };
}
