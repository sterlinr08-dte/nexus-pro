# Claude — Bloque 4D-2 APPEND-ONLY CERRADO — `cuadre_tss_historial` versionado en producción

Fecha: 2026-08-15 (RD)

## Contexto

Autorización recibida en `docs/bitacora/2026-08-15-0720-chatgpt-bloque4d2-appendonly-implementacion.md`
(commit `cf96b99`), revisando y aprobando el diseño de
`docs/bitacora/2026-08-15-1145-claude-bloque4d2-revision-appendonly.md` (commit `b8d2ff1`). Esta
entrada cierra la implementación: preflight, migración real, matriz completa contra la RPC ya
desplegada, migración de frontend, publicación a `main`, y confirmación de despliegue.

## Preflight obligatorio (antes de tocar nada)

5 lecturas en paralelo, todas confirmaron **cero drift** respecto a lo que asumía el diseño:

1. `pg_get_functiondef(seguros_guardar_cuadre_tss)` — idéntica a la versión con `DELETE` que dejó
   4D-2 original, sin ningún cambio desde la revisión.
2. Las 2 filas reales (`3fe7bed9-...` "LAS MATAS" 55000, `06a62f27-...` "PLAN VOLUNTARIO HUMANO"
   36500, ambas `created_at 2026-06-13`) — sin cambio, confirma que nadie llamó
   `p_reemplazar:true` desde la revisión.
3. `information_schema.columns` — seguían las 8 columnas originales, sin colisión de nombre para
   `activo`/`version`/`reemplazado_en`/`reemplazado_por`.
4. `pg_indexes` — solo `cuadre_tss_historial_pkey` + `idx_cuadre_tss_periodo`, sin colisión para
   `cuadre_tss_historial_activo_unico`.
5. `information_schema.role_table_grants` + `has_function_privilege` — `authenticated` solo
   `SELECT` en la tabla + `EXECUTE` en la RPC; `anon` sin ningún privilegio. Igual que siempre.

Con cero precondiciones distintas, se procedió a aplicar el diseño ya probado con rollback forzado
en la revisión, sin modificarlo.

## SQL aplicado a producción (migración `seguros_guardar_cuadre_tss_appendonly`)

```sql
ALTER TABLE public.cuadre_tss_historial
  ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reemplazado_en timestamptz,
  ADD COLUMN IF NOT EXISTS reemplazado_por text;

CREATE UNIQUE INDEX IF NOT EXISTS cuadre_tss_historial_activo_unico
  ON public.cuadre_tss_historial (periodo, empresa_nom)
  WHERE activo;

CREATE OR REPLACE FUNCTION public.seguros_guardar_cuadre_tss(
  p_periodo text, p_empresa_nom text, p_total_deuda numeric, p_resumen jsonb,
  p_reemplazar boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $fn$
DECLARE
  v_org uuid; v_actor text; v_existente_id uuid; v_existente_version integer;
  v_nuevo_id uuid; v_nueva_version integer;
BEGIN
  IF mi_rol() IS NULL THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  SELECT organizaciones.id INTO v_org FROM public.organizaciones WHERE slug = 'nexus-pro';
  IF mi_organizacion() IS DISTINCT FROM v_org THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  IF p_periodo IS NULL OR btrim(p_periodo) = '' THEN RAISE EXCEPTION 'Falta el período.'; END IF;
  IF p_empresa_nom IS NULL OR btrim(p_empresa_nom) = '' THEN RAISE EXCEPTION 'Falta la empresa.'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_periodo || '|' || p_empresa_nom, 0));

  SELECT us.nom INTO v_actor FROM public.usuarios_sistema us WHERE us.id = mi_usuario_id();
  IF v_actor IS NULL OR btrim(v_actor) = '' THEN v_actor := 'Sistema'; END IF;

  SELECT id, version INTO v_existente_id, v_existente_version
  FROM public.cuadre_tss_historial
  WHERE periodo = p_periodo AND empresa_nom = p_empresa_nom AND activo
  LIMIT 1;

  IF v_existente_id IS NOT NULL AND NOT p_reemplazar THEN
    RETURN jsonb_build_object('ok', false, 'duplicado', true, 'existente_id', v_existente_id);
  END IF;

  -- APPEND-ONLY: la versión anterior se conserva marcada como sustituida — nunca se borra.
  IF v_existente_id IS NOT NULL THEN
    UPDATE public.cuadre_tss_historial
    SET activo = false, reemplazado_en = now(), reemplazado_por = v_actor
    WHERE id = v_existente_id;
    v_nueva_version := v_existente_version + 1;
  ELSE
    v_nueva_version := 1;
  END IF;

  INSERT INTO public.cuadre_tss_historial (periodo, empresa_nom, usuario, total_deuda, resumen, activo, version)
  VALUES (p_periodo, p_empresa_nom, v_actor, coalesce(p_total_deuda, 0), p_resumen, true, v_nueva_version)
  RETURNING id INTO v_nuevo_id;

  RETURN jsonb_build_object('ok', true, 'id', v_nuevo_id, 'version', v_nueva_version, 'reemplazado', v_existente_id IS NOT NULL);
END;
$fn$;
```

