import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// whatsapp-inbox-enviar — NEXUS PRO, responde un hilo del inbox de WhatsApp (fase 2). Llamada
// desde el navegador con la sesión del agente logueado — a diferencia de whatsapp-notificar
// (fase 1, interno vía pg_net), esta SÍ verifica un JWT de usuario real.
//
// Solo texto libre por ahora (ver plan — mandar adjuntos desde el agente queda fuera de
// alcance de esta primera versión del inbox). Recibir imágenes del cliente SÍ está soportado
// (whatsapp-webhook), solo el envío de adjuntos desde acá queda pendiente.
//
// Regla de Meta (igual que en Bayolcell Taller): texto libre solo si el cliente escribió en las
// últimas 24h. Fuera de esa ventana no hay plantilla de "reabrir" a propósito — el composer se
// desactiva en el frontend en vez de forzar una plantilla que no fue diseñada para texto libre.

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
  } catch {
    return null;
  }
}

// El cliente de DB usa service_role (ignora RLS) -- esto repone del lado del servidor exactamente
// lo que la policy de mi_rol()/mi_organizacion() haría, ya que esta función escribe con ese
// cliente. Nunca confiar en que el llamador ya pasó por RLS solo porque mandó un JWT válido.
//
// De paso resuelve el agente (agentes.id) que va en enviado_por_agente_id -- por nombre, mismo
// patrón ya usado en el POS (_posVendAuto): no hay FK real de usuarios_sistema a agentes, así que
// se empareja por nom (case-insensitive). Sin match, agenteId queda null -- no bloquea el envío,
// solo no queda registrado quién lo mandó (mismo criterio "safe no-op fallback" del resto del sistema).
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

function esTimeout(e: unknown): boolean {
  return e instanceof DOMException && e.name === "TimeoutError";
}

function esConversacionNoEncontrada(resultado: ResultadoZernio): boolean {
  return resultado.status === 404 && resultado.data?.code === "CONVERSATION_NOT_FOUND";
}

