# 17-nov-2026 — Claude — POS 6068: la devuelta sale del efectivo de la caja

## Hallazgo (Muse, prueba de la 6067)
- **Venta:** CO00000006, total RD$285, pagada con RD$300 en efectivo, devuelta RD$15.
- **Caja:** subió RD$300 en vez de RD$285. «Efectivo esperado» quedó en RD$975; lo correcto era RD$960.

## Auditoría (fuente de verdad)
- **Lo que guardó `pos_ventas` en CO00000006:** `pagado_efectivo` 300, `recibido` 300, `devuelta` 15, `pagos` = [Efectivo 300].
- **Dónde se usa `pagado_efectivo`:**
  - Caja / arqueo (`cajaResumen`, línea ~569);
  - reportes por método (~11167);
  - reverso de financiamiento (~6817).
- **Causa en `confirmarVenta`:** se guardaba `pagado_efectivo: c.efe`, que es lo entregado, sin restar la devuelta.
- **Contabilidad:** `postAsientoVenta` también usaba `c.efe` para la línea de Caja (1101). Eso daba un asiento descuadrado (Debe 300 contra Haber 285). Verificado en la base: **CO00000006 no tiene asiento**. Las demás ventas de la demo sí tienen asiento y cuadran.
- **Alcance en producción:** es la **única** venta con devuelta en todas las empresas. Ninguna empresa real quedó afectada.

## Cambio (`parches-pos.js`)
- `leerCobro()` calcula `efeNeto = max(0, efectivo entregado − devuelta)`.
- **Al guardar la venta:**
  - `pagado_efectivo = efeNeto`, que es lo que queda en caja;
  - `recibido` sigue siendo lo entregado;
  - `devuelta` no cambia;
  - `pagos` sigue mostrando lo entregado, así el ticket dice «Efectivo 300 · Devuelta 15».
- `postAsientoVenta`: la línea de Caja usa `efeNeto`, y el asiento cuadra.
- `parches-seguros.js`: `b=6067` → `b=6068`.

## Datos
- CO00000006 de la demo queda como estaba: `pagado_efectivo` 300 y sin asiento. La demo se reinicia sola cada madrugada. No se tocó ningún dato histórico.

## Pruebas
- `qa-pos-cubre6`: 22/22. Prueba nueva: con un pago de 14,000 por un total de 13,380, la venta se guarda con `pagado_efectivo` 13,380, `recibido` 14,000 y `devuelta` 620, a 390 y 1280 px.
- En verde: `cobro-caja`, `inicio-arqueo`, `contabilidad`, `aura-contable`, `apartar`, `itbis-linea` y `fase1`.

## Estado
- Rama `claude/pos-caja-devuelta`. Sin publicar.
