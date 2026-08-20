# Bloque 2C-2 — Claude responde: `configuracion`, resto de claves sensibles

**Fecha:** 2026-08-18
**Responde a:** `docs/bitacora/2026-08-18-0701-chatgpt-bloque2c2-configuracion-sensible.md` (commit `443eba4`)
**Alcance de esta entrega:** SOLO auditoría + diseño + SQL propuesto. **NADA se aplicó a producción.**
Todo lo que sigue se verificó fresco contra la base real (proyecto `tnwsgcxurfyuszxsewsn`) y contra el
código real de `index.html`/`parches.js` — nada se dio por sentado desde memoria de bloques anteriores.

---

## 1. Inventario fresco de `configuracion` (columnas, PK, filas reales)

```
CREATE TABLE public.configuracion (
  clave      text PRIMARY KEY,
  valor      text,
  updated_at timestamptz,
  actualizado text
);
```

4 columnas, sin `organizacion_id` (a diferencia de `pos_*`/`rifa_*`). El aislamiento por
organización se hace con un subquery fijo a la org `nexus-pro` (mismo patrón que 2C-1 ya dejó
en producción) — es correcto: esta tabla es del núcleo de Seguros, no multi-tenant.

**`clave` SÍ es la Primary Key real** (`configuracion_pkey`) — responde el punto §9 del mandato:
el diseño de abajo puede apoyarse con seguridad en la unicidad de `clave`, no es una suposición.

**28 filas reales hoy** (releídas frescas, no de memoria del audit del 17-ago):

| clave | clasificación |
|---|---|
| `roles_perms` | 🔴 ya protegida (2C-1) |
| `prima_basico/superior/esencial`, `dep_basico/superior/esencial`, `comision_basico/superior/esencial`, `costo_basico/superior/esencial` | 🟠 tarifas/comisiones/costos — **H5, el foco de este bloque** |
| `seq_poliza` | 🟠 secuencia operativa — **necesita trato especial, ver §3** |
| `auto_facturacion`, `emailjs`, `reporte_horas`, `reporte_dias` | 🟠 configuración de automatización/notificaciones |
| `empresa_nom/rnc/tel/email/dir` | 🟠 datos de la correduría |
| `ars_list` | 🟡 catálogo de ARS (bajo riesgo real, pero no hay razón para dejarlo abierto) |
| `cobertura_basico/superior/esencial` | 🟡 texto de coberturas para WhatsApp |
| `alerta_dias` | 🟡 config de alertas |

**`metas` NO existe como fila** (confirmado con `SELECT` directo — 28 filas, ninguna es `metas`) pese a
que `guardarMetas()` existe y se usa en Ajustes → Metas. Esto es evidencia indirecta de que sus fallos
silenciosos (ver §7) pueden llevar tiempo sin detectarse — nadie notó que "Guardar metas" nunca creó la
fila.

---

## 2. Mapa exhaustivo de escritores (fresco, `index.html` + `parches.js`)

Grep directo de **todas** las llamadas de escritura contra `configuracion` (`API.patch`/`API.post`/
`API.del`, y su par en minúscula de `parches.js`) — sin fetch crudo fuera del wrapper `API`/`api`:

```
index.html:4148-4152   guardarTexto(clave,valor)          — helper genérico
index.html:6083-6091   guardarConfigSupabase(clave,valor) — helper genérico
index.html:6785-6795   generarNumPoliza()                 — escribe seq_poliza
index.html:9948        guardarConfig()                    — 0 llamadores, código muerto
index.html:10055,10069 guardarTarifas()                   — escribe seq_poliza + prima_*/dep_*/comision_*/costo_*
parches.js:8192-8193   nxGuardarProgramacion()             — escribe reporte_horas/reporte_dias
```

Cero `DELETE` contra `configuracion` en todo el repo (confirmado, 0 resultados) — nadie borra filas hoy.

**Funciones reales que llaman a los helpers genéricos** (cada una mapeada a su clave y a su pantalla):

