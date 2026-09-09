-- NEXUS PRO · Reglas inteligentes: Cuando X -> hacer Y
-- Automatizaciones configurables basadas solo en datos reales del sistema.
-- El evaluador se ejecuta cada hora y deduplica por huella de condición.

create table if not exists public.whatsapp_reglas_custom (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id),
  nombre text not null,
  activo boolean not null default true,
  trigger_tipo text not null check (trigger_tipo in (
    'documentos_pendientes','cotizacion_sin_cerrar','sin_respuesta_whatsapp',
    'seguimiento_vencido','poliza_riesgo','proceso_sin_movimiento'
  )),
  trigger_dias integer not null default 3 check (trigger_dias between 0 and 365),
  accion_tipo text not null check (accion_tipo in ('crear_tarea','whatsapp_plantilla')),
  accion_config jsonb not null default '{}'::jsonb,
  repetir_dias integer not null default 0 check (repetir_dias between 0 and 365),
  creado_por uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whatsapp_reglas_custom_activo_idx
  on public.whatsapp_reglas_custom (organizacion_id, activo, trigger_tipo);

create table if not exists public.whatsapp_reglas_ejecuciones (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id),
  regla_id uuid not null references public.whatsapp_reglas_custom(id) on delete cascade,
  cliente_id uuid references public.clientes(id),
  entidad_id uuid,
  huella text not null,
  accion_tipo text not null,
  estado text not null check (estado in ('ok','error','omitido')),
  detalle text,
  contexto jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_reglas_ejecuciones_dedupe_idx
  on public.whatsapp_reglas_ejecuciones (regla_id, huella, created_at desc);
create index if not exists whatsapp_reglas_ejecuciones_cliente_idx
  on public.whatsapp_reglas_ejecuciones (cliente_id, created_at desc);

alter table public.whatsapp_reglas_custom enable row level security;
alter table public.whatsapp_reglas_ejecuciones enable row level security;

revoke all on public.whatsapp_reglas_custom from anon, authenticated;
revoke all on public.whatsapp_reglas_ejecuciones from anon, authenticated;

-- CRUD admin por RPC: evita que el navegador pueda escribir reglas arbitrariamente.
create or replace function public.whatsapp_reglas_custom_listar()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_result jsonb;
begin
  if mi_rol() <> 'admin' then raise exception 'no autorizado'; end if;
  select id into v_org from public.organizaciones where slug='nexus-pro';
  if mi_organizacion() <> v_org then raise exception 'no autorizado'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'nombre', r.nombre,
    'activo', r.activo,
    'trigger_tipo', r.trigger_tipo,
    'trigger_dias', r.trigger_dias,
    'accion_tipo', r.accion_tipo,
    'accion_config', r.accion_config,
    'repetir_dias', r.repetir_dias,
    'created_at', r.created_at,
    'ultimo_estado', x.estado,
    'ultimo_detalle', x.detalle,
    'ultimo_en', x.created_at
  ) order by r.created_at desc), '[]'::jsonb)
  into v_result
  from public.whatsapp_reglas_custom r
  left join lateral (
    select e.estado,e.detalle,e.created_at
    from public.whatsapp_reglas_ejecuciones e
    where e.regla_id=r.id
    order by e.created_at desc limit 1
  ) x on true
  where r.organizacion_id=v_org;

  return v_result;
end;
$$;

