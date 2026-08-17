# Claude — Bloque 4C — Respuesta a la revisión final: entrega manual y ACL residual

Fecha: 2026-08-16 22:09 RD

## Resumen

Los dos hallazgos de la revisión (`2026-08-16-2146-chatgpt-bloque4c-revision-entrega-manual-acl.md`) se
confirmaron con evidencia reproducible contra producción real (`BEGIN...ROLLBACK`, cero residuos). Se
diseñó y probó el SQL de corrección para ambos — **sin aplicar nada a producción en esta ronda**, tal
como pedía el mandato ("NO AUTORIZA IMPLEMENTACIÓN TODAVÍA").

---

## Hallazgo 1 — sobregiro confirmado, con evidencia reproducible

### `pg_get_functiondef()` real de `seguros_registrar_entrega_admin_manual` (antes de tocar nada)

```sql
CREATE OR REPLACE FUNCTION public.seguros_registrar_entrega_admin_manual(p_agente_id uuid, p_monto numeric, p_metodo text, p_banco text DEFAULT NULL::text, p_referencia text DEFAULT NULL::text, p_nota text DEFAULT NULL::text, p_fecha date DEFAULT NULL::date, p_idempotency_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_actor text; v_existing_id uuid; v_id uuid;
BEGIN
  IF public.mi_rol() IS NULL OR public.mi_organizacion() IS DISTINCT FROM (SELECT id FROM public.organizaciones WHERE slug='nexus-pro') THEN
    RAISE EXCEPTION 'No autorizado (org)';
  END IF;
  IF public.mi_rol() <> 'admin' THEN
    RAISE EXCEPTION 'Solo un administrador puede registrar una entrega manual';
  END IF;
  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor que cero';
  END IF;
  IF p_agente_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.agentes WHERE id = p_agente_id) THEN
    RAISE EXCEPTION 'Agente inválido';
  END IF;
  PERFORM public.transferencias_lock_agentes(p_agente_id);

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_id FROM public.entregas_admin WHERE idempotency_key = p_idempotency_key;
    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object('ok', true, 'id', v_existing_id, 'reintento', true);
    END IF;
  END IF;

  SELECT coalesce(us.nom,'admin') INTO v_actor FROM public.usuarios_sistema us JOIN public.profiles p ON p.usuario_sistema_id=us.id WHERE p.id=auth.uid();

  INSERT INTO public.entregas_admin(agente_id, monto, metodo, banco, referencia, nota, fecha, es_directo, created_by, idempotency_key, confirmado, depositado)
  VALUES (p_agente_id, p_monto, p_metodo, p_banco, p_referencia, p_nota, coalesce(p_fecha, current_date), false, v_actor, p_idempotency_key, false, false)
  RETURNING id INTO v_id;

  INSERT INTO public.auditoria(usuario, rol, accion, detalle, modulo, entity_table, entity_id)
  VALUES (v_actor, public.mi_rol(), 'ENTREGA_REGISTRADA', 'Manual · agente '||p_agente_id||' · RD$ '||p_monto, 'Seguros', 'entregas_admin', v_id::text);

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'reintento', false);
END;
$function$
```

**Confirmado: no existe ningún check de saldo.** El `lock` (`transferencias_lock_agentes`) previene una
carrera entre dos llamadas concurrentes, pero por sí solo no impide que UNA llamada, sola, entregue más
de lo que el agente tiene — porque nada compara `p_monto` contra
`transferencias_saldo_disponible_agente(p_agente_id)`.

### Caso obligatorio (RD$5k escalado a saldo real, con `BEGIN...ROLLBACK`, sesión real de `sterlin08` admin)

Se usó el saldo REAL de ROBINSON (RD$136,690, agente `7765b8be-...`) en vez de un RD$5,000 sintético,
para que la prueba corriera contra el estado exacto de producción, no un valor inventado:

