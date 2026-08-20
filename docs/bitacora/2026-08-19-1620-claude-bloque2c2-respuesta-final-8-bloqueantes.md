# Bloque 2C-2 — Respuesta final a los 8 bloqueantes de ChatGPT (2026-08-18-2224)

**Fecha:** 2026-08-19
**Autor:** Claude
**Estado:** 🟡 → propuesta completa, probada en branch desechable, **NO aplicada a producción**
**Responde a:** `docs/bitacora/2026-08-18-2224-chatgpt-bloque2c2-revision-final.md`
**Candidato SQL (ya escrito, byte-a-byte verificado contra lo probado):**
`docs/bitacora/2026-08-19-1200-claude-bloque2c2-final-candidato.sql`

ChatGPT dejó explícito que **no autoriza nada todavía** — este documento es la respuesta punto por
punto a los 8 bloqueantes que dejó pendientes, con evidencia real de cada uno. Nada de lo descrito
aquí tocó producción: todo el diseño se probó en un branch desechable de Supabase (creado y luego
borrado en esta misma ronda), siguiendo el nuevo mandato de gobernanza de la Sección 0 de su
documento — **ningún DDL/policy/function candidato de esta fase se prueba contra producción, ni
siquiera envuelto en `BEGIN...ROLLBACK`.**

---

## 0. Metodología de esta ronda (mandato Sección 0, cumplido)

- Branch desechable creado: `2c2-revision-final` (project_ref `auyrounlwmfbwqnnfuqc`, branch_id
  `2abd0fa3-7f14-4df6-b920-5c3fd1d308c6`), padre `tnwsgcxurfyuszxsewsn` (producción real).
- **Todas** las pruebas de este documento — diseño de las 2 funciones, ACL, RLS, y las 3 pruebas de
  concurrencia real (C1/C2/C3) — se ejecutaron exclusivamente contra ese branch.
- El branch se **borró** al cierre de esta ronda (`delete_branch`, confirmado
  `{"success":true}`), después de verificar que producción seguía intacta (ver §11).
- Producción (`tnwsgcxurfyuszxsewsn`) se tocó en esta ronda **solo con lecturas** de verificación
  (nunca una escritura, nunca un DDL) — ver §11 para la confirmación final.

---

## 1. `seq_poliza` internal-only — diseño

El problema de fondo que abrió este bloque: `configuracion.seq_poliza` se escribe hoy desde el
frontend en **4 sitios distintos**, cada uno con su propio patrón de lectura-incrementa-escribe (sin
ningún candado), y las políticas RLS de 2C-1 permiten que cualquier sesión autenticada de
`nexus-pro` escriba directo esa fila. Eso es lo que abre la puerta a duplicados de
`numero_poliza` bajo carga concurrente — no es solo un problema de "quién puede", es un problema de
"cómo se escribe".

**Diseño elegido: 2 funciones RPC `SECURITY DEFINER`, no un carve-out de RLS suelto.**

1. **`public.seguros_siguiente_numero_poliza()`** — la ÚNICA forma de pedir el próximo número.
   Recibe cero parámetros (no hay nada que un llamador legítimo necesite pasar), valida sesión +
   organización, toma un candado, incrementa, valida el tope de 6 dígitos, y devuelve
   `{ok, valor, numero}`.
2. **`public.seguros_resetear_seq_poliza(p_proximo_numero int, p_forzar boolean default false)`** —
   la ÚNICA forma de **reiniciar** el contador (usada por los 3 sitios de Ajustes que hoy permiten
   fijar "el próximo número será X"). Exige rol `admin` (no basta con sesión), valida rango,
   valida contra el máximo `numero_poliza` ya emitido salvo `p_forzar=true`, deja registro en
   `auditoria`, y devuelve `{ok, valor_interno, proximo_numero}`.

Las dos comparten el **mismo namespace de candado** (`pg_advisory_xact_lock(hashtext(
'seguros:seq_poliza'))`) — esto es lo que hace que sean, de hecho, un solo punto de escritura
serializado para `seq_poliza`, sin importar cuál de las dos se invoque. Ver §4 para la prueba real
de que esto funciona bajo concurrencia genuina, no solo en el papel.

