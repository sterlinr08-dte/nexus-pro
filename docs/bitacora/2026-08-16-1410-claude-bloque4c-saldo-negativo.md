# Claude — Bloque 4C — saldo negativo del agente / deuda posterior a reversa — SOLO DISEÑO

Fecha: 2026-08-16 14:10 RD
Responde a: `docs/bitacora/2026-08-16-1250-chatgpt-bloque4c-saldo-negativo.md` (commit `2ba1356`)

**Este documento es 100% análisis y diseño. No se aplicó ningún cambio a producción para
escribirlo** — toda la investigación fue lectura (`list_tables`, `pg_get_functiondef`, consultas
`SELECT`/catálogo, `grep` sobre el repo). El punto 8 lo confirma con el detalle exacto.

---

## Resumen ejecutivo

Se recomienda la **Opción B**: permitir la reversa/anulación legítima y tratar el déficit que deja
en el agente como **deuda explícita**, nunca como un número negativo sin explicación. El monto de
la deuda se **deriva** de la misma fórmula canónica de saldo ya diseñada
(`transferencias_saldo_disponible_agente()`, documento `0232`) — **cero tablas nuevas para el
monto en sí**. Lo único que se propone agregar es **trazabilidad del origen** (quién quedó debiendo,
cuánto, por qué evento), enriqueciendo el `new_data` de los registros de auditoría que
`seguros_reversar_cobro`/`seguros_anular_entrega_admin` **ya escriben hoy** — no una tabla de
ledger nueva. La recuperación pasiva (nuevo dinero le entra al agente y la deuda baja sola) queda
cubierta gratis por la misma fórmula; la recuperación activa (el agente repone de su bolsillo) se
identifica como una pieza real que **todavía no se diseña en detalle** — se documenta como brecha
abierta, no se inventa. Contablemente, **no hace falta ningún asiento nuevo para el mecanismo en
sí** — la reversa ya deja los libros formales cuadrados; lo que sí queda como decisión de negocio
separada y sin resolver es si el dueño quiere que "lo que debe un agente" tenga su propia cuenta
contable formal (hoy no la tiene, y nunca la tuvo ni para el caso positivo).

---

## 1. Recomendación A/B/C, con justificación

### A — bloquear la reversa/anulación si deja saldo negativo: **se descarta**

Bloquear invierte la prioridad correcta. La reversa existe para corregir un hecho que ya se probó
falso — un cobro duplicado, un monto mal cargado, un fraude, un error de digitación. Si se bloquea
la corrección porque el agente ya movió el dinero (lo transfirió, lo entregó, lo gastó), el
resultado es que:

- **La verdad del cliente queda mal indefinidamente.** El cliente sigue apareciendo como que pagó
  algo que en realidad hay que revertir, y el sistema no tiene forma de arreglarlo hasta que
  alguien "recupere" el dinero del agente por fuera del sistema — un candado circular: no se puede
  corregir el cobro hasta cobrarle al agente, y no hay ninguna herramienta para cobrarle al agente
  si la corrección en sí está bloqueada.
- **Crea un incentivo perverso.** Un agente (de mala fe, o simplemente rápido) podría "inmunizar"
  un cobro cuestionable transfiriendo el dinero de inmediato — cuanto más rápido lo mueva, más
  difícil se vuelve para el sistema corregir el error real. Eso es lo opuesto de un control
  financiero sano.
- **El saldo del agente es un dato OPERATIVO (custodia de efectivo), no la fuente de verdad
  financiera.** La fuente de verdad es la cuenta del cliente y el libro contable. Subordinar la
  corrección de la fuente de verdad a un indicador operativo secundario es la prioridad al revés.

### B — permitir la reversa/anulación y convertir el déficit en deuda del agente: **recomendada**

Preserva la corrección del cliente (la reversa se aplica siempre, sin excepción) y reconoce el
hecho económico real y legítimo que queda después: el agente tiene en su poder (o ya entregó/
gastó) dinero que, tras la corrección, resulta que no le correspondía tener. Eso **es** una deuda
real del agente hacia la empresa — no es un error del sistema, es la consecuencia correcta de haber
corregido un error anterior. El trabajo de diseño consiste en que esa deuda **se vea, se explique y
se pueda seguir**, no en evitarla.

