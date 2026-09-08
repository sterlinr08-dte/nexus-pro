-- NEXUS PRO · Enviar el recordatorio de atraso de un cliente AHORA, sin esperar la cadencia
-- automatica (whatsapp_detectar_atrasados, cada dias_entre_avisos_atraso dias). Pensado para el
-- boton "Enviar recordatorio ahora" del Buzon de WhatsApp, que aparece cuando la ventana de 24h
-- de Meta esta cerrada y no hay otra forma de reabrir la conversacion con ese cliente mas que
-- mandandole una plantilla aprobada (el composer de texto libre sigue sin poder usarse hasta que
-- el cliente responda -- eso no lo cambia ninguna plantilla, es regla de Meta).
--
-- Reusa EXACTAMENTE el mismo pipeline que el envio automatico (whatsapp_notificar_evento ->
-- Edge Function whatsapp-notificar -> Zernio), asi que al tener exito actualiza
-- clientes.ultimo_aviso_atraso_en igual que un envio automatico -- esto es intencional: evita que
-- el cron de la madrugada le mande OTRO recordatorio el mismo dia que un agente ya le mando uno a
-- mano (respeta la cadencia hacia adelante, no la ignora ni la duplica).
--
-- El monto/meses de atraso se recalculan AQUI a partir de facturas reales (mismo calculo que
-- whatsapp_detectar_atrasados, pero para un solo cliente) -- nunca se reciben del navegador, para
-- que un agente no pueda inflar/inventar la cifra que le llega al cliente por WhatsApp.

create or replace function public.whatsapp_recordatorio_manual(p_cliente_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_org uuid;
  v_hoy_key text;
  v_mes int;
  v_anio int;
  v_credito numeric;
  v_tot numeric;
  v_pay numeric;
  v_saldo numeric;
  v_saldo_total numeric := 0;
  v_meses_atrasados int := 0;
  v_primera_atrasada_id uuid;
  v_factura record;
  v_pagado numeric;
begin
  if mi_rol() is null then
    raise exception 'no autorizado';
  end if;
  select id into v_org from public.organizaciones where slug = 'nexus-pro';
  if mi_organizacion() <> v_org then
    raise exception 'no autorizado';
  end if;

  select pagado into v_pagado from public.clientes where id = p_cliente_id;
  if not found then
    raise exception 'cliente no encontrado';
  end if;

  -- Mismo corte 20-al-20 que whatsapp_detectar_atrasados y mesCorte() del frontend.
  if extract(day from now()) < 20 then
    v_mes := extract(month from now())::int - 1;
    v_anio := extract(year from now())::int;
    if v_mes < 1 then v_mes := 12; v_anio := v_anio - 1; end if;
  else
    v_mes := extract(month from now())::int;
    v_anio := extract(year from now())::int;
  end if;
  v_hoy_key := v_anio::text || '-' || lpad(v_mes::text, 2, '0');

  v_credito := coalesce(v_pagado, 0);

  for v_factura in
    select f.id, f.periodo, f.prima_base, f.prima_deps
    from public.facturas f
    where f.cliente_id = p_cliente_id and f.estado is distinct from 'Anulada'
    order by f.periodo asc
  loop
    v_tot := coalesce(v_factura.prima_base, 0) + coalesce(v_factura.prima_deps, 0);
    v_pay := least(v_credito, v_tot);
    v_saldo := greatest(0, v_tot - v_pay);
    v_credito := v_credito - v_pay;

    if v_factura.periodo < v_hoy_key and v_saldo > 0.009 then
      v_saldo_total := v_saldo_total + v_saldo;
      v_meses_atrasados := v_meses_atrasados + 1;
      if v_primera_atrasada_id is null then
        v_primera_atrasada_id := v_factura.id;
      end if;
    end if;
  end loop;

  if v_saldo_total <= 0.009 then
    raise exception 'este cliente no tiene saldo atrasado';
  end if;

  perform public.whatsapp_notificar_evento(
    'atrasado',
    p_cliente_id,
    v_primera_atrasada_id,
    jsonb_build_object('monto', v_saldo_total, 'meses', v_meses_atrasados)
  );

  return jsonb_build_object('ok', true, 'monto', v_saldo_total, 'meses', v_meses_atrasados);
end;
$$;

revoke all on function public.whatsapp_recordatorio_manual(uuid) from public, anon;
grant execute on function public.whatsapp_recordatorio_manual(uuid) to authenticated;
