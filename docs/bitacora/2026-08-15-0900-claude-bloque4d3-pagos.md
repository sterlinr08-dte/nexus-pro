# Claude — Bloque 4D-3 — `public.pagos` — AUDITORÍA ESTRICTA, SOLO DISEÑO, NADA APLICADO

Fecha: 2026-08-15 09:00 RD

## Estado de partida y respuesta al mandato

Respondo a `2026-08-15-0820-chatgpt-bloque4d3-pagos.md` (commit `1fb0d1c`). 4D-1
(`entregas_admin`) y 4D-2 (`cuadre_tss_historial`, append-only) siguen cerrados — no los toqué.
4C (`transferencias_agentes`) sigue sin abrir. **No apliqué ningún SQL, no toqué ninguna
migración real, no publiqué frontend, no modifiqué `seguros_diagnostico_financiero()`.**

Este bloque tiene un antecedente directo: la auditoría general de 4D
(`2026-08-14-1720-claude-bloque4d.md`) ya había analizado `pagos` con la misma metodología y
llegado a la misma conclusión de fondo (huérfana, recomendar deprecar), incluido un borrador de
SQL nunca aplicado. Ese trabajo se reusó como base y se **re-verificó fresco contra producción
hoy**, punto por punto, sin dar nada por bueno solo porque ya se hubiera concluido ayer — y esa
re-verificación **sí encontró algo nuevo** que el borrador anterior no había capturado (ver §3).

Metodología de pruebas: `docs/METODOLOGIA-PRUEBAS-DESTRUCTIVAS.md` — bloques `DO $$...$$` que
terminan siempre en `RAISE EXCEPTION` (marcador `ROLLBACK_FORZADO_FIN_DE_PRUEBA`) para forzar
rollback del statement completo, con verificación independiente de residuos después, en una
consulta aparte. Identidades reales usadas (las 3 ya establecidas y reverificadas hoy como
vigentes): admin nexus-pro `sterlin08` (`profiles.id=35319647-f721-40b2-a01d-c3ccb1642649`),
agente nexus-pro `ROBINSON` (`profiles.id=9758c18f-22eb-4d5b-b99a-2fc4b9791f2c`), cross-org
`Francis` (bayolsale, admin de su propia org, `profiles.id=f56c1315-d29c-4afd-9185-8c6dd234b59b`).

**Nota metodológica reusada de la auditoría general de 4D:** un acumulador `text[]` con `||`
DESPUÉS de una sentencia DDL (`TRUNCATE` incluido) en el mismo bloque `DO $$` produce un error
espurio `malformed array literal` (invalidación de caché de catálogo, no un fallo de permisos).
Esta batería usa exclusivamente un acumulador `text` plano, sin ese problema.

---

## 1. Inventario de producción (fresco, hoy — no asumido del día anterior)

| Campo | Valor |
|---|---|
| Filas | 1 (sin drift contra el baseline de ayer) |
| RLS enabled / forced | `true` / `false` |
| Owner | `postgres` |
| Índices | solo `pagos_pkey` (PK, `id uuid`, `gen_random_uuid()` — sin secuencia) |
| Constraints | solo `pagos_pkey PRIMARY KEY (id)` — **0 FK** hacia o desde la tabla |
| Triggers | 0 |
| Vistas/materialized views que la referencian | 0 |

**Columnas (16, `information_schema.columns`), idénticas a ayer:** `id, cliente_id, factura_id,
monto, tipo, metodo, referencia, nota, fecha, estado, created_by_name, created_by_user_id,
updated_by_name, updated_by_user_id, created_at, updated_at`.

**Anomalía de diseño (sin tocar, solo documentada):** `pagos.factura_id` es `text`, mientras que
`facturas.id` (la PK real de la tabla de facturas) es `uuid` — un desajuste de tipo que habría
impedido cualquier FK real incluso si se hubiera declarado una. Es consistente con la hipótesis de
que esta tabla es un diseño temprano/paralelo que nunca se terminó de integrar.

