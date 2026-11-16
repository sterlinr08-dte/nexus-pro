# POS — correcciones de Boutique Aura (16-nov-2026)

**Pedido:** el dueño hizo el ciclo completo en la empresa real Boutique Aura y pasó lo que falló. Rama `claude/pos-aura-contable`, build **6049**, **sin publicar**.

## Ya resuelto en 6048 (publicado antes)
Fecha de la NC y de asientos «14/11 20:00»; asiento de devolución «Nota de crédito» a 2105 (no Caja); Inicio y Reportes restan la NC;
la venta queda marcada «DEV. PARCIAL/DEVUELTA» en Historial y su ticket; estrella, tarjetas de Inicio, menú, aviso del carrito, carga.

## Nuevo en esta rama (`parches-pos.js`)
| Hallazgo | Causa | Arreglo |
|---|---|---|
| Venta y compra con el mismo AS-00001 | La compra v2 numera su asiento en el servidor; `nextSeq()` usaba el contador en memoria | `nextSeq` lee `proximo` real y reserva con PATCH condicionado `proximo=eq.N` (reintenta si otro lo tomó) — vale para todas las secuencias |
| Caja ignora la compra de contado | Nadie registraba la salida | Compra de contado con caja abierta → `pos_caja_movimientos` salida «Compra No. X» |
| Inventario RD$550 en el Balance vs RD$15,050 real | Existencia inicial y ajustes nunca se asentaban | `moverStock` apertura → Debe 1104 / Haber 3101; ajuste + → 1104/4102; ajuste − → 6104/1104 (a costo). **No es retroactivo** |
| Resumen «VENTA RD$2,600» | Sumaba todo el Debe (incluye 5101/1104) | Monto del documento: sin el par costo/inventario en venta, devolución y anulación |
| No se puede crear categoría | Solo se creaba desde Inventario → Categorías | Opción «+ Nueva categoría…» en la ficha del artículo |

## No tocado (datos reales, sin autorización)
- La caja de Boutique Aura sigue ABIERTA y sus asientos viejos (AS-00001 repetido, inventario inicial sin asiento) siguen igual.
- Fondo de caja RD$1,000 sin asiento: se resolverá con «saldos de apertura» (pantallas de contabilidad, con Fable).

## Pendiente
- Tallas/colores (variantes), 5 reportes de inventario estilo Infoplus, e-CF allowlist, demo.nexusprord.com, proveedores y ventas de ejemplo en la demo.

## Pruebas
- Nueva `scripts/qa-pos-aura-contable.mjs` **14/14**; `qa-pos-devolucion-muse` 26/26 y las existentes en verde.