async function esperar(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function mandarAZernio(conversationId: string, accountId: string, mensaje: string): Promise<ResultadoZernio> {
  const resp = await fetch(`https://zernio.com/api/v1/inbox/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ZERNIO_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, message: mensaje }),
    signal: AbortSignal.timeout(ZERNIO_TIMEOUT_MS),
  });
  const data = await resp.json().catch(() => null);
  return { ok: resp.ok && !!data?.success, data, status: resp.status };
}

async function mandarConReintento(conversationId: string, accountId: string, mensaje: string): Promise<ResultadoZernio> {
  let resultado = await mandarAZernio(conversationId, accountId, mensaje);
  for (let intento = 1; intento <= 2 && esConversacionNoEncontrada(resultado); intento++) {
    await esperar(2000);
    resultado = await mandarAZernio(conversationId, accountId, mensaje);
  }
  return resultado;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "metodo_no_permitido" }, 405);

  try {
    return await manejar(req);
  } catch (e) {
    // Blindaje: cualquier excepcion no prevista en el camino autorizado (mas largo que el de
    // no_autorizado, que es el unico que se habia probado hasta ahora) terminaba en un 502 crudo
    // de la plataforma sin dejar rastro -- confirmado en vivo, el dueño no podia responder desde
    // el inbox y no habia ningun log que explicara por que.
    console.error("whatsapp-inbox-enviar: excepcion no capturada:", e instanceof Error ? (e.stack || e.message) : String(e));
    return json({ ok: false, error: "error_interno" }, 500);
  }
});

async function manejar(req: Request): Promise<Response> {
  const sub = subDelJWT(req);
  const acceso = await resolverAcceso(sub);
  if (!acceso.autorizado) return json({ ok: false, error: "no_autorizado" }, 403);

  let body: { hilo_id?: string; mensaje?: string; responde_a_id?: string | null };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "body_invalido" }, 400);
  }

  const hiloId = body.hilo_id;
  const mensaje = (body.mensaje || "").trim();
  const respondeAId = body.responde_a_id ? String(body.responde_a_id) : null;
  if (!hiloId) return json({ ok: false, error: "falta_hilo_id" }, 400);
  if (!mensaje) return json({ ok: false, error: "mensaje_vacio" }, 400);

  const { data: hilo, error: hiloError } = await db.from("whatsapp_hilos").select("id, telefono_e164, ultimo_inbound_at").eq("id", hiloId).maybeSingle();
  if (hiloError || !hilo) return json({ ok: false, error: "hilo_no_encontrado" }, 404);

  if (respondeAId) {
    const { data: mensajeRespondido } = await db
      .from("whatsapp_hilo_mensajes")
      .select("id")
      .eq("id", respondeAId)
      .eq("hilo_id", hiloId)
      .maybeSingle();
    if (!mensajeRespondido) return json({ ok: false, error: "responde_a_id_invalido" }, 400);
  }

  if (!hilo.ultimo_inbound_at) {
    return json({ ok: false, error: "ventana_cerrada", mensaje: "Este hilo no tiene mensajes entrantes todavía." }, 409);
  }
  const horasDesdeUltimoInbound = (Date.now() - new Date(hilo.ultimo_inbound_at).getTime()) / 3600000;
  if (horasDesdeUltimoInbound > 24) {
    return json({ ok: false, error: "ventana_cerrada", mensaje: "Pasaron más de 24h desde el último mensaje del cliente." }, 409);
  }

  const { data: config } = await db.from("whatsapp_config").select("zernio_account_id, activo").eq("activo", true).limit(1).maybeSingle();
  if (!config?.zernio_account_id) return json({ ok: false, error: "sin_configurar" }, 500);

  const conversationId = hilo.telefono_e164.startsWith("bsid:") ? hilo.telefono_e164.slice(5) : hilo.telefono_e164;

  let resultado: ResultadoZernio;
  try {
    resultado = await mandarConReintento(conversationId, config.zernio_account_id, mensaje);
  } catch (e) {
    console.error("whatsapp-inbox-enviar: fetch a Zernio fallo:", e instanceof Error ? e.message : String(e));
    if (esTimeout(e)) return json({ ok: false, error: "zernio_timeout", mensaje: "Zernio no respondió a tiempo. No reintentes automáticamente." }, 504);
    return json({ ok: false, error: "no_se_pudo_contactar_zernio" }, 502);
  }

  if (!resultado.ok) {
    console.error("whatsapp-inbox-enviar: Zernio respondio no-ok, status:", resultado.status, "data:", JSON.stringify(resultado.data));
    return json({ ok: false, error: "zernio_error", detalle: resultado.data }, 502);
  }

  const ahora = new Date().toISOString();
  const { data: mensajeInsertado, error: insertError } = await db.from("whatsapp_hilo_mensajes").insert({
    hilo_id: hiloId,
    direccion: "out",
    tipo_contenido: "text",
    cuerpo: mensaje,
    wa_message_id: resultado.data?.data?.messageId ?? null,
    responde_a_id: respondeAId,
    estado: "enviado",
    enviado_por_agente_id: acceso.agenteId,
  }).select("id,hilo_id,direccion,tipo_contenido,cuerpo,media_path,wa_message_id,responde_a_id,estado,error_detalle,enviado_por_agente_id,revision_pago_estado,abono_id,created_at").single();
  if (insertError) {
    console.error("whatsapp-inbox-enviar: no se pudo guardar el mensaje:", insertError.message);
    return json({ ok: false, error: "mensaje_enviado_no_guardado" }, 500);
  }
  await db.from("whatsapp_hilos").update({
    ultimo_mensaje_at: ahora,
    ultimo_mensaje_preview: mensaje.slice(0, 200),
    ultima_respuesta_humana_at: ahora,
    updated_at: ahora,
  }).eq("id", hiloId);

  return json({ ok: true, messageId: resultado.data?.data?.messageId ?? null, mensaje: mensajeInsertado });
}