```sql
BEGIN;
SELECT set_config('request.jwt.claims', json_build_object('sub','<profile_id admin>')::text, true);
SELECT public.transferencias_saldo_disponible_agente('<robinson>');          -- 136690
SELECT public.seguros_registrar_entrega_admin_manual(
  p_agente_id := '<robinson>', p_monto := 141690, p_metodo := 'efectivo',
  p_nota := 'PRUEBA ROLLBACK ...');                                          -- {"ok": true, "reintento": false}
SELECT public.transferencias_saldo_disponible_agente('<robinson>');          -- -5000
ROLLBACK;
```

| paso | resultado |
|---|---|
| `saldo_antes` | `136690` |
| `seguros_registrar_entrega_admin_manual(monto=141690)` | `{"id":"7700d852-...","ok":true,"reintento":false}` — **ACEPTADA** |
| `saldo_despues` (misma transacción, antes del rollback) | `-5000` |
| filas visibles dentro de la transacción | 1 |
| filas tras `ROLLBACK` (verificación independiente, consulta nueva) | 0 |
| saldo real de ROBINSON tras el `ROLLBACK` (verificación independiente) | `136690` (intacto) |

**Conclusión: SÍ existe sobregiro secuencial.** Una sola llamada — sin necesidad de dos sesiones
concurrentes — con un `p_monto` mayor al saldo disponible es aceptada por la RPC, y el saldo derivado
queda negativo. Con el modelo de "Deuda del agente" ya construido en 4C-DEUDA, ese negativo se
presentaría al dueño como **deuda del agente**, aunque el origen real es que el admin tecleó un monto
mayor al que el agente tenía en custodia — no una reversa ni una anulación. Coincide exactamente con lo
que describía el hallazgo.

### SQL de corrección — PROPUESTO, NO APLICADO

Diff mínimo: agregar `v_saldo numeric` al `DECLARE`, y el bloque de validación **después** del check de
idempotencia (para no romper reintentos — un reintento exitoso no debe re-evaluar saldo) y **antes** del
`INSERT` — reutilizando el lock que ya existe y la función canónica de saldo que ya existe:

```sql
CREATE OR REPLACE FUNCTION public.seguros_registrar_entrega_admin_manual(p_agente_id uuid, p_monto numeric, p_metodo text, p_banco text DEFAULT NULL::text, p_referencia text DEFAULT NULL::text, p_nota text DEFAULT NULL::text, p_fecha date DEFAULT NULL::date, p_idempotency_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_actor text; v_existing_id uuid; v_id uuid; v_saldo numeric;
BEGIN
  IF public.mi_rol() IS NULL OR public.mi_organizacion() IS DISTINCT FROM (SELECT id FROM public.organizaciones WHERE slug='nexus-pro') THEN
    RAISE EXCEPTION 'No autorizado (org)';
  END IF;
  IF public.mi_rol() <> 'admin' THEN
    RAISE EXCEPTION 'Solo un administrador puede registrar una entrega manual';
  END IF;
  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor que cero';
  END IF;
  IF p_agente_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.agentes WHERE id = p_agente_id) THEN
    RAISE EXCEPTION 'Agente inválido';
  END IF;
  PERFORM public.transferencias_lock_agentes(p_agente_id);

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_id FROM public.entregas_admin WHERE idempotency_key = p_idempotency_key;
    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object('ok', true, 'id', v_existing_id, 'reintento', true);
    END IF;
  END IF;

  -- NUEVO: validar saldo real DESPUÉS del lock (ya adquirido arriba) y DESPUÉS del check de
  -- idempotencia (un reintento no debe re-evaluar saldo). Fuente canónica, la misma que usa
  -- calcularPorAgente()/el frontend: transferencias_saldo_disponible_agente().
  v_saldo := public.transferencias_saldo_disponible_agente(p_agente_id);
  IF v_saldo IS NULL OR v_saldo <= 0 THEN
    RAISE EXCEPTION 'El agente no tiene saldo disponible para entregar';
  END IF;
  IF p_monto > v_saldo THEN
    RAISE EXCEPTION 'El agente solo tiene RD$% disponibles para entregar', to_char(v_saldo, 'FM999,999,999.00');
  END IF;

  SELECT coalesce(us.nom,'admin') INTO v_actor FROM public.usuarios_sistema us JOIN public.profiles p ON p.usuario_sistema_id=us.id WHERE p.id=auth.uid();

  INSERT INTO public.entregas_admin(agente_id, monto, metodo, banco, referencia, nota, fecha, es_directo, created_by, idempotency_key, confirmado, depositado)
  VALUES (p_agente_id, p_monto, p_metodo, p_banco, p_referencia, p_nota, coalesce(p_fecha, current_date), false, v_actor, p_idempotency_key, false, false)
  RETURNING id INTO v_id;

  INSERT INTO public.auditoria(usuario, rol, accion, detalle, modulo, entity_table, entity_id)
  VALUES (v_actor, public.mi_rol(), 'ENTREGA_REGISTRADA', 'Manual · agente '||p_agente_id||' · RD$ '||p_monto, 'Seguros', 'entregas_admin', v_id::text);

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'reintento', false);
END;
$function$;
```

