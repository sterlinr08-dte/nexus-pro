# CLAUDE.md — NEXUS PRO

Contexto del proyecto para cualquier sesión de Claude Code. Léelo al inicio para
no perder el hilo entre chats (la conversación se llena, pero **el contexto vive
aquí, en el repo**).

> Idioma de trabajo: **español** (el usuario y todos los textos de la app están
> en español de República Dominicana, `es-DO`). Responde y comenta en español.

---

## ¿Qué es NEXUS PRO?

Sistema de gestión para una **correduría de seguros de salud en República
Dominicana**. Maneja clientes, facturación, cobros, comisiones, agentes,
transferencias entre agentes, recibos de pago y contabilidad. Incluye además un
módulo **Multiempresa** con un **Punto de Venta (POS)** estilo Infoplus.

Es una **PWA** (app web instalable) pensada principalmente para **móvil**
(iPhone/Android). Se instala desde el navegador y funciona en pantalla angosta.

---

## Arquitectura (importante)

- **Es una app de un solo archivo HTML grande**, sin framework ni build step.
  - `index.html` (~7.8k líneas, ~520 KB): toda la app — HTML, CSS y JS del núcleo.
  - `parches.js` (~14.5k líneas, ~820 KB): "parches" móviles y módulos nuevos que
    se inyectan sobre el núcleo (navegación móvil, FAB, POS, transferencias,
    ciclos 20-20, recibos, etc.). Se carga al final con `parches.js?v=<APP_VERSION>`.
  - `sw.js`: Service Worker. **Solo cachea imágenes/iconos estáticos.** Nunca
    intercepta Supabase, `parches.js`, `.html` ni peticiones con `?` (datos).
  - `manifest.json`: configuración PWA.
  - Iconos `icon-*.png` y `gen_icon.py` (generador de iconos).
- **Backend: Supabase** (PostgreSQL + RLS + RPC).
  - URL y anon key están fijas en `index.html` (`SUPABASE_URL_FIXED`,
    `SUPABASE_KEY_FIXED`, ~líneas 2191-2192).
  - Proyecto: `tnwsgcxurfyuszxsewsn.supabase.co`.
- **Sin proceso de build, sin npm, sin bundler.** Se edita el archivo y se sube.

### Cómo se actualiza la app en producción
1. **(v40.0)** La app revisa `version.json` y descarga `index.html` desde **su PROPIO
   dominio** (`location.origin` — Cloudflare, que publica cada push a `main` en segundos).
   GitHub raw (`raw.githubusercontent.com/.../main/...`) quedó SOLO como respaldo si el
   dominio no responde (antes era la fuente principal y daba problemas: caché ~5 min,
   límites). Funciona igual en dominios de clientes (marca blanca).
2. Para publicar una novedad: subir `APP_VERSION` en `index.html` y `version` + entrada
   en `cambios[]` de `version.json` (mantenerlos **sincronizados** para que la app avise
   "hay actualización"). `version.json` → `url` apunta a `nexusprord.com/index.html`.
3. El usuario abre la app y toca **"Actualizar"**.

> Versión actual: **43.9** (ver `index.html` y `version.json`).

---

## Dominio y hosting (producción en vivo)

- **Dominio propio:** `nexusprord.com` (comprado en **Cloudflare Registrar**, cuenta
  `sterlinr08@gmail.com`, auto-renovación ON, vence 19-jun-2027). DNS en Cloudflare.
- **Hosting:** **Cloudflare Workers (static assets)** — proyecto `nexus-pro`,
  conectado por Git al repo `sterlinr08-dte/nexus-pro`, rama **`main`**.
  **Cada push a `main` se despliega solo** en el dominio (deploy automático).
  - Worker URL: `nexus-pro.sterlinr08.workers.dev`. Dominio personalizado:
    `nexusprord.com` (Custom Domain en la pestaña *Domains* del Worker).
  - Config en `wrangler.jsonc` (raíz): sirve el repo tal cual (`assets.directory: "./"`,
    `not_found_handling: single-page-application`). **No hay build.**
- **La app sigue auto-actualizándose** vía `version.json` → `url`
  (`raw.githubusercontent.com/.../main/index.html`). Eso NO cambió con el dominio;
  el botón "Actualizar" sigue bajando de `main`.
- GitHub Pages (`sterlinr08-dte.github.io`) puede seguir existiendo, pero el
  **front oficial ahora es `nexusprord.com`** (Cloudflare).

### Plan SaaS multiempresa (acordado, pendiente de construir)
Vender NEXUS PRO a varios negocios con **un solo dominio** y **control general** del dueño:
- **Arquitectura elegida: Opción A** = **una sola base multi-empresa** (todo en un
  proyecto Supabase, separado por empresa con **RLS**). Costo plano (~US$25/mes Pro,
  100k usuarios incl.), un arreglo llega a todos, fácil de mantener. Puerta abierta a
  **híbrido** (mover un cliente grande a su propia base si lo exige).
- **Login por empresa:** la parte después del `@` decide el tenant
  (`sterling@nexus-pro` → seguros; `francis@bayolsale` → tienda de celulares).
- **Marca blanca:** cada cliente con su propio dominio apuntando al mismo Worker;
  la app detecta el `hostname` y carga datos + logo/colores/nombre de ese cliente.
- **Prerrequisito CRÍTICO antes de vender:** cerrar la seguridad (RLS por empresa)
  — ver `SEGURIDAD-PLAN.md` / `PLAN-AUTH-OPCION-A.md`.

### Estado multi-empresa (Opción A) — construido por fases
- **Tabla `organizaciones`** (NO confundir con `empresas`, que son las cotizantes del
  seguro): cada negocio cliente. Campos: `slug` (el `@sufijo`), `nombre`, `tipo`
  (`seguros`|`tienda`...), `logo`, `color`, `dominio`, `activo`.
- **`usuarios_sistema.organizacion_id`** liga cada usuario a su organización.
  Org por defecto: `nexus-pro` (Correduría de Seguros). Demo tienda: `bayolsale`
  (Bayolsale Celulares), usuario `francis`.
- **Login Auth (Supabase Auth, activo por defecto):** `<user>@nexus-pro.local`.
  La sesión se arma desde `profiles`; el helper JS `nxCargarOrg()` carga
  `sesion.org` (vía `usuarios_sistema.organizacion_id`). Crear usuario nuevo =
  fila en `auth.users` (con `crypt()` y **todos** los token-cols en `''`, si no el
  login falla) + `auth.identities` + `profiles`.
- **Fase 2 (módulos por tipo):** `aplicarOrgSidebar()` + CSS `body.org-tienda`
  ocultan toda la navegación de seguros (sidebar, barra inferior móvil
  `.mobile-bottom-nav-clean`, FAB `.nx-fab`) y abren el POS directo para `tipo='tienda'`.
- **Fase 3 (separación de datos, RLS) — POS HECHO y verificado:** todas las tablas
  `pos_*` tienen `organizacion_id` + trigger `set_organizacion_id()` (autocompleta
  con `mi_organizacion()` en cada INSERT) + política RLS
  `mi_rol()='admin' AND organizacion_id = mi_organizacion()`. Helper
  `mi_organizacion()` (security definer: `auth.uid()`→`profiles`→`usuarios_sistema`).
  Verificado: Sterling ve 5 productos, Francis ve 0. **Las tablas del SEGURO
  (clientes, polizas, facturas, asientos...) AÚN no tienen `organizacion_id`/RLS por
  org — pendiente, hacer tabla por tabla y probado.**
- **ENTRADA INTELIGENTE (login `usuario@empresa`, estilo Infoplus) — HECHA:** en
  `doLogin()` (index.html), al escribir `usuario@empresa` se consulta la tabla
  `organizaciones` por `slug` (en la base maestra de seguros, con la anon key). Si la
  org tiene **`dominio`** → **redirige** a esa app (window.location). Si NO tiene
  dominio → entra en ESTE sistema (seguros/POS). Directorio central = tabla
  `organizaciones` (slug, nombre, tipo, dominio). Ej.: `deluxe`→`deluxe.nexusprord.com`,
  `bayolcell`→`bayolcell.nexusprord.com` (redirigen); `nexus-pro`/`bayolsale` (sin
  dominio) entran local.
- **SSO (UN SOLO LOGIN) — HECHO y verificado con Deluxe:** la tabla `organizaciones`
  tiene además `auth_url`, `auth_key` (anon de ESA base) y `email_dominio`. En
  `doLogin()`, si la org tiene esos 3 campos: arma `email = usuario + email_dominio`,
  hace POST a `auth_url/auth/v1/token?grant_type=password` (apikey=auth_key) con la
  clave; si OK, redirige a `dominio#access_token=...&refresh_token=...&expires_in=...&token_type=bearer&type=magiclink`.
  La app destino (Supabase v2, flujo implícito, `detectSessionInUrl` por defecto)
  **entra ya logueada, sin segundo login**. NO requiere tocar la app destino.
  Deluxe configurado: `auth_url`=`mrtqkhachhvsczltwakt.supabase.co`, `email_dominio`=`@deluxe.local`
  (su login convierte `usuario`→`usuario@deluxe.local` vía `usuarioAEmail()`).
  **Para sumar un sistema nuevo al SSO:** llenar en `organizaciones` su `dominio`,
  `auth_url`, `auth_key`, `email_dominio` (ver convención de email en su Login). El
  repo de Deluxe se puede clonar (público) para inspeccionar; deploy es en su Cloudflare.
- **Decisión de arquitectura (importante):** sistemas DISTINTOS (seguros, Deluxe
  belleza, BayolCell taller) = **cada uno su app/repo + su base + su subdominio**
  (`deluxe.nexusprord.com` etc.), unificados por la entrada inteligente `@empresa`.
  El **mismo** sistema vendido a varias (POS) = **una sola base compartida** separada
  por `organizacion_id`+RLS (NO se crea base por cada cliente). Repos del dueño:
  `nexus-pro` (seguros, este), `DELUXE-BEAUTY-CENTER-` (Vite/TS, base Supabase
  `mrtqkhachhvsczltwakt`), `bayolcell-taller` (base `vkhwdvjtowrhkhqavnvk`).
- **Deluxe DESPLEGADO y EN VIVO:** Cloudflare Pages (proyecto `deluxe-beauty-center`,
  build `npm run build`, salida `dist`, env `VITE_SUPABASE_URL`+`VITE_SUPABASE_ANON_KEY`),
  dominio `deluxe.nexusprord.com`. Flujo `estefany@deluxe` en `nexusprord.com` →
  redirige a Deluxe. **Verificado funcionando.** Falta igual: BayolCell (desplegar su
  subdominio).
- **Pendiente:** Fase 3 para tablas de seguros · Fase 4 = panel de **control general**
  del dueño (superadmin que ve todas las organizaciones) · desplegar BayolCell.

### POS como app independiente para tiendas (decidido 20-jun-2026, HECHO v38.7)
Acordado con el dueño en chat `RvxXb`. Vender el **mismo POS** a varios negocios
(clientes), cada uno entrando a un POS que **se sienta como su propio sistema**:
- **Formato elegido: BARRA LATERAL** (sidebar índigo a la izquierda con los módulos
  agrupados: Principal/Inventario/Personas y CRM/Finanzas/Sistema) + **dashboard de
  inicio** con KPIs (ventas hoy, facturas, en caja, bajo stock) + accesos rápidos +
  últimas ventas. NO barra de pestañas arriba. Se descartaron "barra abajo" y
  "lanzador Odoo" (se le mostraron las 3 en muestras y eligió lateral).
- **Color elegido: AZUL ÍNDIGO** (`#4f46e5`/`#4338ca`/`#3730a3`, sidebar gradiente
  `#1b1f4d→#283593`). Sin morados/violeta. Iconos de módulos conservan su color
  propio (verde Vender, naranja Productos…) para distinguir de un vistazo.
- **Muestras visuales** (standalone, en `main`, para que el dueño aprobara en el
  móvil antes de construir): `muestra-pos.html` (sidebar) y `muestra-formatos.html`
  (comparador de los 3 formatos). Se pueden borrar cuando el POS real esté hecho.
- **Cómo se activa:** SOLO para organizaciones **`tipo='tienda'`** (mecanismo
  `body.org-tienda` Fase 2 que YA oculta toda la nav de seguros + abre POS directo +
  cambia "Volver" por "Cerrar sesión"). El cliente entra y ve SOLO su POS, sin
  rastro del seguro ni puerta de regreso. La org de seguros (`nexus-pro`) NO cambia.
