-- Fix: el ON CONFLICT (wa_message_id) que usa whatsapp-webhook (.upsert con onConflict:
-- 'wa_message_id', ignoreDuplicates:true) genera un INSERT ... ON CONFLICT (wa_message_id)
-- DO NOTHING sin predicado WHERE. Postgres no puede usar un indice UNICO PARCIAL
-- (whatsapp_hilo_mensajes_wa_id_idx, con WHERE wa_message_id IS NOT NULL) como arbitro de un
-- ON CONFLICT que no repite el mismo WHERE -- confirmado en produccion con el error real:
-- "there is no unique or exclusion constraint matching the ON CONFLICT specification".
-- Un indice UNICO normal (sin WHERE) resuelve esto sin perder nada: Postgres ya trata cada
-- NULL como distinto en un indice unico, asi que multiples mensajes salientes sin
-- wa_message_id (aun no confirmados por Zernio) siguen sin chocar entre si.

drop index if exists public.whatsapp_hilo_mensajes_wa_id_idx;
create unique index whatsapp_hilo_mensajes_wa_id_idx on public.whatsapp_hilo_mensajes (wa_message_id);
