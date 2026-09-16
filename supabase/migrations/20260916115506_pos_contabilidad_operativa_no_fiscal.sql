-- NEXUS PRO POS · contabilidad operativa no fiscal
-- Omite deliberadamente e-CF/ITBIS/606/607/608. Registra operación bruta + costo de venta.

alter table public.pos_venta_items
  add column if not exists costo_unitario numeric;

create unique index if not exists pos_cuentas_org_codigo_uidx
  on public.pos_cuentas(organizacion_id,codigo);

create unique index if not exists pos_asientos_pos_origen_uidx
  on public.pos_asientos(organizacion_id,tipo,origen_id)
  where origen_id is not null and tipo in ('venta','compra');

create or replace function public.pos_asegurar_cuentas_operativas(p_org uuid)
returns void
language plpgsql
security invoker
set search_path=public
as $$
begin
  if p_org is null then raise exception 'CONTABILIDAD_ORG_REQUERIDA'; end if;
  if p_org <> 'c6e4b954-45ee-46b9-ba94-ae1cbbcc7e10'::uuid then return; end if;
  insert into public.pos_cuentas(organizacion_id,codigo,nombre,tipo,naturaleza,activo)
  values
    (p_org,'1101','Caja y efectivo','activo','deudora',true),
    (p_org,'1102','Banco y medios electrónicos','activo','deudora',true),
    (p_org,'1103','Cuentas por cobrar (clientes)','activo','deudora',true),
    (p_org,'1104','Inventario de mercancías','activo','deudora',true),
    (p_org,'2101','Cuentas por pagar — Proveedores','pasivo','acreedora',true),
    (p_org,'2105','Notas de crédito de clientes','pasivo','acreedora',true),
    (p_org,'2199','Compras por conciliar','pasivo','acreedora',true),
    (p_org,'4101','Ventas','ingreso','acreedora',true),
    (p_org,'5101','Costo de ventas','gasto','deudora',true)
  on conflict (organizacion_id,codigo) do update
    set nombre=excluded.nombre,tipo=excluded.tipo,naturaleza=excluded.naturaleza,activo=true;
end;
$$;

create or replace function public.pos_snapshot_costo_venta_item()
returns trigger
language plpgsql
security invoker
set search_path=public
as $$
begin
  if new.organizacion_id <> 'c6e4b954-45ee-46b9-ba94-ae1cbbcc7e10'::uuid then return new; end if;
  if tg_op='INSERT' then
    select coalesce(p.costo,0) into new.costo_unitario
    from public.pos_productos p
    where p.id=new.producto_id and p.organizacion_id=new.organizacion_id;
    new.costo_unitario := coalesce(new.costo_unitario,0);
  elsif new.producto_id is distinct from old.producto_id or new.costo_unitario is null then
    select coalesce(p.costo,0) into new.costo_unitario
    from public.pos_productos p
    where p.id=new.producto_id and p.organizacion_id=new.organizacion_id;
    new.costo_unitario := coalesce(new.costo_unitario,0);
  end if;
  return new;
end;
$$;

drop trigger if exists pos_venta_item_snapshot_costo on public.pos_venta_items;
create trigger pos_venta_item_snapshot_costo
before insert or update of producto_id on public.pos_venta_items
for each row execute function public.pos_snapshot_costo_venta_item();

update public.pos_venta_items vi
set costo_unitario=coalesce(p.costo,0)
from public.pos_productos p
where p.id=vi.producto_id and p.organizacion_id=vi.organizacion_id
  and vi.costo_unitario is null;

create or replace function public.pos_reconstruir_asiento_venta(p_venta_id uuid)
returns uuid
language plpgsql
security invoker
set search_path=public
as $$
declare
  v public.pos_ventas%rowtype;
  v_aid uuid;
  v_cogs numeric:=0;
  v_efe numeric:=0; v_tar numeric:=0; v_tra numeric:=0; v_otro numeric:=0; v_credito numeric:=0;
  v_nc numeric:=0; v_otros_det numeric:=0; v_suma_debitos numeric:=0;
