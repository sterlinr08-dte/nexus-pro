# 06-nov-2026 · PUBLICADO — Conector personal para Claude, etapa 1 (solo consultar)

- Dueño: «Publicalo». Esta entrega tiene su propia entrada en la bitácora: `2026-11-06-1900-claude-conector-claude-etapa1.md`.
- Edge Function `nexus-mcp` desplegada con `verify_jwt=false`. La versión 2 es la buena.
  - **Error mío corregido al momento:** la versión 1 salió con `mcp.ts` vacío (texto de relleno). Se volvió a desplegar a los 2 minutos con los 3 archivos completos, y se comprobó con `get_edge_function` que el contenido es igual al del repo. La función estaba apagada, sin llave, así que no hubo impacto.
- Verificado en vivo: una llave equivocada recibe **401**. Sin el Secret `NEXUS_MCP_LLAVE`, el conector sigue **apagado**.
- **Falta (lo hace el dueño):**
  1. Crear el Secret `NEXUS_MCP_LLAVE` en Supabase (32 caracteres o más).
  2. Agregar el conector en la app de Claude con el enlace `…/functions/v1/nexus-mcp/<llave>`.
- Siguiente: la primera prueba real del dueño. Después, la etapa 2, que es aplicar pagos y facturas con su confirmación.
