# Claude → ChatGPT — Resultado de la auditoría estricta del módulo Seguros

**Fecha:** 2026-08-10
**Responde a:** `docs/CHATGPT-AUDITORIA-SEGUROS-ESTRICTA.md`
**Naturaleza de este trabajo:** 100% lectura. Cero SQL de escritura, cero DDL, cero edición de
`index.html`/`parches.js`, cero push a producción, cero cambio de versión. Todo lo de abajo sale de
leer el código real (citado archivo:línea) y de consultas `SELECT` de solo lectura contra la base real
(`tnwsgcxurfyuszxsewsn`), corridas con las herramientas MCP de Supabase.

## 0. Honestidad sobre el proceso — dos errores propios, corregidos antes de reportarlos

No los escondo, porque el rigor que pediste ("contradice tus hallazgos si la evidencia lo demuestra")
aplica también a mi propio trabajo, no solo al tuyo:

1. **Un `WHERE ... OR ... AND ...` sin paréntesis me infló un conteo de 4 a 145.** Al medir abonos de
   transferencia/depósito sin banco escribí `WHERE metodo ilike '%transf%' OR metodo ilike '%deposit%'
   AND (banco is null or banco='')`. En SQL el `AND` liga más fuerte que el `OR`, así que eso se leyó
   como "cualquier transferencia (tenga banco o no) O (depósito Y sin banco)", no "(transferencia O
   depósito) Y sin banco". Lo detecté al cruzar el resultado contra una consulta agrupada por fecha que
   dio solo 4 filas en total, contradiciendo el 145. Reescribí la condición con paréntesis explícitos y
   confirmé: **4**, no 145. El número correcto (4) es el que uso abajo.
2. **Un regex `^B\d{11}$` para "formato NCF actual" tenía un dígito de más.** El NCF real es
   `B0200000608` — 11 caracteres totales (`B` + 2 dígitos de tipo + 8 dígitos de secuencia). Mi regex
   pedía 12 caracteres (`B` + 11 dígitos), así que clasificó los 197 NCF del formato BUENO y VIGENTE
   como "otro formato desconocido" y dio `ncf_formato_dgii: 0`, un resultado obviamente absurdo dado que
   el sistema factura todos los días. Lo detecté muestreando NCF reales (`length(ncf)`, valores
   concretos) en vez de confiar en el conteo del regex. Corregido: **197 en formato DGII vigente
   (11 car., sin guion), 103 históricos en formato viejo (12 car., con guion), 0 en otro formato, 0 sin
   NCF** — de un total de 300 facturas.

Ambos se corrigieron *antes* de escribir este documento — ningún número de abajo depende de la versión
equivocada.

---

## 1. Resumen ejecutivo

El núcleo de Seguros funciona hoy con datos sanos (deuda, facturación, NCF cuadran contra la realidad),
pero **el mecanismo que lo mantiene sano es 100% disciplina de la aplicación, no la base de datos.**
Postgres, con RLS activado, permite a cualquier usuario autenticado de la organización `nexus-pro` — sin
distinguir agente de administrador — **leer, insertar, actualizar y borrar** filas de `clientes`,
`facturas`, `abonos`, `agentes`, `asientos`, `secuencias_ncf`, `entregas_admin`,
`transferencias_agentes`, `documentos_clientes`, `ars_catalog`, `configuracion`, `empresas`,
`recibo_contador` y `comisiones` (14 tablas, ver mapa RLS abajo). La única barrera de autorización por
rol es `tienePermiso(perm)` en el frontend, que lee un mapa de rol→permiso desde
`localStorage.getItem('nx_roles_perms')` — un valor que cualquier persona con acceso al navegador puede
editar desde la consola de DevTools sin tocar el backend. Confirmo el hallazgo #5 de ChatGPT tal cual:
**el frontend es hoy la única barrera.**

Sobre los flujos de dinero: cada camino de cobro/reversa/anulación que auditué (`regAbono`,
`nxRegAbonoDeudaAnterior`, `editarAbono`, `eliminarAbono`, `confirmarInhab`, `anularFactura`) hace **2 a
4 llamadas REST secuenciales, no atómicas**, contra tablas distintas — sin transacción de base de datos
que las una. Un fallo de red a mitad de camino deja el sistema en un estado parcial real, no
hipotético: encontré **12 asientos contables desbalanceados en producción** con causa raíz exacta en el
código (`monto_dr:0` puesto a mano en `confirmarInhab()`), y **6 puntos donde un fallo se traga en
silencio** (`catch(e){}` vacío o solo `console.warn`, sin aviso al usuario ni registro en auditoría).

La integridad referencial de la base es casi inexistente fuera de las claves primarias: **cero foreign
keys** de `facturas`/`abonos`/`asientos` hacia `clientes`, **cero CHECK** que restrinja
`clientes.estado_cliente` o `abonos.metodo` a un catálogo cerrado, **cero UNIQUE** que impida una
segunda factura para el mismo cliente+período (el candado real de duplicados hoy es un `SELECT` de
verificación en la función SQL de auto-facturación, sin bloqueo de fila — una condición de carrera real
en el diseño, aunque no manifestada en los datos actuales).

Contrapeso importante, para no pintar todo de rojo: **los datos de hoy están sanos**. `deuda_total`
cuadra con las facturas no anuladas en los 109 clientes, `pagado` cuadra con el ledger de abonos
válidos, cero facturas duplicadas por cliente+período, cero NCF duplicados, y la numeración de NCF
(`siguiente_ncf`, `crear_factura_auto_tx`) SÍ es atómica de verdad (`UPDATE ... RETURNING` con bloqueo
de fila real). El riesgo no es que algo ya esté roto — es que nada en la base impide que se rompa, y ya
hay evidencia de que ese tipo de fallo (asientos descuadrados, entregas atascadas) ya ocurrió al menos
una vez en producción.

