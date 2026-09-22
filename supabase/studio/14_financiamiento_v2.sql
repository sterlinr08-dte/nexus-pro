-- STUDIO · Financiamiento v2: planes con interés (plano / sobre saldo, dos fases), solicitud → aprobación,
-- perfil crediticio, referencias, documentos, contrato congelado + token de firma, mora por plan y cobro
-- con capital / interés / mora asentado en el servidor.
-- Aplicar SOLO en la base STUDIO (edbknlkjnlfmkkiizdbe). La base madre no cambia: el frontend solo usa
-- estas rutas cuando pos_config.financiamiento_v2 = true.
--
-- Principios (CLAUDE.md): una sola fuente de verdad contable. La cuenta por cobrar (1103) lleva SOLO el
-- capital; el interés se reconoce al cobrar cada cuota (4102) y la mora en 4103. Un abono parcial cubre
-- mora → interés → capital. Todo sobre pos_financiamientos / pos_fin_cuotas / pos_fin_pagos existentes.
-- Bitácora: docs/bitacora/2026-09-22-0610-claude.md (modelo acordado) y la entrega de esta migración.

-- 1) Bandera y configuración --------------------------------------------------------------------
alter table public.pos_config
  add column if not exists financiamiento_v2 boolean not null default false,
  add column if not exists fin_contrato_titulo text,
  add column if not exists fin_contrato_plantilla text,
  add column if not exists fin_firma_vigencia_horas integer not null default 72;

-- 2) Plan de cuentas: 4102 Ingresos financieros (interés) ----------------------------------------
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
    (p_org,'4102','Ingresos financieros (interés)','ingreso','acreedora',true),
    (p_org,'4103','Recargos por mora','ingreso','acreedora',true),
    (p_org,'5101','Costo de ventas','gasto','deudora',true)
  on conflict (organizacion_id,codigo) do update
    set nombre=excluded.nombre,tipo=excluded.tipo,naturaleza=excluded.naturaleza,activo=true;
end;
$function$;

-- 3) Tablas nuevas ---------------------------------------------------------------------------------
create table if not exists public.pos_fin_planes (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid,
  nombre text not null,
  metodo text not null default 'saldo' check (metodo in ('plano','saldo')),
  frecuencia text not null default 'mensual' check (frecuencia in ('semanal','quincenal','mensual')),
  num_cuotas integer not null check (num_cuotas between 1 and 120),
  cuotas_fase1 integer not null default 0 check (cuotas_fase1 >= 0),
  tasa1 numeric not null default 0 check (tasa1 >= 0),
  tasa2 numeric not null default 0 check (tasa2 >= 0),
  mora_tipo text not null default 'ninguna' check (mora_tipo in ('ninguna','fija','pct')),
  mora_valor numeric not null default 0 check (mora_valor >= 0),
  mora_dias_gracia integer not null default 0 check (mora_dias_gracia >= 0),
  inicial_min_pct numeric not null default 0 check (inicial_min_pct between 0 and 100),
  activo boolean not null default true,
  notas text,
  created_at timestamptz not null default now(),
  unique (organizacion_id, id),
  check (cuotas_fase1 <= num_cuotas)
);

create table if not exists public.pos_fin_perfil (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid,
  cliente_id uuid not null,
  lugar_trabajo text,
  ocupacion text,
  ingreso_mensual numeric,
  tiempo_laborando text,
  direccion text,
  notas text,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organizacion_id, cliente_id),
  unique (organizacion_id, id)
);

create table if not exists public.pos_fin_referencias (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid,
  cliente_id uuid not null,
  nombre text not null,
  telefono text,
  parentesco text,
  created_at timestamptz not null default now(),
  unique (organizacion_id, id)
);

create table if not exists public.pos_fin_documentos (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid,
  cliente_id uuid,
  solicitud_id uuid,
  financiamiento_id uuid,
  tipo text not null default 'otro',          -- cedula | carta_trabajo | comprobante | contrato | otro
  nombre text,
  storage_path text not null,                 -- objeto en el bucket privado "documentos"
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (organizacion_id, id)
);

create table if not exists public.pos_fin_solicitudes (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid,
  codigo text,
  cliente_id uuid not null,
  cliente_nombre text,
  items jsonb not null default '[]'::jsonb,   -- [{producto_id,nombre,precio,cantidad,importe,serial}]
  precio_total numeric not null check (precio_total > 0),
  inicial numeric not null default 0 check (inicial >= 0),
  inicial_metodo text not null default 'efectivo' check (inicial_metodo in ('efectivo','transferencia','tarjeta')),
  plan_id uuid not null,
  primera_fecha date not null,
  estado text not null default 'pendiente' check (estado in ('borrador','pendiente','aprobada','rechazada','cancelada')),
  motivo_rechazo text,
  nota_aprobador text,
  notas text,
  creado_por uuid,
  creado_por_nombre text,
  decidido_por uuid,
  decidido_en timestamptz,
  venta_id uuid,
  financiamiento_id uuid,
  created_at timestamptz not null default now(),
  unique (organizacion_id, id),
  check (inicial < precio_total)
);
create unique index if not exists pos_fin_solicitudes_codigo_uidx on public.pos_fin_solicitudes(organizacion_id, codigo) where codigo is not null;

