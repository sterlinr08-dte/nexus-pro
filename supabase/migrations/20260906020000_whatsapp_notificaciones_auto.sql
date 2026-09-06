-- NEXUS PRO · Notificaciones automáticas de WhatsApp (fase 1: solo saliente)
-- Config + historial de envíos. Desactivado por defecto (activo=false) hasta que exista una
-- cuenta real de Zernio conectada — todo el pipeline puede probarse hoy sin mandar nada real.

create table public.whatsapp_config (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id),
  zernio_account_id text,
  whatsapp_numero text,
  activo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.whatsapp_config enable row level security;

-- Mismo patron mi_rol()/mi_organizacion() ya auditado en crm_tareas/crm_actividades. Solo admin
-- de nexus-pro puede ver/tocar la config (tiene el API key de Zernio implicito en account_id).
create policy whatsapp_config_admin on public.whatsapp_config
  for all
  using (mi_rol() = 'admin' and mi_organizacion() = (select id from public.organizaciones where slug = 'nexus-pro'))
  with check (mi_rol() = 'admin' and mi_organizacion() = (select id from public.organizaciones where slug = 'nexus-pro'));

revoke all on public.whatsapp_config from anon;
grant select, insert, update, delete on public.whatsapp_config to authenticated;

create table public.whatsapp_mensajes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id),
  tipo text not null check (tipo in ('factura_generada', 'atrasado', 'pago_aplicado')),
  referencia_id uuid,
  plantilla_nombre text,
  plantilla_variables jsonb,
  estado text not null check (estado in ('enviado', 'error', 'sin_configurar')),
  zernio_message_id text,
  error_detalle text,
  created_at timestamptz not null default now()
);

alter table public.whatsapp_mensajes enable row level security;

-- Lectura para cualquier usuario autenticado de nexus-pro (mismo alcance que crm_actividades).
create policy whatsapp_mensajes_lectura on public.whatsapp_mensajes
  for select
  using (mi_rol() is not null and mi_organizacion() = (select id from public.organizaciones where slug = 'nexus-pro'));

-- Escritura SOLO vía service_role (la Edge Function) a proposito -- ninguna policy de
-- insert/update/delete para authenticated/anon. El historial es de solo lectura desde la app.
revoke all on public.whatsapp_mensajes from anon, authenticated;
grant select on public.whatsapp_mensajes to authenticated;

create index whatsapp_mensajes_cliente_idx on public.whatsapp_mensajes (cliente_id, created_at desc);

-- Dedup del recordatorio de atraso: sin esto, el cron diario mandaria el mismo recordatorio
-- todos los dias mientras la factura siga sin pagarse.
alter table public.facturas add column if not exists notificado_atraso_en timestamptz;

-- ────────────────────────────────────────────────────────────────────────────────────────
-- Disparadores server-side. Mismo principio de atomicidad que crm_completar_tarea: si el envio
-- dependiera de que el navegador siga vivo despues de la RPC (llamando la Edge Function desde el
-- frontend), un cierre de pestaña se traga la notificacion en silencio. Con un trigger, el envio
-- ocurre siempre que la escritura financiera ocurra, sin importar que dispare la RPC.
-- ────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.whatsapp_notificar_evento(p_tipo text, p_cliente_id uuid, p_referencia_id uuid, p_datos jsonb)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'whatsapp_internal_secret';
  perform net.http_post(
    url := 'https://tnwsgcxurfyuszxsewsn.supabase.co/functions/v1/whatsapp-notificar',
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-Internal-Secret', coalesce(v_secret, '')),
    body := jsonb_build_object('tipo', p_tipo, 'cliente_id', p_cliente_id, 'referencia_id', p_referencia_id, 'datos', p_datos),
    timeout_milliseconds := 15000
  );
end;
$$;

revoke all on function public.whatsapp_notificar_evento(text, uuid, uuid, jsonb) from public, anon, authenticated;

create or replace function public.trg_whatsapp_factura_generada()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  -- Blindado: no hay copia de prueba real de este proyecto para probar el trigger antes de
  -- aplicarlo (el historial de migraciones no incluye las tablas base -- ver nota al inicio del
  -- archivo). Por eso CUALQUIER fallo aqui adentro (bug propio, pg_net caido, lo que sea) se
  -- atrapa y NUNCA debe poder tumbar la insercion real de la factura -- solo queda una
  -- advertencia en los logs de Postgres.
  begin
    if new.estado is distinct from 'Anulada' then
      perform public.whatsapp_notificar_evento(
        'factura_generada', new.cliente_id, new.id,
        jsonb_build_object('monto', coalesce(new.prima_base, 0) + coalesce(new.prima_deps, 0), 'periodo', new.periodo)
      );
    end if;
  exception when others then
    raise warning 'trg_whatsapp_factura_generada fallo (factura % no se vio afectada): %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

create trigger trg_whatsapp_factura_generada
after insert on public.facturas
for each row execute function public.trg_whatsapp_factura_generada();

create or replace function public.trg_whatsapp_pago_aplicado()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_saldo numeric;
begin
  -- Mismo blindaje que arriba: un fallo aqui nunca debe poder tumbar el abono real.
  begin
    if new.estado is distinct from 'Reversado' and coalesce(new.monto, 0) > 0 then
      select greatest(0, coalesce(deuda_total, 0) - coalesce(pagado, 0)) + greatest(0, coalesce(deuda_anterior, 0))
        into v_saldo from public.clientes where id = new.cliente_id;
      perform public.whatsapp_notificar_evento(
        'pago_aplicado', new.cliente_id, new.id,
        jsonb_build_object('monto', new.monto, 'saldo_actual', coalesce(v_saldo, 0))
      );
    end if;
  exception when others then
    raise warning 'trg_whatsapp_pago_aplicado fallo (abono % no se vio afectado): %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

create trigger trg_whatsapp_pago_aplicado
after insert on public.abonos
for each row execute function public.trg_whatsapp_pago_aplicado();

-- ────────────────────────────────────────────────────────────────────────────────────────
-- Cron diario: detecta clientes recien atrasados. Portado 1:1 de _saldoFacturasCliente()
-- (index.html) + el filtro de rAvisos() (periodo < mesCorte()) -- debe dar el MISMO resultado
-- que ve el humano en Avisos hoy. Una sola notificacion por CLIENTE por corrida (no una por
-- factura vieja), con el total acumulado y la cantidad de meses -- igual que Avisos lo muestra.
-- ────────────────────────────────────────────────────────────────────────────────────────

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
    -- Un cliente con datos raros (ej. facturas sin periodo valido) no debe tumbar la corrida
    -- entera -- se registra la advertencia y se sigue con el resto de la cartera.
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
        'atrasado', v_cliente.cliente_id, v_nuevas[1],
        jsonb_build_object('monto', v_saldo_total, 'meses', v_meses_atrasados)
      );
      update public.facturas set notificado_atraso_en = now() where id = any(v_nuevas);
    end if;
    exception when others then
      raise warning 'whatsapp_detectar_atrasados fallo en cliente % (se sigue con el resto): %', v_cliente.cliente_id, sqlerrm;
    end;
  end loop;
end;
$$;

revoke all on function public.whatsapp_detectar_atrasados() from public, anon, authenticated;

select cron.schedule('whatsapp-detectar-atrasados-diario', '0 12 * * *', $$select public.whatsapp_detectar_atrasados()$$);