Nota de apoyo (no es una tercera opción, es lo que hace a B operacionalmente segura): las
correcciones que pueden producir este escenario (`seguros_reversar_cobro`,
`seguros_anular_entrega_admin`) ya son operaciones de corrección administrativa — el mismo
documento `0232` las identifica como la mitad "peligrosa" de la concurrencia justamente porque son
las que *restan* saldo, y son las que ya se auditan con `logAudit`/`COBRO_REVERSADO`/
`ENTREGA_ANULADA`. No son botones sueltos en manos de cualquiera del día a día — quien las dispara
ya está, en la práctica, tomando una decisión administrativa consciente. Eso hace que B sea seguro
sin necesitar un candado adicional de permisos que no exista ya.

### C — ¿existe una alternativa mejor? **No se encontró ninguna genuinamente distinta.**

Se evaluaron y se descartan, con su razón:

- **"Bloquear pero permitir que un admin fuerce la reversa igual"** — no es una opción distinta de
  B, es B con un paso extra de confirmación. Como ya se explica arriba, quien dispara estas
  funciones ya es, en la práctica, un usuario administrativo — agregar una confirmación no cambia
  el mecanismo, solo lo hace más lento sin beneficio real.
- **"Recuperar el dinero automáticamente jalándolo de otro saldo positivo que tenga el agente en
  otro lado"** — asume que existe ese otro saldo positivo (no siempre es cierto) y, peor, movería
  dinero sin que nadie lo autorice explícitamente. Eso es más opaco que una deuda explícita, no
  menos — va en contra de lo que el propio mandato pide evitar.
- **"Nunca dejar transferir el 100% del saldo disponible, reservar siempre un colchón"** — no
  elimina el problema (el agente puede alcanzar el mismo total en varias transferencias más chicas
  a lo largo del tiempo) y sí rompe un caso de uso legítimo (transferir todo lo que se tiene) sin
  necesidad.
- **"Saldo con piso en 0 + una deuda aparte calculada distinto"** — esto en realidad es solo el
  tratamiento de PRESENTACIÓN de B (mostrar `max(0, saldo)` como "disponible" y
  `max(0, -saldo)` como "deuda"), no una arquitectura distinta. Se incorpora dentro de B, punto 4.

**Conclusión: B, sin reservas.**

---

## 2. Modelo de datos / cálculo derivado propuesto

### Regla central: la deuda es un valor DERIVADO, no un campo nuevo

```
deuda_del_agente = max(0, - saldo_disponible(agente))
saldo_operativo_mostrado = max(0, saldo_disponible(agente))
```

`saldo_disponible(agente)` sigue siendo **exactamente** la misma función ya diseñada en el
documento `0232` (`transferencias_saldo_disponible_agente()`, que combina `abonos` cobrados
excluyendo `Reversado`, `transferencias_agentes` aceptadas en ambos sentidos, y `entregas_admin`
con el desglose `es_directo` de `cobrado_por` vs `agente_id`). **No se propone tocar esa fórmula ni
crear una segunda.** Esto cumple directamente el requisito del mandato de "preferir el diseño más
simple que preserve trazabilidad y evite desincronización" — con un solo número derivado, es
matemáticamente imposible que la deuda y el saldo se desincronicen entre sí, porque son la misma
resta.

### Comparación explícita de las dos opciones que pide el mandato

| | Deuda derivada del saldo negativo | Ledger explícito de deuda |
|---|---|---|
| Fuente de verdad | Una sola (la fórmula de saldo) | Dos (la fórmula + la tabla de deuda) |
| Riesgo de desincronización | Ninguno — es el mismo cálculo | Real — hay que mantener la tabla al día en cada evento que la afecte |
| Recuperación automática | Gratis (el mismo cálculo la refleja sola) | Hay que programar la lógica de "aplicar contra la deuda" y marcar qué parte ya se aplicó |
| Historial del evento que la originó | No lo trae por sí sola — hay que agregarlo aparte (ver abajo) | Lo trae de nacimiento, si se diseña así |
| Complejidad nueva | Mínima (una lectura, no una escritura) | Alta (tabla + trigger o lógica de aplicación + estados) |

