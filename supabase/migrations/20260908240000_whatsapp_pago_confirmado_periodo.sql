-- NEXUS PRO · La confirmación de pago por WhatsApp ahora dice A QUÉ PERÍODO corresponde
--
-- Auditoría pedida por el dueño (8-sep-2026): "cuando le doy a cobrar, que al cliente se le mande
-- el pago con relación al período" (corte 20-al-20: 20-ago a 20-sep = período de agosto, etc).
-- Hallazgo: trg_whatsapp_pago_aplicado (dispara el evento 'pago_aplicado' -> plantilla
-- pago_confirmado) SOLO mandaba [nombre, monto, saldo_actual] -- nunca mencionaba ningún período.
-- No fue un descuido trivial de arreglar: un abono no está atado 1 a 1 a una factura -- se
-- reparte en orden de período MÁS VIEJO a más nuevo (mismo criterio que _saldoFacturasCliente en
-- el frontend y whatsapp_detectar_atrasados/whatsapp_recordatorio_manual del lado del servidor),
-- así que "el período de ESTE abono" hay que calcularlo comparando el reparto ANTES y DESPUÉS del
-- pago, no leerlo de una sola columna.
--
-- seguros_registrar_cobro ya actualiza clientes.pagado ANTES de insertar la fila en abonos (mismo
-- orden dentro de la misma transacción), así que en el trigger (AFTER INSERT en abonos)
-- clientes.pagado YA es el valor POST-pago -- pagado_antes = pagado_actual - new.monto.
--
-- Pagos a "deuda anterior" (bolsa separada, ver REGLAMENTO §9 punto 3) no tocan ninguna factura,
-- así que no tienen período que reportar -- se detectan por abonos.tipo='deuda_anterior' y se
-- excluyen del cálculo (la plantilla los sigue notificando, solo sin mencionar período).

create or replace function public.seguros_meses_cubiertos_por_abono(
  p_cliente_id uuid, p_pagado_antes numeric, p_pagado_despues numeric
) returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_factura record;
  v_credito_antes numeric := greatest(0, coalesce(p_pagado_antes, 0));
  v_credito_despues numeric := greatest(0, coalesce(p_pagado_despues, 0));
  v_tot numeric;
  v_saldo_antes numeric;
  v_saldo_despues numeric;
  v_pagados text[] := '{}';
  v_meses text[] := array['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  v_primer_abierto text := null;
begin
  for v_factura in
    select f.periodo, f.mes, f.anio, coalesce(f.prima_base,0)+coalesce(f.prima_deps,0) as tot
    from public.facturas f
    where f.cliente_id = p_cliente_id and f.estado is distinct from 'Anulada'
    order by f.periodo asc
  loop
    v_tot := v_factura.tot;
    v_saldo_antes := greatest(0, v_tot - least(v_credito_antes, v_tot));
    v_saldo_despues := greatest(0, v_tot - least(v_credito_despues, v_tot));
    v_credito_antes := v_credito_antes - least(v_credito_antes, v_tot);
    v_credito_despues := v_credito_despues - least(v_credito_despues, v_tot);

    -- Este período pasó de "algo pendiente" a "saldado del todo" GRACIAS a este pago -> se reporta.
    if v_saldo_antes > 0.009 and v_saldo_despues <= 0.009 then
      v_pagados := array_append(v_pagados, initcap(v_meses[v_factura.mes::int]) || ' ' || v_factura.anio::text);
    end if;
    -- El período más viejo que TODAVÍA queda con saldo tras este pago (para el caso "no alcanzó
    -- a cubrir ningún mes completo, pero sí es un abono real a cuenta de X").
    if v_saldo_despues > 0.009 and v_primer_abierto is null then
      v_primer_abierto := initcap(v_meses[v_factura.mes::int]) || ' ' || v_factura.anio::text;
    end if;
  end loop;

  if array_length(v_pagados, 1) > 0 then
    return array_to_string(v_pagados, ' y ');
  elsif v_primer_abierto is not null then
    return 'abono a cuenta de ' || v_primer_abierto;
  else
    return 'su cuenta';
  end if;
end;
$$;

revoke all on function public.seguros_meses_cubiertos_por_abono(uuid, numeric, numeric) from public, anon, authenticated;

-- trg_whatsapp_pago_aplicado: agrega el 4to dato (período) al evento, solo cuando el abono fue a
-- facturas (no a deuda_anterior, que no tiene período que reportar).
create or replace function public.trg_whatsapp_pago_aplicado()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_saldo numeric;
  v_periodo text;
  v_pagado_actual numeric;
begin
  begin
    if new.estado is distinct from 'Reversado' and coalesce(new.monto, 0) > 0 then
      select greatest(0, coalesce(deuda_total, 0) - coalesce(pagado, 0)) + greatest(0, coalesce(deuda_anterior, 0)),
             coalesce(pagado, 0)
        into v_saldo, v_pagado_actual
        from public.clientes where id = new.cliente_id;

      if new.tipo is distinct from 'deuda_anterior' then
        v_periodo := public.seguros_meses_cubiertos_por_abono(new.cliente_id, v_pagado_actual - new.monto, v_pagado_actual);
      else
        v_periodo := null;
      end if;

      perform public.whatsapp_notificar_evento(
        'pago_aplicado', new.cliente_id, new.id,
        jsonb_build_object('monto', new.monto, 'saldo_actual', coalesce(v_saldo, 0), 'periodo', v_periodo)
      );
    end if;
  exception when others then
    raise warning 'trg_whatsapp_pago_aplicado fallo (abono % no se vio afectado): %', new.id, sqlerrm;
  end;
  return new;
end;
$$;