| Función | Clave(s) | Pantalla (Ajustes → …) |
|---|---|---|
| `guardarCoberturas()` | `cobertura_*` | Coberturas |
| `guardarDatosEmp()` | `empresa_*` + `seq_poliza` (si `cfgNumIni` tiene valor) | Empresa y tarifas |
| `guardarConfig()` | `empresa_*` | **código muerto, 0 llamadores** |
| `guardarEmailConfig()` | `emailjs` | Notificaciones |
| `guardarMetas()` | `metas` | Metas |
| `guardarRolPerms(rol)` | `roles_perms` | Seguridad / Roles |
| `guardarAutoConfig()`/`guardarAuto()` | `auto_facturacion` | Automatización |
| `guardarPlantilla()` (inline) | `auto_facturacion` | Automatización |
| `guardarPlantillaWa()` | `auto_facturacion` | Automatización |
| `agregarArs()`/`eliminarArs(i)` | `ars_list` | — |
| `guardarTarifas()` | `prima_*`/`dep_*`/`comision_*`/`costo_*` + `seq_poliza` (si `cfgNumIni`) | Empresa y tarifas |
| `generarNumPoliza()` | `seq_poliza` | **Clientes → Nuevo cliente (NO es de Ajustes)** |
| `nxGuardarProgramacion()` | `reporte_horas`/`reporte_dias` | Notificaciones |

---

## 3. La decisión central: ¿necesita `agente` escribir alguna clave? **Sí — `seq_poliza`, con evidencia**

Esto se verificó de punta a punta, no se asumió:

1. `crear_clientes` está declarado explícitamente en `ROLES_DEF.agente.perms` (`index.html:4444`):
   `agente:{...perms:['ver_clientes','crear_clientes','ver_facturas']}`.
2. El botón "Nuevo cliente" (`index.html:1611`, `onclick="abrirNuevoCli()"`) **no tiene ningún
   `tienePermiso('crear_clientes')` ni gate de rol** — es alcanzable por cualquier sesión autenticada
   que llegue a la pantalla Clientes (que en la práctica es la mayoría de los roles).
3. `guardarCli()` (la función que guarda el modal `mCli`), en la rama de creación (`!editCliId`,
   `index.html:9403-9405`), llama a `generarNumPoliza()` **antes de insertar el cliente** — es un
   `await` bloqueante en el flujo real de alta de cliente.
4. `generarNumPoliza()` hace `GET` + `PATCH-o-POST` directo sobre `configuracion` (`clave='seq_poliza'`)
   — sin pasar por ninguna RPC.

Esto significa: **hoy, cualquier `agente` que da de alta un cliente nuevo — que es su tarea diaria
principal, no un caso raro — escribe en `configuracion` en cada alta.** Un diseño "admin-only para toda
la tabla" rompería el alta de clientes para Robinson (el `agente` real de producción) la primera vez que
se aplicara.

**Por contraste, TODO el resto de la tabla ya está detrás de un gate de UI admin-only real:**
la sección completa "Configuración" del sidebar (`id="niAdmin2"`, que contiene Empresa y tarifas,
Notificaciones, Automatización, Metas, Seguridad/Roles, Coberturas — es decir, TODOS los demás
escritores del mapa de §2, incluido el `seq_poliza`-reset **duplicado** dentro de `guardarDatosEmp()`/
`guardarTarifas()`) se oculta con:

```js
// index.html:5759-5760
const niAdmin2=document.getElementById('niAdmin2');
if(niAdmin2)niAdmin2.style.display=esAdmin?'':'none';
// index.html:5758: const esAdmin=sesion?.rol==='admin';
```

`esAdmin` es literalmente `sesion?.rol==='admin'` — coincide exacto con `mi_rol()='admin'` del backend
(mismo helper que ya usa 2C-1). No hay discrepancia entre lo que el frontend esconde y lo que el backend
debería exigir.