-- RLS (mismo patrón tenant que pos_financiamientos) + triggers de organización
do $$
declare t text;
begin
  foreach t in array array['pos_fin_planes','pos_fin_perfil','pos_fin_referencias','pos_fin_documentos','pos_fin_solicitudes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t||'_tenant', t);
    execute format('create policy %I on public.%I for all to authenticated using (organizacion_id = mi_organizacion() and mi_rol() is not null) with check (organizacion_id = mi_organizacion() and mi_rol() is not null)', t||'_tenant', t);
    execute format('drop trigger if exists %I on public.%I', t||'_org', t);
    execute format('create trigger %I before insert on public.%I for each row execute function set_organizacion_id()', t||'_org', t);
    execute format('drop trigger if exists %I on public.%I', t||'_org_inmutable', t);
    execute format('create trigger %I before update on public.%I for each row execute function nx_impedir_cambio_organizacion()', t||'_org_inmutable', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- 4) Columnas nuevas en las tablas existentes --------------------------------------------------------
alter table public.pos_financiamientos
  add column if not exists codigo text,
  add column if not exists plan_id uuid,
  add column if not exists solicitud_id uuid,
  add column if not exists interes_total numeric not null default 0,
  add column if not exists primera_fecha date,
  add column if not exists contrato_titulo text,
  add column if not exists contrato_texto text,
  add column if not exists contrato_version integer,
  add column if not exists contrato_en timestamptz,
  add column if not exists firma_cliente text,
  add column if not exists firma_cliente_en timestamptz,
  add column if not exists firma_cliente_tel text,
  add column if not exists firma_tienda text,
  add column if not exists firma_tienda_por text,
  add column if not exists firma_tienda_en timestamptz,
  add column if not exists firma_token uuid,
  add column if not exists firma_token_vence timestamptz;
create unique index if not exists pos_financiamientos_codigo_uidx on public.pos_financiamientos(organizacion_id, codigo) where codigo is not null;
create unique index if not exists pos_financiamientos_firma_token_uidx on public.pos_financiamientos(firma_token) where firma_token is not null;

alter table public.pos_fin_cuotas
  add column if not exists capital numeric,
  add column if not exists interes numeric not null default 0,
  add column if not exists mora_exenta boolean not null default false,
  add column if not exists mora_exenta_motivo text;
update public.pos_fin_cuotas set capital = monto - coalesce(interes,0) where capital is null;

alter table public.pos_fin_pagos
  add column if not exists monto_interes numeric not null default 0;

-- capital por defecto = monto − interés (las rutas legadas insertan solo monto)
create or replace function public.pos_fin_cuota_defaults()
 returns trigger language plpgsql set search_path to 'public' as $function$
begin
  if new.interes is null then new.interes := 0; end if;
  if new.capital is null then new.capital := coalesce(new.monto,0) - new.interes; end if;
  if new.monto is null then new.monto := new.capital + new.interes; end if;
  if abs((new.capital + new.interes) - new.monto) > 0.01 then raise exception 'FIN_CUOTA_CAPITAL_INTERES_NO_CUADRAN'; end if;
  return new;
end $function$;
drop trigger if exists pos_fin_cuota_defaults on public.pos_fin_cuotas;
create trigger pos_fin_cuota_defaults before insert on public.pos_fin_cuotas for each row execute function public.pos_fin_cuota_defaults();

-- 5) Secuencias SC- (solicitud) y FN- (financiamiento) ----------------------------------------------
insert into public.pos_secuencias(organizacion_id,tipo,nombre,prefijo,longitud,proximo,activo)
select 'e404d1c4-24c5-4e17-88f6-84bef09d6d19', x.tipo, x.nombre, x.prefijo, 6, 1, true
from (values ('fin_solicitud','Solicitud de crédito','SC-'),('financiamiento','Financiamiento','FN-')) as x(tipo,nombre,prefijo)
where not exists (select 1 from public.pos_secuencias s where s.organizacion_id='e404d1c4-24c5-4e17-88f6-84bef09d6d19' and s.tipo=x.tipo);

create or replace function public.pos_fin_siguiente_codigo(p_tipo text)
 returns text language plpgsql set search_path to 'public' as $function$
declare v_org uuid:=mi_organizacion(); v_pref text; v_len int; v_n bigint;
begin
  update public.pos_secuencias set proximo=proximo+1
  where organizacion_id=v_org and tipo=p_tipo and activo
  returning prefijo, longitud, proximo-1 into v_pref, v_len, v_n;
  if v_n is null then return null; end if;
  return v_pref || lpad(v_n::text, greatest(coalesce(v_len,5),1), '0');
end $function$;

create or replace function public.pos_fin_solicitud_before_insert()
 returns trigger language plpgsql set search_path to 'public' as $function$
begin
  if new.codigo is null then new.codigo := public.pos_fin_siguiente_codigo('fin_solicitud'); end if;
  if new.creado_por is null then new.creado_por := auth.uid(); end if;
  if new.cliente_nombre is null then select nombre into new.cliente_nombre from public.pos_clientes where id=new.cliente_id; end if;
  return new;
end $function$;
drop trigger if exists pos_fin_solicitud_before_insert on public.pos_fin_solicitudes;
create trigger pos_fin_solicitud_before_insert before insert on public.pos_fin_solicitudes for each row execute function public.pos_fin_solicitud_before_insert();

-- La aprobación solo puede hacerla la RPC (deja el rastro y crea venta + financiamiento).
create or replace function public.pos_fin_solicitud_guard_update()
 returns trigger language plpgsql set search_path to 'public' as $function$
begin
  if new.estado='aprobada' and old.estado<>'aprobada' and coalesce(current_setting('nx.fin_aprobando',true),'')<>'1' then
    raise exception 'FIN_SOLICITUD_APROBAR_SOLO_POR_RPC';
  end if;
  if old.estado in ('aprobada','rechazada','cancelada') and new.estado<>old.estado then
    raise exception 'FIN_SOLICITUD_DECIDIDA_INMUTABLE';
  end if;
  return new;
end $function$;
drop trigger if exists pos_fin_solicitud_guard_update on public.pos_fin_solicitudes;
create trigger pos_fin_solicitud_guard_update before update on public.pos_fin_solicitudes for each row execute function public.pos_fin_solicitud_guard_update();

-- 6) Amortización: UNA sola fórmula para simular, aprobar y crear cuotas -----------------------------
create or replace function public.pos_fin_amortizacion(
  p_capital numeric, p_metodo text, p_num_cuotas integer, p_cuotas_fase1 integer,
  p_tasa1 numeric, p_tasa2 numeric, p_frecuencia text, p_primera_fecha date)
 returns table(numero integer, fecha_venc date, capital numeric, interes numeric, cuota numeric, saldo_despues numeric)
 language plpgsql immutable set search_path to 'public' as $function$
declare v_base numeric; v_saldo numeric; i integer; v_cap numeric; v_int numeric; v_tasa numeric; v_f1 integer:=coalesce(p_cuotas_fase1,0);
begin
  if coalesce(p_capital,0)<=0 then raise exception 'FIN_CAPITAL_INVALIDO'; end if;
  if p_num_cuotas is null or p_num_cuotas<1 or p_num_cuotas>120 then raise exception 'FIN_CUOTAS_INVALIDAS'; end if;
  if v_f1<0 or v_f1>p_num_cuotas then raise exception 'FIN_FASE1_INVALIDA'; end if;
  if coalesce(p_tasa1,0)<0 or coalesce(p_tasa2,0)<0 then raise exception 'FIN_TASA_INVALIDA'; end if;
  if p_metodo not in ('plano','saldo') then raise exception 'FIN_METODO_INVALIDO'; end if;
  if p_frecuencia not in ('semanal','quincenal','mensual') then raise exception 'FIN_FRECUENCIA_INVALIDA'; end if;
  if p_primera_fecha is null then raise exception 'FIN_PRIMER_VENCIMIENTO_REQUERIDO'; end if;
  v_base := round(p_capital/p_num_cuotas,2); v_saldo := p_capital;
  for i in 1..p_num_cuotas loop
    v_cap := case when i=p_num_cuotas then round(p_capital - v_base*(p_num_cuotas-1),2) else v_base end;
    -- Sin fase 1 (0) todas las cuotas usan la tasa 1. Con fase 1, las cuotas > fase 1 usan la tasa 2.
    v_tasa := case when v_f1>0 and i>v_f1 then coalesce(p_tasa2,0) else coalesce(p_tasa1,0) end;
    v_int := case when p_metodo='plano' then round(p_capital*v_tasa/100,2) else round(v_saldo*v_tasa/100,2) end;
    v_saldo := v_saldo - v_cap;
    numero := i;
    fecha_venc := case p_frecuencia when 'semanal' then p_primera_fecha+((i-1)*7) when 'quincenal' then p_primera_fecha+((i-1)*15) else (p_primera_fecha+make_interval(months=>i-1))::date end;
    capital := v_cap; interes := v_int; cuota := v_cap+v_int; saldo_despues := greatest(v_saldo,0);
    return next;
  end loop;
