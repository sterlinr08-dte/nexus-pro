# POS — «Agregar costo» (16-nov-2026)

**Dueño:** «Agregar costo se refiere a los costos agregados a los artículos ya comprados que se le agreguen, sea para un reacondicionado».
Misma rama `claude/pos-precios-activos`, build **6053**, **sin publicar**. Complementa `…-claude-pos-cambios-precio-y-activos.md`.

## Qué hace
- Reportes → «Inventario, ventas y compras» → Inventario → **Costos agregados** → botón «+ Costo»: artículo (con existencia), monto, motivo y
  «Pagado con» (Efectivo / Banco / Por pagar). Antes de guardar muestra el reparto: «10 en existencia · +RD$ 10.00 c/u · Costo 15 → 25».
- El monto se reparte entre **todas las unidades en existencia** (costo promedio); el costo nuevo queda en la ficha y en «Cambios de precio».
- Solo dueño o gerente. No se puede sobre servicios ni artículos sin existencia.

## Base de datos (aplicada: `20261116060000_pos_costos_agregados.sql`)
- Tabla `pos_costos_agregados` (solo lectura para la empresa) y función `pos_agregar_costo` (todo o nada, bloquea la fila del artículo).
- Ensayo con vuelta atrás: RD$ 100 sobre 3 unidades → costo 150.00 → 183.33; rechazó monto 0, método inválido, servicio, inserción directa,
  cajera (NO_AUTORIZADO) y admin de otra empresa (ARTICULO_NO_EXISTE); `anon` sin permiso.

## Dinero y contabilidad
- Asiento: Debe 1104 Inventario / Haber 1101 Caja, 1102 Banco o 2101 Cuentas por pagar, por el monto.
- En efectivo y con caja abierta: salida en `pos_caja_movimientos`.
- Redondeo: el costo se guarda a 2 decimales, así que el valor del inventario puede diferir del asiento en centavos (100 / 3 → 99.99).
- No hay «deshacer»: un error se corrige con otro movimiento (pendiente si el dueño lo pide).
- No es por IMEI: el costo es por artículo (promedio), como todo el inventario de NEXUS.

## Pruebas
- `scripts/qa-pos-precios-activos.mjs` **42/42** (incluye cambios de precio, activos y agregar costo). reportes-mas 34, reportes-inventario 34, aura-contable 14, negocio 26, fase1 36.
