-- NEXUS PRO Seguros · Fase C
-- Cierre contable por ciclo 20 -> 20, hora America/Santo_Domingo.
-- Regla confirmada por el dueño:
--   * un ciclo abre el día 20 a las 00:00 y cierra el día 20 del mes siguiente a las 00:00;
--   * el periodo se identifica por el mes en que ABRE (2026-08 = 20-ago -> 20-sep);
--   * pagos bancarios pertenecen al ciclo por fecha de VALIDACION (validado_at), no por fecha de captura;
--   * transferencias internas solo mueven custodia y NUNCA inflan el total cobrado del negocio.
--
-- Esta migración agrega snapshots inmutables de cierre y corrige el riesgo de ocultar agentes
-- desactivados que hayan tenido movimientos o custodia en el ciclo.

-- -----------------------------------------------------------------------------
-- 1) Core de cálculo sin autorización de UI, reutilizable por el cron de cierre.
--    Se mantiene privado: solo funciones SECURITY DEFINER internas lo invocan.
-- -----------------------------------------------------------------------------
create or replace function public.seguros_resumen_ciclo_agente_core(
  p_agente_id uuid,
  p_periodo text
)
returns table(
  agente_id uuid,
  periodo text,
  ciclo_inicio timestamptz,
  ciclo_fin timestamptz,
  corte timestamptz,
  cerrado boolean,
  saldo_inicial numeric,
  cobrado_validado numeric,
  transferido_confirmado numeric,
  recibido_confirmado numeric,
  entregado_admin_directo numeric,
  directo_recibido numeric,
  reversas_cobros_previos numeric,
  reintegros_entregas_previas numeric,
  directos_previos_anulados numeric,
  saldo_final numeric,
  saldo_reconciliado numeric,
  diferencia_reconciliacion numeric,
  historico_aproximado boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_inicio timestamptz;
  v_fin timestamptz;
  v_corte timestamptz;
  v_saldo_inicial numeric;
  v_cobrado numeric;
  v_transferido numeric;
  v_recibido numeric;
  v_entregado numeric;
  v_directo_recibido numeric;
  v_reversas_previas numeric;
  v_reintegros_entregas_previas numeric;
  v_directos_previos_anulados numeric;
  v_saldo_final numeric;
  v_reconciliado numeric;
  v_aprox boolean;
begin
  if p_agente_id is null
     or not exists(select 1 from public.agentes a where a.id=p_agente_id) then
    raise exception 'Agente invalido';
  end if;

  select l.inicio,l.fin,l.corte
    into v_inicio,v_fin,v_corte
  from public.seguros_ciclo_limites(p_periodo) l;

  v_saldo_inicial := public.seguros_saldo_validado_agente_asof(p_agente_id,v_inicio);
  v_saldo_final := public.seguros_saldo_validado_agente_asof(p_agente_id,v_corte);

  -- Transferencia/Deposito entra al ciclo cuando queda VALIDADO.
  select coalesce(sum(a.monto),0)
    into v_cobrado
  from public.abonos a
  where a.agente_cobro=p_agente_id::text
    and (
      case
        when a.metodo in ('Transferencia','Depósito')
          then case when a.validacion_estado='validado'
                    then coalesce(a.validado_at,a.fecha,a.created_at)
                    else null end
        else coalesce(a.fecha,a.created_at)
      end
    ) >= v_inicio
    and (
      case
        when a.metodo in ('Transferencia','Depósito')
          then case when a.validacion_estado='validado'
                    then coalesce(a.validado_at,a.fecha,a.created_at)
                    else null end
        else coalesce(a.fecha,a.created_at)
      end
    ) < v_corte
    and (coalesce(a.estado,'') <> 'Reversado' or a.reversado_at is not null)
    and (a.reversado_at is null or a.reversado_at >= v_corte);

  select coalesce(sum(t.monto),0)
    into v_transferido
  from public.transferencias_agentes t
  where t.desde_agente=p_agente_id::text
    and t.estado='aceptada'
    and coalesce(t.aceptado_en,t.fecha,t.created_at) >= v_inicio
    and coalesce(t.aceptado_en,t.fecha,t.created_at) < v_corte;

  select coalesce(sum(t.monto),0)
    into v_recibido
  from public.transferencias_agentes t
  where t.hacia_agente=p_agente_id::text
    and t.estado='aceptada'
    and coalesce(t.aceptado_en,t.fecha,t.created_at) >= v_inicio
    and coalesce(t.aceptado_en,t.fecha,t.created_at) < v_corte;

  select
      coalesce(sum(e.monto) filter (
        where e.agente_id=p_agente_id and e.es_directo=false
      ),0)
    + coalesce(sum(e.monto) filter (
        where e.es_directo=true
          and e.agente_id<>p_agente_id
          and coalesce(e.cobrado_por,e.agente_id)=p_agente_id
      ),0),
      coalesce(sum(e.monto) filter (
        where e.es_directo=true
          and e.agente_id=p_agente_id
          and coalesce(e.cobrado_por,e.agente_id)<>p_agente_id
      ),0)
    into v_entregado,v_directo_recibido
  from public.entregas_admin e
  where coalesce(e.created_at,e.fecha) >= v_inicio
    and coalesce(e.created_at,e.fecha) < v_corte
    and (not coalesce(e.anulado,false) or e.anulado_at is not null)
    and (e.anulado_at is null or e.anulado_at >= v_corte);

  -- Hechos nacidos antes del ciclo pero revertidos/anulados dentro del ciclo.
  select coalesce(sum(a.monto),0)
    into v_reversas_previas
  from public.abonos a
  where a.agente_cobro=p_agente_id::text
    and (
      case
        when a.metodo in ('Transferencia','Depósito')
          then case when a.validacion_estado='validado'
                    then coalesce(a.validado_at,a.fecha,a.created_at)
                    else null end
        else coalesce(a.fecha,a.created_at)
      end
    ) < v_inicio
    and a.reversado_at >= v_inicio
    and a.reversado_at < v_corte;

  select coalesce(sum(e.monto),0)
    into v_reintegros_entregas_previas
  from public.entregas_admin e
  where coalesce(e.created_at,e.fecha) < v_inicio
    and e.anulado_at >= v_inicio
    and e.anulado_at < v_corte
    and (
      (e.agente_id=p_agente_id and e.es_directo=false)
      or (
        e.es_directo=true
        and e.agente_id<>p_agente_id
        and coalesce(e.cobrado_por,e.agente_id)=p_agente_id
      )
    );

  select coalesce(sum(e.monto),0)
    into v_directos_previos_anulados
  from public.entregas_admin e
  where coalesce(e.created_at,e.fecha) < v_inicio
    and e.anulado_at >= v_inicio
    and e.anulado_at < v_corte
    and e.es_directo=true
    and e.agente_id=p_agente_id
    and coalesce(e.cobrado_por,e.agente_id)<>p_agente_id;

  v_reconciliado := v_saldo_inicial
                  + v_cobrado
                  + v_recibido
                  + v_directo_recibido
                  - v_transferido
                  - v_entregado
                  - v_reversas_previas
                  + v_reintegros_entregas_previas
                  - v_directos_previos_anulados;

  select exists(
    select 1
    from public.transferencias_agentes t
    where t.estado='aceptada'
      and t.aceptado_en is null
      and (t.desde_agente=p_agente_id::text or t.hacia_agente=p_agente_id::text)
      and coalesce(t.fecha,t.created_at) < v_corte
  ) or exists(
    select 1
    from public.abonos a
    where a.agente_cobro=p_agente_id::text
      and a.metodo in ('Transferencia','Depósito')
      and a.validacion_estado='validado'
      and a.validado_at is null
      and coalesce(a.fecha,a.created_at) < v_corte
  ) into v_aprox;

  return query select
    p_agente_id,
    p_periodo,
    v_inicio,
    v_fin,
    v_corte,
    (v_corte >= v_fin),
    v_saldo_inicial,
    v_cobrado,
    v_transferido,
    v_recibido,
    v_entregado,
    v_directo_recibido,
    v_reversas_previas,
    v_reintegros_entregas_previas,
    v_directos_previos_anulados,
    v_saldo_final,
    v_reconciliado,
    v_saldo_final-v_reconciliado,
    coalesce(v_aprox,false);
end;
$$;

revoke all on function public.seguros_resumen_ciclo_agente_core(uuid,text) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2) Wrappers autorizados. El admin incluye agentes inactivos con actividad/custodia.
-- -----------------------------------------------------------------------------
drop function if exists public.seguros_resumen_ciclo_admin(text);
drop function if exists public.seguros_resumen_ciclo_agente(uuid,text);

