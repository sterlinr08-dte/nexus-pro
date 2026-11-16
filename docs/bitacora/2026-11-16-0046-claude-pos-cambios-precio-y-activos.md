# POS — Cambios de precio y Activos fijos (16-nov-2026)

**Pedido:** el dueño pidió los 6 reportes de Infoplus que faltaban. Esta es la etapa 1 (2 de 6). Rama `claude/pos-precios-activos`, build **6053**, **sin publicar**.

## Base de datos (aplicada: `20261116050000_pos_precio_historial_y_activos.sql`)
- `pos_precio_historial`: lo escribe **solo** un disparador en `pos_productos` cuando cambia precio, precio por mayor, precio mínimo o costo
  (guarda antes, ahora, usuario y fecha). Los usuarios solo pueden leer lo de su empresa; nadie lo edita.
- `pos_activos_fijos`: lee cualquier usuario de la empresa; crea y edita solo admin o gerente; no hay permiso de borrar (se da de baja).
- Sin borrado en cascada ni `drop`: son tablas nuevas y la migración solo agrega.
- Ensayo con vuelta atrás antes de aplicar: el gerente de la demo cambió precio 25→30 y costo 14→15 → 2 filas con su nombre; cambiar nombre o
  stock no registra; el usuario no pudo insertar ni editar el historial; el activo tomó la empresa sola; la cajera de otra empresa vio 0 filas
  y no pudo crear activos; `anon` sin acceso.

## Pantalla (Reportes → «Inventario, ventas y compras»)
- Inventario → **Cambios de precio**: Fecha, Código, Artículo, Qué cambió, Antes, Ahora, Cambio %, Usuario; filtros de fechas, «Qué cambió»,
  categoría, marca y buscar. Empieza a registrar desde hoy (no hay historial anterior).
- Nuevo grupo **Activos fijos**: lista por categoría con Costo, Uso (meses), Depreciación acumulada y Valor en libros; botón «+ Activo»;
  tocar una fila abre la ficha (campos 48 px / 16 px, botón 54 px) con «Dar de baja» / «Reactivar». Los de baja no suman.
- Depreciación en línea recta, **solo informativa: no crea asientos contables**.

## Pendiente de los 6
- Etapa 2: órdenes de compra (→ «Faltante orden compra») y requisiciones / solicitudes entre almacenes.
- «Agregar Costo»: el dueño debe decir qué muestra en Infoplus.

## Pruebas
- Nueva `scripts/qa-pos-precios-activos.mjs` **24/24** (390 y 1280). reportes-mas 34, reportes-inventario 34, devolucion-muse 26, negocio 26, fase1 36, variantes 18.
