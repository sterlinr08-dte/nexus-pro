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
| 4 | **Fiscal y documentos (NCF, e-CF, notas de crédito)** | ✅ decretado y auditado — v49.94 |
| 5 | **Inventario (existencia, kardex, almacenes)** | ✅ decretado y auditado — v49.90 |
| 6 | **Contabilidad (partida doble, asientos automáticos)** | ✅ decretado y auditado — v49.91 |
| 7 | **Clientes y entidades** | ✅ decretado y auditado — v49.92 |
| 8 | **Taller (reparaciones, garantías)** | ✅ decretado y auditado — v49.93 |
| 9 | **Seguros (clientes, facturación, cobro, NCF)** | ✅ decretado y auditado — v49.95 |
| 10 | **Vista rueda** (modo experimental de Facturas, solo admin) | ✅ decretado y construido — v50.9 |

> Los §1-8 son del **POS/Multiempresa**. El §9 es el **núcleo de Seguros** (`index.html`), el negocio
> original — correduría de seguros de salud. Es el único módulo con DATOS REALES en producción (109
> clientes, 300 facturas, 174 cobros), así que su auditoría no es forward-looking: es dinero en vivo.

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

## 4 · REGLAMENTO FISCAL Y DOCUMENTOS
*(decretado por el dueño el 26-jul-2026 · auditado y aplicado en v49.94)*

Aplica a los comprobantes fiscales (NCF), la facturación electrónica (e-CF) y las notas de crédito.

1. **Un NCF nunca se repite.** El comprobante fiscal (NCF) que se le pone a una factura es único —
   dos ventas simultáneas (dos cajeros, dos pestañas) no pueden recibir el mismo número. El número se
   aparta de forma **atómica** en la base misma (RPC `pos_siguiente_ncf`: `UPDATE...RETURNING`
   serializa por bloqueo de fila), no leyéndolo y sumándole 1 en el navegador. Candado de último
   nivel: índice único `pos_ventas(organizacion_id, ncf)` — la base rechaza guardar dos facturas con
   el mismo NCF, pase lo que pase.
2. **Sin secuencia disponible, no se factura con NCF.** Si el tipo de comprobante no tiene una
   secuencia activa, vigente y con números por delante (`actual ≤ hasta`, no vencida), la factura sale
   **sin** NCF — nunca con un número inventado ni fuera de rango.
3. **Cada tipo de comprobante consume SU propia secuencia.** Consumo→B02, Crédito Fiscal→B01,
   Gubernamental→B15, Régimen Especial→B14; anulación/devolución→B04 (nota de crédito fiscal). El
   selector de la factura usa nombres (`consumo`/`credito_fiscal`/…) que se mapean al código B0x.
4. **Anular una factura con NCF emite su nota de crédito fiscal (B04)** automáticamente, como exige la
   DGII — reusando el mismo apartado atómico. Si no hay secuencia B04, se avisa (no se anula en
   silencio dejando el NCF huérfano).
5. **Aviso de agotamiento.** Cuando restan ≤10 números de una secuencia, el sistema avisa. La caché en
   memoria (`_ncfSecs`) se mantiene al día después de cada consumo para que ese aviso sea fiel.

**Estado de la auditoría (v49.94):** el hueco real era la **carrera de lectura+escritura** en
`asignarNCF` — leía `actual`, calculaba el NCF y luego pateaba `actual+1`; dos ventas concurrentes leían
el mismo `actual` y emitían el MISMO NCF. Cerrado de raíz: RPC atómica + índice único. Se midió la base
antes de tocar: 0 ventas con NCF, 0 duplicados (nunca había pasado en producción porque bayolsale casi no
factura con NCF, pero el hueco estaba vivo). El `asignarNCF` del navegador llama la RPC y solo cae a la
lógica vieja de respaldo si la RPC no está desplegada (base vieja) — verificado con 15 comprobaciones.

**e-CF (facturación electrónica DGII) — lo que FALTA, para el trámite del dueño.** La e-CF es
**OBLIGATORIA desde el 15-nov-2026** para micro/pequeños contribuyentes; sin ella el POS será invendible
a un negocio formal. Hoy el sistema emite NCF "de papel" (B0x), NO e-CF. Para llegar a e-CF hace falta,
en orden:
- **(A) Certificado digital tributario** del negocio (lo emite una entidad autorizada por la DGII —
  trámite y costo del dueño, ~2-4 semanas).
- **(B) Un PSFE** (Proveedor de Servicios de Facturación Electrónica, ej. **Alanube**, el mismo que usa
  Alegra) o conexión directa al ambiente de la DGII. Se contrata por API; NEXUS ya tiene la
  infraestructura (Edge Functions) para integrarlo sin plataforma intermedia.
