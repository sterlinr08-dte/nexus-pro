-- NEXUS PRO · Opt-out de WhatsApp ("no me escriban más")
--
-- Por qué: la política de WhatsApp Business EXIGE respetar a quien pide dejar de recibir mensajes.
-- Hasta hoy no existía ninguna forma de registrarlo: si un cliente contestaba "BAJA", el sistema le
-- seguía mandando avisos de cobro igual. Además del riesgo con Meta (pueden penalizar el número de
-- la empresa), es el mecanismo que le faltaba al objetivo Nº2 del REGLAMENTO §12 (evitar el
-- sobre-mensajeo).
--
-- Alcance deliberado: el opt-out bloquea SOLO los mensajes que inicia el negocio (avisos de factura,
-- atraso, pago aplicado y los 3 tipos de envío masivo). NO bloquea la respuesta del agente dentro
-- del Buzón cuando el propio cliente escribió primero -- responderle a alguien que te acaba de
-- escribir no es "escribirle sin permiso", y bloquearlo dejaría al cliente hablando solo.
-- Tampoco aplica a los avisos que van a un AGENTE (entrega_confirmada): eso es comunicación interna
-- del negocio con su personal, no marketing a un cliente.

-- ── 1. Marca en el cliente ──────────────────────────────────────────────────────────────────────
-- null = recibe normalmente. Con fecha = pidió no recibir (se guarda CUÁNDO y POR QUÉ VÍA, porque
-- ante un reclamo de Meta hay que poder mostrar que se respetó y desde cuándo).
alter table public.clientes
  add column if not exists whatsapp_optout_en timestamptz,
  add column if not exists whatsapp_optout_origen text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clientes_whatsapp_optout_origen_chk'
  ) then
    alter table public.clientes
      add constraint clientes_whatsapp_optout_origen_chk
      check (whatsapp_optout_origen is null or whatsapp_optout_origen in ('cliente', 'agente'));
  end if;
end$$;

comment on column public.clientes.whatsapp_optout_en is
  'Fecha en que el cliente pidió dejar de recibir WhatsApp del negocio (null = recibe). Bloquea avisos automáticos y envíos masivos, NO la respuesta del agente dentro de la ventana de 24h.';
comment on column public.clientes.whatsapp_optout_origen is
  'Quién lo marcó: "cliente" (escribió BAJA/STOP por WhatsApp) o "agente" (lo marcó a mano desde el Buzón).';

-- Índice parcial: las consultas siempre preguntan "¿está en opt-out?" sobre los pocos que lo están.
create index if not exists idx_clientes_whatsapp_optout
  on public.clientes (id) where whatsapp_optout_en is not null;

