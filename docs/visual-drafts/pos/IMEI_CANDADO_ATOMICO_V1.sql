-- NEXUS PRO POS — Candado atómico de IMEI (BORRADOR PARA RAMA DE TRABAJO)
-- NO aplicar a producción sin autorización explícita.

begin;

alter table public.pos_seriales
  add column if not exists reserva_token uuid,
  add column if not exists reserva_hasta timestamptz;

alter table public.pos_seriales
  drop constraint if exists pos_seriales_estado_check;

alter table public.pos_seriales
  add constraint pos_seriales_estado_check
  check (estado in ('disponible','reservado','vendido'));

create or replace function public.pos_reservar_seriales(p_serial_ids uuid[])
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_org uuid := public.mi_organizacion();
  v_token uuid := gen_random_uuid();
  v_esperados integer := coalesce(array_length(p_serial_ids, 1), 0);
  v_tomados integer := 0;
begin
  if v_org is null then
    raise exception 'SIN_ORGANIZACION';
  end if;

  if v_esperados = 0 then
    return v_token;
  end if;

  update public.pos_seriales
     set estado = 'disponible', reserva_token = null, reserva_hasta = null
   where organizacion_id = v_org
     and estado = 'reservado'
     and reserva_hasta is not null
     and reserva_hasta < now()
     and venta_id is null;

  update public.pos_seriales
     set estado = 'reservado',
         reserva_token = v_token,
         reserva_hasta = now() + interval '5 minutes'
   where organizacion_id = v_org
     and id = any(p_serial_ids)
     and estado = 'disponible'
     and venta_id is null;

  get diagnostics v_tomados = row_count;

  if v_tomados <> v_esperados then
    raise exception 'IMEI_NO_DISPONIBLE';
  end if;

  return v_token;
end;
$$;

create or replace function public.pos_confirmar_seriales_reservados(
  p_reserva_token uuid,
  p_venta_id uuid
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_org uuid := public.mi_organizacion();
  v_count integer := 0;
begin
  if v_org is null then
    raise exception 'SIN_ORGANIZACION';
  end if;

  update public.pos_seriales
     set estado = 'vendido',
         venta_id = p_venta_id,
         reserva_token = null,
         reserva_hasta = null
   where organizacion_id = v_org
     and reserva_token = p_reserva_token
     and estado = 'reservado'
     and venta_id is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.pos_liberar_reserva_seriales(p_reserva_token uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_org uuid := public.mi_organizacion();
  v_count integer := 0;
begin
  if v_org is null then
    raise exception 'SIN_ORGANIZACION';
  end if;

  update public.pos_seriales
     set estado = 'disponible', reserva_token = null, reserva_hasta = null
   where organizacion_id = v_org
     and reserva_token = p_reserva_token
     and estado = 'reservado'
     and venta_id is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

commit;