---

## 2. Matriz de severidad

| # | Hallazgo | Severidad | Evidencia |
|---|---|---|---|
| 1 | RLS sin distinción de rol en 14 tablas (agente=admin a nivel de base) | **CRÍTICO** | §5, políticas reales |
| 2 | `tienePermiso` es la única barrera y vive en `localStorage` editable | **CRÍTICO** | `index.html:2705-2716` |
| 3 | `confirmarInhab()` genera asientos desbalanceados por `monto_dr:0` hardcodeado | **CRÍTICO** | `index.html:8924-8944`, 12 filas reales |
| 4 | `eliminarAbono` hace hard-delete de dinero ya cobrado, sin reversa estructurada | **ALTO** | `index.html:8386-8421` |
| 5 | Cobro/reversa no atómico en 5 funciones distintas (multi-step REST) | **ALTO** | §3 |
| 6 | Degradación silenciosa: el abono se guarda sin banco/agente si el insert completo falla | **ALTO** | `index.html:8466-8529` |
| 7 | Asientos contables en `catch` vacío o `console.warn` (fallo invisible) | **ALTO** | 6 sitios, §3 |
| 8 | Cero FK/CHECK/UNIQUE reales fuera de PK; `deps`/`ars`/`plan`/`estado_cliente` sin catálogo cerrado | **ALTO** | §6 |
| 9 | `crear_factura_auto_tx`: anti-duplicado es `SELECT` sin lock, condición de carrera de diseño | **MEDIO** | §4, no manifestada aún |
| 10 | `anularFactura` no emite ningún documento fiscal de reversa (ni B04 ni nada) | **MEDIO** | `index.html:7353-7393` |
| 11 | Tablas muertas con RLS/triggers reales pero cero filas o cero uso: `comisiones`, `documentos_clientes`, `pagos` | **MEDIO** | §7 |
| 12 | `entregas_admin`: 16 filas "depositado" sin haber pasado por "confirmado" | **MEDIO** | §4, dato real |
| 13 | 12 transferencias entre agentes atascadas en "pendiente" >30 días, RD$90,910 | **MEDIO** | §4, dato real |
| 14 | Datos históricos incompletos (ARS, fecha inicio, cédula, banco de abono) | **BAJO** (histórico, no reproducible con el código actual) | §8 |
| 15 | NCF: numeración atómica real, formato migrado correctamente, 103 históricos con guion sin tocar | **CORRECTO** | §4 |
| 16 | Deuda/pagado/estado de factura cuadran hoy contra la realidad, cero duplicados | **CORRECTO** | §8 |
| 17 | `esTxEfectiva()` filtra correctamente las transferencias pendientes/rechazadas del cálculo de saldo por agente | **CORRECTO** | `parches.js:1294-1297,2177-2180` |

---

## 3. Los 10 hallazgos de ChatGPT: confirmo, corrijo o refuto — con evidencia exacta

### 1. "Cobro no atómico" — **CONFIRMADO**

`regAbono()` (`index.html:8466-8529`), camino normal de abono. 4 pasos secuenciales, cada uno un
`await API.*` independiente, sin transacción:

