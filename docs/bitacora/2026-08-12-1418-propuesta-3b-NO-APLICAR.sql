-- ══════════════════════════════════════════════════════════════════════════
-- NO APLICAR — Bloque 3B: DISEÑO PROPUESTO, solo para revisión cruzada.
-- Generado por Claude, 2026-08-12, en respuesta a docs/bitacora/2026-08-12-0916-chatgpt.md.
-- NO se ha aplicado a producción. Probado únicamente dentro de BEGIN...ROLLBACK.
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. Migración de esquema (aditiva) ───────────────────────────────────────
-- Cierra la ventana de condición de carrera (TOCTOU) de la generación de
-- facturas: hoy el anti-duplicado es un SELECT seguido de un INSERT, sin
-- ningún candado real entre los dos pasos — dos llamadas concurrentes (dos
-- pestañas abiertas del mismo usuario, o el timer verificarAutoFacturacion()
-- del navegador disparándose en varias SESIONES DE VARIOS USUARIOS a la vez el
-- día del corte) pueden ambas pasar el chequeo antes de que ninguna haya
-- comprometido su INSERT, y terminar facturando al mismo cliente DOS veces
-- para el mismo período — cada una con su propio NCF válido (el NCF en sí no
-- se duplica, eso ya está protegido), pero doble cobro real. Este índice hace
-- que el SEGUNDO intento falle con una violación de unicidad real de la base,
-- no con una carrera ganada por quien llegó primero al servidor.
CREATE UNIQUE INDEX IF NOT EXISTS facturas_cliente_periodo_activa_unico
  ON public.facturas (cliente_id, periodo)
  WHERE estado <> 'Anulada';

