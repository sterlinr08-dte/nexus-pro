-- ============================================================================
-- PROPUESTA — Subfase 2B, Bloque 3 — Asiento manual balanceado (Contabilidad)
-- ============================================================================
-- ⚠️  NO APLICAR TODAVÍA. Este archivo es SOLO DISEÑO, para revisión de ChatGPT.
--     No se ha ejecutado de forma persistente contra producción — se probó
--     línea por línea dentro de BEGIN...ROLLBACK (ver la entrada de bitácora
--     asociada para los resultados de esa prueba, 17/17 en verde).
--
-- CIERRA: el hallazgo de que cualquier `authenticated` (incluido rol `agente`)
--   podía INSERT/UPDATE libremente sobre `asientos` vía REST, sin pasar por
--   ninguna validación de negocio (Debe=Haber ya lo protege un CHECK, pero
--   cuentas inválidas, montos <=0, referencias arbitrarias, y — el más grave —
--   reescribir o "corregir" en silencio un asiento ya existente [incluidos los
--   automáticos de facturación/cobro/anulación] NO tenían ningún candado).
--
-- NO CIERRA TODAVÍA (a propósito, ver bitácora §9): el candado de escritura
--   general sobre `asientos` (`asientos_write_admin`) SOLO se puede activar
--   después de migrar `_genFacturasInterno()` (index.html) a su propia RPC —
--   hoy esa función escribe en `asientos` con rol `agente`/`cajero`/`cobros`/
--   `supervisor` (el botón "Generar" en Facturas no tiene ningún gate de
--   permiso) y quedaría rota si este bloque se aplica solo. Ver Bloque 4.
--
-- Requiere (ya en producción, sin tocar aquí): mi_rol(), mi_organizacion(),
--   mi_usuario_id(), tabla auditoria, trigger que bloquea DELETE físico sobre
--   asientos, CHECK asientos_partida_balanceada_chk (Debe=Haber).
-- ============================================================================


-- ── 1) RLS: separar lectura (amplia) de escritura (solo admin) ─────────────
--
-- HOY: una sola política `all_asientos` (FOR ALL TO public USING(true)) deja
-- pasar CUALQUIER operación a CUALQUIER usuario autenticado de nexus-pro, sin
-- distinguir SELECT de INSERT/UPDATE/DELETE. Se reemplaza por dos políticas
-- explícitas. La lectura NO se restringe más de lo que ya estaba (todo agente
-- de la organización sigue viendo el libro diario/mayor, como hoy).

DROP POLICY IF EXISTS all_asientos ON public.asientos;

CREATE POLICY asientos_select_org ON public.asientos
  FOR SELECT TO authenticated
  USING (
    mi_rol() IS NOT NULL
    AND mi_organizacion() = (SELECT id FROM organizaciones WHERE slug = 'nexus-pro')
  );

CREATE POLICY asientos_write_admin ON public.asientos
  FOR ALL TO authenticated
  USING (
    mi_rol() = 'admin'
    AND mi_organizacion() = (SELECT id FROM organizaciones WHERE slug = 'nexus-pro')
  )
  WITH CHECK (
    mi_rol() = 'admin'
    AND mi_organizacion() = (SELECT id FROM organizaciones WHERE slug = 'nexus-pro')
  );

-- NOTA IMPORTANTE (ver bitácora §9, "punto crítico de arquitectura"): esta
-- policy de escritura, aplicada HOY tal cual, bloquearía a `_genFacturasInterno()`
-- (index.html), que hoy inserta en `asientos` con rol agente/cajero/cobros/
-- supervisor sin ningún gate. NO aplicar esta parte del bloque hasta migrar
-- esa función a una RPC propia (fuera de alcance del Bloque 3 — toca `facturas`,
-- expresamente prohibido en este bloque).


-- ── 2) RPC: registrar un asiento manual nuevo (solo admin) ─────────────────
--
-- Mismo patrón de capas ya usado en seguros_registrar_cobro/seguros_reversar_cobro
-- de este mismo proyecto: SECURITY INVOKER (no DEFINER) + guardia de rol EXPLÍCITA
-- dentro de la función + RLS como respaldo (si algún día se llama por otra vía).
-- Idempotente vía advisory lock + columna idempotency_key (mismo patrón).
--
-- El catálogo de cuentas está hardcodeado a propósito, reflejando la constante
-- CUENTAS de index.html (líneas 2832-2847) — NO existe una tabla `cuentas` real
-- en el esquema; validar contra ese arreglo es lo único disponible hoy sin
-- ampliar el alcance de este bloque con una tabla nueva (ver bitácora §10,
-- riesgos abiertos).

