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

-- GRANT/REVOKE: sin cambio (ya estaba correcto — authenticated, postgres,
-- service_role; sin anon). El hardening real es el guard interno de arriba.


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

-- GRANT/REVOKE: sin cambio (authenticated, postgres, service_role).


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

-- GRANT/REVOKE: sin cambio (authenticated, postgres, service_role).


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

-- GRANT/REVOKE: sin cambio (authenticated, postgres, service_role). El
-- hardening real es el guard interno (exige mi_rol()='admin', no solo
-- "cualquier rol"), a diferencia de las funciones 1-3.


-- ============================================================================
-- ROLLBACK — restaura los 5 cuerpos EXACTOS capturados en producción el
-- 2026-08-11 antes de este hardening (pg_get_functiondef en vivo). Ejecutar
-- estos 5 bloques completos para deshacer TODO lo de arriba en un solo paso.
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
*/