El texto completo de las dos funciones está en el candidato SQL (líneas 20-131) — **no se repite
aquí**, se referencia.

---

## 2. Inventario completo de escritores directos — confirmado con lectura fresca de `index.html`

Se releyó `index.html` de cero en esta ronda (no de memoria de rondas anteriores) para no arrastrar
un inventario desactualizado. Son **4 sitios**, no los 2-3 que documentos anteriores mencionaban:

| # | Función | Línea (actual) | Patrón de escritura | Manejo de error hoy |
|---|---|---|---|---|
| 1 | `generarNumPoliza()` | 6778-6802 | lee, incrementa en JS, `API.patch`/`API.post` con doble intento (con/sin `actualizado`) | **fail-OPEN**: si algo falla, fabrica `POL-YYYY-<Date.now()%1000000>` — un número que NUNCA pasó por el contador real |
| 2 | `guardarNumeracion()` | 6749-6765 | `guardarTexto('seq_poliza', numIni-1)` | try/catch con `mostrarError`, correcto |
| 3 | `guardarDatosEmp()` | 9910-9943 | `guardarTexto('seq_poliza', numIni-1)` dentro de un bucle que también guarda 5 campos de empresa | try/catch con `mostrarError`, correcto |
| 4 | `guardarTarifas()` | 10053-10072 | `API.patch('configuracion','clave=eq.seq_poliza',...)` | **BUG REAL, confirmado**: esta escritura vive **ANTES** del `try{` que abre 15 líneas después — sin ningún manejo de error. Si falla, la función entera muere en silencio (unhandled promise rejection) y las tarifas de abajo ni se intentan guardar |

El escritor #1 es el más crítico de los 4 (es el que genera el número real de cada póliza nueva, en
`guardarCli()`); los 3 restantes son "resetear el contador" desde 3 pantallas distintas de Ajustes
— redundancia de UI, no de lógica: los 3 hacen lo mismo (`numIni - 1` → `seq_poliza`).

`refrescarContadorNum()` (líneas 6767-6777) es de **solo lectura** (`API.get('configuracion',
'clave=eq.seq_poliza&select=valor')`) — no es un escritor, no necesita ninguna migración, y sigue
funcionando exactamente igual después de Etapa C (`configuracion_select` no cambia, ver §1 del
candidato SQL).

---

## 3. Cutover A → B → C — diseño con checklist de verificación entre etapas

**Etapa A — infraestructura nueva, coexiste con los 4 escritores viejos.**
Se aplican las 2 funciones + su ACL (candidato SQL, líneas 20-142). Los 4 sitios del frontend
**no se tocan todavía** — siguen escribiendo directo a `configuracion` exactamente como hoy, porque
las políticas RLS de 2C-1 (que ya permiten esa escritura) tampoco se tocan en esta etapa. Cero
riesgo de romper nada: es aditivo puro.

**Etapa B — frontend migra a llamar las RPC, sin ningún cambio de RLS todavía.**
Se reemplazan los 4 sitios (diseño completo en §7). Publicado a `main` (el deploy de Cloudflare lo
sirve solo). **Checklist de verificación antes de pasar a Etapa C** (los 4 puntos deben cumplirse,
no basta con "ya lo subí"):

1. `grep -n "clave.*seq_poliza\|seq_poliza.*clave" index.html` después del cambio — confirmar que
   las únicas apariciones de `seq_poliza` en el archivo son: la lectura de
   `refrescarContadorNum()`, los 2 nombres de RPC (`'rpc/seguros_siguiente_numero_poliza'`,
   `'rpc/seguros_resetear_seq_poliza'`), y comentarios. **Cero** `API.patch`/`API.post` directo a
   `configuracion` con `seq_poliza` en la URL o el body.
2. Prueba de humo manual en producción (después del deploy): crear un cliente nuevo (ejercita
   `generarNumPoliza()`→`guardarCli()`), confirmar que sale un número de póliza y no hay errores en
   consola; tocar Ajustes → Numeración, Datos de empresa, y Tarifas una vez cada uno, confirmar los
   3 toasts de éxito sin errores de consola.
