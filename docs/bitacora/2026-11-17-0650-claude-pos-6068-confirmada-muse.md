# 17-nov-2026 06:50 (RD) — Claude — POS 6068 confirmada por Muse; queda una observación de Contabilidad

## Informe de Muse (demo, 17-nov 00:11–00:15, gerente)
Los 5 puntos de la 6068 funcionan:
- Caja antes RD$975.00 → después RD$1,260.00: sube **RD$285.00 exactos** (venta CO00000008, pagó RD$300, devuelta RD$15).
- El ticket sigue mostrando Efectivo RD$300.00 · Devuelta RD$15.00.
- Asiento AS-00011 «VENTA CO00000008»: Caja RD$285 al Debe; Debe RD$489 = Haber RD$489, cuadra.

Con esto queda cerrado el error de la 6067 (ver `2026-11-17-*-claude-pos-6068-*`).

## Observación pendiente (fuera de la prueba)
La tarjeta «Efectivo (Caja + Banco)» del Resumen de Contabilidad mostraba **-RD$69.00**, con la caja en RD$1,260.00.

- Cómo se calcula (`ctaEfectivo` en `parches-pos.js`): saldo de las cuentas de activo 1101/1102 (o con «caja»/«banco» en el nombre), **solo con los asientos del rango de fechas** elegido. No lee la caja del POS.
- **No lo verifiqué con datos:** cuando se revisó (10:48 UTC) la demo ya se había reiniciado (07:00 UTC) y no quedaban ventas ni asientos.
- Lo que sí se sabe: la venta CO00000006 (hecha con la 6067) no tenía asiento, así que a la Caja contable le faltaban esos RD$285. Eso solo no explica el -69; tiene que haber salidas de Caja o Banco (compra, gasto o abono a proveedor) en el rango.

## Notas menores de Muse
- La prefactura vacía PF-00007 no sale en «Prefacturas guardadas» (un borrador vacío no se lista).
- «1 venta en espera · RD$375.00» es otra cosa que las prefacturas.

## Siguiente paso
Si vuelve a salir, pedir a Muse el Libro Mayor de las cuentas 1101 y 1102 (movimientos y rango de fechas) **antes de las 3:00 AM RD**, y revisar la base ese mismo día. Sin cambios de código en esta entrada.
