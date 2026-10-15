# 2026-10-15 05:30 — Claude — Custodia: la entrega directa cuenta solo con el pago validado (sin publicar)

## Solicitud del dueño
El dueño preguntó cuánto sale en el reporte diario de Robinson cuando:
- aplica RD$2,000 a la cuenta de Esterlin;
- y RD$1,500 a su propia cuenta.

Quiere saber exactamente cuánto dinero tiene Robinson en su poder. Pidió arreglar el desfase encontrado.

## Respuesta dada
Tras validar, Robinson sale con cobrado 3,500, entregado 2,000 y **en su poder 1,500**. Esterlin recibe 2,000 en su custodia y no como cobro. El total real es 3,500.

**Hoy, Robinson tiene en su poder RD$375,690** (efectivo RD$190,500 / banco RD$185,190). Así se arma:

| Concepto | Monto |
|---|---:|
| Cobrado válido | 1,183,000 |
| − Transferencias enviadas | 351,610 |
| − Entregas al admin | 19,200 |
| − Depósitos de sus clientes en cuenta de otro | 443,000 |
| + Depósitos de otros en su cuenta | 6,500 |
| **En su poder** | **375,690** |

## Diagnóstico
`seguros_registrar_cobro_con_entrega` crea la entrega directa al instante, pero el abono cruzado queda `pendiente`. El acumulado no contaba el cobro pendiente y sí restaba la entrega. En el ejemplo, Robinson saldría con **RD$ −500** hasta que se valide, y Esterlin sumaba dinero sin confirmar.

Datos reales:
- las 158 entregas directas vigentes tienen el pago validado: hoy no hay cifras mal;
- 71 de ellas tienen `validado_at` nulo (pagos viejos).

## Cambio
Migración `supabase/migrations/20261015050000_seguros_entrega_directa_tras_validar.sql`:
- Helper `seguros_entrega_directa_vigente_at(abono_id, creada)`:
  - abono por Transferencia/Depósito validado → `greatest(creada, validado_at)`;
  - pendiente → null (no cuenta);
  - sin abono o con otro método → `creada`, sin cambio.
- Se usa en las patas «directas» de `seguros_acumulado_validado_agente`, `seguros_saldo_validado_agente_asof` y `seguros_resumen_ciclo_agente_core`.
- `seguros_custodia_desglose_agente` queda corregida por usar el acumulado.
- Solo cálculos: no toca datos.

## Prueba (DO block con RAISE al final → todo revertido, en la base real)
- Custodias actuales sin cambio: Robinson 375,690, Esterlin 1,756,910.
- Reconciliación: diferencia 0 en todos los ciclos 2026-04…2026-09, antes y después.
- Único cambio: un depósito directo de **RD$4,500** se creó en el ciclo 2026-08 pero se validó en el 2026-09. Pasa al 09, igual que su cobro.
  - Robinson 2026-08: entregado 68,000 → 63,500; saldo final del ciclo 333,190 → 337,690.
  - Esterlin 2026-08: recibido 68,000 → 63,500; saldo final 1,402,310 → 1,397,810.
  - Ciclo 09: entregado/recibido +4,500; saldo final sin cambio.
- Caso pendiente simulado (ese pago de 4,500 vuelto a «pendiente»):
  - Robinson se queda en 375,690 (antes habría bajado a 371,190);
  - Esterlin baja a 1,752,410 hasta validar.

## Estado
- Rama `claude/review-claude-md-jpzk7k`. **No aplicado ni publicado.**
- Requiere OK del dueño, porque cambia la cifra del ciclo cerrado 2026-08 en ±4,500 (de forma consistente con su cobro).