end $function$;

create or replace function public.pos_fin_amortizacion_plan(p_capital numeric, p_plan_id uuid, p_primera_fecha date)
 returns table(numero integer, fecha_venc date, capital numeric, interes numeric, cuota numeric, saldo_despues numeric)
 language plpgsql stable set search_path to 'public' as $function$
declare pl public.pos_fin_planes%rowtype;
begin
  select * into pl from public.pos_fin_planes where id=p_plan_id and organizacion_id=mi_organizacion();
  if pl.id is null then raise exception 'FIN_PLAN_INVALIDO'; end if;
  return query select * from public.pos_fin_amortizacion(p_capital, pl.metodo, pl.num_cuotas, pl.cuotas_fase1, pl.tasa1, pl.tasa2, pl.frecuencia, p_primera_fecha);
end $function$;

-- 7) Mora por plan (fallback: % global de pos_config para financiamientos sin plan) -------------------
create or replace function public.pos_fin_mora_calculada(p_cuota_id uuid, p_fecha date)
 returns numeric language plpgsql stable set search_path to 'public' as $function$
declare v_org uuid:=mi_organizacion(); c record; pl record; v_pct numeric:=0; v_gracia int:=0; v_pagado numeric:=0; v_calc numeric:=0;
begin
  select c1.monto, c1.fecha_venc, f.plan_id into c from public.pos_fin_cuotas c1 join public.pos_financiamientos f on f.id=c1.financiamiento_id
  where c1.id=p_cuota_id and c1.organizacion_id=v_org;
  if c.monto is null or p_fecha is null then return 0; end if;
  select coalesce(sum(case when tipo='pago' then monto_principal+coalesce(monto_interes,0) when tipo='reversa' then -(monto_principal+coalesce(monto_interes,0)) else 0 end),0)
    into v_pagado from public.pos_fin_pagos where cuota_id=p_cuota_id and organizacion_id=v_org;
  if v_pagado >= c.monto-0.01 then return 0; end if;
  if c.plan_id is not null then
    select mora_tipo, mora_valor, mora_dias_gracia into pl from public.pos_fin_planes where id=c.plan_id;
    v_gracia := greatest(coalesce(pl.mora_dias_gracia,0),0);
    if p_fecha <= c.fecha_venc + v_gracia then return 0; end if;
    v_calc := case pl.mora_tipo when 'fija' then coalesce(pl.mora_valor,0) when 'pct' then round(c.monto*coalesce(pl.mora_valor,0)/100,2) else 0 end;
  else
    select coalesce(mora_pct,0), coalesce(mora_dias_gracia,0) into v_pct, v_gracia from public.pos_config where organizacion_id=v_org limit 1;
    v_gracia := greatest(coalesce(v_gracia,0),0);
    if coalesce(v_pct,0)>0 and p_fecha > c.fecha_venc + v_gracia then v_calc := round(c.monto*v_pct/100,2); end if;
  end if;
  return greatest(coalesce(v_calc,0),0);
end $function$;

create or replace function public.pos_fin_mora_total(p_cuota_id uuid, p_fecha date default current_date)
 returns numeric language plpgsql stable set search_path to 'public' as $function$
declare v_org uuid:=mi_organizacion(); v_generada numeric:=0; v_exenta boolean:=false; v_pagada numeric:=0;
begin
  select coalesce(mora_generada,0), coalesce(mora_exenta,false), coalesce(mora_pagada,0) into v_generada, v_exenta, v_pagada
  from public.pos_fin_cuotas where id=p_cuota_id and organizacion_id=v_org;
  if v_generada is null then return 0; end if;
  if v_exenta then return greatest(v_pagada,0); end if;   -- condonada: no queda mora pendiente
  return greatest(v_generada, public.pos_fin_mora_calculada(p_cuota_id, p_fecha), 0);
end $function$;

-- 8) Validación del pago: reparto mora → interés → capital (v2) / capital → mora (legado) ------------
create or replace function public.pos_fin_validar_pago_insert()
 returns trigger language plpgsql set search_path to 'public' as $function$
declare
  v_org uuid:=mi_organizacion(); v_rol text:=mi_rol(); v_estado text; v_plan uuid; v_cuota_monto numeric; v_capital numeric; v_interes numeric;
  v_venc date; v_mora_generada numeric:=0; v_exenta boolean:=false; v_v2 boolean:=false;
  v_principal_pagado numeric:=0; v_interes_pagado numeric:=0; v_mora_pagada numeric:=0; v_mora_total numeric:=0; v_mora_calc numeric:=0;
  v_cap_pend numeric:=0; v_int_pend numeric:=0; v_mora_pend numeric:=0; v_resto numeric:=0; v_orig public.pos_fin_pagos%rowtype;
