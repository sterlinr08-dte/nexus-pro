-- NEXUS PRO · Inbox de WhatsApp de dos vías (fase 2)
-- Conversaciones reales con clientes (texto + imágenes/bauches) — separado a propósito de
-- whatsapp_mensajes (fase 1), que es solo un log de auditoría de las 3 notificaciones salientes
-- y tiene un CHECK que no encaja con conversación libre.

create table public.whatsapp_hilos (
  id uuid primary key default gen_random_uuid(),
  telefono_e164 text not null unique,
  cliente_id uuid references public.clientes(id),
  nombre_perfil text,
  asignado_agente_id uuid references public.agentes(id),
  ultimo_mensaje_at timestamptz,
  ultimo_mensaje_preview text,
  ultimo_inbound_at timestamptz,
  ultima_respuesta_humana_at timestamptz,
  no_leidos_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.whatsapp_hilos enable row level security;

create policy whatsapp_hilos_lectura on public.whatsapp_hilos
  for select
  using (mi_rol() is not null and mi_organizacion() = (select id from public.organizaciones where slug = 'nexus-pro'));

revoke all on public.whatsapp_hilos from anon, authenticated;
grant select on public.whatsapp_hilos to authenticated;

create table public.whatsapp_hilo_mensajes (
  id uuid primary key default gen_random_uuid(),
  hilo_id uuid not null references public.whatsapp_hilos(id) on delete cascade,
  direccion text not null check (direccion in ('in', 'out')),
  tipo_contenido text not null default 'text' check (tipo_contenido in ('text', 'imagen', 'audio', 'video', 'documento', 'ubicacion', 'contacto')),
  cuerpo text,
  media_path text,
  wa_message_id text,
  responde_a_id uuid references public.whatsapp_hilo_mensajes(id),
  estado text not null default 'recibido' check (estado in ('recibido', 'enviando', 'enviado', 'entregado', 'leido', 'fallido')),
  error_detalle text,
  enviado_por_agente_id uuid references public.agentes(id),
  revision_pago_estado text not null default 'ninguna' check (revision_pago_estado in ('ninguna', 'pendiente', 'aplicado', 'descartado')),
  abono_id uuid references public.abonos(id),
  created_at timestamptz not null default now()
);

alter table public.whatsapp_hilo_mensajes enable row level security;

create policy whatsapp_hilo_mensajes_lectura on public.whatsapp_hilo_mensajes
  for select
  using (mi_rol() is not null and mi_organizacion() = (select id from public.organizaciones where slug = 'nexus-pro'));

revoke all on public.whatsapp_hilo_mensajes from anon, authenticated;
grant select on public.whatsapp_hilo_mensajes to authenticated;

create index whatsapp_hilo_mensajes_hilo_idx on public.whatsapp_hilo_mensajes (hilo_id, created_at desc);
create unique index whatsapp_hilo_mensajes_wa_id_idx on public.whatsapp_hilo_mensajes (wa_message_id) where wa_message_id is not null;
create index whatsapp_hilo_mensajes_revision_idx on public.whatsapp_hilo_mensajes (revision_pago_estado) where revision_pago_estado = 'pendiente';

-- Tiempo real: sin esto, Realtime no manda nada aunque el resto este bien.
alter publication supabase_realtime add table public.whatsapp_hilos;
alter publication supabase_realtime add table public.whatsapp_hilo_mensajes;

-- RPC para marcar un bauche revisado (aplicado o descartado). SECURITY DEFINER porque las
-- tablas no tienen policy de UPDATE para authenticated a proposito -- toda escritura pasa por
-- aca o por las Edge Functions (service role). Idempotente: no revierte un estado ya resuelto.
create or replace function public.whatsapp_resolver_revision_pago(p_mensaje_id uuid, p_estado text, p_abono_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_mensaje public.whatsapp_hilo_mensajes%rowtype;
begin
  if mi_rol() is null or mi_organizacion() <> (select id from public.organizaciones where slug = 'nexus-pro') then
    raise exception 'no autorizado';
  end if;
  if p_estado not in ('aplicado', 'descartado') then
    raise exception 'estado invalido: %', p_estado;
  end if;

  select * into v_mensaje from public.whatsapp_hilo_mensajes where id = p_mensaje_id;
  if v_mensaje.id is null then
    raise exception 'mensaje no encontrado';
  end if;

  if v_mensaje.revision_pago_estado <> 'pendiente' then
    return;
  end if;

  update public.whatsapp_hilo_mensajes
    set revision_pago_estado = p_estado, abono_id = p_abono_id
    where id = p_mensaje_id;
end;
$$;

revoke all on function public.whatsapp_resolver_revision_pago(uuid, text, uuid) from public, anon;
grant execute on function public.whatsapp_resolver_revision_pago(uuid, text, uuid) to authenticated;

-- Bucket PRIVADO para medios entrantes de WhatsApp -- a proposito, no reusar "comprobantes"
-- (publico, hallazgo de seguridad ya reportado) ni "documentos" (privado pero compartido entre
-- todos los negocios de este proyecto Supabase).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('whatsapp-inbox-media', 'whatsapp-inbox-media', false, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'audio/ogg', 'audio/mpeg', 'video/mp4', 'application/pdf'])
on conflict (id) do nothing;

create policy whatsapp_inbox_media_lectura on storage.objects
  for select
  using (bucket_id = 'whatsapp-inbox-media' and mi_rol() is not null and mi_organizacion() = (select id from public.organizaciones where slug = 'nexus-pro'));
