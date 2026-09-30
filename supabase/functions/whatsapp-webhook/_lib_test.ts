import { assert, assertEquals, assertMatch } from "jsr:@std/assert@1";
import { crearFakeDb, crearFakeFetch, filtro, respuestaJson, todas, ultima, type Llamada } from "../_shared/pruebas/fake_db.ts";
import { clasificarAdjunto, construirContactos, construirUbicacion, crearWebhook, esEcoPropio, esNuestraCuenta, estadoAvanza, verificarFirma } from "./_lib.ts";

const CONFIG = { zernio_account_id: "acc_1", whatsapp_numero: "18095550000", activo: true };
const CUENTA = { id: "acc_1", accountId: "acc_1", platform: "whatsapp", username: "18095550000" };
const HILO = { id: "hilo-1", cliente_id: "cli-1", no_leidos_count: 2, nombre_perfil: "Juan" };

type Estado = { mensajes: Record<string, any>; hilo?: any };

function armar(estado: Estado, rutas: Parameters<typeof crearFakeFetch>[0] = []) {
  const { db, llamadas, storage } = crearFakeDb((l: Llamada) => {
    if (l.tabla === "whatsapp_config") return { data: CONFIG };
    if (l.tabla === "whatsapp_hilo_mensajes" && l.op === "select") {
      const wa = filtro(l, "eq", "wa_message_id")?.[1] as string | undefined;
      return { data: wa ? (estado.mensajes[wa] ?? null) : null };
    }
    if (l.tabla === "whatsapp_hilo_mensajes" && l.op === "update") {
      const wa = filtro(l, "eq", "wa_message_id")?.[1] as string | undefined;
      return { count: wa ? (estado.mensajes[wa] ? 1 : 0) : 1 };
    }
    if (l.tabla === "whatsapp_hilos" && l.op === "select") return { data: estado.hilo ?? null };
    if (l.tabla === "whatsapp_hilos" && l.op === "insert") return { data: { id: "hilo-nuevo" } };
    if (l.tabla === "clientes") return { data: [] };
    return {};
  });
  const { fetchFn, peticiones } = crearFakeFetch(rutas);
  const wh = crearWebhook({ db, fetchFn, zernioApiKey: "k", ahora: () => new Date("2026-09-30T12:00:00Z") });
  return { wh, llamadas, storage, peticiones };
}

function evento(event: string, extra: Record<string, unknown>) {
  return { id: "evt-1", event, account: CUENTA, timestamp: "2026-09-30T12:00:05Z", conversation: { id: "c1", platformConversationId: "18095551234", participantId: "18095551234" }, ...extra };
}

function mensajeEntrante(extra: Record<string, unknown> = {}, metadata: Record<string, unknown> | null = null) {
  return evento("message.received", {
    message: { id: "z1", platformMessageId: "wamid.IN1", direction: "incoming", text: null, attachments: [], sender: { id: "18095551234", name: "Juan" }, ...extra },
    metadata,
  });
}

const rutaMedia = (mime: string, bytes = 3) => ({
  url: "/whatsapp/media/",
  responder: () => new Response(new Uint8Array(bytes), { status: 200, headers: { "content-type": mime } }),
});

Deno.test("esNuestraCuenta filtra por accountId o número", () => {
  assert(esNuestraCuenta(CUENTA, CONFIG));
  assert(esNuestraCuenta({ username: "+1 (809) 555-0000" }, CONFIG));
  assert(!esNuestraCuenta({ id: "otra" }, CONFIG));
  assert(!esNuestraCuenta(CUENTA, null));
});

Deno.test("estadoAvanza nunca retrocede", () => {
  assert(estadoAvanza("enviado", "entregado"));
  assert(estadoAvanza("entregado", "leido"));
  assert(!estadoAvanza("leido", "entregado"));
  assert(!estadoAvanza("enviado", "enviado"));
  assert(estadoAvanza(null, "enviado"));
});

