-- Sentry → WhatsApp del administrador (28-sep-2026).
-- Registro de avisos enviados, usado por sentry-alerta-whatsapp para no repetir el mismo error
-- (1 vez cada 6 h) ni pasar de 10 avisos por hora. Solo service_role: RLS activo sin políticas.
create table if not exists public.sentry_alertas_log (
  id bigserial primary key,
  issue_id text not null,
  proyecto text,
  enviados int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists sentry_alertas_log_issue_idx on public.sentry_alertas_log (issue_id, created_at desc);
alter table public.sentry_alertas_log enable row level security;
revoke all on public.sentry_alertas_log from anon, authenticated;

-- Token de las acciones internas (asegurar plantilla / prueba). Se genera aquí y nunca sale de la base.
insert into public.cron_secretos (nombre, valor)
select 'sentry_alerta', encode(extensions.gen_random_bytes(32), 'hex')
where not exists (select 1 from public.cron_secretos where nombre = 'sentry_alerta');
