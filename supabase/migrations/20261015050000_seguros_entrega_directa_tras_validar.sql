-- NEXUS PRO Seguros · Una «entrega directa» (cliente depositó en la cuenta de OTRO agente)
-- solo mueve custodia cuando el pago ya está VALIDADO.
--
-- Problema: al aplicar un pago por Transferencia/Depósito a la cuenta de otro agente,
-- `seguros_registrar_cobro_con_entrega` crea la entrega directa al instante, pero el abono
-- queda «pendiente» de validar. El cobro del agente solo cuenta al validarse, y la entrega
-- se restaba ya: mientras tanto el acumulado del cobrador bajaba de más (ej.: cobró 1,500
-- propios + 2,000 a la cuenta de Esterlin sin validar → salía RD$ -500 en vez de 1,500), y
-- el dueño de la cuenta sumaba un dinero todavía sin confirmar.
--
-- Regla nueva (misma que ya usa el cobro): la entrega directa ligada a un abono por
-- Transferencia/Depósito cuenta desde el momento en que el abono queda validado
-- (greatest(creación de la entrega, validado_at)); si el abono sigue pendiente, no cuenta.
-- Entregas sin abono, o de abonos en efectivo/otros, no cambian (cuentan desde su creación).
-- Con validado_at nulo (pagos viejos ya validados) se usa la fecha de la entrega: sin cambio.
--
-- Afecta solo cálculos (no toca datos). Funciones: seguros_acumulado_validado_agente,
-- seguros_saldo_validado_agente_asof y seguros_resumen_ciclo_agente_core.
-- seguros_custodia_desglose_agente usa el acumulado, así que queda corregida sola.

create or replace function public.seguros_entrega_directa_vigente_at(p_abono_id uuid, p_creada timestamptz)
returns timestamptz
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select case
    when p_abono_id is null or ab.id is null then p_creada
    when ab.metodo not in ('Transferencia','Depósito') then p_creada
    when ab.validacion_estado = 'validado' then greatest(p_creada, coalesce(ab.validado_at, p_creada))
    else null
  end
  from (select 1) d
  left join public.abonos ab on ab.id = p_abono_id
$function$;

revoke all on function public.seguros_entrega_directa_vigente_at(uuid, timestamptz) from public, anon;
grant execute on function public.seguros_entrega_directa_vigente_at(uuid, timestamptz) to authenticated, service_role;

create or replace function public.seguros_acumulado_validado_agente(p_agente_id uuid)
 returns numeric
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select
      coalesce((select sum(a.monto) from public.abonos a
                 where a.agente_cobro=p_agente_id::text
                   and coalesce(a.estado,'') <> 'Reversado'
                   and not (a.metodo in ('Transferencia','Depósito') and a.validacion_estado='pendiente')),0)
    + coalesce((select sum(t.monto) from public.transferencias_agentes t
                 where t.hacia_agente=p_agente_id::text and t.estado='aceptada'),0)
    - coalesce((select sum(t.monto) from public.transferencias_agentes t
                 where t.desde_agente=p_agente_id::text and t.estado='aceptada'),0)
    - coalesce((select sum(e.monto) from public.entregas_admin e
                 where e.agente_id=p_agente_id and e.es_directo=false and e.anulado=false),0)
    - coalesce((select sum(e.monto) from public.entregas_admin e
                 where e.es_directo=true and e.anulado=false and e.agente_id<>p_agente_id
                   and coalesce(e.cobrado_por,e.agente_id)=p_agente_id
                   and public.seguros_entrega_directa_vigente_at(e.abono_id, coalesce(e.created_at,e.fecha)) is not null),0)
    + coalesce((select sum(e.monto) from public.entregas_admin e
                 where e.es_directo=true and e.anulado=false and e.agente_id=p_agente_id
                   and coalesce(e.cobrado_por,e.agente_id)<>p_agente_id
                   and public.seguros_entrega_directa_vigente_at(e.abono_id, coalesce(e.created_at,e.fecha)) is not null),0)
$function$;