-- ── 2. RPC de generación manual ─────────────────────────────────────────────
-- Diseño elegido (Opción A de las 2 presentadas en la entrega): el frontend
-- SIGUE calculando prima_base/prima_deps con la MISMA lógica JS de hoy
-- (getPT/getPD, precio especial del cliente, etc.) y los manda como parámetro
-- — igual nivel de confianza que crear_factura_auto_tx ya tiene hoy con el
-- cron (que recibe sus montos ya calculados de la Edge Function), así que esto
-- NO es una regresión de seguridad frente al status quo. Lo que SÍ se mueve al
-- servidor, porque es barato y cierra un hueco real: deuda_ant SIEMPRE se
-- recalcula aquí adentro contra clientes.deuda_total/pagado frescos, nunca se
-- confía en lo que mande el navegador para ese campo.
--
-- No reutiliza crear_factura_auto_tx directamente (esa queda intacta, sigue
-- siendo service_role-only para el cron) — es una RPC hermana, mismo patrón
-- de atomicidad, pero con guardia de rol/organización real (crear_factura_
-- auto_tx no la tiene porque hoy solo la llama un contexto ya confiable).
-- Sí REUTILIZA siguiente_ncf() para la numeración (no reimplementa el
-- locking de secuencias_ncf una segunda vez).
CREATE OR REPLACE FUNCTION public.seguros_generar_factura_manual(
  p_cliente_id uuid,
  p_periodo text,
  p_mes integer,
  p_anio integer,
  p_prima_base numeric,
  p_prima_deps numeric,
  p_tipo_ncf text,
  p_fecha_emision date,
  p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_rol text;
  v_cli public.clientes%ROWTYPE;
  v_existente public.asientos%ROWTYPE;
  v_deuda_ant numeric;
  v_total numeric;
  v_aumento numeric;
  v_ncf text;
  v_factura_id uuid;
  v_asiento_id uuid;
  v_referencia text;
  v_nombre_usuario text;
BEGIN
  -- Guardia de rol/organización. Recomendación: admin-only (ver Matriz actor×
  -- operación en la entrega — hoy este flujo NO tiene NINGÚN gate, ni de rol
  -- ni de permiso; se propone endurecer, no aflojar).
  v_rol := public.mi_rol();
  IF v_rol IS NULL OR v_rol <> 'admin' THEN
    RAISE EXCEPTION 'No autorizado: generar factura manual requiere rol admin';
  END IF;
  IF public.mi_organizacion() IS DISTINCT FROM (SELECT id FROM public.organizaciones WHERE slug='nexus-pro') THEN
    RAISE EXCEPTION 'No autorizado: este módulo es exclusivo de la organización de seguros';
  END IF;

  -- Idempotencia: misma clave -> mismo resultado, sin duplicar. Reusa el
  -- índice único asientos.idempotency_key ya creado en Bloque 3A (sin migración
  -- nueva para esto).
  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'idempotency_key es obligatorio';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));
  SELECT * INTO v_existente FROM public.asientos WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'reintento', true, 'asiento_id', v_existente.id, 'factura_id', v_existente.origen_id);
  END IF;

  -- Validaciones de entrada.
  IF p_cliente_id IS NULL THEN RAISE EXCEPTION 'cliente_id es obligatorio'; END IF;
  IF p_periodo IS NULL OR p_periodo !~ '^\d{4}-\d{2}$' THEN RAISE EXCEPTION 'periodo inválido (esperado AAAA-MM): %', p_periodo; END IF;
  IF p_mes IS NULL OR p_mes < 1 OR p_mes > 12 THEN RAISE EXCEPTION 'mes inválido'; END IF;
  IF p_anio IS NULL OR p_anio < 2020 OR p_anio > extract(year from now())::int + 1 THEN RAISE EXCEPTION 'año fuera de rango'; END IF;
  IF p_prima_base IS NULL OR p_prima_base < 0 THEN RAISE EXCEPTION 'prima_base inválida'; END IF;
  IF p_prima_deps IS NULL OR p_prima_deps < 0 THEN RAISE EXCEPTION 'prima_deps inválida'; END IF;
  IF p_prima_base + p_prima_deps <= 0 THEN RAISE EXCEPTION 'la prima total debe ser mayor que 0'; END IF;
  IF p_fecha_emision IS NULL OR p_fecha_emision < date '2020-01-01' OR p_fecha_emision > (current_date + interval '1 day')::date THEN
    RAISE EXCEPTION 'fecha_emision fuera de rango razonable';
  END IF;

  -- Cliente: lectura fresca y bloqueada del servidor — nunca se confía en el
  -- estado del cliente (activo/permitir_facturacion/deuda) enviado por el
  -- navegador. FOR UPDATE también sirve de candado natural contra un cobro o
  -- una segunda generación concurrente tocando la deuda del MISMO cliente.
  SELECT * INTO v_cli FROM public.clientes WHERE id = p_cliente_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cliente no encontrado'; END IF;
  IF v_cli.activo IS DISTINCT FROM true THEN RAISE EXCEPTION 'El cliente no está activo'; END IF;
  IF v_cli.permitir_facturacion IS FALSE THEN RAISE EXCEPTION 'Este cliente tiene la facturación automática desactivada'; END IF;

  -- Anti-duplicado: la garantía REAL es el índice único
  -- facturas_cliente_periodo_activa_unico (sección 1) — esta comprobación de
  -- aquí es solo para devolver un mensaje claro ANTES de intentar el INSERT en
  -- el caso común (no-carrera); si de todos modos hay una carrera real, el
  -- INSERT de abajo fallará con 23505 y el índice es quien de verdad protege.
  IF EXISTS (SELECT 1 FROM public.facturas WHERE cliente_id = p_cliente_id AND periodo = p_periodo AND estado <> 'Anulada') THEN
    RETURN jsonb_build_object('ok', false, 'razon', 'Ya existe una factura no anulada de este cliente para este período', 'periodo', p_periodo);
  END IF;

  -- deuda_ant SIEMPRE se recalcula server-side — mismo cálculo que pend(c) del
  -- frontend (index.html:2905), nunca se confía en lo que mande el navegador.
  v_deuda_ant := GREATEST(0, coalesce(v_cli.deuda_total,0) - coalesce(v_cli.pagado,0));
  v_total := p_prima_base + p_prima_deps + v_deuda_ant;
  v_aumento := p_prima_base + p_prima_deps;

  -- NCF: reusa el mecanismo atómico ya endurecido en Bloque 2A (siguiente_ncf,
  -- UPDATE...RETURNING con auto-creación de secuencia si falta) — no reimplementa
  -- el locking de secuencias_ncf una segunda vez.
  v_ncf := public.siguiente_ncf(p_tipo_ncf);
  IF v_ncf IS NULL AND p_tipo_ncf IS NOT NULL AND p_tipo_ncf <> 'SIN' THEN
    RAISE EXCEPTION 'No se pudo generar el NCF para %', p_tipo_ncf;
  END IF;

  SELECT nom INTO v_nombre_usuario FROM public.usuarios_sistema WHERE id = public.mi_usuario_id();

  INSERT INTO public.facturas(
    cliente_id, cliente_nom, plan, empresa_id, periodo, mes, anio,
    prima_base, prima_deps, deuda_ant, total, estado, wa_sent, ncf, tipo_ncf,
    fecha_emision, origen, created_by_user_id, created_by_name
  ) VALUES (
    p_cliente_id, v_cli.nom, v_cli.plan, v_cli.empresa_id, p_periodo, p_mes, p_anio,
    p_prima_base, p_prima_deps, v_deuda_ant, v_total, 'Pendiente', false, v_ncf, p_tipo_ncf,
    p_fecha_emision, 'MANUAL', public.mi_usuario_id()::text, coalesce(v_nombre_usuario, v_rol)
  ) RETURNING id INTO v_factura_id;

  UPDATE public.clientes SET deuda_total = coalesce(deuda_total,0) + v_aumento WHERE id = p_cliente_id;

  -- Referencia distinta a 'F-NNN' (el contador por-lote no persistente y
  -- colisionante del frontend actual) y distinta a 'AUTO-%' (crear_factura_
  -- auto_tx) — así queda claro a qué flujo pertenece cada asiento con solo
  -- mirar la referencia, y el bloqueo de la Fase 3A ('F-\d+', 'AUTO-%') sigue
  -- funcionando sin tocarlo. El candado real, de todos modos, es
  -- tipo_origen='factura_manual' (ver seguros_corregir_asiento_manual, 3A).
  v_referencia := 'F-MAN-' || substring(v_factura_id::text from 1 for 8);
  INSERT INTO public.asientos(
    fecha, referencia, descripcion, cuenta_dr_cod, cuenta_dr_nom, monto_dr,
    cuenta_cr_cod, cuenta_cr_nom, monto_cr, tipo_origen, origen_id, idempotency_key
  ) VALUES (
    p_fecha_emision, v_referencia,
    'Factura manual ' || p_periodo || ' — ' || v_cli.nom || ' [' || coalesce(v_ncf,'SIN NCF') || ']',
    '1201', 'Cuentas por cobrar', v_aumento, '4101', 'Ingresos por primas', v_aumento,
    'factura_manual', v_factura_id, p_idempotency_key
  ) RETURNING id INTO v_asiento_id;

  INSERT INTO public.auditoria(ts, usuario, rol, accion, detalle, modulo, entity_table, entity_id, new_data, result, origen, organizacion_id, cliente_id)
  VALUES (
    now()::text, public.mi_usuario_id()::text, v_rol, 'FACTURA_MANUAL_GENERADA',
    'Factura ' || p_periodo || ' — ' || v_cli.nom || ' · ' || v_aumento || ' · NCF ' || coalesce(v_ncf,'SIN'),
    'Facturas', 'facturas', v_factura_id::text,
    jsonb_build_object('periodo', p_periodo, 'monto', v_aumento, 'ncf', v_ncf)::text,
    'OK', 'seguros_generar_factura_manual', public.mi_organizacion(), p_cliente_id
  );

  RETURN jsonb_build_object('ok', true, 'reintento', false, 'factura_id', v_factura_id, 'asiento_id', v_asiento_id, 'ncf', v_ncf, 'referencia', v_referencia, 'total', v_total);
