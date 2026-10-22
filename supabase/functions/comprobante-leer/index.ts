// comprobante-leer — 59.25 (59.56: devuelve ia_error) (dueño, 14-oct-2026): «que no se repita el mismo bauche de pago».
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

const hexDe = async (bytes: Uint8Array) => hex(await crypto.subtle.digest("SHA-256", bytes));

const INSTRUCCION = `Eres un lector de comprobantes bancarios de República Dominicana. Lee la imagen y devuelve los datos pedidos.
- El número de transacción es el que pone el banco (puede llamarse referencia, confirmación, número de transacción o autorización). No inventes: si no se ve claro, devuelve null.
- La fecha va en AAAA-MM-DD y la hora en HH:MM de 24 horas. El monto, como número sin RD$, sin comas.
- Si la imagen no es un comprobante de pago (una foto cualquiera, un mensaje), pon es_comprobante en false y lo demás en null.`;


// Lee un comprobante con Claude. Sin lectura igual se protege con la huella exacta y el mismo archivo.
async function leerConClaude(arch: { bytes: Uint8Array; tipo: string }): Promise<{ ia: any; ia_error: string | null }> {
    const b64 = btoa(Array.from(arch.bytes, (c) => String.fromCharCode(c)).join(""));
    const esPdf = arch.tipo === "application/pdf";
    const tipoImg = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(arch.tipo) ? arch.tipo : "image/jpeg";
    const bloque: any = esPdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }
      : { type: "image", source: { type: "base64", media_type: tipoImg, data: b64 } };

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
      console.error("comprobante-leer: Claude", e instanceof Error ? e.message : String(e));
      // 59.56: decir por qué no hubo lectura, para que la pantalla avise (sin mostrar detalles de la clave).
      const st = Number((e as any)?.status) || 0;
      ia_error = st === 401 || st === 403 ? "clave" : st === 400 && /credit|billing/i.test(String((e as any)?.message)) ? "credito" : st === 429 || st === 529 ? "ocupado" : "otro";
      ia = null; // sin lectura igual se protege con la huella exacta y el mismo archivo
    }
  return { ia, ia_error };
}

// 59.56 (dueño, 22-oct-2026: «lee los 139 viejos»): lectura por lotes de los comprobantes de pagos ya guardados.
// Solo administrador con sesión, o una llave de un solo uso guardada (en hash) en `_comprobante_lote_llaves` y vigente.
// Agrega o completa la fila de `pago_comprobantes` vinculada a cada pago; nunca cambia pagos, montos ni clientes.
async function permisoLote(req: Request, db: any): Promise<boolean> {
  const llave = (req.headers.get("x-lote-llave") || "").trim();
  if (llave.length >= 32) {
    const h = await hexDe(new TextEncoder().encode(llave));
    const { data } = await db.from("_comprobante_lote_llaves").select("hash").eq("hash", h).gt("vence", new Date().toISOString()).maybeSingle();
    if (data) return true;
  }
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token || token === SERVICE_KEY) return false;
  const { data } = await db.auth.getUser(token);
  if (!data?.user) return false;
  const { data: perfil } = await db.from("profiles").select("rol, activo").eq("id", data.user.id).maybeSingle();
  return perfil?.rol === "admin" && perfil.activo !== false && (await usuarioNexus(req, db)).ok;
}

