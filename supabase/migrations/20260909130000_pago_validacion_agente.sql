-- NEXUS PRO · Validación manual de pagos bancarios por agente
-- Transferencia/Depósito: el pago se registra financieramente, pero queda pendiente de validar.
-- Al registrar: avisa al agente dueño de la cuenta.
-- Al validar: confirma al cliente y envía al agente su acumulado validado.
-- Efectivo/Tarjeta/Cheque conservan el flujo actual.

alter table public.abonos
  add column if not exists validacion_estado text,
  add column if not exists validado_at timestamptz,
  add column if not exists validado_por_user_id uuid,
  add column if not exists validado_por_agente_id uuid,
  add column if not exists validacion_nota text;

update public.abonos
set validacion_estado = case
  when metodo in ('Transferencia','Depósito') then 'validado'
  else 'no_requerida'
end
where validacion_estado is null;

alter table public.abonos alter column validacion_estado set default 'no_requerida';
alter table public.abonos alter column validacion_estado set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='abonos_validacion_estado_check') then
    alter table public.abonos add constraint abonos_validacion_estado_check
      check (validacion_estado in ('no_requerida','pendiente','validado'));
  end if;
  if not exists (select 1 from pg_constraint where conname='abonos_validado_por_agente_fkey') then
    alter table public.abonos add constraint abonos_validado_por_agente_fkey
      foreign key (validado_por_agente_id) references public.agentes(id);
  end if;
  if not exists (select 1 from pg_constraint where conname='abonos_validado_por_user_fkey') then
    alter table public.abonos add constraint abonos_validado_por_user_fkey
      foreign key (validado_por_user_id) references public.usuarios_sistema(id);
  end if;
end $$;

comment on column public.abonos.validacion_estado is
  'Transferencia/Depósito nuevos: pendiente hasta validación manual. no_requerida para otros métodos; validado para pagos bancarios confirmados.';

create index if not exists abonos_validacion_pendiente_idx
  on public.abonos (agente_cobro, created_at desc)
  where validacion_estado='pendiente' and coalesce(estado,'') <> 'Reversado';

-- No permitir que PostgREST cambie estas columnas directamente; la validación pasa por RPC.
revoke update(validacion_estado,validado_at,validado_por_user_id,validado_por_agente_id,validacion_nota)
  on public.abonos from authenticated;

create or replace function public.trg_abono_preparar_validacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.metodo in ('Transferencia','Depósito') then
    new.validacion_estado := 'pendiente';
    new.validado_at := null;
    new.validado_por_user_id := null;
    new.validado_por_agente_id := null;
    new.validacion_nota := null;
  else
    new.validacion_estado := 'no_requerida';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_abono_preparar_validacion on public.abonos;
create trigger trg_abono_preparar_validacion
before insert on public.abonos
for each row execute function public.trg_abono_preparar_validacion();

-- Nuevos tipos de auditoría de WhatsApp para avisos internos al agente.
alter table public.whatsapp_mensajes drop constraint if exists whatsapp_mensajes_tipo_check;
alter table public.whatsapp_mensajes add constraint whatsapp_mensajes_tipo_check check (
  tipo in (
    'factura_generada','atrasado','pago_aplicado','entrega_confirmada',
    'pago_pendiente_validacion','pago_validado_resumen'
  )
);

insert into public.whatsapp_automatizaciones
  (organizacion_id,codigo,nombre,descripcion,plantilla_nombre,activo,orden)
select id,'pago_pendiente_validacion','Pago por validar',
       'Avisa al agente de la cuenta cuando se registra una transferencia o depósito que debe verificar.',
       'pago_pendiente_validacion_agente',true,22
from public.organizaciones where slug='nexus-pro'
on conflict (organizacion_id,codigo) do update set
  nombre=excluded.nombre,descripcion=excluded.descripcion,plantilla_nombre=excluded.plantilla_nombre;

insert into public.whatsapp_automatizaciones
  (organizacion_id,codigo,nombre,descripcion,plantilla_nombre,activo,orden)
select id,'pago_validado_resumen','Acumulado después de validar',
       'Cuando el pago bancario se valida, informa al agente cuánto acaba de validar y su acumulado validado actual.',
       'pago_validado_resumen_agente',true,24
from public.organizaciones where slug='nexus-pro'
on conflict (organizacion_id,codigo) do update set
  nombre=excluded.nombre,descripcion=excluded.descripcion,plantilla_nombre=excluded.plantilla_nombre;