- **(C) Los e-CF nuevos** (e-31 factura de crédito fiscal, e-32 consumo, e-34 nota de crédito, etc.)
  reemplazan/conviven con los B0x; el XML firmado se envía a la DGII y esta devuelve un **track-id** de
  aceptación. Falta: mapear cada tipo B0x→e-CF, generar y firmar el XML, mandarlo al PSFE, guardar el
  track-id en `pos_ventas`, y el **RNC del comprador** (hoy no se captura — es requisito del e-31).
- **(D) 606/607/608** (reportes DGII): solo existe 607 parcial. Faltan 606 (compras) y 608 (anulados).
- **Recomendación:** el dueño arranca YA con (A) el certificado y elige PSFE (B) — son las piezas que no
  dependen del código y tienen plazo largo. La integración (C/D) se construye después, con el certificado
  en mano, en su propia ronda supervisada (toca dinero y un servicio externo real).

**Pendientes de este reglamento (NO construidos):** todo el e-CF (A-D arriba) · captura del RNC del
comprador · nota de débito · multi-moneda · plantillas/logo por documento.

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

---

## 7 · REGLAMENTO DE CLIENTES Y ENTIDADES
*(decretado por el dueño el 26-jul-2026 · auditado y aplicado en v49.92)*

Aplica al maestro de terceros del POS (`pos_clientes` — una misma ficha puede ser cliente, proveedor,
empleado o banco) y a los proveedores.

**Parte A — crear y editar**

1. **Toda entidad tiene al menos un rol** (cliente / proveedor / empleado / banco). Sin rol no se
   guarda.
2. **No se crean duplicados a ciegas.** Al crear, si ya existe otra ficha con el mismo teléfono o la
   misma cédula/RNC (normalizados), se avisa y se ofrece **abrir la que ya existe** en vez de duplicar.
   Al editar no aplica (es la misma ficha).
3. **Los roles quedan conectados donde corresponde.** Un empleado se sincroniza con Recursos Humanos;
   quitarle el rol "empleado" desactiva su ficha de RRHH. Un proveedor que es Entidad no se edita/
   borra desde Compras — se maneja desde Entidades, para no romper la ficha compartida.

**Parte B — eliminar**

4. **El borrado es SIEMPRE suave** (`activo:false`): la ficha desaparece de la lista activa pero su
   historial (ventas, cobros, compras) se conserva y es recuperable. Nunca se destruye el dato.
5. **No se elimina un cliente que todavía te debe** sin reconocer la deuda — si desaparece de la lista,
   se pierde de vista a un deudor. Al **cajero** se le bloquea (le dice cuánto debe); **admin/gerente**
   pueden hacerlo confirmando, y queda en Auditoría. Mismo criterio para un **proveedor al que todavía
   le debes** (cuenta por pagar).

**Nota:** al día de hoy la base tiene **0 clientes con fiado y 0 proveedores con cuenta por pagar**,
así que la regla 5 todavía no le bloquea a nadie — se deja correcta antes de que se use, igual que los
reglamentos anteriores.

**Pendientes de este reglamento (NO construidos):** los apartados (`pos_apartados`) no tienen
`cliente_id` — se ligan por nombre/teléfono, así que un apartado activo NO cuenta como "deuda" al
borrar un cliente (no se finge un enlace que la base no tiene) · no hay fusión de dos fichas duplicadas
en una sola (hoy solo se avisa al crear).

---

## 8 · REGLAMENTO DEL TALLER (Reparaciones)
*(decretado por el dueño el 26-jul-2026 · auditado y aplicado en v49.93)*

Aplica al servicio técnico: recibir un equipo, moverlo por sus estados, entregarlo y cobrarlo, y su
garantía.

1. **Un equipo no se recibe sin identificarlo.** Cliente, equipo y falla son obligatorios; se le
   asigna un número consecutivo (REP-#####) y arranca en estado "Recibido".
2. **El dinero del taller entra al arqueo o no entra.** Un avance al recibir (siempre efectivo) o el
   cobro en efectivo al entregar exigen **caja abierta** — mismo candado del §2/§3. Transferencia/
   tarjeta sí se registran con la caja cerrada; recibir un equipo SIN avance no necesita caja.
3. **El estado avanza por sus pasos** (Recibido → Diagnóstico → Reparando → Esperando pieza → Listo →
   Entregado, o Cancelado). Pasar a "Entregado" pasa obligatoriamente por la ventana de cobro — no se
   entrega saltándose el cobro.
4. **La garantía se fija al ENTREGAR**, una sola vez, según los días configurados en Ajustes
   (`garantia_rep_dias`). Si es 0 no hay garantía. Después se ve vigente/vencida calculada en vivo.
5. **El cobro de la entrega puede ser mayor que el presupuesto** — el presupuesto es una estimación y
   el diagnóstico final manda, así que ese cobro NO se topa (a diferencia de una cuota o un apartado,
   que sí se topan a lo pendiente).

**Nota:** al día de hoy la base tiene **0 reparaciones**, así que el candado de caja todavía no le
bloquea a nadie — se deja correcto antes de que se use, igual que los reglamentos anteriores.

**Pendientes de este reglamento (NO construidos):** el taller no consume piezas del inventario (el
costo de las piezas es un número manual, no descuenta stock) · no hay un flujo de "reclamo de
garantía" que reabra la orden — la garantía es informativa (se sabe si un equipo entregado sigue
cubierto), sin botón de reapertura.

