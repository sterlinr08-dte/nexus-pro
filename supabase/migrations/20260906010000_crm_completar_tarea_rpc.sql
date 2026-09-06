-- NEXUS PRO CRM
-- Operacion atomica para completar una tarea y registrar la nota de cierre
-- vinculada en una sola transaccion. Mismo motivo que crm_registrar_actividad:
-- antes el frontend hacia PATCH crm_tareas + POST crm_actividades como dos
-- llamadas sueltas -- si la segunda fallaba, la tarea quedaba completada en
-- la base de datos pero sin nota de cierre, y la UI (que corta en el catch
-- antes de refrescar) mostraba "no se pudo completar" aunque si se completo.
-- SECURITY INVOKER: respeta RLS de crm_tareas y crm_actividades tal como
-- esten definidas hoy o en el futuro (si se restringen por agente, esta
-- funcion hereda esa restriccion automaticamente, sin cambios).

create or replace function public.crm_completar_tarea(
  p_tarea_id uuid
)
returns table(tarea_id uuid, actividad_id uuid)
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_tarea public.crm_tareas%rowtype;
  v_actividad_id uuid;
begin
  select * into v_tarea from public.crm_tareas where id = p_tarea_id;
  if v_tarea.id is null then
    raise exception 'tarea no encontrada';
  end if;

  -- Idempotente: si ya estaba completada (doble toque, reintento de red),
  -- no se vuelve a insertar la nota de cierre ni se pisa completada_en.
  if v_tarea.estado = 'completada' then
    tarea_id := v_tarea.id;
    actividad_id := null;
    return next;
    return;
  end if;

  update public.crm_tareas
    set estado = 'completada',
        completada_en = now(),
        updated_at = now()
    where id = p_tarea_id;

  insert into public.crm_actividades(cliente_id, tipo, titulo)
  values (
    v_tarea.cliente_id,
    'nota',
    left('Tarea completada: ' || coalesce(v_tarea.titulo, ''), 160)
  )
  returning id into v_actividad_id;

  tarea_id := v_tarea.id;
  actividad_id := v_actividad_id;
  return next;
end;
$$;

revoke execute on function public.crm_completar_tarea(uuid) from public;
revoke execute on function public.crm_completar_tarea(uuid) from anon;
grant execute on function public.crm_completar_tarea(uuid) to authenticated;