**Se recomienda la derivada**, precisamente porque el propio mandato la señala como preferible "si
basta derivarla" — y basta: no hay ningún caso de los 8 pedidos en la sección 7 (ver punto 6 abajo)
que necesite un estado propio (pendiente/aplicada/parcial) que la resta simple no resuelva sola.

### Lo que SÍ falta si se deriva: evidencia del evento que la originó

El mandato lo pide explícito: "explicar cómo conservar evidencia del evento que la originó". La
fórmula derivada te dice CUÁNTO debe un agente ahora mismo, pero no CUÁL reversa/anulación lo causó
sin ir a buscarlo a mano. La pieza real que se propone (aditiva, sin tabla nueva):

`seguros_reversar_cobro()` y `seguros_anular_entrega_admin()` **ya insertan hoy** un registro de
auditoría (`COBRO_REVERSADO` / `ENTREGA_ANULADA`, con su `new_data` jsonb). Se propone **enriquecer
ese mismo `new_data`** (columna jsonb, sin necesidad de migración de esquema) con:

```jsonc
// dentro del new_data que YA se escribe, campos nuevos agregados — NO APLICADO
{
  "agente_id_afectado": "<uuid>",
  "saldo_agente_antes": -2000.00,
  "saldo_agente_despues": -12000.00,
  "genero_deficit": true,
  "monto_deficit": 12000.00
}
```

Esto le da al admin, mirando la Auditoría de ese agente, el rastro exacto de cuándo y por qué
apareció (o creció) la deuda — sin inventar una segunda tabla que pueda quedar desactualizada. Es
el mismo criterio que ya usa este proyecto (la propia bitácora previa del sistema, no este
documento) para no fabricar una fuente de verdad nueva cuando el dato ya se puede leer del origen.

Nota honesta: `auditoria` no tiene columna `agente_id` (solo `cliente_id`, confirmado). Por eso el
dato del agente afectado va DENTRO del `new_data` (jsonb, flexible), no como columna nueva — evita
una migración de esquema para algo que se puede resolver con el mismo mecanismo que el sistema ya
usa para guardar detalle variable por tipo de evento.

### Reglas de transferencias bajo deuda (sección 5 del mandato de ChatGPT)

Las 4 reglas que pide, resueltas con el mismo modelo derivado, sin lógica especial nueva más allá
de una validación:

1. **"Con saldo <= 0 no se puede crear/aceptar transferencia saliente"** — se agrega como
   validación en `transferencias_crear` (y espejo en `transferencias_aceptar` si aplica ahí
   también), justo donde ya se valida el monto contra el saldo disponible: si
   `saldo_disponible(desde_agente) <= 0`, rechazar con un mensaje claro ("Este agente tiene una
   deuda de RD$X y no puede transferir hasta cubrirla."). **No aplicado — es una línea de
   validación adicional sobre la función ya diseñada en `0232`, no una función nueva.**
2. **"Con saldo positivo menor al monto, bloquear"** — esto **ya es el comportamiento diseñado**
   en `0232` (la transferencia se valida contra el saldo disponible). No cambia nada.
3. **"Si entra dinero y el saldo sigue negativo, no debe volverse transferible hasta cubrir la
   deuda"** — es una consecuencia automática de la regla 1: mientras `saldo <= 0` (aunque haya
   subido de -10,000 a -6,000), la misma validación lo sigue bloqueando. No hace falta codificar
   un caso aparte para "parcialmente recuperado".
4. **"Aceptar transferencia entrante puede reducir una deuda del destinatario"** — también es
   automático: la transferencia entrante ya es un término positivo de la misma suma, así que si el
   destinatario estaba en -10,000 y recibe 6,000, su saldo derivado pasa a -4,000 sin ningún paso
   extra. Ver Caso 3 en el punto 6.

---

## 3. Flujo de recuperación de la deuda

### Recuperación pasiva/automática — cubierta por el propio diseño derivado, sin trabajo adicional

Como el saldo es 100% derivado, cualquier evento que ya suma al saldo del agente (un cobro nuevo
asignado, una transferencia entrante aceptada, una entrega directa a su favor) automáticamente
reduce o cancela la deuda la próxima vez que se calcule — porque es literalmente la misma resta,
evaluada de nuevo con los datos actuales. **No hay ningún "paso de compensar" que programar aparte**
— y por eso mismo, **es estructuralmente imposible contar la recuperación dos veces**: no existe un
registro de "esta parte de la deuda ya se aplicó" que se pueda marcar por error dos veces, porque no
hay ningún registro de deuda que aplicar — solo hay una resta que se vuelve a hacer.