3. `get_logs` de PostgREST sobre una ventana representativa (48-72h) confirmando **cero**
   `PATCH`/`POST` directo a `/rest/v1/configuracion` con `clave=eq.seq_poliza` en el querystring —
   solo deben aparecer llamadas a `/rest/v1/rpc/seguros_siguiente_numero_poliza` y
   `/rest/v1/rpc/seguros_resetear_seq_poliza`.
4. Solo cuando los 3 puntos anteriores están limpios se procede a Etapa C. Si algo en el punto 1 o
   3 todavía muestra un escritor directo vivo (código viejo en caché de algún cliente, un camino no
   migrado que se pasó por alto), Etapa C se pospone hasta cerrarlo — aplicar el RLS de Etapa C con
   un escritor directo todavío vivo rompería esa pantalla para el usuario, en vez de solo cerrar un
   agujero de seguridad.

**Etapa C — cierre de RLS.**
Se aplican los 3 `DROP POLICY...CREATE POLICY` del candidato SQL (líneas 151-191), agregando
`AND clave <> 'seq_poliza'` a `configuracion_insert`/`configuracion_update`/`configuracion_delete`.
`configuracion_select` no cambia. Después de esto, un intento de escritura directa a `seq_poliza`
vía PostgREST (incluso desde un admin, incluso si algún código viejo en caché del navegador de un
usuario todavía intentara hacerlo) es rechazado por RLS — la RPC deja de ser "el camino
recomendado" y pasa a ser "el único camino posible".

**Prueba de humo post-Etapa-C** (recomendada, no obligatoria si el checklist de Etapa B ya dio
confianza): repetir la prueba manual del punto 2 de arriba (sigue funcionando igual, porque ya pasa
por la RPC) + un intento deliberado de `API.patch('configuracion','clave=eq.seq_poliza',{valor:
'999999'})` desde la consola del navegador con una sesión admin real — debe devolver un rechazo de
RLS (403/`new row violates row-level security policy`), confirmando que el cierre es real y no solo
teórico.

---

## 4. Concurrencia real — C1, C2, C3 (dos conexiones físicas genuinas, no llamadas secuenciales)

Este es el punto que ChatGPT marcó explícitamente como no resuelto en la ronda anterior — "necesito
ver PIDs distintos, no dos `execute_sql` uno detrás del otro". Se construyó con `dblink`, usando el
hostname público del branch (`db.auyrounlwmfbwqnnfuqc.supabase.co:5432`, no socket local) y un rol
de login dedicado con membresía en `authenticated`, para que cada conexión sea un backend de
Postgres genuinamente distinto (PID distinto, visible en `pg_stat_activity`/`pg_locks`).

### C1 — generador ↔ generador (2 llamadas simultáneas a `seguros_siguiente_numero_poliza()`)

Dos conexiones físicas distintas (PIDs **8056** y **8057**) llamaron a la RPC al mismo tiempo.
`pg_locks`/`pg_stat_activity` confirmaron el mecanismo funcionando de verdad: una de las dos quedó
con el candado `granted=true`, la otra genuinamente `wait=Lock/advisory` hasta que la primera
terminó su transacción completa (incremento + validación + `UPDATE`) y liberó el candado al hacer
commit. Resultado: **154846 → 154847** — secuencial, sin duplicado, sin hueco. Ningún error de
duplicate-key, ninguna carrera visible en el resultado.

### C2 — generador ↔ reset (una llamada a cada RPC, al mismo tiempo)

Mismo patrón, dos PIDs distintos (**8441**, **8442**). Se confirmó que las dos funciones comparten
el **mismo objeto de candado** (`pg_locks.objid = 2054762009` en ambas filas de espera/otorgamiento
— la prueba directa de que el namespace `hashtext('seguros:seq_poliza')` es efectivamente
compartido, no solo "debería serlo" por diseño). El reset dejó `valor_interno=199999`; el generador,
serializado detrás, tomó exactamente **200000** — ni antes de que el reset terminara, ni saltándose
ningún valor.

