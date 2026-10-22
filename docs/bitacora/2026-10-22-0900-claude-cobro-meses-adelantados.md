# 22-oct-2026 09:00 · Claude · 59.55 Registrar pago: meses por adelantado a la vista

## Pedido del dueño
- Mandó una captura del iPhone y pidió: «arregla la ventana de cobro, planifica la forma de visualizar los meses por adelantado».
- Vio la propuesta (imagen) y dijo «Si».

## Problemas de la captura
1. «Saldo total» (clase fija `hero`) y «Adelantar» (`aria-expanded`) se veían encendidos a la vez, con el mismo degradado.
2. «Saldo total» seguía activo con el cliente al día (pendiente RD$0).
3. El resumen decía «≈ 4 meses» sin decir cuáles meses ni hasta cuándo queda pagado.

## Fuente de verdad revisada (sin cambios)
- `nxAboMesesAdelanto`: monto = `pend(c) + N·getTot(c)`.
- El adelanto es crédito: `pagado − deuda_total`. La ficha ya muestra «N meses adelantado» con la misma cuenta.
- La factura se genera cada mes en `clientes.dia_facturacion`.

## Cambio: capa `#nxAdelPane` + `#nxAdelPaneJs` (al final de `index.html`)
- Se apaga con `localStorage.nx_adel_off = '1'`. Solo pinta: `regAbono()`, el monto, la RPC de cobro y la custodia no cambian.
- **Un solo atajo encendido** (`.nxSel`):
  - Adelantar si está abierto;
  - Una cuota si el monto es la cuota;
  - Saldo total si el monto es el pendiente.
  - «Saldo total» queda apagado si `pend = 0`.
- Debajo del monto: «4 cuotas de RD$ 4,500», o «+ RD$ 500» si sobra.
- **Cuadrícula de meses** (`#nxAdVista`, debajo de «Meses por adelantado»):
  - verde = meses ya adelantados antes;
  - morado = los de este pago;
  - punteado = la próxima a pagar.
- **Primer mes:** la próxima factura por generarse. Si hoy ya pasó su día de facturación, es la del mes siguiente.
- Resumen: «Con este pago tiene pagado hasta la factura de marzo 2027. La próxima que tendrá que pagar es la de abril 2027 (se genera el 20 de abril)», más «RD$ X a favor» si sobra.
- El resumen de abajo y el botón llevan los meses exactos: «(4 meses)», «Registrar RD$ 18,000 · 4 meses». Ya no sale «≈».
- `APP_VERSION` pasa a `'59.55'`.

## Pruebas (REST simulada, 390 y 1280)
- `scripts/qa-cobro-adelanto.mjs` (nuevo): **20 PASS / 0 FAIL**.
  - al día: Saldo total apagado y ningún atajo encendido;
  - solo Adelantar encendido;
  - «4 cuotas de …»;
  - 4 meses morados + la próxima;
  - resumen «hasta la factura de…»;
  - «(4 meses)» una sola vez y sin «≈»;
  - «+ RD$ 500 a favor»;
  - con un mes previo: 1 verde + 1 morado;
  - no escribe nada en el servidor;
  - sin errores.
- `scripts/qa-registrar-pago.mjs`: **58 PASS / 0 FAIL**. Se ajustó una prueba vieja que exigía «Saldar» siempre resaltado; ahora va en blanco solo si está escogido.

## Estado
Rama `claude/cobro-adelanto-meses` (sale de `main`), **sin publicar**.
