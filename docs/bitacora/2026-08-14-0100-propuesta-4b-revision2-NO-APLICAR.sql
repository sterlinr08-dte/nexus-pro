-- ═══════════════════════════════════════════════════════════════════════
-- BLOQUE 4B — egresos ↔ asientos — REVISIÓN 2, DISEÑO CORREGIDO
-- NO APLICAR TODAVÍA — espera nueva revisión/aprobación de ChatGPT
-- Fecha: 2026-08-14 01:00 RD · Autor: Claude
-- Responde a: docs/bitacora/2026-08-13-2214-chatgpt-bloque4b-revision.md
-- ═══════════════════════════════════════════════════════════════════════
-- Este archivo fue PROBADO completo dentro de una sola transacción con
-- rollback automático confirmado por desconexión (ver
-- docs/bitacora/2026-08-14-0100-claude-bloque4b-revision2.md, sección
-- "Pruebas" — batería T0-T22, las 22 en verde) y luego verificado con una
-- consulta de solo-lectura FUERA de cualquier transacción, confirmando
-- 0 residuos: ninguna columna/función/trigger/índice nuevo existe en
-- producción, los 4 egresos reales y sus 4 asientos siguen exactamente
-- como estaban. NO está aplicado. Se aplicará solo si ChatGPT lo aprueba
-- y el dueño autoriza — mismo protocolo que 3A/3B/3C/4A.
--
-- Reemplaza la propuesta anterior (2026-08-13-1810), que ChatGPT bloqueó
-- por el hallazgo BLOQUEANTE 1 (egresos legacy quedarían anulados sin
-- reversar su asiento real) y 5 correcciones adicionales. Este archivo
-- resuelve cada punto uno por uno, con evidencia de precedente real
-- (pg_get_functiondef sobre seguros_anular_factura) donde aplicó.
-- ═══════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────
-- PASO 1/8 — Migración de esquema: columnas nuevas en egresos (aditivas)
-- ───────────────────────────────────────────────────────────────────────
-- Responde a BLOQUEANTE 2 y CORRECCIÓN 3: la idempotencia de anular/
-- corregir NO puede depender de que exista un asiento de reversa (un
-- egreso sin asiento vinculado —huérfano histórico o legítimo— nunca
-- crearía ese asiento, así que el reintento fallaría con "ya anulado"
-- en vez de responder reintento=true). Por eso hay TRES columnas de
-- idempotencia, una por operación, todas viviendo en `egresos` — una
-- entidad que SIEMPRE existe:
--   idempotency_key             → registrar (ya existía en la v1)
--   anulacion_idempotency_key   → anular (NUEVA — cierra el Bloqueante 2)
--   correccion_idempotency_key  → corregir (NUEVA — fuente canónica de
--                                  idempotencia de corrección, responde
--                                  a la Corrección 3: antes solo el
--                                  asiento nuevo llevaba la key, ahora
--                                  vive también en la fila ORIGINAL)
-- `estado`: 'activo' | 'anulado' | 'corregido' — antes solo tenía dos
--           valores; 'corregido' es nuevo y distingue "este egreso fue
--           reemplazado por uno corregido" de "se anuló sin más".
-- `motivo_anulacion`/`anulado_at`/`anulado_por`: igual que v1.
-- `correccion_de_id`/`correccion_nuevo_egreso_id`: enlace bidireccional
--           entre el egreso viejo y el nuevo cuando se corrige — permite
--           navegar en los dos sentidos sin adivinar por fecha/monto.
-- `motivo_correccion`/`corregido_at`/`corregido_por`: trazabilidad de la
--           corrección, simétrico a la anulación.

ALTER TABLE public.egresos
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'activo',
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS anulacion_idempotency_key text,
  ADD COLUMN IF NOT EXISTS motivo_anulacion text,
  ADD COLUMN IF NOT EXISTS anulado_at timestamptz,
  ADD COLUMN IF NOT EXISTS anulado_por text,
  ADD COLUMN IF NOT EXISTS correccion_idempotency_key text,
  ADD COLUMN IF NOT EXISTS correccion_de_id uuid,
  ADD COLUMN IF NOT EXISTS correccion_nuevo_egreso_id uuid,
  ADD COLUMN IF NOT EXISTS motivo_correccion text,
  ADD COLUMN IF NOT EXISTS corregido_at timestamptz,
  ADD COLUMN IF NOT EXISTS corregido_por text;

ALTER TABLE public.egresos
  ADD CONSTRAINT egresos_estado_chk CHECK (estado IN ('activo','anulado','corregido'));

