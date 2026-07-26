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
| 3 | **Crédito y cobranza** | ✅ decretado y auditado — v49.89 |
| 4 | Fiscal y documentos (NCF, e-CF, notas de crédito) | pendiente (omitido a pedido del dueño) |
| 5 | **Inventario (existencia, kardex, almacenes)** | ✅ decretado y auditado — v49.90 |
| 6 | **Contabilidad (partida doble, asientos automáticos)** | ✅ decretado y auditado — v49.91 |
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

---

## 3 · REGLAMENTO DE CRÉDITO Y COBRANZA
*(decretado por el dueño el 26-jul-2026 · auditado y aplicado en v49.89)*

Aplica al fiado, a los planes de cuotas (financiamiento del POS), a los apartados y al centro de
avisos. Es la continuación del §2: aquel dice cómo se cobra; este, qué pasa con la deuda después.

**Parte A — a quién se le fía**

1. **No se le fía a un cliente que ya tiene cuotas vencidas sin pagar** en un plan activo — es la
   señal más clara de que no está pagando su deuda. Al **cajero** se le bloquea; a **admin/gerente**
   se les pregunta y, si aceptan, queda en Auditoría. (Junto con el límite de crédito del §2, son las
   dos puertas por las que pasa una venta a crédito.)

**Parte B — el recargo por mora**

2. La **mora es un recargo ÚNICO por cuota vencida** (no se acumula día a día), configurable en
   Ajustes, y solo aplica **pasado el período de gracia**. Con la mora apagada (0 %), no hay recargo.
3. La mora **nunca es negativa ni se aplica a una cuota ya pagada**, y se cobra **después** de cubrir
   el principal de la cuota — si el pago no alcanza a cubrir el principal, todavía no se reconoce mora.

**Parte C — cobrar la deuda**

4. **Un pago de cuota o un abono de apartado en efectivo entra a una caja abierta o no entra** — mismo
   candado del §2 (regla 4). Transferencia/tarjeta sí se registran con la caja cerrada.
5. **Ningún pago supera lo que se debe**: el pago de cuota se topa al pendiente + mora; el abono de
   apartado se topa a lo que falta.
6. **Cada cobro deja rastro**: el ledger real (`pos_fin_pagos` para cuotas), el abono (`pos_abonos`),
   su asiento contable (con la mora reconocida aparte, cuenta 4103) y su registro de auditoría.

**Parte D — la verdad del saldo**

7. **El saldo de cada cuota se recalcula del ledger**, nunca de un booleano pegado
   (`resyncCuotasPagos` corre al cargar y después de cada pago).
8. **La exposición del cliente es un solo número**: fiado + cuotas pendientes juntas (`saldoCli`), no
   dos bolsillos que nadie suma.

**Nota honesta:** al día de hoy la base tiene **0 planes de cuotas, 0 apartados, 0 fiado activo y la
mora apagada** — así que estas reglas todavía no muerden a nadie. Se decretan y se dejan correctas
**antes** de que se empiecen a usar, igual que los campos que estaban guardados pero sin efecto del §1.

**Pendientes de este reglamento (NO construidos):** no hay refinanciamiento ni "dar de baja" una
deuda como incobrable · no hay bloqueo automático por acumulación (hoy es aviso + autorización, no un
corte duro) · un fiado puro (sin plan de cuotas) no tiene fecha de vencimiento, así que su "mora" no
existe como tal — solo las cuotas la tienen.

---

## 5 · REGLAMENTO DE INVENTARIO
*(decretado por el dueño el 26-jul-2026 · auditado y aplicado en v49.90)*

Aplica a la existencia de cada artículo, al kardex y a los almacenes.

**Parte A — el único camino**

1. **Nada cambia el inventario por fuera.** Todo movimiento de stock pasa por un solo embudo
   (`moverStock` / `moverStockTransferencia`) que valida el tipo y deja el rastro en el kardex —
   nunca un `PATCH` suelto a `pos_productos.stock`. Los tipos válidos son fijos (compra, venta,
   ajuste, transferencia, garantía, taller, producción, devolución, anulación, apertura) y están
   candados a nivel de base (CHECK constraint en `pos_inv_movimientos.tipo`).
