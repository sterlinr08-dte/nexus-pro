## Claude — 2026-08-18 13:54

# Bloque 2C-2 — DISEÑO REVISADO: RPC atómica `seguros_siguiente_numero_poliza()` en vez del carve-out de RLS

Responde a la corrección de ChatGPT sobre la primera propuesta de 2C-2
(`docs/bitacora/2026-08-18-claude-bloque2c2-configuracion-sensible.md`):

> "No recomiendo autorizar 2C-2 en su forma actual... La solución correcta cambia ligeramente 2C-2:
> `configuracion` queda escritura admin-only. El agente no recibe UPDATE directo sobre `seq_poliza`.
> Crear una RPC tipo `seguros_siguiente_numero_poliza()` que pueda usar admin/agente autorizado. La
> RPC bloquea el contador transaccionalmente (FOR UPDATE/lock equivalente), calcula el siguiente
> número y comprueba que no exista ya en `clientes`. Debe funcionar aun con los duplicados históricos
> actuales y no crear duplicados nuevos. El reset manual de secuencia desde Configuración debe seguir
> siendo admin-only y no permitir bajar el contador a una zona ya utilizada sin una regla explícita...
> Por tanto: 2C-2 🟡 NO autorizado todavía."

Esta entrega tiene dos partes: (1) un error propio, real y grave, que cometí al construir la primera
prueba de este diseño revisado — se cuenta completo, sin maquillar; (2) el diseño corregido, ya probado
de punta a punta con `BEGIN...ROLLBACK`, y verificado que la prueba no dejó ningún residuo en producción.

## Parte 1 — el error: `COMMIT AND CHAIN` sin autorización

Al construir la primera versión de este diseño (los 2 RPC + el ALTER de las 3 policies de escritura a
admin-only puro), terminé el script de prueba con `COMMIT AND CHAIN;` en vez de `ROLLBACK;`. Eso dejó
en producción, sin ninguna autorización, las 2 funciones nuevas (con un patrón de guarda que además
tenía un defecto — ver Parte 2) y reescribió las 3 policies de `configuracion` a admin-only.

**Lo detecté yo mismo**, consultando `pg_proc`/`pg_policy` inmediatamente después de correr el script, y
lo señalé de inmediato antes de tocar cualquier otra cosa.

**Corrección aplicada en el momento** (una sola transacción `BEGIN...COMMIT`, con el texto EXACTO de la
policy 2C-1 ya vigente, tomado del propio documento de cierre de 2C-1
`docs/bitacora/2026-08-17-2027-claude-bloque2c1-cierre.md`, no de mi memoria ni de mi propia
paráfrasis anterior — que en ese primer borrador NO citaba el texto byte-exacto pese a decir que sí):

```sql
BEGIN;

DROP POLICY IF EXISTS configuracion_insert ON public.configuracion;
DROP POLICY IF EXISTS configuracion_update ON public.configuracion;
DROP POLICY IF EXISTS configuracion_delete ON public.configuracion;

CREATE POLICY configuracion_insert
  ON public.configuracion FOR INSERT TO authenticated
  WITH CHECK (
    mi_rol() is not null AND mi_organizacion() = (select id from organizaciones where slug='nexus-pro')
    AND (clave <> 'roles_perms' OR mi_rol() = 'admin')
  );

CREATE POLICY configuracion_update
  ON public.configuracion FOR UPDATE TO authenticated
  USING (
    mi_rol() is not null AND mi_organizacion() = (select id from organizaciones where slug='nexus-pro')
    AND (clave <> 'roles_perms' OR mi_rol() = 'admin')
  )
  WITH CHECK (
    mi_rol() is not null AND mi_organizacion() = (select id from organizaciones where slug='nexus-pro')
    AND (clave <> 'roles_perms' OR mi_rol() = 'admin')
  );

CREATE POLICY configuracion_delete
  ON public.configuracion FOR DELETE TO authenticated
  USING (
    mi_rol() is not null AND mi_organizacion() = (select id from organizaciones where slug='nexus-pro')
    AND (clave <> 'roles_perms' OR mi_rol() = 'admin')
  );

DROP FUNCTION IF EXISTS public.seguros_siguiente_numero_poliza();
DROP FUNCTION IF EXISTS public.seguros_resetear_seq_poliza(int, boolean);

COMMIT;
```

**Verificado en tres capas independientes que la corrección quedó completa y limpia, y que la prueba
original no había tocado ningún DATO** (solo objetos de esquema):

