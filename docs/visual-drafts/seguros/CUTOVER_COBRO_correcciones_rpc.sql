-- ══════════════════════════════════════════════════════════════════════════
-- SEGUROS · CUTOVER DEL COBRO FINANCIERO — Correcciones SQL PROPUESTAS
-- ══════════════════════════════════════════════════════════════════════════
-- NO EJECUTADO CONTRA PRODUCCIÓN. Este archivo es SOLO DISEÑO — vive en el
-- repo para revisión de ChatGPT/el dueño antes de que alguien decida
-- aplicarlo con `apply_migration` (o `execute_sql` real, sin ROLLBACK).
--
-- v2 (docs/bitacora/2026-08-11-0618-chatgpt.md): se agregó la corrección #4
-- (lock de idempotencia) a lo que ya estaba aprobado desde
-- docs/bitacora/2026-08-10-2321-chatgpt.md (puntos 5, 6, 7). Las 3 primeras
-- NO cambiaron de contenido en esta v2 — solo se renumeraron.
--
-- Corrige exactamente 4 cosas, ninguna más:
--   1. seguros_reversar_cobro: reversa pasa a ser ADMIN-ONLY (se quita 'gerente',
--      que no existe en el vocabulario de roles de Seguros — ver CLAUDE.md,
--      ROLES_PERMS = admin/supervisor/cajero/cobros/agente).
--   2. seguros_registrar_cobro: la referencia del asiento cuando el cliente
--      no tiene numero_poliza pasa de 'AST-COB-' (bug, string vacío) a
--      'AST-COB-0000' (igual que el frontend viejo, que usaba `||'0000'`
--      sobre un valor JS falsy — el bug es que `coalesce()` de SQL NO trata
--      '' como NULL, así que `right('',4)` devuelve '' y coalesce('','0000')
--      devuelve '' otra vez, no '0000'). Se corrige con `nullif(...,'')`.
--      Verificado con un SELECT de solo lectura, sin tocar la función real,
--      ver docs/bitacora/2026-08-11-0012-claude.md para la evidencia exacta.
--   3. Ambas funciones-trigger (seguros_bloquear_ast_baja,
--      seguros_bloquear_delete_abono) ganan `SET search_path TO 'public',
--      'pg_temp'` — cierra el WARN `function_search_path_mutable` de
--      get_advisors, CERO cambio de comportamiento (mismo cuerpo exacto).
--   4. NUEVO en v2 — seguros_registrar_cobro gana un
--      `pg_advisory_xact_lock(hashtextextended(p_idempotency_key,0))` justo
--      después de validar que la clave no sea NULL/vacía, ANTES del SELECT
--      idempotente y de tocar clientes. Ver el detalle completo (por qué,
--      qué garantiza, qué NO cambia) en el bloque #2 más abajo y en
--      HALLAZGO_ADICIONAL_idempotency_key_sin_unique.sql (marcado RESUELTO).
--      Verificado en vivo que `hashtextextended(text,int)` existe y devuelve
--      bigint en este proyecto (PostgreSQL 17.6) — no hace falta ningún cast.
--
-- Deliberadamente NO se toca en este archivo (fuera de alcance, per las
-- restricciones duras de ChatGPT en esa misma entrada):
--   - Las FK NOT VALID (facturas.cliente_id, abonos.cliente_id) — quedan
--     igual, no se validan.
--   - El 1 abono huérfano ni las 3 facturas huérfanas — no se reparan.
--   - RLS de clientes/facturas/abonos/asientos/agentes — no se toca.
--   - Los 2 índices UNIQUE parciales que YA EXISTEN en producción
--     (abonos_idempotency_key_uq, abonos_reversa_idempotency_key_uq,
--     verificados por ChatGPT vía pg_indexes y reconfirmados aquí — ver
--     HALLAZGO_ADICIONAL_idempotency_key_sin_unique.sql) — se quedan tal
--     cual, como segunda barrera. NO se crea ningún índice nuevo.
--   - Ningún otro comportamiento de las 2 RPC (FOR UPDATE, validaciones de
--     monto/método/agente/banco/destino, todo eso ya estaba bien y se deja
--     intacto).
--
-- Orden de aplicación cuando se autorice: los 4 CREATE OR REPLACE de abajo
-- (reversar_cobro, registrar_cobro —con las correcciones A y B juntas, mismo
-- cuerpo, un solo statement—, y los 2 triggers) son independientes entre sí,
-- se pueden aplicar juntos o por separado, en cualquier orden, sin migración
-- de datos asociada (no hay columna nueva, no hay backfill).
-- ══════════════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────────────
-- 1) seguros_reversar_cobro — reversa ADMIN-ONLY (se quita 'gerente')
-- ────────────────────────────────────────────────────────────────────────
-- ANTES:
--   IF v_rol IS NULL OR v_rol NOT IN ('admin','gerente') THEN
--     RAISE EXCEPTION 'No autorizado: la reversa requiere admin/gerente';
--   END IF;
-- DESPUÉS (único cambio: el chequeo de rol y el texto del mensaje):
CREATE OR REPLACE FUNCTION public.seguros_reversar_cobro(p_abono_id uuid, p_motivo text, p_idempotency_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_rol text;
  v_abono public.abonos%ROWTYPE;
  v_cli public.clientes%ROWTYPE;
  v_asiento_id uuid;
  v_cuenta_cr_cod text;
  v_cuenta_cr_nom text;
  v_nuevo_pagado numeric;
  v_nueva_deuda_anterior numeric;
BEGIN
  v_rol := public.mi_rol();
  IF v_rol IS NULL OR v_rol <> 'admin' THEN
    RAISE EXCEPTION 'No autorizado: la reversa de un cobro requiere rol admin';
  END IF;

  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key)='' THEN
    RAISE EXCEPTION 'idempotency_key es obligatorio';
  END IF;
  IF p_motivo IS NULL OR btrim(p_motivo)='' THEN
    RAISE EXCEPTION 'Motivo de reversa obligatorio';
  END IF;

  SELECT * INTO v_abono
  FROM public.abonos
  WHERE id=p_abono_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cobro no encontrado';
  END IF;

  IF v_abono.estado='Reversado' THEN
    IF v_abono.reversa_idempotency_key=p_idempotency_key THEN
      RETURN jsonb_build_object('ok',true,'reintento',true,'abono_id',v_abono.id,'estado','Reversado');
    END IF;
    RAISE EXCEPTION 'Este cobro ya fue reversado';
  END IF;

  SELECT * INTO v_cli
  FROM public.clientes
  WHERE id=v_abono.cliente_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente del cobro no encontrado';
  END IF;

  IF coalesce(v_abono.tipo,'')='deuda_anterior' THEN
    v_nueva_deuda_anterior := coalesce(v_cli.deuda_anterior,0)+coalesce(v_abono.monto,0);
    UPDATE public.clientes
      SET deuda_anterior=v_nueva_deuda_anterior
      WHERE id=v_cli.id;
    v_nuevo_pagado := coalesce(v_cli.pagado,0);
  ELSE
    v_nuevo_pagado := coalesce(v_cli.pagado,0)-coalesce(v_abono.monto,0);
    IF v_nuevo_pagado < -0.01 THEN
      RAISE EXCEPTION 'Reversa inválida: pagado del cliente quedaría negativo';
    END IF;
    v_nuevo_pagado := greatest(v_nuevo_pagado,0);
    UPDATE public.clientes
      SET pagado=v_nuevo_pagado
      WHERE id=v_cli.id;
    v_nueva_deuda_anterior := coalesce(v_cli.deuda_anterior,0);
  END IF;

  IF v_abono.metodo='Cheque' THEN
    v_cuenta_cr_cod:='1102'; v_cuenta_cr_nom:='Cheques en tránsito';
  ELSIF v_abono.metodo IN ('Transferencia','Depósito') THEN
    v_cuenta_cr_cod:='1103'; v_cuenta_cr_nom:='Depósitos bancarios';
  ELSE
    v_cuenta_cr_cod:='1101'; v_cuenta_cr_nom:='Efectivo';
  END IF;

  INSERT INTO public.asientos(
    fecha,referencia,descripcion,
    cuenta_dr_cod,cuenta_dr_nom,monto_dr,
    cuenta_cr_cod,cuenta_cr_nom,monto_cr,
    cliente_id,abono_id,tipo_origen,origen_id,idempotency_key
  ) VALUES (
    now(),'AST-COB-REV',
    'Reversa cobro — '||coalesce(v_cli.nom,'')||' · Motivo: '||btrim(p_motivo),
    '1201','Cuentas por cobrar — Clientes',v_abono.monto,
    v_cuenta_cr_cod,v_cuenta_cr_nom,v_abono.monto,
    v_cli.id,v_abono.id,'reversa_cobro',v_abono.id,'asiento-reversa:'||p_idempotency_key
  ) RETURNING id INTO v_asiento_id;

  UPDATE public.abonos
  SET estado='Reversado',
      reversado_at=now(),
      reversado_por=public.mi_usuario_id()::text,
      motivo_reversa=btrim(p_motivo),
      reversa_idempotency_key=p_idempotency_key,
      updated_at=now(),
      updated_by_user_id=public.mi_usuario_id()::text
  WHERE id=v_abono.id;

  INSERT INTO public.auditoria(
    ts,usuario,rol,accion,detalle,modulo,entity_table,entity_id,old_data,new_data,result,origen,cliente_id
  ) VALUES (
    now()::text,public.mi_usuario_id()::text,v_rol,'COBRO_REVERSADO',
    'Reversa atómica de cobro · Motivo: '||btrim(p_motivo),'Cobros','abonos',v_abono.id::text,
    row_to_json(v_abono)::text,
    jsonb_build_object('estado','Reversado','asiento_reversa_id',v_asiento_id,'nuevo_pagado',v_nuevo_pagado,'nueva_deuda_anterior',v_nueva_deuda_anterior)::text,
    'OK','seguros_reversar_cobro',v_cli.id
  );

  RETURN jsonb_build_object(
    'ok',true,'reintento',false,'abono_id',v_abono.id,'estado','Reversado',
    'asiento_reversa_id',v_asiento_id,'nuevo_pagado',v_nuevo_pagado,
    'nueva_deuda_anterior',v_nueva_deuda_anterior
  );
