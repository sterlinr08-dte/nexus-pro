# POS — 5 reportes de inventario estilo Infoplus (16-nov-2026)

**Pedido:** el dueño revisó Infoplus (BAYOL CELL SRL) y pidió replicar primero los 5 reportes de inventario principales (hay 24).
Rama `claude/pos-reportes-inventario`, build **6051**, **sin publicar**.

## Dónde
Reportes → botón **«Reportes de inventario»** → 5 pestañas. Cada una con filtros, «Excel (CSV)» e «Imprimir». Solo leen; no guardan nada.

| Reporte | Columnas | Filtros | Fuente |
|---|---|---|---|
| Resumen (valorizado) | Código, Referencia, Descripción, Existencia, Costo actual, Costo total; por categoría con subtotales y total general | Almacén (si hay más de uno), categoría, marca, ordenar por, buscar, «Solo con existencia» | `pos_productos` (+ `pos_stock_almacen` por almacén) |
| Existencia baja | Código, Descripción, Referencia, Existencia, Mínimo, Falta, Categoría | Almacén, categoría, marca, orden, buscar | `stock_min` |
| Movimientos (fichero) | Fecha, Artículo, Documento, Movimiento, Descripción, Usuario, Entrada, Salida, Existencia | Desde/hasta, tipo de movimiento, categoría, marca, buscar | `pos_inv_movimientos` por rango de fechas (día de RD), paginado |
| Sin movimiento | Igual que Resumen; «Dinero parado» | 30/60/90 días o 6 meses, almacén, categoría, marca | Con existencia y sin movimientos en el período |
| Ajustes | Fecha, Artículo, Documento, Motivo, Usuario, Cantidad, Valor a costo; grupos Entrada / Inventario inicial / Salida | Desde/hasta, categoría, marca | movimientos `ajuste` y `apertura` |

## Diferencias con Infoplus (no hay el dato en NEXUS)
- Sin columnas **Máximo** ni **Unidad** (el artículo no las tiene); se agregó «Falta» (mínimo − existencia).
- Sin **Precio** ni **Sujeto** (cliente/proveedor) en Movimientos: el kardex no los guarda; va el usuario que hizo el movimiento.
- Sin **subcategoría** ni «tipo de inventario». Los movimientos no guardan almacén: el filtro de almacén aplica a existencias, no a Movimientos/Ajustes.
- El valor de Ajustes usa el costo **actual** del artículo (el kardex no guarda el costo del momento).

## Pruebas
- Nueva `scripts/qa-pos-reportes-inventario.mjs` **34/34** (390 y 1280): totales, subtotales, filtros, CSV, impresión, 0 escrituras, pestañas ≥44 px, filtros 48/16.
- devolucion-muse 26, negocio 26, fase1 36, variantes 18, aura-contable 14, cubre6 14.
- En 390 px la tabla se desliza de lado para ver las columnas de costo.

## Siguen los otros 19 de Infoplus
Compras, Ganancias, Ventas (CSV), Despachos, Recepciones, Despachos Almacén, Historial Seriales, Inventario Físico, Faltante Orden Compra, Precios,
Requisiciones Pendientes, Activos Fijos, Ganancias por Día, Series No Vendidas, Solicitudes Inventario, Ventas por Empleado, Cambio Precios, Ventas por Clientes, Agregar Costo.
