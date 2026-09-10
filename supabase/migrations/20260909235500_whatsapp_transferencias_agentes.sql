-- NEXUS PRO Seguros · Fase B
-- Notificaciones WhatsApp al confirmar transferencias entre agentes.
-- Una transferencia NO es un cobro nuevo: solo mueve custodia.

alter table public.whatsapp_mensajes drop constraint if exists whatsapp_mensajes_tipo_check;
alter table public.whatsapp_mensajes add constraint whatsapp_mensajes_tipo_check check (
  tipo in (
    'factura_generada','atrasado','pago_aplicado','entrega_confirmada',
    'pago_pendiente_validacion','pago_validado_resumen','recordatorio_pago_pendiente',
    'transferencia_confirmada_emisor','transferencia_recibida'
  )
);

insert into public.whatsapp_automatizaciones
  (organizacion_id,codigo,nombre,descripcion,plantilla_nombre,activo,orden)
select id,'transferencia_confirmada_emisor','Transferencia confirmada al emisor',
       'Cuando una transferencia entre agentes pasa de pendiente a aceptada, confirma al agente emisor el monto, el receptor y su acumulado actualizado.',
       'transferencia_confirmada_emisor',true,26
from public.organizaciones where slug='nexus-pro'
on conflict (organizacion_id,codigo) do update set
  nombre=excluded.nombre,
  descripcion=excluded.descripcion,
  plantilla_nombre=excluded.plantilla_nombre;

insert into public.whatsapp_automatizaciones
  (organizacion_id,codigo,nombre,descripcion,plantilla_nombre,activo,orden)
select id,'transferencia_recibida','Transferencia recibida',
       'Cuando una transferencia entre agentes pasa de pendiente a aceptada, avisa al receptor quién transfirió, el monto y su acumulado actualizado.',
       'transferencia_recibida',true,27
from public.organizaciones where slug='nexus-pro'
on conflict (organizacion_id,codigo) do update set
  nombre=excluded.nombre,
  descripcion=excluded.descripcion,
  plantilla_nombre=excluded.plantilla_nombre;

create or replace function public.trg_whatsapp_transferencia_aceptada()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_desde uuid;
  v_hacia uuid;
  v_origen text;
  v_destino text;
  v_saldo_desde numeric;
  v_saldo_hacia numeric;
begin
  begin
    if old.estado is distinct from 'aceptada' and new.estado='aceptada' then
      begin
        v_desde := nullif(new.desde_agente,'')::uuid;
        v_hacia := nullif(new.hacia_agente,'')::uuid;
      exception when others then
        raise warning 'trg_whatsapp_transferencia_aceptada: ids de agente inválidos en transferencia %',new.id;
        return new;
      end;

      select nom into v_origen from public.agentes where id=v_desde;
      select nom into v_destino from public.agentes where id=v_hacia;

      -- Se calcula DESPUÉS de que la transferencia ya quedó aceptada, por eso ambos
      -- saldos incluyen el movimiento exactamente una vez.
      v_saldo_desde := public.seguros_acumulado_validado_agente(v_desde);
      v_saldo_hacia := public.seguros_acumulado_validado_agente(v_hacia);

      perform public.whatsapp_notificar_pago_agente(
        'transferencia_confirmada_emisor',
        v_desde,
        new.id,
        jsonb_build_object(
          'monto',new.monto,
          'destino',coalesce(v_destino,'Agente'),
          'acumulado',coalesce(v_saldo_desde,0)
        )
      );

      perform public.whatsapp_notificar_pago_agente(
        'transferencia_recibida',
        v_hacia,
        new.id,
        jsonb_build_object(
          'origen',coalesce(v_origen,'Agente'),
          'monto',new.monto,
          'acumulado',coalesce(v_saldo_hacia,0)
        )
      );
    end if;
  exception when others then
    -- WhatsApp nunca puede revertir una transferencia financiera ya aceptada.
    raise warning 'trg_whatsapp_transferencia_aceptada fallo (transferencia % no se vio afectada): %',new.id,sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.trg_whatsapp_transferencia_aceptada() from public, anon, authenticated;

drop trigger if exists trg_whatsapp_transferencia_aceptada on public.transferencias_agentes;
create trigger trg_whatsapp_transferencia_aceptada
after update of estado on public.transferencias_agentes
for each row
when (old.estado is distinct from new.estado)
execute function public.trg_whatsapp_transferencia_aceptada();

comment on function public.trg_whatsapp_transferencia_aceptada() is
  'Fase B NEXUS PRO: al aceptar una transferencia notifica por WhatsApp a emisor y receptor con sus saldos de custodia actualizados; cualquier fallo de WhatsApp no revierte el movimiento financiero.';