2. **El stock de almacén nunca baja de 0**, y una transferencia mueve el inventario de sitio sin
   cambiar el total (es el mismo inventario, en otro almacén).
3. **Cada movimiento queda en el kardex** con su cantidad, su stock antes/después y su referencia.

**Parte B — los artículos con IMEI**

4. **El stock de un artículo con IMEI ES la cuenta de IMEI disponibles.** Registrar N IMEI sube el
   stock en N; borrar un IMEI disponible lo baja en 1 — los dos por el embudo, así que quedan en el
   kardex. Un IMEI ya vendido no cuenta en el stock, así que borrarlo no lo baja.
5. **Si el stock y la cuenta de IMEI no coinciden** (un descuadre viejo, de antes de esta regla), la
   ventana de IMEI lo avisa y ofrece cuadrarlo de un toque.
6. **Un IMEI registrado a mano queda con el almacén activo** (antes solo los de una compra tenían
   almacén).

**Medición previa:** al auditar había **1 artículo con IMEI descuadrado** en la base (el stock no
cuadraba con su cuenta de IMEI) — el bug era real y vivo, no teórico. El resto de las escrituras a
`pos_productos.stock` se revisaron una por una: todas ya pasaban por el embudo (Fase 5 del Kardex
Inteligente), cero fugas nuevas.

**Pendientes de este reglamento (NO construidos):** el reparto de un artículo con IMEI POR almacén
todavía es aproximado — el cuadre ajusta el total, no reparte los IMEI entre almacenes · el total de
un artículo normal (sin IMEI) sigue siendo la fuente autoritativa y no se fuerza el invariante
"total = suma de almacenes" en cada operación (la Fase 5 lo dejó así a propósito).

---

## 6 · REGLAMENTO DE CONTABILIDAD
*(decretado por el dueño el 26-jul-2026 · auditado y aplicado en v49.91)*

Aplica a todo asiento contable — los automáticos (venta, compra, cobro, devolución, nómina,
servicio) y el manual.

1. **Ningún asiento se guarda si Debe ≠ Haber.** La partida doble tiene que cuadrar SIEMPRE. Antes
   solo el asiento manual lo validaba; los automáticos posteaban sus líneas sin verificar, así que un
   error de cálculo o de redondeo descuadraba los libros en silencio. Ahora **todo** pasa por un solo
   motor (`guardarAsientoBalanceado`) que lo exige; si no cuadra, no se registra y queda en Auditoría
   (`ASIENTO_DESCUADRADO`) para revisarlo.
2. **Ningún asiento queda colgando.** Si la cabecera se creó pero las líneas fallan, la cabecera
   huérfana se borra sola — antes quedaba un asiento sin líneas ensuciando los libros.
3. **Cada asiento nace de un origen y se puede reversar.** Venta/compra/cobro/devolución/nómina
   guardan su `tipo` y `origen_id`; anular o eliminar el documento borra su asiento
   (`delAsientoOrigen`), no lo deja pegado.
4. **Un asiento sin plan de cuentas no se inventa.** Si la organización no tiene su plan de cuentas
   creado, el asiento automático simplemente no se registra (no revienta, no descuadra) — el negocio
   sigue vendiendo; la contabilidad arranca cuando se crea el plan.

**Nota:** al día de hoy la base tiene **0 asientos** (todo limpio), así que la red de seguridad
todavía no ha tenido que atrapar nada — se deja el motor a prueba de balas antes de que se use en
serio, igual que los reglamentos anteriores.

**Pendientes de este reglamento (NO construidos):** no hay cierre de período (los libros nunca se
"cierran" a fin de mes/año) · el costo de la venta (COGS) usa el costo de HOY del producto, no el
costo real del día en que se vendió (`pos_venta_items` no guarda el costo del momento) · no hay
conciliación bancaria ni centro de costo.