END;
$function$;


-- ────────────────────────────────────────────────────────────────────────
-- 2) seguros_registrar_cobro — referencia 'AST-COB-0000' + LOCK de idempotencia
-- ────────────────────────────────────────────────────────────────────────
-- Cambio A (referencia cuando no hay póliza) — ANTES:
--   v_ref_asiento := 'AST-COB-' || coalesce(right(replace(coalesce(v_cli.numero_poliza,''),'POL-',''),4),'0000');
-- DESPUÉS (único cambio: se agrega nullif(...,'') antes del coalesce):
--   v_ref_asiento := 'AST-COB-' || coalesce(nullif(right(replace(coalesce(v_cli.numero_poliza,''),'POL-',''),4),''),'0000');
--
-- Cambio B (NUEVO en v2) — lock transaccional por idempotency_key, ANTES del
-- SELECT idempotente y de tocar clientes:
--   PERFORM pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));
--
-- Por qué hace falta pese a que el UNIQUE parcial ya existe (verificado real,
-- ver HALLAZGO_ADICIONAL_idempotency_key_sin_unique.sql): sin el lock, dos
-- llamadas GENUINAMENTE simultáneas con la MISMA idempotency_key pueden pasar
-- el `SELECT ... WHERE idempotency_key=...` / `IF FOUND` de abajo al mismo
-- tiempo — un SELECT plano no toma ningún lock — y las dos siguen de largo a
-- intentar el INSERT. El UNIQUE evita el doble dinero (una de las dos
-- transacciones falla en el INSERT), pero la que pierde recibe un error
-- crudo de Postgres (`duplicate key value violates unique constraint`) en vez
-- de la respuesta idempotente limpia `{"ok":true,"reintento":true,...}` que
-- el resto del sistema espera de una idempotency key repetida.
--
-- `pg_advisory_xact_lock` serializa por el hash de la clave: la segunda
-- llamada con la MISMA key se queda esperando en esa línea hasta que la
-- primera transacción termine (COMMIT o ROLLBACK) — recién ahí sigue, y
-- entonces SÍ encuentra la fila ya insertada en el SELECT idempotente,
-- devolviendo `reintento:true` sin tocar dinero de nuevo. Dos llamadas con
-- claves DISTINTAS (aunque sean al mismo cliente) tienen hashes distintos,
-- así que NUNCA se bloquean entre sí — el `FOR UPDATE` sobre `clientes` más
-- abajo sigue siendo el que las serializa a ellas (ya existía, sin cambios).
-- El lock es de ALCANCE DE TRANSACCIÓN (`_xact_`, no `_lock` a secas) — se
-- libera solo, automáticamente, al terminar la función (éxito o error); no
-- hace falta ni se debe liberar a mano. El UNIQUE se queda como segunda
-- barrera (defensa en profundidad, cero costo).
CREATE OR REPLACE FUNCTION public.seguros_registrar_cobro(p_cliente_id uuid, p_monto numeric, p_metodo text, p_referencia text, p_agente_cobro text, p_banco text DEFAULT NULL::text, p_destino text DEFAULT 'facturas'::text, p_permitir_adelanto boolean DEFAULT false, p_idempotency_key text DEFAULT NULL::text, p_fecha timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_cli public.clientes%ROWTYPE;
  v_abono public.abonos%ROWTYPE;
  v_asiento_id uuid;
  v_pendiente numeric;
  v_nuevo_pagado numeric;
  v_nueva_deuda_anterior numeric;
  v_cuenta_dr_cod text;
  v_cuenta_dr_nom text;
  v_ref_asiento text;
  v_adelanto numeric := 0;
BEGIN
  IF public.mi_rol() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'idempotency_key es obligatorio';
  END IF;

  -- Lock transaccional por clave — ver la explicación completa arriba del
  -- CREATE OR REPLACE. Tiene que ir aquí: DESPUÉS de validar que la clave
  -- existe (no tiene sentido tomar un lock sobre NULL/''), pero ANTES de
  -- cualquier lectura/escritura real (el SELECT idempotente de abajo incluido).
  PERFORM pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));

  -- Respuesta idempotente: un reintento nunca vuelve a mover dinero.
  SELECT * INTO v_abono
  FROM public.abonos
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'reintento', true,
      'abono_id', v_abono.id,
      'cliente_id', v_abono.cliente_id,
      'monto', v_abono.monto
    );
  END IF;

  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'Monto inválido: debe ser mayor que 0';
  END IF;

  IF p_metodo NOT IN ('Efectivo','Transferencia','Depósito','Tarjeta','Cheque') THEN
    RAISE EXCEPTION 'Método de pago no permitido: %', p_metodo;
  END IF;

  IF p_referencia IS NULL OR btrim(p_referencia) = '' THEN
    RAISE EXCEPTION 'Referencia obligatoria';
  END IF;

  IF p_agente_cobro IS NULL OR btrim(p_agente_cobro) = '' THEN
    RAISE EXCEPTION 'Agente de cobro obligatorio';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.agentes a
    WHERE a.id::text = p_agente_cobro
      AND coalesce(a.activo,true) = true
  ) THEN
    RAISE EXCEPTION 'Agente de cobro inválido o inactivo';
  END IF;

  IF p_metodo IN ('Transferencia','Depósito')
     AND (p_banco IS NULL OR btrim(p_banco) = '') THEN
    RAISE EXCEPTION 'Banco obligatorio para transferencia/depósito';
  END IF;

  IF p_destino NOT IN ('facturas','deuda_anterior') THEN
    RAISE EXCEPTION 'Destino de pago inválido';
  END IF;

  SELECT * INTO v_cli
  FROM public.clientes
  WHERE id = p_cliente_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente no encontrado';
  END IF;

  IF p_destino = 'facturas' THEN
    v_pendiente := greatest(coalesce(v_cli.deuda_total,0) - coalesce(v_cli.pagado,0), 0);
    IF p_monto > v_pendiente + 0.01 AND NOT p_permitir_adelanto THEN
      RAISE EXCEPTION 'El monto (%) excede lo pendiente (%); requiere autorización de adelanto', p_monto, v_pendiente;
    END IF;
    v_adelanto := greatest(p_monto - v_pendiente, 0);
    v_nuevo_pagado := coalesce(v_cli.pagado,0) + p_monto;

    UPDATE public.clientes
    SET pagado = v_nuevo_pagado
    WHERE id = p_cliente_id;
  ELSE
    v_nueva_deuda_anterior := coalesce(v_cli.deuda_anterior,0) - p_monto;
    IF coalesce(v_cli.deuda_anterior,0) <= 0 THEN
      RAISE EXCEPTION 'El cliente no tiene deuda anterior';
    END IF;
    IF v_nueva_deuda_anterior < -0.01 THEN
      RAISE EXCEPTION 'El monto (%) excede la deuda anterior (%)', p_monto, coalesce(v_cli.deuda_anterior,0);
    END IF;
    v_nueva_deuda_anterior := greatest(v_nueva_deuda_anterior,0);

    UPDATE public.clientes
    SET deuda_anterior = v_nueva_deuda_anterior
    WHERE id = p_cliente_id;
  END IF;

  INSERT INTO public.abonos(
    cliente_id,monto,metodo,referencia,fecha,agente_cobro,banco,nota,tipo,
    created_by_user_id,idempotency_key
  ) VALUES (
    p_cliente_id,p_monto,p_metodo,btrim(p_referencia),p_fecha,p_agente_cobro,
    NULLIF(btrim(coalesce(p_banco,'')),''),
    CASE WHEN p_destino='deuda_anterior' THEN 'Pago a DEUDA ANTES DEL SISTEMA' ELSE NULL END,
    CASE WHEN p_destino='deuda_anterior' THEN 'deuda_anterior' ELSE NULL END,
    public.mi_usuario_id()::text,p_idempotency_key
  )
  RETURNING * INTO v_abono;

  IF p_metodo = 'Cheque' THEN
    v_cuenta_dr_cod := '1102'; v_cuenta_dr_nom := 'Cheques en tránsito';
  ELSIF p_metodo IN ('Transferencia','Depósito') THEN
    v_cuenta_dr_cod := '1103'; v_cuenta_dr_nom := 'Depósitos bancarios';
  ELSE
    v_cuenta_dr_cod := '1101'; v_cuenta_dr_nom := 'Efectivo';
  END IF;

  v_ref_asiento := 'AST-COB-' || coalesce(nullif(right(replace(coalesce(v_cli.numero_poliza,''),'POL-',''),4),''),'0000');

  INSERT INTO public.asientos(
    fecha,referencia,descripcion,
    cuenta_dr_cod,cuenta_dr_nom,monto_dr,
    cuenta_cr_cod,cuenta_cr_nom,monto_cr,
    cliente_id,abono_id,tipo_origen,origen_id,idempotency_key
  ) VALUES (
    p_fecha,v_ref_asiento,
    CASE WHEN p_destino='deuda_anterior'
      THEN 'Cobro deuda anterior '||p_metodo||' — '||coalesce(v_cli.nom,'')||' ['||coalesce(v_cli.numero_poliza,'—')||']'
      ELSE 'Cobro '||p_metodo||' — '||coalesce(v_cli.nom,'')||' ['||coalesce(v_cli.numero_poliza,'—')||'] Plan '||coalesce(v_cli.plan,'')
    END,
    v_cuenta_dr_cod,v_cuenta_dr_nom,p_monto,
    '1201','Cuentas por cobrar — Clientes',p_monto,
    p_cliente_id,v_abono.id,'cobro',v_abono.id,'asiento:'||p_idempotency_key
  )
  RETURNING id INTO v_asiento_id;

  RETURN jsonb_build_object(
    'ok', true,
    'reintento', false,
    'abono_id', v_abono.id,
    'asiento_id', v_asiento_id,
    'cliente_id', p_cliente_id,
    'destino', p_destino,
    'monto', p_monto,
    'nuevo_pagado', CASE WHEN p_destino='facturas' THEN v_nuevo_pagado ELSE coalesce(v_cli.pagado,0) END,
    'nueva_deuda_anterior', CASE WHEN p_destino='deuda_anterior' THEN v_nueva_deuda_anterior ELSE coalesce(v_cli.deuda_anterior,0) END,
    'adelanto', v_adelanto
  );
