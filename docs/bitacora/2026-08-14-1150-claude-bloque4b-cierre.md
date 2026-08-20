# Claude — Bloque 4B CERRADO — `egresos ↔ asientos` vía RPC atómica (4B-1 backend + 4B-2 frontend)

Fecha: 2026-08-14 (RD)

## Contexto

`2026-08-13-2335-chatgpt-bloque4b-implementacion.md` autorizó implementar la Revisión 2
(`2026-08-14-0100-propuesta-4b-revision2-NO-APLICAR.sql`) en dos fases secuenciales — 4B-1
(backend) y 4B-2 (frontend) — con el mandato explícito de esperar revisión cruzada de ChatGPT
antes de abrir 4D o 4C. Esta entrada cierra las dos fases y responde punto por punto al
checklist de entrega del mandato.

## Fase 4B-1 (backend) — migraciones realmente aplicadas

Las 6 migraciones de la Fase 4B-1 se aplicaron en una sesión anterior a esta entrada; se
re-verificaron aquí desde cero (sin asumir nada) antes de tocar el frontend:

1. 12 columnas nuevas en `egresos` (`estado`, `idempotency_key`, `anulacion_idempotency_key`,
   `motivo_anulacion`, `anulado_at`, `anulado_por`, `correccion_idempotency_key`,
   `correccion_de_id`, `correccion_nuevo_egreso_id`, `motivo_correccion`, `corregido_at`,
   `corregido_por`) + CHECK `estado IN ('activo','anulado','corregido')` + 3 índices únicos
   parciales.
2. Backfill legacy conservador y bidireccionalmente inequívoco de los 4 pares reales
   egreso↔asiento — verificado de nuevo por `id`/`estado`/columnas de idempotencia intactas
   (ver "Resultado del backfill" abajo).
3. Trigger anti-DELETE físico `seguros_bloquear_delete_egreso` sobre `egresos`.
4. RPC `seguros_registrar_egreso(p_tipo, p_concepto, p_beneficiario, p_monto, p_fecha,
   p_cuenta_dr_cod, p_cuenta_cr_cod, p_idempotency_key, p_metodo, p_banco, p_nota,
   p_referencia, p_comprobante_url)`.
5. RPC `seguros_anular_egreso(p_egreso_id, p_motivo, p_idempotency_key)`.
6. RPC `seguros_corregir_egreso(p_egreso_id, p_motivo, p_tipo, p_concepto, p_beneficiario,
   p_monto, p_fecha, p_cuenta_dr_cod, p_cuenta_cr_cod, p_idempotency_key, p_metodo, p_banco,
   p_nota, p_referencia, p_comprobante_url)`.

Las 3 RPC re-leídas con `pg_get_functiondef` en esta sesión coinciden byte a byte con el
diseño aprobado: guard `mi_rol()='admin'` primero (antes de cualquier lectura/escritura),
guard `mi_organizacion() = (organizaciones.slug='nexus-pro')` segundo, `pg_advisory_xact_lock`
sobre la idempotency key antes de cualquier `SELECT`/`INSERT`/`UPDATE`, whitelist de 14 cuentas
inline (mismas 14 en las 3 funciones), `SECURITY DEFINER` con `search_path` fijo a
`'public', 'pg_temp'`. Cero drift respecto a lo aprobado.

## Resultado del backfill (re-verificado, no asumido)

Los 4 egresos reales (`19a05e2e-fc5f-4042-900b-2ab26281b081`,
`07690ab3-a958-4a94-b16e-fabfb83d0c54`, `a35cb463-8060-48b6-b235-796dc9a7e83f`,
`79211498-5904-4094-bf0a-11dc97a3d0b7`) siguen `estado='activo'`, con todas las columnas de
idempotencia/anulación/corrección en `null` — el backfill de 4B-1 los dejó formalizados
(`tipo_origen='egreso'`, `origen_id=<egreso.id>`) sin marcarlos como anulados/corregidos, tal
como se diseñó. El asiento histórico huérfano **NO** se tocó (ver más abajo).