CREATE OR REPLACE FUNCTION public.seguros_registrar_asiento_manual(
  p_fecha date,
  p_referencia text,
  p_descripcion text,
  p_cuenta_dr_cod text,
  p_cuenta_cr_cod text,
  p_monto numeric,
  p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_rol text;
  v_existente public.asientos%ROWTYPE;
  v_asiento_id uuid;
  v_cuenta_dr_nom text;
  v_cuenta_cr_nom text;
  v_ref text;
  v_desc text;
BEGIN
  -- Guardia de rol explícita (no depender solo de RLS — mismo patrón que
  -- seguros_reversar_cobro).
  v_rol := public.mi_rol();
  IF v_rol IS NULL OR v_rol <> 'admin' THEN
    RAISE EXCEPTION 'No autorizado: el asiento manual requiere rol admin';
  END IF;

  -- Idempotencia (mismo patrón que seguros_registrar_cobro).
  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'idempotency_key es obligatorio';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));
  SELECT * INTO v_existente FROM public.asientos WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'reintento', true, 'asiento_id', v_existente.id);
  END IF;

  -- Validación de negocio.
  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor que 0';
  END IF;
  IF p_fecha IS NULL OR p_fecha < date '2020-01-01' OR p_fecha > (current_date + interval '1 day')::date THEN
    RAISE EXCEPTION 'Fecha fuera de rango razonable: %', p_fecha;
  END IF;

  v_desc := btrim(coalesce(p_descripcion, ''));
  IF v_desc = '' THEN RAISE EXCEPTION 'La descripción es obligatoria'; END IF;
  IF length(v_desc) > 500 THEN RAISE EXCEPTION 'Descripción demasiado larga (máx. 500 caracteres)'; END IF;

  v_ref := nullif(btrim(coalesce(p_referencia, '')), '');
  IF v_ref IS NULL THEN v_ref := 'AST-MAN'; END IF;
  IF length(v_ref) > 60 THEN RAISE EXCEPTION 'Referencia demasiado larga (máx. 60 caracteres)'; END IF;
  -- 'AST-BAJA' es la referencia que usaba editarAbono() para el asiento de
  -- ajuste al eliminar un cobro — esa función y ese patrón ya no existen (ver
  -- Bloque 2 aplicado), pero se conserva el candado por si algún dato viejo
  -- todavía la usa como marcador de un flujo especial.
  IF v_ref = 'AST-BAJA' THEN RAISE EXCEPTION 'Referencia reservada, no permitida'; END IF;

  IF p_cuenta_dr_cod = p_cuenta_cr_cod THEN
    RAISE EXCEPTION 'La cuenta débito y la cuenta crédito no pueden ser la misma';
  END IF;

  -- Catálogo de cuentas — mismo listado de 14 cuentas de la constante CUENTAS
  -- en index.html. Deriva el nombre de la cuenta en el servidor (nunca confía
  -- en el nombre que mande el cliente).
  SELECT nom INTO v_cuenta_dr_nom FROM (VALUES
    ('1101','Efectivo y equivalentes'),('1201','Cuentas por cobrar — Clientes'),
    ('1301','Primas por cobrar'),('2101','Cuentas por pagar'),('2201','ITBIS por pagar'),
    ('2301','Comisiones por pagar'),('3101','Capital social'),('3201','Utilidades retenidas'),
    ('4101','Ingresos por primas'),('4201','Comisiones ganadas'),('5101','Gastos operativos'),
    ('5201','Nómina agentes'),('5301','Publicidad'),('5401','Comisiones pagadas')
  ) AS cuentas(cod, nom) WHERE cod = p_cuenta_dr_cod;
  IF v_cuenta_dr_nom IS NULL THEN RAISE EXCEPTION 'Cuenta débito inválida: %', p_cuenta_dr_cod; END IF;

  SELECT nom INTO v_cuenta_cr_nom FROM (VALUES
    ('1101','Efectivo y equivalentes'),('1201','Cuentas por cobrar — Clientes'),
    ('1301','Primas por cobrar'),('2101','Cuentas por pagar'),('2201','ITBIS por pagar'),
    ('2301','Comisiones por pagar'),('3101','Capital social'),('3201','Utilidades retenidas'),
    ('4101','Ingresos por primas'),('4201','Comisiones ganadas'),('5101','Gastos operativos'),
    ('5201','Nómina agentes'),('5301','Publicidad'),('5401','Comisiones pagadas')
  ) AS cuentas(cod, nom) WHERE cod = p_cuenta_cr_cod;
  IF v_cuenta_cr_nom IS NULL THEN RAISE EXCEPTION 'Cuenta crédito inválida: %', p_cuenta_cr_cod; END IF;

  INSERT INTO public.asientos(
    fecha, referencia, descripcion, cuenta_dr_cod, cuenta_dr_nom, monto_dr,
    cuenta_cr_cod, cuenta_cr_nom, monto_cr, tipo_origen, idempotency_key
  ) VALUES (
    p_fecha::timestamptz, v_ref, v_desc, p_cuenta_dr_cod, v_cuenta_dr_nom, p_monto,
    p_cuenta_cr_cod, v_cuenta_cr_nom, p_monto, 'manual', p_idempotency_key
  ) RETURNING id INTO v_asiento_id;

  INSERT INTO public.auditoria(
    ts, usuario, rol, accion, detalle, modulo, entity_table, entity_id,
    new_data, result, origen, organizacion_id
  ) VALUES (
    now()::text, public.mi_usuario_id()::text, v_rol, 'ASIENTO_MANUAL_CREADO',
    v_desc || ' · DR ' || v_cuenta_dr_nom || ' ' || p_monto || ' / CR ' || v_cuenta_cr_nom || ' ' || p_monto,
    'Contabilidad', 'asientos', v_asiento_id::text,
    jsonb_build_object('referencia', v_ref, 'monto', p_monto)::text,
    'OK', 'seguros_registrar_asiento_manual', public.mi_organizacion()
  );

  RETURN jsonb_build_object('ok', true, 'reintento', false, 'asiento_id', v_asiento_id, 'referencia', v_ref);
