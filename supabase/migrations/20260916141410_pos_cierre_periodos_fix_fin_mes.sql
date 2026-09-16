-- NEXUS PRO POS · corrección de límite de cierre mensual
-- Un periodo solo puede cerrarse cuando el mes completo ya terminó.

create or replace function public.pos_cerrar_periodo(p_periodo date)
returns boolean
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_org uuid:=mi_organizacion();
  v_mes date:=date_trunc('month',p_periodo)::date;
  v_fin date;
  v_malos integer;
begin
  if mi_rol()<>'admin' then raise exception 'CONTABILIDAD_CIERRE_SOLO_ADMIN'; end if;
  if p_periodo is null then raise exception 'CONTABILIDAD_PERIODO_REQUERIDO'; end if;
  v_fin:=(v_mes + interval '1 month' - interval '1 day')::date;
  if v_fin>=date_trunc('month',current_date)::date then raise exception 'CONTABILIDAD_SOLO_MESES_TERMINADOS'; end if;

  select count(*) into v_malos from (
    select a.id
    from public.pos_asientos a
    left join public.pos_asiento_lineas l on l.asiento_id=a.id
    where a.organizacion_id=v_org and a.fecha between v_mes and v_fin
    group by a.id
    having count(l.id)=0 or abs(coalesce(sum(l.debito),0)-coalesce(sum(l.credito),0))>0.01
  ) q;
  if v_malos>0 then raise exception 'CONTABILIDAD_ASIENTOS_INVALIDOS %',v_malos; end if;

  insert into public.pos_periodos_contables(organizacion_id,periodo,estado,cerrado_at,cerrado_por,updated_at)
  values(v_org,v_mes,'cerrado',now(),auth.uid(),now())
  on conflict (organizacion_id,periodo) do update
    set estado='cerrado',cerrado_at=now(),cerrado_por=auth.uid(),updated_at=now();
  return true;
end;
$$;

revoke all on function public.pos_cerrar_periodo(date) from public,anon;
grant execute on function public.pos_cerrar_periodo(date) to authenticated;
