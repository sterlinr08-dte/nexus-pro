-- NEXUS PRO Seguros · Fase C
-- Corrección de revisión: el ciclo contable es una regla fija 20 -> 20 y no debe
-- desplazarse si cambia la configuración operativa de auto-facturación.

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
  v_inicio timestamptz;
  v_fin timestamptz;
  v_dia constant integer := 20;
begin
  if p_periodo is null or p_periodo !~ '^\d{4}-\d{2}$' then
    raise exception 'Periodo inválido. Use YYYY-MM';
  end if;

  v_base := to_date(p_periodo || '-01','YYYY-MM-DD');
  if to_char(v_base,'YYYY-MM') <> p_periodo then
    raise exception 'Periodo inválido. Use YYYY-MM';
  end if;

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
    raise exception 'El ciclo % todavía no ha iniciado', p_periodo;
  end if;

  return query
  select p_periodo, v_inicio, v_fin, least(now(), v_fin), v_dia;
end;
$$;

revoke all on function public.seguros_ciclo_limites(text) from public, anon, authenticated;

comment on function public.seguros_ciclo_limites(text) is
  'NEXUS PRO Seguros: límites contables fijos día 20 00:00 -> día 20 00:00, America/Santo_Domingo. Independiente de la configuración de auto-facturación.';