-- INVENTARIO VENTA ATÓMICO — RPC
-- pos_aplicar_inventario_venta(p_venta_id uuid) — reemplaza el fire-and-forget de moverStock('venta',...)
-- en nxPosConfirmar (parches.js). Aprobada por el dueño vía ChatGPT (bitácora, 2026-08-09 00:08):
-- SIN stock negativo — si algo no alcanza, no se baja NADA (rollback completo de esta pieza),
-- la venta ya cobrada se queda tal cual, queda como incidencia.
--
-- Decisiones de diseño (justificadas en la bitácora):
-- 1) INVOKER, no SECURITY DEFINER — las 6 tablas que toca (pos_ventas/pos_venta_items/pos_productos/
--    pos_stock_almacen/pos_inv_movimientos/pos_seriales) tienen la MISMA política RLS
--    (mi_rol() is not null AND organizacion_id = mi_organizacion()) que ya usan sin DEFINER las 3
--    RPC de reserva/confirmación/liberación de IMEI — cualquier cajero logueado ya tiene ese permiso
--    de todos modos (así escribe hoy el navegador, sin RPC de por medio).
-- 2) Idempotencia con UN candado: pos_ventas.inventario_aplicado, marcado en un UPDATE condicional
--    ANTES de tocar nada más, dentro de la MISMA transacción — si algo más abajo falla (RAISE),
--    Postgres revierte también esa bandera (semántica estándar de una función sin bloque EXCEPTION).
--    CORREGIDO (2da vuelta, revisión de ChatGPT 2026-08-09 11:38): el DEFAULT de la columna se
--    queda en `true` PARA SIEMPRE (nunca hay un 2do ALTER que lo cambie a `false`) — así, tanto
--    las ventas HISTÓRICAS como CUALQUIER cliente/pestaña con JS VIEJO en caché (que no sabe de
--    esta columna) nacen en `true`, que es correcto porque su inventario ya se descontó por el
--    camino viejo (`moverStock`). SOLO el JS NUEVO (`nxPosConfirmar` en `parches.js`) manda
--    `inventario_aplicado: false` EXPLÍCITO en el `body` del INSERT — es la única venta que nace
--    en `false`, lista para que esta RPC la procese. Ver INVENTARIO_VENTA_ATOMICO_migracion.sql.
-- 3) Lee TODO del lado del servidor por venta_id — nunca recibe el carrito del cliente. Para
--    productos con IMEI, la cantidad real es la cuenta de pos_seriales.estado='vendido' ligados a
--    esa venta+producto (no lo pedido) — así una confirmación de IMEI incompleta nunca descuenta de
--    más de lo que en verdad quedó vendido. Si la cuenta real NO calza con lo que pos_venta_items
--    dice que se pidió, es incidencia — NUNCA se aplica parcial (regla nueva, punto 2 de la revisión
--    de ChatGPT del 2026-08-09 07:52: evita que una unidad quede huérfana para siempre si el IMEI
--    se corrige después y el reintento queda bloqueado por la idempotencia).
-- 4) Decrementos RELATIVOS (`stock = stock - x` con `x <= stock` en el WHERE) — nunca lectura-en-
--    memoria → valor absoluto (la causa real del lost-update entre 2 ventas concurrentes).
-- 5) Todo o nada por venta completa (no por línea): si CUALQUIER línea (total, por almacén, o
--    seriales incompletos) no calza, o el kardex falla, el RAISE revierte TODO lo que esta llamada
--    llevaba hecho — incluidas las líneas anteriores del mismo loop y la bandera inventario_aplicado.
-- 6) La venta debe tener al menos 1 fila real en pos_venta_items antes de darse por aplicada (punto 3
--    de la misma revisión) — el INSERT de items en nxPosConfirmar es best-effort con su propio
--    catch; si ese INSERT falló del todo, la venta quedaría cobrada + marcada "aplicada" para
--    siempre sin haber tocado nunca el stock, sin este candado. Una venta 100% de servicios SÍ
--    puede terminar en 0 líneas de INVENTARIO (los servicios no cuentan), pero debe tener sus
--    filas de pos_venta_items — 0 items en absoluto es la incidencia real.

create or replace function public.pos_aplicar_inventario_venta(p_venta_id uuid)
returns jsonb
language plpgsql
set search_path to 'public'
as $function$
declare
  v_org uuid := mi_organizacion();
  v_rol text := mi_rol();
  v_marcada uuid;
  v_almacen_id uuid;
  v_numero_fac text;
  v_creador text;
  v_linea record;
  v_cant numeric;
  v_stock_nuevo numeric;
  v_stock_alm_nuevo numeric;
  v_n_lineas integer := 0;