begin
  if v_rol not in ('admin','gerente','cajero') then raise exception 'FIN_SIN_PERMISO'; end if;
  if v_org is null then raise exception 'FIN_ORG_REQUERIDA'; end if;
  if new.organizacion_id is null then new.organizacion_id:=v_org; end if;
  if new.organizacion_id<>v_org then raise exception 'FIN_ORG_INVALIDA'; end if;
  if coalesce(new.monto,0)<=0 then raise exception 'FIN_MONTO_INVALIDO'; end if;

  select f.estado, f.plan_id, c.monto, coalesce(c.capital,c.monto), coalesce(c.interes,0), c.fecha_venc, coalesce(c.mora_generada,0), coalesce(c.mora_exenta,false)
    into v_estado, v_plan, v_cuota_monto, v_capital, v_interes, v_venc, v_mora_generada, v_exenta
  from public.pos_financiamientos f join public.pos_fin_cuotas c on c.financiamiento_id=f.id and c.organizacion_id=f.organizacion_id
  where f.id=new.financiamiento_id and c.id=new.cuota_id and f.organizacion_id=v_org for update of f,c;
  if v_estado is null then raise exception 'FIN_CUOTA_INVALIDA'; end if;
  select coalesce(financiamiento_v2,false) into v_v2 from public.pos_config where organizacion_id=v_org limit 1;
  v_v2 := coalesce(v_v2,false) or v_plan is not null;

  if new.tipo='pago' then
    if v_estado<>'activo' then raise exception 'FIN_NO_ACTIVO'; end if;
    if new.reversa_de_id is not null then raise exception 'FIN_PAGO_NO_PUEDE_REFERIR_REVERSA'; end if;
    select coalesce(sum(case when tipo='pago' then monto_principal when tipo='reversa' then -monto_principal else 0 end),0),
           coalesce(sum(case when tipo='pago' then coalesce(monto_interes,0) when tipo='reversa' then -coalesce(monto_interes,0) else 0 end),0),
           coalesce(sum(case when tipo='pago' then monto_mora when tipo='reversa' then -monto_mora else 0 end),0)
      into v_principal_pagado, v_interes_pagado, v_mora_pagada from public.pos_fin_pagos where cuota_id=new.cuota_id and organizacion_id=v_org;

    -- La mora se fija (persiste) la primera vez que se paga estando vencida; luego no crece.
    if not v_exenta and v_mora_generada<=0 then
      v_mora_calc := public.pos_fin_mora_calculada(new.cuota_id, coalesce(new.fecha,current_date));
      if v_mora_calc>0 then
        v_mora_generada := v_mora_calc;
        perform set_config('nx.fin_recalc','1',true);
        update public.pos_fin_cuotas set mora_generada=v_mora_generada where id=new.cuota_id and organizacion_id=v_org;
      end if;
    end if;
    v_mora_total := case when v_exenta then greatest(v_mora_pagada,0) else greatest(v_mora_generada,0) end;
    v_cap_pend := greatest(v_capital - v_principal_pagado,0);
    v_int_pend := greatest(v_interes - v_interes_pagado,0);
    v_mora_pend := greatest(v_mora_total - v_mora_pagada,0);
    if new.monto > v_cap_pend+v_int_pend+v_mora_pend+0.01 then raise exception 'FIN_PAGO_EXCEDE_SALDO'; end if;

    if v_v2 then
      -- mora → interés → capital
      new.monto_mora := least(new.monto, v_mora_pend);
      v_resto := greatest(new.monto - new.monto_mora,0);
      new.monto_interes := least(v_resto, v_int_pend);
      v_resto := greatest(v_resto - new.monto_interes,0);
      new.monto_principal := least(v_resto, v_cap_pend);
    else
      -- legado: capital primero, mora solo al completar el capital
      new.monto_interes := 0;
      new.monto_principal := least(new.monto, v_cap_pend);
      v_resto := greatest(new.monto - new.monto_principal,0);
      if v_cap_pend - new.monto_principal <= 0.01 then new.monto_mora := least(v_resto, v_mora_pend); else new.monto_mora := 0; end if;
    end if;
    if abs((new.monto_principal+new.monto_interes+new.monto_mora)-new.monto)>0.01 then raise exception 'FIN_ASIGNACION_PAGO_INVALIDA'; end if;
  elsif new.tipo='reversa' then
    if v_rol not in ('admin','gerente') then raise exception 'FIN_REVERSA_SIN_PERMISO'; end if;
    if new.reversa_de_id is null then raise exception 'FIN_REVERSA_ORIGEN_REQUERIDO'; end if;
    select * into v_orig from public.pos_fin_pagos where id=new.reversa_de_id and organizacion_id=v_org and tipo='pago';
    if v_orig.id is null then raise exception 'FIN_PAGO_ORIGEN_INVALIDO'; end if;
    if v_orig.financiamiento_id<>new.financiamiento_id or v_orig.cuota_id<>new.cuota_id then raise exception 'FIN_REVERSA_NO_COINCIDE'; end if;
    if exists(select 1 from public.pos_fin_pagos where organizacion_id=v_org and tipo='reversa' and reversa_de_id=v_orig.id) then raise exception 'FIN_PAGO_YA_REVERSADO'; end if;
    new.monto:=v_orig.monto; new.monto_principal:=v_orig.monto_principal; new.monto_interes:=coalesce(v_orig.monto_interes,0); new.monto_mora:=v_orig.monto_mora;
  else raise exception 'FIN_TIPO_INVALIDO'; end if;
  return new;
end $function$;

-- 9) Caché de la cuota (monto_pagado = capital + interés pagados) y estado del financiamiento ---------
create or replace function public.pos_fin_recalcular_cuota(p_cuota_id uuid, p_metodo text default null, p_es_pago boolean default false)
 returns void language plpgsql set search_path to 'public' as $function$
declare v_org uuid:=mi_organizacion(); v_fin uuid; v_monto numeric; v_capital numeric; v_interes numeric;
        v_principal numeric:=0; v_int numeric:=0; v_mora numeric:=0; v_mora_total numeric:=0; v_completa boolean; v_pendientes int:=0;
begin
  perform set_config('nx.fin_recalc','1',true);
  select financiamiento_id, monto, coalesce(capital,monto), coalesce(interes,0) into v_fin, v_monto, v_capital, v_interes
  from public.pos_fin_cuotas where id=p_cuota_id and organizacion_id=v_org;
  if v_fin is null then return; end if;
  select coalesce(sum(case when tipo='pago' then monto_principal when tipo='reversa' then -monto_principal else 0 end),0),
         coalesce(sum(case when tipo='pago' then coalesce(monto_interes,0) when tipo='reversa' then -coalesce(monto_interes,0) else 0 end),0),
         coalesce(sum(case when tipo='pago' then monto_mora when tipo='reversa' then -monto_mora else 0 end),0)
    into v_principal, v_int, v_mora from public.pos_fin_pagos where cuota_id=p_cuota_id and organizacion_id=v_org;
  v_mora_total := public.pos_fin_mora_total(p_cuota_id, current_date);
  v_completa := (v_principal>=v_capital-0.01 and v_int>=v_interes-0.01 and v_mora>=v_mora_total-0.01);
  update public.pos_fin_cuotas set
    monto_pagado=greatest(least(v_principal+v_int, v_monto),0),
    mora_pagada=greatest(v_mora,0),
    pagado=v_completa,
    fecha_pago=case when v_completa then coalesce(fecha_pago,current_date) else null end,
    metodo=case when v_completa and p_es_pago then p_metodo when not v_completa then null else metodo end
  where id=p_cuota_id and organizacion_id=v_org;
  select count(*) into v_pendientes from public.pos_fin_cuotas where financiamiento_id=v_fin and organizacion_id=v_org and not coalesce(pagado,false);
  update public.pos_financiamientos set estado=case when v_pendientes=0 then 'saldado' when estado='saldado' then 'activo' else estado end
  where id=v_fin and organizacion_id=v_org and estado not in ('cancelado','castigado','refinanciado');
end $function$;

create or replace function public.pos_fin_recalcular_cache()
 returns trigger language plpgsql set search_path to 'public' as $function$
begin
  perform public.pos_fin_recalcular_cuota(new.cuota_id, new.metodo, new.tipo='pago');
  return new;
end $function$;

-- 10) Saldo de capital = capital de cada cuota − capital pagado ----------------------------------------
create or replace function public.pos_credito_saldo_principal(p_financiamiento_id uuid)
 returns numeric language sql stable set search_path to 'public' as $function$
  select coalesce(sum(greatest(coalesce(c.capital,c.monto) - coalesce((
    select sum(case when p.tipo='pago' then coalesce(p.monto_principal,0)
                    when p.tipo='reversa' then -coalesce(p.monto_principal,0) else 0 end)
    from public.pos_fin_pagos p
    where p.organizacion_id=c.organizacion_id and p.cuota_id=c.id
  ),0),0)),0)
  from public.pos_fin_cuotas c
  where c.organizacion_id=mi_organizacion() and c.financiamiento_id=p_financiamiento_id
