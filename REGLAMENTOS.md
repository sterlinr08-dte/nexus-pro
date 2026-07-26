# REGLAMENTOS — NEXUS PRO

> **Qué es este archivo.** Las reglas de cómo debe comportarse cada módulo del sistema, decretadas
> por el dueño. `CLAUDE.md` cuenta la HISTORIA (qué se construyó, cuándo y por qué); este archivo
> dice la LEY (qué tiene que cumplir el código, hoy y siempre). Si el código contradice un
> reglamento de aquí, el código está mal — se arregla el código, no el reglamento.
>
> **Cómo se decreta uno.** Cada reglamento es una **tanda**: se redacta → se audita el código real
> contra él → se arregla lo que no cumple → se publica. Nunca se decreta una regla sin antes medir
> si el sistema ya la cumple. Las reglas salen de lo que se encuentra auditando, no al revés.
>
> **Autoridad.** `NPGS.md` manda en el CÓMO se ve y se construye. Este archivo manda en el CÓMO se
> comporta el negocio. Donde uno de estos reglamentos hable de dinero, existencia o comprobantes,
> gana sobre cualquier criterio de diseño.

---

## Índice

| # | Reglamento | Estado |
|---|---|---|
| 1 | **Venta** (todos los artículos + IMEI) | ✅ decretado y auditado — v49.86 |
| 2 | **Cobro y caja** | ✅ decretado y auditado — v49.88 |
| 3 | Crédito y cobranza | pendiente |
| 4 | Fiscal y documentos (NCF, e-CF, notas de crédito) | pendiente |
| 5 | Inventario (existencia, kardex, almacenes) | pendiente |
| 6 | Contabilidad (partida doble, asientos automáticos) | pendiente |
| 7 | Clientes y entidades | pendiente |
| 8 | Taller (reparaciones, garantías) | pendiente |

**Reglamentos anteriores, todavía en `CLAUDE.md`** (son de DISEÑO, no de negocio; se migran aquí
cuando le toque su tanda a cada módulo): Botones y menú lateral · Buscadores (`nxBuscaHTML`) ·
`ModalBusquedaBase` · Cada app con su propio color.

---

## 1 · REGLAMENTO DE VENTA
*(decretado por el dueño el 26-jul-2026 · auditado y aplicado en v49.86)*

Aplica a TODO artículo del POS. La parte B es el caso especial de los que llevan IMEI/serial.

**Parte A — todos los artículos**

1. La cantidad es **entera y positiva**; poner 0 borra la línea. No hay decimales (no se vende por peso).
2. **No se cobra un artículo en RD$ 0.** Si no tiene precio, no se vende.
3. La **existencia estricta aplica igual en TODAS las pantallas**: no se puede ni teclear más de lo
   que hay. (Prefactura queda exenta — es una proforma. Los servicios no tienen existencia.)
4. Un artículo marcado **"no permite descuento" RECHAZA el descuento**, no lo acepta en silencio.
5. El **piso de precio lo manda el nivel del cliente**; si ese nivel no tiene piso propio, el global
   del artículo. Solo admin y gerente pueden bajar de ahí.
6. Si el nivel del cliente exige una **cantidad mínima**, se respeta al cobrar.
7. Si la factura es **a crédito** se cobra el **precio de crédito** del nivel; si ese nivel no lo
   tiene configurado, el de contado.

**Parte B — artículos con IMEI**

8. Un IMEI es **un teléfono físico = una unidad**. **Nunca se repite** (candado en la base: índice
   único `pos_seriales(organizacion_id, serial)`).
9. La **cantidad de la línea es siempre el número de IMEI elegidos** — al vender y al devolver. No
   se teclea.
10. No se cobra sin elegir los IMEI. **No existe "vender sin IMEI".**
11. Vender amarra el IMEI a su factura. **Anular lo libera. Devolver también lo libera** — y hay que
    decir **CUÁL** equipo volvió, no solo cuántos.

**Pendientes de este reglamento (NO construidos):** la existencia de un artículo con IMEI todavía es
un número aparte y no la cuenta de IMEI disponibles · el IMEI no sabe en qué almacén está.

---

## 2 · REGLAMENTO DE COBRO Y CAJA
*(decretado por el dueño el 26-jul-2026 · auditado y aplicado en v49.88)*

Aplica a la ventana de **Cobrar** del POS y a la caja del mostrador.

**Parte A — quién compra**

1. **El que paga es UNO SOLO.** El cliente elegido en Cobrar es el cliente de la venta — y por lo
   tanto **su nivel de precio es el que manda**. Si se cambia el cliente al cobrar, los precios del
   carrito se recalculan a su nivel y se avisa en pantalla. Nunca se cobra a un cliente con los
   precios de otro.
2. **Sin cliente no hay crédito.** Todo lo que quede a crédito (fiado) exige un cliente identificado
   — el consumidor final paga completo o no se lleva nada.
3. **Una nota de crédito solo la usa su dueño.** Tiene que existir, ser de ESE cliente, y no haberse
   usado antes. Al usarse queda marcada; no se puede aplicar dos veces.

**Parte B — el dinero**

4. **El efectivo entra a una caja abierta o no entra.** No se cobra en efectivo con la caja cerrada:
   ese dinero no aparecería en ningún arqueo. Los pagos que no pasan por la gaveta (tarjeta,
   transferencia, cheque, nota de crédito, crédito) sí se pueden registrar con la caja cerrada.
5. **La devuelta nunca es negativa y el crédito tampoco.** Lo que sobra es devuelta, lo que falta es
   crédito — nunca las dos cosas a la vez.
6. **El descuento global va de 0 a 100 %.** Ni negativo ni más de 100.
7. **El piso de precio del artículo se revalida al confirmar**, no solo al teclearlo — con el mismo
   criterio de la regla 5 del Reglamento de Venta (manda el piso del nivel del cliente).
8. **El límite de crédito del cliente se respeta.** Lo que ya debe más lo que se le va a fiar no
   puede pasar de su límite. Límite en 0 = sin límite (el dueño decide caso por caso).

**Parte C — el rastro**

9. **Toda venta deja rastro completo**: número de factura consecutivo que nunca retrocede ni se
   repite, el desglose real de cómo se pagó, y su registro de auditoría.
10. **Una venta cobrada NO se revierte por un fallo secundario.** Si falla el inventario, el asiento
    contable, el documento o el plan de cuotas, la venta queda hecha y el fallo se avisa — nunca se
    deshace un cobro ya realizado a espaldas del cajero.

**Pendientes de este reglamento (NO construidos):** el arqueo no distingue el efectivo cobrado por
cada cajero (hoy la caja es una sola por organización, no por persona) · no hay retiro parcial de
efectivo a bóveda durante el turno.
