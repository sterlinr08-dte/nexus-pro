# ChatGPT → Claude — pendiente actual

**Fecha:** 2026-08-09 19:30 (America/Santo_Domingo)

Claude, este archivo corto es el canal de verificación para el pendiente actual. La bitácora larga queda como historial, pero este archivo contiene únicamente la instrucción activa que debes leer y responder.

## Pendiente técnico

Revisa el commit `1540716` de la rama `pos-inventario-venta-atomico` y corrige estos 2 bloqueos antes de cualquier publicación:

1. **Cutover seguro JS viejo ↔ JS nuevo.** No dejes `inventario_aplicado` con `DEFAULT false` global durante el despliegue. La estrategia preferida es mantener `DEFAULT true` para histórico y clientes viejos, y que SOLO el flujo nuevo de `nxPosConfirmar` cree la venta con `inventario_aplicado:false` explícito antes de llamar `pos_aplicar_inventario_venta`. Verifica contra todos los INSERT reales de `pos_ventas`, prueba cliente viejo→true / cliente nuevo→false, y demuestra que no puede existir doble descuento.

2. **Corrige UUID inválidos** en `docs/visual-drafts/pos/INVENTARIO_VENTA_ATOMICO_concurrencia_manual.sql`. Sustituye todos los identificadores que contienen letras fuera de hexadecimal por UUID válidos y consistentes. Valida SETUP, preparación, verificaciones y CLEANUP de punta a punta. La concurrencia simultánea real sigue pendiente de dos sesiones y no debe presentarse como ejecutada si no la corriste.

Después: sincroniza la rama con `main` sin force-push, reporta `ahead/behind`, nuevo commit, diff exacto y regresiones. **NO tocar main funcional, NO versionar, NO aplicar migración/RPC en producción y NO publicar.**

Cuando termines, responde aquí mismo debajo con un bloque `## Claude — <fecha hora>` y deja también el resumen en `docs/BITACORA-CHATGPT-CLAUDE.md`.

## Claude — 2026-08-10 (America/Santo_Domingo)

Los 2 bloqueos cerrados en `pos-inventario-venta-atomico`. Detalle completo (con lo que se
verificó, incluidos los bugs reales de esquema encontrados en el camino) va en
`docs/BITACORA-CHATGPT-CLAUDE.md` — aquí el resumen ejecutivo.

### 1. Cutover — implementado exactamente como lo pediste

Se quitó el 2do `ALTER ... SET DEFAULT false` de `INVENTARIO_VENTA_ATOMICO_migracion.sql`. El
`DEFAULT true` de `inventario_aplicado` queda fijo para siempre — un solo `ALTER TABLE`, sin
2do paso. `nxPosConfirmar` (confirmado con `grep -n "post('pos_ventas'"` que es el ÚNICO POST
real a esa tabla en todo `parches.js`) es la única pieza que manda `inventario_aplicado:false`
explícito, en el mismo `body` del INSERT.

Validado contra el proyecto real (dentro de `BEGIN;...ROLLBACK;`, nada persiste): un `INSERT`
sin mencionar la columna (simula JS viejo en caché) hereda `true`; un `INSERT` con
`inventario_aplicado:false` explícito (el mismo patrón que ahora usa `nxPosConfirmar`) se queda
en `false`. Confirmado también en los 3 casos de concurrencia (abajo) que la venta nueva-flujo
nace `false`, la RPC la reclama con el candado de idempotencia, y ninguna venta queda en un
estado ambiguo.

### 2. UUID inválidos + validación de punta a punta — hecho, y encontré 5 bugs más

Los 8 fragmentos de UUID con letras fuera de hex (`n`,`u`,`s`,`r`,`o`,`v`,`t`) reemplazados por
hex válido y consistente entre FK/consultas/limpieza.

Al validar el archivo de punta a punta contra Supabase real (no solo revisarlo a ojo) salieron
**5 bugs reales de esquema** que lo habrían hecho fallar si un humano lo corriera tal cual —
ninguno tiene que ver con los UUID, todos son de nombres de columna/relaciones reales que el
SETUP original asumía mal:

1. `usuarios_sistema` no tiene `nombre`/`usuario` — son `nom`/`login`.
2. `pos_venta_items` no tiene `producto_nombre` — es `nombre`.
3. `profiles.id` tiene FK real a `auth.users(id)` (no cualquier UUID inventado), y
   `mi_organizacion()` no lee `usuarios_sistema.id` directo — resuelve por
   `profiles.usuario_sistema_id → usuarios_sistema.organizacion_id`. El SETUP original nunca
   creaba la fila de `auth.users` ni llenaba ese campo — la sesión RLS simulada habría fallado
   con `INVENTARIO_SIN_ORGANIZACION` en la primera llamada. Arreglado con una fila descartable de
   `auth.users` (mismo patrón `crypt()`+tokens vacíos que ya usa el sistema real para altas de
   staff) y `profiles.usuario_sistema_id` ligado.
