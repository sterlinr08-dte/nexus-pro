-- NEXUS PRO Seguros
-- Corrección: el trigger de pago validado con desglose por ciclo solo disparaba
-- en UPDATE (pendiente→validado). Cuando el admin aplica un pago que entra
-- directamente como 'validado' (sin pasar por pendiente), el trigger no disparaba
-- y no se enviaba el WhatsApp con el desglose por ciclo.
--
-- Cambios:
--   1. El trigger ahora dispara en INSERT y UPDATE.
--   2. La función maneja ambos casos:
--      - INSERT con validacion_estado='validado' → dispara.
--      - UPDATE de pendiente→validado → dispara (como antes).
--   3. Si el agente cobrador ES el administrador, igual recibe el mensaje
--      de agente con desglose por ciclo (antes se excluía del admin, pero
--      tampoco recibía el de agente porque no había transición).

-- 1) Recrear la función con soporte para INSERT
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
  v_es_insert boolean;
  v_debe_disparar boolean;
begin
  begin
    v_es_insert := (TG_OP = 'INSERT');

    -- Determinar si debe disparar
    if v_es_insert then
      v_debe_disparar := (new.validacion_estado = 'validado'
                          and new.estado is distinct from 'Reversado'
                          and coalesce(new.monto,0) > 0);
    else
      v_debe_disparar := (old.validacion_estado = 'pendiente'
                          and new.validacion_estado = 'validado'
                          and new.estado is distinct from 'Reversado'
                          and coalesce(new.monto,0) > 0);
    end if;

    if v_debe_disparar then

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
  'NEXUS PRO: al validar pago (INSERT directo o UPDATE pendiente→validado), avisa al agente con desglose ciclo actual/anterior y al admin con la misma info.';

-- 2) Reemplazar el trigger: ahora dispara en INSERT y UPDATE
drop trigger if exists trg_whatsapp_pago_validado on public.abonos;

create trigger trg_whatsapp_pago_validado
after insert or update of validacion_estado on public.abonos
for each row execute function public.trg_whatsapp_pago_validado();
