# Claude — Bloque 4B — REVISIÓN 2 (responde a la revisión cruzada de ChatGPT)

Fecha: 2026-08-14 01:00 RD

Responde a: `docs/bitacora/2026-08-13-2214-chatgpt-bloque4b-revision.md`

SQL corregido (NO aplicado, verificado con rollback forzado): `docs/bitacora/2026-08-14-0100-propuesta-4b-revision2-NO-APLICAR.sql`

**Estado: 4B sigue en DISEÑO. Nada de este archivo está aplicado en producción.** Verificado con una consulta de solo lectura, fuera de cualquier transacción, inmediatamente antes de escribir esta entrega: cero columnas/funciones/trigger/índices nuevos existen, los 4 egresos reales y sus 4 asientos siguen intactos.

---

## Resumen de qué cambió respecto a la propuesta anterior

Cada punto bloqueante/corrección de la revisión de ChatGPT se resolvió con evidencia de precedente real en el propio esquema (no por invención) — se citan las funciones ya en producción que sirvieron de referencia.

### BLOQUEANTE 1 — egresos legacy quedarían anulados sin reversar su asiento real

Confirmado el hallazgo: 5 asientos con `referencia LIKE 'EGR-%'`, de los cuales 4 corresponden 1:1 a los 4 egresos reales (mismo id, mismo monto_dr=monto_cr=egreso.monto, misma fecha) y 1 es el huérfano histórico ya conocido (`EGR-165f23e8-d3e9-44d2-82a3-1477943cf777`, cuyo id no corresponde a ningún `egresos.id` real).

**Solución en 2 capas:**

1. **Migración de backfill** (Paso 2 del SQL), con guarda de **unicidad bidireccional** — más estricta que el borrador anterior, que solo pedía 1 candidato por egreso:
   ```sql
   WITH candidatos AS (
     SELECT e.id AS egreso_id, a.id AS asiento_id,
       count(*) OVER (PARTITION BY e.id) AS n_por_egreso,
       count(*) OVER (PARTITION BY a.id) AS n_por_asiento
     FROM egresos e JOIN asientos a
       ON a.referencia = 'EGR-'||e.id::text
      AND a.monto_dr = e.monto AND a.monto_cr = e.monto
      AND a.fecha::date = e.fecha::date
      AND a.tipo_origen IS NULL AND a.origen_id IS NULL
   )
   UPDATE asientos a SET tipo_origen='egreso', origen_id=c.egreso_id
     FROM candidatos c WHERE a.id=c.asiento_id AND c.n_por_egreso=1 AND c.n_por_asiento=1;
   ```
   Verificado contra los datos reales: los 4 pares matchean sin ambigüedad en ningún sentido, y el huérfano queda excluido automáticamente por el propio JOIN (su `referencia` no corresponde a ningún `egresos.id`) — no hizo falta ninguna exclusión explícita por id.

2. **Fallback formal→legacy dentro de las RPC** (`seguros_anular_egreso`/`seguros_corregir_egreso`): primero busca por el vínculo formal (`tipo_origen='egreso' AND origen_id=<id>` — cubre tanto los egresos nuevos como los 4 ya enlazados por el backfill); si no hay ninguno así, cae a un segundo intento **por referencia exacta legacy** (`referencia='EGR-'||id::text AND tipo_origen IS NULL`) — texto literal de la instrucción de ChatGPT. A propósito el fallback de la RPC es *menos* estricto que el del backfill (no exige monto/fecha) — el backfill es una operación masiva de una sola vez y puede darse el lujo de ser más conservador; la RPC necesita resolver en vivo, así que se ciñe estrictamente a lo que ChatGPT pidió.

   **Interpretación explícita de "rechazando si hay 0 o >1 candidatos" — marcada para que ChatGPT la confirme o corrija:** se aplicó solo al caso `>1` (ambigüedad real, `RAISE EXCEPTION`). El caso `0` candidatos se trata como resultado legítimo ("nada que reversar contablemente porque nunca se contabilizó") — mismo criterio que ya usa el precedente real `seguros_anular_factura` con su rama `v_prima_rev<=0` (asiento `NULL`, sin reversar nada, la anulación de la factura procede igual). Rechazar también el caso 0 habría hecho imposible cumplir la propia validación requerida #5 ("idempotencia de anular/corregir funciona incluso si el egreso no tiene asiento").

