# Un solo buscador de artículos: el de Factura/Prefactura (build 6056) — Claude

## Pedido del dueño
«La ventana de buscador de artículos que todas sean iguales a la de prefactura y factura.»

## Qué se hizo
- El buscador de Factura/Prefactura (`nxProdPicker`) ahora sirve también para otras pantallas. Cada una reserva su lugar con `artPickerSlot(slot, {fn, costo, lista, label, txt})`. El botón abre el mismo panel en ese lugar: «Buscar artículo», campo de búsqueda, tarjetas con código, existencia y precio, y al tocar una el detalle con existencia por almacén y «Elegir». Al elegir se llama a la función de la pantalla y el panel vuelve a su botón.
- Pantallas que lo usan ahora: **Compras, Órdenes de compra, Pedidos entre almacenes, Transferencias, Cotización, Kardex y Agregar costo**. Antes cada una tenía su propio buscador: la lista nativa del navegador, o en Compras una ventana distinta.
- En compras e inventario se muestra el **costo** («Costo» y «Precio de venta» en el detalle). En Cotización, que es un documento de venta, se muestra el precio, como en Factura.
- Factura, Prefactura y Vender quedan igual que antes.
- Quitado el buscador provisional de la entrada anterior (`2026-11-16-…-claude-pos-oc-arreglos-muse.md`) y las listas nativas que ya no se usan.
- Agregar costo: el buscador va en un bloque y no dentro de `<label>`; dentro de una etiqueta, tocar una fila activaba el botón «Cerrar».
- El botón del buscador mide 48 px fijos en todas las pantallas.

## Sigue de la entrada anterior (mismo build 6056)
- La base ya acepta proveedores tipo entidad en órdenes (aplicado).
- Los totales de la orden cambian mientras se escribe; el proveedor y la fecha van uno debajo del otro.

## Pruebas
- Nueva `qa-pos-buscador-unico`: 14/14 (Compras, Cotización con precio, Transferencias, Kardex, botón ≥48 px, 0 errores) a 390 y 1280 px.
- `qa-pos-ordenes-compra` 66/66 (390, 880 y 1280); `qa-pos-precios-activos` 44/44 (Agregar costo con el buscador nuevo).
- El resto de pruebas POS en verde: prefactura 18, vender-toque 24, pedidos 28, compra-segura 50, empresas 76, fidelidad 62, volumen 51, fase1 36, etc. `qa-pos-margen` mantiene los 4 fallos de tema oscuro que ya fallaban en main.

## Estado
Rama `claude/pos-oc-arreglos`, sin publicar. Espera «Publícalo».
