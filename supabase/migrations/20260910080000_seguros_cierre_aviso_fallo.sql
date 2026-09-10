-- NEXUS PRO Seguros · Fase C — hacer visible el resultado del cierre automático
--
-- Hueco que cierra esta migración: hoy, si el cron del día 20 falla (por la guarda de
-- reconciliación o por cualquier otra causa), la excepción muere en los logs de Postgres.
-- No hay aviso, no hay reintento, y el único síntoma visible sería que el cierre del
-- período simplemente no existe. Tratándose del cierre contable, eso no puede quedar así.
--
-- Estrategia en dos capas, a propósito:
--   1) auditoría  -> registro fiable, sin depender de nada externo. Siempre, éxito o fallo.
--   2) WhatsApp   -> el empujón para que el dueño se entere sin tener que ir a mirar.
-- Si Meta todavía no aprobó la plantilla, la capa 1 sigue cumpliendo su función.
--
-- No toca la matemática del cierre ni ninguna tabla financiera.

alter table public.whatsapp_mensajes drop constraint if exists whatsapp_mensajes_tipo_check;
alter table public.whatsapp_mensajes add constraint whatsapp_mensajes_tipo_check check (
  tipo in (
    'factura_generada','atrasado','pago_aplicado','entrega_confirmada',
    'pago_pendiente_validacion','pago_validado_resumen','recordatorio_pago_pendiente',
    'transferencia_confirmada_emisor','transferencia_recibida','transferencia_admin_resumen',
    'cierre_ciclo_fallido'
  )
);

insert into public.whatsapp_automatizaciones
  (organizacion_id,codigo,nombre,descripcion,plantilla_nombre,activo,orden)
select id,'cierre_ciclo_fallido','Cierre de ciclo fallido (aviso al administrador)',
       'Si el cierre contable automático del día 20 no se completa, avisa al administrador el período afectado y el motivo, para que pueda resolverlo antes de que el ciclo quede sin cerrar.',
       'cierre_ciclo_fallido',true,29
from public.organizaciones where slug='nexus-pro'
on conflict (organizacion_id,codigo) do update set
  nombre=excluded.nombre,
  descripcion=excluded.descripcion,
  plantilla_nombre=excluded.plantilla_nombre;

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

  -- Éxito: se deja constancia igualmente, para poder confirmar que el cron corrió
  -- (la ausencia de cierre y la ausencia de ejecución se ven distintas en la auditoría).
  if v_error is null then
    insert into public.auditoria(usuario, rol, accion, detalle, modulo, entity_table, entity_id, new_data)
    values ('sistema','automatico','CIERRE_CICLO_OK',
      'Ciclo '||v_periodo||' cerrado automáticamente',
      'Seguros','seguros_cierres_ciclo', v_cierre::text,
      jsonb_build_object('periodo',v_periodo,'cierre_id',v_cierre)::text);
    return v_cierre;
  end if;

  -- Fallo. IMPORTANTE: no se vuelve a lanzar la excepción a propósito.
  -- Si subiera, el rollback del cron se llevaría por delante este mismo registro de
  -- auditoría y el fallo volvería a ser invisible, que es justo lo que se quiere evitar.
  insert into public.auditoria(usuario, rol, accion, detalle, modulo, entity_table, new_data)
  values ('sistema','automatico','CIERRE_CICLO_FALLIDO',
    'El cierre automático del ciclo '||v_periodo||' no se completó: '||v_error,
    'Seguros','seguros_cierres_ciclo',
    jsonb_build_object('periodo',v_periodo,'error',v_error)::text);

  -- El aviso va en su propio bloque protegido: si WhatsApp falla, el registro de
  -- auditoría de arriba ya quedó guardado y el rastro no se pierde.
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
  'Fase C NEXUS PRO: cierre del dia 20 por cron. Registra en auditoria el resultado (CIERRE_CICLO_OK / CIERRE_CICLO_FALLIDO) y avisa al administrador si falla. No relanza la excepcion, para no perder el rastro por rollback.';
