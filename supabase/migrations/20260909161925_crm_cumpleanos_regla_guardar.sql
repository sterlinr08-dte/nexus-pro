-- NEXUS PRO Seguros — permitir el disparador cumpleaños en el RPC de guardado.
-- Aplicada en producción el 2026-09-09 como crm_cumpleanos_regla_guardar.

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
set search_path to 'public'
as $function$
declare v_org uuid; v_id uuid;
begin
  if mi_rol() <> 'admin' then raise exception 'no autorizado'; end if;
  select id into v_org from public.organizaciones where slug='nexus-pro';
  if mi_organizacion() <> v_org then raise exception 'no autorizado'; end if;
  if nullif(trim(p_nombre),'') is null then raise exception 'nombre requerido'; end if;
  if p_trigger_tipo not in (
    'documentos_pendientes','cotizacion_sin_cerrar','sin_respuesta_whatsapp',
    'seguimiento_vencido','poliza_riesgo','proceso_sin_movimiento','cumpleanos'
  ) then raise exception 'disparador invalido'; end if;
  if p_accion_tipo not in ('crear_tarea','whatsapp_plantilla') then raise exception 'accion invalida'; end if;
  if coalesce(p_trigger_dias,0)<0 or p_trigger_dias>365 then raise exception 'dias invalidos'; end if;
  if coalesce(p_repetir_dias,0)<0 or p_repetir_dias>365 then raise exception 'repeticion invalida'; end if;

  if p_id is null then
    insert into public.whatsapp_reglas_custom(
      organizacion_id,nombre,activo,trigger_tipo,trigger_dias,
      accion_tipo,accion_config,repetir_dias,creado_por
    )
    values(
      v_org,trim(p_nombre),coalesce(p_activo,true),p_trigger_tipo,
      coalesce(p_trigger_dias,0),p_accion_tipo,
      coalesce(p_accion_config,'{}'::jsonb),coalesce(p_repetir_dias,0),auth.uid()
    ) returning id into v_id;
  else
    update public.whatsapp_reglas_custom set
      nombre=trim(p_nombre),
      activo=coalesce(p_activo,true),
      trigger_tipo=p_trigger_tipo,
      trigger_dias=coalesce(p_trigger_dias,0),
      accion_tipo=p_accion_tipo,
      accion_config=coalesce(p_accion_config,'{}'::jsonb),
      repetir_dias=coalesce(p_repetir_dias,0),
      updated_at=now()
    where id=p_id and organizacion_id=v_org
    returning id into v_id;
    if v_id is null then raise exception 'regla no encontrada'; end if;
  end if;

  return v_id;
end;$function$;