$function$;

-- 11) Cobro y reversa con línea de interés (4102) ----------------------------------------------------
create or replace function public.pos_fin_registrar_pago_v2(p_financiamiento_id uuid, p_cuota_id uuid, p_monto numeric, p_metodo text default null, p_referencia text default null, p_operacion_id uuid default null, p_created_by_name text default null, p_cuenta_bancaria_id uuid default null)
 returns uuid language plpgsql set search_path to 'public' as $function$
declare
  v_org uuid:=mi_organizacion(); v_id uuid; v_exist uuid; v_met text; v_caja uuid; v_principal numeric; v_interes numeric; v_mora numeric; v_asiento uuid;
begin
  if p_operacion_id is not null then select id into v_exist from public.pos_fin_pagos where organizacion_id=v_org and operacion_id=p_operacion_id; if v_exist is not null then return v_exist; end if; end if;
  perform public.pos_asegurar_cuentas_operativas(v_org);
  v_met:=lower(trim(coalesce(p_metodo,'')));
  if v_met='efectivo' then
    v_caja := public.pos_fin_caja_abierta(true);
    if v_caja is null then raise exception 'FIN_CAJA_CERRADA'; end if;
  elsif p_cuenta_bancaria_id is not null and not exists(select 1 from public.pos_cuentas_bancarias where id=p_cuenta_bancaria_id and organizacion_id=v_org and activa) then
    raise exception 'FIN_CUENTA_BANCARIA_INVALIDA';
  end if;

  insert into public.pos_fin_pagos(organizacion_id,financiamiento_id,cuota_id,monto,metodo,referencia,created_by_name,tipo,operacion_id,caja_id,cuenta_bancaria_id)
  values(v_org,p_financiamiento_id,p_cuota_id,p_monto,nullif(trim(p_metodo),''),nullif(trim(p_referencia),''),nullif(trim(p_created_by_name),''),'pago',p_operacion_id,v_caja,p_cuenta_bancaria_id)
  returning id,monto_principal,coalesce(monto_interes,0),monto_mora into v_id,v_principal,v_interes,v_mora;

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
    select v_org,v_asiento,id,codigo,nombre,'Reducción cuenta por cobrar (capital)',0,v_principal from public.pos_cuentas where organizacion_id=v_org and codigo='1103'; end if;
  if v_interes>0 then insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
    select v_org,v_asiento,id,codigo,nombre,'Interés devengado de la cuota',0,v_interes from public.pos_cuentas where organizacion_id=v_org and codigo='4102'; end if;
  if v_mora>0 then insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
    select v_org,v_asiento,id,codigo,nombre,'Recargo por mora',0,v_mora from public.pos_cuentas where organizacion_id=v_org and codigo='4103'; end if;
  return v_id;
exception when unique_violation then
  if p_operacion_id is not null then select id into v_id from public.pos_fin_pagos where organizacion_id=v_org and operacion_id=p_operacion_id; if v_id is not null then return v_id; end if; end if;
  raise;
end $function$;

create or replace function public.pos_fin_reversar_pago(p_pago_id uuid, p_motivo text, p_operacion_id uuid default null)
 returns uuid language plpgsql set search_path to 'public' as $function$
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
    v_caja := public.pos_fin_caja_abierta(true);
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
  if coalesce(v_p.monto_interes,0)>0 then insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
    select v_org,v_asiento,id,codigo,nombre,'Revierte interés devengado',v_p.monto_interes,0 from public.pos_cuentas where organizacion_id=v_org and codigo='4102'; end if;
  if v_p.monto_mora>0 then insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
    select v_org,v_asiento,id,codigo,nombre,'Revierte ingreso por mora',v_p.monto_mora,0 from public.pos_cuentas where organizacion_id=v_org and codigo='4103'; end if;
  insert into public.pos_asiento_lineas(organizacion_id,asiento_id,cuenta_id,cuenta_codigo,cuenta_nombre,descripcion,debito,credito)
    select v_org,v_asiento,id,codigo,nombre,case when v_met='efectivo' then 'Salida de efectivo' else 'Reversa medio electrónico' end,0,v_p.monto from public.pos_cuentas where organizacion_id=v_org and codigo=case when v_met='efectivo' then '1101' else '1102' end;
  return v_id;
exception when unique_violation then
  select id into v_id from public.pos_fin_pagos where organizacion_id=v_org and (reversa_de_id=p_pago_id or (p_operacion_id is not null and operacion_id=p_operacion_id)) order by created_at desc limit 1;
  if v_id is not null then return v_id; end if;
  raise;
end $function$;

-- 12) Contrato: plantilla con placeholders {{clave}} -------------------------------------------------
create or replace function public.pos_fin_render_plantilla(p_plantilla text, p_vars jsonb)
 returns text language plpgsql immutable as $function$
declare v text:=coalesce(p_plantilla,''); r record;
begin
  for r in select key, value from jsonb_each_text(coalesce(p_vars,'{}'::jsonb)) loop
    v := replace(v, '{{'||r.key||'}}', coalesce(r.value,''));
  end loop;
  return v;
end $function$;

create or replace function public.pos_fin_fmt_monto(p numeric)
 returns text language sql immutable as $function$
  select 'RD$ ' || to_char(coalesce(p,0), 'FM999,999,999,990.00');
$function$;

-- 13) Crear financiamiento v2 a partir de una venta a crédito y un plan --------------------------------
create or replace function public.pos_fin_crear_financiamiento_v2(p_venta_id uuid, p_plan_id uuid, p_primera_fecha date, p_solicitud_id uuid default null, p_descripcion text default null)
 returns uuid language plpgsql set search_path to 'public' as $function$
declare
  v_org uuid:=mi_organizacion(); v public.pos_ventas%rowtype; pl public.pos_fin_planes%rowtype; cli public.pos_clientes%rowtype; cfg public.pos_config%rowtype;
  v_id uuid; v_codigo text; v_int_total numeric:=0; v_cuota1 numeric:=0; v_n int:=0; r record; v_vars jsonb; v_articulo text; v_empresa text; v_mora_txt text;
