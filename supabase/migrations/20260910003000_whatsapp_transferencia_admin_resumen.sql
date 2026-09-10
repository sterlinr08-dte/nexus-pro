-- NEXUS PRO Seguros · Fase B — completar el requisito del administrador
--
-- CLAUDE.md pide TRES destinatarios al confirmarse una transferencia entre agentes:
--   "Administrador: informar si no es participante; si es receptor/emisor, evitar mensaje
--    administrativo duplicado."
--
-- La Fase B implementó los avisos al emisor y al receptor (y con eso resolvió bien la segunda
-- mitad: cuando el admin es participante ya recibe su mensaje y no se le duplica). Faltaba la
-- primera mitad: si el administrador NO participa, hoy no se entera de nada.
--
-- Hoy el caso no ocurre porque solo hay 2 agentes y ESTERLIN (admin) siempre es uno de los dos.
-- Se abre en cuanto exista un tercer agente y dos agentes no-admin se transfieran entre sí.
--
-- Esta migración NO toca la matemática de custodia ni ninguna tabla financiera.

alter table public.whatsapp_mensajes drop constraint if exists whatsapp_mensajes_tipo_check;
alter table public.whatsapp_mensajes add constraint whatsapp_mensajes_tipo_check check (
  tipo in (
    'factura_generada','atrasado','pago_aplicado','entrega_confirmada',
    'pago_pendiente_validacion','pago_validado_resumen','recordatorio_pago_pendiente',
    'transferencia_confirmada_emisor','transferencia_recibida','transferencia_admin_resumen'
  )
);

insert into public.whatsapp_automatizaciones
  (organizacion_id,codigo,nombre,descripcion,plantilla_nombre,activo,orden)
select id,'transferencia_admin_resumen','Transferencia entre agentes (aviso al administrador)',
       'Cuando se confirma una transferencia entre dos agentes en la que el administrador no participa, le avisa quién transfirió, cuánto y a quién. Si el administrador es el emisor o el receptor no se envía, para no duplicarle el mensaje que ya recibe como participante.',
       'transferencia_admin_resumen',true,28
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
  v_admin record;
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
      v_saldo_desde := public.seguros_acumulado_validado_agente(v_desde);
      v_saldo_hacia := public.seguros_acumulado_validado_agente(v_hacia);
      perform public.whatsapp_notificar_pago_agente(
        'transferencia_confirmada_emisor',v_desde,new.id,
        jsonb_build_object('monto',new.monto,'destino',coalesce(v_destino,'Agente'),'acumulado',coalesce(v_saldo_desde,0))
      );
      perform public.whatsapp_notificar_pago_agente(
        'transferencia_recibida',v_hacia,new.id,
        jsonb_build_object('origen',coalesce(v_origen,'Agente'),'monto',new.monto,'acumulado',coalesce(v_saldo_hacia,0))
      );
      -- Aviso administrativo SOLO a los administradores que no son parte de la transferencia.
      -- Se recorren todos (no se asume que haya uno solo) y se excluye a emisor y receptor, que
      -- ya recibieron el suyo arriba.
      for v_admin in
        select a.id, a.nom
          from public.agentes a
         where lower(coalesce(a.cargo,''))='admin'
           and coalesce(a.activo,true)
           and a.id is distinct from v_desde
           and a.id is distinct from v_hacia
      loop
        perform public.whatsapp_notificar_pago_agente(
          'transferencia_admin_resumen',v_admin.id,new.id,
          jsonb_build_object('origen',coalesce(v_origen,'Agente'),'monto',new.monto,'destino',coalesce(v_destino,'Agente'))
        );
      end loop;
    end if;
  exception when others then
    raise warning 'trg_whatsapp_transferencia_aceptada fallo (transferencia % no se vio afectada): %',new.id,sqlerrm;
  end;
  return new;
end;
$$;