begin
  select * into v from public.pos_ventas where id=p_venta_id;
  if v.id is null then return null; end if;
  if v.organizacion_id <> 'c6e4b954-45ee-46b9-ba94-ae1cbbcc7e10'::uuid then return null; end if;

  delete from public.pos_asientos where organizacion_id=v.organizacion_id and tipo='venta' and origen_id=v.id;
  if v.estado<>'completada' then return null; end if;
  if not exists(select 1 from public.pos_venta_items where venta_id=v.id) then return null; end if;

  perform public.pos_asegurar_cuentas_operativas(v.organizacion_id);

  select coalesce(sum(i.cantidad*coalesce(i.costo_unitario,0)),0)
    into v_cogs from public.pos_venta_items i where i.venta_id=v.id;

  v_efe:=coalesce(v.pagado_efectivo,0);
  v_tar:=coalesce(v.pagado_tarjeta,0);
  v_tra:=coalesce(v.pagado_transferencia,0);
  v_otro:=coalesce(v.pagado_otro,0);
  v_credito:=coalesce(v.credito_monto,0);

  select coalesce(sum(case when lower(trim(x->>'metodo')) in ('nota de crédito','nota de credito') then coalesce((x->>'monto')::numeric,0) else 0 end),0),
         coalesce(sum(case when lower(trim(x->>'metodo')) not in ('efectivo','tarjeta','transferencia','crédito','credito','nota de crédito','nota de credito') then coalesce((x->>'monto')::numeric,0) else 0 end),0)
    into v_nc,v_otros_det
  from jsonb_array_elements(coalesce(v.pagos,'[]'::jsonb)) x;

  v_otros_det:=greatest(v_otro-v_nc,0);
  v_suma_debitos:=v_efe+v_tar+v_tra+v_otro+v_credito;
  if abs(v_suma_debitos-v.total)>0.01 then
    raise exception 'ASIENTO_VENTA_PAGOS_NO_CUADRAN venta=% total=% pagos=%',v.id,v.total,v_suma_debitos;
  end if;

  insert into public.pos_asientos(organizacion_id,fecha,concepto,referencia,tipo,origen_id,numero)
  values(v.organizacion_id,(v.fecha at time zone 'America/Santo_Domingo')::date,
         'Venta '||coalesce(v.numero_factura,'No. '||v.numero::text),
         coalesce(v.numero_factura,v.numero::text),'venta',v.id,
         coalesce(v.numero_factura,'V-'||v.numero::text))
  returning id into v_aid;

  if v_efe>0 then
    insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
    select v.organizacion_id,v_aid,id,codigo,nombre,'Cobro efectivo',v_efe,0 from public.pos_cuentas where organizacion_id=v.organizacion_id and codigo='1101';
  end if;
  if v_tar>0 then
    insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
    select v.organizacion_id,v_aid,id,codigo,nombre,'Cobro tarjeta',v_tar,0 from public.pos_cuentas where organizacion_id=v.organizacion_id and codigo='1102';
  end if;
  if v_tra+v_otros_det>0 then
    insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
    select v.organizacion_id,v_aid,id,codigo,nombre,'Transferencias y otros medios',v_tra+v_otros_det,0 from public.pos_cuentas where organizacion_id=v.organizacion_id and codigo='1102';
  end if;
  if v_nc>0 then
    insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
    select v.organizacion_id,v_aid,id,codigo,nombre,'Nota de crédito aplicada',v_nc,0 from public.pos_cuentas where organizacion_id=v.organizacion_id and codigo='2105';
  end if;
  if v_credito>0 then
    insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
    select v.organizacion_id,v_aid,id,codigo,nombre,'Venta a crédito',v_credito,0 from public.pos_cuentas where organizacion_id=v.organizacion_id and codigo='1103';
  end if;
  insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
  select v.organizacion_id,v_aid,id,codigo,nombre,'Ingreso por venta',0,v.total from public.pos_cuentas where organizacion_id=v.organizacion_id and codigo='4101';
  if v_cogs>0 then
    insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
    select v.organizacion_id,v_aid,id,codigo,nombre,'Costo de mercancía vendida',v_cogs,0 from public.pos_cuentas where organizacion_id=v.organizacion_id and codigo='5101';
    insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
    select v.organizacion_id,v_aid,id,codigo,nombre,'Salida contable de inventario',0,v_cogs from public.pos_cuentas where organizacion_id=v.organizacion_id and codigo='1104';
  end if;
  return v_aid;
end;
$$;

create or replace function public.pos_reconstruir_asiento_compra(p_compra_id uuid)
returns uuid
language plpgsql
security invoker
set search_path=public
as $$
declare
  v public.pos_compras%rowtype;
  v_aid uuid;
  v_total_items numeric:=0;
begin
  select * into v from public.pos_compras where id=p_compra_id;
  if v.id is null then return null; end if;
  if v.organizacion_id <> 'c6e4b954-45ee-46b9-ba94-ae1cbbcc7e10'::uuid then return null; end if;
  delete from public.pos_asientos where organizacion_id=v.organizacion_id and tipo='compra' and origen_id=v.id;
  if v.estado<>'recibida' then return null; end if;
  select coalesce(sum(importe),0) into v_total_items from public.pos_compra_items where compra_id=v.id;
  if v_total_items<=0 then return null; end if;
  if abs(v_total_items-v.total)>0.01 then raise exception 'ASIENTO_COMPRA_TOTAL_NO_CUADRA compra=%',v.id; end if;
  perform public.pos_asegurar_cuentas_operativas(v.organizacion_id);

  insert into public.pos_asientos(organizacion_id,fecha,concepto,referencia,tipo,origen_id,numero)
  values(v.organizacion_id,v.fecha,'Compra '||v.numero::text,v.numero::text,'compra',v.id,'C-'||v.numero::text)
  returning id into v_aid;

  insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
  select v.organizacion_id,v_aid,id,codigo,nombre,'Entrada de inventario',v.total,0 from public.pos_cuentas where organizacion_id=v.organizacion_id and codigo='1104';
  if v.a_credito then
    insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
    select v.organizacion_id,v_aid,id,codigo,nombre,'Compra a crédito',0,v.total from public.pos_cuentas where organizacion_id=v.organizacion_id and codigo='2101';
  else
    insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
    select v.organizacion_id,v_aid,id,codigo,nombre,'Pago no identificado en sistema legado',0,v.total from public.pos_cuentas where organizacion_id=v.organizacion_id and codigo='2199';
  end if;
  return v_aid;
