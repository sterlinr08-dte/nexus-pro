-- NEXUS PRO · Centro de Automatizaciones WhatsApp
-- Administra las 4 automatizaciones existentes sin cambiar su comportamiento por defecto.
-- Los envíos manuales siguen disponibles aunque una automatización automática se apague.

create table if not exists public.whatsapp_automatizaciones (
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  codigo text not null,
  nombre text not null,
  descripcion text not null,
  plantilla_nombre text,
  activo boolean not null default true,
  orden integer not null default 100,
  updated_at timestamptz not null default now(),
  primary key (organizacion_id, codigo)
);

alter table public.whatsapp_automatizaciones enable row level security;

drop policy if exists whatsapp_automatizaciones_select on public.whatsapp_automatizaciones;
create policy whatsapp_automatizaciones_select on public.whatsapp_automatizaciones
  for select
  using (
    mi_rol() is not null
    and organizacion_id = mi_organizacion()
  );

revoke all on public.whatsapp_automatizaciones from anon, authenticated;
grant select on public.whatsapp_automatizaciones to authenticated;

insert into public.whatsapp_automatizaciones
  (organizacion_id,codigo,nombre,descripcion,plantilla_nombre,activo,orden)
select id,'factura_generada','Factura generada',
       'Envía al cliente una notificación cuando NEXUS PRO genera una factura.',
       'factura_generada',true,10
from public.organizaciones where slug='nexus-pro'
on conflict (organizacion_id,codigo) do nothing;

insert into public.whatsapp_automatizaciones
  (organizacion_id,codigo,nombre,descripcion,plantilla_nombre,activo,orden)
select id,'pago_aplicado','Pago confirmado',
       'Confirma al cliente el pago registrado, el período cubierto y su saldo actualizado.',
       'pago_confirmado_periodo',true,20
from public.organizaciones where slug='nexus-pro'
on conflict (organizacion_id,codigo) do nothing;

insert into public.whatsapp_automatizaciones
  (organizacion_id,codigo,nombre,descripcion,plantilla_nombre,activo,orden)
select id,'atrasado','Recordatorio de atraso',
       'Revisa diariamente la cartera y contacta clientes con saldo vencido respetando la cadencia configurada.',
       'recordatorio_atraso',true,30
from public.organizaciones where slug='nexus-pro'
on conflict (organizacion_id,codigo) do nothing;

insert into public.whatsapp_automatizaciones
  (organizacion_id,codigo,nombre,descripcion,plantilla_nombre,activo,orden)
select id,'entrega_confirmada','Entrega confirmada al agente',
       'Notifica al agente cuando queda confirmada una entrega directa y muestra su acumulado.',
       'entrega_confirmada',true,40
from public.organizaciones where slug='nexus-pro'
on conflict (organizacion_id,codigo) do nothing;

create or replace function public.whatsapp_automatizacion_activa(p_codigo text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select a.activo
      from public.whatsapp_automatizaciones a
      join public.organizaciones o on o.id=a.organizacion_id
      where o.slug='nexus-pro' and a.codigo=p_codigo
      limit 1
    ),
    true
  );
$$;
revoke all on function public.whatsapp_automatizacion_activa(text) from public, anon, authenticated;

-- Conserva los notifiers reales como funciones base y crea wrappers con el interruptor automático.
do $$
begin
  if to_regprocedure('public.whatsapp_notificar_evento_base(text,uuid,uuid,jsonb)') is null then
    alter function public.whatsapp_notificar_evento(text,uuid,uuid,jsonb)
      rename to whatsapp_notificar_evento_base;
  end if;
  if to_regprocedure('public.whatsapp_notificar_evento_agente_base(text,uuid,uuid,jsonb)') is null then
    alter function public.whatsapp_notificar_evento_agente(text,uuid,uuid,jsonb)
      rename to whatsapp_notificar_evento_agente_base;
  end if;
end $$;

