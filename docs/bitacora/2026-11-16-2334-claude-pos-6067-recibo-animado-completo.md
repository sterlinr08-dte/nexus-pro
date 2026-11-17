# 17-nov-2026 — Claude — POS 6067: el recibo animado muestra lo mismo que el ticket real

## Pedido del dueño
Mandó una captura de la tarjeta animada «Venta cobrada» (CO00000005, RD$ 200) y escribió: «Vamos a poner que en esa factura se vea lo mismo que sale en factura real».

## Diagnóstico
- La tarjeta `window.nxReciboAnimado` (en `index.html`) solo mostraba la cantidad de artículos, el número de factura y el total.
- El ticket real, `ticketHTML(v)` en `parches-pos.js`, muestra además: tienda (RNC, teléfono, dirección), NCF, fecha, cada artículo con cantidad e importe (con (G)/(E) cuando hay gravados y exentos), subtotal, descuento, ITBIS, exento, formas de pago y devuelta.

## Cambios
- **`index.html`:** `nxReciboAnimado` acepta un `datos.detalle` opcional (HTML que el llamador ya escapó). Se muestra entre las filas y el monto, en `.nxRA-det`. Cuando son muchos artículos, ese bloque se desplaza dentro del papel (alto máximo min(34vh, 300px)). Las otras pantallas que usan la tarjeta (cobros, financiamiento) quedan igual, porque no mandan `detalle`.
- **`parches-pos.js`:** función nueva `reciboDetalleHTML(v)`, con el mismo contenido que el ticket y todo escapado con `esc()`. `_posVentaExito` la pasa como `detalle`.
- **`parches-seguros.js`:** `b=6066` → `b=6067`.

## Pruebas
- `qa-pos-cubre6`: 20/20. Prueba nueva: el recibo muestra artículos, subtotal, ITBIS y pago, sin scroll horizontal, a 390 y 1280 px. Las capturas quedaron en el scratchpad (`cap6067/recibo-*.png`).
- En verde: `apartar`, `compra-segura`, `itbis-linea`, `volumen`, `cobro-caja`, `fase1`, `fase2`, `prefactura` y `prefactura-bayol`.

## Estado
- Rama `claude/pos-recibo-animado-completo`. Sin publicar.