end;
$$;

create or replace function public.pos_trg_recontabilizar_venta_item()
returns trigger language plpgsql security invoker set search_path=public as $$
declare v_id uuid; begin
  if tg_op='DELETE' then v_id:=old.venta_id; else v_id:=new.venta_id; end if;
  perform public.pos_reconstruir_asiento_venta(v_id);
  if tg_op='DELETE' then return old; else return new; end if;
end; $$;

create or replace function public.pos_trg_recontabilizar_compra_item()
returns trigger language plpgsql security invoker set search_path=public as $$
declare v_id uuid; begin
  if tg_op='DELETE' then v_id:=old.compra_id; else v_id:=new.compra_id; end if;
  perform public.pos_reconstruir_asiento_compra(v_id);
  if tg_op='DELETE' then return old; else return new; end if;
end; $$;

create or replace function public.pos_trg_recontabilizar_venta_cabecera()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if new.estado is distinct from old.estado or new.total is distinct from old.total or new.pagos is distinct from old.pagos
     or new.pagado_efectivo is distinct from old.pagado_efectivo or new.pagado_tarjeta is distinct from old.pagado_tarjeta
     or new.pagado_transferencia is distinct from old.pagado_transferencia or new.pagado_otro is distinct from old.pagado_otro
     or new.credito_monto is distinct from old.credito_monto then
    perform public.pos_reconstruir_asiento_venta(new.id);
  end if;
  return new;
end; $$;

create or replace function public.pos_trg_recontabilizar_compra_cabecera()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if new.estado is distinct from old.estado or new.total is distinct from old.total or new.a_credito is distinct from old.a_credito then
    perform public.pos_reconstruir_asiento_compra(new.id);
  end if;
  return new;
end; $$;

drop trigger if exists pos_venta_items_recontabilizar on public.pos_venta_items;
create constraint trigger pos_venta_items_recontabilizar
after insert or update or delete on public.pos_venta_items
deferrable initially deferred for each row execute function public.pos_trg_recontabilizar_venta_item();

drop trigger if exists pos_compra_items_recontabilizar on public.pos_compra_items;
create constraint trigger pos_compra_items_recontabilizar
after insert or update or delete on public.pos_compra_items
deferrable initially deferred for each row execute function public.pos_trg_recontabilizar_compra_item();

drop trigger if exists pos_ventas_recontabilizar on public.pos_ventas;
create trigger pos_ventas_recontabilizar after update on public.pos_ventas
for each row execute function public.pos_trg_recontabilizar_venta_cabecera();

drop trigger if exists pos_compras_recontabilizar on public.pos_compras;
create trigger pos_compras_recontabilizar after update on public.pos_compras
for each row execute function public.pos_trg_recontabilizar_compra_cabecera();

do $$ declare r record; begin
  perform public.pos_asegurar_cuentas_operativas('c6e4b954-45ee-46b9-ba94-ae1cbbcc7e10'::uuid);
  for r in select id from public.pos_ventas where organizacion_id='c6e4b954-45ee-46b9-ba94-ae1cbbcc7e10'::uuid loop
    perform public.pos_reconstruir_asiento_venta(r.id);
  end loop;
  for r in select id from public.pos_compras where organizacion_id='c6e4b954-45ee-46b9-ba94-ae1cbbcc7e10'::uuid loop
    perform public.pos_reconstruir_asiento_compra(r.id);
  end loop;
end $$;

revoke all on function public.pos_asegurar_cuentas_operativas(uuid) from public,anon;
revoke all on function public.pos_reconstruir_asiento_venta(uuid) from public,anon;
revoke all on function public.pos_reconstruir_asiento_compra(uuid) from public,anon;
revoke all on function public.pos_snapshot_costo_venta_item() from public,anon;
revoke all on function public.pos_trg_recontabilizar_venta_item() from public,anon;
revoke all on function public.pos_trg_recontabilizar_compra_item() from public,anon;
revoke all on function public.pos_trg_recontabilizar_venta_cabecera() from public,anon;
revoke all on function public.pos_trg_recontabilizar_compra_cabecera() from public,anon;
grant execute on function public.pos_asegurar_cuentas_operativas(uuid) to authenticated;
grant execute on function public.pos_reconstruir_asiento_venta(uuid) to authenticated;
grant execute on function public.pos_reconstruir_asiento_compra(uuid) to authenticated;
grant execute on function public.pos_snapshot_costo_venta_item() to authenticated;
grant execute on function public.pos_trg_recontabilizar_venta_item() to authenticated;
grant execute on function public.pos_trg_recontabilizar_compra_item() to authenticated;
grant execute on function public.pos_trg_recontabilizar_venta_cabecera() to authenticated;
grant execute on function public.pos_trg_recontabilizar_compra_cabecera() to authenticated;