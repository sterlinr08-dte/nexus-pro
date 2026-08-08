-- NEXUS PRO — Transferencia de inventario con IMEI atómica
-- RPC única. NO aplicada a producción — para revisión antes de autorizar.
--
-- p_lineas es un jsonb array: [{producto_id, cantidad?, serial_ids?}, ...]
--   - Línea NO serializada: cantidad requerida (> 0), serial_ids se ignora si viene.
--   - Línea serializada (pos_productos.serial = true): serial_ids requerido y NO vacío;
--     cantidad SIEMPRE se deriva de array_length(serial_ids) — nunca del campo cantidad
--     del cliente, aunque venga (mismo criterio que ChatGPT pidió en el punto 1 de la
--     ronda anterior: la cantidad nunca es un dato independiente cuando hay seriales).
--   - `nombre` NO se lee de p_lineas: se toma de pos_productos server-side, para no confiar
--     en una copia del cliente que puede estar desactualizada.
--
-- Candados reales (no optimistas), todos dentro de la MISMA transacción:
--   - Stock por almacén: UPDATE condicional `WHERE stock >= v_cant` (no SELECT-luego-escribe) —
--     dos transferencias concurrentes del mismo stock: la que llegue primero se queda con la fila
--     (lock de Postgres), la otra ve 0 filas afectadas y aborta con TRANSFER_STOCK_INSUFICIENTE.
--   - Seriales: UPDATE condicional `WHERE estado='disponible' AND venta_id IS NULL AND
--     almacen_id=origen AND producto_id=<el de la línea>` — mismo patrón exacto que
--     pos_reservar_seriales usa contra ventas concurrentes. Si una venta ya reservó ese IMEI
--     (estado pasa a 'reservado') o si el IMEI no es de ese producto/almacén, la fila no matchea,
--     el conteo de filas afectadas no cuadra con lo pedido, y la RPC entera aborta.
--   - Numeración: mismo patrón atómico que pos_siguiente_ncf (UPDATE...RETURNING sobre
--     pos_secuencias) — nextSeq() del lado cliente NO se usa aquí a propósito: tiene la
--     misma carrera de lectura-y-escritura que ya se cerró para NCF, y esta pieza la cierra
--     también para transferencias.
--
-- Cualquier RAISE EXCEPTION revierte TODO lo hecho en esta llamada (cabecera, items, seriales,
-- stock, kardex) — nunca queda una transferencia a medias.