END;
$function$;


-- ────────────────────────────────────────────────────────────────────────
-- 3) Triggers — SET search_path (cierra el WARN de get_advisors)
-- ────────────────────────────────────────────────────────────────────────
-- Mismo cuerpo EXACTO que hoy en producción — el único cambio es agregar
-- `SET search_path TO 'public', 'pg_temp'` a la firma. Cero cambio de
-- comportamiento.
CREATE OR REPLACE FUNCTION public.seguros_bloquear_ast_baja()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.referencia = 'AST-BAJA' THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.seguros_bloquear_delete_abono()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RAISE EXCEPTION 'No se permite eliminar cobros. Use la reversa financiera autorizada.';
END;
$function$;


-- ══════════════════════════════════════════════════════════════════════════
-- FIN. Nada de esto quedó APLICADO en producción — verificado antes Y
-- después de la prueba (ver docs/bitacora/2026-08-11-*-claude.md para el
-- detalle completo). Cómo se probó la v2 (corrección A del punto 2 ya se
-- había probado en la ronda anterior con un SELECT de solo lectura sobre la
-- expresión; lo nuevo aquí es la corrección B, el lock):
--   1. Se intentó un BRANCH de Supabase (`cutover-cobro-lock-test`) para
--      probar ahí sin ningún riesgo — FALLÓ con status `MIGRATIONS_FAILED`
--      (muy probable drift de historial de migraciones en este proyecto,
--      largo y muy personalizado — no algo que se arregle dentro del
--      alcance de este cutover). El branch se BORRÓ de inmediato para
--      cortar el cobro por hora en cuanto se confirmó el fallo.
--   2. Se pivoteó a probar los 4 CREATE OR REPLACE de arriba (cuerpo
--      EXACTO, verbatim) dentro de una sola transacción
--      `BEGIN; ...; ROLLBACK;` contra el PROYECTO REAL — las 15 pruebas
--      (T1-T15, 20 aserciones) corrieron con datos descartables en un
--      namespace UUID nunca usado antes (`0000cb02...`). Al terminar el
--      ROLLBACK: 0 filas de ese namespace sobrevivieron en ninguna tabla, y
--      el hash md5(pg_get_functiondef(...)) de las 4 funciones quedó
--      IDÉNTICO al que tenían antes de empezar — confirmado explícitamente
--      con una consulta aparte después del ROLLBACK, no solo asumido.
--   3. Concurrencia GENUINA (2 sesiones de Postgres reales, al mismo
--      tiempo) NO se pudo probar desde este entorno — se confirmó con un
--      experimento aparte (2 llamadas de `pg_advisory_xact_lock` con
--      `pg_sleep`, cronometradas con `clock_timestamp()`) que incluso 2
--      llamadas a la herramienta de SQL dentro del mismo mensaje se
--      despachan EN SERIE, no en paralelo — la segunda no arranca hasta que
--      la primera termina por completo. El comportamiento del lock bajo
--      concurrencia real se respalda en la semántica ya documentada de
--      Postgres para `pg_advisory_xact_lock` (bloquea hasta que la
--      transacción tenedora hace COMMIT/ROLLBACK), no en una prueba
--      empírica de 2 sesiones simultáneas desde aquí. El script manual de
--      2 pestañas (CUTOVER_COBRO_concurrencia_manual.sql) sigue siendo el
--      único camino real para esa prueba — necesita una persona, o un
--      entorno con 2 conexiones de verdad.
-- ══════════════════════════════════════════════════════════════════════════