- **HECHO — Paso 1 (sidebar + dashboard):** en `parches.js`, `renderPOS` con
  `esTienda` usa `shellTienda(body,...)` (barra lateral índigo con secciones
  Principal/Inventario/Personas y CRM/Finanzas/Sistema + footer usuario + "Cerrar
  sesión" + área principal con topbar/burger móvil; `nxPosToggleSide` para el drawer).
  `renderInicio` en modo tienda muestra **KPIs reales** (ventas de hoy, efectivo en
  caja `_dashKPI`, productos, bajo stock) + accesos rápidos por grupos + panel
  **"Últimas ventas"** del día (v38.7, desde `_ventas`). Reusa los 16 renders de módulo;
  solo cambia el "chrome". Gateado a `tipo='tienda'` (seguros/admin siguen con pestañas).
  CSS `nxT*` en el bloque de estilos del POS. **Pendiente:** Paso 2 org tienda de prueba
  (Bayolsale ya sirve) · Paso 3 cajeros con su login (ver roles/login abajo).

### Multi-cliente del POS: aislamiento y personalización (acordado, IMPORTANTE)
Reglas confirmadas con el dueño (cómo responderle si pregunta de nuevo):
- **Mismo POS para varios clientes = UNA sola base compartida**, separada por
  `organizacion_id` + RLS (NO base por cliente). NO es como Deluxe. Deluxe tiene
  base/repo/subdominio propio porque es un **sistema DISTINTO**, no el mismo POS.
  El aislamiento del POS YA está hecho y verificado (Sterling 5 prods / Francis 0).
- **Personalización por cliente:** NUNCA clavar un cambio a fuego en el código (eso
  le llega a TODOS). Siempre como **opción/interruptor guardado en la organización**
  (patrón que ya existe: logo, color, tipo, `pos_acceso`, secuencias, NCF…). El
  código es compartido; se "configura" distinto por org. Lo que necesite código
  nuevo va detrás de un flag por org (`if(org tiene función X)`), encendido solo
  para quien lo pidió.
- **Si una personalización perjudica a otros:** el dueño SIEMPRE tiene control →
  (1) **apagar** el interruptor (reversible al instante), (2) dejarla **solo** en esa
  org, o (3) **graduar** a ese cliente a su **propia base/subdominio** (ruta
  "híbrido"/Deluxe) para que su versión no toque a nadie más. Nunca queda atrapado.



## Reglas obligatorias en cada cambio (de `REGLAS-ACTUALIZACION.md`)

Aplicar **siempre** al hacer una novedad/actualización:

1. **Depurar** — quitar dead code, no romper navegación ni clics existentes.
2. **Refactorizar** — código limpio y consistente con el estilo del archivo.
3. **Probar** — `node --check parches.js` (y revisar la lógica del cambio).
4. **Web móvil angosta** — verse bien en ~320–480px, sin desbordes horizontales.
5. **Auditar los grids** — `.qa-g`, `.kg`, `.g2/.g3/.g4`; breakpoints 768/640/480.
6. **Rejilla adaptable** — usar `auto-fit`/`auto-fill` + `minmax` o columnas por
   breakpoint; nunca anchos fijos que desborden.

**Despliegue:** subir `APP_VERSION` + `version.json`, `node --check parches.js`,
commit descriptivo y push. La app descarga de `main`.

---

### Secuencias centralizadas (numeración de documentos, v26.8)
Tabla `pos_secuencias` (tipo único por org, prefijo, longitud, proximo; org+trigger+RLS).
Helper async `nextSeq(tipo)` lee la fila, devuelve `prefijo+pad(proximo)` y hace
`proximo+1`; si no hay fila para ese tipo devuelve **null** (los callers caen a su
lógica vieja → additivo, no rompe). Sección **Secuencias** en Ajustes
(`ajustesSecuencias`, `nxSecInit` siembra `SEC_DEFS` continuando desde el max
actual de cotización/NC/transferencia, `nxSecEdit/nxSecGuardar`). Enganchado en:
cotización, nota_credito, transferencia, nómina (`rrhh_nominas.numero`), recibo
(`pos_abonos.numero`), pago_prov (`pos_compra_pagos.numero`), crm
(`pos_crm.numero`) y asiento (`pos_asientos.numero`, en los 5 puntos de post:
venta/compra/abono/devolución/nómina/manual/gasto). Factura (CO/CR vía
`pos_config`) y NCF (`pos_ncf_secuencias`) mantienen su sistema propio.

### Roles y permisos del POS (v26.9) — SOLO UI por ahora
Tabla `pos_acceso` (rol único por org, `label`, `modulos` jsonb; org+trigger+RLS).
`MODULOS` (16 claves: inicio/vender/factura/…/ajustes), `ROLES_DEF`
(admin=todo, gerente=todo menos ajustes, cajero, vendedor). Helpers `rolReal()`
(sesion.rol), `rolEfectivo()` (= `_rolPreview` || real), `puedeVer(mod)`.
Gating en `tabBtn` (devuelve '' si no), tiles de `renderInicio` y guard en
`nxPosTab`. Sección **Roles y accesos** en Ajustes (`ajustesRoles`,
`nxAccesoInit` siembra ROLES_DEF, `nxAccesoEdit/Guardar` editan `modulos`,
`nxRolPreview` = "Ver como [rol]" con banner `.nxPrevBar`). **IMPORTANTE: NO
toca login ni RLS** — todos los usuarios del POS tienen `sesion.rol='admin'`
(esAdmin), así que hoy puedeVer=true salvo en preview. **PASO PENDIENTE
(supervisado, riesgoso):** crear usuarios staff con su rol/login + RELAJAR las
políticas RLS de `pos_*`/`rrhh_*` de `mi_rol()='admin'` a permitir otros roles de
la MISMA org (la isolación por `organizacion_id` se mantiene). Es la Fase 3 de
`SEGURIDAD-PLAN.md`. Hacerlo con el dueño probando (puede dejar gente afuera si
sale mal).

### DEUDA ANTERIOR separada de las facturas — v36.0 (decisión del dueño)
La "deuda anterior al sistema" (la que el cliente trajo de ANTES) ahora vive en su PROPIA
columna **`clientes.deuda_anterior`**, SEPARADA de las facturas (ya NO se mezcla en `deuda_ant`/
`deuda_total`). Modelo: `deuda_total`=solo primas facturadas; `pagado`=solo pagos a facturas;
`pend(c)`=deuda_total−pagado (solo facturas); `deudaAnt(c)`=deuda_anterior; **`pendTot(c)`=
pend+deudaAnt** (total que debe). El campo del form (`cDeudaIni`, label `cDeudaLbl`) ahora guarda
`deuda_anterior` (al crear: `deuda_anterior:deudaIni,deuda_total:0`; al editar bloqueado + botón
"Ajustar" `nxDeudaUnlock` → `datos.deuda_anterior`). La generación de facturas NO cambió (`da=pend(c)`
ahora excluye la deuda anterior, así que ya no la suma). Display: ficha del cliente y fila de Cobros
muestran "Deuda anterior" en ROJO aparte; **totales/estado/filtros usan `pendTot`** (getEst, dashboards,
reportes, filtros "con deuda", selSoloDeuda, sort) para que nada se pierda; **cobro y asientos siguen con
`pend`** (solo facturas — la deuda anterior se baja a mano con "Ajustar"). Migración hecha (13 clientes,
RD$ 71,500 → 32,500 pendiente tras aplicar lo pagado a la deuda vieja 1ro; total pendiente intacto
541,800). NO tocar `reconciliarDeudasClientes` (solo sube deuda_total a las primas, no toca deuda_anterior).

### Bug de la DEUDA al editar cliente (RAÍZ) — ARREGLADO v30.0 (20-jun-2026)
Síntoma: clientes salían con un "Pendiente" diminuto o equivocado (p.ej. "RD$ 8")
y los pagos parecían perderse. **Causa de fondo (la identificó el dueño):** la
casilla **Deuda RD$** del formulario de cliente se creó SOLO para registrar la
deuda previa AL CREAR, pero al EDITAR quedaba abierta (`disabled=false`,
contradiciendo su propio comentario) y **reescribía `deuda_total` en cada
guardado** — así, editar un cliente para cualquier cosa (ponerle precio,
teléfono...) le dañaba la deuda. Sumado a un `parseFloat` crudo sobre el campo de
dinero (formato `4.000`→`4`), dejaba la deuda en números diminutos.
**Arreglos (todos en `index.html`):**
1. Al EDITAR, la casilla sale **BLOQUEADA** (candado): `cDeudaIni.disabled=true`
   en el fill de edición. La lógica de guardado ya salta el ajuste de deuda
   `if(cDeudaEl && !cDeudaEl.disabled)`, así que editar NO toca `deuda_total`.
   Botón **"Ajustar"** (`nxDeudaUnlock`, con confirm + audit) la desbloquea solo a
   propósito. Label/hint cambian según crear (deuda previa) vs editar (bloqueada).
2. Lectura de montos del campo con `nxMoney.parse` (no `parseFloat`).
3. **Auto-reconciliación** (`reconciliarDeudasClientes` en `cargarDatosNucleo`):
   en cada carga, si `deuda_total < Σ(prima_base+prima_deps)` de las facturas no
   anuladas, **sube `deuda_total` al facturado** y lo persiste (additivo, solo
   sube, nunca baja). Repara solo cualquier deuda que haya quedado por debajo.
   IMPORTANTE: usa `prima_base+prima_deps` (NO `total`, que incluye `deuda_ant`
   arrastrada y duplicaría). Por eso al cuadrar a mano deja `deuda_total = suma de
   primas reales`, no la suma de `total`.
**Correcciones de datos hechas a mano (SQL, base seguros):** ESTEVEZ TEJADA,
RAFAELINA (precio real 4.000, mayo pagada + depósito 4.000 en `abonos`, junio
pendiente → pendiente 4.000) y VALERIO VARGAS, DILENIA (deuda estaba en 0;
restaurada a 8.000 → pendiente 4.000). Barrido completo: eran las **únicas** con
deuda por debajo de lo facturado; el resto sano. NUÑEZ, MARIA DE LOURDES se dejó
como está (pendiente 200, decisión del dueño). Nota de modelo: el "Pendiente" del
cliente = `deuda_total - pagado` (`pend(c)`); un cobro suma a `clientes.pagado` e
inserta fila en `abonos` (seguros) — `agente_cobro` = UUID del agente; estado de
factura pagada = `'Pagado'`.

### Cobros — a qué CUENTA se depositó + destino del pago (v38.3–38.4, chat `RvxXb`)
- **Selector "¿A qué cuenta se depositó?" (v38.3, `parches.js` IIFE cobro-directo):** al cobrar con
  Transferencia/Depósito aparece un selector OBLIGATORIO de agente-cuenta (ESTERLIN/ROBINSON, de
  `st().agentes`), vacío por defecto (reemplazó el checkbox "Depositado directo a mi cuenta").
  El wrap de `regAbono` crea la fila en `entregas_admin` con `agente_id = cuenta elegida`; si el que
  registra deposita a **SU PROPIA cuenta** (`miCuentaId()`: sesión→agente por nombre→admin fallback
  `cargo==='admin'`) la entrega nace **auto-confirmada** (`confirmado:true` + `confirmado_at/por`,
  no pasa por Solicitudes). Audit `COBRO_DEPOSITO_PROPIO` / `COBRO_DEPOSITO_CUENTA`.
- **Destino "Deuda antes del sistema" (v38.4, `index.html`):** en el modal de cobro, si el cliente
  tiene `deuda_anterior>0` aparece el selector `#aDestino` (Meses pendientes automático / Deuda
  anterior). Rama `nxRegAbonoDeudaAnterior`: baja `clientes.deuda_anterior`, inserta `abonos`
  (tipo con fallback), asiento (Caja/Banco vs 1201) y `logAudit('COBRO_DEUDA_ANTERIOR')`. El flujo
  normal (meses, oldest-first) NO cambió. Elegir mes específico quedó DIFERIDO (decisión dueño).
- **Display facturas/pendientes (v37.x):** las tarjetas de factura ya calculan con
  `prima_base+prima_deps` (no el `total` arrastrado, que duplicaba); label "Mes actual"; líneas
  rojas apiladas "Deuda mes anterior" + "Deuda antes del sistema" separadas. Verificado contra los
  101 clientes con facturas (0 discrepancias). OJO: `facturas.estado` puede quedar OBSOLETO vs la
  verdad calculada (asignación oldest-first sobre prima) — para listas de "pendientes de mes X"
  recalcular, no confiar en el label (resync de estados ofrecido, NO aprobado aún).
- **Permiso `modificar_precio` para rol agente:** concedido vía `configuracion.roles_perms`
  (jsonb_set) para que Robinson ponga precios especiales a clientes.

### Rifas — panel admin afinado + preview WhatsApp (v37.8–38.0, chat `RvxXb`)
- **KPIs del panel clickeables (v37.8):** los 4 tiles (`.rfKpiT`, chevron `::after`) abren
  `nxRifaTickets(estado,titulo)` filtrado (`_tkEst`), ventanas del sistema (no flotantes), con
  banner-pista en pendientes.
- **Cambiar número de boleto — SOLO ADMIN (v37.9–38.0):** en `gestBoleto` (pendientes y
  confirmados): `nxRifaCambiarNum` → modal con nuevo número o "a la suerte"
  (`nxRifaCambNumSuerte`); `nxRifaCambNumGuardar` valida rango + ocupación (`_bolMap`), PATCH
  `numero` y `logAudit('RIFA_CAMBIO_NUMERO','antes → después · comprador (tel)','Rifas')`.
- **Preview WhatsApp del boleto (SSR, SIN VERIFICAR):** `worker.js` nuevo + `wrangler.jsonc`
  (`main`, binding `ASSETS`, `run_worker_first:true`): para `/boleto.html?id=` inyecta
  og:title/description/image dinámicos (banner vía función `boleto` `?id&img=1`), fallback a
  estático en cualquier error. **Pendiente confirmar en vivo** (probar con un link de boleto NUNCA
  compartido — WhatsApp cachea el preview por URL; si sigue genérico el Worker no está ejecutando).
  El botón "Enviar mi boleto por WhatsApp" de `rifa.html` ahora apunta al número del COMPRADOR
  (`api.whatsapp.com/send?phone=1<tel>`).

### Repintado visual — fondo BLANCO + sombras negras (v38.8–39.2, chat `RvxXb`)
Pedido del dueño: quitar el "morado" de todo el sistema.
- **v38.8:** iconos 2.5D (IIFE `__NEXUS_ICONOS_25D__` aplana el 3D), arreglado tile VENDER vacío
  (`ti-cash-register` NO existe en la webfont Tabler → `ti-shopping-cart`, replace_all), animación
  reveal del lanzador POS (`.nxPpkReveal` + IntersectionObserver).
- **v38.9:** `--bg0` `#f0f4f8`→`#ffffff`.
- **v39.1 (la RAÍZ del morado):** el tema **`body.tema-glass`** pintaba un gradiente lavanda con
  `!important` que pisaba `--bg0` → ese tema ahora usa `background:#ffffff !important`.
- **v39.0:** buscador de artículo del POS: animación de deslizamiento más lenta/apreciable y el
  sheet **se cierra solo** al elegir artículo (`nxProdPickElegir` remueve `#nxProdPick`).
- **v39.2:** barrido de sombras — 93 `box-shadow` con rgba morado → `rgba(15,23,42,...)` (35 en
  index.html, 58 en parches.js), SOLO dentro de `box-shadow:` (fondos/bordes/scrollbars morados
  intactos, Opción B del dueño).

### AUTO-FACTURACIÓN DEL SEGURO: ES DEL SERVIDOR (descubierto y arreglado jul-2026, v39.4)
**IMPORTANTE:** las facturas mensuales del seguro NO las genera la app — las genera una **función
Edge `auto-facturacion`** (proyecto `tnwsgcxurfyuszxsewsn`, verify_jwt false) disparada por
**pg_cron** (`auto-facturacion-diaria` 10:05 UTC + 2 reintentos 10:20/10:35) vía
`run_auto_facturacion()` → `net.http_post`. Corre TODOS los días; factura solo a los clientes cuyo
`dia_facturacion` == día de hoy (todos tienen 20). Inserta vía RPC **`crear_factura_auto_tx`**
(anti-duplicado por período, NCF transaccional en `secuencias_ncf`, `deuda_total += prima`, asiento
1201/4101). Logs en `auto_jobs_log` y `auto_notificaciones_log`. La v1 (de otro chat, jun-8) tenía 2
BUGS que dañaron JUNIO: (1) `clientes.deps` es columna **TEXT** y hacía `Array.isArray(deps)` sin
parsear → **0 dependientes SIEMPRE** (8 clientes sin el cobro del dep en junio; 5 reparados a mano,
resto pendiente de confirmar precio con el dueño); (2) sin precio especial usaba **`costo_*`**
(RD$ 1,790, lo que paga el negocio) en vez de **`prima_*`** (RD$ 4,500, lo que paga el cliente) —
los titulares de junio se corrigieron después a mano. **v2 desplegada y probada** (jul-2): parsea
deps TEXT, usa prima_*, precio especial manda si >0, `permitir_facturacion` null-safe (null=facturar,
igual que la app). El generador de la APP (`genFacturas`/`_genFacturasInterno` en index.html) sigue
existiendo para generación manual; en v39.4 su anti-duplicado consulta la BASE (no solo ST) para no
duplicar lo que el cron ya generó. El frontend TAMBIÉN tiene `verificarAutoFacturacion()` (timer
por minuto, `autoCfg` dia 20 / hora 06:10) — redundante con el cron pero inofensivo con el candado.
OJO frontend: `deps` se parsea al cargar (línea ~4438) y CFG mapea `prima_*`/`dep_*`/`costo_*` de
`configuracion` (t=prima titular, d=precio dep, cost=costo negocio).

### FACTURACIÓN SANA DE PUNTA A PUNTA — v39.3→39.7 (jul-2026, chat `RvxXb`)
Barrido completo pedido por el dueño ("de eso dependen mis ingresos"). Todo HECHO y en vivo:
- **v39.3 — precio nuevo ↔ factura del mes:** al EDITAR un cliente y cambiarle la prima
  (`guardarCli` captura `_primaAntes`), si el mes en curso tiene factura SIN pagar con la prima
  vieja, `nxSincronizarFacturaPrecio` pregunta si la actualiza y cuadra factura+deuda de una
  (audit `FACTURA_REPRECIADA`). Facturas pagadas NO se tocan. Mata el ciclo: precio nuevo →
  ajuste a mano → `reconciliarDeudasClientes` lo revertía (eso infló deudas de 9 clientes en mayo).
- **Datos reparados (SQL, jun-jul):** 9 clientes con factura de mayo al precio viejo corregidos
  (4 grupo Yilenny a 3,300 + Yensi 3,500/Quilvio 4,000/Argeni 3,500/Luisa Yamel 4,000/Dayeli 5,500);
  precios confirmados por el dueño: Gilberta 5,000 · Ramón Valdez 4,500 · Amantina 5,000 (quedaron
  con piquito de mayo por pagar de menos); Donis debe junio; **Mascimina = abuela, NO paga:**
  facturas anuladas + `permitir_facturacion=false`. Junio reparado: 8 clientes con dependientes
  facturados en 0 por el bug del servidor (+2,000 c/u, Ada +3,000, Juan Frankelis 4,000+4,000+4,000
  =12,000/mes confirmado). Geovanny 6,500 y Lucía 6,000 INCLUYEN el dep → precios repartidos en
  titular+dep para que julio no duplique. José Natividad pagó 18,000 adelantado (4 meses, NO es error).
- **v39.5 — corte 20-al-20 en la UI:** helper `mesCorte()` (día <20 → mes anterior; enero→dic).
  `initMesSel` (selector de Facturas), fallbacks de `rFact`/`genFacturas`/`_genFacturasInterno`,
  filtro "atrasadas" y `genFacturasConfirm` usan el mes de CORTE. Al abrir Facturas el día 5 de
  julio se ve JUNIO (el mes que se está cobrando), no julio vacío.
- **v39.6 — sincronización en vivo:** `nxSyncDatos(force)` re-LEE clientes+facturas de la base
  (throttle 45s) y repinta; enganchado al interval de 30s y a `visibilitychange` (force al volver
  a la app). Antes el "auto-refresco" solo repintaba memoria → lo que cobraba Robinson no se veía
  sin recargar. + `regAbono`/`nxRegAbonoDeudaAnterior` ahora repintan también rCli+rFact, y
  `guardarCli` repinta rFact+rCob.
- **v39.7 — dinero por agente (Detalles de cobro):** `entregas_admin.cobrado_por` (migración
  `entregas_admin_cobrado_por`, backfill por cliente+monto y por fecha+monto). En
  `calcularPorAgente` (parches.js) las entregas DIRECTAS (es_directo, el cliente depositó a la
  cuenta de `agente_id`) funcionan como transferencia instantánea: RESTAN al que cobró
  (`cobrado_por`) y quedan en poder del dueño de la cuenta; a la propia cuenta = neto 0 (en su
  "cobrado"). ANTES restaban al dueño de la cuenta y el cobrador quedaba "con" dinero que nunca
  tuvo (Robinson salía con ~62k). FÍSICAS (no directo) siguen restando a `agente_id`. El wrap del
  cobro guarda `cobrado_por` (con fallback si la columna no existe). **CORTE ROBINSON (3-jul):**
  entrega física de ajuste 19,200 `CORTE-JUL-2026` → acumulado = **16,500** (cifra real acordada);
  además se borraron 2 duplicados del cobro de Kelvin en entregas_admin (5,000 x3 → x1).
  OJO efectivo: va al acumulado del **"Agente que cobró"** del modal (no del agente asignado al cliente).

### POS look premium — diseño Stitch del dueño (v40.2, tanda 1, chat `RvxXb`)
El dueño subió un ZIP de Google Stitch ("cell phone billing system", 15 pantallas premium estilo
TechFlow: blanco + azul real #2563eb, sidebar, KPIs, POS con badges de stock y fichas de pago) y
pidió ADAPTARLO al POS. **Tanda 1 HECHA:** (1) acento del POS violeta→AZUL REAL — swap de colores
SOLO en la línea `st.textContent` del CSS POS (#6d28d9→#2563eb, #7c3aed→#2563eb, gradientes, etc.);
(2) `gridHTML` tarjetas de producto con **badge de stock** `.nxPosStkB` (azul STOCK/rojo BAJO por
`stock_min`/SIN STOCK/teal SERVICIO); (3) carrito "Total a pagar" grande azul (`.nxPosTotPay`);
(4) modal de cobro con **fichas de pago 1-toque** `.nxPayTiles`/`nxPosPayQuick(id)` (llena ese
método con el total, limpia el resto; inputs de mixto siguen abajo). CSS nuevo en `st.textContent +=`.
**Tanda 2 HECHA (v40.3):** dashboard tienda — KPI 'Ventas de hoy' con tendencia vs ayer (▲/▼ %),
KPI nuevo 'Ventas del mes' (facturas + ticket promedio), últimas ventas con chip PAGADA/FIADO
(`.nxTVSt`/`.nxTVEnd` en CSS tienda). **Tanda 3 HECHA (v40.4):** Productos = inventario maestro —
pastillas de filtro `_prodFiltro`/`nxProdFiltro` (todos/stock/bajo/sin/servicio, `.nxInvPill`),
stock con punto de color (`.nxInvStk` ok azul/low rojo "N quedan"/out Agotado), costo gris bajo el
precio. **Pendientes de tandas siguientes** (pantallas del ZIP en el chat, no en repo): caja/arqueo
premium, historial de ventas, clientes, kanban reparaciones (módulo NUEVO que el POS no tiene —
el dueño no lo ha pedido explícito aún).

### POS tienda de celulares — módulos nuevos v41.0-41.1 (jul-2026, "haz todo" del dueño)
Del análisis vs sistemas de tiendas de celulares, HECHO y en vivo:
- **SERVICIO TÉCNICO / Reparaciones (kanban):** tabla `pos_reparaciones` (org+trigger+RLS; numero,
  cliente, telefono, equipo, imei, clave, accesorios, falla, estado_fisico, diagnostico, presupuesto,
  abono, tecnico, estado recibido|diagnostico|reparando|esperando_pieza|listo|entregado|cancelado,
  cobrado_monto/metodo, entregado_at). Tab `reparaciones` (sidebar Principal): kanban horizontal
  scroll (`.nxRepKb`), recibir equipo (`nxRepNueva/Guardar` — numero via nextSeq('reparacion') o
  REP-#####; avance entra a caja mov.), gestionar (`nxRepVer`: chips de estado 1-toque `nxRepEstado`,
  WhatsApp con mensaje armado, guardar diagnóstico/presupuesto `nxRepDet`), **entregar y cobrar**
  (`nxRepEntregar`: prompt monto+método, entra a caja si efectivo) y **orden de servicio imprimible**
  (`nxRepImprimir`, con firma y nota legal 30/90 días). Pilla activas/entregadas (`_repVista`).
- **VENTA EN CUOTAS:** tablas `pos_financiamientos` + `pos_fin_cuotas` (org+trigger+RLS). En el
  modal de cobro, si queda crédito y hay cliente → checkbox "Financiar el resto en CUOTAS" (#finChk,
  finN, finFrec semanal|quincenal|mensual); `nxPosConfirmar` crea plan + calendario (última cuota
  ajusta el redondeo). Tab `cuotas` (sidebar Finanzas): KPIs, tarjetas por plan (AL DÍA/VENCIDO/
  SALDADO), **cobrar cuota** (`nxFinPagar`: marca cuota + inserta pos_abonos con caja_id si efectivo
  + salda el plan al completar), ver plan (`nxFinPlan`) y **ACUERDO DE PAGO imprimible**
  (`nxFinContrato` con calendario y firmas).
- **Garantía por venta (v41.1):** `pos_venta_items.garantia_hasta` (migración) calculada de
  `producto.garantia_dias` al vender; sale en el ticket ("Garantía hasta: ...").
- **Orden/UX:** shell de barra lateral para TODOS (v40.8) + blindada vs tema glass (v40.9) +
  botón **"Venta rápida"** en topbar (`.nxTQuick`). MODULOS ahora incluye reparaciones y cuotas
  (roles). `cargarPOS` carga `_reps/_fins/_finCuotas` best-effort.
- **APARTADOS/layaway HECHO (v41.7):** tablas `pos_apartados` + `pos_apartado_pagos` (org+RLS);
  tab `apartados` (Finanzas): crear (prompts, numero AP-#####/nextSeq('apartado'), límite en días),
  abonar (entra a caja si efectivo), WhatsApp con lo que falta, VENCIDO, entregar/cancelar.
- **PENDIENTE del análisis** (no construido aún): trade-in/compra de usados + costo y condición POR
  IMEI (requiere extender pos_seriales) · escáner con cámara (BarcodeDetector NO
  existe en iPhone/Safari — evaluar librería) · variantes/comparador de producto · asientos contables
  de reparaciones (hoy solo movimiento de caja) · pantallas premium restantes del ZIP (caja/arqueo,
  historial, clientes).


### POS — sesión maratónica v41.2→43.9 (5-jul-2026, chat `RvxXb`) — RESUMEN PARA RETOMAR
Todo HECHO, en vivo y probado por sintaxis (detalle en changelog de version.json):
- **Contador de factura TRANSACCIONAL:** pos_secuencias tipos `factura_contado/credito` (sembrados
  del máximo real); preview `proxNumeroFacturaFmt` lee la secuencia; número corto estilo Infoplus
  (`proxNumeroFacturaCorto`); escribir número+ENTER = trae esa factura (`nxFacBuscarNum`); lupa =
  historial paginado 10 en 10 (`nxFacHist`, carga de la BASE si memoria vacía, select=* — la columna
  `anulada` NO existe, es `estado`).
- **PREFACTURA (preventa):** tabla `pos_prefacturas` (items jsonb snapshot). Tab propio 'prefactura'
  que REUSA renderFactura() (esPreTab() por _posTab): mismos campos+IMEI+combos, NO valida stock,
  botón morado Guardar (`nxPrefGuardar`). Carritos SEPARADOS factura/prefactura (swap en nxPosTab:
  _cartFacSaved/_cartPre). En Factura: campo Prefactura con lupa (jalar por número `nxPrefJalar` o
  lista `nxPrefLista`) → `nxPrefFacturar` carga y al cobrar se vuelve factura real.
- **INVENTARIO ESTRICTO (decisión dueño):** sin stock no se agrega ni cobra (`puedeAgregar`,
  revalidación en confirm); IMEI OBLIGATORIO (se eliminó 'vender sin IMEI'/_sinSerial); prefactura
  exenta. Si un cliente SaaS necesita vender en negativo → hacer interruptor por org.
- **IMEI UX:** chip 📱 `IMEI · N` / `IMEI n/n` en tarjetas de Vender (`nxVenderImei`) y en el detalle
  del buscador (`nxPpkImei`; nxCargarSerialesDet ahora pinta chip compacto). Ventanilla `nxFacSerial`
  SIN tope: la cantidad de la línea se ajusta a los IMEI marcados (nxFacSerGuardar) y sincroniza combos.
- **COMBOS:** pos_productos.combo_items jsonb [{producto_id,cantidad}]; al vender el principal los
  acompañantes entran en RD$0 `+ X (incluido)` y descuentan stock (`ajustarCombos` en nxPosAdd/
  nxFacAdd/ajuste IMEI). UI en ficha de producto con buscador de sugerencias (`nxComboFiltrar/Pick`).
- **PRECIO MÍNIMO 🔒:** pos_productos.precio_minimo; campo y chip 'mín' SOLO admin/gerente
  (`puedeVerMin`); candado en nxFacPrecio (ajusta al piso) y en confirm.
- **CENTRO DE AVISOS 🔔 (automatización fase 1):** tab 'avisos' (renderAvisos, calculado en vivo):
  cuotas vencidas, apartados por vencer (3d), reparaciones LISTAS sin recoger, bajo stock — cada uno
  con WhatsApp 1-toque pre-escrito. Fase 2 pendiente: correo auto; Fase 3: WhatsApp API.
- **Endurecimiento COMPLETO A-D:** A modales pro (adiós prompts — quedó 1 solo en el núcleo seguros,
  banco de entregas) · B Compras en paralelo + lint de funciones fantasma (renderLog neutralizado en
  index; parches 100% limpio) · C logins staff (v42.4, PENDIENTE prueba del dueño con cajero en
  Bayolsale) · D asientos automáticos de reparaciones/apartados/cuotas (postAsientoServicio →
  1101/1102 vs 4101; cuotas vía postAsientoAbono) + botón 'Borrar datos de prueba' (Ajustes, zona
  de peligro, escribe BORRAR).
- **Buscadores unificados (.nxLupaBox):** combo, tabla Productos (`nxProdTablaBuscar`), kanban
  Reparaciones (`nxRepBuscar`), prefacturas. PENDIENTE: selector de CLIENTE en cobro/factura sigue
  siendo <select> — necesita buscador (cirugía delicada: re-precia carrito).
- **BUG CLASE NUEVA descubierto:** helpers que no existen en el IIFE donde se usan (moneyVal faltaba
  en POS → recepción no guardaba, v42.5). El lint de fantasmas solo detecta nombres globales, NO
  scoping entre IIFEs — al agregar código a un IIFE verificar que sus helpers existan AHÍ.
- **PENDIENTES PRIORITARIOS:** prueba del dueño (cajero staff + checklist QA) · e-CF DGII ANTES del
  15-NOV-2026 (vía PSFE/Alanube) · 606/608 · factura recurrente genérica (clonar motor cron del
  seguro) · trade-in/usados por IMEI · buscador de cliente en cobro · Fase 2/3 avisos · pantallas
  premium Caja/Historial · escáner cámara (iPhone limita) · hosting bayolcell.com (VENCIÓ 3-jul+72h).

### PLAN DE ENDURECIMIENTO del POS antes de VENDER (5-jul-2026, dueño: "tiene deficiencias")
Auditoría mecánica hecha: TODAS las consultas de lectura pos_*/rrhh_* verificadas contra el esquema
real — 0 columnas fantasma restantes (la clase de bug de 'anulada'/'deps'). Deficiencias REALES
identificadas, en orden de ataque acordable:
A) **UI con prompt()** en Reparaciones/Apartados/Cuotas → cambiar a modales pro con validación (feo
   y frágil en iPhone; no se puede vender así).
B) **Compras tab** aún carga 4 consultas secuenciales (lenta) + QA sistemático pestaña por pestaña
   en móvil con checklist.
C) **LOGINS DE STAFF — HECHO v42.4 (pendiente PRUEBA del dueño):** migración
   `staff_almacen_y_rls_por_org` (usuarios_sistema.almacen_id + TODAS las políticas pos_*/rrhh_*
   relajadas de mi_rol()='admin' a mi_rol() is not null — aislamiento por org INTACTO; saas_*/med_*/
   rifa_* siguen solo-admin). Edge Function **`crear-usuario-staff`** (verify_jwt; valida caller
   admin por profiles, crea auth.users+usuarios_sistema+profiles con rol y almacen_id, rollback si
   falla). UI: Ajustes→Roles→"Crear usuario de staff" (`nxStaffNuevo/nxStaffCrear`). Gate de
   `nxAbrirPOS` ahora por rolReal() (no esAdmin); `cargarPOS` usa sesion.almacen_id como almacén
   activo; `nxCargarOrg` (index) siempre trae organizacion_id+almacen_id. FALTA: prueba supervisada
   (crear cajero en Bayolsale, verificar módulos por rol y aislamiento).
D) Asientos contables de reparaciones/apartados + limpieza de datos de PRUEBA por organización.

