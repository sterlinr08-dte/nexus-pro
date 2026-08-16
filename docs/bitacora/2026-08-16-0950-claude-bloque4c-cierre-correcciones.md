# Claude — Bloque 4C: las 3 correcciones que pidió el dueño, CERRADAS

Fecha: 2026-08-16 (RD)

## Mandato, textual

> "4C todavía no está autorizado para producción, pero ya estamos muy cerca. Antes quiero una
> última corrección del diseño que haga tres cosas: 1. corregir `calcularPorAgente()` y
> `calcularKPIs()` para excluir abonos Reversado, de modo que pantalla y backend tengan la misma
> verdad financiera; 2. convertir `transferencias_lock_agentes()` en helper interno sin EXECUTE
> directo para usuarios normales y definir ACL mínimo de la función de saldo; 3. mantener como
> requisito de cierre la prueba real con dos conexiones simultáneas: transferencia↔transferencia,
> transferencia↔reversa de cobro y transferencia↔anulación de entrega. Después de eso, sí veo
> viable autorizar la implementación completa de 4C."

Los 3 puntos están cerrados. **Nada del diseño SQL completo de Bloque 4C (las funciones
`transferencias_*` nuevas, los candados insertados en las 3 funciones existentes, el ACL lockdown
de `transferencias_agentes`) se aplicó a producción** — todo lo de este documento, salvo el punto
1, se hizo y se probó en una rama desechable de Supabase, ya eliminada. El punto 1 SÍ es un cambio
real de frontend, ya publicado y en vivo (v56.34).

---

## Punto 1 — `calcularKPIs()`/`calcularPorAgente()` ya no cuentan un abono Reversado como dinero real

**Causa raíz:** `index.html` ya excluía `estado==='Reversado'` al sumar `totalCobrado` desde hace
tiempo, pero las 2 funciones equivalentes de `parches.js` (POS → Cobros → Detalles de cobro) nunca
tuvieron ese filtro. Un abono reversado (dinero ya devuelto al cliente) seguía sumando en el total
cobrado del período y en el acumulado de cada agente — pantalla y backend contaban una verdad
financiera distinta. Confirmado en producción: Robinson mostraba **RD$6,500 de más** en su
acumulado por exactamente este motivo.

**Corrección aplicada** (diff real, `parches.js`):

```diff
 function calcularKPIs(abonos, periodo) {
-  const enPeriodo = abonos.filter(a => enRango(a.fecha, periodo.inicio, periodo.fin));
+  // Un abono Reversado ya no es dinero real (mismo criterio que index.html:
+  // totalCobrado=abonos.filter(a=>a.estado!=='Reversado')...) — sin esto, "Cobrado" y los
+  // KPIs de esta pantalla siguen contando dinero que ya se le devolvió al cliente.
+  const abonosValidos = abonos.filter(a => a.estado !== 'Reversado');
+  const enPeriodo = abonosValidos.filter(a => enRango(a.fecha, periodo.inicio, periodo.fin));
   const total = enPeriodo.reduce((s, a) => s + Number(a.monto || 0), 0);
   ...

 function calcularPorAgente(abonosPeriodo, transferenciasPeriodo, abonosAll, transferenciasAll, periodoFin, entregasAll) {
   const agentes = Array.isArray(st().agentes) ? st().agentes : [];
+  // Mismo criterio que calcularKPIs(): un abono Reversado no es dinero real en manos de nadie.
+  abonosPeriodo = (abonosPeriodo || []).filter(a => a.estado !== 'Reversado');
+  abonosAll = (abonosAll || []).filter(a => a.estado !== 'Reversado');
   ...
```