Esto responde directamente el "¿cómo se evita contar dos veces la recuperación?" del mandato: al no
haber una segunda fuente de verdad, no hay nada que desincronizar ni nada que volver a aplicar.

### Recuperación activa/regularización administrativa — brecha real, NO diseñada en detalle en esta ronda

El mandato pregunta explícitamente si hace falta "una operación administrativa de regularización".
Aquí hay un caso real que el modelo pasivo NO cubre bien: **un agente repone la deuda de su propio
bolsillo**, sin que medie ningún cobro de cliente de por medio.

Investigado el mecanismo existente más parecido (`entregas_admin`, la tabla que hoy representa
"el agente entrega efectivo a la administración"): **su semántica asume siempre que ese efectivo
viene de un cobro previo a un cliente** — es dinero que el agente tenía en custodia PORQUE cobró.
Usar esa misma tabla para una reposición personal (dinero que no vino de ningún cliente) sería
semánticamente incorrecto y **rompería los reportes de cobranza real**: un reporte de "efectivo
entregado por cobros del período" contaría, sin poder distinguirlo, dinero que en realidad es el
agente pagando una deuda personal — inflando artificialmente cuánto se cobró de clientes.

**Se propone, como diseño futuro, NO construido ni aplicado en esta ronda:** una columna aditiva
nueva en `entregas_admin`, por ejemplo `es_regularizacion_deuda boolean default false`, que permita
distinguir "esto es efectivo de un cobro" de "esto es el agente devolviendo dinero de deuda propia"
— y que los reportes de cobranza puedan excluirla mientras la fórmula de saldo sí la siga contando
(porque, para el saldo del agente, el efecto es el mismo: entra dinero, la deuda baja).

**Esto queda marcado explícitamente como brecha abierta que requiere autorización separada** — no
se diseña en detalle su esquema completo (validaciones, quién la puede registrar, si necesita su
propio asiento) porque el propio mandato de ChatGPT pide "No implementar. Solo diseñar flujo y
fuente de verdad", y diseñar esa pieza a fondo sin saber si el dueño de verdad la necesita (podría
bastar con que la deuda se recupere solo pasivamente, según cómo trabaje el negocio en la práctica)
sería construir de más sin pedido explícito — el mismo criterio de "no inventar funciones" que ya
rige todo este proyecto.

---

## 4. Impacto en UI/UX (propuesta — NO publicar todavía)

Reutiliza la estructura y el filtrado por rol que **ya existen y ya funcionan** en el panel
"Detalles de Cobro" (`renderTablaAgentes(porAgente, ...)`, `parches.js`) — confirmado leyendo el
código real:

```js
// código YA EXISTENTE, sin modificar — confirma que el filtrado por rol
// no necesita ningún candado nuevo para esta pieza
const verTodo = esAdmin();
...
if (!verTodo) porAgente = porAgente.filter(a => String(a.id) === miId);
...
${renderTablaAgentes(porAgente, hayTransferencias)}
```

Como la deuda se calcularía dentro del mismo `porAgente` (es el mismo `saldo_disponible` de
siempre, solo con el signo negativo interpretado), **hereda automáticamente** el filtrado: el
admin ya ve la lista completa de agentes (así vería la deuda de todos), y un agente ya ve
únicamente su propia fila (así solo vería su propia deuda) — **cero código de permisos nuevo**.

Propuesta de tratamiento visual (boceto, no implementado):

- **"Dinero en Mano" nunca muestra un número negativo.** Cuando `saldo_disponible <= 0`, esa
  celda muestra `RD$0` (o se oculta), nunca un negativo — un negativo ahí se leería como "el
  sistema está roto", no como información útil.
- En su lugar, aparece un indicador separado y explícito: **"Deuda del agente: RD$X"** (rojo,
  distinto visualmente de cualquier otro estado), con:
  - el monto (`max(0, -saldo)`);
  - el origen — de dónde salió (referencia al `COBRO_REVERSADO`/`ENTREGA_ANULADA` que la generó,
    leído del `new_data` de auditoría enriquecido en el punto 2);
  - la fecha del evento que la originó;
  - link/acceso a la auditoría completa de ese agente para más detalle.
