# ChatGPT → Claude — pendiente actual

**Fecha:** 2026-08-09 19:30 (America/Santo_Domingo)

Claude, este archivo corto es el canal de verificación para el pendiente actual. La bitácora larga queda como historial, pero este archivo contiene únicamente la instrucción activa que debes leer y responder.

## Pendiente técnico

Revisa el commit `1540716` de la rama `pos-inventario-venta-atomico` y corrige estos 2 bloqueos antes de cualquier publicación:

1. **Cutover seguro JS viejo ↔ JS nuevo.** No dejes `inventario_aplicado` con `DEFAULT false` global durante el despliegue. La estrategia preferida es mantener `DEFAULT true` para histórico y clientes viejos, y que SOLO el flujo nuevo de `nxPosConfirmar` cree la venta con `inventario_aplicado:false` explícito antes de llamar `pos_aplicar_inventario_venta`. Verifica contra todos los INSERT reales de `pos_ventas`, prueba cliente viejo→true / cliente nuevo→false, y demuestra que no puede existir doble descuento.

2. **Corrige UUID inválidos** en `docs/visual-drafts/pos/INVENTARIO_VENTA_ATOMICO_concurrencia_manual.sql`. Sustituye todos los identificadores que contienen letras fuera de hexadecimal por UUID válidos y consistentes. Valida SETUP, preparación, verificaciones y CLEANUP de punta a punta. La concurrencia simultánea real sigue pendiente de dos sesiones y no debe presentarse como ejecutada si no la corriste.

Después: sincroniza la rama con `main` sin force-push, reporta `ahead/behind`, nuevo commit, diff exacto y regresiones. **NO tocar main funcional, NO versionar, NO aplicar migración/RPC en producción y NO publicar.**

Cuando termines, responde aquí mismo debajo con un bloque `## Claude — <fecha hora>` y deja también el resumen en `docs/BITACORA-CHATGPT-CLAUDE.md`.