Aplicado tal cual — sin ninguna desviación del diseño ya aprobado, porque el preflight no encontró
ningún motivo para desviarse.

## Diff RPC antes/después (fresco, contra la definición real desplegada)

**Antes** (versión que estuvo en producción desde el cierre original de 4D-2, confirmada en el
preflight de esta entrada):

```sql
  IF v_existente_id IS NOT NULL AND NOT p_reemplazar THEN
    RETURN jsonb_build_object('ok', false, 'duplicado', true, 'existente_id', v_existente_id);
  END IF;

  IF v_existente_id IS NOT NULL THEN
    DELETE FROM public.cuadre_tss_historial WHERE id = v_existente_id;
  END IF;

  INSERT INTO public.cuadre_tss_historial (periodo, empresa_nom, usuario, total_deuda, resumen)
  VALUES (p_periodo, p_empresa_nom, v_actor, coalesce(p_total_deuda, 0), p_resumen)
  RETURNING id INTO v_nuevo_id;

  RETURN jsonb_build_object('ok', true, 'id', v_nuevo_id, 'reemplazado', v_existente_id IS NOT NULL);
```

**Después** (confirmado leyendo `pg_get_functiondef` real tras aplicar, no de memoria): el bloque
de arriba (SQL aplicado). El `DELETE` desapareció por completo; se agregó el `UPDATE` que marca la
versión vieja `activo=false` + `reemplazado_en`/`reemplazado_por`, y el `INSERT` ahora lleva
`activo=true, version=v_nueva_version`. El `duplicado`-check pasó a filtrar `AND activo`
explícitamente (antes miraba solo `periodo`+`empresa_nom` sin distinguir versiones). El resto —
guards de rol/organización, `pg_advisory_xact_lock`, resolución server-side del actor — sin
ningún cambio.

## ACL/RLS final (verificado tras aplicar, no asumido)

```
anon_exec=false   auth_exec=true
anon_select=false anon_insert=false anon_truncate=false
auth_select=true  auth_insert=false auth_delete=false auth_truncate=false
```

Idéntico al estado post-lockdown del cierre original de 4D-2 — la migración solo agregó columnas +
índice + reemplazó el cuerpo de la RPC, sin tocar ningún `GRANT`/`REVOKE`.

`get_advisors(security)`: mismo listado de siempre (WARNs `authenticated_security_definer_function_
executable`/`anon_security_definer_function_executable` en las mismas funciones ya conocidas de
todo el engagement, más el WARN de `auth_leaked_password_protection` que es de configuración de Auth,
no de esta tabla). **Cero hallazgos nuevos.**

## Evidencia: las 2 filas históricas reales quedaron preservadas

```sql
SELECT id, periodo, empresa_nom, usuario, total_deuda, activo, version, reemplazado_en, reemplazado_por, created_at
FROM public.cuadre_tss_historial ORDER BY created_at;
```

```json
[
  {"id":"3fe7bed9-e21e-4231-8d37-fc827badee83","periodo":"2026-06","empresa_nom":"LAS MATAS",
   "usuario":"Administrador","total_deuda":"55000","activo":true,"version":1,
   "reemplazado_en":null,"reemplazado_por":null,"created_at":"2026-06-13 16:33:31.635749+00"},
  {"id":"06a62f27-1991-4ca6-b7c7-a77b1747bc9e","periodo":"2026-06","empresa_nom":"PLAN VOLUNTARIO HUMANO",
   "usuario":"Administrador","total_deuda":"36500","activo":true,"version":1,
   "reemplazado_en":null,"reemplazado_por":null,"created_at":"2026-06-13 18:10:31.290528+00"}
]
```

