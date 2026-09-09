// WhatsApp Cloud API (Meta directo) — enviar mensaje de plantilla aprobada
// verify_jwt:true — solo usuarios logueados de NEXUS PRO pueden llamar esta funcion.
// Secretos necesarios en Supabase Dashboard -> Edge Functions -> Secrets:
//   WHATSAPP_ACCESS_TOKEN   (token permanente generado en Meta for Developers)
//   WHATSAPP_PHONE_NUMBER_ID (ID del numero de telefono de WhatsApp Business, NO el numero en si)
//
// ⚠️ CODIGO MUERTO — RECUPERADO DESDE PRODUCCION (auditoria 2026-09-08) ⚠️
// Esta es una integracion VIEJA que habla directo con la Cloud API de Meta, anterior a que el
// sistema se estandarizara en Zernio. Estaba desplegada y activa (version 6) pero:
//   1. Su codigo fuente nunca se habia commiteado al repo (esta copia se recupero del despliegue).
//   2. NINGUNA parte del frontend la llama -- se verifico con grep sobre index.html y todos los
//      parches-*.js: cero referencias. La reemplazaron whatsapp-notificar / whatsapp-envio-masivo.
//   3. Su chequeo de consentimiento confia en un booleano "acepta_whatsapp" que viene en el body
//      del request, NO en la columna real del cliente en la base -- o sea, no es un control de
//      verdad, es una formalidad que el llamador puede afirmar libremente.
//
// Se guarda aqui para que borrarla del proyecto sea REVERSIBLE. La recomendacion de la auditoria
// es eliminarla (y revocar los secretos WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID si siguen
// configurados), porque es superficie de ataque y un token de envio real que nadie usa ni vigila.
// No borrar sin confirmacion del dueno.

const ACCESS_TOKEN = (Deno.env.get('WHATSAPP_ACCESS_TOKEN') || '').trim();
const PHONE_NUMBER_ID = (Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || '').trim();
const GRAPH_VERSION = 'v21.0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { headers: { ...CORS, 'Content-Type': 'application/json' }, status });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'Metodo no permitido' }, 405);

  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    return json({ ok: false, error: 'Falta configurar WHATSAPP_ACCESS_TOKEN y/o WHATSAPP_PHONE_NUMBER_ID en Supabase (Edge Functions -> Secrets).' }, 500);
  }

  try {
    const body = await req.json();
    const telefono = String(body.telefono || '').replace(/\D/g, '');
    const plantilla = String(body.plantilla || '').trim();
    const idioma = String(body.idioma || 'es').trim();
    const parametros = Array.isArray(body.parametros) ? body.parametros : [];
    const aceptaWhatsapp = body.acepta_whatsapp;

    if (!telefono) return json({ ok: false, error: 'Falta el telefono del destinatario' }, 400);
    if (!plantilla) return json({ ok: false, error: 'Falta el nombre de la plantilla aprobada' }, 400);
    if (aceptaWhatsapp !== true) {
      return json({ ok: false, error: 'Este cliente no tiene el consentimiento de WhatsApp marcado (acepta_whatsapp) — no se envio nada.' }, 400);
    }

    const telConPais = telefono.length === 10 ? '1' + telefono : telefono;

    const payload = {
      messaging_product: 'whatsapp',
      to: telConPais,
      type: 'template',
      template: {
        name: plantilla,
        language: { code: idioma },
        components: parametros.length ? [{
          type: 'body',
          parameters: parametros.map((p: unknown) => ({ type: 'text', text: String(p) }))
        }] : []
      }
    };

    const resp = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + ACCESS_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();
    if (!resp.ok) {
      const msg = data?.error?.message || JSON.stringify(data).slice(0, 300);
      return json({ ok: false, error: 'Meta rechazo el envio: ' + msg }, 500);
    }

    return json({ ok: true, message_id: data?.messages?.[0]?.id || null });
  } catch (e) {
    return json({ ok: false, error: String(e && (e as Error).message || e) }, 500);
  }
});
