-- NEXUS PRO · WhatsApp «con las características del original» (58.94)
-- Idempotente. Amplía whatsapp_hilo_mensajes / whatsapp_hilos con lo que el Inbox necesita para
-- pintar reacciones del cliente, stickers, ubicación/contacto estructurados, hora de entregado/leído,
-- destacados, «borrar para mí», fijar/archivar/silenciar y el resumen del último mensaje en la lista.
-- No toca dinero: revision_pago_estado y abono_id quedan como estaban.

-- ---------------------------------------------------------------------------------------------
-- whatsapp_hilo_mensajes
-- ---------------------------------------------------------------------------------------------
alter table public.whatsapp_hilo_mensajes
  add column if not exists reaccion_cliente text,
  add column if not exists meta jsonb not null default '{}'::jsonb,
  add column if not exists entregado_at timestamptz,
  add column if not exists leido_at timestamptz,
  add column if not exists destacado_at timestamptz,
  add column if not exists destacado_por uuid,
  add column if not exists oculto_at timestamptz,
  add column if not exists oculto_por uuid,
  add column if not exists reenviado boolean not null default false;

alter table public.whatsapp_hilo_mensajes
  drop constraint if exists whatsapp_hilo_mensajes_reaccion_cliente_largo_chk;
alter table public.whatsapp_hilo_mensajes
  add constraint whatsapp_hilo_mensajes_reaccion_cliente_largo_chk
  check (reaccion_cliente is null or char_length(reaccion_cliente) <= 16);

alter table public.whatsapp_hilo_mensajes
  drop constraint if exists whatsapp_hilo_mensajes_meta_objeto_chk;
alter table public.whatsapp_hilo_mensajes
  add constraint whatsapp_hilo_mensajes_meta_objeto_chk
  check (jsonb_typeof(meta) = 'object');

-- El CHECK original se creó inline en fase 2, así que Postgres le puso el nombre por defecto.
alter table public.whatsapp_hilo_mensajes
  drop constraint if exists whatsapp_hilo_mensajes_tipo_contenido_check;
alter table public.whatsapp_hilo_mensajes
  drop constraint if exists whatsapp_hilo_mensajes_tipo_contenido_chk;
alter table public.whatsapp_hilo_mensajes
  add constraint whatsapp_hilo_mensajes_tipo_contenido_chk
  check (tipo_contenido in ('text', 'imagen', 'audio', 'video', 'documento', 'ubicacion', 'contacto', 'sticker'));

comment on column public.whatsapp_hilo_mensajes.reaccion_cliente is 'Emoji con el que el cliente reaccionó (evento reaction.received de Zernio). reaccion_agente es la nuestra.';
comment on column public.whatsapp_hilo_mensajes.meta is 'Datos estructurados: media{mime,nombre,tamano}, ubicacion{lat,lng,nombre,direccion}, contactos[{nombre,telefonos[]}], adjuntos_extra[], plantilla{}.';
comment on column public.whatsapp_hilo_mensajes.oculto_at is '«Borrar para mí»: se deja de pintar en NEXUS; el cliente lo sigue viendo. No cuenta como último mensaje del hilo.';
comment on column public.whatsapp_hilo_mensajes.reenviado is 'Etiqueta «Reenviado» cuando el agente reenvía desde otro chat.';

create index if not exists whatsapp_hilo_mensajes_destacado_idx
  on public.whatsapp_hilo_mensajes (destacado_at desc)
  where destacado_at is not null;

create index if not exists whatsapp_hilo_mensajes_oculto_idx
  on public.whatsapp_hilo_mensajes (hilo_id, oculto_at)
  where oculto_at is not null;

-- ---------------------------------------------------------------------------------------------
-- whatsapp_hilos
-- ---------------------------------------------------------------------------------------------
alter table public.whatsapp_hilos
  add column if not exists fijado_at timestamptz,
  add column if not exists archivado_at timestamptz,
  add column if not exists silenciado_hasta timestamptz,
  add column if not exists ultimo_mensaje_id uuid,
  add column if not exists ultimo_mensaje_direccion text,
  add column if not exists ultimo_mensaje_tipo text,
  add column if not exists ultimo_mensaje_estado text;

comment on column public.whatsapp_hilos.silenciado_hasta is 'null = no silenciado; ''infinity'' = siempre. Solo afecta al frontend (sonido/badge).';
comment on column public.whatsapp_hilos.ultimo_mensaje_id is 'Último mensaje NO oculto por created_at. Lo mantiene whatsapp_hilo_mensajes_ultimo_trg; ultimo_mensaje_at/preview los siguen escribiendo el webhook y enviar.';

create index if not exists whatsapp_hilos_fijado_idx
  on public.whatsapp_hilos (fijado_at desc)
  where fijado_at is not null;