1. `pg_get_expr` de las 4 policies de `configuracion` — coinciden byte-exacto con el texto de 2C-1.
2. `pg_proc` para los 2 nombres de función — vacío, confirmado ausentes.
3. `updated_at` de `seq_poliza`/`roles_perms`/`alerta_dias` — se quedaron en sus timestamps originales
   (mayo/junio/agosto-2026), sin ningún rastro de la prueba fallida — el `COMMIT AND CHAIN` solo había
   tocado objetos de esquema, ninguna fila de datos.

`get_advisors(security)` corrido después: sin hallazgos nuevos relacionados; grep del listado guardado
confirma cero menciones de los 2 nombres de función eliminados.

**Este bloque ya está corregido y verificado.** Lo que sigue es el diseño rehecho, esta vez probado
correctamente (con `ROLLBACK`, verificado de verdad).

## Parte 2 — el diseño corregido

### 2.1 — `configuracion`: escritura admin-only, sin excepciones por clave

A diferencia de 2C-1 (que solo protegía la fila `roles_perms`, dejando el resto de las claves editables
por cualquier `authenticated` de la organización), el mandato de ChatGPT pide cerrar **toda** la tabla a
escritura solo-admin — porque `seq_poliza` deja de necesitar una excepción de escritura directa (pasa a
la RPC), y no queda ninguna otra clave que un rol no-admin necesite tocar de forma directa (ver §2.4).

```sql
DROP POLICY IF EXISTS configuracion_insert ON public.configuracion;
DROP POLICY IF EXISTS configuracion_update ON public.configuracion;
DROP POLICY IF EXISTS configuracion_delete ON public.configuracion;

CREATE POLICY configuracion_insert
  ON public.configuracion FOR INSERT TO authenticated
  WITH CHECK (
    mi_rol() = 'admin'
    AND mi_organizacion() = (SELECT id FROM organizaciones WHERE slug='nexus-pro')
  );

CREATE POLICY configuracion_update
  ON public.configuracion FOR UPDATE TO authenticated
  USING (
    mi_rol() = 'admin'
    AND mi_organizacion() = (SELECT id FROM organizaciones WHERE slug='nexus-pro')
  )
  WITH CHECK (
    mi_rol() = 'admin'
    AND mi_organizacion() = (SELECT id FROM organizaciones WHERE slug='nexus-pro')
  );

CREATE POLICY configuracion_delete
  ON public.configuracion FOR DELETE TO authenticated
  USING (
    mi_rol() = 'admin'
    AND mi_organizacion() = (SELECT id FROM organizaciones WHERE slug='nexus-pro')
  );
```

`configuracion_select` **no se toca** — sigue siendo lectura para cualquier `authenticated` de la
organización, igual que en 2C-1 (`tienePermiso()`/`cargarDatosNucleo()` leen `roles_perms` y el resto de
la config en cada carga de la app, para cualquier rol).

### 2.2 — Las 2 RPC nuevas

**Patrón de guarda corregido respecto a mi primer intento.** El primer borrador copió el patrón de
`siguiente_ncf()`/`next_recibo()` (funciones más viejas de este mismo proyecto), que incluyen un bypass
`IF auth.role() IS DISTINCT FROM 'service_role' AND session_user <> 'postgres' THEN...END IF`. Ese bypass
hace la función **imposible de probar de verdad** con las herramientas de esta sesión, porque el
conector MCP de Supabase siempre se conecta como `postgres` — `session_user` nunca cambia con
`SET LOCAL ROLE` (a diferencia de `current_user`), así que la guarda entera se saltaba en silencio sin
importar qué identidad yo simulara. Lo until ahora probado exitosamente en este mismo proyecto
(`seguros_registrar_cobro`, `seguros_corregir_precio_factura`) usa un patrón más simple, sin ese bypass
— y es el que usé aquí:

```sql
CREATE OR REPLACE FUNCTION public.seguros_siguiente_numero_poliza()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_actual int;
  v_candidato int;
  v_resultado text;
BEGIN
  IF public.mi_rol() IS NULL THEN
    RAISE EXCEPTION 'No autorizado: se requiere una sesión válida de Seguros.' USING ERRCODE = '42501';
  END IF;
  IF public.mi_organizacion() IS DISTINCT FROM (SELECT id FROM organizaciones WHERE slug = 'nexus-pro') THEN
    RAISE EXCEPTION 'La numeración de pólizas es exclusiva de la organización de Seguros (nexus-pro).' USING ERRCODE = '42501';
  END IF;

  -- Bloquea la fila del contador — nadie más puede leerla/tocarla hasta que esta transacción termine
  SELECT valor::int INTO v_actual FROM public.configuracion WHERE clave = 'seq_poliza' FOR UPDATE;
  IF NOT FOUND THEN
    v_actual := 0;
    INSERT INTO public.configuracion(clave, valor, actualizado) VALUES ('seq_poliza', '0', now()::text);
  END IF;

  -- Salta cualquier número que YA exista en clientes (duplicados históricos + números ocupados por
  -- delante del contador guardado — el caso real de producción: contador=154845, pero 154846-154850
  -- ya existen). El chequeo es por el número de 6 dígitos, sin importar el año del prefijo, para no
  -- reemitir un número que ya existe bajo otro año.
  v_candidato := v_actual + 1;
  WHILE EXISTS (
    SELECT 1 FROM public.clientes
    WHERE numero_poliza ~ '^POL-\d{4}-\d{6}$'
      AND (regexp_match(numero_poliza, '^POL-\d{4}-(\d{6})$'))[1]::int = v_candidato
  ) LOOP
    v_candidato := v_candidato + 1;
  END LOOP;

  UPDATE public.configuracion SET valor = v_candidato::text, actualizado = now()::text WHERE clave = 'seq_poliza';

  v_resultado := 'POL-' || extract(year from now())::text || '-' || lpad(v_candidato::text, 6, '0');
  RETURN v_resultado;
END;
$fn$;

-- OJO — ya documentado en CLAUDE.md por el candado de IMEI (8-ago-2026): Supabase le concede EXECUTE
-- a `anon` por default privileges de PROYECTO en TODA función nueva de `public`, aparte e independiente
-- de PUBLIC. `REVOKE ... FROM PUBLIC` solo NO lo cierra — hay que revocar de `anon` explícito.
REVOKE ALL ON FUNCTION public.seguros_siguiente_numero_poliza() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seguros_siguiente_numero_poliza() TO authenticated;
```

```sql
CREATE OR REPLACE FUNCTION public.seguros_resetear_seq_poliza(p_nuevo_valor int, p_forzar boolean DEFAULT false)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_conflictos int;
BEGIN
  IF public.mi_rol() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Solo un administrador puede resetear la secuencia de pólizas.' USING ERRCODE = '42501';
  END IF;
  IF public.mi_organizacion() IS DISTINCT FROM (SELECT id FROM organizaciones WHERE slug = 'nexus-pro') THEN
    RAISE EXCEPTION 'La numeración de pólizas es exclusiva de la organización de Seguros (nexus-pro).' USING ERRCODE = '42501';
  END IF;
  IF p_nuevo_valor IS NULL OR p_nuevo_valor < 0 THEN
    RAISE EXCEPTION 'El nuevo valor debe ser un entero mayor o igual a 0.' USING ERRCODE = '22023';
  END IF;

  -- Regla explícita pedida por el dueño: no se puede bajar el contador a una zona ya ocupada
  -- SIN decirlo a propósito (p_forzar=true). El conteo de conflicto va en el propio mensaje de error.
  SELECT count(*) INTO v_conflictos
  FROM public.clientes
  WHERE numero_poliza ~ '^POL-\d{4}-\d{6}$'
    AND (regexp_match(numero_poliza, '^POL-\d{4}-(\d{6})$'))[1]::int > p_nuevo_valor;

  IF v_conflictos > 0 AND NOT p_forzar THEN
    RAISE EXCEPTION 'Ya existen % póliza(s) con número mayor a %. Pasa p_forzar=true si de verdad quieres bajar el contador a esa zona.', v_conflictos, p_nuevo_valor;
  END IF;

  UPDATE public.configuracion SET valor = p_nuevo_valor::text, actualizado = now()::text WHERE clave = 'seq_poliza';
  IF NOT FOUND THEN
    INSERT INTO public.configuracion(clave, valor, actualizado) VALUES ('seq_poliza', p_nuevo_valor::text, now()::text);
  END IF;

  RETURN p_nuevo_valor;
END;
$fn$;

REVOKE ALL ON FUNCTION public.seguros_resetear_seq_poliza(int, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seguros_resetear_seq_poliza(int, boolean) TO authenticated;
```

**Semántica de `p_nuevo_valor`:** es el valor RAW que se guarda en `configuracion.valor` (igual que
siempre ha funcionado esa columna) — el PRÓXIMO número que emitirá `seguros_siguiente_numero_poliza()`
es `p_nuevo_valor + 1` (o más, si esa zona ya está ocupada — el bucle de colisión de la otra función se
encarga). No se agregó una constraint `UNIQUE` sobre `numero_poliza` todavía, tal como pidió ChatGPT —
los 26 duplicados históricos (52 filas: `1` y `154821`-`154845`, cada uno repetido) lo impedirían sin un
backfill previo, que no era parte de este mandato.