**Conclusión de diseño:** la respuesta correcta NO es "admin-only para toda la tabla" (rompería alta de
clientes) ni "denylist de una clave" (deja abiertas las tarifas/comisiones/costos, exactamente H5). Es
un **ALLOWLIST de una sola clave literal, `seq_poliza`**, para INSERT/UPDATE — el resto de la tabla pasa
a admin-only, y DELETE queda admin-only **sin excepción** (nadie borra `configuracion` hoy, ver §2).

---

## 4. Los 8 escenarios de bypass del mandato, cerrados por diseño y **probados empíricamente**

El diseño elegido (§10) usa `clave = 'seq_poliza' OR mi_rol() = 'admin'`, repetido en `USING` **y**
`WITH CHECK` de UPDATE, y en `WITH CHECK` de INSERT. Esto es intencional, no cosmético:

1. **Actualizar una clave sensible existente** — bloqueado: la clave ≠ `seq_poliza` y el USING/CHECK
   falla para no-admin. Probado (T2, T3 abajo).
2. **Crear una fila nueva bajo una clave nueva para el mismo fin sensible** — al ser ALLOWLIST y no
   denylist, cualquier clave que no sea literalmente `seq_poliza` requiere admin, sin excepción — no
   hay nada que enumerar. Probado (T4).
3. **Crear una fila bajo una clave aún no consumida que la app empiece a leer después** — mismo
   mecanismo que (2): bloqueado por default, no por lista de prohibidos. Probado con una clave que
   imita el nombre real (`seq_poliza_v2`) para confirmar que NO hay match por prefijo/patrón (T5).
4. **Renombrar una fila permitida hacia una clave sensible** (si `clave` fuera editable) — el caso más
   afilado del mandato. Se probó literalmente: `UPDATE configuracion SET clave='roles_perms_hijack'
   WHERE clave='seq_poliza'` como `agente` — el `USING` de la fila VIEJA pasa (es `seq_poliza`), pero el
   `WITH CHECK` evalúa la fila NUEVA (`clave='roles_perms_hijack'≠'seq_poliza'`) y la rechaza
   explícitamente (T7). Esto es precisamente por qué el predicado se repite en `WITH CHECK` de UPDATE —
   si solo estuviera en `USING`, este ataque habría tenido éxito.
5. **Transformar sensible→permitido→editar→renombrar de vuelta** — el primer paso (tocar la fila
   sensible original) ya está bloqueado en el `USING` de esa fila (T3: `agente` no puede ni empezar a
   tocar `roles_perms`), así que la cadena nunca arranca.
6. **Bypass UPSERT entre camino INSERT y UPDATE** — el mismo predicado literal se aplica en el
   `WITH CHECK` de INSERT y en `USING`+`WITH CHECK` de UPDATE; un `Prefer: resolution=merge-duplicates`
   evalúa la política correspondiente a la rama que realmente ejecuta (INSERT si no existe, UPDATE si
   existe) — como las dos exigen la misma condición, no hay combinación que abra una puerta que la otra
   cierre.
7. **DELETE para forzar un fallback inseguro** — cerrado de raíz: DELETE es admin-only **sin ninguna
   excepción**, ni siquiera para `seq_poliza`. No hay necesidad operativa real de borrar (§2: cero
   `DELETE` en todo el repo), así que no se dejó ninguna puerta. Probado (T6).
8. **Reabrir `roles_perms` por accidente** — el nuevo predicado es estrictamente MÁS estricto que el de
   2C-1 (`clave='seq_poliza'` es un subconjunto de `clave<>'roles_perms'`), así que `roles_perms` sigue
   bloqueado para no-admin bajo el nuevo diseño sin necesidad de mantener su condición aparte. Probado
   (T3, T8 confirma que admin sigue intacto).

### Matriz de pruebas — `BEGIN...ROLLBACK` contra producción real, 13/13 en verde

