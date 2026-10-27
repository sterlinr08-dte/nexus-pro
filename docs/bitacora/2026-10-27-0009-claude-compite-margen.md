# 2026-10-27 00:09 RD — Claude — POS: «Margen por producto» (herramienta 1 de 5 para competir en precio)

## Solicitud del dueño
Herramientas **legales** para que los clientes del POS compitan en precio contra negocios informales que no pagan
impuestos. Esta entrega es la herramienta 1: **reporte de margen por producto**, para saber cuánto puede bajar cada
precio sin perder dinero. Trabajo en paralelo con otros 4 agentes sobre `parches-pos.js`, por eso va en capa aparte.

## Qué hace
En **POS → Reportes** aparece el botón «Margen por producto» (solo admin/gerente: mismo `puedeVerMin()` que ya
protege el precio mínimo). Abre una ventana de solo lectura con cada artículo activo de `pos_productos`:

- precio de venta (con ITBIS o exento), costo;
- **gana por unidad** sin ITBIS = precio ÷ 1.18 − costo (exento: precio − costo);
- **margen** = esa ganancia ÷ precio sin ITBIS;
- **precio piso** = costo × 1.18 (exento: costo) — lo menos que se puede cobrar, ITBIS incluido, sin perder;
- frase: «Puede bajar hasta RD$ X (RD$ Y menos)», «Le faltan RD$ Y para no perder» o «Cargue el costo…»;
- **vendidas y ganancia de los últimos 30 días** (`pos_ventas` con `estado=completada` y sin `anulada`, más sus
  `pos_venta_items`; ganancia = importe sin ITBIS − costo actual × cantidad, la misma fórmula de Reportes);
- etiqueta: «Puede bajar precio» (margen ≥ 10 %), «Margen justo» (< 10 %), «Vende con pérdida», «Sin costo: no se
  puede calcular»;
- filtros: buscar, categoría, «Margen bajo (<10 %)» (incluye los que pierden), «Sin costo cargado»;
- orden por ganancia del mes; resumen arriba (artículos, ganancia 30 días, con pérdida, sin costo).

Ningún precio se cambia desde aquí. No escribe en la base.

## Archivos
- `parches-pos-margen.js` (nuevo): toda la herramienta. El botón se agrega solo a la barra de Reportes con un
  `MutationObserver` sobre `#v-pos` (no se tocó la barra de Reportes en `parches-pos.js`). Apagar:
  `localStorage.nx_pos_margen_off='1'`.
- `parches-pos.js`: **un solo gancho** de 2 líneas junto a `puedeVerCosto360()`:
  `window.__nxPosMargenCtx = { prods, cats, puedeVer, api }` (lectura de `_prods`, `_cats`, `puedeVerMin()` y la API).
- `index.html`: carga `parches-pos-margen.js` después de `parches-pos-stitch-visual.js`.
- `scripts/qa-pos-margen.mjs` (nuevo): prueba Playwright con la REST de Supabase simulada.

Sin migraciones, RPC, triggers ni Edge Functions. `APP_VERSION` no se subió.

## Diseño
Ventana de vidrio (radio 20) en la PC; en el celular ocupa la pantalla con `safe-area`. Botones y chips de 44 px,
campos de 48 px con letra de 16 px, números `tabular-nums`, sin mayúsculas forzadas (la app pone mayúsculas
globales: la capa las anula solo dentro de `#nxMargenM`). Modo oscuro (`html.tema-glass-oscuro` y
`body.tema-premium`) por variables. En el celular cada artículo es una tarjeta de 2 columnas; en la PC, tabla.
Las clases de estado llevan prefijo (`nxMg-s-*`) porque `.av` choca con un estilo global.

## Pruebas
Servidor local en el puerto 8951 (para no chocar con otros agentes), `QA_BASE=http://127.0.0.1:8951`.
- `scripts/qa-pos-margen.mjs`: **88 pasaron, 0 fallaron** — cálculos con datos conocidos (11,800 con ITBIS y costo
  6,000 → gana 4,000, 40 %, piso 7,080, puede bajar 4,720; 1,180/950 → 5 %, piso 1,121; exento 500/600 → pierde 100;
  sin costo; exento 2,000/1,500 → piso 1,500), la venta anulada y la de hace 40 días no cuentan, resumen 8,050,
  filtros, 390 y 1280 px en claro y oscuro, todo ≥ 44 px, campos 48/16, sin scroll horizontal, no escribe en la base,
  Esc cierra, cajero no lo ve, apagable, 0 errores de JS.
- `scripts/qa-pos-cubre6.mjs`: 14 pasaron, 0 fallaron.
- `scripts/qa-ecf-caja.mjs`: 59 pasaron, 0 fallaron.

## Rama
`claude/compite-1-margen` (sale de `claude/pos-descuento-itbis`). Sin PR, sin publicar.

## Riesgos / pendientes
- Usa el **costo actual** del artículo para la ganancia de 30 días (igual que Reportes); si el costo cambió en el
  mes, la cifra es estimada. Las devoluciones/notas de crédito no se restan (Reportes tampoco).
- ITBIS fijo de 18 % (el POS no maneja otra tasa por artículo).
- Al unirse con las otras 4 ramas, revisar que el gancho `__nxPosMargenCtx` siga junto a `puedeVerCosto360()`.

## Siguiente paso
Que el dueño lo vea en la rama; si lo aprueba, unir con las otras herramientas y publicar cuando diga «publícalo».
