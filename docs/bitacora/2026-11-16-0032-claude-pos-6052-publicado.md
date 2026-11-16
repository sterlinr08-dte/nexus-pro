# POS 6052 publicado (16-nov-2026)

- Dueño: «Publícalo». PR #495 (squash `0f29178`). Verificado en vivo `b=6052`.
- Contenido: 12 reportes más (detalle en `…-claude-pos-reportes-ventas-compras.md`). Total 17 en Reportes → «Inventario, ventas y compras».
- Demo real a 390 px (solo lectura), 0 errores de JS:
  - Ventas: 8 facturas, total RD$ 3,315.00, neto RD$ 2,565.00 — cuadra con las 8 ventas (210+25+210+210+210+725+75+1,650) menos las
    notas de crédito NC-00001 (725) y NC-00002 (25).
  - Ganancias por artículo: venta sin ITBIS RD$ 2,286.61, costo RD$ 1,648.00, ganancia RD$ 638.61 (igual en Ganancias por día).
  - Empleado 1 / Clientes 1 (8 facturas). Compras 1 por RD$ 140.00; Recepciones 10 unidades.
  - Despachos y Series no vendidas: vacíos (la demo no tiene transferencias ni IMEI). Inventario físico y Lista de precios: 18 artículos.
- No se probó en vivo CSV ni impresión (sí en `qa-pos-reportes-mas`, 34/34).
- No hechos (falta el módulo o el dato): Faltante Orden Compra, Requisiciones Pendientes, Solicitudes Inventario, Activos Fijos, Cambio Precios,
  Agregar Costo (el dueño debe describirlo). Historial Seriales ya existía.
- Pendiente: Reportes carga máx. 2,000 ventas (pedir por rango); vista por modelo/selector de talla; botón «Borrar» y demo con
  proveedores/ventas (ventana de confirmación); e-CF allowlist; demo.nexusprord.com; contabilidad Bayol.
