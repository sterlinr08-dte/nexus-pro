# Corrección de un pago · Ramón Antonio Valdez (efectivo → transferencia a cuenta de Esterlin)

## Pedido del dueño
El pago de hoy de Ramón Antonio Valdez (RD$ 4,500) estaba registrado en **Efectivo** a nombre de Robinson, pero fue una **transferencia a Banreservas, a la cuenta de Esterlin**. El dueño autorizó: «Corrígelo a Esterlin» y luego «dale». La subida de esta entrada también la autorizó («Sí, súbela»).

## Fuente de verdad revisada antes
- Un cobro aplicado no se edita: se reversa (`seguros_reversar_cobro`, solo admin) y se registra de nuevo (`seguros_registrar_cobro_con_entrega`).
- Custodia: `seguros_acumulado_validado_agente`. Un depósito a cuenta de otro agente resta al que cobró y suma al dueño de la cuenta (entrega directa).
- Patrón ya usado por la cajera en los depósitos a la cuenta de Esterlin: agente que cobró = Robinson, cuenta destino = Esterlin. Se siguió el mismo.

## Qué se hizo (una sola transacción, por las mismas RPC de la app, como el usuario administrador)
1. Reversa del abono `fd32ca77-4998-4987-9499-bdb20606c4d9` (Efectivo, recibo 16). Motivo: «Fue transferencia Banreservas a la cuenta de Esterlin, no efectivo (corrección pedida por el dueño)». Llave `corr-valdez-20261112-rev`.
2. Abono nuevo `182921a5-c5eb-4189-b345-68e18602bc0a`: RD$ 4,500, Transferencia, Banreservas, misma fecha y hora del original (mismo ciclo), agente Robinson, cuenta destino Esterlin, validado automáticamente, entrega directa confirmada. Llave `corr-valdez-20261112-reg`. Referencia: «Transferencia Banreservas (sin número)» porque el dueño no dio el número.
3. Se quitaron de la cola (`net.http_request_queue`, dentro de la misma transacción) los 2 avisos `pago_aplicado` al cliente del abono nuevo, para que no recibiera un segundo «pago confirmado». El aviso `entrega_confirmada` al agente Esterlin no se tocó.

Sin migraciones ni cambios de código.

## Comprobación (antes → después)
| Dato | Antes | Después |
|---|---:|---:|
| Custodia Robinson | 446,190 | 441,690 |
| Custodia Esterlin | 2,131,410 | 2,135,910 |
| Pagado del cliente | 26,500 | 26,500 |

El total cobrado del negocio no cambia. La transacción traía comprobaciones que la anulaban completa si algo no cuadraba. El primer intento se anuló solo (había 2 avisos en cola y se esperaba 1); no cambió nada. El segundo quedó aplicado y se releyó después.

## Riesgos y pendientes
- La referencia no lleva el número real de la transferencia; no se puede editar (habría que reversar otra vez).
- El abono nuevo no tiene número de recibo (`recibo_num` vacío); falta revisar si la app lo asigna al imprimir.
- Es el mismo problema de la auditoría «cuenta de Robinson»: pagos que entran a la cuenta de Esterlin y quedan como efectivo o a cuenta de Robinson. Sigue pendiente la prevención: elegir cuenta bancaria real, comprobante obligatorio y validación del administrador.
