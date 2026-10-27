# 2026-10-27 00:16 (RD) — Claude — Caja: precios por cantidad («desde 2 unidades a RD$ X c/u»)

## Pedido del dueño
Herramientas legales para que los clientes del POS compitan en precio contra negocios informales. Esta entrega (agente 2 de 5): **precios por volumen**.

## Auditoría (qué ya existía)
- `_niveles` / `_prodNiveles` (`pos_niveles_precio`, `pos_producto_niveles`): precio por **nivel del cliente** (Detalle, Mayorista…), con `precio_contado`, `precio_credito`, `precio_minimo` y `cantidad_minima`.
- `cantMinimaDe(p)`: solo se usa como aviso de «cantidad mínima del nivel»; **no cambia el precio por cantidad**.
- `precio_mayor`: precio fijo del cliente marcado «por mayor», no depende de la cantidad.
- `precio_minimo` / `minimoDe(p)`: piso de negociación.
- Conclusión: no había escalas por cantidad en la misma venta. Se construye aparte, **encima** del precio del nivel (la escala solo aplica si es más barata que el precio que ya le toca al cliente) y respetando `minimoDe(p)`.
- Ninguna columna JSON existente sirve (`combo_items` es otra cosa) → se propone una columna nueva.

## Qué se hizo
- **Capa nueva `parches-pos-volumen.js`**, cargada desde `index.html` justo después de `parches-pos.js`. Apagable con `localStorage.nx_pos_volumen_off='1'`.
- **Ganchos mínimos en `parches-pos.js`** (12 líneas): `window.__nxPosVolApi`, `volAjustar()` al inicio de `pintarFactura()` y `pintarCarrito()`, `volLinea()` en la línea de Factura y del carrito de Vender, `it.precioManual = true` en `nxFacPrecio`, `nxPosVolBody()` en `nxPfLeerProd`, `nxPosVolValidar()` en `nxPfValidarAntesDeGuardar`, `nxPosVolFicha()` al final de `abrirProd`.
- **Ficha del artículo → «Precios y Niveles» → tarjeta «Precio por cantidad»**: filas «Desde [N] unidades · RD$ [X] c/u», agregar/quitar. Validación en vivo y al guardar: cantidad ≥ 2, sin repetir, **nunca debajo del costo con ITBIS** (costo × 1.18 si lleva ITBIS), **nunca debajo del precio mínimo**, menor que el precio normal, y a más cantidad el precio no sube.
- **Caja (Factura, Prefactura y Vender)**: al cambiar la cantidad, el precio de la línea baja solo a la escala que toca y se lee «Precio por cantidad (desde N)» (en Vender, «Desde N u.»). Al bajar la cantidad vuelve al precio anterior. Si el cajero cambió el precio a mano, se respeta. «Cubrir 6 % del ITBIS» y el descuento por línea se aplican **encima** del precio por cantidad (el ITBIS se calcula igual que siempre sobre el importe final).
- **Sugerencia**: botón «Lleve 1 más y paga RD$ X c/u» (44 px) cuando a la línea le falta 1 unidad para la siguiente escala; al tocarlo suma 1 (respeta el stock).
- Interfaz: usted, sin mayúsculas forzadas, campos 48 px / 16 px, `tabular-nums`, toques ≥ 44 px, modo oscuro (la ficha y el carrito se oscurecen; la hoja de la factura sigue blanca como en todos los temas). Estilos en `style#nxPosVolCSS`, solo clases nuevas `.nxVol*` (sin FOUC).

## Base de datos
- **No se tocó Supabase ni se aplicó SQL.**
- Propuesta SIN aplicar: `supabase/migrations/20261027100000_pos_precio_volumen_PROPUESTA.sql` → `pos_productos.precio_volumen jsonb` (`[{desde, precio}]`) + check de arreglo. Hereda la RLS por organización de `pos_productos` y viaja en el `select=*` que la caja ya hace (cero consultas nuevas).
- Mientras la columna no exista: la tarjeta muestra el aviso «Esta función todavía no está activada…», no se envía el campo al guardar y la caja vende igual que antes.
- Ojo: el archivo está en `supabase/migrations/`; si alguien corre `supabase db push` se aplicaría. Es idempotente y reversible (`drop column if exists precio_volumen`), pero requiere el OK del dueño.

## Archivos
- `parches-pos-volumen.js` (nuevo), `parches-pos.js` (ganchos), `index.html` (carga de la capa), `scripts/qa-pos-volumen.mjs` (nuevo), la migración propuesta y esta bitácora. **No se subió `APP_VERSION`.**

## Pruebas (Playwright, REST simulada; 390 y 1280 px)
- `qa-pos-volumen.mjs`: **51 pasaron, 0 fallaron** — escalas al subir/bajar cantidad, sugerencia (≥ 44 px), precio manual respetado, escala + Cubrir 6 % (400 → 380), + 10 % de descuento (342), venta guardada (precio 80 × 5, descuento 20, importe 380, total 1,380), Vender, ficha (campos 48/16, tabular-nums, botones ≥ 44), aviso bajo costo con ITBIS y bloqueo al guardar, guardado en `precio_volumen`, base sin la columna (aviso, no envía el campo, caja normal), interruptor de apagado, 0 errores JS.
- `qa-pos-cubre6.mjs`: 14/0. `qa-ecf-caja.mjs`: 59/0.

## Rama / publicación
- Rama `claude/compite-2-volumen` (desde `origin/claude/pos-descuento-itbis`). Sin PR, sin publicar, `main` intacto.

## Pendientes / riesgos
- Aplicar la migración propuesta (con OK del dueño) para que la tarjeta se active.
- Las cotizaciones y prefacturas restauradas toman el precio guardado como base; si la cantidad llega a una escala más barata, la escala se aplica.
- Si el cajero cambia el precio a mano, la línea deja de seguir las escalas hasta quitarla y volver a agregarla.
- Escala + Cubrir 6 % puede dejar el neto debajo del costo; lo avisa la tarjeta inteligente de la factura (ya existente).