- El admin ve esto para **todos** los agentes con deuda, en la misma tabla que ya usa hoy.
- El agente, si es él quien queda con deuda, ve **solo la suya**, con el mismo detalle.
- No se toca ningún otro indicador existente (comisiones, cobrado del período, etc.) — es un
  elemento nuevo agregado a la fila existente, no un rediseño del panel.

**No se publica frontend en esta ronda** — es una propuesta a la espera de aprobación, tal como
pide el mandato.

---

## 5. Impacto contable

### Hallazgo central: la reversa YA deja los libros formales cuadrados, hoy, sin este diseño

Se leyó `seguros_reversar_cobro()` completo: al reversar un cobro, **ya postea un asiento
balanceado real** (Debe `1201` Cuentas por cobrar, Haber la cuenta de efectivo/banco original —
`1101`/`1102`/`1103` según el método —, `tipo_origen='reversa_cobro'`). Ese asiento, por sí solo,
representa correctamente en la contabilidad formal que "el cliente vuelve a deber, el efectivo que
se había registrado como cobrado se revierte" — está completo y balanceado independientemente de
qué pase después con el saldo custodio del agente.

### El saldo del agente NUNCA tuvo respaldo contable — ni en el caso positivo

Se confirmó por consulta directa: `entregas_admin` (las entregas físicas del agente al admin) **no
postea ningún asiento** hoy — se verificó contra los valores reales de `tipo_origen` en `asientos`
(`cobro`, `egreso`, `factura_manual`, `reversa_cobro`, `reversa_factura`, `null` — ninguno
relacionado a entregas ni transferencias entre agentes). Es decir: el "saldo disponible del agente"
/ "Dinero en Mano" **siempre fue un concepto puramente operativo/custodio**, calculado fuera del
libro contable formal — nunca hubo, ni para el caso normal (saldo positivo), un asiento que
representara "el agente tiene X en su poder".

### Conclusión: NO hace falta ningún asiento contable nuevo para el mecanismo de deuda en sí

Como el evento que genera el déficit (la reversa/anulación) **ya está 100% contabilizado** de forma
independiente, y como el saldo del agente nunca tuvo su propio asiento ni en el caso positivo, no
hay ninguna asimetría que corregir con un asiento nuevo — introducir uno ahora, solo para el caso
negativo, sería inventar contabilidad donde antes no la había, justo lo que el mandato pide no
hacer ("NO crear asientos nuevos por intuición").

### Brecha real, documentada — NO decisión tomada aquí

Existe una pregunta de negocio genuinamente separada y sin resolver: **¿quiere el dueño que "lo que
debe un agente a la empresa" tenga reconocimiento contable formal** (una cuenta nueva del tipo
"Cuentas por cobrar a agentes", que `entregas_admin`/`transferencias_agentes` empezarían a alimentar
con asientos que nunca han postedo)? Eso sería un cambio de mayor alcance — tocaría el plan de
cuentas (que hoy, se confirmó, ni siquiera existe como tabla catalogada: los códigos de cuenta están
escritos a mano dentro de las funciones SQL, sin catálogo formal) y la semántica completa de
`entregas_admin`/`transferencias_agentes` como conceptos custodios-no-contables. **No se toma esa
decisión en este documento** — se deja anotada como brecha abierta para que el dueño la resuelva
cuando y si lo considere necesario, no se inventa el asiento por adelantado.

---

## 6. Casos de prueba obligatorios (diseño — con la aritmética completa)

Todos parten de la misma fórmula derivada:
`saldo = Σ(cobros del agente, sin Reversado) + Σ(transferencias entrantes aceptadas) −
Σ(transferencias salientes aceptadas) − Σ(entregas hechas, con el desglose directo/indirecto)`.

### Caso 1 — el escenario exacto del mandato (RD$2,000 + RD$10,000 → transfiere RD$12,000 → reversa RD$10,000)

