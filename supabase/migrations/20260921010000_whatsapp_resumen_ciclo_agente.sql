-- NEXUS PRO Seguros · Notificación de resumen de ciclo cerrado a agentes
--
-- Cuando el cierre automático del día 20 se completa con éxito, envía a cada
-- agente un WhatsApp con el resumen del ciclo cerrado, el ciclo anterior (si
-- existe) y el saldo inicial del nuevo ciclo.
--
-- Plantilla: resumen_ciclo_agente (ya aprobada por Meta en Zernio).
-- Edge Function: whatsapp-resumen-ciclo-agentes (nueva).

-- 1) Agregar tipo al constraint de whatsapp_mensajes
alter table public.whatsapp_mensajes drop constraint if exists whatsapp_mensajes_tipo_check;
alter table public.whatsapp_mensajes add constraint whatsapp_mensajes_tipo_check check (
  tipo in (
    'factura_generada','atrasado','pago_aplicado','entrega_confirmada',
    'pago_pendiente_validacion','pago_validado_resumen','recordatorio_pago_pendiente',
    'transferencia_confirmada_emisor','transferencia_recibida','transferencia_admin_resumen',
    'cierre_ciclo_fallido','resumen_ciclo_agente','reporte_diario_agente'
  )
);

-- 2) Registrar automatización
insert into public.whatsapp_automatizaciones
  (organizacion_id,codigo,nombre,descripcion,plantilla_nombre,activo,orden)
select id,'resumen_ciclo_agente',
       'Resumen de ciclo cerrado para agentes',
       'Tras el cierre automático del día 20, envía a cada agente un resumen con lo cobrado, entregado, transferido, recibido y saldo final del ciclo cerrado, junto con los datos del ciclo anterior y el saldo inicial del nuevo ciclo.',
       'resumen_ciclo_agente',true,30
from public.organizaciones where slug='nexus-pro'
on conflict (organizacion_id,codigo) do update set
  nombre=excluded.nombre,
  descripcion=excluded.descripcion,
  plantilla_nombre=excluded.plantilla_nombre;

-- 3) Función interna para disparar la Edge Function del resumen
create or replace function public.whatsapp_enviar_resumen_ciclo(p_periodo text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_token text;
begin
  if not public.whatsapp_automatizacion_activa('resumen_ciclo_agente') then return; end if;
  select valor into v_token from public.cron_secretos where nombre='reporte_whatsapp';
  if v_token is null then
    raise warning 'resumen_ciclo: no se encontró cron_secretos.reporte_whatsapp';
    return;
  end if;
  perform net.http_post(
    url := 'https://tnwsgcxurfyuszxsewsn.supabase.co/functions/v1/whatsapp-resumen-ciclo-agentes',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-cron-token', v_token
    ),
    body := jsonb_build_object('periodo', p_periodo),
    timeout_milliseconds := 30000
  );
end;
$$;
revoke all on function public.whatsapp_enviar_resumen_ciclo(text) from public, anon, authenticated;

-- 4) Actualizar seguros_cerrar_ciclo_automatico para enviar resumen tras éxito
create or replace function public.seguros_cerrar_ciclo_automatico()
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_periodo text;
  v_cierre uuid;
  v_error text;
  v_admin record;
begin
  v_periodo := to_char((now() at time zone 'America/Santo_Domingo') - interval '1 month','YYYY-MM');

  begin
    v_cierre := public.seguros_cerrar_ciclo_core(v_periodo,'automatico',null);
  exception when others then
    v_error := sqlerrm;
  end;

  if v_error is null then
    insert into public.auditoria(usuario, rol, accion, detalle, modulo, entity_table, entity_id, new_data)
    values ('sistema','automatico','CIERRE_CICLO_OK',
      'Ciclo '||v_periodo||' cerrado automáticamente',
      'Seguros','seguros_cierres_ciclo', v_cierre::text,
      jsonb_build_object('periodo',v_periodo,'cierre_id',v_cierre)::text);

    -- Enviar resumen de ciclo a agentes por WhatsApp
    begin
      perform public.whatsapp_enviar_resumen_ciclo(v_periodo);
    exception when others then
      raise warning 'cierre %: resumen WhatsApp no se pudo disparar: %', v_periodo, sqlerrm;
    end;

    return v_cierre;
  end if;

  insert into public.auditoria(usuario, rol, accion, detalle, modulo, entity_table, new_data)
  values ('sistema','automatico','CIERRE_CICLO_FALLIDO',
    'El cierre automático del ciclo '||v_periodo||' no se completó: '||v_error,
    'Seguros','seguros_cierres_ciclo',
    jsonb_build_object('periodo',v_periodo,'error',v_error)::text);

  begin
    for v_admin in
      select a.id
        from public.agentes a
       where lower(coalesce(a.cargo,''))='admin'
         and coalesce(a.activo,true)
    loop
      perform public.whatsapp_notificar_pago_agente(
        'cierre_ciclo_fallido', v_admin.id, null,
        jsonb_build_object('periodo',v_periodo,'motivo',left(v_error,110)));
    end loop;
  exception when others then
    raise warning 'cierre %: no se pudo avisar por WhatsApp (el fallo si quedo en auditoria): %',
      v_periodo, sqlerrm;
  end;

  return null;
end;
$$;

revoke all on function public.seguros_cerrar_ciclo_automatico() from public, anon, authenticated;

comment on function public.seguros_cerrar_ciclo_automatico() is
  'Fase C NEXUS PRO: cierre del dia 20 por cron. Registra en auditoria, avisa al admin si falla, y envia resumen de ciclo a agentes si tiene exito.';