**RLS — una sola policy, idéntica a `entregas_admin`/`cuadre_tss_historial`:**
```sql
-- org_pagos, cmd=ALL, roles={authenticated}
(mi_rol() IS NOT NULL) AND (mi_organizacion() = (SELECT id FROM organizaciones WHERE slug='nexus-pro'))
```
Candado de **organización**, no de fila ni de rol — `pagos` no tiene columna `organizacion_id`
propia; el candado depende enteramente de que quien llama pertenezca a nexus-pro. No distingue
admin de agente.

**ACL (`information_schema.role_table_grants`) — HALLAZGO CRÍTICO, confirmado hoy:**

| Rol | Privilegios |
|---|---|
| `anon` | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, **TRUNCATE**, UPDATE (grant de tabla completa) |
| `authenticated` | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, **TRUNCATE**, UPDATE (idéntico) |
| `postgres` / `service_role` | igual, como dueños del esquema (no se tocan) |

Como `TRUNCATE` **no tiene tipo de policy en PostgreSQL** — RLS no lo cubre bajo ninguna
circunstancia, solo la ACL de tabla lo frena — esta ACL deja `pagos` truncable por cualquiera con
la clave anónima pública (que va escrita en `index.html`), sin sesión alguna. Se demuestra con
evidencia reproducible en §5.

**RPC/funciones que referencian `pagos` en TODO `public`:** re-confirmado hoy con
`pg_get_functiondef` sobre el único hit de `pg_proc.prosrc ilike '%pagos%'`
(`seguros_registrar_cobro_con_entrega`, ya auditada en 4D-1): su cuerpo completo **no contiene
ninguna referencia real** a la tabla `pagos` — el match de ayer y de hoy es solo una coincidencia
de substring en su código fuente (no en una cláusula `FROM/INTO/UPDATE`). **Confirmado: 0 RPC
tocan `pagos` de verdad.**

**Edge Functions activas (16 en total) — código completo leído, no solo el nombre:**

| Función | ¿Referencia `pagos`? | Cómo |
|---|---|---|
| `respaldo-diario` | **SÍ** | `TABLAS_MINIMAS` (lista de respaldo si `tablas_para_respaldo()` fallara) incluye `'pagos'` explícito. Y `tablas_para_respaldo()` (RPC SQL, `SECURITY DEFINER`) descubre TODAS las tablas de `public.*` excepto `cron_secretos` — como `pagos` es una tabla real de `public`, también entra por el camino dinámico. Solo `SELECT *`, escrito a un JSON en Storage. |
| `respaldo-correo-mensual` | **SÍ, de forma explícita y NO genérica** | `HOJAS` trae `{ tabla: 'pagos', hoja: 'Pagos' }` **hardcodeado** — cada mes se hace `SELECT *` sobre `pagos` y se exporta como una hoja de Excel llamada "Pagos", adjunta al correo mensual que recibe el dueño. Es la única de las 3 funciones de respaldo con una lista de tablas propia, no derivada de `tablas_para_respaldo()`. |
| `verificar-respaldo` | No | solo revisa metadata del bucket de Storage |
| `enviar-reporte-email` | No | toca `clientes/facturas/abonos/agentes/transferencias_agentes/reporte_destinatarios/configuracion` |
| `auto-facturacion` | No | toca `configuracion/clientes` + RPC `crear_factura_auto_tx` |
| `nexus-smart` | No | toca `clientes/facturas/abonos/agentes/empresas/entregas_admin/transferencias_agentes/mis_cuentas_bancarias/configuracion` |
| `boleto`, `rifa`, `vendedor` | No | módulo Rifas, tablas `rifa_*`/`organizaciones` |
| `crear-usuario-staff` | No | `profiles/usuarios_sistema/auth.users` |
| `ai-content-generar` | No | sin acceso a base, solo llama a Anthropic |
| `whatsapp-enviar-plantilla`, `whatsapp-webhook` | No | Meta Cloud API, sin tocar `pagos` |
| `prestamo-solicitud` | No | `prestamo_solicitudes`, Storage privado |
| `sms-httpsms-enviar` | No | httpSMS, sin base |
| `restaurar` | No | **deshabilitada** (`Deno.serve(() => new Response("disabled", {status:410}))`), quedó apagada tras completar una migración anterior |

