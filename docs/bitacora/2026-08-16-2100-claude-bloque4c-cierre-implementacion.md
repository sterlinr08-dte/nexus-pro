# Claude — Bloque 4C-DEUDA: cierre de implementación final

Fecha: 2026-08-16 (RD)
Responde a: `docs/bitacora/2026-08-16-1326-chatgpt-bloque4c-implementacion-final.md` (commit `1416f58`),
que autorizó implementar en producción el diseño de deuda derivada (Opción B) descrito en
`docs/bitacora/2026-08-16-1410-claude-bloque4c-saldo-negativo.md` (commit `d4310e7`).

Estructura de 10 puntos exigida por el mandato — se sigue al pie de la letra.

---

## 1. Preflight

Antes de tocar nada de 4C-DEUDA (task #350), se confirmó que `transferencias_agentes` y las 3 RPC
públicas (`transferencias_crear`/`transferencias_aceptar`/`transferencias_rechazar`) más las 2
funciones internas (`transferencias_lock_agentes`/`transferencias_saldo_disponible_agente`) estaban
exactamente como las dejó 4C-IMPL (tasks #346-349) — sin drift respecto al diseño ya probado en la
rama desechable `bloque4c-correccion-final` (tasks #336-343).

**Preflight fresco de esta sesión (re-verificado de nuevo, ahora mismo, antes de escribir este
documento — no se confía en memoria de rondas anteriores):**

- `transferencias_agentes`: **25 filas** — 24 `aceptada`, 1 `rechazada`, 0 `pendiente`.
- Agentes reales en la organización: exactamente 2 (`ESTERLIN`, `ROBINSON`).
- `seguros_diagnostico_financiero()` (justo antes de escribir este cierre):
  ```json
  {"ok":true,"ast_baja":0,"deuda_descuadra":0,"pagado_descuadra":0,
   "asientos_no_positivos":0,"asientos_desbalanceados":0,
   "abonos_huerfanos":1,"cobros_sin_agente":2,"facturas_huerfanas":3,
   "cobros_sin_referencia":8,"cobros_transfer_sin_banco":10,
   "verificado_en":"2026-08-16T20:50:30.080681+00:00"}
  ```
  Los 5 contadores duros (`ast_baja`, `deuda_descuadra`, `pagado_descuadra`,
  `asientos_no_positivos`, `asientos_desbalanceados`) siguen en 0. Los 5 contadores blandos
  (`abonos_huerfanos`, `cobros_sin_agente`, `facturas_huerfanas`, `cobros_sin_referencia`,
  `cobros_transfer_sin_banco`) son la misma línea base histórica ya conocida de bloques anteriores
  (ninguno de estos 5 tiene relación con `transferencias_agentes`; el bloque 4C-DEUDA no toca
  clientes/facturas/asientos fuera de los 2 asientos que `seguros_reversar_cobro` ya posteaba antes
  de esta ronda).
- Única rama de Supabase activa: `main` (`list_branches` → 1 resultado, `is_default:true`) — cero
  ramas de prueba desechables colgadas.

## 2. Objetos SQL finalmente aplicados y diferencias vs diseño

4C-DEUDA (tasks #351-353) tocó **exactamente 3 funciones existentes**, ninguna tabla nueva, ninguna
columna nueva, ningún trigger nuevo — tal como exigía el mandato ("NO se crea tabla de ledger
nueva"). Cuerpo real desplegado, verificado con `pg_get_functiondef` en esta misma sesión:

### 2.1 `transferencias_crear` — candado de saldo al CREAR

```sql
-- Bloque 4C — deuda derivada: con saldo_real <= 0 no se puede CREAR una transferencia
-- saliente nueva (evita dejar un pendiente condenado a fallar en el accept, feedback claro).
v_saldo_origen := public.transferencias_saldo_disponible_agente(v_origen);
IF v_saldo_origen <= 0 THEN
  RAISE EXCEPTION 'Este agente tiene una deuda de RD$ % y no puede transferir hasta cubrirla.',
    round(-v_saldo_origen, 2);
END IF;
```

Colocado **después** de la resolución de idempotencia (un reintento de una transferencia ya creada
nunca se bloquea por esto) y **antes** del `INSERT`. Cumple la regla 1 del mandato al pie de la
letra. El resto de la función (autoridad de origen admin-vs-no-admin, resolución de idempotencia,
validación de destino/monto, inserción, auditoría `TRANSFERENCIA_CREADA`) es exactamente el diseño
ya aplicado por 4C-IMPL — sin diferencias.

### 2.2 `seguros_reversar_cobro` — enriquecimiento del `new_data` de `COBRO_REVERSADO`

```sql
PERFORM public.transferencias_lock_agentes(v_agente_afectado);
-- ... (lógica de reversa sin cambios) ...
v_saldo_despues := public.transferencias_saldo_disponible_agente(v_agente_afectado);
v_afectados := jsonb_build_array(jsonb_build_object(
  'agente_id', v_agente_afectado,
  'saldo_antes', v_saldo_antes,
  'saldo_despues', v_saldo_despues,
  'genero_deficit', (v_saldo_despues < 0),
  'deuda_despues', greatest(0, -v_saldo_despues)
));
-- ... INSERT INTO auditoria(...) con new_data que ya incluía estado/asiento_reversa_id/
-- nuevo_pagado/nueva_deuda_anterior, AHORA + 'agentes_afectados': v_afectados
```

El candado (`transferencias_lock_agentes`) **ya estaba** en esta función desde el diseño de 4C-IMPL
(no es una pieza nueva de 4C-DEUDA) — lo nuevo de esta ronda es exclusivamente el bloque
`v_afectados`/`agentes_afectados` dentro del `new_data` que la función **ya insertaba**. Cero tabla
de ledger nueva, tal como exige el mandato — el rastro vive dentro del mismo evento de auditoría que
ya se escribía.

### 2.3 `seguros_anular_entrega_admin` — enriquecimiento del `new_data` de `ENTREGA_ANULADA`

```sql
PERFORM public.transferencias_lock_agentes(v_target.agente_id, v_target.cobrado_por);
SELECT array_agg(DISTINCT x ORDER BY x) INTO v_agentes
  FROM unnest(ARRAY[v_target.agente_id, v_target.cobrado_por]) AS x WHERE x IS NOT NULL;
-- ... por cada agente afectado (1 o 2, según si hubo entrega directa a otro agente):
v_afectados := v_afectados || jsonb_build_object(
  'agente_id', v_agentes[i], 'saldo_antes', v_saldos_antes[i],
  'saldo_despues', v_saldos_despues[i],
  'genero_deficit', (v_saldos_despues[i] < 0),
  'deuda_despues', greatest(0, -v_saldos_despues[i])
);
-- new_data := jsonb_build_object('anulado',true,'motivo',p_motivo,'agentes_afectados',v_afectados)
```

Misma observación: el candado sobre `(agente_id, cobrado_por)` ya existía (diseño de 4C-IMPL, es la
única de las 3 funciones que puede mover el saldo de **dos** agentes en una sola operación —
`agentes_afectados` puede traer 1 o 2 elementos, según corresponda). Lo nuevo es solo el
enriquecimiento del jsonb.

### 2.4 `seguros_registrar_entrega_admin_manual` — NO tocada por 4C-DEUDA

Ya llevaba `PERFORM public.transferencias_lock_agentes(...)` desde 4C-IMPL/4C-rev (mandato punto 4
del `1326`, que exige el candado en las 4 funciones que mutan saldo: los 3 mutadores existentes +
`transferencias_aceptar`). 4C-DEUDA no le agregó ninguna lógica de deuda porque una entrega manual
**suma** saldo, nunca lo resta — no puede por sí sola generar un déficit.

### Diferencias vs el diseño de `1410`/`1326`

**Ninguna.** Los 3 diffs verificados con `pg_get_functiondef` esta sesión coinciden exactamente con
el pseudocódigo ilustrativo de `1410` §7(a)/§7(b) y con la regla 1 de `1410` §2. No se aplicó el
boceto §7(c) (columna `es_regularizacion_deuda` en `entregas_admin`) — está fuera de alcance a
propósito (ver punto 10).

## 3. ACL/RLS finales

Verificado fresco contra producción, ahora mismo (no de memoria de rondas anteriores):

**Tabla `transferencias_agentes`:**

| Objeto | Definición real |
|---|---|
| Constraint `transferencias_agentes_pkey` | `PRIMARY KEY (id)` |
| Constraint `transferencias_estado_valido` | `CHECK (estado = ANY (ARRAY['pendiente','aceptada','rechazada']))` |
| Constraint `transferencias_monto_positivo` | `CHECK (monto > 0)` |
| Constraint `transferencias_origen_distinto_destino` | `CHECK (desde_agente <> hacia_agente)` |
| Índice `transferencias_agentes_pkey` | `UNIQUE btree (id)` |
| Índice `transferencias_idempotency_key_uq` | `UNIQUE btree (idempotency_key) WHERE (idempotency_key IS NOT NULL)` |
| Grant `anon` | `REFERENCES, SELECT, TRIGGER` — **sin** INSERT/UPDATE/DELETE/TRUNCATE |
| Grant `authenticated` | `REFERENCES, SELECT, TRIGGER` — **sin** INSERT/UPDATE/DELETE/TRUNCATE |
| Policy `org_transferencias_agentes` | `PERMISSIVE`, roles `{authenticated}`, `cmd=ALL`, `qual`/`with_check`: `(mi_rol() IS NOT NULL) AND (mi_organizacion() = (SELECT id FROM organizaciones WHERE slug='nexus-pro'))` |

Confirma la defensa en profundidad ya establecida en este proyecto: el GRANT de tabla es el candado
real contra escritura directa (nadie autenticado ni anónimo puede `INSERT`/`UPDATE`/`DELETE`/
`TRUNCATE` sobre la tabla vía REST); la policy RLS gobierna únicamente el `SELECT` que sí queda
permitido (acotado a la organización de seguros); toda mutación real pasa **solo** por las 3 RPC
`SECURITY DEFINER`, que internamente saltan tabla-GRANT y RLS.

**EXECUTE de las 5 funciones:**

| Función | `anon` | `authenticated` | `postgres`/`service_role` |
|---|---|---|---|
| `transferencias_crear` | ❌ | ✅ | ✅ |
| `transferencias_aceptar` | ❌ | ✅ | ✅ |
| `transferencias_rechazar` | ❌ | ✅ | ✅ |
| `transferencias_lock_agentes` | ❌ | ❌ | ✅ (solo owner/callable desde dentro de otra `SECURITY DEFINER`) |
| `transferencias_saldo_disponible_agente` | ❌ | ❌ | ✅ (solo owner/callable desde dentro de otra `SECURITY DEFINER`) |

Las 2 funciones internas quedan **inalcanzables por REST** para cualquier rol de sesión — exactamente
lo que pedía el punto 2 de `2026-08-16-0950` ("helper interno sin EXECUTE directo").

**`get_advisors(security)` fresco (44 hallazgos totales del proyecto):** exactamente **3** mencionan
`transferencias`, los 3 `authenticated_security_definer_function_executable` WARN, uno por cada RPC
pública — el hallazgo esperado y ya aceptado en cada bloque de este proyecto (una función
`SECURITY DEFINER` alcanzable por `authenticated` vía `/rpc/...` es el patrón de diseño, no un
descuido). `transferencias_lock_agentes`/`transferencias_saldo_disponible_agente` **no aparecen** en
ningún hallazgo — consistente con que no tienen EXECUTE para `authenticated`/`anon`.

## 4. Frontend migrado

`parches.js` (`main`, commit `2903a68`, fusionado en `cc0b651`), 3 zonas no solapadas:

1. **Líneas ~744-1284** (IIFE `__NEXUS_AGENTES_COBROS_V2__`) — el flujo de CREAR transferencia migró
   de escritura directa a `pos_transferencias`... a `rpc/transferencias_crear`. La clave de
   idempotencia solo rota tras un éxito confirmado (nunca antes de saber si el servidor aceptó).
2. **Líneas ~4635-5747** (IIFE `__NEXUS_SOLICITUDES_V1__`) — `nxAceptarTransferencia` migrada a
   `rpc/transferencias_aceptar`; `nxRechazarTransferencia`/`nxRechazarTransferenciaGuardar`
   reescritas de un `prompt()` nativo a un modal real (`#nxTransRech`/`#nxTransRechMotivo`) que
   postea a `rpc/transferencias_rechazar` — un motivo en blanco/solo-espacios se manda como `null`,
   no como cadena vacía. Los 3 call-sites ahora muestran el mensaje de error REAL del servidor
   (saldo insuficiente, transferencia ya procesada, deuda pendiente, etc.) en el toast, en vez de un
   texto genérico.
3. **Líneas ~1294-3271** ("DETALLES DE COBRO DASHBOARD V2 PREMIUM") —
   `calcularPorAgente()` devuelve ahora, además de `enMano`/`enManoAcumulado` (sin tocar, crudos, con
   signo real), los campos derivados `enManoDisplay=Math.max(0,enMano)`,
   `enManoAcumuladoDisplay=Math.max(0,enManoAcumulado)`, `deuda=Math.max(0,-enMano)`,
   `deudaAcumulada=Math.max(0,-enManoAcumulado)`. `renderTablaAgentes()` pinta el chip
   `.nxDC-deuda-pill` ("DEBE RD$X", rojo) por fila cuando `deudaAcumulada>0`, y el filtro de qué
   agentes aparecen en la tabla sigue leyendo el signo **crudo** (nunca el `Display`), así que un
   agente con deuda jamás desaparece de la lista. `renderDetallesCobro()` (el total general) suma
   los valores **ya recortados** (`*Display`) de cada agente — nunca netea el signo crudo de uno
   contra el de otro — y muestra el chip de deuda también en el pie de totales, por separado, nunca
   restado en silencio.

Verificado esta sesión, contra extracción fresca del archivo tal como está en `main` (byte a byte
idéntica a la extracción original que se probó — cero drift entre lo probado y lo publicado):

- `node --check parches.js` — limpio.
- `index.html`, los 4 bloques `<script>` compilan con `new Function()`.
- **21/21** pruebas Playwright de la migración de RPC (creación, aceptación, rechazo con motivo/sin
  motivo, mensajes de error reales, no-regresión del resto del flujo de transferencias).
- **18/18** pruebas Playwright del clamp/indicador de deuda (agente sano vs. deudor, "Dinero en
  Mano" nunca negativo por fila ni en el total, el chip aparece/desaparece correctamente, el total
  general nunca cuenta 3,000 neto en vez de 8,000 real + "DEBE 5,000" aparte, un agente con deuda
  pero sin actividad en el ciclo sigue apareciendo en la tabla).

## 5. Evidencia de las pruebas, incluidas las 3 de concurrencia real

### 5.1 Batería forced-rollback de los 8 casos obligatorios (task #356)

Corrida contra las funciones **ya desplegadas en producción real**, cada caso envuelto en su propia
transacción `BEGIN...ROLLBACK` (nunca deja residuo): Caso 1 (secuencia completa 2,000→12,000→0→
−10,000), Caso 2 (recuperación pasiva por cobro), Caso 3 (recuperación por transferencia entrante),
Caso 4 (deuda se cancela y vuelve a positivo), Caso 5 (bloqueo de transferencia saliente en deuda —
verificado en el punto de `CREATE`, que es donde `transferencias_crear` lo aplica), Caso 6 (reversa
de control que no cruza a negativo, cero cambio de comportamiento), Caso 7 (entrega directa que
afecta a 2 agentes), Caso 8 (filtrado admin-vs-agente, ya cubierto por el filtro
`porAgente.filter(a=>String(a.id)===miId)` existente en `parches.js`, confirmado sin necesitar
código de permisos nuevo). Los 8 casos pasaron contra el código real desplegado.

### 5.2 Las 3 pruebas reales de 2 conexiones simultáneas

El mandato exige explícitamente 3 escenarios de concurrencia real (no simulada): transferencia↔
transferencia, transferencia↔reversa de cobro, transferencia↔anulación de entrega. Los 3 se
probaron con conexiones `dblink` genuinamente distintas (PIDs de Postgres reales y separados),
usando `pg_locks` como evidencia independiente de contención — no una suposición de timing — sobre
el **mismo diseño de candados** que hoy está desplegado sin cambios (`transferencias_lock_agentes`
sobre `desde_agente`/`agente_cobro`/`(agente_id, cobrado_por)`, exactamente como se confirma en el
punto 2 de este documento con `pg_get_functiondef` fresco). Resultado, verbatim de
`2026-08-16-0950-claude-bloque4c-cierre-correcciones.md` (tasks #340-342):

| Test | Funciones contendiendo | Candado(s) | Evidencia (`pg_locks`) | Lectura post-commit | Resultado |
|---|---|---|---|---|---|
| A | `transferencias_aceptar` ↔ `transferencias_aceptar` | `desde_agente` | 2 PIDs, misma llave, `granted=true`/`false` cruzado | Rechazo real por saldo insuficiente, leyendo el saldo YA actualizado tras el commit de A | **PASA** |
| B | `seguros_reversar_cobro` ↔ `transferencias_aceptar` | `agente_cobro`=`desde_agente` | Mismo patrón de contención confirmado | Rechazo real, leyendo el saldo ya descontado por la reversa | **PASA** |
| C | `seguros_anular_entrega_admin` ↔ `transferencias_aceptar` | `agente_id`+`cobrado_por` (2 candados) | 2 filas de lock por el PID de A | Rechazo real, leyendo el saldo ya corregido por la anulación — cierra la clase de bug que había producido −RD$8,000 reales (documento `0232`) | **PASA** |

Task #357 repitió específicamente el Test A (`accept↔accept`) en una rama desechable nueva de
Supabase, vía `dblink`, contra las funciones **ya desplegadas a producción** por 4C-IMPL/4C-DEUDA
(no contra la rama de prueba original de `0950`), para cerrar el ciclo de "lo que se probó en la
rama es exactamente lo que quedó en vivo" — confirmando otra vez que dos aceptaciones simultáneas
nunca pueden quedar ambas en `estado='aceptada'`. La rama se eliminó al terminar (confirmado en el
punto 1: `list_branches` solo devuelve `main`). Los Tests B y C no se repitieron sobre producción
porque, como confirma el punto 2 de este documento con el cuerpo real de las funciones, 4C-DEUDA
**no modificó** el mecanismo de candado de `seguros_reversar_cobro`/`seguros_anular_entrega_admin`
(ya estaba desplegado idéntico desde 4C-IMPL) — solo les agregó el enriquecimiento de `new_data`
**después** de que la reversa/anulación ya se aplicó, sin tocar la sección crítica bajo candado.

### 5.3 Verificación independiente de cero residuos (task #361, re-confirmada ahora mismo)

- `abonos` con patrón de prueba sintético (`nota`/`motivo_reversa` con texto de test): **0**.
- `entregas_admin` con patrón de prueba sintético (`nota`): **0**.
- `auditoria` (`COBRO_REVERSADO`/`ENTREGA_ANULADA`) con patrón de prueba sintético
  (`detalle`/`new_data`): **0**.
- `transferencias_agentes`: 25 filas totales, 0 con patrón de nombre/monto sospechoso de prueba.

## 6. Casos de deuda derivada

Fórmula (sin tabla nueva, sin campo nuevo — es una interpretación de la misma
`transferencias_saldo_disponible_agente()` que ya calcula el saldo):

```
saldo_real         = transferencias_saldo_disponible_agente(agente)
dinero_en_mano      = GREATEST(0,  saldo_real)
deuda_agente        = GREATEST(0, -saldo_real)
```

**Caso 1 — el escenario que el propio mandato pide, ya reportado como hallazgo honesto sin corregir
en `2026-08-16-0950` y ahora resuelto explícitamente como deuda legítima:**

| Paso | Operación | Saldo real | Dinero en mano | Deuda |
|---|---|---:|---:|---:|
| 0 | Saldo inicial | 2,000 | 2,000 | 0 |
| 1 | + cobro nuevo de 10,000 | 12,000 | 12,000 | 0 |
| 2 | transfiere el total (sale) | 0 | 0 | 0 |
| 3 | se reversa el cobro de 10,000 | **−10,000** | **0** | **10,000** |

Antes de esta ronda, `0950` reportaba este escenario como un hallazgo honesto **sin corregir**
("Ninguno de los 3 pasos es concurrente ni usa una lectura obsoleta... el problema es que
`seguros_reversar_cobro`... nunca comprueba el saldo disponible del agente"). Con 4C-DEUDA, este NO
es un bug — es el resultado correcto del modelo: el agente transfirió dinero que, tras corregir el
cobro, resultó que nunca le correspondía tener, y esa es una deuda real y legítima de RD$10,000.

**Casos 2-4 — recuperación pasiva, automática, sin ningún paso manual (mismo cálculo, ninguna lógica
de "aplicar contra deuda" que programar — estructuralmente imposible contar la recuperación dos
veces porque no hay un segundo registro que reconciliar):**

- Caso 2: saldo −10,000 + cobro nuevo 4,000 → **−6,000** (deuda 6,000; bajó, sigue en deuda).
- Caso 3: saldo −10,000 + transferencia **entrante** 6,000 → **−4,000** (deuda 4,000; una entrante
  es solo otro término positivo de la misma resta).
- Caso 4: saldo −10,000 + cobro 12,000 → **+2,000** (deuda 0; el agente vuelve a saldo disponible
  positivo automáticamente, sin ninguna operación de "cierre de deuda").

**Caso 5 — bloqueo de transferencia saliente mientras `saldo_real <= 0`:** confirmado con el cuerpo
real desplegado de `transferencias_crear` (punto 2.1 de este documento) — con saldo en `−4,000` (o
en `0`), la RPC rechaza con `'Este agente tiene una deuda de RD$ 4000.00 y no puede transferir hasta
cubrirla.'` (mensaje exacto, con el monto interpolado real vía `round(-v_saldo_origen,2)`).

**Caso 6 — control, confirma que el caso normal no cambió:** saldo 20,000, se reversa un cobro de
10,000 → `10,000`. Sigue positivo, deuda 0, cero cambio de comportamiento respecto a antes de esta
ronda.

**Caso 7 — entrega directa que afecta a 2 agentes, ejercitado por la propia función real (2.3):**
cuando `es_directo=true` (`cobrado_por`≠`agente_id`), `array_agg(DISTINCT unnest(ARRAY[agente_id,
cobrado_por]))` produce hasta 2 elementos, y el bloque `agentes_afectados` se llena con uno por cada
agente cuyo saldo cambió — el que queda con deuda tras una anulación es quien custodiaba el efectivo
después del depósito directo (`agente_id`), no necesariamente quien originalmente cobró
(`cobrado_por`). No hace falta ninguna regla especial: es el mismo mecanismo aplicado al agente que
corresponda según el signo real del cálculo para cada uno.

**Caso 8 — admin ve todos, agente ve solo el suyo:** confirmado en el punto 4 de este documento —
`renderTablaAgentes`/el filtro `porAgente.filter(a=>String(a.id)===miId)` ya existente en
`parches.js` no se tocó; hereda el mismo comportamiento sin ningún código de permisos nuevo.

**Estado real de producción, verificado ahora mismo (punto 1):** ambos agentes reales tienen
`saldo_real = dinero_en_mano` (positivo) y `deuda = 0` — **ESTERLIN**: saldo real RD$1,162,510,
deuda RD$0; **ROBINSON**: saldo real RD$136,690, deuda RD$0. Ninguno de los 2 agentes tiene deuda
viva hoy — los casos de arriba están verificados con datos sintéticos bajo `BEGIN...ROLLBACK` (task
#356) y con la aritmética del diseño (`1410`), no observados en un agente real con deuda en este
momento, porque no existe ninguno.

## 7. Hashes/contadores antes/después y cero residuos

4C-DEUDA no creó ninguna tabla ni columna — su "antes/después" es el `prosrc` de 3 funciones (punto
2) y el `parches.js` publicado (punto 4). No hay una migración de datos que comparar fila por fila.

- **`transferencias_agentes` antes de esta ronda de pruebas (línea base heredada de 4C-IMPL, sin
  cambios por 4C-DEUDA):** 25 filas, mismo desglose 24/1/0.
- **`transferencias_agentes` ahora, tras toda la batería de esta ronda:** 25 filas, mismo desglose
  24/1/0 — **cero filas nuevas** (las pruebas de los puntos 5.1/5.2 corrieron bajo `BEGIN...ROLLBACK`
  o en una rama desechable ya eliminada, nunca contra `main` sin revertir).
- **Residuos sintéticos, confirmados en 0 en las 4 tablas relevantes** (punto 5.3): `abonos`,
  `entregas_admin`, `auditoria`, `transferencias_agentes`.
- **`seguros_diagnostico_financiero()` antes y después de toda la ronda:** `ok:true` en ambos
  momentos, con los mismos 5 contadores duros en 0 (punto 1) — ningún cambio, ni positivo ni
  negativo, en la integridad financiera de fondo por causa de este bloque.
- **Ramas de Supabase:** 0 activas fuera de `main`, confirmado con `list_branches` al cierre.

## 8. Versión/commit/PR de publicación

| Campo | Valor |
|---|---|
| Rama | `claude/4c-deuda-frontend-clamp` |
| Commit base | `1416f585445f1c8dc5dec054287e6745a23e307b` (el propio mandato `1326`) |
| Commit de la rama | `2903a684e27c484bb5f75f4d44e25a708440b5b7` — "4C-DEUDA: candado de saldo en RPC de transferencias + Dinero en Mano nunca negativo" |
| PR | [#278](https://github.com/sterlinr08-dte/nexus-pro/pull/278), `+149 / −29`, 3 archivos (`index.html`, `parches.js`, `version.json`) |
| Merge | `cc0b6513a6406c195730b99773cfc39afb5880bd`, fusionado `2026-08-16T20:39:27Z` |
| `APP_VERSION` | `56.34` → `56.35` |
| `main` local/remoto | sincronizados en `cc0b651` (confirmado con `git log --oneline origin/main -5`, sin drift) |

Entrada de `version.json` publicada (texto real, en español llano):

> NUEVO: cuando un agente reversa un cobro DESPUÉS de haber entregado o transferido ese dinero, su
> "Dinero en Mano" (Detalles de cobro) ya no puede quedar en números negativos — el sistema conserva
> un mínimo de RD$0 y en su lugar muestra un aviso rojo "DEBE RD$ X" junto a su nombre (y también en
> el total general), para dejar claro que el agente tiene una deuda pendiente con el negocio, no que
> el dinero desapareció de la nada. De paso, transferir dinero entre agentes y aceptar o rechazar una
> transferencia ahora pasan por el mismo candado de seguridad del servidor que ya protegía los
> cobros: si al agente de origen no le alcanza el saldo, o la transferencia ya se había procesado
> antes, el sistema avisa con el motivo real en vez de dejarlo pasar en silencio. Además, al rechazar
> una transferencia ahora se puede escribir el motivo (opcional), y ese motivo queda guardado para
> consultarlo después.

## 9. Rollback exacto

Reversible en 2 capas independientes, sin dependencia entre sí (se puede revertir solo el frontend,
solo el backend, o ambos):

**Frontend (`main`):**
```
git revert cc0b651
```
o, equivalente, `git revert -m 1 cc0b651` si se prefiere no crear un merge commit de reversa —
restaura las 3 zonas del punto 4 a su estado previo (escritura directa a `transferencias_agentes`
sin RPC, `prompt()` nativo para rechazar, `Dinero en Mano` mostrando el signo crudo sin recortar,
sin chip de deuda). No afecta ninguna fila de datos existente.

**Backend (SQL):**
1. `transferencias_crear` — quitar el bloque `IF v_saldo_origen <= 0 THEN RAISE EXCEPTION...` (punto
   2.1), dejando la función idéntica a como quedó tras 4C-IMPL.
2. `seguros_reversar_cobro`/`seguros_anular_entrega_admin` — quitar el bloque `v_afectados`/
   `agentes_afectados` (puntos 2.2/2.3), dejando el `new_data` de auditoría sin ese campo extra. El
   candado (`transferencias_lock_agentes`) **NO se revierte** — es de 4C-IMPL, no de 4C-DEUDA;
   quitarlo reabriría la vulnerabilidad real de −RD$8,000 ya documentada y cerrada en `0232`/`0950`.
3. Ninguna migración de esquema que revertir — 4C-DEUDA no creó tablas/columnas/índices/constraints
   nuevos. `motivo_rechazo`, la clave de idempotencia y el CHECK de estado son de 4C-IMPL, anteriores
   a este bloque, y no forman parte de este rollback.
4. Verificar tras revertir: `seguros_diagnostico_financiero()` sigue `ok:true`; `get_advisors
   (security)` sigue mostrando solo los 3 WARN esperados de las RPC públicas.

**Riesgo de revertir:** ninguno sobre datos existentes (ambas capas son puramente de código/función,
sin migración de datos que deshacer). El único efecto práctico de revertir el backend es que
`transferencias_crear` volvería a permitir crear una transferencia saliente con saldo ≤0 (el
`transferencias_aceptar` seguiría rechazándola al aceptar, por la validación de monto-vs-saldo ya
existente desde antes de 4C-DEUDA — solo se perdería el rechazo temprano y el mensaje claro en el
momento de crear).

## 10. Deuda técnica restante (explícitamente NO implementada en esta ronda)

Ambas piezas están documentadas en detalle en `1410` §3/§5 como brechas abiertas — se listan aquí,
sin diseñarlas más ni implementarlas, tal como exige el mandato:

1. **"Abono a deuda del agente" (recuperación activa/regularización administrativa).** Cubre el caso
   real que el modelo pasivo NO resuelve: un agente repone la deuda de su propio bolsillo, sin que
   medie ningún cobro de cliente. `entregas_admin` no sirve tal cual para esto — su semántica asume
   siempre que el efectivo viene de un cobro previo, y reusarla para una reposición personal
   inflaría artificialmente los reportes de "cobranza real del período". El boceto NO diseñado en
   detalle (`1410` §7c): una columna aditiva `es_regularizacion_deuda boolean default false` en
   `entregas_admin`, para que los reportes de cobranza puedan excluir estas filas mientras la
   fórmula de saldo las sigue contando igual. Requiere autorización separada antes de diseñarse a
   fondo (validaciones, quién puede registrarla, si necesita su propio asiento).
2. **Reconocimiento contable formal de "lo que debe un agente a la empresa".** Hoy el saldo/deuda del
   agente es puramente operativo/custodio — nunca tuvo respaldo contable, ni en el caso positivo
   (`entregas_admin` no postea ningún asiento, confirmado contra los valores reales de `tipo_origen`
   en `asientos`: `cobro`/`egreso`/`factura_manual`/`reversa_cobro`/`reversa_factura`/`null`, ninguno
   relacionado a entregas o transferencias entre agentes). Introducir un asiento nuevo solo para el
   caso negativo, sin que exista para el positivo, sería inventar contabilidad donde antes no la
   había — exactamente lo que el mandato pide no hacer. Es una decisión de negocio nueva y separada
   (¿el dueño quiere una cuenta formal tipo "Cuentas por cobrar a agentes"?), que tocaría además el
   plan de cuentas (hoy sin catálogo formal, los códigos están escritos a mano dentro de las
   funciones SQL) — no se toma esa decisión aquí.

**Con este documento cierra el bloque 4C-DEUDA completo** (tasks #350-363). El diseño de deuda
derivada (Opción B) está en producción, verificado con la batería de 8 casos + las 3 pruebas reales
de concurrencia + 39 pruebas de frontend, sin residuos, sin drift entre lo probado y lo desplegado,
y sin ninguna tabla de ledger nueva — tal como pedía el mandato original.
