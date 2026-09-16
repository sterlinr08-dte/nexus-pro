-- NEXUS PRO · Clientes / Novedades operativas
-- Crea la bandeja persistente, conserva historial y sincroniza casos automáticos.

create table if not exists public.cliente_novedades (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  agente_id uuid null references public.agentes(id) on delete set null,
  estado text not null check (estado in ('POR_ACTIVAR','EN_GESTION','EN_RIESGO','POR_RETIRAR','RESUELTO')),
  motivo text not null,
  detalle text null,
  origen text not null default 'MANUAL' check (origen in ('MANUAL','AUTOMATICA')),
  origen_clave text null,
  prioridad text not null default 'MEDIA' check (prioridad in ('BAJA','MEDIA','ALTA')),
  abierta boolean not null default true,
  fecha_inicio timestamptz not null default now(),
  fecha_seguimiento date null,
  resultado text null,
  resuelto_at timestamptz null,
  resuelto_por text null,
  created_by_name text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_cliente_novedades_abiertas on public.cliente_novedades(abierta,estado,fecha_inicio desc);
create index if not exists idx_cliente_novedades_cliente on public.cliente_novedades(cliente_id,created_at desc);
create index if not exists idx_cliente_novedades_agente on public.cliente_novedades(agente_id,abierta,estado);
create unique index if not exists uq_cliente_novedad_auto_abierta
  on public.cliente_novedades(cliente_id,origen_clave)
  where origen='AUTOMATICA' and abierta=true and origen_clave is not null;

alter table public.cliente_novedades enable row level security;
drop policy if exists all_cliente_novedades on public.cliente_novedades;
create policy all_cliente_novedades on public.cliente_novedades
for all
to authenticated
using (
  public.mi_rol() is not null
  and public.mi_organizacion() = (select id from public.organizaciones where slug='nexus-pro')
)
with check (
  public.mi_rol() is not null
  and public.mi_organizacion() = (select id from public.organizaciones where slug='nexus-pro')
);

grant select,insert,update,delete on public.cliente_novedades to authenticated;

create or replace function public.cliente_novedades_touch()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  new.updated_at := now();
  if new.abierta=false and old.abierta=true and new.resuelto_at is null then
    new.resuelto_at := now();
  end if;
  if new.abierta=true then
    new.resuelto_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cliente_novedades_touch on public.cliente_novedades;
create trigger trg_cliente_novedades_touch
before update on public.cliente_novedades
for each row execute function public.cliente_novedades_touch();

create or replace function public.novedad_auto_upsert(
  p_cliente_id uuid,
  p_clave text,
  p_estado text,
  p_motivo text,
  p_detalle text default null,
  p_prioridad text default 'MEDIA',
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_agente uuid;
begin
  select c.agente_id into v_agente from public.clientes c where c.id=p_cliente_id;
  update public.cliente_novedades n
     set agente_id=v_agente,
         estado=p_estado,
         motivo=p_motivo,
         detalle=p_detalle,
         prioridad=p_prioridad,
         metadata=coalesce(p_metadata,'{}'::jsonb),
         updated_at=now()
   where n.cliente_id=p_cliente_id
     and n.origen='AUTOMATICA'
     and n.origen_clave=p_clave
     and n.abierta=true;
  if not found then
    insert into public.cliente_novedades(cliente_id,agente_id,estado,motivo,detalle,origen,origen_clave,prioridad,metadata)
    values(p_cliente_id,v_agente,p_estado,p_motivo,p_detalle,'AUTOMATICA',p_clave,p_prioridad,coalesce(p_metadata,'{}'::jsonb));
  end if;
end;
$$;

create or replace function public.novedad_auto_resolver(p_cliente_id uuid,p_clave text,p_resultado text default 'RESUELTO_AUTOMATICAMENTE')
returns void
language sql
security definer
set search_path=public,pg_temp
as $$
  update public.cliente_novedades
     set abierta=false, estado='RESUELTO', resultado=p_resultado, resuelto_at=now(), resuelto_por='SISTEMA', updated_at=now()
   where cliente_id=p_cliente_id and origen='AUTOMATICA' and origen_clave=p_clave and abierta=true;
$$;

create or replace function public.novedades_sync_automaticas_core()
returns jsonb
language plpgsql
security definer
set search_path=public,extensions,pg_temp
as $$
declare
  v_c record;
  v_f record;
  v_credito numeric;
  v_total numeric;
  v_pagado numeric;
  v_saldo numeric;
  v_saldo_atrasado numeric;
  v_meses int;
  v_periodos text[];
  v_hoy date := (now() at time zone 'America/Santo_Domingo')::date;
  v_corte_periodo text;
  v_detalle text;
  v_proc int := 0;
  v_riesgo int := 0;
begin
  if extract(day from v_hoy) < 20 then
    v_corte_periodo := to_char((v_hoy - interval '1 month')::date,'YYYY-MM');
  else
    v_corte_periodo := to_char(v_hoy,'YYYY-MM');
  end if;

  for v_c in select c.* from public.clientes c loop
    if v_c.activo is distinct from false and v_c.estado_cliente='EN_PROCESO' then
      v_detalle := nullif(trim(concat_ws(' · ',
        nullif(v_c.motivo_proceso,''),
        case when jsonb_typeof(v_c.pendientes_proceso)='array' then
          nullif((select string_agg(x,', ') from jsonb_array_elements_text(v_c.pendientes_proceso) x),'')
        else null end,
        nullif(v_c.otro_pendiente_detalle,''),
        nullif(v_c.nota_proceso,'')
      )), '');
      perform public.novedad_auto_upsert(v_c.id,'proceso_actual','EN_GESTION','Cliente en gestión',v_detalle,coalesce(v_c.prioridad_proceso,'MEDIA'),jsonb_build_object('fuente','clientes.estado_cliente'));
      v_proc := v_proc+1;
    else
      perform public.novedad_auto_resolver(v_c.id,'proceso_actual','YA_NO_ESTA_EN_PROCESO');
    end if;

    if v_c.activo is distinct from false then
      v_credito := coalesce(v_c.pagado,0);
      v_saldo_atrasado := 0;
      v_meses := 0;
      v_periodos := '{}'::text[];
      for v_f in
        select f.periodo,f.prima_base,f.prima_deps
          from public.facturas f
         where f.cliente_id=v_c.id and f.estado is distinct from 'Anulada'
         order by f.periodo asc
      loop
        v_total := coalesce(v_f.prima_base,0)+coalesce(v_f.prima_deps,0);
        v_pagado := least(v_credito,v_total);
        v_saldo := greatest(0,v_total-v_pagado);
        v_credito := greatest(0,v_credito-v_pagado);
        if v_f.periodo <= v_corte_periodo and v_saldo > 0.009 then
          v_saldo_atrasado := v_saldo_atrasado+v_saldo;
          v_meses := v_meses+1;
          v_periodos := array_append(v_periodos,v_f.periodo);
        end if;
      end loop;
      if v_saldo_atrasado > 0.009 then
        perform public.novedad_auto_upsert(
          v_c.id,'mora_fifo','EN_RIESGO','Seguimiento por falta de pago',
          concat(v_meses,' período',case when v_meses=1 then '' else 's' end,' pendiente',case when v_meses=1 then '' else 's' end,' · RD$ ',to_char(v_saldo_atrasado,'FM999G999G999G990D00')),
          case when v_meses>=2 then 'ALTA' else 'MEDIA' end,
          jsonb_build_object('monto',v_saldo_atrasado,'meses',v_meses,'periodos',to_jsonb(v_periodos),'corte_periodo',v_corte_periodo)
        );
        v_riesgo := v_riesgo+1;
      else
        perform public.novedad_auto_resolver(v_c.id,'mora_fifo','MORA_RESUELTA');
      end if;
    else
      perform public.novedad_auto_resolver(v_c.id,'mora_fifo','CLIENTE_INACTIVO');
    end if;
  end loop;

  return jsonb_build_object('ok',true,'corte_periodo',v_corte_periodo,'en_gestion',v_proc,'en_riesgo',v_riesgo,'ts',now());
end;
$$;

create or replace function public.novedades_sync_automaticas()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if public.mi_rol() is null
     or public.mi_organizacion() is distinct from (select id from public.organizaciones where slug='nexus-pro') then
    raise exception 'No autorizado';
  end if;
  return public.novedades_sync_automaticas_core();
end;
$$;

grant execute on function public.novedades_sync_automaticas() to authenticated;

select public.novedades_sync_automaticas_core();

do $$
begin
  if not exists(select 1 from cron.job where jobname='novedades-sync-hourly') then
    perform cron.schedule('novedades-sync-hourly','17 * * * *','select public.novedades_sync_automaticas_core()');
  end if;
end$$;