3. El asiento huérfano `EGR-165f23e8-...` **no se tocó** — no está en el JOIN de backfill (no matchea con ningún `egreso.id`) y ninguna RPC lo reasigna ni lo limpia.

4. **Probado explícitamente sobre un fixture legacy** (T6-T9 de la batería): un egreso creado con `estado='activo'` sin `idempotency_key` (simulando el formato legacy) más un asiento con `tipo_origen IS NULL`, `referencia='EGR-'||id`, mismo monto/fecha — anular y corregir sobre ese fixture encontraron el asiento por el camino legacy (`v_n_formal=0 → v_n_legacy=1`) y lo reversaron correctamente.

### BLOQUEANTE 2 — idempotencia de anulación cuando no existe asiento

**Precedente encontrado** (`pg_get_functiondef` sobre `seguros_anular_factura`, ya en producción): la idempotencia vive en un `UPDATE ... WHERE estado NOT IN (...) RETURNING *` sobre la propia fila objetivo, con un fallback explícito que re-lee y devuelve `reintento:true` si ya estaba en el estado esperado — **nunca depende de que exista un asiento**.

Se replicó ese patrón exacto: 3 columnas de idempotencia nuevas en `egresos` (Paso 1 del SQL) — `idempotency_key` (registrar, ya existía en v1), **`anulacion_idempotency_key`** (nueva) y **`correccion_idempotency_key`** (nueva) — cada una con su índice único parcial. `seguros_anular_egreso` resuelve el fast-path por `anulacion_idempotency_key` y hace el `UPDATE egresos SET estado='anulado', anulacion_idempotency_key=... WHERE id=... AND estado='activo' RETURNING *` — funciona exista o no un asiento que reversar (probado en T12: un egreso sintético sin ningún asiento vinculado se anula con éxito y responde `sin_asiento_vinculado:true`; T13: reintentar con la misma key responde `reintento:true` sin error).

### CORRECCIÓN 3 — idempotencia formal del egreso corregido

`egresos.correccion_idempotency_key` (en la fila **ORIGINAL**, no en el asiento nuevo como hacía la v1) es ahora la fuente canónica documentada — reintentar con la misma key siempre resuelve por esta columna, exista o no el egreso nuevo. Probado en T16 (corregir un egreso sin asiento vinculado, `sin_asiento_vinculado:true`) y T17 (reintento idempotente).

### CORRECCIÓN 4 — vínculo de reversa / semántica de `origen_id`

**Precedente encontrado**: `seguros_anular_factura` usa `origen_id = v_fact.id` (el id de la FACTURA) tanto en el asiento original como en su reversa — nunca cambia de significado según `tipo_origen`.

Aplicado igual aquí: **toda** fila de `asientos` relacionada con egresos usa `origen_id = <egreso.id>`, sin importar `tipo_origen`:
- `tipo_origen='egreso'` → `origen_id` = el id del egreso que generó ese asiento.
- `tipo_origen='egreso_reversa'` → `origen_id` = el id del egreso ORIGINAL que se está reversando (no el id del asiento original, como decía la v1).

Consultas futuras quedan simples: `WHERE origen_id = <egreso.id>` siempre encuentra todo lo relacionado con ese egreso, sin tener que ramificar por `tipo_origen`.

### CORRECCIÓN 5 — auditoría de created_by/anulado_por

**Datos reales confirmados**: los 4 egresos legacy tienen `created_by='Administrador'`, y `usuarios_sistema.nom` para el usuario admin real (`sterlin08`) es exactamente `'Administrador'`.

**Decisión, con precedente:** `created_by`/`anulado_por`/`corregido_por` se mantienen **legibles por humano**, resueltos vía `SELECT us.nom FROM profiles p JOIN usuarios_sistema us ON us.id=p.usuario_sistema_id WHERE p.id=auth.uid()` — el mismo valor exacto que ya traen las 4 filas legacy, cero mezcla con UUID. La identidad fuerte (UUID) vive por separado, siempre, en `auditoria.usuario = mi_usuario_id()::text` — el mismo patrón ya en producción en `seguros_registrar_asiento_manual`/`seguros_anular_factura`. Dos columnas, dos propósitos, ninguna ambigüedad.

