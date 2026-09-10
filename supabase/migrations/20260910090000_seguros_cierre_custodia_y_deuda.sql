-- NEXUS PRO Seguros · Fase C — las 2 observaciones menores de la revisión
--
-- 1) `total_saldo_final` se calculaba como sum(saldo_final). Si un agente cierra con saldo
--    negativo (deuda), su número se restaba del de los demás: el total mostraría menos
--    custodia de la que realmente está repartida, y la deuda quedaría escondida dentro de
--    una sola cifra.
--
--    En el bloque 4C-DEUDA ya se había fijado el criterio contrario para "Dinero en Mano":
--    nunca netear el signo de un agente contra el de otro; el dinero en mano se recorta a
--    cero y la deuda se muestra aparte. Esta migración alinea el cierre con ese criterio.
--
--    Se hace AHORA por una razón de calendario: los snapshots son inmutables. El primer
--    cierre automático es el 20 de septiembre; si se hiciera con el cálculo que netea, ese
--    número quedaría congelado para siempre. Hoy hay 0 cierres creados, así que no hay
--    ningún histórico que corregir.
--
-- 2) `seguros_dia_ciclo_facturacion()` dejó de gobernar el límite contable cuando el ciclo
--    quedó fijo en el día 20. Se le pone comentario para que nadie la vuelva a conectar al
--    cierre por error.
--
-- No cambia la matemática por agente: `saldo_final` de cada uno se sigue guardando con su
-- signo real. Solo cambia cómo se agregan los totales del ciclo.

alter table public.seguros_cierres_ciclo
  add column if not exists total_deuda_agentes numeric not null default 0;

comment on column public.seguros_cierres_ciclo.total_saldo_final is
  'Custodia realmente repartida entre agentes al cierre: suma de los saldos positivos. Nunca netea la deuda de un agente contra el saldo de otro.';
comment on column public.seguros_cierres_ciclo.total_deuda_agentes is
  'Deuda total de los agentes al cierre: suma de los saldos negativos, en positivo. Se reporta aparte, nunca restada de la custodia.';

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
  v_deuda numeric;
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

  -- Custodia y deuda se agregan por separado, nunca una contra la otra (criterio 4C-DEUDA).
  select coalesce(sum(cobrado_validado),0),
         coalesce(sum(greatest(saldo_final,0)),0),
         coalesce(sum(greatest(-saldo_final,0)),0),
         count(*)
    into v_total,v_saldo,v_deuda,v_count
  from public.seguros_cierres_ciclo_agentes
  where cierre_id=v_cierre;

  update public.seguros_cierres_ciclo
  set total_negocio_cobrado=v_total,
      total_saldo_final=v_saldo,
      total_deuda_agentes=v_deuda,
      agentes_incluidos=v_count
  where id=v_cierre;

  return v_cierre;
end;
$$;

revoke all on function public.seguros_cerrar_ciclo_core(text,text,uuid) from public, anon, authenticated;

-- El reporte del snapshot expone ambos totales: una custodia que esconde deuda dentro no
-- sirve de nada si nadie puede verla por separado.
drop function if exists public.seguros_cierre_ciclo_admin(text);

create function public.seguros_cierre_ciclo_admin(p_periodo text)
returns table(
  cierre_id uuid,
  periodo text,
  ciclo_inicio timestamptz,
  ciclo_fin timestamptz,
  cerrado_at timestamptz,
  origen text,
  total_negocio_cobrado numeric,
  total_saldo_final numeric,
  total_deuda_agentes numeric,
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
  select c.id,c.periodo,c.ciclo_inicio,c.ciclo_fin,c.cerrado_at,c.origen,
         c.total_negocio_cobrado,c.total_saldo_final,c.total_deuda_agentes,
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

comment on function public.seguros_cerrar_ciclo_core(text,text,uuid) is
  'Fase C NEXUS PRO: snapshot inmutable 20->20. Bloquea el cierre si alguna reconciliacion difiere mas de RD$0.005. Custodia y deuda se agregan por separado, nunca neteadas entre agentes.';
comment on function public.seguros_cierre_ciclo_admin(text) is
  'Fase C NEXUS PRO: snapshot por agente de un ciclo cerrado, con la custodia y la deuda del ciclo como cifras separadas.';

-- Observación 2: dejar constancia de que esta función ya no gobierna el límite contable.
comment on function public.seguros_dia_ciclo_facturacion() is
  'Configuracion OPERATIVA del dia de auto-facturacion. NO gobierna el ciclo contable: desde la migracion 20260910004200 el cierre 20->20 usa un dia fijo en seguros_ciclo_limites(). No volver a conectarla al cierre.';
