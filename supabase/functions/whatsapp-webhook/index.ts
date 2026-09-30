import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { crearWebhook, esNuestraCuenta, verificarFirma } from "./_lib.ts";

// whatsapp-webhook — NEXUS PRO, recibe eventos de Zernio para la línea de Seguros (fase 2: inbox
// de dos vías). Adaptado de Bayolcell Taller (mismo proveedor, misma cuenta/equipo de Zernio).
//
// Punto crítico, confirmado en docs.zernio.com: los webhooks de Zernio son a nivel de EQUIPO
// (hasta 10 URLs), no por número/accountId — este endpoint va a recibir TAMBIÉN los eventos de
// las 5 líneas de Bayolcell Taller, y el webhook de Bayolcell Taller va a recibir los de esta
// línea de Seguros. Por eso el primer filtro real es por accountId contra whatsapp_config — todo
// lo que no coincida se ignora en silencio (200, sin escribir nada), nunca un error.
//
// nexus-pro es una sola organización con una sola línea de WhatsApp — a diferencia de Bayolcell
// Taller no hace falta sucursal_id/linea_id/leads/campañas; whatsapp_config ya tiene la única
// cuenta relevante.
//
// Eventos manejados: message.received/sent (texto, imagen, sticker, audio, video, documento,
// ubicación, contactos), message.delivered/read/failed (estado + entregado_at/leido_at) y
// reaction.received (reaccion_cliente). La lógica vive en _lib.ts.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("ZERNIO_WEBHOOK_SECRET") ?? "";
const ZERNIO_API_KEY = Deno.env.get("ZERNIO_API_KEY") ?? "";

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const webhook = crearWebhook({ db, zernioApiKey: ZERNIO_API_KEY });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok");
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const rawBody = await req.text();
  const firmaOk = await verificarFirma(rawBody, req.headers.get("X-Zernio-Signature"), WEBHOOK_SECRET);
  if (!firmaOk) {
    console.error("Webhook rechazado: firma invalida o ausente");
    return new Response("Invalid signature", { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody);
    const config = await webhook.buscarConfig();
    if (!esNuestraCuenta(payload.account || {}, config)) {
      // No es un error -- es tráfico de otra línea del mismo equipo de Zernio (ej. Bayolcell
      // Taller). Se ignora en silencio, sin tocar la base de datos.
      return new Response(JSON.stringify({ received: true, ignorado: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    await webhook.manejarEvento(payload, config);
  } catch (e) {
    console.error("whatsapp-webhook error:", e instanceof Error ? e.message : String(e));
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
