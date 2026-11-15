# POS demo — 12 hallazgos de la prueba de Muse (16-nov-2026)

**Pedido:** el dueño pasó 12 mejoras (visuales y operacionales) que Muse encontró probando la demo.
**Rama:** `claude/pos-demo-mejoras` · build **6048** · **sin publicar** (falta «publícalo»).

## Antes: registro web publicado
- PR #486 (squash `77955de`), build 6047 en vivo; migración `20261115230000_pos_registro_web` aplicada; Edge `registro-tienda` v1 (verify_jwt false),
  `crear-usuario-staff` v17 y `usuarios-acceso` v10 (verify_jwt true).
- Prueba real en vivo: tienda «Colmado Prueba Claude» → dueño entra con `dueno@colmado-prueba-claude`, crea cajera `maria`, la cajera entra. Siembra: 1 almacén, 11 secuencias, 20 cuentas.
- **Pendiente:** borrar esa tienda de prueba (org `3efbf123-…`): la tarjeta de permiso se venció 3 veces.

## Hecho en esta rama (`parches-pos.js`, `index.html`)
| # | Causa encontrada | Arreglo |
|---|---|---|
| 1 | La ⭐ (favoritos) no decía nada al tocarla | Aviso «⭐ En Favoritos · Lo encuentra arriba en «⭐ Favoritos»» |
| 2 | 8 tarjetas fijas en Inicio | Siempre Ventas/Caja/Utilidad; Garantías, Inventario crítico, Compras pendientes, Clientes esperando y Equipos solo si tienen algo |
| 3 | Historial, Notas y Prefacturas en Finanzas, crear en Principal | Secciones «Vender» (crear) y «Documentos» (Facturas emitidas, Prefacturas guardadas, Notas de crédito), sin repetidos; igual en los cuadros de Inicio |
| 4 | `#nxVAviso` solo se escondía | Se borra al terminar, al vaciar el carrito (`pintarCarrito`) |
| 5 | Carga simple | Escudo en tarjeta con degradado #30AFFD→#1848E5 (referencia del dueño), «NEXUS PRO» y línea que corre; mismo fondo |
| 6 | La NC no se reflejaba en la venta | `ncsDeVenta/devueltoDe`: chip DEV. PARCIAL/DEVUELTA y neto en Historial; ticket con la NC y «Neto después de devolución»; Inicio resta las NC de hoy (ventas y utilidad). La venta original NO se toca |
| 7 | Reportes sin NC | Carga `pos_devoluciones` + items: «Ventas netas», KPI «Devoluciones», ganancia, costo, por día y más vendidos netos |
| 8 | `fechaDMY('2026-11-15')` = medianoche UTC → «14/11 20:00»; `hoy()` en UTC (después de 8 p. m. era mañana) | Fecha solo-día se muestra tal cual; `hoy()` local; `diaLocal()` en filtros de Historial, NC y Reportes |
| 9 | Devolución «Nota de crédito» abonaba Caja (1101); la venta que se paga con NC debita 2105 | Haber 2105 si el método es Nota de crédito; devolución en Efectivo registra salida en `pos_caja_movimientos` de la caja abierta |
| — | Cuadros morados de Inicio salían azul sólido sin icono: la capa `nxLineaUnicaCSS` atrapa `background:#6d28d9…` | `background-color` y morado → azul en el cuadro |

## Decisión del dueño
- **11. Compras:** opción **A** — se queda como está: la mercancía entra al guardar la compra (sin paso «Recibir»).

## Pendiente (necesita la base)
- **10.** Resumen contable vs Ventas/Caja: revisar asientos reales de la demo (sospecha no verificada: ventas de ejemplo sin asiento).
- **12.** Proveedores de ejemplo en `demo_reiniciar()`.

## Pruebas
- Nueva `scripts/qa-pos-devolucion-muse.mjs` **26/26** (390 y 1280).
- Siguen pasando: negocio 26, prefactura 18, contabilidad 8, cobro-caja 22, vender-toque 24, itbis-linea 13, inicio-arqueo 12, fase1 36, fase2 11, compra-segura 50, cubre6 14, volumen 51, empresas 76.
