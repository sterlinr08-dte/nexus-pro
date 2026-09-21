-- NEXUS PRO Seguros
-- Corrección: la notificación admin decía "El agente ROBINSON validó un pago"
-- cuando en realidad fue ESTERLIN (u otro usuario) quien lo registró/validó.
--
-- Cambio: usar validado_por_agente_id para identificar quién realmente
-- validó el pago en la notificación admin. El acumulado por ciclo sigue
-- atribuido a agente_cobro (agente responsable del cliente).

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
  v_validador_id uuid;
  v_validador_nom text;
  v_ciclo_cobrado numeric;
  v_ciclo_anterior numeric;
  v_admin record;
  v_es_insert boolean;
  v_debe_disparar boolean;
begin
  begin
    v_es_insert := (TG_OP = 'INSERT');

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

      begin v_agente := nullif(new.agente_cobro,'')::uuid; exception when others then v_agente := null; end;
      if v_agente is not null then
        select nom into v_agente_nom from public.agentes where id=v_agente;
        select nom into v_cliente_nom from public.clientes where id=new.cliente_id;

        -- Quién realmente validó/registró el pago
        v_validador_id := coalesce(new.validado_por_agente_id, v_agente);
        if v_validador_id is distinct from v_agente then
          select nom into v_validador_nom from public.agentes where id=v_validador_id;
        else
          v_validador_nom := v_agente_nom;
        end if;
        v_validador_nom := coalesce(v_validador_nom, v_agente_nom, 'Agente');

        declare
          v_now timestamp := (now() at time zone 'America/Santo_Domingo')::timestamp;
          v_periodo_ciclo text;
        begin
          if extract(day from v_now) >= 20 then
            v_periodo_ciclo := to_char(v_now, 'YYYY-MM');
          else
            v_periodo_ciclo := to_char(v_now - interval '1 month', 'YYYY-MM');
          end if;

          select r.cobrado_validado, r.saldo_inicial
            into v_ciclo_cobrado, v_ciclo_anterior
          from public.seguros_resumen_ciclo_agente_core(v_agente, v_periodo_ciclo) r;

          perform public.whatsapp_notificar_pago_agente(
            'pago_validado_agente_ciclo', v_agente, new.id,
            jsonb_build_object(
              'monto', new.monto,
              'cliente', coalesce(v_cliente_nom,'Cliente'),
              'acumulado_ciclo', coalesce(v_ciclo_cobrado,0),
              'acumulado_anterior', coalesce(v_ciclo_anterior,0)
            )
          );

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
                'agente_nombre', coalesce(v_validador_nom,'Agente'),
                'monto', new.monto,
                'cliente', coalesce(v_cliente_nom,'Cliente'),
                'acumulado_ciclo', coalesce(v_ciclo_cobrado,0),
                'acumulado_anterior', coalesce(v_ciclo_anterior,0)
              )
            );
          end loop;

        exception when others then
          raise warning 'trg_whatsapp_pago_validado: error calculando ciclo para agente %: %', v_agente, sqlerrm;
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
  'NEXUS PRO: al validar pago, usa validado_por_agente_id para atribuir correctamente quién validó. Acumulados siguen atribuidos a agente_cobro.';