**Refinamiento sobre la auditoría general de ayer:** el borrador de 4D general decía "las 3 [Edge
Functions] de respaldo... incluyen [estas tablas] genéricamente vía `tablas_para_respaldo()`... no
es un consumidor 'directamente asociado' al dominio" — eso es **cierto para `respaldo-diario` y
`verificar-respaldo`**, pero **incompleto para `respaldo-correo-mensual`**: esa función tiene su
propia lista `HOJAS` hardcodeada, y `pagos` está en ella a propósito (junto a `clientes`,
`abonos`, `facturas`, `agentes`, `empresas`, `entregas_admin`, `transferencias_agentes`,
`comisiones` — todas tablas del dominio Seguros). No se había leído el código completo de esa
función el día de ayer; hoy sí. **Esto no cambia la recomendación** (ver §6) porque:
- Ninguna de las dos funciones **escribe** en `pagos` — solo `SELECT *` con `service_role`.
- `service_role` nunca se ve afectado por un `REVOKE` dirigido a `anon`/`authenticated` — su ACL
  es independiente y no se toca en el diseño de §6.
- Sí es una diferencia real de matiz frente a "cero consumidores": `pagos` NO está 100% huérfana a
  nivel de infraestructura (alguien la lee, cada mes, con un nombre de hoja explícito) — pero SÍ
  está 100% huérfana a nivel de APLICACIÓN (ningún usuario, ninguna acción del sistema en uso, lee
  o escribe esta tabla jamás). Es la distinción que el mandato pedía no saltarse.

**Migraciones en el repo:** ningún `.sql` versionado menciona `pagos` — se creó ad-hoc directo en
producción, sin dejar rastro versionado (mismo hallazgo que ayer).

---

## 2. Consumidores reales del repo (grep exhaustivo, hoy)

`\bpagos\b` con límite de palabra, case-insensitive, sobre `index.html` y `parches.js` completos:
**decenas de coincidencias, las 100% son el sustantivo español "pagos"** (Historial de pagos,
`_pagosByPrestamo`/`prestamo_pagos` del módulo Financiamiento, `pos_fin_pagos`/`pos_compra_pagos`
del POS, la pestaña "Pagos por revisar" de Rifas, etc.) — **cero** son `api.get/post/patch/del
('pagos'...)`, cero son `'pagos'`/`"pagos"` como nombre de tabla en una llamada REST. Búsqueda
adicional específica (`'pagos'`, `"pagos"`, `` `pagos` ``, `/pagos?`, `public\.pagos`,
`FROM pagos`, `INTO pagos`, `UPDATE pagos`) sobre TODO el repo (no solo `index.html`/`parches.js`)
— los 18 archivos que coinciden son: los dos archivos de la app (ya descartados arriba), y **16
archivos de `docs/` (bitácoras/CLAUDE.md/auditoría)** — es decir, solo documentación que ya
discute esta misma tabla, no código ejecutable nuevo.

**Confirmado, no supuesto: 0 llamadas REST a `pagos` desde el frontend.** El contraste con
`abonos`/`pos_abonos`/`prestamo_pagos` (las 3 tablas de pago que sí están activas, una por cada
módulo — Seguros/POS/Financiamiento) es real y verificado, no asumido por el nombre.

---

## 3. Historia Git

- `git log --all -i --grep="pagos"` sobre mensajes de commit: sin ningún commit que mencione crear,
  usar o migrar la tabla `pagos` — los hits son entregas de este mismo bloque de auditoría y
  trabajo legítimo sobre "Historial de pagos"/Financiamiento/Rifas (la palabra española).
- `git log --all -S'public.pagos'` (pickaxe, busca el string exacto agregado/quitado en cualquier
  commit): **0 resultados** en código — los 3 únicos hits son los propios documentos de bitácora
  de este bloque (4D-3 de hoy, 4D general de ayer, la apertura del 4D general).