Deno.test("clasificarAdjunto: sticker por type o por image/webp", () => {
  assertEquals(clasificarAdjunto({ type: "sticker" }), "sticker");
  assertEquals(clasificarAdjunto({ type: "image", mimeType: "image/webp" }), "sticker");
  assertEquals(clasificarAdjunto({ type: "image", mimeType: "image/jpeg" }), "imagen");
  assertEquals(clasificarAdjunto({ type: "audio" }), "audio");
  assertEquals(clasificarAdjunto({ type: "file", mimeType: "application/pdf" }), "documento");
});

Deno.test("construirUbicacion y construirContactos", () => {
  const u = construirUbicacion({ latitude: 18.47, longitude: -69.9, name: "Oficina" })!;
  assertEquals(u.meta, { lat: 18.47, lng: -69.9, nombre: "Oficina" });
  assertEquals(u.cuerpo, "Oficina · 18.470000, -69.900000");
  assertEquals(construirUbicacion({ latitude: "x" }), null);
  const c = construirContactos([{ name: { formatted_name: "Juan Pérez" }, phones: [{ phone: "+1 809-555-1234", wa_id: "18095551234" }] }, { name: { first_name: "Ana" } }])!;
  assertEquals(c.meta, [{ nombre: "Juan Pérez", telefonos: ["+1 809-555-1234"] }, { nombre: "Ana" }]);
  assertEquals(c.cuerpo, "Contacto · Juan Pérez · +1 809-555-1234 (+1)");
  assertEquals(construirContactos([]), null);
});

Deno.test("esEcoPropio: sólo cuando el remitente es el negocio", () => {
  const conv = { participantId: "18095551234", contactId: "ct1" };
  assert(!esEcoPropio({ id: "18095551234" }, conv, "18095550000"));
  assert(esEcoPropio({ id: "18095550000" }, conv, "18095550000"));
  assert(esEcoPropio({ id: "18095559999" }, conv, null));
  assert(!esEcoPropio({ id: "bsuid_abc" }, conv, null));
  assert(!esEcoPropio({ id: "bsuid_abc", contactId: "ct1" }, conv, "18095550000"));
  assert(!esEcoPropio({}, conv, "18095550000"));
});

Deno.test("verificarFirma acepta hex minúsculas y prefijo sha256=", async () => {
  const cuerpo = '{"a":1}';
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode("s3cr3t"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(cuerpo)))).map((b) => b.toString(16).padStart(2, "0")).join("");
  assert(await verificarFirma(cuerpo, sig, "s3cr3t"));
  assert(await verificarFirma(cuerpo, `sha256=${sig}`, "s3cr3t"));
  assert(!(await verificarFirma(cuerpo, sig, "otro")));
  assert(!(await verificarFirma(cuerpo, null, "s3cr3t")));
  assert(!(await verificarFirma(cuerpo, sig, "")));
});

Deno.test("reaction.received añade reaccion_cliente al mensaje reaccionado", async () => {
  const { wh, llamadas } = armar({ mensajes: { "wamid.OUT1": { id: "m1" } } });
  await wh.manejarEvento(evento("reaction.received", {
    reaction: { emoji: "👍", action: "added", platformMessageId: "wamid.OUT1", sender: { id: "18095551234" }, reactedAt: "2026-09-30T12:00:00Z" },
  }), CONFIG);
  const u = ultima(llamadas, "whatsapp_hilo_mensajes", "update")!;
  assertEquals(u.datos, { reaccion_cliente: "👍" });
  assertEquals(filtro(u, "eq", "wa_message_id"), ["wa_message_id", "wamid.OUT1"]);
});

Deno.test("reaction.received removed o emoji vacío la quita; eco propio se ignora", async () => {
  const { wh, llamadas } = armar({ mensajes: { "wamid.OUT1": { id: "m1" } } });
  await wh.manejarEvento(evento("reaction.received", {
    reaction: { emoji: "", action: "removed", platformMessageId: "wamid.OUT1", sender: { id: "18095551234" } },
  }), CONFIG);
  assertEquals(ultima(llamadas, "whatsapp_hilo_mensajes", "update")!.datos, { reaccion_cliente: null });
  const antes = llamadas.length;
  await wh.manejarEvento(evento("reaction.received", {
    reaction: { emoji: "❤️", action: "added", platformMessageId: "wamid.OUT1", sender: { id: "18095550000" } },
  }), CONFIG);
  assertEquals(llamadas.length, antes, "un eco de nuestra propia reacción no debe tocar la base");
});

