# 15-nov-2026 — Claude — POS estándar: base contable corregida (rama, SIN publicar)

**Decisión del dueño:** opción A — arreglar primero la base contable y después traer las pantallas de Bayol.

## Auditoría en producción (solo lectura, 15-nov-2026) — corrige lo dicho en la entrada anterior
- La organización fija en el servidor (`c6e4b954…`) es **`bayolsale`**, no `nexus-pro`. Solo esa empresa (1 venta, 1 compra) registra por los disparadores del servidor (`pos_reconstruir_asiento_venta/compra`, 4101 por el total, sin 2102).
- **Todas las demás empresas** (incluida `nexus-pro`, 17 asientos) registran desde la pantalla, con ITBIS separado (2102). Verificado: venta 57 anulada = asiento de venta AS-00023 + una sola reversa AS-00024. **No hay doble reversa en `nexus-pro`.**
- El riesgo de doble reversa existe solo en `bayolsale` (servidor borra el asiento y la pantalla además registra la reversa). No se tocó: es una empresa sin uso desde el 21-jun-2026. Queda pendiente decidir si se unifica.
- Índice único `pos_asientos_pos_origen_uidx` (org, tipo, origen) impide dos asientos de venta/compra para el mismo documento.

## Cambios en `parches-pos.js` (solo pantalla; sin migraciones ni datos)
1. Asientos automáticos en **centavos** (antes pesos enteros; un redondeo podía descuadrar y el asiento no se guardaba).
2. **Anulación de venta:** además de ventas/ITBIS/caja, devuelve el costo al inventario (Debe 1104 / Haber 5101) por el mismo monto que cargó el asiento de la venta.
3. **Devolución:** devuelve al inventario el costo de lo devuelto (mismo criterio que la venta).
4. **Plan de cuentas automático:** una empresa nueva recibe `PLAN_BASE` en su primera venta.
5. **Reportes sin tope:** asientos y líneas se leen por páginas de 1,000 (antes se cortaba en 600 / 5,000 sin avisar).

## Pruebas
`scripts/qa-pos-contabilidad.mjs` 8/8. Regresión: ver resultados en el commit (negocio 26, prefactura 18, fase1 36, fase2, compra-segura 50, cubre6).

## Pendiente
- Asientos manuales siguen en pesos enteros.
- Camino único en el servidor para todas las empresas: se propone hacerlo junto con «permisos en la base» (fase de registro por la web).
- Pantallas de Bayol a traer: flujo de efectivo, saldos de apertura, movimiento de efectivo, gasto con ITBIS, nómina con TSS/regalía, punto de equilibrio, cierre de mes.
