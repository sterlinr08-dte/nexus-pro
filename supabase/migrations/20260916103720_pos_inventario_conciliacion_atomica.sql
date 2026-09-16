-- NEXUS PRO POS · conciliación y movimientos atómicos de inventario
-- Excluye deliberadamente cualquier cambio fiscal/impositivo.

create or replace function public.pos_inventario_conciliacion()
returns table (
  producto_id uuid,
  producto_nombre text,
  stock_global numeric,
  stock_almacenes numeric,
  diferencia numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.id,
    p.nombre,
    p.stock,
    coalesce(sum(sa.stock), 0),
    p.stock - coalesce(sum(sa.stock), 0)
  from public.pos_productos p
  left join public.pos_stock_almacen sa
    on sa.producto_id = p.id
   and sa.organizacion_id = p.organizacion_id
  where p.organizacion_id = public.mi_organizacion()
    and p.tipo <> 'servicio'
    and exists (
      select 1 from public.pos_almacenes a
      where a.organizacion_id = p.organizacion_id and a.activo
    )
  group by p.id, p.nombre, p.stock
  having p.stock is distinct from coalesce(sum(sa.stock), 0)
  order by p.nombre;
$$;

revoke all on function public.pos_inventario_conciliacion() from public;
revoke all on function public.pos_inventario_conciliacion() from anon;
grant execute on function public.pos_inventario_conciliacion() to authenticated;

create or replace function public.pos_mover_stock_atomico(
  p_producto_id uuid,
  p_tipo text,
  p_delta numeric,
  p_almacen_id uuid default null,
  p_referencia text default null,
  p_motivo text default null,
  p_costo numeric default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_org uuid := public.mi_organizacion();
  v_rol text := public.mi_rol();
  v_producto public.pos_productos%rowtype;
  v_stock_anterior numeric;
  v_stock_nuevo numeric;
  v_stock_alm_anterior numeric;
  v_stock_alm_nuevo numeric;
  v_usuario text;
  v_hay_almacenes boolean;
begin
  if v_org is null or v_rol is null then
    raise exception 'INVENTARIO_SIN_PERMISO';
  end if;
  if p_producto_id is null or p_delta is null or p_delta = 0 then
    raise exception 'INVENTARIO_MOVIMIENTO_INVALIDO';
  end if;
  if p_tipo not in ('compra','ajuste','garantia','taller','produccion','devolucion','anulacion','apertura') then
    raise exception 'INVENTARIO_TIPO_INVALIDO';
  end if;
  if p_costo is not null and p_costo < 0 then
    raise exception 'INVENTARIO_COSTO_INVALIDO';
  end if;

  select * into v_producto
  from public.pos_productos
  where id = p_producto_id and organizacion_id = v_org and tipo <> 'servicio'
  for update;
  if v_producto.id is null then
    raise exception 'INVENTARIO_PRODUCTO_INVALIDO';
  end if;

  select exists (
    select 1 from public.pos_almacenes
    where organizacion_id = v_org and activo
  ) into v_hay_almacenes;

  if v_hay_almacenes and p_almacen_id is null then
    raise exception 'INVENTARIO_ALMACEN_REQUERIDO';
  end if;
  if p_almacen_id is not null and not exists (
    select 1 from public.pos_almacenes
    where id = p_almacen_id and organizacion_id = v_org and activo
  ) then
    raise exception 'INVENTARIO_ALMACEN_INVALIDO';
  end if;

  v_stock_anterior := coalesce(v_producto.stock, 0);
  v_stock_nuevo := v_stock_anterior + p_delta;
  if v_stock_nuevo < 0 then
    raise exception 'INVENTARIO_STOCK_INSUFICIENTE';
  end if;

  if p_almacen_id is not null then
    insert into public.pos_stock_almacen (organizacion_id, producto_id, almacen_id, stock)
    values (v_org, p_producto_id, p_almacen_id, 0)
    on conflict (producto_id, almacen_id) do nothing;

    select stock into v_stock_alm_anterior
    from public.pos_stock_almacen
    where producto_id = p_producto_id
      and almacen_id = p_almacen_id
      and organizacion_id = v_org
    for update;

    v_stock_alm_nuevo := coalesce(v_stock_alm_anterior, 0) + p_delta;
    if v_stock_alm_nuevo < 0 then
      raise exception 'INVENTARIO_STOCK_ALMACEN_INSUFICIENTE';
    end if;

    update public.pos_stock_almacen
       set stock = v_stock_alm_nuevo
     where producto_id = p_producto_id
       and almacen_id = p_almacen_id
       and organizacion_id = v_org;
  end if;

  update public.pos_productos
     set stock = v_stock_nuevo,
         costo = coalesce(p_costo, costo)
   where id = p_producto_id and organizacion_id = v_org;

  select us.nom into v_usuario
  from public.profiles pr
  join public.usuarios_sistema us on us.id = pr.usuario_sistema_id
  where pr.id = auth.uid()
  limit 1;

  insert into public.pos_inv_movimientos (
    organizacion_id, producto_id, producto_nombre, tipo, cantidad,
    stock_anterior, stock_nuevo, referencia, motivo, created_by_name
  ) values (
    v_org, p_producto_id, v_producto.nombre, p_tipo, p_delta,
    v_stock_anterior, v_stock_nuevo, nullif(left(p_referencia, 300), ''),
    nullif(left(p_motivo, 500), ''), coalesce(v_usuario, 'Sistema')
  );

  return jsonb_build_object(
    'ok', true,
    'producto_id', p_producto_id,
    'stock_anterior', v_stock_anterior,
    'stock_nuevo', v_stock_nuevo,
    'almacen_id', p_almacen_id,
    'stock_almacen_anterior', v_stock_alm_anterior,
    'stock_almacen_nuevo', v_stock_alm_nuevo
  );
end;
$$;

revoke all on function public.pos_mover_stock_atomico(uuid,text,numeric,uuid,text,text,numeric) from public;
revoke all on function public.pos_mover_stock_atomico(uuid,text,numeric,uuid,text,text,numeric) from anon;
grant execute on function public.pos_mover_stock_atomico(uuid,text,numeric,uuid,text,text,numeric) to authenticated;

-- Las ventas de organizaciones con almacenes ya no pueden omitir el almacén.
-- El cliente actual siempre envía el almacén activo; este candado protege llamadas directas.
create or replace function public.pos_validar_venta_con_almacen()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.estado = 'completada'
     and new.almacen_id is null
     and exists (
       select 1 from public.pos_almacenes a
       where a.organizacion_id = new.organizacion_id and a.activo
     ) then
    raise exception 'VENTA_ALMACEN_REQUERIDO';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pos_validar_venta_con_almacen on public.pos_ventas;
create trigger trg_pos_validar_venta_con_almacen
before insert or update of almacen_id, estado on public.pos_ventas
for each row execute function public.pos_validar_venta_con_almacen();

revoke all on function public.pos_validar_venta_con_almacen() from public, anon, authenticated;

-- Reparación probada del legado: CO00000001 descontó el global pero, al no traer
-- almacen_id, dejó una unidad de más en el principal para estos dos productos.
do $$
declare
  v_org uuid;
  v_almacen uuid;
  v_filas integer;
  r record;
begin
  select id into v_org from public.organizaciones where slug = 'bayolsale';
  select id into v_almacen
  from public.pos_almacenes
  where organizacion_id = v_org and es_principal and activo
  order by created_at, id
  limit 1;

  if v_org is null or v_almacen is null then
    raise exception 'RECONCILIACION_INVENTARIO_CONTEXTO_INVALIDO';
  end if;

  select count(*) into v_filas
  from (
    select p.id
    from public.pos_productos p
    join public.pos_stock_almacen sa
      on sa.producto_id = p.id and sa.almacen_id = v_almacen and sa.organizacion_id = v_org
    where p.organizacion_id = v_org
      and p.nombre in ('CELULAR IPHONE 11 NORMAL', 'PANTALLA IPHONE 11 NORMAL')
      and (select coalesce(sum(x.stock), 0) from public.pos_stock_almacen x
           where x.producto_id = p.id and x.organizacion_id = v_org) - p.stock = 1
      and sa.stock >= 1
  ) q;

  if v_filas <> 2 then
    raise exception 'RECONCILIACION_INVENTARIO_PRECONDICION_FALLO: % filas', v_filas;
  end if;

  for r in
    select p.id, p.nombre
    from public.pos_productos p
    where p.organizacion_id = v_org
      and p.nombre in ('CELULAR IPHONE 11 NORMAL', 'PANTALLA IPHONE 11 NORMAL')
  loop
    update public.pos_stock_almacen
       set stock = stock - 1
     where organizacion_id = v_org and producto_id = r.id and almacen_id = v_almacen;

    insert into public.auditoria (
      ts, usuario, rol, accion, detalle, modulo,
      entity_table, entity_id, result, organizacion_id
    ) values (
      now()::text, 'ChatGPT', 'admin', 'POS_INVENTARIO_RECONCILIADO',
      r.nombre || ' · almacén principal -1 · reparación de venta CO00000001 sin almacén',
      'Inventario', 'pos_productos', r.id::text, 'ok', v_org
    );
  end loop;
end;
$$;
