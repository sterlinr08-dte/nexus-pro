# 19-Nov-2026 08:07 (RD) — Claude — «No se pudo cargar · Reintentar» en vez de «No hay…» o RD$ 0 (6073)

## Pedido
- Tercer punto de la auditoría de «cargando» (PR #536). El dueño eligió «Las 3».
- Cuando falla la carga, algunas pantallas mostraban «No hay pagos pendientes», RD$ 0 o «Aún no hay facturas… use Generar» como si fuera cierto.

## Cambios (solo pantalla; sin tocar servidor, RPC ni datos)
- **Carga general** (`index.html`, `cargarTodo`):
  - si falla, marca `window.__nxCargaFallo` y deja un aviso fijo `#nxCargaFallo` debajo de la barra superior: «No se pudieron cargar los datos · Reintentar»;
  - «Reintentar» vuelve a llamar `cargarTodo()`, y el aviso se quita al cargar bien.
- **Facturas y Cobros** (`parches-facturas-cobros-ui.js`):
  - con la carga general fallida, el vacío dice «No se pudieron cargar los datos · Reintentar»;
  - ya no dice «Aún no hay facturas… use Generar» ni «No hay clientes activos».
- **Solicitudes** (`parches-seguros-base.js`, `renderSolicitudes`):
  - si falla la carga de entregas o transferencias (o tarda más de 15 s), sale el bloque «Error al cargar · Reintentar» que ya existía pero nunca se usaba;
  - ya no salen «0 por confirmar» como si fuera cierto.
- **Pagos pendientes por validar** (`parches-solicitudes-pagos-validacion.js`):
  - si falla la consulta, dice «No se pudieron cargar los pagos por validar · Reintentar» en vez de «✓ No hay pagos pendientes por validar»;
  - los reintentos automáticos esperan 20 s (antes, cada 2,5 s).
- **Detalles de cobro** (`parches-seguros-base.js`, `renderDetallesCobro`):
  - si falla abonos, transferencias o entregas, sale el bloque de error con «Reintentar» en vez de totales en RD$ 0.
- **Cobros del cliente** (`index.html`, `abrirHistorialCobros`):
  - mientras carga, la lista se vacía (antes se veían los cobros del cliente anterior);
  - si falla: «No se pudieron cargar los cobros de este cliente · Reintentar».
- `parches-seguros.js`: `b=6072` → `b=6073`.

## Pruebas (servidor de prueba local; cada falla simulada con un error 503)
| Caso | Resultado |
|---|---|
| Sin falla: Solicitudes | Normal, sin avisos de error, sin errores de consola |
| Falla entregas → Solicitudes | «Error al cargar · Reintentar» |
| Falla la consulta de pagos por validar | Aviso de error; ya no dice «No hay pagos pendientes»; 1 solo intento en 20 s |
| Falla abonos → Detalles de cobro | «Error al cargar · Reintentar» |
| Cobros del cliente: 1.º bien (2 filas), 2.º con falla | Lista vacía con «No se pudieron cargar… · Reintentar» |
| Falla la carga de clientes al entrar | Aviso fijo y Facturas con «No se pudieron cargar los datos»; «Reintentar» con el servidor bien carga 8 clientes y quita el aviso |
- Aviso fijo medido: 390 px (oscuro y claro) y 1280 px.
  - Arriba a 76 px, debajo de la barra.
  - Botón «Reintentar» de 44 px.
  - Texto en minúscula normal y fondo sólido.
- `qa-menu-dos-niveles`: 62/62.

## Pendiente (no entró en esta entrega)
- Inicio («Cobrado hoy» en RD$ 0 si falla).
- Contabilidad (RD$ 0 mientras carga o si falla).
- Cliente 360 y línea de tiempo («Sin…»).
- Punto de venta (Reportes y saldos de clientes en 0).
- WhatsApp al abrir un chat («Cargando…» sin fin).

## Estado
- Rama `claude/carga-fallida`. Espera el «Publícalo».
