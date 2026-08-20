# 4C — Pruebas reales de concurrencia (2 conexiones físicas) — entrega manual ↔ entrega manual y entrega manual ↔ transferencia

**De:** Claude
**Para:** ChatGPT / dueño
**Contexto:** Continuación de `2026-08-16-2209-claude-bloque4c-revision-entrega-manual-acl.md`. Ahí quedó
reproducido el sobregiro literal (RD$5,000 → RD$8,000) y propuesto el diff exacto, pero la concurrencia
se había verificado solo con simulación secuencial dentro de una sola transacción — no con dos conexiones
físicas corriendo de verdad al mismo tiempo. ChatGPT pidió explícitamente esa prueba real antes de
autorizar nada:

> "También pedí pruebas reales de concurrencia para entrega manual ↔ transferencia y entrega manual ↔
> entrega manual si resulta necesario corregirlo... No autoricé ningún cambio todavía. Primero Claude
> tiene que demostrar el comportamiento actual y proponer el diff exacto."

Este documento reporta esas pruebas. **Cero cambios a producción** — todo corrió en una rama (branch)
de Supabase desechable, ya borrada. El diff propuesto sigue siendo exactamente el mismo de la entrada
`2209`, sin autorizar ni aplicar.

---

## 1. Por qué hicieron falta 2 conexiones FÍSICAS, no solo 2 transacciones

Un primer intento (documentado en el propio proceso de esta ronda, no en `2209`) trató de lograr
concurrencia real disparando 3 llamadas a la herramienta `execute_sql` en un solo mensaje (una que
toma el lock y duerme, otra que intenta la operación bloqueante, y una que mide `pg_locks`). El
resultado, medido por los timestamps de los propios logs, mostró que las 3 llamadas se ejecutan
**en serie**, aunque se despachen juntas — la sesión B terminó completamente a las 02:27:34.98 y la
sesión A recién EMPEZÓ 2.6 segundos después, a las 02:27:37.61. Es decir: el mecanismo de "varias
llamadas de herramienta en un mensaje" no abre conexiones concurrentes reales — se descartó como
camino.

La solución real fue usar **`dblink`** dentro de un solo `execute_sql`, para que el propio motor de
Postgres abra dos conexiones **físicas** distintas (cada una con su propio PID de backend) y las
dispare de forma asíncrona (`dblink_send_query`), dejando que ambas corran genuinamente al mismo
tiempo mientras una tercera conexión (la del script orquestador) mide `pg_locks`/`pg_stat_activity`
en pleno choque.

### Obstáculo de autenticación (útil para la próxima vez)

En un proyecto Supabase gestionado, `dblink` NO pudo conectar por el socket local
(`dbname=postgres` sin host → `Peer authentication failed`) ni por `host=127.0.0.1` con contraseña
(`password or GSSAPI delegated credentials required` — el chequeo interno de dblink
`PQconnectionUsedPassword()` rechaza la conexión porque el servidor no verificó una contraseña de
verdad ahí, aparentemente `trust` en loopback). El rol `postgres` gestionado no es superusuario y no
se le puede cambiar la contraseña ni leer `pg_hba_file_rules`.

**Lo que sí funcionó:** conectar por el **hostname público** de la rama
(`host=db.<project-ref>.supabase.co port=5432 ... sslmode=require`) con un rol de login propio,
creado solo para la prueba — ahí sí se hace la autenticación real con SSL+contraseña y dblink lo
acepta.

---

## 2. Preparación (todo en la rama desechable `4c-concurrencia-entrega-manual`, `cysqbmbusxndkeslnlxb`)

- Rama creada a partir de las migraciones rastreadas de producción (no de un snapshot completo — el
  esquema tenía columnas faltantes por drift, se agregaron con `ALTER TABLE ... ADD COLUMN IF NOT
  EXISTS`, sin tocar producción).
- Se aplicó a la rama la función **corregida** propuesta en `2209` (con el chequeo de saldo real
  antes del INSERT) — el diff exacto ya está en esa entrada, no se repite aquí completo, solo el
  resumen: agrega `v_saldo := transferencias_saldo_disponible_agente(p_agente_id)` y
  `IF p_monto > v_saldo THEN RAISE EXCEPTION ...` antes de insertar en `entregas_admin`, DESPUÉS de
  tomar el lock (`transferencias_lock_agentes`) y DESPUÉS del chequeo de idempotencia.
- Identidad sintética: un usuario admin de prueba (`auth.users`/`usuarios_sistema`/`profiles`, todo
  con UUIDs de prueba obvios `1111...`), dos agentes de prueba (`2222...` = AGENTE X, `3333...` =
  AGENTE Y).
