# Claude — Bloque 4D-1 CERRADO — `entregas_admin` vía RPC atómica (backend + frontend)

Fecha: 2026-08-15 (RD)

## Contexto

`2026-08-14-2152-claude-bloque4d1-revision2.md` cerró la revisión cruzada de ChatGPT y dejó
autorizado — con la aprobación explícita del dueño ("Procede ya con la implementación
(Recomendado)... 4D-1 (backend + migración + frontend + matriz E2E), bajo la misma metodología
de bloque único con rollback forzado y verificación de cero residuos. Sin tocar 4D-2/4D-3/4C")
— implementar el diseño completo de `entregas_admin`. El backend (migración, 7 funciones, ACL
lockdown, batería de ~31 pruebas, verificación de cero residuos) se aplicó y verificó en una
sesión anterior a esta entrada. Esta entrada cierra lo que quedaba: migrar `regAbono()`/
`nxRegAbonoDeudaAnterior()` a la RPC con entrega, retirar la heurística de los 90 segundos,
migrar el panel "Solicitudes" (4 funciones que seguían escribiendo REST directo, ya bloqueado
por el ACL nuevo), y el corolario obligado del cambio de "anular" a soft-delete: filtrar
`!anulado` en cada consumidor que suma/lista `entregas_admin`.

## Backend (re-confirmado en esta sesión, sin re-aplicar nada)

Las 7 funciones (`seguros_registrar_entrega_admin_directa`,
`seguros_registrar_entrega_admin_manual`, `seguros_confirmar_entrega_admin`,
`seguros_depositar_entrega_admin`, `seguros_anular_entrega_admin`,
`seguros_adjuntar_comprobante_entrega`, `seguros_registrar_cobro_con_entrega`) siguen aplicadas
tal como quedaron cerradas en la sesión anterior — esta sesión no tocó SQL ni migraciones, solo
consultó `pg_get_functiondef` de las 4 que el frontend consume directamente para confirmar el
contrato de parámetros exacto antes de escribir las llamadas:

- `seguros_registrar_entrega_admin_manual(p_agente_id, p_monto, p_metodo, p_banco,
  p_referencia, p_nota, p_fecha, p_idempotency_key)` — siempre crea `confirmado=false,
  depositado=false`; con la misma `idempotency_key` devuelve la fila existente
  (`reintento:true`), nunca duplica.
- `seguros_confirmar_entrega_admin(p_id)` — exige `anulado=false AND confirmado=false`; si ya
  estaba confirmada, devuelve `reintento:true` sin tocar nada; si está anulada, `RAISE
  EXCEPTION`.
- `seguros_depositar_entrega_admin(p_id, p_banco)` — permite admin O el agente dueño de la
  cuenta (`mi_agente_efectivo()`, compat temporal ya documentada, sin backfill a `profiles`).
- `seguros_anular_entrega_admin(p_id, p_motivo, p_idempotency_key)` — **sin guarda contra
  anular una entrega ya confirmada/depositada** (diseño intencional: el admin puede necesitar
  anular después de haber confirmado por error) — es justo la razón por la que el corolario de
  filtrado de abajo es obligatorio, no opcional.

## Frontend — piezas migradas en esta sesión

### `regAbono()` / `nxRegAbonoDeudaAnterior()` (`index.html`)

Ya venían migradas de `seguros_registrar_cobro` a `seguros_registrar_cobro_con_entrega` desde
una sesión previa a esta entrada (confirmado, no repetido) — el cobro y la entrega nacen en un
solo paso atómico del servidor cuando el método es Transferencia/Depósito con
`p_cuenta_destino_id`. El `entrega_id` real que devuelve la RPC se guarda en
`_ultimoAbono.entregaId`.

### El bauche (comprobante de pago) ya no busca "la entrega de los últimos 90 segundos"

La IIFE `__NEXUS_BAUCHE_V1__` (`parches.js`) llamaba antes a
`api.get('entregas_admin', 'cobro_id=eq.<cid>&order=created_at.desc&limit=1')` y adjuntaba el
comprobante solo si esa fila tenía menos de 90 segundos — una heurística que un cobro
simultáneo de otro cajero podía romper (adjuntar al comprobante equivocado, o fallar
silenciosamente). Ahora llama a `rpc/seguros_adjuntar_comprobante_entrega({p_id:
entregaId, p_url: url})` con el `entrega_id` REAL devuelto por el cobro — sin heurística de
tiempo, sin ambigüedad posible.

### `envolverRegAbono()` de la IIFE "COBRO DIRECTO A CUENTA DEL ADMIN" — retirado por completo

Esa función (dentro de `parches.js`) envolvía `window.regAbono` para, tras un cobro exitoso a
Transferencia/Depósito, hacer un **segundo** `api.post('entregas_admin', payload)` armado a mano
en el navegador — exactamente el hueco que el ACL nuevo cierra (y que ya no podía funcionar tras
aplicarlo). Se eliminó la función completa (~140 líneas: cálculo de `miCuentaId()`,
`esAdminCobro()`, el snapshot antes/después para detectar éxito, el payload con
`confirmado`/`depositado`/`es_directo` armados en el cliente) y su registro en el bucle `init()`
de esa IIFE. El checkbox/selector "¿A qué cuenta se depositó?" (`#aDirectoCuenta`) se queda —
sigue siendo el mismo `<select>` de siempre, pero ahora **solo** lo lee `regAbono()`
(`index.html`) para mandar `p_cuenta_destino_id` a la RPC atómica; la creación de la entrega
vive únicamente en el servidor.

### Panel "Solicitudes" — las 4 funciones migradas de REST directo a RPC

`nxGuardarEntregaAdmin`, `nxConfirmarEntregaAdmin`, `nxDepositarEntregaAdmin`,
`nxAnularEntregaAdmin` (todas en el módulo `__NEXUS_DETALLES_COBRO_V2__` de `parches.js`)
escribían directo por REST (`api.post`/`api.patch`/`api.del` a `entregas_admin`) — bloqueado por
el ACL lockdown ya aplicado. Migradas:

- **`nxGuardarEntregaAdmin`** → `rpc/seguros_registrar_entrega_admin_manual`. La RPC siempre
  crea `confirmado=false`; si el admin marcó "confirmar ahora" en el formulario, se encadena un
  segundo `api.post('rpc/seguros_confirmar_entrega_admin', {p_id: r.id})` en su propio
  `try/catch` — si el auto-confirmar falla, el registro base ya quedó guardado (nunca se
  deshace), y se avisa aparte que hay que confirmarlo a mano.
- **`nxConfirmarEntregaAdmin`** → `rpc/seguros_confirmar_entrega_admin`.
- **`nxDepositarEntregaAdmin`** → `rpc/seguros_depositar_entrega_admin`.
- **`nxAnularEntregaAdmin`** → `rpc/seguros_anular_entrega_admin`, con `prompt()` obligatorio
  para el motivo (mismo patrón que `nxEliminarEgreso()`, Bloque 4B-2) — cancelar el prompt o
  dejarlo en blanco aborta sin llamar la RPC. **"Anular" ya NO es un `api.del(...)` — la fila
  nunca se borra.**

Todas usan el mismo par de helpers `idemKey()`/`rpcErr()` (delegan a `window.nxNuevaIdemKey`/
`window.nxRpcErr` con respaldo local, mismo patrón ya establecido en Egresos) y dejaron de
llamar `window.logAudit(...)` directo — cada RPC ya inserta su propia fila en `auditoria`
(`ENTREGA_REGISTRADA`/`ENTREGA_CONFIRMADA`/`ENTREGA_DEPOSITADA`/`ENTREGA_ANULADA`).

## Corolario obligatorio del soft-delete: filtrar `!anulado`

Cambiar "anular" de `DELETE` físico a `anulado=true` significa que la fila **sigue existiendo**
— cualquier consumidor que sume o liste `entregas_admin` sin filtrar `!anulado` seguiría
contando una entrega anulada como si el agente todavía tuviera ese dinero en la calle. Se
auditaron y corrigieron los 3 puntos reales (un solo `grep` de `api.get('entregas_admin'` en
todo el repo confirma que son los únicos 2 orígenes de datos, más el consumo derivado de uno de
ellos):

1. **`calcularPorAgente(...)`** (`__NEXUS_DETALLES_COBRO_V2__`, alimenta "Dinero en Mano" por
   agente): `entregasAcum`/`entregasPeriodo` ahora se derivan de
   `entregasAll.filter(e => !e.anulado)` antes de cualquier otro cálculo — arregla de una sola
   vez sus 3 closures internas (`entFisicas`/`dirSalen`/`dirEntran`).
2. **El scope que alimenta `renderCajaCentral(entregas, entregasPeriodo)`** (misma función,
   más arriba): `entregas = entregas.filter(e => !e.anulado)` justo después del filtrado por
   rol, antes de que ese arreglo alimente `calcularPorAgente` y los KPIs propios de Caja Central
   (`recibidoTotal`/`pendienteConfirmar`/`enCajaCentral`/`yaDepositado`/`recibidoPeriodo`).
3. **`cargarEntregas()`** (módulo aparte `__NEXUS_SOLICITUDES_V1__`, la fuente única de los 3
   consumidores de esa página — el badge del dashboard, el badge del sidebar, y la lista del
   panel Solicitudes): `return (Array.isArray(data) ? data : []).filter(e => !e.anulado)` — una
   entrega anulada ya no aparece pegada en "por confirmar".

## Verificación

- `node --check parches.js` — limpio.
- Los 4 bloques `<script>` de `index.html` compilan con `new Function()` (1423/1205/534421/681
  caracteres).
- `version.json` es JSON válido; `version` (56.31) == `APP_VERSION`.
- Grep global, `entregas_admin`:

```
$ grep -n "api\.\(post\|patch\|del\)('entregas_admin'" parches.js index.html
(sin resultados)

$ grep -n "api\.get('entregas_admin'" parches.js index.html
parches.js:1462:  api.get('entregas_admin', 'select=*&order=fecha.desc,created_at.desc&limit=2000')
parches.js:4725:  api.get('entregas_admin', 'select=*&order=fecha.desc,created_at.desc&limit=500')
(las 2 únicas — ambas con !anulado aplicado inmediatamente después)
```

Cero escrituras directas restantes a `entregas_admin` en todo el repositorio.

## Batería E2E (código real extraído, no reconstruido)

Extractor por balance de llaves (string/comentario-aware), anclado dentro de la substring del
módulo `__NEXUS_DETALLES_COBRO_V2__` (para no capturar los homónimos `st()`/`getAPI()`/
`esAdmin()` de las ~30 IIFEs restantes de `parches.js`).

**Panel Solicitudes (4 funciones, backend fake fiel a las 4 RPC reales) — 41/41:**

```
T1-T3   registrar entrega manual: caso normal, con auto-confirmar (éxito y fallo del
        auto-confirmar sin deshacer el registro base)
T4a-T4c validaciones cliente (sin agente / monto 0 / transferencia sin banco): 0 llamadas a la
        API
T5      idempotencia real: 2 clics = 2 keys distintas = 2 filas distintas
T6      confirmar: llama la RPC con el id correcto, la entrega queda confirmada
T7      confirmar cancelado (nxConfirm): 0 llamadas
T8      la RPC rechaza confirmar una entrega anulada, error mostrado
T9      depositar: banco + id correctos
T10     prompt de depositar cancelado: 0 llamadas
T11     anular: llama rpc/seguros_anular_entrega_admin (NUNCA api.del), payload con motivo,
        la fila SIGUE existiendo (soft-delete), queda anulado=true con el motivo guardado,
        ningún método api.del existe en el sandbox
T12     motivo en blanco: 0 llamadas, toast "Motivo requerido"
T13     prompt de anular cancelado: 0 llamadas
T14     reintentar anular con la MISMA key tras éxito -> ok:true/reintento:true, sin reventar
T15     las 4 funciones quedaron expuestas como funciones reales
```

**`regAbono()`/`nxRegAbonoDeudaAnterior()` (`index.html` + IIFE del bauche, combinadas en UNA
sola invocación de `AsyncFunction` para replicar el scope compartido real de múltiples
`<script>` en la misma página) — 23/23:**

```
T1  cobro normal en Efectivo: RPC con entrega, p_cuenta_destino_id/p_comprobante_url null,
    cero POST/PATCH directo a entregas_admin, _ultimoAbono.entregaId null (sin entrega)
T2  Transferencia/Depósito sin elegir cuenta: bloqueado en el cliente antes de llamar la RPC
T3  Transferencia con cuenta: p_cuenta_destino_id correcto, _ultimoAbono.entregaId = el real
    que devuelve la RPC
T4  bauche completo: primero el cobro atómico, luego adjuntar-comprobante con el entrega_id
    real (NUNCA se buscó "cobro_id=eq..." por los últimos 90s — heurística retirada)
T5  deuda anterior: misma RPC con entrega, entrega_id capturado, auditoría registrada
T6  deuda anterior en Efectivo: no exige ni manda cuenta
T7  error de la RPC: mostrado al usuario, sin excepción sin capturar, sin respaldo REST
T8  grep estático: cero api.post/patch directo a entregas_admin, una sola definición de
    envolverRegAbono (la del bauche)
```

**64/64 en total.**

## Regla dura respetada

No se tocó 4D-2, 4D-3 ni 4C. `mi_agente_efectivo()` se queda como compatibilidad temporal de
admin, sin backfill a `profiles` (ya documentado, sin cambios). Ninguna migración/RPC nueva en
esta sesión — solo frontend, sobre el backend ya aplicado y verificado.

## Publicación

Rama `claude/bloque4d1-implementacion` → PR
[#274](https://github.com/sterlinr08-dte/nexus-pro/pull/274) → fusionada a `main` en `0ae91ab`
(merge commit; commit de contenido `db4d92f`). `mergeable_state: "clean"` antes de fusionar, 0
checks de CI configurados (no hay workflows en este repo — el despliegue es automático vía
Cloudflare Workers git-integration), 0 hilos de revisión pendientes. El bot de Cloudflare
confirmó build exitoso para el commit `db4d92f8` (log de producción real) antes de la fusión —
el árbol fusionado a `main` es idéntico. Este entorno no tiene salida a internet (confirmado,
bloqueado por el proxy de egress), así que no se pudo verificar `nexusprord.com` en vivo desde
aquí — la confirmación de despliegue queda en el mismo criterio ya usado en cada bloque anterior
de este engagement: commit real en `main` + build de Cloudflare ya exitoso para ese árbol.

## Cierre

**Bloque 4D-1 queda cerrado — backend y frontend en producción, verificados de punta a punta.**
`entregas_admin` ya no acepta ninguna escritura REST directa desde el navegador (ACL + RPCs
atómicas con guard de rol/organización, idempotencia real, `pg_advisory_xact_lock`). "Anular"
dejó de ser destructivo: es trazable, con motivo obligatorio, y el rastro nunca se pierde. El
corolario del soft-delete (filtrar `!anulado` en cada consumidor que suma/lista) quedó cerrado
en los 3 puntos reales donde aplicaba. 64/64 pruebas E2E contra el código real extraído.

Queda a la espera de que el dueño decida si retoma 4D-2/4D-3 o 4C — ninguno de los dos se abre
unilateralmente desde aquí.