async function lote(db: any, limite: number, soloHuella: boolean) {
  const { data: pagos, error } = await db.from("abonos")
    .select("id, comprobante_url, reversado_at, estado")
    .not("comprobante_url", "is", null).neq("comprobante_url", "").is("reversado_at", null)
    .order("fecha", { ascending: false }).limit(1000);
  if (error) throw new Error(error.message);
  const ids = (pagos || []).map((p: any) => p.id);
  const { data: ya } = ids.length ? await db.from("pago_comprobantes").select("id, abono_id, ia_json").in("abono_id", ids) : { data: [] };
  const porAbono = new Map((ya || []).map((r: any) => [r.abono_id, r]));
  // Con «solo huella» (sin IA) se toman los pagos sin fila; si no, los que aún no tienen lectura.
  const pend = (pagos || []).filter((p: any) => p.estado !== "Reversado" && (soloHuella ? !porAbono.has(p.id) : !(porAbono.get(p.id) as any)?.ia_json));
  const hechos: any[] = [];
  for (const p of pend.slice(0, limite)) {
    const arch = await bajar(db, p.comprobante_url);
    if (!arch || arch.bytes.byteLength > MAX_BYTES) {
      // Se deja anotado para no volver a intentarlo en cada lote.
      const motivo = arch ? "grande" : "no_esta_en_nexus";
      const previa0: any = porAbono.get(p.id);
      const r0 = previa0
        ? await db.from("pago_comprobantes").update({ ia_json: { es_comprobante: false, sin_lectura: motivo } }).eq("id", previa0.id)
        : await db.from("pago_comprobantes").insert({ abono_id: p.id, storage_ref: p.comprobante_url, ia_json: { es_comprobante: false, sin_lectura: motivo }, created_by_uid: null, created_by_name: "Lectura IA retroactiva 22-oct-2026" });
      hechos.push({ abono: p.id, ok: false, motivo, error: r0.error?.message || null }); continue;
    }
    const sha256 = await hexDe(arch.bytes);
    const { ia, ia_error } = soloHuella ? { ia: null, ia_error: null } : await leerConClaude(arch);
    if (ia_error && ia_error !== "rechazo" && ia_error !== "otro") return { hechos, pendientes: pend.length - hechos.length, detenido: ia_error };
    const iaGuardar = soloHuella ? null : ia || { es_comprobante: false, sin_lectura: ia_error || "vacio" };
    const fila: any = {
      storage_ref: p.comprobante_url, sha256, ia_json: iaGuardar,
      ia_banco: ia?.banco || null, ia_monto: Number(ia?.monto) > 0 ? Number(ia.monto) : null,
      ia_fecha: /^\d{4}-\d{2}-\d{2}$/.test(ia?.fecha || "") ? ia.fecha : null,
      ia_numero: ia?.numero_transaccion || null, ia_cuenta_destino: ia?.cuenta_destino || null,
      ia_confianza: typeof ia?.confianza === "number" ? ia.confianza : null, ia_modelo: ia ? MODELO : null,
    };
    const { data: norm } = await db.rpc("pago_comprobante_norm", { p: fila.ia_numero });
    fila.ia_numero_norm = norm || null;
    const previa: any = porAbono.get(p.id);
    const r = previa
      ? await db.from("pago_comprobantes").update(fila).eq("id", previa.id)
      : await db.from("pago_comprobantes").insert({ ...fila, abono_id: p.id, created_by_uid: null, created_by_name: "Lectura IA retroactiva 22-oct-2026" });
    hechos.push({ abono: p.id, ok: !r.error, leido: !!ia, error: r.error?.message || ia_error || null });
  }
  return { hechos, pendientes: Math.max(0, pend.length - hechos.length), detenido: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "Método no permitido." }, 405);
  const db = createClient(SUPABASE_URL, SERVICE_KEY);
  try {
    const body0 = await req.clone().json().catch(() => ({}));
    if (body0?.lote) {
      if (!(await permisoLote(req, db))) return json({ ok: false, error: "No autorizado." }, 401);
      const soloHuella = body0.solo_huella === true;
      if (!soloHuella && !ANTHROPIC_KEY) return json({ ok: false, error: "Falta la clave de la IA.", ia_error: "sin_clave" }, 400);
      const limite = Math.min(soloHuella ? 40 : 15, Math.max(1, Number(body0.limite) || 10));
      return json({ ok: true, ...(await lote(db, limite, soloHuella)) });
    }
    const quien = await usuarioNexus(req, db);
    if (!quien.ok) return json({ ok: false, error: "No autorizado (" + quien.motivo + ")." }, 401);
    const body = await req.json().catch(() => ({}));
    const ref = String(body?.ref || "").trim();
    const arch = await bajar(db, ref);
    if (!arch) return json({ ok: false, error: "Comprobante no encontrado en NEXUS." }, 404);
    if (arch.bytes.byteLength > MAX_BYTES) return json({ ok: false, error: "El archivo pasa de 8 MB." }, 413);
    const sha256 = hex(await crypto.subtle.digest("SHA-256", arch.bytes));

    if (body?.solo_huella) return json({ ok: true, sha256, ia: null });
    if (!ANTHROPIC_KEY) return json({ ok: true, sha256, ia: null, ia_error: "sin_clave" });

    const { ia, ia_error } = await leerConClaude(arch);
    return json({ ok: true, sha256, ia, ia_error });
  } catch (e) {
    console.error("comprobante-leer:", e instanceof Error ? e.message : String(e));
    return json({ ok: false, error: "No se pudo leer el comprobante." }, 500);
  }
});