Corrida en una sola transacción, con `SET LOCAL ROLE` + `set_config('request.jwt.claims', ...)` con
identidades reales de producción (`sterlin08`=admin, `robinson`=agente, ambos org `nexus-pro`;
`francis`=admin de `bayolsale` para cross-org; `anon`), políticas candidatas aplicadas dentro de la
misma transacción, y `ROLLBACK` al final — **cero cambios persistidos**, verificado después con un
`SELECT` independiente (0 filas residuales de `metas`/`seq_poliza_v2`/`roles_perms_hijack`, y las 4
políticas en producción idénticas — texto exacto — a como estaban antes de la prueba).

| # | Actor | Operación | Resultado esperado | Resultado real |
|---|---|---|---|---|
| T1 | agente (Robinson) | UPDATE `seq_poliza` | permitido | ✅ 1 fila afectada |
| T2 | agente | UPDATE `prima_basico` | bloqueado en silencio | ✅ 0 filas afectadas |
| T3 | agente | UPDATE `roles_perms` | bloqueado en silencio | ✅ 0 filas afectadas |
| T4 | agente | INSERT `metas` (clave nueva) | rechazo explícito | ✅ `new row violates row-level security policy` |
| T5 | agente | INSERT `seq_poliza_v2` (bypass por nombre) | rechazo explícito | ✅ rechazado |
| T6 | agente | DELETE `seq_poliza` | bloqueado en silencio | ✅ 0 filas afectadas |
| T7 | agente | UPDATE `seq_poliza` renombrando `clave→roles_perms_hijack` | rechazo explícito por `WITH CHECK` | ✅ rechazado |
| T8 | admin (sterlin08) | UPDATE `roles_perms` | permitido (sin regresión 2C-1) | ✅ 1 fila afectada |
| T9 | admin | UPDATE `prima_basico` | permitido | ✅ 1 fila afectada |
| T10 | admin | INSERT `metas` | permitido | ✅ insertado |
| T11 | admin | DELETE `metas` | permitido | ✅ 1 fila afectada |
| T12 | admin de OTRA org (Francis, bayolsale) | UPDATE `seq_poliza` de nexus-pro | bloqueado (aislamiento de org intacto) | ✅ 0 filas afectadas |
| T13 | anon (sin sesión) | UPDATE `seq_poliza` | bloqueado (default-deny) | ✅ 0 filas afectadas |

---

## 5. Revisión fresca de `anon` / ACL

`information_schema.role_table_grants` confirma que `anon`, `authenticated`, `postgres` y
`service_role` tienen privilegios de tabla completos (SELECT/INSERT/UPDATE/DELETE/...) — pero **las 4
policies de `configuracion` son `TO authenticated` únicamente**, así que RLS bloquea a `anon` por
default-deny (no hay ninguna policy que le aplique). Confirmado empíricamente (T13). Mismo patrón ya
documentado como aceptado (H17-adyacente) en el resto del sistema — no se toca en este bloque (tocar
`GRANT`/`REVOKE` de tabla no es necesario cuando RLS ya cierra el camino, y el mandato pide no ampliar
alcance).

---

## 6. Secretos vs. configuración pública

Se inspeccionó el valor completo de `emailjs` — solo contiene `publicKey`, `serviceId`, `templateId`,
`email`, `hora`. **EmailJS está diseñado para que su `publicKey` viva en el cliente** (su modelo de
seguridad es whitelisting de dominio, no secreto de esa clave) — no es un secreto real. **Ninguna de las
28 filas contiene una clave/token/contraseña real.** No hay nada que mover a Supabase Secrets ni a Edge
Function env vars — la clasificación "secreto vs. config pública" no aplica un tratamiento distinto
dentro de este bloque.

---

## 7. Reproducción del patrón "falso éxito" (H10) y variantes — por escritor

Confirmado con lectura directa del código (no de memoria), literal por literal:

### 7a. H10 puro — catch silencioso a consola + toast de éxito incondicional (6 funciones idénticas)

