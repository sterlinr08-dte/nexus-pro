## Claude — 2026-08-17 21:32

# Bloque 2C-3 — DISEÑO PROBADO, NO APLICADO A PRODUCCIÓN

Continuación del cierre de la auditoría Fase 2C (`docs/bitacora/2026-08-17-0844-claude-fase2c-auditoria-16-tablas.md`,
hallazgo **H1**, CRÍTICO). Este documento **NO modifica producción** — es la propuesta completa,
probada a fondo en un branch de Supabase desechable (ya eliminado), a la espera de autorización
explícita del dueño para aplicarla. Mismo patrón de los bloques 2A/3A/3B/3C/4A/4B/4C/4D/2C-1 de
esta misma serie: auditoría → diseño → prueba en branch → propuesta publicada → autorización → aplicar.

## El problema (H1)

`facturas` tiene una sola policy `all_facturas` (`FOR ALL TO authenticated`) con un único predicado
de organización, sin distinción de columna:

```sql
using (mi_rol() is not null and mi_organizacion() = (select id from organizaciones where slug='nexus-pro'))
```

`nxEditarPrecioFactura(fid)` (`index.html:7678`) hace un `PATCH` directo de
`facturas.prima_base/prima_deps/total` vía PostgREST, con el ÚNICO gate de rol siendo un chequeo
**client-side** (`tienePermiso('modificar_precio')`) — spoofable trivialmente por cualquier usuario
`authenticated` de la organización con las devtools abiertas o un `curl` directo. Dos puntos de
entrada en el frontend, ambos con el mismo gate débil:

- `index.html:4929` — botón "Precio" en la tarjeta de factura (`!anul && f.estado!=='Pagado' &&
  tienePermiso('modificar_precio')`)
- `index.html:7459` — "Corregir el precio" en el menú contextual (`!anul && !pag &&
  tienePermiso('modificar_precio')`)

## Lógica de negocio a preservar (del código real de `nxEditarPrecioFactura`)

- `baseN = Math.max(0, nuevo - depsN)` — el monto que edita el usuario es la PRIMA DEL MES
  (base+deps), nunca el `base` puro; si el nuevo monto es menor que los dependientes ya facturados,
  `base` se pisa a 0 (nunca negativo).
- `totalN = baseN + depsN + deuda_ant` — el `total` de la factura arrastra la deuda anterior al
  sistema, que NO se toca en esta corrección.
- `diff = nuevo - primaAct` — se suma/resta al `clientes.deuda_total` del cliente dueño de la
  factura (nunca negativo, `GREATEST(0, ...)`).