create or replace function public.seguros_saldo_validado_agente_asof(p_agente_id uuid, p_corte timestamp with time zone)
 returns numeric
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select
      coalesce((select sum(a.monto) from public.abonos a where a.agente_cobro=p_agente_id::text and (case when a.metodo in ('Transferencia','Depósito') then case when a.validacion_estado='validado' then coalesce(a.validado_at,a.fecha,a.created_at) else null end else coalesce(a.fecha,a.created_at) end) < p_corte and (coalesce(a.estado,'') <> 'Reversado' or a.reversado_at is not null) and (a.reversado_at is null or a.reversado_at >= p_corte)),0)
    + coalesce((select sum(t.monto) from public.transferencias_agentes t where t.hacia_agente=p_agente_id::text and t.estado='aceptada' and coalesce(t.aceptado_en,t.fecha,t.created_at) < p_corte),0)
    - coalesce((select sum(t.monto) from public.transferencias_agentes t where t.desde_agente=p_agente_id::text and t.estado='aceptada' and coalesce(t.aceptado_en,t.fecha,t.created_at) < p_corte),0)
    - coalesce((select sum(e.monto) from public.entregas_admin e where e.agente_id=p_agente_id and e.es_directo=false and coalesce(e.created_at,e.fecha) < p_corte and (not coalesce(e.anulado,false) or e.anulado_at is not null) and (e.anulado_at is null or e.anulado_at >= p_corte)),0)
    - coalesce((select sum(e.monto) from public.entregas_admin e where e.es_directo=true and e.agente_id<>p_agente_id and coalesce(e.cobrado_por,e.agente_id)=p_agente_id and public.seguros_entrega_directa_vigente_at(e.abono_id, coalesce(e.created_at,e.fecha)) < p_corte and (not coalesce(e.anulado,false) or e.anulado_at is not null) and (e.anulado_at is null or e.anulado_at >= p_corte)),0)
    + coalesce((select sum(e.monto) from public.entregas_admin e where e.es_directo=true and e.agente_id=p_agente_id and coalesce(e.cobrado_por,e.agente_id)<>p_agente_id and public.seguros_entrega_directa_vigente_at(e.abono_id, coalesce(e.created_at,e.fecha)) < p_corte and (not coalesce(e.anulado,false) or e.anulado_at is not null) and (e.anulado_at is null or e.anulado_at >= p_corte)),0)
$function$;

create or replace function public.seguros_resumen_ciclo_agente_core(p_agente_id uuid, p_periodo text)
 returns table(agente_id uuid, periodo text, ciclo_inicio timestamp with time zone, ciclo_fin timestamp with time zone, corte timestamp with time zone, cerrado boolean, saldo_inicial numeric, cobrado_validado numeric, transferido_confirmado numeric, recibido_confirmado numeric, entregado_admin_directo numeric, directo_recibido numeric, reversas_cobros_previos numeric, reintegros_entregas_previas numeric, directos_previos_anulados numeric, saldo_final numeric, saldo_reconciliado numeric, diferencia_reconciliacion numeric, historico_aproximado boolean)
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
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

  -- Entregas: la directa cuenta desde que su pago quedó validado (ver cabecera).
  select
      coalesce(sum(x.monto) filter (
        where x.agente_id=p_agente_id and x.es_directo=false
      ),0)
    + coalesce(sum(x.monto) filter (
        where x.es_directo=true
          and x.agente_id<>p_agente_id
          and coalesce(x.cobrado_por,x.agente_id)=p_agente_id
      ),0),
      coalesce(sum(x.monto) filter (
        where x.es_directo=true
          and x.agente_id=p_agente_id
          and coalesce(x.cobrado_por,x.agente_id)<>p_agente_id
      ),0)
    into v_entregado,v_directo_recibido
  from (
    select e.*,
           case when e.es_directo then public.seguros_entrega_directa_vigente_at(e.abono_id, coalesce(e.created_at,e.fecha))
                else coalesce(e.created_at,e.fecha) end as t_vigente
      from public.entregas_admin e
  ) x
  where x.t_vigente >= v_inicio
    and x.t_vigente < v_corte
    and (not coalesce(x.anulado,false) or x.anulado_at is not null)
    and (x.anulado_at is null or x.anulado_at >= v_corte);

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

  select coalesce(sum(x.monto),0)
    into v_reintegros_entregas_previas
  from (
    select e.*,
           case when e.es_directo then public.seguros_entrega_directa_vigente_at(e.abono_id, coalesce(e.created_at,e.fecha))
                else coalesce(e.created_at,e.fecha) end as t_vigente
      from public.entregas_admin e
  ) x
  where x.t_vigente < v_inicio
    and x.anulado_at >= v_inicio
    and x.anulado_at < v_corte
    and (
      (x.agente_id=p_agente_id and x.es_directo=false)
      or (
        x.es_directo=true
        and x.agente_id<>p_agente_id
        and coalesce(x.cobrado_por,x.agente_id)=p_agente_id
      )
    );

  select coalesce(sum(e.monto),0)
    into v_directos_previos_anulados
  from public.entregas_admin e
  where public.seguros_entrega_directa_vigente_at(e.abono_id, coalesce(e.created_at,e.fecha)) < v_inicio
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
$function$;