-- ── 2. RPC para que un agente lo marque/desmarque desde el Buzón ────────────────────────────────
-- Un agente puede marcarlo (el cliente se lo pidió por teléfono o en persona) y también quitarlo
-- (el cliente se arrepintió). Se registra el origen para no confundir un opt-out pedido por el
-- propio cliente por WhatsApp con uno puesto a mano.
create or replace function public.whatsapp_optout_marcar(p_cliente_id uuid, p_activar boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_existe boolean;
begin
  if mi_rol() is null or mi_organizacion() <> (select id from public.organizaciones where slug = 'nexus-pro') then
    raise exception 'no autorizado';
  end if;

  select true into v_existe from public.clientes where id = p_cliente_id;
  if not found then
    raise exception 'cliente no encontrado';
  end if;

  if p_activar then
    update public.clientes
       set whatsapp_optout_en = coalesce(whatsapp_optout_en, now()),
           whatsapp_optout_origen = coalesce(whatsapp_optout_origen, 'agente')
     where id = p_cliente_id;
  else
    update public.clientes
       set whatsapp_optout_en = null,
           whatsapp_optout_origen = null
     where id = p_cliente_id;
  end if;

  return jsonb_build_object('ok', true, 'optout', p_activar);
end;
$$;

revoke all on function public.whatsapp_optout_marcar(uuid, boolean) from public, anon;
grant execute on function public.whatsapp_optout_marcar(uuid, boolean) to authenticated;

-- ── 3. El botón manual del Buzón avisa en vez de fallar en silencio ─────────────────────────────
-- Se reescribe completa (create or replace exige el cuerpo entero); lo único que cambia respecto a
-- la versión de 20260908220000 es el bloque de opt-out marcado abajo.
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
  if mi_rol() is null then
    raise exception 'no autorizado';
  end if;
  select id into v_org from public.organizaciones where slug = 'nexus-pro';
  if mi_organizacion() <> v_org then
    raise exception 'no autorizado';
  end if;

  select pagado, whatsapp_optout_en into v_pagado, v_optout from public.clientes where id = p_cliente_id;
  if not found then
    raise exception 'cliente no encontrado';
  end if;

  -- ── NUEVO (opt-out) ──
  -- Se avisa con una excepción y no con un "no pasó nada": el agente está mirando la conversación
  -- en pantalla y tiene que enterarse de por qué no se mandó, o va a seguir dándole al botón.
  if v_optout is not null then
    raise exception 'este cliente pidió no recibir mensajes de WhatsApp (%). Quítale la marca desde el Buzón si te autorizó de nuevo.', to_char(v_optout, 'DD/MM/YYYY');
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

-- ── 4. El envío masivo excluye a quien pidió no recibir ─────────────────────────────────────────
-- Igual que con la cadencia (regla 5 del REGLAMENTO §12): no se les manda, PERO quedan como
-- "fallido" con el motivo escrito, para que el agente vea en el resultado por qué el lote salió
-- más chico en vez de que el número simplemente no cuadre. Aplica a los 3 tipos, no solo a 'pago'.
create or replace function public.whatsapp_crear_lote_envio_masivo(p_tipo text, p_cliente_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_org uuid;
  v_lote_id uuid;
  v_dias_cadencia int;
begin
  if mi_rol() is null then
    raise exception 'no autorizado';
  end if;
  select id into v_org from public.organizaciones where slug = 'nexus-pro';
  if mi_organizacion() <> v_org then
    raise exception 'no autorizado';
  end if;
  if p_tipo not in ('factura', 'pago', 'vence') then
    raise exception 'tipo invalido: %', p_tipo;
  end if;
  if p_cliente_ids is null or array_length(p_cliente_ids, 1) is null then
    raise exception 'sin destinatarios';
  end if;

  select coalesce(dias_entre_avisos_atraso, 3) into v_dias_cadencia
  from public.whatsapp_config where activo = true limit 1;
  if v_dias_cadencia is null or v_dias_cadencia < 1 then
    v_dias_cadencia := 3;
  end if;

  insert into public.whatsapp_envio_masivo_lotes (organizacion_id, tipo, creado_por_usuario_id)
  values (v_org, p_tipo, auth.uid())
  returning id into v_lote_id;

  insert into public.whatsapp_envio_masivo_destinatarios (lote_id, cliente_id)
  select v_lote_id, c.id
  from public.clientes c
  where c.id = any(p_cliente_ids) and c.activo and c.wa is not null and c.wa <> ''
    and c.whatsapp_optout_en is null                                    -- NUEVO (opt-out)
    and (
      p_tipo <> 'pago'
      or c.ultimo_aviso_atraso_en is null
      or now() >= c.ultimo_aviso_atraso_en + make_interval(days => v_dias_cadencia)
    )
  on conflict (lote_id, cliente_id) do nothing;

  -- NUEVO (opt-out): fila visible con el motivo, para los 3 tipos.
  insert into public.whatsapp_envio_masivo_destinatarios (lote_id, cliente_id, estado, error_detalle, enviado_at)
  select v_lote_id, c.id, 'fallido', 'el cliente pidió no recibir mensajes de WhatsApp (desde el ' || to_char(c.whatsapp_optout_en, 'DD/MM/YYYY') || ')', now()
  from public.clientes c
  where c.id = any(p_cliente_ids) and c.activo and c.wa is not null and c.wa <> ''
    and c.whatsapp_optout_en is not null
  on conflict (lote_id, cliente_id) do nothing;

  if p_tipo = 'pago' then
    insert into public.whatsapp_envio_masivo_destinatarios (lote_id, cliente_id, estado, error_detalle, enviado_at)
    select v_lote_id, c.id, 'fallido', 'ya se le avisó de su deuda hace menos de ' || v_dias_cadencia || ' día(s) (cron automático, botón manual o otro envío masivo)', now()
    from public.clientes c
    where c.id = any(p_cliente_ids) and c.activo and c.wa is not null and c.wa <> ''
      and c.whatsapp_optout_en is null
      and c.ultimo_aviso_atraso_en is not null
      and now() < c.ultimo_aviso_atraso_en + make_interval(days => v_dias_cadencia)
    on conflict (lote_id, cliente_id) do nothing;
  end if;

  update public.whatsapp_envio_masivo_lotes
    set total_destinatarios = (
      select count(*) from public.whatsapp_envio_masivo_destinatarios where lote_id = v_lote_id
    )
    where id = v_lote_id;

  return v_lote_id;
end;
$$;

revoke all on function public.whatsapp_crear_lote_envio_masivo(text, uuid[]) from public, anon;
grant execute on function public.whatsapp_crear_lote_envio_masivo(text, uuid[]) to authenticated;