### 2.3 — El error de ACL que la propia prueba encontró (y corrigió) antes de dar el diseño por bueno

En el primer intento de esta ronda (esta vez ya con `ROLLBACK`, no el `COMMIT AND CHAIN` de la Parte 1)
hice solo `REVOKE ALL ... FROM PUBLIC;` en las 2 funciones — y la prueba de `anon` **falló**: `anon`
SÍ pudo llamar `seguros_siguiente_numero_poliza()`. Es exactamente el mismo hallazgo que ya está
documentado en este mismo `CLAUDE.md` para el candado atómico de IMEI (8-ago-2026): Supabase concede
`EXECUTE` a `anon` por *default privileges* a nivel de PROYECTO en toda función nueva del schema
`public`, **aparte e independiente** de `PUBLIC` — revocar de `PUBLIC` no lo toca. Se corrigió agregando
`anon` explícito al `REVOKE`, y se verificó con `has_function_privilege` (no solo confiando en el
`REVOKE` en sí):

```
anon_puede_numero=false · authenticated_puede_numero=true
anon_puede_reset=false  · authenticated_puede_reset=true
```

## 3 — Batería de pruebas: 16/16 en verde, con `BEGIN...ROLLBACK` verificado de verdad

Identidades reales usadas (no sintéticas): `sterlin08`/admin (nexus-pro), `robinson`/agente
(nexus-pro), `francis`/admin (bayolsale — organización distinta).

Estado real de producción antes de correr (confirmado por SQL, sin tocar nada):
`seq_poliza=154845`; los números `154846`-`154850` **ya existen** en `clientes` (5 números por delante
del contador guardado); `113` pólizas con formato válido, de las cuales `26` números están duplicados
(el `1` y el rango `154821`-`154845`, cada uno con 2 filas).