END;
$function$;


-- ── 3) RPC: corregir un asiento manual (reversa + nuevo, NUNCA sobreescribe) ─
--
-- `asientos` no tiene columna de estado — una "corrección" siempre debe ser
-- una reversa exacta (invierte débito/crédito del original) + un asiento
-- nuevo con los datos corregidos, ambos apuntando a `origen_id` = el original.
-- El original JAMÁS se modifica ni se borra (el trigger ya bloquea el DELETE
-- físico; esta función tampoco hace ningún UPDATE sobre la fila original).
--
-- Blindaje explícito: solo corrige asientos con tipo_origen IN ('manual',
-- 'manual_reversa') — rechaza intentar "corregir" desde aquí un asiento de
-- facturación automática (F-NNN), de anulación (AST-ANUL-%), o de cobro/
-- reversa de cobro (AST-COB%, ya protegidos por su propio flujo hardened).

CREATE OR REPLACE FUNCTION public.seguros_corregir_asiento_manual(
  p_asiento_id uuid,
  p_motivo text,
  p_fecha date,
  p_referencia text,
  p_descripcion text,
  p_cuenta_dr_cod text,
  p_cuenta_cr_cod text,
  p_monto numeric,
  p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_rol text;
  v_orig public.asientos%ROWTYPE;
  v_existente public.asientos%ROWTYPE;
  v_rev_id uuid;
  v_nuevo_id uuid;
  v_cuenta_dr_nom text;
  v_cuenta_cr_nom text;
  v_ref text;
  v_desc text;
  v_motivo text;
BEGIN
  v_rol := public.mi_rol();
  IF v_rol IS NULL OR v_rol <> 'admin' THEN
    RAISE EXCEPTION 'No autorizado: corregir un asiento manual requiere rol admin';
  END IF;

  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'idempotency_key es obligatorio';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));
  SELECT * INTO v_existente FROM public.asientos WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'reintento', true, 'asiento_reversa_id', v_existente.id);
  END IF;

  v_motivo := btrim(coalesce(p_motivo, ''));
  IF v_motivo = '' THEN RAISE EXCEPTION 'El motivo de la corrección es obligatorio'; END IF;

  SELECT * INTO v_orig FROM public.asientos WHERE id = p_asiento_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Asiento no encontrado'; END IF;

  -- Blindaje: solo asientos manuales (o una reversa manual previa) se
  -- corrigen desde aquí. Todo lo demás pertenece a otro flujo ya endurecido.
  IF v_orig.tipo_origen IS NOT NULL AND v_orig.tipo_origen NOT IN ('manual','manual_reversa') THEN
    RAISE EXCEPTION 'Este asiento no es manual (tipo_origen=%); use el flujo de reversión propio de ese módulo', v_orig.tipo_origen;
  END IF;
  IF v_orig.referencia ~ '^F-\d+$'
     OR v_orig.referencia LIKE 'AST-ANUL-%'
     OR v_orig.referencia LIKE 'AST-COB%'
     OR v_orig.referencia LIKE 'AUTO-%' THEN
    RAISE EXCEPTION 'Este asiento pertenece a otro flujo (%); no se corrige desde aquí', v_orig.referencia;
  END IF;

  IF p_monto IS NULL OR p_monto <= 0 THEN RAISE EXCEPTION 'El monto debe ser mayor que 0'; END IF;
  IF p_fecha IS NULL OR p_fecha < date '2020-01-01' OR p_fecha > (current_date + interval '1 day')::date THEN
    RAISE EXCEPTION 'Fecha fuera de rango razonable: %', p_fecha;
  END IF;
  v_desc := btrim(coalesce(p_descripcion, ''));
  IF v_desc = '' THEN RAISE EXCEPTION 'La descripción es obligatoria'; END IF;
  IF length(v_desc) > 500 THEN RAISE EXCEPTION 'Descripción demasiado larga'; END IF;
  v_ref := nullif(btrim(coalesce(p_referencia, '')), '');
  IF v_ref IS NULL THEN v_ref := 'AST-MAN'; END IF;
  IF v_ref = 'AST-BAJA' THEN RAISE EXCEPTION 'Referencia reservada, no permitida'; END IF;
  IF p_cuenta_dr_cod = p_cuenta_cr_cod THEN
    RAISE EXCEPTION 'La cuenta débito y crédito no pueden ser la misma';
  END IF;

  SELECT nom INTO v_cuenta_dr_nom FROM (VALUES
    ('1101','Efectivo y equivalentes'),('1201','Cuentas por cobrar — Clientes'),
    ('1301','Primas por cobrar'),('2101','Cuentas por pagar'),('2201','ITBIS por pagar'),
    ('2301','Comisiones por pagar'),('3101','Capital social'),('3201','Utilidades retenidas'),
    ('4101','Ingresos por primas'),('4201','Comisiones ganadas'),('5101','Gastos operativos'),
    ('5201','Nómina agentes'),('5301','Publicidad'),('5401','Comisiones pagadas')
  ) AS c(cod,nom) WHERE cod = p_cuenta_dr_cod;
  IF v_cuenta_dr_nom IS NULL THEN RAISE EXCEPTION 'Cuenta débito inválida: %', p_cuenta_dr_cod; END IF;
  SELECT nom INTO v_cuenta_cr_nom FROM (VALUES
    ('1101','Efectivo y equivalentes'),('1201','Cuentas por cobrar — Clientes'),
    ('1301','Primas por cobrar'),('2101','Cuentas por pagar'),('2201','ITBIS por pagar'),
    ('2301','Comisiones por pagar'),('3101','Capital social'),('3201','Utilidades retenidas'),
    ('4101','Ingresos por primas'),('4201','Comisiones ganadas'),('5101','Gastos operativos'),
    ('5201','Nómina agentes'),('5301','Publicidad'),('5401','Comisiones pagadas')
  ) AS c(cod,nom) WHERE cod = p_cuenta_cr_cod;
  IF v_cuenta_cr_nom IS NULL THEN RAISE EXCEPTION 'Cuenta crédito inválida: %', p_cuenta_cr_cod; END IF;

  -- 1) Reversa exacta del original (invierte dr/cr, monta la misma fecha de
  --    HOY — no la fecha del original — para que quede claro cuándo se
  --    corrigió, mismo criterio que anularFactura()).
  INSERT INTO public.asientos(
    fecha, referencia, descripcion, cuenta_dr_cod, cuenta_dr_nom, monto_dr,
    cuenta_cr_cod, cuenta_cr_nom, monto_cr, tipo_origen, origen_id, idempotency_key
  ) VALUES (
    now(), 'AST-MAN-REV',
    'Reversa de asiento manual · Motivo: ' || v_motivo || ' · ' || coalesce(v_orig.descripcion, ''),
    v_orig.cuenta_cr_cod, v_orig.cuenta_cr_nom, v_orig.monto_cr,
    v_orig.cuenta_dr_cod, v_orig.cuenta_dr_nom, v_orig.monto_dr,
    'manual_reversa', v_orig.id, 'asiento-reversa:' || p_idempotency_key
  ) RETURNING id INTO v_rev_id;

  -- 2) Asiento nuevo con los datos ya corregidos.
  INSERT INTO public.asientos(
    fecha, referencia, descripcion, cuenta_dr_cod, cuenta_dr_nom, monto_dr,
    cuenta_cr_cod, cuenta_cr_nom, monto_cr, tipo_origen, origen_id, idempotency_key
  ) VALUES (
    p_fecha::timestamptz, v_ref, v_desc, p_cuenta_dr_cod, v_cuenta_dr_nom, p_monto,
    p_cuenta_cr_cod, v_cuenta_cr_nom, p_monto, 'manual', v_orig.id, 'asiento-corregido:' || p_idempotency_key
  ) RETURNING id INTO v_nuevo_id;

  INSERT INTO public.auditoria(
    ts, usuario, rol, accion, detalle, modulo, entity_table, entity_id,
    old_data, new_data, result, origen, organizacion_id
  ) VALUES (
    now()::text, public.mi_usuario_id()::text, v_rol, 'ASIENTO_MANUAL_CORREGIDO',
    'Motivo: ' || v_motivo, 'Contabilidad', 'asientos', p_asiento_id::text,
    row_to_json(v_orig)::text,
    jsonb_build_object('asiento_reversa_id', v_rev_id, 'asiento_nuevo_id', v_nuevo_id)::text,
    'OK', 'seguros_corregir_asiento_manual', public.mi_organizacion()
  );

  RETURN jsonb_build_object(
    'ok', true, 'reintento', false,
    'asiento_original_id', p_asiento_id,
    'asiento_reversa_id', v_rev_id,
    'asiento_nuevo_id', v_nuevo_id
  );
