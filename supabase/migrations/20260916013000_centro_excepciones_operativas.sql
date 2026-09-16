-- NEXUS PRO · Centro de excepciones operativas (sin eventos impositivos)
-- Convierte fallos críticos ya registrados en auditoria en pendientes gestionables.

create table if not exists public.operacion_excepciones (
  id uuid primary key default gen_random_uuid(),
  auditoria_id uuid unique references public.auditoria(id) on delete set null,
  organizacion_id uuid not null,
  tipo text not null,
  modulo text not null,
  severidad text not null check (severidad in ('alta','critica')),
  estado text not null default 'abierta' check (estado in ('abierta','resuelta')),
  detalle text,
  detectada_en timestamptz not null default now(),
  resuelta_en timestamptz,
  resuelta_por uuid references auth.users(id) on delete set null,
  nota_resolucion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operacion_excepciones_resolucion_completa check (
    (estado = 'abierta' and resuelta_en is null and resuelta_por is null and nota_resolucion is null)
    or
    (estado = 'resuelta' and resuelta_en is not null and resuelta_por is not null and length(trim(nota_resolucion)) >= 8)
  )
);

create index if not exists operacion_excepciones_org_estado_fecha_idx
  on public.operacion_excepciones (organizacion_id, estado, detectada_en desc);

alter table public.operacion_excepciones enable row level security;

drop policy if exists operacion_excepciones_lectura_org on public.operacion_excepciones;
create policy operacion_excepciones_lectura_org
on public.operacion_excepciones for select to authenticated
using (public.mi_rol() is not null and organizacion_id = public.mi_organizacion());

drop policy if exists operacion_excepciones_cierre_admin on public.operacion_excepciones;
create policy operacion_excepciones_cierre_admin
on public.operacion_excepciones for update to authenticated
using (public.mi_rol() = 'admin' and organizacion_id = public.mi_organizacion())
with check (public.mi_rol() = 'admin' and organizacion_id = public.mi_organizacion());

create or replace function public.nx_capturar_excepcion_operativa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_severidad text;
begin
  if new.accion not in (
    'POS_VENTA_IMEI_SIN_CONFIRMAR',
    'POS_VENTA_ITEMS_INCOMPLETOS',
    'REP_ENTREGA_INCOMPLETA',
    'POS_VENTA_INVENTARIO_PENDIENTE',
    'ASIENTO_DESCUADRADO'
  ) then
    return new;
  end if;

  v_severidad := case
    when new.accion = 'REP_ENTREGA_INCOMPLETA' then 'alta'
    else 'critica'
  end;

  insert into public.operacion_excepciones (
    auditoria_id, organizacion_id, tipo, modulo, severidad, detalle, detectada_en
  ) values (
    new.id,
    new.organizacion_id,
    new.accion,
    coalesce(nullif(new.modulo, ''), 'Sistema'),
    v_severidad,
    new.detalle,
    coalesce(new.created_at, nullif(new.ts, '')::timestamptz, now())
  )
  on conflict (auditoria_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_nx_capturar_excepcion_operativa on public.auditoria;
create trigger trg_nx_capturar_excepcion_operativa
after insert on public.auditoria
for each row execute function public.nx_capturar_excepcion_operativa();

-- Es una función de trigger, nunca una RPC pública.
revoke all on function public.nx_capturar_excepcion_operativa() from public;
revoke all on function public.nx_capturar_excepcion_operativa() from anon;
revoke all on function public.nx_capturar_excepcion_operativa() from authenticated;

-- Backfill idempotente por si ya hubiera eventos al instalar la migración.
insert into public.operacion_excepciones (
  auditoria_id, organizacion_id, tipo, modulo, severidad, detalle, detectada_en
)
select
  a.id,
  a.organizacion_id,
  a.accion,
  coalesce(nullif(a.modulo, ''), 'Sistema'),
  case when a.accion = 'REP_ENTREGA_INCOMPLETA' then 'alta' else 'critica' end,
  a.detalle,
  coalesce(a.created_at, nullif(a.ts, '')::timestamptz, now())
from public.auditoria a
where a.organizacion_id is not null
  and a.accion in (
    'POS_VENTA_IMEI_SIN_CONFIRMAR',
    'POS_VENTA_ITEMS_INCOMPLETOS',
    'REP_ENTREGA_INCOMPLETA',
    'POS_VENTA_INVENTARIO_PENDIENTE',
    'ASIENTO_DESCUADRADO'
  )
on conflict (auditoria_id) do nothing;

create or replace function public.resolver_excepcion_operativa(
  p_excepcion_id uuid,
  p_nota text
)
returns public.operacion_excepciones
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_excepcion public.operacion_excepciones%rowtype;
  v_usuario text;
begin
  if public.mi_rol() <> 'admin' then
    raise exception 'Solo un administrador puede cerrar excepciones';
  end if;
  if length(trim(coalesce(p_nota, ''))) < 8 then
    raise exception 'La nota de resolución debe tener al menos 8 caracteres';
  end if;

  update public.operacion_excepciones
     set estado = 'resuelta',
         resuelta_en = now(),
         resuelta_por = auth.uid(),
         nota_resolucion = left(trim(p_nota), 1000),
         updated_at = now()
   where id = p_excepcion_id
     and estado = 'abierta'
     and organizacion_id = public.mi_organizacion()
  returning * into v_excepcion;

  if v_excepcion.id is null then
    raise exception 'La excepción no existe o ya fue resuelta';
  end if;

  select us.nom into v_usuario
  from public.profiles p
  join public.usuarios_sistema us on us.id = p.usuario_sistema_id
  where p.id = auth.uid()
  limit 1;

  insert into public.auditoria (
    ts, usuario, rol, accion, detalle, modulo,
    entity_table, entity_id, result, organizacion_id
  ) values (
    now()::text,
    coalesce(v_usuario, 'Administrador'),
    'admin',
    'EXCEPCION_OPERATIVA_RESUELTA',
    v_excepcion.tipo || ' · ' || left(trim(p_nota), 1000),
    'Operaciones',
    'operacion_excepciones',
    v_excepcion.id::text,
    'ok',
    v_excepcion.organizacion_id
  );

  return v_excepcion;
end;
$$;

revoke all on function public.resolver_excepcion_operativa(uuid,text) from public;
revoke all on function public.resolver_excepcion_operativa(uuid,text) from anon;
grant execute on function public.resolver_excepcion_operativa(uuid,text) to authenticated;

revoke all on table public.operacion_excepciones from anon;
grant select, update on table public.operacion_excepciones to authenticated;