| Paso | Operación | Saldo resultante |
|---|---|---|
| 0 | Saldo inicial | 2,000 |
| 1 | + cobro nuevo | 2,000 + 10,000 = **12,000** |
| 2 | transfiere (sale) el total | 12,000 − 12,000 = **0** |
| 3 | se reversa el cobro de 10,000 (la abono pasa a `Reversado`, deja de sumar) | 0 − 10,000 = **−10,000** |

**Resultado esperado: Deuda del agente = RD$10,000.** Coincide exactamente con lo que el mandato
anticipa. El agente transfirió dinero que, tras la corrección, resultó que nunca fue suyo de tener —
esa es la deuda real.

### Caso 2 — saldo −10,000 + nuevo cobro 4,000
`−10,000 + 4,000 = −6,000`. Sigue en deuda, pero se redujo. Recuperación pasiva funcionando —
ningún paso manual.

### Caso 3 — saldo −10,000 + transferencia entrante 6,000
`−10,000 + 6,000 = −4,000`. Igual que el anterior: una transferencia ENTRANTE es solo otro término
positivo de la misma suma — reduce la deuda automáticamente, sin lógica especial de "aplicar contra
deuda" (responde directo la última regla de la sección 5 del mandato original).

### Caso 4 — saldo −10,000 + cobro 12,000
`−10,000 + 12,000 = +2,000`. La deuda se cancela por completo y el agente vuelve a tener saldo
disponible positivo — automáticamente, sin ninguna "operación de cierre de deuda" que ejecutar a
mano. Desde este momento, si el agente intenta transferir, la validación normal (contra el saldo
positivo) vuelve a aplicar sin ninguna marca especial pendiente.

### Caso 5 — intento de transferencia saliente mientras saldo <= 0
Con saldo en `−4,000` (o en `0`), cualquier intento de crear/aceptar una transferencia SALIENTE debe
**rechazarse** en el mismo punto donde `transferencias_crear`/`transferencias_aceptar` ya validan el
monto contra el saldo disponible — mensaje claro: *"Este agente tiene una deuda de RD$4,000 y no
puede transferir hasta cubrirla."* (NO APLICADO — es la validación descrita en el punto 2.)

### Caso 6 — reversa que NO genera negativo (caso de control, para confirmar que no se rompe nada existente)
Saldo `20,000` (el agente no ha transferido el cobro que se va a reversar, o transfirió menos de lo
que se reversa) → se reversa un cobro de `10,000` → `20,000 − 10,000 = 10,000`. Sigue positivo, cero
deuda, cero cambio de comportamiento respecto a hoy — confirma que el diseño no altera el caso
normal, solo agrega el tratamiento para cuando el resultado cruza a negativo.

### Caso 7 — anulación de entrega DIRECTA que genera negativo en uno de dos agentes

Este caso involucra el desglose `es_directo=true` (`cobrado_por` vs `agente_id`), donde una sola
entrega afecta a DOS agentes a la vez — el que cobró y depositó directo (`cobrado_por`), y el dueño
de la cuenta donde cayó el depósito (`agente_id`). Ejemplo ilustrativo, consistente con esa
mecánica (no una traza literal del SQL desplegado — se presenta con esa salvedad explícita):

- Agente A cobra RD$8,000 de un cliente y los deposita directo en la cuenta de Agente B
  (`es_directo=true`, `cobrado_por=A`, `agente_id=B`). Bajo la fórmula: a A se le resta el monto
  (ya no lo tiene en su poder, "lo entregó" — cancela contra el `+8,000` de su propio abono, neto
  0 para A) y a B se le suma (B ahora custodia ese efectivo). B parte de 0, queda en **+8,000**.
- B transfiere RD$5,000 a un tercer agente. B queda en `8,000 − 5,000 = 3,000`.
- Se descubre que esa entrega directa fue un error (duplicada, mal digitada) y se **anula**: se le
  quita a B el crédito de los 8,000 → `3,000 − 8,000 = −5,000`.

**Resultado: el agente que queda con deuda es B (el que recibió el depósito directo), no A (el que
originalmente cobró)** — porque el riesgo de haber movido dinero de más está del lado de quien
custodió el efectivo después del depósito directo, no de quien solo lo entregó. A, en este mismo
movimiento, en realidad recupera saldo al anularse (deja de estar "descontado" por haberlo
entregado). **No hace falta ninguna regla especial para este caso** — es el mismo mecanismo
"deuda = saldo derivado negativo" aplicado al agente que corresponda según el signo real de la
fórmula, sea cual sea.

