-- NEXUS PRO · reacción del agente en mensajes de WhatsApp
-- Persiste la reacción enviada desde el menú del mensaje para que siga visible
-- después de recargar el Inbox y entre dispositivos.

alter table public.whatsapp_hilo_mensajes
  add column if not exists reaccion_agente text;

alter table public.whatsapp_hilo_mensajes
  drop constraint if exists whatsapp_hilo_mensajes_reaccion_agente_largo_chk;

alter table public.whatsapp_hilo_mensajes
  add constraint whatsapp_hilo_mensajes_reaccion_agente_largo_chk
  check (reaccion_agente is null or char_length(reaccion_agente) <= 16);
