-- ══════════════════════════════════════════════════════════════════════════
-- Bloque 3B — batería de pruebas (CONSOLIDADA, versión final).
-- TODO dentro de BEGIN...ROLLBACK, nada persiste.
-- Corre contra el proyecto real (tnwsgcxurfyuszxsewsn) — solo lectura de datos
-- reales de producción (ADELMA), toda escritura es sobre datos sintéticos y
-- se revierte al final con ROLLBACK.
--
-- Última corrida real: 2026-08-12 ~14:29 UTC — 38 aserciones, 38 en verde.
-- ══════════════════════════════════════════════════════════════════════════
BEGIN;

-- ── [1] Esquema propuesto (verbatim de propuesta_3b.sql) ────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS facturas_cliente_periodo_activa_unico
  ON public.facturas (cliente_id, periodo)
  WHERE estado <> 'Anulada';

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
  v_rol := public.mi_rol();
  IF v_rol IS NULL OR v_rol <> 'admin' THEN
    RAISE EXCEPTION 'No autorizado: generar factura manual requiere rol admin';
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
    RETURN jsonb_build_object('ok', true, 'reintento', true, 'asiento_id', v_existente.id, 'factura_id', v_existente.origen_id);
  END IF;

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

  SELECT * INTO v_cli FROM public.clientes WHERE id = p_cliente_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cliente no encontrado'; END IF;
  IF v_cli.activo IS DISTINCT FROM true THEN RAISE EXCEPTION 'El cliente no está activo'; END IF;
  IF v_cli.permitir_facturacion IS FALSE THEN RAISE EXCEPTION 'Este cliente tiene la facturación automática desactivada'; END IF;

  IF EXISTS (SELECT 1 FROM public.facturas WHERE cliente_id = p_cliente_id AND periodo = p_periodo AND estado <> 'Anulada') THEN
    RETURN jsonb_build_object('ok', false, 'razon', 'Ya existe una factura no anulada de este cliente para este período', 'periodo', p_periodo);
  END IF;

  v_deuda_ant := GREATEST(0, coalesce(v_cli.deuda_total,0) - coalesce(v_cli.pagado,0));
  v_total := p_prima_base + p_prima_deps + v_deuda_ant;
  v_aumento := p_prima_base + p_prima_deps;

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

