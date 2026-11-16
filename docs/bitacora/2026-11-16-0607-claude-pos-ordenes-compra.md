# 16-nov-2026 06:07 (RD) — Claude — POS: órdenes de compra (build 6055)

## Pedido del dueño
«Orden de compra». Es la base del último reporte de Infoplus que faltaba: «Faltante orden compra».

## Qué se hizo
- **Compras → «Órdenes de compra»**: lista de órdenes (Abierta, Parcial, Recibida, Cerrada, Anulada) con lo recibido de lo pedido por renglón.
- **Nueva orden**: proveedor, fecha en que se espera, artículos con cantidad y costo, notas. El servidor la numera `OC-00001`.
- **Imprimir orden**: hoja con empresa, proveedor (RNC y teléfono), renglones, total estimado y firmas.
- **Recibir**: abre la compra de siempre ya llena con lo que falta, el proveedor y el número de orden en «Orden No.». Se ajusta lo que de verdad llegó y se guarda. Al guardar la compra se anota en la orden (`rpc/pos_orden_compra_recibir`), que queda Parcial o Recibida. Los artículos con IMEI se avisan para agregarlos con su serie.
- **Cerrar / Anular** con motivo. No se puede anular si ya llegó algo: se cierra.
- **Reportes → Compras y despachos**: «Órdenes de compra» y «Faltante orden de compra» (pedido, recibido, falta, valor; agrupado por proveedor; marca «atrasada» si pasó la fecha esperada).

## Regla contable
La orden **no mueve inventario ni dinero**. Eso lo sigue haciendo la compra, igual que antes.

## Base de datos
- Migración `20261116080000_pos_ordenes_compra.sql` (solo agrega): tablas `pos_ordenes_compra`, `pos_orden_compra_items`, `pos_orden_compra_recepciones`; RPC `pos_orden_compra_crear`, `pos_orden_compra_recibir`, `pos_orden_compra_cerrar` (SECURITY DEFINER; la organización solo lee las tablas).
- Ensayo con vuelta atrás aprobado (incluye rechazo de compra de otro proveedor) y aplicada en producción antes de esta entrega.

## Archivos
- `parches-pos.js`, `parches-seguros.js` (b=6055), `scripts/qa-pos-ordenes-compra.mjs`, la migración.

## Pruebas
- `qa-pos-ordenes-compra`: 36/36 a 390 y 1280 px (campos 48/16, botones ≥44, guardar 54, sin desborde, 0 errores de JS, nunca escribe directo en tablas de órdenes).
- Regresión: pedidos-almacen 28, reportes-mas 34, reportes-inventario 34, precios-activos 42, aura-contable 14, variantes 18, devolucion-muse 26, compra-segura 50: todo en verde.

## Estado
Rama `claude/pos-ordenes-compra`. **Sin publicar**: espera «Publícalo» del dueño.

## Siguiente paso
Con esto quedan los reportes de Infoplus pedidos. Pendientes en `docs/MEMORIA.md`.