---

## 9 · REGLAMENTO DE SEGUROS
*(decretado por el dueño el 26-jul-2026 · auditado y aplicado en v49.95)*

El núcleo del negocio: clientes de seguro de salud, su facturación mensual, el cobro y el
comprobante fiscal. **Es el único módulo con datos reales en producción — se audita como dinero en
vivo, no como regla forward-looking.**

**Modelo de deuda**

1. **`deuda_total` = suma de las primas facturadas** (`prima_base + prima_deps`) de las facturas NO
   anuladas del cliente. `reconciliarDeudasClientes` solo la SUBE al facturado (additivo), nunca la
   baja sola.
2. **`pagado` = suma de los pagos aplicados a facturas.** `pend(c) = deuda_total − pagado` (solo
   facturas).
3. **La "deuda antes del sistema" (`deuda_anterior`) es una bolsa SEPARADA** — no se mezcla con las
   facturas. `pendTot(c) = pend(c) + deuda_anterior`. Cada cobro se dirige explícitamente a facturas
   (por defecto) o a la deuda anterior; nunca se cruzan.
4. **El estado de cada factura (Pendiente/Parcial/Pagado) es una CACHÉ, no la verdad.** La verdad se
   calcula repartiendo el `pagado` del cliente de la factura MÁS VIEJA a la más nueva
   (`_saldoFacturasCliente`). **Toda operación que mueva ese reparto — registrar un pago, corregir el
   precio de una factura, anular una factura — DEBE resincronizar el estado de TODAS las facturas del
   cliente (`resyncEstadoFacturas`), no solo la que se tocó.** Las listas de "pendientes/atrasadas"
   recalculan el saldo real, no confían en la etiqueta.

**Facturación**

5. **Se factura solo a clientes activos y con `permitir_facturacion` ≠ false** (familiar/cortesía no
   factura).
6. **Anti-duplicado por período:** nunca dos facturas no anuladas del mismo cliente en el mismo
   período. El chequeo consulta la BASE, no solo la memoria (la auto-facturación del servidor puede
   haber generado ya el período).
7. **Cada factura congela el precio del momento.** Corregir una factura ya generada es el único
   camino para cambiar su monto; una factura **pagada no se corrige** (se anula), una **anulada no se
   cobra ni se corrige**.
8. **El corte 20-al-20 manda en las vistas:** antes del día 20 el mes vigente es el anterior
   (`mesCorte`) — junio no es "atrasada" el 5 de julio, todavía es el mes en curso de cobro.

**Comprobante fiscal (NCF)**

9. **El NCF se aparta de forma atómica en la base** (`siguiente_ncf`, `UPDATE...RETURNING`) — nunca
   se repite. Formato **DGII estándar de 11 caracteres SIN guion** (`B0200000005`). La generación
   manual y la auto-facturación del servidor comparten el MISMO contador (`secuencias_ncf`). Candado
   de último nivel: índice único parcial `facturas(ncf)`.

**Cobro**

10. **Un cobro exige agente que cobró, referencia, y banco** (si es transferencia/depósito). Registra
    el abono, el asiento contable (Caja/Banco vs Cuentas por cobrar) y **resincroniza el estado de las
    facturas**. Un pago mayor que lo pendiente pide confirmación (pago adelantado). El e-CF de la DGII
    (§4) aplica igual a Seguros — hoy emite NCF de papel, falta la facturación electrónica.

**Estado de la auditoría (v49.95):** la base estaba sana en lo grande (0 NCF duplicados, `deuda_total`
cuadra con las primas en los 109 clientes). Se encontraron **2 huecos reales**: (a) `nxEditarPrecioFactura`
y `anularFactura` no resincronizaban el estado de las demás facturas del cliente — dejaban etiquetas
viejas; se midieron **11 facturas reales** mostrando más deuda de la real (Parcial/Pendiente que ya
estaban Pagadas), corregidas por SQL (solo la etiqueta, cero montos) + resync agregado a las 2
funciones. (b) el NCF manual salía con guion (`B02-00000005`) mientras la auto-facturación usa el
formato DGII sin guion — unificado, más el índice único de red de seguridad. Verificado con 10
comprobaciones end-to-end sobre el código real (el pago se re-reparte a las facturas correctas tras
corregir un precio o anular).