- Guardas: rechaza si la factura está `Anulada` o `Pagado` (mensaje distinto en cada caso — "no
  se puede corregir: la factura está anulada" vs "no se cambia el precio de una factura ya pagada").
- Tras el cambio, **resincroniza el estado cacheado de TODAS las facturas no anuladas del cliente**
  (oldest-first, mismo algoritmo que `resyncEstadoFacturas`/`_saldoFacturasCliente` del frontend:
  reparte `clientes.pagado` factura por factura en orden de `periodo` y recalcula Pendiente/
  Parcial/Pagado) — porque cambiar el precio de una factura mueve el reparto del crédito ya pagado
  sobre las hermanas del mismo cliente, y su estado cacheado puede quedar obsoleto.

## Decisión de alcance (qué se incluye y qué se deja fuera, con su razón)

- **`facturas.estado` — FUERA de alcance de esta RPC, a propósito.** La misma policy `all_facturas`
  deja esa columna igual de expuesta que `prima_base`/`prima_deps`/`total` hoy — es un hallazgo
  relacionado pero DISTINTO (tiene su propio segundo punto de exposición: `regAbono()` en
  `index.html:8922` hace `PATCH` directo de `estado` tras cada cobro). Cerrarlo aquí habría mezclado
  dos superficies de ataque en una sola RPC. Queda como su propio sub-bloque futuro (candidato:
  "2C-4" o el que el dueño prefiera nombrar).
- **`clientes.precio_titular` (hacer el precio nuevo permanente) — FUERA de alcance.** El propio
  código de `nxEditarPrecioFactura` tiene una rama opcional para esto, pero es una decisión de
  negocio distinta (cambiar la prima futura del cliente, no solo corregir un mes ya facturado) — se
  deja para un sub-bloque aparte si el dueño lo pide explícito.
- **Sin `pg_advisory_xact_lock` + clave de idempotencia.** A diferencia de `seguros_registrar_cobro`
  (aditiva) o `seguros_anular_factura` (terminal, con un asiento de reversión que necesita
  correlacionarse en un reintento), esta RPC es una **corrección "SET a X"**: recalcula el diff
  contra el estado ACTUAL de la fila bajo `FOR UPDATE` en cada llamada — un reintento con el mismo
  monto objetivo encuentra `nuevo === prima_actual` y hace un no-op limpio (`sin_cambios:true`, sin
  tocar nada), sin necesitar ninguna máquina de idempotencia aparte. Es naturalmente idempotente por
  diseño, no por artificio.

## Diseño — SQL completo de la RPC

```sql
CREATE OR REPLACE FUNCTION public.seguros_corregir_precio_factura(
  p_factura_id uuid,
  p_nuevo_monto_mes numeric,
  p_motivo text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_rol text;
  v_fact public.facturas%ROWTYPE;
  v_cli_id uuid;
  v_prima_act numeric;
  v_deps_n numeric;
  v_base_n numeric;
  v_total_n numeric;
  v_diff numeric;
  v_nuevo int;
  v_prima_base_old numeric;
  v_prima_deps_old numeric;
  v_total_old numeric;
  v_deuda_total_nueva numeric;
  v_credito numeric;
  v_tot numeric;
  v_pay numeric;
  v_saldo numeric;
  v_nuevo_estado text;
  v_estado_final text;
  v_resync jsonb := '[]'::jsonb;
  r record;
BEGIN
  v_rol := public.mi_rol();
  IF v_rol IS NULL OR v_rol <> 'admin' THEN
    RAISE EXCEPTION 'No autorizado: corregir el precio de una factura requiere rol admin';
  END IF;
  IF public.mi_organizacion() IS DISTINCT FROM (SELECT id FROM public.organizaciones WHERE slug='nexus-pro') THEN
    RAISE EXCEPTION 'No autorizado: este módulo es exclusivo de la organización de seguros';
  END IF;

  IF p_nuevo_monto_mes IS NULL OR p_nuevo_monto_mes < 0 THEN
    RAISE EXCEPTION 'El nuevo precio debe ser un monto válido (>= 0)';
  END IF;
  v_nuevo := round(p_nuevo_monto_mes);

  SELECT * INTO v_fact FROM public.facturas WHERE id = p_factura_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura no encontrada';
  END IF;
  IF v_fact.estado = 'Anulada' THEN
    RAISE EXCEPTION 'No se puede corregir: la factura está anulada';
  END IF;
  IF v_fact.estado = 'Pagado' THEN
    RAISE EXCEPTION 'No se cambia el precio de una factura ya pagada. Si hay un error, anúlala.';
  END IF;

  v_prima_act := coalesce(v_fact.prima_base,0) + coalesce(v_fact.prima_deps,0);
  v_cli_id := v_fact.cliente_id;

  -- Idempotente por diseño: si el monto pedido ya es el que tiene la factura AHORA MISMO
  -- (bajo el lock de la fila), no hay nada que hacer — cubre reintentos de red sin necesitar
  -- clave de idempotencia ni tabla de bitácora aparte (a diferencia de seguros_anular_factura/
  -- seguros_registrar_cobro, que son aditivas/terminales y sí la necesitan).
  IF v_nuevo = round(v_prima_act) THEN
    SELECT deuda_total INTO v_deuda_total_nueva FROM public.clientes WHERE id = v_cli_id;
    RETURN jsonb_build_object(
      'ok', true, 'sin_cambios', true, 'factura_id', v_fact.id, 'cliente_id', v_cli_id,
      'prima_base', v_fact.prima_base, 'prima_deps', v_fact.prima_deps, 'total', v_fact.total,
      'estado', v_fact.estado, 'cliente_deuda_total', v_deuda_total_nueva
    );
  END IF;

  v_prima_base_old := coalesce(v_fact.prima_base,0);
  v_prima_deps_old := coalesce(v_fact.prima_deps,0);
  v_total_old := coalesce(v_fact.total,0);

  v_deps_n := v_prima_deps_old;
  v_base_n := GREATEST(0, v_nuevo - v_deps_n);
  v_total_n := v_base_n + v_deps_n + coalesce(v_fact.deuda_ant,0);
  v_diff := v_nuevo - v_prima_act;

  UPDATE public.facturas
     SET prima_base = v_base_n, prima_deps = v_deps_n, total = v_total_n
   WHERE id = v_fact.id;

  v_estado_final := v_fact.estado;

  IF v_cli_id IS NOT NULL THEN
    UPDATE public.clientes SET deuda_total = GREATEST(0, coalesce(deuda_total,0) + v_diff)
      WHERE id = v_cli_id
      RETURNING deuda_total INTO v_deuda_total_nueva;

    -- Reglamento seguros §9: el estado de factura es una CACHÉ. Cambiar el precio mueve el
    -- reparto oldest-first del pago del cliente — resincroniza TODAS sus facturas no anuladas
    -- (mismo algoritmo/orden que seguros_anular_factura, porteado tal cual).
    SELECT coalesce(pagado,0) INTO v_credito FROM public.clientes WHERE id = v_cli_id;
    FOR r IN
      SELECT id, coalesce(prima_base,0)+coalesce(prima_deps,0) AS tot, estado
      FROM public.facturas
      WHERE cliente_id = v_cli_id AND estado <> 'Anulada'
      ORDER BY periodo ASC
    LOOP
      v_tot := r.tot;
      v_pay := LEAST(v_credito, v_tot);
      v_saldo := GREATEST(0, v_tot - v_pay);
      v_credito := v_credito - v_pay;
      v_nuevo_estado := CASE WHEN v_saldo <= 0.009 THEN 'Pagado'
                              WHEN v_saldo < v_tot - 0.009 THEN 'Parcial'
                              ELSE 'Pendiente' END;
      IF v_nuevo_estado <> r.estado THEN
        UPDATE public.facturas SET estado = v_nuevo_estado WHERE id = r.id;
        v_resync := v_resync || jsonb_build_array(jsonb_build_object('id', r.id, 'estado', v_nuevo_estado));
      END IF;
      IF r.id = v_fact.id THEN
        v_estado_final := v_nuevo_estado;
      END IF;
    END LOOP;
  ELSE
    SELECT deuda_total INTO v_deuda_total_nueva FROM public.clientes WHERE id = v_cli_id;
  END IF;

  INSERT INTO public.auditoria(ts, usuario, rol, accion, detalle, modulo, entity_table, entity_id, old_data, new_data, result, origen, organizacion_id, cliente_id)
  VALUES (
    now()::text, public.mi_usuario_id()::text, v_rol, 'FACTURA_PRECIO_CORREGIDO',
    coalesce(v_fact.cliente_nom,'') || ' · ' || coalesce(v_fact.periodo,'') || ': '
      || v_prima_act || ' → ' || v_nuevo || ' · deuda '
      || (CASE WHEN v_diff>=0 THEN '+' ELSE '-' END) || abs(v_diff)
      || coalesce(' · Motivo: ' || nullif(btrim(p_motivo), ''), ''),
    'Facturas', 'facturas', v_fact.id::text,
    jsonb_build_object('prima_base', v_prima_base_old, 'prima_deps', v_prima_deps_old, 'total', v_total_old)::text,
    jsonb_build_object('prima_base', v_base_n, 'prima_deps', v_deps_n, 'total', v_total_n, 'facturas_resync', v_resync)::text,
    'OK', 'seguros_corregir_precio_factura', public.mi_organizacion(), v_cli_id
  );

  RETURN jsonb_build_object(
    'ok', true, 'sin_cambios', false, 'factura_id', v_fact.id, 'cliente_id', v_cli_id,
    'prima_base', v_base_n, 'prima_deps', v_deps_n, 'total', v_total_n, 'estado', v_estado_final,
    'prima_anterior', v_prima_act, 'prima_nueva', v_nuevo, 'diff', v_diff,
    'cliente_deuda_total', v_deuda_total_nueva, 'facturas_resync', v_resync
  );
END;
$function$;
```

## ACL propuesta — SQL completo

**Función:** solo `authenticated` (gateado internamente por `mi_rol()='admin'`) y `postgres`; `anon`
y `service_role` explícitamente excluidos — mismo patrón exacto que `seguros_anular_factura`.

```sql
REVOKE ALL ON FUNCTION public.seguros_corregir_precio_factura(uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seguros_corregir_precio_factura(uuid, numeric, text) TO authenticated, postgres;
-- Supabase da EXECUTE por default a anon/authenticated/service_role en cada función nueva del
-- schema public (ALTER DEFAULT PRIVILEGES a nivel de proyecto) — el REVOKE ALL FROM PUBLIC de
-- arriba NO alcanza a anon/service_role porque ese grant es explícito, no heredado de PUBLIC.
-- Hay que revocarlos aparte (confirmado con has_function_privilege durante las pruebas):
REVOKE EXECUTE ON FUNCTION public.seguros_corregir_precio_factura(uuid, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.seguros_corregir_precio_factura(uuid, numeric, text) FROM service_role;
```

**Columnas de `facturas`:** cierra el hueco de H1 quitando `prima_base`/`prima_deps`/`total` de lo
que `authenticated`/`anon` pueden escribir DIRECTO (fuera de la RPC), sin tocar el resto de las 20
columnas (incluida `estado`, deliberadamente — fuera de alcance de este sub-bloque, ver arriba).

```sql
-- Un REVOKE UPDATE (columnas) por sí solo NO alcanza si el rol ya tiene un GRANT UPDATE de TABLA
-- completa (confirmado durante las pruebas: el REVOKE column-level fue un no-op hasta quitar
-- primero el grant de tabla completa). Hay que quitar el grant ancho y re-otorgar solo lo permitido:
REVOKE UPDATE ON public.facturas FROM authenticated, anon;
GRANT UPDATE (
  id, cliente_id, cliente_nom, plan, empresa_id, periodo, mes, anio, deuda_ant, estado, wa_sent,
  fecha_emision, created_at, ncf, tipo_ncf, created_by_name, created_by_user_id, updated_by_name,
  updated_by_user_id, updated_at, origen
) ON public.facturas TO authenticated, anon;
```

`postgres` (dueño de la función `SECURITY DEFINER`) conserva `UPDATE` de tabla completa sin cambios
— la RPC sigue pudiendo escribir `prima_base`/`prima_deps`/`total` internamente, corriendo con los
privilegios del dueño de la función, no con los del llamador.

## Matriz de pruebas — todas corridas en branch de Supabase de prueba (`bloque2c3-precio-factura`,
## eliminado tras verificar), con `BEGIN...ROLLBACK` (cero dato tocado, ni siquiera en el branch)

Preflight: se confirmó y corrigió el drift del branch fresco contra producción ANTES de probar nada
(policies `all_facturas`/`all_clientes` recreadas fielmente, `mi_usuario_id()` y las 3 columnas +
trigger de `auditoria` recreados) — ver detalle de esta disciplina en las entregas anteriores de
esta serie.

| # | Caso | Resultado |
|---|------|-----------|
| T1 | `agente` (no-admin) llama la RPC | Bloqueado: "requiere rol admin" |
| T2 | `admin` corrige F2 (Pendiente) hacia arriba | Math exacta; cascada de resync auto-cura F4 (estado cacheado obsoleto "Pagado" → "Pendiente" real) |
| T2b | Auditoría del T2 | `FACTURA_PRECIO_CORREGIDO`, `cliente_id` correcto, `old_data`/`new_data` con el diff exacto, `result:'OK'` |
| T3 | Reintento con el mismo monto ya vigente | `sin_cambios:true`, CERO filas tocadas (ni `facturas` ni `clientes` ni `auditoria`) |
| T4 | Corregir una factura `Pagado` (F1) | Bloqueado: "no se cambia el precio de una factura ya pagada..."; fila 100% intacta |
| T5 | Corregir una factura `Anulada` (F5, con `deuda_ant=300`) | Bloqueado: "está anulada"; fila 100% intacta |
| F6 | Factura huérfana (`cliente_id IS NULL`, F6) | Corrige limpio (`sin_cambios:false`, `cliente_deuda_total:null`, `facturas_resync:[]`); auditoría con `cliente_id:null` sin tronar |
| F7 | Factura con `deuda_ant=800` (F7) | `total` nuevo = `base_nueva + deps + deuda_ant` exacto; cascada de resync corrige F4 de paso (misma auto-cura de T2) |
| — | Monto negativo (`-100`) | Bloqueado: "debe ser un monto válido" |
| — | Monto `NULL` | Bloqueado: mismo mensaje |
| — | Factura inexistente (uuid al azar) | Bloqueado: "Factura no encontrada" |
| — | Admin de OTRA organización sintética, contra una factura de `nexus-pro` | Bloqueado: "exclusivo de la organización de seguros"; fila intacta (verificado leyendo con `RESET ROLE` tras el intento, porque RLS bloquea la propia lectura de verificación bajo la identidad cross-org — comportamiento correcto, no una falla) |
| — | `UPDATE public.facturas SET prima_base=99999 ...` DIRECTO como `authenticated` (sin pasar por la RPC) | `insufficient_privilege` — prueba de punta a punta de que el REVOKE de columna bloquea de verdad, no solo `has_column_privilege` |
| — | `UPDATE public.facturas SET wa_sent=true ...` directo como `authenticated` (columna permitida) | Funciona sin regresión — la re-concesión de columnas no rompió nada del resto del sistema |

`get_advisors(security)` corrido tras aplicar en el branch: el único hallazgo nuevo atribuible a
`seguros_corregir_precio_factura` es el esperado por diseño — "`authenticated` puede ejecutarla"
(el gate real vive DENTRO de la función, mismo patrón ya aceptado para
`seguros_anular_factura`/`seguros_registrar_egreso`/etc. en bloques anteriores). Sin advertencia de
`anon` — confirma que `anon` de verdad no puede llamarla.

## Migración de frontend (diseñada, NO aplicada — va en un sub-bloque de implementación aparte)

Mismo patrón ya usado para `anularFactura()`/`_genFacturasInterno()` (bloque 3B): `nxEditarPrecioFactura(fid)`
pasa de un `PATCH` directo de `facturas` a `API.rpc('seguros_corregir_precio_factura', {p_factura_id:
fid, p_nuevo_monto_mes: nuevo, p_motivo: motivo||null})`, leyendo el `prompt()` de monto que ya existe
hoy — sin cambiar la UX del botón "Precio"/"Corregir el precio". Los 2 gates client-side
(`tienePermiso('modificar_precio')`) se quedan como filtro de UI (ocultar el botón a quien no debería
verlo), pero dejan de ser la única defensa — la RPC es quien de verdad decide.

## Plan de rollback

Si algo sale mal tras aplicar: `DROP FUNCTION public.seguros_corregir_precio_factura(uuid, numeric,
text);` + `GRANT UPDATE ON public.facturas TO authenticated, anon;` (vuelve al grant de tabla
completa de antes) — reversible en un solo paso, sin pérdida de datos (la RPC no crea ninguna tabla
nueva).

## Estado

**NO APLICADO.** Diseño completo, probado a fondo (17 casos, todos en verde) en un branch de
Supabase desechable ya eliminado — cero cambio en producción hasta ahora. Pendiente autorización
explícita del dueño para aplicar la RPC + el ACL a producción real (`tnwsgcxurfyuszxsewsn`) y migrar
el frontend.