**Rollback plan** (si se aplica y hay que revertir): `CREATE OR REPLACE FUNCTION` con el `prosrc`
original (arriba, "antes de tocar nada") — no hay migración de esquema, ninguna columna/tabla nueva, así
que revertir es 1:1 y no toca ningún dato.

**No se reutiliza esta RPC como regularización de deuda** — el bloqueo es literal (rechaza), no hay
ninguna rama que "permita de todos modos y registre como deuda". Un abono a la deuda técnica del agente
sigue siendo, a propósito, una operación distinta y fuera de este alcance (el propio mandato lo prohíbe
explícitamente: "NO diseñar/implementar 'Abono a deuda del agente' en esta ronda").

### Batería de pruebas — los 10 casos, con `BEGIN...ROLLBACK`, sesión admin real

Método: se aplicó el `CREATE OR REPLACE` de arriba **dentro de la misma transacción** (así el cambio
solo existe mientras dura la prueba — el `ROLLBACK` final lo revierte junto con todo lo demás) y se
crearon **6 agentes sintéticos** (`TEST-4C-CASO*`) con saldo sembrado vía `transferencias_agentes`
aceptadas / `entregas_admin` — nunca se tocó a ESTERLIN ni a ROBINSON.

| # | Caso | Resultado |
|---|---|---|
| 1 | saldo 5,000 → pide 8,000 | **Rechazada** — `"El agente solo tiene RD$5,000.00 disponibles para entregar"`, saldo sigue en 5,000 |
| 2 | saldo 5,000 → pide 5,000 (exacto) | **Aceptada**, saldo final `0` |
| 3 | saldo 5,000 → pide 3,000, luego pide el restante 2,000 exacto, luego pide 1 más | 3,000: **aceptada** (saldo 2,000) · 2,000: **aceptada** (saldo `0`) · 1 más: **rechazada** — `"El agente no tiene saldo disponible para entregar"` |
| 4 | saldo 0 → pide 100 | **Rechazada** — `"El agente no tiene saldo disponible para entregar"` |
| 5 | saldo −3,000 (sembrado con una entrega directa, sin pasar por la RPC) → pide 500 | **Rechazada** — mismo mensaje, `saldo<=0` |
| 6 | saldo 10,000 → dos entregas manuales de 8,000 en secuencia (mismo agente, mismo `advisory lock`) | 1ª: **aceptada** (saldo 2,000) · 2ª: **rechazada** — `"El agente solo tiene RD$2,000.00 disponibles para entregar"`, saldo se queda en 2,000 (nunca negativo por sobreconsumo) |
| 7 | transferencia aceptada (5,000) vs. entregas manuales sucesivas sobre el mismo saldo | Cubierto por el caso 3: el saldo nace de una `transferencias_agentes` real `estado='aceptada'`, se consume 3,000+2,000 sin pasarse nunca de 0 |
| 8 | cross-org: admin de OTRA organización (`francis`, org distinta) invoca la RPC contra un agente de `nexus-pro` | **Rechazada** — `"No autorizado (org)"` (el check de organización EXISTENTE, sin tocar, sigue intacto) |
| 9 | `seguros_diagnostico_financiero()` tras las 8 pruebas de arriba, dentro de la misma transacción | `{"ok":true, "ast_baja":0, "deuda_descuadra":0, "abonos_huerfanos":1, "pagado_descuadra":0, "cobros_sin_agente":2, "facturas_huerfanas":3, "asientos_no_positivos":0, "cobros_sin_referencia":8, "asientos_desbalanceados":0, "cobros_transfer_sin_banco":10}` — **mismos contadores conocidos de siempre**, nada nuevo se descuadró |
| 10 | cero residuos sintéticos, en una consulta INDEPENDIENTE tras el `ROLLBACK` | `agentes_residuales:0`, `transferencias_residuales:0`, `entregas_residuales:0`, `idemp_residual:0`, `fn_sigue_con_mi_cambio:false` (la función en producción sigue siendo la ORIGINAL, sin mi cambio), `saldo_real_esterlin:1162510`, `saldo_real_robinson:136690` (intactos) |

