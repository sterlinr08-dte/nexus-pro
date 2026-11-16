# Versión visible, pie de fichas a 48 px y Reportes sin tope de 2,000 ventas (build 6058) — Claude

## Pedido del dueño
«1 y 2 y 3»: 1) número de versión visible (Muse no podía confirmarla), 2) botones del pie de 44 a 48 px, 3) Reportes por fechas sin el tope de 2,000 ventas.

## 1. Versión visible
- `parches-seguros.js` publica `window.NX_BUILD`, que sale de la misma línea `b=NNNN` que ya se cambia en cada entrega (no hay otro número que mantener).
- `parches-pos.js`: pie del menú del POS → «Versión 6058», debajo de «Cerrar sesión».

## 2. Pie de fichas a 48 px
- Causa (medida en vivo): la capa de espaciado de formularios de `index.html` (`nx-fesp`) pone `height:auto` y `min-height:44px` con `!important` a todos los botones de `#nxPosProd`, `#nxEntForm`, `#nxCotForm`, `#nxCrmForm`, `#nxRepM`, `#nxApaM` y `#nxPfNivelM`; eso tapaba los 48 de `parches-pos.js`.
- Arreglo en esa misma capa, justo debajo de la regla del botón principal: los botones secundarios del pie (`.footbar .ab:not(.g1)`) quedan en `min-height:48px`. Se apaga con la misma capa (`nx_fesp_off`).
- Medido: Cancelar 48, Guardar y nuevo 48, Guardar artículo 54, a 390 y 1280 px.

## 3. Reportes sin tope
- Antes: `pos_ventas … limit=2000` (las últimas 2,000), renglones `limit=20000` y notas de crédito `limit=2000`. Un rango viejo o una tienda grande salía incompleto sin aviso.
- Ahora `cargarReportes(desde, hasta, forzar)`:
  - trae solo el rango pedido, por la fecha de la venta (o la de creación si no tiene), en páginas de 1,000, sin tope;
  - trae los renglones en la misma consulta (`pos_venta_items(*)`, la relación existe en la base) y las notas de crédito de esas ventas en trozos;
  - recuerda el rango ya cargado: si se pide uno más viejo, recarga; si ya está, no repite;
  - siempre incluye los últimos 30 días, que usa la IA.
- Quién la llama:
  - Reportes la llama al abrir (recarga siempre) y al cambiar fechas;
  - el grupo Ventas de «Inventario, ventas y compras» la llama con sus propias fechas.
- Verificado en la base real (demo, solo lectura): la consulta con el filtro de fechas y los renglones incluidos responde bien (la demo no tiene ventas completadas, por eso devuelve 0).

## Pruebas
- Nueva `qa-pos-reportes-rango` 14/14:
  - versión en el menú;
  - 2,500 ventas en páginas (offset 2000), ninguna con `limit=2000`;
  - filtro de fechas;
  - el reporte de Ventas cuenta 2,500 por RD$250,000;
  - una fecha más vieja recarga;
  - pie 48/48/54;
  - 0 errores.
- Todas las pruebas POS en verde (26 archivos). `qa-pos-margen` mantiene sus 4 fallos de tema oscuro, que ya fallaban en main.

## Estado
Rama `claude/pos-version-pie-reportes`, sin publicar. Espera «Publícalo».