begin
  if v_rol is null then
    raise exception 'INVENTARIO_SIN_PERMISO';
  end if;
  if v_org is null then
    raise exception 'INVENTARIO_SIN_ORGANIZACION';
  end if;
  if p_venta_id is null then
    raise exception 'INVENTARIO_VENTA_REQUERIDA';
  end if;

  -- Candado de idempotencia: si esta venta ya se aplicó (o no existe / no es de esta org),
  -- no hay nada más que hacer — se devuelve éxito silencioso, NUNCA se re-descuenta.
  update pos_ventas
     set inventario_aplicado = true
   where id = p_venta_id
     and organizacion_id = v_org
     and inventario_aplicado = false
  returning id, almacen_id, coalesce(numero_factura, 'No. ' || numero::text), created_by_name
    into v_marcada, v_almacen_id, v_numero_fac, v_creador;

  if v_marcada is null then
    return jsonb_build_object('ok', true, 'ya_aplicado', true, 'lineas', 0);
  end if;

  -- Candado nuevo (punto 3): la venta debe tener AL MENOS 1 fila real de items. Si el INSERT de
  -- pos_venta_items en nxPosConfirmar falló por completo (best-effort, con su propio catch), esto
  -- lo atrapa aquí en vez de dar la venta por "aplicada" sin haber tocado nunca el inventario.
  if not exists (select 1 from pos_venta_items where venta_id = p_venta_id) then
    raise exception 'INVENTARIO_VENTA_SIN_ITEMS';
  end if;

  -- Una fila por producto real de la venta (los combos repiten producto_id — se agrupan solos por
  -- el `group by` implícito de las subconsultas escalares de abajo). Servicios quedan fuera: nunca
  -- manejan stock, igual que el resto del sistema.
  for v_linea in
    select p.id as producto_id, p.nombre, p.serial,
           (select coalesce(sum(vi.cantidad), 0) from pos_venta_items vi
             where vi.venta_id = p_venta_id and vi.producto_id = p.id) as esperado,
           case when p.serial then
             (select count(*)::numeric from pos_seriales s
               where s.producto_id = p.id and s.venta_id = p_venta_id and s.estado = 'vendido')
           else
             (select coalesce(sum(vi.cantidad), 0) from pos_venta_items vi
               where vi.venta_id = p_venta_id and vi.producto_id = p.id)
           end as cantidad
      from pos_productos p
     where p.organizacion_id = v_org
       and p.tipo <> 'servicio'
       and p.id in (select distinct vi2.producto_id from pos_venta_items vi2 where vi2.venta_id = p_venta_id)
  loop
    -- Candado nuevo (punto 2): para serializados, lo REALMENTE confirmado (IMEI en estado
    -- 'vendido') debe calzar EXACTO con lo que el carrito pidió. Si no calza (confirmación de
    -- IMEI incompleta), es incidencia — se revierte TODA la aplicación, no se descuenta parcial.
    -- Los IMEI/venta_id existentes NUNCA se tocan ni se liberan aquí — la RPC solo lee pos_seriales.
    if v_linea.serial and v_linea.esperado <> v_linea.cantidad then
      raise exception 'INVENTARIO_SERIALES_INCOMPLETOS: % (esperado %, confirmado %)',
        v_linea.nombre, v_linea.esperado, v_linea.cantidad;
    end if;

    v_cant := v_linea.cantidad;
    if v_cant is null or v_cant <= 0 then continue; end if;
    v_n_lineas := v_n_lineas + 1;

    update pos_productos
       set stock = stock - v_cant
     where id = v_linea.producto_id
       and organizacion_id = v_org
       and stock >= v_cant
    returning stock into v_stock_nuevo;
    if v_stock_nuevo is null then
      raise exception 'INVENTARIO_STOCK_INSUFICIENTE: %', v_linea.nombre;
    end if;

    insert into pos_inv_movimientos
      (organizacion_id, producto_id, producto_nombre, tipo, cantidad, stock_anterior, stock_nuevo,
       referencia, motivo, created_by_name)
    values
      (v_org, v_linea.producto_id, v_linea.nombre, 'venta', -v_cant, v_stock_nuevo + v_cant, v_stock_nuevo,
       v_numero_fac, 'Venta', v_creador);

    -- Multi-almacén: solo si la venta quedó ligada a un almacén (igual criterio que ya usa el
    -- navegador — si la organización no tiene almacenes, almacen_id siempre es null aquí).
    if v_almacen_id is not null then
      update pos_stock_almacen
         set stock = stock - v_cant
       where producto_id = v_linea.producto_id
         and almacen_id = v_almacen_id
         and organizacion_id = v_org
         and stock >= v_cant
      returning stock into v_stock_alm_nuevo;
      if v_stock_alm_nuevo is null then
        raise exception 'INVENTARIO_STOCK_ALMACEN_INSUFICIENTE: %', v_linea.nombre;
      end if;
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'ya_aplicado', false, 'lineas', v_n_lineas);
end;
$function$;

revoke all on function public.pos_aplicar_inventario_venta(uuid) from public;
revoke all on function public.pos_aplicar_inventario_venta(uuid) from anon;
grant execute on function public.pos_aplicar_inventario_venta(uuid) to authenticated;