### Caso 8 — admin vs. agente viendo el resultado, según permisos

- **Admin**: ve la tabla completa de agentes (comportamiento ya existente, `verTodo=esAdmin()`)
  con la fila de B mostrando `Dinero en Mano: RD$0` + `Deuda del agente: RD$5,000` (rojo), y la
  fila de A mostrando su saldo normal sin ninguna marca de deuda.
- **Agente (B mismo, logueado)**: por el filtro ya existente
  (`porAgente.filter(a => String(a.id) === miId)`), solo ve su propia fila — su deuda de
  RD$5,000, con el mismo detalle. No ve ni el saldo ni la deuda de ningún otro agente.
  **Cero código de permisos nuevo** — se hereda del filtrado que ya está en producción.

---

## 7. SQL/pseudocódigo — solo ilustrativo, NADA de esto se aplicó

### (a) La deuda como lectura, no como escritura

```sql
-- ILUSTRATIVO — NO APLICADO. La fórmula real ya existe en 0232 (transferencias_saldo_disponible_agente).
-- Esto solo muestra que "deuda" es una interpretación de su resultado, no una tabla ni columna nueva.
select
  agente_id,
  greatest(0,  transferencias_saldo_disponible_agente(agente_id)) as saldo_disponible,
  greatest(0, -transferencias_saldo_disponible_agente(agente_id)) as deuda_del_agente
from agentes;
```

### (b) Enriquecer el `new_data` de auditoría que ya se escribe (punto 2)

```sql
-- ILUSTRATIVO — NO APLICADO. Ejemplo de qué agregarle al new_data que
-- seguros_reversar_cobro()/seguros_anular_entrega_admin() YA insertan hoy.
-- No es una tabla nueva: es enriquecer el jsonb existente.
new_data := new_data || jsonb_build_object(
  'agente_id_afectado', v_agente_id,
  'saldo_agente_antes', v_saldo_antes,
  'saldo_agente_despues', v_saldo_despues,
  'genero_deficit', (v_saldo_despues < 0),
  'monto_deficit', greatest(0, -v_saldo_despues)
);
```

### (c) Boceto de la brecha de regularización activa (punto 3) — explícitamente fuera de alcance

```sql
-- ILUSTRATIVO — NO DISEÑADO EN DETALLE, NO APLICADO, requiere autorización separada.
-- Solo para ilustrar la forma que podría tomar, no es una propuesta cerrada.
alter table entregas_admin add column es_regularizacion_deuda boolean not null default false;
-- Con esto, un reporte de "cobranza real del período" podría excluir estas filas
-- (WHERE es_regularizacion_deuda = false) sin tocar la fórmula de saldo, que sí las sigue contando.
```

---

## 8. Confirmación explícita: cero cambios en producción

Todo el trabajo de esta ronda fue **exclusivamente lectura**:

- Lecturas de esquema/catálogo (`list_tables`, columnas de `agentes`/`abonos`/`entregas_admin`/
  `auditoria`/`asientos`, valores distintos de `tipo_origen`).
- Lecturas de definición de función existente (`pg_get_functiondef` sobre `mi_agente_efectivo`,
  `seguros_anular_entrega_admin`, `seguros_registrar_cobro`,
  `seguros_registrar_entrega_admin_manual`, `seguros_reversar_cobro`).
- Lectura de código real ya en producción (`parches.js`, el panel "Detalles de Cobro" y su
  filtrado por rol) y un `grep` de todo el repositorio confirmando que no existe hoy ningún
  mecanismo de "deuda de agente".
- Lectura de las bitácoras previas (`0232`, `2026-08-16-1250-chatgpt...`) para no contradecir
  nada ya cerrado.

**Cero llamadas a `apply_migration`. Cero ediciones a `index.html`/`parches.js`. Cero cambios a
ninguna función SQL existente. Cero tablas/columnas creadas.** No se tocó ningún dato histórico,
ningún lock/ACL de 4C ya propuesto, ni `seguros_diagnostico_financiero()` — tal como exige el
punto 8 del mandato ("No romper lo ya cerrado").

**A la espera de revisión de ChatGPT antes de cualquier implementación**, tal como pide el mandato
original.