### Investigación de POS del mercado (5-jul-2026, web) — brechas y precios
Comparados: Loyverse, Square, Odoo, Alegra RD, SICAR, Bind, RepairDesk (celulares), CellStore, Infoplus.
**TOP brechas de NEXUS POS (orden de valor RD):** 1) trade-in/usados con costo por IMEI (RepairDesk/
CellStore) 2) notificación AUTOMÁTICA de estado de reparación (hoy WhatsApp manual) 3) e-CF DGII
(Alegra/Infoplus la venden de bandera; será objeción) 4) lealtad: puntos/gift cards/crédito tienda
5) modo OFFLINE (clave con internet RD) 6) login por cajero con PIN + reloj entrada/salida (= Tanda C)
7) escáner cámara + impresión de etiquetas 8) portal público del cliente (ver estado de reparación +
cita online — patrón boleto.html serviría) 9) cobro con tarjeta integrado/link de pago (Azul/CardNet)
10) compatibles + precios por volumen. **Precios mercado:** CellStore US$39 flat ilimitado ·
RepairDesk 49/149/199 en 3 niveles · Alegra US$25 + módulos (contab 29, e-CF 19) · Loyverse gratis+29.
**Sugerencia de venta NEXUS:** RD$2,000-2,500/mes flat o 3 niveles (Básico/Pro con reparaciones-cuotas-
apartados/Premium con contab-nómina-multialmacén) + prueba 14 días.

