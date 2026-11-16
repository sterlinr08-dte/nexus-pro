# POS — Pedidos entre almacenes (16-nov-2026)

**Dueño:** «Pedido entre almacén» (de los 6 reportes de Infoplus que faltaban: «Requisiciones pendientes» y «Solicitudes inventario»).
Rama `claude/pos-pedidos-almacen`, build **6054**, **sin publicar**.

## Flujo
1. Kardex → tarjeta Almacenes → **Pedidos** → «Nuevo pedido»: quién pide, a quién, artículos y cantidades (cada línea dice cuánto hay en los
   dos almacenes), notas → «Enviar pedido». Queda **Pendiente** (PA-00001…).
2. **Despachar** abre la transferencia de siempre ya llena (desde = a quién se pidió, hacia = quien pidió, bloqueados), con la cantidad
   limitada a lo que hay. Al confirmarla, el pedido queda **Despachado** con el número de la transferencia y lo que de verdad salió.
3. **Rechazar** o **Anular** piden motivo. Solo se atiende un pedido Pendiente.
- El pedido **no mueve inventario**: solo la transferencia (`pos_transferir_stock`, ya existente) lo mueve.
- Si la transferencia sale pero no se puede marcar el pedido, avisa y el pedido sigue Pendiente.

## Base de datos (aplicada: `20261116070000_pos_pedidos_almacen.sql`)
- Tablas `pos_pedidos_almacen` y `pos_pedido_almacen_items`: la empresa solo LEE; escriben únicamente las funciones.
- `pos_pedido_almacen_crear` (numera por empresa con candado, todo o nada; valida almacenes de la empresa, artículos, cantidades).
- `pos_pedido_almacen_atender` (solo desde Pendiente; despachado exige una transferencia de la empresa del almacén correcto al correcto y
  anota lo despachado por artículo; rechazar/anular exige motivo).
- Ensayo con vuelta atrás: PA-00001 de 10 aguas y 4 arroces; transferencia real TR-00001 de 8 y 4 → despachado 8/10 y 4/4; PA-00002 rechazado
  con motivo; rechazó mismo almacén, cantidad 0, inserción directa, despacho sin transferencia, atender dos veces, sin motivo, y otra empresa.

## Reportes (Reportes → «Inventario, ventas y compras» → Compras y despachos)
- **Solicitudes de inventario**: todos los pedidos del período con estado, artículos, unidades, despacho o motivo; filtro por estado.
- **Requisiciones pendientes**: lo que falta por salir (pedidos pendientes y despachos incompletos), por almacén que surte, con lo que hay ahí.
  Los rechazados y anulados no cuentan (error encontrado en la prueba y corregido).

## Pruebas
- Nueva `scripts/qa-pos-pedidos-almacen.mjs` **28/28** (390 y 1280). precios-activos 42, reportes-mas 34, reportes-inventario 34, negocio 26,
  fase1 36, compra-segura 50.

## Con esto, de los 6 de Infoplus
Hechos 5: Cambios de precio, Activos fijos, Agregar costo, Solicitudes de inventario, Requisiciones pendientes. Falta «Faltante orden compra»
(requiere órdenes de compra).
