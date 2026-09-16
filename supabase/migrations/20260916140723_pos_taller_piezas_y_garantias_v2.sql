-- NEXUS PRO POS · taller: piezas de inventario + reclamos de garantía
create table if not exists public.pos_reparacion_piezas (
  id uuid primary key default gen_random_uuid(), organizacion_id uuid not null,
  reparacion_id uuid not null references public.pos_reparaciones(id) on delete restrict,
  producto_id uuid not null references public.pos_productos(id) on delete restrict,
  almacen_id uuid references public.pos_almacenes(id) on delete restrict,
  cantidad numeric not null check (cantidad>0), costo_unitario numeric not null default 0,
  estado text not null default 'reservada' check (estado in ('reservada','usada','devuelta')),
  reservada_at timestamptz not null default now(), usada_at timestamptz, devuelta_at timestamptz,
  creado_por uuid, created_at timestamptz not null default now()
);
create index if not exists pos_rep_piezas_rep_idx on public.pos_reparacion_piezas(organizacion_id,reparacion_id,estado);
create index if not exists pos_rep_piezas_prod_idx on public.pos_reparacion_piezas(organizacion_id,producto_id,almacen_id,estado);
alter table public.pos_reparaciones add column if not exists garantia_origen_id uuid references public.pos_reparaciones(id) on delete restrict,
  add column if not exists es_garantia boolean not null default false,
  add column if not exists garantia_cobro_autorizado boolean not null default false,
  add column if not exists garantia_cobro_motivo text,
  add column if not exists garantia_cobro_autorizado_por uuid;
create unique index if not exists pos_rep_garantia_activa_uidx on public.pos_reparaciones(organizacion_id,garantia_origen_id)
  where garantia_origen_id is not null and lower(coalesce(estado,'')) not in ('entregado','cancelado');
alter table public.pos_reparacion_piezas enable row level security;
drop policy if exists pos_rep_piezas_select on public.pos_reparacion_piezas;
create policy pos_rep_piezas_select on public.pos_reparacion_piezas for select to authenticated using (mi_rol() is not null and organizacion_id=mi_organizacion());
drop policy if exists pos_rep_piezas_write on public.pos_reparacion_piezas;
create policy pos_rep_piezas_write on public.pos_reparacion_piezas for all to authenticated
using (mi_rol() in ('admin','gerente','cajero') and organizacion_id=mi_organizacion())
with check (mi_rol() in ('admin','gerente','cajero') and organizacion_id=mi_organizacion());

create or replace function public.pos_rep_recalcular_costo_piezas(p_reparacion_id uuid) returns numeric
language plpgsql security invoker set search_path=public as $$ declare v_org uuid:=mi_organizacion(); v_total numeric; begin
select coalesce(sum(cantidad*costo_unitario),0) into v_total from public.pos_reparacion_piezas where organizacion_id=v_org and reparacion_id=p_reparacion_id and estado in ('reservada','usada');
update public.pos_reparaciones set costo_piezas=v_total where id=p_reparacion_id and organizacion_id=v_org; return v_total; end; $$;

create or replace function public.pos_rep_reservar_pieza(p_reparacion_id uuid,p_producto_id uuid,p_almacen_id uuid,p_cantidad numeric) returns uuid
language plpgsql security invoker set search_path=public as $$ declare v_org uuid:=mi_organizacion(); v_rep public.pos_reparaciones%rowtype; v_stock numeric; v_res numeric; v_costo numeric; v_id uuid; begin
if mi_rol() not in ('admin','gerente','cajero') then raise exception 'REP_SIN_PERMISO'; end if;
if coalesce(p_cantidad,0)<=0 or p_almacen_id is null then raise exception 'REP_PIEZA_DATOS_INVALIDOS'; end if;
select * into v_rep from public.pos_reparaciones where id=p_reparacion_id and organizacion_id=v_org for update;
if v_rep.id is null or lower(coalesce(v_rep.estado,'')) in ('entregado','cancelado') then raise exception 'REP_NO_ACTIVA'; end if;
select p.costo into v_costo from public.pos_productos p where p.id=p_producto_id and p.organizacion_id=v_org and coalesce(p.activo,true); if not found then raise exception 'REP_PRODUCTO_INVALIDO'; end if;
select s.stock into v_stock from public.pos_stock_almacen s where s.organizacion_id=v_org and s.producto_id=p_producto_id and s.almacen_id=p_almacen_id for update; if v_stock is null then raise exception 'REP_STOCK_ALMACEN_NO_EXISTE'; end if;
select coalesce(sum(cantidad),0) into v_res from public.pos_reparacion_piezas where organizacion_id=v_org and producto_id=p_producto_id and almacen_id=p_almacen_id and estado='reservada';
if v_stock-v_res < p_cantidad then raise exception 'REP_STOCK_DISPONIBLE_INSUFICIENTE'; end if;
insert into public.pos_reparacion_piezas(organizacion_id,reparacion_id,producto_id,almacen_id,cantidad,costo_unitario,estado,creado_por) values(v_org,v_rep.id,p_producto_id,p_almacen_id,p_cantidad,coalesce(v_costo,0),'reservada',auth.uid()) returning id into v_id;
perform public.pos_rep_recalcular_costo_piezas(v_rep.id); return v_id; end; $$;