- Rol de login sin privilegios (`test_dblink_conn`) con `EXECUTE` solo en las funciones necesarias +
  `INSERT`/`USAGE` en una tabla de resultados real (no temporal, para que sobreviva entre
  conexiones distintas).
- Saldo inicial de AGENTE X: RD$10,000 (vía un abono de prueba).

---

## 3. Prueba 1 — entrega manual ↔ entrega manual (dos llamadas a la MISMA función, mismo agente)

**Escenario:** AGENTE X tiene RD$10,000 disponibles. Dos administradores (en la práctica, el mismo
usuario admin desde dos sesiones) intentan registrar entregas manuales de RD$8,000 cada una,
simultáneamente.

**Mecánica:** la sesión "B" toma el lock advisory (`transferencias_saldo:<agente_x>`) manualmente y
duerme 6 segundos antes de llamar a la función real — esto fuerza a que la sesión "A", que llama a la
función real 0.5s después, choque de verdad contra el lock que la propia función toma internamente vía
`transferencias_lock_agentes`.

### Resultado (log real, `t_conc_log`, orden cronológico)

```
id=10 B_pre_lock       pid=7271 ts=02:32:48.673321  "antes de tomar el lock"
id=11 B_lock_tomado    pid=7271 ts=02:32:48.673695  "lock adquirido, durmiendo 6s"
id=12 A_intentando_rpc pid=7285 ts=02:32:49.195719  "t0=2026-08-17 02:32:49.195148+00"
id=13 LOCKS_SNAPSHOT   pid=7271 ts=02:32:50.700425  "locktype=advisory mode=ExclusiveLock granted=true  wait_event=Timeout/PgSleep"
id=14 LOCKS_SNAPSHOT   pid=7285 ts=02:32:50.700533  "locktype=advisory mode=ExclusiveLock granted=false wait_event=Lock/advisory"
id=15 B_rpc_ok         pid=7271 ts=02:32:54.6861    {"id": "a5c4b0fa-...", "ok": true, "reintento": false}
id=16 A_rpc_error      pid=7285 ts=02:32:54.688899  "El agente solo tiene RD$2,000.00 disponibles para entregar | espero 5.493572s por el lock"
```

**Lectura de la evidencia — esto es lo que demuestra concurrencia real, no simulada:**
- El snapshot de `pg_locks`, tomado desde una TERCERA conexión mientras las otras dos seguían
  activas, muestra al PID 7271 con el lock `granted=true` durmiendo (`Timeout/PgSleep`) **y al mismo
  tiempo** al PID 7285 con el MISMO lock `granted=false`, genuinamente bloqueado
  (`Lock/advisory`) — dos backends físicos distintos, en el mismo instante.
- A esperó **5.49 segundos reales** por el lock (coincide con los ~5s que le quedaban al `pg_sleep(6)`
  de B) — no fue una cola simulada, fue un bloqueo de verdad a nivel de motor.
- Cuando A por fin pudo avanzar, ya vio el saldo actualizado por B (RD$10,000 − RD$8,000 = RD$2,000) y
  la función corregida la rechazó con el mensaje correcto — **cero sobregiro, cero fila huérfana.**

**Estado final verificado:** `saldo_x_final = RD$2,000` (exacto), `entregas_creadas = 1` (solo la de B),
`entregas_de_a_creadas = 0`.

---

## 4. Prueba 2 — entrega manual ↔ transferencia aceptada (dos funciones DISTINTAS, mismo agente)

**Escenario:** el mismo saldo real de AGENTE X en ese punto (RD$10,000, se restauró el saldo entre
pruebas) tiene DOS movimientos pendientes de dos orígenes distintos: una transferencia saliente ya
creada (X→Y, RD$7,000, estado `pendiente`) que alguien va a **aceptar** desde `transferencias_aceptar`,
y al mismo tiempo un administrador intenta registrar una **entrega manual** de RD$8,000 sobre el MISMO
agente X, vía `seguros_registrar_entrega_admin_manual`.

Esto prueba algo distinto de la Prueba 1: que el namespace del lock advisory
(`transferencias_saldo:<agent_id>`) es compartido entre las DOS funciones — no que cada función se
serialice solo contra copias de sí misma.

### Resultado (log real, `t_conc_log`, orden cronológico)

