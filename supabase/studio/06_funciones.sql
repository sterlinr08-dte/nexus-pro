-- STUDIO — 06 funciones
-- pg_get_functiondef() literal (cuerpos sin modificar) de:
--   * 6 funciones de trigger no pos_ referenciadas por 07_triggers.sql: set_auditoria_metadata,
--     nx_capturar_excepcion_operativa, nx_validar_caja_propietario, nx_caja_asignar_propietario,
--     nx_caja_proteger_actualizacion, nx_impedir_cambio_organizacion.
--   * 62 funciones public.pos_* (no existe ninguna rrhh_* en la base madre).
-- set_organizacion_id, mi_organizacion, mi_rol, mi_usuario_id y mi_agente_efectivo están en 02_helpers.sql.
--
-- Orden: helpers de trigger, funciones LANGUAGE sql simples, luego plpgsql alfabético; el wrapper SQL
-- pos_fin_registrar_pago va justo después de pos_fin_registrar_pago_v2. check_function_bodies=off por
-- seguridad para las funciones SQL.
--
-- FLAGS (referencias fuera del set, ver README.md):
--   - nx_capturar_excepcion_operativa inserta en public.operacion_excepciones (tabla NO incluida).
--   - pos_asegurar_cuentas_operativas, pos_reconstruir_asiento_compra, pos_reconstruir_asiento_venta y
--     pos_snapshot_costo_venta_item tienen hardcodeado el uuid de organización
--     'e404d1c4-24c5-4e17-88f6-84bef09d6d19' (organización de la madre): en STUDIO no harán nada.

set check_function_bodies = off;

-- ================================================================ helpers de trigger (no pos_)
CREATE OR REPLACE FUNCTION public.set_auditoria_metadata()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  headers json;
  fwd text;
begin
  begin
    headers := current_setting('request.headers', true)::json;
  exception when others then
    headers := null;
  end;
  if headers is not null then
    if new.ip is null or new.ip = '' then
      fwd := headers->>'x-forwarded-for';
      if fwd is not null and fwd <> '' then
        new.ip := split_part(fwd, ',', 1);
      elsif headers->>'cf-connecting-ip' is not null and headers->>'cf-connecting-ip' <> '' then
        new.ip := headers->>'cf-connecting-ip';
      end if;
    end if;
    if new.device is null or new.device = '' then
      new.device := headers->>'user-agent';
    end if;
  end if;
  if new.created_at is null then
    new.created_at := now();
  end if;
  if new.usuario is null or new.usuario = '' then
    new.usuario := 'Sistema';
  end if;
  if new.organizacion_id is null then
    begin
      new.organizacion_id := public.mi_organizacion();
    exception when others then
      null;
    end;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.nx_capturar_excepcion_operativa()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_severidad text;
begin
  if new.accion not in (
    'POS_VENTA_IMEI_SIN_CONFIRMAR',
    'POS_VENTA_ITEMS_INCOMPLETOS',
    'REP_ENTREGA_INCOMPLETA',
    'POS_VENTA_INVENTARIO_PENDIENTE',
    'ASIENTO_DESCUADRADO'
  ) then
    return new;
  end if;

  v_severidad := case
    when new.accion = 'REP_ENTREGA_INCOMPLETA' then 'alta'
    else 'critica'
  end;

  insert into public.operacion_excepciones (
    auditoria_id, organizacion_id, tipo, modulo, severidad, detalle, detectada_en
  ) values (
    new.id,
    new.organizacion_id,
    new.accion,
    coalesce(nullif(new.modulo, ''), 'Sistema'),
    v_severidad,
    new.detalle,
    coalesce(new.created_at, nullif(new.ts, '')::timestamptz, now())
  )
  on conflict (auditoria_id) do nothing;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.nx_validar_caja_propietario()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.nx_caja_asignar_propietario()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.nx_caja_proteger_actualizacion()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.nx_impedir_cambio_organizacion()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.organizacion_id is distinct from old.organizacion_id then
    raise exception 'organizacion_id es inmutable' using errcode = '23514';
  end if;
  return new;
end;
$function$
;

-- ================================================================ pos_* LANGUAGE sql (helpers simples)
CREATE OR REPLACE FUNCTION public.pos_periodo_esta_cerrado(p_org uuid, p_fecha date)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select exists(select 1 from public.pos_periodos_contables where organizacion_id=p_org and periodo=date_trunc('month',p_fecha)::date and estado='cerrado')
$function$
;

