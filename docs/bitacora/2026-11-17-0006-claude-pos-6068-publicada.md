# 17-nov-2026 — Claude — POS 6068 publicada y verificada

- **Autorización:** el dueño tocó «Publícalo».
- **PR:** #526, fusionado con squash. Commit en `main`: `e9b341911f767ed1ceb37ec3bc1a78ea1f855910`.
- **Detalle del cambio:** ver `*-claude-pos-6068-caja-devuelta.md`.

## Verificación en vivo (nexusprord.com/demo, 1440 px)
- `NX_BUILD` = 6068.
- **Prueba:** Café molido + Agua (total RD$285), pagados con RD$300 en efectivo. La escritura fue simulada: no se guardó nada en la base.
- **Lo que se envía a la base:**
  - `total` 285;
  - **`pagado_efectivo` 285** (antes era 300);
  - `recibido` 300;
  - `devuelta` 15;
  - `pagos` = [Efectivo 300].
- **Recibo animado:** «Efectivo RD$ 300.00 · Devuelta RD$ 15.00».
- No hubo errores de página.
