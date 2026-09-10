-- NEXUS PRO Seguros — la validación bancaria manual queda SOLO para los pagos cruzados.
--
-- REGLA DEL DUEÑO (textual): "la validación es solo si un agente aplica un pago que fue
-- hecho a la cuenta del otro agente".
--
-- Es decir:
--   · quien registra el pago ES el dueño de la cuenta donde entró el dinero  → no hay nada
--     que confirmarle a nadie: se valida solo.
--   · quien registra el pago NO es el dueño de esa cuenta (pago CRUZADO)     → sigue
--     requiriendo validación manual, exactamente como hasta hoy.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- POR QUÉ ESTO NO ES UNA REGLA NUEVA, SINO LA MISMA BIEN IMPLEMENTADA
--
-- La migración 20260909174800 ya intentó esto: su propio texto dice "pago registrado por
-- el administrador en su propia cuenta". Pero comprobaba `mi_agente_efectivo() =
-- agente_cobro`, que es "quien cobró", no "de quién es la cuenta". No podía hacer otra
-- cosa: `abonos` no guarda a qué cuenta entró el dinero.
--
-- Esa aproximación nunca se disparó (0 abonos con esa nota en toda la base) y nunca cubrió
-- el caso real, porque el único agente que cobra a cuenta ajena no es el admin.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- POR QUÉ LA DECISIÓN SE TOMA EN EL BEFORE INSERT Y NO DESPUÉS
--
-- Todo el cobro ocurre dentro de una sola transacción de
-- `seguros_registrar_cobro_con_entrega`: primero nace el abono, después la entrega directa
-- que dice a qué cuenta entró el dinero.
--
-- Validar después (con un trigger sobre `entregas_admin`) funcionaría para la contabilidad,
-- pero llegaría tarde para los avisos: el AFTER INSERT del abono ya habría encolado en
-- pg_net el WhatsApp de "tienes un pago por validar", y ese envío no se puede cancelar.
-- El agente recibiría un aviso para hacer algo que ya está hecho.
--
-- Por eso el destino viaja hasta el BEFORE INSERT en una variable LOCAL A LA TRANSACCIÓN
-- (`nexus.cobro_cuenta_destino`), que la propia RPC fija justo antes de insertar el abono.
-- No es spoofeable desde el navegador: `authenticated` solo tiene SELECT sobre `abonos`
-- (todas las escrituras pasan por RPC SECURITY DEFINER) y PostgREST no permite fijar GUCs
-- arbitrarios. Si la variable no está, se cae al comportamiento de siempre: pendiente.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- LO QUE SE PIERDE, DICHO CLARO
--
-- En los pagos NO cruzados ya nadie confirma a mano que el depósito entró de verdad al
-- banco: se confía en el comprobante y en el registro de quien lo aplica. Es la
-- contrapartida de la decisión, y queda escrita aquí a propósito.
--
-- Con los datos de septiembre: 55 de 66 pagos bancarios dejarían de pedir validación
-- manual; los 11 cruzados (todos ROBINSON → cuenta de ESTERLIN) la siguen pidiendo.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) El criterio
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.trg_abono_preparar_validacion()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_yo uuid;              -- el agente que está aplicando el pago
  v_cuenta_destino uuid;  -- de quién es la cuenta donde entró el dinero
begin
  if new.metodo in ('Transferencia','Depósito') then
    v_yo := public.mi_agente_efectivo();

    begin
      v_cuenta_destino := nullif(current_setting('nexus.cobro_cuenta_destino', true), '')::uuid;
    exception when others then
      v_cuenta_destino := null;
    end;

    if v_yo is not null
       and v_cuenta_destino is not null
       and v_yo = v_cuenta_destino then
      -- No es cruzado: el dinero entró a la cuenta de quien está aplicando el pago.
      new.validacion_estado := 'validado';
      new.validado_at := now();
      new.validado_por_user_id := public.mi_usuario_id();
      new.validado_por_agente_id := v_yo;
      new.validacion_nota := 'Validado automáticamente: el pago entró a la cuenta del mismo agente que lo registró (no es cruzado)';
    else
      -- Cruzado, o no se sabe a qué cuenta entró: lo confirma una persona.
      new.validacion_estado := 'pendiente';
      new.validado_at := null;
      new.validado_por_user_id := null;
      new.validado_por_agente_id := null;
      new.validacion_nota := null;
    end if;
  else
    new.validacion_estado := 'no_requerida';
  end if;
  return new;
end;
$function$;

comment on function public.trg_abono_preparar_validacion() is
  'Decide si un pago bancario nace validado o pendiente. Solo pide validacion manual cuando es CRUZADO: quien registra el pago no es el dueno de la cuenta donde entro el dinero. El destino llega por la variable local a la transaccion nexus.cobro_cuenta_destino que fija seguros_registrar_cobro_con_entrega; si no esta, el pago nace pendiente.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Quien conoce el destino se lo pasa al trigger
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.seguros_registrar_cobro_con_entrega(
  p_cliente_id uuid,
  p_monto numeric,
  p_metodo text,
  p_referencia text,
  p_agente_cobro text,
  p_banco text default null,
  p_destino text default 'facturas',
  p_permitir_adelanto boolean default false,
  p_idempotency_key text default null,
  p_fecha timestamptz default now(),
  p_cuenta_destino_id uuid default null,
  p_comprobante_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
DECLARE
  v_result jsonb; v_abono record; v_entrega_id uuid;
  v_mi_agente uuid; v_auto_conf boolean; v_actor text; v_cuenta_nom text; v_cli_nom text;
BEGIN
  -- La cuenta destino se comprueba ANTES de mover dinero. Antes se comprobaba después del
  -- cobro; el resultado final era el mismo (todo en una transacción), pero así el error
  -- sale antes de tocar nada.
  IF p_cuenta_destino_id IS NOT NULL THEN
    IF p_metodo NOT IN ('Transferencia','Depósito') THEN
      RAISE EXCEPTION 'La cuenta destino solo aplica a pagos por Transferencia o Depósito';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.agentes WHERE id = p_cuenta_destino_id AND coalesce(activo,true)=true) THEN
      RAISE EXCEPTION 'La cuenta destino no existe o está inactiva';
    END IF;
  END IF;

  -- El destino viaja al BEFORE INSERT del abono, que es el único momento en que se puede
  -- decidir la validación sin que salga el aviso de "pago por validar". Se fija SIEMPRE
  -- (aunque sea a vacío) para que ningún valor previo de la misma transacción se cuele.
  PERFORM set_config('nexus.cobro_cuenta_destino', coalesce(p_cuenta_destino_id::text,''), true);

  SELECT public.seguros_registrar_cobro(
    p_cliente_id, p_monto, p_metodo, p_referencia, p_agente_cobro,
    p_banco, p_destino, p_permitir_adelanto, p_idempotency_key, p_fecha
  ) INTO v_result;

  -- Ya se usó: se limpia para que no afecte a nada más de esta transacción.
  PERFORM set_config('nexus.cobro_cuenta_destino', '', true);

  IF coalesce((v_result->>'reintento')::boolean, false) THEN
    RETURN v_result;
  END IF;
  IF p_cuenta_destino_id IS NULL THEN
    RETURN v_result;
  END IF;

  SELECT * INTO v_abono FROM public.abonos WHERE id = (v_result->>'abono_id')::uuid;
  IF v_abono.id IS NULL THEN
    RAISE EXCEPTION 'No se pudo releer el abono recién creado';
  END IF;

  IF v_abono.metodo NOT IN ('Transferencia','Depósito') THEN
    RAISE EXCEPTION 'La cuenta destino solo aplica a pagos por Transferencia o Depósito';
  END IF;

  SELECT nom INTO v_cuenta_nom FROM public.agentes WHERE id = p_cuenta_destino_id;
  SELECT nom INTO v_cli_nom FROM public.clientes WHERE id = v_abono.cliente_id;
  v_mi_agente := public.mi_agente_efectivo();
  v_auto_conf := (v_mi_agente IS NOT NULL AND v_mi_agente = p_cuenta_destino_id);
  SELECT coalesce(us.nom,'admin') INTO v_actor
    FROM public.usuarios_sistema us JOIN public.profiles p ON p.usuario_sistema_id = us.id
   WHERE p.id = auth.uid();

  INSERT INTO public.entregas_admin(
    agente_id, monto, metodo, banco, referencia, nota, fecha,
    confirmado, confirmado_at, confirmado_por,
    depositado, depositado_at, depositado_banco,
    es_directo, cobro_id, cobrado_por, created_by, abono_id, comprobante_url
  ) VALUES (
    p_cuenta_destino_id, v_abono.monto, v_abono.metodo, v_abono.banco, v_abono.referencia,
    'Depósito de cliente ' || coalesce(v_cli_nom,'?') || ' a cuenta ' || coalesce(v_cuenta_nom,'?'),
    coalesce(v_abono.fecha, now()),
    v_auto_conf, CASE WHEN v_auto_conf THEN now() ELSE NULL END, CASE WHEN v_auto_conf THEN v_actor ELSE NULL END,
    true, now(), v_abono.banco,
    true, v_abono.cliente_id, NULLIF(v_abono.agente_cobro,'')::uuid, v_actor, v_abono.id, p_comprobante_url
  ) RETURNING id INTO v_entrega_id;

  INSERT INTO public.auditoria(usuario, rol, accion, detalle, modulo, entity_table, entity_id, cliente_id)
  VALUES (v_actor, public.mi_rol(), 'ENTREGA_REGISTRADA',
    'Directa · abono ' || v_abono.id || ' · cuenta ' || coalesce(v_cuenta_nom,'?') || ' · RD$ ' || v_abono.monto,
    'Seguros', 'entregas_admin', v_entrega_id::text, v_abono.cliente_id);

  RETURN v_result || jsonb_build_object('entrega_id', v_entrega_id, 'entrega_auto_confirmada', v_auto_conf);
END;
$function$;

comment on function public.seguros_registrar_cobro_con_entrega(uuid,numeric,text,text,text,text,text,boolean,text,timestamptz,uuid,text) is
  'Registra el cobro y, si el pago fue bancario, la entrega directa a la cuenta destino, todo en una transaccion. Publica la cuenta destino en nexus.cobro_cuenta_destino para que el BEFORE INSERT del abono decida si el pago necesita validacion manual (solo si es cruzado).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Que el agente no se quede sin su acumulado
--
-- Hoy, cada pago bancario le manda al agente DOS avisos: "tienes un pago por validar" al
-- registrarlo y "pago validado · acumulado X" al validarlo. El segundo lo emite
-- trg_whatsapp_pago_validado, que es un trigger de UPDATE: si el pago nace ya validado,
-- nunca se dispara y el agente perdería su acumulado en el 83% de los pagos.
--
-- Se emite aquí el mismo aviso cuando el pago nace validado. Neto: el agente pasa de dos
-- mensajes por pago a uno solo, y ese uno es el que lleva información.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.trg_whatsapp_pago_aplicado()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_saldo numeric;
  v_periodo text;
  v_pagado_actual numeric;
  v_agente uuid;
  v_cliente_nom text;
  v_acumulado numeric;
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

      -- Pago bancario que nace ya validado (no cruzado): el resumen del acumulado lo manda
      -- aquí, porque trg_whatsapp_pago_validado solo escucha UPDATE y no se va a disparar.
      if new.metodo in ('Transferencia','Depósito') and new.validacion_estado='validado' then
        begin v_agente := nullif(new.agente_cobro,'')::uuid; exception when others then v_agente := null; end;
        if v_agente is not null then
          v_acumulado := public.seguros_acumulado_validado_agente(v_agente);
          perform public.whatsapp_notificar_pago_agente(
            'pago_validado_resumen',v_agente,new.id,
            jsonb_build_object('monto',new.monto,'acumulado',coalesce(v_acumulado,0))
          );
        end if;
      end if;
    end if;
  exception when others then
    raise warning 'trg_whatsapp_pago_aplicado fallo (abono % no se vio afectado): %',new.id,sqlerrm;
  end;
  return new;
end;
$function$;
