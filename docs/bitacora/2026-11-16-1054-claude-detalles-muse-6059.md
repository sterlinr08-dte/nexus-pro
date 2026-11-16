# Detalles de la prueba de Muse a la 6058 (build 6059) — Claude

## Prueba de Muse (6058)
Todo lo pedido funcionó:
- la versión visible;
- el pie de la ficha a 48 px;
- Reportes por fechas: 3 ventas por RD$425, un año atrás igual, octubre vacío, y el reporte «Ventas» igual;
- la NC resta en neto y marca la factura DEVUELTO.

Anotó 4 detalles menores; verificados contra el código:

| Detalle | ¿Real? | Arreglo |
|---|---|---|
| No se podía teclear el año en «Desde» (quedaba 0002/0001) | Sí: cada dígito disparaba `onchange` con una fecha válida («0002-11-16») que recargaba y repintaba la pantalla | `nxRepRango` y `nxRepInvSet` ignoran fechas incompletas o anteriores a 1990 |
| Ticket promedio sin centavos (RD$142 por 141.67) | Sí: `Math.round` | `r2` |
| Cantidad tecleada en Venta rápida no recalcula hasta «+» | Sí: solo `onchange` (al salir del campo) | `nxPosQtyVivo`: aplica 450 ms después de dejar de escribir, repinta y deja el cursor en el campo. Antes de repintar se le quita el `onchange` al campo viejo para que el repintado no dispare un segundo cambio |
| «Nota de crédito» en el desplegable solo con selección directa | No: es un `<select>` nativo; es cosa de la herramienta de Muse | — |

## Pruebas
- `qa-pos-reportes-rango` 20/20: año a medio escribir no recarga, ticket con centavos 99.98, cantidad 4 → RD$120 sin «+» y cursor en el campo, 0 errores.
- Todas las pruebas POS (26) en verde; `margen` mantiene sus 4 fallos de tema oscuro, que ya fallaban en main.

## Estado
Rama `claude/pos-detalles-muse`, sin publicar. Espera «Publícalo».