create function public.seguros_resumen_ciclo_agente(
  p_agente_id uuid,
  p_periodo text
)
returns table(
  agente_id uuid,
  periodo text,
  ciclo_inicio timestamptz,
  ciclo_fin timestamptz,
  corte timestamptz,
  cerrado boolean,
  saldo_inicial numeric,
  cobrado_validado numeric,
  transferido_confirmado numeric,
  recibido_confirmado numeric,
  entregado_admin_directo numeric,
  directo_recibido numeric,
  reversas_cobros_previos numeric,
  reintegros_entregas_previas numeric,
  directos_previos_anulados numeric,
  saldo_final numeric,
  saldo_reconciliado numeric,
  diferencia_reconciliacion numeric,
  historico_aproximado boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_mi_agente uuid;
  v_rol text;
begin
  v_rol := public.mi_rol();
  if v_rol is null
     or public.mi_organizacion() is distinct from
        (select id from public.organizaciones where slug='nexus-pro') then
    raise exception 'No autorizado';
  end if;

  v_mi_agente := public.mi_agente_efectivo();
  if v_rol <> 'admin' and v_mi_agente is distinct from p_agente_id then
    raise exception 'No autorizado para consultar otro agente';
  end if;

  return query select *
  from public.seguros_resumen_ciclo_agente_core(p_agente_id,p_periodo);
end;
$$;
revoke all on function public.seguros_resumen_ciclo_agente(uuid,text) from public, anon;
grant execute on function public.seguros_resumen_ciclo_agente(uuid,text) to authenticated;

create function public.seguros_resumen_ciclo_admin(p_periodo text)
returns table(
  agente_id uuid,
  agente text,
  cargo text,
  periodo text,
  ciclo_inicio timestamptz,
  ciclo_fin timestamptz,
  corte timestamptz,
  cerrado boolean,
  saldo_inicial numeric,
  cobrado_validado numeric,
  transferido_confirmado numeric,
  recibido_confirmado numeric,
  entregado_admin_directo numeric,
  directo_recibido numeric,
  reversas_cobros_previos numeric,
  reintegros_entregas_previas numeric,
  directos_previos_anulados numeric,
  saldo_final numeric,
  diferencia_reconciliacion numeric,
  historico_aproximado boolean,
  total_negocio_cobrado_ciclo numeric
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if public.mi_rol() <> 'admin'
     or public.mi_organizacion() is distinct from
        (select id from public.organizaciones where slug='nexus-pro') then
    raise exception 'Solo administrador';
  end if;

  return query
  with r as (
    select a.id as aid,a.nom,a.cargo,a.activo,x.*
    from public.agentes a
    cross join lateral public.seguros_resumen_ciclo_agente_core(a.id,p_periodo) x
  ), elegibles as (
    select * from r
    where coalesce(activo,true)
       or abs(coalesce(saldo_inicial,0)) > 0.005
       or abs(coalesce(cobrado_validado,0)) > 0.005
       or abs(coalesce(transferido_confirmado,0)) > 0.005
       or abs(coalesce(recibido_confirmado,0)) > 0.005
       or abs(coalesce(entregado_admin_directo,0)) > 0.005
       or abs(coalesce(directo_recibido,0)) > 0.005
       or abs(coalesce(reversas_cobros_previos,0)) > 0.005
       or abs(coalesce(reintegros_entregas_previas,0)) > 0.005
       or abs(coalesce(directos_previos_anulados,0)) > 0.005
       or abs(coalesce(saldo_final,0)) > 0.005
  )
  select
    e.aid,e.nom,e.cargo,e.periodo,e.ciclo_inicio,e.ciclo_fin,e.corte,e.cerrado,
    e.saldo_inicial,e.cobrado_validado,e.transferido_confirmado,e.recibido_confirmado,
    e.entregado_admin_directo,e.directo_recibido,e.reversas_cobros_previos,
    e.reintegros_entregas_previas,e.directos_previos_anulados,e.saldo_final,
    e.diferencia_reconciliacion,e.historico_aproximado,
    sum(e.cobrado_validado) over () as total_negocio_cobrado_ciclo
  from elegibles e
  order by e.nom;
end;
$$;
revoke all on function public.seguros_resumen_ciclo_admin(text) from public, anon;
grant execute on function public.seguros_resumen_ciclo_admin(text) to authenticated;

-- -----------------------------------------------------------------------------
-- 3) Snapshots inmutables de cierre.
-- -----------------------------------------------------------------------------
create table if not exists public.seguros_cierres_ciclo (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id),
  periodo text not null check (periodo ~ '^\d{4}-\d{2}$'),
  ciclo_inicio timestamptz not null,
  ciclo_fin timestamptz not null,
  cerrado_at timestamptz not null default now(),
  cerrado_por_user_id uuid,
  origen text not null default 'automatico' check (origen in ('automatico','manual')),
  total_negocio_cobrado numeric not null default 0,
  total_saldo_final numeric not null default 0,
  agentes_incluidos integer not null default 0,
  created_at timestamptz not null default now(),
  unique (organizacion_id,periodo)
);

