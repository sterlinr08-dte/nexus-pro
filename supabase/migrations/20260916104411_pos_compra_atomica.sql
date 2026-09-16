-- NEXUS PRO POS · compra, artículos, IMEI e inventario en una transacción.

alter table public.pos_compras add column if not exists operacion_id uuid;

create unique index if not exists pos_compras_org_operacion_uidx
  on public.pos_compras (organizacion_id, operacion_id)
  where operacion_id is not null;

create or replace function public.pos_registrar_compra_atomica(
  p_operacion_id uuid,
  p_compra jsonb,
  p_items jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_org uuid := public.mi_organizacion();
  v_compra public.pos_compras%rowtype;
  v_usuario text;
  v_item record;
  v_total numeric;
  v_seriales integer;
begin
  if v_org is null or public.mi_rol() is null then raise exception 'COMPRA_SIN_PERMISO'; end if;
  if p_operacion_id is null then raise exception 'COMPRA_OPERACION_REQUERIDA'; end if;
  if jsonb_typeof(p_compra)<>'object' or jsonb_typeof(p_items)<>'array'
     or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>200 then
    raise exception 'COMPRA_DATOS_INVALIDOS';
  end if;

  select * into v_compra from public.pos_compras
  where organizacion_id=v_org and operacion_id=p_operacion_id;
  if v_compra.id is not null then
    return jsonb_build_object('ok',true,'reutilizada',true,'compra',to_jsonb(v_compra));
  end if;

  if nullif(p_compra->>'almacen_id','') is null and exists(
    select 1 from public.pos_almacenes where organizacion_id=v_org and activo
  ) then raise exception 'COMPRA_ALMACEN_REQUERIDO'; end if;
  if nullif(p_compra->>'almacen_id','') is not null and not exists(
    select 1 from public.pos_almacenes where id=(p_compra->>'almacen_id')::uuid and organizacion_id=v_org and activo
  ) then raise exception 'COMPRA_ALMACEN_INVALIDO'; end if;
  if coalesce((p_compra->>'a_credito')::boolean,false)
     and nullif(p_compra->>'proveedor_id','') is null then
    raise exception 'COMPRA_CREDITO_SIN_PROVEEDOR';
  end if;

  if exists(
    select 1
    from jsonb_to_recordset(p_items) x(producto_id uuid,cantidad numeric,costo numeric,importe numeric,imeis jsonb)
    left join public.pos_productos p on p.id=x.producto_id and p.organizacion_id=v_org and p.activo and p.tipo<>'servicio'
    where p.id is null or x.cantidad<=0 or x.costo<0 or x.importe<0
       or abs(x.importe-(x.cantidad*x.costo))>0.01
       or (p.serial and (jsonb_typeof(coalesce(x.imeis,'[]'::jsonb))<>'array'
           or jsonb_array_length(coalesce(x.imeis,'[]'::jsonb))<>x.cantidad))
       or (not p.serial and jsonb_array_length(coalesce(x.imeis,'[]'::jsonb))>0)
  ) then raise exception 'COMPRA_ITEM_INVALIDO'; end if;

  select coalesce(sum(x.importe),0) into v_total
  from jsonb_to_recordset(p_items) x(importe numeric);
  if abs(v_total-coalesce((p_compra->>'total')::numeric,0))>0.01 then
    raise exception 'COMPRA_TOTAL_NO_CUADRA';
  end if;

  select count(*) into v_seriales
  from jsonb_array_elements(p_items) e(item)
  cross join lateral jsonb_array_elements_text(coalesce(e.item->'imeis','[]'::jsonb)) s(serial);
  if exists(
    select 1 from (
      select lower(trim(s.serial)) serial, count(*) n
      from jsonb_array_elements(p_items) e(item)
      cross join lateral jsonb_array_elements_text(coalesce(e.item->'imeis','[]'::jsonb)) s(serial)
      group by lower(trim(s.serial)) having count(*)>1 or lower(trim(s.serial))=''
    ) d
  ) or exists(
    select 1 from public.pos_seriales ps
    where ps.organizacion_id=v_org and lower(ps.serial) in (
      select lower(trim(s.serial))
      from jsonb_array_elements(p_items) e(item)
      cross join lateral jsonb_array_elements_text(coalesce(e.item->'imeis','[]'::jsonb)) s(serial)
    )
  ) then raise exception 'COMPRA_IMEI_DUPLICADO'; end if;

  select us.nom into v_usuario
  from public.profiles pr join public.usuarios_sistema us on us.id=pr.usuario_sistema_id
  where pr.id=auth.uid() limit 1;

  insert into public.pos_compras(
    fecha,proveedor_id,proveedor_nombre,ncf,subtotal,itbis,total,a_credito,estado,
    notas,created_by_name,organizacion_id,almacen_id,empleado_id,empleado_nombre,
    vencimiento,orden_no,liquidacion_no,operacion_id
  ) values (
    coalesce(nullif(p_compra->>'fecha','')::date,current_date),
    nullif(p_compra->>'proveedor_id','')::uuid,nullif(left(p_compra->>'proveedor_nombre',200),''),
    nullif(left(p_compra->>'ncf',100),''),v_total,0,v_total,
    coalesce((p_compra->>'a_credito')::boolean,false),'recibida',
    nullif(left(p_compra->>'notas',1000),''),coalesce(v_usuario,'Sistema'),v_org,
    nullif(p_compra->>'almacen_id','')::uuid,nullif(p_compra->>'empleado_id','')::uuid,
    nullif(left(p_compra->>'empleado_nombre',200),''),nullif(p_compra->>'vencimiento','')::date,
    nullif(left(p_compra->>'orden_no',100),''),nullif(left(p_compra->>'liquidacion_no',100),''),
    p_operacion_id
  ) returning * into v_compra;

  insert into public.pos_compra_items(compra_id,producto_id,nombre,cantidad,costo,importe,organizacion_id)
  select v_compra.id,(e.item->>'producto_id')::uuid,left(e.item->>'nombre',300),
         (e.item->>'cantidad')::numeric,(e.item->>'costo')::numeric,(e.item->>'importe')::numeric,v_org
  from jsonb_array_elements(p_items) e(item);

  for v_item in
    select (e.item->>'producto_id')::uuid producto_id,(e.item->>'cantidad')::numeric cantidad,
           (e.item->>'costo')::numeric costo,e.item->'imeis' imeis
    from jsonb_array_elements(p_items) e(item)
  loop
    perform public.pos_mover_stock_atomico(v_item.producto_id,'compra',v_item.cantidad,
      v_compra.almacen_id,v_compra.numero::text,'Compra',v_item.costo);
    insert into public.pos_seriales(organizacion_id,producto_id,serial,estado,almacen_id,compra_id,notas)
    select v_org,v_item.producto_id,trim(s.serial),'disponible',v_compra.almacen_id,v_compra.id,
           'Compra '||v_compra.numero::text
    from jsonb_array_elements_text(coalesce(v_item.imeis,'[]'::jsonb)) s(serial);
  end loop;

  return jsonb_build_object('ok',true,'reutilizada',false,'compra',to_jsonb(v_compra),
    'items',jsonb_array_length(p_items),'seriales',v_seriales);
end;
$$;

create or replace function public.pos_eliminar_compra_atomica(p_compra_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_compra public.pos_compras%rowtype;
  v_item record;
begin
  if public.mi_rol() is null then raise exception 'COMPRA_SIN_PERMISO'; end if;
  select * into v_compra from public.pos_compras
  where id=p_compra_id and organizacion_id=public.mi_organizacion() for update;
  if v_compra.id is null then raise exception 'COMPRA_NO_ENCONTRADA'; end if;
  if exists(select 1 from public.pos_seriales where compra_id=v_compra.id
            and (estado<>'disponible' or venta_id is not null or reserva_token is not null)) then
    raise exception 'COMPRA_IMEI_YA_UTILIZADO';
  end if;
  for v_item in
    select producto_id,sum(cantidad) cantidad from public.pos_compra_items
    where compra_id=v_compra.id group by producto_id
  loop
    perform public.pos_mover_stock_atomico(v_item.producto_id,'ajuste',-v_item.cantidad,
      v_compra.almacen_id,'Compra eliminada','Reversa de compra '||v_compra.numero::text,null);
  end loop;
  delete from public.pos_seriales where compra_id=v_compra.id;
  delete from public.pos_compras where id=v_compra.id;
  return v_compra.id;
end;
$$;

revoke all on function public.pos_registrar_compra_atomica(uuid,jsonb,jsonb) from public,anon;
revoke all on function public.pos_eliminar_compra_atomica(uuid) from public,anon;
grant execute on function public.pos_registrar_compra_atomica(uuid,jsonb,jsonb) to authenticated;
grant execute on function public.pos_eliminar_compra_atomica(uuid) to authenticated;