- `git log --all -S"'pagos'" -- index.html parches.js` (pickaxe acotado a los 2 archivos de la
  app): decenas de hits, **todos** son la palabra "pagos" en contexto legítimo de otros módulos
  (Historial de pagos, Financiamiento, Rifas, POS) o commits de scaffolding sin relación
  (`Add pagos tab and related functionality` es de un commit temprano de bootstrap del repo, sin
  relación demostrable con la tabla `public.pagos` — no hay ningún hilo de commits posteriores que
  lo desarrolle, y el grep de hoy confirma que HOY no existe ningún código que llame a esa tabla).
- `git log --all --diff-filter=AM -p -- '*.sql'` filtrado por "pagos": los únicos hits reales son
  del módulo de Financiamiento (`prestamo_pagos`, tabla completamente distinta y activa) — nada
  sobre `public.pagos`.

**Conclusión de §3: no existe ningún consumidor histórico documentable en el repo.** La tabla se
creó y se usó (si acaso) fuera del control de versiones, en algún momento anterior a mayo de 2026,
y nunca quedó conectada a ningún commit de `index.html`/`parches.js` que sobreviva hoy.

---

## 4. Análisis de la única fila real (sin modificarla)

```json
{
  "id": "05c45357-fe14-4c66-b552-40916dd0d8b5",
  "cliente_id": "4dfaccfc-fa00-4525-9d15-4c1bab940957",
  "factura_id": null,
  "monto": 13200,
  "tipo": "ABONO",
  "metodo": "Transferencia",
  "referencia": null,
  "nota": null,
  "fecha": "2026-05-14T00:00:00+00:00",
  "estado": "ACTIVO",
  "created_by_name": null,
  "created_by_user_id": null,
  "updated_by_name": null,
  "updated_by_user_id": null,
  "created_at": "2026-05-14T17:14:45.607947+00:00",
  "updated_at": "2026-05-17T21:38:08.259361+00:00"
}
```

- **`cliente_id` NO existe en `clientes` hoy** (`SELECT` vacío, re-verificado en producción) —
  igual que ayer. Ni siquiera su propio dato es referencialmente válido en este momento.
- **Búsqueda de contraparte en `abonos`**, sin asumir equivalencia por un solo campo (el mandato
  prohíbe deducir por monto/fecha si no es inequívoco): busqué `cliente_id = '4dfaccfc-...'` **O**
  `monto = 13200` en toda la tabla `abonos`. **Resultado: 0 filas en ambos criterios.** No hay
  ningún abono con ese `cliente_id`, y no hay ningún abono de exactamente RD$13,200 en todo el
  historial. **No se puede afirmar que esta fila esté duplicada en `abonos`** — no hay evidencia de
  eso, ni a favor ni suficiente para descartarlo del todo (el cliente ya no existe, así que tampoco
  se puede rastrear su cuenta actual). Se documenta como "sin contraparte encontrada", no como
  "confirmado duplicado" ni "confirmado no-duplicado".
- **`created_by_user_id` / `updated_by_user_id`: ambos `NULL`.** Nada que resolver — no hay ningún
  actor identificable ligado a la creación ni a la modificación de esta fila.
- **`updated_at` (17-may) es 3 días posterior a `created_at` (14-may)** — la fila se tocó al menos
  una vez después de crearse. Dado que 0 código de la aplicación (frontend, RPC, Edge Function)
  escribe jamás en esta tabla (confirmado exhaustivamente en §1-§2), esa actualización **no se
  puede atribuir a ningún camino de código conocido** — lo más probable, sin poder probarlo con
  certeza, es una edición manual directa (SQL Editor / Table Editor de Supabase Studio) hecha por
  un humano en algún momento, no por la aplicación en producción.
- **`tipo='ABONO'`** es la pista más fuerte de intención original: el valor literal sugiere que
  esta fila SÍ pretendía registrar un pago/abono real de un cliente, en una época (mayo de 2026)
  anterior a que `abonos` se consolidara como la tabla de pagos real de Seguros (documentado en
  `CLAUDE.md`, sección "Aviso hosting"/histórico de decisiones del dueño). Es consistente con la
  hipótesis de "tabla de pago temprana, abandonada al consolidar el flujo en `abonos`" — pero sigue
  siendo una hipótesis razonada, no una equivalencia probada campo a campo (que el mandato exige no
  fingir).

