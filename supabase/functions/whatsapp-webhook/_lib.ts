// Lógica del webhook de Zernio para NEXUS PRO, separada de Deno.serve para poder probarla con un
// cliente Supabase y un fetch simulados. index.ts solo arma dependencias, verifica la firma y despacha.

export type Db = {
  from(tabla: string): any;
  storage: { from(bucket: string): any };
};

export type ConfigWhatsapp = {
  zernio_account_id: string | null;
  whatsapp_numero: string | null;
  activo?: boolean;
} | null;

export type Deps = {
  db: Db;
  zernioApiKey?: string;
  fetchFn?: typeof fetch;
  ahora?: () => Date;
};

export type Descarga = { path: string; mime: string; tamano: number };

const ORDEN_ESTADO: Record<string, number> = { recibido: 0, enviando: 1, enviado: 2, entregado: 3, leido: 4, fallido: 5 };
const MAPA_EVENTO_ESTADO: Record<string, string> = {
  "message.delivered": "entregado",
  "message.read": "leido",
  "message.failed": "fallido",
};

export function esTelefono(v: unknown): v is string {
  return typeof v === "string" && /^\+?\d{7,15}$/.test(v);
}

// Misma regla que nxWa()/formatearTelefono en el resto de nexus-pro.
export function normalizarTelefono(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 10) return "1" + digits;
  return digits;
}

export function idMensaje(msg: any): string {
  return msg?.platformMessageId || msg?.id;
}

export function identificarContacto(payload: any): string | null {
  const conv = payload.conversation || {};
  const msg = payload.message || {};
  if (esTelefono(conv.participantId)) return normalizarTelefono(conv.participantId);
  if (esTelefono(conv.participantUsername)) return normalizarTelefono(conv.participantUsername);
  if (conv.contactId) return `bsid:${conv.contactId}`;
  const scoped = msg.direction === "incoming" ? msg.sender?.businessScopedUserId : null;
  if (scoped) return `bsid:${scoped}`;
  return null;
}

// El único filtro de "es esto mío" — todo evento de otra línea/negocio del mismo equipo de Zernio
// se descarta aquí, sin tocar la base de datos.
export function esNuestraCuenta(account: any, config: ConfigWhatsapp): boolean {
  if (!config?.zernio_account_id) return false;
  if (account?.id === config.zernio_account_id || account?.accountId === config.zernio_account_id) return true;
  if (account?.username && config.whatsapp_numero && normalizarTelefono(account.username) === normalizarTelefono(config.whatsapp_numero)) return true;
  return false;
}

export function estadoAvanza(actual: string | null | undefined, nuevo: string): boolean {
  return (ORDEN_ESTADO[nuevo] ?? -1) > (ORDEN_ESTADO[actual ?? ""] ?? -1);
}

export function tipoDeAdjunto(tipo: string | undefined): string {
  const t = (tipo || "").toLowerCase();
  if (t.includes("sticker")) return "sticker";
  if (t.includes("image")) return "imagen";
  if (t.includes("audio") || t.includes("voice")) return "audio";
  if (t.includes("video")) return "video";
  return "documento";
}

// Zernio declara type:'sticker' en el enum de adjuntos, pero no promete mimeType en WhatsApp; se
// acepta también image + image/webp (lo que Meta manda para stickers).
export function clasificarAdjunto(adjunto: any): string {
  const tipo = String(adjunto?.type || adjunto?.originalType || "").toLowerCase();
  const mime = String(adjunto?.mimeType || "").toLowerCase().split(";")[0].trim();
  if (tipo.includes("image") && mime === "image/webp") return "sticker";
  return tipoDeAdjunto(tipo || mime);
}

export function resolverUrlAdjunto(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://zernio.com${url.startsWith("/") ? "" : "/"}${url}`;
}

function limpiar<T extends Record<string, unknown>>(o: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== "") out[k] = v;
  return out as Partial<T>;
}

export function infoMedia(adjunto: any, descarga: Descarga | null): Record<string, unknown> {
  const p = adjunto?.payload || {};
  return limpiar({
    mime: String(adjunto?.mimeType || descarga?.mime || "").split(";")[0].trim() || undefined,
    nombre: adjunto?.fileName || adjunto?.filename || adjunto?.name || p.filename || p.fileName || p.name || undefined,
    tamano: Number(adjunto?.fileSize || adjunto?.size || p.fileSize || p.size || descarga?.tamano || 0) || undefined,
  });
}

