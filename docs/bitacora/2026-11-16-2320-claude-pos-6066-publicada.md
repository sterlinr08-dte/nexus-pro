# 17-nov-2026 — Claude — POS 6066 publicada y verificada

- **Autorización:** el dueño tocó «Publícalo».
- **PR:** #522, fusionado con squash. Commit en `main`: `9ab86dba4477bd36b88f148dfe7abe8168bd80c0`.
- **Detalle del cambio:** entrada `*-claude-pos-6066-aviso-minimo-tablero.md`.

## Verificación en vivo (nexusprord.com/demo, 1440 px)
- `NX_BUILD` = 6066.
- En Factura se usó el Café molido (mínimo RD$240) con precio 200. El aviso dice «Precio bajo: Café molido 1 lb · Mínimo RD$ 240.00 · puesto RD$ 200.00». Ya no aparece «mínimo mínimo».
- Cobro y confirmación con escrituras simuladas: no se guardó nada en la base. Después de la venta, la página pidió `pos_ventas` 2 veces; eso es la recarga del tablero.
- No hubo errores de página.
