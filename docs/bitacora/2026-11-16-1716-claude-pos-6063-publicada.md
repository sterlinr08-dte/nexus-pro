# 16-nov-2026 — Claude — POS 6063 publicada y verificada

- **Autorización:** el dueño tocó «Publícalo».
- **PR:** #515, fusionado por squash. Commit en `main`: `393f58a8b8490118078705c7620183c74bee8ca5`.
- **Detalle:** ver `2026-11-16-1705-claude-pos-6063-nivel-bloqueado-cliente-unico.md`.

## Verificación en vivo (nexusprord.com/demo, 1440 y 390 px)
- `parches-seguros.js` sirve `b=6063`, y `NX_BUILD` vale 6063.
- Prefactura: el «Precio» es un dato fijo (`#pfbNivel.pfbFijo`, «Cliente final») y ya no hay selector de nivel.
- Cliente nuevo, con las escrituras interceptadas por la prueba (no se guardó nada en la base):
  - el sistema consultó una vez `pos_clientes` por el WhatsApp;
  - hizo un solo POST `pos_clientes`;
  - no hubo errores de página.

## Siguiente paso
- Pedir a Muse que repita, en la 6063, la prueba del cliente nuevo por WhatsApp y que pruebe el nivel bloqueado.