Mismos `id`/`usuario`/`total_deuda`/`resumen`/`created_at` de siempre — la `ALTER TABLE ... ADD
COLUMN ... DEFAULT true`/`DEFAULT 1` las pobló automáticamente como `activo=true, version=1`, y
`reemplazado_en`/`reemplazado_por` quedaron `NULL` — **sin ningún backfill inventado**, exactamente
como pedía la autorización.

## Matriz post-aplicación — 11/11, con rollback forzado contra la RPC REAL ya desplegada

Metodología (`docs/METODOLOGIA-PRUEBAS-DESTRUCTIVAS.md`): un solo `DO $$...$$` sin `BEGIN`/`COMMIT`
explícito, terminando en `RAISE EXCEPTION` forzado. Actores reales usados (resueltos server-side vía
`request.jwt.claims.sub` → `mi_usuario_id()`/`mi_rol()`/`mi_organizacion()`): Administrador
(nexus-pro, admin), ROBINSON (nexus-pro, agente), Francis (bayolsale, admin — cross-org).

**Resultado: `ROLLBACK_FORZADO_FIN_DE_PRUEBA: 11 OK, 0 FALLO`.**

1. **T1** — primer guardado (clave sintética `TEST-9999-98`/`EMPRESA_PRUEBA_APPENDONLY_POST`,
   admin): `ok:true, version:1, reemplazado:false`, fila `activo=true, usuario='Administrador'`.
2. **T2** — mismo guardado, `p_reemplazar=false`: `duplicado:true, existente_id` = el de T1; la fila
   de T1 queda **byte-a-byte idéntica** (mismo `activo`, `total_deuda`, `reemplazado_en`) a como
   quedó tras T1 — nadie la tocó.
3. **T3** — reemplazo real (v1→v2), mismo actor: la fila de T1 queda `activo=false`,
   `reemplazado_en` sellado, `reemplazado_por='Administrador'`, **`total_deuda=1000` intacto** (su
   dato original, nunca reescrito); nace v2 `activo=true, usuario='Administrador'`.
4. **T4** — segundo reemplazo (v2→v3), actor **DISTINTO** (ROBINSON): la fila de v2 queda
   `activo=false, reemplazado_por='ROBINSON', total_deuda=2000` (intacta); **la fila de v1 (ya
   inactiva desde T3) NO se vuelve a tocar** — comparada campo a campo contra su snapshot post-T3
   (`activo`, `reemplazado_en`, `reemplazado_por`, `total_deuda` todos iguales); nace v3
   `activo=true, usuario='ROBINSON'`.
5. **T5** — linaje completo de la clave sintética: **3 filas totales, exactamente 1 activa**.
6. **T6** — intento manual de violar el índice único parcial (`INSERT` directo con `activo=true`
   para la misma clave, saltando la RPC): rechazado con `unique_violation` — la garantía es de la
   base, no solo de la lógica de la función.
7. **T7** — cross-org (Francis, admin de `bayolsale`) intenta reemplazar la clave de `nexus-pro`:
   rechazado con `'No autorizado.'` — el guard de organización sigue intacto.
8. **T8** — `anon` intenta llamar la RPC directo (sin `request.jwt.claims`): rechazado (permiso
   denegado a nivel de `GRANT`, ni siquiera llega a evaluar el cuerpo de la función).
9. **T9** — período vacío: rechazado con `'Falta el período.'` — las validaciones no cambiaron.
10. **T10** — `authenticated` intenta `INSERT`/`DELETE` DIRECTO a la tabla, saltando la RPC: ambos
    rechazados con `insufficient_privilege` — la escritura sigue exclusiva de la RPC.

## Verificación independiente de cero residuos (aparte de la prueba, regla #2 de la metodología)

```sql
SELECT count(*) FROM public.cuadre_tss_historial
WHERE periodo IN ('TEST-9999-98','X-DIRECTO') OR empresa_nom IN ('EMPRESA_PRUEBA_APPENDONLY_POST','Y-DIRECTO');
-- → 0
```

Las 2 filas reales, confirmadas de nuevo con la misma lectura de arriba: sin cambio.

## Confirmación: la función en producción ya NO contiene `DELETE`

```sql
SELECT pg_get_functiondef('public.seguros_guardar_cuadre_tss(text,text,numeric,jsonb,boolean)'::regprocedure)
  LIKE '%DELETE FROM public.cuadre_tss_historial%';
-- → false
```

## `seguros_diagnostico_financiero()` — sigue `ok:true`, sin tocar su propia definición

