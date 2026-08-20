## Claude — 2026-08-17 20:27

# Bloque 2C-1 — CERRADO: `configuracion.roles_perms` ya no la puede escribir cualquier authenticated

Cierre del hallazgo H2 (CRÍTICO) de la auditoría Fase 2C
(`docs/bitacora/2026-08-17-0844-claude-fase2c-auditoria-16-tablas.md`), autorizado explícito por el
dueño: "Sí, aplica 2C-1 (Recomendado)".

## El problema (H2)

`configuracion` tenía una sola policy `all_configuracion` (`FOR ALL TO authenticated`) con un único
predicado de organización:

```sql
using (mi_rol() is not null and mi_organizacion() = (select id from organizaciones where slug='nexus-pro'))
```

Sin ninguna distinción por `clave`. Como `configuracion` es una tabla key-value (`clave text primary
key, valor text`) donde una sola fila, `roles_perms`, guarda el JSON que `tienePermiso()` lee en TODA
la app (`index.html`/`parches.js`) para decidir qué puede hacer cada rol — cualquier usuario
`authenticated` de la organización, sin importar su rol real (`admin`/`agente`/`gerente`/`cajero`/
`vendedor`), podía sobreescribir esa fila directamente vía PostgREST y auto-otorgarse cualquier
permiso, sin pasar nunca por `guardarRolPerms()` (`index.html:4333`, la única función del frontend que
la escribe hoy, y que no tiene ningún gate de rol propio — confía por completo en RLS).

## Diseño aplicado

Se partió `all_configuracion` en 4 policies por comando, sin tocar los GRANTs de tabla (fuera de
alcance de este sub-bloque — ver nota abajo):

- **SELECT** — sin cambio de comportamiento. Cualquier `authenticated` de la organización sigue
  leyendo TODA la config, tal cual antes. Es necesario: `tienePermiso()` y `cargarDatosNucleo()` leen
  `roles_perms` (y el resto de las claves) en cada carga de la app, para cualquier rol.
- **INSERT / UPDATE / DELETE** — se agregó `AND (clave <> 'roles_perms' OR mi_rol() = 'admin')` al
  mismo predicado de organización de siempre. Solo `admin` puede tocar la fila `roles_perms`; el resto
  de las claves (`empresa_nom`, `alerta_dias`, `ars_list`, etc.) siguen editables por cualquier
  `authenticated` de la org, exactamente igual que antes — **cero regresión** para el uso normal del
  sistema.

```sql
drop policy if exists all_configuracion on public.configuracion;

create policy configuracion_select
  on public.configuracion for select to authenticated
  using (mi_rol() is not null and mi_organizacion() = (select id from organizaciones where slug='nexus-pro'));

create policy configuracion_insert
  on public.configuracion for insert to authenticated
  with check (
    mi_rol() is not null and mi_organizacion() = (select id from organizaciones where slug='nexus-pro')
    and (clave <> 'roles_perms' or mi_rol() = 'admin')
  );

create policy configuracion_update
  on public.configuracion for update to authenticated
  using (
    mi_rol() is not null and mi_organizacion() = (select id from organizaciones where slug='nexus-pro')
    and (clave <> 'roles_perms' or mi_rol() = 'admin')
  )
  with check (
    mi_rol() is not null and mi_organizacion() = (select id from organizaciones where slug='nexus-pro')
    and (clave <> 'roles_perms' or mi_rol() = 'admin')
  );

create policy configuracion_delete
  on public.configuracion for delete to authenticated
  using (
    mi_rol() is not null and mi_organizacion() = (select id from organizaciones where slug='nexus-pro')
    and (clave <> 'roles_perms' or mi_rol() = 'admin')
  );
```

**Por qué el mismo predicado en `USING` y `WITH CHECK` del UPDATE** (decisión de diseño, el SQL
ilustrativo de la auditoría quedó cortado a mitad de esa parte): con el predicado repetido, un
`UPDATE` de `agente` sobre `roles_perms` simplemente no encuentra la fila (0 filas, sin error) — mismo
comportamiento silencioso que ya tiene el resto de RLS en este sistema. Verificado igual el caso
`INSERT` (que no tiene `USING`, solo `WITH CHECK`): ahí sí sale un error explícito de Postgres
(`42501: new row violates row-level security policy`) porque no hay fila previa que filtrar — es el
comportamiento normal de RLS para INSERT, no algo que se pueda evitar sin duplicar lógica.

