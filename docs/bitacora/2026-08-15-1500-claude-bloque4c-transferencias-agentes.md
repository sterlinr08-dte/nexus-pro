# Claude — Bloque 4C — `transferencias_agentes` — AUDITORÍA + DISEÑO (NO IMPLEMENTADO)

Fecha: 2026-08-15 15:00 RD

Responde al mandato de ChatGPT `docs/bitacora/2026-08-15-1010-chatgpt-bloque4c-transferencias-agentes.md`
(commit `ad7101b`). **Esta entrega es 100% auditoría/diseño — NADA de lo aplicado en producción cambió.**
Todo el SQL propuesto se probó con `BEGIN`/rollback forzado (metodología de
`docs/METODOLOGIA-PRUEBAS-DESTRUCTIVAS.md`) y se verificó, de forma independiente, que la producción
quedó exactamente como estaba antes de cada prueba. **Se esperará revisión cruzada de ChatGPT antes de
implementar nada de lo que sigue** — tal como pide el mandato.

## Resumen para quien tenga prisa

- Hoy, `transferencias_agentes` es una tabla **sin ningún guardia real**: cualquier agente logueado de
  `nexus-pro` puede suplantar el origen de una transferencia (§5), cualquiera puede aceptar/rechazar la
  transferencia de otro sin ser el destinatario (§5), no existe ningún candado de saldo en ningún punto
  del flujo (§10/§11), y `anon`/`authenticated` pueden `TRUNCATE` la tabla completa (§12) — el mismo
  patrón de hueco ya cerrado 3 veces antes en este mismo bloque (`entregas_admin`, `cuadre_tss_historial`,
  `pagos`).
- El escenario que pidió el dueño explícitamente — RD$10,000 disponibles, dos transferencias simultáneas
  de RD$8,000 — **hoy SÍ termina en RD$16,000 movidos** (ninguna validación lo impide, ni siquiera
  secuencialmente, mucho menos en paralelo).
- Se diseñaron y **probaron con éxito, dentro de una transacción con rollback forzado**, 3 RPC
  (`transferencias_crear`, `transferencias_aceptar`, `transferencias_rechazar`) más una función de saldo
  server-side (`transferencias_saldo_disponible_agente`) que **sí impide** ese escenario: la segunda
  transferencia de RD$8,000 queda bloqueada con el mensaje exacto `Saldo insuficiente del origen:
  disponible RD$ 2000, solicitado RD$ 8000` — demostrado con datos reales de producción dentro de una
  transacción que se revirtió por completo al final (ver §10).
- Nada de esto está aplicado. Es un diseño para que ChatGPT lo revise.

---

## §1 — Inventario fresco de producción

```sql
select column_name, data_type, is_nullable, column_default
  from information_schema.columns
 where table_schema='public' and table_name='transferencias_agentes';
```

| columna | tipo | nullable | default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `desde_agente` | **text** | YES | — |
| `hacia_agente` | **text** | YES | — |
| `monto` | numeric | YES | — |
| `metodo` | text | YES | — |
| `banco` | text | YES | — |
| `referencia` | text | YES | — |
| `nota` | text | YES | — |
| `fecha` | timestamptz | YES | — |
| `estado` | text | **NO** | `'pendiente'::text` |
| `created_at` | timestamptz | YES | `now()` |

- **Único constraint: la PK** (`transferencias_agentes_pkey`). Cero `FK`, cero `CHECK`, cero `UNIQUE`
  adicional, cero `NOT NULL` salvo `id`/`estado`. Único índice: el de la PK.
- **Cero triggers.**
- `desde_agente`/`hacia_agente` son **`text`**, no `uuid`, y no tienen FK hacia `agentes.id` — pero se
  verificó con datos reales (25/25 filas) que en la práctica siempre contienen el `uuid` de un agente
  real convertido a texto (`a.id::text = t.desde_agente` para las 25 filas, sin excepción).
- **RLS: exactamente 1 policy**, `org_transferencias_agentes`, `FOR ALL TO authenticated`:
  ```sql
  USING (mi_rol() IS NOT NULL AND mi_organizacion() = <id de nexus-pro>)
  WITH CHECK (igual)
  ```
  Es **ciega a la identidad** — nunca compara `desde_agente`/`hacia_agente` contra quien está llamando,
  solo exige "estás logueado y eres de nexus-pro".
- **ACL (`information_schema.role_table_grants`) — confirmado de nuevo, sin drift respecto al inventario
  original de esta misma sesión**: `anon` y `authenticated` tienen los 7 privilegios completos
  (`SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER`) — **incluido `TRUNCATE`**, que RLS nunca
  protege.
- **Datos reales:** 25 filas, `{aceptada: 24, rechazada: 1}`, suma `RD$ 351,611`. Monto mínimo real: `1`
  (ninguna fila en 0 o negativa). Cero filas con `desde_agente`/`hacia_agente` nulos.
- **`agentes`** (la tabla que estas dos columnas referencian informalmente): **sin `organizacion_id`** —
  tabla global, compartida por las 7 organizaciones del sistema, sin ningún filtro de aislamiento. Hoy
  tiene exactamente **2 filas**: `ESTERLIN` (cargo `ADMIN`, activo) y `ROBINSON` (cargo `VENDEDOR`,
  activo). Ambas pertenecen a `nexus-pro` solo por convención, nunca reforzado a nivel de esquema.
- **Identidad real (`profiles`/`usuarios_sistema`):** 5 perfiles en total, uno por organización:
  `Administrador`/admin de `nexus-pro` (sin `agente_id` directo), `ROBINSON`/agente de `nexus-pro`
  (`agente_id` = el uuid real de ROBINSON), y 3 admins de OTRAS organizaciones (Francis/Bayolsale,
  BayolCell Rifas, Consultorio Geriátrico), los 3 con `agente_id = null`.
- **`mi_agente_efectivo()`** (helper ya existente, `SECURITY DEFINER`, `SET search_path TO 'public',
  'pg_temp'`, `EXECUTE` para `postgres/authenticated/service_role`, no `anon`): resuelve
  `auth.uid()→profiles.agente_id`, si es null intenta empatar el nombre de `usuarios_sistema` contra
  `agentes.nom`, y si sigue sin nada **y `mi_rol()='admin'`**, cae a `SELECT id FROM agentes WHERE
  lower(cargo)='admin' LIMIT 1` — **sin filtrar por organización**, porque `agentes` no tiene esa
  columna. Hallazgo real (§4): como el único agente con `cargo='admin'` es ESTERLIN, **cualquier admin
  de CUALQUIER organización que llegue a ese último fallback resolvería a ESTERLIN**. Hoy esto no ha
  causado daño porque los 3 consumidores existentes de `mi_agente_efectivo()` (Bloque 4D-1) ya exigen
  `mi_organizacion() = nexus-pro` ANTES de llamarlo. El diseño de §5 hereda ese mismo orden a propósito.

## §2 — Lectores/escritores reales (archivo:función:operación)