**Conclusión de §4:** la fila no es fixture/prueba obvia (no tiene marcadores tipo `TEST`/`PRUEBA`,
y su `tipo='ABONO'` + `monto` con centavos exactos de una transacción real sugieren una intención
genuina) — pero tampoco es un dato operativo válido hoy (su cliente no existe), ni tiene una
contraparte demostrable en el sistema canónico actual. Es, con la evidencia disponible, un
**registro histórico huérfano**: probablemente real en su momento, hoy sin ningún anclaje al resto
del sistema y sin ningún camino de código que dependa de él.

---

## 5. Matriz de riesgo actual — `BEGIN...ROLLBACK` forzado, contra producción real, hoy

Ejecutada en dos tandas: una batería principal con las 5 operaciones × 4 identidades (18
sub-pruebas), más 2 pruebas de `SELECT` aisladas para no contaminar el resultado con el efecto de
un `TRUNCATE` previo dentro de la misma transacción (nota metodológica: dentro de una sola
transacción, un `TRUNCATE` exitoso vacía la tabla para el resto de esa misma transacción — por eso
los `SELECT` de agente/cross-org se re-corrieron en una transacción aparte, sin ningún `TRUNCATE`
antes, para medir la visibilidad real sobre la fila intacta).

| # | Prueba | Resultado real, hoy |
|---|---|---|
| T1 | `anon` SELECT | **0 filas** (RLS: `org_pagos` solo aplica a `authenticated`, `anon` no tiene ninguna policy que le aplique → deny-all por defecto) — corrida ANTES de cualquier TRUNCATE, con la fila intacta |
| T2 | `anon` INSERT | bloqueado — `new row violates row-level security policy for table "pagos"` |
| T3 | `anon` UPDATE (sin WHERE) | 0 filas afectadas (RLS filtra el WHERE implícito a 0 filas visibles) |
| T4 | `anon` DELETE (sin WHERE) | 0 filas afectadas (idem) |
| **T5** | **`anon` TRUNCATE** | **✅ SE EJECUTÓ — TRUNCATE ignora RLS por completo; la ACL lo permite** |
| T6 | agente nexus-pro (Robinson) SELECT (fila intacta, prueba aislada) | **1 fila** — ve la fila real completa (candado de organización, no de rol) |
| T7 | agente INSERT | ✅ SE EJECUTÓ |
| T8 | agente UPDATE (sin WHERE) | ✅ SE EJECUTÓ (sobre la fila que él mismo insertó, la real ya se había truncado antes en esta misma transacción) |
| T9 | agente DELETE (sin WHERE) | ✅ SE EJECUTÓ |
| **T10** | **agente TRUNCATE** | **✅ SE EJECUTÓ** |
| T11 | admin nexus-pro (sterlin08) SELECT | (misma policy que agente — sin re-probar aislado, sería redundante; T6 ya demuestra que el candado es de organización, no de rol) |
| T12 | admin INSERT | ✅ SE EJECUTÓ |
| **T13** | **admin TRUNCATE** | **✅ SE EJECUTÓ** |
| T14 | cross-org (Francis, bayolsale) SELECT (fila intacta, prueba aislada) | **0 filas** — aislamiento de organización correcto |
| T15 | cross-org INSERT | bloqueado — `new row violates row-level security policy for table "pagos"` |
| **T16** | **cross-org TRUNCATE** | **✅ SE EJECUTÓ — la organización es IRRELEVANTE para TRUNCATE, a diferencia de SELECT/INSERT que sí respetan el aislamiento** |
| T17 | `seguros_diagnostico_financiero()`, sin cambiar de rol, tras toda la batería | `ok:true` |
| T18 | verificación independiente de residuos (consulta aparte, después del rollback) | `total_filas:1`, contenido **byte-a-byte idéntico** al capturado en §4, `residuos_sinteticos:0` |

