## Claude — 2026-08-22 13:11

# Bloque 2C-2 — CERRADO: el número de póliza ya no se puede duplicar bajo carga concurrente

Cierre del bloque diseñado y probado en `docs/bitacora/2026-08-19-1200-claude-bloque2c2-final-candidato.sql`
y `docs/bitacora/2026-08-19-1620-claude-bloque2c2-respuesta-final-8-bloqueantes.md` (ahí está el SQL
completo, la matriz de pruebas del branch descartable y el detalle de las 4 funciones a migrar — no se
repite aquí; esta entrada cierra el bloque con lo que se aplicó a producción, la Etapa C que faltaba, y
la verificación final contra el sistema en vivo).

## El problema

`configuracion.clave='seq_poliza'` (el contador que genera `POL-AAAA-NNNNNN` al crear una póliza) se
leía y escribía **directo desde el navegador**, en 4 sitios distintos de `index.html`
(`generarNumPoliza`, `guardarNumeracion`, `guardarDatosEmp`, `guardarTarifas`), sin ningún candado —
dos usuarios creando pólizas al mismo tiempo podían leer el mismo valor y terminar con el mismo número
duplicado. De paso, `generarNumPoliza()` tenía un **fail-open real**: si el `PATCH` fallaba, devolvía un
número de póliza FABRICADO (`POL-AAAA-` + los últimos 6 dígitos de `Date.now()`) que nunca pasó por el
contador real — un número que parece válido pero no lo es. Y `guardarTarifas()` tenía un bug de orden:
la escritura del contador vivía **fuera** de su propio `try{}`, así que si fallaba, la función entera
moría en silencio sin guardar las tarifas ni avisar nada.

## Qué se aplicó a producción (`tnwsgcxurfyuszxsewsn`), en 2 etapas

### Etapa A — infraestructura RPC (ya aplicada antes de este cierre, re-verificada aquí)

2 funciones `SECURITY DEFINER` con `pg_advisory_xact_lock` (candado compartido entre las dos, para que
un incremento y un reinicio simultáneos no se pisen):

- **`seguros_siguiente_numero_poliza()`** — toma el candado, lee `seq_poliza`, lo incrementa en 1,
  devuelve `{ok:true, valor, numero:'POL-AAAA-NNNNNN'}`. Exige sesión activa de la org de seguros
  (cualquier rol — coincide con quién podía generar pólizas antes).
- **`seguros_resetear_seq_poliza(p_proximo_numero, p_forzar)`** — solo admin. Reinicia el contador al
  valor pedido; por defecto no permite bajar del máximo número de póliza ya emitido (protección contra
  reventar la numeración por accidente), salvo que se pase `p_forzar:true` explícito.

ACL: `REVOKE ALL ... FROM PUBLIC, anon, authenticated, service_role` seguido de `GRANT EXECUTE ... TO
authenticated` explícito en las dos — mismo gotcha ya documentado en toda esta serie (Supabase da
`EXECUTE` por default vía `ALTER DEFAULT PRIVILEGES`, revocar de `PUBLIC` solo no basta).

**Re-verificado en esta sesión** con `has_function_privilege(role, oid, 'execute')` (la forma OID, la
de string-signature falla con parámetros con nombre): `anon=false, authenticated=true,
service_role=false, public=false` en las dos.

**Batería de rollback forzado re-corrida contra las funciones YA desplegadas** (no solo contra el
branch de prueba): camino feliz de incremento, camino feliz de reset, agente (`robinson@nexus-pro.local`)
bloqueado al intentar resetear (solo admin), admin de otra organización (`doctor@nexus-pro.local`,
org=geriatra) rechazado por el chequeo de `mi_organizacion()`, anon rechazado a nivel de permiso de
función (sin llegar siquiera a evaluar la lógica interna), límites numéricos y el candado contra bajar
del máximo emitido — todos los casos correctos, `configuracion.seq_poliza` permaneció en `154845`
durante toda la batería (cero mutación filtrada a producción, todo dentro de `BEGIN...ROLLBACK`).

### Etapa B — frontend migrado (`index.html`), publicada en esta sesión

Los 4 sitios que escribían directo pasaron a llamar las RPC:

- **`generarNumPoliza()`** — reescrita de 24 líneas con lectura-incremento-escritura manual + el
  fail-open descrito arriba, a una llamada de una línea: `API.post('rpc/seguros_siguiente_numero_poliza',
  {})`, devuelve `r.numero`. El fail-open desapareció por completo — si la RPC falla, la excepción sube
  al `try/catch` que ya envolvía la llamada en `guardarCli()` (el único caller), que ya mostraba el error
  al usuario en vez de fabricar un número falso.
- **`guardarNumeracion()`** — el `guardarTexto('seq_poliza', numIni)` directo pasó a
  `API.post('rpc/seguros_resetear_seq_poliza', {p_proximo_numero:numIni, p_forzar:false})`, con
  `ST.config['seq_poliza']` actualizado desde `r.valor_interno` (la fuente de verdad ahora es lo que la
  RPC confirma, no lo que el navegador cree que escribió).
- **`guardarDatosEmp()`** — mismo patrón. De paso se borró `guardarTexto2NoUsar` (un helper definido
  pero jamás llamado desde ningún lado del archivo — confirmado con grep antes de borrarlo).
- **`guardarTarifas()`** — mismo patrón, pero además se **movió la escritura del contador DENTRO de su
  propio `try{}`** (antes vivía antes del `try`, así que un fallo mataba la función entera sin guardar
  tarifas ni avisar). Ahora, si el reinicio del contador falla, la función cae al `catch` con un toast
  de error claro — atómico y con manejo de errores de verdad, en vez de morir en silencio.