CREATE OR REPLACE FUNCTION public.pos_credito_saldo_principal(p_financiamiento_id uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select coalesce(sum(greatest(c.monto - coalesce((
    select sum(case when p.tipo='pago' then coalesce(p.monto_principal,0)
                    when p.tipo='reversa' then -coalesce(p.monto_principal,0) else 0 end)
    from public.pos_fin_pagos p
    where p.organizacion_id=c.organizacion_id and p.cuota_id=c.id
  ),0),0)),0)
  from public.pos_fin_cuotas c
  where c.organizacion_id=mi_organizacion() and c.financiamiento_id=p_financiamiento_id
$function$
;

CREATE OR REPLACE FUNCTION public.pos_fin_pago_neto(p_cuota_id uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select coalesce(sum(case when tipo='pago' then monto when tipo='reversa' then -monto else 0 end),0)
  from public.pos_fin_pagos
  where cuota_id=p_cuota_id and organizacion_id=mi_organizacion();
$function$
;

CREATE OR REPLACE FUNCTION public.pos_banco_resumen(p_cuenta_id uuid)
 RETURNS TABLE(saldo_libro numeric, saldo_conciliado numeric, pendientes_sistema bigint, pendientes_extracto bigint)
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  select
    c.saldo_inicial+coalesce((select sum(m.monto) from public.pos_banco_movimientos m where m.cuenta_bancaria_id=c.id),0) as saldo_libro,
    c.saldo_inicial+coalesce((select sum(m.monto) from public.pos_banco_movimientos m where m.cuenta_bancaria_id=c.id and exists(select 1 from public.pos_banco_conciliaciones x where x.movimiento_id=m.id)),0) as saldo_conciliado,
    (select count(*) from public.pos_banco_movimientos m where m.cuenta_bancaria_id=c.id and not exists(select 1 from public.pos_banco_conciliaciones x where x.movimiento_id=m.id)),
    (select count(*) from public.pos_banco_extractos e where e.cuenta_bancaria_id=c.id and not exists(select 1 from public.pos_banco_conciliaciones x where x.extracto_id=e.id))
  from public.pos_cuentas_bancarias c
  where c.id=p_cuenta_id and c.organizacion_id=mi_organizacion();
$function$
;

CREATE OR REPLACE FUNCTION public.pos_inventario_conciliacion()
 RETURNS TABLE(producto_id uuid, producto_nombre text, stock_global numeric, stock_almacenes numeric, diferencia numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
$function$
;

-- ================================================================ pos_* plpgsql
CREATE OR REPLACE FUNCTION public.pos_abrir_mi_caja(p_monto_inicial numeric)
 RETURNS pos_cajas
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_caja public.pos_cajas%rowtype;
begin
  if public.mi_rol() is null then raise exception 'CAJA_SIN_PERMISO'; end if;
  if coalesce(p_monto_inicial,0) < 0 then raise exception 'CAJA_MONTO_INICIAL_INVALIDO'; end if;
  if exists(select 1 from public.pos_cajas where organizacion_id=public.mi_organizacion() and usuario_id=auth.uid() and estado='abierta') then
    raise exception 'CAJA_USUARIO_YA_TIENE_ABIERTA';
  end if;
  insert into public.pos_cajas(monto_inicial) values(coalesce(p_monto_inicial,0)) returning * into v_caja;
  return v_caja;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_apartado_expirar_vencidos()
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_org uuid:=mi_organizacion(); r record; n integer:=0;
begin
  if mi_rol() not in ('admin','gerente','cajero') then raise exception 'APARTADO_SIN_PERMISO'; end if;
  for r in select id from public.pos_apartados where organizacion_id=v_org and fecha_limite<current_date and lower(coalesce(estado,'')) not in ('cancelado','entregado','vencido') for update
  loop
    perform public.pos_apartado_liberar_reserva(r.id,'vencido'); n:=n+1;
  end loop;
  return n;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_apartado_liberar_reserva(p_apartado_id uuid, p_estado text DEFAULT 'cancelado'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_apartado_reservar_imei(p_apartado_id uuid, p_cliente_id uuid, p_almacen_id uuid, p_serial_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_aplicar_inventario_venta(p_venta_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.pos_asegurar_cuentas_operativas(p_org uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if p_org is null then raise exception 'CONTABILIDAD_ORG_REQUERIDA'; end if;
  if p_org <> 'e404d1c4-24c5-4e17-88f6-84bef09d6d19'::uuid then return; end if;
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
$function$
;

CREATE OR REPLACE FUNCTION public.pos_banco_asignar_pago_venta(p_venta_id uuid, p_cuenta_id uuid, p_monto numeric, p_metodo text, p_referencia text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_org uuid:=mi_organizacion(); v_venta public.pos_ventas%rowtype; v_asignado numeric:=0; v_max numeric:=0; v_id uuid; v_met text;
begin
  if mi_rol() not in ('admin','gerente','cajero') then raise exception 'BANCO_SIN_PERMISO'; end if;
  select * into v_venta from public.pos_ventas
  where id=p_venta_id and organizacion_id=v_org and estado='completada'
  for update;
  if v_venta.id is null then raise exception 'BANCO_VENTA_INVALIDA'; end if;
  if not exists(select 1 from public.pos_cuentas_bancarias where id=p_cuenta_id and organizacion_id=v_org and activa) then raise exception 'BANCO_CUENTA_INVALIDA'; end if;
  v_met:=lower(trim(coalesce(p_metodo,'')));
  if v_met='tarjeta' then v_max:=coalesce(v_venta.pagado_tarjeta,0); elsif v_met='transferencia' then v_max:=coalesce(v_venta.pagado_transferencia,0); else raise exception 'BANCO_METODO_INVALIDO'; end if;
  select coalesce(sum(monto),0) into v_asignado from public.pos_banco_movimientos where organizacion_id=v_org and origen_tipo='venta_'||v_met and origen_id=p_venta_id;
  if coalesce(p_monto,0)<=0 or v_asignado+p_monto>v_max+0.01 then raise exception 'BANCO_MONTO_EXCEDE_PAGO'; end if;
  insert into public.pos_banco_movimientos(organizacion_id,cuenta_bancaria_id,fecha,monto,concepto,referencia,origen_tipo,origen_id,origen_clave,creado_por)
  values(v_org,p_cuenta_id,v_venta.fecha,p_monto,'Cobro de venta '||coalesce(v_venta.numero_factura,v_venta.numero::text),nullif(trim(p_referencia),''),'venta_'||v_met,p_venta_id,
    'venta:'||p_venta_id::text||':'||v_met||':'||(select count(*)+1 from public.pos_banco_movimientos where organizacion_id=v_org and origen_tipo='venta_'||v_met and origen_id=p_venta_id),auth.uid())
  returning id into v_id;
  return v_id;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_banco_clasificar_compra_contado(p_compra_id uuid, p_metodo text, p_cuenta_id uuid DEFAULT NULL::uuid, p_referencia text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_org uuid:=mi_organizacion(); v_c public.pos_compras%rowtype; v_aid uuid; v_pid uuid; v_mov uuid; v_met text;
begin
  if mi_rol() not in ('admin','gerente') then raise exception 'BANCO_SIN_PERMISO'; end if;
  select * into v_c from public.pos_compras
  where id=p_compra_id and organizacion_id=v_org and estado='recibida'
  for update;
  if v_c.id is null or v_c.a_credito then raise exception 'BANCO_COMPRA_INVALIDA'; end if;
  v_met:=lower(trim(coalesce(p_metodo,'')));
  if v_met not in ('efectivo','banco') then raise exception 'BANCO_METODO_INVALIDO'; end if;
  if exists(select 1 from public.pos_compra_pagos where compra_id=v_c.id) then raise exception 'BANCO_COMPRA_YA_CLASIFICADA'; end if;
  if v_met='banco' and not exists(select 1 from public.pos_cuentas_bancarias where id=p_cuenta_id and organizacion_id=v_org and activa) then raise exception 'BANCO_CUENTA_INVALIDA'; end if;
  insert into public.pos_compra_pagos(organizacion_id,compra_id,monto,metodo,referencia,nota,cuenta_bancaria_id)
  values(v_org,v_c.id,v_c.total,case when v_met='banco' then 'Banco' else 'Efectivo' end,nullif(trim(p_referencia),''),'Clasificación de compra de contado',case when v_met='banco' then p_cuenta_id else null end)
  returning id into v_pid;
  select id into v_aid from public.pos_asientos where organizacion_id=v_org and tipo='compra' and origen_id=v_c.id;
  if v_aid is null then perform public.pos_reconstruir_asiento_compra(v_c.id); select id into v_aid from public.pos_asientos where organizacion_id=v_org and tipo='compra' and origen_id=v_c.id; end if;
  update public.pos_asiento_lineas l set cuenta_id=c.id,cuenta_codigo=c.codigo,cuenta_nombre=c.nombre,
    descripcion=case when v_met='banco' then 'Pago de compra por banco' else 'Pago de compra en efectivo' end
  from public.pos_cuentas c where l.asiento_id=v_aid and l.cuenta_codigo='2199' and c.organizacion_id=v_org and c.codigo=case when v_met='banco' then '1102' else '1101' end;
  if v_met='banco' then
    insert into public.pos_banco_movimientos(organizacion_id,cuenta_bancaria_id,fecha,monto,concepto,referencia,origen_tipo,origen_id,origen_clave,creado_por)
    values(v_org,p_cuenta_id,v_c.fecha::timestamptz,-v_c.total,'Pago compra '||v_c.numero::text,nullif(trim(p_referencia),''),'compra_contado',v_c.id,'compra_contado:'||v_c.id::text,auth.uid()) returning id into v_mov;
  end if;
  return v_pid;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_banco_conciliar(p_movimiento_id uuid, p_extracto_id uuid, p_nota text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_org uuid:=mi_organizacion(); v_m public.pos_banco_movimientos%rowtype; v_e public.pos_banco_extractos%rowtype; v_id uuid;
begin
  if mi_rol() not in ('admin','gerente') then raise exception 'BANCO_SIN_PERMISO'; end if;
  select * into v_m from public.pos_banco_movimientos where id=p_movimiento_id and organizacion_id=v_org;
  select * into v_e from public.pos_banco_extractos where id=p_extracto_id and organizacion_id=v_org;
  if v_m.id is null or v_e.id is null or v_m.cuenta_bancaria_id<>v_e.cuenta_bancaria_id then raise exception 'BANCO_CONCILIACION_INVALIDA'; end if;
  if abs(v_m.monto-v_e.monto)>0.01 then raise exception 'BANCO_MONTO_NO_COINCIDE'; end if;
  if exists(select 1 from public.pos_banco_conciliaciones where movimiento_id=v_m.id or extracto_id=v_e.id) then raise exception 'BANCO_YA_CONCILIADO'; end if;
  insert into public.pos_banco_conciliaciones(organizacion_id,cuenta_bancaria_id,movimiento_id,extracto_id,nota,conciliado_por)
  values(v_org,v_m.cuenta_bancaria_id,v_m.id,v_e.id,nullif(trim(p_nota),''),auth.uid()) returning id into v_id;
  return v_id;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_banco_desconciliar(p_conciliacion_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if mi_rol() not in ('admin','gerente') then raise exception 'BANCO_SIN_PERMISO'; end if;
  delete from public.pos_banco_conciliaciones where id=p_conciliacion_id and organizacion_id=mi_organizacion();
  return found;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_banco_guardar_cuenta(p_id uuid, p_banco_nombre text, p_alias text, p_numero text, p_tipo text DEFAULT 'corriente'::text, p_moneda text DEFAULT 'DOP'::text, p_saldo_inicial numeric DEFAULT 0, p_fecha_saldo_inicial date DEFAULT CURRENT_DATE, p_predeterminada boolean DEFAULT false, p_activa boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_org uuid:=mi_organizacion(); v_id uuid;
begin
  if mi_rol() not in ('admin','gerente') then raise exception 'BANCO_SIN_PERMISO'; end if;
  if v_org is null then raise exception 'BANCO_ORG_REQUERIDA'; end if;
  if length(trim(coalesce(p_banco_nombre,'')))<2 or length(trim(coalesce(p_alias,'')))<2 or length(trim(coalesce(p_numero,'')))<3 then
    raise exception 'BANCO_DATOS_INCOMPLETOS';
  end if;
  if p_tipo not in ('corriente','ahorros','otro') then raise exception 'BANCO_TIPO_INVALIDO'; end if;
  if p_predeterminada then update public.pos_cuentas_bancarias set predeterminada=false,updated_at=now() where organizacion_id=v_org and id is distinct from p_id; end if;
  if p_id is null then
    insert into public.pos_cuentas_bancarias(organizacion_id,banco_nombre,alias,numero,tipo,moneda,saldo_inicial,fecha_saldo_inicial,predeterminada,activa)
    values(v_org,trim(p_banco_nombre),trim(p_alias),trim(p_numero),p_tipo,upper(coalesce(nullif(trim(p_moneda),''),'DOP')),coalesce(p_saldo_inicial,0),coalesce(p_fecha_saldo_inicial,current_date),coalesce(p_predeterminada,false),coalesce(p_activa,true))
    returning id into v_id;
  else
    update public.pos_cuentas_bancarias set banco_nombre=trim(p_banco_nombre),alias=trim(p_alias),numero=trim(p_numero),tipo=p_tipo,
      moneda=upper(coalesce(nullif(trim(p_moneda),''),'DOP')),saldo_inicial=coalesce(p_saldo_inicial,0),fecha_saldo_inicial=coalesce(p_fecha_saldo_inicial,current_date),
      predeterminada=coalesce(p_predeterminada,false),activa=coalesce(p_activa,true),updated_at=now()
    where id=p_id and organizacion_id=v_org returning id into v_id;
    if v_id is null then raise exception 'BANCO_CUENTA_NO_ENCONTRADA'; end if;
  end if;
  return v_id;
exception when unique_violation then
  raise exception 'BANCO_CUENTA_DUPLICADA';
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_banco_registrar_extracto(p_cuenta_id uuid, p_fecha date, p_monto numeric, p_descripcion text, p_referencia text DEFAULT NULL::text, p_fingerprint text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_org uuid:=mi_organizacion(); v_id uuid; v_fp text;
begin
  if mi_rol() not in ('admin','gerente') then raise exception 'BANCO_SIN_PERMISO'; end if;
  if not exists(select 1 from public.pos_cuentas_bancarias where id=p_cuenta_id and organizacion_id=v_org and activa) then raise exception 'BANCO_CUENTA_INVALIDA'; end if;
  if coalesce(p_monto,0)=0 or p_fecha is null or length(trim(coalesce(p_descripcion,'')))<2 then raise exception 'BANCO_EXTRACTO_INVALIDO'; end if;
  v_fp:=coalesce(nullif(trim(p_fingerprint),''),md5(p_cuenta_id::text||'|'||p_fecha::text||'|'||round(p_monto,2)::text||'|'||lower(trim(p_descripcion))||'|'||coalesce(trim(p_referencia),'')));
  insert into public.pos_banco_extractos(organizacion_id,cuenta_bancaria_id,fecha,monto,descripcion,referencia,fingerprint,creado_por)
  values(v_org,p_cuenta_id,p_fecha,p_monto,trim(p_descripcion),nullif(trim(p_referencia),''),v_fp,auth.uid())
  returning id into v_id;
  return v_id;
exception when unique_violation then raise exception 'BANCO_EXTRACTO_DUPLICADO';
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_banco_registrar_pago_proveedor(p_compra_id uuid, p_monto numeric, p_metodo text, p_cuenta_id uuid DEFAULT NULL::uuid, p_referencia text DEFAULT NULL::text, p_nota text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_org uuid:=mi_organizacion(); v_c public.pos_compras%rowtype; v_pagado numeric:=0; v_pid uuid; v_aid uuid; v_met text; v_mov uuid;
begin
  if mi_rol() not in ('admin','gerente','cajero') then raise exception 'BANCO_SIN_PERMISO'; end if;
  select * into v_c from public.pos_compras
  where id=p_compra_id and organizacion_id=v_org and estado='recibida'
  for update;
  if v_c.id is null or not v_c.a_credito then raise exception 'BANCO_COMPRA_CREDITO_INVALIDA'; end if;
  select coalesce(sum(monto),0) into v_pagado from public.pos_compra_pagos where compra_id=v_c.id;
  if coalesce(p_monto,0)<=0 or v_pagado+p_monto>v_c.total+0.01 then raise exception 'BANCO_PAGO_EXCEDE_SALDO'; end if;
  v_met:=lower(trim(coalesce(p_metodo,'')));
  if v_met not in ('efectivo','banco') then raise exception 'BANCO_METODO_INVALIDO'; end if;
  if v_met='banco' and not exists(select 1 from public.pos_cuentas_bancarias where id=p_cuenta_id and organizacion_id=v_org and activa) then raise exception 'BANCO_CUENTA_INVALIDA'; end if;
  insert into public.pos_compra_pagos(organizacion_id,compra_id,monto,metodo,referencia,nota,cuenta_bancaria_id)
  values(v_org,v_c.id,p_monto,case when v_met='banco' then 'Banco' else 'Efectivo' end,nullif(trim(p_referencia),''),nullif(trim(p_nota),''),case when v_met='banco' then p_cuenta_id else null end)
  returning id into v_pid;
  insert into public.pos_asientos(organizacion_id,fecha,concepto,referencia,tipo,origen_id,numero)
  values(v_org,current_date,'Pago a proveedor · Compra '||v_c.numero::text,coalesce(nullif(trim(p_referencia),''),v_c.numero::text),'pago_proveedor',v_pid,'PP-'||substr(v_pid::text,1,8)) returning id into v_aid;
  insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
  select v_org,v_aid,id,codigo,nombre,'Disminución cuenta por pagar',p_monto,0 from public.pos_cuentas where organizacion_id=v_org and codigo='2101';
  insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
  select v_org,v_aid,id,codigo,nombre,case when v_met='banco' then 'Salida por banco' else 'Salida de efectivo' end,0,p_monto from public.pos_cuentas where organizacion_id=v_org and codigo=case when v_met='banco' then '1102' else '1101' end;
  if v_met='banco' then
    insert into public.pos_banco_movimientos(organizacion_id,cuenta_bancaria_id,fecha,monto,concepto,referencia,origen_tipo,origen_id,origen_clave,creado_por)
    values(v_org,p_cuenta_id,now(),-p_monto,'Pago proveedor · Compra '||v_c.numero::text,nullif(trim(p_referencia),''),'pago_proveedor',v_pid,'pago_proveedor:'||v_pid::text,auth.uid()) returning id into v_mov;
  end if;
  return v_pid;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_cerrar_anio(p_anio integer)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare m integer; n integer:=0;
begin
  if mi_rol()<>'admin' then raise exception 'CONTABILIDAD_CIERRE_SOLO_ADMIN'; end if;
  if p_anio is null or p_anio>=extract(year from current_date)::integer then raise exception 'CONTABILIDAD_ANIO_NO_TERMINADO'; end if;
  for m in 1..12 loop perform public.pos_cerrar_periodo(make_date(p_anio,m,1)); n:=n+1; end loop;
  return n;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_cerrar_mi_caja(p_caja_id uuid, p_efectivo_contado numeric, p_notas text DEFAULT NULL::text)
 RETURNS pos_cajas
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_cerrar_periodo(p_periodo date)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_org uuid:=mi_organizacion(); v_mes date:=date_trunc('month',p_periodo)::date; v_fin date; v_malos integer;
begin
  if mi_rol()<>'admin' then raise exception 'CONTABILIDAD_CIERRE_SOLO_ADMIN'; end if;
  if p_periodo is null then raise exception 'CONTABILIDAD_PERIODO_REQUERIDO'; end if;
  v_fin:=(v_mes + interval '1 month' - interval '1 day')::date;
  if v_fin>=date_trunc('month',current_date)::date then raise exception 'CONTABILIDAD_SOLO_MESES_TERMINADOS'; end if;
  select count(*) into v_malos from (
    select a.id from public.pos_asientos a left join public.pos_asiento_lineas l on l.asiento_id=a.id
    where a.organizacion_id=v_org and a.fecha between v_mes and v_fin
    group by a.id having count(l.id)=0 or abs(coalesce(sum(l.debito),0)-coalesce(sum(l.credito),0))>0.01
  ) q;
  if v_malos>0 then raise exception 'CONTABILIDAD_ASIENTOS_INVALIDOS %',v_malos; end if;
  insert into public.pos_periodos_contables(organizacion_id,periodo,estado,cerrado_at,cerrado_por,updated_at)
  values(v_org,v_mes,'cerrado',now(),auth.uid(),now())
  on conflict (organizacion_id,periodo) do update set estado='cerrado',cerrado_at=now(),cerrado_por=auth.uid(),updated_at=now();
  return true;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_confirmar_seriales_reservados(p_reserva_token uuid, p_venta_id uuid, p_esperados integer)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid := public.mi_organizacion();
  v_count integer := 0;
begin
  if v_org is null then
    raise exception 'IMEI_SIN_ORGANIZACION';
  end if;

  if p_esperados is null or p_esperados < 1 then
    raise exception 'IMEI_CONFIRMACION_INVALIDA';
  end if;

  update public.pos_seriales
     set estado = 'vendido',
         venta_id = p_venta_id,
         reserva_token = null,
         reserva_hasta = null
   where organizacion_id = v_org
     and reserva_token = p_reserva_token
     and estado = 'reservado'
     -- Normalmente venta_id es NULL. Si una incidencia ya quedó fijada a esta misma venta,
     -- la confirmación sigue siendo reintentable e idempotente respecto a esa factura.
     and (venta_id is null or venta_id = p_venta_id);

  get diagnostics v_count = row_count;

  -- Nunca confirmar solo una parte: el RAISE revierte todo el UPDATE de esta RPC.
  if v_count <> p_esperados then
    raise exception 'IMEI_RESERVA_INCOMPLETA';
  end if;

  return v_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.pos_credito_castigar(p_financiamiento_id uuid, p_motivo text)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_org uuid:=mi_organizacion(); v public.pos_financiamientos%rowtype; v_saldo numeric; v_aid uuid;
begin
  if mi_rol() not in ('admin','gerente') then raise exception 'CREDITO_CASTIGO_SIN_PERMISO'; end if;
  if length(trim(coalesce(p_motivo,'')))<5 then raise exception 'CREDITO_CASTIGO_MOTIVO_REQUERIDO'; end if;
  select * into v from public.pos_financiamientos where id=p_financiamiento_id and organizacion_id=v_org for update;
  if v.id is null or v.estado<>'activo' then raise exception 'CREDITO_FINANCIAMIENTO_NO_ACTIVO'; end if;
  v_saldo:=public.pos_credito_saldo_principal(v.id);
  if v_saldo<=0.01 then raise exception 'CREDITO_SIN_SALDO'; end if;
  insert into public.pos_cuentas(organizacion_id,codigo,nombre,tipo,naturaleza,activo)
  values(v_org,'5201','Pérdidas por cuentas incobrables','gasto','deudora',true)
  on conflict (organizacion_id,codigo) do update set nombre=excluded.nombre,tipo=excluded.tipo,naturaleza=excluded.naturaleza,activo=true;
  update public.pos_financiamientos set estado='castigado',castigo_monto=v_saldo,castigo_fecha=current_date,castigo_motivo=trim(p_motivo),castigo_por=auth.uid() where id=v.id;
  insert into public.pos_credito_eventos(organizacion_id,cliente_id,financiamiento_id,tipo,monto,nota,creado_por)
  values(v_org,v.cliente_id,v.id,'castigo',v_saldo,trim(p_motivo),auth.uid());
  insert into public.pos_asientos(organizacion_id,fecha,concepto,referencia,tipo,origen_id,numero)
  values(v_org,current_date,'Castigo de cuenta incobrable',substr(v.id::text,1,8),'castigo_credito',v.id,'CI-'||substr(v.id::text,1,8)) returning id into v_aid;
  insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
  select v_org,v_aid,id,codigo,nombre,'Pérdida por crédito incobrable',v_saldo,0 from public.pos_cuentas where organizacion_id=v_org and codigo='5201';
  insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
  select v_org,v_aid,id,codigo,nombre,'Baja de cuenta por cobrar',0,v_saldo from public.pos_cuentas where organizacion_id=v_org and codigo='1103';
  return v_saldo;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_credito_establecer_vencimiento_venta(p_venta_id uuid, p_fecha date)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_org uuid:=mi_organizacion(); v public.pos_ventas%rowtype;
begin
  if mi_rol() not in ('admin','gerente','cajero') then raise exception 'CREDITO_SIN_PERMISO'; end if;
  if p_fecha is null then raise exception 'CREDITO_VENCIMIENTO_REQUERIDO'; end if;
  select * into v from public.pos_ventas where id=p_venta_id and organizacion_id=v_org for update;
  if v.id is null or not coalesce(v.a_credito,false) or coalesce(v.credito_monto,0)<=0 then raise exception 'CREDITO_VENTA_INVALIDA'; end if;
  if exists(select 1 from public.pos_financiamientos f where f.organizacion_id=v_org and f.venta_id=v.id) then raise exception 'CREDITO_USA_PLAN_CUOTAS'; end if;
  update public.pos_ventas set credito_vencimiento=p_fecha where id=v.id;
  insert into public.pos_credito_eventos(organizacion_id,cliente_id,venta_id,tipo,monto,fecha_compromiso,nota,creado_por)
  values(v_org,v.cliente_id,v.id,'vencimiento',v.credito_monto,p_fecha,'Vencimiento de crédito simple',auth.uid());
  return true;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_credito_refinanciar(p_financiamiento_id uuid, p_cuotas_total integer, p_frecuencia text, p_primera_fecha date, p_nota text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid:=mi_organizacion(); v_old public.pos_financiamientos%rowtype; v_new uuid;
  v_saldo numeric; v_base numeric; v_monto numeric; v_fecha date; i integer;
begin
  if mi_rol() not in ('admin','gerente') then raise exception 'CREDITO_REFIN_SIN_PERMISO'; end if;
  if p_cuotas_total is null or p_cuotas_total<1 or p_cuotas_total>60 then raise exception 'CREDITO_CUOTAS_INVALIDAS'; end if;
  if p_frecuencia not in ('semanal','quincenal','mensual') then raise exception 'CREDITO_FRECUENCIA_INVALIDA'; end if;
  if p_primera_fecha is null or p_primera_fecha<current_date then raise exception 'CREDITO_PRIMER_VENCIMIENTO_INVALIDO'; end if;
  select * into v_old from public.pos_financiamientos where id=p_financiamiento_id and organizacion_id=v_org for update;
  if v_old.id is null or v_old.estado<>'activo' then raise exception 'CREDITO_FINANCIAMIENTO_NO_ACTIVO'; end if;
  v_saldo:=public.pos_credito_saldo_principal(v_old.id);
  if v_saldo<=0.01 then raise exception 'CREDITO_SIN_SALDO'; end if;
  v_base:=round(v_saldo/p_cuotas_total,2);
  insert into public.pos_financiamientos(organizacion_id,venta_id,cliente_id,cliente_nombre,descripcion,monto_total,inicial,monto_financiado,cuotas_total,cuota_monto,frecuencia,estado,refinanciado_desde_id)
  values(v_org,null,v_old.cliente_id,v_old.cliente_nombre,'Refinanciación de '||coalesce(v_old.descripcion,substr(v_old.id::text,1,8)),v_saldo,0,v_saldo,p_cuotas_total,v_base,p_frecuencia,'activo',v_old.id)
  returning id into v_new;
  for i in 1..p_cuotas_total loop
    v_monto:=case when i=p_cuotas_total then round(v_saldo-(v_base*(p_cuotas_total-1)),2) else v_base end;
    v_fecha:=case p_frecuencia when 'semanal' then p_primera_fecha+((i-1)*7) when 'quincenal' then p_primera_fecha+((i-1)*15) else (p_primera_fecha+make_interval(months=>i-1))::date end;
    insert into public.pos_fin_cuotas(organizacion_id,financiamiento_id,numero,fecha_venc,monto,pagado,monto_pagado)
    values(v_org,v_new,i,v_fecha,v_monto,false,0);
  end loop;
  update public.pos_financiamientos set estado='refinanciado',refinanciado_a_id=v_new where id=v_old.id;
  insert into public.pos_credito_eventos(organizacion_id,cliente_id,financiamiento_id,tipo,monto,fecha_compromiso,nota,creado_por)
  values(v_org,v_old.cliente_id,v_old.id,'refinanciacion',v_saldo,p_primera_fecha,coalesce(nullif(trim(p_nota),''),'Refinanciado a '||substr(v_new::text,1,8)),auth.uid());
  return v_new;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_credito_registrar_promesa(p_venta_id uuid, p_financiamiento_id uuid, p_fecha date, p_monto numeric, p_nota text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_org uuid:=mi_organizacion(); v_id uuid; v_cliente uuid;
begin
  if mi_rol() not in ('admin','gerente','cajero') then raise exception 'CREDITO_SIN_PERMISO'; end if;
  if (p_venta_id is null)=(p_financiamiento_id is null) then raise exception 'CREDITO_ORIGEN_INVALIDO'; end if;
  if p_fecha is null or p_fecha<current_date or coalesce(p_monto,0)<=0 then raise exception 'CREDITO_PROMESA_INVALIDA'; end if;
  if p_financiamiento_id is not null then
    select cliente_id into v_cliente from public.pos_financiamientos where id=p_financiamiento_id and organizacion_id=v_org and estado='activo';
    if not found then raise exception 'CREDITO_FINANCIAMIENTO_INVALIDO'; end if;
  else
    select cliente_id into v_cliente from public.pos_ventas where id=p_venta_id and organizacion_id=v_org and a_credito=true and coalesce(credito_monto,0)>0;
    if not found then raise exception 'CREDITO_VENTA_INVALIDA'; end if;
  end if;
  insert into public.pos_credito_eventos(organizacion_id,cliente_id,venta_id,financiamiento_id,tipo,monto,fecha_compromiso,nota,creado_por)
  values(v_org,v_cliente,p_venta_id,p_financiamiento_id,'promesa',p_monto,p_fecha,nullif(trim(p_nota),''),auth.uid()) returning id into v_id;
  return v_id;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_eliminar_compra_atomica(p_compra_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.pos_eliminar_movimiento_mi_caja(p_movimiento_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_id uuid;
begin
  delete from public.pos_caja_movimientos m using public.pos_cajas c
  where m.id=p_movimiento_id and c.id=m.caja_id and c.usuario_id=auth.uid()
    and c.organizacion_id=public.mi_organizacion() and c.estado='abierta'
  returning m.id into v_id;
  if v_id is null then raise exception 'CAJA_MOVIMIENTO_NO_ELIMINABLE'; end if;
  return v_id;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_fin_bloquear_mutacion_pago()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  raise exception 'FIN_LEDGER_INMUTABLE_USE_REVERSA';
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_fin_crear_plan_venta(p_venta_id uuid, p_cuotas_total integer, p_frecuencia text, p_primera_fecha date)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid:=mi_organizacion();
  v public.pos_ventas%rowtype;
  v_id uuid;
  v_base numeric;
  v_monto numeric;
  v_fecha date;
  i integer;
begin
  if mi_rol() not in ('admin','gerente','cajero') then raise exception 'FIN_SIN_PERMISO'; end if;
  if p_cuotas_total is null or p_cuotas_total<1 or p_cuotas_total>60 then raise exception 'FIN_CUOTAS_INVALIDAS'; end if;
  if p_frecuencia not in ('semanal','quincenal','mensual') then raise exception 'FIN_FRECUENCIA_INVALIDA'; end if;
  if p_primera_fecha is null then raise exception 'FIN_PRIMER_VENCIMIENTO_REQUERIDO'; end if;
  select * into v from public.pos_ventas where id=p_venta_id and organizacion_id=v_org and estado='completada' for update;
  if v.id is null or coalesce(v.credito_monto,0)<=0 or v.cliente_id is null then raise exception 'FIN_VENTA_CREDITO_INVALIDA'; end if;
  if exists(select 1 from public.pos_financiamientos where organizacion_id=v_org and venta_id=v.id) then raise exception 'FIN_VENTA_YA_FINANCIADA'; end if;
  v_base:=round(v.credito_monto/p_cuotas_total,2);
  insert into public.pos_financiamientos(organizacion_id,venta_id,cliente_id,cliente_nombre,descripcion,monto_total,inicial,monto_financiado,cuotas_total,cuota_monto,frecuencia,estado)
  values(v_org,v.id,v.cliente_id,v.cliente_nombre,'Venta '||coalesce(v.numero_factura,v.numero::text),v.total,v.total-v.credito_monto,v.credito_monto,p_cuotas_total,v_base,p_frecuencia,'activo')
  returning id into v_id;
  for i in 1..p_cuotas_total loop
    v_monto:=case when i=p_cuotas_total then round(v.credito_monto-(v_base*(p_cuotas_total-1)),2) else v_base end;
    v_fecha:=case p_frecuencia
      when 'semanal' then p_primera_fecha+((i-1)*7)
      when 'quincenal' then p_primera_fecha+((i-1)*15)
      else (p_primera_fecha + make_interval(months => i-1))::date end;
    insert into public.pos_fin_cuotas(organizacion_id,financiamiento_id,numero,fecha_venc,monto,pagado,monto_pagado)
    values(v_org,v_id,i,v_fecha,v_monto,false,0);
  end loop;
  return v_id;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_fin_mora_total(p_cuota_id uuid, p_fecha date DEFAULT CURRENT_DATE)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare v_org uuid:=mi_organizacion(); v_monto numeric; v_venc date; v_generada numeric:=0; v_pct numeric:=0; v_gracia int:=0; v_pag_principal numeric:=0; v_calc numeric:=0;
begin
  select c.monto,c.fecha_venc,coalesce(c.mora_generada,0) into v_monto,v_venc,v_generada from public.pos_fin_cuotas c where c.id=p_cuota_id and c.organizacion_id=v_org;
  if v_monto is null then return 0; end if;
  select coalesce(mora_pct,0),coalesce(mora_dias_gracia,0) into v_pct,v_gracia from public.pos_config where organizacion_id=v_org limit 1;
  v_pct:=coalesce(v_pct,0); v_gracia:=greatest(coalesce(v_gracia,0),0);
  if v_pct>0 and p_fecha is not null and p_fecha>v_venc+v_gracia then
    select coalesce(sum(case when tipo='pago' then monto_principal when tipo='reversa' then -monto_principal else 0 end),0)
      into v_pag_principal from public.pos_fin_pagos where cuota_id=p_cuota_id and organizacion_id=v_org;
    if v_pag_principal < v_monto-0.01 then v_calc:=round(v_monto*v_pct/100,2); end if;
  end if;
  return greatest(v_generada,v_calc,0);
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_fin_recalcular_cache()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_principal numeric:=0; v_mora numeric:=0; v_monto numeric; v_mora_total numeric:=0; v_pendientes int:=0;
begin
  perform set_config('nx.fin_recalc','1',true);
  select monto into v_monto from public.pos_fin_cuotas where id=new.cuota_id and organizacion_id=new.organizacion_id;
  select coalesce(sum(case when tipo='pago' then monto_principal when tipo='reversa' then -monto_principal else 0 end),0),
         coalesce(sum(case when tipo='pago' then monto_mora when tipo='reversa' then -monto_mora else 0 end),0)
    into v_principal,v_mora from public.pos_fin_pagos where cuota_id=new.cuota_id and organizacion_id=new.organizacion_id;
  v_mora_total:=public.pos_fin_mora_total(new.cuota_id,current_date);
  update public.pos_fin_cuotas set
    monto_pagado=greatest(least(v_principal,v_monto),0),
    mora_pagada=greatest(v_mora,0),
    pagado=(v_principal>=v_monto-0.01 and v_mora>=v_mora_total-0.01),
    fecha_pago=case when v_principal>=v_monto-0.01 and v_mora>=v_mora_total-0.01 then current_date else null end,
    metodo=case when v_principal>=v_monto-0.01 and v_mora>=v_mora_total-0.01 and new.tipo='pago' then new.metodo when v_principal<v_monto-0.01 then null else metodo end
  where id=new.cuota_id and organizacion_id=new.organizacion_id;
  select count(*) into v_pendientes from public.pos_fin_cuotas where financiamiento_id=new.financiamiento_id and organizacion_id=new.organizacion_id and not coalesce(pagado,false);
  update public.pos_financiamientos set estado=case when v_pendientes=0 then 'saldado' when estado='saldado' then 'activo' else estado end
  where id=new.financiamiento_id and organizacion_id=new.organizacion_id and estado<>'cancelado';
  return new;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_fin_registrar_pago_v2(p_financiamiento_id uuid, p_cuota_id uuid, p_monto numeric, p_metodo text DEFAULT NULL::text, p_referencia text DEFAULT NULL::text, p_operacion_id uuid DEFAULT NULL::uuid, p_created_by_name text DEFAULT NULL::text, p_cuenta_bancaria_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid:=mi_organizacion(); v_id uuid; v_exist uuid; v_met text; v_caja uuid; v_principal numeric; v_mora numeric; v_asiento uuid;
begin
  if p_operacion_id is not null then select id into v_exist from public.pos_fin_pagos where organizacion_id=v_org and operacion_id=p_operacion_id; if v_exist is not null then return v_exist; end if; end if;
  v_met:=lower(trim(coalesce(p_metodo,'')));
  if v_met='efectivo' then
    select id into v_caja from public.pos_cajas where organizacion_id=v_org and estado='abierta' and usuario_id=public.mi_usuario_id() order by apertura desc limit 1 for update;
    if v_caja is null then raise exception 'FIN_CAJA_CERRADA'; end if;
  elsif p_cuenta_bancaria_id is not null and not exists(select 1 from public.pos_cuentas_bancarias where id=p_cuenta_bancaria_id and organizacion_id=v_org and activa) then
    raise exception 'FIN_CUENTA_BANCARIA_INVALIDA';
  end if;

  insert into public.pos_fin_pagos(organizacion_id,financiamiento_id,cuota_id,monto,metodo,referencia,created_by_name,tipo,operacion_id,caja_id,cuenta_bancaria_id)
  values(v_org,p_financiamiento_id,p_cuota_id,p_monto,nullif(trim(p_metodo),''),nullif(trim(p_referencia),''),nullif(trim(p_created_by_name),''),'pago',p_operacion_id,v_caja,p_cuenta_bancaria_id)
  returning id,monto_principal,monto_mora into v_id,v_principal,v_mora;

  if v_met='efectivo' then
    insert into public.pos_caja_movimientos(caja_id,tipo,concepto,monto,created_by_name,organizacion_id)
    values(v_caja,'entrada','Pago de cuota',p_monto,p_created_by_name,v_org);
  elsif p_cuenta_bancaria_id is not null then
    insert into public.pos_banco_movimientos(organizacion_id,cuenta_bancaria_id,fecha,monto,concepto,referencia,origen_tipo,origen_id,origen_clave,creado_por)
    values(v_org,p_cuenta_bancaria_id,now(),p_monto,'Pago de cuota',nullif(trim(p_referencia),''),'pago_cuota',v_id,'pago_cuota:'||v_id::text,auth.uid());
  end if;

  insert into public.pos_asientos(organizacion_id,fecha,concepto,referencia,tipo,origen_id,numero)
  values(v_org,current_date,'Pago de cuota',coalesce(nullif(trim(p_referencia),''),substr(v_id::text,1,8)),'pago_cuota',v_id,'PC-'||substr(v_id::text,1,8)) returning id into v_asiento;
  insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
  select v_org,v_asiento,id,codigo,nombre,case when v_met='efectivo' then 'Entrada de efectivo' else 'Ingreso por medio electrónico' end,p_monto,0
  from public.pos_cuentas where organizacion_id=v_org and codigo=case when v_met='efectivo' then '1101' else '1102' end;
  if v_principal>0 then insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
    select v_org,v_asiento,id,codigo,nombre,'Reducción cuenta por cobrar',0,v_principal from public.pos_cuentas where organizacion_id=v_org and codigo='1103'; end if;
  if v_mora>0 then insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
    select v_org,v_asiento,id,codigo,nombre,'Recargo único por mora',0,v_mora from public.pos_cuentas where organizacion_id=v_org and codigo='4103'; end if;
  return v_id;
exception when unique_violation then
  if p_operacion_id is not null then select id into v_id from public.pos_fin_pagos where organizacion_id=v_org and operacion_id=p_operacion_id; if v_id is not null then return v_id; end if; end if;
  raise;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_fin_registrar_pago(p_financiamiento_id uuid, p_cuota_id uuid, p_monto numeric, p_metodo text DEFAULT NULL::text, p_referencia text DEFAULT NULL::text, p_operacion_id uuid DEFAULT NULL::uuid, p_created_by_name text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  select public.pos_fin_registrar_pago_v2(p_financiamiento_id,p_cuota_id,p_monto,p_metodo,p_referencia,p_operacion_id,p_created_by_name,null);
$function$
;

CREATE OR REPLACE FUNCTION public.pos_fin_reversar_pago(p_pago_id uuid, p_motivo text, p_operacion_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid:=mi_organizacion(); v_p public.pos_fin_pagos%rowtype; v_id uuid; v_exist uuid; v_met text; v_caja uuid; v_asiento uuid;
begin
  if mi_rol() not in ('admin','gerente') then raise exception 'FIN_REVERSA_SIN_PERMISO'; end if;
  if length(trim(coalesce(p_motivo,'')))<3 then raise exception 'FIN_REVERSA_MOTIVO_REQUERIDO'; end if;
  if p_operacion_id is not null then select id into v_exist from public.pos_fin_pagos where organizacion_id=v_org and operacion_id=p_operacion_id; if v_exist is not null then return v_exist; end if; end if;
  select * into v_p from public.pos_fin_pagos where id=p_pago_id and organizacion_id=v_org and tipo='pago';
  if v_p.id is null then raise exception 'FIN_PAGO_NO_ENCONTRADO'; end if;
  v_met:=lower(trim(coalesce(v_p.metodo,'')));
  if v_met='efectivo' then
    select id into v_caja from public.pos_cajas where organizacion_id=v_org and estado='abierta' and usuario_id=public.mi_usuario_id() order by apertura desc limit 1 for update;
    if v_caja is null then raise exception 'FIN_CAJA_CERRADA'; end if;
  end if;
  insert into public.pos_fin_pagos(organizacion_id,financiamiento_id,cuota_id,monto,metodo,fecha,referencia,created_by_name,tipo,reversa_de_id,motivo_reversa,operacion_id,caja_id,cuenta_bancaria_id)
  values(v_org,v_p.financiamiento_id,v_p.cuota_id,v_p.monto,v_p.metodo,current_date,v_p.referencia,null,'reversa',v_p.id,trim(p_motivo),p_operacion_id,v_caja,v_p.cuenta_bancaria_id)
  returning id into v_id;

  if v_met='efectivo' then
    insert into public.pos_caja_movimientos(caja_id,tipo,concepto,monto,created_by_name,organizacion_id)
    values(v_caja,'salida','Reversa pago de cuota',v_p.monto,null,v_org);
  elsif v_p.cuenta_bancaria_id is not null then
    insert into public.pos_banco_movimientos(organizacion_id,cuenta_bancaria_id,fecha,monto,concepto,referencia,origen_tipo,origen_id,origen_clave,creado_por)
    values(v_org,v_p.cuenta_bancaria_id,now(),-v_p.monto,'Reversa pago de cuota',v_p.referencia,'reversa_pago_cuota',v_id,'reversa_pago_cuota:'||v_id::text,auth.uid());
  end if;

  insert into public.pos_asientos(organizacion_id,fecha,concepto,referencia,tipo,origen_id,numero)
  values(v_org,current_date,'Reversa pago de cuota',substr(v_id::text,1,8),'reversa_pago_cuota',v_id,'RPC-'||substr(v_id::text,1,8)) returning id into v_asiento;
  if v_p.monto_principal>0 then insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
    select v_org,v_asiento,id,codigo,nombre,'Restituye cuenta por cobrar',v_p.monto_principal,0 from public.pos_cuentas where organizacion_id=v_org and codigo='1103'; end if;
  if v_p.monto_mora>0 then insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
    select v_org,v_asiento,id,codigo,nombre,'Revierte ingreso por mora',v_p.monto_mora,0 from public.pos_cuentas where organizacion_id=v_org and codigo='4103'; end if;
  insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
    select v_org,v_asiento,id,codigo,nombre,case when v_met='efectivo' then 'Salida de efectivo' else 'Reversa medio electrónico' end,0,v_p.monto from public.pos_cuentas where organizacion_id=v_org and codigo=case when v_met='efectivo' then '1101' else '1102' end;
  return v_id;
exception when unique_violation then
  select id into v_id from public.pos_fin_pagos where organizacion_id=v_org and (reversa_de_id=p_pago_id or (p_operacion_id is not null and operacion_id=p_operacion_id)) order by created_at desc limit 1;
  if v_id is not null then return v_id; end if;
  raise;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_fin_validar_pago_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid:=mi_organizacion(); v_rol text:=mi_rol(); v_estado text; v_cuota_monto numeric; v_venc date; v_mora_generada numeric:=0;
  v_pct numeric:=0; v_gracia int:=0; v_principal_pagado numeric:=0; v_mora_pagada numeric:=0; v_mora_total numeric:=0;
  v_principal_pend numeric:=0; v_mora_pend numeric:=0; v_resto numeric:=0; v_orig public.pos_fin_pagos%rowtype;
begin
  if v_rol not in ('admin','gerente','cajero') then raise exception 'FIN_SIN_PERMISO'; end if;
  if v_org is null then raise exception 'FIN_ORG_REQUERIDA'; end if;
  if new.organizacion_id is null then new.organizacion_id:=v_org; end if;
  if new.organizacion_id<>v_org then raise exception 'FIN_ORG_INVALIDA'; end if;
  if coalesce(new.monto,0)<=0 then raise exception 'FIN_MONTO_INVALIDO'; end if;

  select f.estado,c.monto,c.fecha_venc,coalesce(c.mora_generada,0) into v_estado,v_cuota_monto,v_venc,v_mora_generada
  from public.pos_financiamientos f join public.pos_fin_cuotas c on c.financiamiento_id=f.id and c.organizacion_id=f.organizacion_id
  where f.id=new.financiamiento_id and c.id=new.cuota_id and f.organizacion_id=v_org for update of f,c;
  if v_estado is null then raise exception 'FIN_CUOTA_INVALIDA'; end if;

  if new.tipo='pago' then
    if v_estado<>'activo' then raise exception 'FIN_NO_ACTIVO'; end if;
    if new.reversa_de_id is not null then raise exception 'FIN_PAGO_NO_PUEDE_REFERIR_REVERSA'; end if;
    select coalesce(sum(case when tipo='pago' then monto_principal when tipo='reversa' then -monto_principal else 0 end),0),
           coalesce(sum(case when tipo='pago' then monto_mora when tipo='reversa' then -monto_mora else 0 end),0)
      into v_principal_pagado,v_mora_pagada from public.pos_fin_pagos where cuota_id=new.cuota_id and organizacion_id=v_org;
    select coalesce(mora_pct,0),coalesce(mora_dias_gracia,0) into v_pct,v_gracia from public.pos_config where organizacion_id=v_org limit 1;
    v_pct:=coalesce(v_pct,0); v_gracia:=greatest(coalesce(v_gracia,0),0);
    if v_mora_generada<=0 and v_pct>0 and coalesce(new.fecha,current_date)>v_venc+v_gracia and v_principal_pagado<v_cuota_monto-0.01 then
      v_mora_generada:=round(v_cuota_monto*v_pct/100,2);
      perform set_config('nx.fin_recalc','1',true);
      update public.pos_fin_cuotas set mora_generada=v_mora_generada where id=new.cuota_id and organizacion_id=v_org;
    end if;
    v_mora_total:=greatest(v_mora_generada,0);
    v_principal_pend:=greatest(v_cuota_monto-v_principal_pagado,0);
    v_mora_pend:=greatest(v_mora_total-v_mora_pagada,0);
    if new.monto>v_principal_pend+v_mora_pend+0.01 then raise exception 'FIN_PAGO_EXCEDE_SALDO'; end if;
    new.monto_principal:=least(new.monto,v_principal_pend);
    v_resto:=greatest(new.monto-new.monto_principal,0);
    if v_principal_pend-new.monto_principal<=0.01 then new.monto_mora:=least(v_resto,v_mora_pend); else new.monto_mora:=0; end if;
    if abs((new.monto_principal+new.monto_mora)-new.monto)>0.01 then raise exception 'FIN_ASIGNACION_PAGO_INVALIDA'; end if;
  elsif new.tipo='reversa' then
    if v_rol not in ('admin','gerente') then raise exception 'FIN_REVERSA_SIN_PERMISO'; end if;
    if new.reversa_de_id is null then raise exception 'FIN_REVERSA_ORIGEN_REQUERIDO'; end if;
    select * into v_orig from public.pos_fin_pagos where id=new.reversa_de_id and organizacion_id=v_org and tipo='pago';
    if v_orig.id is null then raise exception 'FIN_PAGO_ORIGEN_INVALIDO'; end if;
    if v_orig.financiamiento_id<>new.financiamiento_id or v_orig.cuota_id<>new.cuota_id then raise exception 'FIN_REVERSA_NO_COINCIDE'; end if;
    if exists(select 1 from public.pos_fin_pagos where organizacion_id=v_org and tipo='reversa' and reversa_de_id=v_orig.id) then raise exception 'FIN_PAGO_YA_REVERSADO'; end if;
    new.monto:=v_orig.monto; new.monto_principal:=v_orig.monto_principal; new.monto_mora:=v_orig.monto_mora;
  else raise exception 'FIN_TIPO_INVALIDO'; end if;
  return new;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_guard_periodo_asiento()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_org uuid; v_fecha date;
begin
  if tg_table_name='pos_asientos' then
    if tg_op='DELETE' then v_org:=old.organizacion_id; v_fecha:=old.fecha; else v_org:=new.organizacion_id; v_fecha:=new.fecha; end if;
  else
    if tg_op='DELETE' then
      select a.organizacion_id,a.fecha into v_org,v_fecha from public.pos_asientos a where a.id=old.asiento_id;
    else
      select a.organizacion_id,a.fecha into v_org,v_fecha from public.pos_asientos a where a.id=new.asiento_id;
    end if;
  end if;
  if v_org is not null and v_fecha is not null and public.pos_periodo_esta_cerrado(v_org,v_fecha) then
    raise exception 'CONTABILIDAD_PERIODO_CERRADO %',to_char(v_fecha,'YYYY-MM');
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_liberar_reserva_seriales(p_reserva_token uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid := public.mi_organizacion();
  v_count integer := 0;
begin
  if v_org is null then
    raise exception 'IMEI_SIN_ORGANIZACION';
  end if;

  -- Solo se libera una reserva que todavía NO pertenece a una venta real.
  update public.pos_seriales
     set estado = 'disponible', reserva_token = null, reserva_hasta = null
   where organizacion_id = v_org
     and reserva_token = p_reserva_token
     and estado = 'reservado'
     and venta_id is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.pos_mover_stock_atomico(p_producto_id uuid, p_tipo text, p_delta numeric, p_almacen_id uuid DEFAULT NULL::uuid, p_referencia text DEFAULT NULL::text, p_motivo text DEFAULT NULL::text, p_costo numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.pos_reabrir_periodo(p_periodo date, p_motivo text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_org uuid:=mi_organizacion(); v_mes date:=date_trunc('month',p_periodo)::date;
begin
  if mi_rol()<>'admin' then raise exception 'CONTABILIDAD_REAPERTURA_SOLO_ADMIN'; end if;
  if length(trim(coalesce(p_motivo,'')))<5 then raise exception 'CONTABILIDAD_MOTIVO_REQUERIDO'; end if;
  update public.pos_periodos_contables set estado='abierto',reabierto_at=now(),reabierto_por=auth.uid(),motivo_reapertura=trim(p_motivo),updated_at=now()
  where organizacion_id=v_org and periodo=v_mes and estado='cerrado';
  if not found then raise exception 'CONTABILIDAD_PERIODO_NO_CERRADO'; end if;
  return true;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_reconstruir_asiento_compra(p_compra_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v public.pos_compras%rowtype;
  v_aid uuid;
  v_total_items numeric:=0;
begin
  select * into v from public.pos_compras where id=p_compra_id;
  if v.id is null then return null; end if;
  if v.organizacion_id <> 'e404d1c4-24c5-4e17-88f6-84bef09d6d19'::uuid then return null; end if;
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
$function$
;

CREATE OR REPLACE FUNCTION public.pos_reconstruir_asiento_venta(p_venta_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v public.pos_ventas%rowtype;
  v_aid uuid;
  v_cogs numeric:=0;
  v_efe numeric:=0; v_tar numeric:=0; v_tra numeric:=0; v_otro numeric:=0; v_credito numeric:=0;
  v_nc numeric:=0; v_otros_det numeric:=0; v_suma_debitos numeric:=0;
begin
  select * into v from public.pos_ventas where id=p_venta_id;
  if v.id is null then return null; end if;
  if v.organizacion_id <> 'e404d1c4-24c5-4e17-88f6-84bef09d6d19'::uuid then return null; end if;

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
$function$
;

CREATE OR REPLACE FUNCTION public.pos_registrar_compra_atomica(p_operacion_id uuid, p_compra jsonb, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.pos_registrar_movimiento_mi_caja(p_caja_id uuid, p_tipo text, p_concepto text, p_monto numeric)
 RETURNS pos_caja_movimientos
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_registrar_venta_atomica(p_operacion_id uuid, p_venta jsonb, p_items jsonb, p_reserva_token uuid DEFAULT NULL::uuid, p_imei_esperados integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.pos_rep_abrir_reclamo_garantia(p_reparacion_origen_id uuid, p_falla text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_org uuid:=mi_organizacion(); v public.pos_reparaciones%rowtype; v_id uuid; v_num text;
begin
  if mi_rol() not in ('admin','gerente','cajero') then raise exception 'REP_SIN_PERMISO'; end if;
  if length(trim(coalesce(p_falla,'')))<3 then raise exception 'REP_GARANTIA_FALLA_REQUERIDA'; end if;
  select * into v from public.pos_reparaciones where id=p_reparacion_origen_id and organizacion_id=v_org for update;
  if v.id is null or lower(coalesce(v.estado,''))<>'entregado' or v.garantia_hasta is null or v.garantia_hasta<current_date then raise exception 'REP_GARANTIA_NO_VIGENTE'; end if;
  if exists(select 1 from public.pos_reparaciones where organizacion_id=v_org and garantia_origen_id=v.id and lower(coalesce(estado,'')) not in ('entregado','cancelado')) then raise exception 'REP_GARANTIA_RECLAMO_YA_ABIERTO'; end if;
  v_num:='GAR-'||coalesce(v.numero,substr(v.id::text,1,8));
  insert into public.pos_reparaciones(organizacion_id,numero,cliente_nombre,cliente_telefono,equipo,imei,clave,accesorios,falla,estado_fisico,diagnostico,presupuesto,abono,costo_piezas,estado,tecnico,nota,cobrado,cobrado_monto,cobrado_metodo,garantia_origen_id,es_garantia)
  values(v_org,v_num,v.cliente_nombre,v.cliente_telefono,v.equipo,v.imei,v.clave,v.accesorios,trim(p_falla),v.estado_fisico,null,0,0,0,'recibido',v.tecnico,'Reclamo de garantía de '||coalesce(v.numero,v.id::text),false,0,null,v.id,true)
  returning id into v_id;
  return v_id;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_rep_autorizar_cobro_garantia(p_reparacion_id uuid, p_motivo text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if mi_rol()<>'admin' then raise exception 'REP_GARANTIA_COBRO_SOLO_ADMIN'; end if;
  if length(trim(coalesce(p_motivo,'')))<5 then raise exception 'REP_GARANTIA_COBRO_MOTIVO_REQUERIDO'; end if;
  update public.pos_reparaciones set garantia_cobro_autorizado=true,garantia_cobro_motivo=trim(p_motivo),garantia_cobro_autorizado_por=auth.uid()
  where id=p_reparacion_id and organizacion_id=mi_organizacion() and es_garantia=true;
  if not found then raise exception 'REP_GARANTIA_NO_ENCONTRADA'; end if;
  return true;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_rep_devolver_pieza(p_pieza_id uuid, p_motivo text DEFAULT 'Devolución de taller'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_org uuid:=mi_organizacion(); v public.pos_reparacion_piezas%rowtype; v_num text;
begin
  if mi_rol() not in ('admin','gerente') then raise exception 'REP_DEVOLUCION_SIN_PERMISO'; end if;
  select * into v from public.pos_reparacion_piezas where id=p_pieza_id and organizacion_id=v_org for update;
  if v.id is null or v.estado='devuelta' then raise exception 'REP_PIEZA_INVALIDA'; end if;
  select numero into v_num from public.pos_reparaciones where id=v.reparacion_id and organizacion_id=v_org for update;
  if v.estado='usada' then
    perform public.pos_mover_stock_atomico(v.producto_id,'taller',v.cantidad,v.almacen_id,coalesce(v_num,v.reparacion_id::text),coalesce(nullif(trim(p_motivo),''),'Devolución de taller'),v.costo_unitario);
  end if;
  update public.pos_reparacion_piezas set estado='devuelta',devuelta_at=now() where id=v.id;
  perform public.pos_rep_recalcular_costo_piezas(v.reparacion_id);
  return true;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_rep_guard_cobro_garantia()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if coalesce(new.es_garantia,false) and (coalesce(new.cobrado,false) or coalesce(new.cobrado_monto,0)>0) and not coalesce(new.garantia_cobro_autorizado,false) then
    raise exception 'REP_GARANTIA_COBRO_NO_AUTORIZADO';
  end if;
  return new;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_rep_guard_stock_reservado_venta()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_alm uuid; v_stock numeric; v_res numeric;
begin
  select almacen_id into v_alm from public.pos_ventas where id=new.venta_id and organizacion_id=new.organizacion_id;
  if v_alm is null then return new; end if;
  select stock into v_stock from public.pos_stock_almacen where organizacion_id=new.organizacion_id and producto_id=new.producto_id and almacen_id=v_alm;
  if v_stock is null then return new; end if;
  select coalesce(sum(cantidad),0) into v_res from public.pos_reparacion_piezas where organizacion_id=new.organizacion_id and producto_id=new.producto_id and almacen_id=v_alm and estado='reservada';
  if v_stock-v_res < new.cantidad then raise exception 'VENTA_STOCK_RESERVADO_TALLER'; end if;
  return new;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_rep_recalcular_costo_piezas(p_reparacion_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_org uuid:=mi_organizacion(); v_total numeric;
begin
  select coalesce(sum(cantidad*costo_unitario),0) into v_total
  from public.pos_reparacion_piezas
  where organizacion_id=v_org and reparacion_id=p_reparacion_id and estado in ('reservada','usada');
  update public.pos_reparaciones set costo_piezas=v_total where id=p_reparacion_id and organizacion_id=v_org;
  return v_total;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_rep_reservar_pieza(p_reparacion_id uuid, p_producto_id uuid, p_almacen_id uuid, p_cantidad numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid:=mi_organizacion(); v_rep public.pos_reparaciones%rowtype; v_stock numeric; v_res numeric; v_costo numeric; v_id uuid;
begin
  if mi_rol() not in ('admin','gerente','cajero') then raise exception 'REP_SIN_PERMISO'; end if;
  if coalesce(p_cantidad,0)<=0 or p_almacen_id is null then raise exception 'REP_PIEZA_DATOS_INVALIDOS'; end if;
  select * into v_rep from public.pos_reparaciones where id=p_reparacion_id and organizacion_id=v_org for update;
  if v_rep.id is null or lower(coalesce(v_rep.estado,'')) in ('entregado','cancelado') then raise exception 'REP_NO_ACTIVA'; end if;
  select p.costo into v_costo from public.pos_productos p where p.id=p_producto_id and p.organizacion_id=v_org and coalesce(p.activo,true);
  if not found then raise exception 'REP_PRODUCTO_INVALIDO'; end if;
  select s.stock into v_stock from public.pos_stock_almacen s where s.organizacion_id=v_org and s.producto_id=p_producto_id and s.almacen_id=p_almacen_id for update;
  if v_stock is null then raise exception 'REP_STOCK_ALMACEN_NO_EXISTE'; end if;
  select coalesce(sum(cantidad),0) into v_res from public.pos_reparacion_piezas where organizacion_id=v_org and producto_id=p_producto_id and almacen_id=p_almacen_id and estado='reservada';
  if v_stock-v_res < p_cantidad then raise exception 'REP_STOCK_DISPONIBLE_INSUFICIENTE'; end if;
  insert into public.pos_reparacion_piezas(organizacion_id,reparacion_id,producto_id,almacen_id,cantidad,costo_unitario,estado,creado_por)
  values(v_org,v_rep.id,p_producto_id,p_almacen_id,p_cantidad,coalesce(v_costo,0),'reservada',auth.uid()) returning id into v_id;
  perform public.pos_rep_recalcular_costo_piezas(v_rep.id);
  return v_id;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_rep_usar_pieza(p_pieza_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_org uuid:=mi_organizacion(); v public.pos_reparacion_piezas%rowtype; v_num text;
begin
  if mi_rol() not in ('admin','gerente','cajero') then raise exception 'REP_SIN_PERMISO'; end if;
  select * into v from public.pos_reparacion_piezas where id=p_pieza_id and organizacion_id=v_org for update;
  if v.id is null or v.estado<>'reservada' then raise exception 'REP_PIEZA_NO_RESERVADA'; end if;
  select numero into v_num from public.pos_reparaciones where id=v.reparacion_id and organizacion_id=v_org for update;
  perform public.pos_mover_stock_atomico(v.producto_id,'taller',-v.cantidad,v.almacen_id,coalesce(v_num,v.reparacion_id::text),'Pieza usada en reparación',v.costo_unitario);
  update public.pos_reparacion_piezas set estado='usada',usada_at=now() where id=v.id;
  perform public.pos_rep_recalcular_costo_piezas(v.reparacion_id);
  return true;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_reservar_seriales(p_serial_ids uuid[])
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid := public.mi_organizacion();
  v_token uuid := gen_random_uuid();
  v_esperados integer := coalesce(array_length(p_serial_ids, 1), 0);
  v_tomados integer := 0;
begin
  if v_org is null then
    raise exception 'IMEI_SIN_ORGANIZACION';
  end if;

  if v_esperados = 0 then
    return v_token;
  end if;

  -- Solo se liberan reservas vencidas que TODAVÍA no están ligadas a una venta.
  update public.pos_seriales
     set estado = 'disponible', reserva_token = null, reserva_hasta = null
   where organizacion_id = v_org
     and estado = 'reservado'
     and reserva_hasta is not null
     and reserva_hasta < now()
     and venta_id is null;

  -- UPDATE condicional: dos cajeros pueden haber visto el mismo IMEI, pero solo uno lo toma.
  update public.pos_seriales
     set estado = 'reservado',
         reserva_token = v_token,
         reserva_hasta = now() + interval '60 seconds'
   where organizacion_id = v_org
     and id = any(p_serial_ids)
     and estado = 'disponible'
     and venta_id is null;

  get diagnostics v_tomados = row_count;

  -- El RAISE revierte el UPDATE completo de esta llamada: nunca reserva solo parte del grupo.
  if v_tomados <> v_esperados then
    raise exception 'IMEI_NO_DISPONIBLE';
  end if;

  return v_token;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.pos_siguiente_ncf(p_tipo text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org uuid;
  v_pref text;
  v_num integer;
begin
  v_org := mi_organizacion();
  if v_org is null then return null; end if;
  update pos_ncf_secuencias
     set actual = coalesce(actual, desde, 1) + 1
   where tipo = p_tipo
     and organizacion_id = v_org
     and activo is true
     and coalesce(actual, desde, 1) <= coalesce(hasta, 0)
     and (vencimiento is null or vencimiento >= current_date)
   returning coalesce(prefijo, tipo), actual - 1
   into v_pref, v_num;
  if v_num is null then return null; end if;
  return v_pref || lpad(v_num::text, 8, '0');
end;
$function$
;

CREATE OR REPLACE FUNCTION public.pos_snapshot_costo_venta_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.organizacion_id <> 'e404d1c4-24c5-4e17-88f6-84bef09d6d19'::uuid then return new; end if;
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
$function$
;

CREATE OR REPLACE FUNCTION public.pos_transferir_stock(p_origen_id uuid, p_destino_id uuid, p_fecha date, p_notas text, p_lineas jsonb, p_created_by_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  insert into pos_secuencias (organizacion_id, tipo, nombre, prefijo, longitud, proximo, activo)
  values (v_org, 'transferencia', 'Transferencia / Despacho', 'TR-', 5, 2, true)
  on conflict (organizacion_id, tipo) do update
     set proximo = pos_secuencias.proximo + 1
   where pos_secuencias.activo
  returning coalesce(prefijo, '') || lpad((proximo - 1)::text, coalesce(longitud, 5), '0')
    into v_numero;
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

    update pos_stock_almacen
       set stock = stock - v_cant
     where producto_id = v_pid and almacen_id = p_origen_id and organizacion_id = v_org
       and stock >= v_cant
    returning stock into v_stock_origen;
    if v_stock_origen is null then
      raise exception 'TRANSFER_STOCK_INSUFICIENTE: %', v_nombre;
    end if;

    insert into pos_stock_almacen (organizacion_id, producto_id, almacen_id, stock)
    values (v_org, v_pid, p_destino_id, v_cant)
    on conflict (producto_id, almacen_id)
    do update set stock = pos_stock_almacen.stock + v_cant
    returning stock into v_stock_destino;

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
$function$
;

CREATE OR REPLACE FUNCTION public.pos_trg_recontabilizar_compra_cabecera()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.estado is distinct from old.estado or new.total is distinct from old.total or new.a_credito is distinct from old.a_credito then
    perform public.pos_reconstruir_asiento_compra(new.id);
  end if;
  return new;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_trg_recontabilizar_compra_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_id uuid; begin
  if tg_op='DELETE' then v_id:=old.compra_id; else v_id:=new.compra_id; end if;
  perform public.pos_reconstruir_asiento_compra(v_id);
  if tg_op='DELETE' then return old; else return new; end if;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_trg_recontabilizar_venta_cabecera()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.estado is distinct from old.estado or new.total is distinct from old.total or new.pagos is distinct from old.pagos
     or new.pagado_efectivo is distinct from old.pagado_efectivo or new.pagado_tarjeta is distinct from old.pagado_tarjeta
     or new.pagado_transferencia is distinct from old.pagado_transferencia or new.pagado_otro is distinct from old.pagado_otro
     or new.credito_monto is distinct from old.credito_monto then
    perform public.pos_reconstruir_asiento_venta(new.id);
  end if;
  return new;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_trg_recontabilizar_venta_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_id uuid; begin
  if tg_op='DELETE' then v_id:=old.venta_id; else v_id:=new.venta_id; end if;
  perform public.pos_reconstruir_asiento_venta(v_id);
  if tg_op='DELETE' then return old; else return new; end if;
end; $function$
;

CREATE OR REPLACE FUNCTION public.pos_validar_venta_con_almacen()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;

reset check_function_bodies;
