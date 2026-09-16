-- NEXUS PRO POS · cierre y reapertura de periodos contables
-- Versionado del esquema aplicado en producción el 16-sep-2026.

create table if not exists public.pos_periodos_contables (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null,
  periodo date not null,
  estado text not null default 'abierto' check (estado in ('abierto','cerrado')),
  cerrado_at timestamptz,
  cerrado_por uuid,
  reabierto_at timestamptz,
  reabierto_por uuid,
  motivo_reapertura text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organizacion_id,periodo),
  check (periodo=date_trunc('month',periodo)::date)
);

alter table public.pos_periodos_contables enable row level security;
drop policy if exists pos_periodos_admin on public.pos_periodos_contables;
create policy pos_periodos_admin on public.pos_periodos_contables for all to authenticated
using (mi_rol()='admin' and organizacion_id=mi_organizacion())
with check (mi_rol()='admin' and organizacion_id=mi_organizacion());

create or replace function public.pos_periodo_esta_cerrado(p_org uuid,p_fecha date)
returns boolean language sql stable security invoker set search_path=public as $$
  select exists(
    select 1 from public.pos_periodos_contables
    where organizacion_id=p_org
      and periodo=date_trunc('month',p_fecha)::date
      and estado='cerrado'
  )
$$;

create or replace function public.pos_cerrar_periodo(p_periodo date)
returns boolean language plpgsql security invoker set search_path=public as $$
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

create or replace function public.pos_reabrir_periodo(p_periodo date,p_motivo text)
returns boolean language plpgsql security invoker set search_path=public as $$
declare v_org uuid:=mi_organizacion(); v_mes date:=date_trunc('month',p_periodo)::date;
begin
  if mi_rol()<>'admin' then raise exception 'CONTABILIDAD_REAPERTURA_SOLO_ADMIN'; end if;
  if length(trim(coalesce(p_motivo,'')))<5 then raise exception 'CONTABILIDAD_MOTIVO_REQUERIDO'; end if;
  update public.pos_periodos_contables
  set estado='abierto',reabierto_at=now(),reabierto_por=auth.uid(),motivo_reapertura=trim(p_motivo),updated_at=now()
  where organizacion_id=v_org and periodo=v_mes and estado='cerrado';
  if not found then raise exception 'CONTABILIDAD_PERIODO_NO_CERRADO'; end if;
  return true;
end;
$$;

create or replace function public.pos_guard_periodo_asiento()
returns trigger language plpgsql security invoker set search_path=public as $$
declare v_org uuid; v_fecha date;
begin
  if tg_table_name='pos_asientos' then
    if tg_op='DELETE' then v_org:=old.organizacion_id; v_fecha:=old.fecha;
    else v_org:=new.organizacion_id; v_fecha:=new.fecha; end if;
  else
    if tg_op='DELETE' then
      select a.organizacion_id,a.fecha into v_org,v_fecha from public.pos_asientos a where a.id=old.asiento_id;
    else
      select a.organizacion_id,a.fecha into v_org,v_fecha from public.pos_asientos a where a.id=new.asiento_id;
    end if;
  end if;
  if v_org is not null and v_fecha is not null and public.pos_periodo_esta_cerrado(v_org,v_fecha) then
    raise exception 'CONTABILIDAD_PERIODO_CERRADO %',to_char(v_fecha,'YYYY-MM');
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists pos_asientos_periodo_guard on public.pos_asientos;
create trigger pos_asientos_periodo_guard before insert or update or delete on public.pos_asientos
for each row execute function public.pos_guard_periodo_asiento();

drop trigger if exists pos_asiento_lineas_periodo_guard on public.pos_asiento_lineas;
create trigger pos_asiento_lineas_periodo_guard before insert or update or delete on public.pos_asiento_lineas
for each row execute function public.pos_guard_periodo_asiento();

revoke all on function public.pos_periodo_esta_cerrado(uuid,date) from public,anon;
revoke all on function public.pos_cerrar_periodo(date) from public,anon;
revoke all on function public.pos_reabrir_periodo(date,text) from public,anon;
grant execute on function public.pos_periodo_esta_cerrado(uuid,date) to authenticated;
grant execute on function public.pos_cerrar_periodo(date) to authenticated;
grant execute on function public.pos_reabrir_periodo(date,text) to authenticated;
