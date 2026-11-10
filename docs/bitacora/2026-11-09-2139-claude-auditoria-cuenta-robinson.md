# Auditoría · qué entró a la cuenta de Robinson (solo lectura)

## Pedido del dueño
«Audita para que identifique qué entró a su cuenta» (la de Robinson), para saber qué tiene él que transferirle.

## Corrección a la entrada anterior
La entrada «custodia-robinson-ajuste-ciclo-octubre» decía que 111 pagos por banco (RD$ 535,000) de mayo a agosto no tenían cuenta de destino. **Estaba mal.** Busqué el registro de cuenta solo por `abono_id`; los registros viejos de `entregas_admin` (entrega directa) no llevan `abono_id` y su `cobro_id` apunta a una tabla que ya no existe. Sí existen: 95 registros, RD$ 458,000. Sin registro de cuenta quedan solo RD$ 77,000.

## Resultado (cifras del sistema al 09-nov-2026)
Cobros por banco aplicados por Robinson, según a qué cuenta entraron:

| A qué cuenta entró | Hasta 14-ago | Desde 15-ago | Total |
|---|---:|---:|---:|
| Cuentas de Esterlin | 214,000 (43) | 396,000 (81) | 610,000 |
| Cuenta de Robinson | 244,000 (52) | 241,500 (51) | 485,500 |
| Sin registro de cuenta | 77,000 | 0 | 77,000 |

- Además, 1 pago de RD$ 6,500 cobrado por Esterlin entró a la cuenta de Robinson (05-oct). Total entrado a su cuenta: **RD$ 492,000** en 104 pagos (Banreservas 472,500; Popular 19,500).
- Por mes: jun 13,500 · jul 99,000 · ago 131,500 · sep 206,000 · oct 37,500 · nov 4,500.
- Robinson transfirió a Esterlin RD$ 351,610 en 24 transferencias (jun 130,800 · jul 90,910 · ago 129,900). La última fue el 11-ago.
- Ajuste ya acordado el 03-jul: RD$ 19,200, con la nota «Corte de conciliación: saldo real acordado con ROBINSON = RD$ 16,500 (dif. de cobros bancarios de mayo sin registro de cuenta)».
- Efectivo cobrado por Robinson y no entregado: RD$ 221,500 (jun 72,000 · ago 114,500 · sep 4,000 · oct 3,000 · nov 28,000).

Cuadre de su custodia: 492,000 + 77,000 − 19,200 − 351,610 = 198,190 en banco; más 221,500 en efectivo = **RD$ 419,690**, igual a lo que da el sistema.

## Conclusiones
- El sistema ya aplica la regla del dueño: lo que entra a las cuentas de Esterlin (RD$ 610,000 de cobros de Robinson) no se le cuenta a Robinson.
- El acumulado alto de Robinson sale de dinero registrado como entrado a **su** cuenta (RD$ 140,390 sin transferir) y de efectivo (RD$ 221,500). Desde el 11-ago no ha transferido nada.
- La única parte sin evidencia de cuenta son RD$ 57,800 netos (77,000 menos el ajuste de 19,200), casi todo del lote cargado el 1-jun.
- Límite de la auditoría: se basa en lo que se registró al aplicar cada pago. No se cotejó contra estados de cuenta del banco. El cruce pago por pago de lo viejo solo se puede hacer por nombre, monto y fecha, y no es exacto.

## Estado
Nada cambiado. Rama `claude/review-claude-md-jpzk7k`.
