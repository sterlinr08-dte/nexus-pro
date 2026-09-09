import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.112.2";

// whatsapp-envio-masivo — NEXUS PRO, procesa una tanda de envío masivo de WhatsApp (reemplazo del
// flujo manual de wa.me del WA Masivo viejo). Llamada repetidas veces desde el navegador (con la
// sesión del agente) hasta que el lote reporta terminado:true -- cada llamada procesa hasta
// "limite" destinatarios "pendiente" de un lote ya creado por la RPC
// whatsapp_crear_lote_envio_masivo.
//
// El envío real a Zernio reusa el MISMO contrato de plantilla ya probado en producción por
// whatsapp-notificar (formatearTelefono/armarComponents/mandarConReintento, copiados tal cual) --
// no reinventar el formato del body, ya se confirmó contra la documentación real de Zernio ahí.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ZERNIO_API_KEY = Deno.env.get("ZERNIO_API_KEY") ?? "";
const ZERNIO_TIMEOUT_MS = 20000;
const LIMITE_DEFAULT = 15;
const LIMITE_MAXIMO = 50;
const PAUSA_ENTRE_ENVIOS_MS = 600;

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
  } catch {
    return null;
  }
}

// Idéntico en espíritu a resolverAcceso() de whatsapp-inbox-enviar/index.ts -- mismo camino
// profiles → usuarios_sistema → organizaciones, mismo chequeo de que la org sea nexus-pro. El
// cliente de DB usa service_role (ignora RLS): esto repone del lado del servidor lo que la policy
// haría, nunca confiar en que el llamador ya pasó por RLS solo porque mandó un JWT válido.
async function resolverAcceso(sub: string | null): Promise<{ autorizado: boolean; organizacionId: string | null }> {
  const sinAcceso = { autorizado: false, organizacionId: null };
  if (!sub) return sinAcceso;
  const { data: profile } = await db.from("profiles").select("rol, usuario_sistema_id").eq("id", sub).maybeSingle();
  if (!profile?.rol || !profile.usuario_sistema_id) return sinAcceso;
  const { data: us } = await db.from("usuarios_sistema").select("organizacion_id").eq("id", profile.usuario_sistema_id).maybeSingle();
  if (!us?.organizacion_id) return sinAcceso;
  const { data: org } = await db.from("organizaciones").select("id").eq("slug", "nexus-pro").maybeSingle();
  if (!org || org.id !== us.organizacion_id) return sinAcceso;
  return { autorizado: true, organizacionId: org.id };
}

// Misma regla que nxWa() en index.html / whatsapp-notificar: quita todo lo que no sea dígito; si
// quedan 10 dígitos les antepone '1' (código de país RD/NANP); si el resultado no llega a 11
// dígitos, no hay WhatsApp.
function formatearTelefono(num: string | null | undefined): string | null {
  let d = String(num ?? "").replace(/\D/g, "");
  if (d.length === 10) d = "1" + d;
  return d.length >= 11 ? d : null;
}

