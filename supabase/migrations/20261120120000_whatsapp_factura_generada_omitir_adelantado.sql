-- 20-nov-2026 · Dueño: «José Natividad y algunos clientes que pagaron meses por adelantado no le puede llegar
-- notificación de factura generada; me están llamando la atención los clientes». Eligió la opción A.
--
-- Causa: trg_whatsapp_factura_generada avisaba en CADA factura nueva, sin mirar si el cliente ya la tenía pagada.
-- Arreglo: si lo pagado por el cliente cubre todas sus facturas no anuladas hasta el período de la nueva (misma regla
-- de reparto, de la más vieja a la más nueva, que usa whatsapp_detectar_atrasados), NO se manda el WhatsApp y queda
-- una fila «omitido» en whatsapp_mensajes para la trazabilidad.
-- No toca dinero, facturas, saldos ni plantillas. Solo decide si sale o no el aviso.

-- 1) Estado nuevo «omitido» en el registro de mensajes.
alter table public.whatsapp_mensajes drop constraint if exists whatsapp_mensajes_estado_check;
alter table public.whatsapp_mensajes add constraint whatsapp_mensajes_estado_check
  check (estado = any (array['enviado'::text, 'error'::text, 'sin_configurar'::text, 'omitido'::text]));

-- 2) ¿La factura ya está cubierta por lo pagado?
create or replace function public.whatsapp_factura_cubierta(p_cliente_id uuid, p_factura_id uuid, p_periodo text, p_monto numeric)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce((
    select coalesce(sum(coalesce(f.prima_base,0) + coalesce(f.prima_deps,0)), 0)
    from public.facturas f
    where f.cliente_id = p_cliente_id
      and f.estado is distinct from 'Anulada'
      and f.periodo <= p_periodo
      and f.id is distinct from p_factura_id
  ), 0) + coalesce(p_monto, 0)
  <= coalesce((select c.pagado from public.clientes c where c.id = p_cliente_id), 0) + 0.009;
$$;
revoke all on function public.whatsapp_factura_cubierta(uuid, uuid, text, numeric) from public, anon, authenticated;

-- 3) El disparador: igual que antes, pero se salta el aviso si la factura ya está cubierta.
create or replace function public.trg_whatsapp_factura_generada()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_monto numeric;
begin
  -- Blindado: cualquier fallo aquí adentro se atrapa y NUNCA tumba la inserción real de la factura.
  begin
    if new.estado is distinct from 'Anulada' then
      v_monto := coalesce(new.prima_base, 0) + coalesce(new.prima_deps, 0);
      if public.whatsapp_factura_cubierta(new.cliente_id, new.id, new.periodo, v_monto) then
        -- Pagada por adelantado: no se le avisa «factura generada» al cliente. Queda anotado.
        if public.whatsapp_automatizacion_activa('factura_generada') then
          insert into public.whatsapp_mensajes (cliente_id, tipo, referencia_id, plantilla_nombre, plantilla_variables, estado, error_detalle)
          values (new.cliente_id, 'factura_generada', new.id, null, null, 'omitido',
                  'No se envió: el cliente ya tiene este período pagado por adelantado (' || new.periodo || ')');
        end if;
      else
        perform public.whatsapp_notificar_evento(
          'factura_generada', new.cliente_id, new.id,
          jsonb_build_object('monto', v_monto, 'periodo', new.periodo)
        );
      end if;
    end if;
  exception when others then
    raise warning 'trg_whatsapp_factura_generada fallo (factura % no se vio afectada): %', new.id, sqlerrm;
  end;
  return new;
end;
$function$;

-- 4) El centro de automatizaciones muestra el último ENVÍO real; una omisión no cuenta como último estado.
create or replace function public.whatsapp_automatizaciones_estado()
returns table(codigo text, nombre text, descripcion text, plantilla_nombre text, activo boolean, orden integer, dias_cadencia integer, ultimo_estado text, ultimo_envio_at timestamp with time zone, ultimo_error text)
language sql
security definer
set search_path to 'public', 'extensions'
as $function$
  select
    a.codigo,
    a.nombre,
    a.descripcion,
    a.plantilla_nombre,
    a.activo,
    a.orden,
    case when a.codigo='atrasado' then coalesce(cfg.dias_entre_avisos_atraso,3) else null end,
    ult.estado,
    ult.created_at,
    ult.error_detalle
  from public.whatsapp_automatizaciones a
  left join public.whatsapp_config cfg
    on cfg.organizacion_id=a.organizacion_id and cfg.activo=true
  left join lateral (
    select m.estado,m.created_at,m.error_detalle
    from public.whatsapp_mensajes m
    where m.tipo=a.codigo and m.estado <> 'omitido'
    order by m.created_at desc
    limit 1
  ) ult on true
  where a.organizacion_id=public.mi_organizacion()
  order by a.orden,a.codigo;
$function$;
