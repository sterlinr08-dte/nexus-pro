# Controles «− número +» que responden al toque (stepper, variantes 1 y 2)

## Pedido del dueño
Reel `Dfor45ND65b` (@ui_motion_prompts, seis variantes). Dijo «1 y 2 y verifica si tienen más lugares en la 1 y 2 donde ponerlo». Se interpretó: aplicar las variantes 1 (toque suave) y 2 (deslizar), y buscar más lugares.

## Qué se hizo
- Archivo nuevo `parches-stepper.js`, al final de la lista de `parches-seguros.js` (build `6034` → `6035`).
- Al tocar − o +: el botón se hunde y vuelve (variante 1) y el número nuevo entra desde el lado tocado y crece un poco (variante 2). 170–190 ms.
- Cubre las cajas `.citqty` (carrito del POS), `.stp` (líneas de la factura del POS), `.pgStep` (meses adelantados en «Registrar pago») y `.ffCant`.
- SOLO ASPECTO: no llama ni reemplaza a `nxPosQty`, `nxFacQtyStep` ni `nxAboPasoMeses`. Mira el toque y anima solo si el número cambió de verdad; sin existencia o en el mínimo, no se mueve nada.
- Respeta «reducir movimiento». Apagar: `localStorage.nx_stepper_off='1'`.

## Inventario de lugares (12-nov, solo lectura)
| Proyecto | Controles «− número +» encontrados |
|---|---|
| NEXUS | Carrito del POS, factura del POS, meses adelantados; además `rifa.html` y `vendedor.html` (boletos; páginas aparte, no cubiertas) |
| Bayol | Prefactura del taller (`.stp`), catálogo (`.stepper`, `.st`), tienda (`.qty`), pedidos de `index.html` (`.pd-cant`), copias de etiquetas |
| STUDIO | Carrito y factura del POS (igual que NEXUS), financiamiento (`.ffCant`), mayoristas (`.cant`), tienda (`.pd-cant`) |

Más lugares para «Costado»: NEXUS Cobros / Historial de pagos (`#tbPagos`) y tareas del CRM (`.nxOpsTask`); Bayol búsqueda de clientes (`verHistorialCliente`).

## Pruebas
- `scripts/qa-stepper.mjs` con el banco `scripts/qa-stepper-banco.html`: 16 PASS · 0 FAIL (390 y 1280 px, «reducir movimiento» y capa apagada).
- **Límite:** el banco usa el mismo marcado del POS y se repinta igual, pero NO es la pantalla real del POS. Falta verlo en el POS real y en un iPhone.

## Estado
Rama `claude/stepper-toque`. **Sin publicar**.
