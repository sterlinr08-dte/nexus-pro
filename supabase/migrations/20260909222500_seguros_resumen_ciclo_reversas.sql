-- NEXUS PRO Seguros · Fase A · corrección posterior a pruebas históricas
--
-- Hallazgo reproducido con datos reales: en el ciclo 2026-07 ROBINSON tenía un abono
-- de RD$6,500 originado antes del ciclo y reversado dentro del ciclo. El saldo as-of
-- reflejaba correctamente la reversa, pero el resumen de movimientos no tenía una
-- línea para ese ajuste y dejaba diferencia_reconciliacion=-6500.
--
-- Esta migración NO crea un ledger paralelo. Solo hace explícitos los movimientos
-- de reversa/anulación de hechos nacidos en ciclos anteriores para que la ecuación
-- del ciclo explique exactamente el cambio de custodia.

-- Cambia el tipo de retorno, por lo que se recrean las dos RPC de reporting.
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

  -- Dependencia intencional: trg_abono_preparar_validacion garantiza que los nuevos
  -- Transferencia/Depósito usan pendiente/validado; nunca no_requerida.
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

  -- Cobro nacido ANTES del ciclo y reversado DENTRO del ciclo: el saldo inicial lo
  -- contiene y el saldo final ya no; por eso debe aparecer como salida del ciclo.
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

  -- Entrega nacida ANTES del ciclo y anulada DENTRO del ciclo: si el agente era
  -- quien entregó, recupera custodia; si era receptor de una entrega directa,
  -- pierde esa custodia. Se separan ambos sentidos para trazabilidad.
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
    r.reversas_cobros_previos,
    r.reintegros_entregas_previas,
    r.directos_previos_anulados,
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

comment on function public.seguros_resumen_ciclo_agente(uuid,text) is
  'Fase A NEXUS PRO: resumen por ciclo reconciliable; incluye reversas/anulaciones de movimientos originados en ciclos previos.';
comment on function public.seguros_resumen_ciclo_admin(text) is
  'Fase A NEXUS PRO: consolidado admin reconciliable. El total del negocio suma solo cobros validados y nunca transferencias internas.';
comment on function public.seguros_saldo_validado_agente_asof(uuid,timestamptz) is
  'Fase A NEXUS PRO: bancarios nuevos dependen de trg_abono_preparar_validacion (pendiente/validado); históricos sin validado_at usan fallback de fecha.';