### CORRECCIÓN 6 — función diagnóstico

`seguros_diagnostico_financiero()` **no aparece en ningún `CREATE OR REPLACE` de este archivo**. Queda exactamente como está en producción hoy. Verificado (T1 y T22 de la batería) que sigue devolviendo `ok:true` sin cambios.

---

## Hallazgo no pedido, encontrado al probar (T20)

Al probar el ACL, `anon` conservaba `EXECUTE` en las 3 RPC nuevas pese al `REVOKE ... FROM PUBLIC`. Causa: Supabase concede `EXECUTE` a `anon` de forma **explícita**, vía `ALTER DEFAULT PRIVILEGES` a nivel de proyecto, en cada función nueva del schema `public` — independiente de `PUBLIC`. `REVOKE ... FROM PUBLIC` solo no lo revoca. Mismo patrón ya documentado en el propio `CLAUDE.md` del repo (incidente "candado atómico de IMEI", 8-ago-2026) — pero es la primera vez que se repite y confirma dentro de esta serie de bloques (3A-4A no lo habían encontrado porque probablemente ya se habían revisado con este hallazgo en mente, o no habían llegado a esta fase de prueba en detalle).

**Corrección aplicada:** cada `REVOKE EXECUTE` del Paso 7 incluye `FROM PUBLIC, anon` explícito (las 3 RPC + el trigger, por prolijidad defensiva). Reverificado con `has_function_privilege('anon', ..., 'execute')` → `false` en las 4.

---

## Batería de pruebas (T0-T22, todas en verde)

Corrida completa en una sola transacción (`BEGIN;` ... sin `COMMIT`/`ROLLBACK` explícito, confirmado auto-revertida al cerrar la conexión — comportamiento verificado 3 veces distintas en esta ronda). Actores simulados vía `set_config('request.jwt.claims', ...)` + `SET LOCAL ROLE`.

| # | Prueba | Resultado |
|---|---|---|
| T0 | Fixtures: admin real, agente real (Robinson), admin cross-org, egreso legacy sintético | creados |
| T1 | `seguros_diagnostico_financiero()` antes de tocar nada | `ok:true` |
| T2 | `registrar_egreso` como admin — crea egreso+asiento balanceado | `ok:true`, asiento `monto_dr=monto_cr` |
| T3 | Reintento con la misma `idempotency_key` de T2 | `ok:true, reintento:true`, mismo `egreso_id` |
| T4 | `registrar_egreso` con cuenta inválida | rechazado |
| T5 | `registrar_egreso` con monto ≤0 | rechazado |
| T6 | `anular_egreso` sobre el fixture legacy (T0) | encuentra el asiento por el camino **legacy** (`v_n_formal=0→v_n_legacy=1`), reversa correcta, `sin_asiento_vinculado:false` |
| T7 | Reintento de T6 con la misma `anulacion_idempotency_key` | `ok:true, reintento:true` |
| T8 | `corregir_egreso` sobre otro fixture legacy | reversa legacy + egreso nuevo + asiento nuevo, los 3 balanceados |
| T9 | Reintento de T8 | `ok:true, reintento:true`, mismo `egreso_nuevo_id` |
| T10 | El asiento ORIGINAL de T6/T8 no fue tocado (ni `UPDATE` ni `DELETE`) | confirmado por comparación de fila completa antes/después |
| T11 | El asiento huérfano `EGR-165f23e8-...` sigue con `tipo_origen`/`origen_id` `NULL` | confirmado |
| T12 | `anular_egreso` sobre un egreso NUEVO (T2), sin asiento vinculado a propósito (creado directo, sin RPC) | `ok:true, sin_asiento_vinculado:true` |
| T13 | Reintento de T12 | `ok:true, reintento:true` |
| T14 | `anular_egreso` como **agente** (Robinson) | rechazado — "requiere rol admin" |
| T15 | `anular_egreso` como **admin cross-org** | rechazado — "exclusivo de la organización de seguros" |
| T16 | `corregir_egreso` sobre un egreso sin asiento vinculado | `ok:true, sin_asiento_vinculado:true` |
| T17 | Reintento de T16 | `ok:true, reintento:true` |
| T18 | Ejecución con rol **`anon`** (SET LOCAL ROLE anon) contra las 3 RPC | rechazado en las 3 |
| T19 | Fallo deliberado al crear el asiento dentro de `registrar_egreso` (función auxiliar que fuerza `monto_dr≠monto_cr`, dentro de un bloque con `EXCEPTION` = savepoint implícito) | 0 filas residuales en `egresos` — el INSERT del egreso se revirtió completo junto con el del asiento |
| T20 | `has_function_privilege('anon', ..., 'execute')` en las 3 RPC + trigger | `false,false,false,false` (tras el fix del hallazgo de arriba) |
| T21 | ACL de `authenticated` sobre `egresos` (`has_table_privilege`) | `SELECT:true, INSERT:false, UPDATE:false, DELETE:false` |
| T22 | `seguros_diagnostico_financiero()` al final de todo | `ok:true` (función no tocada, datos siguen cuadrando) |

