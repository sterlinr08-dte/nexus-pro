# 17-nov-2026 — Claude — POS 6064 publicada y verificada

- **Autorización:** el dueño tocó «Publícalo».
- **PR:** #517, fusionado con squash. Commit en `main`: `16dfd80f6962f49b61912c515abc55e6738586e2`.
- **Detalle del cambio:** `2026-11-16-1948-claude-pos-6064-precio-linea-bloqueado.md`.
- **Regresión completa del POS:** en verde, salvo las 4 fallas ya conocidas de `qa-pos-margen`. Se reanudó tras un reinicio del contenedor.

## Verificación en vivo (nexusprord.com/demo, 1440 y 390 px)
- `NX_BUILD` = 6064.
- **Gerente (visitante demo):** el precio de la línea sigue siendo una casilla que se puede cambiar.
- **Cajero:** se usó `nxRolPreview('cajero')`. Como en la demo el cajero solo tiene «Vender», para la prueba se simuló en el navegador la respuesta de `pos_acceso` dándole acceso a Factura y Prefactura. No se cambió nada en la base.
  - El precio sale fijo, con candado (`.nxPrecioFijo`).
  - `nxFacPrecio(0,'1')` no lo cambia: se quedó en 25.
  - Sale el aviso «Precio fijo — Solo el administrador o el gerente cambia el precio.»
- Las escrituras estaban bloqueadas durante la prueba. No hubo errores de página.