begin
  if mi_rol() not in ('admin','gerente','cajero') then raise exception 'FIN_SIN_PERMISO'; end if;
  if p_primera_fecha is null then raise exception 'FIN_PRIMER_VENCIMIENTO_REQUERIDO'; end if;
  select * into v from public.pos_ventas where id=p_venta_id and organizacion_id=v_org and estado='completada' for update;
  if v.id is null or coalesce(v.credito_monto,0)<=0 or v.cliente_id is null then raise exception 'FIN_VENTA_CREDITO_INVALIDA'; end if;
  if exists(select 1 from public.pos_financiamientos where organizacion_id=v_org and venta_id=v.id) then raise exception 'FIN_VENTA_YA_FINANCIADA'; end if;
  select * into pl from public.pos_fin_planes where id=p_plan_id and organizacion_id=v_org and activo;
  if pl.id is null then raise exception 'FIN_PLAN_INVALIDO'; end if;
  select * into cli from public.pos_clientes where id=v.cliente_id and organizacion_id=v_org;
  select * into cfg from public.pos_config where organizacion_id=v_org limit 1;
  select nombre into v_empresa from public.organizaciones where id=v_org;

  select sum(interes), count(*) into v_int_total, v_n from public.pos_fin_amortizacion(v.credito_monto, pl.metodo, pl.num_cuotas, pl.cuotas_fase1, pl.tasa1, pl.tasa2, pl.frecuencia, p_primera_fecha);
  select cuota into v_cuota1 from public.pos_fin_amortizacion(v.credito_monto, pl.metodo, pl.num_cuotas, pl.cuotas_fase1, pl.tasa1, pl.tasa2, pl.frecuencia, p_primera_fecha) where numero=1;
  v_codigo := public.pos_fin_siguiente_codigo('financiamiento');

  select string_agg(coalesce(i.nombre,'Artículo')||case when i.serial is not null and i.serial<>'' then ' (serial '||i.serial||')' else '' end||' × '||trim(to_char(i.cantidad,'FM999999990.##')), ', ' order by i.linea_orden nulls last, i.id)
    into v_articulo from public.pos_venta_items i where i.venta_id=v.id;
  v_mora_txt := case pl.mora_tipo when 'fija' then public.pos_fin_fmt_monto(pl.mora_valor)||' por cuota' when 'pct' then trim(to_char(pl.mora_valor,'FM990.##'))||' % de la cuota' else 'sin mora' end
                || case when pl.mora_tipo<>'ninguna' then ' tras '||pl.mora_dias_gracia||' día(s) de gracia' else '' end;

  insert into public.pos_financiamientos(organizacion_id,venta_id,cliente_id,cliente_nombre,descripcion,monto_total,inicial,monto_financiado,cuotas_total,cuota_monto,frecuencia,estado,
    codigo,plan_id,solicitud_id,interes_total,primera_fecha)
  values(v_org,v.id,v.cliente_id,coalesce(v.cliente_nombre,cli.nombre),coalesce(nullif(trim(p_descripcion),''),v_articulo,'Venta '||coalesce(v.numero_factura,v.numero::text)),
    v.total,v.total-v.credito_monto,v.credito_monto,pl.num_cuotas,v_cuota1,pl.frecuencia,'activo',
    v_codigo,pl.id,p_solicitud_id,coalesce(v_int_total,0),p_primera_fecha)
  returning id into v_id;

  for r in select * from public.pos_fin_amortizacion(v.credito_monto, pl.metodo, pl.num_cuotas, pl.cuotas_fase1, pl.tasa1, pl.tasa2, pl.frecuencia, p_primera_fecha) loop
    insert into public.pos_fin_cuotas(organizacion_id,financiamiento_id,numero,fecha_venc,monto,capital,interes,pagado,monto_pagado)
    values(v_org,v_id,r.numero,r.fecha_venc,r.cuota,r.capital,r.interes,false,0);
  end loop;

  -- Contrato congelado (si hay plantilla) + token de firma
  v_vars := jsonb_build_object(
    'empresa', coalesce(v_empresa,'STUDIO'), 'codigo', coalesce(v_codigo,''), 'factura', coalesce(v.numero_factura, v.numero::text),
    'fecha', to_char(current_date,'DD/MM/YYYY'), 'cliente', coalesce(v.cliente_nombre,cli.nombre,''), 'cedula', coalesce(cli.cedula,''),
    'telefono', coalesce(cli.telefono,''), 'direccion', coalesce(cli.direccion,''), 'articulo', coalesce(v_articulo,''),
    'precio', public.pos_fin_fmt_monto(v.total), 'inicial', public.pos_fin_fmt_monto(v.total-v.credito_monto), 'capital', public.pos_fin_fmt_monto(v.credito_monto),
    'interes_total', public.pos_fin_fmt_monto(v_int_total), 'total', public.pos_fin_fmt_monto(v.credito_monto+coalesce(v_int_total,0)),
    'plan', pl.nombre, 'cuotas', pl.num_cuotas::text, 'frecuencia', pl.frecuencia, 'cuota_1', public.pos_fin_fmt_monto(v_cuota1),
    'primera_fecha', to_char(p_primera_fecha,'DD/MM/YYYY'), 'tasa1', trim(to_char(pl.tasa1,'FM990.##'))||' %', 'tasa2', trim(to_char(pl.tasa2,'FM990.##'))||' %',
    'cuotas_fase1', pl.cuotas_fase1::text, 'metodo_interes', case pl.metodo when 'saldo' then 'sobre saldo' else 'plano' end, 'mora', v_mora_txt);
  if nullif(trim(coalesce(cfg.fin_contrato_plantilla,'')),'') is not null then
    update public.pos_financiamientos set
      contrato_titulo = coalesce(nullif(trim(cfg.fin_contrato_titulo),''),'Contrato de venta a crédito'),
      contrato_texto = public.pos_fin_render_plantilla(cfg.fin_contrato_plantilla, v_vars),
      contrato_version = 1, contrato_en = now(),
      firma_token = gen_random_uuid(), firma_token_vence = now() + make_interval(hours => greatest(coalesce(cfg.fin_firma_vigencia_horas,72),1))
    where id=v_id;
  end if;
  return v_id;
end $function$;

-- 14) Solicitud → aprobación (crea venta a crédito por la RPC atómica del POS + financiamiento) --------
create or replace function public.pos_fin_aprobar_solicitud(p_solicitud_id uuid, p_nota text default null, p_operacion_id uuid default null, p_caja_id uuid default null, p_almacen_id uuid default null)
 returns jsonb language plpgsql set search_path to 'public' as $function$
declare
  v_org uuid:=mi_organizacion(); s public.pos_fin_solicitudes%rowtype; pl public.pos_fin_planes%rowtype; cli public.pos_clientes%rowtype;
  v_capital numeric; v_suma numeric; v_items jsonb; v_venta jsonb; v_res jsonb; v_venta_id uuid; v_fin uuid; v_caja uuid; v_alm uuid; v_num text; v_usuario text;
  v_pagos jsonb:='[]'::jsonb; v_met text;