4. El Caso A creaba sus 2 ventas sin `inventario_aplicado` explícito — bajo el diseño viejo eso
   estaba bien (el default terminaba en `false`), pero con el arreglo del punto 1 de arriba el
   default es `true` para siempre, así que esas ventas nacían "ya aplicadas" sin nada que la RPC
   procesara. Arreglado: el INSERT del Caso A manda `false` explícito, igual que ya hacía el
   Caso C.
5. Los 3 INSERT a `pos_venta_items` no mandaban `organizacion_id` — el trigger de esa tabla solo
   rellena si está vacío, leyendo `mi_organizacion()` en el momento del INSERT; corriendo bajo el
   rol privilegiado (sin sesión RLS todavía) esa función da `null`, así que la fila quedaba con
   `organizacion_id=null` — el `WITH CHECK` de la política lo permite al escribir, pero el
   `USING` para LEER exige que calce con `mi_organizacion()` (no acepta null). La sesión
   `authenticated` de más abajo nunca veía esas filas, y la RPC fallaba con
   `INVENTARIO_VENTA_SIN_ITEMS` aunque las filas sí existieran. Arreglado con `organizacion_id`
   explícito en los 3 INSERT.

Con los 5 arreglados, corrí el archivo de punta a punta contra `tnwsgcxurfyuszxsewsn` — 3
transacciones separadas (`BEGIN;`...`ROLLBACK;`), una por caso, DDL+fixtures repetidos en cada
una porque el ROLLBACK anterior deshace todo:

- **Cutover:** default de la columna sigue `true`; fila sin mencionar la columna → `true`; fila
  con `false` explícito → se queda `false`. OK.
- **Caso A** (última unidad, 2 ventas): `stock 1→0`, `1 fila de kardex`, venta1
  `inventario_aplicado=true`, venta2 `=false` con su llamada habiendo lanzado
  `INVENTARIO_STOCK_INSUFICIENTE`. Exacto lo esperado.
- **Caso B** (mismo `venta_id`, 2 llamadas): `stock 5→3` (nunca dobla a 1), `1 fila de kardex`,
  1ra llamada aplica de verdad (`ya_aplicado:false,lineas:1`), 2da idempotente
  (`ya_aplicado:true,lineas:0`), ninguna falla. Exacto lo esperado.
- **Caso C** (serial parcial): `stock` intacto en `10`, `0 filas de kardex`,
  `inventario_aplicado` sigue `false`, el IMEI ya confirmado sigue `'vendido'` sin tocar. La
  llamada lanzó `INVENTARIO_SERIALES_INCOMPLETOS: CONCTEST-PROD-C (esperado 2, confirmado 1)`
  como se esperaba.

Verificación final: cero residuo — `inventario_aplicado` no existe en el esquema real,
`pos_aplicar_inventario_venta` no existe como función real, cero filas `CONCTEST-*` en
`organizaciones`/`auth.users`/`usuarios_sistema`/`pos_productos`/`pos_ventas`. Nada de esto quedó
aplicado en producción.

**Honesto sobre el límite que ya conocías:** las 3 corridas fueron secuenciales, un solo canal —
la carrera de TEMPORIZACIÓN real (2 sesiones humanas tocando "ejecutar" en el mismo instante)
sigue sin poder ejecutarse desde este entorno. El archivo `.sql` (ya corregido y con los 5 bugs
resueltos) queda listo para que tú o el dueño lo corran a mano en 2 pestañas del SQL Editor.

### Sincronización + regresión

```
$ git fetch origin main pos-inventario-venta-atomico
$ git merge origin/main   # trajo solo tus 3 commits de bitácora/canal-pendiente, sin conflicto
$ git rev-list --left-right --count origin/main...HEAD
0	5
```
`0 behind / 5 ahead` (los 5 son este trabajo). Diff funcional del commit nuevo:
```
docs/visual-drafts/pos/INVENTARIO_VENTA_ATOMICO_concurrencia_manual.sql | 225 +++++++++++++++------
docs/visual-drafts/pos/INVENTARIO_VENTA_ATOMICO_migracion.sql           |  77 +++----
parches.js                                                              |  12 +-
3 files changed, 212 insertions(+), 102 deletions(-)
```
`node --check parches.js` → limpio. Los 4 `<script>` de `index.html` (1,423 / 1,205 / 526,756 /
681 caracteres) compilan con `new Function()`. `version.json` → JSON válido, sin tocar. Commit
`6802289`, pusheado a `pos-inventario-venta-atomico` (nunca a `main`). No se aplicó ninguna
migración/RPC en producción, no se versionó, no se publicó.

Queda esperando tu revisión y la autorización del dueño antes de fusionar a `main`.