-- NEXUS PRO Seguros · «Cuenta segura» en el cobro por Transferencia/Depósito (dueño, 12-nov-2026).
-- Problema (bitácoras 2026-11-09 «auditoria-comprobantes-cuenta-robinson» y 2026-11-12 «correccion-pago-valdez»):
-- pagos que entraron a la cuenta del administrador quedaban «a cuenta de» otro agente, y cuando ese agente marcaba
-- «mi cuenta» el pago se validaba y la entrega se confirmaba solos, sin que nadie más lo revisara.
--
-- Qué cambia (solo reglas de validación; no cambia montos, asientos ni custodia ya registrada; no toca datos viejos):
--   1. Transferencia/Depósito sin comprobante: no se registra (excepto el administrador).
--   2. Si el comprobante leído dice que el dinero entró a una cuenta del administrador (mis_cuentas_bancarias) y se
--      eligió la cuenta de otro agente: no se registra; el mensaje dice qué cuenta elegir.
--   3. Solo la cuenta del administrador se valida/confirma sola. La cuenta de otro agente SIEMPRE queda pendiente.
--   4. Un pago pendiente a cuenta de otro agente solo lo valida el administrador (antes también el dueño de la cuenta).
--   5. El aviso de WhatsApp «pago pendiente de validación» de esos pagos va al administrador (quien puede validarlo).
-- Vuelta atrás: volver a crear estas 4 funciones con la definición anterior (están en las migraciones previas) y
-- borrar seguros_cuenta_es_del_admin.

create or replace function public.seguros_cuenta_es_del_admin(p_agente uuid)
returns boolean language sql stable security definer set search_path to 'public','pg_temp' as $$
  select exists (select 1 from public.agentes where id = p_agente and lower(coalesce(cargo,'')) = 'admin')
$$;
revoke all on function public.seguros_cuenta_es_del_admin(uuid) from public, anon;
grant execute on function public.seguros_cuenta_es_del_admin(uuid) to authenticated, service_role;

-- 3. Validación automática solo cuando la cuenta es del administrador y la aplica él mismo.
create or replace function public.trg_abono_preparar_validacion()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
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
       and v_yo = v_cuenta_destino
       and public.seguros_cuenta_es_del_admin(v_cuenta_destino) then
      -- No es cruzado y la cuenta es del administrador: él mismo ve su banco.
      new.validacion_estado := 'validado';
      new.validado_at := now();
      new.validado_por_user_id := public.mi_usuario_id();
      new.validado_por_agente_id := v_yo;
      new.validacion_nota := 'Validado automáticamente: el pago entró a la cuenta del administrador y lo registró él mismo';
    else
      -- Cruzado, cuenta de otro agente, o no se sabe a qué cuenta entró: lo confirma una persona.
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

-- 1, 2 y 3. Cobro con entrega directa.
create or replace function public.seguros_registrar_cobro_con_entrega(p_cliente_id uuid, p_monto numeric, p_metodo text, p_referencia text, p_agente_cobro text, p_banco text default null::text, p_destino text default 'facturas'::text, p_permitir_adelanto boolean default false, p_idempotency_key text default null::text, p_fecha timestamp with time zone default now(), p_cuenta_destino_id uuid default null::uuid, p_comprobante_url text default null::text)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $function$
DECLARE
  v_result jsonb; v_abono record; v_entrega_id uuid;
  v_mi_agente uuid; v_auto_conf boolean; v_actor text; v_cuenta_nom text; v_cli_nom text;
  v_cta4 text; v_comp text := nullif(btrim(coalesce(p_comprobante_url,'')),'');
BEGIN
  -- La cuenta destino se comprueba ANTES de mover dinero.
  IF p_cuenta_destino_id IS NOT NULL THEN
    IF p_metodo NOT IN ('Transferencia','Depósito') THEN
      RAISE EXCEPTION 'La cuenta destino solo aplica a pagos por Transferencia o Depósito';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.agentes WHERE id = p_cuenta_destino_id AND coalesce(activo,true)=true) THEN
      RAISE EXCEPTION 'La cuenta destino no existe o está inactiva';
    END IF;
  END IF;

  -- Cuenta segura (12-nov-2026). Un reintento con la misma llave no se frena: ese cobro ya está hecho.
  IF p_metodo IN ('Transferencia','Depósito')
     AND NOT EXISTS (SELECT 1 FROM public.abonos WHERE idempotency_key = p_idempotency_key) THEN
    -- 1. Sin comprobante no se registra (el administrador sí puede).
    IF v_comp IS NULL AND public.mi_rol() IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Falta el comprobante: adjunte la foto de la transferencia o del depósito';
    END IF;
    -- 2. El comprobante dice que entró a una cuenta del administrador y se eligió la de otro agente.
    IF v_comp IS NOT NULL AND p_cuenta_destino_id IS NOT NULL
       AND NOT public.seguros_cuenta_es_del_admin(p_cuenta_destino_id) THEN
      SELECT right(regexp_replace(coalesce(pc.ia_cuenta_destino,''),'\D','','g'),4) INTO v_cta4
        FROM public.pago_comprobantes pc
       WHERE pc.storage_ref = v_comp
       ORDER BY pc.created_at DESC LIMIT 1;
      IF length(coalesce(v_cta4,'')) = 4 AND EXISTS (
           SELECT 1 FROM public.mis_cuentas_bancarias m
            WHERE coalesce(m.activa,true)
              AND right(regexp_replace(coalesce(m.numero,''),'\D','','g'),4) = v_cta4) THEN
        RAISE EXCEPTION 'El comprobante dice que el dinero entró a la cuenta terminada en % del administrador. Elija esa cuenta de destino.', v_cta4;
      END IF;
    END IF;
  END IF;

  PERFORM set_config('nexus.cobro_cuenta_destino', coalesce(p_cuenta_destino_id::text,''), true);

  SELECT public.seguros_registrar_cobro(
    p_cliente_id, p_monto, p_metodo, p_referencia, p_agente_cobro,
    p_banco, p_destino, p_permitir_adelanto, p_idempotency_key, p_fecha
  ) INTO v_result;

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
  -- 3. Solo la cuenta del administrador se confirma sola.
  v_auto_conf := (v_mi_agente IS NOT NULL AND v_mi_agente = p_cuenta_destino_id
                  AND public.seguros_cuenta_es_del_admin(p_cuenta_destino_id));
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