**Pendientes de este reglamento (NO construidos):** e-CF de la DGII (ver §4, obligatorio 15-nov-2026)
· los NCF históricos con guion (103, todos viejos) se dejan como están — no se reescriben documentos
fiscales ya emitidos · las comisiones de agente y las transferencias entre agentes tienen su propia
lógica, no auditada en esta tanda.

---

## §10 — VISTA RUEDA (modo experimental de Facturas, solo administrador)

**Es un reglamento de DISEÑO/UX, no de negocio.** No toca dinero: es solo una forma alterna de
**ver** la lista de Facturas del seguro. Decretado y construido en la v50.9.

1. **Quién la ve.** Solo el **administrador** (`sesion.rol==='admin'`). Se prende/apaga con el
   interruptor **Ajustes → Apariencia → "Vista experimental (rueda)"**, que ni siquiera se dibuja
   para los agentes. La preferencia vive en la base (`nxPref('vista_rueda')`, no en el navegador).
   **Por defecto apagada.**
2. **Solo web móvil.** Se activa solo si `matchMedia('(max-width:720px)')` — en la computadora
   siempre se ve la tabla normal. (`nxUsarRueda()` = admin && pref && móvil.)
3. **Solo cambia la presentación.** Los datos, el cálculo de saldo/deuda, el NCF y el cobro son
   idénticos a la tabla. Apagar el interruptor devuelve la tabla al instante (`rFact()` se repinta).
4. **Solo en Facturas.** Es el modo de prueba. Cobros/Pendientes/Historial se evalúan después.
5. **El color manda, no el orden.** Respeta el orden actual de la lista (no reordena). El color de
   la tarjeta dice quién debe: **rojo** = pendiente, **ámbar** = parcial, **verde** = pagado/al día,
   **gris** = anulada.
6. **Todas las tarjetas son tocables** (cambio aprobado por el dueño el 27-jul): tocar el nombre →
   ficha del cliente (`verCliente`); el monto → cobrar (`cobrarDesdeFact`); la tira roja → detalle de
   meses anteriores (`nxMesesAntVer`); COBRAR / WhatsApp (`enviarWA`) / ⋮ (`nxFactMenu`) → lo mismo
   que en la tabla. Ninguna acción de cobro nueva; son wrappers de las que ya existen.
7. **Cada tarjeta muestra lo mismo de hoy:** nombre + apodo, agente · empresa, logo de la ARS,
   estado (pastilla), monto del mes, "Meses anteriores" si debe, marca y los 3 botones.
8. **Buscador y filtros siguen igual.** `rFact()` filtra y ordena exactamente igual; la rueda solo
   pinta la lista resultante (misma variable `lista`).
9. **Fluidez.** Las transformaciones 3D se aplican con `requestAnimationFrame` y se **saltan las
   tarjetas fuera de vista** (`getBoundingClientRect` fuera de ±300px) para no gastar con 100+
   facturas.
10. **Respeta "reducir movimiento".** Si el iPhone tiene esa opción de accesibilidad, la rueda se
    aplana (sin inclinación ni velo) — `@media (prefers-reduced-motion:reduce)` + guardia en JS.
11. **Es modo de exhibición, no de velocidad.** Muestra 1 factura de frente a la vez; para cobrar en
    volumen la lista es más rápida. Por eso es un modo aparte que el admin enciende cuando quiere.
12. **Queda en auditoría.** Encender/apagar el interruptor deja `VISTA_RUEDA_ON` / `VISTA_RUEDA_OFF`
    en la auditoría.

**Implementación (v50.9):** CSS `.sfr-*` en `index.html`; interruptor en `rApariencia()` +
`nxToggleVistaRueda()`; rama en `rFact()` gateada por `nxUsarRueda()`; scroll de la rueda en
`nxRuedaAplicar()`/`nxRuedaScrollOn()`/`nxRuedaScrollOff()` (se auto-apaga al salir de Facturas).
Verificado con Playwright sobre el código real de `rFact` extraído del archivo (rueda solo con
admin+pref+móvil; tabla en apagado y en escritorio; las 3 tarjetas activas tocables disparan las
acciones reales; sin desborde en 390px; 0 errores de JS). **Pendiente:** que el dueño lo pruebe en su
iPhone y decida ajustes / si se lleva a las otras pantallas.
