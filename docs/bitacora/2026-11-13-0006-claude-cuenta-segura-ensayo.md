# «Cuenta segura» — ensayo de la regla del servidor (con vuelta atrás)

Sigue a `…-claude-cobro-cuenta-segura.md`. El dueño autorizó: «Haz el ensayo».

## Cómo se hizo
Un solo bloque en producción que aplica la migración `20261112220000_seguros_cobro_cuenta_segura.sql`, corre 8 casos con pagos de RD$ 100 (como cajera, como Robinson y como administrador) y termina con un error a propósito, que deshace todo: funciones, pagos de prueba, comprobantes de prueba y avisos en cola.

## Resultado: 8 de 8
| Caso | Resultado |
|---|---|
| Cajera, transferencia sin comprobante | Rechazado: «Falta el comprobante…» |
| Cajera, efectivo | Se registra igual que antes |
| Robinson, transferencia a «su cuenta» con comprobante | Queda `pendiente`; entrega sin confirmar |
| Aviso de WhatsApp de ese pago | 1 aviso `pago_pendiente_validacion`, dirigido al agente administrador |
| Robinson intenta validarlo | Rechazado: «solo el administrador puede validarlo» |
| Administrador lo valida | Queda `validado` |
| Administrador, su cuenta, sin comprobante | Se registra, `validado` y confirmado solo |
| Comprobante que dice …1654 y se elige la cuenta de Robinson | Rechazado: «…cuenta terminada en 1654 del administrador. Elija esa cuenta de destino.» |
| Cajera, cuenta del administrador con comprobante | Se registra y queda `pendiente` (lo valida el administrador) |

## Comprobación de que no quedó nada
Después del ensayo: 540 abonos (igual que antes), 0 pagos de prueba, 0 comprobantes de prueba, la función nueva no existe, 0 avisos en cola, pagado del cliente 26,500, custodia Robinson 441,690 y Esterlin 2,135,910 (sin cambio).

## Estado
Sigue sin publicar y sin aplicar. Al publicar: primero la migración, después la capa (`parches-cobro-cuenta-segura.js`). Antes, avisar a la cajera que la transferencia lleva comprobante.
