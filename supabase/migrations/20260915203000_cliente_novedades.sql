-- Módulo "Novedades" de Clientes — reconciliación de esquema, 2026-09-16.
--
-- Estos objetos ya existían en Supabase de producción desde el 15-sep (diseñados en
-- docs/bitacora/2026-09-15-2002-chatgpt.md, activados en el frontend por los commits
-- b24e69e/869a731/71536ec), pero se aplicaron directo contra la base sin dejar una migración
-- en el repositorio. Esta migración reconstruye exactamente lo que ya está en producción
-- (columnas, constraints, índices, RLS, triggers y permisos verificados en vivo el 2026-09-16),
-- para que el esquema quede reproducible. Todo el SQL es idempotente a propósito: correrlo de
-- nuevo contra producción no cambia nada.
--
-- Qué hace el módulo: registra "novedades" operativas por cliente (activaciones pendientes,
-- gestión en curso, riesgo de baja por mora, retiro pendiente de confirmar), manuales o
-- generadas automáticamente por novedades_sync_automaticas(). No reemplaza la contabilidad:
-- no toca deuda_total, pagado, ni estado_cliente. El retiro ("POR_RETIRAR") es siempre una
-- sugerencia que exige confirmación humana en otra parte del sistema — nunca cancela nada solo.

