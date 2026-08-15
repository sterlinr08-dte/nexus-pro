# Claude — Bloque 4D-2 REVISIÓN — `cuadre_tss_historial` append-only (diseño corregido, SIN aplicar)

Fecha: 2026-08-15 (RD)

## El hallazgo, tal cual llegó

Tras cerrar 4D-2 (backend + frontend en producción, ver
`2026-08-15-1130-claude-bloque4d2-cierre.md`), el dueño trajo una revisión externa con un punto
que no se había resuelto: la RPC `seguros_guardar_cuadre_tss` cierra correctamente el hueco de
seguridad (ACL/TRUNCATE/actor spoofeable), pero al "reemplazar" un cuadre, la implementación
sigue haciendo `DELETE` de la versión anterior + `INSERT` de la nueva. Eso resuelve atomicidad y
seguridad, pero **no** resuelve el problema de fondo: destruir la versión anterior al reemplazarla
elimina exactamente la evidencia histórica que una tabla llamada "historial" existe para proteger.
La corrección pedida: **append-only/versionado** — al recalcular un período, el registro anterior
debe conservarse como versión sustituida (con quién lo reemplazó y cuándo), y el nuevo nace como
versión activa. Sin eso, no se puede responder "¿qué decía el cuadre antes?", "¿quién lo
reemplazó?", "¿qué cambió?".

**Esta crítica es correcta y el diseño que se aplicó a producción en el cierre de 4D-2 tiene ese
hueco real.** Se documenta aquí sin minimizarlo — es un defecto de diseño mío, no del análisis de
seguridad (ese sí quedó bien cerrado), y se corrige antes de dejarlo pasar por alto.

## Primero: ¿se perdió algo ya?

Verificado con una lectura directa contra producción **antes** de tocar nada:

```sql
SELECT id, periodo, empresa_nom, usuario, total_deuda, created_at
FROM public.cuadre_tss_historial ORDER BY created_at;
```

Siguen ahí exactamente las mismas 2 filas de siempre (`3fe7bed9-...` "LAS MATAS" 55000,
`06a62f27-...` "PLAN VOLUNTARIO HUMANO" 36500, ambas de `2026-06-13`, antes de que esta sesión
existiera). **Nadie ha llamado `p_reemplazar:true` desde que la RPC quedó en vivo** — el defecto
es real pero todavía no se ha materializado en ninguna pérdida de datos. Hay margen para corregirlo
antes de que el primer reemplazo real ocurra.

## El diseño corregido: append-only

**Migración propuesta** (columnas nuevas + índice, todas aditivas):

```sql
ALTER TABLE public.cuadre_tss_historial
  ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reemplazado_en timestamptz,
  ADD COLUMN IF NOT EXISTS reemplazado_por text;

CREATE UNIQUE INDEX IF NOT EXISTS cuadre_tss_historial_activo_unico
  ON public.cuadre_tss_historial (periodo, empresa_nom)
  WHERE activo;
```

- `activo` — solo la versión ACTIVA cuenta para efectos de "¿ya existe esto?"/duplicado.
- `version` — número secuencial dentro del linaje de esa clave (periodo+empresa_nom); útil para
  mostrar "v1"/"v2"/"v3" y para ordenar sin depender solo de `created_at`.
- `reemplazado_en`/`reemplazado_por` — cuándo y quién (resuelto server-side, mismo criterio que
  `usuario`) hizo que ESTA fila específica dejara de ser la vigente. `usuario` (ya existente) sigue
  siendo quién CREÓ esa versión — nunca se reescribe — así que cada fila responde por sí sola "quién
  la hizo" y "quién la reemplazó", sin necesitar ningún join.
- **Índice único parcial** — garantía de base de datos, no solo de la RPC: nunca puede haber 2 filas
  activas para la misma (periodo, empresa_nom) al mismo tiempo, sin importar qué camino de escritura
  se use. Defensa en profundidad, mismo criterio ya aplicado en el resto de este engagement.

**Reescritura de `seguros_guardar_cuadre_tss`** (solo cambia el bloque de reemplazo — guards de
rol/organización, `pg_advisory_xact_lock`, resolución server-side del actor: sin cambios):

```sql
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
```

El `DELETE` desapareció por completo. El `duplicado`-check ahora filtra `activo` explícitamente
(antes miraba `ORDER BY created_at DESC LIMIT 1` sobre TODAS las filas de la clave — con el
historial acumulándose, eso habría sido ambiguo/incorrecto sin el filtro).

**Qué responde esto, en los términos exactos de la crítica:**
- *"¿Qué decía el cuadre antes?"* — la fila vieja sigue en la tabla, con su `resumen`/`total_deuda`
  originales intactos, nunca reescritos.
- *"¿Quién lo reemplazó?"* — `reemplazado_por` en la fila vieja (y `usuario` en la fila nueva, que
  es la misma persona salvo que dos actores distintos operen turnos distintos — se probó
  explícitamente que pueden diferir, ver T4 abajo).
- *"¿Qué cambió?"* — no se construye un diff automático en esta ronda (no se pidió, y hacerlo bien
  requeriría decidir un formato de presentación) — pero los datos crudos de AMBAS versiones quedan
  disponibles para calcularlo, por SQL directo o por una futura UI, sin fingir una función que hoy
  no existe.

## Propuesta de frontend (descrita, NO aplicada)

