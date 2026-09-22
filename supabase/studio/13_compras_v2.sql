-- STUDIO · Compras v2: ITBIS, gastos de importación (costo desembarcado) y cuentas por pagar por factura.
-- Aplicar SOLO en la base STUDIO (edbknlkjnlfmkkiizdbe). La base madre no cambia: el frontend
-- solo usa estas rutas cuando pos_config.compras_v2 = true.
--
-- Principios (CLAUDE.md): una sola fuente de verdad contable → el asiento de compra lo crea el
-- SERVIDOR (trigger de recontabilización); el navegador no asienta cuando compras_v2 está activo.
-- ITBIS no es costo de inventario. Gastos de importación se prorratean por VALOR de cada línea.

-- 1) Bandera y columnas -----------------------------------------------------------------------
alter table public.pos_config add column if not exists compras_v2 boolean not null default false;

alter table public.pos_compras
  add column if not exists moneda text not null default 'DOP',
  add column if not exists tasa numeric not null default 1,
  add column if not exists es_importacion boolean not null default false,
  add column if not exists gastos jsonb,
  add column if not exists gastos_total numeric not null default 0,
  add column if not exists total_desembarcado numeric;

alter table public.pos_compra_items
  add column if not exists costo_original numeric,
  add column if not exists gasto_unit numeric not null default 0,
  add column if not exists costo_final_unit numeric;

alter table public.pos_compra_pagos add column if not exists referencia text;

-- 2) Plan de cuentas: 1105 ITBIS pagado (adelantado) + 4103 mora, también desde la función del sistema
create or replace function public.pos_asegurar_cuentas_operativas(p_org uuid)
 returns void
 language plpgsql
 set search_path to 'public'
as $function$
begin
  if p_org is null then raise exception 'CONTABILIDAD_ORG_REQUERIDA'; end if;
  if p_org <> 'e404d1c4-24c5-4e17-88f6-84bef09d6d19'::uuid then return; end if;
  insert into public.pos_cuentas(organizacion_id,codigo,nombre,tipo,naturaleza,activo)
  values
    (p_org,'1101','Caja y efectivo','activo','deudora',true),
    (p_org,'1102','Banco y medios electrónicos','activo','deudora',true),
    (p_org,'1103','Cuentas por cobrar (clientes)','activo','deudora',true),
    (p_org,'1104','Inventario de mercancías','activo','deudora',true),
    (p_org,'1105','ITBIS pagado (adelantado)','activo','deudora',true),
    (p_org,'2101','Cuentas por pagar — Proveedores','pasivo','acreedora',true),
    (p_org,'2105','Notas de crédito de clientes','pasivo','acreedora',true),
    (p_org,'2199','Compras por conciliar','pasivo','acreedora',true),
    (p_org,'4101','Ventas','ingreso','acreedora',true),
    (p_org,'4103','Recargos por mora','ingreso','acreedora',true),
    (p_org,'5101','Costo de ventas','gasto','deudora',true)
  on conflict (organizacion_id,codigo) do update
    set nombre=excluded.nombre,tipo=excluded.tipo,naturaleza=excluded.naturaleza,activo=true;
end;
$function$;

select public.pos_asegurar_cuentas_operativas('e404d1c4-24c5-4e17-88f6-84bef09d6d19');

-- 3) Vista de cuentas por pagar por factura (RLS del invocador) ------------------------------
create or replace view public.pos_cxp_v with (security_invoker = true) as
select c.id as compra_id, c.organizacion_id, c.numero, c.fecha, c.vencimiento,
       c.proveedor_id, c.proveedor_nombre, c.ncf, c.notas, c.moneda, c.tasa, c.es_importacion,
       c.subtotal, c.itbis, c.total,
       coalesce(p.pagado,0) as pagado,
       greatest(0, c.total - coalesce(p.pagado,0)) as saldo,
       case when c.vencimiento is null then null else (c.vencimiento - current_date) end as dias_venc,
       case when coalesce(p.pagado,0) >= c.total - 0.01 then 'pagada'
            when coalesce(p.pagado,0) > 0 then 'parcial'
            else 'pendiente' end as estado_pago,
       case when coalesce(p.pagado,0) >= c.total - 0.01 then 'pagada'
            when c.vencimiento is not null and c.vencimiento < current_date then 'vencida'
            when c.vencimiento is not null and c.vencimiento <= current_date + 7 then 'por_vencer'
            else 'al_dia' end as tramo,
       p.ultimo_pago
