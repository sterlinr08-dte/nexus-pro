-- NEXUS PRO Seguros
-- Notificación de pago validado con acumulados separados por ciclo + aviso al administrador.
--
-- El dueño pidió que al validar un pago:
--   1. El agente reciba WhatsApp con cobrado ESTE ciclo y acumulado de ciclos ANTERIORES.
--   2. El administrador reciba la misma información sobre ese agente.
--
-- Se usan dos plantillas nuevas:
--   - pago_validado_agente_ciclo (agente)
--   - pago_validado_admin_ciclo  (administrador)
--
-- La plantilla anterior (pago_validado_resumen_agente) se conserva como referencia
-- pero el trigger deja de usarla para este flujo.

-- 1) Ampliar el CHECK de tipos permitidos en whatsapp_mensajes.
alter table public.whatsapp_mensajes drop constraint if exists whatsapp_mensajes_tipo_check;
alter table public.whatsapp_mensajes add constraint whatsapp_mensajes_tipo_check check (
  tipo in (
    'factura_generada','atrasado','pago_aplicado','entrega_confirmada',
    'pago_pendiente_validacion','pago_validado_resumen','recordatorio_pago_pendiente',
    'transferencia_confirmada_emisor','transferencia_recibida','transferencia_admin_resumen',
    'cierre_ciclo_fallido','resumen_ciclo_agente','reporte_diario_agente',
    'pago_validado_agente_ciclo','pago_validado_admin_ciclo'
  )
);

-- 2) Registrar las automatizaciones nuevas.
insert into public.whatsapp_automatizaciones
  (organizacion_id,codigo,nombre,descripcion,plantilla_nombre,activo,orden)
select id,
  'pago_validado_agente_ciclo',
  'Pago validado — agente (con ciclo)',
  'Al validar un pago, avisa al agente cuánto cobró en este ciclo y cuánto trae de ciclos anteriores.',
  'pago_validado_agente_ciclo',true,30
from public.organizaciones where slug='nexus-pro'
on conflict (organizacion_id,codigo) do update set
  nombre=excluded.nombre,descripcion=excluded.descripcion,plantilla_nombre=excluded.plantilla_nombre;

insert into public.whatsapp_automatizaciones
  (organizacion_id,codigo,nombre,descripcion,plantilla_nombre,activo,orden)
select id,
  'pago_validado_admin_ciclo',
  'Pago validado — aviso al administrador',
  'Al validar un pago, avisa al administrador el acumulado del agente en este ciclo y de ciclos anteriores.',
  'pago_validado_admin_ciclo',true,31
from public.organizaciones where slug='nexus-pro'
on conflict (organizacion_id,codigo) do update set
  nombre=excluded.nombre,descripcion=excluded.descripcion,plantilla_nombre=excluded.plantilla_nombre;

-- 3) Trigger actualizado: al validar pago, enviar con desglose de ciclo + notificar admin.
create or replace function public.trg_whatsapp_pago_validado()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_saldo numeric;
  v_periodo text;
  v_pagado_actual numeric;
  v_agente uuid;
  v_cliente_nom text;
  v_agente_nom text;
  v_ciclo_cobrado numeric;
  v_ciclo_anterior numeric;
  v_admin record;
begin
  begin
    if old.validacion_estado='pendiente'
       and new.validacion_estado='validado'
       and new.estado is distinct from 'Reversado'
       and coalesce(new.monto,0)>0 then

      -- Notificación al cliente (existente, no se toca).
      select greatest(0,coalesce(deuda_total,0)-coalesce(pagado,0))+greatest(0,coalesce(deuda_anterior,0)),
             coalesce(pagado,0)
        into v_saldo,v_pagado_actual
        from public.clientes where id=new.cliente_id;
      if new.tipo is distinct from 'deuda_anterior' then
        v_periodo := public.seguros_meses_cubiertos_por_abono(new.cliente_id,v_pagado_actual-new.monto,v_pagado_actual);
      else
        v_periodo := null;
      end if;
      perform public.whatsapp_notificar_evento(
        'pago_aplicado',new.cliente_id,new.id,
        jsonb_build_object('monto',new.monto,'saldo_actual',coalesce(v_saldo,0),'periodo',v_periodo)
      );

      -- Notificación al agente y al administrador con desglose por ciclo.
      begin v_agente := nullif(new.agente_cobro,'')::uuid; exception when others then v_agente := null; end;
      if v_agente is not null then
        select nom into v_agente_nom from public.agentes where id=v_agente;
        select nom into v_cliente_nom from public.clientes where id=new.cliente_id;

        -- Determinar periodo vigente (ciclo 20->20, America/Santo_Domingo).
        declare
          v_now timestamp := (now() at time zone 'America/Santo_Domingo')::timestamp;
          v_periodo_ciclo text;
        begin
          if extract(day from v_now) >= 20 then
            v_periodo_ciclo := to_char(v_now, 'YYYY-MM');
          else
            v_periodo_ciclo := to_char(v_now - interval '1 month', 'YYYY-MM');
          end if;

          -- Obtener cobrado en el ciclo actual y saldo inicial (acumulado anterior).
          select r.cobrado_validado, r.saldo_inicial
            into v_ciclo_cobrado, v_ciclo_anterior
          from public.seguros_resumen_ciclo_agente_core(v_agente, v_periodo_ciclo) r;

          -- Enviar al agente: desglose por ciclo.
          perform public.whatsapp_notificar_pago_agente(
            'pago_validado_agente_ciclo', v_agente, new.id,
            jsonb_build_object(
              'monto', new.monto,
              'cliente', coalesce(v_cliente_nom,'Cliente'),
              'acumulado_ciclo', coalesce(v_ciclo_cobrado,0),
              'acumulado_anterior', coalesce(v_ciclo_anterior,0)
            )
          );

          -- Enviar al administrador (solo a admins que NO son el agente cobrador).
          for v_admin in
            select a.id, a.nom
              from public.agentes a
             where lower(coalesce(a.cargo,''))='admin'
               and coalesce(a.activo,true)
               and a.id is distinct from v_agente
          loop
            perform public.whatsapp_notificar_pago_agente(
              'pago_validado_admin_ciclo', v_admin.id, new.id,
              jsonb_build_object(
                'agente_nombre', coalesce(v_agente_nom,'Agente'),
                'monto', new.monto,
                'cliente', coalesce(v_cliente_nom,'Cliente'),
                'acumulado_ciclo', coalesce(v_ciclo_cobrado,0),
                'acumulado_anterior', coalesce(v_ciclo_anterior,0)
              )
            );
          end loop;

        exception when others then
          raise warning 'trg_whatsapp_pago_validado: error calculando ciclo para agente %: %', v_agente, sqlerrm;
          -- Fallback: enviar plantilla antigua con acumulado total.
          declare v_acum numeric;
          begin
            v_acum := public.seguros_acumulado_validado_agente(v_agente);
            perform public.whatsapp_notificar_pago_agente(
              'pago_validado_resumen', v_agente, new.id,
              jsonb_build_object('monto', new.monto, 'acumulado', coalesce(v_acum,0))
            );
          end;
        end;
      end if;
    end if;
  exception when others then
    raise warning 'trg_whatsapp_pago_validado fallo (abono % no se vio afectado): %',new.id,sqlerrm;
  end;
  return new;
end;
$$;

comment on function public.trg_whatsapp_pago_validado() is
  'NEXUS PRO: al validar pago, avisa al agente con desglose ciclo actual/anterior y al admin con la misma info.';