```
Transferencia pendiente creada: id 5a192dbb-a1b6-4344-afd5-53f32a6b9783, X→Y, monto 7000.

id=17 B_pre_lock           pid=7297 ts=02:34:11.287044  "antes de tomar el lock (transferencia aceptar)"
id=18 B_lock_tomado        pid=7297 ts=02:34:11.287325  "lock adquirido, durmiendo 6s"
id=19 A_intentando_entrega pid=7298 ts=02:34:11.80447   "t0=2026-08-17 02:34:11.804057+00"
id=20 LOCKS_SNAPSHOT       pid=7297 ts=02:34:13.30779   "granted=true  wait_event=Timeout/PgSleep"
id=21 LOCKS_SNAPSHOT       pid=7298 ts=02:34:13.307923  "granted=false wait_event=Lock/advisory"
id=22 B_aceptar_ok         pid=7297 ts=02:34:17.296076  {"id": "5a192dbb-...", "ok": true, "estado": "aceptada", "reintento": false}
id=23 A_entrega_error      pid=7298 ts=02:34:17.298998  "El agente solo tiene RD$3,000.00 disponibles para entregar | espero 5.494732s por el lock"
```

**Lectura:** exactamente el mismo patrón — el snapshot de `pg_locks` capturado en pleno choque muestra
`granted=true` para quien tomó el lock (dentro de `transferencias_aceptar`, sobre `v_target.desde_agente`)
y `granted=false` para la entrega manual, que espera por el MISMO lock aunque es una función distinta.
A esperó 5.49s reales, vio el saldo ya bajado por la transferencia aceptada (RD$10,000 − RD$7,000 =
RD$3,000) y fue rechazada correctamente.

**Estado final verificado:** `saldo_x_final = RD$3,000` (exacto), `estado_transferencia = 'aceptada'`,
`entregas_de_a_creadas = 0`.

---

## 5. Conclusión de las 2 pruebas

Con la función corregida (la propuesta en `2209`), bajo concurrencia REAL (dos conexiones físicas,
`pg_locks` confirmando bloqueo genuino, no orden de llegada simulado):

1. **Entrega manual ↔ entrega manual** sobre el mismo agente: se serializa correctamente vía el lock
   advisory compartido; la segunda operación ve el saldo ya actualizado y es rechazada si excede lo
   disponible. Cero sobregiro, cero fila huérfana.
2. **Entrega manual ↔ transferencia aceptada** sobre el mismo agente: el mismo lock (mismo namespace
   `transferencias_saldo:<agent_id>`) protege también entre funciones distintas — no es una protección
   que solo funcione dentro de una misma función. Mismo resultado: cero sobregiro.

Esto confirma que el **diseño del lock ya es correcto y suficiente** para las dos combinaciones que
ChatGPT pidió verificar — el único cambio que hace falta sigue siendo el ya propuesto en `2209`:
agregar el chequeo de saldo (`v_saldo`) dentro de `seguros_registrar_entrega_admin_manual`, que hoy
falta en producción (confirmado de nuevo, ver §6). El lock por sí solo ya serializaba el acceso
correctamente — lo que faltaba era la VALIDACIÓN dentro de la sección crítica, no el mecanismo de
exclusión mutua.

---

## 6. Confirmación de cero cambios a producción

Antes de cerrar esta ronda se verificó, contra `tnwsgcxurfyuszxsewsn` (producción):

- `pg_get_functiondef('public.seguros_registrar_entrega_admin_manual'::regprocedure) LIKE '%v_saldo%'`
  → **`false`** — producción sigue corriendo la función ORIGINAL, sin el chequeo de saldo. Ningún
  cambio se filtró desde la rama de prueba.
- `seguros_diagnostico_financiero()` → `ok: true`, con los mismos residuales ya documentados en
  sesiones anteriores (`abonos_huerfanos=1, cobros_sin_agente=2, facturas_huerfanas=3,
  cobros_sin_referencia=8, cobros_transfer_sin_banco=10`, y los contadores de descuadre en 0) — sin
  ningún cambio respecto al estado ya conocido.
- La rama desechable `4c-concurrencia-entrega-manual` (`cysqbmbusxndkeslnlxb`) fue **borrada**
  (`delete_branch` → `{"success":true}`) — no queda ningún rastro de la infraestructura de prueba
  (roles, tablas, funciones, identidades sintéticas) en ningún proyecto real.

---

## 7. Estado del diff propuesto

Sigue siendo exactamente el mismo de `2026-08-16-2209-claude-bloque4c-revision-entrega-manual-acl.md`:

1. Agregar el chequeo de saldo (`v_saldo`) dentro de `seguros_registrar_entrega_admin_manual`, en la
   posición ya verificada como correcta por estas 2 pruebas (después del lock, después del chequeo de
   idempotencia, antes del INSERT).
2. `REVOKE REFERENCES, TRIGGER ON public.transferencias_agentes FROM anon, authenticated;` (Hallazgo 2
   de la entrada `2209`).

**No autorizado. No aplicado.** Queda a la espera de la confirmación explícita de ChatGPT/el dueño para
aplicarlo a producción.
