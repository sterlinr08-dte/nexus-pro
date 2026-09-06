-- NEXUS PRO · Cadencia del aviso de "cliente atrasado" por WhatsApp
-- Decisión del dueño (auditoría 2026-09-06): el aviso NO debe apagarse solo una vez que se
-- marcan las facturas conocidas -- debe repetirse cada N días MIENTRAS el cliente siga
-- debiendo algo atrasado. N por ahora = 3, guardado como config (no fijo en el código) por si
-- el dueño lo quiere cambiar después sin tocar la función.
--
-- facturas.notificado_atraso_en NO se toca -- se queda como estaba (marca la PRIMERA vez que
-- una factura entró a un aviso; ya no decide si se avisa o no, whatsapp-notificar la sigue
-- llenando por si sirve de auditoría/histórico, ver marcarAtrasoNotificado en esa función).

alter table public.whatsapp_config
  add column if not exists dias_entre_avisos_atraso integer not null default 3;

alter table public.clientes
  add column if not exists ultimo_aviso_atraso_en timestamptz;

create or replace function public.whatsapp_detectar_atrasados()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
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
begin
  select coalesce(dias_entre_avisos_atraso, 3) into v_dias_cadencia
  from public.whatsapp_config where activo = true limit 1;
  if v_dias_cadencia is null or v_dias_cadencia < 1 then
    v_dias_cadencia := 3;
  end if;

  if extract(day from now()) < 20 then
    v_mes := extract(month from now())::int - 1;
    v_anio := extract(year from now())::int;
    if v_mes < 1 then
      v_mes := 12;
      v_anio := v_anio - 1;
    end if;
  else
    v_mes := extract(month from now())::int;
    v_anio := extract(year from now())::int;
  end if;
  v_hoy_key := v_anio::text || '-' || lpad(v_mes::text, 2, '0');

  for v_cliente in
    select c.id as cliente_id, c.pagado, c.ultimo_aviso_atraso_en
    from public.clientes c
    where c.activo is distinct from false
      and exists (
        select 1 from public.facturas f
        where f.cliente_id = c.id and f.estado is distinct from 'Anulada' and f.periodo < v_hoy_key
      )
  loop
    begin
      v_credito := coalesce(v_cliente.pagado, 0);
      v_saldo_total := 0;
      v_meses_atrasados := 0;
      v_primera_atrasada_id := null;

      for v_factura in
        select f.id, f.periodo, f.prima_base, f.prima_deps
        from public.facturas f
        where f.cliente_id = v_cliente.cliente_id and f.estado is distinct from 'Anulada'
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

      if v_saldo_total > 0.009
         and (
           v_cliente.ultimo_aviso_atraso_en is null
           or now() >= v_cliente.ultimo_aviso_atraso_en + make_interval(days => v_dias_cadencia)
         ) then
        perform public.whatsapp_notificar_evento(
          'atrasado',
          v_cliente.cliente_id,
          v_primera_atrasada_id,
          jsonb_build_object('monto', v_saldo_total, 'meses', v_meses_atrasados)
        );
      end if;
    exception when others then
      raise warning 'whatsapp_detectar_atrasados fallo en cliente % (se sigue con el resto): %', v_cliente.cliente_id, sqlerrm;
    end;
  end loop;
end;
$$;

revoke all on function public.whatsapp_detectar_atrasados() from public, anon, authenticated;
