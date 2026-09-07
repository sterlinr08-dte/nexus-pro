-- NEXUS PRO · Envío masivo de WhatsApp (reemplazo del flujo wa.me manual)
-- Separado a propósito de whatsapp_mensajes (log de las notificaciones automáticas por trigger,
-- fase 1) y de whatsapp_hilos/whatsapp_hilo_mensajes (inbox de dos vías, fase 2) -- esto es una
-- tercera cosa: tandas de envío disparadas a mano por un agente, con seguimiento de progreso.
--
-- PENDIENTE DE APLICAR (7-sep-2026): bloqueada por el clasificador de seguridad de Claude Code
-- (crea tablas nuevas en producción) -- el dueño tiene que correrla el mismo desde el SQL Editor
-- de Supabase (proyecto "NEXUS PRO Seguros", tnwsgcxurfyuszxsewsn). Ver CLAUDE.md, entrada
-- "Envío masivo de WhatsApp" (7-sep-2026) para los pasos exactos y qué hacer después.
-- Ya probada en un begin/rollback sin errores -- lista para aplicar tal cual.

create table public.whatsapp_envio_masivo_lotes (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id),
  tipo text not null check (tipo in ('factura', 'pago', 'vence')),
  total_destinatarios int not null default 0,
  enviados int not null default 0,
  fallidos int not null default 0,
  estado text not null default 'en_progreso' check (estado in ('en_progreso', 'completado')),
  creado_por_usuario_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.whatsapp_envio_masivo_lotes enable row level security;

create policy whatsapp_envio_masivo_lotes_lectura on public.whatsapp_envio_masivo_lotes
  for select
  using (mi_rol() is not null and mi_organizacion() = (select id from public.organizaciones where slug = 'nexus-pro'));

revoke all on public.whatsapp_envio_masivo_lotes from anon, authenticated;
grant select on public.whatsapp_envio_masivo_lotes to authenticated;

create table public.whatsapp_envio_masivo_destinatarios (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.whatsapp_envio_masivo_lotes(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'enviado', 'fallido')),
  error_detalle text,
  zernio_message_id text,
  enviado_at timestamptz,
  created_at timestamptz not null default now(),
  unique (lote_id, cliente_id)
);

alter table public.whatsapp_envio_masivo_destinatarios enable row level security;

create policy whatsapp_envio_masivo_destinatarios_lectura on public.whatsapp_envio_masivo_destinatarios
  for select
  using (mi_rol() is not null and mi_organizacion() = (select id from public.organizaciones where slug = 'nexus-pro'));

revoke all on public.whatsapp_envio_masivo_destinatarios from anon, authenticated;
grant select on public.whatsapp_envio_masivo_destinatarios to authenticated;

create index whatsapp_envio_masivo_destinatarios_pendientes_idx
  on public.whatsapp_envio_masivo_destinatarios (lote_id)
  where estado = 'pendiente';

-- RPC para crear un lote -- SECURITY DEFINER porque las tablas no tienen policy de INSERT para
-- authenticated a propósito (toda escritura pasa por acá o por la Edge Function con service_role).
-- Re-filtra a clientes activos con WhatsApp real como defensa en profundidad, aunque el frontend ya
-- filtra igual en waContactos() -- nunca confiar solo en el filtro del cliente.
create or replace function public.whatsapp_crear_lote_envio_masivo(p_tipo text, p_cliente_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_org uuid;
  v_lote_id uuid;
begin
  if mi_rol() is null then
    raise exception 'no autorizado';
  end if;
  select id into v_org from public.organizaciones where slug = 'nexus-pro';
  if mi_organizacion() <> v_org then
    raise exception 'no autorizado';
  end if;
  if p_tipo not in ('factura', 'pago', 'vence') then
    raise exception 'tipo invalido: %', p_tipo;
  end if;
  if p_cliente_ids is null or array_length(p_cliente_ids, 1) is null then
    raise exception 'sin destinatarios';
  end if;

  insert into public.whatsapp_envio_masivo_lotes (organizacion_id, tipo, creado_por_usuario_id)
  values (v_org, p_tipo, auth.uid())
  returning id into v_lote_id;

  insert into public.whatsapp_envio_masivo_destinatarios (lote_id, cliente_id)
  select v_lote_id, c.id
  from public.clientes c
  where c.id = any(p_cliente_ids) and c.activo and c.wa is not null and c.wa <> ''
  on conflict (lote_id, cliente_id) do nothing;

  update public.whatsapp_envio_masivo_lotes
    set total_destinatarios = (
      select count(*) from public.whatsapp_envio_masivo_destinatarios where lote_id = v_lote_id
    )
    where id = v_lote_id;

  return v_lote_id;
end;
$$;

revoke all on function public.whatsapp_crear_lote_envio_masivo(text, uuid[]) from public, anon;
grant execute on function public.whatsapp_crear_lote_envio_masivo(text, uuid[]) to authenticated;
