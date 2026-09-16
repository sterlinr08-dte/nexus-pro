-- NEXUS PRO POS · bancos y conciliación operativa no fiscal

create table if not exists public.pos_cuentas_bancarias (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null,
  banco_nombre text not null,
  alias text not null,
  numero text not null,
  tipo text not null default 'corriente' check (tipo in ('corriente','ahorros','otro')),
  moneda text not null default 'DOP',
  saldo_inicial numeric not null default 0,
  fecha_saldo_inicial date not null default current_date,
  predeterminada boolean not null default false,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists pos_cuentas_bancarias_numero_uidx
  on public.pos_cuentas_bancarias(organizacion_id,(regexp_replace(lower(numero),'[^0-9a-z]','','g')));
create unique index if not exists pos_cuentas_bancarias_default_uidx
  on public.pos_cuentas_bancarias(organizacion_id) where predeterminada is true and activa is true;
create index if not exists pos_cuentas_bancarias_org_idx on public.pos_cuentas_bancarias(organizacion_id,activa);

create table if not exists public.pos_banco_movimientos (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null,
  cuenta_bancaria_id uuid not null references public.pos_cuentas_bancarias(id) on delete restrict,
  fecha timestamptz not null default now(),
  monto numeric not null check (monto <> 0),
  concepto text not null,
  referencia text,
  origen_tipo text,
  origen_id uuid,
  origen_clave text,
  creado_por uuid,
  created_at timestamptz not null default now()
);
create index if not exists pos_banco_mov_org_fecha_idx on public.pos_banco_movimientos(organizacion_id,cuenta_bancaria_id,fecha desc);
create unique index if not exists pos_banco_mov_origen_clave_uidx on public.pos_banco_movimientos(organizacion_id,origen_clave) where origen_clave is not null;

create table if not exists public.pos_banco_extractos (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null,
  cuenta_bancaria_id uuid not null references public.pos_cuentas_bancarias(id) on delete restrict,
  fecha date not null,
  monto numeric not null check (monto <> 0),
  descripcion text not null,
  referencia text,
  fingerprint text not null,
  creado_por uuid,
  created_at timestamptz not null default now()
);
create unique index if not exists pos_banco_extracto_fp_uidx on public.pos_banco_extractos(organizacion_id,cuenta_bancaria_id,fingerprint);
create index if not exists pos_banco_extracto_org_fecha_idx on public.pos_banco_extractos(organizacion_id,cuenta_bancaria_id,fecha desc);

create table if not exists public.pos_banco_conciliaciones (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null,
  cuenta_bancaria_id uuid not null references public.pos_cuentas_bancarias(id) on delete restrict,
  movimiento_id uuid not null references public.pos_banco_movimientos(id) on delete cascade,
  extracto_id uuid not null references public.pos_banco_extractos(id) on delete cascade,
  nota text,
  conciliado_por uuid,
  conciliado_at timestamptz not null default now()
);
create unique index if not exists pos_banco_conc_mov_uidx on public.pos_banco_conciliaciones(movimiento_id);
create unique index if not exists pos_banco_conc_ext_uidx on public.pos_banco_conciliaciones(extracto_id);
create index if not exists pos_banco_conc_org_idx on public.pos_banco_conciliaciones(organizacion_id,cuenta_bancaria_id);

alter table public.pos_compra_pagos add column if not exists cuenta_bancaria_id uuid references public.pos_cuentas_bancarias(id) on delete restrict;

alter table public.pos_cuentas_bancarias enable row level security;
alter table public.pos_banco_movimientos enable row level security;
alter table public.pos_banco_extractos enable row level security;
alter table public.pos_banco_conciliaciones enable row level security;

-- Lectura para cualquier usuario válido de su empresa; escritura directa solo admin/gerente.
drop policy if exists pos_cuentas_bancarias_select on public.pos_cuentas_bancarias;
create policy pos_cuentas_bancarias_select on public.pos_cuentas_bancarias for select to authenticated
using (mi_rol() is not null and organizacion_id=mi_organizacion());
drop policy if exists pos_cuentas_bancarias_write on public.pos_cuentas_bancarias;
create policy pos_cuentas_bancarias_write on public.pos_cuentas_bancarias for all to authenticated
using (mi_rol() in ('admin','gerente') and organizacion_id=mi_organizacion())
with check (mi_rol() in ('admin','gerente') and organizacion_id=mi_organizacion());

drop policy if exists pos_banco_mov_select on public.pos_banco_movimientos;
create policy pos_banco_mov_select on public.pos_banco_movimientos for select to authenticated
using (mi_rol() is not null and organizacion_id=mi_organizacion());
drop policy if exists pos_banco_mov_write on public.pos_banco_movimientos;
create policy pos_banco_mov_write on public.pos_banco_movimientos for all to authenticated
using (mi_rol() in ('admin','gerente') and organizacion_id=mi_organizacion())
with check (mi_rol() in ('admin','gerente') and organizacion_id=mi_organizacion());

drop policy if exists pos_banco_ext_select on public.pos_banco_extractos;
create policy pos_banco_ext_select on public.pos_banco_extractos for select to authenticated
using (mi_rol() is not null and organizacion_id=mi_organizacion());
drop policy if exists pos_banco_ext_write on public.pos_banco_extractos;
create policy pos_banco_ext_write on public.pos_banco_extractos for all to authenticated
using (mi_rol() in ('admin','gerente') and organizacion_id=mi_organizacion())
with check (mi_rol() in ('admin','gerente') and organizacion_id=mi_organizacion());

drop policy if exists pos_banco_conc_select on public.pos_banco_conciliaciones;
create policy pos_banco_conc_select on public.pos_banco_conciliaciones for select to authenticated
using (mi_rol() is not null and organizacion_id=mi_organizacion());
drop policy if exists pos_banco_conc_write on public.pos_banco_conciliaciones;
create policy pos_banco_conc_write on public.pos_banco_conciliaciones for all to authenticated
using (mi_rol() in ('admin','gerente') and organizacion_id=mi_organizacion())
with check (mi_rol() in ('admin','gerente') and organizacion_id=mi_organizacion());

create or replace function public.pos_banco_guardar_cuenta(
  p_id uuid,
  p_banco_nombre text,
  p_alias text,
  p_numero text,
  p_tipo text default 'corriente',
  p_moneda text default 'DOP',
  p_saldo_inicial numeric default 0,
  p_fecha_saldo_inicial date default current_date,
  p_predeterminada boolean default false,
  p_activa boolean default true
) returns uuid
language plpgsql security invoker set search_path=public as $$
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
end; $$;

create or replace function public.pos_banco_registrar_extracto(
  p_cuenta_id uuid,p_fecha date,p_monto numeric,p_descripcion text,p_referencia text default null,p_fingerprint text default null
) returns uuid
language plpgsql security invoker set search_path=public as $$
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
end; $$;

create or replace function public.pos_banco_conciliar(p_movimiento_id uuid,p_extracto_id uuid,p_nota text default null)
returns uuid language plpgsql security invoker set search_path=public as $$
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
end; $$;

create or replace function public.pos_banco_desconciliar(p_conciliacion_id uuid)
returns boolean language plpgsql security invoker set search_path=public as $$
begin
  if mi_rol() not in ('admin','gerente') then raise exception 'BANCO_SIN_PERMISO'; end if;
  delete from public.pos_banco_conciliaciones where id=p_conciliacion_id and organizacion_id=mi_organizacion();
  return found;
end; $$;

create or replace function public.pos_banco_asignar_pago_venta(
  p_venta_id uuid,p_cuenta_id uuid,p_monto numeric,p_metodo text,p_referencia text default null
) returns uuid language plpgsql security invoker set search_path=public as $$
declare v_org uuid:=mi_organizacion(); v_venta public.pos_ventas%rowtype; v_asignado numeric:=0; v_max numeric:=0; v_id uuid; v_met text;
begin
  if mi_rol() not in ('admin','gerente','cajero') then raise exception 'BANCO_SIN_PERMISO'; end if;
  select * into v_venta from public.pos_ventas where id=p_venta_id and organizacion_id=v_org and estado='completada';
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
  select * into v_c from public.pos_compras where id=p_compra_id and organizacion_id=v_org and estado='recibida';
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
  select * into v_c from public.pos_compras where id=p_compra_id and organizacion_id=v_org and estado='recibida';
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

create or replace function public.pos_banco_resumen(p_cuenta_id uuid)
returns table(saldo_libro numeric,saldo_conciliado numeric,pendientes_sistema bigint,pendientes_extracto bigint)
language sql security invoker set search_path=public as $$
  select
    c.saldo_inicial+coalesce((select sum(m.monto) from public.pos_banco_movimientos m where m.cuenta_bancaria_id=c.id),0) as saldo_libro,
    c.saldo_inicial+coalesce((select sum(m.monto) from public.pos_banco_movimientos m where m.cuenta_bancaria_id=c.id and exists(select 1 from public.pos_banco_conciliaciones x where x.movimiento_id=m.id)),0) as saldo_conciliado,
    (select count(*) from public.pos_banco_movimientos m where m.cuenta_bancaria_id=c.id and not exists(select 1 from public.pos_banco_conciliaciones x where x.movimiento_id=m.id)),
    (select count(*) from public.pos_banco_extractos e where e.cuenta_bancaria_id=c.id and not exists(select 1 from public.pos_banco_conciliaciones x where x.extracto_id=e.id))
  from public.pos_cuentas_bancarias c
  where c.id=p_cuenta_id and c.organizacion_id=mi_organizacion();
$$;

revoke all on function public.pos_banco_guardar_cuenta(uuid,text,text,text,text,text,numeric,date,boolean,boolean) from public,anon;
revoke all on function public.pos_banco_registrar_extracto(uuid,date,numeric,text,text,text) from public,anon;
revoke all on function public.pos_banco_conciliar(uuid,uuid,text) from public,anon;
revoke all on function public.pos_banco_desconciliar(uuid) from public,anon;
revoke all on function public.pos_banco_asignar_pago_venta(uuid,uuid,numeric,text,text) from public,anon;
revoke all on function public.pos_banco_clasificar_compra_contado(uuid,text,uuid,text) from public,anon;
revoke all on function public.pos_banco_registrar_pago_proveedor(uuid,numeric,text,uuid,text,text) from public,anon;
revoke all on function public.pos_banco_resumen(uuid) from public,anon;
grant execute on function public.pos_banco_guardar_cuenta(uuid,text,text,text,text,text,numeric,date,boolean,boolean) to authenticated;
grant execute on function public.pos_banco_registrar_extracto(uuid,date,numeric,text,text,text) to authenticated;
grant execute on function public.pos_banco_conciliar(uuid,uuid,text) to authenticated;
grant execute on function public.pos_banco_desconciliar(uuid) to authenticated;
grant execute on function public.pos_banco_asignar_pago_venta(uuid,uuid,numeric,text,text) to authenticated;
grant execute on function public.pos_banco_clasificar_compra_contado(uuid,text,uuid,text) to authenticated;
grant execute on function public.pos_banco_registrar_pago_proveedor(uuid,numeric,text,uuid,text,text) to authenticated;
grant execute on function public.pos_banco_resumen(uuid) to authenticated;
