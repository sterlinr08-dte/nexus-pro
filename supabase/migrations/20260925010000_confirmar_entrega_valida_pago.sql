-- 2026-09-25 · Confirmar la entrega directa de un pago por transferencia/depósito también VALIDA ese pago.
--
-- Reporte del dueño: «no están llegando los mensajes a los clientes cuando se confirma sus pagos».
-- Diagnóstico (bitácora 2026-09-25-0110-claude.md): el WhatsApp al cliente («pago_confirmado_periodo_v2», evento
-- pago_aplicado) lo dispara trg_whatsapp_pago_validado cuando abonos.validacion_estado pasa de 'pendiente' a
-- 'validado'. En la cola única «PAGOS PENDIENTES POR VALIDAR» el administrador pulsaba CONFIRMAR en la entrega
-- directa (seguros_confirmar_entrega_admin), que solo marca entregas_admin.confirmado y deja el pago 'pendiente';
-- el botón VALIDAR (seguros_validar_pago) quedaba abajo, en «Validaciones bancarias». Resultado: 9 pagos del
-- 16 al 23-sep confirmados sin validar y sin mensaje al cliente.
--
-- Cambio: seguros_confirmar_entrega_admin (solo admin) valida en la MISMA transacción el pago enlazado a una
-- entrega DIRECTA si ese pago sigue 'pendiente' — mismas columnas que seguros_validar_pago. Así el trigger
-- existente envía el WhatsApp al cliente y los avisos de ciclo al agente/administradores. No mueve dinero
-- (validar no crea cobros ni entregas: no hay doble contabilización). Entregas no directas o sin pago enlazado
-- se comportan igual que antes. No toca pagos históricos.
CREATE OR REPLACE FUNCTION public.seguros_confirmar_entrega_admin(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_actor text; v_row public.entregas_admin; v_target public.entregas_admin; v_validado boolean := false;
BEGIN
  IF public.mi_rol() IS NULL OR public.mi_organizacion() IS DISTINCT FROM (SELECT id FROM public.organizaciones WHERE slug='nexus-pro') THEN
    RAISE EXCEPTION 'No autorizado (org)';
  END IF;
  IF public.mi_rol() <> 'admin' THEN
    RAISE EXCEPTION 'Solo un administrador puede confirmar una entrega';
  END IF;

  SELECT coalesce(us.nom,'admin') INTO v_actor FROM public.usuarios_sistema us JOIN public.profiles p ON p.usuario_sistema_id=us.id WHERE p.id=auth.uid();

  UPDATE public.entregas_admin SET confirmado = true, confirmado_at = now(), confirmado_por = v_actor
  WHERE id = p_id AND anulado = false AND confirmado = false
  RETURNING * INTO v_row;

  IF v_row.id IS NOT NULL THEN
    INSERT INTO public.auditoria(usuario, rol, accion, detalle, modulo, entity_table, entity_id)
    VALUES (v_actor, public.mi_rol(), 'ENTREGA_CONFIRMADA', 'Entrega '||p_id, 'Seguros', 'entregas_admin', p_id::text);

    -- Entrega directa de un pago bancario todavía pendiente: confirmar = validar (dispara el WhatsApp al cliente).
    IF v_row.es_directo AND v_row.abono_id IS NOT NULL THEN
      UPDATE public.abonos
         SET validacion_estado = 'validado',
             validado_at = now(),
             validado_por_user_id = public.mi_usuario_id(),
             validado_por_agente_id = coalesce(public.mi_agente_efectivo(), v_row.agente_id),
             validacion_nota = 'Validado al confirmar la entrega directa'
       WHERE id = v_row.abono_id
         AND validacion_estado = 'pendiente'
         AND coalesce(estado,'') <> 'Reversado'
         AND metodo IN ('Transferencia','Depósito');
      v_validado := FOUND;
      IF v_validado THEN
        INSERT INTO public.auditoria(usuario, rol, accion, detalle, modulo, entity_table, entity_id)
        VALUES (v_actor, public.mi_rol(), 'PAGO_VALIDADO', 'Pago '||v_row.abono_id||' validado al confirmar la entrega '||p_id, 'Seguros', 'abonos', v_row.abono_id::text);
      END IF;
    END IF;
    RETURN jsonb_build_object('ok', true, 'id', p_id, 'reintento', false, 'pago_validado', v_validado);
  END IF;

  SELECT * INTO v_target FROM public.entregas_admin WHERE id = p_id;
  IF v_target.id IS NULL THEN RAISE EXCEPTION 'La entrega no existe'; END IF;
  IF v_target.anulado THEN RAISE EXCEPTION 'La entrega está anulada, no se puede confirmar'; END IF;
  IF v_target.confirmado THEN RETURN jsonb_build_object('ok', true, 'id', p_id, 'reintento', true); END IF;
  RAISE EXCEPTION 'No se pudo confirmar la entrega';
END;
$function$;
