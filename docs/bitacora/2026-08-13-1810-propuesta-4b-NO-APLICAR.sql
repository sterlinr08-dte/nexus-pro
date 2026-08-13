-- ═══════════════════════════════════════════════════════════════════════
-- BLOQUE 4B — egresos ↔ asientos — DISEÑO PROPUESTO, NO APLICAR TODAVÍA
-- Fecha: 2026-08-13 18:10 RD · Autor: Claude · Espera revisión cruzada ChatGPT
-- ═══════════════════════════════════════════════════════════════════════
-- Este archivo fue PROBADO completo con BEGIN...ROLLBACK forzado (ver
-- docs/bitacora/2026-08-13-XXXX-claude-bloque4b.md, sección "Pruebas del
-- diseño") y luego revertido — NO está aplicado en producción. Se aplicará
-- solo si ChatGPT lo aprueba y el dueño autoriza, exactamente como en 3A/3B/
-- 3C/4A.
--
-- Reemplaza el flujo actual de `parches.js` (nxGuardarEgreso/nxEliminarEgreso
-- + crearAsientoEgreso/actualizarAsientoEgreso/borrarAsientoEgreso), que hoy
-- hace 2 escrituras REST directas SIN transacción — confirmado roto en
-- producción tras el cierre de ACL de asientos en el Bloque 3C (ver matriz de
-- pruebas H1-H11 en la entrega). El nuevo diseño mueve TODO a 3 RPC atómicas
-- server-side, con el mismo patrón ya probado y en producción para asientos
-- manuales (seguros_registrar_asiento_manual / seguros_corregir_asiento_manual,
-- Bloque 3A).
-- ═══════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────
-- PASO 1/6 — Migración de esquema: columnas nuevas en egresos (aditivas)
-- ───────────────────────────────────────────────────────────────────────
-- `estado`: reemplaza el DELETE físico por una marca de anulación trazable
--           (mismo patrón que abonos.estado='Reversado').
-- `idempotency_key`: para que un doble-clic/reintento en registrar_egreso no
--           duplique el par egreso+asiento (mismo patrón que asientos).
-- `motivo_anulacion`/`anulado_at`/`anulado_por`: trazabilidad de la reversa,
--           mismo espíritu que seguros_corregir_asiento_manual (p_motivo).

ALTER TABLE public.egresos
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'activo',
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS motivo_anulacion text,
  ADD COLUMN IF NOT EXISTS anulado_at timestamptz,
  ADD COLUMN IF NOT EXISTS anulado_por text;

ALTER TABLE public.egresos
  ADD CONSTRAINT egresos_estado_chk CHECK (estado IN ('activo','anulado'));

-- Mismo patrón exacto que `asientos_idempotency_key_uq` (índice único parcial,
-- solo sobre filas que sí traen key) — defensa en profundidad además del
-- pg_advisory_xact_lock de la RPC.
CREATE UNIQUE INDEX IF NOT EXISTS egresos_idempotency_key_uq
  ON public.egresos (idempotency_key) WHERE (idempotency_key IS NOT NULL);

-- Backfill: las 4 filas reales existentes quedan `estado='activo'` por el
-- DEFAULT del ALTER TABLE — no hace falta UPDATE manual.


-- ───────────────────────────────────────────────────────────────────────
-- PASO 2/6 — Trigger anti-delete en egresos (mismo patrón que abonos/asientos)
-- ───────────────────────────────────────────────────────────────────────
-- Hoy `nxEliminarEgreso()` hace un DELETE real. Con las RPC nuevas, la única
-- forma de "quitar" un egreso es `seguros_anular_egreso` (reversa trazable).
-- Este trigger hace estructuralmente imposible el DELETE físico — incluso si
-- alguien reintrodujera un GRANT DELETE por error, o llamara con
-- service_role fuera del flujo normal.

CREATE OR REPLACE FUNCTION public.seguros_bloquear_delete_egreso()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RAISE EXCEPTION 'No se permite eliminar egresos. Use la anulación (reversa) financiera autorizada.';
END;
$function$;

CREATE TRIGGER trg_seguros_bloquear_delete_egreso
  BEFORE DELETE ON public.egresos
  FOR EACH ROW EXECUTE FUNCTION public.seguros_bloquear_delete_egreso();


-- ───────────────────────────────────────────────────────────────────────
-- PASO 3/6 — RPC: seguros_registrar_egreso
-- ───────────────────────────────────────────────────────────────────────
-- Crea el egreso Y su asiento contable en UNA transacción: si cualquiera de
-- los dos falla (validación, constraint, lo que sea), el otro tampoco
-- persiste — a diferencia del flujo actual (2 llamadas REST separadas desde
-- el navegador, sin ninguna atomicidad entre ellas).
--
-- Cuenta débito: la deriva el SERVIDOR según `p_tipo` (mismo mapeo que hoy
-- vive en cuentaGasto() del lado cliente — ARS/GASTO→5101, SALARIO→5201),
-- NO se acepta un código de cuenta arbitrario del llamador (a diferencia de
-- seguros_registrar_asiento_manual, que sí es una herramienta contable
-- general para admin). Cuenta crédito: siempre 1101 Efectivo y equivalentes
-- (mismo comportamiento actual — `metodo` es descriptivo, nunca cambió qué
-- cuenta se acredita).
--
-- Rol: SOLO admin. La propia documentación del módulo en parches.js dice
-- "SOLO ADMIN" y el botón del Dashboard solo se inyecta si esAdmin() — pero
-- HOY el backend (RLS org_egresos) deja escribir a CUALQUIER autenticado de
-- nexus-pro (admin o agente), confirmado con Robinson en la prueba H9. Esta
-- RPC cierra esa brecha y hace cumplir lo que el propio módulo ya dice que
-- pretende ser.

CREATE OR REPLACE FUNCTION public.seguros_registrar_egreso(
  p_tipo text,
  p_concepto text,
  p_beneficiario text,
  p_monto numeric,
  p_metodo text,
  p_banco text,
  p_referencia text,
  p_nota text,
  p_fecha date,
  p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_rol text;
  v_existente public.egresos%ROWTYPE;
  v_eg_id uuid;
  v_asiento_id uuid;
  v_cta_cod text; v_cta_nom text;
  v_concepto text; v_tipo text; v_usuario text;
BEGIN
  v_rol := public.mi_rol();
  IF v_rol IS NULL OR v_rol <> 'admin' THEN
    RAISE EXCEPTION 'No autorizado: registrar un egreso requiere rol admin';
  END IF;
  IF public.mi_organizacion() IS DISTINCT FROM (SELECT id FROM public.organizaciones WHERE slug='nexus-pro') THEN
    RAISE EXCEPTION 'No autorizado: este módulo es exclusivo de la organización de seguros';
  END IF;

  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'idempotency_key es obligatorio';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));
  SELECT * INTO v_existente FROM public.egresos WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'reintento', true, 'egreso_id', v_existente.id);
  END IF;

  v_tipo := upper(btrim(coalesce(p_tipo, '')));
  IF v_tipo NOT IN ('ARS','SALARIO','GASTO') THEN
    RAISE EXCEPTION 'Tipo de egreso inválido: %', p_tipo;
  END IF;

  v_concepto := btrim(coalesce(p_concepto, ''));
  IF v_concepto = '' THEN RAISE EXCEPTION 'El concepto es obligatorio'; END IF;
  IF length(v_concepto) > 300 THEN RAISE EXCEPTION 'Concepto demasiado largo (máx. 300 caracteres)'; END IF;

  IF p_monto IS NULL OR p_monto <= 0 THEN RAISE EXCEPTION 'El monto debe ser mayor que 0'; END IF;

  IF p_fecha IS NULL OR p_fecha < date '2020-01-01' OR p_fecha > (current_date + interval '1 day')::date THEN
    RAISE EXCEPTION 'Fecha fuera de rango razonable: %', p_fecha;
  END IF;

  -- Cuenta débito derivada server-side (nunca del llamador)
  IF v_tipo = 'SALARIO' THEN
    v_cta_cod := '5201'; v_cta_nom := 'Nómina agentes';
  ELSE
    v_cta_cod := '5101'; v_cta_nom := 'Gastos operativos';
  END IF;

  v_usuario := coalesce(nullif(btrim(coalesce(p_beneficiario,'')), ''), NULL);

  INSERT INTO public.egresos(
    tipo, concepto, beneficiario, monto, metodo, banco, referencia, nota, fecha,
    created_by, estado, idempotency_key
  ) VALUES (
    v_tipo, v_concepto, nullif(btrim(coalesce(p_beneficiario,'')),''), p_monto,
    nullif(btrim(coalesce(p_metodo,'')),''), nullif(btrim(coalesce(p_banco,'')),''),
    nullif(btrim(coalesce(p_referencia,'')),''), nullif(btrim(coalesce(p_nota,'')),''),
    p_fecha, coalesce(public.mi_usuario_id()::text, 'admin'), 'activo', p_idempotency_key
  ) RETURNING id INTO v_eg_id;

  INSERT INTO public.asientos(
    fecha, referencia, descripcion, cuenta_dr_cod, cuenta_dr_nom, monto_dr,
    cuenta_cr_cod, cuenta_cr_nom, monto_cr, tipo_origen, origen_id
  ) VALUES (
    p_fecha::timestamptz, 'EGR-'||v_eg_id,
    'Egreso ' || v_tipo || ': ' || v_concepto || coalesce(' — '||nullif(btrim(coalesce(p_beneficiario,'')),''), ''),
    v_cta_cod, v_cta_nom, p_monto, '1101', 'Efectivo y equivalentes', p_monto,
    'egreso', v_eg_id
  ) RETURNING id INTO v_asiento_id;

  INSERT INTO public.auditoria(ts, usuario, rol, accion, detalle, modulo, entity_table, entity_id, new_data, result, origen, organizacion_id)
  VALUES (
    now()::text, public.mi_usuario_id()::text, v_rol, 'EGRESO_REGISTRADO',
    v_concepto || ' · ' || v_cta_nom || ' ' || p_monto, 'Contabilidad', 'egresos', v_eg_id::text,
    jsonb_build_object('asiento_id', v_asiento_id, 'monto', p_monto, 'tipo', v_tipo)::text,
    'OK', 'seguros_registrar_egreso', public.mi_organizacion()
  );

  RETURN jsonb_build_object('ok', true, 'reintento', false, 'egreso_id', v_eg_id, 'asiento_id', v_asiento_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.seguros_registrar_egreso(text,text,text,numeric,text,text,text,text,date,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seguros_registrar_egreso(text,text,text,numeric,text,text,text,text,date,text) TO authenticated;


-- ───────────────────────────────────────────────────────────────────────
-- PASO 4/6 — RPC: seguros_anular_egreso  (reversa, no DELETE)
-- ───────────────────────────────────────────────────────────────────────
-- Marca el egreso estado='anulado' (nunca lo borra) y crea un asiento de
-- reversión (dr/cr invertidos respecto al original), enlazado por
-- tipo_origen='egreso_reversa' + origen_id=<id del asiento original>. Si el
-- egreso original no tenía asiento (huérfano histórico, caso ya cuantificado
-- en la entrega — hoy 0 egresos reales en ese estado, pero puede pasar), la
-- anulación del egreso igual procede; simplemente no hay nada que reversar
-- contablemente porque nunca se contabilizó.

CREATE OR REPLACE FUNCTION public.seguros_anular_egreso(
  p_egreso_id uuid,
  p_motivo text,
  p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_rol text;
  v_eg public.egresos%ROWTYPE;
  v_ast public.asientos%ROWTYPE;
  v_existente public.asientos%ROWTYPE;
  v_rev_id uuid;
  v_motivo text;
BEGIN
  v_rol := public.mi_rol();
  IF v_rol IS NULL OR v_rol <> 'admin' THEN
    RAISE EXCEPTION 'No autorizado: anular un egreso requiere rol admin';
  END IF;
  IF public.mi_organizacion() IS DISTINCT FROM (SELECT id FROM public.organizaciones WHERE slug='nexus-pro') THEN
    RAISE EXCEPTION 'No autorizado: este módulo es exclusivo de la organización de seguros';
  END IF;

  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'idempotency_key es obligatorio';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));
  SELECT * INTO v_existente FROM public.asientos WHERE idempotency_key = 'egreso-reversa:'||p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'reintento', true, 'asiento_reversa_id', v_existente.id);
  END IF;

  v_motivo := btrim(coalesce(p_motivo, ''));
  IF v_motivo = '' THEN RAISE EXCEPTION 'El motivo de la anulación es obligatorio'; END IF;

  SELECT * INTO v_eg FROM public.egresos WHERE id = p_egreso_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Egreso no encontrado'; END IF;
  IF v_eg.estado = 'anulado' THEN
    RAISE EXCEPTION 'Este egreso ya está anulado';
  END IF;

  SELECT * INTO v_ast FROM public.asientos WHERE tipo_origen='egreso' AND origen_id=p_egreso_id FOR UPDATE;
  -- v_ast puede no existir (huérfano histórico) — se anula el egreso igual.

  UPDATE public.egresos
     SET estado='anulado', motivo_anulacion=v_motivo, anulado_at=now(), anulado_por=public.mi_usuario_id()::text
   WHERE id = p_egreso_id;

  IF FOUND THEN
    -- (siempre true tras el UPDATE anterior; se deja explícito por claridad)
    NULL;
  END IF;

  IF v_ast.id IS NOT NULL THEN
    INSERT INTO public.asientos(
      fecha, referencia, descripcion, cuenta_dr_cod, cuenta_dr_nom, monto_dr,
      cuenta_cr_cod, cuenta_cr_nom, monto_cr, tipo_origen, origen_id, idempotency_key
    ) VALUES (
      now(), 'EGR-REV-'||p_egreso_id, 'Reversa de egreso · Motivo: '||v_motivo||' · '||coalesce(v_ast.descripcion,''),
      v_ast.cuenta_cr_cod, v_ast.cuenta_cr_nom, v_ast.monto_cr,
      v_ast.cuenta_dr_cod, v_ast.cuenta_dr_nom, v_ast.monto_dr,
      'egreso_reversa', v_ast.id, 'egreso-reversa:'||p_idempotency_key
    ) RETURNING id INTO v_rev_id;
  END IF;

  INSERT INTO public.auditoria(ts, usuario, rol, accion, detalle, modulo, entity_table, entity_id, old_data, new_data, result, origen, organizacion_id)
  VALUES (
    now()::text, public.mi_usuario_id()::text, v_rol, 'EGRESO_ANULADO',
    'Motivo: '||v_motivo, 'Contabilidad', 'egresos', p_egreso_id::text,
    row_to_json(v_eg)::text,
    jsonb_build_object('asiento_reversa_id', v_rev_id, 'tenia_asiento', v_ast.id IS NOT NULL)::text,
    'OK', 'seguros_anular_egreso', public.mi_organizacion()
  );

  RETURN jsonb_build_object('ok', true, 'reintento', false, 'egreso_id', p_egreso_id, 'asiento_reversa_id', v_rev_id, 'tenia_asiento', v_ast.id IS NOT NULL);