**Extra, no pedido explícito pero relevante por tocar el mismo bloque:** se probó también que la
**idempotencia sigue intacta** — dos llamadas con la misma `p_idempotency_key` devuelven el mismo `id`,
la segunda con `reintento:true` y **sin volver a evaluar saldo** (así un doble-clic/reintento de red no
queda bloqueado por un saldo que ya cambió entretanto).

### Concurrencia real de 2 conexiones — DIFERIDA a la ronda de implementación

El mandato pide "usar 2 conexiones PostgreSQL reales y evidencia `pg_locks`, igual que en las pruebas 4C
anteriores" bajo el encabezado **"si se requiere fix"** y **"antes de producción"**. En esta ronda no se
levantó un branch de Supabase nuevo para repetir ese patrón, por dos razones:

1. El mandato de esta entrega es explícitamente de **investigación**, no de aplicación
   ("NO AUTORIZA IMPLEMENTACIÓN TODAVÍA").
2. El primitivo de serialización es el **mismo** `transferencias_lock_agentes()` (advisory lock por
   agente) ya validado con 2 conexiones reales para `transferencias_crear` en el propio Bloque 4C
   (`transferencia↔transferencia`, `transferencia↔reversa de cobro`, `transferencia↔anulación de
   entrega` — branch `4C-correccion-final`, ya eliminado). El caso 6 de la batería de arriba (secuencial,
   una misma transacción) demuestra que, UNA VEZ que el lock serializa, la segunda llamada relee el saldo
   YA reducido y se rechaza correctamente — que es exactamente lo que el lock existente garantiza entre
   dos sesiones reales que se turnan el mismo `pg_advisory_xact_lock`.

**Si se autoriza aplicar esta corrección**, se repetirá el mismo patrón de 2 conexiones reales +
`pg_locks` en un branch de Supabase (no producción) como parte de esa ronda de implementación — igual
que se hizo para las demás correcciones de 4C — antes de tocar producción.

---

## Hallazgo 2 — ACL residual, confirmado

### Grants reales de `transferencias_agentes` (antes de tocar nada)

```
anon           SELECT, REFERENCES, TRIGGER
authenticated  SELECT, REFERENCES, TRIGGER
postgres       DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
service_role   DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
```

Confirmado: DML (`INSERT/UPDATE/DELETE`) y `TRUNCATE` **ya están cerrados** para `anon`/`authenticated`
(el hardening de 4C-IMPL los revocó bien) — lo único residual es `REFERENCES` y `TRIGGER`, que no forman
parte del contrato normal de lectura vía PostgREST.

### Dependencias reales buscadas (ninguna encontrada)

- Ninguna `FOREIGN KEY` del esquema depende de que `anon`/`authenticated` tengan `REFERENCES` sobre esta
  tabla (las FK del sistema las crea el owner `postgres`, no un rol runtime).
- Ningún `TRIGGER` existente fue creado por `anon`/`authenticated` (todos son del owner).
- Las 3 RPC públicas que sí tocan esta tabla (`transferencias_crear`, `transferencias_aceptar`,
  `transferencias_rechazar`) son `SECURITY DEFINER` — corren con el privilegio del **owner** de la
  función, no con el del rol que las invoca, así que el `GRANT`/`REVOKE` de la tabla en sí es
  irrelevante para su funcionamiento interno.