export function construirUbicacion(loc: any): { meta: Record<string, unknown>; cuerpo: string } | null {
  const lat = Number(loc?.latitude), lng = Number(loc?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const nombre = loc?.name ? String(loc.name).slice(0, 120) : undefined;
  const direccion = loc?.address ? String(loc.address).slice(0, 240) : undefined;
  const etiqueta = nombre || direccion || "Ubicación compartida";
  return {
    meta: limpiar({ lat, lng, nombre, direccion }),
    cuerpo: `${etiqueta} · ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
  };
}

export function construirContactos(contacts: any): { meta: Array<Record<string, unknown>>; cuerpo: string } | null {
  if (!Array.isArray(contacts) || !contacts.length) return null;
  const lista = contacts.slice(0, 10).map((c: any) => {
    const n = c?.name || {};
    const nombre = String(n.formatted_name || [n.first_name, n.last_name].filter(Boolean).join(" ") || c?.formatted_name || "Contacto").slice(0, 120);
    const telefonos = (Array.isArray(c?.phones) ? c.phones : [])
      .map((p: any) => String(p?.phone || p?.wa_id || "").trim()).filter(Boolean).slice(0, 5);
    return telefonos.length ? { nombre, telefonos } : { nombre };
  });
  const c0 = lista[0];
  const tel = (c0 as any).telefonos?.[0] || "";
  const extra = lista.length > 1 ? ` (+${lista.length - 1})` : "";
  return { meta: lista, cuerpo: `Contacto · ${c0.nombre}${tel ? ` · ${tel}` : ""}${extra}` };
}

function claveIdentidad(v: unknown): string {
  if (typeof v !== "string") return "";
  const s = v.trim();
  if (!s) return "";
  return esTelefono(s) ? normalizarTelefono(s) : s;
}

// Zernio manda reaction.received también cuando el negocio reacciona desde la app nativa o vía
// API (sender = el propio negocio). Solo se concluye "eco propio" cuando hay algo comparable: el
// número de la línea, o teléfonos a ambos lados que no coinciden. En duda, es del cliente.
export function esEcoPropio(sender: any, conversation: any, numeroPropio: string | null | undefined): boolean {
  const sid = [sender?.id, sender?.phoneNumber, sender?.username].map(claveIdentidad).filter(Boolean);
  if (!sid.length) return false;
  const propio = claveIdentidad(numeroPropio || "");
  if (propio && sid.includes(propio)) return true;
  if (sender?.contactId && conversation?.contactId && sender.contactId === conversation.contactId) return false;
  const part = [conversation?.participantId, conversation?.participantUsername, conversation?.contactId].map(claveIdentidad).filter(Boolean);
  if (!part.length) return false;
  if (sid.some((s) => part.includes(s))) return false;
  const esDigitos = (s: string) => /^\d{7,15}$/.test(s);
  return sid.some(esDigitos) && part.some(esDigitos);
}

// Palabras que dan de baja / vuelven a dar de alta. Se exige que el mensaje COMPLETO sea la
// palabra (una vez normalizado: sin acentos, sin signos, en minúsculas) -- deliberadamente
// estricto. Buscar la palabra "suelta" dentro del texto daría de baja a quien escriba "no puedo
// pagar, dame de baja el mes que viene" o "quiero cancelar mi cita", que NO es lo que pidió.
const PALABRAS_BAJA = ["baja", "stop", "cancelar", "no molestar", "unsubscribe", "salir", "eliminar", "borrar"];
const PALABRAS_ALTA = ["alta", "start", "suscribir", "suscribirme"];

export function normalizarTextoClave(s: string): string {
  return String(s || "")
    .normalize("NFD").replace(/[^ -~]/g, "")  // quita acentos y cualquier no-ASCII
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .trim().replace(/\s+/g, " ");
}

function fechaEvento(payload: any, ahora: () => Date): string {
  const t = payload?.timestamp;
  const d = t ? new Date(t) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : ahora().toISOString();
}

export function crearWebhook(deps: Deps) {
  const db = deps.db;
  const fetchFn = deps.fetchFn ?? fetch;
  const ahora = deps.ahora ?? (() => new Date());
  const zernioApiKey = deps.zernioApiKey ?? "";

  async function buscarConfig(): Promise<ConfigWhatsapp> {
    const { data } = await db.from("whatsapp_config").select("zernio_account_id, whatsapp_numero, activo").eq("activo", true).limit(1).maybeSingle();
    return data ?? null;
  }

  async function buscarClientePorTelefono(telefonoE164: string): Promise<string | null> {
    if (telefonoE164.startsWith("bsid:")) return null;
    const digitos = telefonoE164.replace(/\D/g, "");
    const { data } = await db.from("clientes").select("id, wa").not("wa", "is", null);
    const matches = (data ?? []).filter((c: any) => normalizarTelefono(String(c.wa)) === digitos);
    if (matches.length === 1) return matches[0].id ?? null;
    if (matches.length > 1) console.error("Telefono duplicado en clientes; requiere vinculacion manual:", telefonoE164);
    return null;
  }

  async function guardarAdjunto(urlCruda: string, categoria: string): Promise<Descarga | null> {
    try {
      const url = resolverUrlAdjunto(urlCruda);
      const headers: Record<string, string> = {};
      if (zernioApiKey) headers["Authorization"] = `Bearer ${zernioApiKey}`;
      const r = await fetchFn(url, { headers });
      if (!r.ok) {
        console.error("descarga de adjunto fallo, status:", r.status, "url:", url);
        return null;
      }
      const buf = await r.arrayBuffer();
      const contentType = (r.headers.get("content-type") || "application/octet-stream").split(";")[0].trim();
      const ext = contentType.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "bin";
      const path = `${categoria}/${crypto.randomUUID()}.${ext}`;
      const { error } = await db.storage.from("whatsapp-inbox-media").upload(path, buf, { contentType, upsert: false });
      if (error) {
        console.error("subir adjunto a storage error:", error.message);
        return null;
      }
      return { path, mime: contentType, tamano: buf.byteLength };
    } catch (e) {
      console.error("guardarAdjunto error:", e instanceof Error ? e.message : String(e));
      return null;
    }
  }

  async function buscarMensajeLocalPorWaId(waId: string): Promise<any | null> {
    const { data } = await db.from("whatsapp_hilo_mensajes").select("id, media_path, meta, estado, tipo_contenido").eq("wa_message_id", waId).maybeSingle();
    return data ?? null;
  }

  async function resolverCita(metadata: any): Promise<string | null> {
    // Zernio: quotedMessage.platformMessageId es el id TAL COMO se guardó (message.sent);
    // quotedMessageId es el context.id crudo de Meta y puede diferir por perspectiva.
    const candidatos = [metadata?.quotedMessage?.platformMessageId, metadata?.quotedMessageId]
      .filter((v, i, arr) => typeof v === "string" && v && arr.indexOf(v) === i) as string[];
    for (const waId of candidatos) {
      const fila = await buscarMensajeLocalPorWaId(waId);
      if (fila?.id) return fila.id;
    }
    return null;
  }

  async function aplicarPalabraClaveOptout(clienteId: string, texto: string) {
    const t = normalizarTextoClave(texto);
    if (!t) return;
    try {
      if (PALABRAS_BAJA.includes(t)) {
        // .is(...) para NO pisar la fecha original si ya estaba de baja: ante un reclamo hay que
        // poder decir desde cuándo se respetó, no desde el último "STOP" que mandó.
        const { error } = await db.from("clientes")
          .update({ whatsapp_optout_en: ahora().toISOString(), whatsapp_optout_origen: "cliente" })
          .eq("id", clienteId).is("whatsapp_optout_en", null);
        if (error) console.error("optout: no se pudo marcar la baja:", error.message);
        else console.log("optout: cliente", clienteId, "pidio la baja por WhatsApp");
      } else if (PALABRAS_ALTA.includes(t)) {
        const { error } = await db.from("clientes")
          .update({ whatsapp_optout_en: null, whatsapp_optout_origen: null })
          .eq("id", clienteId).not("whatsapp_optout_en", "is", null);
        if (error) console.error("optout: no se pudo quitar la baja:", error.message);
        else console.log("optout: cliente", clienteId, "volvio a darse de alta por WhatsApp");
      }
    } catch (e) {
      // Nunca romper el guardado del mensaje por esto -- el mensaje del cliente vale más que la marca.
      console.error("optout: excepcion:", e instanceof Error ? e.message : String(e));
    }
  }

  // Fila que ya existía con ese wa_message_id: o un adjunto optimista insertado por
  // whatsapp-inbox-enviar (sin media_path) o un reintento de Zernio. Se completa lo que falte y
  // no se tocan contadores del hilo (enviar ya los actualizó).
  async function completarMensajeExistente(existente: any, msg: any, esEntrante: boolean) {
    const cambios: Record<string, unknown> = {};
    const adjuntos = Array.isArray(msg.attachments) ? msg.attachments : [];
    const primero = adjuntos[0];
    let descarga: Descarga | null = null;
    if (primero?.url && !existente.media_path) {
      descarga = await guardarAdjunto(primero.url, existente.tipo_contenido || clasificarAdjunto(primero));
      if (descarga) cambios.media_path = descarga.path;
    }
    if (primero) {
      const media = infoMedia(primero, descarga);
      const metaActual = (existente.meta && typeof existente.meta === "object") ? existente.meta : {};
      const mediaActual = (metaActual.media && typeof metaActual.media === "object") ? metaActual.media : {};
      const mediaNueva = { ...media, ...mediaActual };
      if (JSON.stringify(mediaNueva) !== JSON.stringify(mediaActual)) cambios.meta = { ...metaActual, media: mediaNueva };
    }
    if (!esEntrante && estadoAvanza(existente.estado, "enviado")) cambios.estado = "enviado";
    if (!Object.keys(cambios).length) return;
    const { error } = await db.from("whatsapp_hilo_mensajes").update(cambios).eq("id", existente.id);
    if (error) console.error("completar mensaje existente error:", error.message);
  }

  async function procesarMensaje(payload: any) {
    const msg = payload.message || {};
    const telefonoE164 = identificarContacto(payload);
    if (!telefonoE164) {
      console.error("Mensaje sin telefono ni id de contacto identificable, se descarta");
      return;
    }

    const esEntrante = msg.direction === "incoming";
    const waMessageId = idMensaje(msg);
    if (waMessageId) {
      const existente = await buscarMensajeLocalPorWaId(waMessageId);
      if (existente) {
        await completarMensajeExistente(existente, msg, esEntrante);
        return;
      }
    }

    const nombrePerfil = esEntrante ? (msg.sender?.name || null) : null;
    const ahoraIso = ahora().toISOString();
    const metadata = payload.metadata || {};

    let tipoContenido = "text";
    let mediaPath: string | null = null;
    const meta: Record<string, unknown> = {};
    const textoCrudo = typeof msg.text === "string" ? msg.text.trim() : "";
    let cuerpo = "";

    const ubicacion = construirUbicacion(metadata.location);
    const contactos = construirContactos(metadata.contacts);
    const adjuntos = Array.isArray(msg.attachments) ? msg.attachments : [];

    if (ubicacion) {
      tipoContenido = "ubicacion";
      meta.ubicacion = ubicacion.meta;
      cuerpo = ubicacion.cuerpo;
    } else if (contactos) {
      tipoContenido = "contacto";
      meta.contactos = contactos.meta;
      cuerpo = contactos.cuerpo;
    } else if (adjuntos.length > 0) {
      const primero = adjuntos[0];
      tipoContenido = clasificarAdjunto(primero);
      let descarga: Descarga | null = null;
      if (primero.url) {
        descarga = await guardarAdjunto(primero.url, tipoContenido);
        mediaPath = descarga?.path ?? null;
      }
      const media = infoMedia(primero, descarga);
      if (Object.keys(media).length) meta.media = media;
      if (adjuntos.length > 1) {
        // WhatsApp manda un solo adjunto por mensaje; se conservan los demás por si Zernio agrupa.
        const extra: Array<Record<string, unknown>> = [];
        for (const a of adjuntos.slice(1, 6)) {
          const d = a?.url ? await guardarAdjunto(a.url, clasificarAdjunto(a)) : null;
          extra.push(limpiar({ path: d?.path, url: a?.url, ...infoMedia(a, d) }));
        }
        meta.adjuntos_extra = extra;
      }
    }
    if (!cuerpo) {
      cuerpo = textoCrudo === "[Unsupported message]"
        ? "[Contenido de WhatsApp no visible]"
        : (textoCrudo || (tipoContenido !== "text" ? `[${tipoContenido}]` : ""));
    }

    const respondeAId = await resolverCita(metadata);

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
        ultimo_mensaje_at: ahoraIso,
        ultimo_mensaje_preview: cuerpo.slice(0, 200),
        cliente_id: clienteId ?? undefined,
        updated_at: ahoraIso,
      };
      if (esEntrante) {
        actualizacion.ultimo_inbound_at = ahoraIso;
        actualizacion.no_leidos_count = (hiloExistente.no_leidos_count ?? 0) + 1;
      } else {
        actualizacion.ultima_respuesta_humana_at = ahoraIso;
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
          ultimo_mensaje_at: ahoraIso,
          ultimo_inbound_at: esEntrante ? ahoraIso : null,
          ultima_respuesta_humana_at: esEntrante ? null : ahoraIso,
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

    // Opt-out por palabra clave: si el cliente contesta "BAJA"/"STOP", el sistema deja de mandarle
    // mensajes iniciados por el negocio. Es requisito de la política de WhatsApp Business.
    if (esEntrante && clienteId && tipoContenido === "text") {
      await aplicarPalabraClaveOptout(clienteId, textoCrudo);
    }

    // Solo imágenes reales entran a la cola de bauches; un sticker no es un comprobante.
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
          wa_message_id: waMessageId,
          responde_a_id: respondeAId,
          estado: esEntrante ? "recibido" : "enviado",
          revision_pago_estado: revisionPagoEstado,
          meta,
        },
        { onConflict: "wa_message_id", ignoreDuplicates: true }
      );
    if (msgError) console.error("insertar mensaje error:", msgError.message);
  }

  async function procesarEstadoMensaje(payload: any, evento: string) {
    const estado = MAPA_EVENTO_ESTADO[evento];
    if (!estado) return;
    const idBuscado = idMensaje(payload.message || {});
    if (!idBuscado) return;
    // Sin filtro por accountId aquí a propósito: un wa_message_id de otra línea simplemente no
    // existe en esta tabla.
    const { data: fila } = await db.from("whatsapp_hilo_mensajes")
      .select("id, estado, entregado_at, leido_at").eq("wa_message_id", idBuscado).maybeSingle();
    if (!fila) {
      console.error("actualizar estado: no se encontro mensaje con wa_message_id =", idBuscado);
      return;
    }
    const ts = fechaEvento(payload, ahora);
    const cambios: Record<string, unknown> = {};
    if (estado === "entregado" && !fila.entregado_at) cambios.entregado_at = ts;
    if (estado === "leido") {
      if (!fila.leido_at) cambios.leido_at = ts;
      if (!fila.entregado_at) cambios.entregado_at = ts;
    }
    if (estado === "fallido") cambios.error_detalle = payload.error ? JSON.stringify(payload.error).slice(0, 500) : null;
    // Nunca retroceder: un delivered que llega después del read no vuelve a "entregado".
    if (estadoAvanza(fila.estado, estado)) cambios.estado = estado;
    if (!Object.keys(cambios).length) return;
    const { error } = await db.from("whatsapp_hilo_mensajes").update(cambios).eq("id", fila.id);
    if (error) console.error("actualizar estado error:", error.message);
  }

  async function procesarReaccion(payload: any, config: ConfigWhatsapp) {
    const r = payload.reaction || {};
    const waId: string | null = r.platformMessageId || r.messageId || null;
    if (!waId) return;
    if (esEcoPropio(r.sender, payload.conversation, config?.whatsapp_numero)) return;
    const emoji = r.action === "removed" ? null : (String(r.emoji || "").trim().slice(0, 16) || null);
    const { error, count } = await db.from("whatsapp_hilo_mensajes")
      .update({ reaccion_cliente: emoji }, { count: "exact" })
      .eq("wa_message_id", waId);
    if (error) console.error("reaccion cliente error:", error.message);
    else if (!count) console.error("reaccion cliente: no se encontro mensaje con wa_message_id =", waId);
  }

  async function manejarEvento(payload: any, config: ConfigWhatsapp) {
    const evento = payload.event as string;
    if (evento === "message.received" || evento === "message.sent") {
      await procesarMensaje(payload);
    } else if (evento in MAPA_EVENTO_ESTADO) {
      await procesarEstadoMensaje(payload, evento);
    } else if (evento === "reaction.received") {
      await procesarReaccion(payload, config);
    } else {
      console.error("Evento no manejado:", evento);
    }
  }

  return { buscarConfig, procesarMensaje, procesarEstadoMensaje, procesarReaccion, manejarEvento, guardarAdjunto };
}

export async function verificarFirma(rawBody: string, signatureHeader: string | null, secreto: string): Promise<boolean> {
  if (!secreto) {
    console.error("ZERNIO_WEBHOOK_SECRET no configurado — rechazando por seguridad");
    return false;
  }
  if (!signatureHeader) return false;
  const recibida = signatureHeader.startsWith("sha256=") ? signatureHeader.slice(7) : signatureHeader;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const calculada = Array.from(new Uint8Array(sigBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (calculada.length !== recibida.length) return false;
  let diff = 0;
  for (let i = 0; i < calculada.length; i++) diff |= calculada.charCodeAt(i) ^ recibida.charCodeAt(i);
  if (diff !== 0) console.error("Firma HMAC no coincide");
  return diff === 0;
}
