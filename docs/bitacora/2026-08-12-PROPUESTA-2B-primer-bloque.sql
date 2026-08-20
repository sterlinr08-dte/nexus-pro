-- ============================================================================
-- NO APLICAR — PROPUESTA 2B (bloque #1)
-- ============================================================================
-- Este archivo es una PROPUESTA. NO se ejecutó contra producción ni contra
-- ningún branch de Supabase. Nada de lo que sigue está aplicado.
--
-- Referencia: docs/bitacora/2026-08-12-0056-claude.md (sección "Primer bloque
-- propuesto"), en respuesta a docs/bitacora/2026-08-11-2040-chatgpt.md.
--
-- Alcance de ESTE bloque, y por qué es el primero:
--   1. secuencias_ncf / recibo_contador — cierre de REST directo. Verificado
--      con grep sobre index.html + parches.js: CERO llamadas directas
--      (API.get/post/patch/del) a estas 2 tablas en todo el frontend. Los
--      únicos consumidores reales son las RPC ya hardened en Subfase 2A
--      (siguiente_ncf, next_recibo, next_recibo_anio), que corren con sus
--      propios privilegios de función (no dependen del GRANT de tabla del
--      rol authenticated para escribir). Revocar la escritura directa de
--      `authenticated`/`anon` sobre estas 2 tablas es, por evidencia, riesgo
--      cero: no hay ningún camino legítimo que dependa de ese GRANT.
--   2. asientos — trigger BEFORE DELETE. Hallazgo adicional (no pedido
--      explícito por ChatGPT) encontrado auditando el mismo dominio: la
--      tabla `abonos` ya tiene, desde Fase 1, un trigger que bloquea el
--      DELETE físico de un cobro (trg_seguros_bloquear_delete_abono). La
--      tabla `asientos` — el libro contable, tan sensible como `abonos` —
--      NO tiene el mismo tipo de protección: verificado con pg_trigger que
--      solo existe un trigger BEFORE INSERT (trg_seguros_bloquear_ast_baja,
--      del cierre de Fase 1, sin relación con DELETE). Este trigger es
--      aditivo y solo agrega una protección que hoy no existe — no cambia
--      ningún GRANT ni policy, así que no puede romper ningún flujo real
--      (nada del sistema borra un asiento hoy; anularFactura y
--      seguros_reversar_cobro contrarrestan con un asiento inverso, nunca
--      con un DELETE).
--
-- Explícitamente FUERA de este bloque (ver docs/bitacora/2026-08-12-0056-claude.md):
--   - clientes / facturas / asientos (el resto de sus columnas) — necesitan
--     RPC nuevas antes de poder cerrar REST sin romper funciones en uso.
--   - mis_cuentas_bancarias — pendiente de que el dueño confirme si debe
--     quedar admin-only (hoy no lo es).
--   - seguros_registrar_cobro / seguros_reversar_cobro — el hallazgo central
--     de esta fase (SECURITY INVOKER sin guard interno de organización).
--     Deliberadamente el ÚLTIMO bloque de 2B, con su propio ciclo de
--     pruebas, por ser dinero real en producción.
--   - transferencias_agentes / comisiones — fuera del alcance explícito que
--     dio ChatGPT para esta fase.
--
-- (Un tercer hallazgo — "facturas.ncf sin índice único" — se auditó también
-- pero resultó FALSO: ya existe facturas_ncf_unico desde la migración
-- seguros_ncf_formato_dgii_y_unico (20260726214908), de una sesión anterior.
-- No entra aquí porque ya está resuelto — ver la corrección en
-- docs/bitacora/2026-08-12-0056-claude.md.)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1a. secuencias_ncf — revocar escritura directa de authenticated y anon.
--     SELECT se queda (el frontend nunca lee esta tabla directo, pero no hay
--     ninguna razón para revocar lectura y sí muchas para no tocarla sin
--     necesidad — cambio mínimo, solo lo que hace falta).
-- ----------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.secuencias_ncf
  FROM authenticated, anon;

-- ----------------------------------------------------------------------------
-- 1b. recibo_contador — mismo tratamiento, mismo razonamiento.
-- ----------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.recibo_contador
  FROM authenticated, anon;

-- ----------------------------------------------------------------------------
-- 2. asientos — trigger BEFORE DELETE, mismo patrón que ya protege `abonos`.
--    Mensaje distinto a propósito (habla de "asiento contable", no "cobro")
--    para que el error sea claro sobre qué tabla lo está bloqueando.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seguros_bloquear_delete_asiento()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RAISE EXCEPTION 'No se permite eliminar asientos contables. Registre un asiento de reversión.';
END;
$function$;

CREATE TRIGGER trg_seguros_bloquear_delete_asiento
  BEFORE DELETE ON public.asientos
  FOR EACH ROW EXECUTE FUNCTION public.seguros_bloquear_delete_asiento();

COMMIT;

-- ============================================================================
-- Verificación post-aplicación sugerida (a correr DESPUÉS de aplicar, no antes):
--
--   -- confirma que authenticated/anon ya no pueden escribir directo:
--   select has_table_privilege('authenticated', 'secuencias_ncf', 'INSERT');   -- debe dar false
--   select has_table_privilege('authenticated', 'recibo_contador', 'UPDATE');  -- debe dar false
--   select has_table_privilege('anon', 'secuencias_ncf', 'INSERT');            -- debe dar false
--
--   -- confirma que las 3 RPC de 2A siguen funcionando (corren con sus propios
--   -- privilegios de función, no con el GRANT de tabla que se acaba de quitar):
--   -- repetir el mismo test de docs/bitacora/2026-08-12-0029-claude.md,
--   -- sección 3 y 4, dentro de BEGIN...ROLLBACK.
--
--   -- confirma que asientos ya no acepta DELETE:
--   -- dentro de BEGIN...ROLLBACK: delete from asientos where id = '<algún id real>';
--   -- debe fallar con la excepción nueva, no con un DELETE silencioso.
-- ============================================================================