### Análisis POS vs Infoplus (jul-2026, DGII OMITIDA por decisión del dueño)
Brechas de MODELO detectadas contra el esquema real (34 tablas pos_/rrhh_): sin unidades de
medida/presentaciones (stock plano), sin lotes/vencimiento, sin variantes, sin multi-moneda,
impuestos solo bool `itbis` 18% (falta propina 10%/exento), listas de precios limitadas (3 niveles),
sin descuento fijo/condiciones de pago/vendedor por cliente, `orden_no` sin flujo real de OC, sin
devoluciones a proveedor, sin apartados/layaway, `pos_config` mínimo, sin reportes ABC/rotación.
**Pendiente que el dueño priorice** (respondió "No" a elegir por ahora).

## Módulos / funcionalidades ya construidas

- **Clientes**: ficha, cédula, teléfono, dirección; clientes en proceso.
- **Facturación / Cobros / Historial**: facturas, cobros (Cobros e Historial son
  pestañas dentro de Facturas), abonos, meses pendientes.
- **Recibos de pago** (muy trabajado):
  - Numeración **consecutiva y segura** en BD, con **prefijo de año**
    (`2026-0001`), contador por año que reinicia cada año.
  - Recibos desde el historial (general y por cliente), por meses adelantados.
  - Guarda en BD los meses que cubre cada pago (auditoría).
  - Marcado de meses automático (mes actual / pendientes) o manual; concepto
    editable; PDF, WhatsApp y botón **Compartir** nativo.
- **Comisiones / Agentes**: colores por agente, roles (admin vs agente).
- **Transferencias entre agentes**: con estado (pendiente/aceptada/rechazada);
  el dinero solo se mueve si fue **aceptada**.
