-- ═══════════════════════════════════════════════════════════════════════════
-- BLOQUE 2C-2 — RESPUESTA FINAL A LOS BLOQUEANTES DE CHATGPT (2026-08-18-2224)
-- ═══════════════════════════════════════════════════════════════════════════
-- ESTE ARCHIVO ES SOLO CANDIDATO. NO SE APLICÓ A PRODUCCIÓN.
-- Probado exclusivamente en el branch desechable de Supabase "2c2-revision-final"
-- (project_ref auyrounlwmfbwqnnfuqc, creado y luego BORRADO en esta misma ronda),
-- por el nuevo mandato de gobernanza (Sección 0 del documento de ChatGPT):
-- ningún DDL/policy/function candidato de esta ronda se probó contra producción,
-- ni siquiera envuelto en BEGIN...ROLLBACK.
--
-- Corresponde EXACTAMENTE a los 3 pasos del cutover A→B→C descrito en la
-- bitácora que acompaña este archivo. Este .sql contiene el contenido completo
-- de la Etapa A (RPC + ACL) y de la Etapa C (RLS). La Etapa B es SOLO frontend
-- (index.html) — ver el diff en la bitácora, no hay SQL para esa etapa.

-- ───────────────────────────────────────────────────────────────────────────
-- ETAPA A — Infraestructura nueva, coexiste con los escritores directos viejos
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.seguros_siguiente_numero_poliza()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_rol text;
  v_actual int;
  v_nuevo int;
  v_numero text;
BEGIN
  v_rol := public.mi_rol();
  IF v_rol IS NULL THEN
    RAISE EXCEPTION 'No autorizado: se requiere sesión activa para generar un número de póliza';
  END IF;
  IF public.mi_organizacion() IS DISTINCT FROM (SELECT id FROM public.organizaciones WHERE slug='nexus-pro') THEN
    RAISE EXCEPTION 'No autorizado: este módulo es exclusivo de la organización de seguros';
  END IF;

  -- Candado compartido con seguros_resetear_seq_poliza() — MISMO namespace en
  -- las dos funciones. Serializa generador↔generador (C1), generador↔reset (C2),
  -- y evita la carrera de inicialización si la fila aún no existe (C3): quien
  -- toma el candado primero corre entera su transacción (INSERT...ON CONFLICT
  -- DO NOTHING + SELECT...FOR UPDATE + UPDATE) antes de que el siguiente pueda
  -- ni siquiera empezar a leer.
  PERFORM pg_advisory_xact_lock(hashtext('seguros:seq_poliza'));

  INSERT INTO public.configuracion(clave, valor, actualizado)
  VALUES ('seq_poliza', '0', now())
  ON CONFLICT (clave) DO NOTHING;

  SELECT valor::int INTO v_actual FROM public.configuracion WHERE clave='seq_poliza' FOR UPDATE;
  v_nuevo := coalesce(v_actual, 0) + 1;

  IF v_nuevo > 999999 THEN
    RAISE EXCEPTION 'Se alcanzó el límite de 6 dígitos para el número de póliza (999999). Contacta al administrador.';
  END IF;

  UPDATE public.configuracion SET valor = v_nuevo::text, actualizado = now() WHERE clave='seq_poliza';

  v_numero := 'POL-' || to_char(now(), 'YYYY') || '-' || lpad(v_nuevo::text, 6, '0');

  RETURN jsonb_build_object('ok', true, 'valor', v_nuevo, 'numero', v_numero);
END;
$function$;