begin
  if mi_rol() not in ('admin','gerente') then raise exception 'FIN_APROBAR_SIN_PERMISO'; end if;
  select * into s from public.pos_fin_solicitudes where id=p_solicitud_id and organizacion_id=v_org for update;
  if s.id is null then raise exception 'FIN_SOLICITUD_NO_ENCONTRADA'; end if;
  if s.estado='aprobada' and s.financiamiento_id is not null then
    return jsonb_build_object('ok',true,'reutilizada',true,'venta_id',s.venta_id,'financiamiento_id',s.financiamiento_id);
  end if;
  if s.estado<>'pendiente' then raise exception 'FIN_SOLICITUD_NO_PENDIENTE'; end if;
  select * into pl from public.pos_fin_planes where id=s.plan_id and organizacion_id=v_org and activo;
  if pl.id is null then raise exception 'FIN_PLAN_INVALIDO'; end if;
  select * into cli from public.pos_clientes where id=s.cliente_id and organizacion_id=v_org and activo;
  if cli.id is null then raise exception 'FIN_CLIENTE_INVALIDO'; end if;
  if s.inicial < round(s.precio_total*pl.inicial_min_pct/100,2)-0.01 then raise exception 'FIN_INICIAL_MENOR_AL_MINIMO'; end if;
  v_capital := s.precio_total - s.inicial;
  if v_capital<=0 then raise exception 'FIN_CAPITAL_INVALIDO'; end if;
  if jsonb_typeof(s.items)<>'array' or jsonb_array_length(s.items)<1 then raise exception 'FIN_SOLICITUD_SIN_ARTICULOS'; end if;
  if s.primera_fecha < current_date then raise exception 'FIN_PRIMER_VENCIMIENTO_INVALIDO'; end if;

  -- Ítems: importe = precio × cantidad y suma = precio_total
  select jsonb_agg(jsonb_build_object('producto_id',x.producto_id,'nombre',x.nombre,'precio',x.precio,'cantidad',x.cantidad,'importe',round(x.precio*x.cantidad,2),'serial',x.serial,'itbis',false,'descuento',0)),
         coalesce(sum(round(x.precio*x.cantidad,2)),0)
    into v_items, v_suma
  from jsonb_to_recordset(s.items) as x(producto_id uuid, nombre text, precio numeric, cantidad numeric, serial text);
  if abs(v_suma - s.precio_total)>0.01 then raise exception 'FIN_SOLICITUD_TOTAL_NO_CUADRA'; end if;

  v_met := s.inicial_metodo;
  if s.inicial>0 and v_met='efectivo' then
    v_caja := coalesce(p_caja_id, public.pos_fin_caja_abierta(false));
    if v_caja is null then raise exception 'FIN_CAJA_CERRADA'; end if;
  end if;
  v_alm := p_almacen_id;
  if v_alm is null then select id into v_alm from public.pos_almacenes where organizacion_id=v_org and activo order by es_principal desc, nombre limit 1; end if;
  v_num := public.pos_fin_siguiente_codigo('factura_credito');
  select us.nom into v_usuario from public.profiles pr join public.usuarios_sistema us on us.id=pr.usuario_sistema_id where pr.id=auth.uid() limit 1;

  if s.inicial>0 then v_pagos := v_pagos || jsonb_build_array(jsonb_build_object('metodo', initcap(v_met), 'monto', s.inicial)); end if;
  v_pagos := v_pagos || jsonb_build_array(jsonb_build_object('metodo','Crédito','monto',v_capital));

  v_venta := jsonb_build_object(
    'cliente_id', s.cliente_id, 'cliente_nombre', coalesce(s.cliente_nombre,cli.nombre), 'a_credito', true,
    'subtotal', s.precio_total, 'itbis', 0, 'total', s.precio_total, 'descuento', 0,
    'metodo_pago', 'Crédito', 'pagos', v_pagos,
    'pagado_efectivo', case when v_met='efectivo' then s.inicial else 0 end,
    'pagado_tarjeta', case when v_met='tarjeta' then s.inicial else 0 end,
    'pagado_transferencia', case when v_met='transferencia' then s.inicial else 0 end,
    'pagado_otro', 0, 'credito_monto', v_capital, 'recibido', case when v_met='efectivo' then s.inicial else 0 end, 'devuelta', 0,
    'tipo_comprobante', 'sin', 'numero_factura', v_num, 'almacen_id', v_alm, 'caja_id', v_caja,
    'created_by_name', coalesce(v_usuario,'Sistema'));

  v_res := public.pos_registrar_venta_atomica(coalesce(p_operacion_id, gen_random_uuid()), v_venta, v_items, null, 0);
  v_venta_id := (v_res->'venta'->>'id')::uuid;
  if v_venta_id is null then raise exception 'FIN_VENTA_NO_CREADA'; end if;

  v_fin := public.pos_fin_crear_financiamiento_v2(v_venta_id, pl.id, s.primera_fecha, s.id, null);

  -- Asiento de la venta a crédito en el servidor (el navegador no participa en este flujo; ver 18c).
  perform public.pos_reconstruir_asiento_venta(v_venta_id);

  perform set_config('nx.fin_aprobando','1',true);
  update public.pos_fin_solicitudes set estado='aprobada', nota_aprobador=nullif(trim(p_nota),''), decidido_por=auth.uid(), decidido_en=now(), venta_id=v_venta_id, financiamiento_id=v_fin
  where id=s.id;
  perform set_config('nx.fin_aprobando','0',true);

  insert into public.pos_credito_eventos(organizacion_id,cliente_id,venta_id,financiamiento_id,tipo,monto,nota,creado_por)
  values(v_org,s.cliente_id,v_venta_id,v_fin,'aprobacion',v_capital,'Solicitud '||coalesce(s.codigo,'')||' aprobada · plan '||pl.nombre,auth.uid());

  return jsonb_build_object('ok',true,'reutilizada',false,'venta_id',v_venta_id,'financiamiento_id',v_fin,'numero_factura',v_num,
    'codigo',(select codigo from public.pos_financiamientos where id=v_fin));
end $function$;

create or replace function public.pos_fin_rechazar_solicitud(p_solicitud_id uuid, p_motivo text)
 returns void language plpgsql set search_path to 'public' as $function$
declare v_org uuid:=mi_organizacion();
begin
  if mi_rol() not in ('admin','gerente') then raise exception 'FIN_APROBAR_SIN_PERMISO'; end if;
  if length(trim(coalesce(p_motivo,'')))<3 then raise exception 'FIN_RECHAZO_MOTIVO_REQUERIDO'; end if;
  update public.pos_fin_solicitudes set estado='rechazada', motivo_rechazo=trim(p_motivo), decidido_por=auth.uid(), decidido_en=now()
  where id=p_solicitud_id and organizacion_id=v_org and estado='pendiente';
  if not found then raise exception 'FIN_SOLICITUD_NO_PENDIENTE'; end if;
end $function$;

-- 15) Condonar mora de una cuota (deja rastro en pos_credito_eventos) ---------------------------------
create or replace function public.pos_fin_condonar_mora(p_cuota_id uuid, p_motivo text)
 returns numeric language plpgsql set search_path to 'public' as $function$
