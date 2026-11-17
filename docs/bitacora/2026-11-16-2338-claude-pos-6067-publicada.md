# 17-nov-2026 — Claude — POS 6067 publicada y verificada

- **Autorización:** el dueño tocó «Publícalo».
- **PR:** #524, fusionado con squash. Commit en `main`: `7afbbfac1ce2e1498c1f6b5b5b8674ca6622c946`.
- **Detalle del cambio:** entrada `*-claude-pos-6067-recibo-animado-completo.md`.

## Verificación en vivo (nexusprord.com/demo, 390 px)
- `NX_BUILD` = 6067.
- **Prueba:** venta en Factura de Café molido (exento) + Agua (gravada), pagada con RD$300 en efectivo. Las escrituras fueron simuladas: no se guardó nada en la base.
- **Lo que mostró el recibo animado:**
  - teléfono y dirección de la tienda, y la fecha;
  - «1× CAFÉ MOLIDO 1 LB (E) RD$ 260.00» y «1× AGUA PURIFICADA 500 ML (G) RD$ 25.00»;
  - subtotal RD$ 281.00, ITBIS RD$ 4.00, exento RD$ 260.00;
  - efectivo RD$ 300.00, devuelta RD$ 15.00, total RD$ 285.
- La hora salió en UTC porque el navegador de la prueba está en UTC. En los equipos de RD sale la hora local, igual que en el ticket.
- No hubo errores de página.
