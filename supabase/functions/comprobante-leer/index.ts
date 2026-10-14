// comprobante-leer — 59.25 (dueño, 14-oct-2026): «que no se repita el mismo bauche de pago».
// Recibe la referencia de un comprobante ya guardado en NEXUS (URL pública del bucket `comprobantes` de ESTE proyecto,
// o «wa-media:<ruta>» del bucket privado del Inbox), calcula su huella exacta (SHA-256) y se lo da a Claude para que
// lea banco, monto, fecha y número de transacción. No guarda nada: la verificación y el registro los hace la RPC
// `comprobante_registrar` (bloquea los repetidos). Lo leído se guarda allí (ia_json) para entrenar después un lector
// propio por banco y dejar de pagar por la mayoría de los comprobantes.
// Acceso: cualquier usuario activo de NEXUS PRO (admin o agente) con sesión real; no acepta la clave de servicio.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.112.2";
import Anthropic from "npm:@anthropic-ai/sdk";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_KEY = (Deno.env.get("ANTHROPIC_API_KEY") || "").trim();
const MODELO = "claude-haiku-5-5"; // el más barato con visión; el dueño aprobó «unos centavos» por comprobante
const MAX_BYTES = 8 * 1024 * 1024;
const PUBLICO = `${SUPABASE_URL}/storage/v1/object/public/comprobantes/`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");

async function usuarioNexus(req: Request, db: any): Promise<{ ok: boolean; motivo: string }> {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, motivo: "sin sesión" };
  if (token === SERVICE_KEY) return { ok: false, motivo: "clave de servicio no permitida" };
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) return { ok: false, motivo: "sesión inválida" };
  const { data: perfil } = await db.from("profiles").select("rol, usuario_sistema_id, activo").eq("id", data.user.id).maybeSingle();
  if (!perfil?.usuario_sistema_id || perfil.activo === false || !perfil.rol) return { ok: false, motivo: "usuario sin permiso" };
  const [{ data: us }, { data: org }] = await Promise.all([
    db.from("usuarios_sistema").select("organizacion_id, activo").eq("id", perfil.usuario_sistema_id).maybeSingle(),
    db.from("organizaciones").select("id").eq("slug", "nexus-pro").maybeSingle(),
  ]);
  if (!us || us.activo === false || !org?.id || us.organizacion_id !== org.id) return { ok: false, motivo: "organización no autorizada" };
  return { ok: true, motivo: "" };
}

// Solo archivos de NEXUS: nada de URLs de afuera (evita que la función se use para bajar cualquier cosa).
async function bajar(db: any, ref: string): Promise<{ bytes: Uint8Array; tipo: string } | null> {
  let bucket = "", ruta = "";
  if (ref.startsWith("wa-media:")) { bucket = "whatsapp-inbox-media"; ruta = ref.slice(9); }
  else if (ref.startsWith(PUBLICO)) { bucket = "comprobantes"; ruta = decodeURIComponent(ref.slice(PUBLICO.length).split("?")[0]); }
  else return null;
  if (!ruta || ruta.includes("..")) return null;
  const { data, error } = await db.storage.from(bucket).download(ruta);
  if (error || !data) return null;
  const bytes = new Uint8Array(await data.arrayBuffer());
  let tipo = (data.type || "").toLowerCase();
  if (!tipo || tipo === "application/octet-stream") {
    const ext = ruta.split(".").pop()?.toLowerCase();
    tipo = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "pdf" ? "application/pdf" : "image/jpeg";
  }
  return { bytes, tipo };
}

const ESQUEMA = {
  type: "object",
  additionalProperties: false,
  required: ["es_comprobante", "banco", "monto", "moneda", "fecha", "numero_transaccion", "cuenta_destino", "titular_destino", "confianza"],
  properties: {
    es_comprobante: { type: "boolean", description: "true si la imagen es un comprobante de transferencia o depósito bancario" },
    banco: { type: ["string", "null"], description: "Banco que emite el comprobante (Popular, BHD, Banreservas, Scotiabank, APAP, Santa Cruz, Promerica, Caribe, Vimenca, Qik…)" },
    monto: { type: ["number", "null"], description: "Monto transferido, sin símbolos ni comas" },
    moneda: { type: ["string", "null"], description: "DOP o USD" },
    fecha: { type: ["string", "null"], description: "Fecha de la operación en formato AAAA-MM-DD" },
    numero_transaccion: { type: ["string", "null"], description: "Número de referencia, confirmación, transacción o autorización que da EL BANCO, tal cual aparece" },
    cuenta_destino: { type: ["string", "null"], description: "Últimos 4 dígitos de la cuenta que recibe, si se ven" },
    titular_destino: { type: ["string", "null"], description: "Nombre de quien recibe, si se ve" },
    confianza: { type: "number", description: "0 a 1: qué tan seguro estás de que el número de transacción y el monto están bien leídos" },
  },
};

const INSTRUCCION = `Eres un lector de comprobantes bancarios de República Dominicana. Lee la imagen y devuelve los datos pedidos.
- El número de transacción es el que pone el banco (puede llamarse referencia, confirmación, número de transacción o autorización). No inventes: si no se ve claro, devuelve null.
- La fecha va en AAAA-MM-DD. El monto, como número sin RD$, sin comas.
- Si la imagen no es un comprobante de pago (una foto cualquiera, un mensaje), pon es_comprobante en false y lo demás en null.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "Método no permitido." }, 405);
  const db = createClient(SUPABASE_URL, SERVICE_KEY);
  try {
    const quien = await usuarioNexus(req, db);
    if (!quien.ok) return json({ ok: false, error: "No autorizado (" + quien.motivo + ")." }, 401);
    const body = await req.json().catch(() => ({}));
    const ref = String(body?.ref || "").trim();
    const arch = await bajar(db, ref);
    if (!arch) return json({ ok: false, error: "Comprobante no encontrado en NEXUS." }, 404);
    if (arch.bytes.byteLength > MAX_BYTES) return json({ ok: false, error: "El archivo pasa de 8 MB." }, 413);
    const sha256 = hex(await crypto.subtle.digest("SHA-256", arch.bytes));

    if (!ANTHROPIC_KEY || body?.solo_huella) return json({ ok: true, sha256, ia: null });

    const b64 = btoa(Array.from(arch.bytes, (c) => String.fromCharCode(c)).join(""));
    const esPdf = arch.tipo === "application/pdf";
    const tipoImg = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(arch.tipo) ? arch.tipo : "image/jpeg";
    const bloque: any = esPdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }
      : { type: "image", source: { type: "base64", media_type: tipoImg, data: b64 } };

    const claude = new Anthropic({ apiKey: ANTHROPIC_KEY, timeout: 30000, maxRetries: 1 });
    let ia: any = null;
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
      }
    } catch (e) {
      console.error("comprobante-leer: Claude", e instanceof Error ? e.message : String(e));
      ia = null; // sin lectura igual se protege con la huella exacta y el mismo archivo
    }
    return json({ ok: true, sha256, ia });
  } catch (e) {
    console.error("comprobante-leer:", e instanceof Error ? e.message : String(e));
    return json({ ok: false, error: "No se pudo leer el comprobante." }, 500);
  }
});