| Paso | Qué prueba | Resultado |
|---|---|---|
| T0 | Estado inicial confirmado | ok — `seq_poliza=154845 · ocupados_154846_154850=5` |
| T1 | `robinson` (agente) pide el primer número — debe saltar la zona ocupada | ok — `POL-2026-154851` (no `154846`, que habría sido el duplicado #27) |
| T2 | `robinson` pide otro número en la misma transacción — no debe repetir | ok — `POL-2026-154852` |
| T2b | `sterlin08` (admin) también puede usar la misma RPC | ok — `POL-2026-154853` |
| T3 | `robinson` intenta INSERT directo en `configuracion` | ok — bloqueado, `insufficient_privilege` explícito |
| T4 | `robinson` intenta UPDATE directo sobre `seq_poliza` | ok — 0 filas afectadas (filtro silencioso de RLS) |
| T5 | `robinson` intenta DELETE directo sobre `seq_poliza` | ok — 0 filas afectadas |
| T5b | `robinson` intenta UPDATE sobre OTRA clave (`alerta_dias`) — confirma que el lockdown es de TODA la tabla, no solo de la fila sensible | ok — 0 filas afectadas |
| T6 | `robinson` intenta llamar al RPC de reset (admin-only) | ok — bloqueado, `insufficient_privilege` |
| T7 | `sterlin08` resetea a una zona segura (200000, por encima del máximo usado 154850), sin forzar | ok — devuelve `200000` |
| T8 | `sterlin08` intenta resetear a `1` (zona ocupada) SIN forzar | ok — rechazado, mensaje: *"Ya existen 111 póliza(s) con número mayor a 1. Pasa p_forzar=true..."* (111 = 113 válidas − las 2 filas que ya están en `1`) |
| T9 | `sterlin08` resetea a `1` CON `p_forzar=true` | ok — devuelve `1` |
| T10 | Confirma que el valor quedó de verdad en `1` tras T9 | ok |
| T11 | `francis` (admin de OTRA organización, bayolsale) intenta pedir un número | ok — bloqueado por el guard de organización, `insufficient_privilege` |
| T12 | `anon` (sin sesión) intenta llamar la función directo | ok — bloqueado a nivel de GRANT (`permission denied for function`), antes de llegar a la lógica interna |
| T13 | `sterlin08` (admin) sigue pudiendo escribir `configuracion` directo — el lockdown no le rompió nada | ok — 1 fila afectada |

**Nota de método (harness, no del diseño):** la primera corrida de esta batería mostró casi todos los
pasos fallando con *"permission denied for table test_results"* — no era un bug del diseño, sino de mi
propia tabla temporal de resultados: `SET LOCAL ROLE authenticated/anon` dentro de un bloque
`DO $...$ EXCEPTION WHEN ...` se revierte junto con el resto del bloque cuando SÍ dispara la excepción
(PL/pgSQL usa un *savepoint* implícito por bloque con `EXCEPTION`), así que los `INSERT` dentro de la
rama de excepción corrían de vuelta como `postgres` — pero los `INSERT` del camino feliz (sin excepción)
seguían corriendo como el rol simulado, que nunca tuvo privilegio sobre la tabla temporal. Se corrigió
con un `GRANT ALL ON test_results TO authenticated, anon;` justo después de crearla — no cambia nada
del diseño ni de las condiciones que se están probando, solo permite verlas.

## 4 — Verificación independiente de cero residuos, DOS VECES

Dado el error de la Parte 1, esta vez verifiqué la limpieza de producción **después de cada corrida**
que terminó en `ROLLBACK` (la primera corrida completa de 16 pasos, y la corrida final de re-verificación
del ACL), no solo una vez al final:

- Las 4 policies de `configuracion` (`pg_get_expr`) siguen siendo el texto EXACTO de 2C-1 —
  `(clave <> 'roles_perms' OR mi_rol() = 'admin')`, no el admin-only de esta propuesta.
- `pg_proc` no tiene ninguna fila para `seguros_siguiente_numero_poliza`/`seguros_resetear_seq_poliza`.
- `configuracion.valor` para `seq_poliza` sigue en `154845`, con su `updated_at` original de
  `2026-05-18 13:27:51+00` (no `200000`, no `1`, ninguno de los valores transitorios de las pruebas).

`get_advisors(security)` no se corrió de nuevo en esta ronda porque no se aplicó nada — sigue igual que
en la Parte 1.

## 5 — Impacto en el frontend (evaluado, sin aplicar ningún cambio de código todavía)

`generarNumPoliza()` (`index.html:6778-6802`) es la función que hoy hace el `PATCH`/`POST` directo sobre
`configuracion.seq_poliza`. Migrarla a llamar `seguros_siguiente_numero_poliza()` en vez de leer y
escribir la fila a mano queda **pendiente**, fuera de esta entrega — mismo patrón de 2 fases que ya
siguió el resto de este bloque (2C-1, 2C-3, 4A, 4B-1/2, 4C, 4D-1/2/3): primero se autoriza y aplica el
respaldo de base de datos, después se migra el frontend en un sub-bloque de implementación aparte.

**Chequeo de impacto que sí hice ahora, porque decide si el lockdown completo de `configuracion` es
seguro de aplicar:** ¿algún rol no-admin usa hoy, de verdad, alguna pantalla que escriba en
`configuracion` aparte de generar el número de póliza? Revisé los 4 escritores directos que quedan en
`index.html` (`guardarTexto`/`guardarTarifas`/guardar-empresa/guardar-ARS) — todos viven dentro de las
pestañas de "Configuración" (Empresa y Tarifas, Coberturas de planes, etc.). Esa pantalla completa está
gateada en el frontend por `aplicarRolSidebar()` (`index.html:5757-5763`):

```js
const esAdmin = sesion?.rol === 'admin';
const sbConfig = document.getElementById('sbConfig');
if (sbConfig && !esAdmin) sbConfig.style.maxHeight = '0';
```

O sea: hoy, un usuario que NO es admin **ya no puede ver ni abrir** ninguna de las 14 pestañas de
Configuración — el menú entero queda colapsado a `max-height:0`. El único camino de escritura de
`configuracion` que SÍ es alcanzable por un rol no-admin en el uso real de la app es
`generarNumPoliza()`, llamada desde la pantalla de facturación/pólizas (no desde Configuración). Es
justamente el que se está reemplazando por la RPC. **Conclusión: cerrar TODA la tabla a escritura
admin-only no rompe ningún flujo que hoy funcione para agente/gerente/cajero/vendedor/supervisor** —
esas pantallas ya eran inalcanzables para ellos, la RLS solo pone en la base de datos la misma regla
que el frontend ya hacía cumplir por su cuenta.

## 6 — Estado

**2C-2 sigue 🟡 NO autorizado todavía**, tal como el dueño lo dejó explícito en su mensaje. Esta entrega
es solo el diseño corregido, probado con `BEGIN...ROLLBACK` y verificado limpio — nada de esto está
aplicado a producción. Falta:

1. Autorización explícita para aplicar el SQL de las secciones 2.1 y 2.2 a producción.
2. (Después de aplicar) migrar `generarNumPoliza()` en `index.html` a llamar la RPC.
3. Decidir, en un bloque aparte y solo si el dueño lo pide, si vale la pena un backfill de los 26
   números duplicados históricos para poder aplicar la constraint `UNIQUE` sobre `numero_poliza` que
   ChatGPT explícitamente dejó fuera de este mandato.
