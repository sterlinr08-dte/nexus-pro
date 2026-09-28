// whatsapp-enviar-plantilla — RETIRADA (28-sep-2026, auditoría de seguridad).
// Era una integración vieja directa con Meta (código muerto: ningún frontend la llamaba) y no revisaba
// el rol del usuario ni el consentimiento real del cliente: cualquiera con la clave pública podía enviar
// plantillas a cualquier número si seguían puestos WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID.
// Todo el envío de WhatsApp va por Zernio (whatsapp-notificar, whatsapp-envio-masivo, etc.).
// Se deja respondiendo 410 para que nada la use. Pendiente del dueño: borrar esos dos secretos en Supabase.
Deno.serve(() => new Response(JSON.stringify({ ok: false, error: "retirada" }), {
  status: 410, headers: { "Content-Type": "application/json" },
}));