## Migración aplicada

`bloque2c1_configuracion_roles_perms_admin_only` — aplicada directo a producción
(`tnwsgcxurfyuszxsewsn`) tras probar el diseño exacto en un branch de Supabase de prueba
(`bloque2c1-roles-perms`, eliminado al terminar).

## Verificación — dos capas, ambas con `BEGIN...ROLLBACK` (cero dato tocado)

**Capa 1 — branch de prueba**, con 2 identidades sintéticas (`test-admin`/`test-agente`) sembradas
desde `auth.users`→`usuarios_sistema`→`profiles`, contra una recreación fiel de la policy real de
producción (confirmada por `pg_get_expr` antes de tocar nada — cero drift): 7 pruebas (T1-T7), todas
en verde — UPDATE de agente sobre `roles_perms` bloqueado (0 filas), UPDATE de admin sobre
`roles_perms` permitido, UPDATE de agente sobre otra clave permitido (sin regresión), SELECT de agente
sobre `roles_perms` intacto, INSERT de agente recreando `roles_perms` (tras borrarla) bloqueado con
error explícito de RLS, DELETE de agente sobre `roles_perms` bloqueado (0 filas), `anon` sin ver
ninguna fila (sin cambio respecto a la línea base).

**Capa 2 — producción real**, con las 2 identidades reales de la organización (`sterlin08`/admin,
`robinson`/agente), contra la policy YA DESPLEGADA (confirmada con `pg_get_expr` tras aplicar — las 4
policies quedaron exactamente como se probó): 6 pruebas (T1-T6), todas en verde, mismo patrón que la
capa 1. Verificación independiente de cero residuos: `updated_at` de `roles_perms` y de la clave usada
para la prueba de "agente sigue pudiendo escribir otras claves" (`alerta_dias`) quedaron en sus
timestamps de mayo-2026, sin ningún rastro de las pruebas de hoy — confirma que los 13 `ROLLBACK`
(7+6) de verdad no dejaron nada escrito.

`get_advisors(security)` corrido tras aplicar: cero hallazgos nuevos relacionados con `configuracion`
(el hueco H2 era de lógica de negocio, no algo que el linter genérico detecte — coincide con lo ya
documentado en la auditoría 2C).

## Hallazgo relacionado, fuera de alcance de este sub-bloque (documentado, no corregido)

Al revisar los GRANTs de tabla de `configuracion` (`information_schema.role_table_grants`) se confirmó
que **`anon` tiene privilegios de tabla completos** (SELECT/INSERT/UPDATE/DELETE/TRUNCATE) — igual que
`authenticated`. Esto **no es un problema nuevo introducido por 2C-1** (ya era así en la línea base,
verificado): como todas las policies (las viejas y las 4 nuevas) son `TO authenticated` exclusivamente,
`anon` sigue sin tener NINGUNA policy aplicable y por default-deny de RLS ve/escribe 0 filas — se
confirmó explícitamente en la Capa 2 (T6). El `TRUNCATE` es la única excepción real: RLS no aplica a
`TRUNCATE`, solo requiere el privilegio de tabla, que `anon` tiene. Es el mismo patrón de riesgo ya
identificado y cerrado en otras tablas en bloques anteriores de esta serie (2A/3A). No se tocó aquí
porque el mandato de 2C-1 era específicamente el gate de `roles_perms`, no un REVOKE de ACL general —
si el dueño quiere cerrarlo, es un sub-bloque aparte, del mismo tamaño y cuidado que los anteriores.

## H1 — sigue sin tocar, a propósito

`nxEditarPrecioFactura()` (`index.html:7524`, PATCH directo de `facturas.prima_base/prima_deps/total`)
sigue igual — la propia auditoría 2C lo marcó como fuera de alcance de 2C-1 (necesita una RPC, no solo
un ajuste de ACL). Queda como su propio sub-bloque futuro si el dueño lo pide.

## Estado

**2C-1 CERRADO.** `roles_perms` — la fila que controla todos los permisos de la aplicación — ya solo la
puede escribir un usuario con `mi_rol()='admin'`. Ningún cambio de frontend fue necesario:
`guardarRolPerms()` ya solo se invoca desde la pantalla de Roles y Accesos de Ajustes, a la que ya solo
tenían acceso los administradores por la UI — el gate de RLS ahora respalda esa expectativa a nivel de
base de datos, cerrando la vía directa por API que existía antes sin depender de la UI.
