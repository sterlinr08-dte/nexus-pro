import { assert, assertEquals, assertMatch } from "jsr:@std/assert@1";
import { crearFakeDb, crearFakeFetch, filtro, respuestaJson, todas, ultima, type Llamada, type Ruta } from "../_shared/pruebas/fake_db.ts";
import { crearEnviador, esRutaMediaLocal, extensionParaMime, inferirMime } from "./_lib.ts";

const AHORA = new Date("2026-09-30T12:00:00Z");
const ACCESO = { autorizado: true, agenteId: "ag-1" };
const HILO = { id: "hilo-1", telefono_e164: "18095551234", ultimo_inbound_at: "2026-09-30T10:00:00Z" };

function armar(rutas: Ruta[] = [], opts: { hilo?: any; insertError?: boolean } = {}) {
  const { db, llamadas, storage } = crearFakeDb((l: Llamada) => {
    if (l.tabla === "whatsapp_config") return { data: { zernio_account_id: "acc_1", activo: true } };
    if (l.tabla === "whatsapp_hilos" && l.op === "select") return { data: opts.hilo === undefined ? HILO : opts.hilo };
    if (l.tabla === "whatsapp_hilo_mensajes" && l.op === "select") return { data: { id: "m-cit", wa_message_id: "wamid.CIT" } };
    if (l.tabla === "whatsapp_hilo_mensajes" && l.op === "insert") {
      if (opts.insertError) return { error: { message: "boom" } };
      return { data: { id: "m-nuevo", ...l.datos, created_at: AHORA.toISOString() } };
    }
    if (l.tabla === "profiles") return { data: { rol: "agente", usuario_sistema_id: "us-1" } };
    if (l.tabla === "usuarios_sistema") return { data: { organizacion_id: "org-1", nom: "Robinson" } };
    if (l.tabla === "organizaciones") return { data: { id: "org-1" } };
    if (l.tabla === "agentes") return { data: { id: "ag-1" } };
    return {};
  });
  const { fetchFn, peticiones } = crearFakeFetch(rutas);
  const env = crearEnviador({ db, fetchFn, zernioApiKey: "k", ahora: () => AHORA, timeoutMs: 1000 });
  return { env, llamadas, storage, peticiones };
}

const rutaEnvio: Ruta = { metodo: "POST", url: "/inbox/conversations/18095551234/messages", responder: () => respuestaJson({ success: true, data: { messageId: "wamid.NUEVO" } }) };
const rutaPresign: Ruta = { metodo: "POST", url: "/media/presign", responder: () => respuestaJson({ success: true, data: { uploadUrl: "https://s3/up", publicUrl: "https://cdn/x.jpg", expiresIn: 3600 } }) };