Deno.test("ubicación entrante → tipo ubicacion con meta.ubicacion", async () => {
  const { wh, llamadas } = armar({ mensajes: {}, hilo: HILO });
  await wh.manejarEvento(mensajeEntrante({ text: "📍 Plaza X" }, { location: { latitude: 18.47, longitude: -69.9, name: "Plaza X", address: "Av. 1" } }), CONFIG);
  const up = ultima(llamadas, "whatsapp_hilo_mensajes", "upsert")!;
  assertEquals(up.datos.tipo_contenido, "ubicacion");
  assertEquals(up.datos.meta.ubicacion, { lat: 18.47, lng: -69.9, nombre: "Plaza X", direccion: "Av. 1" });
  assertEquals(up.datos.cuerpo, "Plaza X · 18.470000, -69.900000");
  assertEquals(up.datos.revision_pago_estado, "ninguna");
  assertEquals(up.opciones, { onConflict: "wa_message_id", ignoreDuplicates: true });
  const hilo = ultima(llamadas, "whatsapp_hilos", "update")!;
  assertEquals(hilo.datos.no_leidos_count, 3);
  assertEquals(hilo.datos.ultimo_mensaje_preview, "Plaza X · 18.470000, -69.900000");
});

Deno.test("contactos entrantes → tipo contacto con meta.contactos", async () => {
  const { wh, llamadas } = armar({ mensajes: {}, hilo: HILO });
  await wh.manejarEvento(mensajeEntrante({ text: "👤 Juan" }, { contacts: [{ name: { formatted_name: "Juan Pérez" }, phones: [{ phone: "+18095551234" }] }], contactsOrigin: "other" }), CONFIG);
  const up = ultima(llamadas, "whatsapp_hilo_mensajes", "upsert")!;
  assertEquals(up.datos.tipo_contenido, "contacto");
  assertEquals(up.datos.meta.contactos, [{ nombre: "Juan Pérez", telefonos: ["+18095551234"] }]);
  assertEquals(up.datos.cuerpo, "Contacto · Juan Pérez · +18095551234");
});

Deno.test("sticker entrante → tipo sticker, sin revisión de pago, guardado en storage", async () => {
  const { wh, llamadas, storage } = armar({ mensajes: {}, hilo: HILO }, [rutaMedia("image/webp", 10)]);
  await wh.manejarEvento(mensajeEntrante({ attachments: [{ type: "sticker", url: "/v1/whatsapp/media/abc", mimeType: "image/webp" }] }), CONFIG);
  const up = ultima(llamadas, "whatsapp_hilo_mensajes", "upsert")!;
  assertEquals(up.datos.tipo_contenido, "sticker");
  assertEquals(up.datos.revision_pago_estado, "ninguna");
  assertEquals(up.datos.cuerpo, "[sticker]");
  assertMatch(up.datos.media_path, /^sticker\/.+\.webp$/);
  assertEquals(up.datos.meta.media, { mime: "image/webp", tamano: 10 });
  assertEquals(storage[0].op, "upload");
});

Deno.test("imagen entrante sigue entrando a revisión de pago y lleva meta.media", async () => {
  const { wh, llamadas, peticiones } = armar({ mensajes: {}, hilo: HILO }, [rutaMedia("image/jpeg", 2048)]);
  await wh.manejarEvento(mensajeEntrante({ text: "mi pago", attachments: [{ type: "image", url: "/v1/whatsapp/media/abc", payload: { id: "media1" } }] }), CONFIG);
  const up = ultima(llamadas, "whatsapp_hilo_mensajes", "upsert")!;
  assertEquals(up.datos.tipo_contenido, "imagen");
  assertEquals(up.datos.revision_pago_estado, "pendiente");
  assertEquals(up.datos.cuerpo, "mi pago");
  assertEquals(up.datos.meta.media, { mime: "image/jpeg", tamano: 2048 });
  assertEquals(peticiones[0].headers.authorization, "Bearer k");
});