**Estado:** commit `fb298ff`, PR [#277](https://github.com/sterlinr08-dte/nexus-pro/pull/277),
fusionado a `main` en `880f48a`, `APP_VERSION` 56.33→56.34. Verificado antes de publicar: `node
--check parches.js` limpio, los 4 bloques `<script>` de `index.html` compilan con `new Function()`,
`version.json` es JSON válido. Sin ambigüedad de alcance — es un cambio de lectura/agregación pura,
no toca ninguna tabla ni ninguna RPC.

---

## Punto 2 — `transferencias_lock_agentes()` sin EXECUTE directo + ACL mínimo de la función de saldo

Diseño ya escrito y acordado en `2026-08-15-1500-claude-bloque4c-transferencias-agentes.md` /
`2026-08-16-0232-claude-bloque4c-revision-concurrencia.md`; en esta ronda se aplicó **sobre la rama
desechable** (no producción) para poder ejercitarlo de verdad en las pruebas del punto 3, y se
verificó el ACL con `has_function_privilege`.

- **`transferencias_lock_agentes(VARIADIC p_agentes uuid[])`** — ordena y deduplica los ids
  recibidos (ascendente, para que dos llamadas con los mismos 2 agentes en cualquier orden siempre
  adquieran los candados en la misma secuencia — evita deadlock cruzado) y hace
  `pg_advisory_xact_lock(hashtext('transferencias_saldo:' || v_id))` por cada uno, dentro de la
  transacción del llamador. `REVOKE ALL FROM public, anon, authenticated` — nadie puede llamarla
  directo por PostgREST/RPC; solo es alcanzable desde DENTRO de otra función `SECURITY DEFINER` del
  mismo dueño (`postgres`), que sí puede invocarla por privilegio implícito de mismo owner.
- **`transferencias_saldo_disponible_agente(p_agente_id uuid)`** — `STABLE SECURITY DEFINER`,
  mismo `REVOKE ALL FROM public, anon, authenticated`. Nadie fuera de las funciones que la
  necesitan puede consultar el saldo disponible de un agente directamente vía RPC.
- **Verificado con `has_function_privilege`** sobre la rama de prueba: `anon`/`authenticated`
  dan `false` para EXECUTE en las dos; solo el rol dueño de las funciones (y por extensión,
  cualquier función `SECURITY DEFINER` que las llame internamente) puede ejecutarlas. Esto es
  exactamente lo que pidió el punto 2 — "helper interno sin EXECUTE directo para usuarios
  normales" y "ACL mínimo de la función de saldo".

Los candados quedan insertados (en el diseño, sin aplicar a producción) en 3 puntos reales:
`transferencias_aceptar` (sobre `desde_agente`), `seguros_reversar_cobro` (sobre
`NULLIF(agente_cobro,'')::uuid`) y `seguros_anular_entrega_admin` (sobre `agente_id` Y
`cobrado_por` a la vez — la única de las 3 que puede mover el saldo de 2 agentes distintos en una
sola operación).

---

## Punto 3 — las 3 pruebas reales con dos conexiones simultáneas

### Cómo se logró concurrencia REAL desde esta sesión (sin acceso a psql/CLI)

Cada llamada a `execute_sql` es una sesión de Postgres nueva y aislada — nada persiste de una
llamada a la siguiente (ni tablas temporales, ni conexiones `dblink` nombradas). Eso descarta
"abrir la transacción A en una llamada y la B en la siguiente". La solución: **una sola llamada
`execute_sql` puede sostener 2 (o más) conexiones `dblink` con nombre simultáneas**, cada una un
proceso/PID real y distinto en el servidor — así que la concurrencia se construyó ENTERA dentro de
un solo bloque `DO $$ ... END $$;`, con las 2 conexiones dblink interleavadas a mano.

Detalles técnicos que costó resolver:
- `dblink_connect` sobre loopback (`127.0.0.1`) falla para un rol no-superusuario
  (`2F003: password or GSSAPI delegated credentials required`) sin importar que la clave sea
  correcta — hay que conectar por el hostname externo real de la rama
  (`db.<project_ref>.supabase.co`) con `sslmode=require` (autenticación de red genuina). Con eso
  conectó al instante.
- `dblink_exec` solo acepta comandos que no devuelven resultados (`BEGIN`/`SET
  LOCAL ROLE`/`COMMIT`); cualquier SELECT (incluida la impersonación vía `set_config`) tiene que ir
  por `SELECT r FROM dblink(conn, sql) AS t(r tipo)`.
- Mientras una conexión nombrada no reciba `COMMIT`/`ROLLBACK`, TODO lo que se le mande después
  (otra impersonación, la llamada de negocio real) sigue dentro de esa MISMA transacción abierta —
  así es como se sostiene el candado tomado por la conexión A mientras se dispara la conexión B.
- **Prueba de la contención — `pg_locks`, evidencia independiente y sistémica**: para el candado
  de un único bigint (como usa `pg_advisory_xact_lock`), `classid`/`objid` codifican juntos la
  llave de 64 bits. Filtrando `pg_locks` por `pid IN (pid_a, pid_b)` y comparando `granted`
  (`true`=lo tiene, `false`=está esperando) sobre el mismo `(classid,objid,objsubid)`, es prueba
  real de contención — no una suposición de timing.
- `dblink_is_busy(connname)` — chequeo no bloqueante de si un `dblink_send_query` disparado sigue
  siendo procesado del otro lado — se usó como proxy en tiempo real de "todavía bloqueado
  esperando el candado".

### Test A — transferencia ↔ transferencia (2 aceptaciones sobre el mismo agente origen)

Dos conexiones reales y distintas (PIDs distintos en cada corrida), ambas intentando
`transferencias_aceptar` sobre transferencias con el MISMO `desde_agente` (ROBINSON). Conexión A
abre transacción, impersona, llama `transferencias_aceptar` y se queda SIN commitear (candado
tomado, `pg_locks.granted=true` para su PID). Conexión B dispara su propio `transferencias_aceptar`
de forma asíncrona (`dblink_send_query`) — `pg_locks` confirma su fila con `granted=false` sobre la
MISMA llave, y `dblink_is_busy` sigue devolviendo verdadero mientras A no suelta. Al hacer
`COMMIT` en A, B se destraba, y **relee el saldo disponible YA actualizado post-commit de A** (no
un valor viejo cacheado): con el disponible real bajado a RD$5,000/6,000 según la ronda, y su
propia solicitud de RD$6,000, `transferencias_aceptar` la rechaza correctamente con el mensaje real
`'Saldo insuficiente del origen: disponible RD$ X , solicitado RD$ Y'`. **Resultado: PASA** — sin
el candado, B habría leído el saldo VIEJO (antes del commit de A) y habría aceptado sobre fondos ya
comprometidos.

### Test B — transferencia ↔ reversa de cobro

Misma mecánica de 2 conexiones, esta vez contendiendo `seguros_reversar_cobro` (que ahora adquiere
el candado sobre `agente_cobro`) contra `transferencias_aceptar` (candado sobre `desde_agente`),
ambos apuntando al mismo agente (ROBINSON). Conexión A reversa un abono de RD$9,000→RD$4,000 sin
commitear todavía; `pg_locks` confirma el mismo patrón `granted=true`/`granted=false` cruzado por
PID. Al soltar A, el disponible real queda en RD$5,000; conexión B pide RD$7,000 y es rechazada con
el mismo mensaje real de saldo insuficiente, ahora leyendo el saldo YA descontado por la reversa.
**Resultado: PASA.**

### Test C — transferencia ↔ anulación de entrega (el caso históricamente más grave)

Este es el escenario que en el `bitácora` del 16-ago-2026 (0232) ya se había demostrado que producía
**dinero fantasma real de -RD$8,000** usando la función `seguros_anular_entrega_admin` real y
desplegada, sin ningún candado. Con el candado aplicado (sobre las 2 columnas a la vez —
`agente_id` Y `cobrado_por`, porque una anulación puede mover el saldo de 2 agentes distintos en
una sola operación), `pg_locks` confirma que `seguros_anular_entrega_admin` adquiere **2** filas de
candado por su PID (una por cada agente afectado), y que `transferencias_aceptar` contendiendo
sobre la llave compartida de ROBINSON queda correctamente en `granted=false` hasta que A suelta. Al
liberar (removiendo un crédito de RD$6,000, saldo 11,000→5,000), la conexión B — que pedía
RD$9,000 — es rechazada correctamente contra el saldo YA corregido, no el que existía antes de la
anulación. **Resultado: PASA — el candado cierra por completo la clase de vulnerabilidad que
produjo el -RD$8,000 original.**

### Resumen de los 3 tests

| Test | Funciones contendiendo | Candado(s) | Evidencia de contención (`pg_locks`) | Lectura post-commit correcta | Resultado |
|---|---|---|---|---|---|
| A | `transferencias_aceptar` ↔ `transferencias_aceptar` | `desde_agente` (1) | Sí, 2 PIDs distintos, mismo `(classid,objid)` | Sí, rechazo real por saldo insuficiente | **PASA** |
| B | `seguros_reversar_cobro` ↔ `transferencias_aceptar` | `agente_cobro` = `desde_agente` (1) | Sí | Sí, saldo ya descontado por la reversa | **PASA** |
| C | `seguros_anular_entrega_admin` ↔ `transferencias_aceptar` | `agente_id` + `cobrado_por` (2 candados, misma llave que `desde_agente`) | Sí, 2 filas de lock por A | Sí, saldo ya corregido por la anulación | **PASA** |

---

## Hallazgo honesto, fuera de alcance — NO corregido, se reporta tal cual

Los 3 tests prueban que ninguna lectura queda obsoleta bajo concurrencia. Pero investigando el
mismo diseño se encontró — y se reporta explícitamente porque el mandato no pedía corregirlo — un
caso **secuencial, no concurrente, 100% autorizado en cada paso**, que igual puede dejar el saldo
de un agente en negativo:

1. Se le acredita a ROBINSON RD$10,000 (saldo 2,000 → 12,000).
2. Se transfiere el TOTAL disponible (RD$12,000) — se acepta correctamente, saldo queda en 0.
3. Se reversa el abono original de RD$10,000 que había financiado parte de esa transferencia.
4. **Saldo final: -RD$10,000** (`es_negativo: true`).

Ninguno de los 3 pasos es concurrente ni usa una lectura obsoleta — cada uno lee el estado real y
vigente al momento de ejecutarse. El problema es que `seguros_reversar_cobro` y
`seguros_anular_entrega_admin` **nunca comprueban el saldo disponible del agente basado en
transferencias** — solo protegen que la deuda del CLIENTE no quede negativa
(`v_nuevo_pagado < -0.01`). Cerrar esto exigiría una decisión de negocio nueva (¿se bloquea la
reversa si el agente ya movió el dinero por transferencia? ¿se permite y queda una deuda del
agente hacia la empresa?) — está fuera de los 3 puntos del mandato y no se tocó.

---

## Estado real de producción, sin ambigüedad

- **Aplicado y en vivo**: solo el punto 1 (`parches.js`, `calcularKPIs`/`calcularPorAgente`,
  `v56.34`, `main` en `880f48a`).
- **NO aplicado a producción, en ningún punto de esta ronda**: `transferencias_lock_agentes`,
  `transferencias_saldo_disponible_agente`, `transferencias_crear`, `transferencias_aceptar`,
  `transferencias_rechazar`, los candados insertados en `seguros_reversar_cobro`/
  `seguros_registrar_entrega_admin_manual`/`seguros_anular_entrega_admin`, ni el ACL lockdown de
  `transferencias_agentes`. Todo eso vivió y se probó en la rama desechable
  `bloque4c-correccion-final` (`d6a452fb-2b51-4aed-bd24-f14d2319d228`), **ya eliminada**.
- Producción (`tnwsgcxurfyuszxsewsn`) queda con una sola rama activa (`main`), sin ningún residuo
  de esta ronda de pruebas.

---

## Resumen para el dueño

1. ✅ `calcularKPIs()`/`calcularPorAgente()` corregidas y publicadas — Cobros y el backend ya
   cuentan la misma verdad financiera. En vivo desde `v56.34`.
2. ✅ `transferencias_lock_agentes()` diseñada como helper interno puro (sin EXECUTE para nadie
   fuera del owner) y `transferencias_saldo_disponible_agente()` con ACL mínimo — probado con
   `has_function_privilege` en la rama de prueba.
3. ✅ Las 3 pruebas reales de 2 conexiones simultáneas, todas pasadas, con evidencia independiente
   (`pg_locks`) de que el candado bloquea de verdad y que la relectura tras el commit es fresca —
   incluida la que reproduce el escenario que ya había producido -RD$8,000 reales.
4. Un hallazgo honesto adicional, fuera de alcance: reversa/anulación después de una transferencia
   ya aceptada puede dejar saldo negativo por vía secuencial (no concurrente) — no se corrigió, es
   una decisión de negocio nueva si el dueño la quiere.

**El diseño completo de Bloque 4C sigue sin tocar producción. Con los 3 puntos ya cerrados, queda
esperando la autorización explícita del dueño para implementarlo** — tal como él mismo lo planteó:
"Después de eso, sí veo viable autorizar la implementación completa de 4C."