create or replace function public.pos_rep_usar_pieza(p_pieza_id uuid) returns boolean language plpgsql security invoker set search_path=public as $$ declare v_org uuid:=mi_organizacion(); v public.pos_reparacion_piezas%rowtype; v_num text; begin
if mi_rol() not in ('admin','gerente','cajero') then raise exception 'REP_SIN_PERMISO'; end if;
select * into v from public.pos_reparacion_piezas where id=p_pieza_id and organizacion_id=v_org for update; if v.id is null or v.estado<>'reservada' then raise exception 'REP_PIEZA_NO_RESERVADA'; end if;
select numero into v_num from public.pos_reparaciones where id=v.reparacion_id and organizacion_id=v_org for update;
perform public.pos_mover_stock_atomico(v.producto_id,'taller',-v.cantidad,v.almacen_id,coalesce(v_num,v.reparacion_id::text),'Pieza usada en reparación',v.costo_unitario);
update public.pos_reparacion_piezas set estado='usada',usada_at=now() where id=v.id; perform public.pos_rep_recalcular_costo_piezas(v.reparacion_id); return true; end; $$;

create or replace function public.pos_rep_devolver_pieza(p_pieza_id uuid,p_motivo text default 'Devolución de taller') returns boolean language plpgsql security invoker set search_path=public as $$ declare v_org uuid:=mi_organizacion(); v public.pos_reparacion_piezas%rowtype; v_num text; begin
if mi_rol() not in ('admin','gerente') then raise exception 'REP_DEVOLUCION_SIN_PERMISO'; end if;
select * into v from public.pos_reparacion_piezas where id=p_pieza_id and organizacion_id=v_org for update; if v.id is null or v.estado='devuelta' then raise exception 'REP_PIEZA_INVALIDA'; end if;
select numero into v_num from public.pos_reparaciones where id=v.reparacion_id and organizacion_id=v_org for update;
if v.estado='usada' then perform public.pos_mover_stock_atomico(v.producto_id,'taller',v.cantidad,v.almacen_id,coalesce(v_num,v.reparacion_id::text),coalesce(nullif(trim(p_motivo),''),'Devolución de taller'),v.costo_unitario); end if;
update public.pos_reparacion_piezas set estado='devuelta',devuelta_at=now() where id=v.id; perform public.pos_rep_recalcular_costo_piezas(v.reparacion_id); return true; end; $$;

create or replace function public.pos_rep_abrir_reclamo_garantia(p_reparacion_origen_id uuid,p_falla text) returns uuid language plpgsql security invoker set search_path=public as $$ declare v_org uuid:=mi_organizacion(); v public.pos_reparaciones%rowtype; v_id uuid; v_num text; begin
if mi_rol() not in ('admin','gerente','cajero') then raise exception 'REP_SIN_PERMISO'; end if; if length(trim(coalesce(p_falla,'')))<3 then raise exception 'REP_GARANTIA_FALLA_REQUERIDA'; end if;
select * into v from public.pos_reparaciones where id=p_reparacion_origen_id and organizacion_id=v_org for update;
if v.id is null or lower(coalesce(v.estado,''))<>'entregado' or v.garantia_hasta is null or v.garantia_hasta<current_date then raise exception 'REP_GARANTIA_NO_VIGENTE'; end if;
if exists(select 1 from public.pos_reparaciones where organizacion_id=v_org and garantia_origen_id=v.id and lower(coalesce(estado,'')) not in ('entregado','cancelado')) then raise exception 'REP_GARANTIA_RECLAMO_YA_ABIERTO'; end if;
v_num:='GAR-'||coalesce(v.numero,substr(v.id::text,1,8));
insert into public.pos_reparaciones(organizacion_id,numero,cliente_nombre,cliente_telefono,equipo,imei,clave,accesorios,falla,estado_fisico,diagnostico,presupuesto,abono,costo_piezas,estado,tecnico,nota,cobrado,cobrado_monto,cobrado_metodo,garantia_origen_id,es_garantia)
values(v_org,v_num,v.cliente_nombre,v.cliente_telefono,v.equipo,v.imei,v.clave,v.accesorios,trim(p_falla),v.estado_fisico,null,0,0,0,'recibido',v.tecnico,'Reclamo de garantía de '||coalesce(v.numero,v.id::text),false,0,null,v.id,true) returning id into v_id; return v_id; end; $$;