function fmtMonto(n: unknown): string {
  const v = Number(n) || 0;
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

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

// Fix 2026-09-08: idéntico al fix de whatsapp-notificar/index.ts (ver ahí la explicación larga y
// la corrección de la hipótesis falsa del "cambio de API"). Resumen: pasar el teléfono como {id}
// en /v1/inbox/conversations/{id}/messages solo resuelve conversaciones que YA EXISTEN, y un lote
// masivo va justamente a clientes que nunca han escrito -- por eso los 14 destinatarios del primer
// lote real fallaron con 404 CONVERSATION_NOT_FOUND. Reemplazado por POST /v1/inbox/conversations,
// que crea la conversación si no existe y manda en la misma llamada; verificado en producción con
// un envío real. Ver docs.zernio.com/messages/create-inbox-conversation.
async function mandarPlantilla(telefono: string, accountId: string, nombre: string, variables: string[]): Promise<ResultadoZernio> {
  const body = {
    accountId,
    participantId: telefono,
    templateName: nombre,
    templateLanguage: "es",
    templateParams: variables,
  };
  const resp = await fetch(`https://zernio.com/api/v1/inbox/conversations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ZERNIO_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(ZERNIO_TIMEOUT_MS),
  });
  const data = await resp.json().catch(() => null);
  return { ok: resp.ok && !!data?.success, data, status: resp.status };
}

async function mandarConReintento(telefono: string, accountId: string, nombre: string, variables: string[]): Promise<ResultadoZernio> {
  let resultado = await mandarPlantilla(telefono, accountId, nombre, variables);
  for (let intento = 1; intento <= 2 && esConversacionNoEncontrada(resultado); intento++) {
    await esperar(2000);
    resultado = await mandarPlantilla(telefono, accountId, nombre, variables);
  }
  return resultado;
}

// Nombre de plantilla Zernio/Meta por tipo de lote. "factura" reusa la plantilla YA aprobada por
// Meta (misma que whatsapp-notificar usa para factura_generada); "pago"/"vence" son propias de
// este feature -- Meta las aprobó 2026-09-08, los 3 tipos ya mandan de verdad en producción.
const PLANTILLAS: Record<string, { nombre: string }> = {
  factura: { nombre: "factura_generada" },
  pago: { nombre: "recordatorio_pago_pendiente" },
  vence: { nombre: "poliza_por_vencer" },
};

type ClienteParaEnvio = {
  id: string;
  nom: string | null;
  wa: string | null;
  deuda_total?: number | null;
  pagado?: number | null;
  numero_poliza?: string | null;
  fecha_fin?: string | null;
};

// Arma las variables de la plantilla y, si a este cliente le falta algo para el tipo pedido,
// devuelve un motivo de fallo en vez de variables -- esa fila se marca "fallido" con ese motivo
// sin llegar a llamar a Zernio. Mismas fórmulas que ejecutarWAMasivo()/pend() en index.html.
async function armarVariables(tipo: string, cliente: ClienteParaEnvio): Promise<{ variables: string[] } | { errorDetalle: string }> {
  const nombre = cliente.nom || "cliente";
  if (tipo === "factura") {
    const { data: factura } = await db
      .from("facturas")
      .select("total")
      .eq("cliente_id", cliente.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!factura) return { errorDetalle: "cliente sin facturas generadas" };
    const ahora = new Date();
    return { variables: [nombre, fmtMonto(factura.total), `${MESES[ahora.getMonth()]} ${ahora.getFullYear()}`] };
  }
  if (tipo === "pago") {
    const saldo = Math.max(0, Number(cliente.deuda_total || 0) - Number(cliente.pagado || 0));
    return { variables: [nombre, fmtMonto(saldo)] };
  }
  if (tipo === "vence") {
    return { variables: [nombre, cliente.numero_poliza || "—", cliente.fecha_fin || "—"] };
  }
  return { errorDetalle: "tipo de lote desconocido: " + tipo };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "metodo_no_permitido" }, 405);

  try {
    return await manejar(req);
  } catch (e) {
    // Blindaje: cualquier excepcion no prevista termina en un 502/500 crudo de la plataforma sin
    // dejar rastro si no se captura aca -- mismo patron que whatsapp-inbox-enviar.
    console.error("whatsapp-envio-masivo: excepcion no capturada:", e instanceof Error ? (e.stack || e.message) : String(e));
    return json({ ok: false, error: "error_interno" }, 500);
  }
});

async function manejar(req: Request): Promise<Response> {
  const sub = subDelJWT(req);
  const acceso = await resolverAcceso(sub);
  if (!acceso.autorizado) return json({ ok: false, error: "no_autorizado" }, 403);

  let body: { lote_id?: string; limite?: number };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "body_invalido" }, 400);
  }

  const loteId = body.lote_id;
  if (!loteId) return json({ ok: false, error: "falta_lote_id" }, 400);
  const limite = Math.min(LIMITE_MAXIMO, Math.max(1, Number(body.limite) || LIMITE_DEFAULT));

  const { data: lote, error: loteError } = await db
    .from("whatsapp_envio_masivo_lotes")
    .select("id, organizacion_id, tipo, estado")
    .eq("id", loteId)
    .maybeSingle();
  if (loteError || !lote) return json({ ok: false, error: "lote_no_encontrado" }, 404);
  if (lote.organizacion_id !== acceso.organizacionId) return json({ ok: false, error: "lote_no_encontrado" }, 404);
  if (lote.estado === "completado") return json({ ok: false, error: "lote_ya_completado" }, 409);

  const plantilla = PLANTILLAS[lote.tipo];
  if (!plantilla) return json({ ok: false, error: "tipo_de_lote_desconocido" }, 500);

  const { data: config } = await db.from("whatsapp_config").select("zernio_account_id, activo").eq("activo", true).limit(1).maybeSingle();
  if (!config?.zernio_account_id) return json({ ok: false, error: "sin_configurar" }, 500);

  const { data: pendientes, error: pendError } = await db
    .from("whatsapp_envio_masivo_destinatarios")
    .select("id, cliente_id")
    .eq("lote_id", loteId)
    .eq("estado", "pendiente")
    .limit(limite);
  if (pendError) {
    console.error("whatsapp-envio-masivo: error leyendo destinatarios pendientes:", pendError.message);
    return json({ ok: false, error: "error_interno" }, 500);
  }

  if (!pendientes || pendientes.length === 0) {
    // Carrera rara: dos llamadas se solaparon y esta llego justo cuando ya no quedaba nada
    // pendiente. Se trata igual que un lote ya completado (defensa adicional, ver blueprint).
    await db.from("whatsapp_envio_masivo_lotes").update({ estado: "completado", updated_at: new Date().toISOString() }).eq("id", loteId).eq("estado", "en_progreso");
    return json({ ok: false, error: "lote_ya_completado" }, 409);
  }

  let procesados = 0;
  for (const dest of pendientes) {
    if (procesados > 0) await esperar(PAUSA_ENTRE_ENVIOS_MS);
    procesados++;

    const { data: cliente } = await db
      .from("clientes")
      .select("id, nom, wa, deuda_total, pagado, numero_poliza, fecha_fin")
      .eq("id", dest.cliente_id)
      .maybeSingle();

    if (!cliente) {
      await db.from("whatsapp_envio_masivo_destinatarios").update({ estado: "fallido", error_detalle: "cliente no encontrado", enviado_at: new Date().toISOString() }).eq("id", dest.id);
      continue;
    }

    const telefono = formatearTelefono(cliente.wa);
    if (!telefono) {
      await db.from("whatsapp_envio_masivo_destinatarios").update({ estado: "fallido", error_detalle: "cliente sin WhatsApp registrado", enviado_at: new Date().toISOString() }).eq("id", dest.id);
      continue;
    }

    const armado = await armarVariables(lote.tipo, cliente);
    if ("errorDetalle" in armado) {
      await db.from("whatsapp_envio_masivo_destinatarios").update({ estado: "fallido", error_detalle: armado.errorDetalle, enviado_at: new Date().toISOString() }).eq("id", dest.id);
      continue;
    }

    try {
      const resultado = await mandarConReintento(telefono, config.zernio_account_id, plantilla.nombre, armado.variables);
      if (resultado.ok) {
        await db.from("whatsapp_envio_masivo_destinatarios").update({
          estado: "enviado",
          zernio_message_id: resultado.data?.data?.messageId ?? null,
          enviado_at: new Date().toISOString(),
        }).eq("id", dest.id);
        // "pago" comparte la MISMA marca de cadencia que el cron automático (whatsapp_detectar_
        // atrasados/marcarClienteAvisadoAtraso) y el botón manual (whatsapp_recordatorio_manual) --
        // así los 3 caminos se enteran entre sí y ninguno le manda un 2do aviso de deuda al mismo
        // cliente antes de que pase dias_entre_avisos_atraso, sin importar por cuál camino salió
        // el primero. Ver migración 20260908230000_whatsapp_envio_masivo_respeta_cadencia.
        if (lote.tipo === "pago") {
          await db.from("clientes").update({ ultimo_aviso_atraso_en: new Date().toISOString() }).eq("id", cliente.id);
        }
      } else {
        await db.from("whatsapp_envio_masivo_destinatarios").update({
          estado: "fallido",
          error_detalle: JSON.stringify(resultado.data),
          enviado_at: new Date().toISOString(),
        }).eq("id", dest.id);
      }
    } catch (e) {
      const detalle = esTimeout(e) ? "timeout llamando a Zernio" : String(e);
      await db.from("whatsapp_envio_masivo_destinatarios").update({ estado: "fallido", error_detalle: detalle, enviado_at: new Date().toISOString() }).eq("id", dest.id);
    }
  }

  const { count: restantes } = await db.from("whatsapp_envio_masivo_destinatarios").select("id", { count: "exact", head: true }).eq("lote_id", loteId).eq("estado", "pendiente");
  const { count: enviados } = await db.from("whatsapp_envio_masivo_destinatarios").select("id", { count: "exact", head: true }).eq("lote_id", loteId).eq("estado", "enviado");
  const { count: fallidos } = await db.from("whatsapp_envio_masivo_destinatarios").select("id", { count: "exact", head: true }).eq("lote_id", loteId).eq("estado", "fallido");
  const terminado = (restantes ?? 0) === 0;

  await db.from("whatsapp_envio_masivo_lotes").update({
    enviados: enviados ?? 0,
    fallidos: fallidos ?? 0,
    estado: terminado ? "completado" : "en_progreso",
    updated_at: new Date().toISOString(),
  }).eq("id", loteId);

  return json({ ok: true, procesados, restantes: restantes ?? 0, terminado });
}