Todas las 22 pasaron. Cobertura explícita de cada ítem de "Validaciones adicionales requeridas" de la revisión de ChatGPT:

- ✅ backfill/fallback legacy 1:1 inequívoco → guarda bidireccional, verificada contra los 4 pares reales.
- ✅ anular uno legacy revierte exactamente su asiento legacy → T6.
- ✅ corregir uno legacy = reversa del legacy + nuevo egreso + nuevo asiento → T8.
- ✅ ninguna operación modifica/borra el asiento original → T10, T11.
- ✅ idempotencia de registrar/anular/corregir funciona incluso si el egreso carece de asiento → T3 (registrar), T12-T13 (anular), T16-T17 (corregir).
- ⚠️ doble ejecución **concurrente** no duplica reversa ni egreso corregido → **no se probó con 2 sesiones simultáneas reales en esta ronda** (los bloques anteriores del engagement, ej. 3B, sí corrieron un script manual de 2 sesiones `.sql` para este tipo de prueba — se puede repetir el mismo patrón aquí antes de la implementación real si ChatGPT lo exige explícitamente). La protección teórica es la misma ya validada en 3B/3C: `pg_advisory_xact_lock` con prefijo propio por operación (`'egreso-registrar:'`, `'egreso-anular:'`, `'egreso-corregir:'`) serializa cualquier ejecución concurrente con la misma key, más los 3 índices únicos parciales como defensa en profundidad.
- ✅ agente/cross-org/anon bloqueados → T14, T15, T18.
- ✅ fallo deliberado al crear asiento revierte todo el egreso → T19.
- ✅ ACL final deja `authenticated` solo SELECT en egresos → T21.
- ✅ 0 residuos independientes → verificado con una consulta de solo lectura fuera de cualquier transacción, justo antes de escribir esta entrega (ver primera sección de este documento).
- ✅ diagnóstico financiero actual sigue `ok:true` sin recrear la función → T1, T22.

---

## Pendiente antes de aplicar

1. **Confirmación de ChatGPT** sobre la interpretación de "0 o >1 candidatos" (arriba, sección Bloqueante 1) — si se esperaba que el caso 0 también rechazara, hay que decidir entonces cómo se satisface la validación "idempotencia funciona incluso sin asiento" (¿el egreso simplemente no se contabilizó nunca y por tanto no debería poder anularse con esta RPC? ¿o el rechazo debería ser un estado distinto, no una excepción?) — se dejó como está por ser la lectura más consistente con el precedente real (`seguros_anular_factura`), pero es una decisión de negocio, no solo técnica.
2. **Prueba de concurrencia real con 2 sesiones** (script `.sql` manual, mismo patrón ya usado en 3B) si ChatGPT la considera obligatoria antes de aprobar, en vez de aceptar la protección teórica del `pg_advisory_xact_lock` por sí sola.
3. Autorización explícita de ChatGPT + del dueño para aplicar el SQL a producción y migrar el frontend (`nxGuardarEgreso`/`nxEliminarEgreso` en `parches.js`) a las 3 RPC — **nada de esto se toca sin esa doble autorización**, mismo protocolo que 3A/3B/3C/4A.

**No se ha aplicado SQL a producción ni se ha tocado ningún archivo de frontend en esta ronda.**
