-- NEXUS PRO POS · una caja abierta por cajero, cierre calculado en servidor.

alter table public.pos_cajas add column if not exists usuario_id uuid references auth.users(id) on delete set null;
alter table public.pos_cajas add column if not exists usuario_nombre text;

-- Recupera propietario por nombre cuando sea posible.
update public.pos_cajas c
set usuario_id = pr.id,
    usuario_nombre = us.nom
from public.usuarios_sistema us
join public.profiles pr on pr.usuario_sistema_id = us.id
where c.usuario_id is null
  and us.organizacion_id = c.organizacion_id
  and (lower(us.nom) = lower(coalesce(c.created_by_name,''))
       or lower(us.login) = lower(coalesce(c.created_by_name,'')));

-- Respaldo seguro para organizaciones con un solo administrador autenticado.
update public.pos_cajas c
set usuario_id = x.auth_id,
    usuario_nombre = x.nom
from (
  select us.organizacion_id, min(pr.id::text)::uuid as auth_id, min(us.nom) as nom
  from public.usuarios_sistema us
  join public.profiles pr on pr.usuario_sistema_id = us.id
  where us.rol = 'admin' and us.activo
  group by us.organizacion_id
  having count(*) = 1
) x
where c.usuario_id is null and x.organizacion_id=c.organizacion_id and x.auth_id is not null;

create unique index if not exists pos_cajas_una_abierta_por_usuario_uidx
  on public.pos_cajas (organizacion_id, usuario_id)
  where estado = 'abierta' and usuario_id is not null;

create index if not exists pos_cajas_usuario_fecha_idx
  on public.pos_cajas (organizacion_id, usuario_id, apertura desc);

create or replace function public.nx_caja_asignar_propietario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := public.mi_organizacion();
begin
  if auth.uid() is null or v_org is null then raise exception 'CAJA_SIN_SESION'; end if;
  new.organizacion_id := v_org;
  new.usuario_id := auth.uid();
  select us.nom into new.usuario_nombre
  from public.profiles pr join public.usuarios_sistema us on us.id=pr.usuario_sistema_id
  where pr.id=auth.uid() and us.activo limit 1;
  new.created_by_name := coalesce(new.usuario_nombre, new.created_by_name, 'Sistema');
  new.estado := 'abierta';
  return new;
end;
$$;

drop trigger if exists trg_nx_caja_asignar_propietario on public.pos_cajas;
create trigger trg_nx_caja_asignar_propietario
before insert on public.pos_cajas
for each row execute function public.nx_caja_asignar_propietario();

create or replace function public.nx_caja_proteger_actualizacion()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then return new; end if;
  if auth.uid() is null or old.usuario_id is distinct from auth.uid() then
    raise exception 'CAJA_NO_PERTENECE_AL_USUARIO';
  end if;
  if old.estado = 'cerrada' then raise exception 'CAJA_YA_CERRADA'; end if;
  if new.estado = 'cerrada' and coalesce(current_setting('nx.caja_cierre_rpc', true),'') <> '1' then
    raise exception 'CAJA_CIERRE_USE_RPC';
  end if;
  if new.estado = 'abierta' and (
    new.monto_inicial is distinct from old.monto_inicial or
    new.ventas_efectivo is distinct from old.ventas_efectivo or
    new.ventas_tarjeta is distinct from old.ventas_tarjeta or
    new.ventas_transferencia is distinct from old.ventas_transferencia or
    new.ventas_credito is distinct from old.ventas_credito or
    new.abonos_efectivo is distinct from old.abonos_efectivo or
    new.entradas is distinct from old.entradas or new.salidas is distinct from old.salidas or
    new.efectivo_esperado is distinct from old.efectivo_esperado or
    new.efectivo_contado is distinct from old.efectivo_contado or
    new.descuadre is distinct from old.descuadre
  ) then raise exception 'CAJA_TOTALES_INMUTABLES_HASTA_CIERRE'; end if;
  return new;
end;
$$;

drop trigger if exists trg_nx_caja_proteger_actualizacion on public.pos_cajas;
create trigger trg_nx_caja_proteger_actualizacion
before update on public.pos_cajas
for each row execute function public.nx_caja_proteger_actualizacion();

create or replace function public.nx_validar_caja_propietario()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare v_caja public.pos_cajas%rowtype;
begin
  if new.caja_id is null or auth.role() = 'service_role' then return new; end if;
  select * into v_caja from public.pos_cajas where id=new.caja_id;
  if v_caja.id is null or v_caja.estado <> 'abierta' or
     v_caja.organizacion_id is distinct from public.mi_organizacion() or
     v_caja.usuario_id is distinct from auth.uid() then
    raise exception 'CAJA_AJENA_O_CERRADA';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_nx_validar_caja_venta on public.pos_ventas;
create trigger trg_nx_validar_caja_venta before insert or update on public.pos_ventas
for each row execute function public.nx_validar_caja_propietario();
drop trigger if exists trg_nx_validar_caja_abono on public.pos_abonos;
create trigger trg_nx_validar_caja_abono before insert or update on public.pos_abonos
for each row execute function public.nx_validar_caja_propietario();
drop trigger if exists trg_nx_validar_caja_movimiento on public.pos_caja_movimientos;
create trigger trg_nx_validar_caja_movimiento before insert or update on public.pos_caja_movimientos
for each row execute function public.nx_validar_caja_propietario();