Deno.test("cita: prefiere metadata.quotedMessage.platformMessageId y cae a quotedMessageId", async () => {
  const { wh, llamadas } = armar({ mensajes: { "wamid.GUARDADO": { id: "m-guardado" } }, hilo: HILO });
  await wh.manejarEvento(mensajeEntrante({ text: "ok" }, { quotedMessageId: "wamid.CRUDO", quotedMessage: { messageId: "z", platformMessageId: "wamid.GUARDADO" } }), CONFIG);
  assertEquals(ultima(llamadas, "whatsapp_hilo_mensajes", "upsert")!.datos.responde_a_id, "m-guardado");
  const { wh: wh2, llamadas: ll2 } = armar({ mensajes: { "wamid.CRUDO": { id: "m-crudo" } }, hilo: HILO });
  await wh2.manejarEvento(mensajeEntrante({ text: "ok" }, { quotedMessageId: "wamid.CRUDO", quotedMessage: { platformMessageId: "wamid.NOEXISTE" } }), CONFIG);
  assertEquals(ultima(ll2, "whatsapp_hilo_mensajes", "upsert")!.datos.responde_a_id, "m-crudo");
});

Deno.test("delivered/read escriben entregado_at/leido_at y no retroceden el estado", async () => {
  const estado: Estado = { mensajes: { "wamid.OUT1": { id: "m1", estado: "enviado", entregado_at: null, leido_at: null } } };
  const { wh, llamadas } = armar(estado);
  await wh.manejarEvento(evento("message.delivered", { message: { platformMessageId: "wamid.OUT1" } }), CONFIG);
  let u = ultima(llamadas, "whatsapp_hilo_mensajes", "update")!;
  assertEquals(u.datos, { entregado_at: "2026-09-30T12:00:05.000Z", estado: "entregado" });
  assertEquals(filtro(u, "eq", "id"), ["id", "m1"]);

  estado.mensajes["wamid.OUT1"] = { id: "m1", estado: "leido", entregado_at: "2026-09-30T11:59:00.000Z", leido_at: "2026-09-30T11:59:30.000Z" };
  const antes = llamadas.length;
  await wh.manejarEvento(evento("message.delivered", { message: { platformMessageId: "wamid.OUT1" } }), CONFIG);
  assertEquals(todas(llamadas, "whatsapp_hilo_mensajes", "update").length, todas(llamadas.slice(0, antes), "whatsapp_hilo_mensajes", "update").length, "un delivered tardío no debe escribir nada");

  estado.mensajes["wamid.OUT1"] = { id: "m1", estado: "enviado", entregado_at: null, leido_at: null };
  await wh.manejarEvento(evento("message.read", { message: { platformMessageId: "wamid.OUT1" } }), CONFIG);
  u = ultima(llamadas, "whatsapp_hilo_mensajes", "update")!;
  assertEquals(u.datos, { leido_at: "2026-09-30T12:00:05.000Z", entregado_at: "2026-09-30T12:00:05.000Z", estado: "leido" });
});

Deno.test("message.failed guarda error_detalle", async () => {
  const { wh, llamadas } = armar({ mensajes: { "wamid.OUT1": { id: "m1", estado: "enviado" } } });
  await wh.manejarEvento(evento("message.failed", { message: { platformMessageId: "wamid.OUT1" }, error: { code: 131056, title: "rate" } }), CONFIG);
  const u = ultima(llamadas, "whatsapp_hilo_mensajes", "update")!;
  assertEquals(u.datos.estado, "fallido");
  assertEquals(u.datos.error_detalle, JSON.stringify({ code: 131056, title: "rate" }));
});