-- Defensa en profundidad (además del pg_advisory_xact_lock de cada RPC),
-- mismo patrón que `asientos_idempotency_key_uq` — únicas solo sobre las
-- filas que sí traen key, para no chocar con las 4 filas legacy (NULL).
CREATE UNIQUE INDEX IF NOT EXISTS egresos_idempotency_key_uq
  ON public.egresos (idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS egresos_anulacion_idempotency_key_uq
  ON public.egresos (anulacion_idempotency_key) WHERE (anulacion_idempotency_key IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS egresos_correccion_idempotency_key_uq
  ON public.egresos (correccion_idempotency_key) WHERE (correccion_idempotency_key IS NOT NULL);

-- Las 4 filas reales existentes quedan `estado='activo'` por el DEFAULT
-- del ALTER TABLE — no hace falta UPDATE manual para eso.


-- ───────────────────────────────────────────────────────────────────────
-- PASO 2/8 — Backfill: enlazar formalmente los 4 pares egreso↔asiento
-- legacy, SOLO donde la correspondencia es inequívoca en los DOS sentidos
-- ───────────────────────────────────────────────────────────────────────
-- Responde a BLOQUEANTE 1, punto 1. Auditado: hoy hay 5 asientos con
-- `referencia LIKE 'EGR-%'` — 4 corresponden 1:1 a los 4 egresos reales
-- (mismo id en la referencia, mismo monto_dr=monto_cr=egreso.monto, misma
-- fecha) y 1 es el huérfano histórico ya conocido
-- (EGR-165f23e8-d3e9-44d2-82a3-1477943cf777) cuyo id NO corresponde a
-- ningún egreso.id real — el propio JOIN por referencia ya lo excluye
-- solo, sin necesitar ninguna exclusión explícita.
--
-- La guarda de unicidad es BIDIRECCIONAL (más estricta que el borrador
-- anterior, que solo pedía 1 candidato por egreso): `n_por_egreso=1`
-- (ese egreso no matchea con más de un asiento) Y `n_por_asiento=1` (ese
-- asiento no matchea con más de un egreso) — un egreso o un asiento que
-- de verdad fuera ambiguo en cualquiera de los dos sentidos queda AFUERA
-- del backfill, sin tocar, para revisión manual aparte (hoy: 0 casos así,
-- verificado contra los 4 pares reales).

WITH candidatos AS (
  SELECT
    e.id AS egreso_id,
    a.id AS asiento_id,
    count(*) OVER (PARTITION BY e.id) AS n_por_egreso,
    count(*) OVER (PARTITION BY a.id) AS n_por_asiento
  FROM public.egresos e
  JOIN public.asientos a
    ON a.referencia = 'EGR-' || e.id::text
   AND a.monto_dr = e.monto
   AND a.monto_cr = e.monto
   AND a.fecha::date = e.fecha::date
   AND a.tipo_origen IS NULL
   AND a.origen_id IS NULL
)
UPDATE public.asientos a
   SET tipo_origen = 'egreso', origen_id = c.egreso_id
  FROM candidatos c
 WHERE a.id = c.asiento_id
   AND c.n_por_egreso = 1
   AND c.n_por_asiento = 1;

-- El huérfano histórico EGR-165f23e8-d3e9-44d2-82a3-1477943cf777 NO se
-- toca (responde a BLOQUEANTE 1, punto 3 — mandato explícito de no
-- reasignarlo ni limpiarlo en 4B). Se queda con tipo_origen/origen_id
-- NULL, exactamente como está hoy.


-- ───────────────────────────────────────────────────────────────────────
-- PASO 3/8 — Trigger anti-delete en egresos (sin cambios respecto a v1)
-- ───────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.seguros_bloquear_delete_egreso()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RAISE EXCEPTION 'No se permite eliminar egresos fisicamente. Use seguros_anular_egreso().';
END;
$function$;

CREATE TRIGGER trg_seguros_bloquear_delete_egreso
  BEFORE DELETE ON public.egresos
  FOR EACH ROW EXECUTE FUNCTION public.seguros_bloquear_delete_egreso();


-- ───────────────────────────────────────────────────────────────────────
-- PASO 4/8 — RPC: seguros_registrar_egreso  (sin cambios de fondo vs v1)
-- ───────────────────────────────────────────────────────────────────────
-- created_by se resuelve por `usuarios_sistema.nom` (CORRECCIÓN 5 — ver
-- nota más abajo, en el Paso 5, donde se explica la decisión completa).

CREATE OR REPLACE FUNCTION public.seguros_registrar_egreso(
  p_tipo text,
  p_concepto text,
  p_beneficiario text,
  p_monto numeric,
  p_fecha date,
  p_cuenta_dr_cod text,
  p_cuenta_cr_cod text,
  p_idempotency_key text,
  p_metodo text DEFAULT NULL,
  p_banco text DEFAULT NULL,
  p_nota text DEFAULT NULL,
  p_referencia text DEFAULT NULL,
  p_comprobante_url text DEFAULT NULL
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
  v_cta_dr_nom text; v_cta_cr_nom text;
  v_concepto text; v_tipo text; v_created_by text;
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
  PERFORM pg_advisory_xact_lock(hashtextextended('egreso-registrar:'||p_idempotency_key, 0));
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

  -- Whitelist de 14 cuentas (mismo patrón/lista que
  -- seguros_registrar_asiento_manual) — el llamador elige la cuenta pero
  -- SOLO de este catálogo cerrado, nunca un código arbitrario.
  SELECT nom INTO v_cta_dr_nom FROM (VALUES
    ('1101','Efectivo y equivalentes'),('1201','Cuentas por cobrar — Clientes'),
    ('1301','Inventario'),('2101','Cuentas por pagar — Proveedores'),
    ('2201','Retenciones por pagar'),('2301','Préstamos por pagar'),
    ('3101','Capital social'),('3201','Utilidades retenidas'),
    ('4101','Ingresos por primas'),('4201','Otros ingresos'),
    ('5101','Gastos operativos'),('5201','Nómina agentes'),
    ('5301','Gastos administrativos'),('5401','Depreciación')
  ) AS cuentas(cod,nom) WHERE cod = p_cuenta_dr_cod;
  IF v_cta_dr_nom IS NULL THEN RAISE EXCEPTION 'Cuenta débito inválida: %', p_cuenta_dr_cod; END IF;

  SELECT nom INTO v_cta_cr_nom FROM (VALUES
    ('1101','Efectivo y equivalentes'),('1201','Cuentas por cobrar — Clientes'),
    ('1301','Inventario'),('2101','Cuentas por pagar — Proveedores'),
    ('2201','Retenciones por pagar'),('2301','Préstamos por pagar'),
    ('3101','Capital social'),('3201','Utilidades retenidas'),
    ('4101','Ingresos por primas'),('4201','Otros ingresos'),
    ('5101','Gastos operativos'),('5201','Nómina agentes'),
    ('5301','Gastos administrativos'),('5401','Depreciación')
  ) AS cuentas(cod,nom) WHERE cod = p_cuenta_cr_cod;
  IF v_cta_cr_nom IS NULL THEN RAISE EXCEPTION 'Cuenta crédito inválida: %', p_cuenta_cr_cod; END IF;

  SELECT us.nom INTO v_created_by
    FROM public.profiles p JOIN public.usuarios_sistema us ON us.id = p.usuario_sistema_id
   WHERE p.id = auth.uid();
  v_created_by := coalesce(v_created_by, 'Administrador');

  INSERT INTO public.egresos(
    tipo, concepto, beneficiario, monto, metodo, banco, referencia, nota, fecha,
    comprobante_url, created_by, estado, idempotency_key
  ) VALUES (
    v_tipo, v_concepto, nullif(btrim(coalesce(p_beneficiario,'')),''), p_monto,
    nullif(btrim(coalesce(p_metodo,'')),''), nullif(btrim(coalesce(p_banco,'')),''),
    nullif(btrim(coalesce(p_referencia,'')),''), nullif(btrim(coalesce(p_nota,'')),''),
    p_fecha, nullif(btrim(coalesce(p_comprobante_url,'')),''),
    v_created_by, 'activo', p_idempotency_key
  ) RETURNING id INTO v_eg_id;

  INSERT INTO public.asientos(
    fecha, referencia, descripcion, cuenta_dr_cod, cuenta_dr_nom, monto_dr,
    cuenta_cr_cod, cuenta_cr_nom, monto_cr, tipo_origen, origen_id, idempotency_key
  ) VALUES (
    p_fecha::timestamptz, 'EGR-'||v_eg_id,
    'Egreso ' || v_tipo || ': ' || v_concepto || coalesce(' — '||nullif(btrim(coalesce(p_beneficiario,'')),''), ''),
    p_cuenta_dr_cod, v_cta_dr_nom, p_monto, p_cuenta_cr_cod, v_cta_cr_nom, p_monto,
    'egreso', v_eg_id, 'egreso-registrar:'||p_idempotency_key
  ) RETURNING id INTO v_asiento_id;

  INSERT INTO public.auditoria(ts, usuario, rol, accion, detalle, modulo, entity_table, entity_id, new_data, result, origen, organizacion_id)
  VALUES (
    now()::text, public.mi_usuario_id()::text, v_rol, 'EGRESO_REGISTRADO',
    v_concepto || ' · ' || v_cta_dr_nom || ' ' || p_monto, 'Contabilidad', 'egresos', v_eg_id::text,
    jsonb_build_object('asiento_id', v_asiento_id, 'monto', p_monto, 'tipo', v_tipo)::text,
    'OK', 'seguros_registrar_egreso', public.mi_organizacion()
  );

  RETURN jsonb_build_object('ok', true, 'reintento', false, 'egreso_id', v_eg_id, 'asiento_id', v_asiento_id);
END;
$function$;


-- ───────────────────────────────────────────────────────────────────────
-- PASO 5/8 — RPC: seguros_anular_egreso  (reversa, no DELETE)
-- ───────────────────────────────────────────────────────────────────────
-- BLOQUEANTE 1 — fallback formal→legacy: primero busca el asiento por el
-- vínculo FORMAL (tipo_origen='egreso' AND origen_id=egreso.id — cubre
-- tanto los egresos nuevos como los 4 legacy ya enlazados por el backfill
-- del Paso 2). Si no hay ninguno así (p.ej. el backfill no llegó a
-- enlazarlo por alguna razón, o es un caso legacy nuevo no contemplado),
-- cae a un segundo intento por referencia exacta legacy
-- (`referencia='EGR-'||egreso.id::text AND tipo_origen IS NULL`) — texto
-- LITERAL de la instrucción de ChatGPT ("por referencia exacta"; a
-- propósito NO se agrega aquí el filtro extra de monto/fecha que sí lleva
-- el backfill del Paso 2 — ese es un candado más estricto para una
-- operación masiva de una sola vez, este es el candado en vivo de la RPC).
--
-- Interpretación explícita de "rechazando si hay 0 o >1 candidatos"
-- (marcado para que ChatGPT lo confirme o corrija si no es lo que quiso
-- decir): se aplica SOLO al caso >1 (ambigüedad real — RAISE EXCEPTION).
-- El caso 0 candidatos se trata como resultado legítimo ("no hay nada que
-- reversar contablemente porque nunca se contabilizó") — igual que
-- `seguros_anular_factura` ya hace con `v_prima_rev<=0` (ver precedente
-- citado en la entrega de bitácora). Rechazar también el caso 0 haría
-- imposible cumplir la propia validación #5 que exige "idempotencia de
-- anular funciona incluso si el egreso no tiene asiento".
--
-- BLOQUEANTE 2 — idempotencia: fast-path por `egresos.anulacion_
-- idempotency_key` (columna dedicada, Paso 1) ANTES de tocar nada más —
-- funciona exista o no un asiento de reversa que reversar.

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
  v_existente public.egresos%ROWTYPE;
  v_ast public.asientos%ROWTYPE;
  v_n_formal int; v_n_legacy int;
  v_rev_id uuid;
  v_motivo text; v_created_by text;
  v_sin_asiento boolean := false;
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
  PERFORM pg_advisory_xact_lock(hashtextextended('egreso-anular:'||p_idempotency_key, 0));
  SELECT * INTO v_existente FROM public.egresos WHERE anulacion_idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'reintento', true, 'egreso_id', v_existente.id);
  END IF;

  v_motivo := btrim(coalesce(p_motivo, ''));
  IF v_motivo = '' THEN RAISE EXCEPTION 'El motivo de la anulación es obligatorio'; END IF;

  SELECT us.nom INTO v_created_by
    FROM public.profiles p JOIN public.usuarios_sistema us ON us.id = p.usuario_sistema_id
   WHERE p.id = auth.uid();
  v_created_by := coalesce(v_created_by, 'Administrador');

  UPDATE public.egresos
     SET estado='anulado', anulacion_idempotency_key=p_idempotency_key,
         motivo_anulacion=v_motivo, anulado_at=now(), anulado_por=v_created_by
   WHERE id = p_egreso_id AND estado = 'activo'
   RETURNING * INTO v_eg;

  IF NOT FOUND THEN
    SELECT * INTO v_eg FROM public.egresos WHERE id = p_egreso_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Egreso no encontrado'; END IF;
    IF v_eg.estado = 'anulado' THEN
      RAISE EXCEPTION 'Este egreso ya está anulado (motivo previo: %)', v_eg.motivo_anulacion;
    END IF;
    RAISE EXCEPTION 'No se puede anular: un egreso en estado % no se puede anular', v_eg.estado;
  END IF;

  -- Fallback formal → legacy (BLOQUEANTE 1)
  SELECT count(*) INTO v_n_formal FROM public.asientos WHERE tipo_origen='egreso' AND origen_id=p_egreso_id;
  IF v_n_formal = 1 THEN
    SELECT * INTO v_ast FROM public.asientos WHERE tipo_origen='egreso' AND origen_id=p_egreso_id FOR UPDATE;
  ELSIF v_n_formal = 0 THEN
    SELECT count(*) INTO v_n_legacy FROM public.asientos WHERE tipo_origen IS NULL AND referencia = 'EGR-'||p_egreso_id::text;
    IF v_n_legacy = 1 THEN
      SELECT * INTO v_ast FROM public.asientos WHERE tipo_origen IS NULL AND referencia = 'EGR-'||p_egreso_id::text FOR UPDATE;
    ELSIF v_n_legacy = 0 THEN
      v_sin_asiento := true;
    ELSE
      RAISE EXCEPTION 'Ambigüedad: % asientos legacy candidatos para este egreso — revisar manualmente', v_n_legacy;
    END IF;
  ELSE
    RAISE EXCEPTION 'Ambigüedad: % asientos formales vinculados a este egreso — revisar manualmente', v_n_formal;
  END IF;

  IF NOT v_sin_asiento THEN
    INSERT INTO public.asientos(
      fecha, referencia, descripcion, cuenta_dr_cod, cuenta_dr_nom, monto_dr,
      cuenta_cr_cod, cuenta_cr_nom, monto_cr, tipo_origen, origen_id, idempotency_key
    ) VALUES (
      now(), 'EGR-ANUL-'||substring(p_egreso_id::text from 1 for 8),
      'Reversa de egreso · Motivo: '||v_motivo||' · '||coalesce(v_ast.descripcion,''),
      v_ast.cuenta_cr_cod, v_ast.cuenta_cr_nom, v_ast.monto_cr,
      v_ast.cuenta_dr_cod, v_ast.cuenta_dr_nom, v_ast.monto_dr,
      'egreso_reversa', p_egreso_id, 'egreso-anular:'||p_idempotency_key
    ) RETURNING id INTO v_rev_id;
  END IF;

  INSERT INTO public.auditoria(ts, usuario, rol, accion, detalle, modulo, entity_table, entity_id, old_data, new_data, result, origen, organizacion_id)
  VALUES (
    now()::text, public.mi_usuario_id()::text, v_rol, 'EGRESO_ANULADO',
    'Motivo: '||v_motivo, 'Contabilidad', 'egresos', p_egreso_id::text,
    row_to_json(v_eg)::text,
    jsonb_build_object('asiento_original_id', v_ast.id, 'asiento_reversa_id', v_rev_id, 'sin_asiento_vinculado', v_sin_asiento)::text,
    'OK', 'seguros_anular_egreso', public.mi_organizacion()
  );

  RETURN jsonb_build_object(
    'ok', true, 'reintento', false, 'egreso_id', p_egreso_id,
    'asiento_original_id', v_ast.id, 'asiento_reversa_id', v_rev_id,
    'sin_asiento_vinculado', v_sin_asiento
  );
END;
$function$;

-- CORRECCIÓN 5, decisión tomada (created_by / anulado_por / corregido_por):
-- se mantienen legibles por humano, resueltos vía `usuarios_sistema.nom`
-- (JOIN profiles→usuarios_sistema por auth.uid()) — EXACTAMENTE el mismo
-- valor que ya traen las 4 filas legacy (`created_by='Administrador'`,
-- confirmado contra `usuarios_sistema.nom` del usuario admin real
-- `sterlin08`). NO se mezcla con el UUID de `mi_usuario_id()`. La
-- identidad fuerte (UUID) vive por separado, siempre, en
-- `auditoria.usuario` — mismo patrón ya establecido y en producción en
-- `seguros_registrar_asiento_manual`/`seguros_anular_factura` (columna
-- `usuario` de auditoria = `mi_usuario_id()::text`). Dos columnas, dos
-- propósitos distintos, ninguna mezcla ambigua.


-- ───────────────────────────────────────────────────────────────────────
-- PASO 6/8 — RPC: seguros_corregir_egreso  (anula + registra, atómico)
-- ───────────────────────────────────────────────────────────────────────
-- CORRECCIÓN 3 — fuente canónica de idempotencia de corrección:
-- `egresos.correccion_idempotency_key`, en la fila ORIGINAL (no en el
-- asiento nuevo como hacía la v1). Documentado aquí explícitamente:
-- reintentar con la misma key SIEMPRE resuelve por esta columna, exista o
-- no el egreso nuevo (defensa idéntica a la de anular, Bloqueante 2).
--
-- CORRECCIÓN 4 — origen_id: TODAS las filas de asientos relacionadas con
-- egresos usan `origen_id = <egreso.id>` de forma consistente, sin
-- importar `tipo_origen` — confirmado por precedente real
-- (`seguros_anular_factura` usa `origen_id = v_fact.id`, el id de la
-- FACTURA, tanto en el asiento original como en su reversa). Aquí: el
-- asiento de reversa usa `origen_id = <egreso ORIGINAL.id>`
-- (tipo_origen='egreso_reversa'), y el asiento nuevo usa
-- `origen_id = <egreso NUEVO.id>` (tipo_origen='egreso') — cada fila
-- apunta al egreso que la causó, nunca a otro asiento.

CREATE OR REPLACE FUNCTION public.seguros_corregir_egreso(
  p_egreso_id uuid,
  p_motivo text,
  p_tipo text,
  p_concepto text,
  p_beneficiario text,
  p_monto numeric,
  p_fecha date,
  p_cuenta_dr_cod text,
  p_cuenta_cr_cod text,
  p_idempotency_key text,
  p_metodo text DEFAULT NULL,
  p_banco text DEFAULT NULL,
  p_nota text DEFAULT NULL,
  p_referencia text DEFAULT NULL,
  p_comprobante_url text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_rol text;
  v_orig public.egresos%ROWTYPE;
  v_existente public.egresos%ROWTYPE;
  v_ast public.asientos%ROWTYPE;
  v_n_formal int; v_n_legacy int;
  v_rev_id uuid; v_nuevo_eg_id uuid; v_nuevo_ast_id uuid;
  v_motivo text; v_tipo text; v_concepto text; v_created_by text;
  v_cta_dr_nom text; v_cta_cr_nom text;
  v_sin_asiento boolean := false;
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
  PERFORM pg_advisory_xact_lock(hashtextextended('egreso-corregir:'||p_idempotency_key, 0));
  SELECT * INTO v_existente FROM public.egresos WHERE correccion_idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true, 'reintento', true,
      'egreso_original_id', v_existente.id,
      'egreso_nuevo_id', v_existente.correccion_nuevo_egreso_id
    );
  END IF;

  v_motivo := btrim(coalesce(p_motivo, ''));
  IF v_motivo = '' THEN RAISE EXCEPTION 'El motivo de la corrección es obligatorio'; END IF;

  v_tipo := upper(btrim(coalesce(p_tipo, '')));
  IF v_tipo NOT IN ('ARS','SALARIO','GASTO') THEN RAISE EXCEPTION 'Tipo de egreso inválido: %', p_tipo; END IF;
  v_concepto := btrim(coalesce(p_concepto, ''));
  IF v_concepto = '' THEN RAISE EXCEPTION 'El concepto es obligatorio'; END IF;
  IF p_monto IS NULL OR p_monto <= 0 THEN RAISE EXCEPTION 'El monto debe ser mayor que 0'; END IF;
  IF p_fecha IS NULL OR p_fecha < date '2020-01-01' OR p_fecha > (current_date + interval '1 day')::date THEN
    RAISE EXCEPTION 'Fecha fuera de rango razonable: %', p_fecha;
  END IF;

  SELECT us.nom INTO v_created_by
    FROM public.profiles p JOIN public.usuarios_sistema us ON us.id = p.usuario_sistema_id
   WHERE p.id = auth.uid();
  v_created_by := coalesce(v_created_by, 'Administrador');

  -- 1) Anular el original — MISMA guarda UPDATE-WHERE que seguros_anular_egreso
  UPDATE public.egresos
     SET estado='corregido', correccion_idempotency_key=p_idempotency_key,
         motivo_correccion=v_motivo, corregido_at=now(), corregido_por=v_created_by
   WHERE id = p_egreso_id AND estado = 'activo'
   RETURNING * INTO v_orig;

  IF NOT FOUND THEN
    SELECT * INTO v_orig FROM public.egresos WHERE id = p_egreso_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Egreso no encontrado'; END IF;
    IF v_orig.estado = 'corregido' THEN
      RAISE EXCEPTION 'Este egreso ya fue corregido (ver egreso nuevo: %)', v_orig.correccion_nuevo_egreso_id;
    END IF;
    RAISE EXCEPTION 'No se puede corregir: un egreso en estado % no se puede corregir', v_orig.estado;
  END IF;

  -- Fallback formal → legacy, idéntico al de seguros_anular_egreso
  SELECT count(*) INTO v_n_formal FROM public.asientos WHERE tipo_origen='egreso' AND origen_id=p_egreso_id;
  IF v_n_formal = 1 THEN
    SELECT * INTO v_ast FROM public.asientos WHERE tipo_origen='egreso' AND origen_id=p_egreso_id FOR UPDATE;
  ELSIF v_n_formal = 0 THEN
    SELECT count(*) INTO v_n_legacy FROM public.asientos WHERE tipo_origen IS NULL AND referencia = 'EGR-'||p_egreso_id::text;
    IF v_n_legacy = 1 THEN
      SELECT * INTO v_ast FROM public.asientos WHERE tipo_origen IS NULL AND referencia = 'EGR-'||p_egreso_id::text FOR UPDATE;
    ELSIF v_n_legacy = 0 THEN
      v_sin_asiento := true;
    ELSE
      RAISE EXCEPTION 'Ambigüedad: % asientos legacy candidatos para este egreso — revisar manualmente', v_n_legacy;
    END IF;
  ELSE
    RAISE EXCEPTION 'Ambigüedad: % asientos formales vinculados a este egreso — revisar manualmente', v_n_formal;
  END IF;

  IF NOT v_sin_asiento THEN
    INSERT INTO public.asientos(
      fecha, referencia, descripcion, cuenta_dr_cod, cuenta_dr_nom, monto_dr,
      cuenta_cr_cod, cuenta_cr_nom, monto_cr, tipo_origen, origen_id, idempotency_key
    ) VALUES (
      now(), 'EGR-CORR-'||substring(p_egreso_id::text from 1 for 8),
      'Reversa por corrección · Motivo: '||v_motivo||' · '||coalesce(v_ast.descripcion,''),
      v_ast.cuenta_cr_cod, v_ast.cuenta_cr_nom, v_ast.monto_cr,
      v_ast.cuenta_dr_cod, v_ast.cuenta_dr_nom, v_ast.monto_dr,
      'egreso_reversa', p_egreso_id, 'egreso-corregir-rev:'||p_idempotency_key
    ) RETURNING id INTO v_rev_id;
  END IF;

  -- 2) Registrar el egreso corregido (nueva fila — la original NUNCA se reescribe)
  SELECT nom INTO v_cta_dr_nom FROM (VALUES
    ('1101','Efectivo y equivalentes'),('1201','Cuentas por cobrar — Clientes'),
    ('1301','Inventario'),('2101','Cuentas por pagar — Proveedores'),
    ('2201','Retenciones por pagar'),('2301','Préstamos por pagar'),
    ('3101','Capital social'),('3201','Utilidades retenidas'),
    ('4101','Ingresos por primas'),('4201','Otros ingresos'),
    ('5101','Gastos operativos'),('5201','Nómina agentes'),
    ('5301','Gastos administrativos'),('5401','Depreciación')
  ) AS cuentas(cod,nom) WHERE cod = p_cuenta_dr_cod;
  IF v_cta_dr_nom IS NULL THEN RAISE EXCEPTION 'Cuenta débito inválida: %', p_cuenta_dr_cod; END IF;

  SELECT nom INTO v_cta_cr_nom FROM (VALUES
    ('1101','Efectivo y equivalentes'),('1201','Cuentas por cobrar — Clientes'),
    ('1301','Inventario'),('2101','Cuentas por pagar — Proveedores'),
    ('2201','Retenciones por pagar'),('2301','Préstamos por pagar'),
    ('3101','Capital social'),('3201','Utilidades retenidas'),
    ('4101','Ingresos por primas'),('4201','Otros ingresos'),
    ('5101','Gastos operativos'),('5201','Nómina agentes'),
    ('5301','Gastos administrativos'),('5401','Depreciación')
  ) AS cuentas(cod,nom) WHERE cod = p_cuenta_cr_cod;
  IF v_cta_cr_nom IS NULL THEN RAISE EXCEPTION 'Cuenta crédito inválida: %', p_cuenta_cr_cod; END IF;

  INSERT INTO public.egresos(
    tipo, concepto, beneficiario, monto, metodo, banco, referencia, nota, fecha,
    comprobante_url, created_by, estado, idempotency_key, correccion_de_id
  ) VALUES (
    v_tipo, v_concepto, nullif(btrim(coalesce(p_beneficiario,'')),''), p_monto,
    nullif(btrim(coalesce(p_metodo,'')),''), nullif(btrim(coalesce(p_banco,'')),''),
    nullif(btrim(coalesce(p_referencia,'')),''), nullif(btrim(coalesce(p_nota,'')),''),
    p_fecha, nullif(btrim(coalesce(p_comprobante_url,'')),''),
    v_created_by, 'activo', 'egreso-corregido:'||p_idempotency_key, p_egreso_id
  ) RETURNING id INTO v_nuevo_eg_id;

  INSERT INTO public.asientos(
    fecha, referencia, descripcion, cuenta_dr_cod, cuenta_dr_nom, monto_dr,
    cuenta_cr_cod, cuenta_cr_nom, monto_cr, tipo_origen, origen_id, idempotency_key
  ) VALUES (
    p_fecha::timestamptz, 'EGR-'||v_nuevo_eg_id,
    'Egreso ' || v_tipo || ': ' || v_concepto || coalesce(' — '||nullif(btrim(coalesce(p_beneficiario,'')),''), ''),
    p_cuenta_dr_cod, v_cta_dr_nom, p_monto, p_cuenta_cr_cod, v_cta_cr_nom, p_monto,
    'egreso', v_nuevo_eg_id, 'egreso-corregido-asiento:'||p_idempotency_key
  ) RETURNING id INTO v_nuevo_ast_id;

  UPDATE public.egresos SET correccion_nuevo_egreso_id = v_nuevo_eg_id WHERE id = p_egreso_id;

  INSERT INTO public.auditoria(ts, usuario, rol, accion, detalle, modulo, entity_table, entity_id, old_data, new_data, result, origen, organizacion_id)
  VALUES (
    now()::text, public.mi_usuario_id()::text, v_rol, 'EGRESO_CORREGIDO',
    'Motivo: '||v_motivo, 'Contabilidad', 'egresos', p_egreso_id::text,
    row_to_json(v_orig)::text,
    jsonb_build_object('egreso_nuevo_id', v_nuevo_eg_id, 'asiento_original_id', v_ast.id, 'asiento_reversa_id', v_rev_id, 'asiento_nuevo_id', v_nuevo_ast_id, 'sin_asiento_vinculado', v_sin_asiento)::text,
    'OK', 'seguros_corregir_egreso', public.mi_organizacion()
  );

  RETURN jsonb_build_object(
    'ok', true, 'reintento', false,
    'egreso_original_id', p_egreso_id, 'egreso_nuevo_id', v_nuevo_eg_id,
    'asiento_original_id', v_ast.id, 'asiento_reversa_id', v_rev_id, 'asiento_nuevo_id', v_nuevo_ast_id,
    'sin_asiento_vinculado', v_sin_asiento
  );
END;
$function$;


-- ───────────────────────────────────────────────────────────────────────
-- PASO 7/8 — ACL final: RPCs + tabla egresos
-- ───────────────────────────────────────────────────────────────────────
-- HALLAZGO NO PEDIDO, encontrado al probar (T20): Supabase concede
-- EXECUTE a `anon` de forma EXPLÍCITA en cada función nueva del schema
-- `public` vía ALTER DEFAULT PRIVILEGES a nivel de proyecto —
-- independiente de PUBLIC. `REVOKE ... FROM PUBLIC` solo NO revoca ese
-- grant a `anon` (mismo patrón ya documentado en el propio CLAUDE.md del
-- proyecto, incidente "candado atómico de IMEI", 8-ago-2026). Por eso
-- cada REVOKE de abajo incluye `anon` explícito, y se verificó con
-- has_function_privilege('anon', ..., 'execute') = false para las 4
-- funciones (las 3 RPC + el trigger).

REVOKE EXECUTE ON FUNCTION public.seguros_registrar_egreso(text,text,text,numeric,date,text,text,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seguros_registrar_egreso(text,text,text,numeric,date,text,text,text,text,text,text,text,text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.seguros_anular_egreso(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seguros_anular_egreso(uuid,text,text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.seguros_corregir_egreso(uuid,text,text,text,text,numeric,date,text,text,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seguros_corregir_egreso(uuid,text,text,text,text,numeric,date,text,text,text,text,text,text,text,text) TO authenticated;

-- El trigger no se llama directo (solo lo dispara Postgres en un DELETE);
-- se le retira igual el EXECUTE implícito, por prolijidad defensiva.
REVOKE EXECUTE ON FUNCTION public.seguros_bloquear_delete_egreso() FROM PUBLIC, anon, authenticated;

-- Ningún escritor legítimo de metadata por REST directo queda vivo — los
-- 3 únicos escritores reales (registrar/anular/corregir) son las RPC de
-- arriba. `authenticated` queda SOLO con SELECT, igual que `asientos` tras
-- el 3C (respuesta a la validación "ACL final deja authenticated solo
-- SELECT en egresos").
REVOKE ALL ON public.egresos FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON public.egresos FROM authenticated;
GRANT SELECT ON public.egresos TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════
-- PASO 8/8 — CORRECCIÓN 6: seguros_diagnostico_financiero() — NO SE TOCA
-- ═══════════════════════════════════════════════════════════════════════
-- Mandato explícito de ChatGPT: excluir la recreación de esta función del
-- cierre mínimo de 4B. No hay ningún CREATE OR REPLACE de
-- seguros_diagnostico_financiero() en este archivo — la función queda
-- exactamente como está hoy en producción. Verificado con la prueba T1/
-- T22 (batería de esta revisión) que sigue devolviendo `ok:true` sin
-- ningún cambio. Si en el futuro se quiere sumar observabilidad de
-- egresos_sin_asiento/asientos_egreso_huerfanos a esa función, es un paso
-- posterior separado, con su propio diff fresco — no forma parte de esta
-- entrega.


-- ═══════════════════════════════════════════════════════════════════════
-- PLAN DE ROLLBACK (si algo de esto llega a aplicarse y hay que revertir)
-- ═══════════════════════════════════════════════════════════════════════
-- 1. DROP FUNCTION public.seguros_corregir_egreso(uuid,text,text,text,text,numeric,date,text,text,text,text,text,text,text,text);
-- 2. DROP FUNCTION public.seguros_anular_egreso(uuid,text,text);
-- 3. DROP FUNCTION public.seguros_registrar_egreso(text,text,text,numeric,date,text,text,text,text,text,text,text,text);
-- 4. DROP TRIGGER trg_seguros_bloquear_delete_egreso ON public.egresos;
--    DROP FUNCTION public.seguros_bloquear_delete_egreso();
-- 5. GRANT INSERT, UPDATE, DELETE ON public.egresos TO authenticated;  -- vuelve al ACL de hoy
--    GRANT ALL ON public.egresos TO anon;                              -- SOLO si hace falta revertir 100%
-- 6. UPDATE public.asientos SET tipo_origen=NULL, origen_id=NULL
--      WHERE tipo_origen='egreso' AND referencia LIKE 'EGR-%'
--      AND origen_id IN (SELECT id FROM public.egresos);  -- deshace SOLO el backfill del Paso 2
-- 7. ALTER TABLE public.egresos DROP CONSTRAINT egresos_estado_chk;
--    DROP INDEX public.egresos_idempotency_key_uq;
--    DROP INDEX public.egresos_anulacion_idempotency_key_uq;
--    DROP INDEX public.egresos_correccion_idempotency_key_uq;
--    ALTER TABLE public.egresos
--      DROP COLUMN estado, DROP COLUMN idempotency_key,
--      DROP COLUMN anulacion_idempotency_key, DROP COLUMN motivo_anulacion,
--      DROP COLUMN anulado_at, DROP COLUMN anulado_por,
--      DROP COLUMN correccion_idempotency_key, DROP COLUMN correccion_de_id,
--      DROP COLUMN correccion_nuevo_egreso_id, DROP COLUMN motivo_correccion,
--      DROP COLUMN corregido_at, DROP COLUMN corregido_por;
-- 8. seguros_diagnostico_financiero() no se tocó — nada que revertir ahí.