declare v_org uuid:=mi_organizacion(); v_fin uuid; v_cli uuid; v_pend numeric:=0; v_total numeric:=0; v_pagada numeric:=0;
begin
  if mi_rol() not in ('admin','gerente') then raise exception 'FIN_CONDONAR_SIN_PERMISO'; end if;
  if length(trim(coalesce(p_motivo,'')))<3 then raise exception 'FIN_CONDONAR_MOTIVO_REQUERIDO'; end if;
  select c.financiamiento_id, f.cliente_id, coalesce(c.mora_pagada,0) into v_fin, v_cli, v_pagada
  from public.pos_fin_cuotas c join public.pos_financiamientos f on f.id=c.financiamiento_id
  where c.id=p_cuota_id and c.organizacion_id=v_org for update of c;
  if v_fin is null then raise exception 'FIN_CUOTA_INVALIDA'; end if;
  v_total := public.pos_fin_mora_total(p_cuota_id, current_date);
  v_pend := greatest(v_total - v_pagada, 0);
  perform set_config('nx.fin_recalc','1',true);
  update public.pos_fin_cuotas set mora_exenta=true, mora_exenta_motivo=trim(p_motivo) where id=p_cuota_id and organizacion_id=v_org;
  insert into public.pos_credito_eventos(organizacion_id,cliente_id,financiamiento_id,tipo,monto,nota,creado_por)
  values(v_org,v_cli,v_fin,'condonacion_mora',v_pend,trim(p_motivo),auth.uid());
  perform public.pos_fin_recalcular_cuota(p_cuota_id, null, false);
  return v_pend;
end $function$;

-- 16) Permisos de ejecución --------------------------------------------------------------------------
grant execute on function public.pos_fin_amortizacion(numeric,text,integer,integer,numeric,numeric,text,date) to authenticated;
grant execute on function public.pos_fin_amortizacion_plan(numeric,uuid,date) to authenticated;
grant execute on function public.pos_fin_crear_financiamiento_v2(uuid,uuid,date,uuid,text) to authenticated;
grant execute on function public.pos_fin_aprobar_solicitud(uuid,text,uuid,uuid,uuid) to authenticated;
grant execute on function public.pos_fin_rechazar_solicitud(uuid,text) to authenticated;
grant execute on function public.pos_fin_condonar_mora(uuid,text) to authenticated;
grant execute on function public.pos_fin_siguiente_codigo(text) to authenticated;
grant execute on function public.pos_fin_render_plantilla(text,jsonb) to authenticated;
grant execute on function public.pos_fin_fmt_monto(numeric) to authenticated;
revoke execute on function public.pos_fin_amortizacion(numeric,text,integer,integer,numeric,numeric,text,date) from anon;
revoke execute on function public.pos_fin_aprobar_solicitud(uuid,text,uuid,uuid,uuid) from anon;
revoke execute on function public.pos_fin_crear_financiamiento_v2(uuid,uuid,date,uuid,text) from anon;

-- 17) Activación en STUDIO: bandera + plantilla de contrato por defecto ------------------------------
update public.pos_config set
  financiamiento_v2 = true,
  fin_contrato_titulo = coalesce(fin_contrato_titulo, 'Contrato de venta a crédito'),
  fin_contrato_plantilla = coalesce(fin_contrato_plantilla,
'CONTRATO DE VENTA A CRÉDITO No. {{codigo}}

Entre {{empresa}} (en lo adelante "LA TIENDA") y {{cliente}}, cédula {{cedula}}, teléfono {{telefono}}, domiciliado en {{direccion}} (en lo adelante "EL COMPRADOR"), se conviene lo siguiente:

PRIMERO: LA TIENDA vende a EL COMPRADOR: {{articulo}}, según factura {{factura}}, por un precio de {{precio}}.

SEGUNDO: EL COMPRADOR paga una inicial de {{inicial}} y financia {{capital}} bajo el plan "{{plan}}" ({{cuotas}} cuotas {{frecuencia}}es, interés {{metodo_interes}}: {{cuotas_fase1}} cuota(s) al {{tasa1}} y el resto al {{tasa2}}), para un interés total de {{interes_total}} y un total a pagar de {{total}}. La primera cuota, de {{cuota_1}}, vence el {{primera_fecha}}.

TERCERO: El atraso en el pago genera una mora de {{mora}}. El bien vendido queda en garantía del crédito hasta el pago total, y EL COMPRADOR se obliga a conservarlo en buen estado y a no venderlo ni cederlo mientras exista saldo.

CUARTO: EL COMPRADOR podrá saldar anticipadamente; en ese caso solo pagará el capital pendiente y los intereses de las cuotas vencidas.

Firmado en Santo Domingo, República Dominicana, el {{fecha}}.')
where organizacion_id = 'e404d1c4-24c5-4e17-88f6-84bef09d6d19';

-- 18) Ajustes tras el QA (aplicados como studio_14b_financiamiento_v2_ajustes) ------------------------
-- a) pos_credito_eventos.tipo: nuevos eventos 'aprobacion' y 'condonacion_mora'.
alter table public.pos_credito_eventos drop constraint if exists pos_credito_eventos_tipo_check;
alter table public.pos_credito_eventos add constraint pos_credito_eventos_tipo_check
  check (tipo = any (array['promesa','refinanciacion','castigo','vencimiento','aprobacion','condonacion_mora']));

-- b) Caja abierta del usuario: el POS guarda en pos_cajas.usuario_id el auth.uid() (authUidPOS), pero las
--    RPC de cuotas buscaban mi_usuario_id() (usuarios_sistema.id) → en STUDIO nunca encontraban la caja.
--    Helper único que acepta ambos.
create or replace function public.pos_fin_caja_abierta(p_lock boolean default false)
 returns uuid language plpgsql set search_path to 'public' as $function$
declare v_org uuid:=mi_organizacion(); v_id uuid;
begin
  if p_lock then
    select id into v_id from public.pos_cajas where organizacion_id=v_org and estado='abierta' and usuario_id in (auth.uid(), public.mi_usuario_id()) order by apertura desc limit 1 for update;
  else
    select id into v_id from public.pos_cajas where organizacion_id=v_org and estado='abierta' and usuario_id in (auth.uid(), public.mi_usuario_id()) order by apertura desc limit 1;
  end if;
  return v_id;
end $function$;
grant execute on function public.pos_fin_caja_abierta(boolean) to authenticated;
-- Las tres RPC (pos_fin_registrar_pago_v2, pos_fin_reversar_pago, pos_fin_aprobar_solicitud) sustituyen su
-- consulta de caja por public.pos_fin_caja_abierta(true|false). Cuerpos: ver secciones 11 y 14 (idénticos
-- salvo esa línea); la versión vigente en la base es la de studio_14b.

-- c) (studio_14c) La venta creada por pos_fin_aprobar_solicitud no tenía asiento: el trigger de
--    recontabilización de pos_ventas solo corre en UPDATE de cabecera y el navegador (que en el flujo
--    normal asienta la venta) no participa. La RPC llama a pos_reconstruir_asiento_venta(venta) tras crear
--    el financiamiento: D 1101/1102 inicial + D 1103 capital / H 4101 total (+ costo de ventas).
