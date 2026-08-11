-- ============================================================================
-- SUBFASE 2A — Hardening de RPC fiscales / multiempresa (Seguros)
-- ============================================================================
-- Alcance: docs/bitacora/2026-08-11-1205-chatgpt.md (commit f369a84)
-- Propuesta, NO aplicada en producción. Ver docs/bitacora/<fecha>-claude.md
-- para el análisis completo, la matriz de pruebas y el plan de rollback.
--
-- Mecanismo del guard interno (funciones 1-3 y 5):
--   - auth.role() lee el claim 'role' del JWT de la petición REST (GUC
--     request.jwt.claim.role, puesta por PostgREST tras verificar el JWT).
--     Es INDEPENDIENTE de si la función es SECURITY DEFINER/INVOKER — a
--     diferencia de current_user (que bajo DEFINER siempre es el dueño de
--     la función, postgres), auth.role() siempre refleja quién hizo la
--     petición real.
--   - session_user = 'postgres' identifica acceso directo vía superusuario
--     (Supabase Management API / SQL Editor / migraciones) — CONFIRMADO
--     empíricamente contra pg_stat_activity de este proyecto: TODAS las
--     conexiones PostgREST (anon/authenticated/service_role) llegan como
--     usename='authenticator' (nunca 'postgres'); usename='postgres' es
--     exclusivo de mgmt-api/pg_net. auth.role() es NULL en esas conexiones
--     directas (no hay JWT), por eso se necesitan las DOS condiciones.
--   - Documentación oficial de Supabase (auth.role()/RLS) confirma que las
--     peticiones autenticadas con la service_role key SIEMPRE se ejecutan
--     como el rol de Postgres `service_role` — nunca corren políticas RLS,
--     y aquí tampoco disparan el guard porque auth.role()='service_role'.
--
-- Rollback: cada bloque de abajo tiene su CREATE OR REPLACE con el cuerpo
-- ANTERIOR (capturado en vivo el 2026-08-11, ver el bloque comentado antes
-- de cada función). Para revertir: ejecutar los 5 bloques "ROLLBACK" al
-- final de este archivo (o restaurar desde pg_dump si se prefiere).
--
-- NOTA de metodología de prueba (importante para leer la entrega en
-- docs/bitacora/<fecha>-claude.md): la herramienta MCP execute_sql que se
-- usó para probar esto en un branch de Supabase se conecta SIEMPRE como
-- session_user='postgres' — el mismo tipo de conexión directa que la
-- cláusula `session_user <> 'postgres'` del guard está diseñada a eximir
-- (Management API/SQL Editor/migraciones). Por eso, probar el guard
-- COMPLETO (con esa cláusula incluida) desde esa herramienta arroja
-- siempre "permitido", sin importar el actor simulado — no es un bug del
-- guard, es que la herramienta de prueba ES el tipo de acceso que esa
-- cláusula exime a propósito. Para probar la parte del guard que sí importa
-- para tráfico real (auth.role() + mi_rol() + mi_organizacion()), se usaron
-- clones desechables de las 3 funciones SIN esa cláusula de exención,
-- ejercitados con la matriz completa de actores, y luego se borraron sin
-- dejar rastro — ver la entrega para el detalle y los resultados.
--
-- NOTA 2 — CORRECCIÓN IMPORTANTE sobre el ACL real (léase junto con la nota
-- de arriba): un primer intento de este archivo afirmó "el ACL real de
-- producción tenía anon=X" para siguiente_ncf/next_recibo/next_recibo_anio/
-- seguros_diagnostico_financiero, basado en lo que mostraba el branch de
-- prueba (creado con status MIGRATIONS_FAILED). Verificado DESPUÉS
-- directamente contra producción (pg_proc + has_function_privilege + un
-- intento real de anon -> siguiente_ncf, todo de solo lectura): production
-- YA tiene anon revocado para esas 4 funciones desde la migración tracked
-- `20260726000046_seguridad_secuencias_revocar_de_public` (26-jul-2026,
-- documentada en CLAUDE.md "AUDITORÍA DE SEGURIDAD — Ronda 1"). El branch de
-- prueba mostraba un estado MÁS VIEJO/VULNERABLE que el real porque su
-- replay de migraciones tracked falló a mitad de camino (de ahí el status
-- MIGRATIONS_FAILED) — se detectó también porque le faltaba por completo
-- `seguros_diagnostico_financiero` (creada recién el 2026-08-11), hubo que
-- recrearla a mano para poder probar. Los REVOKE de anon que se dejan abajo
-- para esas 4 funciones son, por tanto, NO-OP contra el estado real de
-- producción hoy — se conservan solo como defensa en profundidad explícita
-- (regla #4 de ChatGPT), no porque cierren un hueco de anon que siga
-- abierto. **El hueco real y vigente en producción HOY, confirmado con una
-- prueba directa (BEGIN...ROLLBACK, sin persistir nada) contra un admin
-- real de OTRA organización (bayolsale) usando el guard interno AÚN NO
-- aplicado, es el cross-org**: bayolsale_admin consumió
-- `siguiente_ncf('B02')` (devolvió B0200000610), `next_recibo_anio(2026)`
-- (devolvió 7) y leyó `seguros_diagnostico_financiero()` — los 3 sin ningún
-- guard interno hoy, exactamente el bypass multiempresa que ChatGPT pidió
-- cerrar en la regla #3. Eso SÍ lo cierra el guard interno de este archivo,
-- y quedó demostrado matemáticamente correcto contra la lógica real de
-- mi_rol()/mi_organizacion()/auth.role() (ver clones desechables, Nota 1) —
-- solo falta aplicarlo. `crear_factura_auto_tx` sigue siendo el ÚNICO caso
-- donde anon SÍ tiene EXECUTE abierto en producción hoy (confirmado con
-- has_function_privilege directo) — su REVOKE (función 4, abajo) es el
-- único de los 5 que cierra un hueco de anon genuinamente vigente hoy.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) siguiente_ncf(text) — consume el próximo NCF de un tipo (DGII)
-- ----------------------------------------------------------------------------
-- USO REAL confirmado (grep índex.html): generarNCF(tipo) es el único
-- llamador, invocado desde _genFacturasInterno() por DOS caminos visibles
-- SIN gate de rol: (a) Configuración → Automatización → "Generar facturas
-- del mes ahora" (sidebar oculto por CSS a no-admin, pero nav('config') no
-- bloquea), y (b) Facturas → botón "Generar" (index.html:1520,
-- onclick="genFacturas()"), SIN ningún gate — alcanzable por 'agente'
-- (ROLES_PERMS.agente incluye 'ver_facturas'). Por eso el guard permite
-- CUALQUIER rol de nexus-pro (no solo admin) — restringir a admin-only
-- rompería el botón "Generar" de Facturas que agente usa hoy sin problema.
CREATE OR REPLACE FUNCTION public.siguiente_ncf(p_tipo text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_num integer;
begin
  if auth.role() is distinct from 'service_role' and session_user <> 'postgres' then
    if mi_rol() is null or mi_organizacion() is distinct from (select id from public.organizaciones where slug = 'nexus-pro') then
      raise exception 'No autorizado: siguiente_ncf() es exclusiva de la organización nexus-pro' using errcode = '42501';
    end if;
  end if;

  if p_tipo is null or p_tipo = 'SIN' then return null; end if;
  update secuencias_ncf set ultimo_numero = coalesce(ultimo_numero,0) + 1
   where tipo = p_tipo
   returning ultimo_numero into v_num;
  if v_num is null then
    insert into secuencias_ncf(tipo, ultimo_numero) values (p_tipo, 1)
     on conflict (tipo) do update set ultimo_numero = secuencias_ncf.ultimo_numero + 1
     returning ultimo_numero into v_num;
  end if;
  return p_tipo || lpad(v_num::text, 8, '0');
end; $function$;

-- GRANT/REVOKE — verificado DIRECTO contra producción (no contra el branch,
-- que resultó tener un replay de migraciones incompleto — ver Nota 2 al
-- inicio del archivo): anon YA NO tiene EXECUTE aquí desde la migración
-- tracked `seguridad_secuencias_revocar_de_public` (26-jul-2026); probado
-- con un intento real (BEGIN...ROLLBACK) → "permission denied for function
-- siguiente_ncf". El REVOKE de abajo es por tanto un NO-OP contra el estado
-- real de hoy — se deja igual, explícito, por la regla #4 de ChatGPT y
-- porque no tiene costo (REVOKE sobre un privilegio ya ausente no falla).
REVOKE EXECUTE ON FUNCTION public.siguiente_ncf(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.siguiente_ncf(text) TO authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 2) next_recibo() — contador global de recibos (SIN año, legado)
-- ----------------------------------------------------------------------------
-- USO REAL confirmado: CERO llamadores en index.html/parches.js (grep
-- exhaustivo de 'rpc/next_recibo' con límite de palabra — next_recibo_anio
-- es el único realmente usado). Por "si el frontend no lo requiere, denegar"
-- se le aplica el MISMO guard que a next_recibo_anio (consistencia de
-- familia, permite recuperación futura desde una sesión real de nexus-pro
-- si algún día hace falta) en vez de revocar EXECUTE por completo — de
-- cualquier forma queda denegada a cross-org/anon, que es lo que importa.
CREATE OR REPLACE FUNCTION public.next_recibo()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.role() is distinct from 'service_role' and session_user <> 'postgres' then
    if mi_rol() is null or mi_organizacion() is distinct from (select id from public.organizaciones where slug = 'nexus-pro') then
      raise exception 'No autorizado: next_recibo() es exclusiva de la organización nexus-pro' using errcode = '42501';
    end if;
  end if;
  return nextval('public.recibo_seq')::int;
end; $function$;

-- GRANT/REVOKE — verificado vía ACL real (pg_proc) contra producción: anon
-- ya no aparece en el ACL de esta función tampoco (mismo REVOKE tracked del
-- 26-jul-2026, ver comentario de siguiente_ncf arriba). NO-OP hoy, se deja
-- explícito por consistencia de familia y por la regla #4 de ChatGPT.
REVOKE EXECUTE ON FUNCTION public.next_recibo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_recibo() TO authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 3) next_recibo_anio(int) — contador de recibos POR AÑO (el que sí se usa)
-- ----------------------------------------------------------------------------
-- USO REAL confirmado: llamado desde asignarNumeroRecibo() en parches.js
-- (línea ~15938), dentro del modal "Registrar abono" (#mAbono) — se
-- dispara CADA VEZ que cualquier usuario (admin O agente) registra un
-- cobro en Seguros. Es funcionalidad diaria de Robinson (agente real).
-- Mismo guard que siguiente_ncf: cualquier rol de nexus-pro, admin O agente.
CREATE OR REPLACE FUNCTION public.next_recibo_anio(p_anio integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_ultimo integer;
begin
  if auth.role() is distinct from 'service_role' and session_user <> 'postgres' then
    if mi_rol() is null or mi_organizacion() is distinct from (select id from public.organizaciones where slug = 'nexus-pro') then
      raise exception 'No autorizado: next_recibo_anio() es exclusiva de la organización nexus-pro' using errcode = '42501';
    end if;
  end if;

  insert into public.recibo_contador (anio, ultimo) values (p_anio, 1)
  on conflict (anio) do update set ultimo = public.recibo_contador.ultimo + 1
  returning ultimo into v_ultimo;
  return v_ultimo;
end; $function$;

-- GRANT/REVOKE — verificado igual: anon ya sin EXECUTE en producción hoy
-- (mismo REVOKE tracked del 26-jul-2026). NO-OP, se deja explícito.
REVOKE EXECUTE ON FUNCTION public.next_recibo_anio(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_recibo_anio(integer) TO authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 4) crear_factura_auto_tx(...) — inserta factura+asiento+NCF (cron only)
-- ----------------------------------------------------------------------------
-- USO REAL confirmado: CERO llamadores desde index.html/parches.js. El
-- ÚNICO llamador es la Edge Function auto-facturacion (verificado leyendo
-- su código fuente vía get_edge_function): usa
-- Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") para crear el cliente y hace
-- supabase.rpc("crear_factura_auto_tx", {...}) — o sea, TODA llamada
-- legítima llega autenticada como service_role. No necesita ningún guard
-- interno: basta con cerrar el GRANT excesivo (era anon+PUBLIC+authenticated
-- por accidente/copy-paste, el hallazgo ALTO #6 de la auditoría Fase 2). Se
-- deja el CUERPO de la función 100% intacto — cero riesgo sobre la lógica
-- transaccional de facturación (anti-duplicado + NCF + asiento).
--
-- ESTA ES la única de las 5 donde el REVOKE cierra un hueco REAL y VIGENTE
-- hoy en producción — verificado con has_function_privilege('anon', ...)
-- directo contra producción: true (anon SÍ puede ejecutarla ahora mismo).
-- Probado también en la práctica (BEGIN...ROLLBACK, sin persistir): un
-- intento real de anon/bayolsale_admin no llegó a crear ninguna factura
-- porque la RLS de `secuencias_ncf` (la función es SECURITY INVOKER, corre
-- con los privilegios/RLS del que llama) ya le niega la fila y la función
-- falla sola con "No existe secuencia NCF para tipo B02" — pero el EXECUTE
-- en sí seguía abierto, una superficie de ataque innecesaria que este
-- REVOKE cierra de raíz, sin depender de que la RLS de esa tabla nunca
-- cambie.
REVOKE EXECUTE ON FUNCTION public.crear_factura_auto_tx(
  uuid, text, text, uuid, text, integer, integer, numeric, numeric, numeric,
  numeric, text, date, numeric
) FROM PUBLIC, anon, authenticated;

-- Deja explícito lo que sí debe poder ejecutarla (postgres ya la tiene por
-- ser el dueño; service_role se re-afirma por claridad, no por necesidad).
GRANT EXECUTE ON FUNCTION public.crear_factura_auto_tx(
  uuid, text, text, uuid, text, integer, integer, numeric, numeric, numeric,
  numeric, text, date, numeric
) TO service_role;


-- ----------------------------------------------------------------------------
-- 5) seguros_diagnostico_financiero() — contadores de salud contable
-- ----------------------------------------------------------------------------
-- USO REAL confirmado: CERO llamadores en index.html/parches.js — solo se
-- ha invocado manualmente (yo, vía MCP execute_sql) durante Fase 1 y Fase 2
-- como diagnóstico. Regla explícita de ChatGPT (#5): "restringida a admin
-- de nexus-pro o service_role/postgres; no exponer contadores a otros
-- tenants" — a diferencia de las 3 de arriba, aquí SÍ se exige admin
-- específicamente, no cualquier rol.
CREATE OR REPLACE FUNCTION public.seguros_diagnostico_financiero()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_result jsonb;
begin
  if auth.role() is distinct from 'service_role' and session_user <> 'postgres' then
    if mi_rol() is distinct from 'admin' or mi_organizacion() is distinct from (select id from public.organizaciones where slug = 'nexus-pro') then
      raise exception 'No autorizado: seguros_diagnostico_financiero() es exclusiva de administradores de nexus-pro' using errcode = '42501';
    end if;
  end if;

  WITH facturado AS (
    SELECT cliente_id, coalesce(sum(coalesce(prima_base,0)+coalesce(prima_deps,0)),0) total
    FROM public.facturas
    WHERE estado IS DISTINCT FROM 'Anulada'
    GROUP BY cliente_id
  ),
  pagado_ledger AS (
    SELECT cliente_id, coalesce(sum(monto),0) total
    FROM public.abonos
    WHERE coalesce(tipo,'') <> 'deuda_anterior'
      AND coalesce(estado,'') <> 'Reversado'
    GROUP BY cliente_id
  ),
  metricas AS (
    SELECT
      (SELECT count(*) FROM public.clientes c
        LEFT JOIN facturado f ON f.cliente_id=c.id
        WHERE abs(coalesce(c.deuda_total,0)-coalesce(f.total,0))>0.01) deuda_descuadra,
      (SELECT count(*) FROM public.clientes c
        LEFT JOIN pagado_ledger p ON p.cliente_id=c.id
        WHERE abs(coalesce(c.pagado,0)-coalesce(p.total,0))>0.01) pagado_descuadra,
      (SELECT count(*) FROM public.asientos
        WHERE abs(coalesce(monto_dr,0)-coalesce(monto_cr,0))>0.01) asientos_desbalanceados,
      (SELECT count(*) FROM public.asientos
        WHERE coalesce(monto_dr,0)<=0 OR coalesce(monto_cr,0)<=0) asientos_no_positivos,
      (SELECT count(*) FROM public.asientos WHERE referencia='AST-BAJA') ast_baja,
      (SELECT count(*) FROM public.abonos a
        LEFT JOIN public.clientes c ON c.id=a.cliente_id
        WHERE c.id IS NULL) abonos_huerfanos,
      (SELECT count(*) FROM public.facturas f
        LEFT JOIN public.clientes c ON c.id=f.cliente_id
        WHERE c.id IS NULL) facturas_huerfanas,
      (SELECT count(*) FROM public.abonos
        WHERE coalesce(estado,'')<>'Reversado'
          AND (referencia IS NULL OR btrim(referencia)='')) cobros_sin_referencia,
      (SELECT count(*) FROM public.abonos
        WHERE coalesce(estado,'')<>'Reversado'
          AND metodo IN ('Transferencia','Depósito')
          AND (banco IS NULL OR btrim(banco)='')) cobros_transfer_sin_banco,
      (SELECT count(*) FROM public.abonos
        WHERE coalesce(estado,'')<>'Reversado'
          AND (agente_cobro IS NULL OR btrim(agente_cobro)='')) cobros_sin_agente
  )
  SELECT jsonb_build_object(
    'ok', (deuda_descuadra=0 AND pagado_descuadra=0 AND asientos_desbalanceados=0 AND asientos_no_positivos=0 AND ast_baja=0),
    'deuda_descuadra',deuda_descuadra,
    'pagado_descuadra',pagado_descuadra,
    'asientos_desbalanceados',asientos_desbalanceados,
    'asientos_no_positivos',asientos_no_positivos,
    'ast_baja',ast_baja,
    'abonos_huerfanos',abonos_huerfanos,
    'facturas_huerfanas',facturas_huerfanas,
    'cobros_sin_referencia',cobros_sin_referencia,
    'cobros_transfer_sin_banco',cobros_transfer_sin_banco,
    'cobros_sin_agente',cobros_sin_agente,
    'verificado_en',now()
  )
  INTO v_result
  FROM metricas;

  return v_result;
end;
$function$;

-- GRANT/REVOKE — verificado igual contra producción: anon ya sin EXECUTE
-- (mismo REVOKE tracked del 26-jul-2026), NO-OP. El hardening real acá es
-- el guard interno (exige mi_rol()='admin', no solo "cualquier rol", a
-- diferencia de las funciones 1-3) — y ESE sí cierra un hueco confirmado
-- vigente hoy: bayolsale_admin (admin real de otra organización) pudo leer
-- seguros_diagnostico_financiero() completo en la prueba directa contra
-- producción (BEGIN...ROLLBACK), sin ningún guard que se lo impidiera.
REVOKE EXECUTE ON FUNCTION public.seguros_diagnostico_financiero() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seguros_diagnostico_financiero() TO authenticated, service_role;


-- ============================================================================
-- ROLLBACK — restaura los 5 cuerpos EXACTOS capturados en producción el
-- 2026-08-11 antes de este hardening (pg_get_functiondef en vivo). Ejecutar
-- estos 5 bloques completos para deshacer TODO lo de arriba en un solo paso.
--
-- IMPORTANTE (corrección tras verificar contra producción, no solo el
-- branch de prueba — ver Nota 2 al inicio del archivo): el GRANT a
-- PUBLIC/anon que este rollback restauraba para siguiente_ncf/next_recibo/
-- next_recibo_anio NO es el baseline real de producción — esas 3 YA tenían
-- anon revocado desde el 26-jul-2026 (`seguridad_secuencias_revocar_de_public`,
-- tracked). Restaurarlo a PUBLIC/anon sería una REGRESIÓN respecto al
-- estado real, no una vuelta al estado real. Se corrige aquí: el rollback
-- de esas 3 solo restaura el CUERPO (quita el guard), sin tocar su ACL
-- (que ya estaba, y se queda, en authenticated+service_role). El único
-- GRANT a PUBLIC/anon que sí hace falta restaurar es el de
-- crear_factura_auto_tx, que es la única con ese ACL abierto hoy de verdad.
-- ============================================================================
/*
CREATE OR REPLACE FUNCTION public.siguiente_ncf(p_tipo text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_num integer;
begin
  if p_tipo is null or p_tipo = 'SIN' then return null; end if;
  update secuencias_ncf set ultimo_numero = coalesce(ultimo_numero,0) + 1
   where tipo = p_tipo
   returning ultimo_numero into v_num;
  if v_num is null then
    insert into secuencias_ncf(tipo, ultimo_numero) values (p_tipo, 1)
     on conflict (tipo) do update set ultimo_numero = secuencias_ncf.ultimo_numero + 1
     returning ultimo_numero into v_num;
  end if;
  return p_tipo || lpad(v_num::text, 8, '0');
end; $function$;

CREATE OR REPLACE FUNCTION public.next_recibo()
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ select nextval('public.recibo_seq')::int $function$;

CREATE OR REPLACE FUNCTION public.next_recibo_anio(p_anio integer)
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  insert into public.recibo_contador (anio, ultimo) values (p_anio, 1)
  on conflict (anio) do update set ultimo = public.recibo_contador.ultimo + 1
  returning ultimo;
$function$;

GRANT EXECUTE ON FUNCTION public.crear_factura_auto_tx(
  uuid, text, text, uuid, text, integer, integer, numeric, numeric, numeric,
  numeric, text, date, numeric
) TO PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.seguros_diagnostico_financiero()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
WITH facturado AS (
  SELECT cliente_id, coalesce(sum(coalesce(prima_base,0)+coalesce(prima_deps,0)),0) total
  FROM public.facturas
  WHERE estado IS DISTINCT FROM 'Anulada'
  GROUP BY cliente_id
),
pagado_ledger AS (
  SELECT cliente_id, coalesce(sum(monto),0) total
  FROM public.abonos
  WHERE coalesce(tipo,'') <> 'deuda_anterior'
    AND coalesce(estado,'') <> 'Reversado'
  GROUP BY cliente_id
),
metricas AS (
  SELECT
    (SELECT count(*) FROM public.clientes c
      LEFT JOIN facturado f ON f.cliente_id=c.id
      WHERE abs(coalesce(c.deuda_total,0)-coalesce(f.total,0))>0.01) deuda_descuadra,
    (SELECT count(*) FROM public.clientes c
      LEFT JOIN pagado_ledger p ON p.cliente_id=c.id
      WHERE abs(coalesce(c.pagado,0)-coalesce(p.total,0))>0.01) pagado_descuadra,
    (SELECT count(*) FROM public.asientos
      WHERE abs(coalesce(monto_dr,0)-coalesce(monto_cr,0))>0.01) asientos_desbalanceados,
    (SELECT count(*) FROM public.asientos
      WHERE coalesce(monto_dr,0)<=0 OR coalesce(monto_cr,0)<=0) asientos_no_positivos,
    (SELECT count(*) FROM public.asientos WHERE referencia='AST-BAJA') ast_baja,
    (SELECT count(*) FROM public.abonos a
      LEFT JOIN public.clientes c ON c.id=a.cliente_id
      WHERE c.id IS NULL) abonos_huerfanos,
    (SELECT count(*) FROM public.facturas f
      LEFT JOIN public.clientes c ON c.id=f.cliente_id
      WHERE c.id IS NULL) facturas_huerfanas,
    (SELECT count(*) FROM public.abonos
      WHERE coalesce(estado,'')<>'Reversado'
        AND (referencia IS NULL OR btrim(referencia)='')) cobros_sin_referencia,
    (SELECT count(*) FROM public.abonos
      WHERE coalesce(estado,'')<>'Reversado'
        AND metodo IN ('Transferencia','Depósito')
        AND (banco IS NULL OR btrim(banco)='')) cobros_transfer_sin_banco,
    (SELECT count(*) FROM public.abonos
      WHERE coalesce(estado,'')<>'Reversado'
        AND (agente_cobro IS NULL OR btrim(agente_cobro)='')) cobros_sin_agente
)
SELECT jsonb_build_object(
  'ok', (deuda_descuadra=0 AND pagado_descuadra=0 AND asientos_desbalanceados=0 AND asientos_no_positivos=0 AND ast_baja=0),
  'deuda_descuadra',deuda_descuadra,
  'pagado_descuadra',pagado_descuadra,
  'asientos_desbalanceados',asientos_desbalanceados,
  'asientos_no_positivos',asientos_no_positivos,
  'ast_baja',ast_baja,
  'abonos_huerfanos',abonos_huerfanos,
  'facturas_huerfanas',facturas_huerfanas,
  'cobros_sin_referencia',cobros_sin_referencia,
  'cobros_transfer_sin_banco',cobros_transfer_sin_banco,
  'cobros_sin_agente',cobros_sin_agente,
  'verificado_en',now()
)
FROM metricas;
$function$;
-- NO se restaura ningún GRANT a PUBLIC/anon aquí a propósito: el baseline real
-- de producción para esta función tampoco los incluye (confirmado, ver NOTA 2
-- arriba) — restaurarlos sería una regresión, no una reversión genuina.
*/