END;
$function$;

REVOKE ALL ON FUNCTION public.seguros_anular_egreso(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seguros_anular_egreso(uuid,text,text) TO authenticated;


-- ───────────────────────────────────────────────────────────────────────
-- PASO 5/6 — RPC: seguros_corregir_egreso  (anula + registra, atómico)
-- ───────────────────────────────────────────────────────────────────────
-- Reemplaza el UPDATE arbitrario que hoy hace nxGuardarEgreso() en modo
-- edición. NO reescribe la fila original: la anula (mismo mecanismo que
-- seguros_anular_egreso) y crea un egreso NUEVO con los datos corregidos,
-- ambos enlazados. Mismo espíritu que seguros_corregir_asiento_manual.

CREATE OR REPLACE FUNCTION public.seguros_corregir_egreso(
  p_egreso_id uuid,
  p_motivo text,
  p_tipo text,
  p_concepto text,
  p_beneficiario text,
  p_monto numeric,
  p_metodo text,
  p_banco text,
  p_referencia text,
  p_nota text,
  p_fecha date,
  p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_rol text;
  v_eg public.egresos%ROWTYPE;
  v_ast public.asientos%ROWTYPE;
  v_existente public.asientos%ROWTYPE;
  v_rev_id uuid; v_nuevo_eg_id uuid; v_nuevo_ast_id uuid;
  v_motivo text; v_tipo text; v_concepto text;
  v_cta_cod text; v_cta_nom text;
BEGIN
  v_rol := public.mi_rol();
  IF v_rol IS NULL OR v_rol <> 'admin' THEN
    RAISE EXCEPTION 'No autorizado: corregir un egreso requiere rol admin';
  END IF;
  IF public.mi_organizacion() IS DISTINCT FROM (SELECT id FROM public.organizaciones WHERE slug='nexus-pro') THEN
    RAISE EXCEPTION 'No autorizado: este módulo es exclusivo de la organización de seguros';
  END IF;

  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'idempotency_key es obligatorio';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));
  SELECT * INTO v_existente FROM public.asientos WHERE idempotency_key = 'egreso-corregido:'||p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'reintento', true, 'asiento_nuevo_id', v_existente.id);
  END IF;

  v_motivo := btrim(coalesce(p_motivo, ''));
  IF v_motivo = '' THEN RAISE EXCEPTION 'El motivo de la corrección es obligatorio'; END IF;

  SELECT * INTO v_eg FROM public.egresos WHERE id = p_egreso_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Egreso no encontrado'; END IF;
  IF v_eg.estado = 'anulado' THEN
    RAISE EXCEPTION 'Este egreso ya está anulado; no se puede corregir uno anulado';
  END IF;

  v_tipo := upper(btrim(coalesce(p_tipo, '')));
  IF v_tipo NOT IN ('ARS','SALARIO','GASTO') THEN RAISE EXCEPTION 'Tipo de egreso inválido: %', p_tipo; END IF;
  v_concepto := btrim(coalesce(p_concepto, ''));
  IF v_concepto = '' THEN RAISE EXCEPTION 'El concepto es obligatorio'; END IF;
  IF p_monto IS NULL OR p_monto <= 0 THEN RAISE EXCEPTION 'El monto debe ser mayor que 0'; END IF;
  IF p_fecha IS NULL OR p_fecha < date '2020-01-01' OR p_fecha > (current_date + interval '1 day')::date THEN
    RAISE EXCEPTION 'Fecha fuera de rango razonable: %', p_fecha;
  END IF;

  -- 1) Anular el original (mismo mecanismo que seguros_anular_egreso, en línea)
  SELECT * INTO v_ast FROM public.asientos WHERE tipo_origen='egreso' AND origen_id=p_egreso_id FOR UPDATE;

  UPDATE public.egresos
     SET estado='anulado', motivo_anulacion='Corrección: '||v_motivo, anulado_at=now(), anulado_por=public.mi_usuario_id()::text
   WHERE id = p_egreso_id;

  IF v_ast.id IS NOT NULL THEN
    INSERT INTO public.asientos(
      fecha, referencia, descripcion, cuenta_dr_cod, cuenta_dr_nom, monto_dr,
      cuenta_cr_cod, cuenta_cr_nom, monto_cr, tipo_origen, origen_id
    ) VALUES (
      now(), 'EGR-REV-'||p_egreso_id, 'Reversa por corrección · Motivo: '||v_motivo||' · '||coalesce(v_ast.descripcion,''),
      v_ast.cuenta_cr_cod, v_ast.cuenta_cr_nom, v_ast.monto_cr,
      v_ast.cuenta_dr_cod, v_ast.cuenta_dr_nom, v_ast.monto_dr,
      'egreso_reversa', v_ast.id
    ) RETURNING id INTO v_rev_id;
  END IF;

  -- 2) Registrar el egreso corregido (nueva fila, nunca se reescribe la original)
  IF v_tipo = 'SALARIO' THEN v_cta_cod := '5201'; v_cta_nom := 'Nómina agentes';
  ELSE v_cta_cod := '5101'; v_cta_nom := 'Gastos operativos'; END IF;

  INSERT INTO public.egresos(
    tipo, concepto, beneficiario, monto, metodo, banco, referencia, nota, fecha,
    created_by, estado
  ) VALUES (
    v_tipo, v_concepto, nullif(btrim(coalesce(p_beneficiario,'')),''), p_monto,
    nullif(btrim(coalesce(p_metodo,'')),''), nullif(btrim(coalesce(p_banco,'')),''),
    nullif(btrim(coalesce(p_referencia,'')),''), nullif(btrim(coalesce(p_nota,'')),''),
    p_fecha, coalesce(public.mi_usuario_id()::text,'admin'), 'activo'
  ) RETURNING id INTO v_nuevo_eg_id;

  INSERT INTO public.asientos(
    fecha, referencia, descripcion, cuenta_dr_cod, cuenta_dr_nom, monto_dr,
    cuenta_cr_cod, cuenta_cr_nom, monto_cr, tipo_origen, origen_id, idempotency_key
  ) VALUES (
    p_fecha::timestamptz, 'EGR-'||v_nuevo_eg_id,
    'Egreso ' || v_tipo || ': ' || v_concepto || coalesce(' — '||nullif(btrim(coalesce(p_beneficiario,'')),''), ''),
    v_cta_cod, v_cta_nom, p_monto, '1101', 'Efectivo y equivalentes', p_monto,
    'egreso', v_nuevo_eg_id, 'egreso-corregido:'||p_idempotency_key
  ) RETURNING id INTO v_nuevo_ast_id;

  INSERT INTO public.auditoria(ts, usuario, rol, accion, detalle, modulo, entity_table, entity_id, old_data, new_data, result, origen, organizacion_id)
  VALUES (
    now()::text, public.mi_usuario_id()::text, v_rol, 'EGRESO_CORREGIDO',
    'Motivo: '||v_motivo, 'Contabilidad', 'egresos', p_egreso_id::text,
    row_to_json(v_eg)::text,
    jsonb_build_object('egreso_nuevo_id', v_nuevo_eg_id, 'asiento_reversa_id', v_rev_id, 'asiento_nuevo_id', v_nuevo_ast_id)::text,
    'OK', 'seguros_corregir_egreso', public.mi_organizacion()
  );

  RETURN jsonb_build_object('ok', true, 'reintento', false, 'egreso_original_id', p_egreso_id, 'egreso_nuevo_id', v_nuevo_eg_id, 'asiento_reversa_id', v_rev_id, 'asiento_nuevo_id', v_nuevo_ast_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.seguros_corregir_egreso(uuid,text,text,text,text,numeric,text,text,text,text,date,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seguros_corregir_egreso(uuid,text,text,text,text,numeric,text,text,text,text,date,text) TO authenticated;


-- ───────────────────────────────────────────────────────────────────────
-- PASO 6/6 — ACL final de la tabla `egresos`
-- ───────────────────────────────────────────────────────────────────────
-- A diferencia de 4A (abonos), aquí NO se encontró ningún escritor legítimo
-- de metadata por REST directo — nxGuardarEgreso/nxEliminarEgreso son los
-- ÚNICOS dos escritores reales y AMBOS se migran a las 3 RPC de arriba. Por
-- eso el REVOKE es completo (no column-scoped como en 4A): solo SELECT
-- queda para `authenticated`, igual que ya quedó `asientos` tras el 3C.

REVOKE ALL ON public.egresos FROM anon;
REVOKE INSERT, DELETE, TRUNCATE, TRIGGER, REFERENCES, UPDATE
  ON public.egresos FROM authenticated;
-- authenticated conserva SELECT (ya lo tenía, no se toca).


-- ═══════════════════════════════════════════════════════════════════════
-- OPCIONAL — extensión de seguros_diagnostico_financiero() con 2 contadores
-- nuevos (egresos_sin_asiento, asientos_egreso_huerfanos). NO es parte del
-- cierre mínimo de 4B — se ofrece como mejora de observabilidad continua,
-- para que la anomalía histórica ya cuantificada (1 asiento huérfano,
-- EGR-165f23e8-d3e9-44d2-82a3-1477943cf777, NO se toca en este bloque)
-- quede visible en el diagnóstico de ahora en adelante, sin tener que volver
-- a hacer el grep manual que se hizo en esta auditoría.
--
-- DIFF contra la definición real capturada en producción el 2026-08-13
-- (pg_get_functiondef, texto completo en la entrega de bitácora): se agregan
-- 2 subconsultas nuevas a la CTE `metricas` y sus 2 claves al jsonb final.
-- El campo `ok` NO cambia su fórmula (estos 2 contadores son informativos,
-- no bloquean el diagnóstico — igual que abonos_huerfanos/facturas_huerfanas
-- ya no bloquean `ok` hoy).
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.seguros_diagnostico_financiero()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND session_user <> 'postgres' THEN
    IF public.mi_rol() IS DISTINCT FROM 'admin' OR public.mi_organizacion() IS DISTINCT FROM (SELECT id FROM public.organizaciones WHERE slug='nexus-pro') THEN
      RAISE EXCEPTION 'No autorizado: seguros_diagnostico_financiero() es exclusiva de administradores de nexus-pro' USING errcode='42501';
    END IF;
  END IF;
  WITH facturado AS (
    SELECT cliente_id,coalesce(sum(coalesce(prima_base,0)+coalesce(prima_deps,0)),0) total FROM public.facturas WHERE estado IS DISTINCT FROM 'Anulada' GROUP BY cliente_id
  ), pagado_ledger AS (
    SELECT cliente_id,coalesce(sum(monto),0) total FROM public.abonos WHERE coalesce(tipo,'')<>'deuda_anterior' AND coalesce(estado,'')<>'Reversado' GROUP BY cliente_id
  ), metricas AS (
    SELECT
      (SELECT count(*) FROM public.clientes c LEFT JOIN facturado f ON f.cliente_id=c.id WHERE abs(coalesce(c.deuda_total,0)-coalesce(f.total,0))>0.01) deuda_descuadra,
      (SELECT count(*) FROM public.clientes c LEFT JOIN pagado_ledger p ON p.cliente_id=c.id WHERE abs(coalesce(c.pagado,0)-coalesce(p.total,0))>0.01) pagado_descuadra,
      (SELECT count(*) FROM public.asientos WHERE abs(coalesce(monto_dr,0)-coalesce(monto_cr,0))>0.01) asientos_desbalanceados,
      (SELECT count(*) FROM public.asientos WHERE coalesce(monto_dr,0)<=0 OR coalesce(monto_cr,0)<=0) asientos_no_positivos,
      (SELECT count(*) FROM public.asientos WHERE referencia='AST-BAJA') ast_baja,
      (SELECT count(*) FROM public.abonos a LEFT JOIN public.clientes c ON c.id=a.cliente_id WHERE c.id IS NULL) abonos_huerfanos,
      (SELECT count(*) FROM public.facturas f LEFT JOIN public.clientes c ON c.id=f.cliente_id WHERE c.id IS NULL) facturas_huerfanas,
      (SELECT count(*) FROM public.abonos WHERE coalesce(estado,'')<>'Reversado' AND (referencia IS NULL OR btrim(referencia)='')) cobros_sin_referencia,
      (SELECT count(*) FROM public.abonos WHERE coalesce(estado,'')<>'Reversado' AND metodo IN ('Transferencia','Depósito') AND (banco IS NULL OR btrim(banco)='')) cobros_transfer_sin_banco,
      (SELECT count(*) FROM public.abonos WHERE coalesce(estado,'')<>'Reversado' AND (agente_cobro IS NULL OR btrim(agente_cobro)='')) cobros_sin_agente,
      (SELECT count(*) FROM public.egresos e WHERE e.estado<>'anulado' AND NOT EXISTS (SELECT 1 FROM public.asientos a WHERE a.tipo_origen='egreso' AND a.origen_id=e.id)) egresos_sin_asiento,
      (SELECT count(*) FROM public.asientos a WHERE a.tipo_origen='egreso' AND NOT EXISTS (SELECT 1 FROM public.egresos e WHERE e.id=a.origen_id)) asientos_egreso_huerfanos
  )
  SELECT jsonb_build_object('ok',(deuda_descuadra=0 AND pagado_descuadra=0 AND asientos_desbalanceados=0 AND asientos_no_positivos=0 AND ast_baja=0),'deuda_descuadra',deuda_descuadra,'pagado_descuadra',pagado_descuadra,'asientos_desbalanceados',asientos_desbalanceados,'asientos_no_positivos',asientos_no_positivos,'ast_baja',ast_baja,'abonos_huerfanos',abonos_huerfanos,'facturas_huerfanas',facturas_huerfanas,'cobros_sin_referencia',cobros_sin_referencia,'cobros_transfer_sin_banco',cobros_transfer_sin_banco,'cobros_sin_agente',cobros_sin_agente,'egresos_sin_asiento',egresos_sin_asiento,'asientos_egreso_huerfanos',asientos_egreso_huerfanos,'verificado_en',now()) INTO v_result FROM metricas;
  RETURN v_result;
END;
$function$;

-- Nota: este CREATE OR REPLACE usa `origen_id`/`tipo_origen='egreso'` (el
-- nuevo enlace formal del Paso 3) — solo detectará bien los egresos NUEVOS
-- creados por seguros_registrar_egreso/corregir_egreso. El único huérfano
-- histórico (EGR-165f23e8-...) sigue enlazado por texto ('EGR-<id>' en
-- `referencia`, con tipo_origen NULL) y NO lo captura esta consulta — se
-- deja fuera a propósito (el mandato de 4B prohíbe limpieza histórica sin
-- autorización aparte); documentado en la entrega para que no se olvide.


-- ═══════════════════════════════════════════════════════════════════════
-- PLAN DE ROLLBACK (si algo de esto se aplica y hay que revertir)
-- ═══════════════════════════════════════════════════════════════════════
-- 1. DROP FUNCTION public.seguros_corregir_egreso(uuid,text,text,text,text,numeric,text,text,text,text,date,text);
-- 2. DROP FUNCTION public.seguros_anular_egreso(uuid,text,text);
-- 3. DROP FUNCTION public.seguros_registrar_egreso(text,text,text,numeric,text,text,text,text,date,text);
-- 4. DROP TRIGGER trg_seguros_bloquear_delete_egreso ON public.egresos;
--    DROP FUNCTION public.seguros_bloquear_delete_egreso();
-- 5. GRANT INSERT, UPDATE, DELETE ON public.egresos TO authenticated;  -- vuelve al ACL de hoy
--    GRANT ALL ON public.egresos TO anon;                              -- SOLO si hace falta revertir 100%
-- 6. ALTER TABLE public.egresos DROP CONSTRAINT egresos_estado_chk;
--    DROP INDEX public.egresos_idempotency_key_uq;
--    ALTER TABLE public.egresos DROP COLUMN estado, DROP COLUMN idempotency_key,
--      DROP COLUMN motivo_anulacion, DROP COLUMN anulado_at, DROP COLUMN anulado_por;
-- 7. Para revertir la extensión opcional de seguros_diagnostico_financiero(),
--    reemplazar con el CREATE OR REPLACE que usa el texto EXACTO capturado
--    en producción el 2026-08-13 (ver docs/bitacora/...claude-bloque4b.md,
--    sección "Función de diagnóstico" — pg_get_functiondef() íntegro).