`window.nxTssVerHistorial` (`parches.js`) hoy hace `select=*&order=created_at.desc&limit=300` sin
ningún filtro. Con append-only, esa lista empezaría a acumular TODAS las versiones (activas y
sustituidas) de cada período+empresa según se vayan reemplazando. Para no cambiar la experiencia
actual sin que se pida (hoy se ve exactamente 1 fila por período+empresa), la propuesta es agregar
`&activo=eq.true` al filtro por defecto — el historial completo queda preservado en la tabla y
disponible para quien lo consulte directo, pero la pantalla sigue mostrando lo mismo que hoy. Un
visor de "versiones anteriores" por cuadre sería un paso aparte, a pedido explícito — no se
construye por inferencia.

## Verificación — batería con rollback forzado contra producción real

Metodología obligatoria (`docs/METODOLOGIA-PRUEBAS-DESTRUCTIVAS.md`): DDL + función + pruebas +
aserciones, todo dentro de la MISMA transacción implícita de una sola llamada, terminando siempre
en un `RAISE EXCEPTION` forzado — sin ningún camino que llegue a `COMMIT`.

**Nota honesta de método:** el primer intento de esta batería falló en la aserción T2 — pero el
fallo era del **harness**, no de la RPC: las aserciones comparaban el estado de la fila de T1
leído al FINAL de todo el script (después de que T3/T4 ya la habían reemplazado legítimamente),
en vez de comparar contra un snapshot tomado justo después de T2. Corregido tomando snapshots
inmediatos después de cada paso relevante (`snap_post_T1`, `snap_post_T2`, `snap_post_T3_v1/v2`,
`snap_post_T4_v1/v2/v3`) y comparando esos snapshots entre sí, no el estado final contra el
histórico. Con eso corregido, la batería completa pasó.

**Resultado: 8/8 aserciones — `ROLLBACK_FORZADO_FIN_DE_PRUEBA: 8 aserciones OK, deshaciendo todo
(intencional)`.**

1. **T1** — primer guardado (clave sintética `TEST-9999-99`/`EMPRESA_PRUEBA_ROLLBACK_4D2`, admin
   nexus-pro): nace `activo=true, version=1`.
2. **T2** — mismo guardado, `p_reemplazar=false` → `duplicado:true`, `existente_id` = el de T1;
   snapshot de la fila de T1 tomado justo después de T2 es **idéntico byte a byte** al tomado justo
   después de T1 (nadie la tocó).
3. **T3** — reemplazo real (v1→v2): la fila de T1 queda `activo=false`, `reemplazado_en`/
   `reemplazado_por` seteados, **sus datos originales (`total_deuda:1000`,
   `resumen:{"totalDeuda":1000}`) intactos**; nace una fila nueva `activo=true, version=2`.
4. **T4** — segundo reemplazo (v2→v3), con OTRO actor (ROBINSON en vez de Administrador): la fila
   de v2 queda `activo=false, reemplazado_por='ROBINSON'`; la fila de v1 (ya inactiva desde T3)
   **no se vuelve a tocar** (snapshot idéntico al tomado justo después de T3); nace v3
   `activo=true, version=3`.
5. **Linaje completo** — para la clave sintética quedan **3 filas** (todo el historial preservado),
   **exactamente 1 activa**.
6. **T5** — intento manual de violar el índice único parcial (insertar una 2da fila `activo=true`
   para la misma clave, con privilegios elevados, saltando la RPC): rechazado por
   `duplicate key value violates unique constraint` — la garantía es de la base, no solo de la
   lógica de la función.
7. **T6** — cross-org (Francis, admin de `bayolsale`) intenta reemplazar la clave de `nexus-pro`:
   sigue rechazado con `'No autorizado.'` — el guard de organización no cambió.
8. **T8** — período vacío sigue rechazado con `'Falta el período.'` — las validaciones no cambiaron.

**Verificación independiente de cero residuos** (consulta de solo lectura, aparte de la prueba,
regla #2 de la metodología):

- `SELECT count(*) FROM cuadre_tss_historial WHERE periodo='TEST-9999-99'` → **0**.
- Las 2 filas reales siguen exactamente igual (mismos ids, mismos montos, mismos `created_at`).
- `information_schema.columns` de la tabla: de vuelta a las **8** columnas originales (sin
  `activo`/`version`/`reemplazado_en`/`reemplazado_por`) — la `ALTER TABLE` se revirtió.
- `pg_indexes`: de vuelta a solo `cuadre_tss_historial_pkey` + `idx_cuadre_tss_periodo` — el índice
  único parcial nuevo se revirtió.
- `pg_proc.prosrc` de `seguros_guardar_cuadre_tss` sigue conteniendo
  `DELETE FROM public.cuadre_tss_historial` — confirma que la función en producción **sigue siendo
  la versión actual (con el defecto), sin ningún cambio aplicado** por esta prueba.

## Estado

**Diseño corregido, probado con rollback forzado (8/8), publicado — NADA aplicado a producción
todavía.** La RPC en vivo sigue siendo la versión que hace `DELETE`+`INSERT` en el reemplazo — el
hueco de seguridad original (TRUNCATE/ACL/actor spoofeable) sigue cerrado y en producción, eso no
cambia; lo que falta es reemplazar el mecanismo de "reemplazar" por el append-only de arriba.

Sin autorización explícita de implementación no se toca producción, mismo protocolo de siempre —
ver `docs/BITACORA-CHATGPT-CLAUDE.md` y el resto de "revisiones" de este engagement (4B rev2,
4D-1 rev2) como precedente idéntico.
