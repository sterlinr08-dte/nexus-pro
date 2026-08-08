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
    raise exception 'IMEI_SIN_ORGANIZACION';
  end if;

  if v_esperados = 0 then
    return v_token;
  end if;

  -- Solo se liberan reservas vencidas que TODAVÍA no están ligadas a una venta.
  update public.pos_seriales
     set estado = 'disponible', reserva_token = null, reserva_hasta = null
   where organizacion_id = v_org
     and estado = 'reservado'
     and reserva_hasta is not null
     and reserva_hasta < now()
     and venta_id is null;

  -- UPDATE condicional: dos cajeros pueden haber visto el mismo IMEI, pero solo uno lo toma.
  update public.pos_seriales
     set estado = 'reservado',
         reserva_token = v_token,
         reserva_hasta = now() + interval '60 seconds'
   where organizacion_id = v_org
     and id = any(p_serial_ids)
     and estado = 'disponible'
     and venta_id is null;

  get diagnostics v_tomados = row_count;

  -- El RAISE revierte el UPDATE completo de esta llamada: nunca reserva solo parte del grupo.
  if v_tomados <> v_esperados then
    raise exception 'IMEI_NO_DISPONIBLE';
  end if;

  return v_token;
end;
$$;

create or replace function public.pos_confirmar_seriales_reservados(
  p_reserva_token uuid,
  p_venta_id uuid,
  p_esperados integer
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
    raise exception 'IMEI_SIN_ORGANIZACION';
  end if;

  if p_esperados is null or p_esperados < 1 then
    raise exception 'IMEI_CONFIRMACION_INVALIDA';
  end if;

  update public.pos_seriales
     set estado = 'vendido',
         venta_id = p_venta_id,
         reserva_token = null,
         reserva_hasta = null
   where organizacion_id = v_org
     and reserva_token = p_reserva_token
     and estado = 'reservado'
     -- Normalmente venta_id es NULL. Si una incidencia ya quedó fijada a esta misma venta,
     -- la confirmación sigue siendo reintentable e idempotente respecto a esa factura.
     and (venta_id is null or venta_id = p_venta_id);

  get diagnostics v_count = row_count;

  -- Nunca confirmar solo una parte: el RAISE revierte todo el UPDATE de esta RPC.
  if v_count <> p_esperados then
    raise exception 'IMEI_RESERVA_INCOMPLETA';
  end if;

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
    raise exception 'IMEI_SIN_ORGANIZACION';
  end if;

  -- Solo se libera una reserva que todavía NO pertenece a una venta real.
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

revoke execute on function public.pos_reservar_seriales(uuid[]) from public;
revoke execute on function public.pos_confirmar_seriales_reservados(uuid, uuid, integer) from public;
revoke execute on function public.pos_liberar_reserva_seriales(uuid) from public;

grant execute on function public.pos_reservar_seriales(uuid[]) to authenticated;
grant execute on function public.pos_confirmar_seriales_reservados(uuid, uuid, integer) to authenticated;
grant execute on function public.pos_liberar_reserva_seriales(uuid) to authenticated;

commit;
