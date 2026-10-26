-- e-CF fases 4 y 5 (dueño, 25-oct-2026: «Sí, empieza con la 4 y la 5 y con relación a la nota de crédito»).
-- Fase 5: la nota de crédito electrónica (E34) vive en pos_devoluciones, con los mismos campos e-CF que pos_ventas.
-- Fase 4: pg_cron cada 15 min llama a la Edge ecf-mseller {accion:"seguimiento"} SOLO si hay e-CF esperando a la DGII;
-- la Edge valida el encabezado x-cron-token contra cron_secretos('ecf_seguimiento') (mismo patrón que auto-facturacion).
-- Solo agrega columnas nulas, candados, un índice y la tarea programada. No toca datos.
alter table public.pos_devoluciones add column if not exists ecf_tipo smallint;
alter table public.pos_devoluciones add column if not exists ecf_entorno text;
alter table public.pos_devoluciones add column if not exists ecf_estado text;
alter table public.pos_devoluciones add column if not exists ecf_security_code text;
alter table public.pos_devoluciones add column if not exists ecf_qr_url text;
alter table public.pos_devoluciones add column if not exists ecf_track_id text;
alter table public.pos_devoluciones add column if not exists ecf_firmado text;
alter table public.pos_devoluciones add column if not exists ecf_enviado_at timestamptz;
alter table public.pos_devoluciones add column if not exists ecf_actualizado_at timestamptz;
alter table public.pos_devoluciones add column if not exists ecf_respuesta jsonb;
alter table public.pos_devoluciones add constraint pos_devoluciones_ecf_estado_chk check (ecf_estado is null or ecf_estado = any (array['pendiente','En Cola','Enviado a la DGII','En Proceso','Aceptado','Aceptado Condicional','Rechazado','No encontrado','Error']));
alter table public.pos_devoluciones add constraint pos_devoluciones_ecf_entorno_chk check (ecf_entorno is null or ecf_entorno = any (array['TesteCF','CerteCF','eCF']));
create unique index if not exists pos_devoluciones_encf_unico on public.pos_devoluciones (organizacion_id, ncf) where ncf like 'E%';
create index if not exists idx_pos_dev_ecf_pendientes on public.pos_devoluciones (ecf_estado) where ecf_estado in ('pendiente','En Cola','Enviado a la DGII','En Proceso');

insert into public.cron_secretos (nombre, valor) values ('ecf_seguimiento', encode(extensions.gen_random_bytes(24), 'hex')) on conflict (nombre) do nothing;

select cron.schedule('ecf-seguimiento-15min', '*/15 * * * *', $cron$
  select net.http_post(
    url := 'https://tnwsgcxurfyuszxsewsn.supabase.co/functions/v1/ecf-mseller',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(select valor from public.cron_secretos where nombre='ecf_seguimiento')),
    body := '{"accion":"seguimiento"}'::jsonb
  )
  where exists (select 1 from public.pos_ventas where ecf_estado in ('En Cola','Enviado a la DGII','En Proceso') or (ecf_estado = 'pendiente' and ncf like 'E%'))
     or exists (select 1 from public.pos_devoluciones where ecf_estado in ('En Cola','Enviado a la DGII','En Proceso') or (ecf_estado = 'pendiente' and ncf like 'E%'));
$cron$);