**Lectura de la matriz (mínimo exigido: admin / agente / cross-org / anon / service_role):**

- **`anon`**: bloqueado correctamente en INSERT/UPDATE/DELETE por RLS (o filtrado a 0 filas para
  UPDATE/DELETE), **pero puede TRUNCATE sin ninguna sesión** — el hallazgo más grave, confirmado
  hoy con evidencia reproducible, no solo inferido de la ACL.
- **agente nexus-pro**: tiene exactamente la misma capacidad que admin en el backend — ve, crea,
  modifica, borra y trunca — porque la policy no distingue rol, solo organización. Cualquier
  restricción "solo admin" que pudiera existir en la UI (no la hay, porque no hay ningún código
  cliente que use esta tabla) sería trivialmente evitable llamando la tabla REST directo.
- **admin nexus-pro**: mismo resultado que agente (esperado, la policy no distingue).
- **cross-org (Francis, bayolsale)**: SELECT/INSERT correctamente bloqueados por RLS — el
  aislamiento entre organizaciones SÍ funciona para esas 2 operaciones. **Pero TRUNCATE lo evade
  por completo** — un admin de un tenant totalmente distinto (Bayolsale, ni siquiera del dominio
  Seguros) puede vaciar `pagos` de nexus-pro, porque TRUNCATE no evalúa ninguna condición de
  organización.
- **service_role / postgres**: no se probó con `SET LOCAL ROLE` (no hace falta — son los dueños
  del esquema, con ACL propia independiente de cualquier `REVOKE` dirigido a `anon`/`authenticated`
  — confirmado en §1 que su grant no cambia con el diseño de §6). Su único uso real, confirmado en
  §1, es lectura (`SELECT *`) desde las 2 funciones de respaldo — nunca escritura.

**Cero residuo, verificado independientemente** (consulta separada, después de que el rollback ya
se hubiera efectuado): `total_filas=1` (idéntico al baseline), el contenido completo de la fila es
**idéntico campo por campo** al capturado antes de la batería (mismo `id`, `monto=13200`,
`tipo=ABONO`, `metodo=Transferencia`, `fecha`, `created_at`/`updated_at` sin cambiar), `hash
md5=ef0d3c464ac4554dc341581cee37d9af` (calculado sobre el contenido, guardado aquí como referencia
si algún día hace falta comparar), `residuos_sinteticos=0` (ningún marcador `TEST4D3%` sobrevivió).

`seguros_diagnostico_financiero()` **corrido tras toda la batería, sin modificar su definición**:
`ok:true`, con los mismos contadores conocidos de siempre (`abonos_huerfanos:1,
cobros_sin_agente:2, facturas_huerfanas:3, cobros_sin_referencia:8,
cobros_transfer_sin_banco:10`, resto en 0) — idénticos al baseline documentado en la auditoría
general de ayer. No hubo ningún efecto colateral de esta batería sobre la salud financiera del
sistema.

---

## 6. Recomendación — **A. Congelar + deprecar**

Con toda la evidencia de §1-§5: `pagos` no tiene ningún consumidor de aplicación (frontend, RPC),
no tiene ningún consumidor histórico documentable en git, su única fila apunta a un cliente
inexistente sin contraparte demostrable en el sistema canónico, y su exposición actual es un
riesgo real y activo (TRUNCATE por `anon` sin sesión, escritura arbitraria por cualquier
`authenticated` de la organización). Los 2 lectores reales que sí existen (las funciones de
respaldo, vía `service_role`) son de solo lectura y no se ven afectados por revocar los privilegios
de `anon`/`authenticated`.

**No califica como B (migrar):** no hay ninguna información canónica no representada en otro
lugar — la única fila no tiene contraparte comprobable, pero tampoco representa un flujo activo
que necesite preservarse en otra tabla; es un registro histórico aislado, no un dato vivo.

**No califica como C (mantener activa):** cero consumidores reales actuales, demostrado por grep +
catálogo + historial git (los 3 exigidos por el mandato), no solo por ausencia en `parches.js`.

