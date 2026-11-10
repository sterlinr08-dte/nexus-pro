-- 09-nov-2026 · Custodia de fondos mostraba «No se pudieron cargar las cifras … column reference "saldo_inicial" is ambiguous» (42702).
-- Causa: dentro de seguros_resumen_ciclo_admin, las columnas internas se llamaban igual que las columnas de salida de la función.
-- Arreglo: las internas pasan a llamarse x_… Mismo cálculo, mismas columnas de salida, misma firma.
-- Ya aplicado en producción como «seguros_resumen_ciclo_admin_sin_ambiguedad».
create or replace function public.seguros_resumen_ciclo_admin(p_periodo text)
 returns table(agente_id uuid, agente text, cargo text, periodo text, ciclo_inicio timestamp with time zone, ciclo_fin timestamp with time zone, corte timestamp with time zone, cerrado boolean, saldo_inicial numeric, cobrado_validado numeric, transferido_confirmado numeric, recibido_confirmado numeric, entregado_admin_directo numeric, directo_recibido numeric, reversas_cobros_previos numeric, reintegros_entregas_previas numeric, directos_previos_anulados numeric, saldo_final numeric, diferencia_reconciliacion numeric, historico_aproximado boolean, total_negocio_cobrado_ciclo numeric)
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
begin
  if public.mi_rol() <> 'admin'
     or public.mi_organizacion() is distinct from
        (select id from public.organizaciones where slug='nexus-pro') then
    raise exception 'Solo administrador';
  end if;

  return query
  with r as (
    select a.id as aid,a.nom,a.cargo as a_cargo,a.activo,
           x.periodo as x_periodo,x.ciclo_inicio as x_inicio,x.ciclo_fin as x_fin,x.corte as x_corte,x.cerrado as x_cerrado,
           x.saldo_inicial as x_si,x.cobrado_validado as x_cob,x.transferido_confirmado as x_tr,x.recibido_confirmado as x_rec,
           x.entregado_admin_directo as x_ent,x.directo_recibido as x_dir,x.reversas_cobros_previos as x_rev,
           x.reintegros_entregas_previas as x_rei,x.directos_previos_anulados as x_dpa,x.saldo_final as x_sf,
           x.diferencia_reconciliacion as x_dif,x.historico_aproximado as x_aprox
    from public.agentes a
    cross join lateral public.seguros_resumen_ciclo_agente_core(a.id,p_periodo) x
  ), elegibles as (
    select * from r
    where coalesce(r.activo,true)
       or abs(coalesce(r.x_si,0)) > 0.005
       or abs(coalesce(r.x_cob,0)) > 0.005
       or abs(coalesce(r.x_tr,0)) > 0.005
       or abs(coalesce(r.x_rec,0)) > 0.005
       or abs(coalesce(r.x_ent,0)) > 0.005
       or abs(coalesce(r.x_dir,0)) > 0.005
       or abs(coalesce(r.x_rev,0)) > 0.005
       or abs(coalesce(r.x_rei,0)) > 0.005
       or abs(coalesce(r.x_dpa,0)) > 0.005
       or abs(coalesce(r.x_sf,0)) > 0.005
  )
  select
    e.aid,e.nom,e.a_cargo,e.x_periodo,e.x_inicio,e.x_fin,e.x_corte,e.x_cerrado,
    e.x_si,e.x_cob,e.x_tr,e.x_rec,
    e.x_ent,e.x_dir,e.x_rev,
    e.x_rei,e.x_dpa,e.x_sf,
    e.x_dif,e.x_aprox,
    sum(e.x_cob) over () as total_negocio_cobrado_ciclo
  from elegibles e
  order by e.nom;
end;
$function$;