Deno.test("adjunto optimista (fila local sin media_path) se completa en vez de ignorarse", async () => {
  const estado: Estado = {
    mensajes: { "wamid.OUT9": { id: "m9", media_path: null, estado: "enviado", tipo_contenido: "documento", meta: { media: { nombre: "informe.pdf", tamano: 500 } } } },
    hilo: HILO,
  };
  const { wh, llamadas } = armar(estado, [rutaMedia("application/pdf", 500)]);
  await wh.manejarEvento(evento("message.sent", {
    message: { platformMessageId: "wamid.OUT9", direction: "outgoing", text: null, attachments: [{ type: "file", url: "/v1/whatsapp/media/doc1" }] },
  }), CONFIG);
  const u = ultima(llamadas, "whatsapp_hilo_mensajes", "update")!;
  assertMatch(u.datos.media_path, /^documento\/.+\.pdf$/);
  assertEquals(u.datos.meta, { media: { mime: "application/pdf", nombre: "informe.pdf", tamano: 500 } });
  assertEquals(u.datos.estado, undefined, "ya estaba en enviado");
  assertEquals(todas(llamadas, "whatsapp_hilos", "update").length, 0, "no debe volver a tocar contadores del hilo");
  assertEquals(todas(llamadas, "whatsapp_hilo_mensajes", "upsert").length, 0);

  // reintento de Zernio con la fila ya completa: no descarga ni escribe
  estado.mensajes["wamid.OUT9"] = { id: "m9", media_path: "documento/x.pdf", estado: "enviado", tipo_contenido: "documento", meta: { media: { mime: "application/pdf", nombre: "informe.pdf", tamano: 500 } } };
  const antes = llamadas.length;
  await wh.manejarEvento(evento("message.sent", {
    message: { platformMessageId: "wamid.OUT9", direction: "outgoing", attachments: [{ type: "file", url: "/v1/whatsapp/media/doc1" }] },
  }), CONFIG);
  assertEquals(llamadas.slice(antes).filter((l) => l.op !== "select").length, 0);
});

Deno.test("texto entrante nuevo crea hilo y aplica opt-out por palabra exacta", async () => {
  const { db, llamadas } = crearFakeDb((l) => {
    if (l.tabla === "whatsapp_hilo_mensajes" && l.op === "select") return { data: null };
    if (l.tabla === "whatsapp_hilos" && l.op === "select") return { data: null };
    if (l.tabla === "whatsapp_hilos" && l.op === "insert") return { data: { id: "hilo-nuevo" } };
    if (l.tabla === "clientes" && l.op === "select") return { data: [{ id: "cli-9", wa: "809-555-1234" }] };
    return {};
  });
  const wh = crearWebhook({ db, fetchFn: crearFakeFetch([]).fetchFn });
  await wh.manejarEvento(mensajeEntrante({ text: "BAJA." }), CONFIG);
  const ins = ultima(llamadas, "whatsapp_hilos", "insert")!;
  assertEquals(ins.datos.cliente_id, "cli-9");
  assertEquals(ins.datos.no_leidos_count, 1);
  const opt = ultima(llamadas, "clientes", "update")!;
  assertEquals(opt.datos.whatsapp_optout_origen, "cliente");
  const up = ultima(llamadas, "whatsapp_hilo_mensajes", "upsert")!;
  assertEquals(up.datos.hilo_id, "hilo-nuevo");
  assertEquals(up.datos.tipo_contenido, "text");
  assertEquals(up.datos.meta, {});
});

Deno.test("evento desconocido no toca la base", async () => {
  const { wh, llamadas } = armar({ mensajes: {} });
  await wh.manejarEvento(evento("conversation.started", {}), CONFIG);
  assertEquals(llamadas.length, 0);
});

Deno.test("respuesta interactiva se guarda como texto", async () => {
  const { wh, llamadas } = armar({ mensajes: {}, hilo: HILO });
  await wh.manejarEvento(mensajeEntrante({ text: "Sí" }, { interactiveType: "button_reply", interactiveId: "pago_si" }), CONFIG);
  const up = ultima(llamadas, "whatsapp_hilo_mensajes", "upsert")!;
  assertEquals(up.datos.tipo_contenido, "text");
  assertEquals(up.datos.cuerpo, "Sí");
});

Deno.test("respuestaJson helper", async () => {
  assertEquals((await respuestaJson({ a: 1 }).json()).a, 1);
});