from public.pos_compras c
left join (
  select compra_id, sum(monto) as pagado, max(fecha) as ultimo_pago
  from public.pos_compra_pagos where compra_id is not null group by compra_id
) p on p.compra_id = c.id
where c.a_credito and c.estado = 'recibida';

grant select on public.pos_cxp_v to anon, authenticated, service_role;

-- 4) Registrar compra: ITBIS, gastos prorrateados y stock a costo desembarcado -----------------
create or replace function public.pos_registrar_compra_atomica(p_operacion_id uuid, p_compra jsonb, p_items jsonb)
 returns jsonb
 language plpgsql
 set search_path to 'public'
as $function$
declare
  v_org uuid := public.mi_organizacion();
  v_compra public.pos_compras%rowtype;
  v_usuario text;
  v_item record;
  v_subtotal numeric;
  v_itbis numeric := 0;
  v_total_prov numeric;
  v_imp boolean := false;
  v_moneda text := 'DOP';
  v_tasa numeric := 1;
  v_gastos jsonb := null;
  v_flete numeric := 0;
  v_imp_modo text := 'monto';
  v_imp_valor numeric := 0;
  v_impuesto numeric := 0;
  v_otros numeric := 0;
  v_gastos_total numeric := 0;
  v_n_items integer;
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

  select coalesce(sum(x.importe),0), count(*) into v_subtotal, v_n_items
  from jsonb_to_recordset(p_items) x(importe numeric);

  -- Compras v2: ITBIS, moneda/tasa, importación y gastos. Sin estos campos (cliente viejo) todo queda en 0/1.
  v_itbis := greatest(0, coalesce((p_compra->>'itbis')::numeric,0));
  v_imp := coalesce((p_compra->>'es_importacion')::boolean,false);
  v_moneda := coalesce(nullif(upper(left(p_compra->>'moneda',3)),''),'DOP');
  v_tasa := coalesce(nullif((p_compra->>'tasa')::numeric,0),1);
  if v_tasa <= 0 then raise exception 'COMPRA_TASA_INVALIDA'; end if;
  if jsonb_typeof(p_compra->'gastos')='object' then
    v_gastos := p_compra->'gastos';
    v_flete := greatest(0, coalesce((v_gastos->>'flete')::numeric,0));
    v_imp_modo := case when lower(coalesce(v_gastos->>'impuesto_modo','monto'))='pct' then 'pct' else 'monto' end;
    v_imp_valor := greatest(0, coalesce((v_gastos->>'impuesto_valor')::numeric,0));
    v_impuesto := case when v_imp_modo='pct' then round(v_subtotal*v_imp_valor/100.0,2) else v_imp_valor end;
    select coalesce(sum(greatest(0, coalesce((o->>'monto')::numeric,0))),0) into v_otros
    from jsonb_array_elements(coalesce(v_gastos->'otros','[]'::jsonb)) o;
    v_gastos_total := round(v_flete + v_impuesto + v_otros, 2);
    v_gastos := v_gastos || jsonb_build_object('impuesto_calculado', v_impuesto, 'total', v_gastos_total);
  end if;

  -- Lo que se le debe al proveedor: la mercancía; el ITBIS solo si va en su factura (compra local).
  v_total_prov := round(v_subtotal + (case when v_imp then 0 else v_itbis end), 2);
  if abs(v_total_prov-coalesce((p_compra->>'total')::numeric,0))>0.01 then
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
    vencimiento,orden_no,liquidacion_no,operacion_id,
    moneda,tasa,es_importacion,gastos,gastos_total,total_desembarcado
  ) values (
    coalesce(nullif(p_compra->>'fecha','')::date,current_date),
    nullif(p_compra->>'proveedor_id','')::uuid,nullif(left(p_compra->>'proveedor_nombre',200),''),
    nullif(left(p_compra->>'ncf',100),''),v_subtotal,v_itbis,v_total_prov,
    coalesce((p_compra->>'a_credito')::boolean,false),'recibida',
    nullif(left(p_compra->>'notas',1000),''),coalesce(v_usuario,'Sistema'),v_org,
    nullif(p_compra->>'almacen_id','')::uuid,nullif(p_compra->>'empleado_id','')::uuid,
    nullif(left(p_compra->>'empleado_nombre',200),''),nullif(p_compra->>'vencimiento','')::date,
    nullif(left(p_compra->>'orden_no',100),''),nullif(left(p_compra->>'liquidacion_no',100),''),
    p_operacion_id,
    v_moneda,v_tasa,v_imp,v_gastos,v_gastos_total,round(v_subtotal + v_gastos_total,2)
  ) returning * into v_compra;

  -- Ítems con gasto prorrateado por VALOR (si el subtotal es 0, por partes iguales).
  insert into public.pos_compra_items(compra_id,producto_id,nombre,cantidad,costo,importe,organizacion_id,
                                      costo_original,gasto_unit,costo_final_unit)
  select v_compra.id,(e.item->>'producto_id')::uuid,left(e.item->>'nombre',300),
         (e.item->>'cantidad')::numeric,(e.item->>'costo')::numeric,(e.item->>'importe')::numeric,v_org,
         nullif(e.item->>'costo_original','')::numeric,
         g.gasto_unit,
         round((e.item->>'costo')::numeric + g.gasto_unit, 4)
  from jsonb_array_elements(p_items) e(item)
  cross join lateral (
    select case when v_gastos_total<=0 then 0
                when v_subtotal>0 then round(v_gastos_total * ((e.item->>'importe')::numeric / v_subtotal) / (e.item->>'cantidad')::numeric, 4)
                else round(v_gastos_total / v_n_items / (e.item->>'cantidad')::numeric, 4) end as gasto_unit
  ) g;

  for v_item in
    select producto_id, cantidad, costo_final_unit, imeis
    from (
      select (e.item->>'producto_id')::uuid producto_id,(e.item->>'cantidad')::numeric cantidad,
             e.item->'imeis' imeis, e.ord
      from jsonb_array_elements(p_items) with ordinality e(item, ord)
    ) src
    join lateral (
      select ci.costo_final_unit from public.pos_compra_items ci
      where ci.compra_id=v_compra.id and ci.producto_id=src.producto_id limit 1
    ) c on true
    order by src.ord
  loop
    perform public.pos_mover_stock_atomico(v_item.producto_id,'compra',v_item.cantidad,
      v_compra.almacen_id,v_compra.numero::text,'Compra',coalesce(v_item.costo_final_unit,0));
    insert into public.pos_seriales(organizacion_id,producto_id,serial,estado,almacen_id,compra_id,notas)
    select v_org,v_item.producto_id,trim(s.serial),'disponible',v_compra.almacen_id,v_compra.id,
           'Compra '||v_compra.numero::text
    from jsonb_array_elements_text(coalesce(v_item.imeis,'[]'::jsonb)) s(serial);
  end loop;

  return jsonb_build_object('ok',true,'reutilizada',false,'compra',to_jsonb(v_compra),
    'items',jsonb_array_length(p_items),'seriales',v_seriales,
    'gastos_total',v_gastos_total,'total_desembarcado',v_compra.total_desembarcado);