## ACL/RPC final (introspección directa)

- `egresos`: `anon` sin ningún grant; `authenticated` con `SELECT` únicamente (INSERT/UPDATE/
  DELETE/TRUNCATE/TRIGGER/REFERENCES revocados).
- Las 3 RPC (`seguros_registrar_egreso`/`seguros_anular_egreso`/`seguros_corregir_egreso`) y el
  trigger `seguros_bloquear_delete_egreso`: `REVOKE EXECUTE ... FROM PUBLIC, anon` explícito,
  `GRANT EXECUTE ... TO authenticated` — el guard de rol dentro de cada función es la barrera
  real (verificada esta sesión con un agente real, ver matriz E2E abajo), el ACL es la primera
  línea de defensa.
- `asientos`: **no se tocó** — sigue exactamente como quedó cerrado en el Bloque 3C (`anon` sin
  acceso, `authenticated` solo `SELECT`).

## Fase 4B-2 (frontend) — commits

Rama `claude/bloque-4b2-egresos-frontend-rpc` → PR
[#273](https://github.com/sterlinr08-dte/nexus-pro/pull/273) → fusionada a `main` en
`2e33465` (merge commit), commit de contenido `4e6d393`.

Cambios en `parches.js` (módulo `__NEXUS_CONTABILIDAD_V1__`, `index.html` no tiene ninguna
referencia a "egreso" — confirmado con grep, el módulo vive exclusivamente ahí):

- `window.nxGuardarEgreso` (crear, `!id`) → `rpc/seguros_registrar_egreso`, con
  `_egCreaIdemKey` regenerada cada vez que se abre el formulario en blanco (mismo patrón que
  `_cobroIdemKey` de `index.html`, Bloque 4A).
- `window.nxGuardarEgreso` (editar, `id`) → `rpc/seguros_corregir_egreso`, con `prompt()`
  obligatorio para el motivo (cancelar o dejar en blanco aborta sin llamar la RPC) e
  `_egCorrIdemKeys[id]` cacheada por-id.
- `window.nxEliminarEgreso` → `rpc/seguros_anular_egreso`, mismo patrón de motivo obligatorio
  + `_egAnulaIdemKeys[id]`.
- Eliminados los 5 escritores directos que quedaban en este flujo: `asientoDeEgreso`,
  `crearAsientoEgreso`, `actualizarAsientoEgreso`, `borrarAsientoEgreso`, `asegurarAsientos`.
  `sincronizarContabilidad()` (nueva, reemplaza a `asegurarAsientos` en `abrirModal()`) es
  estrictamente un refresco de solo lectura de `ST.asientos` — no escribe nada.
- `egresosFiltrados()` ahora devuelve los 3 estados (activo/anulado/corregido) para que la
  lista los muestre todos; `egresosActivos(lista)` (nueva) filtra solo `estado==='activo'` y es
  lo que alimenta `totalSalio()`/el desglose por tipo del modal — un egreso anulado o corregido
  ya no infla los totales del período.
- Lista de egresos: badge ANULADO (con `motivo_anulacion` en el `title`) / CORREGIDO (con
  `motivo_correccion`), monto tachado + fila atenuada, botones de acción ocultos por completo
  cuando `estado !== 'activo'`. El botón "Eliminar" pasó a decir "Anular egreso" — ningún DELETE
  físico se presenta en la UI.
- Manejo de error: los 3 flujos capturan el error real de la RPC (mismo patrón `rpcErr()` que
  `nxRpcErr` de `index.html`, con respaldo local si el global no está disponible) y lo muestran
  con `notify('err', ...)` — ninguna excepción se traga en silencio.

Verificado en esta sesión (post-merge, sobre el `main` actual):

```
$ grep -n "api\.\(post\|patch\|del\)(\s*['\"]egresos\|api\.\(post\|patch\|del\)(\s*['\"]asientos" index.html parches.js
(sin resultados)

$ grep -n "'egresos'\|'asientos'" parches.js
8815:    try { egresos = (await api.get('egresos', 'select=monto,fecha')) || []; } catch (e) {}
9199:      stRef.asientos = await api.get('asientos', 'select=*&order=created_at.desc') || [];
9251:      _egresos = await api.get('egresos', 'select=*&order=fecha.desc,created_at.desc') || [];
(las 3 son lecturas; cero escrituras)

$ grep -n "function asientoDeEgreso\|function crearAsientoEgreso\|function actualizarAsientoEgreso\|function borrarAsientoEgreso\|function asegurarAsientos" parches.js
(sin resultados — los 5 escritores ya no existen)

$ node --check parches.js
(silencioso = OK)
```

`node -e` recorriendo los 4 bloques `<script>` de `index.html` con `new Function()`: los 4
compilan. `version.json` es JSON válido, `version` (56.29) == `APP_VERSION` de `index.html`.

## Matriz backend (Fase 4B-1, ya reportada — re-confirmada sin drift en esta sesión)

`get_advisors(security)`: cero hallazgos nuevos en `egresos`/`asientos`/las 3 RPC/el trigger —
mismo listado de siempre ya aceptado en este engagement. La matriz T0-T22+ completa de 4B-1 ya
cubrió: backfill exacto de 4 pares con huérfano intacto, admin crear/anular/corregir, agente
bloqueado en las 3 RPC, cross-org bloqueado, `anon` sin `EXECUTE`, idempotencia de las 3
operaciones, casos sin asiento vinculado, fallback legacy, monto 0/negativo y tipo inválido
bloqueados, asiento original inmutable, reversas balanceadas, REST directo a `egresos`
bloqueado, `SELECT` autenticado permitido — no se repite aquí punto por punto porque no cambió
nada del backend en esta sesión (confirmado por la re-lectura byte a byte de las 3 RPC arriba).

## Matriz E2E (Fase 4B-2, ejecutada en esta sesión contra las RPC reales en producción)

Metodología: `docs/METODOLOGIA-PRUEBAS-DESTRUCTIVAS.md` — `SET LOCAL ROLE authenticated` +
`set_config('request.jwt.claims', ...)` simulando el `sub` real de cada identidad, dentro de
`BEGIN...ROLLBACK`, llamando las RPC exactamente con el mismo orden/nombre de parámetros que
manda el frontend ya publicado. 3 llamadas separadas (una por bloque lógico) en vez de una sola
transacción monolítica, para acotar el radio de una posible falla de infraestructura (la
primera batería, más grande y en un solo `execute_sql`, había fallado con un `502 Bad Gateway`
transitorio de Cloudflare frente al MCP — no un error de SQL; se reintentó dividida y las 3
pasaron limpio).

Identidades usadas: `sterlin08` (admin, `profiles.id=35319647-f721-40b2-a01d-c3ccb1642649`,
`usuarios_sistema.organizacion_id` = la org `nexus-pro`), `ROBINSON` (agente,
`profiles.id=9758c18f-22eb-4d5b-b99a-2fc4b9791f2c`, misma org).

```
T-E2E-1  OK  registrar_egreso fresco (admin) -> ok=true reintento=false, egreso_id+asiento_id
T-E2E-2  OK  mismo idempotency_key + campos secundarios "basura" (tipo/monto/fecha/cuentas
             distintos) -> ok=true reintento=true, MISMO egreso_id, el original NO se tocó
             (verificado leyendo egresos.concepto de vuelta) — 1 sola fila con esa key
T-E2E-3  OK  corregir_egreso sobre el egreso de T-E2E-1 -> ok=true reintento=false;
             egreso_original_id coincide, egreso_nuevo_id/asiento_original_id/
             asiento_reversa_id/asiento_nuevo_id presentes
T-E2E-4  OK  mismo idempotency_key + motivo/datos basura -> ok=true reintento=true, MISMOS
             egreso_original_id/egreso_nuevo_id que T-E2E-3 — 1 sola fila con esa key
             invariantes: egreso original -> estado='corregido'; egreso nuevo -> 'activo';
             asiento de reversa.origen_id = egreso ORIGINAL; asiento nuevo.origen_id = egreso
             NUEVO (los 4 leídos de vuelta de la tabla, no solo del jsonb de retorno)
T-E2E-5  OK  anular_egreso sobre un egreso fresco distinto (admin) -> ok=true reintento=false;
             egreso_id coincide, asiento_original_id/asiento_reversa_id presentes,
             sin_asiento_vinculado=false
T-E2E-6  OK  mismo idempotency_key + motivo distinto -> ok=true reintento=true, MISMO egreso_id
             invariantes: estado='anulado'; motivo_anulacion = el ORIGINAL (el del reintento no
             lo pisó); asiento_reversa.origen_id = el egreso correcto; 1 solo asiento
             'egreso_reversa' vinculado a ese egreso (el reintento no creó un segundo)
T-E2E-7  OK  seguros_registrar_egreso como ROBINSON (agente) -> RAISE EXCEPTION 'No
             autorizado...' (capturado y verificado el texto exacto)
T-E2E-8  OK  seguros_anular_egreso como ROBINSON, con un egreso_id inventado -> mismo rechazo
             (la guarda de rol corre ANTES de cualquier lookup del egreso, confirmado por
             lectura de la función — por eso el id inventado no importa)
T-E2E-9  OK  seguros_corregir_egreso como ROBINSON, con un egreso_id inventado -> mismo rechazo
             control: mi_rol() bajo la sesión simulada de Robinson = 'agente' (confirmado antes
             de correr T-E2E-7/8/9, para no dar por buena la simulación de sesión sin probarla)
             cero filas nuevas en egresos/asientos tras los 3 intentos rechazados (contado antes
             y después del bloque, con RESET ROLE de por medio)
```

Las 9 pruebas pasaron en 3 llamadas separadas, cada una con su propio `BEGIN...ROLLBACK` —
ninguna dejó nada persistido (confirmado de forma independiente abajo, no solo asumido por el
`ROLLBACK`).

## Diagnóstico financiero (antes y después de la matriz E2E, sin recrear la función)

```json
{"ok":true,"ast_baja":0,"deuda_descuadra":0,"abonos_huerfanos":1,"pagado_descuadra":0,
 "cobros_sin_agente":2,"facturas_huerfanas":3,"asientos_no_positivos":0,
 "cobros_sin_referencia":8,"asientos_desbalanceados":0,"cobros_transfer_sin_banco":10}
```

Idéntico antes y después de correr las 9 pruebas E2E — mismo `ok:true`, mismos 9 contadores de
anomalías preexistentes (ninguno relacionado con `egresos`/`asientos`, ya documentados en
bitácoras anteriores). `seguros_diagnostico_financiero()` no se tocó ni se recreó.

## Verificación independiente de cero residuos (consulta de solo lectura, aparte de la matriz)

```json
{
  "total_egresos": 4,
  "egresos_estado_invalido": 0,
  "egresos_e2e_residuales": 0,
  "pares_reales_intactos": 4,
  "total_asientos_egr": 5,
  "asientos_formales": 4,
  "asientos_reversa": 0,
  "asientos_e2e_residuales": 0,
  "auditoria_egresos_total": 0,
  "auditoria_e2e_residual": 0
}
```

`total_egresos=4` (exactamente los mismos 4 reales, ni uno más), `asientos_reversa=0` confirma
que ninguna de las 3 llamadas a `seguros_anular_egreso`/`seguros_corregir_egreso` de la matriz
E2E llegó a persistir (los `ROLLBACK` funcionaron de verdad, no solo en teoría);
`auditoria_egresos_total=0` confirma que tampoco quedó ningún registro de auditoría de las
pruebas (los `INSERT INTO auditoria` de las 3 RPC corren dentro de la misma transacción que se
revirtió).

**Nota de método, corregida en el momento:** el primer intento de esta verificación buscó el
asiento huérfano histórico por su columna `id` en vez de por `referencia` — como
`165f23e8-d3e9-44d2-82a3-1477943cf777` es en realidad el `id` del **egreso** ausente (la
`referencia` del asiento es el string `'EGR-165f23e8-...'`, no su propio `id`), la primera
consulta dio `NULL` (0 filas) en vez de `true`/`false`, lo que habría sido un falso positivo de
alarma si no se hubiera investigado antes de reportarlo. Corregido buscando por
`referencia = 'EGR-165f23e8-d3e9-44d2-82a3-1477943cf777'` — resultado abajo.

## Confirmación explícita: el huérfano histórico quedó intacto

```json
{
  "id": "34acc345-b379-41d9-ad79-2d4deda6fe33",
  "tipo_origen": null,
  "origen_id": null,
  "referencia": "EGR-165f23e8-d3e9-44d2-82a3-1477943cf777",
  "descripcion": "Egreso Aseguradora (ARS): PAGO PLANES VOLUNTARIO DE HUMANO — HUMANO",
  "monto_dr": "60025", "monto_cr": "60025",
  "created_at": "2026-06-05 00:47:22.287583+00"
}
```

Exactamente como quedó tras 4B-1 y antes de esta sesión: `tipo_origen=null`, `origen_id=null`,
sin ningún egreso real con `id=165f23e8-...` en `public.egresos` (nunca existió como fila, es
un dato preexistente a toda esta migración). No se tocó en ningún momento — ni en 4B-1 ni en
4B-2 ni en esta verificación de cierre.

## Regla dura respetada

No se tocó 4A, 4C ni 4D. No se limpió el huérfano histórico. No se modificó
`seguros_diagnostico_financiero()`. No se reabrió el ACL de `asientos` (sigue exactamente como
lo dejó el Bloque 3C). Sin cambios visuales fuera de lo mínimo necesario para mostrar
estado/motivo/errores (badges + atenuado + botones ocultos en filas no-activas).

## Nota honesta sobre el alcance de "recarga/historial muestra estados correctos"

No se re-renderizó el modal en un navegador real dentro de esta sesión — la verificación de
este punto es por construcción de código + SQL, no por captura de pantalla: (1) se confirmó por
SQL que `egresos.estado` toma exactamente los 3 valores `activo`/`anulado`/`corregido` sobre
los que el `template` de la lista (`renderModal`) ya branchea; (2) se confirmó por `grep` que
las 3 funciones de escritura (`nxGuardarEgreso`/`nxEliminarEgreso`) recargan `ST.egresos` vía
`cargarEgresos()` y vuelven a llamar `renderModal(mp)` tras cada llamada exitosa a una RPC, así
que el estado mostrado siempre viene de una relectura fresca del servidor, nunca de un valor
optimista en memoria. Si se quiere una verificación visual real (captura de pantalla/Playwright
contra el DOM), queda pendiente como un paso aparte, no incluido en este cierre.

## Cierre

**Bloque 4B queda cerrado — backend (4B-1) y frontend (4B-2) en producción, verificados de
punta a punta.** El flujo de Egresos ya no escribe directo en `egresos`/`asientos` desde el
navegador: las 3 operaciones (registrar/corregir/anular) pasan siempre por RPC atómicas con
guard de rol+organización, idempotencia real, y sin ningún DELETE físico presentado en la UI.
Cero residuos sintéticos, diagnóstico financiero sin cambios, huérfano histórico intacto.

Quedando a la espera de la **revisión cruzada de ChatGPT** antes de abrir 4D
(`entregas_admin`/`cuadre_tss_historial`/`pagos`) o retomar 4C
(`transferencias_agentes`) — ninguno de los dos se inicia unilateralmente desde aquí.