create index if not exists whatsapp_hilos_archivado_idx
  on public.whatsapp_hilos (archivado_at desc)
  where archivado_at is not null;

-- ---------------------------------------------------------------------------------------------
-- Trigger: resumen del último mensaje visible en el hilo
-- ---------------------------------------------------------------------------------------------
-- Un solo SELECT (usa whatsapp_hilo_mensajes_hilo_idx) + un UPDATE condicionado, por fila insertada
-- o por cambio de estado/oculto_at. El WHERE con IS DISTINCT FROM evita escribir (y disparar
-- Realtime) cuando nada cambió, p. ej. un delivered de un mensaje que ya no es el último.
create or replace function public.whatsapp_hilo_mensajes_ultimo_fn()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_ultimo record;
begin
  select id, direccion, tipo_contenido, estado
    into v_ultimo
    from public.whatsapp_hilo_mensajes
   where hilo_id = new.hilo_id
     and oculto_at is null
   order by created_at desc, id desc
   limit 1;

  update public.whatsapp_hilos
     set ultimo_mensaje_id = v_ultimo.id,
         ultimo_mensaje_direccion = v_ultimo.direccion,
         ultimo_mensaje_tipo = v_ultimo.tipo_contenido,
         ultimo_mensaje_estado = v_ultimo.estado
   where id = new.hilo_id
     and (ultimo_mensaje_id is distinct from v_ultimo.id
       or ultimo_mensaje_direccion is distinct from v_ultimo.direccion
       or ultimo_mensaje_tipo is distinct from v_ultimo.tipo_contenido
       or ultimo_mensaje_estado is distinct from v_ultimo.estado);
  return null;
end;
$$;

drop trigger if exists whatsapp_hilo_mensajes_ultimo_trg on public.whatsapp_hilo_mensajes;
create trigger whatsapp_hilo_mensajes_ultimo_trg
  after insert or update of estado, oculto_at on public.whatsapp_hilo_mensajes
  for each row execute function public.whatsapp_hilo_mensajes_ultimo_fn();

-- Backfill de las 4 columnas nuevas (una sola pasada; ~415 mensajes en producción).
update public.whatsapp_hilos h
   set ultimo_mensaje_id = u.id,
       ultimo_mensaje_direccion = u.direccion,
       ultimo_mensaje_tipo = u.tipo_contenido,
       ultimo_mensaje_estado = u.estado
  from (
    select distinct on (hilo_id) hilo_id, id, direccion, tipo_contenido, estado
      from public.whatsapp_hilo_mensajes
     where oculto_at is null
     order by hilo_id, created_at desc, id desc
  ) u
 where u.hilo_id = h.id
   and h.ultimo_mensaje_id is distinct from u.id;

