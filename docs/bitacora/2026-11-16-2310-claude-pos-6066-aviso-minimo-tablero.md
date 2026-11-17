# 17-nov-2026 — Claude — POS 6066: texto del aviso de mínimo y tablero al día tras vender

## Pedido
Muse probó la 6065 con el Café molido (mínimo RD$240), como gerente. Los 3 puntos funcionan: vendió a RD$200 y se guardó la factura CO00000005. Reportó 2 detalles menores:
1. El aviso en línea decía «ESTÁ DEBAJO DEL MÍNIMO MÍNIMO RD$ 240.00». El título terminaba en «mínimo» y el subtítulo empezaba con «Mínimo».
2. Justo después de la venta, los indicadores del tablero de Inicio seguían con los valores anteriores hasta refrescar.

## Diagnóstico
1. La sugerencia de `parches-pos.js` (línea ~1676) usaba `t: '<artículo> está debajo del mínimo'` y `s: 'Mínimo RD$ X · puesto RD$ Y'`.
2. `_dashKPI` solo se recargaba al entrar a Inicio (y cada 30 s estando allí). Por eso, después de vender, Inicio pintaba primero los números viejos.

## Cambios (`parches-pos.js`)
1. El título ahora es «Precio bajo: <artículo>». El subtítulo sigue igual («Mínimo RD$ X · puesto RD$ Y») y el botón «Poner RD$ X» también.
2. Después de cada venta registrada (junto a `postAsientoVenta`) se llama `cargarDashKPI()` en segundo plano. Si se está en Inicio, se repinta.
- `parches-seguros.js`: `b=6065` → `b=6066`.

## Pruebas
- `qa-pos-cubre6`: 18/18. Prueba nueva: después de la venta hay un GET a `pos_ventas` (la recarga del tablero), a 390 y 1280 px. Sin el cambio, esa prueba **falla** (0 GET); con el cambio pasa.
- En verde: `volumen`, `fase1`, `cobro-caja`, `inicio-arqueo`, `apartar`, `itbis-linea` y `prefactura-bayol` (119).
- `margen`: 84/4, las mismas 4 fallas de siempre.

## Estado
- Rama `claude/pos-aviso-minimo-tablero`. Sin publicar.