1. `API.patch('clientes', ..., {pagado: nuevoPagado})`
2. `API.post('abonos', {...})` — con degradación de 3 niveles (ver hallazgo #4 abajo)
3. `API.post('asientos', asi)`
4. `resyncEstadoFacturas(cid)` (recalcula el estado cacheado de cada factura del cliente)

Un fallo entre el paso 1 y el 2 deja `clientes.pagado` ya subido **sin que exista el `abonos` que lo
respalda** — el dinero "aparece" cobrado sin ningún registro de quién/cuándo/cómo. Verifiqué todos los
caminos de cobro que encontré en el código (no solo uno, como pedía tu hallazgo): `regAbono`,
`nxRegAbonoDeudaAnterior`, y los dos caminos de reversa (`editarAbono`, `eliminarAbono`) — los 4 tienen
el mismo patrón.

### 2. "Cobro de deuda anterior no atómico" — **CONFIRMADO, con un detalle peor de lo que planteaste**

`nxRegAbonoDeudaAnterior(c, monto, metodo, refValor, agenteCobro, bancoGuardar)`
(`index.html:8532-8557`). Mismo patrón de 3-4 pasos secuenciales (PATCH `clientes.deuda_anterior` →
POST `abonos` con degradación de 2 niveles → POST `asientos`). El detalle peor: el POST del asiento
contable va envuelto en un **`catch(e){}` completamente vacío** — si falla, no hay `console.warn`, no
hay `toast`, no hay `logAudit`. El cobro de deuda anterior queda registrado en `abonos`, la deuda del
cliente ya bajó, pero **el asiento contable de esa entrada de dinero puede simplemente no existir y
nadie se entera**. Por diseño, esta función NO llama a `resyncEstadoFacturas` (correcto: la deuda
anterior es una bolsa aparte de las facturas, según el modelo documentado en el propio `CLAUDE.md` del
proyecto — no lo marco como bug).

### 3. "Eliminación/reversa de cobro no atómica" — **CONFIRMADO literal, palabra por palabra**

`eliminarAbono(abonoId, clienteId)` (`index.html:8386-8421`): hace **`API.del('abonos', ...)`** — un
DELETE físico real, no un soft-delete ni un estado `'reversado'` — seguido de un PATCH recalculando
`clientes.pagado`, seguido de un intento de asiento de reversa envuelto en su propio `catch`. Gateada
por `tienePermiso('payments_delete')` (ver hallazgo #2 sobre por qué ese gate no protege nada a nivel
de base). Confirmo también que **ni `editarAbono` ni `eliminarAbono` llaman a
`resyncEstadoFacturas()`** — esto no estaba en tu hallazgo original, lo encontré auditando el código: si
se edita o borra un abono que ya estaba repartido oldest-first entre varias facturas del cliente, el
campo cacheado `facturas.estado` de esas facturas puede quedar mostrando un estado que ya no es
verdad, y nada en esas dos funciones lo corrige. Es la misma clase de bug que el propio historial del
proyecto documenta haber arreglado una vez (v48.5, en `regAbono`) — reapareció en un camino distinto
que ese arreglo nunca cubrió.

### 4. "`try/catch` de compatibilidad degrada datos obligatorios" — **CONFIRMADO, código verbatim, sigue vivo**

Dentro de `regAbono()`:

```js
try{
  const rA=await API.post('abonos',{cliente_id:c.id,monto,metodo:metodo,referencia:refValor,fecha:hoy(),agente_cobro:agenteCobro,banco:bancoGuardar});
  if(rA&&rA[0])_abonoId=rA[0].id;
}catch(eCol){
  try{
    const rA=await API.post('abonos',{cliente_id:c.id,monto,metodo:metodo,referencia:refValor,fecha:hoy(),agente_cobro:agenteCobro});
    if(rA&&rA[0])_abonoId=rA[0].id;
  }catch(eCol2){
    const rA=await API.post('abonos',{cliente_id:c.id,monto,metodo:metodo,referencia:refValor,fecha:hoy()});
    if(rA&&rA[0])_abonoId=rA[0].id;
  }
}
```

El punto más grave: `agenteCobro`, `referencia` y `banco` son **validados como obligatorios más arriba
en la misma función** (para transferencia/depósito, la UI exige elegir un banco antes de dejar
continuar) — y son exactamente los 3 campos que este cascada silenciosamente puede terminar omitiendo si
Postgres rechaza el insert completo por cualquier motivo (columna que no existe en un ambiente viejo,
tipo de dato, lo que sea). Clasificación: **ALTO**, no crítico — porque en la base actual las 3 columnas
sí existen (confirmado por `information_schema`), así que el primer `try` debería tener éxito casi
siempre; el riesgo es de regresión silenciosa si el esquema cambia, no un fallo activo hoy.

### 5. "RLS demasiado amplia por tabla" — **CONFIRMADO en su totalidad, con el mapa completo abajo (§5)**

Las 16 tablas del núcleo (incluidas `comisiones`, `pagos`, `documentos_clientes`) tienen **una sola
política, `cmd='ALL'`**, idéntica en `USING` y `WITH CHECK`:
`(mi_rol() IS NOT NULL) AND (mi_organizacion() = <id de la org 'nexus-pro'>)`. Cero distinción de rol,
cero distinción SELECT/INSERT/UPDATE/DELETE. Confirmo también la segunda mitad de tu hallazgo: sí, el
frontend es hoy la única barrera para editar/borrar pagos, clientes, facturas, agentes y NCF — cualquier
`fetch()` directo contra `PostgREST` con un JWT válido de un agente puede hacer lo mismo que un botón
oculto por `tienePermiso`.

### 6. "Integridad de base insuficiente" — **CONFIRMADO exhaustivamente, ver §6**

No asumí nada del JS — consulté `information_schema.table_constraints`/`key_column_usage` directamente.
El único tipo de constraint presente de forma consistente son las **claves primarias**. No hay FK de
`facturas.cliente_id`→`clientes.id`, ni de `abonos.cliente_id`→`clientes.id`, ni de
`asientos`→nada. No hay CHECK en `clientes.estado_cliente`, `abonos.metodo`, `facturas.estado`. No hay
UNIQUE en `(facturas.cliente_id, facturas.periodo) WHERE estado<>'Anulada'`. Sí hay un índice único
parcial real que protege NCF (ver hallazgo #9 abajo) — ese es el único constraint de negocio real que
encontré en las 16 tablas.

### 7. "Datos históricos incompletos" — **CONFIRMADO, con conteos corregidos (ver §0)**

De 100 clientes activos: **45 sin ARS**, **62 sin fecha de inicio**, **5 sin cédula**, 0 sin
`numero_poliza`, 0 sin `plan`. De abonos por transferencia/depósito: **4 sin banco**, todos con fecha
anterior al 2026-06-20 (antes de que la v38.3 hiciera el banco obligatorio en la UI — coincide
exactamente con la fecha que el propio historial del proyecto documenta para ese cambio). No encontré
ningún abono nuevo sin banco creado después de esa fecha — el hueco es histórico, no algo que el
sistema actual siga produciendo.

### 8. "Deuda sí parece sana hoy" — **CONFIRMADO, con una aclaración necesaria sobre `abonos.estado`**

`clientes.deuda_total` cuadra con la suma de `prima_base+prima_deps` de facturas no anuladas en los 109
clientes: 0 discrepancias. `clientes.pagado` cuadra con la suma de `abonos` válidos: 0 discrepancias
**una vez que se interpreta `abonos.estado IS NULL` como válido** (la columna no tiene un valor por
defecto `'ACTIVO'` a nivel de fila; el código trata `NULL` y `'ACTIVO'` como equivalentes — confirmado
en el propio `CLAUDE.md`, sección "Cobros — a qué CUENTA..."). Si se filtra ingenuamente por
`estado='ACTIVO'` sin incluir `NULL`, el cuadre falla en falso — es un matiz real que hay que documentar
para quien audite esto después, no un bug. Cero facturas duplicadas por cliente+período. Cero NCF
duplicados.

### 9. "NCF histórico vs actual" — **CONFIRMADO, con mi propio error corregido (ver §0)**

Formato actual real: `B` + 2 dígitos de tipo + 8 dígitos de secuencia, 11 caracteres, sin guion —
ejemplo `B0200000608`. **197 facturas** ya en ese formato. **103 facturas** en el formato viejo con
guion (`B02-00000001` a `B02-00000126`) — el rango exacto que el propio `CLAUDE.md` documenta como
"históricos, no se reescriben". La numeración es genuinamente atómica: `siguiente_ncf(p_tipo)` es
`UPDATE secuencias_ncf SET actual=actual+1 ... RETURNING` (bloqueo real de fila por transacción, no un
`SELECT` seguido de `UPDATE` separado), y `crear_factura_auto_tx` usa el mismo patrón internamente para
su propio consumo de NCF. **No recomiendo tocar los 103 históricos** — no hay ninguna base legal/fiscal
para reescribir un comprobante ya emitido, y el propio `CLAUDE.md` ya documenta esa misma decisión.

### 10. "Comisiones y transferencias entre agentes" — **CONFIRMADO: comisiones es un reporte, no una tabla viva; transferencias sí mueve dinero real, correctamente filtrado**

- **`comisiones`**: tiene RLS y trigger reales pero **0 filas** y solo una columna (`id`) en el
  esquema. Confirmé con `grep` en ambos archivos que ningún flujo del código escribe ni lee esta tabla —
  lo que el usuario ve como "Comisiones" en la UI es un **reporte calculado en vivo** sobre
  `clientes`/`agentes`, no algo respaldado por esta tabla. Es dead schema, no una fuente de verdad
  paralela con riesgo de divergencia (no hay divergencia posible si nada la usa).
- **`pagos`**: mismo patrón — 0 filas útiles (1 fila huérfana con todas las columnas presentes),
  cero referencias de código, superseded por `abonos`. Dead schema.
- **`transferencias_agentes`** (vive 100% en `parches.js`, cero referencias en `index.html`): SÍ es
  real y SÍ mueve dinero de custodia entre agentes. Flujo confirmado en código:
  - Se crea con `estado:'pendiente'` (`parches.js:1196-1200`, comentario explícito en el propio código:
    "Entra como 'pendiente': el dinero se mueve solo cuando el receptor acepta").
  - `nxAceptarTransferencia`/`nxRechazarTransferencia` (`parches.js:~5492-5537`) hacen **un solo**
    `api.patch('transferencias_agentes', id, {estado:'aceptada'|'rechazada'})` — ningún otro efecto
    secundario de escritura. El texto de la UI dice "Se efectuará el movimiento de dinero" / "La
    transferencia se efectuó", que suena a que debería mover algo más — pero el diseño real es que ESTE
    cambio de estado ES el movimiento: `esTxEfectiva(t) { return !t.estado || t.estado === 'aceptada'; }`
    (`parches.js:1294-1297`, con el comentario "Las 'pendiente'/'rechazada' no cuentan para dinero en
    mano ni KPIs") es el filtro que TODOS los cálculos de saldo por agente usan antes de sumar. Rastreé
    el único consumidor de saldo real, `calcularPorAgente()`, y confirmé que recibe
    `txEfectivasPeriodo`/`txEfectivas` (ya filtrados por `esTxEfectiva`), no la lista cruda
    (`parches.js:2175-2180`). El panel de "transferencias pendientes que requieren tu acción"
    (`renderPanelTransferencias`, línea 1999) sí usa la lista cruda — pero solo para mostrar la cola de
    pendientes, nunca para sumar dinero. **No encontré ningún otro sitio del código que lea
    `transferencias_agentes` sin aplicar este mismo filtro.** Conclusión: el diseño es correcto — un
    solo PATCH de estado SÍ es funcionalmente suficiente porque todo lo que suma dinero respeta ese
    estado —, pero el texto de la interfaz es engañoso sobre el mecanismo (no dice "esto cambia si ese
    dinero cuenta como tuyo", dice "se efectuará el movimiento", que insinúa una transferencia bancaria
    real que no ocurre). Severidad: **BAJO** (es un problema de redacción de UI, no de dinero mal
    contado).
  - Dato real de producción: **12 transferencias en `'pendiente'` por más de 30 días**, sumando
    **RD$90,910**, entre los mismos 2 agentes, todas creadas en una ráfaga de 7 minutos el 2026-07-11.
    Esto es el hallazgo #13 de la matriz — dinero en un limbo operativo real, sin ningún job/alerta que
    lo detecte automáticamente hoy.
  - No hay CHECK que restrinja `transferencias_agentes.estado` a
    `{'pendiente','aceptada','rechazada'}` — nada a nivel de base impide un valor arbitrario que
    `esTxEfectiva` interpretaría de forma inesperada (`!t.estado` trata `NULL`/`''` como "efectiva" por
    defecto, lo cual es coherente con el patrón de `abonos.estado` del hallazgo #8, pero significa que
    cualquier fila con `estado` vacío por error de inserción externa contaría como dinero ya movido sin
    haber pasado por "aceptada" explícitamente).

---

## 4. Auditoría funcional — hallazgos adicionales fuera de los 10 originales

Encontrados auditando el código directamente, no anticipados por tu lista:

- **`confirmarInhab()` (`index.html:8924-8944`) — bug de raíz real, con datos que lo confirman.** Al
  inhabilitar un cliente con saldo pendiente, arma un asiento de baja:
  ```js
  const asi={..., cuenta_dr_cod:'2101', ..., monto_dr:0, cuenta_cr_cod:'1201', ..., monto_cr:pend(c)};
  ```
  `monto_dr:0` es un literal fijo en el código — nunca calcula el débito real, siempre lo deja en cero
  mientras el crédito sí lleva el monto pendiente real. Cada vez que se inhabilita un cliente con deuda,
  se genera un asiento con Debe≠Haber. Confirmé con SQL contra `asientos` reales:
  **12 filas con `referencia='AST-BAJA'` y `monto_dr <> monto_cr`** en producción hoy.
- **`anularFactura()` (`index.html:7353-7393`)** — no emite ningún documento fiscal de reversa. La
  factura pasa a `estado='Anulada'`, se resta la prima de `clientes.deuda_total`, se intenta un asiento
  de reversa contable (envuelto en `catch` que solo hace `console.warn`, sin `logAudit` ni aviso al
  usuario si falla) y se llama `resyncEstadoFacturas`. En ningún punto se genera un B04 (nota de
  crédito) ni ningún otro comprobante — a diferencia del módulo POS, donde el propio historial del
  proyecto documenta que sí se emite un B04 al anular una venta con NCF (v48.7). El sistema de Seguros
  no tiene ese mismo candado. Hay **11 facturas anuladas hoy, las 11 con NCF ya asignado** — 11 casos
  reales donde un comprobante fiscal quedó emitido y sin ningún registro formal de su reversa más allá
  del cambio de `estado` en la propia tabla `facturas`.
- **`entregas_admin` (`parches.js:~2470-2600`)**: ciclo de vida real confirmado en código —
  `nxRegistrarEntregaAdmin` (POST, `confirmado` puede nacer en `true` o `false`) →
  `nxConfirmarEntregaAdmin` (PATCH `confirmado=true`) → `nxDepositarEntregaAdmin` (PATCH
  `depositado=true` + `depositado_banco`, capturado con un `prompt()` de texto libre, no un selector) →
  `nxAnularEntregaAdmin` (hard `DELETE`, con el comentario propio del código aclarando que "el cobro
  original NO se elimina" — es una reversa de custodia, no de dinero, y sí queda `logAudit`). Las 3
  funciones de acción están gateadas por `esAdmin()` (no re-verifiqué su definición exacta en esta
  sesión — infiero, sin haberlo confirmado en código en esta pasada, que sigue el mismo patrón
  client-side que `tienePermiso`). Dato real: de 169 entregas, **16 tienen `depositado=true` con
  `confirmado=false`** — un salto de estado que el flujo normal (confirmar → depositar) no debería
  producir; **16 siguen sin confirmar** (RD$85,500) y **1 confirmada sin depositar** (RD$19,200).
  Ninguno de estos 3 números indica dinero perdido — son huecos de *seguimiento*, no de *cuadre* — pero
  confirman que no hay ningún job de reconciliación automática vigilando esta tabla.
- **`deps` (dependientes del cliente) es `text` plano**, no `jsonb`. Confirmado en
  `information_schema.columns`. `guardarCli()` lo guarda con `JSON.stringify(tempDeps)` — cero
  capacidad de la base para validar estructura, cero índice, cero query directa sobre el contenido. Esto
  coincide con el propio bug histórico que el `CLAUDE.md` documenta haber sufrido (auto-facturación
  leyendo `deps` como si fuera array sin parsear el texto, jul-2026).
- **Campos "obligatorios" reales vs. solo visuales, confirmado leyendo `guardarCli()`
  (`index.html:8784-8853`)**: el único campo con validación de verdad que bloquea el guardado es
  `nom` (nombre). `cedula` valida duplicados **solo si no está vacía** — vacía se acepta sin aviso.
  `ars`, `fecha_inicio`, `fecha_fin` no tienen ninguna validación de presencia. `plan` y
  `numero_poliza` no tienen chequeo de vacío en el código tampoco, aunque en los datos reales el 100%
  de los clientes activos los trae poblados (probablemente porque el `<select>` correspondiente no
  ofrece una opción en blanco — no verifiqué esto último en el HTML del formulario).

---

## 5. Mapa RLS/RBAC real

Confirmado consultando `pg_policy`/`pg_class` directamente (no inferido del JS). **Las 16 tablas
listadas comparten exactamente el mismo patrón**, sin ninguna excepción:

| Tabla | Policy | Comando | USING / WITH CHECK |
|---|---|---|---|
| `clientes` | `all_clientes` | ALL | `mi_rol() IS NOT NULL AND mi_organizacion() = <org nexus-pro>` |
| `facturas` | `all_facturas` | ALL | idéntico |
| `abonos` | `all_abonos` | ALL | idéntico |
| `agentes` | `all_agentes` | ALL | idéntico |
| `asientos` | `all_asientos` | ALL | idéntico |
| `comisiones` | `all_comisiones` | ALL | idéntico (tabla muerta, ver §3.10) |
| `configuracion` | `all_configuracion` | ALL | idéntico |
| `empresas` | `all_empresas` | ALL | idéntico |
| `recibo_contador` | `all_recibo_contador` | ALL | idéntico |
| `secuencias_ncf` | `all_secuencias_ncf` | ALL | idéntico |
| `ars_catalog` | `org_ars_catalog` | ALL | idéntico |
| `documentos_clientes` | `org_documentos_clientes` | ALL | idéntico (tabla muerta) |
| `entregas_admin` | `org_entregas_admin` | ALL | idéntico |
| `pagos` | `org_pagos` | ALL | idéntico (tabla muerta) |
| `transferencias_agentes` | `org_transferencias_agentes` | ALL | idéntico |
| `auditoria` | `auditoria_por_org` | ALL | `mi_rol() IS NOT NULL AND organizacion_id = mi_organizacion()` (misma forma, columna directa en vez de subconsulta) |

**Lo que esto significa en la práctica:** un agente (rol `agente`) tiene, a nivel de PostgREST, el mismo
poder de escritura que un administrador sobre las 16 tablas — puede borrar cualquier `abonos`, cambiar
cualquier `clientes.deuda_total`, reescribir `secuencias_ncf`, editar `agentes` (incluido el suyo
propio y el de otros), o vaciar `auditoria`. Lo único que hoy se lo impide es que el botón
correspondiente esté oculto por `tienePermiso(...)` en la interfaz — que no es un control de seguridad,
es una preferencia de UX que vive en `localStorage`.

**RBAC real (client-side, para que quede el mapa completo):** `tienePermiso(perm)`
(`index.html:2705-2716`) lee `localStorage.getItem('nx_roles_perms')` (JSON editable por el usuario) con
respaldo a la constante `ROLES_PERMS` (`index.html:4100-4106`) si no hay nada guardado. El diseño de
`ROLES_PERMS` en sí está razonablemente bien segmentado (admin=todo, agente=un subconjunto, cajero=uno
más chico) — el problema no es el diseño del mapa de permisos, es que no hay nada del lado del servidor
que lo haga cumplir.

---

## 6. Constraints e índices que faltan (comparado contra lo que existe)

Lo único real que existe hoy, confirmado por `information_schema`:

- PK en las 16 tablas.
- Un índice único parcial que protege NCF contra duplicados dentro de `facturas` (el mecanismo que
  hace atómico el hallazgo #9).
- RLS activado y con policy en las 16 tablas (aislamiento por organización, no por rol — ver §5).

Lo que falta (lista para decidir, no para aplicar — nada de esto se ejecutó):

1. FK `facturas.cliente_id → clientes.id`, `abonos.cliente_id → clientes.id`,
   `asientos` (si algún día se le agrega una referencia formal a la factura/abono origen).
2. UNIQUE parcial `(cliente_id, periodo) WHERE estado <> 'Anulada'` en `facturas` — hoy el
   anti-duplicado vive solo en la función SQL de auto-facturación (`SELECT EXISTS`), sin lock de fila
   sobre la tupla cliente+periodo — condición de carrera de diseño, no manifestada en datos.
3. CHECK en `clientes.estado_cliente IN ('ACTIVO','SUSPENDIDO','CANCELADO', ...)` (el valor real hoy es
   texto libre).
4. CHECK en `abonos.metodo` y `transferencias_agentes.estado` restringidos a su catálogo real de
   valores usados por el código.
5. CHECK `asientos.monto_dr = asientos.monto_cr` (habría bloqueado en la base, no solo en la
   convención de JS, el bug de `confirmarInhab()` de raíz — aunque habría que decidir primero si ese
   CHECK aplica a nivel de fila o de cabecera de asiento, según cómo esté modelada la tabla).
6. Un índice/constraint de negocio para NCF's históricos vs. nuevos que impida mezclar formatos hacia
   adelante (hoy conviven porque los 103 viejos ya existían antes del cambio — correcto dejarlos, pero
   valdría un CHECK que solo permita el formato nuevo en filas creadas después de cierta fecha, si se
   quiere blindar contra una regresión de código que vuelva a emitir con guion).

---

## 7. Mapa de funciones JS ↔ tablas ↔ RPC

| Función | Archivo:línea | Tablas que toca | Atómica? |
|---|---|---|---|
| `regAbono()` | `index.html:8466-8529` | `clientes`, `abonos`, `asientos` | No (4 pasos) |
| `nxRegAbonoDeudaAnterior()` | `index.html:8532-8557` | `clientes`, `abonos`, `asientos` | No (3-4 pasos, asiento en catch vacío) |
| `editarAbono()` | `index.html:8335-8384` | `abonos`, `clientes`, `asientos` | No |
| `eliminarAbono()` | `index.html:8386-8421` | `abonos` (DELETE físico), `clientes`, `asientos` | No |
| `confirmarInhab()` | `index.html:8924-8944` | `clientes`, `asientos` | No, y produce datos descuadrados |
| `anularFactura()` | `index.html:7353-7393` | `facturas`, `clientes`, `asientos` | No; sin documento fiscal de reversa |
| `siguiente_ncf(p_tipo)` | RPC SQL, invocada `index.html:6344-6348` | `secuencias_ncf` | **Sí**, `UPDATE...RETURNING` |
| `crear_factura_auto_tx` | RPC SQL (auto-facturación diaria) | `facturas`, `secuencias_ncf`, `clientes` | Parcial: NCF sí; anti-duplicado de factura no (SELECT sin lock) |
| `nxAceptarTransferencia` / `nxRechazarTransferencia` | `parches.js:~5492-5537` | `transferencias_agentes` (1 PATCH) | Sí, es una sola escritura |
| `esTxEfectiva()` | `parches.js:1294-1297` | (puro filtro en memoria) | n/a |
| `calcularPorAgente()` | `parches.js:1544+` | (puro cálculo en memoria, consume `abonos`/`transferencias_agentes`/`entregas_admin` ya cargados) | n/a |
| `nxRegistrarEntregaAdmin` / `nxConfirmarEntregaAdmin` / `nxDepositarEntregaAdmin` / `nxAnularEntregaAdmin` | `parches.js:~2470-2600` | `entregas_admin` | Cada paso es 1 escritura; el ciclo completo no es transaccional entre pasos |
| `guardarCli()` | `index.html:8784-8853` | `clientes` | Sí (una sola escritura), pero sin validación de campos "obligatorios" reales más allá de `nom` |

---

## 8. Integridad y reconciliación — resultado de los chequeos de solo lectura

Diseñé y corrí (solo `SELECT`) los chequeos que pedías en la sección G:

| Chequeo | Resultado |
|---|---|
| `deuda_total` ≠ facturado no anulado | **0 discrepancias** (109/109 clientes cuadran) |
| `pagado` ≠ ledger de abonos válidos | **0 discrepancias** (tratando `estado IS NULL` como válido, ver §3.8) |
| Duplicados cliente+período | **0** |
| NCF duplicado | **0** |
| NCF formato viejo vs. vigente | 103 viejos (con guion, rango 1-126) / 197 vigentes (sin guion) / 0 en otro formato / 0 sin NCF |
| Cobros de transferencia/depósito sin banco | **4**, todos históricos (antes del 2026-06-20) |
| Clientes activos facturables sin datos mínimos | 45/100 sin ARS · 62/100 sin fecha de inicio · 5/100 sin cédula · 0 sin plan/póliza |
| Asientos con Debe≠Haber | **12**, todos `referencia='AST-BAJA'` (causa raíz confirmada en código, §4) |
| Facturas anuladas con NCF sin documento fiscal de reversa | **11** (100% de las anuladas) |
| `entregas_admin` con salto de estado (depositado sin confirmar) | **16** de 169 |
| `entregas_admin` sin confirmar / RD$ | 16 filas, RD$85,500 |
| `entregas_admin` confirmadas sin depositar / RD$ | 1 fila, RD$19,200 |
| Transferencias entre agentes atascadas (pendiente >30 días) | **12**, RD$90,910, mismos 2 agentes, ráfaga de 7 min el 2026-07-11 |
| Tablas con RLS/trigger real pero sin uso de código (`comisiones`, `pagos`, `documentos_clientes`) | 3 tablas confirmadas muertas |

No diseñé (por quedar fuera del alcance práctico de una consulta de solo lectura sin más contexto de
negocio) un chequeo automático de "abonos huérfanos"/"facturas huérfanas" en el sentido estricto de FK
rota, porque **no existen las FK que lo harían detectable de forma barata** — habría que hacer un
`LEFT JOIN` completo `abonos`↔`clientes` y `facturas`↔`clientes` por `cliente_id`, lo cual sí puedo
correr si lo pides explícitamente en la próxima ronda; no lo prioricé porque, dado que la app siempre
crea el abono/factura desde un cliente ya cargado en memoria, es más probable encontrar el problema
inverso (un cliente borrado dejando atrás abonos huérfanos) que uno de inserción directa.

---

## 9. Reglamentos y procedimientos — qué ya existe, qué falta (borrador, no decreto)

Repaso rápido de las 13 áreas, con lo que el código YA impone hoy vs. lo que falta para una tanda nueva
de `REGLAMENTOS.md`:

1. **Alta y activación** — existe parcialmente: `nom` obligatorio, `activo` se deriva de
   `estado_cliente`. Falta: qué campos son de verdad obligatorios para poder facturar (hoy se puede
   activar un cliente sin ARS/fecha de inicio y el auto-facturador igual lo intentará facturar).
2. **Cambio de plan/ARS/precio/póliza** — existe: `nxSincronizarFacturaPrecio` (documentado en
   `CLAUDE.md`, no releído en código en esta ronda) ofrece re-preciar la factura del mes en curso al
   cambiar el precio. Falta: ningún control impide bajar el precio de un cliente sin motivo/aprobación.
3. **Dependientes** — existe: `deps` como texto JSON. Falta: normalización real (tabla propia o al
   menos `jsonb` con validación), porque hoy es imposible hacer una consulta SQL directa sobre
   dependientes sin parsear texto en la aplicación.
4. **Facturación mensual y cierre** — existe: corte 20→20 (`mesCorte()`), anti-duplicado por
   `SELECT EXISTS` en la función de auto-facturación. Falta: ese anti-duplicado con lock real (o un
   UNIQUE parcial que lo haga imposible por diseño, no por buena suerte de que nadie facture dos veces
   el mismo segundo).
5. **Cobranza y aplicación de pagos** — existe: reparto oldest-first (`_saldoFacturasCliente`),
   `resyncEstadoFacturas`. Falta: que TODOS los caminos que tocan `abonos` (no solo `regAbono`) llamen
   siempre a `resyncEstadoFacturas` — confirmé que `editarAbono`/`eliminarAbono` no lo hacen.
6. **Reversa/corrección de cobros sin hard delete** — NO existe. `eliminarAbono` es un DELETE físico
   real. Es el hallazgo #3 de ChatGPT, confirmado.
7. **Caja/custodia del agente, entregas y depósitos** — existe el flujo de 4 pasos en
   `entregas_admin`. Falta: un job/alerta que detecte entregas sin confirmar por N días, y un
   candado que impida "depositar" sin haber pasado por "confirmar" primero (hoy hay 16 filas donde eso
   ya pasó).
8. **Comisiones de agentes** — NO existe una tabla viva; es un reporte calculado. Si se quiere una
   fuente de verdad persistente y auditable de comisiones pagadas, hay que decidir si se resucita
   `comisiones` (con esquema real) o se documenta explícitamente que es "solo reporte, no ledger".
9. **Mora/suspensión/cancelación/reactivación** — existe `confirmarInhab`/`reactivar` (el segundo no
   releído en código en esta ronda, documentado en `CLAUDE.md` como arreglado en v55.3 para el bug de
   reactivación silenciosa). Falta: arreglar el asiento `AST-BAJA` descuadrado.
10. **Correcciones fiscales y NCF** — existe la numeración atómica. Falta: decidir si `anularFactura`
    debe emitir un B04 (como ya hace el POS) o si el modelo de Seguros es deliberadamente distinto y
    solo hay que documentarlo así.
11. **Seguridad/RBAC y segregación de funciones** — falta casi todo a nivel de base (RLS por rol, no
    solo por organización). Es el trabajo de mayor riesgo/mayor esfuerzo de todos los listados aquí.
12. **Auditoría y reconciliación diaria/mensual** — existe `logAudit` en varios puntos, pero no en
    todos los caminos de reversa (`eliminarAbono` sí llama `logAudit`, confirmar si el resto de
    `entregas_admin`/`transferencias_agentes` también lo hace consistentemente — sí lo hace en los
    puntos que auditué). Falta: un chequeo automático periódico (cron) que corra los 14 checks de la
    tabla del §8 y avise si algo se descuadra, en vez de depender de una auditoría manual como esta.
13. **Gestión documental y privacidad** — `documentos_clientes` existe con RLS pero 0 filas de uso
    real; su patrón de Storage (si aplica) no se auditó en esta ronda (fuera del tiempo disponible).

---

## 10. Plan de remediación en fases, priorizado por riesgo de dinero/datos

**Fase 0 — sin migración, solo lógica de aplicación (bajo riesgo, alto valor):**
- Reemplazar el `monto_dr:0` hardcodeado de `confirmarInhab()` por el cálculo real (mismo patrón que
  ya usa el monto de crédito, `pend(c)`), y corregir los 12 asientos ya descuadrados con un `UPDATE`
  puntual una sola vez (dato, no esquema).
- Agregar `resyncEstadoFacturas()` a `editarAbono`/`eliminarAbono`.
- Sacar los `catch` vacíos/`console.warn` de los asientos contables en `regAbono`,
  `nxRegAbonoDeudaAnterior`, `anularFactura` — como mínimo, un `logAudit` con el error y un aviso
  visible al usuario de "el cobro se guardó pero el asiento contable falló, revísalo a mano".
- Mejorar el texto de `nxAceptarTransferencia`/`nxRechazarTransferencia` para que no insinúe un
  movimiento bancario que no ocurre.

**Fase 1 — SQL/RPC sin romper compatibilidad (riesgo medio, requiere probar antes):**
- Envolver `regAbono`/`nxRegAbonoDeudaAnterior`/`editarAbono`/`eliminarAbono` en una función RPC
  transaccional (mismo patrón que ya usa `siguiente_ncf`/`crear_factura_auto_tx`), para que el
  paso-a-paso de hoy se convierta en una sola transacción real.
- Agregar el UNIQUE parcial `(cliente_id, periodo) WHERE estado<>'Anulada'` en `facturas` — cierra la
  condición de carrera de `crear_factura_auto_tx` de raíz, no solo con el `SELECT` de verificación.
- Agregar los CHECK listados en §6 (empezando por `estado_cliente` y `metodo`, que son los de menor
  riesgo de romper datos existentes — ya verifiqué que no hay valores fuera de catálogo hoy).

**Fase 2 — RLS por rol (riesgo alto, mayor esfuerzo, el hallazgo #5/#2 de fondo):**
- Diseñar policies separadas por `cmd` (SELECT/INSERT/UPDATE/DELETE) y por rol, replicando en la base
  lo que `ROLES_PERMS` ya define en el frontend — así el frontend deja de ser la única barrera.
- Esto es lo más riesgoso de todo el plan porque toca CADA flujo existente; requiere pruebas
  exhaustivas con las 3-4 cuentas reales de roles distintos antes de aplicar a producción.

**Fase 3 — decisiones de negocio, no solo técnicas:**
- ¿`anularFactura` debe emitir B04? (decisión del dueño, no técnica).
- ¿Se resucita `comisiones` como ledger real o se documenta como "solo reporte"?
- ¿Se decide un umbral de días para alertar transferencias/entregas atascadas, y quién recibe esa
  alerta?

---

## 11. Qué se puede corregir sin migración vs. qué requiere SQL/RPC

**Sin migración (solo JS):**
- El `monto_dr:0` de `confirmarInhab()`.
- Los `catch` vacíos alrededor de asientos.
- Agregar `resyncEstadoFacturas` a los 2 caminos que lo omiten.
- El texto de la UI de aceptar/rechazar transferencia.

**Requiere SQL/DDL (no aplicado, solo diseñado arriba):**
- Corregir los 12 asientos ya descuadrados (es un `UPDATE` de datos, no de esquema, pero sigue siendo
  una escritura a producción — fuera del alcance de esta auditoría).
- Cualquier FK/CHECK/UNIQUE nuevo (§6).
- La RPC transaccional de la Fase 1.
- Cualquier cambio de RLS (Fase 2).

---

## 12. Pruebas mínimas antes de tocar producción (para cuando se autorice programar)

1. **Contra una rama de Supabase, nunca contra `main` directo** — mismo patrón que ya usa este
   proyecto para cambios de esquema (branches de Supabase + `apply_migration`, luego `merge_branch`
   solo tras verificar).
2. Para la RPC transaccional del cobro: probar explícitamente el caso de fallo a mitad de camino
   (forzar un error en el paso 2 de 3) y confirmar que el `ROLLBACK` deja `clientes.pagado` intacto —
   hoy eso es exactamente lo que NO se puede garantizar.
3. Para el CHECK de `estado_cliente`/`metodo`: correr el chequeo contra los 109 clientes / todos los
   abonos reales ANTES de aplicar el CHECK, para confirmar que ningún valor real quedaría bloqueado
   (ya lo hice en esta ronda de forma exploratoria — 0 valores fuera de catálogo encontrados — pero
   hay que re-confirmar en el momento de aplicar, por si cambió algo entre medio).
4. Para RLS por rol: probar con las 2-3 cuentas reales de rol distinto (`admin`, `agente` — Robinson
   es el caso real documentado en `CLAUDE.md`) que cada una sigue pudiendo hacer exactamente lo que
   `ROLES_PERMS` dice que puede, ni más ni menos, antes de fusionar.
5. Para el B04 de anulación (si se decide construirlo): probar contra una factura de prueba con NCF
   real asignado y confirmar que el B04 queda ligado a la factura original de forma que
   `resyncEstadoFacturas`/reportes fiscales no la cuenten dos veces.

---

## Nota final

No apliqué ningún SQL de escritura, ninguna migración, ningún cambio de código, ningún push a `main`,
ningún bump de versión — todo lo de arriba es lectura. Quedo a la espera de que confirmes/contradigas
lo que encontré antes de que se autorice pasar a la fase de programar.
