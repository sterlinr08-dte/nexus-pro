-- Deja de duplicar el aviso de WhatsApp cuando un agente registra un pago que entra a SU
-- PROPIA cuenta (no cruzado), 2026-09-16.
--
-- El dueño reportó: "me están llegando dos informes si yo registro un pago" y pidió que sea 1
-- informe en el caso normal (pago propio) y 2 solo en el caso cruzado (pago que entra a la
-- cuenta de OTRO agente).
--
-- Causa raíz, confirmada leyendo el código en vivo antes de tocar nada: un pago bancario que
-- nace 'validado' (siempre no-cruzado, por la regla de 2026-09-10 "la validación bancaria solo
-- para pagos cruzados") dispara DOS avisos al mismo agente para el mismo evento:
--   1. trg_whatsapp_pago_aplicado(), en el INSERT del abono → 'pago_validado_resumen'
--   2. trg_whatsapp_entrega_confirmada(), en el INSERT de la entrega directa que
--      seguros_registrar_cobro_con_entrega() crea a continuación, en la MISMA transacción →
--      'entrega_confirmada'
-- Ambos le llegan al mismo agente (agente_cobro == entregas_admin.agente_id, porque no es
-- cruzado) sobre el mismo pago. El caso cruzado no tiene este problema: nace 'pendiente', esta
-- rama nunca se ejecuta, y el resumen posterior lo manda trg_whatsapp_pago_validado() en el
-- UPDATE de validación (a un agente distinto, en otro momento) — ese camino no se toca aquí.
--
-- Elección del dueño entre los dos avisos duplicados: se queda 'entrega_confirmada' (usa el
-- saldo de custodia disponible del marco de transferencias/custodia, no el acumulado bruto
-- validado) y se quita el bloque de 'pago_validado_resumen' de trg_whatsapp_pago_aplicado()
-- para el caso que nace ya validado.
--
-- Verificado antes de escribir esto: 76 pagos no-cruzados nacidos 'validado' en los últimos 30
-- días — el problema es real y frecuente, no un caso raro.
--
-- Idempotente: CREATE OR REPLACE. Reaplicar esto no cambia nada si ya está aplicado.

create or replace function public.trg_whatsapp_pago_aplicado()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_saldo numeric;
  v_periodo text;
  v_pagado_actual numeric;
  v_agente uuid;
  v_destino uuid;
  v_cliente_nom text;
begin
  begin
    if new.estado is distinct from 'Reversado' and coalesce(new.monto,0)>0 then
      if new.metodo in ('Transferencia','Depósito') and new.validacion_estado='pendiente' then
        begin v_agente := nullif(new.agente_cobro,'')::uuid; exception when others then v_agente := null; end;

        -- Aquí la entrega directa todavía no existe (se crea después, en esta misma
        -- transacción), así que la cuenta destino llega por la variable local que fija
        -- seguros_registrar_cobro_con_entrega. Sin ella, se avisa al cobrador como antes.
        begin
          v_destino := nullif(current_setting('nexus.cobro_cuenta_destino', true),'')::uuid;
        exception when others then
          v_destino := null;
        end;
        v_destino := coalesce(v_destino, v_agente);

        select nom into v_cliente_nom from public.clientes where id=new.cliente_id;
        if v_destino is not null then
          perform public.whatsapp_notificar_pago_agente(
            'pago_pendiente_validacion',v_destino,new.id,
            jsonb_build_object(
              'monto',new.monto,
              'cliente',coalesce(v_cliente_nom,'Cliente'),
              'metodo',new.metodo,
              'banco',coalesce(new.banco,'—'),
              'referencia',coalesce(new.referencia,'—')
            )
          );
        end if;
        return new;
      end if;

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

      -- 2026-09-16: se quitó de aquí el aviso 'pago_validado_resumen' para el pago que nace ya
      -- validado (no cruzado) — trg_whatsapp_entrega_confirmada() ya manda 'entrega_confirmada'
      -- al mismo agente por la entrega directa que se crea a continuación en esta misma
      -- transacción, y llegaban dos avisos por el mismo pago. Ver bitácora 2026-09-16 para el
      -- detalle completo. El caso cruzado no se toca: nace 'pendiente' y nunca llega aquí.
    end if;
  exception when others then
    raise warning 'trg_whatsapp_pago_aplicado fallo (abono % no se vio afectado): %',new.id,sqlerrm;
  end;
  return new;
end;
$function$;