END;
$function$;


-- ── 4) GRANT/REVOKE — mismo patrón exacto que seguros_registrar_cobro ──────
-- Postgres concede EXECUTE a anon/authenticated/service_role por defecto en
-- toda función nueva del schema public vía ALTER DEFAULT PRIVILEGES del
-- proyecto (hallazgo real, ver v49.88 / IMEI atómico) — hay que revocar
-- explícitamente de `anon`, no solo de PUBLIC.

REVOKE ALL ON FUNCTION public.seguros_registrar_asiento_manual(date,text,text,text,text,numeric,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.seguros_registrar_asiento_manual(date,text,text,text,text,numeric,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.seguros_registrar_asiento_manual(date,text,text,text,text,numeric,text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.seguros_corregir_asiento_manual(uuid,text,date,text,text,text,text,numeric,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.seguros_corregir_asiento_manual(uuid,text,date,text,text,text,text,numeric,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.seguros_corregir_asiento_manual(uuid,text,date,text,text,text,text,numeric,text) TO authenticated, service_role;

-- ============================================================================
-- FIN DE LA PROPUESTA.
--
-- Verificado con BEGIN...ROLLBACK contra producción (17/17 pruebas en verde:
-- registrar como admin, idempotencia sin duplicar, 3 rechazos de validación,
-- agente rechazado tanto por la RPC como por INSERT/UPDATE directo, SELECT de
-- agente intacto, corregir crea reversa+nuevo sin tocar jamás el original,
-- blindaje contra "corregir" un F-NNN o un asiento de cobro, anon denegado en
-- los 3 frentes, grants exactos, y la prueba T13 que confirma por qué
-- `asientos_write_admin` NO se puede activar todavía sin romper
-- _genFacturasInterno()). Ver la entrada de bitácora para el detalle completo.
-- ============================================================================
