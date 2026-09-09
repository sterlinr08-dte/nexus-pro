-- NEXUS PRO · WhatsApp atraso: contar el último período vencido y enviar nombres reales.
-- Regla de corte existente: antes del día 20 se considera vencido hasta el mes anterior;
-- desde el día 20, hasta el mes actual. El bug era usar '<' en vez de '<='.

create or replace function public.whatsapp_notificar_atraso_v2_base(
  p_cliente_id uuid,
  p_referencia_id uuid,
  p_datos jsonb
) returns void
language plpgsql
security definer
set search_path to 'public','extensions'
as $function$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name='whatsapp_internal_secret';

  perform net.http_post(
    url := 'https://tnwsgcxurfyuszxsewsn.supabase.co/functions/v1/whatsapp-notificar-atraso-v2',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'X-Internal-Secret',coalesce(v_secret,'')
    ),
    body := jsonb_build_object(
      'tipo','atrasado',
      'cliente_id',p_cliente_id,
      'referencia_id',p_referencia_id,
      'datos',coalesce(p_datos,'{}'::jsonb)
    ),
    timeout_milliseconds := 15000
  );
end;
$function$;

create or replace function public.whatsapp_detectar_atrasados()
returns void
language plpgsql
security definer
set search_path to 'public','extensions'
as $function$
declare
  v_mes int;
  v_anio int;
  v_hoy_key text;
  v_dias_cadencia int;
  v_cliente record;
  v_factura record;
  v_credito numeric;
  v_tot numeric;
  v_pay numeric;
  v_saldo numeric;
  v_saldo_total numeric;
  v_meses_atrasados int;
  v_primera_atrasada_id uuid;
  v_periodos_atrasados text[];
begin
  select coalesce(dias_entre_avisos_atraso,3) into v_dias_cadencia
  from public.whatsapp_config where activo=true limit 1;
  if v_dias_cadencia is null or v_dias_cadencia < 1 then v_dias_cadencia := 3; end if;

  if extract(day from now()) < 20 then
    v_mes := extract(month from now())::int - 1;
    v_anio := extract(year from now())::int;
    if v_mes < 1 then v_mes := 12; v_anio := v_anio - 1; end if;
  else
    v_mes := extract(month from now())::int;
    v_anio := extract(year from now())::int;
  end if;
  v_hoy_key := v_anio::text || '-' || lpad(v_mes::text,2,'0');

  for v_cliente in
    select c.id as cliente_id,c.pagado,c.ultimo_aviso_atraso_en
    from public.clientes c
    where c.activo is distinct from false
      and exists (
        select 1 from public.facturas f
        where f.cliente_id=c.id
          and f.estado is distinct from 'Anulada'
          and f.periodo <= v_hoy_key
      )
  loop
    begin
      v_credito := coalesce(v_cliente.pagado,0);
      v_saldo_total := 0;
      v_meses_atrasados := 0;
      v_primera_atrasada_id := null;
      v_periodos_atrasados := '{}'::text[];

      for v_factura in
        select f.id,f.periodo,f.prima_base,f.prima_deps
        from public.facturas f
        where f.cliente_id=v_cliente.cliente_id
          and f.estado is distinct from 'Anulada'
        order by f.periodo asc
      loop
        v_tot := coalesce(v_factura.prima_base,0)+coalesce(v_factura.prima_deps,0);
        v_pay := least(v_credito,v_tot);
        v_saldo := greatest(0,v_tot-v_pay);
        v_credito := v_credito-v_pay;

        if v_factura.periodo <= v_hoy_key and v_saldo > 0.009 then
          v_saldo_total := v_saldo_total+v_saldo;
          v_meses_atrasados := v_meses_atrasados+1;
          v_periodos_atrasados := array_append(v_periodos_atrasados,v_factura.periodo);
          if v_primera_atrasada_id is null then v_primera_atrasada_id := v_factura.id; end if;
        end if;
      end loop;

      if v_saldo_total > 0.009
         and public.whatsapp_automatizacion_activa('atrasado')
         and (
           v_cliente.ultimo_aviso_atraso_en is null
           or now() >= v_cliente.ultimo_aviso_atraso_en + make_interval(days=>v_dias_cadencia)
         ) then
        perform public.whatsapp_notificar_atraso_v2_base(
          v_cliente.cliente_id,
          v_primera_atrasada_id,
          jsonb_build_object(
            'monto',v_saldo_total,
            'meses',v_meses_atrasados,
            'periodos',to_jsonb(v_periodos_atrasados)
          )
        );
      end if;
    exception when others then
      raise warning 'whatsapp_detectar_atrasados fallo en cliente % (se sigue con el resto): %',v_cliente.cliente_id,sqlerrm;
    end;
  end loop;
end;
$function$;

create or replace function public.whatsapp_recordatorio_manual(p_cliente_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public','extensions'
as $function$
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
  v_periodos_atrasados text[] := '{}'::text[];
begin
  if mi_rol() is null then raise exception 'no autorizado'; end if;
  select id into v_org from public.organizaciones where slug='nexus-pro';
  if mi_organizacion() <> v_org then raise exception 'no autorizado'; end if;

  select pagado,whatsapp_optout_en into v_pagado,v_optout
  from public.clientes where id=p_cliente_id;
  if not found then raise exception 'cliente no encontrado'; end if;
  if v_optout is not null then
    raise exception 'este cliente pidió no recibir mensajes de WhatsApp (%). Quítale la marca desde el Buzón si te autorizó de nuevo.',to_char(v_optout,'DD/MM/YYYY');
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
    if v_factura.periodo <= v_hoy_key and v_saldo > 0.009 then
      v_saldo_total := v_saldo_total+v_saldo;
      v_meses_atrasados := v_meses_atrasados+1;
      v_periodos_atrasados := array_append(v_periodos_atrasados,v_factura.periodo);
      if v_primera_atrasada_id is null then v_primera_atrasada_id := v_factura.id; end if;
    end if;
  end loop;

  if v_saldo_total <= 0.009 then raise exception 'este cliente no tiene saldo atrasado'; end if;

  perform public.whatsapp_notificar_atraso_v2_base(
    p_cliente_id,
    v_primera_atrasada_id,
    jsonb_build_object(
      'monto',v_saldo_total,
      'meses',v_meses_atrasados,
      'periodos',to_jsonb(v_periodos_atrasados)
    )
  );

  return jsonb_build_object(
    'ok',true,
    'monto',v_saldo_total,
    'meses',v_meses_atrasados,
    'periodos',to_jsonb(v_periodos_atrasados)
  );
end;
$function$;
