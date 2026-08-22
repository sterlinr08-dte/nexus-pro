# POLÍTICA DE SEGURIDAD — NEXUS PRO

> **Fuente única de verdad** sobre el estado de seguridad del sistema. Antes de este documento, el
> estado real vivía repartido en `SEGURIDAD-PLAN.md` (el plan original, ya superado) y en 90+
> archivos de `docs/bitacora/` (el trabajo real, bloque por bloque). Este documento resume **qué
> está cerrado, qué falta, y las reglas que rigen cómo se hace este trabajo** — no reemplaza la
> bitácora (ahí está el detalle con evidencia), la hace navegable.
>
> Última actualización: **22-ago-2026** (cierre del Bloque 2C-2), contra el estado real de Supabase
> (`tnwsgcxurfyuszxsewsn`), verificado con `get_advisors`/`execute_sql` al escribir este documento,
> no de memoria.

---

## 1. Cómo llegamos aquí (contexto en una frase)

La app **no usa Supabase Auth para todo** de origen — nació con una `anon key` pública embebida en
`index.html` (tiene que estarlo: el login la necesita antes de que exista sesión) y, al principio,
políticas RLS `USING(true)` en casi todas las tablas — cualquiera con esa clave podía leer/escribir
todo. Desde entonces se ha cerrado **tabla por tabla, función por función**, con un método fijo (§3)
y un segundo revisor (ChatGPT) que audita cada diseño antes de que se aplique a producción.

---

## 2. Principios — lo que NUNCA se salta en este proyecto

1. **Ninguna migración, RPC o cambio de RLS se aplica a producción sin probarse primero** — en una
   transacción `BEGIN...ROLLBACK` (si el caso lo permite) o en un **branch desechable de Supabase**
   (siempre que la prueba necesite concurrencia real de dos conexiones, o el `ROLLBACK` no baste).
   El branch de prueba se **borra** al cerrar la ronda.
2. **Segundo revisor obligatorio en cambios de dinero/permisos.** ChatGPT audita el diseño antes de
   autorizar la aplicación real — no es un trámite, varias veces encontró huecos reales que el
   primer diseño no cubría (ver §5, "hallazgos encontrados en revisión").
3. **Dinero nunca se borra físicamente.** Cobros, entregas, transferencias, egresos: siempre
   anulación trazable (`estado`, `anulado_at`, `anulado_por`), nunca `DELETE`. Varias tablas tienen
   un trigger anti-`DELETE` explícito.
4. **El patrón estándar para escrituras sensibles es: RPC `SECURITY DEFINER` con candado
   (`pg_advisory_xact_lock`) + validación de rol/organización DENTRO de la función + `REVOKE`/`GRANT`
   explícitos + registro en `auditoria`** — nunca un `PATCH`/`POST` directo del navegador a la tabla
   para dinero, secuencias fiscales, o configuración sensible.
5. **`REVOKE ... FROM anon` NO BASTA por sí solo** (lección real, documentada en varios bloques):
   Supabase da `EXECUTE` a `anon`/`authenticated` por defecto en cualquier función nueva vía
   `ALTER DEFAULT PRIVILEGES` — hay que revocar explícitamente de `anon` y **verificar después** con
   `has_function_privilege('anon', ...)`, nunca confiar en que el `REVOKE` del propio SQL bastó.
6. **Verificación independiente tras cada aplicación real:** `get_advisors(security)` + una batería
   de pruebas contra la función YA desplegada (no solo contra el branch de prueba) + confirmación de
   que no quedaron residuos sintéticos de las pruebas.
7. **Cambios pequeños, publicados y documentados uno a la vez** — nunca una migración gigante que
   toque 10 tablas de golpe. Cada bloque tiene su propia entrada en `docs/bitacora/` con: inventario
   real → diseño → prueba → aplicación → verificación de cierre.

---

## 3. Playbook — cómo se hace un cambio de seguridad nuevo

Repetido en cada bloque cerrado hasta ahora, es el procedimiento a seguir para cualquier superficie
nueva que se decida cerrar:

1. **Inventario fresco** — releer el código REAL (no de memoria de una ronda anterior) qué lee/escribe
   esa tabla/función hoy, desde dónde, y verificar el RLS/ACL actual con SQL directo.
2. **Diseñar** la RPC/policy que reemplaza el acceso directo, con la matriz actor×operación explícita
   (admin/agente/cajero/anon, qué puede cada uno).
3. **Probar el diseño** con `BEGIN...ROLLBACK` (o un branch desechable si hace falta concurrencia real
   de 2 conexiones) — **nunca contra producción sin red de seguridad**.