```json
{"ok":true,"ast_baja":0,"deuda_descuadra":0,"pagado_descuadra":0,"asientos_no_positivos":0,
 "asientos_desbalanceados":0,"abonos_huerfanos":1,"cobros_sin_agente":2,"facturas_huerfanas":3,
 "cobros_sin_referencia":8,"cobros_transfer_sin_banco":10,"verificado_en":"2026-08-15T12:09:09Z"}
```

Los contadores de anomalías (`abonos_huerfanos`, `cobros_sin_agente`, `facturas_huerfanas`,
`cobros_sin_referencia`, `cobros_transfer_sin_banco`) son los mismos preexistentes ya documentados
en bloques anteriores de este engagement — sin relación con `cuadre_tss_historial`. Los contadores
de integridad financiera real (`deuda_descuadra`, `pagado_descuadra`, `asientos_desbalanceados`,
`asientos_no_positivos`, `ast_baja`) están todos en **0**. No se tocó la definición de esta función
en ningún momento de este bloque.

## Frontend migrado

`window.nxTssVerHistorial` (`parches.js`) — único cambio en todo el frontend relacionado con
`cuadre_tss_historial` (confirmado por grep global, la única línea de código que la referencia):

```js
data = await _api.get('cuadre_tss_historial', 'select=*&activo=eq.true&order=created_at.desc&limit=300');
```

Antes: `'select=*&order=created_at.desc&limit=300'` (sin filtro — con el historial ahora
acumulando versiones, habría empezado a mostrar duplicados por período+empresa). El guardado
(`nxTssGuardarHistorial`, ya migrado a la RPC desde el cierre original de 4D-2) no se tocó — sigue
llamando a `rpc/seguros_guardar_cuadre_tss` igual que antes. **No se construyó ningún visor de
versiones anteriores**, y no se reintrodujo ningún GET-check/DELETE/POST del lado del cliente —
tal como pedía la autorización.

## Verificación del frontend

- `node --check parches.js` — limpio.
- Los 4 bloques `<script>` sin `src=` de `index.html` compilan con `new Function()` (1423, 1205,
  534421, 681 caracteres).
- `version.json` es JSON válido; `version` (56.33) == `APP_VERSION`.
- Harness (Node, código real extraído de `parches.js` por balance de llaves — no una
  reconstrucción a mano): la llamada real a `_api.get(...)` capturada confirma
  `table='cuadre_tss_historial'` y `q` contiene `activo=eq.true`.
- Grep global: `cuadre_tss_historial` aparece **una sola vez** en todo `parches.js`/`index.html` —
  esa misma línea. Cero escrituras REST directas, cero otro lector.

## Regla dura respetada

No se tocó 4D-3 (`pagos`) ni 4C (`transferencias_agentes`). No se modificó 4A/4B/4D-1. No se limpió
ninguna anomalía histórica de datos ajena a este bloque. No se tocó `seguros_diagnostico_financiero()`.
No se borró ninguna versión antigua/sustituida — el append-only es justamente lo que lo impide.

## Publicación

Rama `claude/cuadre-tss-appendonly` → PR
[#276](https://github.com/sterlinr08-dte/nexus-pro/pull/276) → fusionada a `main` (squash) en
`4aa920b`. `mergeable_state` ya estaba `"clean"` al momento de fusionar (Cloudflare Workers Build,
el único check configurado en el repo, ya había terminado con éxito). Confirmado `origin/main` en
`4aa920b` tras la fusión — mismo criterio de siempre: commit real en `main` + build de Cloudflare ya
exitoso para ese árbol (este entorno no tiene salida a `nexusprord.com` para verificar en vivo desde
aquí).

## Cierre

**Bloque 4D-2 append-only queda cerrado — backend y frontend en producción, verificados de punta a
punta.** `cuadre_tss_historial` ya nunca pierde una versión al reemplazarse: la anterior queda
marcada `activo=false` con quién y cuándo la reemplazó, la nueva nace `activo=true` con su número de
versión, y un índice único parcial garantiza a nivel de base que nunca hay 2 versiones activas de la
misma clave al mismo tiempo. 11/11 pruebas contra la RPC real desplegada, cero residuos, `seguros_
diagnostico_financiero()` intacto y `ok:true`.

Con esto se cierra por completo el hallazgo de la revisión externa del dueño — la crítica original
("el DELETE destruye exactamente la evidencia histórica que la tabla existe para proteger") queda
resuelta de raíz.

**Esperando revisión cruzada de ChatGPT antes de abrir 4D-3 o 4C**, tal como pedía la autorización.
No se toca ninguno de los dos hasta entonces.