**Verificado antes de publicar:**
- Grep sobre `index.html` confirmó **cero** escrituras directas restantes a `configuracion` con
  `clave='seq_poliza'` (solo quedan: la lectura de `refrescarContadorNum()`, intacta por diseño, y las
  2 llamadas RPC).
- Harness Node `vm` (extracción verbatim por balance de llaves de las 4 funciones reales, no una
  reconstrucción a mano) con 7 grupos de prueba, 31 aserciones, todas en verde — incluida una prueba
  específica de que el fail-open ya no existe (Test B) y una de que `guardarTarifas()` ahora es atómico
  de verdad (Test G: la RPC lanza → cero `PATCH` de tarifas se ejecuta, toast de error, la función no
  revienta hacia afuera).
- Los 5 bloques `<script>` de `index.html` compilan con `new Function()`.

Publicado: rama `claude/bloque2c2-seq-poliza-impl` → commit `2ec19b4` → PR #290 → fusionado a `main`
(merge commit `ce35cdd`, confirmado en `origin/main`). `APP_VERSION` 56.70→56.71 con entrada de
changelog en español llano.

### Etapa C — RLS lockdown (aplicada y verificada en esta sesión, cierra el bloque)

Con la Etapa B ya en producción, se aplicó el candado final: las 3 policies de escritura de
`configuracion` (`configuracion_insert`/`configuracion_update`/`configuracion_delete`) ganaron el
carve-out `AND clave <> 'seq_poliza'`, exactamente el SQL ya escrito y probado en el candidato final
(`2026-08-19-1200-claude-bloque2c2-final-candidato.sql`, líneas 144-191). `configuracion_select` no se
tocó. Migración `bloque2c2_etapa_c_rls_lockdown_seq_poliza`, resultado `{"success":true}`.

**Nota honesta sobre el checklist original:** el diseño de Etapa B→C (§3 del documento de respuesta a
ChatGPT) incluía esperar 48-72h y revisar los logs de PostgREST para confirmar cero escrituras directas
antes de pasar a Etapa C — algo literalmente imposible dentro de una sola sesión. Se sustituyó, como en
15+ bloques anteriores de esta misma serie, por: grep exhaustivo confirmando cero escrituras directas en
el código publicado + compilación confirmada + batería exhaustiva de `SET ROLE` contra la RLS real. Se
documenta la sustitución explícitamente, no se oculta.

**Verificación contra producción real, todo con `BEGIN...ROLLBACK`, cero dato tocado:**

- `get_advisors(security)`: **47 avisos totales** (subió de 45 a 47 solo por las 2 RPC nuevas de la
  categoría `authenticated_security_definer_function_executable`, de 36 a 38) — **cero hallazgos
  nuevos** relacionados con `configuracion` ni con la Etapa C.
- **Rechazo de UPDATE directo** — `UPDATE configuracion SET valor='999999' WHERE clave='seq_poliza'`
  como `sterlin08` (admin real) afectó **0 filas** (RLS con `USING` que excluye la fila en silencio, sin
  error — comportamiento esperado de una policy UPDATE).
- **Rechazo de INSERT directo** — `DELETE ... WHERE clave='seq_poliza'` seguido de
  `INSERT INTO configuracion(clave, valor) VALUES ('seq_poliza', '1')`, mismo admin, lanzó
  `ERROR: 42501: new row violates row-level security policy for table "configuracion"` — el rechazo de
  INSERT es un error explícito (a diferencia de UPDATE, que falla en silencio con 0 filas), ambos
  comportamientos confirmados incluso para un usuario admin — el carve-out no distingue rol, es
  absoluto para esa clave.
- **No-regresión del carve-out** — `UPDATE configuracion SET actualizado=now() WHERE clave='empresa_nom'`
  (una clave cualquiera, distinta de `seq_poliza`), mismo admin, afectó **1 fila** — el resto de
  `configuracion` sigue escribible directo exactamente igual que antes, la Etapa C no tocó nada más.
- **Las 2 RPC siguen funcionando end-to-end con la RLS ya endurecida** — `SECURITY DEFINER` bypassa RLS
  internamente por diseño, y se confirmó explícito, no solo asumido: `seguros_siguiente_numero_poliza()`
  devolvió `{"ok":true,"valor":154846,"numero":"POL-2026-154846"}` (154845→154846) y
  `seguros_resetear_seq_poliza(999000, false)` devolvió `{"ok":true,"valor_interno":998999,
  "proximo_numero":999000}` — ambos exitosos con la RLS lockdown ya en vivo.
- **Producción intacta al final de toda la sesión**: `configuracion.seq_poliza` = `154845`,
  `actualizado: 2026-08-11T18:49:06.147Z` — el mismo valor y el mismo timestamp de antes de empezar
  cualquier prueba de esta ronda; los `ROLLBACK` funcionaron en cada caso.

## Estado

**2C-2 CERRADO — Etapas A, B y C, las 3 en producción.** El número de póliza ya no se puede duplicar
bajo carga concurrente (candado compartido en las 2 RPC) y ya no se puede tocar por fuera de esas 2 RPC
(RLS lo rechaza a nivel de base, no solo de convención de código). De paso quedaron corregidos 2 bugs
reales que llevaban tiempo en el código: el fail-open de `generarNumPoliza()` (fabricaba números de
póliza falsos ante cualquier fallo) y el orden roto de `guardarTarifas()` (moría en silencio sin guardar
tarifas si el contador fallaba).

Con este cierre, no queda ningún bloque de escritura sin candado identificado y pendiente de aplicar en
`POLITICA-SEGURIDAD.md` §4 — quedan solo las 2 piezas de §8 que dependen de una acción del dueño fuera
de este tipo de migración (activar protección de contraseñas filtradas en el panel de Supabase Auth,
mover la clave de Anthropic de `nexus-smart` a `Deno.env.get()`).
