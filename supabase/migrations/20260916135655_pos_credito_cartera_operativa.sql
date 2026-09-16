-- NEXUS PRO POS · cartera de crédito operativa no fiscal
-- Construye vencimiento de fiado simple, promesas, refinanciación y castigo contable.

alter table public.pos_ventas
  add column if not exists credito_vencimiento date;

alter table public.pos_financiamientos
  add column if not exists refinanciado_desde_id uuid references public.pos_financiamientos(id) on delete restrict,
  add column if not exists refinanciado_a_id uuid references public.pos_financiamientos(id) on delete restrict,
  add column if not exists castigo_monto numeric not null default 0,
  add column if not exists castigo_fecha date,
  add column if not exists castigo_motivo text,
  add column if not exists castigo_por uuid;

alter table public.pos_financiamientos drop constraint if exists pos_financiamientos_estado_check;
alter table public.pos_financiamientos
  add constraint pos_financiamientos_estado_check
  check (estado = any (array['activo'::text,'saldado'::text,'cancelado'::text,'refinanciado'::text,'castigado'::text]));

create unique index if not exists pos_fin_refinanciado_a_uidx
  on public.pos_financiamientos(refinanciado_a_id) where refinanciado_a_id is not null;

create table if not exists public.pos_credito_eventos (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null,
  cliente_id uuid,
  venta_id uuid references public.pos_ventas(id) on delete restrict,
  financiamiento_id uuid references public.pos_financiamientos(id) on delete restrict,
  tipo text not null check (tipo in ('promesa','refinanciacion','castigo','vencimiento')),
  monto numeric not null default 0,
  fecha_compromiso date,
  nota text,
  creado_por uuid,
  created_at timestamptz not null default now(),
  check (venta_id is not null or financiamiento_id is not null)
);
create index if not exists pos_credito_eventos_org_idx on public.pos_credito_eventos(organizacion_id,created_at desc);
create index if not exists pos_credito_eventos_fin_idx on public.pos_credito_eventos(financiamiento_id,created_at desc);
create index if not exists pos_credito_eventos_venta_idx on public.pos_credito_eventos(venta_id,created_at desc);

alter table public.pos_credito_eventos enable row level security;
drop policy if exists pos_credito_eventos_select on public.pos_credito_eventos;
create policy pos_credito_eventos_select on public.pos_credito_eventos for select to authenticated
using (mi_rol() is not null and organizacion_id=mi_organizacion());
drop policy if exists pos_credito_eventos_insert on public.pos_credito_eventos;
create policy pos_credito_eventos_insert on public.pos_credito_eventos for insert to authenticated
with check (mi_rol() in ('admin','gerente','cajero') and organizacion_id=mi_organizacion());

create or replace function public.pos_credito_saldo_principal(p_financiamiento_id uuid)
returns numeric
language sql stable security invoker set search_path=public as $$
  select coalesce(sum(greatest(c.monto - coalesce((
    select sum(case when p.tipo='pago' then coalesce(p.monto_principal,0)
                    when p.tipo='reversa' then -coalesce(p.monto_principal,0) else 0 end)
    from public.pos_fin_pagos p
    where p.organizacion_id=c.organizacion_id and p.cuota_id=c.id
  ),0),0)),0)
  from public.pos_fin_cuotas c
  where c.organizacion_id=mi_organizacion() and c.financiamiento_id=p_financiamiento_id
$$;

create or replace function public.pos_credito_establecer_vencimiento_venta(p_venta_id uuid,p_fecha date)
returns boolean
language plpgsql security invoker set search_path=public as $$
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
end; $$;

create or replace function public.pos_credito_registrar_promesa(
  p_venta_id uuid,p_financiamiento_id uuid,p_fecha date,p_monto numeric,p_nota text default null
) returns uuid
language plpgsql security invoker set search_path=public as $$
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
end; $$;

create or replace function public.pos_credito_refinanciar(
  p_financiamiento_id uuid,p_cuotas_total integer,p_frecuencia text,p_primera_fecha date,p_nota text default null
) returns uuid
language plpgsql security invoker set search_path=public as $$
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
end; $$;

create or replace function public.pos_credito_castigar(p_financiamiento_id uuid,p_motivo text)
returns numeric
language plpgsql security invoker set search_path=public as $$
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
end; $$;

revoke all on function public.pos_credito_saldo_principal(uuid) from public,anon;
revoke all on function public.pos_credito_establecer_vencimiento_venta(uuid,date) from public,anon;
revoke all on function public.pos_credito_registrar_promesa(uuid,uuid,date,numeric,text) from public,anon;
revoke all on function public.pos_credito_refinanciar(uuid,integer,text,date,text) from public,anon;
revoke all on function public.pos_credito_castigar(uuid,text) from public,anon;
grant execute on function public.pos_credito_saldo_principal(uuid) to authenticated;
grant execute on function public.pos_credito_establecer_vencimiento_venta(uuid,date) to authenticated;
grant execute on function public.pos_credito_registrar_promesa(uuid,uuid,date,numeric,text) to authenticated;
grant execute on function public.pos_credito_refinanciar(uuid,integer,text,date,text) to authenticated;
grant execute on function public.pos_credito_castigar(uuid,text) to authenticated;
