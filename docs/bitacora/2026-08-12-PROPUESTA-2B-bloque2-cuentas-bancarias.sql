-- ============================================================================
-- NO APLICAR — PROPUESTA 2B (bloque #2)
-- ============================================================================
-- Este archivo es una PROPUESTA, probada dentro de BEGIN...ROLLBACK contra
-- producción. NO se aplicó de forma persistente. Vive en la rama
-- claude/2b-bloque2-cuentas-bancarias, NO en `main`.
--
-- Referencia: docs/bitacora/2026-08-12-XXXX-claude.md (entrega de este bloque),
-- en respuesta a docs/bitacora/2026-08-11-2140-chatgpt.md.
--
-- Objetivo (decisión funcional de ChatGPT, confirmada compatible con el código
-- real auditado): separar `mis_cuentas_bancarias` en 2 policies —
--   - SELECT: cualquier autenticado de nexus-pro (admin o agente).
--   - INSERT/UPDATE/DELETE: solo admin de nexus-pro.
--   - Cross-org y anon: denegado por completo en ambos casos.
--
-- Por qué es seguro (auditoría real, no supuesta):
--   1. CERO funciones/RPC de Postgres referencian esta tabla (verificado con
--      pg_proc.prosrc ILIKE). No hay ningún camino server-side que dependa de
--      que un agente pueda escribir aquí.
--   2. El único consumidor real en todo el frontend es el módulo standalone
--      "MIS CUENTAS BANCARIAS V2" (parches.js, líneas ~7250-7642) — CERO
--      referencias en index.html. No es tocado por ningún flujo de
--      cobro/transferencia/factura — es una libreta de referencia rápida
--      (copiar datos de la cuenta para mandarlos por WhatsApp a quien deposita),
--      no un dato que la lógica de cobro consulte.
--   3. Ese módulo hace SELECT (cargarCuentas), y por separado
--      INSERT/UPDATE/DELETE (nxGuardarCuenta/nxEliminarCuenta) — el SELECT
--      sigue abierto a la org, así que la lectura no se rompe.
--   4. El módulo NO tiene ningún chequeo de rol en el frontend hoy (los
--      botones Editar/Eliminar se ven para CUALQUIER usuario, admin o
--      agente) — confirmado con grep, cero "esAdmin"/"rol" en esas ~390
--      líneas. Esto significa que HOY un agente ya puede editar/borrar
--      cuentas bancarias del negocio con solo tocar un botón — el hallazgo
--      real que motivó a ChatGPT a pedir este bloque.
--   5. `DELETE` es físico, no soft-delete — la columna `activa` (boolean)
--      existe en el esquema pero NO se usa en ningún lugar del código real
--      (ni para filtrar, ni para marcar inactiva en vez de borrar). Se
--      documenta, no se toca en este bloque (no fue lo pedido).
--
-- Efecto en la UI tras aplicar (sin cambio de frontend en este bloque, a
-- propósito — ChatGPT pidió "cero cambios frontend" salvo que fuera
-- imprescindible para demostrar compatibilidad, y no lo es): un agente que
-- toque "Editar"/"Eliminar"/"+ Nueva cuenta" seguirá viendo el botón (no se
-- oculta), pero la escritura fallará en el servidor y el propio módulo ya
-- tiene try/catch que muestra un toast de error ("No se pudo guardar"/
-- "No se pudo eliminar") — falla de forma segura y visible, no en silencio,
-- pero no es pulido (el botón no debería ni aparecer). Queda anotado como
-- mejora de UI opcional, no parte de este bloque.
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS org_mis_cuentas_bancarias ON public.mis_cuentas_bancarias;

CREATE POLICY mis_cuentas_bancarias_select_org ON public.mis_cuentas_bancarias
  FOR SELECT TO authenticated
  USING (
    mi_rol() IS NOT NULL
    AND mi_organizacion() = (SELECT id FROM public.organizaciones WHERE slug = 'nexus-pro')
  );

CREATE POLICY mis_cuentas_bancarias_write_admin ON public.mis_cuentas_bancarias
  FOR ALL TO authenticated
  USING (
    mi_rol() = 'admin'
    AND mi_organizacion() = (SELECT id FROM public.organizaciones WHERE slug = 'nexus-pro')
  )
  WITH CHECK (
    mi_rol() = 'admin'
    AND mi_organizacion() = (SELECT id FROM public.organizaciones WHERE slug = 'nexus-pro')
  );

COMMIT;

-- ============================================================================
-- ROLLBACK exacto al estado anterior (una sola policy ALL, org sin distinguir rol):
--
-- BEGIN;
-- DROP POLICY IF EXISTS mis_cuentas_bancarias_select_org ON public.mis_cuentas_bancarias;
-- DROP POLICY IF EXISTS mis_cuentas_bancarias_write_admin ON public.mis_cuentas_bancarias;
-- CREATE POLICY org_mis_cuentas_bancarias ON public.mis_cuentas_bancarias
--   FOR ALL TO authenticated
--   USING (mi_rol() IS NOT NULL AND mi_organizacion() = (SELECT id FROM public.organizaciones WHERE slug='nexus-pro'))
--   WITH CHECK (mi_rol() IS NOT NULL AND mi_organizacion() = (SELECT id FROM public.organizaciones WHERE slug='nexus-pro'));
-- COMMIT;
-- ============================================================================
