# 18-oct-2026 — Custodia de fondos y ventana «Cobros del cliente» (59.50, sin publicar)

## Pedido
El dueño respondió «Si» para seguir con Custodia de fondos y la ventana Historial de cobros.

## Capa `style#nxCusPane`
- **Cómo se apaga:** `NX_CUS_PANE=false` para todos, o `localStorage.nx_cus_pane_off='1'` en un equipo.
- **Solo diseño:** es CSS y no toca cálculos, RPC (`seguros_resumen_ciclo_admin`), recibos ni reversos.

**Custodia de fondos (`#v-custodia`)**
- Ya era una pantalla densa y ordenada, así que el cambio es mínimo:
  - el selector del ciclo y los botones «Actualizar», «Reintentar», «Ver los movimientos» y cerrar el detalle pasan de 38 px a 44 px;
  - los rótulos de las cifras quedan en tipo oración.
- Las cifras y su orden no cambian.

**Ventana «Cobros del cliente» (`#mHistCobros`)**
- Título en tipo oración y la X de 44 px.
- En el celular, la tabla de 5 columnas pasa a tarjetas: fecha y monto arriba; método y «Ref.:» debajo; Recibo y Reversar de 44 px a la derecha.
- Antes, Recibo y Reversar medían 20 × 32 px.

## Medición (390 y 1280 px)
Ningún elemento que se toca queda por debajo de 44 px en las dos pantallas.
- Antes, en Custodia: 3 (selector, Actualizar, Reintentar).
- Antes, en la ventana: 3 (Cerrar, Recibo, Reversar).

## Pruebas
- `qa-custodia`: 68/68 con la capa encendida (capturas en `/tmp/qa-custodia/`).
- `qa-registrar-pago`, `qa-tema-glass`, `qa-inicio-glass` y `qa-legibilidad`: el resultado va en el mensaje al dueño.
- Nota: el servidor de prueba general no trae datos de ciclo, y Custodia muestra «Invalid time value». En producción no pasa; `qa-custodia` usa sus propios datos.

## Pendiente
- «publícalo».
- Siguientes: Documentos del cliente, Pólizas, Empresas y Agentes.
