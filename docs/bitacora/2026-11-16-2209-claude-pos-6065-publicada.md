# 17-nov-2026 — Claude — POS 6065 publicada y verificada

- **Autorización:** el dueño tocó «Publícalo».
- **PR:** #519, fusionado con squash. Commit en `main`: `2e18bc716d9abdfecac25212d3f4e300ec2b00b4`.
- **Base:** el trigger `trg_pos_venta_items_precio_minimo` se aplicó antes, con su migración. Ver la entrada `*-claude-pos-6065-precio-minimo-en-base.md`.

## Verificación en vivo (nexusprord.com/demo, 1440 px)
- `NX_BUILD` = 6065.
- **Prueba en Factura:** Agua, cobro de RD$25 en efectivo y «Confirmar».
  - La prueba simuló que la base respondía `PRECIO_DEBAJO_MINIMO: Agua purificada 500 ml (mínimo 30.00)`.
  - Las escrituras estaban bloqueadas: no se guardó nada.
- **Resultado:**
  - Salió el aviso «Precio debajo del mínimo — Agua purificada 500 ml: mínimo RD$ 30.00».
  - Hubo 1 sola llamada a la RPC y ningún error de página.

## Pendiente con el dueño
Corregir los 3 precios de «Correduría de Seguros» que están por debajo de su propio mínimo:
- iPhone 11: por mayor y nivel en 9,000, con mínimo 10,000.
- Batería iPhone 8G: nivel en 400, con mínimo del nivel en 4,000.
