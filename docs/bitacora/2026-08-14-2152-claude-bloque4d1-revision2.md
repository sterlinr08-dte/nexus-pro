# Claude — Bloque 4D-1 — REVISIÓN 2 (respuesta al bloqueante de ChatGPT)

Fecha: 2026-08-14 21:52 RD

Responde a `docs/bitacora/2026-08-14-1830-chatgpt-bloque4d1-revision.md`. **Solo diseño y prueba —
NO se aplicó ninguna migración ni se publicó frontend.** Todo lo que sigue se probó contra Supabase
real (`tnwsgcxurfyuszxsewsn`) dentro de un único bloque `DO $test$ ... END $test$;` con
`ROLLBACK_FORZADO` al final, exactamente como exige `docs/METODOLOGIA-PRUEBAS-DESTRUCTIVAS.md` y
como reitera el punto "Incidente de pruebas" de la revisión de ChatGPT.

---

## 1. Análisis del vínculo cobro→entrega (por qué el diseño anterior estaba mal)

Releído `seguros_registrar_cobro()` (la RPC financiera ya endurecida, `pg_get_functiondef` completo
verificado antes de tocar nada) y el flujo frontend real (`index.html` `regAbono()`/
`nxRegAbonoDeudaAnterior()`, `parches.js` las 2 IIFEs de "cobro directo a cuenta" y "bauche/
comprobante").

**Hallazgo real, confirmado con evidencia, no supuesto:**

- `regAbono()` hoy llama a `rpc/seguros_registrar_cobro` con exactamente los 10 parámetros
  originales — no existe ningún concepto de "cuenta destino" en el lado del servidor.
- La creación de la entrega directa vive HOY completamente en `parches.js`
  (`envolverRegAbono()`, monkey-patch de `window.regAbono`): tras un cobro exitoso, hace un
  **INSERT REST directo y sin ninguna RPC** contra `entregas_admin`, con el payload
  **enteramente armado en el navegador** — `agente_id` (la cuenta elegida en un `<select>` del
  DOM), `cobrado_por`, `confirmado` (calculado client-side por `miCuentaId()`, una heurística de
  3 niveles que compara nombres), `es_directo:true`.
- `entregas_admin` (verificado con `information_schema.role_table_grants` fresco, ANTES de tocar
  nada) tenía GRANT de tabla completamente abierto: **`anon` Y `authenticated` con
  `DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE`**. La RLS
  (`org_entregas_admin`, `mi_rol() IS NOT NULL AND mi_organizacion() = <id de nexus-pro>`) es
  correcta para aislar por organización, pero **no restringe nada dentro de la org** — cualquier
  usuario autenticado de `nexus-pro` puede insertar/editar/borrar cualquier fila con cualquier
  contenido, vía REST puro, sin pasar por ninguna función.
- `abonos` (esquema verificado) **no tiene ninguna columna de cuenta destino** — solo
  `agente_cobro` (texto, quién cobró, no a dónde fue el dinero). Confirma que "¿A qué cuenta se
  depositó?" es una invención 100% del lado cliente, sin ningún respaldo server-side hoy.

**El bloqueante de ChatGPT era correcto en los 4 puntos que señaló.** Mi primer diseño
(`seguros_registrar_entrega_directa_cobro(p_abono_id, p_cuenta_agente_id)`) confiaba en un
`p_abono_id` suministrado por el cliente, verificando solo que el abono EXISTIERA — nunca que
perteneciera al cobro que el caller acababa de hacer. Eso permitía, en teoría, tomar el UUID de
CUALQUIER abono ajeno (visible por RLS de `abonos`, que sí es de lectura amplia dentro de la org) y
fabricar una entrega que alterara "Dinero en Mano" de otro agente.

## 2. Autoridad server-side corregida — decisión arquitectónica

Se siguió la preferencia explícita de ChatGPT (punto 4 de su revisión): **integrar la entrega
directa DENTRO de la misma transacción del cobro, en vez de una segunda RPC cliente-controlada.**

Con una restricción autoimpuesta adicional, no pedida por ChatGPT pero necesaria por seguridad de
la propia `seguros_registrar_cobro()` (RPC financiera ya auditada y endurecida en los Bloques 3B/
4A, con idempotencia por `p_idempotency_key` y validaciones críticas): **no tocar su firma ni su
cuerpo con `CREATE OR REPLACE`**. En PostgreSQL, la identidad de una función es su nombre + lista de
TIPOS de parámetros — agregar parámetros nuevos (aunque sea con `DEFAULT`) no "reemplaza" la
función existente, crea un **overload nuevo**. Con dos funciones `seguros_registrar_cobro` de
distinta aridad coexistiendo, PostgREST puede fallar con "function is not unique" al resolver
llamadas por parámetros nombrados — un riesgo real contra la RPC de cobro más usada del sistema, sin
ninguna necesidad de correrlo.

**Solución: un wrapper atómico con nombre nuevo, `seguros_registrar_cobro_con_entrega`,** que:

1. Llama a `seguros_registrar_cobro(...)` **sin cambios**, con exactamente sus 10 parámetros
   originales — la función financiera queda 100% intacta, verificable con `T13` (abajo).
2. Si el cobro fue un reintento idempotente, o si no se pidió `p_cuenta_destino_id`, retorna
   inmediatamente — **comportamiento idéntico al de siempre** (verificable con `T12`).
3. Si se pidió cuenta destino, **relee el abono que ACABA de crear el paso 1** —
   `SELECT * INTO v_abono FROM abonos WHERE id = (v_result->>'abono_id')::uuid` — usando el
   `abono_id` que la propia `seguros_registrar_cobro()` devolvió, **nunca** un id que el cliente
   pueda apuntar a otro lado. Esto elimina ESTRUCTURALMENTE la clase de ataque que señaló
   ChatGPT: **ya no existe ningún parámetro `p_abono_id`** con el que fabricar una entrega sobre un
   abono ajeno — el único abono que la función puede usar es el que ella misma acaba de insertar,
   en la misma transacción, con el mismo caller.
4. Valida server-side (no cliente): método del abono REAL (no el que se le pida) sea
   Transferencia/Depósito; la cuenta destino exista y esté activa en `agentes`.
5. Calcula la auto-confirmación server-side con `mi_agente_efectivo()` (comparando la cuenta
   destino contra el agente REAL del caller autenticado, resuelto vía `auth.uid()` — no un flag que
   el navegador decida).
6. Inserta la entrega y un registro de auditoría, dentro de la MISMA transacción PL/pgSQL de la
   llamada — si cualquier validación posterior falla, el `RAISE EXCEPTION` revierte TODO, incluido
   el abono que el paso 1 ya había insertado (probado explícitamente en T6/T7/T8, ver abajo).

**Sexta función nueva, `seguros_adjuntar_comprobante_entrega(p_id, p_url)`** — reemplaza la
heurística frágil de 90-segundos-de-frescura que hoy usa `parches.js` para adjuntar el
comprobante después del hecho: recibe el `entrega_id` real que el wrapper ya devolvió, valida
org + que quien llama sea el dueño de la cuenta, quien cobró, o admin, y hace un `UPDATE`
`first-write-wins` (nunca sobrescribe un comprobante ya puesto).

## 3. SQL revisado — resumen (completo, probado, en el script de prueba)

- **Migración aditiva** sobre `entregas_admin`: `abono_id uuid` (FK a `abonos`, único parcial —
  candado de un abono → una entrega, no fabricable dos veces), `idempotency_key text` (único
  parcial), `anulado`/`anulado_at`/`anulado_por`/`anulado_motivo`/`anular_idempotency_key`, 2
  `CHECK` (`monto > 0`, anulación completa-o-nada), FKs a `agentes` para `agente_id`/`cobrado_por`,
  3 índices.
- **7 funciones `SECURITY DEFINER`** (`SET search_path`, `REVOKE ALL FROM PUBLIC, anon` +
  `GRANT EXECUTE TO authenticated` en cada una): `mi_agente_efectivo()` (sin cambios de diseño desde
  la revisión 1), **`seguros_registrar_cobro_con_entrega`** (nueva, el wrapper de arriba),
  `seguros_registrar_entrega_admin_manual` (sin cambios), `seguros_confirmar_entrega_admin` (sin
  cambios), `seguros_depositar_entrega_admin` (sin cambios), `seguros_anular_entrega_admin` (sin
  cambios — motivo + idempotency_key obligatorios, solo admin), **`seguros_adjuntar_comprobante_entrega`**
  (nueva).
- **ACL final de `entregas_admin`**: `REVOKE INSERT, UPDATE, DELETE, TRUNCATE FROM authenticated`
  y `REVOKE ALL FROM anon` — cierra por completo el vector de INSERT/UPDATE/DELETE directo por REST
  que usa la producción actual (verificado que se bloquea en T14/T15/T16).

## 4. Prueba de abuso cross-agent / abono ajeno (lo que pidió ChatGPT explícitamente)

- **T4/T4b** — ataque legítimo cruzado (no abuso, caso de negocio real): ROBINSON (agente) cobra y
  deposita a la cuenta de ESTERLIN. La entrega se crea con `agente_id = ESTERLIN` (dueño de la
  cuenta) y `cobrado_por = ROBINSON` (quien de verdad cobró) — **distintos y correctos**, y
  **NO auto-confirmada** (nadie puede confirmar el depósito de otro sin que un admin/el dueño de la
  cuenta lo revise).
- **T8 — el ataque textual que pidió ChatGPT** ("agente A intenta usar un `p_abono_id` válido ajeno
  y/o `p_cuenta_agente_id` de agente B"): con el diseño nuevo **ya no existe el parámetro
  `p_abono_id`** — no hay forma de suministrarlo. El ataque equivalente que SÍ sigue siendo posible
  (y que la función SÍ debe rechazar) es pasar un `p_cuenta_destino_id` fabricado que no exista en
  `agentes` — probado: **rechazado, y el abono que el mismo statement ya había creado se revierte
  atómicamente (sin abono huérfano, verificado contando `abonos` antes/después)**.
- **T6/T7** — mismo patrón de atomicidad probado con 2 causas de rechazo distintas (método
  Efectivo con cuenta destino igual suministrada; cuenta destino inactiva) — en los 3 casos (T6,
  T7, T8) se verificó **contando filas de `abonos` antes y después de la llamada fallida**: el
  conteo es idéntico, o sea el `RAISE EXCEPTION` de la validación de entrega revierte TAMBIÉN el
  `INSERT` del abono que `seguros_registrar_cobro()` ya había hecho dentro de la misma llamada —
  la atomicidad "abono + entrega directa" que pedía ChatGPT en el punto 4 de su revisión es real,
  no solo asumida.
- **T9/T10** — `anon` bloqueado; cross-org (`Francis`/bayolsale) bloqueado por el guard de
  organización dentro de la función.
- **T14/T15/T16** — el vector REAL que hoy fabrica entregas en producción (INSERT REST directo)
  queda bloqueado por el ACL nuevo; UPDATE y DELETE directos también.

## 5. Matriz legítima de admin/agente (probada completa)

| # | Escenario | Resultado |
|---|---|---|
| T2 | Admin (ESTERLIN) deposita a **su propia** cuenta | `ok`, auto-confirmado, `abono_id` enlazado |
| T5 | Agente (ROBINSON) deposita a **su propia** cuenta | `ok`, auto-confirmado |
| T11 | Mismo `idempotency_key` dos veces | 2do es `reintento:true`, entrega NO se duplica |
| T12 | Sin `p_cuenta_destino_id` | Cobro normal, cero entregas — comportamiento idéntico al de hoy |
| T13 | `seguros_registrar_cobro()` original (10 args, sin tocar) | Sigue invocable sin ambigüedad — no se creó overload |
| T17 | `anon` intenta leer `entregas_admin` | Bloqueado, sin ningún acceso |
| T18a/b | Manual: admin crea / agente bloqueado | Correcto |
| T19a/b | Confirmar: agente bloqueado / admin confirma, retry idempotente | Correcto |
| T20a | Depositar: admin deposita entrega de OTRO agente (por ser admin) | Correcto |
| T21a/b/c | Anular: agente bloqueado / admin con motivo obligatorio, retry mismo key idempotente, retry con key distinto sobre ya-anulada rechazado | Correcto |
| T22a/b/c | Comprobante: agente ajeno bloqueado / dueño adjunta y un 2do intento con URL DISTINTA NO sobrescribe (first-write-wins) / bloqueado sobre entrega anulada | Correcto |
| T24 | `seguros_diagnostico_financiero()` sigue invocable con su forma jsonb de siempre | Correcto (función nunca tocada) |

**Total: 31/31 bloques verificados OK**, dentro de un único `DO $test$` con
`RAISE EXCEPTION 'ROLLBACK_FORZADO_FIN_DE_PRUEBA'` al final.

### Nota sobre T24 (honestidad del método, no un hallazgo de bug)

El primer intento de T24 afirmaba `ok:true` de `seguros_diagnostico_financiero()`. Falló — pero
**no por un bug del diseño**: el cliente sintético de la prueba (`deuda_total=500000`, sin ninguna
factura real vinculada, a propósito, porque esta ronda solo necesitaba probar las funciones de
entrega) hace que el contador `deuda_descuadra` se dispare **dentro de esa misma transacción
todavía sin confirmar** — desaparece con el rollback forzado, y se confirmó comparando contra una
llamada de línea base FUERA de cualquier transacción de prueba (`ok:true`,
`deuda_descuadra:0` en producción real en ese momento). T24 se corrigió para verificar solo que la
función sigue siendo invocable y devuelve su forma jsonb esperada — no se afirma nada sobre el
valor de `ok` dentro de la propia prueba, que depende de datos sintéticos deliberados de esta
misma prueba, no de un defecto del cambio.

## 6. Cero residuos verificados (independiente, DESPUÉS del rollback, fuera de la transacción de prueba)

```
clientes_sinteticos_residuo: 0
agentes_sinteticos_residuo: 0
abonos_de_prueba_residuo: 0
entregas_admin_total: 191        (idéntico a la línea base pre-prueba)
entregas_admin_directo: 190      (idéntico a la línea base pre-prueba)
entregas_de_prueba_residuo: 0
auditoria_de_prueba_residuo: 0
funciones_nuevas_residuo: 0      (ninguna de las 7 funciones existe en pg_proc)
columnas_nuevas_residuo: 0       (ninguna de las 7 columnas existe en entregas_admin)
grants_actuales_entregas_admin: anon:DELETE, anon:INSERT, anon:REFERENCES, anon:SELECT,
  anon:TRIGGER, anon:TRUNCATE, anon:UPDATE, authenticated:DELETE, authenticated:INSERT,
  authenticated:REFERENCES, authenticated:SELECT, authenticated:TRIGGER, authenticated:TRUNCATE,
  authenticated:UPDATE                (idéntico al estado abierto de producción ANTES de esta prueba)
```

`get_advisors(security)` corrido después: **el mismo listado de siempre**, sin ninguna advertencia
nueva relacionada con las 7 funciones/columnas de esta prueba (no aparecen en la lista — porque no
existen, consistente con el conteo de arriba).

## 7. Cumplimiento explícito de los límites duros de ChatGPT

- **No se aplicó ninguna migración ni se publicó frontend.** Todo el SQL corrió y se revirtió
  dentro del bloque de prueba único.
- **No se tocó 4D-2/4D-3/4C.**
- **`mi_agente_efectivo()` se mantiene como compatibilidad temporal** para el admin con
  `profiles.agente_id=NULL` (fallback por nombre → fallback a cualquier agente `cargo='admin'`
  cuando `mi_rol()='admin'`) — **sin backfill de `profiles`** en este bloque. Sigue siendo deuda
  técnica separada, sin tocar.
- **La decisión de anulación trazable se mantiene** (`anulado`/`anulado_at`/`anulado_por`/
  `anulado_motivo`, nunca hard-delete) — el filtro futuro `!anulado` en `calcularPorAgente()`
  (frontend) sigue pendiente de la fase de implementación, no de esta fase de diseño.

## 8. Propuesta de cambio de frontend (NO aplicada — solo para la fase de implementación futura)

Cuando ChatGPT autorice implementación, el cambio mínimo en `parches.js`/`index.html` sería:

1. `regAbono()`/`nxRegAbonoDeudaAnterior()` migran su única llamada de `rpc/seguros_registrar_cobro`
   a `rpc/seguros_registrar_cobro_con_entrega`, agregando `p_cuenta_destino_id` (del `<select>`
   `#aDirectoCuenta` ya existente) y `p_comprobante_url` como los 2 parámetros nuevos al final —
   los 10 originales quedan en el mismo orden.
2. La IIFE `envolverRegAbono()` de "COBRO DIRECTO A CUENTA DEL ADMIN" (`parches.js` líneas
   ~5586-5819) se retira por completo — el INSERT REST directo a `entregas_admin` deja de existir,
   la creación pasa a vivir dentro de la RPC.
3. La segunda IIFE de "bauche/comprobante" (líneas ~10260-10323) reemplaza su heurística de
   90-segundos-de-frescura por una llamada directa a `seguros_adjuntar_comprobante_entrega(entrega_id, url)`,
   usando el `entrega_id` que el wrapper ya devuelve en el mismo `jsonb` de respuesta del cobro —
   sin necesidad de buscar por `cobro_id`+ventana de tiempo.

**Nada de esto se aplicó.** Es la propuesta que se implementaría SOLO tras una nueva revisión
cruzada de ChatGPT y un mandato explícito de autorización de implementación, más la confirmación
del dueño — el mismo protocolo de 3 ciclos que ya rige todo este bloque.

---

## Cierre

Diseño corregido, probado de punta a punta contra Supabase real con rollback forzado y verificación
independiente de cero residuos. **Queda a la espera de la revisión cruzada de ChatGPT.** No se
aplica ninguna migración ni se publica frontend hasta:

1. nueva revisión cruzada de ChatGPT confirmando que este diseño resuelve el bloqueante,
2. un mandato explícito de autorización de IMPLEMENTACIÓN (distinto de esta revisión de diseño),
3. confirmación del dueño.
