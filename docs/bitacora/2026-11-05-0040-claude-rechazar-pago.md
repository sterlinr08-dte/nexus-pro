# 59.77 — «Rechazar pago» en Solicitudes + facturas que se quedaban «Pagado» al reversar + corrección de Juan Minaya

## Pedido del dueño (05-nov-2026)
«Si tengo una solicitud de confirmación de un pago y la cancelo, la idea sería que ese pago vuelva a pago pendiente. Analiza.» Después de ver las opciones: «Haz la opción A y corrige Juan Minaya».

## Diagnóstico (fuente de verdad: producción `tnwsgcxurfyuszxsewsn`)
- Una transferencia o un depósito se **aplica a la factura enseguida** (`abonos.validacion_estado='pendiente'`) y entra a «Pagos pendientes por validar» (`seguros_pagos_pendientes_validacion`, que excluye los `Reversado`).
- En Solicitudes solo existía «Validar pago». «Cancelar» solo cerraba la ventana y el pago seguía aplicado.
- La única forma de deshacerlo era «Reversar cobro» desde la ficha del cliente (`seguros_reversar_cobro`, solo admin). Esta función: baja `clientes.pagado` (o sube `deuda_anterior`), crea el asiento `AST-COB-REV`, deja el abono `Reversado` con su motivo y escribe en la auditoría.
- **Error encontrado:** `reversarAbono()` (index.html) no llamaba a `resyncEstadoFacturas()`. Como el estado de la factura es una caché (REGLAMENTOS §9), la cuota se quedaba en «Pagado» después de reversar.
- Caso real: **JUAN ANTONIO MINAYA ACOSTA**. Se le reversó una transferencia de RD$5,000 el 02-nov. Quedó con pagado 19,500 y facturado 24,500, pero las 5 cuotas seguían en «Pagado».
- El bauche de un pago reversado queda libre: `comprobante_buscar` excluye los `Reversado`. Se puede volver a registrar con el mismo comprobante.
- Hoy hay 17 pagos esperando validación; el más viejo es del 15-oct.

## Qué se hizo
1. **Juan Minaya (con autorización del dueño):**
   - La factura `2026-10` (id `8f363653…`) pasó de `Pagado` a `Pendiente`. Solo cambió el estado; el dinero ya estaba bien.
   - Queda una fila en `auditoria` con la acción `FACTURA_ESTADO_RESYNC` y el origen `claude-resync`.
   - Se aplicó la misma regla de `_saldoFacturasCliente`: mayo, julio, agosto y septiembre quedan en Pagado; octubre, en Pendiente.
2. **Botón «RECHAZAR»** en «Pagos pendientes por validar» (`parches-solicitudes-pagos-validacion.js`):
   - Solo lo ve un administrador. Un agente ve el pago, pero no el botón.
   - Abre la ventana «Rechazar pago», con un motivo obligatorio de al menos 5 letras. Sin motivo, el botón está apagado.
   - Llama a la **misma** `seguros_reversar_cobro`, con llave de idempotencia y el motivo «Pago rechazado en Solicitudes: …». No se creó contabilidad nueva.
   - Después actualiza el cliente en memoria, corre `resyncEstadoFacturas` (la cuota vuelve a Pendiente), registra `PAGO_RECHAZADO` en la auditoría, refresca Cobros, Inicio, Clientes y Facturas, y quita el pago de la lista.
   - No se borra nada y no se le avisa al cliente.
   - Tamaños: los botones VER, VALIDAR y RECHAZAR pasan de 30 a **44 px** de alto; el campo mide 48 px con letra de 16 px; los botones de la ventana, 48 px; la ×, 44×44.
3. **`reversarAbono()`** (index.html): ahora también llama a `resyncEstadoFacturas(clienteId)`. Así no vuelve a pasar lo de Juan Minaya cuando se reversa desde la ficha.

## Archivos
- `parches-solicitudes-pagos-validacion.js`
- `index.html` (2 líneas en `reversarAbono`)
- `scripts/qa-rechazar-pago.mjs` (nuevo)
- Esta bitácora y `docs/MEMORIA.md`

Sin migraciones, sin RPC nuevas y sin Edge Functions.

## Pruebas
- `scripts/qa-rechazar-pago.mjs`: **25 PASS / 0 FAIL** a 390 y 1280 px. Cubre lo que ve admin y agente, los tamaños, el motivo obligatorio, que llama una sola vez con su llave, que la última cuota vuelve a Pendiente con un solo PATCH, que baja el pagado, que el pago sale de la lista, que no hay errores de página, y la reversa desde la ficha.
- Regresión `qa-registrar-pago.mjs`: 57/58. La única falla («altura con Transferencia ≤ 1,450 px a 390», mide 1,464) **sale igual en `main` sin este cambio**: ya existía y no viene de aquí.

## Hallazgo aparte (no tocado)
- Hay 11 facturas de 8 clientes cuyo estado guardado no coincide con la regla de saldo. **Ninguna dice «Pagado» sin estar pagada.** Son diferencias entre Pendiente y Parcial o al revés. Se corrigen solas la próxima vez que se cobre a ese cliente. Si el dueño quiere, se resincronizan en bloque con su OK.

## Estado
- Rama `claude/rechazar-pago-validacion`, **sin publicar**. Falta el «publícalo» del dueño.
- Al publicar: subir a `main` (Cloudflare despliega) y probar en vivo con un pago de prueba, o con el primero que el dueño quiera rechazar.

## Riesgos
- Rechazar es una reversa real: baja el acumulado del agente. Por eso es solo para admin y pide motivo.
- Si el pago ya se había entregado al administrador, la reversa no toca `entregas_admin`. Esto es igual que «Reversar cobro» hoy.