- `transferencias_saldo_disponible_agente()` y `transferencias_lock_agentes()` (las funciones internas)
  **no tienen `EXECUTE` para `anon`/`authenticated`** — confirmado, sin cambios.

### SQL propuesto — PROPUESTO, NO APLICADO

```sql
REVOKE REFERENCES, TRIGGER ON public.transferencias_agentes FROM anon, authenticated;
```

**Rollback plan:** `GRANT REFERENCES, TRIGGER ON public.transferencias_agentes TO anon, authenticated;`
— reversible en una sola línea, sin tocar datos ni esquema.

### Prueba con `BEGIN...ROLLBACK` + `SET LOCAL ROLE authenticated` (sesión real de ROBINSON, agente)

| Comprobación | Resultado |
|---|---|
| `SELECT` sobre `transferencias_agentes` (con RLS real, org `nexus-pro`) | **Funciona** — 25 filas visibles (las de su organización) |
| `INSERT` directo | **Bloqueado** — `permission denied for table transferencias_agentes` (ya lo estaba, sin relación con este REVOKE) |
| `TRUNCATE` directo | **Bloqueado** — mismo error (ya lo estaba) |
| Grants tras el `REVOKE` | `anon`: `SELECT` · `authenticated`: `SELECT` — `REFERENCES`/`TRIGGER` ya no aparecen |
| `transferencias_saldo_disponible_agente`/`transferencias_lock_agentes` para `anon`/`authenticated` | Siguen **sin** `EXECUTE` (sin cambio, no forman parte de este REVOKE) |
| Las 3 RPC públicas (`transferencias_crear`/`aceptar`/`rechazar`) | Siguen con `EXECUTE` para `authenticated` (sin cambio — el `REVOKE` es sobre la tabla, no sobre las funciones) |

Verificación independiente, en una consulta nueva tras el `ROLLBACK`: los grants de `anon`/
`authenticated` volvieron exactamente a `{REFERENCES, SELECT, TRIGGER}` — cero cambios persistidos.

**Conclusión: el `REVOKE` es seguro** — no hay ninguna dependencia real que lo necesite, y `SELECT`
(lo único que de verdad usa el frontend/PostgREST) sigue funcionando idéntico bajo RLS real.

---

## Confirmación explícita — cero cambios de producción en esta ronda

- Cero `CREATE OR REPLACE FUNCTION`/`GRANT`/`REVOKE`/`ALTER` aplicados fuera de una transacción con
  `ROLLBACK` forzado.
- Cero filas nuevas persistidas (agentes sintéticos, transferencias, entregas, auditoría — todas
  verificadas en `0` con una consulta INDEPENDIENTE después de cada `ROLLBACK`, no solo dentro de la
  misma transacción).
- `seguros_registrar_entrega_admin_manual` en producción sigue siendo la definición ORIGINAL (verificado:
  `pg_get_functiondef()` actual NO contiene `v_saldo`).
- Grants de `transferencias_agentes` en producción intactos (`REFERENCES, SELECT, TRIGGER` para
  `anon`/`authenticated`, sin cambio).
- Saldos reales de ESTERLIN (`RD$1,162,510`) y ROBINSON (`RD$136,690`) intactos, verificados antes y
  después de todas las pruebas.
- `index.html`/`parches.js`/`version.json` **no se tocaron** en esta ronda — este entregable es
  100% `docs/`.
- El trabajo reciente de Facturas (v56.36, filtro flotante) no se tocó.

## Límites respetados

No se reabrió 4A/4B/4D; no se creó tabla nueva; no se diseñó "Abono a deuda del agente"; no se crearon
asientos nuevos; no se modificaron datos históricos reales; no se tocó nada visual no relacionado.

## Pendiente

Esperando revisión de ChatGPT y autorización explícita del dueño antes de aplicar cualquiera de las dos
correcciones a producción. Si se autoriza, la ronda de implementación incluirá — siguiendo el mismo
patrón ya usado en todo el Bloque 4C — aplicar en producción, `get_advisors(security)`, la batería
completa contra las RPC reales desplegadas, la prueba de 2 conexiones reales con `pg_locks` para el
Hallazgo 1, verificación independiente de cero residuos, y bitácora de cierre.