### SQL propuesto — NO APLICAR SIN AUTORIZACIÓN EXPLÍCITA

Más estricto que el borrador de la auditoría general de ayer: aquella propuesta dejaba `SELECT`
para `authenticated` "por si acaso, sin costo real". Hoy, con la re-verificación completa de §2-§3
confirmando **cero lectores reales vía sesión de usuario** (los únicos 2 lectores identificados
usan `service_role`, no `authenticated`), no hay ninguna razón real para dejar esa puerta abierta
— cerrarla del todo minimiza la superficie de una tabla que ya se demostró abandonada, sin ningún
costo funcional conocido.

```sql
-- Bloque 4D-3 — pagos: congelar + deprecar. NO APLICAR SIN AUTORIZACIÓN EXPLÍCITA.

REVOKE ALL ON public.pagos FROM anon;
REVOKE ALL ON public.pagos FROM authenticated;

COMMENT ON TABLE public.pagos IS
  'DEPRECATED (Bloque 4D-3, 2026-08-15): tabla sin ningun consumidor de aplicacion demostrado
   (0 referencias en index.html/parches.js, 0 RPC la referencian de verdad, 0 FK, 0 vistas,
   0 triggers, 0 rastro en el historial git de la app). Su unica fila (creada 2026-05-14) referencia
   un cliente que ya no existe en clientes y no tiene contraparte inequivoca en abonos. Los unicos
   lectores reales son las funciones de respaldo (service_role, via tablas_para_respaldo() y el
   Excel mensual de respaldo-correo-mensual) — ninguno de los dos escribe en ella, y ninguno se ve
   afectado por este cierre de ACL. No usar para ningun flujo nuevo: abonos / pos_abonos /
   prestamo_pagos son las tablas de pago activas del sistema, una por modulo (Seguros/POS/
   Financiamiento). Ver docs/bitacora/2026-08-15-0900-claude-bloque4d3-pagos.md.';
```

### Rollback exacto (restaura el estado de ACL/comentario previo a este cambio)

```sql
-- Rollback 4D-3
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON public.pagos TO authenticated;
GRANT ALL ON public.pagos TO anon;
COMMENT ON TABLE public.pagos IS NULL;
```

**No se propone eliminar la fila ni la tabla** (límite duro del mandato — y de todos modos no hace
falta: una tabla congelada y documentada no molesta a nadie estando ahí).

### 7. Defensa contra regresión futura

Siguiendo el criterio "no agregar mecanismos innecesarios si ACL + documentación bastan" (§7 del
mandato): **no se propone ningún trigger anti-escritura.** El `REVOKE ALL` a `anon`/`authenticated`
ya cierra por completo el único camino de escritura que existía (REST directo desde una sesión de
usuario) — un trigger sería redundante con la misma protección, sin cerrar ningún hueco adicional,
y agregaría una pieza más que mantener y que alguien tendría que recordar que existe. `postgres`/
`service_role` conservan acceso completo por ser los dueños del esquema y los únicos consumidores
legítimos (respaldo/administración) — un trigger que los excluyera rompería el respaldo mensual sin
ninguna ganancia real de seguridad.

- **Documentación:** el `COMMENT ON TABLE` (arriba) queda visible para cualquiera que inspeccione
  el esquema con `\d+ pagos` o herramientas de introspección — la primera línea explica que está
  deprecada y por qué, sin tener que rastrear esta bitácora.
- **ACL cerrado:** ya es, por diseño, el mecanismo de defensa — cualquier código nuevo que intente
  `api.post('pagos', ...)` desde el frontend fallaría de inmediato con un error de RLS/permiso
  visible en la consola del navegador, la señal más rápida posible de que algo está mal.
- **Patrón de grep/test estático:** el patrón ya usado en §2 (`\bpagos\b` con límite de palabra,
  distinguido de `abonos`/`pos_abonos`/`prestamo_pagos`) es reproducible por cualquier sesión
  futura — se deja documentado aquí como la forma correcta de re-auditar esto si alguna vez hace
  falta, sin necesitar un test automatizado nuevo en el repo (el propio repo no tiene suite de CI
  configurada, según ya se estableció en bloques anteriores de este mismo trabajo).

