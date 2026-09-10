-- NEXUS PRO Seguros · Fase A
-- Capa de lectura para custodia/acumulados por ciclo.
-- NO crea un segundo ledger: reutiliza abonos, transferencias_agentes y entregas_admin.
-- No incluye notificaciones ni snapshots de cierre (Fases B/C).

create or replace function public.seguros_dia_ciclo_facturacion()
returns integer
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_dia integer;
begin
  begin
    select nullif((valor::jsonb->>'dia'),'')::integer
      into v_dia
    from public.configuracion
    where clave='auto_facturacion'
    limit 1;
  exception when others then
    v_dia := null;
  end;

  if v_dia is null or v_dia < 1 or v_dia > 28 then
    select mode() within group (order by dia_facturacion::integer)
      into v_dia
    from public.clientes
    where coalesce(activo,true)
      and dia_facturacion between 1 and 28;
  end if;

  return coalesce(v_dia,20);
end;
$$;

revoke all on function public.seguros_dia_ciclo_facturacion() from public, anon, authenticated;


create or replace function public.seguros_ciclo_limites(p_periodo text)
returns table(
  periodo text,
  inicio timestamptz,
  fin timestamptz,
  corte timestamptz,
  dia_ciclo integer
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_base date;
  v_sig date;
  v_dia integer;
  v_inicio timestamptz;
  v_fin timestamptz;
begin
  if p_periodo is null or p_periodo !~ '^\d{4}-\d{2}$' then
    raise exception 'Periodo inválido. Use YYYY-MM';
  end if;

  v_base := to_date(p_periodo||'-01','YYYY-MM-DD');
  if to_char(v_base,'YYYY-MM') <> p_periodo then
    raise exception 'Periodo inválido. Use YYYY-MM';
  end if;

  v_dia := public.seguros_dia_ciclo_facturacion();
  v_sig := (v_base + interval '1 month')::date;

  v_inicio := make_timestamptz(
    extract(year from v_base)::integer,
    extract(month from v_base)::integer,
    v_dia,0,0,0,'America/Santo_Domingo'
  );
  v_fin := make_timestamptz(
    extract(year from v_sig)::integer,
    extract(month from v_sig)::integer,
    v_dia,0,0,0,'America/Santo_Domingo'
  );

  if now() < v_inicio then
    raise exception 'El ciclo % todavía no ha iniciado',p_periodo;
  end if;

  return query select p_periodo,v_inicio,v_fin,least(now(),v_fin),v_dia;
end;
$$;

revoke all on function public.seguros_ciclo_limites(text) from public, anon, authenticated;


-- Saldo de custodia VALIDADO justo antes de p_corte.
-- Bancarios cuentan cuando quedan validados; para históricos migrados sin validado_at
-- se usa fecha/created_at como fallback explícito.
-- Transferencias históricas aceptadas sin aceptado_en usan fecha/created_at como fallback.
create or replace function public.seguros_saldo_validado_agente_asof(
  p_agente_id uuid,
  p_corte timestamptz
)
returns numeric
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
      coalesce((
        select sum(a.monto)
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
          ) < p_corte
          and (coalesce(a.estado,'') <> 'Reversado' or a.reversado_at is not null)
          and (a.reversado_at is null or a.reversado_at >= p_corte)
      ),0)
    + coalesce((
        select sum(t.monto)
        from public.transferencias_agentes t
        where t.hacia_agente=p_agente_id::text
          and t.estado='aceptada'
          and coalesce(t.aceptado_en,t.fecha,t.created_at) < p_corte
      ),0)
    - coalesce((
        select sum(t.monto)
        from public.transferencias_agentes t
        where t.desde_agente=p_agente_id::text
          and t.estado='aceptada'
          and coalesce(t.aceptado_en,t.fecha,t.created_at) < p_corte
      ),0)
    - coalesce((
        select sum(e.monto)
        from public.entregas_admin e
        where e.agente_id=p_agente_id
          and e.es_directo=false
          and coalesce(e.created_at,e.fecha) < p_corte
          and (not coalesce(e.anulado,false) or e.anulado_at is not null)
          and (e.anulado_at is null or e.anulado_at >= p_corte)
      ),0)
    - coalesce((
        select sum(e.monto)
        from public.entregas_admin e
        where e.es_directo=true
          and e.agente_id<>p_agente_id
          and coalesce(e.cobrado_por,e.agente_id)=p_agente_id
          and coalesce(e.created_at,e.fecha) < p_corte
          and (not coalesce(e.anulado,false) or e.anulado_at is not null)
          and (e.anulado_at is null or e.anulado_at >= p_corte)
      ),0)
    + coalesce((
        select sum(e.monto)
        from public.entregas_admin e
        where e.es_directo=true
          and e.agente_id=p_agente_id
          and coalesce(e.cobrado_por,e.agente_id)<>p_agente_id
          and coalesce(e.created_at,e.fecha) < p_corte
          and (not coalesce(e.anulado,false) or e.anulado_at is not null)
          and (e.anulado_at is null or e.anulado_at >= p_corte)
      ),0)