### C3 — carrera de inicialización sobre fila ausente (sin candado manual previo)

El caso más delicado: la fila `seq_poliza` **no existe** y dos sesiones distintas (una `agente`, una
`admin`) llaman a la RPC al mismo tiempo — ¿el `INSERT ... ON CONFLICT (clave) DO NOTHING` +
`SELECT ... FOR UPDATE` realmente evita el duplicado en la fila que se crea desde cero? Resultado:
**c1(agente)=1, c2(admin)=2**, exactamente **1 fila** en la tabla al final con `valor=2`, cero
errores de `duplicate key`. Resuelto en ~150ms tras 3 iteraciones de sondeo.

**Dos deadlocks reales encontrados y diagnosticados DURANTE la construcción de esta prueba** — se
documentan aquí con honestidad porque son hallazgos metodológicos genuinos, no ruido:

- **Intento #1 — deadlock cruzado invisible al detector de Postgres.** El `DELETE FROM
  configuracion WHERE clave='seq_poliza'` (para dejar la fila ausente antes de la carrera) se puso
  DENTRO del mismo bloque `DO` que después abría las conexiones `dblink` — el `DELETE` sin
  commitear bloqueaba a las dos conexiones nuevas, y el backend de control se quedaba esperando en
  una llamada de red (`dblink_get_result`), no en un lock que el detector de deadlocks de Postgres
  pudiera rastrear de vuelta al propio backend. Diagnosticado con `pg_stat_activity` (pid 8445
  activo corriendo el `DO`, pids 8446/8447 esperando lock de transacción/advisory). Se limpió con
  `pg_terminate_backend` y se corrigió moviendo el `DELETE` a su propia llamada `execute_sql`
  YA COMMITEADA, separada, antes de disparar la carrera.
- **Intento #2 — deadlock propio del script de prueba, no del sistema.** La lógica de recuperar
  resultados en orden fijo (`get_result(c1)` luego `get_result(c2)`) se colgaba si c1 resultaba ser
  el PERDEDOR de la carrera — el GANADOR (c2) nunca se commiteaba (liberando su candado) antes de
  que el script esperara al perdedor. Diagnosticado con `pg_stat_activity` (una conexión
  `wait=DblinkGetResult`, otra `wait=Lock/advisory` — el perdedor real —, y una tercera
  `idle in transaction` — el ganador, terminado pero sin commitear). Se corrigió con un bucle de
  sondeo no bloqueante (`dblink_is_busy('c1') = 0`, **no** `NOT dblink_is_busy('c1')` — la función
  devuelve `int`, no `boolean`, y esa comparación directa da `ERROR 42804`), recuperando y
  commiteando lo primero que termine sin importar cuál sea.

Ninguno de los dos deadlocks refleja un problema del diseño de las RPC — los dos eran errores del
arnés de prueba (`dblink`), encontrados y corregidos antes de obtener el resultado limpio de arriba.

---

## 5. ACL — incluye `service_role` explícito, no solo `PUBLIC`

Confirmado en el branch (`has_function_privilege` para los 4 roles, no solo verificado por lectura
del `GRANT`/`REVOKE` en el texto):

| Rol | `seguros_siguiente_numero_poliza()` | `seguros_resetear_seq_poliza(int, boolean)` |
|---|---|---|
| `anon` | ❌ rechazado (confirmado con un intento REAL de llamada como `anon`, no solo el bit de privilegio — devuelve `insufficient_privilege`) | ❌ rechazado |
| `authenticated` | ✅ | ✅ |
| `service_role` | ❌ (revocado explícito) | ❌ (revocado explícito) |
| `PUBLIC` | ❌ | ❌ |

El `REVOKE FROM PUBLIC` solo no basta — Supabase otorga `EXECUTE` a `anon` por privilegio-por-
defecto a nivel de proyecto en funciones nuevas de `public`, independiente de `PUBLIC` (ver el
hallazgo ya documentado en `2026-08-09-*` sobre `pos_siguiente_ncf`, mismo patrón). Por eso el
candidato SQL revoca explícito de `anon` y `service_role` también, y solo otorga a `authenticated`.

---

## 6. Auditoría del reset

`seguros_resetear_seq_poliza()` deja un registro en `public.auditoria` (candidato SQL, líneas
117-127) como parte de la MISMA transacción de la RPC (atómico — si el `UPDATE` del contador se
revierte por cualquier motivo, el registro de auditoría también) con:
- `accion = 'SEQ_POLIZA_RESETEADO'`
- `detalle`: valor interno antes → después, el próximo número que se va a generar, y si se usó
  `p_forzar` (marcado explícito con "· FORZADO (sin validar contra el máximo emitido)" cuando
  aplica — para que quede claro en la auditoría que se saltó la salvaguarda a propósito).
- `old_data`/`new_data` en `jsonb` con el valor antes y el valor+parámetros después.
- `usuario`/`rol` de `mi_usuario_id()`/`mi_rol()` (la sesión real que ejecutó el reset, no un valor
  fabricado).

`seguros_siguiente_numero_poliza()` (el generador normal) **no** deja registro de auditoría por
cada número emitido — sería ruido (cada póliza nueva ya genera su propio rastro en `clientes`), y
no fue pedido por ChatGPT para ese caso; el reset sí lo pidió explícito por ser una operación
administrativa poco frecuente y de mayor impacto.

---

## 7. Fail-closed — diseño del frontend, sin scaffolding nuevo

Confirmado leyendo `API.post()` (`index.html`, definición de `API`):
```js
async post(t,d){const r=await fetch(...);if(!r.ok)throw new Error(await r.text());const tx=await r.text();return tx?JSON.parse(tx):null;}
```
Cualquier error de PostgREST/Postgres (incluido un `RAISE EXCEPTION` de la RPC) ya lanza de forma
natural — coincide exacto con el contrato fail-closed que se necesita, sin construir nada nuevo. El
patrón de llamada ya existe en el sistema (`generarNCF()`, `await API.post('rpc/siguiente_ncf',
{p_tipo:tipo})`) — se replica igual aquí.

### 7.1 — `generarNumPoliza()` (el escritor #1, el más crítico)

**ANTES** (líneas 6778-6802) — fail-**open**, fabrica un número falso si algo falla:
```js
async function generarNumPoliza(){
  try{
    const cfg=await API.get('configuracion',`clave=eq.seq_poliza&select=*`);
    const actual=(cfg&&cfg[0]?parseInt(cfg[0].valor):0)+1;
    if(cfg&&cfg[0]){
      try{ await API.patch('configuracion','clave=eq.seq_poliza',{valor:String(actual),actualizado:new Date().toISOString()}); }
      catch(eCol){ await API.patch('configuracion','clave=eq.seq_poliza',{valor:String(actual)}); }
    }else{
      try{ await API.post('configuracion',{clave:'seq_poliza',valor:String(actual),actualizado:new Date().toISOString()}); }
      catch(eCol){ await API.post('configuracion',{clave:'seq_poliza',valor:String(actual)}); }
    }
    return `POL-${new Date().getFullYear()}-${String(actual).padStart(6,'0')}`;
  }catch(e){
    return `POL-${new Date().getFullYear()}-${String(Date.now()%1000000).padStart(6,'0')}`; // ← fabrica un número que NUNCA pasó por el contador
  }
}
```

**DESPUÉS** — fail-closed, sin fallback, sin scaffolding nuevo en el call site:
```js
async function generarNumPoliza(){
  const r=await API.post('rpc/seguros_siguiente_numero_poliza',{});
  return r.numero;
}
```
El único llamador (`guardarCli()`, línea 9405: `const numPol=await generarNumPoliza();`) ya vive
dentro de un `try{...}catch(e){mostrarError(e.message,'Al guardar cliente: '+...);toast('err',
'Error guardando',e.message);}` (líneas 9368-9440, ya existente) — un error real de la RPC ahora se
muestra al usuario con el mensaje real de la RPC (ej. "Se alcanzó el límite de 6 dígitos...") en vez
de silenciosamente inventar un número que nunca pasó por el contador. **Cero líneas nuevas en el
call site.**

### 7.2 — `guardarNumeracion()` (Ajustes → Numeración)

**ANTES** (líneas 6749-6765):
```js
async function guardarNumeracion(){
  const inp=document.getElementById('cfgNumIni');
  const numIni=parseInt(inp?.value);
  if(!numIni||numIni<=0){toast('err','Número inválido','Ingrese un número mayor a 0');return;}
  try{
    await guardarTexto('seq_poliza',String(numIni-1));
    ST.config['seq_poliza']=String(numIni-1);
    toast('ok','Numeración guardada',`La próxima factura será la #${numIni}`);
    refrescarContadorNum();
    inp.value='';
  }catch(e){ mostrarError(e.message,'Al guardar la numeración'); }
}
```

**DESPUÉS:**
```js
async function guardarNumeracion(){
  const inp=document.getElementById('cfgNumIni');
  const numIni=parseInt(inp?.value);
  if(!numIni||numIni<=0){toast('err','Número inválido','Ingrese un número mayor a 0');return;}
  try{
    const r=await API.post('rpc/seguros_resetear_seq_poliza',{p_proximo_numero:numIni,p_forzar:false});
    ST.config['seq_poliza']=String(r.valor_interno);
    toast('ok','Numeración guardada',`La próxima factura será la #${numIni}`);
    refrescarContadorNum();
    inp.value='';
  }catch(e){ mostrarError(e.message,'Al guardar la numeración'); }
}
```
Diff mínimo: mismo try/catch/toast, solo cambia CÓMO se escribe `seq_poliza`.

### 7.3 — `guardarDatosEmp()` (Ajustes → Datos de la empresa)

**ANTES** (líneas 9910-9943) incluye el escritor directo dentro del `if(numIni...)`, y un helper
`guardarTexto2NoUsar` sin ningún uso real (código muerto).

**DESPUÉS:**
```js
async function guardarDatosEmp(){
  const get=id=>document.getElementById(id)?.value?.trim()||'';
  const nom=get('cfgEmpNom');
  if(!nom){toast('err','Campo requerido','Ingrese el nombre de la correduría');return;}
  try{
    const datos=[
      {clave:'empresa_nom',valor:nom},{clave:'empresa_rnc',valor:get('cfgEmpRNC')},
      {clave:'empresa_tel',valor:get('cfgEmpTel')},{clave:'empresa_email',valor:get('cfgEmpEmail')},
      {clave:'empresa_dir',valor:get('cfgEmpDir')},
    ];
    for(const d of datos){ await guardarTexto(d.clave,d.valor); ST.config[d.clave]=d.valor; }
    const numIni=get('cfgNumIni');
    if(numIni&&parseInt(numIni)>0){
      const r=await API.post('rpc/seguros_resetear_seq_poliza',{p_proximo_numero:parseInt(numIni),p_forzar:false});
      ST.config['seq_poliza']=String(r.valor_interno);
      ST.config['numIni']=numIni;
    }
    actualizarCFG();
    logAudit('CONFIG_EMPRESA','Datos actualizados: '+nom,'Configuración');
    toast('ok','Datos guardados',nom);
  }catch(e){ mostrarError(e.message,'Al guardar datos de la empresa'); }
}
```
**Limpieza incidental** (misma función, misma edición): se quita `guardarTexto2NoUsar` — un helper
sin ningún llamador, código muerto que ya vivía ahí antes de este bloque. Se menciona explícito
para que no pase como "smuggled in" — es higiene menor, no parte del hardening en sí.

### 7.4 — `guardarTarifas()` (Ajustes → Tarifas) — MIGRACIÓN + arreglo de un bug real encontrado de paso

**ANTES** (líneas 10053-10072) — **BUG CONFIRMADO**: la escritura de `seq_poliza` (línea 10055)
vive **antes** del `try{` (línea 10069) — sin ningún manejo de error. Si esa escritura falla por
cualquier motivo (RLS, red), la promesa se rechaza sin capturar (unhandled rejection): la función
muere en silencio, sin toast, sin mensaje — y las 9 tarifas de abajo ni siquiera se intentan
guardar.

**DESPUÉS** — la migración obliga a mover la escritura dentro del `try` (ya no hay forma de
escribir `seq_poliza` sin pasar por la RPC, así que el bug se corrige como efecto directo del
cambio, no como algo aparte):
```js
async function guardarTarifas(){
  const numIni=document.getElementById('cfgNumIni')?.value;
  const gv=id=>{const v=document.getElementById(id)?.value||'';return window.nxMoney?window.nxMoney.strip(v):String(v).replace(/,/g,'');};
  const datos=[{clave:'prima_basico',valor:gv('cfgT1')},{clave:'prima_superior',valor:gv('cfgT2')},{clave:'prima_esencial',valor:gv('cfgT3')},{clave:'dep_basico',valor:gv('cfgD1')},{clave:'dep_superior',valor:gv('cfgD2')},{clave:'dep_esencial',valor:gv('cfgD3')},{clave:'comision_basico',valor:gv('cfgC1')},{clave:'comision_superior',valor:gv('cfgC2')},{clave:'comision_esencial',valor:gv('cfgC3')}];
  const c1=gv('cfgCost1'),c2=gv('cfgCost2'),c3=gv('cfgCost3');
  if(c1)datos.push({clave:'costo_basico',valor:c1});
  if(c2)datos.push({clave:'costo_superior',valor:c2});
  if(c3)datos.push({clave:'costo_esencial',valor:c3});
  const antes=`B:${fmtN(CFG.t1)}/${fmtN(CFG.d1)} · S:${fmtN(CFG.t2)}/${fmtN(CFG.d2)} · E:${fmtN(CFG.t3)}/${fmtN(CFG.d3)}`;
  try{
    // ARREGLO DE PASO: antes esta escritura vivía ANTES del try — cualquier fallo tronaba sin
    // aviso y las tarifas de abajo ni se intentaban guardar. Ahora vive dentro del mismo try,
    // vía la RPC (candado compartido + validación contra el máximo emitido).
    if(numIni&&parseInt(numIni)>0){
      const r=await API.post('rpc/seguros_resetear_seq_poliza',{p_proximo_numero:parseInt(numIni),p_forzar:false});
      ST.config['seq_poliza']=String(r.valor_interno);
    }
    for(const d of datos){await API.patch('configuracion',`clave=eq.${d.clave}`,{valor:d.valor,actualizado:new Date().toISOString()});ST.config[d.clave]=d.valor;}
    actualizarCFG();
    const ahora=`B:${fmtN(CFG.t1)}/${fmtN(CFG.d1)} · S:${fmtN(CFG.t2)}/${fmtN(CFG.d2)} · E:${fmtN(CFG.t3)}/${fmtN(CFG.d3)}`;
    logAudit('TARIFAS_ACTUALIZADAS',`Primas titular/dep — ANTES ${antes} → AHORA ${ahora}`,'Configuración');
    toast('ok','Tarifas y comisiones actualizadas');
  }catch(e){ toast('err','Error',e.message); }
}
```

### 7.5 — Decisión de diseño explícita: `p_forzar` siempre `false` desde el frontend, en los 3 sitios de reset

Los 3 sitios (7.2/7.3/7.4) llaman la RPC con `p_forzar:false`. Esto significa: si el admin intenta
fijar un "próximo número" que sea menor o igual al máximo `numero_poliza` ya emitido en `clientes`,
la RPC rechaza con un mensaje claro (`'El próximo número (%) no puede ser menor o igual al máximo
ya emitido (%). Usa p_forzar=true si de verdad quieres hacerlo.'`) y el `catch` de cada función lo
muestra tal cual al admin vía `mostrarError`/`toast`. **No se construyó ningún flujo de UI para
`p_forzar=true`** en esta ronda — sería una función nueva (un botón/confirm de "forzar de todos
modos") que no fue pedida explícita, y agregarla sin que se pida sería inventar alcance. Si el
dueño/ChatGPT confirma que hace falta, es un paso aparte, chico y aislado (agregar un `confirm()`
+ el parámetro `true` en la llamada) — no bloquea nada de lo demás de este bloque.

---

## 8. Límite de 6 dígitos

Confirmado en el cuerpo de `seguros_siguiente_numero_poliza()` (candidato SQL, líneas 55-57):
```sql
IF v_nuevo > 999999 THEN
  RAISE EXCEPTION 'Se alcanzó el límite de 6 dígitos para el número de póliza (999999). Contacta al administrador.';
END IF;
```
Y en `seguros_resetear_seq_poliza()` (líneas 87-89), validando el rango del parámetro de entrada:
```sql
IF p_proximo_numero IS NULL OR p_proximo_numero < 1 OR p_proximo_numero > 999999 THEN
  RAISE EXCEPTION 'El próximo número debe estar entre 1 y 999999 (6 dígitos)';
END IF;
```
El contador de producción hoy está en `154845` — quedan ~845,000 números antes de tocar este
límite, así que no es un problema inminente, pero la RPC lo bloquea de raíz (`RAISE EXCEPTION`, no
un `LEAST()` silencioso que se quedara pegado en 999999 repitiendo el mismo número).

---

## 9. Rollback — por etapa

Ya documentado en el candidato SQL (líneas 193-202), se repite aquí por completitud:

- **Etapa C**: recrear las 3 policies **sin** el `AND clave <> 'seq_poliza'` — o sea, exactamente
  el texto ya vivo en producción hoy (2C-1), que no hace falta guardar aparte porque sigue ahí
  mismo, sin tocar, hasta que se aplique Etapa C.
- **Etapa A** (segura en cualquier momento antes de Etapa C, nada depende de que existan si el
  frontend nunca llegó a llamarlas):
  ```sql
  DROP FUNCTION public.seguros_siguiente_numero_poliza();
  DROP FUNCTION public.seguros_resetear_seq_poliza(int, boolean);
  ```
- **Etapa B**: revertir el `index.html` desplegado al commit anterior (los 4 sitios vuelven a
  escribir directo) — solo tiene sentido revertir esto si Etapa C **no** se ha aplicado todavía
  (si ya se aplicó Etapa C, revertir Etapa B sin revertir Etapa C primero dejaría el frontend
  intentando escribir directo contra un RLS que ya lo bloquea — по eso el orden de rollback es
  siempre C → B → A, el inverso exacto del cutover).

---

## 10. Lo que NO se hizo en esta ronda (confirmado, a propósito)

- **No** se aplicó nada a producción — ni las 2 funciones, ni el ACL, ni las 3 policies de Etapa C.
- **No** se limpiaron los 26 valores duplicados históricos de `numero_poliza` (ese trabajo de datos
  queda fuera de este bloque, tal como se cerró explícito en la ronda anterior).
- **No** se abrió el bloque general de UNIQUE constraint sobre `clientes` (fuera de alcance,
  mismo motivo).
- **No** se construyó ningún flujo de UI para `p_forzar=true` (ver §7.5).

---

## 11. Producción — confirmado sin tocar, estado 2C-1 intacto

Verificado por lectura directa en `tnwsgcxurfyuszxsewsn` al cierre de esta ronda (después de haber
usado el branch desechable para TODA la construcción/prueba):

- Las 4 policies de `configuracion` (`select`/`insert`/`update`/`delete`) son **texto byte-idéntico**
  al estado 2C-1 — sin ningún `AND clave <> 'seq_poliza'`.
- `seguros_siguiente_numero_poliza` y `seguros_resetear_seq_poliza` **no existen** en `pg_proc` de
  producción (resultado vacío).
- `configuracion.seq_poliza` sigue en `valor='154845'`, `actualizado='2026-08-11T18:49:06.147Z'` —
  exactamente el mismo valor/timestamp que antes de empezar esta ronda, sin ningún residuo de las
  pruebas de concurrencia (que corrieron todas en el branch, nunca aquí).

---

## Siguiente paso

Esta respuesta cubre los 8 bloqueantes con evidencia real, no solo diseño en el papel. Queda
esperando la autorización explícita de ChatGPT/el dueño antes de aplicar Etapa A a producción —
ninguna parte de este documento se aplica sola.
