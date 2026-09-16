-- NEXUS PRO POS · núcleo atómico de venta
-- Venta + líneas + confirmación IMEI + inventario se confirman o revierten juntos.

alter table public.pos_ventas
  add column if not exists operacion_id uuid;

alter table public.pos_venta_items
  add column if not exists linea_orden integer;

create unique index if not exists pos_ventas_org_operacion_uidx
  on public.pos_ventas (organizacion_id, operacion_id)
  where operacion_id is not null;

create or replace function public.pos_registrar_venta_atomica(
  p_operacion_id uuid,
  p_venta jsonb,
  p_items jsonb,
  p_reserva_token uuid default null,
  p_imei_esperados integer default 0
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_org uuid := public.mi_organizacion();
  v_rol text := public.mi_rol();
  v_venta public.pos_ventas%rowtype;
  v_usuario text;
  v_items_count integer;
  v_suma_items numeric;
  v_total numeric := coalesce((p_venta->>'total')::numeric, 0);
  v_descuento numeric := coalesce((p_venta->>'descuento')::numeric, 0);
  v_imei_confirmados integer := 0;
  v_inv jsonb;
begin
  if v_rol is null or v_org is null then
    raise exception 'VENTA_SIN_PERMISO';
  end if;
  if p_operacion_id is null then
    raise exception 'VENTA_OPERACION_REQUERIDA';
  end if;
  if jsonb_typeof(p_venta) <> 'object' or jsonb_typeof(p_items) <> 'array' then
    raise exception 'VENTA_DATOS_INVALIDOS';
  end if;

  -- Reintento de red/doble toque: devolver la venta ya comprometida, nunca duplicarla.
  select * into v_venta
  from public.pos_ventas
  where organizacion_id = v_org and operacion_id = p_operacion_id;
  if v_venta.id is not null then
    return jsonb_build_object(
      'ok', true,
      'reutilizada', true,
      'venta', to_jsonb(v_venta),
      'items', coalesce((select jsonb_agg(to_jsonb(i) order by i.linea_orden nulls last, i.id)
                         from public.pos_venta_items i where i.venta_id = v_venta.id), '[]'::jsonb)
    );
  end if;

  v_items_count := jsonb_array_length(p_items);
  if v_items_count < 1 or v_items_count > 200 then
    raise exception 'VENTA_ITEMS_CANTIDAD_INVALIDA';
  end if;
  if v_total <= 0 or v_descuento < 0 then
    raise exception 'VENTA_TOTAL_INVALIDO';
  end if;
  if coalesce(p_imei_esperados, 0) < 0 then
    raise exception 'VENTA_IMEI_CANTIDAD_INVALIDA';
  end if;
  if (p_reserva_token is null) <> (coalesce(p_imei_esperados, 0) = 0) then
    raise exception 'VENTA_IMEI_RESERVA_INVALIDA';
  end if;

  -- Todas las líneas deben ser positivas y pertenecer a productos de esta empresa.
  if exists (
    select 1
    from jsonb_to_recordset(p_items) as x(producto_id uuid, precio numeric, cantidad numeric, importe numeric)
    left join public.pos_productos p on p.id = x.producto_id and p.organizacion_id = v_org and p.activo
    where x.producto_id is null or p.id is null or x.precio <= 0 or x.cantidad <= 0 or x.importe <= 0
  ) then
    raise exception 'VENTA_ITEM_INVALIDO';
  end if;

  select coalesce(sum(x.importe), 0) into v_suma_items
  from jsonb_to_recordset(p_items) as x(importe numeric);
  if abs((v_suma_items - v_descuento) - v_total) > 1 then
    raise exception 'VENTA_TOTAL_NO_CUADRA';
  end if;

  if nullif(p_venta->>'cliente_id', '') is not null and not exists (
    select 1 from public.pos_clientes c
    where c.id = (p_venta->>'cliente_id')::uuid and c.organizacion_id = v_org and c.activo
  ) then
    raise exception 'VENTA_CLIENTE_INVALIDO';
  end if;
  if nullif(p_venta->>'vendedor_id', '') is not null and not exists (
    select 1 from public.pos_vendedores x
    where x.id = (p_venta->>'vendedor_id')::uuid and x.organizacion_id = v_org and x.activo
  ) then
    raise exception 'VENTA_VENDEDOR_INVALIDO';
  end if;
  if nullif(p_venta->>'almacen_id', '') is not null and not exists (
    select 1 from public.pos_almacenes a
    where a.id = (p_venta->>'almacen_id')::uuid and a.organizacion_id = v_org and a.activo
  ) then
    raise exception 'VENTA_ALMACEN_INVALIDO';
  end if;
  if coalesce((p_venta->>'pagado_efectivo')::numeric, 0) > 0 and not exists (
    select 1 from public.pos_cajas c
    where c.id = nullif(p_venta->>'caja_id', '')::uuid
      and c.organizacion_id = v_org and c.estado = 'abierta'
  ) then
    raise exception 'VENTA_CAJA_CERRADA';
  end if;

  if p_reserva_token is not null and nullif(p_venta->>'almacen_id', '') is not null and exists (
    select 1 from public.pos_seriales s
    where s.organizacion_id = v_org and s.reserva_token = p_reserva_token
      and s.almacen_id is distinct from (p_venta->>'almacen_id')::uuid
  ) then
    raise exception 'VENTA_IMEI_OTRO_ALMACEN';
  end if;

  select us.nom into v_usuario
  from public.profiles pr
  join public.usuarios_sistema us on us.id = pr.usuario_sistema_id
  where pr.id = auth.uid()
  limit 1;

  insert into public.pos_ventas (
    cliente_id, cliente_nombre, a_credito, subtotal, itbis, total, descuento,
    metodo_pago, pagos, pagado_efectivo, pagado_tarjeta, pagado_transferencia,
    pagado_otro, credito_monto, recibido, devuelta, tipo_comprobante,
    numero_factura, vendedor_id, vendedor_nombre, almacen_id, estado, caja_id,
    created_by_name, fecha, organizacion_id, inventario_aplicado, operacion_id
  ) values (
    nullif(p_venta->>'cliente_id', '')::uuid,
    nullif(left(p_venta->>'cliente_nombre', 200), ''),
    coalesce((p_venta->>'a_credito')::boolean, false),
    coalesce((p_venta->>'subtotal')::numeric, 0),
    coalesce((p_venta->>'itbis')::numeric, 0),
    v_total,
    v_descuento,
    coalesce(nullif(left(p_venta->>'metodo_pago', 50), ''), 'Efectivo'),
    coalesce(p_venta->'pagos', '[]'::jsonb),
    coalesce((p_venta->>'pagado_efectivo')::numeric, 0),
    coalesce((p_venta->>'pagado_tarjeta')::numeric, 0),
    coalesce((p_venta->>'pagado_transferencia')::numeric, 0),
    coalesce((p_venta->>'pagado_otro')::numeric, 0),
    coalesce((p_venta->>'credito_monto')::numeric, 0),
    coalesce((p_venta->>'recibido')::numeric, 0),
    coalesce((p_venta->>'devuelta')::numeric, 0),
    nullif(left(p_venta->>'tipo_comprobante', 30), ''),
    nullif(left(p_venta->>'numero_factura', 80), ''),
    nullif(p_venta->>'vendedor_id', '')::uuid,
    nullif(left(p_venta->>'vendedor_nombre', 200), ''),
    nullif(p_venta->>'almacen_id', '')::uuid,
    'completada',
    nullif(p_venta->>'caja_id', '')::uuid,
    coalesce(v_usuario, nullif(left(p_venta->>'created_by_name', 120), ''), 'Sistema'),
    coalesce(nullif(p_venta->>'fecha', '')::timestamptz, now()),
    v_org,
    false,
    p_operacion_id
  ) returning * into v_venta;

  insert into public.pos_venta_items (
    venta_id, producto_id, nombre, precio, cantidad, itbis, descuento,
    importe, serial, garantia_hasta, organizacion_id, linea_orden
  )
  select
    v_venta.id,
    (e.item->>'producto_id')::uuid,
    left(e.item->>'nombre', 300),
    (e.item->>'precio')::numeric,
    (e.item->>'cantidad')::numeric,
    coalesce((e.item->>'itbis')::boolean, false),
    coalesce((e.item->>'descuento')::numeric, 0),
    (e.item->>'importe')::numeric,
    nullif(left(e.item->>'serial', 1000), ''),
    nullif(e.item->>'garantia_hasta', '')::date,
    v_org,
    e.ord::integer
  from jsonb_array_elements(p_items) with ordinality as e(item, ord);

  if p_reserva_token is not null then
    v_imei_confirmados := public.pos_confirmar_seriales_reservados(
      p_reserva_token, v_venta.id, p_imei_esperados
    );
    if v_imei_confirmados <> p_imei_esperados then
      raise exception 'VENTA_IMEI_CONFIRMACION_INCOMPLETA';
    end if;
  end if;

  v_inv := public.pos_aplicar_inventario_venta(v_venta.id);
  if coalesce((v_inv->>'ok')::boolean, false) is not true then
    raise exception 'VENTA_INVENTARIO_NO_APLICADO';
  end if;

  select * into v_venta from public.pos_ventas where id = v_venta.id;
  return jsonb_build_object(
    'ok', true,
    'reutilizada', false,
    'venta', to_jsonb(v_venta),
    'items', coalesce((select jsonb_agg(to_jsonb(i) order by i.linea_orden nulls last, i.id)
                       from public.pos_venta_items i where i.venta_id = v_venta.id), '[]'::jsonb),
    'imei_confirmados', v_imei_confirmados,
    'inventario', v_inv
  );
end;
$$;

revoke all on function public.pos_registrar_venta_atomica(uuid,jsonb,jsonb,uuid,integer) from public;
revoke all on function public.pos_registrar_venta_atomica(uuid,jsonb,jsonb,uuid,integer) from anon;
grant execute on function public.pos_registrar_venta_atomica(uuid,jsonb,jsonb,uuid,integer) to authenticated;