Deno.test("inferirMime / extensionParaMime / esRutaMediaLocal", () => {
  assertEquals(inferirMime("foto.JPG", "application/octet-stream"), "image/jpeg");
  assertEquals(inferirMime("nota.webm", "audio/webm;codecs=opus"), "audio/webm");
  assertEquals(inferirMime("informe.docx", ""), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  assertEquals(inferirMime("raro.xyz", ""), "");
  assertEquals(extensionParaMime("audio/mp4"), "m4a");
  assertEquals(extensionParaMime("application/pdf", "a.PDF"), "pdf");
  assert(esRutaMediaLocal("out/abc-1.docx"));
  assert(!esRutaMediaLocal("in/abc.docx"));
  assert(!esRutaMediaLocal("out/../x"));
});

Deno.test("resolverAcceso resuelve agente por nombre", async () => {
  const { env } = armar();
  assertEquals(await env.resolverAcceso("sub-1"), { autorizado: true, agenteId: "ag-1" });
  assertEquals(await env.resolverAcceso(null), { autorizado: false, agenteId: null });
});

Deno.test("presign usa el MIME real (nunca application/octet-stream)", async () => {
  const { env, peticiones } = armar([rutaPresign]);
  const r = await env.presign({ accion: "presign", filename: "comprobante.jpg", content_type: "application/octet-stream" });
  assertEquals(r.status, 200);
  assertEquals(r.body.via, "zernio");
  assertEquals(r.body.uploadUrl, "https://s3/up");
  assertEquals((peticiones[0].body as any).contentType, "image/jpeg");
  assertEquals((peticiones[0].body as any).filename, "comprobante.jpg");
});

Deno.test("presign de docx va al bucket propio con URL firmada de subida", async () => {
  const { env, peticiones, storage } = armar([rutaPresign]);
  const r = await env.presign({ accion: "presign", filename: "informe.docx", content_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  assertEquals(r.status, 200);
  assertEquals(r.body.via, "supabase");
  assertEquals(peticiones.length, 0, "no debe llamar al presign de Zernio");
  assertEquals(storage[0].op, "createSignedUploadUrl");
  assertMatch(String(r.body.media_path), /^out\/[0-9a-f-]{36}\.docx$/);
  assertEquals(r.body.publicUrl, `nexus-media:${r.body.media_path}`);
  assertMatch(String(r.body.uploadUrl), /^https:\/\/storage\.test\/upload\/sign\/out\//);
});

Deno.test("presign cae al bucket propio si Zernio responde 400 y falla con tipo desconocido", async () => {
  const { env, storage } = armar([{ metodo: "POST", url: "/media/presign", responder: () => respuestaJson({ success: false, code: "INVALID_FIELD_VALUE" }, 400) }]);
  const r = await env.presign({ accion: "presign", filename: "clip.mp4", content_type: "video/mp4" });
  assertEquals(r.body.via, "supabase");
  assertEquals(storage.length, 1);
  const r2 = await env.presign({ accion: "presign", filename: "cosa.xyz" });
  assertEquals(r2.status, 400);
  assertEquals(r2.body.error, "tipo_de_archivo_desconocido");
});

Deno.test("envío con adjunto inserta fila local y la devuelve", async () => {
  const { env, llamadas, peticiones } = armar([rutaEnvio]);
  const r = await env.manejarEnvio({ hilo_id: "hilo-1", mensaje: "", attachment_url: "https://cdn/x.pdf", attachment_type: "file", attachment_name: "Informe.pdf", attachment_mime: "application/pdf", attachment_size: 1234, voice_note: false }, ACCESO);
  assertEquals(r.status, 200, JSON.stringify(r.body));
  assertEquals(r.body.messageId, "wamid.NUEVO");
  assertEquals(r.body.espera_webhook, true);
  const ins = ultima(llamadas, "whatsapp_hilo_mensajes", "insert")!;
  assertEquals(ins.datos.direccion, "out");
  assertEquals(ins.datos.estado, "enviado");
  assertEquals(ins.datos.tipo_contenido, "documento");
  assertEquals(ins.datos.cuerpo, "Informe.pdf");
  assertEquals(ins.datos.media_path, null);
  assertEquals(ins.datos.wa_message_id, "wamid.NUEVO");
  assertEquals(ins.datos.enviado_por_agente_id, "ag-1");
  assertEquals(ins.datos.reenviado, false);
  assertEquals(ins.datos.meta, { media: { mime: "application/pdf", nombre: "Informe.pdf", tamano: 1234 } });
  assertEquals(ins.modificadores, ["select:*", "single"]);
  assertEquals((r.body.mensaje as any).id, "m-nuevo");
  const z = peticiones[0].body as any;
  assertEquals(z, { accountId: "acc_1", attachmentUrl: "https://cdn/x.pdf", attachmentType: "file", attachmentName: "Informe.pdf" });
  assertMatch(peticiones[0].headers["idempotency-key"], /^[0-9a-f-]{36}$/);
  const h = ultima(llamadas, "whatsapp_hilos", "update")!;
  assertEquals(h.datos.ultimo_mensaje_preview, "Informe.pdf");
});

Deno.test("adjunto nexus-media: firma URL de 7 días para Zernio y guarda media_path", async () => {
  const { env, llamadas, storage, peticiones } = armar([rutaEnvio]);
  const r = await env.manejarEnvio({ hilo_id: "hilo-1", mensaje: "te lo mando", attachment_url: "nexus-media:out/abc.docx", attachment_type: "file", attachment_name: "informe.docx" }, ACCESO);
  assertEquals(r.status, 200, JSON.stringify(r.body));
  assertEquals(storage[0], { bucket: "whatsapp-inbox-media", op: "createSignedUrl", args: ["out/abc.docx", 604800] });
  assertEquals((peticiones[0].body as any).attachmentUrl, "https://storage.test/sign/out/abc.docx?token=t");
  const ins = ultima(llamadas, "whatsapp_hilo_mensajes", "insert")!;
  assertEquals(ins.datos.media_path, "out/abc.docx");
  assertEquals(ins.datos.cuerpo, "te lo mando");
  assertEquals(ins.datos.meta.media.mime, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  assertEquals(r.body.espera_webhook, false);
  const r2 = await env.manejarEnvio({ hilo_id: "hilo-1", attachment_url: "nexus-media:in/../x", attachment_type: "file" }, ACCESO);
  assertEquals(r2.status, 400);
});

Deno.test("reenviado:true queda en la fila", async () => {
  const { env, llamadas } = armar([rutaEnvio]);
  const r = await env.manejarEnvio({ hilo_id: "hilo-1", mensaje: "hola", reenviado: true, responde_a_id: "m-cit" }, ACCESO);
  assertEquals(r.status, 200);
  const ins = ultima(llamadas, "whatsapp_hilo_mensajes", "insert")!;
  assertEquals(ins.datos.reenviado, true);
  assertEquals(ins.datos.tipo_contenido, "text");
  assertEquals(ins.datos.responde_a_id, "m-cit");
  assertEquals(ins.datos.meta, {});
});

Deno.test("nota de voz m4a: descarga y manda multipart con voiceNote=true", async () => {
  const { env, peticiones, llamadas } = armar([
    { metodo: "GET", url: "https://cdn/nota.m4a", responder: () => new Response(new Uint8Array(20), { headers: { "content-type": "audio/mp4" } }) },
    rutaEnvio,
  ]);
  const r = await env.manejarEnvio({ hilo_id: "hilo-1", attachment_url: "https://cdn/nota.m4a", attachment_type: "audio", voice_note: true }, ACCESO);
  assertEquals(r.status, 200, JSON.stringify(r.body));
  assertEquals(peticiones.length, 2);
  const envio = peticiones[1];
  assert(envio.cuerpoCrudo instanceof FormData);
  const form = envio.cuerpoCrudo as FormData;
  assertEquals(form.get("voiceNote"), "true");
  assertEquals(form.get("accountId"), "acc_1");
  const archivo = form.get("attachment") as File;
  assertEquals(archivo.type, "audio/mp4");
  assertMatch(archivo.name, /^nota-voz-\d+\.m4a$/);
  assertEquals(envio.headers["content-type"], undefined, "el boundary lo pone fetch");
  assertEquals(ultima(llamadas, "whatsapp_hilo_mensajes", "insert")!.datos.tipo_contenido, "audio");
});

Deno.test("nota de voz: si el multipart falla vuelve al JSON con otra Idempotency-Key; ogg va directo por JSON", async () => {
  let intentos = 0;
  const { env, peticiones } = armar([
    { metodo: "GET", url: "https://cdn/nota.webm", responder: () => new Response(new Uint8Array(20), { headers: { "content-type": "audio/webm" } }) },
    { metodo: "POST", url: "/messages", responder: (p) => { intentos++; return p.cuerpoCrudo instanceof FormData ? respuestaJson({ success: false, code: "UNSUPPORTED" }, 400) : respuestaJson({ success: true, data: { messageId: "wamid.JSON" } }); } },
  ]);
  const r = await env.manejarEnvio({ hilo_id: "hilo-1", attachment_url: "https://cdn/nota.webm", attachment_type: "audio", voice_note: true }, ACCESO);
  assertEquals(r.status, 200, JSON.stringify(r.body));
  assertEquals(r.body.messageId, "wamid.JSON");
  assertEquals(intentos, 2);
  assert(peticiones[1].headers["idempotency-key"] !== peticiones[2].headers["idempotency-key"]);
  assertEquals((peticiones[2].body as any).voiceNote, true);

  const { env: env2, peticiones: p2 } = armar([
    { metodo: "GET", url: "https://cdn/nota.ogg", responder: () => new Response(new Uint8Array(20), { headers: { "content-type": "audio/ogg; codecs=opus" } }) },
    rutaEnvio,
  ]);
  await env2.manejarEnvio({ hilo_id: "hilo-1", attachment_url: "https://cdn/nota.ogg", attachment_type: "audio", voice_note: true }, ACCESO);
  assertEquals(p2.length, 2);
  assertEquals((p2[1].body as any).voiceNote, true);
  assert(!(p2[1].cuerpoCrudo instanceof FormData));
});

Deno.test("ubicación y contactos guardan meta", async () => {
  const { env, llamadas } = armar([rutaEnvio]);
  await env.manejarEnvio({ hilo_id: "hilo-1", location: { latitude: 18.47, longitude: -69.9, name: "Oficina" } }, ACCESO);
  let ins = ultima(llamadas, "whatsapp_hilo_mensajes", "insert")!;
  assertEquals(ins.datos.tipo_contenido, "ubicacion");
  assertEquals(ins.datos.meta, { ubicacion: { lat: 18.47, lng: -69.9, nombre: "Oficina" } });
  assertEquals(ins.datos.cuerpo, "Oficina · 18.470000, -69.900000");
  await env.manejarEnvio({ hilo_id: "hilo-1", contacts: [{ name: { formatted_name: "Ana" }, phones: [{ phone: "+18095550001" }] }] }, ACCESO);
  ins = ultima(llamadas, "whatsapp_hilo_mensajes", "insert")!;
  assertEquals(ins.datos.tipo_contenido, "contacto");
  assertEquals(ins.datos.meta, { contactos: [{ nombre: "Ana", telefonos: ["+18095550001"] }] });
});

Deno.test("ventana cerrada y hilo inexistente", async () => {
  const { env, peticiones } = armar([rutaEnvio], { hilo: { ...HILO, ultimo_inbound_at: "2026-09-29T10:00:00Z" } });
  const r = await env.manejarEnvio({ hilo_id: "hilo-1", mensaje: "hola" }, ACCESO);
  assertEquals(r.status, 409);
  assertEquals(peticiones.length, 0);
  const { env: env2 } = armar([rutaEnvio], { hilo: null });
  assertEquals((await env2.manejarEnvio({ hilo_id: "x", mensaje: "hola" }, ACCESO)).status, 404);
  assertEquals((await env2.manejarEnvio({ hilo_id: "x" }, ACCESO)).body.error, "mensaje_vacio");
});

Deno.test("error de Zernio no inserta fila; fila no guardada devuelve messageId", async () => {
  const { env, llamadas } = armar([{ metodo: "POST", url: "/messages", responder: () => respuestaJson({ success: false, code: "X" }, 500) }]);
  const r = await env.manejarEnvio({ hilo_id: "hilo-1", mensaje: "hola" }, ACCESO);
  assertEquals(r.status, 502);
  assertEquals(todas(llamadas, "whatsapp_hilo_mensajes", "insert").length, 0);
  const { env: env2 } = armar([rutaEnvio], { insertError: true });
  const r2 = await env2.manejarEnvio({ hilo_id: "hilo-1", mensaje: "hola" }, ACCESO);
  assertEquals(r2.status, 500);
  assertEquals(r2.body.messageId, "wamid.NUEVO");
});

Deno.test("filtro helper", () => {
  const l: Llamada = { tabla: "t", op: "select", filtros: [["eq", "id", 1]], modificadores: [] };
  assertEquals(filtro(l, "eq", "id"), ["id", 1]);
});
