-- NEXUS PRO Seguros — bitácora de eliminación de chats WhatsApp.
-- Aplicada en producción el 2026-09-09 como whatsapp_admin_eliminar_chat_auditoria.

create table if not exists public.whatsapp_hilos_eliminaciones (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id),
  hilo_id uuid not null,
  cliente_id uuid,
  telefono_e164 text not null,
  nombre_perfil text,
  mensajes_count integer not null default 0,
  media_count integer not null default 0,
  motivo text,
  eliminado_por uuid not null,
  eliminado_por_nombre text,
  eliminado_at timestamptz not null default now(),
  media_cleanup_estado text not null default 'pendiente'
    check (media_cleanup_estado in ('pendiente','ok','parcial','error')),
  media_cleanup_error text
);

alter table public.whatsapp_hilos_eliminaciones enable row level security;

drop policy if exists whatsapp_hilos_eliminaciones_admin_select
  on public.whatsapp_hilos_eliminaciones;

create policy whatsapp_hilos_eliminaciones_admin_select
  on public.whatsapp_hilos_eliminaciones
  for select
  using (
    mi_rol() = 'admin'
    and mi_organizacion() = organizacion_id
    and organizacion_id = (
      select id from public.organizaciones where slug='nexus-pro'
    )
  );

revoke all on public.whatsapp_hilos_eliminaciones from public, anon, authenticated;
grant select on public.whatsapp_hilos_eliminaciones to authenticated;

create index if not exists whatsapp_hilos_eliminaciones_fecha_idx
  on public.whatsapp_hilos_eliminaciones (eliminado_at desc);

create index if not exists whatsapp_hilos_eliminaciones_hilo_idx
  on public.whatsapp_hilos_eliminaciones (hilo_id);