-- ---------------------------------------------------------------------------------------------
-- RPC (security definer; RLS sigue sin UPDATE para authenticated)
-- ---------------------------------------------------------------------------------------------
-- Versionada tal cual está en producción (se aplicó en vivo el 2026-09-08).
create or replace function public.whatsapp_marcar_hilo_leido(p_hilo_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if mi_rol() is null or mi_organizacion() <> (select id from public.organizaciones where slug = 'nexus-pro') then
    raise exception 'no autorizado';
  end if;

  update public.whatsapp_hilos
     set no_leidos_count = 0,
         updated_at = now()
   where id = p_hilo_id;
end;
$$;

create or replace function public.whatsapp_mensaje_destacar(p_mensaje_id uuid, p_destacar boolean)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if mi_rol() is null or mi_organizacion() <> (select id from public.organizaciones where slug = 'nexus-pro') then
    raise exception 'no autorizado';
  end if;

  update public.whatsapp_hilo_mensajes
     set destacado_at = case when p_destacar then coalesce(destacado_at, now()) else null end,
         destacado_por = case when p_destacar then coalesce(destacado_por, auth.uid()) else null end
   where id = p_mensaje_id;
end;
$$;

-- «Borrar para mí». enviado_por_agente_id apunta a agentes (no a auth.uid()), y el nombre del
-- agente se resuelve por texto en las Edge Functions, así que no hay forma fiable de saber en SQL
-- si «yo» soy quien lo envió. Regla adoptada: cualquier rol de la organización puede ocultar
-- mensajes salientes ('out'); los entrantes ('in') solo admin/gerente. Idempotente.
create or replace function public.whatsapp_mensaje_ocultar(p_mensaje_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_direccion text;
  v_oculto_at timestamptz;
begin
  if mi_rol() is null or mi_organizacion() <> (select id from public.organizaciones where slug = 'nexus-pro') then
    raise exception 'no autorizado';
  end if;

  select direccion, oculto_at into v_direccion, v_oculto_at
    from public.whatsapp_hilo_mensajes where id = p_mensaje_id;
  if v_direccion is null then
    raise exception 'mensaje no encontrado';
  end if;
  if v_oculto_at is not null then
    return;
  end if;
  if v_direccion = 'in' and mi_rol() not in ('admin', 'gerente') then
    raise exception 'solo admin o gerente pueden ocultar mensajes del cliente';
  end if;

  update public.whatsapp_hilo_mensajes
     set oculto_at = now(),
         oculto_por = auth.uid()
   where id = p_mensaje_id;
end;
$$;

create or replace function public.whatsapp_mensajes_destacados(p_hilo_id uuid default null)
returns setof public.whatsapp_hilo_mensajes
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if mi_rol() is null or mi_organizacion() <> (select id from public.organizaciones where slug = 'nexus-pro') then
    raise exception 'no autorizado';
  end if;

  return query
    select m.*
      from public.whatsapp_hilo_mensajes m
     where m.destacado_at is not null
       and m.oculto_at is null
       and (p_hilo_id is null or m.hilo_id = p_hilo_id)
     order by m.destacado_at desc, m.created_at desc;
end;
$$;

create or replace function public.whatsapp_hilo_fijar(p_hilo_id uuid, p_fijar boolean)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if mi_rol() is null or mi_organizacion() <> (select id from public.organizaciones where slug = 'nexus-pro') then
    raise exception 'no autorizado';
  end if;

  update public.whatsapp_hilos
     set fijado_at = case when p_fijar then coalesce(fijado_at, now()) else null end,
         updated_at = now()
   where id = p_hilo_id;
end;
$$;

create or replace function public.whatsapp_hilo_archivar(p_hilo_id uuid, p_archivar boolean)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if mi_rol() is null or mi_organizacion() <> (select id from public.organizaciones where slug = 'nexus-pro') then
    raise exception 'no autorizado';
  end if;

  -- Archivar quita el fijado: un chat no puede estar arriba de la lista y fuera de ella a la vez.
  update public.whatsapp_hilos
     set archivado_at = case when p_archivar then coalesce(archivado_at, now()) else null end,
         fijado_at = case when p_archivar then null else fijado_at end,
         updated_at = now()
   where id = p_hilo_id;
end;
$$;

create or replace function public.whatsapp_hilo_silenciar(p_hilo_id uuid, p_hasta timestamptz)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if mi_rol() is null or mi_organizacion() <> (select id from public.organizaciones where slug = 'nexus-pro') then
    raise exception 'no autorizado';
  end if;

  update public.whatsapp_hilos
     set silenciado_hasta = p_hasta,
         updated_at = now()
   where id = p_hilo_id;
end;
$$;

revoke all on function public.whatsapp_marcar_hilo_leido(uuid) from public, anon;
revoke all on function public.whatsapp_mensaje_destacar(uuid, boolean) from public, anon;
revoke all on function public.whatsapp_mensaje_ocultar(uuid) from public, anon;
revoke all on function public.whatsapp_mensajes_destacados(uuid) from public, anon;
revoke all on function public.whatsapp_hilo_fijar(uuid, boolean) from public, anon;
revoke all on function public.whatsapp_hilo_archivar(uuid, boolean) from public, anon;
revoke all on function public.whatsapp_hilo_silenciar(uuid, timestamptz) from public, anon;

grant execute on function public.whatsapp_marcar_hilo_leido(uuid) to authenticated;
grant execute on function public.whatsapp_mensaje_destacar(uuid, boolean) to authenticated;
grant execute on function public.whatsapp_mensaje_ocultar(uuid) to authenticated;
grant execute on function public.whatsapp_mensajes_destacados(uuid) to authenticated;
grant execute on function public.whatsapp_hilo_fijar(uuid, boolean) to authenticated;
grant execute on function public.whatsapp_hilo_archivar(uuid, boolean) to authenticated;
grant execute on function public.whatsapp_hilo_silenciar(uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Bucket: lo que el clip y la nota de voz ya permiten enviar (docx/xlsx/pptx/txt/csv, m4a/webm,
-- gif, 3gp) tiene que poder guardarse cuando vuelve por webhook o se sube desde enviar.
-- ---------------------------------------------------------------------------------------------
update storage.buckets
   set allowed_mime_types = array[
     'image/jpeg', 'image/png', 'image/webp', 'image/gif',
     'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/amr', 'audio/webm', 'audio/x-m4a',
     'video/mp4', 'video/3gpp',
     'application/pdf', 'text/plain', 'text/csv',
     'application/msword',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
     'application/vnd.ms-excel',
     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
     'application/vnd.ms-powerpoint',
     'application/vnd.openxmlformats-officedocument.presentationml.presentation',
     'application/zip'
   ]
 where id = 'whatsapp-inbox-media';
