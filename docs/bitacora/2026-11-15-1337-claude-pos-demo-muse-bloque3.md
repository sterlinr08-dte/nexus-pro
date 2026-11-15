# 15-nov-2026 — Claude — Demo del POS, bloque 3 de los hallazgos de Muse (rama, sin publicar)

Bloque 2 publicado con el PR #480 (build 6041, verificado en vivo).

## Cambios en `parches-pos.js` (build 6042)
- **3 — Caja cerrada:** al abrir el cobro (`nxPosCobrar`) se revisa la caja (memoria y, si no hay, el servidor). Si está cerrada aparece arriba el aviso «Caja cerrada · Ábrala para cobrar en efectivo» con campo «Fondo inicial» y botón «Abrir caja» (`rpc/pos_abrir_mi_caja`, la misma que usa la pantalla Caja). Al abrirla el aviso se quita y el cobro sigue abierto con la venta. La revisión del último paso (`nxPosConfirmar`) se mantiene como candado.
- **4 — ITBIS explicado:** `montoExento()`; chip «Exento» en cada línea sin ITBIS (Vender y Factura); fila «Exento de ITBIS» en los totales cuando hay mezcla; en el cobro, bajo el total: «Incluye ITBIS RD$ X · Exento RD$ Y».
- Tamaños: botón 48 px, campo 48/16. Detalle corregido en la captura: a 390 px el botón «Abrir caja» se salía por la derecha (rejilla en vez de flex).

## Pruebas
`scripts/qa-pos-cobro-caja.mjs` 22/22 a 390 y 1280 px (base simulada; caja cerrada y abierta; agua gravada RD$25 + arroz exento RD$185 → «Incluye ITBIS RD$ 4 · Exento RD$ 185», igual al caso de Muse). Regresión: negocio 26, fase1 36, compra-segura 50, ecf-caja 59, cubre6 14.

## No probado
Abrir la caja desde el cobro contra la base real (la caja de la demo quedó abierta por la prueba de Muse; esta noche se limpia).