create or replace function public.pos_rep_autorizar_cobro_garantia(p_reparacion_id uuid,p_motivo text) returns boolean language plpgsql security invoker set search_path=public as $$ begin
if mi_rol()<>'admin' then raise exception 'REP_GARANTIA_COBRO_SOLO_ADMIN'; end if; if length(trim(coalesce(p_motivo,'')))<5 then raise exception 'REP_GARANTIA_COBRO_MOTIVO_REQUERIDO'; end if;
update public.pos_reparaciones set garantia_cobro_autorizado=true,garantia_cobro_motivo=trim(p_motivo),garantia_cobro_autorizado_por=auth.uid() where id=p_reparacion_id and organizacion_id=mi_organizacion() and es_garantia=true; if not found then raise exception 'REP_GARANTIA_NO_ENCONTRADA'; end if; return true; end; $$;

create or replace function public.pos_rep_guard_cobro_garantia() returns trigger language plpgsql security invoker set search_path=public as $$ begin
if coalesce(new.es_garantia,false) and (coalesce(new.cobrado,false) or coalesce(new.cobrado_monto,0)>0) and not coalesce(new.garantia_cobro_autorizado,false) then raise exception 'REP_GARANTIA_COBRO_NO_AUTORIZADO'; end if; return new; end; $$;
drop trigger if exists pos_rep_guard_cobro_garantia on public.pos_reparaciones;
create trigger pos_rep_guard_cobro_garantia before insert or update of cobrado,cobrado_monto,garantia_cobro_autorizado on public.pos_reparaciones for each row execute function public.pos_rep_guard_cobro_garantia();

create or replace function public.pos_rep_guard_stock_reservado_venta() returns trigger language plpgsql security invoker set search_path=public as $$ declare v_alm uuid; v_stock numeric; v_res numeric; begin
select almacen_id into v_alm from public.pos_ventas where id=new.venta_id and organizacion_id=new.organizacion_id; if v_alm is null then return new; end if;
select stock into v_stock from public.pos_stock_almacen where organizacion_id=new.organizacion_id and producto_id=new.producto_id and almacen_id=v_alm; if v_stock is null then return new; end if;
select coalesce(sum(cantidad),0) into v_res from public.pos_reparacion_piezas where organizacion_id=new.organizacion_id and producto_id=new.producto_id and almacen_id=v_alm and estado='reservada';
if v_stock-v_res < new.cantidad then raise exception 'VENTA_STOCK_RESERVADO_TALLER'; end if; return new; end; $$;
drop trigger if exists pos_venta_guard_stock_reservado_taller on public.pos_venta_items;
create trigger pos_venta_guard_stock_reservado_taller before insert or update of producto_id,cantidad on public.pos_venta_items for each row execute function public.pos_rep_guard_stock_reservado_venta();

revoke all on function public.pos_rep_recalcular_costo_piezas(uuid) from public,anon;
revoke all on function public.pos_rep_reservar_pieza(uuid,uuid,uuid,numeric) from public,anon;
revoke all on function public.pos_rep_usar_pieza(uuid) from public,anon;
revoke all on function public.pos_rep_devolver_pieza(uuid,text) from public,anon;
revoke all on function public.pos_rep_abrir_reclamo_garantia(uuid,text) from public,anon;
revoke all on function public.pos_rep_autorizar_cobro_garantia(uuid,text) from public,anon;
grant execute on function public.pos_rep_recalcular_costo_piezas(uuid) to authenticated;
grant execute on function public.pos_rep_reservar_pieza(uuid,uuid,uuid,numeric) to authenticated;
grant execute on function public.pos_rep_usar_pieza(uuid) to authenticated;
grant execute on function public.pos_rep_devolver_pieza(uuid,text) to authenticated;
grant execute on function public.pos_rep_abrir_reclamo_garantia(uuid,text) to authenticated;
grant execute on function public.pos_rep_autorizar_cobro_garantia(uuid,text) to authenticated;