update public.whatsapp_automatizaciones
set descripcion='Confirma al cliente el pago. En transferencias y depósitos se envía únicamente después de la validación manual.'
where codigo='pago_aplicado'
  and organizacion_id=(select id from public.organizaciones where slug='nexus-pro');

-- Acumulado operativo excluyendo transferencias/depósitos todavía no validados.
create or replace function public.seguros_acumulado_validado_agente(p_agente_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
      coalesce((select sum(a.monto) from public.abonos a
                 where a.agente_cobro=p_agente_id::text
                   and coalesce(a.estado,'') <> 'Reversado'
                   and not (a.metodo in ('Transferencia','Depósito') and a.validacion_estado='pendiente')),0)
    + coalesce((select sum(t.monto) from public.transferencias_agentes t
                 where t.hacia_agente=p_agente_id::text and t.estado='aceptada'),0)
    - coalesce((select sum(t.monto) from public.transferencias_agentes t
                 where t.desde_agente=p_agente_id::text and t.estado='aceptada'),0)
    - coalesce((select sum(e.monto) from public.entregas_admin e
                 where e.agente_id=p_agente_id and e.es_directo=false and e.anulado=false),0)
    - coalesce((select sum(e.monto) from public.entregas_admin e
                 where e.es_directo=true and e.anulado=false and e.agente_id<>p_agente_id
                   and coalesce(e.cobrado_por,e.agente_id)=p_agente_id),0)
    + coalesce((select sum(e.monto) from public.entregas_admin e
                 where e.es_directo=true and e.anulado=false and e.agente_id=p_agente_id
                   and coalesce(e.cobrado_por,e.agente_id)<>p_agente_id),0)
$$;
revoke all on function public.seguros_acumulado_validado_agente(uuid) from public, anon;
grant execute on function public.seguros_acumulado_validado_agente(uuid) to authenticated;

-- Llamada interna al notifier específico de pagos/agentes.
create or replace function public.whatsapp_notificar_pago_agente(
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
declare v_secret text;
begin
  if not public.whatsapp_automatizacion_activa(p_tipo) then return; end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name='whatsapp_internal_secret';
  perform net.http_post(
    url := 'https://tnwsgcxurfyuszxsewsn.supabase.co/functions/v1/whatsapp-pagos-agente-notificar',
    headers := jsonb_build_object('Content-Type','application/json','X-Internal-Secret',coalesce(v_secret,'')),
    body := jsonb_build_object('tipo',p_tipo,'agente_id',p_agente_id,'referencia_id',p_referencia_id,'datos',coalesce(p_datos,'{}'::jsonb)),
    timeout_milliseconds := 15000
  );
end;
$$;
revoke all on function public.whatsapp_notificar_pago_agente(text,uuid,uuid,jsonb) from public, anon, authenticated;

-- Al insertar un pago bancario: NO confirmar todavía al cliente; avisar al agente para validar.
-- Los demás métodos conservan la confirmación inmediata existente.
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
  v_agente uuid;
  v_cliente_nom text;
begin
  begin
    if new.estado is distinct from 'Reversado' and coalesce(new.monto,0)>0 then
      if new.metodo in ('Transferencia','Depósito') and new.validacion_estado='pendiente' then
        begin v_agente := nullif(new.agente_cobro,'')::uuid; exception when others then v_agente := null; end;
        select nom into v_cliente_nom from public.clientes where id=new.cliente_id;
        if v_agente is not null then
          perform public.whatsapp_notificar_pago_agente(
            'pago_pendiente_validacion',v_agente,new.id,
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
    end if;
  exception when others then
    raise warning 'trg_whatsapp_pago_aplicado fallo (abono % no se vio afectado): %',new.id,sqlerrm;
  end;
  return new;
end;
$$;

-- Al pasar de pendiente -> validado: confirmar al cliente y mandar acumulado al agente.
create or replace function public.trg_whatsapp_pago_validado()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_saldo numeric;
  v_periodo text;
  v_pagado_actual numeric;
  v_agente uuid;
  v_acumulado numeric;
begin
  begin
    if old.validacion_estado='pendiente'
       and new.validacion_estado='validado'
       and new.estado is distinct from 'Reversado'
       and coalesce(new.monto,0)>0 then
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

      begin v_agente := nullif(new.agente_cobro,'')::uuid; exception when others then v_agente := null; end;
      if v_agente is not null then
        v_acumulado := public.seguros_acumulado_validado_agente(v_agente);
        perform public.whatsapp_notificar_pago_agente(
          'pago_validado_resumen',v_agente,new.id,
          jsonb_build_object('monto',new.monto,'acumulado',coalesce(v_acumulado,0))
        );
      end if;
    end if;
  exception when others then
    raise warning 'trg_whatsapp_pago_validado fallo (abono % no se vio afectado): %',new.id,sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists trg_whatsapp_pago_validado on public.abonos;
create trigger trg_whatsapp_pago_validado
after update of validacion_estado on public.abonos
for each row execute function public.trg_whatsapp_pago_validado();

-- Lista operativa: admin ve todos; agente solo los de su propia cuenta.
create or replace function public.seguros_pagos_pendientes_validacion()
returns table(
  abono_id uuid,
  cliente_id uuid,
  cliente text,
  monto numeric,
  metodo text,
  banco text,
  referencia text,
  comprobante_url text,
  fecha timestamptz,
  agente_id uuid,
  agente text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_agente uuid;
begin
  if public.mi_rol() is null
     or public.mi_organizacion() is distinct from (select id from public.organizaciones where slug='nexus-pro') then
    raise exception 'no autorizado';
  end if;
  v_agente := public.mi_agente_efectivo();
  return query
    select a.id,a.cliente_id,c.nom,a.monto,a.metodo,a.banco,a.referencia,a.comprobante_url,
           coalesce(a.fecha,a.created_at),ag.id,ag.nom
    from public.abonos a
    join public.clientes c on c.id=a.cliente_id
    left join public.agentes ag on ag.id::text=a.agente_cobro
    where a.validacion_estado='pendiente'
      and coalesce(a.estado,'') <> 'Reversado'
      and (
        public.mi_rol()='admin'
        or (v_agente is not null and a.agente_cobro=v_agente::text)
      )
    order by coalesce(a.fecha,a.created_at) asc;
end;
$$;
revoke all on function public.seguros_pagos_pendientes_validacion() from public, anon;
grant execute on function public.seguros_pagos_pendientes_validacion() to authenticated;

create or replace function public.seguros_validar_pago(p_abono_id uuid,p_nota text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_abono public.abonos%rowtype;
  v_agente_actual uuid;
  v_agente_pago uuid;
  v_acumulado numeric;
begin
  if public.mi_rol() is null
     or public.mi_organizacion() is distinct from (select id from public.organizaciones where slug='nexus-pro') then
    raise exception 'no autorizado';
  end if;

  select * into v_abono from public.abonos where id=p_abono_id for update;
  if not found then raise exception 'pago no encontrado'; end if;
  if v_abono.estado='Reversado' then raise exception 'este pago está reversado'; end if;
  if v_abono.metodo not in ('Transferencia','Depósito') then raise exception 'este pago no requiere validación bancaria'; end if;
  if v_abono.validacion_estado='validado' then
    begin v_agente_pago := nullif(v_abono.agente_cobro,'')::uuid; exception when others then v_agente_pago := null; end;
    v_acumulado := case when v_agente_pago is null then 0 else public.seguros_acumulado_validado_agente(v_agente_pago) end;
    return jsonb_build_object('ok',true,'reintento',true,'abono_id',v_abono.id,'acumulado',coalesce(v_acumulado,0));
  end if;
  if v_abono.validacion_estado<>'pendiente' then raise exception 'estado de validación inválido'; end if;

  v_agente_actual := public.mi_agente_efectivo();
  begin v_agente_pago := nullif(v_abono.agente_cobro,'')::uuid; exception when others then v_agente_pago := null; end;
  if v_agente_pago is null then raise exception 'el pago no tiene agente de cuenta válido'; end if;
  if public.mi_rol()<>'admin' and v_agente_actual is distinct from v_agente_pago then
    raise exception 'solo el agente de esa cuenta puede validar este pago';
  end if;

  update public.abonos
     set validacion_estado='validado',
         validado_at=now(),
         validado_por_user_id=public.mi_usuario_id(),
         validado_por_agente_id=coalesce(v_agente_actual,v_agente_pago),
         validacion_nota=nullif(btrim(coalesce(p_nota,'')),'')
   where id=p_abono_id;

  v_acumulado := public.seguros_acumulado_validado_agente(v_agente_pago);
  return jsonb_build_object('ok',true,'reintento',false,'abono_id',p_abono_id,'agente_id',v_agente_pago,'acumulado',coalesce(v_acumulado,0));
end;
$$;
revoke all on function public.seguros_validar_pago(uuid,text) from public, anon;
grant execute on function public.seguros_validar_pago(uuid,text) to authenticated;
