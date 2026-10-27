# Caja: botón «Cubrir 6 % del ITBIS» (59.65)

**Pedido del dueño**
- «Un cliente me comentó… él va asumir el 6 y el cliente un 12. ¿Podemos hacer eso?» → «Sí, agrega el botón del descuento».

**Regla**
- La tasa del ITBIS es 18 % y no se puede facturar al 12 %: la DGII lo rechaza.
- Lo que se hace es un **descuento en el precio** para que el cliente pague lo mismo que con 12 %. El ITBIS sigue en 18 %, pero sobre el precio rebajado.

## Cómo funciona (`parches-pos.js`)
- **Botón:** está debajo de «ITBIS (18%)» en la factura. Mide 44–48 px. Se apaga con un segundo toque. Tiene `aria-pressed`.
- **Cálculo:** cada línea con ITBIS que permite descuento lleva `it.cubre6`. `lineDescMonto` le suma `(importe − descuento previo) × (1 − 1.12/1.18)`, es decir 5.08 % sobre el precio con ITBIS, encima del descuento que ya tuviera.
- **Artículos que no cambian:** los exentos y los marcados «no permite descuento». El aviso dice cuántos quedaron fuera.
- **Al guardar:** la venta guarda el descuento en cada línea (`descuento`/`importe`), igual que cualquier descuento. La factura electrónica lo reparte con `_doc.ts` sin cambios.
- **Ejemplo:** 11,800 → 11,200. ITBIS 1,708. Descuento 600.

## Pruebas
- `scripts/qa-pos-cubre6.mjs` (nueva): **14/14** a 390 y 1280 px. Cubre el total, el ITBIS, exentos y «no permite descuento», el apagado y la venta guardada con descuento 600 en la línea.
- `qa-ecf-caja.mjs`: 59/59.

**Rama:** `claude/pos-descuento-itbis`. Sin publicar.
