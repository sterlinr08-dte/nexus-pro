# 15-nov-2026 — Claude — POS estándar: entrega 1 en rama y comparación con Bayol (prefactura y contabilidad)

**Pedido del dueño:** «Arranca» (demo en `demo.nexusprord.com`, opción A) y «en prefactura de Bayol Cell he hecho muchos cambios, toma de esos cambios y aplícalos, y también la contabilidad».

## Hecho en la rama `claude/pos-demo` (SIN publicar, commit 510e907)
- Migración `20261115100000_pos_negocio_por_empresa.sql` (NO aplicada): `pos_config` + `emp_nombre, emp_rnc, emp_tel, emp_dir, ticket_pie, modulos_off`.
- `parches-pos.js`: `empInfo()` por empresa (una tienda ya no imprime «NEXUS PRO»), `modApagado()` dentro de `puedeVer()`, tarjetas «Datos del negocio» y «Módulos del negocio» en Ajustes, pie del recibo configurable.
- Prueba `scripts/qa-pos-negocio.mjs`: 26/26 a 390 y 1280 px (campos 48/16, botones 54, casillas ≥44, 0 errores JS).

## Comparación prefactura (Bayol c0ab44a vs NEXUS 314dbaf)
La de Bayol nació como copia de la de NEXUS/STUDIO (bitácora Bayol 2026-10-19-2000). Mejoras propias de Bayol:
- **Se pueden pasar (solo pantalla):** subir precio libre y bajar solo hasta el mínimo; ventana del nombre con niveles por rol; cantidad topada a existencia y revisión antes de guardar; candado contra doble guardado; editar una prefactura guardada; imprimir en ticket 80 mm o carta con copias y «COPIA»; F9 guardar / F10 nueva; se limpia sola al guardar; vista compacta en móvil y 2 columnas en PC; búsqueda que tolera errores de escritura.
- **Necesitan base:** descuento global en RD$ con tope máximo; guardar almacén y vendedor en la prefactura; botones rápidos (hoy atados a artículos de Bayol → requiere «productos rápidos» configurables).
- **Propias de Bayol, no se pasan:** Info Plus (estados, cliente CONTADO, existencia), envío automático por WhatsApp Business por sucursal, botón de cuentas bancarias, QZ Tray, Raspa y gana, orden de taller desde la prefactura, textos y códigos de Bayol.

## Comparación contabilidad
- NEXUS ya tiene: catálogo, diario, mayor, balanza, estado de resultados, balance, asientos automáticos por operación.
- De Bayol se puede pasar: flujo de efectivo, saldos de apertura, movimiento de efectivo con transferencia/aporte/retiro, gasto con ITBIS separado, nómina con TSS y regalía, punto de equilibrio y captura guiada (requiere tablas nuevas), pantalla de cierre de período (el SQL ya existe en NEXUS, falta la pantalla).
- No se pasa: asientos por lote mensual de Bayol (duplicarían los de NEXUS), vistas atadas a Info Plus y tiendas fijas.
- **Riesgos encontrados en NEXUS (leídos en código, no probados en producción):** (1) para la organización fija `c6e4b954…` el servidor y el navegador registran la venta; al anular puede revertirse dos veces; (2) las reglas del servidor y del navegador no coinciden (ITBIS 2102, cuenta 5101 como gasto); (3) anulaciones y devoluciones no revierten el costo; (4) los códigos de cuentas de Bayol y NEXUS chocan (1104, 6103, 6104, 2103, 2104): no copiar reglas tal cual; (5) reportes cargan máx. 600 asientos; (6) redondeo a pesos enteros.

## Siguiente paso recomendado
1. Prefactura: pasar las mejoras «solo pantalla». 2. Contabilidad: primero unificar una sola fuente de asientos por empresa (decisión técnica con el dueño), luego pasar las pantallas de Bayol. 3. Empresa de demostración con datos de ejemplo y limpieza nocturna; dirección `demo.nexusprord.com`.
