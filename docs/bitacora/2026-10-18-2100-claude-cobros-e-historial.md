# 18-oct-2026 — Cobros e Historial de pagos compactos (59.49, sin publicar)

## Pedido
El dueño respondió «Si» para seguir con Cobros e Historial de pagos, las pestañas de Facturas.

## Capa `style#nxCobPane` + `script#nxCobPaneJs`
- **Cómo se apaga:** `NX_COB_PANE=false` para todos, o `localStorage.nx_cob_pane_off='1'` en un equipo.
- **CSS:** cambia la apariencia sin tocar `rCob()`, `rPagos()`, filtros, recibos ni reversos.
- **JS (`nxCobPaneJs`):** solo desliza la fila de pestañas para que la activa quede a la vista. Usa `scrollTo` horizontal de la fila, sin mover la página.

**En celular y PC**
- Títulos en tipo oración.
- Todo lo que se toca mide 44 px o más: Excel, Cobrar, filtros, lupa, fechas, Limpiar, Recibo, Ver bauche, Reversar y las pestañas de arriba.
- Recibo y Reversar medían 20–22 px de ancho.

**Solo en el celular (≤720 px)**
- **Pestañas de Facturas** (Facturas, Cobros, Pendientes, Historial, Avisos, Novedades): en una fila que se desliza. Antes ocupaban 3 filas.
- **Cobros:**
  - las 3 cifras en una fila (146 → 72 px);
  - filtros sin caja;
  - «Cobrar» de 44 px.
- **Historial de pagos:**
  - cifras 2 × 2 sin icono;
  - filtros: período a lo ancho, fechas lado a lado, y los 4 filtros uno por línea para que se lean completos;
  - cada pago en 3 líneas: cliente y monto; fecha, método y banco; «Registró»; con Recibo y Reversar de 44 px a la derecha.

## Medido a 390 px (datos de prueba)
| Medida | Antes | Ahora |
|---|---|---|
| Alto de cada pago | 214 px | 116 px |
| Cifras de Cobros | 146 px | 72 px |
| Botones por debajo de 44 px (celular) | 12 | 0 |
| Botones por debajo de 44 px (PC) | 21 | 0 |

## Pruebas
- Capturas en claro y oscuro, a 390 y 1280 px.
- `qa-registrar-pago`, `qa-custodia`, `qa-tema-glass`, `qa-inicio-glass` y `qa-legibilidad`: el resultado va en el mensaje al dueño.

## Pendiente
- Que el dueño la vea y diga «publícalo».
- Próximas pantallas: Custodia de fondos, Historial de cobros (ventana) y Documentos.
