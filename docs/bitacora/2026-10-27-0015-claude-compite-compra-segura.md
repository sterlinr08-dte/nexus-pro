# 2026-10-27 00:15 (RD) — Claude · «Compra segura» en el ticket y la factura (agente 4 de 5)

## Pedido del dueño
Herramientas LEGALES para competir contra negocios informales que venden sin factura ni garantía. Esta pieza:
que el cliente **vea en su recibo** lo que gana comprando en un negocio formal, con datos reales de la venta.

## Fuente de verdad revisada
- `ticketHTML(v)` (ticket térmico, `max-width:300px`) y `docFacturaHTML(d)` / `nxFacDocVenta()` (factura carta) en `parches-pos.js`.
- Datos: `pos_venta_items.garantia_hasta` (se calcula al cobrar con `pos_productos.garantia_dias`), `pos_venta_items.serial`
  (IMEI elegidos), `pos_ventas.ncf` / `ecf_security_code` / `ecf_qr_url`; QR con `ecfQR()` y bloque fiscal `ecfBloqueTicket()`.
- `pos_config` no tiene columnas para esto → ajustes por equipo en localStorage + propuesta SQL sin aplicar.

## Qué se hizo
- **Capa nueva** `parches-pos-compra-segura.js` (cargada en `index.html` justo después de `parches-pos.js`):
  - `window.nxCompraSeguraBloque(tipo, datos)` arma el recuadro «Compra segura» con lo que tenga ESA venta:
    `✓ Garantía hasta 27-oct-2027 · artículo`, `✓ IMEI / serial registrado: …`, `✓ Comprobante fiscal NCF B02…`
    (o `✓ Factura electrónica e-NCF E32…: verifíquela con el código QR`), «Guarde esta factura para cualquier reclamo.»
    y el texto opcional del negocio. Si no hay garantía, IMEI, NCF ni texto, **no sale nada**. No sale en ventas anuladas ni en
    la vista previa / prefactura.
  - Fecha leída del texto `AAAA-MM-DD` (sin `Date()`, no se corre el día por zona horaria).
  - Ticket: va debajo del bloque e-CF (QR) y antes de «¡Gracias por su compra!»; borde fino, 11 px, `overflow-wrap:anywhere`,
    `break-inside:avoid` → cabe en 58 mm (220 px) y 80 mm (302 px) sin desbordar.
  - Factura carta: recuadro verde suave (blanco con borde gris al imprimir) y, si es e-CF, **el QR de la DGII dentro del bloque**
    (antes la carta no traía el QR).
  - Ajustes del POS: tarjeta «Compra segura en el recibo» debajo de «Garantía de reparación», con interruptor
    «Mostrar bloque Compra segura en el recibo» (encendido por defecto, 52×44 px, `role="switch"`) y «Texto del negocio (opcional)»
    (48 px / 16 px, máx. 160, contador). Se inserta con MutationObserver al pintarse Ajustes (sin parpadeo). Modo oscuro con las
    variables `--pf-*`. Sin mayúsculas forzadas.
  - localStorage: `nx_pos_cs_mostrar` ('0' = apagado), `nx_pos_cs_texto`. Apagar la capa entera: `nx_pos_compra_segura_off='1'`.
- **`parches-pos.js` (mínimo, +7 líneas):** función `csBloque()` (try/catch, '' si la capa no está), una llamada en `ticketHTML`,
  una en `docFacturaHTML` (antes de `.legal`) y en `nxFacDocVenta` se pasan `_venta`, `_items` y `_qr` (espera `ecfCargarQR()`
  solo si la venta tiene `ecf_qr_url`).
- **Propuesta SQL sin aplicar:** `supabase/migrations/20261027120000_pos_compra_segura_PROPUESTA.sql`
  (`pos_config.compra_segura_mostrar boolean default true`, `compra_segura_texto text` ≤ 160). NO aplicada.
- No se escribió en Supabase. No se subió `APP_VERSION`.

## Pruebas
- `scripts/qa-pos-compra-segura.mjs` (nuevo): **50 pasaron, 0 fallaron** — venta con garantía 365 d + IMEI + B02 a 390 y 1280
  (ticket y carta con fecha correcta, la funda sin garantía no inventa), 58/80 mm sin desborde, venta sin nada → no sale bloque,
  Ajustes (una sola tarjeta, 44 px, 48/16, tope 160, oscuro), texto del negocio en el ticket, interruptor apagado → no sale,
  e-CF E32 con QR (ticket y carta), capa apagada → ticket como antes, 0 errores JS.
- `scripts/qa-pos-cubre6.mjs`: 14/0. `scripts/qa-ecf-caja.mjs`: 59/0.

## Rama / estado
- Rama `claude/compite-4-compra-segura` (desde `origin/claude/pos-descuento-itbis`). Sin PR, sin publicar.

## Pendientes / siguiente paso
- Si el dueño quiere el ajuste para toda la empresa (no por equipo): aplicar la propuesta SQL y leer/escribir `pos_config`.
- Ver el recibo en la impresora térmica real (58 y 80 mm) antes de publicar.
- El ticket de devolución / nota de crédito no lleva el bloque (a propósito).