create or replace function public.whatsapp_notificar_evento(
  p_tipo text,
  p_cliente_id uuid,
  p_referencia_id uuid,
  p_datos jsonb
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.whatsapp_automatizacion_activa(p_tipo) then
    return;
  end if;
  perform public.whatsapp_notificar_evento_base(p_tipo,p_cliente_id,p_referencia_id,p_datos);
end;
$$;
revoke all on function public.whatsapp_notificar_evento(text,uuid,uuid,jsonb) from public, anon, authenticated;

create or replace function public.whatsapp_notificar_evento_agente(
  p_tipo text,
  p_agente_id uuid,
  p_referencia_id uuid,
  p_datos jsonb
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.whatsapp_automatizacion_activa(p_tipo) then
    return;
  end if;
  perform public.whatsapp_notificar_evento_agente_base(p_tipo,p_agente_id,p_referencia_id,p_datos);
end;
$$;
revoke all on function public.whatsapp_notificar_evento_agente(text,uuid,uuid,jsonb) from public, anon, authenticated;

-- Estado real para la UI: configuración + último intento registrado.
create or replace function public.whatsapp_automatizaciones_estado()
returns table(
  codigo text,
  nombre text,
  descripcion text,
  plantilla_nombre text,
  activo boolean,
  orden integer,
  dias_cadencia integer,
  ultimo_estado text,
  ultimo_envio_at timestamptz,
  ultimo_error text
)
language sql
security definer
set search_path = public, extensions
as $$
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
    where m.tipo=a.codigo
    order by m.created_at desc
    limit 1
  ) ult on true
  where a.organizacion_id=public.mi_organizacion()
  order by a.orden,a.codigo;
$$;
revoke all on function public.whatsapp_automatizaciones_estado() from public, anon;
grant execute on function public.whatsapp_automatizaciones_estado() to authenticated;

create or replace function public.whatsapp_automatizacion_actualizar(
  p_codigo text,
  p_activo boolean,
  p_dias_cadencia integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_org uuid;
  v_count integer;
begin
  if public.mi_rol() is distinct from 'admin' then
    raise exception 'solo administrador';
  end if;
  v_org := public.mi_organizacion();
  if v_org is null then raise exception 'sin organización'; end if;

  update public.whatsapp_automatizaciones
     set activo=coalesce(p_activo,false), updated_at=now()
   where organizacion_id=v_org and codigo=p_codigo;
  get diagnostics v_count = row_count;
  if v_count=0 then raise exception 'automatización no encontrada'; end if;

  if p_codigo='atrasado' and p_dias_cadencia is not null then
    if p_dias_cadencia < 1 or p_dias_cadencia > 30 then
      raise exception 'la cadencia debe estar entre 1 y 30 días';
    end if;
    update public.whatsapp_config
       set dias_entre_avisos_atraso=p_dias_cadencia, updated_at=now()
     where organizacion_id=v_org and activo=true;
  end if;

  return jsonb_build_object('ok',true,'codigo',p_codigo,'activo',p_activo,'dias_cadencia',p_dias_cadencia);
end;
$$;
revoke all on function public.whatsapp_automatizacion_actualizar(text,boolean,integer) from public, anon;
grant execute on function public.whatsapp_automatizacion_actualizar(text,boolean,integer) to authenticated;

-- El botón manual de atraso debe seguir funcionando aunque la automatización diaria esté apagada.
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
  if mi_rol() is null then raise exception 'no autorizado'; end if;
  select id into v_org from public.organizaciones where slug='nexus-pro';
  if mi_organizacion() <> v_org then raise exception 'no autorizado'; end if;

  select pagado into v_pagado from public.clientes where id=p_cliente_id;
  if not found then raise exception 'cliente no encontrado'; end if;

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

  perform public.whatsapp_notificar_evento_base(
    'atrasado',p_cliente_id,v_primera_atrasada_id,
    jsonb_build_object('monto',v_saldo_total,'meses',v_meses_atrasados)
  );

  return jsonb_build_object('ok',true,'monto',v_saldo_total,'meses',v_meses_atrasados);
end;
$$;
revoke all on function public.whatsapp_recordatorio_manual(uuid) from public, anon;
grant execute on function public.whatsapp_recordatorio_manual(uuid) to authenticated;
