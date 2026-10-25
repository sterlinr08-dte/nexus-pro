// bauche-auto-leer — 59.58 (dueño, 25-oct-2026: «vamos a usar la IA de los bauches smart para agilizar el proceso de
// cobro»; eligió que la IA lea las fotos «apenas llegan»). La llama whatsapp-webhook en segundo plano
// (EdgeRuntime.waitUntil) cuando un cliente VINCULADO manda una imagen. Lee el comprobante con Claude y guarda la
// lectura en whatsapp_hilo_mensajes.bauche_ia (+ bauche_sha256, bauche_leido_at) para que el Inbox muestre
// «Bauche RD$… · Cobrar» y «Registrar pago» se llene solo. NO registra pagos ni toca dinero: el cobro lo hace una persona.
// Solo interna: exige la clave de servicio (la misma que usa el webhook) o una llave de un solo uso vigente de
// `_comprobante_lote_llaves` (pruebas y la lectura de las fotos que ya esperan en la cola: {"pendientes":true}).
// Idempotente: si ya hay lectura, no repite.
// Apagar: secreto BAUCHE_AUTO_LEER=off (el webhook sigue igual; el Inbox simplemente no muestra la lectura).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.112.2";
import Anthropic from "npm:@anthropic-ai/sdk";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_KEY = (Deno.env.get("ANTHROPIC_API_KEY") || "").trim();
const APAGADO = (Deno.env.get("BAUCHE_AUTO_LEER") || "").trim().toLowerCase() === "off";
const MODELO = "claude-haiku-5-5"; // el mismo de comprobante-leer
const MAX_BYTES = 8 * 1024 * 1024;

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");

const ESQUEMA = {
  type: "object",
  additionalProperties: false,
  required: ["es_comprobante", "banco", "monto", "moneda", "fecha", "numero_transaccion", "cuenta_destino", "titular_destino", "hora", "ordenante", "confianza"],
  properties: {
    es_comprobante: { type: "boolean", description: "true si la imagen es un comprobante de transferencia o depósito bancario" },
    banco: { type: ["string", "null"], description: "Banco que emite el comprobante (Popular, BHD, Banreservas, Scotiabank, APAP, Santa Cruz, Promerica, Caribe, Vimenca, Qik…)" },
    monto: { type: ["number", "null"], description: "Monto transferido, sin símbolos ni comas" },
    moneda: { type: ["string", "null"], description: "DOP o USD" },
    fecha: { type: ["string", "null"], description: "Fecha de la operación en formato AAAA-MM-DD" },
    numero_transaccion: { type: ["string", "null"], description: "Número de referencia, confirmación, transacción o autorización que da EL BANCO, tal cual aparece" },
    cuenta_destino: { type: ["string", "null"], description: "Últimos 4 dígitos de la cuenta que recibe, si se ven" },
    titular_destino: { type: ["string", "null"], description: "Nombre de quien recibe, si se ve" },
    hora: { type: ["string", "null"], description: "Hora de la operación en formato HH:MM (24 horas), si se ve" },
    ordenante: { type: ["string", "null"], description: "Nombre de quien envía o deposita el dinero, si se ve" },
    confianza: { type: "number", description: "0 a 1: qué tan seguro estás de que el número de transacción y el monto están bien leídos" },
  },
};

const INSTRUCCION = `Eres un lector de comprobantes bancarios de República Dominicana. Lee la imagen y devuelve los datos pedidos.
- El número de transacción es el que pone el banco (puede llamarse referencia, confirmación, número de transacción o autorización). No inventes: si no se ve claro, devuelve null.
- La fecha va en AAAA-MM-DD y la hora en HH:MM de 24 horas. El monto, como número sin RD$, sin comas.
- Si la imagen no es un comprobante de pago (una foto cualquiera, un mensaje), pon es_comprobante en false y lo demás en null.`;


// Lee un comprobante con Claude (copia de comprobante-leer).
async function leerConClaude(arch: { bytes: Uint8Array; tipo: string }): Promise<{ ia: any; ia_error: string | null }> {
  const b64 = btoa(Array.from(arch.bytes, (c) => String.fromCharCode(c)).join(""));
  const tipoImg = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(arch.tipo) ? arch.tipo : "image/jpeg";
  const bloque: any = { type: "image", source: { type: "base64", media_type: tipoImg, data: b64 } };
  const claude = new Anthropic({ apiKey: ANTHROPIC_KEY, timeout: 30000, maxRetries: 1 });
  let ia: any = null;
  let ia_error: string | null = null;
  try {
    const r: any = await claude.messages.create({
      model: MODELO,
      max_tokens: 2000,
      system: INSTRUCCION,
      output_config: { effort: "low", format: { type: "json_schema", schema: ESQUEMA } },
      messages: [{ role: "user", content: [bloque, { type: "text", text: "Lee este comprobante." }] }],
    } as any);
    if (r.stop_reason !== "refusal") {
      const txt = (r.content || []).find((b: any) => b.type === "text")?.text || "";
      ia = JSON.parse(txt);
      ia.modelo = MODELO;
      ia.uso = { entrada: r.usage?.input_tokens, salida: r.usage?.output_tokens };
    } else ia_error = "rechazo";
  } catch (e) {
    console.error("bauche-auto-leer: Claude", e instanceof Error ? e.message : String(e));
    const st = Number((e as any)?.status) || 0;
    ia_error = st === 401 || st === 403 ? "clave" : st === 400 && /credit|billing/i.test(String((e as any)?.message)) ? "credito" : st === 429 || st === 529 ? "ocupado" : "otro";
    ia = null;
  }
  return { ia, ia_error };
}

