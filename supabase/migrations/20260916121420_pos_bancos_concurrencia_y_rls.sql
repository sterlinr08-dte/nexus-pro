-- NEXUS PRO POS · endurecimiento bancario: concurrencia + RLS de pagos de compra

drop policy if exists pos_compra_pagos_admin on public.pos_compra_pagos;
drop policy if exists pos_compra_pagos_select on public.pos_compra_pagos;
drop policy if exists pos_compra_pagos_insert on public.pos_compra_pagos;
drop policy if exists pos_compra_pagos_update on public.pos_compra_pagos;
drop policy if exists pos_compra_pagos_delete on public.pos_compra_pagos;

create policy pos_compra_pagos_select on public.pos_compra_pagos
for select to authenticated
using (mi_rol() is not null and organizacion_id=mi_organizacion());

create policy pos_compra_pagos_insert on public.pos_compra_pagos
for insert to authenticated
with check (mi_rol() in ('admin','gerente','cajero') and organizacion_id=mi_organizacion());

create policy pos_compra_pagos_update on public.pos_compra_pagos
for update to authenticated
using (mi_rol() in ('admin','gerente') and organizacion_id=mi_organizacion())
with check (mi_rol() in ('admin','gerente') and organizacion_id=mi_organizacion());

create policy pos_compra_pagos_delete on public.pos_compra_pagos
for delete to authenticated
using (mi_rol() in ('admin','gerente') and organizacion_id=mi_organizacion());

create or replace function public.pos_banco_asignar_pago_venta(
  p_venta_id uuid,p_cuenta_id uuid,p_monto numeric,p_metodo text,p_referencia text default null
) returns uuid language plpgsql security invoker set search_path=public as $$
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
end; $$;

create or replace function public.pos_banco_clasificar_compra_contado(
  p_compra_id uuid,p_metodo text,p_cuenta_id uuid default null,p_referencia text default null
) returns uuid language plpgsql security invoker set search_path=public as $$
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
end; $$;

create or replace function public.pos_banco_registrar_pago_proveedor(
  p_compra_id uuid,p_monto numeric,p_metodo text,p_cuenta_id uuid default null,p_referencia text default null,p_nota text default null
) returns uuid language plpgsql security invoker set search_path=public as $$
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
end; $$;

revoke all on function public.pos_banco_asignar_pago_venta(uuid,uuid,numeric,text,text) from public,anon;
revoke all on function public.pos_banco_clasificar_compra_contado(uuid,text,uuid,text) from public,anon;
revoke all on function public.pos_banco_registrar_pago_proveedor(uuid,numeric,text,uuid,text,text) from public,anon;
grant execute on function public.pos_banco_asignar_pago_venta(uuid,uuid,numeric,text,text) to authenticated;
grant execute on function public.pos_banco_clasificar_compra_contado(uuid,text,uuid,text) to authenticated;
grant execute on function public.pos_banco_registrar_pago_proveedor(uuid,numeric,text,uuid,text,text) to authenticated;
