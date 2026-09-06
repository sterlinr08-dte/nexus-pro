-- NEXUS PRO CRM
-- Operación atómica para registrar actividad y, opcionalmente, crear tarea vinculada.
-- SECURITY INVOKER: respeta RLS de crm_actividades y crm_tareas.

create or replace function public.crm_registrar_actividad(
  p_cliente_id uuid,
  p_tipo text,
  p_titulo text,
  p_detalle text default null,
  p_resultado text default null,
  p_proxima_accion_en timestamptz default null,
  p_crear_tarea boolean default false,
  p_tarea_titulo text default null,
  p_tarea_tipo text default 'seguimiento',
  p_prioridad text default 'media',
  p_asignado_agente_id uuid default null
)
returns table(actividad_id uuid, tarea_id uuid)
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_actividad_id uuid;
  v_tarea_id uuid;
  v_titulo text;
  v_tarea_titulo text;
begin
  v_titulo := left(trim(coalesce(p_titulo,'')),160);
  if p_cliente_id is null then
    raise exception 'cliente requerido';
  end if;
  if length(v_titulo) < 2 then
    raise exception 'titulo requerido';
  end if;

  insert into public.crm_actividades(cliente_id,tipo,titulo,detalle,resultado,proxima_accion_en)
  values (
    p_cliente_id,
    p_tipo,
    v_titulo,
    nullif(trim(coalesce(p_detalle,'')),''),
    nullif(trim(coalesce(p_resultado,'')),''),
    p_proxima_accion_en
  )
  returning id into v_actividad_id;

  if p_crear_tarea then
    v_tarea_titulo := left(trim(coalesce(p_tarea_titulo,'Seguimiento: '||v_titulo)),160);
    if length(v_tarea_titulo) < 2 then
      raise exception 'titulo de tarea requerido';
    end if;

    insert into public.crm_tareas(cliente_id,actividad_id,titulo,tipo,prioridad,vence_en,asignado_agente_id)
    values (
      p_cliente_id,
      v_actividad_id,
      v_tarea_titulo,
      coalesce(p_tarea_tipo,'seguimiento'),
      coalesce(p_prioridad,'media'),
      p_proxima_accion_en,
      p_asignado_agente_id
    )
    returning id into v_tarea_id;
  end if;

  actividad_id := v_actividad_id;
  tarea_id := v_tarea_id;
  return next;
end;
$$;

revoke execute on function public.crm_registrar_actividad(uuid,text,text,text,text,timestamptz,boolean,text,text,text,uuid) from public;
revoke execute on function public.crm_registrar_actividad(uuid,text,text,text,text,timestamptz,boolean,text,text,text,uuid) from anon;
grant execute on function public.crm_registrar_actividad(uuid,text,text,text,text,timestamptz,boolean,text,text,text,uuid) to authenticated;
