-- Nota de débito electrónica E33 (dueño, 25-oct-2026: «Sí, haz el débito E33»). Un cargo adicional sobre una factura
-- electrónica ya aceptada (delivery, recargo, diferencia de precio). Tabla propia, con los mismos campos e-CF que
-- pos_ventas/pos_devoluciones. Primera versión: se cobra al momento (efectivo, transferencia o tarjeta); a crédito no,
-- porque el abono de fiado (pos_fiado_registrar_abono) valida el saldo solo contra pos_ventas.
create table if not exists public.pos_notas_debito (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id),
  venta_id uuid not null references public.pos_ventas(id),
  numero text,
  fecha date not null default current_date,
  cliente_id uuid,
  cliente_nombre text,
  concepto text not null,
  lleva_itbis boolean not null default true,
  subtotal numeric(14,2) not null,
  itbis numeric(14,2) not null default 0,
  total numeric(14,2) not null check (total > 0),
  metodo text not null check (metodo in ('Efectivo','Transferencia','Tarjeta')),
  caja_id uuid,
  estado text not null default 'emitida' check (estado in ('emitida','anulada')),
  created_by_name text,
  created_at timestamptz not null default now(),
  ncf text,
  ecf_tipo smallint,
  ecf_entorno text check (ecf_entorno is null or ecf_entorno in ('TesteCF','CerteCF','eCF')),
  ecf_estado text check (ecf_estado is null or ecf_estado in ('pendiente','En Cola','Enviado a la DGII','En Proceso','Aceptado','Aceptado Condicional','Rechazado','No encontrado','Error')),
  ecf_security_code text,
  ecf_qr_url text,
  ecf_track_id text,
  ecf_firmado text,
  ecf_enviado_at timestamptz,
  ecf_actualizado_at timestamptz,
  ecf_respuesta jsonb
);
create trigger trg_org_pos_nd before insert on public.pos_notas_debito for each row execute function public.set_organizacion_id();
alter table public.pos_notas_debito enable row level security;
create policy pos_nd_admin on public.pos_notas_debito for all using ((mi_rol() is not null) and (organizacion_id = mi_organizacion())) with check ((mi_rol() is not null) and (organizacion_id = mi_organizacion()));
create unique index if not exists pos_notas_debito_encf_unico on public.pos_notas_debito (organizacion_id, ncf) where ncf like 'E%';
create index if not exists idx_pos_nd_venta on public.pos_notas_debito (venta_id);
create index if not exists idx_pos_nd_ecf_pendientes on public.pos_notas_debito (ecf_estado) where ecf_estado in ('pendiente','En Cola','Enviado a la DGII','En Proceso');

-- La tarea de seguimiento también mira las notas de débito (se reemplaza la de 20261026040000 con el mismo nombre)
select cron.schedule('ecf-seguimiento-15min', '*/15 * * * *', $cron$
  select net.http_post(
    url := 'https://tnwsgcxurfyuszxsewsn.supabase.co/functions/v1/ecf-mseller',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(select valor from public.cron_secretos where nombre='ecf_seguimiento')),
    body := '{"accion":"seguimiento"}'::jsonb
  )
  where exists (select 1 from public.pos_ventas where ecf_estado in ('En Cola','Enviado a la DGII','En Proceso') or (ecf_estado = 'pendiente' and ncf like 'E%'))
     or exists (select 1 from public.pos_devoluciones where ecf_estado in ('En Cola','Enviado a la DGII','En Proceso') or (ecf_estado = 'pendiente' and ncf like 'E%'))
     or exists (select 1 from public.pos_notas_debito where ecf_estado in ('En Cola','Enviado a la DGII','En Proceso') or (ecf_estado = 'pendiente' and ncf like 'E%'));
$cron$);