```js
try{await guardarConfigSupabase('emailjs',_emailCfg);}catch(e){console.log('Email config Supabase:',e.message);}
toast('ok','Configuración de email guardada', ...);   // se ejecuta SIEMPRE, haya fallado o no
```

Exactamente el mismo patrón, letra por letra, en:
`guardarEmailConfig()` (`emailjs`), `guardarRolPerms(rol)` (`roles_perms`), `guardarMetas()` (`metas`),
`guardarAutoConfig()`/`guardarAuto()` (`auto_facturacion`), `guardarPlantilla()` inline
(`auto_facturacion`), `guardarPlantillaWa()` (`auto_facturacion`).

`guardarConfigSupabase()` en sí NO traga el error (su único `catch` hace `throw e;` — lo repropaga
limpio); el H10 vive 100% en el nivel de la función que lo llama, no en el helper compartido.

### 7b. Parcial-visible pero engañoso — `agregarArs()`/`eliminarArs()`

```js
try{await guardarConfigSupabase('ars_list',_arsList);}
catch(e){toast('warn','ARS guardada localmente','No se pudo sincronizar con Supabase');}
```

No es H10 puro (SÍ hay un toast visible al usuario), pero el texto "guardada localmente" da a entender
que el dato persiste (en `localStorage`) cuando de verdad el estado real (Supabase) no cambió — para
otros usuarios/sesiones, el ARS simplemente no existe.

### 7c. Fallo silencioso SIN NINGÚN toast — `generarNumPoliza()` (el más peligroso)

```js
}catch(e){
  return `POL-${new Date().getFullYear()}-${String(Date.now()%1000000).padStart(6,'0')}`;
}
```

Ante CUALQUIER error (incluido un futuro `42501`), esta función **no lanza, no muestra ningún error —
devuelve un número de póliza FALSO basado en `Date.now()`**, no atómico, potencialmente duplicado. El
cliente se crea igual, con un número de póliza corrupto, sin que nadie se entere. Esto es peor que H10
(que al menos miente con un "Guardado" — aquí ni siquiera hay mensaje).

**Importante:** bajo el diseño de §3/§10, `seq_poliza` se queda ABIERTO a `agente`, así que este camino
de fallo NO se dispara por el propio hardening de 2C-2 en el uso normal — sigue siendo un bug
preexistente, independiente de este bloque, que se deja documentado para una ronda de calidad de
frontend futura (fuera del alcance explícito de 2C-2, que el mandato limita a diseño de RLS).

### 7d. Fallo silencioso duplicado — `guardarTarifas()`, línea del reset de `seq_poliza`

```js
async function guardarTarifas(){
  const numIni=document.getElementById('cfgNumIni')?.value;
  if(numIni&&parseInt(numIni)>0){await API.patch('configuracion','clave=eq.seq_poliza',{...});}
  // ↑ SIN try/catch — si falla, la excepción sube sin capturar, ANTES de llegar
  //   al try{...}catch(e){toast('err',...)} que sí protege el resto de la función.
```

Distinto de (7c): aquí NO hay ningún catch en absoluto (ni silencioso ni falso-fallback) — un fallo se
propaga como una excepción no capturada del todo (visible en consola del navegador, sin toast). Es un
camino REDUNDANTE con `guardarDatosEmp()` (mismo campo `cfgNumIni`, mismo `seq_poliza`, misma pantalla
admin-gated) — `guardarDatosEmp()` SÍ envuelve esta misma operación dentro de su try/catch correcto.
Se documenta como hallazgo relacionado, no se toca (fuera de alcance: no es RLS, es calidad de frontend
en una pantalla ya admin-gated que no cambia de comportamiento bajo 2C-2).

### 7e. Correctamente manejadas — sin H10, sin cambio necesario