REVOKE ALL ON FUNCTION public.seguros_generar_factura_manual(uuid,text,integer,integer,numeric,numeric,text,date,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.seguros_generar_factura_manual(uuid,text,integer,integer,numeric,numeric,text,date,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.seguros_generar_factura_manual(uuid,text,integer,integer,numeric,numeric,text,date,text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.seguros_anular_factura(uuid,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.seguros_anular_factura(uuid,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.seguros_anular_factura(uuid,text,text) TO authenticated, service_role;

-- ── [2] Recolector de resultados ─────────────────────────────────────────────
CREATE TEMP TABLE test_results(n int GENERATED ALWAYS AS IDENTITY, step text, ok boolean, detail text);
GRANT INSERT, SELECT ON test_results TO authenticated, anon, service_role;

-- ── [3] Datos sintéticos de prueba (clientes/facturas de juguete) ──────────
INSERT INTO clientes(id, nom, deuda_total, pagado, deuda_anterior, activo, permitir_facturacion, plan)
VALUES ('11111111-1111-1111-1111-111111111111','TEST CLIENTE 3B RESYNC', 9000, 5000, 0, true, true, 'Test');

INSERT INTO facturas(id, cliente_id, cliente_nom, periodo, mes, anio, prima_base, prima_deps, deuda_ant, total, estado, wa_sent)
VALUES
 ('aaaaaaaa-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','TEST CLIENTE 3B RESYNC','2026-01',1,2026,3000,0,0,3000,'Pagado',false),
 ('aaaaaaaa-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','TEST CLIENTE 3B RESYNC','2026-02',2,2026,3000,0,0,3000,'Parcial',false),
 ('aaaaaaaa-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','TEST CLIENTE 3B RESYNC','2026-03',3,2026,3000,0,0,3000,'Pendiente',false),
 ('aaaaaaaa-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111','TEST CLIENTE 3B RESYNC','2026-04',4,2026,0,0,0,0,'Pendiente',false);

INSERT INTO clientes(id, nom, deuda_total, pagado, deuda_anterior, activo, permitir_facturacion, plan)
VALUES ('22222222-2222-2222-2222-222222222222','TEST CLIENTE INACTIVO', 0,0,0, false, true, 'Test');
INSERT INTO clientes(id, nom, deuda_total, pagado, deuda_anterior, activo, permitir_facturacion, plan)
VALUES ('33333333-3333-3333-3333-333333333333','TEST CLIENTE SIN FACTURACION', 0,0,0, true, false, 'Test');

-- Cliente/factura FRESCOS para S2 (nunca tocados por el resync del escenario M,
-- que corre sobre el cliente 11111111-... y sus facturas aaaaaaaa-1111..4444) —
-- así el escenario "anular una factura de $0" prueba de verdad la rama sin
-- asiento de seguros_anular_factura(), sin que un resync AJENO haya cambiado
-- su estado antes de que llegue su turno.
INSERT INTO clientes(id, nom, deuda_total, pagado, deuda_anterior, activo, permitir_facturacion, plan)
VALUES ('55555555-5555-5555-5555-555555555555','TEST CLIENTE 3B CERO PRIMA FRESCO', 0, 0, 0, true, true, 'Test');
INSERT INTO facturas(id, cliente_id, cliente_nom, periodo, mes, anio, prima_base, prima_deps, deuda_ant, total, estado, wa_sent)
VALUES ('66666666-6666-6666-6666-666666666666','55555555-5555-5555-5555-555555555555','TEST CLIENTE 3B CERO PRIMA FRESCO','2026-05',5,2026,0,0,0,0,'Pendiente',false);

-- ═══════════════════════ GENERACIÓN ═══════════════════════

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','35319647-f721-40b2-a01d-c3ccb1642649','role','authenticated')::text, true);

DO $$
DECLARE r jsonb;
BEGIN
  r := seguros_generar_factura_manual('2b0af82d-6255-4f7f-9540-1559705536b6'::uuid, '2026-08', 8, 2026, 4500, 0, 'B02', current_date, 'idem-gen-adelma-2026-08-001');
  INSERT INTO test_results(step, ok, detail) VALUES ('A_admin_generar_ok', ((r->>'ok')='true'), r::text);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO test_results(step, ok, detail) VALUES ('A_admin_generar_ok', false, SQLERRM);
END $$;

DO $$
DECLARE r jsonb;
BEGIN
  r := seguros_generar_factura_manual('2b0af82d-6255-4f7f-9540-1559705536b6'::uuid, '2026-08', 8, 2026, 4500, 0, 'B02', current_date, 'idem-gen-adelma-2026-08-001');
  INSERT INTO test_results(step, ok, detail) VALUES ('B_idempotent_retry', ((r->>'reintento')='true'), r::text);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO test_results(step, ok, detail) VALUES ('B_idempotent_retry', false, SQLERRM);
END $$;

INSERT INTO test_results(step, ok, detail)
SELECT 'B2_count_check', (count(*)=1), 'count='||count(*)
FROM facturas WHERE cliente_id='2b0af82d-6255-4f7f-9540-1559705536b6' AND periodo='2026-08';

DO $$
DECLARE r jsonb;
BEGIN
  r := seguros_generar_factura_manual('2b0af82d-6255-4f7f-9540-1559705536b6'::uuid, '2026-07', 7, 2026, 4500, 0, 'B02', current_date, 'idem-gen-adelma-2026-07-dup');
  INSERT INTO test_results(step, ok, detail) VALUES ('C_duplicate_rejected', ((r->>'ok')='false'), r::text);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO test_results(step, ok, detail) VALUES ('C_duplicate_rejected', false, 'UNEXPECTED EXCEPTION: '||SQLERRM);
END $$;

INSERT INTO test_results(step, ok, detail)
SELECT 'D_deuda_ant_floored_at_zero', (deuda_ant=0 AND total=4500), 'deuda_ant='||deuda_ant||' total='||total
FROM facturas WHERE cliente_id='2b0af82d-6255-4f7f-9540-1559705536b6' AND periodo='2026-08';

DO $$
BEGIN
  INSERT INTO facturas(id, cliente_id, cliente_nom, periodo, mes, anio, prima_base, prima_deps, deuda_ant, total, estado, wa_sent)
  VALUES (gen_random_uuid(), '2b0af82d-6255-4f7f-9540-1559705536b6','ADELMA (dup test)','2026-08',8,2026,999,0,0,999,'Pendiente',false);
  INSERT INTO test_results(step, ok, detail) VALUES ('E_unique_index_blocks_dup', false, 'NO SE RECHAZÓ EL DUPLICADO — FALLO DE DISEÑO');
EXCEPTION WHEN unique_violation THEN
  INSERT INTO test_results(step, ok, detail) VALUES ('E_unique_index_blocks_dup', true, SQLERRM);
WHEN OTHERS THEN
  INSERT INTO test_results(step, ok, detail) VALUES ('E_unique_index_blocks_dup', false, 'OTRO ERROR: '||SQLERRM);
END $$;

DO $$
DECLARE r jsonb;
BEGIN
  r := seguros_generar_factura_manual('99999999-9999-9999-9999-999999999999'::uuid, '2026-08', 8, 2026, 1000, 0, 'B02', current_date, 'idem-gen-notfound');
  INSERT INTO test_results(step, ok, detail) VALUES ('F_cliente_no_encontrado', false, 'NO LANZÓ EXCEPCIÓN: '||r::text);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO test_results(step, ok, detail) VALUES ('F_cliente_no_encontrado', (SQLERRM LIKE '%no encontrado%'), SQLERRM);
END $$;

DO $$
DECLARE r jsonb;
BEGIN
  r := seguros_generar_factura_manual('22222222-2222-2222-2222-222222222222'::uuid, '2026-08', 8, 2026, 1000, 0, 'B02', current_date, 'idem-gen-inactivo');
  INSERT INTO test_results(step, ok, detail) VALUES ('F2_cliente_inactivo', false, 'NO LANZÓ EXCEPCIÓN: '||r::text);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO test_results(step, ok, detail) VALUES ('F2_cliente_inactivo', (SQLERRM LIKE '%no está activo%'), SQLERRM);
END $$;

DO $$
DECLARE r jsonb;
BEGIN
  r := seguros_generar_factura_manual('33333333-3333-3333-3333-333333333333'::uuid, '2026-08', 8, 2026, 1000, 0, 'B02', current_date, 'idem-gen-sinfact');
  INSERT INTO test_results(step, ok, detail) VALUES ('F3_permitir_facturacion_false', false, 'NO LANZÓ EXCEPCIÓN: '||r::text);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO test_results(step, ok, detail) VALUES ('F3_permitir_facturacion_false', (SQLERRM LIKE '%desactivada%'), SQLERRM);
END $$;

DO $$
DECLARE r jsonb;
BEGIN
  r := seguros_generar_factura_manual('2b0af82d-6255-4f7f-9540-1559705536b6'::uuid, '2026-13', 13, 2026, 1000, 0, 'B02', current_date, 'idem-gen-invmes');
  INSERT INTO test_results(step, ok, detail) VALUES ('G_mes_invalido', false, 'NO LANZÓ EXCEPCIÓN: '||r::text);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO test_results(step, ok, detail) VALUES ('G_mes_invalido', (SQLERRM LIKE '%mes inválido%' OR SQLERRM LIKE '%periodo inválido%'), SQLERRM);
END $$;

DO $$
DECLARE r jsonb;
BEGIN
  r := seguros_generar_factura_manual('2b0af82d-6255-4f7f-9540-1559705536b6'::uuid, '2026-09', 9, 2026, -100, 0, 'B02', current_date, 'idem-gen-negprima');
  INSERT INTO test_results(step, ok, detail) VALUES ('G2_prima_negativa', false, 'NO LANZÓ EXCEPCIÓN: '||r::text);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO test_results(step, ok, detail) VALUES ('G2_prima_negativa', (SQLERRM LIKE '%inválida%'), SQLERRM);
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','9758c18f-22eb-4d5b-b99a-2fc4b9791f2c','role','authenticated')::text, true);
DO $$
DECLARE r jsonb;
BEGIN
  r := seguros_generar_factura_manual('2b0af82d-6255-4f7f-9540-1559705536b6'::uuid, '2026-09', 9, 2026, 4500, 0, 'B02', current_date, 'idem-gen-agente');
  INSERT INTO test_results(step, ok, detail) VALUES ('H_agente_rechazado', false, 'NO LANZÓ EXCEPCIÓN: '||r::text);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO test_results(step, ok, detail) VALUES ('H_agente_rechazado', (SQLERRM LIKE '%rol admin%'), SQLERRM);
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','f56c1315-d29c-4afd-9185-8c6dd234b59b','role','authenticated')::text, true);
DO $$
DECLARE r jsonb;
BEGIN
  r := seguros_generar_factura_manual('2b0af82d-6255-4f7f-9540-1559705536b6'::uuid, '2026-09', 9, 2026, 4500, 0, 'B02', current_date, 'idem-gen-crossorg');
  INSERT INTO test_results(step, ok, detail) VALUES ('I_cross_org_rechazado', false, 'NO LANZÓ EXCEPCIÓN: '||r::text);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO test_results(step, ok, detail) VALUES ('I_cross_org_rechazado', (SQLERRM LIKE '%organización de seguros%'), SQLERRM);
END $$;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
DO $$
DECLARE r jsonb;
BEGIN
  r := seguros_generar_factura_manual('2b0af82d-6255-4f7f-9540-1559705536b6'::uuid, '2026-09', 9, 2026, 4500, 0, 'B02', current_date, 'idem-gen-anon');
  INSERT INTO test_results(step, ok, detail) VALUES ('J_anon_rechazado', false, 'NO LANZÓ EXCEPCIÓN: '||r::text);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO test_results(step, ok, detail) VALUES ('J_anon_rechazado', (SQLSTATE='42501'), 'SQLSTATE='||SQLSTATE||' '||SQLERRM);
END $$;

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', '{}', true);
DO $$
DECLARE r jsonb;
BEGIN
  r := seguros_generar_factura_manual('2b0af82d-6255-4f7f-9540-1559705536b6'::uuid, '2026-09', 9, 2026, 4500, 0, 'B02', current_date, 'idem-gen-svcbare');
  INSERT INTO test_results(step, ok, detail) VALUES ('K_service_role_bare_rechazado', false, 'NO LANZÓ EXCEPCIÓN: '||r::text);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO test_results(step, ok, detail) VALUES ('K_service_role_bare_rechazado', (SQLERRM LIKE '%rol admin%'), SQLERRM);
END $$;

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', json_build_object('sub','35319647-f721-40b2-a01d-c3ccb1642649','role','authenticated')::text, true);
DO $$
DECLARE r jsonb;
BEGIN
  r := seguros_generar_factura_manual('2b0af82d-6255-4f7f-9540-1559705536b6'::uuid, '2026-09', 9, 2026, 4500, 0, 'B02', current_date, 'idem-gen-svcimpersonate');
  INSERT INTO test_results(step, ok, detail) VALUES ('L_service_role_impersonando_admin_ok', ((r->>'ok')='true'), r::text);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO test_results(step, ok, detail) VALUES ('L_service_role_impersonando_admin_ok', false, SQLERRM);
END $$;

-- ═══════════════════════ ANULACIÓN ═══════════════════════

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','35319647-f721-40b2-a01d-c3ccb1642649','role','authenticated')::text, true);

DO $$
DECLARE r jsonb;
BEGIN
  r := seguros_anular_factura('aaaaaaaa-2222-2222-2222-222222222222'::uuid, 'Prueba 3B: anulación con resync', 'idem-anul-resync-001');
  INSERT INTO test_results(step, ok, detail) VALUES ('M_anular_ok', ((r->>'ok')='true'), r::text);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO test_results(step, ok, detail) VALUES ('M_anular_ok', false, SQLERRM);
END $$;

INSERT INTO test_results(step, ok, detail)
SELECT 'M2_estado_f2_anulada', (estado='Anulada'), estado FROM facturas WHERE id='aaaaaaaa-2222-2222-2222-222222222222';
INSERT INTO test_results(step, ok, detail)
SELECT 'M3_estado_f1_sigue_pagado', (estado='Pagado'), estado FROM facturas WHERE id='aaaaaaaa-1111-1111-1111-111111111111';
INSERT INTO test_results(step, ok, detail)
SELECT 'M4_estado_f3_ahora_parcial', (estado='Parcial'), estado FROM facturas WHERE id='aaaaaaaa-3333-3333-3333-333333333333';
INSERT INTO test_results(step, ok, detail)
SELECT 'M5_deuda_total_reducida', (deuda_total=6000 AND pagado=5000), 'deuda_total='||deuda_total||' pagado='||pagado
FROM clientes WHERE id='11111111-1111-1111-1111-111111111111';
INSERT INTO test_results(step, ok, detail)
SELECT 'M6_asiento_reversa_creado', (count(*)=1), 'count='||count(*)
FROM asientos WHERE tipo_origen='reversa_factura' AND origen_id='aaaaaaaa-2222-2222-2222-222222222222';

DO $$
DECLARE r jsonb;
BEGIN
  r := seguros_anular_factura('aaaaaaaa-2222-2222-2222-222222222222'::uuid, 'Prueba 3B: anulación con resync', 'idem-anul-resync-001');
  INSERT INTO test_results(step, ok, detail) VALUES ('N_idempotent_retry', ((r->>'reintento')='true'), r::text);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO test_results(step, ok, detail) VALUES ('N_idempotent_retry', false, SQLERRM);
END $$;

INSERT INTO test_results(step, ok, detail)
SELECT 'N2_no_duplico_asiento', (count(*)=1), 'count='||count(*)
FROM asientos WHERE tipo_origen='reversa_factura' AND origen_id='aaaaaaaa-2222-2222-2222-222222222222';

DO $$
DECLARE r jsonb;
BEGIN
  r := seguros_anular_factura('aaaaaaaa-2222-2222-2222-222222222222'::uuid, 'Segundo intento, otra clave', 'idem-anul-resync-002-DIFERENTE');
  INSERT INTO test_results(step, ok, detail) VALUES ('O_reintento_sin_key_compartida', ((r->>'reintento')='true'), r::text);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO test_results(step, ok, detail) VALUES ('O_reintento_sin_key_compartida', false, SQLERRM);
END $$;

INSERT INTO test_results(step, ok, detail)
SELECT 'O2_todavia_un_solo_asiento', (count(*)=1), 'count='||count(*)
FROM asientos WHERE tipo_origen='reversa_factura' AND origen_id='aaaaaaaa-2222-2222-2222-222222222222';
INSERT INTO test_results(step, ok, detail)
SELECT 'O3_deuda_total_no_doble_deduccion', (deuda_total=6000), 'deuda_total='||deuda_total
FROM clientes WHERE id='11111111-1111-1111-1111-111111111111';

DO $$
DECLARE r jsonb;
BEGIN
  r := seguros_anular_factura('aaaaaaaa-1111-1111-1111-111111111111'::uuid, 'Intento indebido sobre pagada', 'idem-anul-pagada');
  INSERT INTO test_results(step, ok, detail) VALUES ('P_pagada_rechazada', false, 'NO LANZÓ EXCEPCIÓN: '||r::text);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO test_results(step, ok, detail) VALUES ('P_pagada_rechazada', (SQLERRM LIKE '%no se puede anular%'), SQLERRM);
END $$;

DO $$
DECLARE r jsonb;
BEGIN
  r := seguros_anular_factura('99999999-9999-9999-9999-999999999999'::uuid, 'motivo', 'idem-anul-notfound');
  INSERT INTO test_results(step, ok, detail) VALUES ('Q_no_encontrada', false, 'NO LANZÓ EXCEPCIÓN: '||r::text);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO test_results(step, ok, detail) VALUES ('Q_no_encontrada', (SQLERRM LIKE '%no encontrada%'), SQLERRM);
END $$;

DO $$
DECLARE r jsonb;
BEGIN
  r := seguros_anular_factura('aaaaaaaa-3333-3333-3333-333333333333'::uuid, '   ', 'idem-anul-sinmotivo');
  INSERT INTO test_results(step, ok, detail) VALUES ('R_motivo_vacio_rechazado', false, 'NO LANZÓ EXCEPCIÓN: '||r::text);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO test_results(step, ok, detail) VALUES ('R_motivo_vacio_rechazado', (SQLERRM LIKE '%motivo%'), SQLERRM);
END $$;

-- S2 reemplaza al S original: se corre sobre el cliente/factura FRESCOS
-- (55555555.../66666666...) declarados en [3], nunca tocados por el resync
-- de M, para probar de verdad la rama sin asiento (prima=0) sin que un
-- resync AJENO haya cambiado el estado de la factura antes de tiempo.
DO $$
DECLARE r jsonb;
BEGIN
  r := seguros_anular_factura('66666666-6666-6666-6666-666666666666'::uuid, 'Factura en 0, sin efecto contable', 'idem-anul-cero-fresco');
  INSERT INTO test_results(step, ok, detail) VALUES ('S2_cero_prima_ok', ((r->>'ok')='true' AND (r->>'asiento_reversa_id') IS NULL), r::text);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO test_results(step, ok, detail) VALUES ('S2_cero_prima_ok', false, SQLERRM);
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','9758c18f-22eb-4d5b-b99a-2fc4b9791f2c','role','authenticated')::text, true);
DO $$
DECLARE r jsonb;
BEGIN
  r := seguros_anular_factura('aaaaaaaa-3333-3333-3333-333333333333'::uuid, 'motivo', 'idem-anul-agente');
  INSERT INTO test_results(step, ok, detail) VALUES ('T_agente_rechazado_anular', false, 'NO LANZÓ EXCEPCIÓN: '||r::text);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO test_results(step, ok, detail) VALUES ('T_agente_rechazado_anular', (SQLERRM LIKE '%rol admin%'), SQLERRM);
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','f56c1315-d29c-4afd-9185-8c6dd234b59b','role','authenticated')::text, true);
DO $$
DECLARE r jsonb;
BEGIN
  r := seguros_anular_factura('aaaaaaaa-3333-3333-3333-333333333333'::uuid, 'motivo', 'idem-anul-crossorg');
  INSERT INTO test_results(step, ok, detail) VALUES ('U_crossorg_rechazado_anular', false, 'NO LANZÓ EXCEPCIÓN: '||r::text);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO test_results(step, ok, detail) VALUES ('U_crossorg_rechazado_anular', (SQLERRM LIKE '%organización de seguros%'), SQLERRM);
END $$;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
DO $$
DECLARE r jsonb;
BEGIN
  r := seguros_anular_factura('aaaaaaaa-3333-3333-3333-333333333333'::uuid, 'motivo', 'idem-anul-anon');
  INSERT INTO test_results(step, ok, detail) VALUES ('V_anon_rechazado_anular', false, 'NO LANZÓ EXCEPCIÓN: '||r::text);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO test_results(step, ok, detail) VALUES ('V_anon_rechazado_anular', (SQLSTATE='42501'), 'SQLSTATE='||SQLSTATE||' '||SQLERRM);
END $$;

-- W3-W6: verificación de auditoría — se vuelve a un rol con visibilidad real
-- ANTES de leer (el V anterior deja el rol en 'anon', que correctamente NO
-- ve auditoria por RLS — leer con ese rol activo daría un falso 0, no un
-- fallo real de la RPC). W4/W6 confirman que el reintento idempotente (B/N)
-- NO duplicó la fila de auditoría de la escritura original (A/M).
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','35319647-f721-40b2-a01d-c3ccb1642649','role','authenticated')::text, true);

INSERT INTO test_results(step, ok, detail)
SELECT 'W3_auditoria_generacion_visible', (count(*)>=1), 'count='||count(*)
FROM auditoria WHERE accion='FACTURA_MANUAL_GENERADA' AND entity_table='facturas';

INSERT INTO test_results(step, ok, detail)
SELECT 'W4_no_duplico_auditoria_generacion', (count(*)=1), 'count='||count(*)
FROM auditoria a JOIN facturas f ON f.id::text = a.entity_id
WHERE a.accion='FACTURA_MANUAL_GENERADA' AND f.cliente_id='2b0af82d-6255-4f7f-9540-1559705536b6' AND f.periodo='2026-08';

INSERT INTO test_results(step, ok, detail)
SELECT 'W5_auditoria_anulacion_visible', (count(*)>=1), 'count='||count(*)
FROM auditoria WHERE accion='FACTURA_ANULADA' AND entity_table='facturas';

INSERT INTO test_results(step, ok, detail)
SELECT 'W6_no_duplico_auditoria_anulacion', (count(*)=1), 'count='||count(*)
FROM auditoria WHERE accion='FACTURA_ANULADA' AND entity_id='aaaaaaaa-2222-2222-2222-222222222222';

-- ── Resumen final ─────────────────────────────────────────────────────────
SELECT
  count(*) AS total,
  count(*) FILTER (WHERE ok) AS pasaron,
  count(*) FILTER (WHERE NOT ok) AS fallaron
FROM test_results;

SELECT n, step, ok, detail FROM test_results ORDER BY n;

ROLLBACK;