async function autorizado(req: Request, db: any): Promise<boolean> {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (token && token === SERVICE_KEY) return true;
  const llave = (req.headers.get("x-lote-llave") || "").trim();
  if (llave.length < 32) return false;
  const h = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(llave)));
  const { data } = await db.from("_comprobante_lote_llaves").select("hash").eq("hash", h).gt("vence", new Date().toISOString()).maybeSingle();
  return !!data;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "Método no permitido." }, 405);
  const db = createClient(SUPABASE_URL, SERVICE_KEY);
  if (!(await autorizado(req, db))) return json({ ok: false, error: "No autorizado." }, 401);
  if (APAGADO) return json({ ok: true, omitido: "apagado" });
  if (!ANTHROPIC_KEY) return json({ ok: true, omitido: "sin_clave" });
  try {
    const body = await req.json().catch(() => ({}));
    // Fotos que ya esperan en la cola de bauches (revisión pendiente, sin lectura): se leen de a pocas.
    if (body?.pendientes) {
      const limite = Math.min(15, Math.max(1, Number(body.limite) || 10));
      const { data: filas } = await db.from("whatsapp_hilo_mensajes").select("wa_message_id")
        .eq("revision_pago_estado", "pendiente").eq("direccion", "in").eq("tipo_contenido", "imagen")
        .is("bauche_ia", null).not("media_path", "is", null).not("wa_message_id", "is", null)
        .order("created_at", { ascending: false }).limit(limite);
      const hechos: unknown[] = [];
      for (const f of filas || []) hechos.push({ wa: String(f.wa_message_id).slice(-6), ...(await leerMensaje(db, f.wa_message_id)) });
      return json({ ok: true, hechos });
    }
    const waId = String(body?.wa_message_id || "").trim();
    if (!waId) return json({ ok: false, error: "Falta wa_message_id." }, 400);
    const r = await leerMensaje(db, waId);
    return json(r, r.status || 200);
  } catch (e) {
    console.error("bauche-auto-leer:", e instanceof Error ? e.message : String(e));
    return json({ ok: false, error: "No se pudo leer." }, 500);
  }
});

async function leerMensaje(db: any, waId: string): Promise<any> {
  const { data: m } = await db.from("whatsapp_hilo_mensajes")
    .select("id, hilo_id, direccion, tipo_contenido, media_path, bauche_ia").eq("wa_message_id", waId).maybeSingle();
  if (!m) return { ok: false, error: "Mensaje no encontrado.", status: 404 };
  if (m.bauche_ia) return { ok: true, omitido: "ya_leido" };
  if (m.direccion !== "in" || m.tipo_contenido !== "imagen" || !m.media_path) return { ok: true, omitido: "no_es_foto_entrante" };
  const { data: h } = await db.from("whatsapp_hilos").select("cliente_id").eq("id", m.hilo_id).maybeSingle();
  if (!h?.cliente_id) return { ok: true, omitido: "sin_cliente" };
  const { data: arch0, error: e0 } = await db.storage.from("whatsapp-inbox-media").download(m.media_path);
  if (e0 || !arch0) return { ok: false, error: "No se pudo bajar la foto.", status: 404 };
  const bytes = new Uint8Array(await arch0.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) return { ok: true, omitido: "grande" };
  let tipo = (arch0.type || "").toLowerCase();
  if (!tipo || tipo === "application/octet-stream") {
    const ext = m.media_path.split(".").pop()?.toLowerCase();
    tipo = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  }
  const sha256 = hex(await crypto.subtle.digest("SHA-256", bytes as BufferSource));
  const { ia, ia_error } = await leerConClaude({ bytes, tipo });
  // Errores pasajeros (ocupado/clave/crédito): no se guarda nada, así el Inbox puede leerla al tocar «Cobrar».
  if (!ia && ia_error && ia_error !== "rechazo") return { ok: false, ia_error };
  const lectura = ia || { es_comprobante: false, sin_lectura: ia_error || "vacio" };
  const { error } = await db.from("whatsapp_hilo_mensajes")
    .update({ bauche_ia: lectura, bauche_sha256: sha256, bauche_leido_at: new Date().toISOString() })
    .eq("id", m.id).is("bauche_ia", null);
  if (error) return { ok: false, error: error.message, status: 500 };
  return { ok: true, es_comprobante: !!lectura.es_comprobante };
}
