-- NEXUS PRO Seguros — cumpleaños de clientes
-- Aplicada en producción el 2026-09-09 como crm_cumpleanos_clientes.

alter table public.clientes
  add column if not exists fecha_nacimiento date;

comment on column public.clientes.fecha_nacimiento is
  'Fecha de nacimiento del asegurado titular, usada para automatizaciones de cumpleaños.';

alter table public.whatsapp_reglas_custom
  drop constraint if exists whatsapp_reglas_custom_trigger_tipo_check;

alter table public.whatsapp_reglas_custom
  add constraint whatsapp_reglas_custom_trigger_tipo_check
  check (trigger_tipo = any (array[
    'documentos_pendientes'::text,
    'cotizacion_sin_cerrar'::text,
    'sin_respuesta_whatsapp'::text,
    'seguimiento_vencido'::text,
    'poliza_riesgo'::text,
    'proceso_sin_movimiento'::text,
    'cumpleanos'::text
  ]));

create or replace function public.whatsapp_regla_candidatos(p_trigger_tipo text, p_dias integer)
returns table(cliente_id uuid, entidad_id uuid, huella text, contexto jsonb)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  p_dias:=greatest(0,least(coalesce(p_dias,0),365));

  if p_trigger_tipo='documentos_pendientes' then
    return query
    select c.id,d.id,c.id::text||':doc:'||d.id::text,
      jsonb_build_object('tipo','documentos_pendientes','cantidad',(select count(*) from public.documentos_clientes d2 where d2.cliente_id=c.id and lower(coalesce(d2.estado,''))='pendiente'),'desde',d.created_at,'documento_tipo',d.tipo)
    from public.clientes c
    join lateral (select d1.id,d1.created_at,d1.tipo from public.documentos_clientes d1 where d1.cliente_id=c.id and lower(coalesce(d1.estado,''))='pendiente' and d1.created_at<=now()-make_interval(days=>p_dias) order by d1.created_at asc limit 1) d on true
    where c.activo is distinct from false; return;
  end if;

  if p_trigger_tipo='cotizacion_sin_cerrar' then
    return query select c.id,q.id,q.id::text,jsonb_build_object('tipo','cotizacion_sin_cerrar','numero',q.numero,'total',q.total,'fecha',q.fecha,'estado',q.estado)
    from public.pos_cotizaciones q join public.clientes c on c.id=q.cliente_id
    where lower(coalesce(q.estado,''))='vigente' and q.created_at<=now()-make_interval(days=>p_dias) and c.activo is distinct from false; return;
  end if;

  if p_trigger_tipo='sin_respuesta_whatsapp' then
    return query select c.id,h.id,h.id::text||':out:'||coalesce(h.ultima_respuesta_humana_at::text,''),jsonb_build_object('tipo','sin_respuesta_whatsapp','ultimo_envio',h.ultima_respuesta_humana_at,'ultimo_cliente',h.ultimo_inbound_at)
    from public.whatsapp_hilos h join public.clientes c on c.id=h.cliente_id
    where h.ultima_respuesta_humana_at is not null and h.ultima_respuesta_humana_at<=now()-make_interval(days=>p_dias)
      and (h.ultimo_inbound_at is null or h.ultimo_inbound_at<h.ultima_respuesta_humana_at) and c.activo is distinct from false; return;
  end if;

  if p_trigger_tipo='seguimiento_vencido' then
    return query select c.id,c.id,c.id::text||':seg:'||left(c.fecha_seguimiento,10),jsonb_build_object('tipo','seguimiento_vencido','fecha_seguimiento',c.fecha_seguimiento,'responsable',c.responsable_seguimiento,'prioridad',c.prioridad_proceso)
    from public.clientes c where c.activo is distinct from false and c.fecha_seguimiento is not null and c.fecha_seguimiento~'^\d{4}-\d{2}-\d{2}' and left(c.fecha_seguimiento,10)::date<=current_date-p_dias; return;
  end if;

  if p_trigger_tipo='poliza_riesgo' then
    return query select c.id,c.id,c.id::text||':fin:'||c.fecha_fin::date::text,jsonb_build_object('tipo','poliza_riesgo','fecha_fin',c.fecha_fin,'numero_poliza',c.numero_poliza,'ars',c.ars,'plan',c.plan)
    from public.clientes c where c.activo is distinct from false and c.fecha_fin is not null and c.fecha_fin::date between current_date and current_date+p_dias; return;
  end if;

  if p_trigger_tipo='proceso_sin_movimiento' then
    return query select c.id,c.id,c.id::text||':proc:'||coalesce(c.updated_at,c.created_at)::date::text,jsonb_build_object('tipo','proceso_sin_movimiento','motivo',c.motivo_proceso,'prioridad',c.prioridad_proceso,'progreso',c.porcentaje_progreso,'ultima_actualizacion',coalesce(c.updated_at,c.created_at))
    from public.clientes c where c.activo is distinct from false and lower(coalesce(c.estado_cliente,'')) in ('en proceso','proceso','pendiente') and coalesce(c.updated_at,c.created_at)<=now()-make_interval(days=>p_dias); return;
  end if;

  if p_trigger_tipo='cumpleanos' then
    return query
    select c.id,c.id,
      c.id::text||':cumple:'||extract(year from (current_date+p_dias))::int::text,
      jsonb_build_object(
        'tipo','cumpleanos',
        'fecha_nacimiento',c.fecha_nacimiento,
        'fecha_cumpleanos',
          case
            when extract(month from c.fecha_nacimiento)=2
             and extract(day from c.fecha_nacimiento)=29
             and extract(day from (date_trunc('year',current_date+p_dias)+interval '2 months - 1 day'))=28
              then make_date(extract(year from (current_date+p_dias))::int,2,28)
            else make_date(
              extract(year from (current_date+p_dias))::int,
              extract(month from c.fecha_nacimiento)::int,
              extract(day from c.fecha_nacimiento)::int
            )
          end,
        'edad',extract(year from age(current_date+p_dias,c.fecha_nacimiento))::int
      )
    from public.clientes c
    where c.activo is distinct from false
      and c.fecha_nacimiento is not null
      and (
        case
          when extract(month from c.fecha_nacimiento)=2
           and extract(day from c.fecha_nacimiento)=29
           and extract(day from (date_trunc('year',current_date+p_dias)+interval '2 months - 1 day'))=28
            then make_date(extract(year from (current_date+p_dias))::int,2,28)
          else make_date(
            extract(year from (current_date+p_dias))::int,
            extract(month from c.fecha_nacimiento)::int,
            extract(day from c.fecha_nacimiento)::int
          )
        end
      ) = current_date+p_dias;
    return;
  end if;
end;$function$;
