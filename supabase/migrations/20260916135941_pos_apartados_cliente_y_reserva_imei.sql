-- NEXUS PRO POS · apartados enlazados a cliente + reserva de IMEI

alter table public.pos_apartados
  add column if not exists cliente_id uuid,
  add column if not exists almacen_id uuid,
  add column if not exists serial_id uuid references public.pos_seriales(id) on delete restrict;

create index if not exists pos_apartados_cliente_idx on public.pos_apartados(organizacion_id,cliente_id,estado);
create unique index if not exists pos_apartados_serial_activo_uidx
  on public.pos_apartados(organizacion_id,serial_id)
  where serial_id is not null and estado not in ('cancelado','entregado','vencido');

create or replace function public.pos_apartado_reservar_imei(
  p_apartado_id uuid,p_cliente_id uuid,p_almacen_id uuid,p_serial_id uuid
) returns boolean
language plpgsql security invoker set search_path=public as $$
declare v_org uuid:=mi_organizacion(); v_a public.pos_apartados%rowtype; v_s public.pos_seriales%rowtype; v_hasta timestamptz;
begin
  if mi_rol() not in ('admin','gerente','cajero') then raise exception 'APARTADO_SIN_PERMISO'; end if;
  select * into v_a from public.pos_apartados where id=p_apartado_id and organizacion_id=v_org for update;
  if v_a.id is null then raise exception 'APARTADO_NO_ENCONTRADO'; end if;
  if lower(coalesce(v_a.estado,'')) in ('cancelado','entregado','vencido') then raise exception 'APARTADO_NO_ACTIVO'; end if;
  if p_cliente_id is null or not exists(select 1 from public.pos_clientes where id=p_cliente_id and organizacion_id=v_org and coalesce(activo,true)) then raise exception 'APARTADO_CLIENTE_INVALIDO'; end if;
  if p_serial_id is not null then
    select * into v_s from public.pos_seriales where id=p_serial_id and organizacion_id=v_org for update;
    if v_s.id is null or v_s.producto_id<>v_a.producto_id then raise exception 'APARTADO_IMEI_INVALIDO'; end if;
    if p_almacen_id is not null and v_s.almacen_id is distinct from p_almacen_id then raise exception 'APARTADO_IMEI_OTRO_ALMACEN'; end if;
    if v_s.estado='vendido' then raise exception 'APARTADO_IMEI_VENDIDO'; end if;
    if v_s.estado='reservado' and v_s.reserva_token is distinct from v_a.id then raise exception 'APARTADO_IMEI_YA_RESERVADO'; end if;
    v_hasta:=coalesce(v_a.fecha_limite,current_date+30)::timestamptz + interval '1 day' - interval '1 second';
    update public.pos_seriales set estado='reservado',reserva_token=v_a.id,reserva_hasta=v_hasta where id=v_s.id;
  end if;
  update public.pos_apartados set cliente_id=p_cliente_id,almacen_id=p_almacen_id,serial_id=p_serial_id where id=v_a.id;
  return true;
end; $$;

create or replace function public.pos_apartado_liberar_reserva(p_apartado_id uuid,p_estado text default 'cancelado')
returns boolean
language plpgsql security invoker set search_path=public as $$
declare v_org uuid:=mi_organizacion(); v_a public.pos_apartados%rowtype; v_estado text:=lower(trim(coalesce(p_estado,'')));
begin
  if mi_rol() not in ('admin','gerente','cajero') then raise exception 'APARTADO_SIN_PERMISO'; end if;
  if v_estado not in ('cancelado','vencido','entregado') then raise exception 'APARTADO_ESTADO_INVALIDO'; end if;
  select * into v_a from public.pos_apartados where id=p_apartado_id and organizacion_id=v_org for update;
  if v_a.id is null then raise exception 'APARTADO_NO_ENCONTRADO'; end if;
  if v_a.serial_id is not null then
    update public.pos_seriales
    set estado='disponible',reserva_token=null,reserva_hasta=null
    where id=v_a.serial_id and organizacion_id=v_org and estado='reservado' and reserva_token=v_a.id;
  end if;
  update public.pos_apartados set estado=v_estado where id=v_a.id;
  return true;
end; $$;

create or replace function public.pos_apartado_expirar_vencidos()
returns integer
language plpgsql security invoker set search_path=public as $$
declare v_org uuid:=mi_organizacion(); r record; n integer:=0;
begin
  if mi_rol() not in ('admin','gerente','cajero') then raise exception 'APARTADO_SIN_PERMISO'; end if;
  for r in select id from public.pos_apartados where organizacion_id=v_org and fecha_limite<current_date and lower(coalesce(estado,'')) not in ('cancelado','entregado','vencido') for update
  loop
    perform public.pos_apartado_liberar_reserva(r.id,'vencido'); n:=n+1;
  end loop;
  return n;
end; $$;

revoke all on function public.pos_apartado_reservar_imei(uuid,uuid,uuid,uuid) from public,anon;
revoke all on function public.pos_apartado_liberar_reserva(uuid,text) from public,anon;
revoke all on function public.pos_apartado_expirar_vencidos() from public,anon;
grant execute on function public.pos_apartado_reservar_imei(uuid,uuid,uuid,uuid) to authenticated;
grant execute on function public.pos_apartado_liberar_reserva(uuid,text) to authenticated;
grant execute on function public.pos_apartado_expirar_vencidos() to authenticated;