end;
$function$;

-- 5) Asiento de compra en el servidor (única fuente): inventario a costo desembarcado, ITBIS aparte
create or replace function public.pos_reconstruir_asiento_compra(p_compra_id uuid)
 returns uuid
 language plpgsql
 set search_path to 'public'
as $function$
declare
  v public.pos_compras%rowtype;
  v_aid uuid;
  v_total_items numeric:=0;
  v_gastos numeric:=0;
  v_itbis numeric:=0;
  v_conciliar numeric:=0;
begin
  -- Si la compra ya no existe (eliminación), su asiento tampoco debe quedar.
  select * into v from public.pos_compras where id=p_compra_id;
  if v.id is null then
    delete from public.pos_asientos where tipo='compra' and origen_id=p_compra_id;
    return null;
  end if;
  if v.organizacion_id <> 'e404d1c4-24c5-4e17-88f6-84bef09d6d19'::uuid then return null; end if;
  delete from public.pos_asientos where organizacion_id=v.organizacion_id and tipo='compra' and origen_id=v.id;
  if v.estado<>'recibida' then return null; end if;
  select coalesce(sum(importe),0) into v_total_items from public.pos_compra_items where compra_id=v.id;
  if v_total_items<=0 then return null; end if;
  if abs(v_total_items-coalesce(v.subtotal,v.total))>0.01 then raise exception 'ASIENTO_COMPRA_TOTAL_NO_CUADRA compra=%',v.id; end if;
  perform public.pos_asegurar_cuentas_operativas(v.organizacion_id);
  v_gastos := coalesce(v.gastos_total,0);
  v_itbis := coalesce(v.itbis,0);
  -- Importación: ITBIS y gastos se pagan a aduana/agente, no al proveedor → quedan por conciliar (2199).
  v_conciliar := v_gastos + (case when v.es_importacion then v_itbis else 0 end);

  insert into public.pos_asientos(organizacion_id,fecha,concepto,referencia,tipo,origen_id,numero)
  values(v.organizacion_id,v.fecha,'Compra '||v.numero::text,v.numero::text,'compra',v.id,'C-'||v.numero::text)
  returning id into v_aid;

  insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
  select v.organizacion_id,v_aid,id,codigo,nombre,
         case when v_gastos>0 then 'Entrada de inventario (costo desembarcado)' else 'Entrada de inventario' end,
         v_total_items + v_gastos,0
  from public.pos_cuentas where organizacion_id=v.organizacion_id and codigo='1104';
  if v_itbis>0 then
    insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
    select v.organizacion_id,v_aid,id,codigo,nombre,'ITBIS pagado en compra',v_itbis,0
    from public.pos_cuentas where organizacion_id=v.organizacion_id and codigo='1105';
  end if;
  if v.a_credito then
    insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
    select v.organizacion_id,v_aid,id,codigo,nombre,'Compra a crédito',0,v.total
    from public.pos_cuentas where organizacion_id=v.organizacion_id and codigo='2101';
  else
    insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
    select v.organizacion_id,v_aid,id,codigo,nombre,'Compra de contado por conciliar',0,v.total
    from public.pos_cuentas where organizacion_id=v.organizacion_id and codigo='2199';
  end if;
  if v_conciliar>0 then
    insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
    select v.organizacion_id,v_aid,id,codigo,nombre,'Gastos de importación / ITBIS aduana por conciliar',0,v_conciliar
    from public.pos_cuentas where organizacion_id=v.organizacion_id and codigo='2199';
  end if;
  return v_aid;
