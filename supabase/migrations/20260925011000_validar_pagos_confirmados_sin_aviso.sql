-- 2026-09-25 · Corrección de datos AUTORIZADA por el dueño («Validarlos sin mensajes»): 9 pagos por transferencia /
-- depósito (15–23 sep 2026) cuya entrega directa ya estaba CONFIRMADA pero el pago seguía 'pendiente' de validar
-- (causa: ver 20260925010000_confirmar_entrega_valida_pago.sql). Se marcan validados con la fecha real en que se
-- confirmó cada entrega, SIN aviso de WhatsApp (se apaga solo trg_whatsapp_pago_validado dentro de la transacción y se
-- vuelve a encender). Deja rastro en auditoria. Aborta si no son exactamente 9 o si se encola algún aviso.
-- Aplicada como migración `validar_pagos_confirmados_sin_aviso_20260925`. NO volver a ejecutar.
do $$
declare n int; q0 bigint; q1 bigint;
begin
  select count(*) into q0 from net.http_request_queue;
  alter table public.abonos disable trigger trg_whatsapp_pago_validado;

  with obj as (
    select a.id abono_id, e.id entrega_id, e.agente_id, e.confirmado_at, e.confirmado_por
      from public.abonos a
      join public.entregas_admin e on e.abono_id = a.id and e.es_directo and not coalesce(e.anulado,false) and e.confirmado
     where a.validacion_estado = 'pendiente'
       and coalesce(a.estado,'') <> 'Reversado'
       and a.metodo in ('Transferencia','Depósito')
       and a.created_at >= '2026-09-15' and a.created_at < '2026-09-24'
  ), upd as (
    update public.abonos a
       set validacion_estado = 'validado',
           validado_at = o.confirmado_at,
           validado_por_agente_id = o.agente_id,
           validacion_nota = 'Validado el 25-sep-2026 por corrección: la entrega directa ya estaba confirmada ('
                             || to_char(o.confirmado_at at time zone 'America/Santo_Domingo','DD/MM/YYYY HH24:MI') || ', ' || coalesce(o.confirmado_por,'admin')
                             || '). Sin aviso por WhatsApp por decisión del dueño.'
      from obj o
     where a.id = o.abono_id
    returning a.id, o.entrega_id
  )
  insert into public.auditoria(usuario, rol, accion, detalle, modulo, entity_table, entity_id)
  select 'Claude (corrección autorizada)', 'admin', 'PAGO_VALIDADO',
         'Pago ' || u.id || ' validado sin aviso: su entrega directa ' || u.entrega_id || ' ya estaba confirmada (bitácora 2026-09-25-0110-claude)',
         'Seguros', 'abonos', u.id::text
    from upd u;
  get diagnostics n = row_count;

  alter table public.abonos enable trigger trg_whatsapp_pago_validado;
  select count(*) into q1 from net.http_request_queue;
  if n <> 9 then raise exception 'Se esperaban 9 pagos y hay %; no se aplica nada', n; end if;
  if q1 <> q0 then raise exception 'Se encoló algún aviso de WhatsApp; no se aplica nada'; end if;
end $$;