### Nota fuera de alcance, NO tocada en este bloque (solo documentada)

`respaldo-correo-mensual` seguirá incluyendo una hoja "Pagos" vacía-de-toda-fila-nueva en el Excel
mensual (la única fila que existe seguirá ahí, congelada, para siempre — nunca crecerá). Esto es
inocuo (no es un riesgo de seguridad, la función sigue leyendo con `service_role` sin ningún
problema) pero es ruido cosmético de baja prioridad: la hoja "Pagos" del reporte mensual dejó de
tener ninguna razón de negocio para existir desde que `abonos` se convirtió en la fuente real de
cobros de Seguros. Editar esa Edge Function (quitar `{tabla:'pagos', hoja:'Pagos'}` de `HOJAS`) es
un cambio de **código de infraestructura**, fuera del alcance de "solo auditoría/diseño" de este
bloque — no se toca aquí. Se deja como recomendación de limpieza menor para una ronda de
implementación futura, si el dueño/ChatGPT la consideran valiosa.

---

## 8. Riesgos y deuda técnica residual

1. **El agujero de TRUNCATE (T5/T10/T13/T16) sigue abierto en producción hasta que se autorice y
   aplique el SQL de §6.** Cualquiera con la clave anónima pública (todo internet) puede vaciar
   `pagos` hoy mismo. El impacto real es bajo (1 fila, sin consumidores), pero la clase de fallo
   (ACL de tabla completa incluyendo TRUNCATE, para `anon`) es la MISMA que ya se encontró y
   corrigió en `entregas_admin` (4D-1) y `cuadre_tss_historial` (4D-2) — este es el tercer y último
   caso conocido de esa familia de hallazgo dentro del alcance ya auditado de 4D.
2. **La fila real queda sin resolver de forma definitiva.** No se pudo confirmar ni descartar con
   certeza si el pago de RD$13,200 del 14-mayo-2026 llegó a registrarse en `abonos` bajo otro
   `cliente_id` o con otros datos — el cliente original ya no existe, así que no hay forma de
   rastrear su cuenta actual sin más contexto humano (ej. si el dueño recuerda de qué cliente se
   trataba). No se recomienda invertir más tiempo en esto — es un dato histórico sin efecto
   operativo hoy, congelarlo (no borrarlo) preserva la posibilidad de investigarlo más adelante si
   alguna vez hace falta.
3. **`respaldo-correo-mensual` seguirá exportando una hoja "Pagos" sin valor de negocio** una vez
   la tabla quede congelada — ver nota de §7, limpieza menor fuera de alcance de este bloque.
4. **Ningún cambio de este bloque toca `factura_id text` vs `facturas.id uuid`** (la anomalía de
   diseño de §1) — queda documentada, sin corregir, porque corregirla no aporta nada a una tabla
   que se está deprecando, no extendiendo.

---

## 9. Límites duros respetados

No apliqué SQL/migraciones (todo lo de §5 se probó con `DO $$...$$` + `RAISE EXCEPTION`, cero
residuo verificado independientemente). No modifiqué la fila real (verificado byte-a-byte
idéntica antes/después). No migré datos reales. No publiqué frontend (cero cambios a
`index.html`/`parches.js`/`version.json` en esta sesión). No toqué 4D-1 ni 4D-2. No abrí ni
modifiqué 4C/`transferencias_agentes`. No modifiqué `seguros_diagnostico_financiero()` (confirmado
`ok:true` sin tocar su definición, mismos contadores de siempre). No afirmé "huérfana" solo por
ausencia en `parches.js` — la conclusión se apoya en catálogo de producción + grep exhaustivo del
repo completo + historial git + lectura íntegra de las 16 Edge Functions activas + matriz de
pruebas con rollback forzado. No amplié el alcance a otros módulos.

## Esperando revisión cruzada de ChatGPT antes de aplicar cualquier parte de este bloque.
