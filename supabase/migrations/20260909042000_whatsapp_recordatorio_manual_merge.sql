-- FUSIÓN de dos cambios simultáneos sobre whatsapp_recordatorio_manual (2026-09-09).
--
-- Dos sesiones reescribieron esta función con minutos de diferencia y la segunda pisó a la primera:
--   · 20260909035000_whatsapp_centro_automatizaciones.sql cambió la llamada a
--     whatsapp_notificar_evento_BASE, para que apagar la automatización de atrasos NO apague
--     también el botón manual del Buzón (una acción manual de un agente sobre un cliente concreto
--     no debería depender de un interruptor pensado para el cron).
--   · 20260909041000_whatsapp_optout.sql agregó la guarda de "este cliente pidió no recibir
--     WhatsApp".
--
-- El opt-out se aplicó de último, así que quedó viva una versión con la guarda PERO llamando otra
-- vez a whatsapp_notificar_evento (el que sí tiene el gate de automatización) -- reintroduciendo
-- en silencio la regresión que la otra sesión acababa de arreglar. Confirmado en vivo con
-- pg_get_functiondef antes y después. Esta migración deja las DOS cosas.
--
-- Lección para la próxima: `create or replace function` no avisa de nada cuando pisa el trabajo de
-- otro. Antes de reemplazar una función que no escribiste tú en esta misma sesión, comparar contra
-- la definición viva.

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
  v_optout timestamptz;
begin
  if mi_rol() is null then raise exception 'no autorizado'; end if;
  select id into v_org from public.organizaciones where slug='nexus-pro';
  if mi_organizacion() <> v_org then raise exception 'no autorizado'; end if;

  select pagado, whatsapp_optout_en into v_pagado, v_optout from public.clientes where id=p_cliente_id;
  if not found then raise exception 'cliente no encontrado'; end if;

  -- Opt-out: se avisa con excepción y no con un "no pasó nada", porque el agente está mirando la
  -- conversación en pantalla y tiene que enterarse de por qué no se mandó.
  if v_optout is not null then
    raise exception 'este cliente pidió no recibir mensajes de WhatsApp (%). Quítale la marca desde el Buzón si te autorizó de nuevo.', to_char(v_optout, 'DD/MM/YYYY');
  end if;

  if extract(day from now()) < 20 then
    v_mes := extract(month from now())::int - 1;
    v_anio := extract(year from now())::int;
    if v_mes < 1 then v_mes := 12; v_anio := v_anio - 1; end if;
  else
    v_mes := extract(month from now())::int;
    v_anio := extract(year from now())::int;
  end if;
  v_hoy_key := v_anio::text || '-' || lpad(v_mes::text,2,'0');
  v_credito := coalesce(v_pagado,0);

  for v_factura in
    select f.id,f.periodo,f.prima_base,f.prima_deps
    from public.facturas f
    where f.cliente_id=p_cliente_id and f.estado is distinct from 'Anulada'
    order by f.periodo asc
  loop
    v_tot := coalesce(v_factura.prima_base,0)+coalesce(v_factura.prima_deps,0);
    v_pay := least(v_credito,v_tot);
    v_saldo := greatest(0,v_tot-v_pay);
    v_credito := v_credito-v_pay;
    if v_factura.periodo < v_hoy_key and v_saldo > 0.009 then
      v_saldo_total := v_saldo_total+v_saldo;
      v_meses_atrasados := v_meses_atrasados+1;
      if v_primera_atrasada_id is null then v_primera_atrasada_id := v_factura.id; end if;
    end if;
  end loop;

  if v_saldo_total <= 0.009 then raise exception 'este cliente no tiene saldo atrasado'; end if;

  -- _base a propósito: ver la nota de arriba.
  perform public.whatsapp_notificar_evento_base(
    'atrasado',p_cliente_id,v_primera_atrasada_id,
    jsonb_build_object('monto',v_saldo_total,'meses',v_meses_atrasados)
  );

  return jsonb_build_object('ok',true,'monto',v_saldo_total,'meses',v_meses_atrasados);
end;
$$;

revoke all on function public.whatsapp_recordatorio_manual(uuid) from public, anon;
grant execute on function public.whatsapp_recordatorio_manual(uuid) to authenticated;
