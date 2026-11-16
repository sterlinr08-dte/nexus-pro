# POS — tallas y colores (16-nov-2026)

**Pedido:** Boutique Aura no tenía tallas ni colores en la ficha del artículo. Rama `claude/pos-variantes`, build **6050**, **sin publicar**.

## Diseño
- Cada combinación talla/color es **un artículo propio** (su código, existencia y kardex), unidos por `variante_grupo`.
  Ventas, compras, devoluciones, inventario y contabilidad funcionan igual que con cualquier artículo: no hay lógica nueva de stock.
- Ficha nueva: campos «Tallas» y «Colores» (separados por coma, máx. 12 cada uno, sin repetidos) → cuadrícula con la existencia de cada
  combinación (filas 48 px, letra 16 px). Al guardar crea «Nombre · Talla · Color», código `BASE-01…`, y entra la existencia como
  «apertura» (con su asiento de inventario inicial). «Stock inicial» se apaga mientras haya tallas/colores.
- Al editar un artículo con talla/color se pueden corregir esos dos campos.
- Los asientos de inventario inicial ahora salen uno tras otro (`_asInvCola`) para no pelear por el número.
- Los niveles de precio del borrador no se copian a las variantes (se ponen después en cada una).

## Base de datos
- Migración `20261116030000_pos_productos_variantes.sql` **aplicada**: columnas `talla`, `color`, `variante_grupo` + índice. Solo agrega.

## Pruebas
- Nueva `scripts/qa-pos-variantes.mjs` **16/16** (390 y 1280). aura-contable 14, devolucion-muse 26, negocio 26, fase1 36, compra-segura 50, volumen 51.
- `qa-pos-margen`: 84 pasan / 4 fallan **también en main** (son del tema oscuro, que el dueño quitó en tiendas el 15-nov); no es de este cambio.

## Pendiente de esta parte
- Vista agrupada por modelo en Inventario y selector talla/color al vender (hoy cada variante sale como su propia fila).
- En espera por la ventana de confirmación de la base: botón «Borrar» del panel (`claude/pos-borrar-registro`) y proveedores/ventas de la demo.