- **Ciclos 20-20**: períodos del 20 al 20; ciclo en curso + cerrados anteriores.
- **Navegación móvil**: barra/FAB flotante arrastrable, menú "Más" personalizable.
- **Multiempresa → Punto de Venta (POS)** (estilo Infoplus, solo admin / RLS):
  - **Vender**: catálogo por categoría, buscador, carrito, ITBIS 18%, cobro en
    efectivo/tarjeta/transferencia/cheque/nota de crédito, **pago mixto**,
    **descuento %**, devuelta, "efectivo exacto", ticket imprimible.
  - **Productos**: inventario con precio contado/crédito, costo, stock, código de
    barra, categoría, ITBIS, tipo (producto/servicio), stock mínimo + alerta,
    garantía, serial/IMEI, si permite descuento, referencia/marca/imagen.
  - **Ventas**: historial con total del día y ticket por venta (descuenta stock).
  - **Clientes + Fiado** (cuentas por cobrar): límite de crédito, ventas fiadas,
    abonos, recordatorio por WhatsApp.
  - **Entidades** (pestaña "Entidades", v25.8) — maestro de terceros estilo
    Infoplus: extiende `pos_clientes` con `codigo`, `tipo_persona`
    (fisica|juridica), `contacto`, `representante`, `email`, banderas de rol
    `es_cliente/es_proveedor/es_empleado/es_banco` y `nivel_precio` (final|mayor).
    El alta empieza eligiendo los **afines** (roles, multi) y luego los datos.
    `abrirEntidad`/`nxEntGuardar`; código automático `CL/PR/EM/BC-0001`
    (`entCodigoAuto`). El form de "Nuevo cliente" (pestaña Clientes) ahora abre
    este mismo modal con `es_cliente` precargado (se eliminó `abrirCli` viejo).
    **CONEXIÓN (v26.4):** `mergeProvEntidades()` une las entidades `es_proveedor`
    a la lista `_proveedores` de Compras (additivo, dedup por id, flag `_entidad`);
    "Nuevo proveedor" del manager abre la ficha de Entidad; editar/eliminar un
    proveedor-entidad redirige a Entidades. Pendiente conexión: empleado-entidad ↔
    RRHH (RRHH tiene campos de nómina propios, queda especializado por ahora).
    Los selectores de cliente (Factura/Cobro) filtran `es_cliente` y muestran el
    código. **Precio por mayor:** `pos_productos.precio_mayor` (Precio 2); la
    Factura usa `precioCli()` → precio 2 si el cliente es `nivel_precio='mayor'`
    (re-precia el carrito al cambiar de cliente). Botón "+cliente" QUITADO de la
    Factura; `#` quitado de códigos/números mostrados. Pendiente: enlazar
    entidades con rol proveedor/empleado a Compras/RRHH (hoy solo se clasifican).
  - **Compras / Proveedores** (cuentas por pagar): compras suben stock y
    actualizan costo; crédito = CxP; ficha de proveedor con saldo y pagos.
  - **Caja**: apertura/cierre y **arqueo** con conteo de billetes (denominaciones
    RD), efectivo esperado, descuadre y reporte de cierre imprimible.
  - **Historial de facturas** (pestaña "Historial"): buscar venta por No. o
    cliente, filtros por rango de fechas, KPIs (cantidad/total), ticket por venta
    y **anular** (restaura stock desde `pos_venta_items`).
  - **Cotizaciones / Presupuestos** (pestaña "Cotizaciones", v25.3): crear/editar
    presupuestos (cliente, productos vía datalist, validez en días), número
    `COT-0001`, imprimir documento formal (`nxCotImprimir`), **convertir en venta**
    (`nxCotConvertir` carga `_cart`+`_factCli` y abre Factura), estado
    vigente/vencida/convertida/anulada. Tablas `pos_cotizaciones`,
    `pos_cotizacion_items` (org+trigger+RLS patrón POS).
  - **Estado de cuenta de cliente (fiado)** (v25.3): botón en la ficha del cliente
    (`nxPosEstadoCuenta`) que imprime ventas a crédito + abonos + saldo corriente.
    No crea tablas (usa `pos_ventas`/`pos_abonos`).
  - **Devoluciones / Notas de crédito** (v25.6): botón en cada fila del Historial
    (`nxDevNueva`). Devolución total o parcial por artículo; regresa stock; emite
    `pos_devoluciones`+`pos_devolucion_items` (org+trigger+RLS) con número
    `NC-00001`; asigna NCF **B04** si hay secuencia (`asignarNCF('B04')`); asiento
    inverso (`postAsientoDevolucion`: Debe Ventas+ITBIS / Haber Caja o CxC); nota
    de crédito imprimible. Convive con "Anular" (que cancela la venta completa).
  - **Vendedores y comisiones** (v25.5): gestión en Ajustes (`pos_vendedores`:
    nombre, teléfono, comision_pct, activo; org+trigger+RLS). Selector de vendedor
    en el modal de cobro; se guarda `pos_ventas.vendedor_id`/`vendedor_nombre`
    (columnas nuevas nullable). Reporte de comisiones imprimible en Reportes
    (`nxRepComisiones`: ventas/monto/comisión por vendedor en el período).
  - **NCF / Comprobantes Fiscales** (v25.4): en Ajustes se gestionan secuencias
    (`pos_ncf_secuencias`: tipo B01/B02/B14/B15…, prefijo, desde/hasta/actual,
    vencimiento, activo; org+trigger+RLS). `asignarNCF()` consume la secuencia en
    `nxPosConfirmar` (mapea el valor del selector de la Factura
    consumo→B02/credito_fiscal→B01/… vía `NCF_MAP`), guarda `pos_ventas.ncf`
    (columna nueva nullable), lo muestra en el ticket y avisa cuando restan ≤10.
    Botón **Reporte 607** en Reportes (`nxRep607`, imprimible). NOTA: el selector
    de comprobante de la Factura usa valores `consumo/credito_fiscal/...` (NO los
    códigos B0x) — por eso existe `NCF_MAP`. Hay además un `NCF_DESC` (códigos→
    nombre) separado del `NCF_TIPOS` (array) que ya usaba la Factura.
  - **Reportes** (pestaña "Reportes", v25.1): analítica sobre `pos_ventas` +
    `pos_venta_items` (NO crea tablas). KPIs (total vendido, ganancia estimada
    precio−costo, costo de lo vendido, ITBIS, No. ventas, ticket promedio),
    gráfica de ventas por día (14), desglose por método de pago y TOP 10
    productos; filtro Desde/Hasta. Carga robusta: une items en JS (no depende del
    embed de PostgREST).
  - **Contabilidad** (pestaña "Contabilidad", v24.9→v25.2 COMPLETA): Plan de
    cuentas (botón "Crear plan de cuentas base" siembra catálogo DR estándar),
    Libro Diario, Libro Mayor por cuenta, Balance de Comprobación, Estado de
    Resultados y Balance General; filtro Desde/Hasta; **IMPRIMIR/PDF** de los 4
    reportes (`nxCtaImprimir`); asientos manuales (valida Debe=Haber); botón
    **"Registrar gasto"** rápido (`nxCtaGasto`). **Asientos automáticos**:
    cada VENTA (`postAsientoVenta` en `nxPosConfirmar`: Caja/CxC vs Ventas+ITBIS),
    cada COMPRA (`postAsientoCompra`: Inventario+ITBIS adelantado vs Caja/CxP),
    cada ABONO de cliente (`postAsientoAbono`: Caja/Banco vs CxC) y cada NÓMINA
    (`postAsientoNomina`). Tablas: `pos_cuentas`, `pos_asientos`,
    `pos_asiento_lineas` — las 3 con `organizacion_id` + trigger
    `set_organizacion_id()` + RLS `mi_rol()='admin' AND organizacion_id =
    mi_organizacion()` (patrón POS). Carga une líneas en JS (no usa embed).
  - **Recursos Humanos / Nómina** (POS, v25.0) — HECHO: pestaña "Recursos
    Humanos" con sub-pestañas Empleados y Nóminas. Ficha de empleado (nombre,
    cédula, puesto, salario, tipo de pago, banco, NSS). **Generar nómina** del
    período: deducciones de ley RD automáticas — SFS 3.04%, AFP 2.87% (helpers
    `calcDeducciones`/`isrAnual`) e ISR por escala DGII anual; campos editables de
    bonos y otras deducciones; totales bruto/deducciones/neto en vivo. **Recibo de
    pago imprimible** por empleado (`nxRhRecibo`, con firma "recibí conforme").
    Cada nómina se contabiliza sola (`postAsientoNomina`: 6101 Sueldos contra 2104
    Retenciones y 2103 Sueldos por pagar). Tablas `rrhh_empleados`,
    `rrhh_nominas`, `rrhh_nomina_lineas` — las 3 con `organizacion_id` + trigger +
    RLS `mi_rol()='admin' AND organizacion_id = mi_organizacion()` (patrón POS).
  - **Inicio (lanzador de apps estilo Odoo)** (v25.9): `_posTab='inicio'` por
    defecto; `renderInicio()` muestra un mosaico de apps (tiles `.nxApp`) agrupadas
    por área que llaman `nxPosTab(...)`. El tab bar sigue para cambio rápido.
  - **Inventario** (pestaña "Inventario", v26.0) estilo Odoo: valoración (a costo /
    a precio), conteo de productos, bajo stock / sin stock, **kardex** por producto
    y **ajuste de inventario**. Tabla `pos_inv_movimientos` (org+trigger+RLS);
    helper `logMov()` enganchado (best-effort) en venta (`nxPosConfirmar`), compra
    (`nxPosGuardarCompra`), devolución (`nxDevGuardar`) y anulación
    (`nxPosAnularVenta`). El kardex arranca desde ahora (no retroactivo).
  - **CRM / embudo** (pestaña "CRM", v26.1): tabla `pos_crm` (org+trigger+RLS).
    Oportunidades con etapa nuevo→contactado→cotizado→ganado/perdido (cambio en 1
    toque, `nxCrmEtapa`), monto estimado, próxima acción, enlace opcional a
    entidad-cliente, WhatsApp al contacto. KPIs pipeline/ganadas. No toca ventas.
  - **Rumbo Odoo (acordado):** el dueño quiere el POS como un ERP Odoo. Hecho:
    Inicio (apps) + Inventario (kardex/valoración/ajuste) + CRM/embudo. Pendiente
    elegido por el dueño: **look Odoo** (índigo/morado — re-pintado global, mostrar
    muestra antes de aplicar) · **Multi-almacén** (invasivo, supervisado).
  - **Multi-almacén** (v26.3, PASO 1 de 2): tablas `pos_almacenes` +
    `pos_stock_almacen` (unique producto+almacén; org+trigger+RLS). En Inventario:
    activar (`nxAlmInit` siembra principal con `_prods.stock`), crear almacenes,
    **transferencias** (`nxAlmGuardarTransfer` mueve stock entre almacenes y loga
    `tipo='transferencia'`), stock por almacén en KPIs y en el kardex. Helpers
    `stockEnAlm`/`upsertStockAlm`/`_stockAlmRows` (mapa `pid|aid`→{id,stock}).
    `pos_productos.stock` sigue siendo el TOTAL autoritativo (las ventas/compras
    aún descuentan del total, NO del almacén). El ajuste sí actualiza el principal.
    **PASO 2 HECHO (v26.6):** `_almacenSel` (almacén activo, default principal) +
    `almSelectorHTML()` en vender/factura (si ≥2 almacenes). `pos_ventas.almacen_id`
    y `pos_compras.almacen_id` (columnas nuevas). Venta descuenta `pos_stock_almacen`
    del almacén activo; compra suma al `compAlm` elegido; devolución/anulación
    regresan al `venta.almacen_id` (o principal). TODO best-effort: `product.stock`
    sigue siendo el total autoritativo (invariante total = suma de almacenes). Si no
    hay almacenes (`_almacenes` vacío) el comportamiento es idéntico al anterior.
    `_stockAlmRows` se carga en `cargarPOS` solo si hay almacenes.
    **Transferencia multi-artículo + conduce (v26.7):** tablas `pos_transferencias`
    + `pos_transferencia_items` (org+trigger+RLS); modal multi-línea (`_transEdit`,
    datalist add, número `TR-00001`), mueve stock por línea, loga movimientos e
    imprime **conduce de despacho** (`transDespachoImprimir`). **Kardex imprimible**
    por producto (`nxInvKardexImprimir`). Opcional menor: **Conduce** (nota de entrega). Todo lo
    demás del POS (ventas, factura, cotizaciones, compras, clientes/fiado, caja,
    historial, contabilidad, reportes, RRHH, NCF, vendedores, devoluciones) está
    HECHO y EN VIVO (v25.6). El tab bar del POS tiene ~14 pestañas (se podría
    agrupar en un menú "Más" si el dueño lo pide; en móvil hace wrap).

