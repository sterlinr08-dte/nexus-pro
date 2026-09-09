-- NEXUS PRO · La primera plantilla pago_pendiente_validacion_agente fue rechazada por Meta.
-- Se usa una versión simplificada con menos variables.
update public.whatsapp_automatizaciones
set plantilla_nombre='pago_pendiente_validacion_agente_v2',updated_at=now()
where codigo='pago_pendiente_validacion'
  and organizacion_id=(select id from public.organizaciones where slug='nexus-pro');