END;
$function$;

-- ── 3. RPC de anulación atómica ─────────────────────────────────────────────
-- Une en UNA transacción lo que hoy son 3 escrituras REST separadas y sin
-- candado (facturas.estado, clientes.deuda_total, asientos + el resync
-- posterior de las facturas hermanas, hoy una 4ta llamada aparte que puede
-- fallar sin que nadie se entere — el catch actual solo hace console.warn).
CREATE OR REPLACE FUNCTION public.seguros_anular_factura(
  p_factura_id uuid,
  p_motivo text,
  p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_rol text;
  v_motivo text;
  v_fact public.facturas%ROWTYPE;
  v_existente public.asientos%ROWTYPE;
  v_prima_rev numeric;
  v_asiento_id uuid;
  v_referencia text;
  v_cli_id uuid;
  v_credito numeric;
  v_tot numeric;
  v_pay numeric;
  v_saldo numeric;
  v_nuevo_estado text;
  r record;
BEGIN
  v_rol := public.mi_rol();
  IF v_rol IS NULL OR v_rol <> 'admin' THEN
    RAISE EXCEPTION 'No autorizado: anular una factura requiere rol admin';
  END IF;
  IF public.mi_organizacion() IS DISTINCT FROM (SELECT id FROM public.organizaciones WHERE slug='nexus-pro') THEN
    RAISE EXCEPTION 'No autorizado: este módulo es exclusivo de la organización de seguros';
  END IF;

  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'idempotency_key es obligatorio';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));
  SELECT * INTO v_existente FROM public.asientos WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'reintento', true, 'asiento_reversa_id', v_existente.id, 'factura_id', v_existente.origen_id);
  END IF;

  v_motivo := btrim(coalesce(p_motivo, ''));
  IF v_motivo = '' THEN RAISE EXCEPTION 'El motivo de la anulación es obligatorio'; END IF;

  -- Único primitivo atómico necesario para el guardia: un UPDATE condicional.
  -- Si otra sesión ya anuló esta MISMA factura (o si está Pagado), rows-affected
  -- es 0 y se decide qué responder leyendo el estado ya comprometido en la base
  -- — nunca "re-decidir" contra un SELECT no bloqueante aparte, que es
  -- exactamente el hueco que tiene el código actual (compara f.estado en
  -- memoria del navegador, no en la base, dos pestañas pueden ambas pasar el
  -- chequeo y ambas reversar la misma factura dos veces).
  UPDATE public.facturas
     SET estado = 'Anulada'
   WHERE id = p_factura_id AND estado NOT IN ('Anulada','Pagado')
   RETURNING * INTO v_fact;

  IF NOT FOUND THEN
    SELECT * INTO v_fact FROM public.facturas WHERE id = p_factura_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Factura no encontrada'; END IF;
    IF v_fact.estado = 'Anulada' THEN
      RETURN jsonb_build_object('ok', true, 'reintento', true, 'factura_id', v_fact.id, 'nota', 'La factura ya estaba anulada');
    END IF;
    RAISE EXCEPTION 'No se puede anular: una factura % no se puede anular', v_fact.estado;
  END IF;

  v_prima_rev := coalesce(v_fact.prima_base,0) + coalesce(v_fact.prima_deps,0);
  v_cli_id := v_fact.cliente_id;

  IF v_prima_rev > 0 AND v_cli_id IS NOT NULL THEN
    UPDATE public.clientes SET deuda_total = GREATEST(0, coalesce(deuda_total,0) - v_prima_rev) WHERE id = v_cli_id;

    v_referencia := 'AST-ANUL-' || substring(v_fact.id::text from 1 for 8);
    INSERT INTO public.asientos(
      fecha, referencia, descripcion, cuenta_dr_cod, cuenta_dr_nom, monto_dr,
      cuenta_cr_cod, cuenta_cr_nom, monto_cr, tipo_origen, origen_id, idempotency_key
    ) VALUES (
      now(), v_referencia,
      'Anulación factura ' || coalesce(v_fact.ncf, v_fact.periodo, '') || ' — ' || coalesce(v_fact.cliente_nom,'') || ' · ' || v_motivo,
      '4101', 'Ingresos por primas', v_prima_rev, '1201', 'Cuentas por cobrar — Clientes', v_prima_rev,
      'reversa_factura', v_fact.id, p_idempotency_key
    ) RETURNING id INTO v_asiento_id;

    -- Resync del estado de las facturas restantes del cliente (mismo algoritmo
    -- que resyncEstadoFacturas/_saldoFacturasCliente del frontend: reparto
    -- oldest-first del "pagado" del cliente sobre sus facturas no anuladas)
    -- dentro de la MISMA transacción — así nunca queda una factura hermana con
    -- una etiqueta vieja si este paso fallara a mitad de camino (hoy es un
    -- await aparte en JS, después del toast de éxito, sin ningún candado).
    SELECT coalesce(pagado,0) INTO v_credito FROM public.clientes WHERE id = v_cli_id;
    FOR r IN
      SELECT id, coalesce(prima_base,0)+coalesce(prima_deps,0) AS tot, estado
      FROM public.facturas
      WHERE cliente_id = v_cli_id AND estado <> 'Anulada'
      ORDER BY periodo ASC
    LOOP
      v_tot := r.tot;
      v_pay := LEAST(v_credito, v_tot);
      v_saldo := GREATEST(0, v_tot - v_pay);
      v_credito := v_credito - v_pay;
      v_nuevo_estado := CASE WHEN v_saldo <= 0.009 THEN 'Pagado'
                              WHEN v_saldo < v_tot - 0.009 THEN 'Parcial'
                              ELSE 'Pendiente' END;
      IF v_nuevo_estado <> r.estado THEN
        UPDATE public.facturas SET estado = v_nuevo_estado WHERE id = r.id;
      END IF;
    END LOOP;
  ELSE
    -- Sin prima que revertir (factura en 0, o sin cliente ligado) — no hay
    -- ningún efecto contable real que anotar, así que no se inserta asiento.
    v_asiento_id := NULL;
  END IF;

  INSERT INTO public.auditoria(ts, usuario, rol, accion, detalle, modulo, entity_table, entity_id, old_data, new_data, result, origen, organizacion_id, cliente_id)
  VALUES (
    now()::text, public.mi_usuario_id()::text, v_rol, 'FACTURA_ANULADA',
    'Factura ' || coalesce(v_fact.ncf, v_fact.periodo, '') || ' de ' || coalesce(v_fact.cliente_nom,'') || ' · ' || v_prima_rev || ' · Motivo: ' || v_motivo,
    'Facturas', 'facturas', v_fact.id::text,
    jsonb_build_object('estado_previo', 'no-anulada')::text,
    jsonb_build_object('asiento_reversa_id', v_asiento_id)::text,
    'OK', 'seguros_anular_factura', public.mi_organizacion(), v_cli_id
  );

  RETURN jsonb_build_object('ok', true, 'reintento', false, 'factura_id', v_fact.id, 'cliente_id', v_cli_id, 'asiento_reversa_id', v_asiento_id, 'prima_revertida', v_prima_rev);
END;
$function$;

-- ── 4. GRANT / REVOKE ────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.seguros_generar_factura_manual(uuid,text,integer,integer,numeric,numeric,text,date,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.seguros_generar_factura_manual(uuid,text,integer,integer,numeric,numeric,text,date,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.seguros_generar_factura_manual(uuid,text,integer,integer,numeric,numeric,text,date,text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.seguros_anular_factura(uuid,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.seguros_anular_factura(uuid,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.seguros_anular_factura(uuid,text,text) TO authenticated, service_role;

-- ══════════════════════════════════════════════════════════════════════════
-- FIN — NO APLICAR sin la autorización explícita de 3C.
-- ══════════════════════════════════════════════════════════════════════════