-- 4. Validar: la cuenta de otro agente solo la valida el administrador.
create or replace function public.seguros_validar_pago(p_abono_id uuid, p_nota text default null::text)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $function$
declare
  v_abono public.abonos%rowtype;
  v_agente_actual uuid;
  v_agente_pago uuid;   -- quien cobró
  v_cuenta uuid;        -- de quién es la cuenta donde entró el dinero
  v_cuenta_nom text;
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

  begin v_agente_pago := nullif(v_abono.agente_cobro,'')::uuid; exception when others then v_agente_pago := null; end;

  if v_abono.validacion_estado='validado' then
    v_acumulado := case when v_agente_pago is null then 0 else public.seguros_acumulado_validado_agente(v_agente_pago) end;
    return jsonb_build_object('ok',true,'reintento',true,'abono_id',v_abono.id,
                              'agente_id',v_agente_pago,
                              'agente',(select nom from public.agentes where id=v_agente_pago),
                              'acumulado',coalesce(v_acumulado,0));
  end if;
  if v_abono.validacion_estado<>'pendiente' then raise exception 'estado de validación inválido'; end if;

  v_agente_actual := public.mi_agente_efectivo();

  select e.agente_id into v_cuenta
    from public.entregas_admin e
   where e.abono_id = p_abono_id
     and e.es_directo
     and not coalesce(e.anulado,false)
   order by e.created_at
   limit 1;
  v_cuenta := coalesce(v_cuenta, v_agente_pago);

  if v_cuenta is null then raise exception 'el pago no tiene agente de cuenta válido'; end if;

  if public.mi_rol()<>'admin' then
    select nom into v_cuenta_nom from public.agentes where id=v_cuenta;
    if not public.seguros_cuenta_es_del_admin(v_cuenta) then
      -- Cuenta segura (12-nov-2026): el dueño de la cuenta ya no se valida a sí mismo.
      raise exception 'este pago entró a la cuenta de %: solo el administrador puede validarlo',
        coalesce(v_cuenta_nom,'otro agente');
    end if;
    if v_agente_actual is distinct from v_cuenta then
      raise exception 'este pago entró a la cuenta de %: solo esa persona o el administrador pueden validarlo',
        coalesce(v_cuenta_nom,'otro agente');
    end if;
  end if;

  update public.abonos
     set validacion_estado='validado',
         validado_at=now(),
         validado_por_user_id=public.mi_usuario_id(),
         validado_por_agente_id=coalesce(v_agente_actual,v_cuenta),
         validacion_nota=nullif(btrim(coalesce(p_nota,'')),'')
   where id=p_abono_id;

  v_acumulado := case when v_agente_pago is null then 0 else public.seguros_acumulado_validado_agente(v_agente_pago) end;
  return jsonb_build_object('ok',true,'reintento',false,'abono_id',p_abono_id,
                            'agente_id',v_agente_pago,
                            'agente',(select nom from public.agentes where id=v_agente_pago),
                            'cuenta_id',v_cuenta,
                            'cuenta',(select nom from public.agentes where id=v_cuenta),
                            'acumulado',coalesce(v_acumulado,0));
end;
$function$;

-- 5. El aviso «pago pendiente de validación» va a quien puede validarlo: si la cuenta es de otro agente, al administrador.
create or replace function public.trg_whatsapp_pago_aplicado()
returns trigger language plpgsql security definer set search_path to 'public','extensions' as $function$
declare
  v_saldo numeric;
  v_periodo text;
  v_pagado_actual numeric;
  v_agente uuid;
  v_destino uuid;
  v_admin uuid;
  v_cliente_nom text;
begin
  begin
    if new.estado is distinct from 'Reversado' and coalesce(new.monto,0)>0 then
      if new.metodo in ('Transferencia','Depósito') and new.validacion_estado='pendiente' then
        begin v_agente := nullif(new.agente_cobro,'')::uuid; exception when others then v_agente := null; end;

        begin
          v_destino := nullif(current_setting('nexus.cobro_cuenta_destino', true),'')::uuid;
        exception when others then
          v_destino := null;
        end;
        v_destino := coalesce(v_destino, v_agente);

        -- Cuenta segura (12-nov-2026): la cuenta de otro agente la valida el administrador.
        if v_destino is not null and not public.seguros_cuenta_es_del_admin(v_destino) then
          select id into v_admin from public.agentes
           where lower(coalesce(cargo,''))='admin' and coalesce(activo,true) limit 1;
          v_destino := coalesce(v_admin, v_destino);
        end if;

        select nom into v_cliente_nom from public.clientes where id=new.cliente_id;
        if v_destino is not null then
          perform public.whatsapp_notificar_pago_agente(
            'pago_pendiente_validacion',v_destino,new.id,
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
$function$;