create table if not exists public.cliente_novedades (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  agente_id uuid references public.agentes(id) on delete set null,
  estado text not null check (estado in ('POR_ACTIVAR','EN_GESTION','EN_RIESGO','POR_RETIRAR','RESUELTO')),
  motivo text not null,
  detalle text,
  origen text not null default 'MANUAL' check (origen in ('MANUAL','AUTOMATICA')),
  -- Identifica de forma estable CUÁL regla automática generó la novedad (p.ej. 'proceso_actual',
  -- 'mora_fifo'), para poder actualizarla/resolverla sin duplicar cuando la condición cambia.
  -- Solo tiene sentido en origen='AUTOMATICA'; en 'MANUAL' queda null.
  origen_clave text,
  prioridad text not null default 'MEDIA' check (prioridad in ('BAJA','MEDIA','ALTA')),
  abierta boolean not null default true,
  fecha_inicio timestamptz not null default now(),
  fecha_seguimiento date,
  resultado text,
  resuelto_at timestamptz,
  resuelto_por text,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

comment on table public.cliente_novedades is
  'Novedades operativas por cliente (activación, gestión, riesgo de baja, retiro). No es contabilidad: nunca toca clientes.deuda_total/pagado/estado_cliente directamente.';

create index if not exists idx_cliente_novedades_abiertas
  on public.cliente_novedades using btree (abierta, estado, fecha_inicio desc);
create index if not exists idx_cliente_novedades_cliente
  on public.cliente_novedades using btree (cliente_id, created_at desc);
create index if not exists idx_cliente_novedades_agente
  on public.cliente_novedades using btree (agente_id, abierta, estado);

-- Evita que novedad_auto_upsert() duplique la MISMA novedad automática (mismo cliente + misma
-- regla) mientras siga abierta; sí permite que exista otra vez una vez resuelta y reabierta.
create unique index if not exists uq_cliente_novedad_auto_abierta
  on public.cliente_novedades using btree (cliente_id, origen_clave)
  where (origen = 'AUTOMATICA' and abierta = true and origen_clave is not null);

-- Mismo patrón de la tabla clientes: privilegios de tabla abiertos a anon/authenticated y la
-- restricción real la hace la política de RLS de abajo, no el GRANT.
grant select, insert, update, delete on public.cliente_novedades to anon, authenticated;

alter table public.cliente_novedades enable row level security;

drop policy if exists all_cliente_novedades on public.cliente_novedades;
create policy all_cliente_novedades on public.cliente_novedades
  for all
  to authenticated
  using (
    mi_rol() is not null
    and mi_organizacion() = (select id from public.organizaciones where slug = 'nexus-pro')
  )
  with check (
    mi_rol() is not null
    and mi_organizacion() = (select id from public.organizaciones where slug = 'nexus-pro')
  );

-- updated_at siempre al tocar la fila; resuelto_at se fija solo al cerrar (abierta true->false)
-- y se limpia si una novedad resuelta se reabre.
create or replace function public.cliente_novedades_touch()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
begin
  new.updated_at := now();
  if new.abierta = false and old.abierta = true and new.resuelto_at is null then
    new.resuelto_at := now();
  end if;
  if new.abierta = true then
    new.resuelto_at := null;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_cliente_novedades_touch on public.cliente_novedades;
create trigger trg_cliente_novedades_touch
  before update on public.cliente_novedades
  for each row execute function public.cliente_novedades_touch();

-- ─────────────────────────────────────────────────────────────────────────────
-- Sincronización automática: recorre clientes, genera/actualiza/resuelve las novedades de tipo
-- 'proceso_actual' (estado_cliente='EN_PROCESO') y 'mora_fifo' (mismo criterio FIFO por período
-- que ya usa whatsapp_detectar_atrasados(), para no inventar una segunda definición de atraso).
-- No toca clientes ni facturas: solo lee de ahí y escribe en cliente_novedades.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.novedad_auto_upsert(
  p_cliente_id uuid, p_clave text, p_estado text, p_motivo text,
  p_detalle text default null, p_prioridad text default 'MEDIA', p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_agente uuid;
begin
  select c.agente_id into v_agente from public.clientes c where c.id = p_cliente_id;
  update public.cliente_novedades n
     set agente_id = v_agente,
         estado = p_estado,
         motivo = p_motivo,
         detalle = p_detalle,
         prioridad = p_prioridad,
         metadata = coalesce(p_metadata, '{}'::jsonb),
         updated_at = now()
   where n.cliente_id = p_cliente_id
     and n.origen = 'AUTOMATICA'
     and n.origen_clave = p_clave
     and n.abierta = true;
  if not found then
    insert into public.cliente_novedades(cliente_id, agente_id, estado, motivo, detalle, origen, origen_clave, prioridad, metadata)
    values (p_cliente_id, v_agente, p_estado, p_motivo, p_detalle, 'AUTOMATICA', p_clave, p_prioridad, coalesce(p_metadata, '{}'::jsonb));
  end if;
end;
$function$;

create or replace function public.novedad_auto_resolver(
  p_cliente_id uuid, p_clave text, p_resultado text default 'RESUELTO_AUTOMATICAMENTE'
)
returns void
language sql
security definer
set search_path to 'public', 'pg_temp'
as $function$
  update public.cliente_novedades
     set abierta = false, estado = 'RESUELTO', resultado = p_resultado, resuelto_at = now(), resuelto_por = 'SISTEMA', updated_at = now()
   where cliente_id = p_cliente_id and origen = 'AUTOMATICA' and origen_clave = p_clave and abierta = true;
$function$;

create or replace function public.novedades_sync_automaticas_core()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
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
    v_corte_periodo := to_char((v_hoy - interval '1 month')::date, 'YYYY-MM');
  else
    v_corte_periodo := to_char(v_hoy, 'YYYY-MM');
  end if;

  for v_c in select c.* from public.clientes c loop
    if v_c.activo is distinct from false and v_c.estado_cliente = 'EN_PROCESO' then
      v_detalle := nullif(trim(concat_ws(' · ',
        nullif(v_c.motivo_proceso, ''),
        case when jsonb_typeof(v_c.pendientes_proceso) = 'array' then
          nullif((select string_agg(x, ', ') from jsonb_array_elements_text(v_c.pendientes_proceso) x), '')
        else null end,
        nullif(v_c.otro_pendiente_detalle, ''),
        nullif(v_c.nota_proceso, '')
      )), '');
      perform public.novedad_auto_upsert(v_c.id, 'proceso_actual', 'EN_GESTION', 'Cliente en gestión', v_detalle, coalesce(v_c.prioridad_proceso, 'MEDIA'), jsonb_build_object('fuente', 'clientes.estado_cliente'));
      v_proc := v_proc + 1;
    else
      perform public.novedad_auto_resolver(v_c.id, 'proceso_actual', 'YA_NO_ESTA_EN_PROCESO');
    end if;

    if v_c.activo is distinct from false then
      v_credito := coalesce(v_c.pagado, 0);
      v_saldo_atrasado := 0;
      v_meses := 0;
      v_periodos := '{}'::text[];
      for v_f in
        select f.periodo, f.prima_base, f.prima_deps
          from public.facturas f
         where f.cliente_id = v_c.id and f.estado is distinct from 'Anulada'
         order by f.periodo asc
      loop
        v_total := coalesce(v_f.prima_base, 0) + coalesce(v_f.prima_deps, 0);
        v_pagado := least(v_credito, v_total);
        v_saldo := greatest(0, v_total - v_pagado);
        v_credito := greatest(0, v_credito - v_pagado);
        if v_f.periodo <= v_corte_periodo and v_saldo > 0.009 then
          v_saldo_atrasado := v_saldo_atrasado + v_saldo;
          v_meses := v_meses + 1;
          v_periodos := array_append(v_periodos, v_f.periodo);
        end if;
      end loop;
      if v_saldo_atrasado > 0.009 then
        perform public.novedad_auto_upsert(
          v_c.id, 'mora_fifo', 'EN_RIESGO', 'Seguimiento por falta de pago',
          concat(v_meses, ' período', case when v_meses = 1 then '' else 's' end, ' pendiente', case when v_meses = 1 then '' else 's' end, ' · RD$ ', to_char(v_saldo_atrasado, 'FM999G999G999G990D00')),
          case when v_meses >= 2 then 'ALTA' else 'MEDIA' end,
          jsonb_build_object('monto', v_saldo_atrasado, 'meses', v_meses, 'periodos', to_jsonb(v_periodos), 'corte_periodo', v_corte_periodo)
        );
        v_riesgo := v_riesgo + 1;
      else
        perform public.novedad_auto_resolver(v_c.id, 'mora_fifo', 'MORA_RESUELTA');
      end if;
    else
      perform public.novedad_auto_resolver(v_c.id, 'mora_fifo', 'CLIENTE_INACTIVO');
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'corte_periodo', v_corte_periodo, 'en_gestion', v_proc, 'en_riesgo', v_riesgo, 'ts', now());
end;
$function$;

-- Único punto de entrada llamable desde el navegador: exige rol y organización, igual que el
-- resto del sistema. Las funciones internas de arriba quedan bloqueadas para authenticated/anon.
create or replace function public.novedades_sync_automaticas()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if public.mi_rol() is null
     or public.mi_organizacion() is distinct from (select id from public.organizaciones where slug = 'nexus-pro') then
    raise exception 'No autorizado';
  end if;
  return public.novedades_sync_automaticas_core();
end;
$function$;

revoke all on function public.novedades_sync_automaticas_core() from public, anon, authenticated;
revoke all on function public.novedad_auto_upsert(uuid, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.novedad_auto_resolver(uuid, text, text) from public, anon, authenticated;
revoke all on function public.cliente_novedades_touch() from public, anon, authenticated;

revoke all on function public.novedades_sync_automaticas() from public, anon;
grant execute on function public.novedades_sync_automaticas() to authenticated;

-- Refresco automático cada hora (independiente de que alguien abra la pestaña Novedades),
-- minuto :17 para no competir con los cron que corren en punto. jobid 14 en producción.
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'novedades-sync-hourly') then
    perform cron.schedule('novedades-sync-hourly', '17 * * * *', 'select public.novedades_sync_automaticas_core()');
  end if;
end;
$$;