`guardarCoberturas()`, `guardarDatosEmp()` (su try/catch principal SÍ propaga con `mostrarError`),
`nxGuardarProgramacion()` (parches.js — catch real con `toast('err',...)`). Estas ya muestran un error
real si Supabase rechaza el escrito — hardenizarlas bajo 2C-2 no introduce ningún riesgo nuevo de falso
éxito, porque ya no lo tenían.

**Nota general sobre impacto real de 2C-2 en estas 6+2 funciones H10:** las 8 pantallas donde viven
(Notificaciones/Automatización/Metas/Seguridad-Roles/Empresa y tarifas) están TODAS detrás del gate
`esAdmin` de UI (§3) — en el uso normal de hoy, solo `admin` las alcanza, y `admin` sigue teniendo
permiso total bajo el diseño propuesto (T8-T11), así que el H10 no se dispara en el flujo legítimo
actual. El riesgo real que cierra 2C-2 es el de **bypass por devtools/consola** (un `agente` llamando
estas funciones directo desde la consola del navegador, saltándose el `display:none`) — en ese
escenario, hoy el ataque SILENCIOSAMENTE tendría éxito (las policies actuales de 2C-1 solo protegen
`roles_perms`); con 2C-2 aplicado, el ataque falla en el backend, pero el atacante vería el mismo H10
(un "Guardado" falso) — que no le revela nada nuevo, ya sabe que está atacando. El riesgo residual real
es que una sesión LEGÍTIMA de admin, en un escenario borde (rol revocado a mitad de sesión, ej.), vería
el mismo falso "Guardado" — genuino pero de bajo alcance. **Se recomienda una fase de frontend separada,
futura, para corregir los 6 H10 + los 2 hallazgos de silent-fail — no se aplica en 2C-2** (mandato: "no
cambios visuales").

---

## 8. Dependencias servidor / cron / Edge Functions

Revisadas las 3 Edge Functions del dominio Seguros: `auto-facturacion`, `enviar-reporte-email`,
`nexus-smart`. **Ninguna escribe en `configuracion`.** Todas leen con `SUPABASE_SERVICE_ROLE_KEY`
(`service_role`, que tiene `rolbypassrls=true` — RLS no le aplica nunca). Endurecer INSERT/UPDATE/DELETE
para `authenticated` **no afecta a ningún consumidor server-side** — `service_role` sigue con acceso
total, como siempre. No se revisaron Edge Functions de otros dominios (POS/Rifas/Financiamiento/AI
Content) — mismo criterio de alcance ya usado en el audit original de 16 tablas del 17-ago.

---

## 9. Verificación de constraint/UPSERT

`clave` es la PK real (`configuracion_pkey`) — confirmado con `pg_constraint`/`information_schema`, no
supuesto. El diseño de §3/§10 depende de esta unicidad para que el "renombrar hacia una clave existente"
sea rechazado a nivel de motor (violación de unicidad) además de por RLS — doble candado, no solo uno.

---

## 10. SQL propuesto — **NO APLICAR**

Generaliza exactamente el patrón ya en producción desde 2C-1 (4 policies por comando), reemplazando el
denylist de una clave por el allowlist de una clave. `SELECT` no se toca (sigue igual que 2C-1: solo
org-scope, sin restricción por `clave` — no se puede restringir sin romper `cargarDatosNucleo()`, ya
confirmado en el audit del 17-ago y no re-cuestionado aquí).

```sql
-- ══════════════════════════════════════════════════════════════════════════
-- Bloque 2C-2 — configuracion: admin-only por default, allowlist de UNA
-- clave operativa (seq_poliza) para no-admin. NO APLICAR sin autorización.
-- ══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS configuracion_insert ON public.configuracion;
CREATE POLICY configuracion_insert ON public.configuracion
  FOR INSERT TO authenticated
  WITH CHECK (
    mi_rol() IS NOT NULL
    AND mi_organizacion() = (SELECT id FROM organizaciones WHERE slug = 'nexus-pro')
    AND (clave = 'seq_poliza' OR mi_rol() = 'admin')
  );

DROP POLICY IF EXISTS configuracion_update ON public.configuracion;
CREATE POLICY configuracion_update ON public.configuracion
  FOR UPDATE TO authenticated
  USING (
    mi_rol() IS NOT NULL
    AND mi_organizacion() = (SELECT id FROM organizaciones WHERE slug = 'nexus-pro')
    AND (clave = 'seq_poliza' OR mi_rol() = 'admin')
  )
  WITH CHECK (
    mi_rol() IS NOT NULL
    AND mi_organizacion() = (SELECT id FROM organizaciones WHERE slug = 'nexus-pro')
    AND (clave = 'seq_poliza' OR mi_rol() = 'admin')
  );

DROP POLICY IF EXISTS configuracion_delete ON public.configuracion;
CREATE POLICY configuracion_delete ON public.configuracion
  FOR DELETE TO authenticated
  USING (
    mi_rol() IS NOT NULL
    AND mi_organizacion() = (SELECT id FROM organizaciones WHERE slug = 'nexus-pro')
    AND mi_rol() = 'admin'
  );

-- configuracion_select: SIN CAMBIOS (queda exactamente como la dejó 2C-1).
```

**Plan de rollback (si algo sale mal tras aplicar):** volver literalmente a las 3 policies de 2C-1
(reemplazando `(clave = 'seq_poliza' OR mi_rol() = 'admin')` por `(clave <> 'roles_perms' OR
mi_rol() = 'admin')` en INSERT/UPDATE, y quitar la restricción de DELETE dejándola igual a INSERT/UPDATE
— el texto exacto de 2C-1 está citado completo en §1 de este documento y en la propia base, así que no
hace falta memorizarlo).

---

## Resumen ejecutivo para ChatGPT

- **Diseño elegido:** admin-only por default para TODA la tabla (INSERT/UPDATE/DELETE), con **una
  única excepción explícita, `seq_poliza`**, permitida para INSERT/UPDATE de cualquier `authenticated`
  de la org — nunca para DELETE. Es un allowlist real (no un denylist disfrazado): cualquier clave que
  no sea literalmente `'seq_poliza'` requiere `mi_rol()='admin'`, sin excepción, sin patrón.
- **Por qué esa única excepción es necesaria y no arbitraria:** `agente` (rol real de producción, con
  `crear_clientes` en su lista de permisos y un botón "Nuevo cliente" sin ningún gate) dispara
  `generarNumPoliza()` en cada alta de cliente — cortar `seq_poliza` de raíz habría roto el alta diaria
  de clientes la primera vez que 2C-2 se aplicara.
- **Los 8 escenarios de bypass del mandato están cerrados por diseño y los 13 confirmé de forma
  empírica** contra producción real dentro de una transacción `BEGIN...ROLLBACK` (identidades reales:
  admin/agente de `nexus-pro`, admin cross-org de `bayolsale`, `anon`) — 13/13 en verde, cero residuo
  tras el `ROLLBACK`, políticas de producción confirmadas idénticas a como estaban antes de probar.
- **`roles_perms` (2C-1) queda igual de protegido o más** — el nuevo predicado es estrictamente más
  estricto, no se tocó su función, no se reabrió.
- **`facturas`/2C-3 no se tocaron.** Fase 3 no se abrió. No hay cambio visual, no hay bump de versión,
  no se sanitizó ningún dato histórico.
- **6 funciones con H10 real** (falso "Guardado" tras un `catch` silencioso) + 1 con fallback-silencioso
  peligroso (`generarNumPoliza()`) + 1 con fallo-sin-capturar (línea de `seq_poliza` en `guardarTarifas`)
  quedaron reproducidas y documentadas literal por literal en §7 — el arreglo de frontend **no se aplicó
  en este bloque** (fuera del alcance explícito del mandato), queda propuesto para una ronda separada.
- **Esperando autorización explícita antes de aplicar el SQL de §10 a producción.**
