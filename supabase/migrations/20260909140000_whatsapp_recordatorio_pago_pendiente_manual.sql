-- NEXUS PRO · WhatsApp · recordatorio manual neutral de pago pendiente
--
-- Este tipo es DISTINTO de `atrasado`: una factura con saldo pendiente no implica necesariamente mora.
-- El botón manual de Cobranza usa la plantilla Meta `recordatorio_pago_pendiente` y registra el
-- intento en whatsapp_mensajes para auditoría.

alter table public.whatsapp_mensajes
  drop constraint if exists whatsapp_mensajes_tipo_check;

alter table public.whatsapp_mensajes
  add constraint whatsapp_mensajes_tipo_check
  check (tipo = any (array[
    'factura_generada'::text,
    'atrasado'::text,
    'pago_aplicado'::text,
    'entrega_confirmada'::text,
    'pago_pendiente_validacion'::text,
    'pago_validado_resumen'::text,
    'recordatorio_pago_pendiente'::text
  ]));