create or replace function public.pos_abrir_mi_caja(p_monto_inicial numeric)
returns public.pos_cajas
language plpgsql security invoker set search_path=public
as $$
declare v_caja public.pos_cajas%rowtype;
begin
  if public.mi_rol() is null then raise exception 'CAJA_SIN_PERMISO'; end if;
  if coalesce(p_monto_inicial,0) < 0 then raise exception 'CAJA_MONTO_INICIAL_INVALIDO'; end if;
  if exists(select 1 from public.pos_cajas where organizacion_id=public.mi_organizacion() and usuario_id=auth.uid() and estado='abierta') then
    raise exception 'CAJA_USUARIO_YA_TIENE_ABIERTA';
  end if;
  insert into public.pos_cajas(monto_inicial) values(coalesce(p_monto_inicial,0)) returning * into v_caja;
  return v_caja;
end; $$;

create or replace function public.pos_registrar_movimiento_mi_caja(p_caja_id uuid,p_tipo text,p_concepto text,p_monto numeric)
returns public.pos_caja_movimientos
language plpgsql security invoker set search_path=public
as $$
declare v_mov public.pos_caja_movimientos%rowtype;
begin
  if p_tipo not in ('entrada','salida') or coalesce(p_monto,0)<=0 then raise exception 'CAJA_MOVIMIENTO_INVALIDO'; end if;
  insert into public.pos_caja_movimientos(caja_id,tipo,concepto,monto,created_by_name,organizacion_id)
  select c.id,p_tipo,nullif(left(trim(coalesce(p_concepto,'')),300),''),p_monto,c.usuario_nombre,c.organizacion_id
  from public.pos_cajas c
  where c.id=p_caja_id and c.usuario_id=auth.uid() and c.organizacion_id=public.mi_organizacion() and c.estado='abierta'
  returning * into v_mov;
  if v_mov.id is null then raise exception 'CAJA_AJENA_O_CERRADA'; end if;
  return v_mov;
end; $$;

create or replace function public.pos_eliminar_movimiento_mi_caja(p_movimiento_id uuid)
returns uuid language plpgsql security invoker set search_path=public
as $$
declare v_id uuid;
begin
  delete from public.pos_caja_movimientos m using public.pos_cajas c
  where m.id=p_movimiento_id and c.id=m.caja_id and c.usuario_id=auth.uid()
    and c.organizacion_id=public.mi_organizacion() and c.estado='abierta'
  returning m.id into v_id;
  if v_id is null then raise exception 'CAJA_MOVIMIENTO_NO_ELIMINABLE'; end if;
  return v_id;
end; $$;

create or replace function public.pos_cerrar_mi_caja(p_caja_id uuid,p_efectivo_contado numeric,p_notas text default null)
returns public.pos_cajas
language plpgsql security invoker set search_path=public
as $$
declare
  v_caja public.pos_cajas%rowtype;
  v_efe numeric:=0; v_tar numeric:=0; v_tra numeric:=0; v_cre numeric:=0;
  v_abono numeric:=0; v_ent numeric:=0; v_sal numeric:=0; v_esperado numeric:=0;
begin
  if coalesce(p_efectivo_contado,0)<0 then raise exception 'CAJA_CONTEO_INVALIDO'; end if;
  select * into v_caja from public.pos_cajas
  where id=p_caja_id and usuario_id=auth.uid() and organizacion_id=public.mi_organizacion() and estado='abierta'
  for update;
  if v_caja.id is null then raise exception 'CAJA_AJENA_O_CERRADA'; end if;

  select coalesce(sum(pagado_efectivo),0),coalesce(sum(pagado_tarjeta),0),
         coalesce(sum(pagado_transferencia),0),coalesce(sum(credito_monto),0)
  into v_efe,v_tar,v_tra,v_cre from public.pos_ventas where caja_id=v_caja.id and estado='completada';
  select coalesce(sum(monto),0) into v_abono from public.pos_abonos where caja_id=v_caja.id and metodo ilike '%efectivo%';
  select coalesce(sum(monto) filter(where tipo='entrada'),0),coalesce(sum(monto) filter(where tipo='salida'),0)
  into v_ent,v_sal from public.pos_caja_movimientos where caja_id=v_caja.id;
  v_esperado:=v_caja.monto_inicial+v_efe+v_abono+v_ent-v_sal;

  perform set_config('nx.caja_cierre_rpc','1',true);
  update public.pos_cajas set estado='cerrada',cierre=now(),ventas_efectivo=v_efe,
    ventas_tarjeta=v_tar,ventas_transferencia=v_tra,ventas_credito=v_cre,
    abonos_efectivo=v_abono,entradas=v_ent,salidas=v_sal,efectivo_esperado=v_esperado,
    efectivo_contado=p_efectivo_contado,descuadre=p_efectivo_contado-v_esperado,
    notas=nullif(left(trim(coalesce(p_notas,'')),1000),'')
  where id=v_caja.id returning * into v_caja;
  return v_caja;
end; $$;

revoke all on function public.nx_caja_asignar_propietario() from public,anon,authenticated;
revoke all on function public.nx_caja_proteger_actualizacion() from public,anon,authenticated;
revoke all on function public.nx_validar_caja_propietario() from public,anon,authenticated;
revoke all on function public.pos_abrir_mi_caja(numeric) from public,anon;
revoke all on function public.pos_registrar_movimiento_mi_caja(uuid,text,text,numeric) from public,anon;
revoke all on function public.pos_eliminar_movimiento_mi_caja(uuid) from public,anon;
revoke all on function public.pos_cerrar_mi_caja(uuid,numeric,text) from public,anon;
grant execute on function public.pos_abrir_mi_caja(numeric) to authenticated;
grant execute on function public.pos_registrar_movimiento_mi_caja(uuid,text,text,numeric) to authenticated;
grant execute on function public.pos_eliminar_movimiento_mi_caja(uuid) to authenticated;
grant execute on function public.pos_cerrar_mi_caja(uuid,numeric,text) to authenticated;
