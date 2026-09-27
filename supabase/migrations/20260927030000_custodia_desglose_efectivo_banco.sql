-- Desglose de la custodia de un agente en EFECTIVO y BANCO, para el reporte diario.
-- Solo lectura. No cambia seguros_acumulado_validado_agente: el total sigue siendo ese,
-- y aquí solo se separa la parte en efectivo; el resto se considera en banco.
--
-- Efectivo = cobros en Efectivo (mismos filtros que el acumulado)
--          + transferencias aceptadas recibidas en Efectivo
--          - transferencias aceptadas enviadas en Efectivo
--          - entregas no directas hechas en Efectivo.
-- Banco    = acumulado - efectivo (incluye ajustes y cualquier otro método).
create or replace function public.seguros_custodia_desglose_agente(p_agente_id uuid)
returns table(total numeric, efectivo numeric, banco numeric)
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $$
  with t as (
    select public.seguros_acumulado_validado_agente(p_agente_id) as total
  ), e as (
    select
        coalesce((select sum(a.monto) from public.abonos a
                   where a.agente_cobro=p_agente_id::text
                     and a.metodo='Efectivo'
                     and coalesce(a.estado,'') <> 'Reversado'),0)
      + coalesce((select sum(x.monto) from public.transferencias_agentes x
                   where x.hacia_agente=p_agente_id::text and x.estado='aceptada' and x.metodo='Efectivo'),0)
      - coalesce((select sum(x.monto) from public.transferencias_agentes x
                   where x.desde_agente=p_agente_id::text and x.estado='aceptada' and x.metodo='Efectivo'),0)
      - coalesce((select sum(en.monto) from public.entregas_admin en
                   where en.agente_id=p_agente_id and en.es_directo=false and en.anulado=false
                     and en.metodo='Efectivo'),0) as efectivo
  )
  select t.total, e.efectivo, t.total - e.efectivo from t, e;
$$;

revoke all on function public.seguros_custodia_desglose_agente(uuid) from public, anon, authenticated;
grant execute on function public.seguros_custodia_desglose_agente(uuid) to service_role;