CREATE OR REPLACE FUNCTION public.seguros_resetear_seq_poliza(p_proximo_numero int, p_forzar boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_rol text;
  v_actual int;
  v_valor_interno int;
  v_max_usado int;
BEGIN
  v_rol := public.mi_rol();
  IF v_rol IS NULL OR v_rol <> 'admin' THEN
    RAISE EXCEPTION 'No autorizado: reiniciar la numeración de pólizas requiere rol admin';
  END IF;
  IF public.mi_organizacion() IS DISTINCT FROM (SELECT id FROM public.organizaciones WHERE slug='nexus-pro') THEN
    RAISE EXCEPTION 'No autorizado: este módulo es exclusivo de la organización de seguros';
  END IF;

  IF p_proximo_numero IS NULL OR p_proximo_numero < 1 OR p_proximo_numero > 999999 THEN
    RAISE EXCEPTION 'El próximo número debe estar entre 1 y 999999 (6 dígitos)';
  END IF;

  -- Mismo candado/namespace que el generador — ver comentario arriba.
  PERFORM pg_advisory_xact_lock(hashtext('seguros:seq_poliza'));

  INSERT INTO public.configuracion(clave, valor, actualizado)
  VALUES ('seq_poliza', '0', now())
  ON CONFLICT (clave) DO NOTHING;

  SELECT valor::int INTO v_actual FROM public.configuracion WHERE clave='seq_poliza' FOR UPDATE;

  -- Salvaguarda por defecto: no dejar que el próximo número quede por DEBAJO
  -- (o igual) del máximo numero_poliza ya emitido — evitaría que un reinicio
  -- mal calculado empiece a repetir números que ya existen en clientes.
  -- p_forzar=true la salta a propósito (caso: el admin sabe lo que hace).
  IF NOT p_forzar THEN
    SELECT max(substring(numero_poliza from '(\d+)$')::int) INTO v_max_usado
    FROM public.clientes
    WHERE numero_poliza ~ '\d+$';
    IF v_max_usado IS NOT NULL AND p_proximo_numero <= v_max_usado THEN
      RAISE EXCEPTION 'El próximo número (%) no puede ser menor o igual al máximo ya emitido (%). Usa p_forzar=true si de verdad quieres hacerlo.', p_proximo_numero, v_max_usado;
    END IF;
  END IF;

  v_valor_interno := p_proximo_numero - 1;

  UPDATE public.configuracion SET valor = v_valor_interno::text, actualizado = now() WHERE clave='seq_poliza';

  INSERT INTO public.auditoria(ts, usuario, rol, accion, detalle, modulo, entity_table, entity_id, old_data, new_data, result, origen, organizacion_id)
  VALUES (
    now()::text, public.mi_usuario_id()::text, v_rol, 'SEQ_POLIZA_RESETEADO',
    'Contador reiniciado: valor interno ' || coalesce(v_actual,0) || ' → ' || v_valor_interno
      || ' (próximo número a generar: ' || p_proximo_numero || ')'
      || CASE WHEN p_forzar THEN ' · FORZADO (sin validar contra el máximo emitido)' ELSE '' END,
    'Configuración', 'configuracion', 'seq_poliza',
    jsonb_build_object('valor', coalesce(v_actual,0))::text,
    jsonb_build_object('valor', v_valor_interno, 'proximo_numero', p_proximo_numero, 'forzado', p_forzar)::text,
    'OK', 'seguros_resetear_seq_poliza', public.mi_organizacion()
  );

  RETURN jsonb_build_object('ok', true, 'valor_interno', v_valor_interno, 'proximo_numero', p_proximo_numero);
END;
$function$;

-- ACL — incluye service_role explícitamente (mandato de la Sección 5).
-- REVOKE FROM PUBLIC solo no basta (Supabase otorga EXECUTE a `anon` por
-- default-privilege a nivel de proyecto, independiente de PUBLIC — hay que
-- revocarlo de anon EXPLÍCITO, y de service_role también aunque casi nunca
-- lo necesite, para que quede negado por defecto y no por omisión).
REVOKE ALL ON FUNCTION public.seguros_siguiente_numero_poliza() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.seguros_siguiente_numero_poliza() TO authenticated;

REVOKE ALL ON FUNCTION public.seguros_resetear_seq_poliza(int, boolean) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.seguros_resetear_seq_poliza(int, boolean) TO authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- ETAPA C — Cierre de RLS (aplicar SOLO después de confirmar que la Etapa B
-- ya está desplegada en producción y que index.html publicado ya no hace
-- NINGÚN escritor directo de seq_poliza — ver checklist de verificación en
-- la bitácora antes de ejecutar esto).
-- ───────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS configuracion_insert ON public.configuracion;
CREATE POLICY configuracion_insert ON public.configuracion
  FOR INSERT TO authenticated
  WITH CHECK (
    mi_rol() IS NOT NULL
    AND mi_organizacion() = (SELECT id FROM organizaciones WHERE slug = 'nexus-pro')
    AND (clave <> 'roles_perms' OR mi_rol() = 'admin')
    AND clave <> 'seq_poliza'
  );

DROP POLICY IF EXISTS configuracion_update ON public.configuracion;
CREATE POLICY configuracion_update ON public.configuracion
  FOR UPDATE TO authenticated
  USING (
    mi_rol() IS NOT NULL
    AND mi_organizacion() = (SELECT id FROM organizaciones WHERE slug = 'nexus-pro')
    AND (clave <> 'roles_perms' OR mi_rol() = 'admin')
    AND clave <> 'seq_poliza'
  )
  WITH CHECK (
    mi_rol() IS NOT NULL
    AND mi_organizacion() = (SELECT id FROM organizaciones WHERE slug = 'nexus-pro')
    AND (clave <> 'roles_perms' OR mi_rol() = 'admin')
    AND clave <> 'seq_poliza'
  );

DROP POLICY IF EXISTS configuracion_delete ON public.configuracion;
CREATE POLICY configuracion_delete ON public.configuracion
  FOR DELETE TO authenticated
  USING (
    mi_rol() IS NOT NULL
    AND mi_organizacion() = (SELECT id FROM organizaciones WHERE slug = 'nexus-pro')
    AND (clave <> 'roles_perms' OR mi_rol() = 'admin')
    AND clave <> 'seq_poliza'
  );

-- configuracion_select: SIN CAMBIOS (queda exactamente igual que en 2C-1).
-- Leer el valor de seq_poliza directo no es una exposición de seguridad (es un
-- entero), y varios lugares del frontend (refrescarContadorNum) siguen
-- leyéndolo directo incluso después del cutover — no hay ninguna razón para
-- cerrar la lectura, solo la ESCRITURA fuera de la RPC.

-- ───────────────────────────────────────────────────────────────────────────
-- ROLLBACK (por etapa, ver detalle completo en la bitácora)
-- ───────────────────────────────────────────────────────────────────────────
-- Etapa C: volver a crear las 3 policies SIN el AND clave <> 'seq_poliza'
--   (o sea, exactamente el texto de 2C-1 ya en producción — se conserva ahí
--   mismo como referencia byte-a-byte, no hace falta guardarlo aparte).
-- Etapa A: DROP FUNCTION public.seguros_siguiente_numero_poliza();
--          DROP FUNCTION public.seguros_resetear_seq_poliza(int, boolean);
--   (seguro en cualquier momento antes de la Etapa C — nada depende de que
--   existan si el frontend nunca las llamó).