4. **Escribir la entrega en `docs/bitacora/`** (SQL propuesto + matriz de pruebas + rollback) y, si el
   cambio toca dinero o permisos amplios, esperar la autorización de ChatGPT/el dueño antes de aplicar.
5. **Aplicar la migración real** con `apply_migration`.
6. **Verificar de inmediato**: `get_advisors(security)` + `has_function_privilege`/
   `has_table_privilege` contra lo recién aplicado.
7. **Batería de pruebas contra la función YA desplegada** (no solo la del branch de prueba).
8. **Migrar el frontend** (`index.html`/`parches.js`) del PATCH directo a la RPC nueva.
9. **Verificar compilación** (`node --check parches.js`, los `<script>` de `index.html` con
   `new Function()`) y correr la batería E2E contra el código real extraído.
10. **Publicar** (rama → commit → push → PR → merge, o directo a `main` si el cambio es chico y ya
    verificado) y **escribir la bitácora de cierre**.

---

## 4. Estado actual — qué está cerrado

Verificado con SQL directo contra producción al escribir este documento (no listado de memoria).

### Cerrado (RLS real + RPC atómica con candado, en producción)

| Superficie | RLS | Escritura pasa por | Bloque |
|---|---|---|---|
| Cobros (`abonos`) | por org | `seguros_registrar_cobro`, `seguros_registrar_cobro_con_entrega` (candado, idempotente) | Fase 1, 4D-1 |
| Entregas entre admin/agentes (`entregas_admin`) | por org | 5 RPC (manual, automática, confirmar, depositar, anular — anulación trazable, no DELETE) | 4D-1 |
| Transferencias entre agentes (`transferencias_agentes`) | por org | 4 RPC (crear/aceptar/rechazar/cancelar), con candado de concurrencia probado con 2 conexiones reales | 4C, 4C-DEUDA, 4C-revisión |
| Egresos (`egresos`) + sus asientos | por org | 3 RPC (registrar/anular/corregir), trigger anti-DELETE, backfill de legado 1:1 | 4B-1, 4B-2 |
| Asiento manual balanceado | por org | 2 RPC que exigen Debe=Haber dentro de la función | 3A |
| Generación/anulación de facturas | por org | RPC atómica con anti-duplicado real | 3B |
| Corrección de precio de factura | por org | `seguros_corregir_precio_factura` | 2C-3 |
| Secuencias NCF/recibos (`siguiente_ncf`, `next_recibo*`) | — | `EXECUTE` revocado de `anon`, solo `authenticated`/`service_role` | 2A |
| Cuentas bancarias del dueño (`mis_cuentas_bancarias`) | lectura org / escritura admin | policy directa (no necesitó RPC) | Bloque 2 |
| Historial TSS | por org | RPC append-only (nunca sobrescribe una fila, versiona) | 4D-2 |
| Pagos (tabla legacy con 1 fila) | — | resuelto tras análisis de riesgo real (ver bitácora 4D-3) | 4D-3 |
| `configuracion` (org + `roles_perms` admin-only) | por org | policy directa, verificado con SQL en este documento | 2C-1 |
| `configuracion.seq_poliza` (número de póliza) | por org **+ carve-out**: INSERT/UPDATE/DELETE directo a `clave='seq_poliza'` rechazado por RLS (verificado: UPDATE afecta 0 filas, INSERT lanza `42501`), todas las demás claves de `configuracion` siguen escribibles directo sin regresión | 2 RPC con candado (`pg_advisory_xact_lock`) — `seguros_siguiente_numero_poliza` (incrementa), `seguros_resetear_seq_poliza` (reinicia, solo admin, no permite bajar del máximo ya emitido salvo `p_forzar`). Frontend migrado en los 4 sitios que antes escribían directo (`generarNumPoliza`, `guardarNumeracion`, `guardarDatosEmp`, `guardarTarifas` — esta última tenía además un bug real: la escritura vivía FUERA de su `try`, moría en silencio si fallaba) | **2C-2** |
| `organizaciones` | lectura pública (necesaria para el login) / escritura admin | — | Ronda 1 (26-jul) |
| `auditoria` | por org (con `organizacion_id` + trigger, backfill de 2,373 filas históricas) | — | 26-jul |
| Artículo 360° — costo/margen visible solo si el rol lo permite | — | `puedeVerCosto360()` fail-closed | Fase A |

### Pendiente — propuesto y probado, esperando autorización para aplicar

