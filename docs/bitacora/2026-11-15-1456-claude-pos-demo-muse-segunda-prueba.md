# 15-nov-2026 — Claude — Segunda prueba de Muse en la demo y 3 correcciones (rama, sin publicar)

## Lo que Muse confirmó en vivo (venta CO00000003, RD$210: Agua RD$25 gravada + Arroz RD$185 exento, efectivo)
- Bloque 4: existencia visible en la lista (500 px y normal); un toque agrega al carrito.
- Bloque 3: aviso de caja cerrada con «Abrir caja» en el cobro (lo usó y abrió); Exento/ITBIS explicados en el cobro.
- Bloque 2: un solo número; la venta sale al instante en «Últimas ventas»; la existencia baja al instante.

## Lo que faltaba y causa encontrada
1. **Ticket y factura carta sin marca por línea de ITBIS/exento.** Corregido: cuando la venta mezcla gravados y exentos, cada línea lleva (G)/(E) en el ticket y G/E en la carta, más «Exento de ITBIS RD$ X» y la leyenda. Si todo es gravado, el documento queda como siempre. En la carta se pasa `itbis` de cada línea (`docFacturaHTML`, desde el carrito y desde la venta guardada).
2. **«Últimas ventas» solo mostraba la venta de la sesión.** Causa: `_ventas` solo se cargaba al abrir el Historial; al entrar, el Inicio no tenía las ventas del día (las ventas de Muse de 12:14 y 14:14 eran de otra caja, pero eso no influía: tampoco hubieran salido de la misma caja). Además el «desde hoy» de `cargarDashKPI` comparaba la medianoche como UTC. Corregido: `cargarDashKPI` pide las ventas completas desde la medianoche LOCAL (ISO con zona) y las une a `_ventas`.
3. **Arqueo: «Descuadre RD$0.00» al abrir con contado 0 y esperado RD$235.** Causa: el descuadre solo se calculaba al escribir. Corregido: `nxPosCierreCalc()` corre al abrir la ventana. (Lo registrado al confirmar ya era correcto: −RD$235.)

## Pruebas
- `scripts/qa-pos-itbis-linea.mjs` 11/11 (390 y 1280 px; caso solo-gravados sin marcas).
- `scripts/qa-pos-inicio-arqueo.mjs` 12/12; **sin el arreglo** falla 8/12 con lo mismo que vio Muse («Sin ventas hoy todavía», «RD$ 0» en verde).
- Regresión: negocio 26, prefactura 18, contabilidad 8, fase1 36, fase2 11, compra-segura 50, ecf-caja 59, cubre6 14, volumen 51, cobro-caja 22, vender-toque 24.

Build 6044.
