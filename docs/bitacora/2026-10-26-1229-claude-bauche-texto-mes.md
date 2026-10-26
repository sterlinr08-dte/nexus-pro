# Tarjeta del bauche: texto sin desconfianza y mes que paga

**Pedido del dueño** (captura de Registrar pago):
- Quitar «Comprobante nuevo: no se ha usado en otro pago», porque los empleados pueden sentir que se desconfía de ellos.
- Que la línea automática diga a qué mes corresponde el pago.

## Cambios (`parches-bauche-unico.js`, solo textos y presentación)
- Título verde: «Comprobante nuevo: no se ha usado en otro pago» → **«Comprobante listo»**.
- Mientras revisa: «Revisando que este comprobante no se haya usado…» → **«Leyendo el comprobante…»**.
- «Llenado con el bauche: monto, referencia…» → **qué paga**. Ejemplos:
  - «Paga la cuota de octubre 2026»;
  - «Paga las cuotas de septiembre 2026 y octubre 2026»;
  - «Abono a la cuota de octubre 2026»;
  - «… y adelanta RD$ X».
  - Siempre termina con «Revise antes de registrar».
  - Si el pago va a la deuda anterior: «Abono a la deuda anterior».
- **Cálculo del mes** (`quePaga`):
  - Toma las facturas pendientes del cliente (`ST.facturas`, `periodo` AAAA-MM) de la más vieja a la más nueva.
  - Lo ya abonado (la diferencia entre esas facturas y `pend(c)`) se descuenta primero de la más vieja.
  - Solo es un texto informativo: no cambia cómo se aplica el pago.
- La alerta roja de comprobante repetido **sigue igual**: es la protección real.
- El campo «Referencia» sigue llevando el número del banco, porque sirve para detectar duplicados.

## Pruebas
- `scripts/qa-bauche-unico.mjs`: **84/84** a 390 y 1280 px. Se actualizaron las comprobaciones A, E y J al texto nuevo.
- Prueba aparte de `quePaga` con 6 casos: cuota completa, abono, dos cuotas y adelanto.

**Rama:** `claude/bauche-texto`, sacada de `main`. Sin publicar.