Ninguno por ahora — el último bloque pendiente (2C-2, `seq_poliza`) se cerró el 22-ago-2026 (ver
tabla de arriba y `docs/bitacora/2026-08-22-*-claude-bloque2c2-cierre.md`).

### Sin tocar, documentado como riesgo conocido (no bloqueante hoy)

- **`nexus-smart`** (Edge Function del chatbot "Nexus Smart IA" del Dashboard de Seguros): tiene la
  clave de Anthropic **hardcodeada en texto plano** dentro del código de la función (no
  `Deno.env.get()`) y `verify_jwt:false` (se puede invocar sin sesión). Usa `SERVICE_ROLE_KEY`
  (salta RLS), pero está acotada a datos de Seguros y no es multi-tenant. Documentado desde hace
  tiempo en `CLAUDE.md`, nunca cerrado — mismo patrón que ya se cerró en otras funciones (§2.5), solo
  que aquí no se ha hecho todavía.

---

## 5. `get_advisors(security)` — estado en vivo (22-ago-2026)

**47 avisos totales, ninguno es un hueco real sin explicación** (subió de 45 a 47 al cerrar 2C-2: las
2 RPC nuevas de la tabla de §4 entran, como es de esperar, en la categoría de abajo):

| Tipo | Cantidad | Es un problema? |
|---|---|---|
| `authenticated_security_definer_function_executable` | 38 | **No** — son exactamente las RPC de §4 (candado + validación interna). Supabase avisa de toda función `SECURITY DEFINER`; su seguridad real está en la validación DENTRO de cada una, no en ocultar que existe. |
| `anon_security_definer_function_executable` | 7 | **No** — son helpers de identidad (`mi_organizacion`, `mi_usuario_id`, `mi_es_superadmin`, `set_organizacion_id`, `set_auditoria_metadata`, `superadmin_orgs`, `tablas_para_respaldo`). Los primeros 5 son los que USAN las propias políticas RLS/triggers — tienen que ser invocables; devuelven poco o nada sin sesión válida. `mi_es_superadmin()` devuelve `false` sin sesión; `superadmin_orgs()` devuelve `[]`. |
| `rls_enabled_no_policy` | 1 | **No** — `cron_secretos`: RLS activado a propósito, CERO políticas a propósito (ni `anon` ni `authenticated` la ven; solo la lee la service-role dentro de la Edge Function). |
| `auth_leaked_password_protection` | 1 | **Sí, pendiente del dueño** — interruptor en el panel de Supabase Auth (comprueba contraseñas contra HaveIBeenPwned). No hay herramienta MCP para activarlo; es un clic que solo el dueño puede dar desde el Dashboard. |

**Cero** `rls_disabled_in_public` — ninguna tabla del schema público está sin RLS activado.

---

## 6. Reglamentos de negocio relacionados

`REGLAMENTOS.md` cubre integridad de datos por módulo (venta, cobro/caja, crédito/cobranza,
inventario, contabilidad, clientes/entidades, taller, buscadores) — no es seguridad de acceso, pero
cierra huecos de negocio que también protegen dinero real (ej. el candado de caja abierta antes de
aceptar efectivo, el límite de crédito, la unicidad de IMEI). Se referencia aquí porque las dos cosas
conviven en las mismas superficies.

---

## 7. Dónde está el detalle

- **`docs/bitacora/`** — cada bloque cerrado tiene su entrada completa: inventario con evidencia
  `archivo:línea`, el SQL exacto aplicado, la matriz de pruebas, y la bitácora de cierre. Nombrado
  `AAAA-MM-DD-HHMM-claude-bloqueX...md` (o `-chatgpt-` para las revisiones).
- **`docs/BITACORA-CHATGPT-CLAUDE.md`** — el hilo de coordinación entre sesiones/agentes sobre este
  mismo trabajo.
- **`SEGURIDAD-PLAN.md`** — el plan original de 4 pasos; histórico, ya superado por el trabajo real
  documentado aquí.
- **`PLAN-AUTH-OPCION-A.md`** — el plan de autenticación multi-tenant (Supabase Auth por fases).

---

## 8. Próximo paso recomendado

Con 2C-2 cerrado, no queda ningún bloque de escritura sin candado identificado y pendiente de
aplicar — lo que sigue son las 2 piezas de §5/§4 que dependen de una acción fuera del alcance de este
tipo de migración:

1. Activar la protección de contraseñas filtradas en el panel de Supabase Auth (acción del dueño).
2. Mover la clave de Anthropic de `nexus-smart` a `Deno.env.get()` + decidir si necesita
   `verify_jwt:true` (mismo patrón ya usado para cerrar el reporte diario por correo).