end;
$function$;

-- 6) Abono a una factura de proveedor (con fecha, referencia y cuenta bancaria) ---------------
create or replace function public.pos_banco_registrar_pago_proveedor(
  p_compra_id uuid, p_monto numeric, p_metodo text, p_cuenta_id uuid default null,
  p_referencia text default null, p_nota text default null, p_fecha date default null)
 returns uuid
 language plpgsql
 set search_path to 'public'
as $function$
declare
  v_org uuid:=mi_organizacion(); v_c public.pos_compras%rowtype; v_pagado numeric:=0;
  v_pid uuid; v_aid uuid; v_met text; v_fecha date := coalesce(p_fecha, current_date); v_usuario text;
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
  select us.nom into v_usuario from public.profiles pr join public.usuarios_sistema us on us.id=pr.usuario_sistema_id where pr.id=auth.uid() limit 1;

  insert into public.pos_compra_pagos(organizacion_id,proveedor_id,compra_id,monto,fecha,metodo,referencia,nota,cuenta_bancaria_id,created_by_name)
  values(v_org,v_c.proveedor_id,v_c.id,p_monto,v_fecha,case when v_met='banco' then 'Banco' else 'Efectivo' end,
         nullif(trim(p_referencia),''),nullif(trim(p_nota),''),case when v_met='banco' then p_cuenta_id else null end,coalesce(v_usuario,'Sistema'))
  returning id into v_pid;

  perform public.pos_asegurar_cuentas_operativas(v_org);
  insert into public.pos_asientos(organizacion_id,fecha,concepto,referencia,tipo,origen_id,numero)
  values(v_org,v_fecha,'Pago a proveedor · Compra '||v_c.numero::text,coalesce(nullif(trim(p_referencia),''),v_c.numero::text),'pago_proveedor',v_pid,'PP-'||substr(v_pid::text,1,8)) returning id into v_aid;
  insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
  select v_org,v_aid,id,codigo,nombre,'Disminución cuenta por pagar',p_monto,0 from public.pos_cuentas where organizacion_id=v_org and codigo='2101';
  insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
  select v_org,v_aid,id,codigo,nombre,case when v_met='banco' then 'Salida por banco' else 'Salida de efectivo' end,0,p_monto from public.pos_cuentas where organizacion_id=v_org and codigo=case when v_met='banco' then '1102' else '1101' end;
  if v_met='banco' then
    insert into public.pos_banco_movimientos(organizacion_id,cuenta_bancaria_id,fecha,monto,concepto,referencia,origen_tipo,origen_id,origen_clave,creado_por)
    values(v_org,p_cuenta_id,v_fecha::timestamptz,-p_monto,'Pago proveedor · Compra '||v_c.numero::text,nullif(trim(p_referencia),''),'pago_proveedor',v_pid,'pago_proveedor:'||v_pid::text,auth.uid());
  end if;
  return v_pid;
end; $function$;

-- 7) Activar en STUDIO
update public.pos_config set compras_v2 = true where organizacion_id = 'e404d1c4-24c5-4e17-88f6-84bef09d6d19';