create or replace function public.pos_transferir_stock(
  p_origen_id uuid,
  p_destino_id uuid,
  p_fecha date,
  p_notas text,
  p_lineas jsonb,
  p_created_by_name text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_org uuid := mi_organizacion();
  v_origen_nombre text;
  v_destino_nombre text;
  v_head_id uuid;
  v_item_id uuid;
  v_numero text;
  v_ref text;
  v_linea jsonb;
  v_pid uuid;
  v_nombre text;
  v_es_serial boolean;
  v_cant numeric;
  v_serial_ids uuid[];
  v_tomados integer;
  v_stock_origen numeric;
  v_stock_destino numeric;
  v_n_lineas integer := 0;
begin
  if v_org is null then
    raise exception 'TRANSFER_SIN_ORGANIZACION';
  end if;

  if p_origen_id is null or p_destino_id is null then
    raise exception 'TRANSFER_ALMACEN_REQUERIDO';
  end if;
  if p_origen_id = p_destino_id then
    raise exception 'TRANSFER_ORIGEN_IGUAL_DESTINO';
  end if;

  select nombre into v_origen_nombre from pos_almacenes where id = p_origen_id and organizacion_id = v_org;
  if v_origen_nombre is null then raise exception 'TRANSFER_ORIGEN_INVALIDO'; end if;
  select nombre into v_destino_nombre from pos_almacenes where id = p_destino_id and organizacion_id = v_org;
  if v_destino_nombre is null then raise exception 'TRANSFER_DESTINO_INVALIDO'; end if;

  if p_lineas is null or jsonb_typeof(p_lineas) <> 'array' or jsonb_array_length(p_lineas) = 0 then
    raise exception 'TRANSFER_SIN_LINEAS';
  end if;

  -- Numeración atómica — mismo patrón que pos_siguiente_ncf.
  update pos_secuencias
     set proximo = proximo + 1
   where tipo = 'transferencia' and organizacion_id = v_org and coalesce(activo, true)
  returning coalesce(prefijo, '') || lpad((proximo - 1)::text, coalesce(longitud, 5), '0')
    into v_numero;
  if v_numero is null then
    -- Respaldo si la secuencia no está sembrada para esta org (mismo criterio que
    -- transProxNumero()/cotProxNumero() del lado cliente: nunca bloquear por falta de secuencia).
    select 'TR-' || lpad((coalesce(max(nullif(regexp_replace(numero, '\D', '', 'g'), '')::int), 0) + 1)::text, 5, '0')
      into v_numero
      from pos_transferencias where organizacion_id = v_org;
  end if;

  v_ref := v_numero || ' · ' || v_origen_nombre || ' → ' || v_destino_nombre;

  insert into pos_transferencias
    (organizacion_id, numero, fecha, origen_id, destino_id, origen_nombre, destino_nombre, notas, created_by_name)
  values
    (v_org, v_numero, coalesce(p_fecha, current_date), p_origen_id, p_destino_id,
     v_origen_nombre, v_destino_nombre, nullif(trim(coalesce(p_notas, '')), ''), p_created_by_name)
  returning id into v_head_id;

  for v_linea in select * from jsonb_array_elements(p_lineas)
  loop
    v_n_lineas := v_n_lineas + 1;
    v_pid := (v_linea ->> 'producto_id')::uuid;
    if v_pid is null then raise exception 'TRANSFER_LINEA_SIN_PRODUCTO'; end if;

    select serial, nombre into v_es_serial, v_nombre
      from pos_productos where id = v_pid and organizacion_id = v_org;
    if not found then raise exception 'TRANSFER_PRODUCTO_INVALIDO'; end if;

    if v_es_serial then
      if not (v_linea ? 'serial_ids') or jsonb_array_length(coalesce(v_linea -> 'serial_ids', '[]'::jsonb)) = 0 then
        raise exception 'TRANSFER_IMEI_REQUERIDO: %', v_nombre;
      end if;
      select array_agg(x::uuid) into v_serial_ids
        from jsonb_array_elements_text(v_linea -> 'serial_ids') x;
      v_cant := array_length(v_serial_ids, 1);

      -- Candado real: solo toma (y mueve) los seriales que sigan disponibles, sin venta,
      -- del producto correcto y en el almacén origen — mismo patrón que pos_reservar_seriales.
      update pos_seriales
         set almacen_id = p_destino_id
       where organizacion_id = v_org
         and id = any(v_serial_ids)
         and producto_id = v_pid
         and almacen_id = p_origen_id
         and estado = 'disponible'
         and venta_id is null;
      get diagnostics v_tomados = row_count;
      if v_tomados <> v_cant then
        raise exception 'TRANSFER_IMEI_NO_DISPONIBLE: %', v_nombre;
      end if;
    else
      v_serial_ids := null;
      v_cant := (v_linea ->> 'cantidad')::numeric;
      if v_cant is null or v_cant <= 0 then raise exception 'TRANSFER_CANTIDAD_INVALIDA: %', v_nombre; end if;
    end if;

    insert into pos_transferencia_items (organizacion_id, transferencia_id, producto_id, nombre, cantidad)
    values (v_org, v_head_id, v_pid, v_nombre, v_cant)
    returning id into v_item_id;

    if v_serial_ids is not null then
      insert into pos_transferencia_item_seriales (organizacion_id, transferencia_item_id, serial_id)
      select v_org, v_item_id, s from unnest(v_serial_ids) s;
    end if;

    -- Stock del ORIGEN: decremento condicional real (nunca SELECT-luego-escribe).
    update pos_stock_almacen
       set stock = stock - v_cant
     where producto_id = v_pid and almacen_id = p_origen_id and organizacion_id = v_org
       and stock >= v_cant
    returning stock into v_stock_origen;
    if v_stock_origen is null then
      raise exception 'TRANSFER_STOCK_INSUFICIENTE: %', v_nombre;
    end if;

    -- Stock del DESTINO: upsert atómico real sobre el UNIQUE(producto_id, almacen_id) ya existente.
    insert into pos_stock_almacen (organizacion_id, producto_id, almacen_id, stock)
    values (v_org, v_pid, p_destino_id, v_cant)
    on conflict (producto_id, almacen_id)
    do update set stock = pos_stock_almacen.stock + v_cant
    returning stock into v_stock_destino;

    -- Kardex: 2 movimientos por línea, mismas 10 columnas que ya usa moverStockTransferencia
    -- (logMov x2) del lado cliente, ahora dentro de la misma transacción.
    insert into pos_inv_movimientos
      (organizacion_id, producto_id, producto_nombre, tipo, cantidad, stock_anterior, stock_nuevo, referencia, motivo, created_by_name)
    values
      (v_org, v_pid, v_nombre, 'transferencia', -v_cant, v_stock_origen + v_cant, v_stock_origen, v_ref, 'Salida ' || v_numero, p_created_by_name);
    insert into pos_inv_movimientos
      (organizacion_id, producto_id, producto_nombre, tipo, cantidad, stock_anterior, stock_nuevo, referencia, motivo, created_by_name)
    values
      (v_org, v_pid, v_nombre, 'transferencia', v_cant, v_stock_destino - v_cant, v_stock_destino, v_ref, 'Entrada ' || v_numero, p_created_by_name);
  end loop;

  return jsonb_build_object('id', v_head_id, 'numero', v_numero, 'lineas', v_n_lineas);
end;
$function$;

revoke all on function public.pos_transferir_stock(uuid, uuid, date, text, jsonb, text) from public;
revoke all on function public.pos_transferir_stock(uuid, uuid, date, text, jsonb, text) from anon;
grant execute on function public.pos_transferir_stock(uuid, uuid, date, text, jsonb, text) to authenticated;

-- Verificación esperada tras aplicar (has_function_privilege):
--   anon          -> false
--   authenticated -> true