$$;

revoke all on function public.seguros_saldo_validado_agente_asof(uuid,timestamptz) from public, anon, authenticated;


create or replace function public.seguros_resumen_ciclo_agente(
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
  v_inicio timestamptz;
  v_fin timestamptz;
  v_corte timestamptz;
  v_saldo_inicial numeric;
  v_cobrado numeric;
  v_transferido numeric;
  v_recibido numeric;
  v_entregado numeric;
  v_directo_recibido numeric;
  v_saldo_final numeric;
  v_reconciliado numeric;
  v_aprox boolean;
begin
  v_rol := public.mi_rol();
  if v_rol is null
     or public.mi_organizacion() is distinct from
        (select id from public.organizaciones where slug='nexus-pro') then
    raise exception 'No autorizado';
  end if;

  if p_agente_id is null
     or not exists(select 1 from public.agentes a where a.id=p_agente_id) then
    raise exception 'Agente inválido';
  end if;

  v_mi_agente := public.mi_agente_efectivo();
  if v_rol <> 'admin' and v_mi_agente is distinct from p_agente_id then
    raise exception 'No autorizado para consultar otro agente';
  end if;

  select l.inicio,l.fin,l.corte
    into v_inicio,v_fin,v_corte
  from public.seguros_ciclo_limites(p_periodo) l;

  v_saldo_inicial := public.seguros_saldo_validado_agente_asof(p_agente_id,v_inicio);
  v_saldo_final := public.seguros_saldo_validado_agente_asof(p_agente_id,v_corte);

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

  v_reconciliado := v_saldo_inicial
                  + v_cobrado
                  + v_recibido
                  + v_directo_recibido
                  - v_transferido
                  - v_entregado;

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
    v_saldo_final,
    v_reconciliado,
    v_saldo_final-v_reconciliado,
    coalesce(v_aprox,false);
end;
$$;

revoke all on function public.seguros_resumen_ciclo_agente(uuid,text) from public, anon;
grant execute on function public.seguros_resumen_ciclo_agente(uuid,text) to authenticated;


create or replace function public.seguros_resumen_ciclo_admin(p_periodo text)
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
    select a.id as aid,a.nom,a.cargo,x.*
    from public.agentes a
    cross join lateral public.seguros_resumen_ciclo_agente(a.id,p_periodo) x
    where coalesce(a.activo,true)
  )
  select
    r.aid,
    r.nom,
    r.cargo,
    r.periodo,
    r.ciclo_inicio,
    r.ciclo_fin,
    r.corte,
    r.cerrado,
    r.saldo_inicial,
    r.cobrado_validado,
    r.transferido_confirmado,
    r.recibido_confirmado,
    r.entregado_admin_directo,
    r.directo_recibido,
    r.saldo_final,
    r.diferencia_reconciliacion,
    r.historico_aproximado,
    sum(r.cobrado_validado) over () as total_negocio_cobrado_ciclo
  from r
  order by r.nom;
end;
$$;

revoke all on function public.seguros_resumen_ciclo_admin(text) from public, anon;
grant execute on function public.seguros_resumen_ciclo_admin(text) to authenticated;

comment on function public.seguros_saldo_validado_agente_asof(uuid,timestamptz) is
  'Fase A NEXUS PRO: reconstruye custodia validada por agente justo antes de un corte, sin crear ledger paralelo.';
comment on function public.seguros_resumen_ciclo_agente(uuid,text) is
  'Fase A NEXUS PRO: resumen por ciclo de facturación. Transferencias internas mueven custodia pero no aumentan cobrado_validado.';
comment on function public.seguros_resumen_ciclo_admin(text) is
  'Fase A NEXUS PRO: consolidado admin por ciclo. total_negocio_cobrado_ciclo suma solo cobros validados, no transferencias internas.';
