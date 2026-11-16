# POS — 12 reportes más estilo Infoplus (16-nov-2026)

**Pedido:** el dueño pidió «los 19» que faltaban de Infoplus. Rama `claude/pos-reportes-19`, build **6052**, **sin publicar**.

## Qué se hizo (12 nuevos; total 17 en el mismo lugar)
Reportes → botón **«Inventario, ventas y compras»** (antes «Reportes de inventario»). Arriba 3 grupos y, dentro, un selector «Reporte».
Todos con filtros, «Excel (CSV)» e «Imprimir». Solo leen.

| Grupo | Reporte (Infoplus) | Fuente |
|---|---|---|
| Inventario | Inventario físico (hoja de conteo) · Lista de precios («Precios») · Series no vendidas | `pos_productos`, `pos_seriales` disponibles |
| Ventas | Ventas · Ganancias por artículo («Ganancias») · Ganancias por día · Ventas por empleado · Ventas por cliente | ventas y notas de crédito que ya carga Reportes (`pos_ventas`, `pos_venta_items`, `pos_devoluciones`) |
| Compras y despachos | Compras · Recepciones · Despachos · Despachos por almacén | `pos_compras` (+items), `pos_transferencias` (+items) |

Reglas: el costo de la ganancia es el **guardado en la venta** (`costo_unitario`) y, si no lo tiene, el costo actual; las notas de crédito se restan
(en «Ventas» pegadas a su factura; en ganancias por día, el día de la nota); «Ventas por empleado» usa el vendedor y, si no hay, quien registró;
las compras anuladas no cuentan.

## No se pudo (NEXUS no tiene ese módulo o no guarda el dato)
- **Faltante Orden Compra, Requisiciones Pendientes, Solicitudes Inventario**: no hay órdenes de compra ni requisiciones.
- **Activos Fijos**: no hay módulo de activos.
- **Cambio Precios**: no se guarda historial de precios.
- **Agregar Costo**: no se identificó qué muestra en Infoplus (pendiente de que el dueño lo describa).
- **Historial Seriales**: ya existía (botón «Historial de IMEI» en Reportes); no se duplicó.

## Límite conocido (ya existía)
Reportes carga hasta 2,000 ventas y 20,000 renglones; con más historial, los reportes de ventas se quedan cortos. Pendiente: pedir por rango de fechas.

## Pruebas
- Nueva `scripts/qa-pos-reportes-mas.mjs` **34/34**; `qa-pos-reportes-inventario` 34/34; devolucion-muse 26, negocio 26, fase1 36, variantes 18.