create or replace function public.whatsapp_reglas_custom_guardar(
  p_id uuid,
  p_nombre text,
  p_activo boolean,
  p_trigger_tipo text,
  p_trigger_dias integer,
  p_accion_tipo text,
  p_accion_config jsonb,
  p_repetir_dias integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_id uuid;
begin
  if mi_rol() <> 'admin' then raise exception 'no autorizado'; end if;
  select id into v_org from public.organizaciones where slug='nexus-pro';
  if mi_organizacion() <> v_org then raise exception 'no autorizado'; end if;

  if nullif(trim(p_nombre),'') is null then raise exception 'nombre requerido'; end if;
  if p_trigger_tipo not in ('documentos_pendientes','cotizacion_sin_cerrar','sin_respuesta_whatsapp','seguimiento_vencido','poliza_riesgo','proceso_sin_movimiento') then
    raise exception 'disparador invalido';
  end if;
  if p_accion_tipo not in ('crear_tarea','whatsapp_plantilla') then raise exception 'accion invalida'; end if;
  if coalesce(p_trigger_dias,0) < 0 or p_trigger_dias > 365 then raise exception 'dias invalidos'; end if;
  if coalesce(p_repetir_dias,0) < 0 or p_repetir_dias > 365 then raise exception 'repeticion invalida'; end if;

  if p_id is null then
    insert into public.whatsapp_reglas_custom(
      organizacion_id,nombre,activo,trigger_tipo,trigger_dias,accion_tipo,accion_config,repetir_dias,creado_por
    ) values (
      v_org,trim(p_nombre),coalesce(p_activo,true),p_trigger_tipo,coalesce(p_trigger_dias,0),p_accion_tipo,coalesce(p_accion_config,'{}'::jsonb),coalesce(p_repetir_dias,0),auth.uid()
    ) returning id into v_id;
  else
    update public.whatsapp_reglas_custom set
      nombre=trim(p_nombre), activo=coalesce(p_activo,true), trigger_tipo=p_trigger_tipo,
      trigger_dias=coalesce(p_trigger_dias,0), accion_tipo=p_accion_tipo,
      accion_config=coalesce(p_accion_config,'{}'::jsonb), repetir_dias=coalesce(p_repetir_dias,0), updated_at=now()
    where id=p_id and organizacion_id=v_org
    returning id into v_id;
    if v_id is null then raise exception 'regla no encontrada'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.whatsapp_reglas_custom_eliminar(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  if mi_rol() <> 'admin' then raise exception 'no autorizado'; end if;
  select id into v_org from public.organizaciones where slug='nexus-pro';
  if mi_organizacion() <> v_org then raise exception 'no autorizado'; end if;
  delete from public.whatsapp_reglas_custom where id=p_id and organizacion_id=v_org;
  return found;
end;
$$;

revoke all on function public.whatsapp_reglas_custom_listar() from public, anon;
revoke all on function public.whatsapp_reglas_custom_guardar(uuid,text,boolean,text,integer,text,jsonb,integer) from public, anon;
revoke all on function public.whatsapp_reglas_custom_eliminar(uuid) from public, anon;
grant execute on function public.whatsapp_reglas_custom_listar() to authenticated;
grant execute on function public.whatsapp_reglas_custom_guardar(uuid,text,boolean,text,integer,text,jsonb,integer) to authenticated;
grant execute on function public.whatsapp_reglas_custom_eliminar(uuid) to authenticated;

-- Candidatos reales para el motor server-side. No queda expuesto a usuarios.
create or replace function public.whatsapp_regla_candidatos(p_trigger_tipo text, p_dias integer)
returns table(cliente_id uuid, entidad_id uuid, huella text, contexto jsonb)
language plpgsql
security definer
set search_path = public
as $$
begin
  p_dias := greatest(0, least(coalesce(p_dias,0),365));

  if p_trigger_tipo='documentos_pendientes' then
    return query
    select c.id, d.id,
      c.id::text||':doc:'||d.id::text,
      jsonb_build_object(
        'tipo','documentos_pendientes',
        'cantidad',(select count(*) from public.documentos_clientes d2 where d2.cliente_id=c.id and lower(coalesce(d2.estado,''))='pendiente'),
        'desde',d.created_at,
        'documento_tipo',d.tipo
      )
    from public.clientes c
    join lateral (
      select d1.id,d1.created_at,d1.tipo
      from public.documentos_clientes d1
      where d1.cliente_id=c.id
        and lower(coalesce(d1.estado,''))='pendiente'
        and d1.created_at <= now()-make_interval(days=>p_dias)
      order by d1.created_at asc limit 1
    ) d on true
    where c.activo is distinct from false;
    return;
  end if;

  if p_trigger_tipo='cotizacion_sin_cerrar' then
    return query
    select c.id,q.id,
      q.id::text,
      jsonb_build_object('tipo','cotizacion_sin_cerrar','numero',q.numero,'total',q.total,'fecha',q.fecha,'estado',q.estado)
    from public.pos_cotizaciones q
    join public.clientes c on c.id=q.cliente_id
    where lower(coalesce(q.estado,''))='vigente'
      and q.created_at <= now()-make_interval(days=>p_dias)
      and c.activo is distinct from false;
    return;
  end if;

  if p_trigger_tipo='sin_respuesta_whatsapp' then
    return query
    select c.id,h.id,
      h.id::text||':out:'||coalesce(h.ultima_respuesta_humana_at::text,''),
      jsonb_build_object('tipo','sin_respuesta_whatsapp','ultimo_envio',h.ultima_respuesta_humana_at,'ultimo_cliente',h.ultimo_inbound_at)
    from public.whatsapp_hilos h
    join public.clientes c on c.id=h.cliente_id
    where h.ultima_respuesta_humana_at is not null
      and h.ultima_respuesta_humana_at <= now()-make_interval(days=>p_dias)
      and (h.ultimo_inbound_at is null or h.ultimo_inbound_at < h.ultima_respuesta_humana_at)
      and c.activo is distinct from false;
    return;
  end if;

  if p_trigger_tipo='seguimiento_vencido' then
    return query
    select c.id,c.id,
      c.id::text||':seg:'||left(c.fecha_seguimiento,10),
      jsonb_build_object('tipo','seguimiento_vencido','fecha_seguimiento',c.fecha_seguimiento,'responsable',c.responsable_seguimiento,'prioridad',c.prioridad_proceso)
    from public.clientes c
    where c.activo is distinct from false
      and c.fecha_seguimiento is not null
      and c.fecha_seguimiento ~ '^\d{4}-\d{2}-\d{2}'
      and left(c.fecha_seguimiento,10)::date <= current_date-p_dias;
    return;
  end if;

  if p_trigger_tipo='poliza_riesgo' then
    return query
    select c.id,c.id,
      c.id::text||':fin:'||c.fecha_fin::date::text,
      jsonb_build_object('tipo','poliza_riesgo','fecha_fin',c.fecha_fin,'numero_poliza',c.numero_poliza,'ars',c.ars,'plan',c.plan)
    from public.clientes c
    where c.activo is distinct from false
      and c.fecha_fin is not null
      and c.fecha_fin::date between current_date and current_date+p_dias;
    return;
  end if;

  if p_trigger_tipo='proceso_sin_movimiento' then
    return query
    select c.id,c.id,
      c.id::text||':proc:'||coalesce(c.updated_at,c.created_at)::date::text,
      jsonb_build_object('tipo','proceso_sin_movimiento','motivo',c.motivo_proceso,'prioridad',c.prioridad_proceso,'progreso',c.porcentaje_progreso,'ultima_actualizacion',coalesce(c.updated_at,c.created_at))
    from public.clientes c
    where c.activo is distinct from false
      and lower(coalesce(c.estado_cliente,'')) in ('en proceso','proceso','pendiente')
      and coalesce(c.updated_at,c.created_at) <= now()-make_interval(days=>p_dias);
    return;
  end if;
end;
$$;

revoke all on function public.whatsapp_regla_candidatos(text,integer) from public, anon, authenticated;
grant execute on function public.whatsapp_regla_candidatos(text,integer) to service_role;

-- Wrapper para cron -> Edge Function. La clave de Zernio nunca pasa por SQL ni frontend.
create or replace function public.whatsapp_reglas_custom_disparar()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name='whatsapp_internal_secret';
  perform net.http_post(
    url := 'https://tnwsgcxurfyuszxsewsn.supabase.co/functions/v1/whatsapp-automatizaciones-run',
    headers := jsonb_build_object('Content-Type','application/json','X-Internal-Secret',coalesce(v_secret,'')),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
end;
$$;
revoke all on function public.whatsapp_reglas_custom_disparar() from public, anon, authenticated;

-- Cada hora. El motor deduplica; esta frecuencia permite reaccionar sin repetir acciones.
do $$
begin
  if not exists(select 1 from cron.job where jobname='whatsapp-reglas-custom-hourly') then
    perform cron.schedule('whatsapp-reglas-custom-hourly','17 * * * *',$q$select public.whatsapp_reglas_custom_disparar()$q$);
  end if;
end $$;
