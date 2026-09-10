-- NEXUS PRO Seguros · Fase C · correcciones post-revisión Claude
-- 1) Bloquea cualquier cierre si existe diferencia de reconciliación > RD$0.005.
-- 2) El reporte mensual usa el mes de APERTURA del ciclo (periodo), consistente con toda Fase C.

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
  v_descuadres text;
begin
  if p_origen not in ('automatico','manual') then
    raise exception 'Origen de cierre invalido';
  end if;

  perform pg_advisory_xact_lock(hashtext('seguros_cierre_ciclo:'||coalesce(p_periodo,'')));

  select id into v_org from public.organizaciones where slug='nexus-pro';
  if v_org is null then raise exception 'Organizacion nexus-pro no encontrada'; end if;

  select l.inicio,l.fin,l.corte into v_inicio,v_fin,v_corte
  from public.seguros_ciclo_limites(p_periodo) l;

  if now() < v_fin then
    raise exception 'El ciclo % cierra el %',p_periodo,v_fin;
  end if;

  select id into v_cierre
  from public.seguros_cierres_ciclo
  where organizacion_id=v_org and periodo=p_periodo;
  if v_cierre is not null then return v_cierre; end if;

  -- Nunca congelar como oficial un snapshot descuadrado.
  -- Si un caso límite futuro rompe la reconciliación, el cierre se detiene para revisión.
  select string_agg(
           coalesce(a.nom,a.id::text)||' (RD$ '||round(x.diferencia_reconciliacion,2)::text||')',
           ', ' order by coalesce(a.nom,a.id::text)
         )
    into v_descuadres
  from public.agentes a
  cross join lateral public.seguros_resumen_ciclo_agente_core(a.id,p_periodo) x
  where abs(coalesce(x.diferencia_reconciliacion,0)) > 0.005;

  if v_descuadres is not null then
    raise exception 'Cierre % bloqueado por diferencia de reconciliacion: %',p_periodo,v_descuadres;
  end if;

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
      and c.periodo=p_mes
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

comment on function public.seguros_cerrar_ciclo_core(text,text,uuid) is
  'Fase C NEXUS PRO: snapshot inmutable 20->20. Bloquea el cierre si alguna reconciliacion difiere mas de RD$0.005.';
comment on function public.seguros_reporte_mensual_admin(text) is
  'Fase C NEXUS PRO: consolidado por periodo de APERTURA YYYY-MM del ciclo 20->20.';
