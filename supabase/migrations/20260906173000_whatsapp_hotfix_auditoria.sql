-- NEXUS PRO · Hotfix auditoria WhatsApp
-- 1) Los atrasos solo se marcan como notificados desde whatsapp-notificar cuando Zernio confirma envio.
-- 2) Indices para llaves foraneas usadas por el inbox.

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
  v_cliente record;
  v_factura record;
  v_credito numeric;
  v_tot numeric;
  v_pay numeric;
  v_saldo numeric;
  v_saldo_total numeric;
  v_meses_atrasados int;
  v_nuevas uuid[];
begin
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
    select c.id as cliente_id, c.pagado
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
      v_nuevas := array[]::uuid[];

      for v_factura in
        select f.id, f.periodo, f.prima_base, f.prima_deps, f.notificado_atraso_en
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
          if v_factura.notificado_atraso_en is null then
            v_nuevas := array_append(v_nuevas, v_factura.id);
          end if;
        end if;
      end loop;

      if array_length(v_nuevas, 1) > 0 then
        perform public.whatsapp_notificar_evento(
          'atrasado',
          v_cliente.cliente_id,
          v_nuevas[1],
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

create index if not exists whatsapp_hilos_cliente_id_idx on public.whatsapp_hilos(cliente_id);
create index if not exists whatsapp_hilos_asignado_agente_id_idx on public.whatsapp_hilos(asignado_agente_id);
create index if not exists whatsapp_hilo_mensajes_abono_id_idx on public.whatsapp_hilo_mensajes(abono_id);
create index if not exists whatsapp_hilo_mensajes_enviado_por_agente_id_idx on public.whatsapp_hilo_mensajes(enviado_por_agente_id);
create index if not exists whatsapp_hilo_mensajes_responde_a_id_idx on public.whatsapp_hilo_mensajes(responde_a_id);

-- Las funciones de trigger no son API publicas; solo deben ejecutarse por sus triggers.
revoke all on function public.trg_whatsapp_factura_generada() from public, anon, authenticated;
revoke all on function public.trg_whatsapp_pago_aplicado() from public, anon, authenticated;