> **Build autónomo (sesión nocturna, chat `RvxXb`):** v25.0→v25.6 se construyeron
> de corrido con autorización explícita del dueño ("tienes todos los permisos…
> concluye el sistema completo"). Cada migración de esquema sí pasó el gate porque
> el dueño dio OK explícito y repetido. Todas las tablas nuevas verificadas con
> RLS+trigger+policy. Si retomas: revisa que nada en el flujo de cobro
> (`nxPosConfirmar`) se haya roto y prueba en móvil angosto.

### Sistema de RIFAS (EN CONSTRUCCIÓN, chat `RvxXb`, desde v30.7)
Módulo nuevo dentro de NEXUS PRO (multiempresa) para rifas de boletos de 4 dígitos,
ganador por **Lotería Nacional**, números **únicos 0000–9999**, con comprador
(nombre+WhatsApp), voucher de pago, estadísticas y sorteo. **Diagrama completo y
muestras visuales** (en `main`, descartables): `plan-rifas.html` (plano completo:
arquitectura, tablas, flujos, marca blanca + alquiler por rifa, mejoras, roles),
`muestra-rifas.html` (panel admin), `muestra-rifas-vendedor.html` (vista vendedor).
Referencia que usó el dueño antes: **Rifarito** (`rifarito.com`) — landing pública
por cliente con su dominio/logo, venta online (cliente elige número + sube voucher)
+ offline (panel), estados por_confirmar/confirmado, cuentas de cobro por banco.
- **Modelo de negocio (acordado):** marca blanca multi-empresa (cada cliente su
  dominio/subdominio, la app detecta el hostname) + **alquiler por rifa**
  (`organizaciones.activo` + `activo_hasta` → enciendes/apagas el sistema por
  período; datos quedan guardados) + panel **superadmin** del dueño (Fase 4).
- **Base de datos HECHA y verificada (migración `create_rifa_tables`, v30.7):** 6
  tablas con `organizacion_id` + trigger `set_organizacion_id()` + RLS
  `mi_rol()='admin' AND organizacion_id = mi_organizacion()` (patrón POS idéntico) +
  índices: `rifas`, `rifa_boletos` (unique rifa_id+numero; estados
  apartado/por_confirmar/confirmado/anulado), `rifa_cuentas` (cuentas de cobro
  banco/tarjeta/movil), `rifa_premios` (exacto/terminal/anterior/posterior),
  `rifa_vendedores` (comisión), `rifa_paquetes` (combos). + `organizaciones.activo_hasta`.
- **Módulo `parches.js` (IIFE nuevo al final) — TANDA 1 (v30.7) + TANDA 2 (v31.0) HECHAS:**
  se registra en el hub Multiempresa (`nxMERegistrar` orden 4, "Rifas").
  `window.nxAbrirRifas` (vista `#v-rifas`), `cargarRifas`/`renderRifas` (lista con
  KPIs), crear/editar/eliminar rifa (`nxRifaNueva/Editar/Guardar/Eliminar`, modal
  con todos los campos + **subir banner**: `nxRifaImgFile` comprime con canvas a
  dataURL en `rifas.imagen`; `mostrar_progreso` oculta la barra de vendidos).
  **TANDA 2:** `_rifaSel` abre el **panel de la rifa** (`renderRifaPanel`): KPIs +
  **tablero de números** paginado (`boardHTML`, 120/pág, `padStart` por dígitos,
  buscador `nxRifaBuscar` que solo repinta `#rfBoardWrap` sin perder foco, colores
  por estado disp/pend/conf/apar) + **vender boleto** (`nxRifaVender`/`VenderGuardar`:
  comprador, WhatsApp, precio, método, vendedor, checkbox "pago confirmado" →
  estado confirmado/por_confirmar; unique rifa_id+numero atrapa doble venta) +
  **a la suerte** (`nxRifaSuerte`) + tocar boleto vendido (`gestBoleto`: ver datos,
  WhatsApp, **confirmar pago** `nxRifaConfirmar`, **liberar** `nxRifaLiberar` borra
  la fila). CSS `.nxRf*`/`.rfN*`/`.rfKpi`. Helpers locales en el IIFE; sesión vía
  `curSes()` (NO `window.sesion`, que es undefined por el `let sesion`).
- **TANDA 3 (v31.1) HECHA — boleto-tarjeta:** `nxRifaBoleto(id)` abre la tarjeta
  azul (`bolCardHTML`/`BOL_CSS`: header negocio + banner + premio + estado Pago
  Verificado/Por confirmar + comprador + WhatsApp + fecha compra + fecha sorteo
  opcional + número grande). Exporta a **imagen PNG** dibujada en canvas
  (`bolCanvas`/`bolRR`/`bolWrap`/`bolFit`/`bolCover`, carga el banner async) con
  `nxRifaBoletoImg(share)` → `navigator.share` (WhatsApp) o descarga; **imprimir/PDF**
  con `nxRifaBoletoImprimir` (ventana). Botón "Ver boleto" en `gestBoleto` y se abre
  solo al vender. NOTA: el banner es dataURL (mismo origen) → canvas no se mancha.
- **TANDA 4 (v31.7→31.8) HECHA — enlace público del boleto (estilo competencia):**
  función **Edge `boleto`** (Supabase, `verify_jwt:false`, pública, **v2**) en
  `.../functions/v1/boleto?id=<id>`: lee con service role (rifa_boletos + embed rifas
  + org) y devuelve **JSON** (con CORS) de los campos públicos; `?id=X&img=1` decodifica
  el banner dataURL y sirve los bytes. **OJO:** servir HTML directo desde el dominio
  `supabase.co` sale como **texto plano** (anti-phishing) — por eso la página se sirve
  desde el dominio propio. Página **`boleto.html`** (estática en `nexusprord.com`, cero
  riesgo) lee el JSON de la función y **renderiza la tarjeta** + tiene OG **genérico**
  (preview por-premio real necesitaría SSR en dominio propio = Worker, riesgoso, NO
  hecho). En `parches.js`: `BOL_PAGE='nexusprord.com/boleto.html'`; el botón **"Enviar
  por WhatsApp"** de `gestBoleto` abre `wa.me/<numero>?text=<texto + enlace boleto.html>`
  → directo al número del cliente. "Ver / imagen" sigue con la imagen PNG por share.
- **TANDA 5 (v31.9) HECHA — sorteo/ganador:** botón **"Sorteo"** en el panel de la
  rifa (`nxRifaSorteo`): se registra el número que salió en la lotería; `padGan`
  rellena con ceros a `cantidad_digitos`; `nxRifaBuscarGanador` busca en `_bolMap` →
  muestra tarjeta **GANADOR** (verde: número, comprador, WhatsApp, estado) con botones
  "Avisar al ganador" (wa.me con felicitación) y "Ver boleto", o "no vendido (casa)".
  `nxRifaGuardarSorteo` patch `rifas.numero_ganador` + `estado='sorteada'`; banner del
  ganador (`rsBanner`) arriba del panel cuando ya hay `numero_ganador`. CSS `.rsWin/.rsNone/.rsBanner`.
- **TANDA 6 (v32.0) HECHA — cuentas de cobro:** `_cuentas` (rifa_cuentas) cargado en
  `cargarRifas`. Botón **"Cuentas"** en la lista (`nxRifaCuentas` manager: CRUD
  `nxCuentaForm/Guardar/Eliminar`, tipo banco/tarjeta/movil). Selector **"Cuenta donde
  pagó"** en el modal de vender (si hay cuentas) → guarda `rifa_boletos.cuenta_id`.
  Botón **🏦 en el panel** (`nxRifaPorCuenta`) → modal **recaudado por cuenta** (suma
  precio de boletos confirmados agrupado por cuenta_id + "sin cuenta" + total). CSS `.ctaRow`.
- **TANDA 7 (v32.1) HECHA — vendedores + liquidación:** `_vendedores` (rifa_vendedores)
  en `cargarRifas`. Botón **"Vendedores"** en la lista (`nxRifaVendedores` manager: CRUD
  `nxVendForm/Guardar/Eliminar`; nombre, teléfono, comision_pct). Selector de vendedor
  en el modal de vender (si hay vendedores) → guarda `vendedor_id`+`vendedor_nombre`.
  Botón **👥 en el panel** (`nxRifaLiquidacion`) → agrupa boletos confirmados por
  vendedor, calcula comisión (monto×pct/100) y **"a entregar"** (monto−comisión). CSS `.liqRow`.
  **EMPLEADOS POR RIFA (v34.3):** `rifa_vendedores.rifa_id` (migración `rifa_vendedores_por_rifa`,
  nullable; backfill = rifa de la primera venta de cada vendedor). El botón **Vendedores** se movió
  de la lista al **panel de la rifa** (ícono 👥 junto a Reportes); `nxRifaVendedores` filtra por
  `vendsRifa()` (= `_vendedores` con `rifa_id===_rifaSel`), titula con el nombre de la rifa, y al
  CREAR guarda `rifa_id=_rifaSel` (editar NO lo cambia). Selectores de vendedor en vender/editar boleto
  usan `vendsRifa()`. Función Edge **`vendedor` v2**: `getVendedor` trae `rifa_id`; en `login` si tiene
  `rifa_id` devuelve SOLO esa rifa (si null = legado, todas las de la org); en `vender` exige
  `rid===rifa_id`. `ventas` sin cambio (scope por vendedor_id).
- **TANDA 8 (v32.2) HECHA — mejoras venta:** botón **👑 Mayor comprador** en el panel
  (`nxRifaMayorComprador`: agrupa por teléfono/nombre, ranking con medallas 🥇🥈🥉, n
  boletos + monto). En el **sorteo**, `nxRifaBuscarGanador` ahora muestra los números
  **Anterior/Posterior** (consolación, con wrap-around `%max`) y quién los tiene. CSS `.rsCon`.
- **TANDA 9 (v32.4) HECHA — lista de tickets + estadísticas + menú Reportes:** los íconos
  de reportes del panel se juntaron en un botón **"Reportes"** (`nxRifaReportes` menú con
  5 opciones). **Lista de tickets** (`nxRifaTickets`/`tkRowsHTML`/`nxTkBuscar`/`nxTkOpen`):
  todas las ventas con buscador (número/comprador/teléfono), estado y monto; tocar abre
  `gestBoleto`. **Estadísticas** (`nxRifaStats`): KPIs (compradores únicos, tickets,
  recaudado) + gráfica de barras **ventas por día** (últimos 14, CSS `.stChart`) + barras
  de **estado de tickets** (confirmado/por confirmar/apartado). CSS `.repItem/.tkRow/.st*`.
- **TANDA 10 (v32.7) HECHA — v2 PÚBLICA (cliente compra solo):** función Edge **`rifa`**
  (`.../functions/v1/rifa`, pública): GET `?id=<rifa>` → JSON (rifa+org+cuentas+vendidos);
  `&img=1` banner; **POST** {rifa_id,numero,nombre,telefono,cuenta_id,voucher} → inserta
  boleto (org explícita por el trigger `if null`, estado por_confirmar, origen online; 409 si
  número tomado). Página **`rifa.html`** (estática en nexusprord.com): banner+premio+precio+
  progreso + **tablero de números** (disponibles/ocupados, buscador, "a la suerte") → modal
  comprar (nombre, WhatsApp, ve las cuentas, **sube voucher** comprimido a dataURL) → POST →
  éxito + link a boleto.html. En `parches.js`: botón **🔗 Link** en el panel (`nxRifaLink`:
  copiar/abrir/compartir `nexusprord.com/rifa.html?id=`), y **"Voucher"** en gestBoleto
  (`nxVerVoucher`) muestra el comprobante. OJO: `cargarBoletos` usa select=* (incluye voucher
  base64) — optimizar a futuro si pesa.
- **TANDA 11 (v32.8) HECHA — página pública RENOVADA igual a la competencia (Rifarito):**
  réplica al 100% del flujo de las plataformas (4 pantallas que mandó el dueño). Migración
  `rifa_boleto_comprador_extra` añadió `comprador_cedula/email/direccion` a `rifa_boletos`.
  Función Edge **`rifa` v3** ampliada: GET ahora devuelve `vendedores[]` y `logo`; **POST acepta
  `numeros[]` (CARRITO multi-número, bulk insert, 409 si alguno tomado)** + email/cedula/direccion/
  vendedor_id; y nuevo **GET `?id=<rifa>&buscar=<tel|numero>`** (VERIFICADOR) → `{tickets[]}` del
  comprador (filtra por teléfono normalizado o número). `rifa.html` reescrito (estático,
  nexusprord.com): hero + **2 pestañas** (Comprar / Verificar). Comprar = PASO 0 tablero
  multi-select (toca varios, chips con ×, "Elegir a la suerte" +1/+5/+10/+25) + barra de carrito
  fija con total → PASO 1 **Datos personales** (nombre, cédula, celular con código de país,
  email, dirección, vendedor) → PASO 2 **Método de pago** (tiles de banco/cuenta seleccionables
  con botón **Copiar** el número, subir voucher comprimido, checkbox **"Enviaré el voucher
  después"**) → confirma todos los números de una. Verificar = busca por WhatsApp/número y lista
  los tickets con su estado + enlace a boleto.html. NOTA: el trigger `set_organizacion_id()` solo
  setea si null → la función pasa `organizacion_id` explícito sin problema.
- **TANDA 11b (v32.9) HECHA — UNA sola pantalla + OCULTAR NÚMEROS:** a pedido del dueño,
  `rifa.html` se reescribió a **una sola pantalla con scroll** (no pasos): tarjeta 1 *Tus datos*
  (nombre*, WhatsApp* con código país, + "Más datos" colapsable: cédula/email/dirección/vendedor),
  tarjeta 2 *números*, tarjeta 3 *método de pago*, y **barra fija abajo** con total + Confirmar.
  El estado del comprador vive en `F={}` (se guarda con `snap()`/`__sv` para sobrevivir el
  re-render del tablero). **Opción "Ocultar los números en la página pública"** (`rifas.ocultar_numeros`
  bool, migración `rifa_ocultar_numeros`; checkbox `rfOcultarNums` en el form admin de rifa,
  guardado en `nxRifaGuardar`): si está ON, la página pública NO muestra el tablero — el cliente
  solo elige **cuántos** tickets (stepper `__qty` + atajos +5/+10/+25) y al confirmar manda
  `{cantidad}` en vez de `{numeros}`. La **función `rifa` v4** en modo oculto **asigna N números
  al azar entre los disponibles server-side** (lee tomados, calcula libres, random, tope 200) y
  los devuelve; la página los muestra ya comprados en la pantalla de éxito. GET devuelve
  `ocultar_numeros`.
- **TANDA 12 (v33.0→33.5) HECHA — afinado público + VISTA DEL VENDEDOR:** la página pública
  `rifa.html` se simplificó (solo nombre+WhatsApp, sin selector de país; voucher obligatorio que
  habilita Confirmar — opcional si la rifa no tiene cuentas; inputs a 16px anti-zoom iOS; poda los
  números tomados del carrito tras 409; aviso de apartado X horas; respeta límite por persona;
  **checklist animado** Número/Nombre/WhatsApp/Comprobante que se marca en verde con `pop` al ir
  completando; botón verde "Enviar mi boleto por WhatsApp" al terminar). Pestaña 'Verificar' renombrada
  a **'Consultar ticket'** (botones pill visibles). Función `rifa` **v5**: devuelve apartado_horas,
  limite_por_persona; **enforce límite por teléfono**; privacidad (no devuelve teléfono al buscar por
  número). **VENDEDOR (login por código, decisión del dueño: "solo vender, queda por confirmar"):**
  migración `rifa_vendedor_codigo` (col `codigo` única + default `upper(substr(md5(gen_random_uuid()),1,6))`
  → cada vendedor nuevo recibe código). Función Edge **`vendedor`** (verify_jwt false): acciones
  `login` {codigo}→vendedor+org+rifas activas; `vender` {codigo,rifa_id,numeros/cantidad,nombre,telefono,
  cuenta_id,voucher}→inserta boletos estado 'por_confirmar' origen 'vendedor', scoped a su org (valida
  rifa.org==vendedor.org), aplica límite; `ventas` {codigo}→sus boletos + recaudado/comisión/a_entregar
  (solo confirmados). Página estática **`vendedor.html`** (nexusprord.com): login por código (o `?c=CODE`,
  guarda en sessionStorage) → dashboard 2 pestañas **Vender** (elige rifa, reusa tablero/cantidad vía la
  función `rifa` GET, datos comprador, registra venta 'por confirmar', comparte boleto al comprador) y
  **Mis ventas** (KPIs tickets/recaudado/comisión/a entregar + lista). En `parches.js` el gestor
  **Vendedores** (`nxRifaVendedores`) muestra el Código y botón **Compartir acceso** (`nxVendLink`:
  navigator.share/clipboard del enlace `vendedor.html?c=CODE`). NO toca la app de seguros ni el login/RLS
  existente (página aparte, patrón público).
- **TANDA 13 (v33.6) HECHA — REDISEÑO página pública (look plataforma de rifas):** `rifa.html`
  se repintó al estilo de las plataformas (referencia que mandó el dueño): **cabecera blanca** con
  logo + nombre + **botón menú** (`__menu`/`menuHTML`: Inicio→comprar, Consultar ticket→verificar,
  Contacto→WhatsApp, botón grande "Lista de boletos"→verificar); barra de **acento** arriba
  (`.topaccent`); **botón flotante verde de WhatsApp** (`.wafab`, `wafabAdd`, se posiciona sobre la
  barra de pago); el bloque de premio pasó a `.prem-blk` (gradiente, esquinas redondeadas). Se
  quitaron las pestañas (ahora la navegación es por el menú). Controles **glossy/neumórficos**:
  **stepper redondo grande** (`.stp` − gris / número / + de color, label BOLETOS) en modo
  `ocultar_numeros`, **Total grande** (`.bigtot`, id `stTot`, lo refresca `refreshCart`/`__qty`),
  **'Elegir a la suerte'** y buscador tipo **píldora** con sombra. WhatsApp: nuevo campo
  `rifas.whatsapp_contacto` (migración `rifa_whatsapp_contacto`) + input **'WhatsApp de contacto'**
  en el form admin (`rfWa` en `nxRifaGuardar`); la función **`rifa` v7** lo devuelve como `whatsapp`
  (OJO: `organizaciones` NO tiene columna `telefono` — no la metas en el select o rompe la carga).
- **TANDA 13b (afinado visual, sin cambio de versión — `rifa.html` se despliega solo en Cloudflare al
  pushear a `main`):** checklist Cantidad/Nombre/WhatsApp/Comprobante más compacto. **Botones
  APLANADOS** (se quitó el 3D/sombras elevadas de stepper, píldoras, buscador, pago, menú) PERO
  **conservando animaciones** (rebote `:active`, transiciones; el FAB de WhatsApp mantiene sombra
  suave para "flotar"). **ANIMACIONES "DE MAGIA"** (reutilizables, CSS puro): `.mg-shine` (destello que
  cruza), estrellas titilantes en "Elegir a la suerte" (`.luck i` con `mgTwinkle`), `.mg-glow` (halo que
  late en el buscador), `.mg-digits` (dígitos del nº/Total con gradiente animado `mgGrad`
  índigo→violeta→celeste). **Pantalla de entrega de boletos** (`viewListo`): el ✓ entra con rebote
  (`okPop`) + aura verde (`okGlow`) + 5 estrellitas (`spark`), números con `mg-digits`, botón WhatsApp
  con `mg-shine`. **Cuadro ② (elegir números/cantidad) = `.mg-card`** (clase + `MGSTARS` inyectado al
  inicio del card en sus 2 modos): borde-halo que respira en colores (`mgCardGlow`) + **estrellas que
  SUBEN** (`.mgRise`, 16 partículas `<i>` que ascienden de abajo a arriba con `rise`/`riseS`, tamaños/
  colores/delays variados). Iteración pedida por el dueño: titilar→fugaces→subiendo (quedó en
  "subiendo", aprobado). Todo en el `<style>`/IIFE de `rifa.html`; el cuadro sigue blanco y legible.
- **TANDA 14 (v33.7) HECHA — COMBOS / PAQUETES:** tabla `rifa_paquetes` (ya existía: `cantidad`,
  `precio`, `etiqueta`, `rifa_id` + org/trigger/RLS) ahora SE USA. En `parches.js`: `_paquetes` cargado
  en `cargarRifas`; botón **📦** en `renderRifaPanel`; manager `nxRifaPaquetes` (filtra por
  `currentRifa().id`) + `nxPaqForm/nxPaqGuardar/nxPaqEliminar` + `recargarPaq` (patrón Cuentas;
  muestra el ahorro vs `precio_boleto*cantidad`). Función Edge **`rifa` v8**: GET devuelve `paquetes[]`;
  POST acepta **`paquete_id`** → valida que sea de la rifa, fija `cantidad`+asigna números al azar y
  pone `precio` por boleto = `paquete.precio/cantidad` (cobro exacto). En `rifa.html`: `pkgSel` (paquete
  elegido), `pkg()/count()/total()` respetan el combo, `paqsHTML()` pinta los combos en el cuadro ②
  (ambos modos), `__pkg` selecciona (fija qty), y `__qty/__toggle/__luck` limpian `pkgSel` si el cliente
  cambia a mano. En modo números visibles, el combo asigna al azar (aviso `.paqNote`). CSS `.paq/.paqs`.
- **TANDA 15 (v33.8) HECHA — gráfica MEDIOS DE PAGO (pie):** en `nxRifaStats` se agregó una gráfica
  de pastel (`conic-gradient`, CSS `.pie/.pieLeg/.pieRow`) que agrupa lo **confirmado** por medio de pago:
  `metodo_pago` (ventas manuales/vendedor) o, si es null, el nombre del banco de `cuenta_id` (`ctaName`)
  o 'Sin especificar'. Muestra monto + % por medio. Solo aparece si `recaudado>0`.
- **TANDA 16 (v33.9) HECHA — APARTADOS CON EXPIRACIÓN (cron):** compras públicas (`rifa.html`) **sin
  voucher** ahora se crean `estado='apartado'` + `apartado_hasta = now()+apartado_horas` (función `rifa`
  v9; **con voucher** siguen `por_confirmar`; las ventas de VENDEDOR siguen `por_confirmar`, NO expiran).
  `pg_cron` (ya activo) job **`rifa_expirar_apartados`** cada 15 min → función SQL `rifa_expirar_apartados()`
  (security definer) borra `rifa_boletos` con `estado='apartado' AND apartado_hasta<now() AND voucher is
  null` (libera el número; NUNCA toca pagados/confirmados/con voucher). En `rifa.html`: `doneApartado`
  (de `res.j.apartado`) cambia el mensaje de éxito a "apartado por X horas, envía el comprobante o se
  liberará". El estado 'apartado' ya se ve en gestBoleto/tablero (gris) y en el verificador público.
### PANEL DEL DUEÑO (SUPERADMIN, Fase 4) — HECHO v33.9 (cross-org, seguro)
Acceso **solo lectura** del dueño que ve TODAS las organizaciones en una pantalla. Identidad por
**`usuarios_sistema.es_superadmin`** (bool; true solo para `sterlin08`, id `43b76117-1731-4299-97e2-d75f7ededf16`).
Helpers SQL **security definer**: `mi_es_superadmin()` (auth.uid()→profiles→usuarios_sistema) y
`superadmin_orgs()` (jsonb; si NO es superadmin devuelve `[]`; agrega por org: usuarios, rifas,
rifa_recaudado [confirmados], pos_ventas, pos_total). Grants a anon/authenticated. Frontend: IIFE al
final de `parches.js` → módulo "Panel del Dueño" (orden 9) en el hub Multiempresa, **registrado solo si
`esSuper()`** (RPC `rpc/mi_es_superadmin` con el token de la sesión via `API.token`; reintenta por si la
sesión tarda). `nxAbrirSuperadmin` (modal `#nxSuper`): KPIs totales + tarjeta por empresa (activa/vence/
usuarios/rifas/recaudado/ventas POS). NO toca RLS de las tablas; el cruce es solo vía la función definer.
**Para sumar otro superadmin:** `update usuarios_sistema set es_superadmin=true where id=...`.
- **PENDIENTE:** combos/paquetes (UI) HECHO · gráfica medios de pago (pie) HECHO · apartados con
  expiración (cron) HECHO · panel SUPERADMIN HECHO · **mover vouchers/banners a Storage** (hoy base64 en
  DB; refactor grande/riesgoso, tocar subida+visualización en parches/rifa.html/vendedor.html/boleto.html
  +funciones — hacer con cuidado y probado) · preview WhatsApp con foto del premio (Worker dominio propio, riesgoso).
  (combos, carrito, anterior/posterior, mayor comprador, WhatsApp auto) · **v2**:
  página pública online + Storage para vouchers/imágenes. La parte **legal**
  (licencia DCJA) se OMITIÓ del alcance por decisión del dueño.

### Conectar RIFAS a BayolCell (Opción 1 — base compartida) — EN PROGRESO (chat `RvxXb`, v38.1)
Decisión del dueño: las rifas de BayolCell viven en la base de NEXUS PRO (compartida, separadas por
`organizacion_id`+RLS), NO se replican en la base del taller. Experiencia: **un solo login** (el del
taller) + **llave-puente** automática (SSO estilo Deluxe) → el staff nunca escribe una segunda clave.
- **HECHO — Modo "solo Rifas" (v38.1):** espejo del modo tienda. `organizaciones.tipo='rifa'` → en
  `index.html`: clase `body.org-rifa` (CSS oculta sidebar/bottom-nav/FAB, igual que `org-tienda`),
  `aplicarOrgSidebar()` abre `window.nxAbrirRifas()` directo (retry hasta que cargue parches.js),
  `nav()` y el landing del login rebotan a Rifas, `_orgRifaAplicada`. En `parches.js`:
  `nxAbrirMultiempresa` rebota a Rifas si tipo rifa; CSS `body.org-rifa`; el botón "Volver" de
  `renderRifas` se vuelve **"Cerrar sesión"** (`window.logout()`) en modo solo-rifa. Gateado a
  `tipo='rifa'` → cero efecto para seguros/tienda.
- **HECHO — Organización "BayolCell Rifas":** fila en `organizaciones` slug `bayolcell-rifa`,
  tipo `rifa`, sin dominio (para que la llave-puente caiga directo en rifas y NO choque con el redirect
  del taller, que vive en la org `bayolcell` tipo externa). **id `6698a6b7-d469-471d-9714-6e4541fbb1c5`**.
  Logo/color PENDIENTES (los manda el dueño).
- **HECHO — Llave-puente (usuario `bayolcell`):** cuenta Auth creada y verificada (calcada de Francis):
  `auth.users` (email `bayolcell@nexus-pro.local`, crypt, token-cols en `''`) + `auth.identities` +
  `usuarios_sistema` (login `bayolcell`, rol admin, `organizacion_id` = org de arriba) + `profiles`
  (rol admin, must_change_password=false). Login real (clave en poder del dueño, NO va al repo). Probado:
  al entrar cae en modo solo-rifas y RLS lo limita a la org bayolcell-rifa. **Se puede probar YA en
  `nexusprord.com`** con ese usuario (sin esperar el taller).
- **HECHO — Pieza 1/3: NEXUS PRO recibe el "pase" (SSO entrante, v38.2):** `nxRecibirPaseSSO()` en
  `index.html` lee `#access_token=...&refresh_token=...&expires_in=...` de la URL al cargar (enganchado en
  `DOMContentLoaded` antes del login), guarda la sesión (`nxStoreAuth`), trae el perfil y llama
  `nxFinalizarLoginAuth` → `iniciarApp` → modo solo-rifas. Limpia el hash al instante (token no queda en
  la URL). Mismo formato de hash que el SSO saliente (Deluxe). Falla → cae al login normal.
- **HECHO — Pieza 2/3: función puente segura en la base del taller:** Edge Function **`puente-rifa`**
  desplegada en `vkhwdvjtowrhkhqavnvk` (`verify_jwt:true` → solo staff logueado del taller). Hace POST a
  la auth de NEXUS PRO con la cuenta-puente (email `bayolcell@nexus-pro.local` + clave **server-side, NO
  en el navegador ni en el repo**) y devuelve `access_token/refresh_token/expires_in`. CORS abierto.
- **PENDIENTE — Pieza 3/3: botón "Rifas" en el frontend del taller** (`bayolcell-taller`, sesión aparte —
  no estuvo en esta sesión): llama a `puente-rifa` con el JWT del usuario del taller, y redirige a
  `https://nexusprord.com/#access_token=...&refresh_token=...&expires_in=...&token_type=bearer&type=magiclink`.
  La app cae sola en Rifas (modo solo-rifa). + logo/color de la org (cosmético). (La config SSO de
  `organizaciones` es para bridge SALIENTE estilo Deluxe; aquí el bridge es ENTRANTE, vive en el taller.)

### Rifa PRESENCIAL de BayolCell (recepción genera boleto) — motor HECHO (chat `RvxXb`)
Modelo: la rifa es SOLO para clientes que compran/reparan en la tienda (presencial). **Sin link, sin
página pública, sin "por confirmar".** La RECEPCIÓN genera el boleto con nombre + teléfono → número al
azar → boleto **confirmado** (precio 0, es de regalo), origen `'taller'`. Una sola rifa activa.
- **HECHO — motor `recepcion-boleto`** (Edge Function en base taller `vkhwdvjtowrhkhqavnvk`, `verify_jwt:true`):
  recibe `{nombre, telefono}`, autentica como la cuenta-puente (`bayolcell@nexus-pro.local`, clave server-side),
  busca la rifa activa de BayolCell (RLS la limita a su org), asigna número libre al azar (reintenta si choca
  por unique rifa_id+numero), crea el boleto `estado='confirmado' origen='taller' precio:0`, devuelve `{numero}`.
  OJO: `rifa_boletos` NO tiene `confirmado_at` (solo `estado`). Requiere que el admin haya CREADO una rifa antes.
- **PENDIENTE — UI en el repo del taller** (`bayolcell-taller`, otra sesión): (1) link "Rifa (admin)" en la
  barra lateral → abre el panel (vía `puente-rifa` SSO, pestaña nueva); (2) en Recepción de equipo, form
  nombre+teléfono → llama `recepcion-boleto` → muestra el número. (Código exacto dado al dueño en el chat.)

### PIVOTE — Rifas MARCA BLANCA bajo el dominio del cliente (decisión dueño, v38.5)
El dueño decidió el modelo de venta: cada cliente de rifa corre el sistema **bajo SU propio dominio**
(no redirige a `nexusprord.com`), se ve como suyo, y se quita cuando termina la rifa (alquiler).
**Entrada elegida: LOGIN DIRECTO en su dominio** (no el botón SSO del taller; el SSO `puente-rifa` queda
opcional/sin usar para este modelo, pero desplegado por si acaso).
- **HECHO — Paso 1: enlaces públicos agnósticos de dominio (v38.5):** boleto, página de compra y acceso de
  vendedor ahora usan `location.origin` (el dominio donde está abierta la app) en vez de `nexusprord.com`
  fijo. Cambiados: `parches.js` (`BOL_PAGE`, `nxRifaLink`, `nxVendLink`) + `rifa.html`/`vendedor.html`
  (`BOLETO`). Así todo se queda en el dominio del cliente. En `nexusprord.com` no cambia nada. (Los OG
  `icon-512.png` quedan como fallback genérico.)
- **PENDIENTE — Paso 2 (lo hace el dueño en Cloudflare):** apuntar el dominio/subdominio del cliente al
  Worker `nexus-pro` (Worker → Settings → Domains & Routes → Add Custom Domain). Esperar el SSL. Listo: ese
  dominio sirve la MISMA app; el cliente entra con su login → modo solo-rifas → su rifa branded.
- **PENDIENTE — Paso 3 (pulido, código):** marca por hostname (login del dominio sale con logo/color del
  cliente vía `organizaciones.dominio`) + guard en `doLogin` para no redirigir si `org.dominio` == hostname
  actual (evitar loop si alguien teclea `user@empresa` en su propio dominio). Cuando el dueño defina el
  dominio, setear `organizaciones.dominio` para esa org y construir la marca por hostname.

### CONSULTORIO MÉDICO (geriatra) — módulo demo en Multiempresa (v39.8, chat `RvxXb`)
Decisión del dueño: NO es base-por-cliente — es un **módulo dentro de NEXUS PRO** (patrón POS/Rifas:
misma base, `organizacion_id`+trigger+RLS) para PRESENTARLO al doctor; si lo quiere, se le crea su
org+usuario y ve solo lo suyo. **Tablas** (migración `create_consultorio_tables`): `med_pacientes`
(ficha geriátrica: contacto_nombre/telefono = familiar responsable, alergias, condiciones,
medicamentos, ars, sangre), `med_citas` (fecha/hora/motivo/estado pendiente|confirmada|atendida|
cancelada), `med_consultas` (signos vitales presion/pulso/temperatura/peso/glucosa + diagnostico/
tratamiento/receta/indicaciones + precio/pagado). **Módulo `parches.js`** (IIFE al final): hub
Multiempresa orden 5 "Consultorio Médico" (`ti-stethoscope`, teal `#0d9488`), `window.nxAbrirConsultorio`
(vista `#v-consultorio`), tabs Inicio (KPIs + agenda de hoy + accesos rápidos) / Agenda (por día,
±día, atender→consulta) / Pacientes (buscador, ficha con alergias en rojo + historial) / Consultas.
**Récipe imprimible** (`nxMdReceta`: ℞ formato médico RD, firma/exequátur; se abre solo al guardar
consulta con receta). CSS `nxMd*`. Branding: usa `org.nombre` si `tipo='consultorio'`, si no
"Consultorio Geriátrico". **v39.9 — COMPLETO:** modo solo-consultorio HECHO (`tipo='consultorio'`
espejo de tienda/rifa en index.html: clase `body.org-consultorio`, `aplicarOrgSidebar` abre
`nxAbrirConsultorio` con retry, guard en `nav()`, landing directo `esModuloDirecto`, botón
"Cerrar sesión" en el hero) + recordatorio de cita por WhatsApp (tel del paciente o del familiar,
mensaje armado con negocio/fecha/hora) + reporte de ingresos del mes imprimible (`nxMdRepIngresos`,
KPIs facturado/cobrado/pendiente en la pestaña Consultas). Para vender: crear org `tipo='consultorio'`
+ usuario (receta auth de siempre) y el doctor entra directo a lo suyo. **Datos DEMO sembrados**
(org nexus-pro, 3-jul): 5 pacientes geriátricos realistas (Carmen Julia 78, Ramón 82, Mercedes 74,
José Francisco 80, Ana Dolores 86 — con alergias/crónicas/familiar responsable), 3 citas de "hoy"
+ 2 futuras, 4 consultas con vitales/récipes/precios (1 pendiente de pago a propósito).
**ACCESO DEL DOCTOR CREADO (3-jul):** org `geriatra` (id `af2aa285-6df5-407a-a2f2-af6178a47209`,
tipo consultorio, sin dominio) + usuario `doctor` (receta auth completa calcada de bayolcell:
auth.users `doctor@nexus-pro.local` + identities + usuarios_sistema + profiles; clave temporal en
poder del dueño, NO va al repo). Entra con `doctor@geriatra` en nexusprord.com → cae directo en su
consultorio (modo solo-consultorio). Los 5 pacientes/citas/consultas DEMO se le copiaron a su org
(cuando empiece a trabajar de verdad, borrar su demo con un delete por organizacion_id).
**Pendiente:** nombre/marca real del doctor cuando el dueño lo cierre (update organizaciones.nombre).
**GRADUACIÓN a sistema propio (decidida 3-jul):** el consultorio pasará a **base por cliente**
clonando el molde AMATISTA (su base `sdxyqaawxomnfhyaxuyo` tiene 50 tablas, ~90% sirve tal cual;
se descarta lo dental). Se trabaja en un **CHAT APARTE** con su propio contexto:
**ver `CONSULTORIO-CLAUDE.md`** (en la raíz de este repo) — plan por fases, infra, SSO,
adaptaciones geriátricas. Pendiente: dueño confirma US$ 10/mes del proyecto Supabase nuevo.

### Aviso hosting `bayolcell.com` (3-jul-2026, sin resolver)
Llegó correo de Namecheap: el HOSTING "Stellar" de `bayolcell.com` (dominio del taller) venció el
3-jul con 72h de gracia (US$ 55.88/año). Es el hosting, NO el dominio (renovación aparte).
Recomendación dada al dueño: verificar qué sirve ese hosting; si es la app del taller, migrarla
GRATIS a Cloudflare Pages (como Deluxe/NEXUS) y apuntar el dominio — trabajo del chat del taller
(`bayolcell-taller`). No renovar desde el link del correo (phishing risk); entrar directo a Namecheap.

### Clientes SaaS — control de cobro de los sistemas vendidos (v40.1, chat `RvxXb`)
El dueño cobra mensualidad a los negocios que usan sus sistemas (Deluxe, Amatista, Consultorio…).
Módulo **"Clientes SaaS"** en el hub Multiempresa (orden 8, `ti-server-2`, verde `#047857`, IIFE al
final de parches.js): tablas `saas_suscripciones` (nombre, sistema, base_ref, dominio, mensualidad,
costo_base, dia_cobro, whatsapp, contacto, activo) + `saas_pagos` (monto, fecha, periodo 'YYYY-MM',
metodo) — org+trigger+RLS patrón POS (datos solo del dueño, org nexus-pro). `window.nxAbrirSaas`:
KPIs (esperado/mes, cobrado del mes, pendiente, al día) + tarjeta por cliente con estado del mes
(PAGADO si hay pago con periodo del mes / VENCIDO si pasó dia_cobro / POR COBRAR), registrar pago,
historial, WhatsApp recordatorio, editar (incl. inactivar). Sembrados: DELUXE, AMATISTA DENTAL,
CONSULTORIO GERIÁTRICO con mensualidad 0 (el dueño las define en la UI). El doctor CONFIRMÓ que
pagará — la base propia del consultorio (US$10/mes) queda para el chat del consultorio
(CONSULTORIO-CLAUDE.md, Fase 0).

### Cliente nuevo: AMATISTA DENTAL (clínica odontología) — base por cliente, EN OTRO CHAT
Cliente nuevo conseguido por el dueño (chat `RvxXb`). Se construye con el modelo **“base por cliente”**
(Infoplus): su PROPIA base aislada, entra por `usuario@amatista` desde `nexusprord.com` (el `@` enruta via
`organizaciones`). **Molde a clonar = Deluxe** (`DELUXE-BEAUTY-CENTER-`, base `mrtqkhachhvsczltwakt`): una
clínica dental es estructuralmente igual (citas, servicios/tratamientos, clientes/pacientes, facturación,
caja). Plan: clonar Deluxe → base propia de Amatista → rebrandear → "servicios" = tratamientos dentales.
**Marca:** "Amatista Dental", logo dorado (diente), color **dorado/oro** (+ acento morado amatista opcional).
**Pendiente definir con el dueño:** extras dentales (odontograma/historia clínica/presupuestos), dominio
(propio vs subdominio), usuarios/logins. **Se trabaja en un CHAT APARTE** (no este) para no recargar; este
chat sigue con NEXUS PRO (seguros/rifas).

---

## Seguridad (pendiente — ver `SEGURIDAD-PLAN.md` y `PLAN-AUTH-OPCION-A.md`)

**Estado actual (riesgo conocido):** la app entra con la **anon key** + un login
propio (`usuarios_sistema`, validado en el navegador). **Todas las tablas tienen
RLS `USING(true)` → abiertas.** Quien extraiga la anon key puede leer/editar todo.

**Plan acordado (Opción A — Supabase Auth, por fases reversibles):**
- Fase 0: tabla `profiles` + helper `mi_rol()` (no rompe nada).
- Fase 1: crear usuarios en Auth (correo sintético `login@nexus-pro.local`) en
  paralelo, sin cambiar el login aún.
- Fase 2: login con `signInWithPassword` + flag para revertir al login viejo.
- Fase 3: RLS real por rol, **tabla por tabla**, probando entre cada una.
- Fase 4: contraseñas y limpieza.

> **Decisión pendiente del usuario** (define la Fase 1): cómo establecen los
> usuarios su clave nueva — (1) temporal + cambio obligatorio [recomendado],
> (2) el admin las define, (3) correo + enlace mágico.

---

## Cómo le gusta trabajar al dueño (estilo y preferencias — IMPORTANTE)

Auditoría del historial (52 commits, ~115 entradas de changelog). Respetar esto:

1. **Publicar EN VIVO directo a `main`.** El dueño quiere que cada corrección se
   aplique, pruebe y suba **directo a `main`** (push directo, fast-forward),
   subiendo `APP_VERSION` + changelog. No quedarse en ramas de prueba. Solo
   avisar antes si el cambio es grande/riesgoso (no un arreglo puntual).
2. **Móvil primero, iPhone obsesivo.** Muchísimos arreglos son de iPhone: botones
   que se "inflan" al tocar (evitar `transform:scale/translate` en `:active`
   dentro de ventanas con desenfoque), textos que se cortan, áreas tocables,
   pantallas angostas. Probar SIEMPRE el cambio en móvil angosto.
3. **Arreglos de RAÍZ, no parches.** El dueño nota cuando algo se "arregló a
   medias" (hay commits "ARREGLADO de verdad", "arreglar de raíz"). Encontrar la
   causa real (p.ej. una regla CSS global que pisa) y corregirla bien la primera.
4. **Estética = prioridad real.** Le importa mucho el diseño: iconos 3D
   cristal/vidrio, efecto "goma" (jelly) al tocar, humo de color, degradados,
   relieve, control segmentado parejo, rejillas uniformes. Lo visual no es
   secundario.
5. **Rejillas uniformes y adaptables.** Botones del mismo tamaño en rejilla
   (`auto-fit`/`minmax`), nada que desborde ni se vea disparejo en móvil.
6. **Contexto dominicano (RD).** `RD$`, `es-DO`, ITBIS 18%, NCF, DGII/ARS, cédula,
   RNC, denominaciones de billetes RD, documentos legales al estilo dominicano
   (acto de venta, contrato/pagaré con abogado + matrícula del CARD + testigos),
   monto **en letras**. Notación de números: punto = miles, coma = decimal.
7. **Todo se imprime / PDF / WhatsApp.** Recibos, contratos, estados de cuenta,
   actos de venta, reportes de cierre. Los documentos para el cliente importan.
8. **Solo admin + RLS.** Los módulos sensibles (Préstamos, Vehículos, POS) son
   solo para el administrador y se protegen con RLS en la base.
9. **Auditoría.** Registrar acciones con `logAudit(accion, detalle, modulo)`.
10. **Iterativo y constante.** Muchas versiones pequeñas seguidas; mejor entregar
    incrementos probados que grandes cambios de golpe.

### Estilo del changelog (`version.json`)
- En **español llano, para el usuario final** (no técnico). Explica QUÉ cambió y
  para qué le sirve, con ejemplos concretos (ej. "'4.000' = 4,000").
- Las correcciones empiezan con **`ARREGLADO`** (a veces `ARREGLADO (importante)`).
  Las novedades con **`NUEVO`**. La entrada nueva va **al inicio** del array.
- Mantener `version` de `version.json` == `APP_VERSION` de `index.html`.

### Estilo de commits
- Cortos, en español, con prefijo de módulo: `POS:`, `Préstamos:`, `Recibo:`,
  `Multiempresa:`. A menudo **sin acentos**. Describir el qué, no el cómo.

### Estilo de código
- Denso, en una línea, nombres en español, helpers como arrow `const`. Comentarios
  en español con banners `// ──────`. Sin build, todo a mano.
- Helpers del núcleo (en `index.html`): `API` (get/post/patch/del a Supabase REST),
  `fmt(n)`→`'RD$ '+...es-DO`, `fmtN(n)`, `pend(c)`, `getTot(c)`, `hoy()`,
  `toast(tipo,titulo,msg)` (tipo `'err'`/`'ok'`...), `nav(view,el)`, `gAgt`/`gEmp`,
  `logAudit(...)`, `escHtml(s)`, `ST` (estado global), `CFG`, `sesion`.
- Montos: leer SIEMPRE con `window.nxMoney.parse(input.value)` y marcar los inputs
  con `data-nx-money`. Nunca `parseFloat` crudo sobre un campo de dinero.

## Ramas

Por defecto el dueño quiere **push directo a `main`** (ver punto 1). La app de
producción descarga de `main`, así que ahí es "en vivo". La rama de trabajo
`claude/...` se mantiene sincronizada, pero el destino real es `main`.

### REGLA DE ORO entre chats (varios chats a la vez)

Hay **un solo `main`** (`sterlinr08-dte/nexus-pro` → `main`). Cada chat crea su
propia rama de trabajo `claude/...` con nombre al azar (p.ej. uno usa
`claude/parches-js-line-count-RvxXb`, otro `claude/bold-lovelace-8sy1hk`). Son
solo carriles temporales; **el único que importa es `main`**.

1. **Todo trabajo importante de cualquier chat TERMINA en `main`.** Así los dos
   (o más) chats siempre miran lo mismo y **nada se pierde entre conversaciones**.
2. **Antes de empezar a tocar código**, sincronizar con lo último de `main`
   (`git fetch origin` + rebase/merge de `origin/main`). Evita pisar lo que otro
   chat ya subió.
3. **Trabajar código en un solo chat a la vez** (sobre todo `parches.js` /
   `index.html`) para no chocar. Si dos chats editan el mismo archivo a la vez,
   uno pisa al otro.
4. El **contexto del proyecto vive en este CLAUDE.md** (no en el chat). El chat es
   desechable; al iniciar, cualquier Claude lee este archivo y ya sabe todo. Tras
   un cambio importante, **actualizar este CLAUDE.md** para que no se desactualice.

### Investigación FACTURACIÓN + AUTOMATIZACIONES (5-jul-2026, web)
**e-CF DGII obligatorio 15-NOV-2026** para micro/pequeños (prórroga DGII may-2026; multas 5-50
salarios). Sin e-CF el POS será invendible — ruta: integrar PSFE por API (Alanube, como Alegra).
**Brechas facturación:** 606/608 (solo hay 607) · retenciones ITBIS/ISR · multi-moneda ·
plantillas/logo por doc · nota de débito · portal autoconsulta del cliente.
**AUTOMATIZACIONES que faltan (foco del dueño):** 1) recordatorios de cobro AUTOMÁTICOS
(fiado/cuotas vencidas) 2) factura RECURRENTE genérica (igualas — generalizar el motor cron del
seguro al POS) 3) envío auto de factura por correo/WhatsApp al emitir 4) aviso automático de
estado de reparación 5) alertas diarias de bajo stock 6) apartados por vencer. NEXUS ya tiene la
infra: pg_cron + Edge Functions + wa.me. WhatsApp 100% auto requiere API de Meta/Twilio (US$ por
msj); plan pragmático: Fase 1 = "Centro de avisos" cron que detecta vencidos y arma cola con
WhatsApp 1-toque (gratis) · Fase 2 = correo automático (función enviar-reporte-email existe) ·
Fase 3 = WhatsApp API real.