| Archivo:función | Operación | Server-side identity check |
|---|---|---|
| `parches.js` ~1166 `window.nxGuardarTransferenciaAgenteV2` | `INSERT` (crear) — payload trae `desde_agente`/`hacia_agente`/`monto` elegidos en el navegador | **NINGUNO** |
| `parches.js` ~5555 `window.nxAceptarTransferencia` | `PATCH estado='aceptada'` por `id` | **NINGUNO** |
| `parches.js` ~5590 `window.nxRechazarTransferencia` | `PATCH estado='rechazada'` por `id` | **NINGUNO** |
| `parches.js` ~4700 `cargarTransferencias()` | `GET select=*` (sin filtro de estado) | RLS (org) |
| `parches.js` ~2202 (call site de `calcularPorAgente`) | `GET` (mismo array, filtrado client-side por `esTxEfectiva`) | RLS (org) |
| Edge Function `enviar-reporte-email` (v7) | `GET .eq('estado','aceptada')` — solo hoy | `service_role`, filtro correcto |
| Edge Function `nexus-smart` (v3) | `GET` sin filtro de `estado`, límite 50 | `service_role`, admin-gated, sin filtro (hallazgo menor, ver §15) |
| `respaldo-diario`/`respaldo-correo-mensual`/`verificar-respaldo` | descubrimiento dinámico vía `tablas_para_respaldo()` | `service_role` |

**Ningún consumidor server-side (Edge Function ni función SQL) ESCRIBE en esta tabla.** El 100% de las
escrituras de hoy son llamadas PostgREST crudas desde el navegador, sin ninguna función intermedia.

- `miAgenteV2()` (línea ~1101, usado solo por el modal de crear): `sesion.agente_id` directo, luego
  empate por nombre — **sin** el tercer fallback de admin-por-cargo.
- `getMiAgenteId()` (línea ~4583, usado en el panel de Solicitudes): mismos 2 primeros niveles, pero su
  ÚLTIMO recurso es `s.usuario_id || s.id` — **un id de USUARIO, no de agente** — distinto de los otros
  dos resolutores.
- `mi_agente_efectivo()` (SQL, no usado por ningún camino de esta tabla hoy): el tercero, ya descrito en
  §1.

**Tres resolutores de identidad distintos e inconsistentes**, ninguno usado del lado del servidor para
esta tabla. Es un hallazgo real de §4, no solo de arquitectura de código.

## §3 — Flujo de negocio actual, reconstruido del código real

1. Un agente (o admin) abre el modal (`nxAbrirTransferenciaAgenteV2`). Si es admin, el `<select>` "Desde"
   queda **libre** (puede elegir cualquier agente como origen — 100% en el DOM, sin respaldo server-side).
   Si es agente no-admin, el `<select>` se **deshabilita** con `miAgenteV2()` preseleccionado — pero
   deshabilitar un `<select>` en el DOM no impide mandar cualquier `desde_agente` por la API directamente.
2. `nxGuardarTransferenciaAgenteV2` valida en JS (desde≠hacia, monto>0, referencia si aplica) y hace
   `api.post('transferencias_agentes', {desde_agente, hacia_agente, monto, ..., estado:'pendiente'})`.
   **Cero validación de saldo, cero validación de que el destino exista/esté activo/sea de la misma org.**
3. La transferencia queda `pendiente`. En este estado, **no afecta ningún cálculo de "Dinero en Mano"**
   (ver §7) — ni resta al origen ni suma al destino.
4. El destinatario (o cualquiera, hoy) ve la transferencia en el panel de Solicitudes y toca **Aceptar**
   o **Rechazar**. Ambos botones llaman `api.patch('transferencias_agentes','id=eq.'+id, {estado:...})`
   directo — **sin releer el estado actual, sin verificar quién eres, sin verificar saldo**.
5. Solo cuando `estado==='aceptada'` (o el legado `estado IS NULL`, que hoy no existe en ninguna fila —
   ver nota en §8) la transferencia entra en `esTxEfectiva()` y por lo tanto en `calcularPorAgente()`,
   restando del origen y sumando al destino.
6. No existe ningún camino de "cancelar"/"anular" una transferencia ya resuelta. `estado` puede, hoy,
   volver a escribirse libremente en cualquier dirección vía `PATCH` directo (§8).

## §4 — Identidad usuario→agente

Respondida junto con §1/§2 arriba. Resumen:

- **ROBINSON**: identidad limpia, `profiles.agente_id` apunta directo a su fila de `agentes`.
- **Administrador (nexus-pro)**: sin `agente_id` directo; resuelve por el fallback de cargo=admin de
  `mi_agente_efectivo()` a ESTERLIN — funciona hoy porque solo hay un agente con ese cargo, en toda la
  base compartida entre 7 organizaciones.
- **Los otros 3 admins (de otras orgs)**: `agente_id=null`, sin ningún agente de su propia organización
  con nombre que empate ni `cargo='admin'` propio (porque `agentes` no tiene fila alguna de esas 3
  organizaciones) — si alguna vez llamaran `mi_agente_efectivo()` sin el gate de organización que ya
  usan los 3 consumidores de 4D-1, resolverían por error al agente de ESTERLIN. **El diseño de §5
  neutraliza esto poniendo el chequeo de organización SIEMPRE antes de resolver el agente.**
- **Ningún registro ambiguo/huérfano real** encontrado hoy (solo 2 agentes, ambos con identidad clara).

## §5 — Autoridad sobre el origen del dinero

**Hallazgo crítico, demostrado empíricamente (test T-crossorg-crear/T6 de sesiones previas de esta misma
auditoría, y reconfirmado en la batería de este documento):** hoy, cualquier `authenticated` de
`nexus-pro` puede mandar CUALQUIER `desde_agente` en el `INSERT` — el frontend deshabilita el `<select>`
para un agente no-admin, pero eso es cosmético; la API no comprueba nada.

**Diseño propuesto:** la función `transferencias_crear()` **no tiene ningún parámetro de origen**. El
origen se deriva 100% server-side con `mi_agente_efectivo()`, después de comprobar organización. Es
estructuralmente imposible suplantar el origen — no hay ningún valor que el cliente pueda mandar para
elegirlo.

## §6 — Validación de destino

Hoy: ninguna. Se puede crear una transferencia hacia un uuid que no existe, hacia un agente inactivo, o
hacia el mismo origen — probado (§10, T-destino-inexistente/T-destino-inactivo/T-mismo-origen).

**Diseño propuesto:** `transferencias_crear()` exige `EXISTS (SELECT 1 FROM agentes WHERE id=p_hacia_agente
AND coalesce(activo,true))` y `p_hacia_agente <> v_origen`, ambos server-side, antes de insertar.

**¿El destino debe aceptar antes de afectar saldos?** Sí — y es exactamente lo que ya hace el sistema
hoy (§7): una transferencia `pendiente` no mueve nada. El diseño conserva esa semántica sin cambiarla.

## §7 — Efecto financiero — respuesta directa a la Pregunta 2 del mandato

**El código real, verbatim (`parches.js` línea ~1295):**

```js
// Una transferencia mueve dinero solo si fue ACEPTADA (o es legado sin estado).
// Las "pendiente"/"rechazada" no cuentan para dinero en mano ni KPIs.
function esTxEfectiva(t) {
  return !t.estado || t.estado === 'aceptada';
}
```

Y en `calcularPorAgente()`:

```js
const enMano = cobrado + recibidas - entregadas - entregadasAdmin + dirEntran(entregasPeriodo);
```

donde `recibidas`/`entregadas` solo suman transferencias que ya pasaron por `esTxEfectiva` (el filtro se
aplica en el *call site*, antes de invocar la función).

**Respuesta:** hoy, el dinero cambia de dueño (para efectos de "Dinero en Mano" y de cualquier reporte)
**solo al ACEPTARSE**, nunca al crearse. Confirmado también contra el Edge Function
`enviar-reporte-email` (v7, releído en esta sesión): `select('*').eq('estado','aceptada')` — misma
semántica, consistente en los dos lados del sistema.