create table if not exists public.seguros_cierres_ciclo_agentes (
  cierre_id uuid not null references public.seguros_cierres_ciclo(id) on delete cascade,
  agente_id uuid not null,
  agente text not null,
  cargo text,
  activo_al_cierre boolean,
  saldo_inicial numeric not null default 0,
  cobrado_validado numeric not null default 0,
  transferido_confirmado numeric not null default 0,
  recibido_confirmado numeric not null default 0,
  entregado_admin_directo numeric not null default 0,
  directo_recibido numeric not null default 0,
  reversas_cobros_previos numeric not null default 0,
  reintegros_entregas_previas numeric not null default 0,
  directos_previos_anulados numeric not null default 0,
  saldo_final numeric not null default 0,
  saldo_reconciliado numeric not null default 0,
  diferencia_reconciliacion numeric not null default 0,
  historico_aproximado boolean not null default false,
  primary key (cierre_id,agente_id)
);

create index if not exists seguros_cierres_ciclo_fin_idx
  on public.seguros_cierres_ciclo (ciclo_fin desc);
create index if not exists seguros_cierres_ciclo_agente_idx
  on public.seguros_cierres_ciclo_agentes (agente_id,cierre_id);

alter table public.seguros_cierres_ciclo enable row level security;
alter table public.seguros_cierres_ciclo_agentes enable row level security;
revoke all on public.seguros_cierres_ciclo from anon, authenticated;
revoke all on public.seguros_cierres_ciclo_agentes from anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4) Cierre interno idempotente. Una vez creado, nunca recalcula el snapshot.
-- -----------------------------------------------------------------------------
create or replace function public.seguros_cerrar_ciclo_core(
  p_periodo text,
  p_origen text default 'automatico',
  p_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
  v_inicio timestamptz;
  v_fin timestamptz;
  v_corte timestamptz;
  v_cierre uuid;
  v_total numeric;
  v_saldo numeric;
  v_count integer;
begin
  if p_origen not in ('automatico','manual') then
    raise exception 'Origen de cierre invalido';
  end if;

  perform pg_advisory_xact_lock(hashtext('seguros_cierre_ciclo:'||coalesce(p_periodo,'')));

  select id into v_org from public.organizaciones where slug='nexus-pro';
  if v_org is null then raise exception 'Organizacion nexus-pro no encontrada'; end if;

  select l.inicio,l.fin,l.corte into v_inicio,v_fin,v_corte
  from public.seguros_ciclo_limites(p_periodo) l;

  -- El ciclo SOLO puede cerrarse al llegar exactamente a su frontera final 20->20.
  if now() < v_fin then
    raise exception 'El ciclo % cierra el %',p_periodo,v_fin;
  end if;

  select id into v_cierre
  from public.seguros_cierres_ciclo
  where organizacion_id=v_org and periodo=p_periodo;
  if v_cierre is not null then return v_cierre; end if;

  insert into public.seguros_cierres_ciclo(
    organizacion_id,periodo,ciclo_inicio,ciclo_fin,cerrado_at,cerrado_por_user_id,origen
  ) values (
    v_org,p_periodo,v_inicio,v_fin,now(),p_user_id,p_origen
  ) returning id into v_cierre;

  insert into public.seguros_cierres_ciclo_agentes(
    cierre_id,agente_id,agente,cargo,activo_al_cierre,
    saldo_inicial,cobrado_validado,transferido_confirmado,recibido_confirmado,
    entregado_admin_directo,directo_recibido,reversas_cobros_previos,
    reintegros_entregas_previas,directos_previos_anulados,saldo_final,
    saldo_reconciliado,diferencia_reconciliacion,historico_aproximado
  )
  select
    v_cierre,a.id,coalesce(a.nom,'Agente'),a.cargo,a.activo,
    x.saldo_inicial,x.cobrado_validado,x.transferido_confirmado,x.recibido_confirmado,
    x.entregado_admin_directo,x.directo_recibido,x.reversas_cobros_previos,
    x.reintegros_entregas_previas,x.directos_previos_anulados,x.saldo_final,
    x.saldo_reconciliado,x.diferencia_reconciliacion,x.historico_aproximado
  from public.agentes a
  cross join lateral public.seguros_resumen_ciclo_agente_core(a.id,p_periodo) x
  where coalesce(a.activo,true)
     or abs(coalesce(x.saldo_inicial,0)) > 0.005
     or abs(coalesce(x.cobrado_validado,0)) > 0.005
     or abs(coalesce(x.transferido_confirmado,0)) > 0.005
     or abs(coalesce(x.recibido_confirmado,0)) > 0.005
     or abs(coalesce(x.entregado_admin_directo,0)) > 0.005
     or abs(coalesce(x.directo_recibido,0)) > 0.005
     or abs(coalesce(x.reversas_cobros_previos,0)) > 0.005
     or abs(coalesce(x.reintegros_entregas_previas,0)) > 0.005
     or abs(coalesce(x.directos_previos_anulados,0)) > 0.005
     or abs(coalesce(x.saldo_final,0)) > 0.005;

  select coalesce(sum(cobrado_validado),0),coalesce(sum(saldo_final),0),count(*)
    into v_total,v_saldo,v_count
  from public.seguros_cierres_ciclo_agentes
  where cierre_id=v_cierre;

  update public.seguros_cierres_ciclo
  set total_negocio_cobrado=v_total,
      total_saldo_final=v_saldo,
      agentes_incluidos=v_count
  where id=v_cierre;

  return v_cierre;
end;
$$;
revoke all on function public.seguros_cerrar_ciclo_core(text,text,uuid) from public, anon, authenticated;

create or replace function public.seguros_cerrar_ciclo(p_periodo text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.mi_rol() <> 'admin'
     or public.mi_organizacion() is distinct from
        (select id from public.organizaciones where slug='nexus-pro') then
    raise exception 'Solo administrador';
  end if;
  return public.seguros_cerrar_ciclo_core(p_periodo,'manual',auth.uid());
end;
$$;
revoke all on function public.seguros_cerrar_ciclo(text) from public, anon;
grant execute on function public.seguros_cerrar_ciclo(text) to authenticated;

create or replace function public.seguros_cerrar_ciclo_automatico()
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_periodo text;
begin
  -- Se ejecuta el día 20 a las 00:05 RD. El ciclo que acaba de cerrar abrió un mes antes.
  v_periodo := to_char((now() at time zone 'America/Santo_Domingo') - interval '1 month','YYYY-MM');
  return public.seguros_cerrar_ciclo_core(v_periodo,'automatico',null);
end;
$$;
revoke all on function public.seguros_cerrar_ciclo_automatico() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5) Lectura de snapshots y consolidado mensual para admin.
-- -----------------------------------------------------------------------------
create or replace function public.seguros_cierre_ciclo_admin(p_periodo text)
returns table(
  cierre_id uuid,
  periodo text,
  ciclo_inicio timestamptz,
  ciclo_fin timestamptz,
  cerrado_at timestamptz,
  origen text,
  total_negocio_cobrado numeric,
  agente_id uuid,
  agente text,
  cargo text,
  activo_al_cierre boolean,
  cobrado_validado numeric,
  transferido_confirmado numeric,
  recibido_confirmado numeric,
  entregado_admin_directo numeric,
  saldo_final numeric,
  diferencia_reconciliacion numeric,
  historico_aproximado boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if public.mi_rol() <> 'admin'
     or public.mi_organizacion() is distinct from
        (select id from public.organizaciones where slug='nexus-pro') then
    raise exception 'Solo administrador';
  end if;

  return query
  select c.id,c.periodo,c.ciclo_inicio,c.ciclo_fin,c.cerrado_at,c.origen,c.total_negocio_cobrado,
         d.agente_id,d.agente,d.cargo,d.activo_al_cierre,d.cobrado_validado,
         d.transferido_confirmado,d.recibido_confirmado,d.entregado_admin_directo,
         d.saldo_final,d.diferencia_reconciliacion,d.historico_aproximado
  from public.seguros_cierres_ciclo c
  join public.seguros_cierres_ciclo_agentes d on d.cierre_id=c.id
  where c.organizacion_id=(select id from public.organizaciones where slug='nexus-pro')
    and c.periodo=p_periodo
  order by d.agente;
end;
$$;
revoke all on function public.seguros_cierre_ciclo_admin(text) from public, anon;
grant execute on function public.seguros_cierre_ciclo_admin(text) to authenticated;

create or replace function public.seguros_reporte_mensual_admin(p_mes text)
returns table(
  mes text,
  ciclos_incluidos integer,
  agente_id uuid,
  agente text,
  cobrado_validado numeric,
  transferido_confirmado numeric,
  recibido_confirmado numeric,
  entregado_admin_directo numeric,
  saldo_final_ultimo numeric,
  total_negocio_cobrado_mes numeric
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if p_mes is null or p_mes !~ '^\d{4}-\d{2}$' then
    raise exception 'Mes invalido. Use YYYY-MM';
  end if;
  if public.mi_rol() <> 'admin'
     or public.mi_organizacion() is distinct from
        (select id from public.organizaciones where slug='nexus-pro') then
    raise exception 'Solo administrador';
  end if;

  return query
  with cierres as (
    select c.*
    from public.seguros_cierres_ciclo c
    where c.organizacion_id=(select id from public.organizaciones where slug='nexus-pro')
      and to_char(c.ciclo_fin at time zone 'America/Santo_Domingo','YYYY-MM')=p_mes
  ), mov as (
    select d.*,c.ciclo_fin
    from cierres c
    join public.seguros_cierres_ciclo_agentes d on d.cierre_id=c.id
  ), agg as (
    select m.agente_id,max(m.agente) as agente,
           count(distinct m.cierre_id)::integer as ciclos,
           sum(m.cobrado_validado) as cobrado,
           sum(m.transferido_confirmado) as transferido,
           sum(m.recibido_confirmado) as recibido,
           sum(m.entregado_admin_directo) as entregado
    from mov m
    group by m.agente_id
  )
  select p_mes,a.ciclos,a.agente_id,a.agente,a.cobrado,a.transferido,a.recibido,a.entregado,
         (
           select m2.saldo_final from mov m2
           where m2.agente_id=a.agente_id
           order by m2.ciclo_fin desc limit 1
         ) as saldo_final_ultimo,
         coalesce((select sum(c.total_negocio_cobrado) from cierres c),0) as total_negocio_cobrado_mes
  from agg a
  order by a.agente;
end;
$$;
revoke all on function public.seguros_reporte_mensual_admin(text) from public, anon;
grant execute on function public.seguros_reporte_mensual_admin(text) to authenticated;

-- -----------------------------------------------------------------------------
-- 6) Cron mensual: 04:05 UTC = 00:05 America/Santo_Domingo, día 20.
--    Cinco minutos después del corte evita competir con procesos que terminen justo a medianoche.
-- -----------------------------------------------------------------------------
do $$
declare v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname='seguros-cierre-ciclo-20';
  if v_jobid is not null then perform cron.unschedule(v_jobid); end if;
  perform cron.schedule(
    'seguros-cierre-ciclo-20',
    '5 4 20 * *',
    'select public.seguros_cerrar_ciclo_automatico();'
  );
end $$;

comment on function public.seguros_resumen_ciclo_agente_core(uuid,text) is
  'Fase C NEXUS PRO: cálculo privado por ciclo 20->20. Bancarios pertenecen al ciclo por validado_at.';
comment on function public.seguros_cerrar_ciclo_core(text,text,uuid) is
  'Fase C NEXUS PRO: crea snapshot inmutable e idempotente de un ciclo ya finalizado.';
comment on table public.seguros_cierres_ciclo is
  'Cierres inmutables NEXUS PRO. periodo identifica el mes de apertura del ciclo 20->20.';
