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
--     el conteo de filas afectadas no cuadra con lo pedido, y la RPC entera aborta. El mismo
--     mecanismo (row_count contra lo pedido) rechaza de paso 3 casos reales de integridad
--     verificados con datos de prueba (ChatGPT, punto 6): serial_ids con un UUID duplicado dentro
--     de la misma línea (`= any(array)` solo toca la fila UNA vez sin importar cuántas veces se
--     repita en el array, así que el conteo de filas tocadas queda por debajo del array_length
--     pedido y revienta), un serial de OTRA organización (el `organizacion_id = v_org` del WHERE
--     lo excluye de raíz, nunca matchea), y un serial válido mezclado con uno inválido en la misma
--     línea (el válido no persiste porque el RAISE de esta misma sentencia revierte TODA la
--     llamada, cabecera incluida — no hay forma de que la parte "buena" quede a medias).
--   - Numeración: UPSERT atómico real sobre `pos_secuencias` (UNIQUE(organizacion_id, tipo)
--     confirmado por `pg_constraint`) — REVISIÓN (ChatGPT, punto 1): se eliminó por completo el
--     fallback `MAX(numero)+1` que tenía la primera versión. Ya no existe NINGÚN camino que calcule
--     el número por conteo — si la organización no tiene fila `pos_secuencias` para
--     `tipo='transferencia'` (nunca tocó "Ajustes → Secuencias"), el mismo `INSERT ... ON
--     CONFLICT ... DO UPDATE` la crea y la incrementa en la MISMA sentencia atómica — no hay
--     ninguna ventana entre "crear" e "incrementar" donde dos llamadas concurrentes puedan verse
--     ambas como "la primera". Valores de siembra confirmados contra las 2 organizaciones reales
--     que ya tienen esta secuencia (`prefijo='TR-'`, `longitud=5`, `nombre='Transferencia /
--     Despacho'` — mismos valores que ya siembra `nxSecInit()` del lado cliente). Si el admin
--     desactivó la secuencia (`activo=false`), la fila NO se toca (el `WHERE` del `DO UPDATE` lo
--     impide) y la RPC falla cerrado con un error administrativo claro — nunca inventa un número.
--     `nextSeq('transferencia')` del lado cliente ya NO se usa (tenía la misma carrera de lectura-
--     y-escritura que ya se había cerrado para NCF).
--   - Autorización (ChatGPT, punto 3): además de `REVOKE FROM PUBLIC/anon` + `GRANT TO
--     authenticated` (capa de "¿puede llamar la función?"), la RPC ahora exige explícitamente
--     `mi_rol() is not null` — la MISMA condición, ni más estricta ni más laxa, que ya usan las
--     políticas RLS reales de TODAS las tablas que esta RPC toca (`pos_stock_almacen`,
--     `pos_seriales`, `pos_transferencias`, `pos_transferencia_items`,
--     `pos_transferencia_item_seriales`: las 5 confirmadas con `pg_policies`, todas
--     `USING(mi_rol() is not null AND organizacion_id = mi_organizacion())`). NO se inventó un rol
--     "admin-only" para esta RPC — ese rol no existe en ningún candado real del sistema hoy: el
--     modelo de roles del cliente (`ROLES_DEF`/`puedeVer()` en parches.js) es SOLO una restricción
--     de interfaz para la función "Ver como [rol]" de vista previa — verificado contra el propio
--     comentario del código real ("todos los usuarios del POS tienen sesion.rol='admin', así que
--     hoy puedeVer=true salvo en preview") y confirmado que TODA cuenta de staff real hoy tiene
--     `mi_rol()='admin'` a nivel de base — inventar aquí una regla server-side más estricta que
--     "cualquier usuario de la organización" habría sido inconsistente con cómo ya se protege el
--     resto de las tablas `pos_*` (un usuario que hoy puede escribir `pos_stock_almacen`/
--     `pos_seriales` directo por REST ya tiene ese mismo acceso con o sin esta RPC).
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
  v_rol text := mi_rol();
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
  -- Autorización server-side (punto 3): misma condición exacta que la RLS real de las 5 tablas
  -- que esta RPC toca — mi_rol() is not null. No es un chequeo redundante con v_org: mi_rol()
  -- solo necesita la fila de `profiles`, mi_organizacion() necesita además el join hasta
  -- `usuarios_sistema` — son 2 candados independientes, mismo par que ya exige cada policy real.
  if v_rol is null then
    raise exception 'TRANSFER_SIN_PERMISO';
  end if;

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

  -- Numeración atómica — SIN fallback MAX()+1 bajo ninguna circunstancia (punto 1). Un solo
  -- UPSERT real sobre el UNIQUE(organizacion_id, tipo) confirmado: si la fila ya existe (siempre
  -- el caso hoy, ya sembrada por nxSecInit() del lado cliente), la incrementa; si no existe
  -- todavía, la CREA ya incrementada en la MISMA sentencia atómica — nunca hay una ventana entre
  -- "sembrar" e "incrementar" donde dos llamadas concurrentes puedan verse ambas como la primera.
  -- Semántica de `proximo`: siempre representa el próximo número SIN emitir. Se siembra con 2
  -- (no 1) porque VALUES() ya representa la fila tras el primer incremento implícito de esta
  -- misma llamada — RETURNING (proximo-1) da 1 como primer número emitido, igual que si la fila
  -- hubiera nacido en 1 (por nxSecInit) y luego se hubiera incrementado a 2 en un segundo paso.
  insert into pos_secuencias (organizacion_id, tipo, nombre, prefijo, longitud, proximo, activo)
  values (v_org, 'transferencia', 'Transferencia / Despacho', 'TR-', 5, 2, true)
  on conflict (organizacion_id, tipo) do update
     set proximo = pos_secuencias.proximo + 1
   where pos_secuencias.activo
  returning coalesce(prefijo, '') || lpad((proximo - 1)::text, coalesce(longitud, 5), '0')
    into v_numero;
  -- v_numero solo queda null si la fila YA existía y estaba activo=false (el WHERE del DO UPDATE
  -- se comporta como DO NOTHING) — nunca por falta de fila, esa rama ya la cubre el INSERT.
  if v_numero is null then
    raise exception 'TRANSFER_SECUENCIA_INACTIVA';
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