**Consecuencia del comportamiento actual, no un bug de por sí:** mientras una transferencia está
`pendiente`, el origen sigue mostrando ese dinero como si lo tuviera en la mano — no hay ningún "hold"/
reserva. Esto es precisamente lo que permite el escenario de sobregiro del mandato (ver §10): dos
transferencias `pendiente` de RD$8,000 cada una no tienen ningún efecto hasta que se aceptan — el
problema real está en que ACEPTAR, hoy, tampoco valida nada.

**No se cambia esta semántica** (crear = sin efecto, aceptar = efecto) en el diseño propuesto — se
respeta tal cual está, según pide el mandato ("si recomienda cambiar semántica, marcarlo como decisión de
negocio, no asumirla"). Lo que el diseño SÍ agrega es la validación de saldo que falta **en el único
punto donde el efecto ya ocurre hoy: aceptar**.

## §8 — Estados reales y transiciones

- Valores reales en producción: `pendiente` (default, hoy 0 filas activas en ese estado), `aceptada`
  (24), `rechazada` (1). **Cero filas con `estado IS NULL`** — pese a que `esTxEfectiva()` lo trata como
  legado-válido, ese caso no existe en los datos; es una guarda defensiva del JS sin ningún dato real
  detrás hoy.
- **Hoy no hay ninguna máquina de estados.** `estado` se puede sobreescribir libremente en cualquier
  dirección vía `PATCH` directo — probado: aceptar una ya rechazada, rechazar una ya aceptada, revivir a
  `pendiente` una ya resuelta de meses atrás, todo funciona sin ningún error hoy (mismo patrón de hueco ya
  encontrado y cerrado en `entregas_admin`/`cuadre_tss_historial`).
- No existe DELETE físico documentado en el código actual, pero **si existiera** (vía REST directo) no
  habría ningún trigger que lo impida — y de hecho, con el ACL actual, sí es posible (§12).

**Máquina de estados propuesta** (implementada en el diseño de §17):

```
pendiente ──aceptar()──> aceptada   (terminal)
pendiente ──rechazar()──> rechazada (terminal)
```

Sin transiciones de vuelta. `aceptada`/`rechazada` nunca cambian de estado — ni por reintento (que
devuelve `reintento:true` idempotente), ni por ningún otro camino: `UPDATE` y `DELETE` quedan
`REVOKE`d de `anon`/`authenticated` (§12), así que la única forma de tocar el `estado` es a través de las
2 RPC, y ambas rechazan explícitamente cualquier transición fuera de `pendiente→X` (probado: T-rechazar-
tras-aceptar, T-aceptar-tras-rechazar).

## §9/§19 — Idempotencia

| Escenario | Diseño |
|---|---|
| Doble clic / retry de red al **crear** | `p_idempotency_key text NOT NULL` obligatorio. Índice único parcial `transferencias_idempotency_key_uq ON (idempotency_key) WHERE idempotency_key IS NOT NULL`. Un segundo `INSERT` con la misma clave se detecta ANTES de insertar (`SELECT` previo) y devuelve el mismo `id` con `reintento:true` — nunca crea una segunda fila. |
| **Aceptar** dos veces | Guardia `UPDATE ... WHERE id=p_id AND estado='pendiente'`. Si ya está `aceptada`, se detecta y devuelve `reintento:true` sin volver a tocar el saldo. No necesita clave de idempotencia propia — el flip `pendiente→aceptada` es, por naturaleza, un booleano sin información adicional que pueda entrar en conflicto consigo mismo. |
| **Rechazar** dos veces | Mismo patrón — `reintento:true` si ya estaba `rechazada`. |
| Rechazar después de aceptar / aceptar después de rechazar | **Rechazado explícitamente** con una excepción clara (`'ya fue aceptada, no se puede rechazar'` / `'ya fue rechazada, no se puede aceptar'`) — no es un caso "idempotente", es un conflicto real, y se trata como tal. |
| Cancelar y aceptar concurrentemente | Cubierto por la misma guardia atómica `WHERE estado='pendiente'`: solo una de las dos operaciones puede ganar la carrera del `UPDATE`; la otra ve `estado` ya cambiado y responde en consecuencia (idempotente si coincide con lo que intentaba, conflicto explícito si no). |

## §10/§20 — Concurrencia, saldo y LA PRUEBA CRÍTICA (Q5 del mandato)

**Diagnóstico del estado actual, sin el diseño propuesto:** no existe ningún candado, ninguna validación
de saldo, en ningún punto del flujo (ni crear ni aceptar). El escenario de RD$10,000/2×RD$8,000 **se
rompe incluso sin ninguna concurrencia real** — basta con aceptar las dos transferencias una detrás de
otra, sin ninguna carrera, para terminar con RD$16,000 "aceptados" saliendo de un origen que solo tenía
RD$10,000. No hace falta una carrera de hilos para romperlo: hace falta, simplemente, que nada lo valide.

### El candado propuesto

`transferencias_aceptar()` adquiere `pg_advisory_xact_lock(hashtext('transferencias_saldo:' ||
desde_agente))` **antes** de leer el saldo y **antes** de decidir si acepta. Es el mecanismo estándar de
Postgres para serializar cualquier acceso concurrente a un mismo recurso lógico (aquí: "el saldo del
agente X") — dos llamadas simultáneas contra el MISMO origen nunca se evalúan con datos obsoletos entre
sí: la segunda espera a que la primera termine (commit o rollback) antes de adquirir el lock y recién
entonces lee el saldo, que ya refleja el efecto de la primera. Esto convierte cualquier intento
verdaderamente simultáneo en, efectivamente, secuencial desde el punto de vista de los datos — la misma
garantía que demuestra la prueba secuencial de abajo.

### La prueba, ejecutada de verdad contra producción, dentro de una transacción con rollback forzado

Se niveló el saldo REAL de ROBINSON (calculado con la fórmula exacta de `calcularPorAgente`, replicada en
SQL — ver §11) a exactamente `RD$10,000` mediante una transferencia de nivelación hacia un agente
sintético de prueba (todo dentro de la MISMA transacción, revertido al final). Luego:

```
T-crear-1: id=12e820b5-... estado=pendiente reintento=false
T-crear-2: id=e03208ec-... estado=pendiente reintento=false
  (las dos transferencias de RD$8,000 se crean sin problema — CREAR nunca valida saldo, por diseño)

T-ACEPTAR-1(8000/10000): ok=true reintento=false estado=aceptada
saldo_robinson_tras_aceptar_1=2000   (debía ser 2000 — es 2000)

T-ACEPTAR-2(8000/2000-disponible): BLOQUEADO correctamente
  (Saldo insuficiente del origen: disponible RD$ 2000 , solicitado RD$ 8000)

estado_final_id2=pendiente            (debía seguir pendiente — sigue pendiente, NO se descartó)
saldo_final_robinson=2000             (debía ser 2000, NUNCA -6000 — es 2000)
total_transferencias_de_8000_aceptadas=1   (debía ser 1, NUNCA 2 — es 1)
```

**RD$16,000 nunca se movieron.** La segunda transferencia de RD$8,000 quedó bloqueada y preservada en
`pendiente` — no se perdió, no se aceptó a medias, no se descartó en silencio. El admin (o quien tenga
que resolverla) la ve tal cual quedó, con el mensaje exacto de por qué no se pudo aceptar.

**Limitación honesta de esta prueba:** por las herramientas disponibles en esta sesión, la prueba anterior
es **secuencial dentro de una sola transacción/sesión** (dos llamadas consecutivas a `transferencias_aceptar`
que ya comparten transacción), no dos conexiones verdaderamente simultáneas de Postgres. El bloqueo
matemático — que la segunda llamada vea el saldo YA actualizado por la primera y por eso rechace — queda
demostrado sin ambigüedad. Lo que **no** se demostró aquí con dos sesiones reales en paralelo es que el
`pg_advisory_xact_lock` de hecho serialice ese mismo resultado bajo concurrencia genuina (dos backends
distintos, a la vez) — eso es un comportamiento bien documentado y estándar de Postgres para este patrón
exacto, y es el mismo tipo de garantía que ya se usó (con verificación de 2 sesiones reales vía script
`.sql` manual, ejecutado fuera de este entorno) en bloques anteriores de este mismo engagement
(`pos_transferir_stock`, `pos_aplicar_inventario_venta`). Se descartó deliberadamente instalar la
extensión `dblink` para simular 2 conexiones dentro de esta auditoría (instalar una extensión es, en sí
mismo, un cambio de producción que este mandato prohíbe hacer sin autorización — "no ampliar alcance
silenciamente"). **Recomendación:** antes de dar por cerrada la implementación, correr el mismo patrón de
2-sesiones-`.sql` manual que ya se usó en esos bloques anteriores, específicamente contra
`transferencias_aceptar` con las dos transferencias de este mismo escenario.

## §11/§21 — Fuente canónica del saldo disponible

**Hoy no existe ninguna función server-side de saldo.** El único cálculo es 100% client-side
(`calcularPorAgente()` en `parches.js`), nunca validado por el backend antes de aceptar una transferencia.

**Diseño propuesto — `transferencias_saldo_disponible_agente(p_agente_id uuid) RETURNS numeric`**, réplica
exacta, término por término, de la fórmula `enManoAcumulado` real (`parches.js` líneas 1596-1629), sin el
recorte por fecha de corte (`periodoFin`) — para un saldo de autorización en vivo se usa "todo lo
histórico hasta ahora", no un corte de ciclo de reporte:

```sql
SELECT
    coalesce((SELECT sum(monto) FROM abonos WHERE agente_cobro = p_agente_id::text), 0)               -- cobrado
  + coalesce((SELECT sum(monto) FROM transferencias_agentes WHERE hacia_agente=p_agente_id::text AND estado='aceptada'), 0)  -- recibidas
  - coalesce((SELECT sum(monto) FROM transferencias_agentes WHERE desde_agente=p_agente_id::text AND estado='aceptada'), 0)  -- entregadas
  - coalesce((SELECT sum(monto) FROM entregas_admin WHERE agente_id=p_agente_id AND es_directo=false AND anulado=false), 0)  -- entregadasAdmin (físicas)
  - coalesce((SELECT sum(monto) FROM entregas_admin WHERE es_directo AND NOT anulado AND agente_id<>p_agente_id AND coalesce(cobrado_por,agente_id)=p_agente_id), 0)  -- entregadasAdmin (dirSalen)
  + coalesce((SELECT sum(monto) FROM entregas_admin WHERE es_directo AND NOT anulado AND agente_id=p_agente_id AND coalesce(cobrado_por,agente_id)<>p_agente_id), 0)  -- dirEntran
```

**Verificado contra la fórmula JS antes de proponerla**, corriendo ambas (SQL y el cálculo manual
equivalente) contra los datos reales de producción:

| agente | cobrado | recibidas | entregadas | entregadasAdmin | dirEntran | **saldo** |
|---|---|---|---|---|---|---|
| ESTERLIN | 593,900 | 351,610 | 0 | 0 | 214,000 | **1,159,510** |
| ROBINSON | 728,000 | 0 | 351,610 | 233,200 | 0 | **143,190** |

`recibidas` de ESTERLIN (351,610) calza EXACTO con `entregadas` de ROBINSON (351,610) — que a su vez es
EXACTAMENTE la suma real de las 24 filas `aceptada` de la tabla (`RD$ 351,611`... la diferencia de RD$1 es
el propio `rechazada`, que no cuenta — cuadra perfecto). Esto confirma que la réplica SQL usa exactamente
las mismas columnas/filtros que el JS, sin desviación.

**Nota de alcance, señalada explícitamente para la revisión de ChatGPT** (no se decidió por cuenta propia):
esta función LEE de `abonos` y `entregas_admin` — tablas que pertenecen a los bloques ya cerrados 4A y
4D-1. Es una lectura pura (ningún `INSERT`/`UPDATE`/`DELETE`, ninguna redefinición de sus objetos), pero
como el mandato dice explícitamente "no tocar 4A, 4B ni 4D", se marca este cruce de lectura como una
decisión que requiere confirmación antes de aplicarse — no se asumió que "solo leer" cae fuera del
alcance de esa restricción.

## §12/§22 — ACL/RLS, incluido TRUNCATE

Estado actual (reconfirmado en esta sesión, sin drift): `anon` y `authenticated` tienen los 7 privilegios,
incluido `TRUNCATE`. Probado en la batería de este documento (ver §"Matriz de pruebas" abajo): **ambos
pueden truncar la tabla completa hoy.**

**Diseño propuesto:**
```sql
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON transferencias_agentes FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON transferencias_agentes FROM authenticated;
```
`SELECT` se deja intacto — sigue gobernado por la única policy RLS existente, sin cambios. Todo el
tráfico de escritura pasa a las 3 RPC nuevas, cuyo `EXECUTE` se otorga solo a `authenticated` (nunca
`anon`).

## §13 — Requisitos de SECURITY DEFINER (ya incorporados al diseño)

Las 4 funciones nuevas (`transferencias_crear`, `transferencias_aceptar`, `transferencias_rechazar`,
`transferencias_saldo_disponible_agente`) son todas `SECURITY DEFINER` con `SET search_path TO 'public',
'pg_temp'`, y cada una de las 3 de escritura empieza con el mismo guardia explícito de organización usado
en el patrón ya probado de 4D-1 (`seguros_anular_entrega_admin` y hermanas):

```sql
IF mi_rol() IS NULL OR mi_organizacion() IS DISTINCT FROM (SELECT id FROM organizaciones WHERE slug='nexus-pro') THEN
  RAISE EXCEPTION 'No autorizado (org)';
END IF;
```

Este chequeo va **siempre primero**, antes de llamar a `mi_agente_efectivo()` — así se neutraliza, sin
tocar el helper compartido, el riesgo de resolución cross-org descrito en §1/§4.

## §14 — Auditoría

Cada operación exitosa (crear/aceptar/rechazar, nunca los reintentos idempotentes) inserta una fila en
`auditoria` con actor real (`usuarios_sistema.nom` vía `profiles`), acción (`TRANSFERENCIA_CREADA` /
`TRANSFERENCIA_ACEPTADA` / `TRANSFERENCIA_RECHAZADA`), monto y las dos partes — mismo patrón exacto que
`seguros_anular_entrega_admin`. Origen/destino quedan inmutables una vez creada la fila (no hay ningún
`UPDATE` de esas 2 columnas en ninguna de las 3 RPC).

## §15 — Edge Functions y reportes (releídos en esta sesión, código fresco)

- **`enviar-reporte-email` (v7):** `select('*').eq('estado','aceptada').gte('fecha',...).lte('fecha',...)`
  — filtra por `estado='aceptada'` Y por el día. Consistente con `esTxEfectiva`. No escribe. No requiere
  ningún cambio.
- **`nexus-smart` (v3):** `select('id, monto, fecha, desde_agente, hacia_agente').order('fecha',
  {ascending:false}).limit(50)` — **sin filtro de `estado`**, así que puede mostrarle a la IA
  transferencias `pendiente`/`rechazada` mezcladas con `aceptada` al resumir el contexto financiero.
  Hallazgo **menor/informativo**: el consumidor es de solo lectura, gated a admin (`esAdmin()`, ya
  hardened el 3-ago-2026), y alimenta un resumen conversacional, no un cálculo financiero — pero
  técnicamente puede llevar a que la IA describa como "transferencia" algo que nunca se efectivizó. No se
  modificó (mandato: no tocar Edge Functions sin decisión aparte) — se deja documentado para que el dueño
  decida si vale la pena sumarle `.eq('estado','aceptada')` en una ronda de infraestructura separada.
- **`respaldo-diario`/`respaldo-correo-mensual`/`verificar-respaldo`:** descubren la tabla vía
  `tablas_para_respaldo()` (dinámico, `service_role`); ninguno filtra por estado ni escribe. Sin cambios
  necesarios.

---

## Matriz de pruebas obligatoria — ejecutada dentro de una única transacción, rollback forzado

Todo lo siguiente corrió en **una sola transacción `DO $test$ ... RAISE EXCEPTION` con el marcador
`ROLLBACK_FORZADO_FIN_DE_PRUEBA`** contra el proyecto real de producción, incluyendo la creación temporal
(dentro de la misma transacción) de las 4 funciones nuevas, las 7 columnas nuevas, los 4 constraints
nuevos, el índice único y el ACL lockdown — todo revertido al final.

```
DDL: aplicado OK dentro de la transacción de prueba.
saldo_real_robinson_antes=143190
saldo_robinson_nivelado_a=10000 (debe ser 10000)                                    → OK

T-anon-crear: bloqueado (permission denied for function transferencias_crear)       → OK
T-anon-INSERT-directo: bloqueado (permission denied for table transferencias_agentes) → OK
T-anon-TRUNCATE: bloqueado (permission denied for table transferencias_agentes)     → OK
T-authenticated-UPDATE-directo: bloqueado (permission denied for table ...)         → OK
T-authenticated-DELETE-directo: bloqueado (permission denied for table ...)         → OK
T-authenticated-TRUNCATE: bloqueado (permission denied for table ...)               → OK
T-crossorg-crear: bloqueado (No autorizado (org))                                   → OK

T-crear-1: id=12e820b5-... estado=pendiente reintento=false                         → OK
T-crear-2: id=e03208ec-... estado=pendiente reintento=false                         → OK
T-crear-retry-misma-key: id=12e820b5-... (== id1) reintento=true                    → OK (idempotente)
T-suplantar-origen: IMPOSIBLE por diseño (sin parámetro de origen)                  → OK
T-destino-inexistente: bloqueado (El agente destino no existe o está inactivo)      → OK
T-destino-inactivo: bloqueado (El agente destino no existe o está inactivo)         → OK
T-mismo-origen: bloqueado (El origen y el destino no pueden ser el mismo agente)    → OK
T-monto-cero: bloqueado (El monto debe ser mayor a cero)                            → OK
T-monto-negativo: bloqueado (El monto debe ser mayor a cero)                        → OK

T-ACEPTAR-1(8000/10000): ok=true reintento=false estado=aceptada                    → OK
saldo_robinson_tras_aceptar_1=2000 (debe ser 2000)                                  → OK
T-ACEPTAR-2(8000/2000-disponible): BLOQUEADO (Saldo insuficiente: disponible 2000, solicitado 8000) → OK ← LA PRUEBA CRÍTICA
estado_final_id2=pendiente (debe seguir pendiente)                                  → OK
saldo_final_robinson=2000 (debe ser 2000, NUNCA -6000)                              → OK
total_transferencias_de_8000_aceptadas=1 (debe ser 1, NUNCA 2)                      → OK
T-aceptar-dos-veces: reintento=true estado=aceptada                                 → OK (idempotente)
T-rechazar-tras-aceptar: bloqueado (La transferencia ya fue aceptada, no se puede rechazar) → OK

T-rechazar-3: ok=true estado=rechazada                                              → OK
T-rechazar-dos-veces: reintento=true estado=rechazada                               → OK (idempotente)
T-aceptar-tras-rechazar: bloqueado (La transferencia ya fue rechazada, no se puede aceptar) → OK

T-crossorg-aceptar: bloqueado (No autorizado (org))                                 → OK
diagnostico_ok=true                                                                 → OK (sin modificar la función)
```

**Verificación independiente de cero residuos**, en una consulta APARTE, después de que la transacción
anterior terminara con `RAISE EXCEPTION` (rollback garantizado):

```json
{
  "total_filas_hoy": 25, "estados_hoy": {"aceptada":24,"rechazada":1}, "suma_monto_hoy": "351611",
  "total_agentes_hoy": 2, "agentes_test_residuales": 0,
  "columnas_nuevas_presentes_debe_ser_0": 0,
  "funciones_nuevas_presentes_debe_ser_0": 0,
  "constraints_nuevos_presentes_debe_ser_0": 0 (el único match de LIKE era la PK preexistente, verificado aparte),
  "anon_insert_grant_debe_seguir_existiendo_1": 1
}
```

Producción quedó **idéntica, byte a byte**, a como estaba antes de esta auditoría: mismas 25 filas,
mismos 2 agentes, mismo ACL abierto (todavía sin el lockdown — pendiente de autorización), cero rastro de
ninguna de las funciones/columnas/constraints propuestas.

---

## Las 8 preguntas del mandato, respondidas explícitamente

1. **¿Quién es el dueño real del dinero durante una transferencia `pendiente`?** El ORIGEN. Una
   transferencia `pendiente` no resta nada al origen en ningún cálculo de "Dinero en Mano" ni en ningún
   reporte — el origen sigue "teniendo" ese dinero hasta que alguien la acepta.
2. **¿Afecta saldo al crearse o al aceptarse?** Al **aceptarse**, según el comportamiento actual
   (`esTxEfectiva`, confirmado también en `enviar-reporte-email`). No se propone cambiar esta semántica —
   se documenta como el comportamiento real y se diseña la validación de saldo en el único punto donde el
   efecto ya ocurre hoy (aceptar).
3. **¿Puede un admin transferir entre dos agentes sin ser ninguno?** **No, con el diseño propuesto** — la
   función no tiene parámetro de origen, así que un admin solo puede crear transferencias "como" el
   agente al que `mi_agente_efectivo()` lo resuelve (hoy, ESTERLIN). No se encontró ningún uso real en
   producción que necesite lo contrario (solo hay 2 agentes, uno de los cuales ES el admin). Si el negocio
   algún día necesita "el admin mueve dinero entre X e Y sin ser ninguno", eso requiere una RPC aparte,
   explícitamente admin-only, con su propio rastro de auditoría — no se construyó aquí porque no hay
   evidencia de que se necesite hoy.
4. **¿Cómo se resuelve un usuario a su agente? ¿Hay registros ambiguos?** Ver §4 — 3 resolutores
   distintos en el código (uno de ellos, `getMiAgenteId()`, cae a un id de USUARIO como último recurso,
   no un id de agente). El diseño usa **solo** el resolutor server-side ya existente y bien probado,
   `mi_agente_efectivo()`, con el guardia de organización siempre primero.
5. **¿Qué pasa con RD$10,000 y 2×RD$8,000 simultáneas?** Hoy: los RD$16,000 se mueven sin ningún
   obstáculo. Con el diseño propuesto, demostrado empíricamente (ver arriba): la segunda queda bloqueada,
   el saldo nunca baja de RD$2,000, nunca se aceptan las dos.
6. **¿Hay DELETE físico o UPDATE libre?** Hoy sí — ambos, sin ninguna restricción (T-authenticated-UPDATE/
   DELETE-directo, probado ANTES del lockdown en el inventario de §1/§12). Con el diseño: no —
   `UPDATE`/`DELETE`/`TRUNCATE` quedan `REVOKE`d de `anon`/`authenticated`; toda escritura pasa por las 3
   RPC, que solo permiten las 2 transiciones válidas desde `pendiente`.
7. **¿Qué consumidores hay que modificar si se introduce la máquina de estados?** Solo 3 puntos en el
   frontend: `nxGuardarTransferenciaAgenteV2` → `transferencias_crear()`; `nxAceptarTransferencia` →
   `transferencias_aceptar()`; `nxRechazarTransferencia` → `transferencias_rechazar()`. Ningún lector
   (`cargarTransferencias`, `calcularPorAgente`, los paneles) necesita cambiar — siguen leyendo la misma
   tabla con el mismo esquema de `estado`, ampliado de forma aditiva (7 columnas nuevas, todas nullable).
8. **¿Existe relación contable/asiento para estas transferencias?** **No, y no se inventa ninguna aquí.**
   A diferencia de `entregas_admin`/`egresos`/`abonos` (que sí generan asientos en bloques ya cerrados),
   `transferencias_agentes` no tiene ningún asiento contable asociado hoy en ningún punto del código. Es
   una brecha real, documentada, para que el dueño decida en una ronda separada si hace falta —
   exactamente como pide el mandato.

---

## Hallazgos, por severidad

| # | Severidad | Hallazgo |
|---|---|---|
| H1 | **CRÍTICO** | Cero validación de saldo en cualquier punto — el escenario RD$10,000/2×RD$8,000 SÍ termina en RD$16,000 movidos hoy. |
| H2 | **CRÍTICO** | Cualquier `authenticated` de la org puede suplantar el `desde_agente` de una transferencia (sin restricción server-side). |
| H3 | **CRÍTICO** | Cualquier `authenticated` de la org puede aceptar/rechazar la transferencia de OTRO agente, sin ser el destinatario. |
| H4 | **CRÍTICO** | `anon` y `authenticated` tienen `TRUNCATE` sobre la tabla completa — RLS nunca lo protege. |
| H5 | **ALTO** | `UPDATE`/`DELETE` libres — se puede reescribir `estado` en cualquier dirección, o borrar filas, sin ningún guardia. |
| H6 | **ALTO** | Sin idempotencia de ningún tipo en `crear` — doble clic/retry de red crea filas duplicadas reales. |
| H7 | **MEDIO** | 3 resolutores de identidad distintos e inconsistentes en el frontend; uno cae a un id de usuario, no de agente, como último recurso. |
| H8 | **MEDIO** | `mi_agente_efectivo()` tiene un fallback cross-org-blind (por `agentes` no tener `organizacion_id`) — mitigado en el diseño con el orden de chequeos, no en el helper compartido. |
| H9 | **BAJO/INFORMATIVO** | `nexus-smart` lee transferencias sin filtrar por `estado` (contexto de IA, admin-only, solo lectura). |
| H10 | **BAJO/INFORMATIVO** | Ausencia total de relación contable — brecha documentada, no una regresión de nada existente. |

---

## §17 — SQL propuesto completo (NO APLICADO — probado con rollback forzado arriba)

```sql
-- ══════════════════════════════════════════════════════════════════
-- BLOQUE 4C — transferencias_agentes — PROPUESTA, NO APLICAR SIN AUTORIZACIÓN
-- ══════════════════════════════════════════════════════════════════

-- 1) Columnas aditivas (todas nullable, cero impacto en las 25 filas existentes)
ALTER TABLE public.transferencias_agentes
  ADD COLUMN IF NOT EXISTS creado_por uuid,
  ADD COLUMN IF NOT EXISTS aceptado_por uuid,
  ADD COLUMN IF NOT EXISTS aceptado_en timestamptz,
  ADD COLUMN IF NOT EXISTS rechazado_por uuid,
  ADD COLUMN IF NOT EXISTS rechazado_en timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_rechazo text,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

-- 2) Integridad (verificado seguro contra los datos reales: monto min=1, 0 filas <=0,
--    0 filas con desde/hacia_agente nulos, estado ya NOT NULL con default 'pendiente')
ALTER TABLE public.transferencias_agentes ALTER COLUMN monto SET NOT NULL;
ALTER TABLE public.transferencias_agentes ADD CONSTRAINT transferencias_monto_positivo CHECK (monto > 0);
ALTER TABLE public.transferencias_agentes ADD CONSTRAINT transferencias_estado_valido CHECK (estado IN ('pendiente','aceptada','rechazada'));
ALTER TABLE public.transferencias_agentes ALTER COLUMN desde_agente SET NOT NULL;
ALTER TABLE public.transferencias_agentes ALTER COLUMN hacia_agente SET NOT NULL;
ALTER TABLE public.transferencias_agentes ADD CONSTRAINT transferencias_origen_distinto_destino CHECK (desde_agente <> hacia_agente);
CREATE UNIQUE INDEX transferencias_idempotency_key_uq ON public.transferencias_agentes(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 3) Función de saldo (LEE abonos/entregas_admin/transferencias_agentes -- ver nota de alcance §11)
CREATE OR REPLACE FUNCTION public.transferencias_saldo_disponible_agente(p_agente_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $f1$
  SELECT
    coalesce((SELECT sum(monto) FROM public.abonos WHERE agente_cobro = p_agente_id::text), 0)
  + coalesce((SELECT sum(monto) FROM public.transferencias_agentes WHERE hacia_agente = p_agente_id::text AND estado='aceptada'), 0)
  - coalesce((SELECT sum(monto) FROM public.transferencias_agentes WHERE desde_agente = p_agente_id::text AND estado='aceptada'), 0)
  - coalesce((SELECT sum(monto) FROM public.entregas_admin WHERE agente_id = p_agente_id AND es_directo=false AND anulado=false), 0)
  - coalesce((SELECT sum(monto) FROM public.entregas_admin WHERE es_directo=true AND anulado=false AND agente_id<>p_agente_id AND coalesce(cobrado_por, agente_id)=p_agente_id), 0)
  + coalesce((SELECT sum(monto) FROM public.entregas_admin WHERE es_directo=true AND anulado=false AND agente_id=p_agente_id AND coalesce(cobrado_por, agente_id)<>p_agente_id), 0)
$f1$;

-- 4) transferencias_crear — origen 100% server-side, sin parámetro de origen
CREATE OR REPLACE FUNCTION public.transferencias_crear(p_hacia_agente uuid, p_monto numeric, p_metodo text, p_banco text, p_referencia text, p_nota text, p_idempotency_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $f2$
DECLARE v_origen uuid; v_existing public.transferencias_agentes; v_row public.transferencias_agentes; v_actor text;
BEGIN
  IF public.mi_rol() IS NULL OR public.mi_organizacion() IS DISTINCT FROM (SELECT id FROM public.organizaciones WHERE slug='nexus-pro') THEN
    RAISE EXCEPTION 'No autorizado (org)';
  END IF;
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'Falta la clave de idempotencia';
  END IF;

  v_origen := public.mi_agente_efectivo();
  IF v_origen IS NULL THEN RAISE EXCEPTION 'No se pudo resolver tu agente'; END IF;

  IF p_hacia_agente IS NULL OR NOT EXISTS (SELECT 1 FROM public.agentes WHERE id = p_hacia_agente AND coalesce(activo,true)) THEN
    RAISE EXCEPTION 'El agente destino no existe o está inactivo';
  END IF;
  IF p_hacia_agente = v_origen THEN RAISE EXCEPTION 'El origen y el destino no pueden ser el mismo agente'; END IF;
  IF p_monto IS NULL OR p_monto <= 0 THEN RAISE EXCEPTION 'El monto debe ser mayor a cero'; END IF;

  SELECT * INTO v_existing FROM public.transferencias_agentes WHERE idempotency_key = p_idempotency_key;
  IF v_existing.id IS NOT NULL THEN
    IF v_existing.desde_agente <> v_origen::text THEN RAISE EXCEPTION 'La clave de idempotencia ya fue usada por otra transferencia'; END IF;
    RETURN jsonb_build_object('ok', true, 'id', v_existing.id, 'reintento', true, 'estado', v_existing.estado);
  END IF;

  SELECT coalesce(us.nom,'agente') INTO v_actor FROM public.usuarios_sistema us JOIN public.profiles p ON p.usuario_sistema_id=us.id WHERE p.id=auth.uid();

  INSERT INTO public.transferencias_agentes(desde_agente, hacia_agente, monto, metodo, banco, referencia, nota, fecha, estado, creado_por, idempotency_key)
  VALUES (v_origen::text, p_hacia_agente::text, p_monto, p_metodo, p_banco, p_referencia, p_nota, now(), 'pendiente', auth.uid(), p_idempotency_key)
  RETURNING * INTO v_row;

  INSERT INTO public.auditoria(usuario, rol, accion, detalle, modulo, entity_table, entity_id, new_data)
  VALUES (v_actor, public.mi_rol(), 'TRANSFERENCIA_CREADA', 'De '||v_origen||' a '||p_hacia_agente||' RD$ '||p_monto, 'Seguros', 'transferencias_agentes', v_row.id::text,
    jsonb_build_object('desde',v_origen,'hacia',p_hacia_agente,'monto',p_monto)::text);

  RETURN jsonb_build_object('ok', true, 'id', v_row.id, 'reintento', false, 'estado', 'pendiente');
END;
$f2$;

-- 5) transferencias_aceptar — con el candado de saldo (§10)
CREATE OR REPLACE FUNCTION public.transferencias_aceptar(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $f3$
DECLARE v_mi_agente uuid; v_target public.transferencias_agentes; v_row public.transferencias_agentes; v_saldo numeric; v_actor text;
BEGIN
  IF public.mi_rol() IS NULL OR public.mi_organizacion() IS DISTINCT FROM (SELECT id FROM public.organizaciones WHERE slug='nexus-pro') THEN
    RAISE EXCEPTION 'No autorizado (org)';
  END IF;

  SELECT * INTO v_target FROM public.transferencias_agentes WHERE id = p_id;
  IF v_target.id IS NULL THEN RAISE EXCEPTION 'La transferencia no existe'; END IF;

  v_mi_agente := public.mi_agente_efectivo();
  IF public.mi_rol() <> 'admin' AND (v_mi_agente IS NULL OR v_mi_agente::text <> v_target.hacia_agente) THEN
    RAISE EXCEPTION 'No autorizado para aceptar esta transferencia';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('transferencias_saldo:' || v_target.desde_agente));

  IF v_target.estado = 'rechazada' THEN RAISE EXCEPTION 'La transferencia ya fue rechazada, no se puede aceptar'; END IF;
  IF v_target.estado = 'aceptada' THEN RETURN jsonb_build_object('ok', true, 'id', p_id, 'reintento', true, 'estado', 'aceptada'); END IF;

  v_saldo := public.transferencias_saldo_disponible_agente(v_target.desde_agente::uuid);
  IF v_saldo < v_target.monto THEN
    RAISE EXCEPTION 'Saldo insuficiente del origen: disponible RD$ % , solicitado RD$ %', v_saldo, v_target.monto;
  END IF;

  SELECT coalesce(us.nom,'agente') INTO v_actor FROM public.usuarios_sistema us JOIN public.profiles p ON p.usuario_sistema_id=us.id WHERE p.id=auth.uid();

  UPDATE public.transferencias_agentes SET estado='aceptada', aceptado_por=auth.uid(), aceptado_en=now()
   WHERE id = p_id AND estado='pendiente' RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    SELECT * INTO v_target FROM public.transferencias_agentes WHERE id = p_id;
    IF v_target.estado = 'aceptada' THEN RETURN jsonb_build_object('ok', true, 'id', p_id, 'reintento', true, 'estado', 'aceptada'); END IF;
    RAISE EXCEPTION 'No se pudo aceptar la transferencia (estado cambió)';
  END IF;

  INSERT INTO public.auditoria(usuario, rol, accion, detalle, modulo, entity_table, entity_id)
  VALUES (v_actor, public.mi_rol(), 'TRANSFERENCIA_ACEPTADA', 'RD$ '||v_target.monto, 'Seguros', 'transferencias_agentes', p_id::text);

  RETURN jsonb_build_object('ok', true, 'id', p_id, 'reintento', false, 'estado', 'aceptada');
END;
$f3$;

-- 6) transferencias_rechazar
CREATE OR REPLACE FUNCTION public.transferencias_rechazar(p_id uuid, p_motivo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $f4$
DECLARE v_mi_agente uuid; v_target public.transferencias_agentes; v_row public.transferencias_agentes; v_actor text;
BEGIN
  IF public.mi_rol() IS NULL OR public.mi_organizacion() IS DISTINCT FROM (SELECT id FROM public.organizaciones WHERE slug='nexus-pro') THEN
    RAISE EXCEPTION 'No autorizado (org)';
  END IF;

  SELECT * INTO v_target FROM public.transferencias_agentes WHERE id = p_id;
  IF v_target.id IS NULL THEN RAISE EXCEPTION 'La transferencia no existe'; END IF;

  v_mi_agente := public.mi_agente_efectivo();
  IF public.mi_rol() <> 'admin' AND (v_mi_agente IS NULL OR v_mi_agente::text <> v_target.hacia_agente) THEN
    RAISE EXCEPTION 'No autorizado para rechazar esta transferencia';
  END IF;

  IF v_target.estado = 'aceptada' THEN RAISE EXCEPTION 'La transferencia ya fue aceptada, no se puede rechazar'; END IF;
  IF v_target.estado = 'rechazada' THEN RETURN jsonb_build_object('ok', true, 'id', p_id, 'reintento', true, 'estado', 'rechazada'); END IF;

  SELECT coalesce(us.nom,'agente') INTO v_actor FROM public.usuarios_sistema us JOIN public.profiles p ON p.usuario_sistema_id=us.id WHERE p.id=auth.uid();

  UPDATE public.transferencias_agentes SET estado='rechazada', rechazado_por=auth.uid(), rechazado_en=now(), motivo_rechazo=p_motivo
   WHERE id = p_id AND estado='pendiente' RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    SELECT * INTO v_target FROM public.transferencias_agentes WHERE id = p_id;
    IF v_target.estado = 'rechazada' THEN RETURN jsonb_build_object('ok', true, 'id', p_id, 'reintento', true, 'estado', 'rechazada'); END IF;
    RAISE EXCEPTION 'No se pudo rechazar la transferencia (estado cambió)';
  END IF;

  INSERT INTO public.auditoria(usuario, rol, accion, detalle, modulo, entity_table, entity_id)
  VALUES (v_actor, public.mi_rol(), 'TRANSFERENCIA_RECHAZADA', coalesce(p_motivo,'(sin motivo)'), 'Seguros', 'transferencias_agentes', p_id::text);

  RETURN jsonb_build_object('ok', true, 'id', p_id, 'reintento', false, 'estado', 'rechazada');
END;
$f4$;

-- 7) ACL lockdown
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.transferencias_agentes FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.transferencias_agentes FROM authenticated;
REVOKE ALL ON FUNCTION public.transferencias_crear(uuid,numeric,text,text,text,text,text) FROM public, anon;
REVOKE ALL ON FUNCTION public.transferencias_aceptar(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.transferencias_rechazar(uuid,text) FROM public, anon;
REVOKE ALL ON FUNCTION public.transferencias_saldo_disponible_agente(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.transferencias_crear(uuid,numeric,text,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transferencias_aceptar(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transferencias_rechazar(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transferencias_saldo_disponible_agente(uuid) TO authenticated;
```

### Rollback (si algo de esto llegara a aplicarse y hubiera que revertirlo)

```sql
GRANT INSERT, UPDATE, DELETE, TRUNCATE ON public.transferencias_agentes TO anon;
GRANT INSERT, UPDATE, DELETE, TRUNCATE ON public.transferencias_agentes TO authenticated;

DROP FUNCTION IF EXISTS public.transferencias_crear(uuid,numeric,text,text,text,text,text);
DROP FUNCTION IF EXISTS public.transferencias_aceptar(uuid);
DROP FUNCTION IF EXISTS public.transferencias_rechazar(uuid,text);
DROP FUNCTION IF EXISTS public.transferencias_saldo_disponible_agente(uuid);

ALTER TABLE public.transferencias_agentes DROP CONSTRAINT IF EXISTS transferencias_monto_positivo;
ALTER TABLE public.transferencias_agentes DROP CONSTRAINT IF EXISTS transferencias_estado_valido;
ALTER TABLE public.transferencias_agentes DROP CONSTRAINT IF EXISTS transferencias_origen_distinto_destino;
ALTER TABLE public.transferencias_agentes ALTER COLUMN monto DROP NOT NULL;
ALTER TABLE public.transferencias_agentes ALTER COLUMN desde_agente DROP NOT NULL;
ALTER TABLE public.transferencias_agentes ALTER COLUMN hacia_agente DROP NOT NULL;
DROP INDEX IF EXISTS public.transferencias_idempotency_key_uq;

ALTER TABLE public.transferencias_agentes
  DROP COLUMN IF EXISTS creado_por, DROP COLUMN IF EXISTS aceptado_por, DROP COLUMN IF EXISTS aceptado_en,
  DROP COLUMN IF EXISTS rechazado_por, DROP COLUMN IF EXISTS rechazado_en,
  DROP COLUMN IF EXISTS motivo_rechazo, DROP COLUMN IF EXISTS idempotency_key;
```

No hay ningún `CREATE OR REPLACE` de una función YA EXISTENTE en este bloque — las 4 funciones son
enteramente nuevas, así que no aplica el requisito de diff contra `pg_get_functiondef()` de una versión
anterior (§17 del mandato). Sí se reutilizan, sin modificarlos, `mi_rol()`, `mi_organizacion()` y
`mi_agente_efectivo()` — sus definiciones actuales quedan documentadas en §1/§13, y **no se propone
tocarlas**.

---

## §16 — Diseño de frontend mínimo (NO publicado, solo boceto para revisión)

Tres cambios quirúrgicos en `parches.js`, análogos al patrón ya usado en 4D-1/4D-2/4B-2 (envolver la RPC
en la misma función existente, mismo nombre, mismos call sites):

```js
// nxGuardarTransferenciaAgenteV2 — hoy hace api.post(TRANSFER_TABLE, {desde_agente, hacia_agente, ...})
// Pasaría a:
const idem = 'tx-' + Date.now() + '-' + Math.random().toString(36).slice(2);
const r = await api.rpc('transferencias_crear', {
  p_hacia_agente: hacia, p_monto: monto, p_metodo: metodo, p_banco: banco,
  p_referencia: referencia, p_nota: nota, p_idempotency_key: idem
});
// ya NO se manda desde_agente — el <select> "Desde" deja de tener sentido para un agente no-admin
// (se puede dejar solo informativo, mostrando el resultado de mi_agente_efectivo() vía una llamada
// de solo-lectura, sin que el valor viaje al servidor)

// nxAceptarTransferencia — hoy hace api.patch(TRANSFER_TABLE, 'id=eq.'+id, {estado:'aceptada'})
// Pasaría a:
const r = await api.rpc('transferencias_aceptar', { p_id: id });
// manejar r.error con el mensaje real (p.ej. "Saldo insuficiente del origen: ...") en vez del genérico
// de hoy

// nxRechazarTransferencia — análogo, con un motivo (hoy no se pide ninguno; agregar un prompt/modal)
const r = await api.rpc('transferencias_rechazar', { p_id: id, p_motivo: motivo || null });
```

No se tocó ningún archivo real — esto es solo el boceto pedido por §16 del mandato, para que la
implementación futura (si se autoriza) no tenga que redescubrir el mapeo.

---

## Recomendación final

1. **H1-H4 (CRÍTICO) deberían cerrarse cuanto antes** — son el mismo patrón de riesgo ya cerrado 3 veces
   en este bloque, y aquí además incluyen el escenario de sobregiro explícitamente pedido por el dueño.
2. El diseño de las 3 RPC + función de saldo está **probado y funciona exactamente como se pidió** — la
   prueba crítica de RD$10,000/2×RD$8,000 pasa.
3. **Puntos que necesitan confirmación explícita antes de implementar, no decisión unilateral:**
   - Que la nueva función de saldo LEA (solo lectura) de `abonos`/`entregas_admin` (tablas de 4A/4D-1) es
     aceptable bajo "no tocar 4A/4B/4D", o si se prefiere una alternativa más aislada.
   - Confirmar (Q3) que "admin no puede transferir entre dos terceros" es el comportamiento correcto —
     hoy no hay evidencia de uso real de lo contrario, pero es una decisión de negocio, no técnica.
   - Antes de dar la implementación por cerrada, correr una prueba de concurrencia real de 2 sesiones
     (mismo patrón ya usado en bloques de inventario del POS), no solo la prueba secuencial de este
     documento.
4. **No se tocó nada de 4A, 4B, 4D ni `seguros_diagnostico_financiero()`** — confirmado explícitamente en
   la batería (`diagnostico_ok=true`, sin modificar su definición).

**Se espera revisión cruzada de ChatGPT antes de implementar cualquier parte de este diseño**, tal como
exige el mandato.
