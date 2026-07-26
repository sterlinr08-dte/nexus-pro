# CLAUDE.md — NEXUS PRO

> # ⛔ LEE PRIMERO: `NPGS.md`
>
> **`NPGS.md` (NEXUS PRO GLOBAL STANDARDS) es la MÁXIMA AUTORIDAD del proyecto**, decretada por
> el dueño el 25-jul-2026. Antes de analizar, diseñar o escribir una línea de código hay que
> leerlo y cumplirlo. Fija el estándar de diseño, UX y calidad: botones, buscadores, ventanas,
> tablas, colores, consistencia, rendimiento, auditoría y el checklist obligatorio de cierre.
>
> **Cómo conviven los dos archivos:**
> - **`NPGS.md` manda en el CÓMO** — cómo se diseña y se construye. Donde fije un estándar,
>   NPGS gana sobre cualquier criterio propio.
> - **`CLAUDE.md` (este archivo) guarda el QUÉ** — qué es NEXUS PRO: el negocio, el esquema real
>   de la base, los bugs ya resueltos, las decisiones que el dueño ya tomó, el flujo de
>   publicación. Eso son HECHOS del sistema, no opiniones de diseño: no se inventan de nuevo ni
>   se sustituyen.
> - **`DESIGN_SYSTEM.md`** — inventario medido de los componentes que existen HOY y en qué
>   se aparta el sistema de NPGS, con el plan de convergencia. Es el puente entre los dos.
>
> Si algo de este archivo contradice a NPGS en materia de diseño: **detenerse, explicárselo al
> dueño y proponer la solución** — nunca resolverlo por cuenta propia.
>
> ### ⚖️ Enmienda del dueño (25-jul-2026): **"No es quien manda por encima, sino lo que más conviene"**
>
> NPGS **no es una autoridad ciega**. En cada decisión de diseño se pesan las tres cosas —
> lo que dice NPGS, lo que dicen las buenas prácticas del oficio, y **lo que de verdad le
> conviene al negocio y a quien usa el sistema todos los días** — y gana lo que más conviene,
> no lo que esté escrito más arriba. Cuando cumplir NPGS al pie de la letra empeoraría el
> sistema: se para, se le explica al dueño con el caso concreto y el costo REAL medido, y se
> propone lo que sí conviene; la decisión final es suya, pero llega con la recomendación puesta.
> Toda desviación se escribe con su razón en `DESIGN_SYSTEM.md` — una excepción sin razón sigue
> siendo desorden; lo que cambia es que una excepción **bien razonada ya es legítima**.
> **No se relaja:** la consistencia visual entre pantallas, no fingir funciones que no existen,
> no duplicar, y verificar de verdad antes de publicar. Texto completo en `NPGS.md`
> (PRIORIDAD MÁXIMA). **Reabre** la decisión de buscadores (`DESIGN_SYSTEM.md` §6, C2).

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

> Versión actual: **48.97** (ver `index.html` y `version.json`).

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



### REGLAMENTO DE DISEÑO — BOTONES Y MENÚ LATERAL (decretado por el dueño, 10-jul-2026) — OBLIGATORIO
Botones compactos estilo Notion/Linear/Stripe Dashboard/iOS en TODOS los menús laterales del
sistema (no solo colores — proporciones nuevas). Reglas: altura del botón reducida 20-30%,
sin ocupar el ancho crudo del panel (márgenes laterales visibles), separación vertical entre
botones reducida, bordes redondeados limpios, icono alineado a la izquierda con separación
uniforme, texto con más peso (`font-weight` ~600-700), el botón ACTIVO se distingue SOLO por
color de fondo + color de texto + borde/indicador lateral (nunca sombra flotante extra), el
resto de botones discretos sin exceso de sombra, iconos SIN aumentar de tamaño (proporcionales
al texto), debe verse más contenido sin scroll, responsive en móvil.
- **Estado — HECHO v47.6, en los 3 menús laterales que existen en el sistema** (no hay un solo
  menú lateral — cada uno con su propio CSS, medido y verificado por separado con Playwright,
  antes/después en píxeles, no a ojo):
  - **Seguros (núcleo)** — `.sb`/`.ni` en `index.html`: fila 31px→24px (−23%), márgenes
    laterales 6px→10px, `font-weight` 500→600, se eliminó el indicador `::before` duplicado
    (dead code — ya bastaba el `box-shadow` inset). Los 23 subítems de Contabilidad/
    Configuración se ajustaron en proporción (`padding:6px 10px`→`4px 9px`).
  - **POS** (`shellTienda`, índigo) — `.nxTNav` en `parches.js`: fila 35px→26px (−26%). El
    activo pasó de una píldora con degradado + sombra flotante (`box-shadow:0 6px 16px...`) a
    fondo plano + borde lateral (`box-shadow:inset 2px 0 0 #818cf8`) — mantiene el color índigo
    de marca, solo se aplanó la sombra. El "blindaje" de `.nxTSide .nxTNav` contra el tema glass
    (existente desde antes) no tocaba padding/tamaño, así que no chocó con este cambio.
  - **AGUAPRO** — `.nxAguaTabs button` en `parches.js`: fila 32px→25px (−22%). Ya usaba
    fondo plano + borde lateral (no tenía el problema de sombra flotante de POS).
  - Verificado con las 63 pruebas Playwright ya existentes de AGUAPRO (37 funcionales + 26 del
    buscador modal) repasadas sin regresión — el cambio es solo CSS, ninguna función se tocó.
  - **Pendiente:** el dueño puede pedir ajustar otros menús/paneles a este mismo estándar
    (ej. tabs internas de módulos, no solo el menú lateral principal) si lo nota en otra pantalla.
  - **Seguimiento v47.9 — causa real de los `<select>` "gigantes" en iPhone:** el dueño reportó
    con capturas (Facturas: selects "Junio"/"2026"/"Pendientes") que seguía viendo cosas gigantes
    después del v47.6. NO era el mismo problema del menú — era que **ningún `<select>` del
    sistema tenía `-webkit-appearance:none`**, así que iOS Safari dibuja el control NATIVO del
    sistema (más alto, forma de píldora) ignorando buena parte del `height`/`padding` del CSS.
    Arreglado con un reset GLOBAL en `index.html` (línea ~66, `select{...}`) que aplica a TODOS
    los `<select>` del sistema de una vez (Seguros/POS/AGUAPRO/Rifas/Consultorio) + flecha propia
    en SVG (se pierde la del sistema al quitar la apariencia nativa). **Detalle no obvio
    encontrado en pruebas:** la flecha no se pintaba al inicio — casi todos los `<select>` traen
    `style="background:#fff"` a mano (shorthand), que resetea `background-image` a `none` y por
    ser inline le gana a un `select{}` externo sin `!important`; hubo que marcar
    `background-image`/`background-repeat`/`background-position`/`background-size` con
    `!important` para que la flecha sí se vea. Los botones COBRAR/FACTURA/WHATSAPP/PRECIO de las
    tarjetas de Facturas se midieron (26-30px) y NO estaban rotos — el problema real eran
    específicamente los `<select>`. **Confianza:** alta pero NO verificada en un iPhone real (el
    entorno de esta sesión no tiene salida a `nexusprord.com` — política de red del entorno,
    ver `/root/.ccr/README.md`); el diagnóstico se basa en un comportamiento bien conocido de
    iOS Safari, confirmado indirectamente (headless Chromium no reproduce el bug nativo de iOS,
    así que no se pudo ver el "antes" roto, solo confirmar que el "después" no rompe nada en
    120 pruebas Playwright existentes). Pendiente que el dueño confirme en su iPhone tras
    actualizar.
  - **Seguimiento v48.1 — UNA sola fuente en todo el sistema (incluidos documentos impresos):**
    el dueño notó que el sistema mezclaba varios estilos de letra; pidió unificar a una sola. Se
    auditaron TODAS las declaraciones `font-family` de `index.html` y `parches.js` y se
    clasificaron en dos grupos: (1) **UI en vivo** (misma página, tiene acceso a `:root`) → se
    apuntaron a las variables ya existentes `var(--ff)` (`'Segoe UI',system-ui,-apple-system,
    sans-serif`) o `var(--mono)` (`'Cascadia Code','Consolas','Courier New',monospace`) — corregido
    el shell de AGUAPRO (usaba `Inter`) y los números de boleto de Rifas (usaban
    `ui-monospace,monospace`, distinto al monoespaciado del resto del sistema); (2) **documentos
    imprimibles/exportables** (facturas, recibos, tickets del POS, contratos de Préstamos y
    Vehículos, acuerdo de pago en cuotas, récipe de Consultorio, boleto de Rifas, expediente de
    cliente): son ventanas `window.open()+document.write()` o divs aparte que NO heredan las
    variables CSS de la página principal, así que ahí se **hardcodeó el valor literal** (mismos
    dos stacks de arriba, escritos SIN comillas — `Segoe UI,system-ui,-apple-system,sans-serif` —
    para no chocar con las comillas de los strings de JS que ya envolvían ese CSS, sea comilla
    simple, doble o template string). Se reemplazaron Arial/Arial,Helvetica/Arial,sans-serif/
    -apple-system,Arial/Georgia,serif/'Times New Roman',Georgia,serif/Courier New en TODOS esos
    documentos. Verificado: `node --check parches.js` limpio, los 3 `<script>` de `index.html`
    pasan `new Function()`, la app carga en Chromium headless con 0 errores de JS (`body`
    resuelve a `"Segoe UI", system-ui, -apple-system, sans-serif`), y revisión manual del diff
    completo confirmando que cada cambio es solo un valor de `font-family` (nada de lógica
    tocado). Cambio 100% CSS — riesgo de regresión funcional mínimo.
  - **Seguimiento v48.2 — bug real en el buscador de Cobros + buscador nuevo en Facturas +
    tarjetas más compactas:** el dueño mandó capturas de iPhone mostrando la lupa de Cobros
    "rota" (un pedacito flotando encima del filtro "TODOS LOS AGENTES"). Causa raíz encontrada:
    `.nxBusca` (el componente global) usa `flex:1` puro (`flex-basis:0%`) — cuando comparte una
    fila `.frow` con `<select>` que NO se encogen, el flexbox no activa el wrap (porque con
    basis:0% el navegador no detecta overflow de fila) y en cambio aplasta el buscador por debajo
    de su propio contenido (el botón de la lupa, 42px, terminaba mostrándose parcialmente
    encimado). Arreglado de raíz en el componente compartido (`nxBuscaEnsureCSS`, no un parche
    puntual): `.nxBusca` pasó a `min-width:180px;flex:1 1 200px` — con un `flex-basis` real, el
    wrap SÍ se activa a tiempo y el buscador nunca se aplasta por debajo de un ancho usable, en
    NINGÚN lugar del sistema donde se use (beneficia también a Pólizas y cualquier futuro uso).
    Además, en Cobros y Facturas el buscador se puso en su PROPIA fila (ancho completo) arriba de
    los filtros de agente/estado, en vez de compartir fila con ellos — más prominente y "bien
    bonito" como pidió el dueño. **Facturas no tenía buscador** (solo Mes/Año/Estado) — se agregó
    `factQ` (busca por nombre, cédula o número de póliza, enganchado en `rFact()`). De paso se
    compactó la tarjeta de Facturas (el dueño: "las letras están muy grandes y no se logra
    identificar el nombre del cliente"): nombre del cliente con truncado por elipsis (mismo patrón
    ya usado en la tarjeta de Cobros, `cbNm`), monto de "Mes actual" bajado de 18px a 15px (ya no
    compite visualmente con el nombre), badges de estado/plan en columna compacta a la derecha
    (antes con `margin-top:6px` separado, ahora `gap:4px` en flex-column), padding/márgenes de la
    tarjeta reducidos (`13px`→`11px 12px 10px`, separadores `11px 0`→`8px 0`). Verificado con un
    repro aislado en Playwright a 390px de ancho usando el markup/CSS REAL extraído del archivo
    (no una reconstrucción a mano): confirmado que `cobQ`/`factQ` ahora miden el ancho completo de
    su fila sin superposición, y captura visual del "antes/después" de la tarjeta de Facturas.

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

### REGLAMENTO GLOBAL DE BUSCADORES (decretado por el dueño, 10-jul-2026) — OBLIGATORIO
TODO buscador del sistema (actual y futuro) debe usar el **componente global
`nxBuscaHTML(opts)`** definido en `index.html` (junto a los helpers del núcleo, expuesto
en `window` para parches.js). NO crear buscadores distintos por módulo. El estándar:
- **Lupa 🔍 + campo JUNTOS** en un solo bloque visual (nunca separados/desalineados).
- **Tocar la lupa enfoca el campo** (abre el teclado en móvil) — sin segundo toque.
- **Filtra mientras se escribe**, Enter ejecuta, botón **✕ para limpiar** cuando hay
  texto (limpiar re-dispara el filtro y devuelve el foco), placeholder descriptivo
  (ej. "Buscar cliente, factura, IMEI o teléfono").
- **Diseño uniforme**: 42px de alto exacto (border-box), mismos bordes/radio/estados
  focus (aro morado)/carga (`.nxBusca-load`)/error (`.nxBusca-err`)/deshabilitado
  (`.nxBusca-off`); input a 16px (anti-zoom iOS); `aria-label="Abrir búsqueda"`.
- **Modo compacto** para espacios estrechos: `{compact:true}` muestra solo la lupa y
  se expande al tocarla (clase `.nxBusca-c`/`.open`).
- Uso: `nxBuscaHTML({id, placeholder, value, oninput:"miFiltro(this.value)", onenter,
  compact, disabled})` devuelve el HTML. **IMPORTANTE:** el handler debe repintar SOLO
  el contenedor de la lista (no la vista completa) para que el campo no pierda el foco
  al escribir (patrón `#agLW` de AGUAPRO / `#rfBoardWrap` de Rifas).
- **Estado de migración:** AGUAPRO 100% migrado (6 pestañas, 21 pruebas Playwright en
  verde). **Seguros 100% migrado (v47.7):** `cliQ`, `polQ`, `cobQ`, `pgBuscar` (el viejo
  wrapper `.sw`/`.si` ya NO existe, se borró como código muerto) y `gSearch` (barra
  superior, Enter-only vía `onenter` en vez de `oninput`). **Bug real encontrado y
  arreglado de paso:** el filtro `auditFiltroUsr` (Auditoría) regeneraba TODA la barra
  de filtros —incluido el propio input— en cada tecla (patrón `#auditC` oculto que se
  copiaba a mano a `#auditCfg`), así que perdía el foco a cada letra Y el resultado
  filtrado nunca llegaba a pintarse en el panel visible. Se separó en `rAuditoria()`
  (arma la barra UNA vez) + `rAuditRows()` (repinta solo `#auditRows`); se eliminó el
  hack de `#auditC`. **Blindaje nuevo en `nxBuscaHTML` (por 2 conflictos reales
  encontrados y verificados en navegador, no supuestos):** (1) `.nxBusca-in` ahora
  fuerza `border/background/height/font-size/padding` con `!important` porque contenedores
  viejos como `.frow input`/`.tn-sr input` (más específicos que `.nxBusca-in` sola) le
  pisaban el estilo — sin esto el campo salía en 30px con letra a 10px en vez de 42px/16px;
  (2) regla extra `html body .nxBusca .nxBusca-in{background:transparent!important}`
  porque los temas oscuros (`body.tema-premium input{background:...!important}`) tienen
  MÁS especificidad que `.nxBusca-in` sola — sin esto el input salía con fondo oscuro
  mientras el contenedor `.nxBusca` seguía blanco (mezcla rota). Mismo criterio de
  blindaje que ya usaba el sidebar del POS contra el tema glass. Además: `nxBuscaEnsureCSS()`
  se separó de `nxBuscaHTML()` y se llama UNA VEZ al cargar la página (no solo la primera
  vez que algún módulo invoca la función) — necesario porque los buscadores estáticos de
  Seguros son HTML escrito a mano (nunca llaman a `nxBuscaHTML()`), así que antes se
  quedaban sin su CSS si ningún módulo JS (AGUAPRO/POS) lo disparaba primero. Verificado
  con 20 pruebas Playwright corridas contra el CSS y JS REALES extraídos de `index.html`
  (no una reconstrucción a mano) — cubre alto/foco/handlers/tema oscuro/Auditoría.
  **POS 100% migrado (v47.8):** los 7 usos de `.nxLupaBox` (Vender, ventana "Buscar
  artículo", Productos, Reparaciones, Prefacturas, Historial de facturas) ahora usan
  `posBuscador()` (helper local del IIFE del POS, mismo patrón defensivo que `agBuscador`
  de AGUAPRO: si `window.nxBuscaHTML` no está disponible cae a un `.nxLupaBox` de
  respaldo). **`nxBuscaHTML` ganó una opción nueva `onLupa`** (config del componente
  compartido, no rompe a nadie — por defecto sigue siendo `nxBuscaLupa(this)` = enfocar):
  la hizo falta porque la lupa de "Vender" (`posBuscar`) no enfoca el campo, abre el
  catálogo completo (`nxProdPicker('vender')`) — una función genuinamente distinta que
  ya existía y no se le podía quitar solo por estandarizar el look. **2 bugs reales
  iguales al de Auditoría, encontrados y corregidos de paso:** `nxPrefLista` (Prefacturas
  abiertas) y `nxFacHist` (Facturas generadas) reconstruían el modal COMPLETO —incluido
  el campo de búsqueda— en cada tecla o cada cambio de página, con un parche que
  reenfocaba a mano (`i2.focus();i2.setSelectionRange(...)`) después de cada reconstrucción.
  Se dividieron en abridor (arma el modal una vez: `nxPrefLista()`/`nxFacHist()`, ya sin
  parámetros) + repintador de resultados (`nxPrefListaRows(q)`/`nxFacHistRows(page,q)`,
  estos sí reciben los parámetros). Se actualizaron los 4 sitios que abrían estos modales
  para llamarlos sin argumentos. Verificado con 16 pruebas Playwright contra el CSS/JS
  reales del POS (altura, la lupa especial de Vender, el nodo del input sobrevive a
  escribir/paginar, el filtro sí actualiza) + las 20 de Seguros y las 84 de AGUAPRO
  repasadas sin regresión (120 pruebas en total).
  **RESTO MIGRADO v48.0 — sistema 100% en el estándar (con 2 excepciones a propósito):**
  Préstamos (`nxPrBuscar`), Compra y Venta de Vehículos (`nxVhBuscar`), Rifas (`rfTabQ`
  número de boleto —conserva `inputmode="numeric"`— y `tkQ` lista de tickets), Consultorio
  Médico (`mdQ`), "Facturas pendientes de meses anteriores" en Seguros (`nxPendBuscar`,
  módulo aparte `__NEXUS_FACT_PENDIENTES_PREV__`), y 4 del POS que quedaban sueltos fuera
  de la tanda `.nxLupaBox` (Notas de crédito `ncQ`, Historial de ventas `histQ`,
  Prefacturas por cobrar `phQ`, buscador de IMEI dentro del carrito `nxFacSerQ` — este
  último también con `inputmode="numeric"`). Cada módulo con su propio helper local
  (`prBuscador`/`vhBuscador`/`rfBuscador`/`mdBuscador`/`pendBuscador`, todos con el mismo
  respaldo defensivo si `window.nxBuscaHTML` no está en caché). **`nxBuscaHTML` ganó una
  opción `inputmode`** (config nueva, retrocompatible) para no perder el teclado numérico
  en los casos que lo necesitaban. **Excepción a propósito — 2 buscadores del POS NO se
  migraron:** `facBuscar` (buscar producto en Factura) y `ppComboQ` (buscar artículo
  dentro de un combo) NO son "filtrar una lista visible" — muestran una lista de
  SUGERENCIAS flotante mientras escribes (con `onfocus` para reabrirla), un patrón de
  autocompletado distinto que `nxBuscaHTML` no cubre; forzarlos hubiera significado
  perder esa función. Quedan con su propio markup, sin tocar. Verificado con 174 pruebas
  Playwright en total en esta ronda (una falla vista una vez en la suite de AGUAPRO fue
  arranque simultáneo de varios servidores de prueba, no la app — confirmado limpio
  repitiendo 3 veces). **Sigue pendiente:** el selector de CLIENTE del POS en cobro/factura
  (sigue siendo `<select>`, ver nota abajo sobre `ModalBusquedaBase`).
  **BUG REAL encontrado y arreglado de raíz (v48.38) — buscador "gigante" en modales flex-column:**
  el dueño mandó una captura del buscador de "Facturas generadas" ocupando toda la ventana
  (estirado a lo alto, con la lupa+placeholder pegados abajo del todo). Causa real: `.nxBusca`
  tenía `flex:1 1 200px` como regla BASE — pensada para cuando comparte fila con otros filtros
  (`.frow`, `display:flex` en fila) — pero `nxFacHist` (y cualquier otro modal escrito
  `display:flex;flex-direction:column`) mete el buscador como hijo DIRECTO de un contenedor en
  COLUMNA; ahí ese mismo `flex-basis:200px` se interpreta sobre el ALTO en vez del ancho, y con
  `flex-grow:1` la caja se estira para llenar todo el espacio vertical libre del modal — de ahí
  el tamaño gigante. Como `.nxBusca` es el componente GLOBAL (el mismo en todo el sistema), el
  bug no era solo de esa ventana — afecta a cualquier buscador metido directo en un contenedor
  flex en columna. Arreglado en la raíz (`nxBuscaEnsureCSS()`): la regla base pasó a
  `flex:0 0 auto;width:100%` (alto fijo de 42px SIEMPRE, sin importar el contenedor), y el
  crecer/compartir-fila (`flex:1 1 200px`) se movió a una regla más específica
  `.frow>.nxBusca,.frow .nxBusca` — solo se activa cuando el buscador de verdad está dentro de
  una fila de filtros. Verificado con el código real de `nxBuscaHTML`/`nxBuscaEnsureCSS`
  extraído y cargado en un navegador con los 2 casos reales (buscador solo en un modal columna
  → ahora 42px de alto; buscador junto a un `<select>` en `.frow` → sigue compartiendo el ancho
  normal) — los dos casos correctos, sin regresión.

### REGLAMENTO TÉCNICO — `ModalBusquedaBase` (decretado por el dueño, 10-jul-2026) — OBLIGATORIO
**No es lo mismo que `nxBuscaHTML` de arriba.** Son dos patrones para dos problemas distintos —
no se mezclan, cada buscador del sistema usa el que corresponde a su caso:
- **`nxBuscaHTML`** = *filtrar la lista que ya estás viendo* (inline, sin modal, datos ya
  cargados en memoria — ej. la tabla de Clientes de AGUAPRO ya renderizada en pantalla).
- **`ModalBusquedaBase`** = *buscar y ELEGIR un registro de un catálogo grande* para meterlo en
  OTRO formulario (ej. elegir un cliente/producto dentro del modal "Nuevo pedido"), donde la
  lista completa puede ser demasiado grande para cargarla toda de una vez. Se abre en un
  **modal/diálogo aparte**, con **paginación del lado del servidor** (Supabase REST
  `limit`/`offset` o `range`), **orden** configurable, **debounce** en el input (no disparar una
  consulta por cada tecla), y **filtros adicionales** (ej. por sector/ruta/categoría) además del
  texto libre.
- **Arquitectura:** `ModalBusquedaBase` es el motor genérico (modal, input+debounce, tabla de
  resultados paginada, loading/error, teclado ↑↓/Enter/Esc); cada entidad tiene su propio
  **buscador específico** que lo envuelve y le pasa la config de esa tabla — ej.
  `BuscadorClientes`, `BuscadorFacturas`, `BuscadorProductos` — nombre siempre
  `Buscador<Entidad>`. El buscador específico sabe: tabla Supabase, columnas visibles, columnas
  de búsqueda (`ilike`), cómo se pinta cada fila, y qué campo(s) devuelve al elegir.
- **REGLA (decretada por el dueño, importante): compartir un motor común NO significa un
  buscador único.** `ModalBusquedaBase` (el motor) SÍ es compartido — pero cada buscador
  concreto es una **implementación independiente y específica de su módulo**, aunque reutilice
  funciones/estilos/estructura comunes. Prohibido crear un `BuscadorClientes` "universal" que
  sirva a la vez a AGUAPRO/POS/Seguros solo porque los tres tienen una tabla de "clientes" —
  son tablas DISTINTAS (`agua_clientes`/`pos_clientes`/`clientes`), con columnas y RLS propios;
  mezclarlos en un buscador compartido arriesga traer la tabla equivocada o filtrar por la
  organización equivocada. Cada módulo construye e invoca SU PROPIO buscador (ej.
  `nxAguaAbrirBuscadorCliente()` es de AGUAPRO únicamente; el día que se migre el selector de
  cliente del POS será OTRA función independiente, p.ej. `nxPosAbrirBuscadorCliente()`, con su
  propia config de tabla/columnas — no una reutilización del de AGUAPRO).
- **Seguridad / multi-tenant:** toda consulta pasa por `organizacion_id` (RLS ya lo exige en
  las tablas `pos_*`/`agua_*`/`rifa_*`/`med_*`/`saas_*` — el buscador NO puede evadir eso). Texto
  de búsqueda del usuario SIEMPRE va parametrizado en el query string de PostgREST (nunca
  concatenado a mano en HTML/SQL) para evitar inyección en el filtro `ilike`.
  Sanitizar antes de interpolar en el `ilike`: escapar `%`, `_`, `,`, `*` propios de la sintaxis
  PostgREST (`or=(...)`) igual que ya hace el resto del código con `escHtml` para el render.
- **Debounce:** ~300ms desde la última tecla antes de disparar la consulta; cancelar/ignorar
  respuestas de consultas viejas si llegan después de una más nueva (evitar "race condition" que
  pinte resultados de una búsqueda ya abandonada).
- **Convención de nombres:** archivo/función motor = `ModalBusquedaBase`; instancias por
  entidad = `Buscador<Entidad>` (`BuscadorClientes`, `BuscadorProductos`...); helpers de apertura
  = `abrir<Entidad>Buscador()`; el callback de selección recibe el registro elegido completo (no
  solo el id) para no obligar a una segunda consulta.
- **Pruebas/criterios de aceptación antes de dar por hecho un buscador modal:** abre y cierra
  bien (Esc, tocar fuera, botón X); pagina sin perder el término de búsqueda; el debounce no
  dispara una consulta por tecla; funciona vacío (0 resultados con mensaje claro) y con miles de
  filas (paginación real, no trae todo a la vez); respeta RLS/organización (probado con 2
  organizaciones distintas, cada una ve solo lo suyo); teclado usable (↑↓ mueve selección, Enter
  elige, Esc cierra); en móvil angosto no desborda y el teclado no tapa los resultados.
- **Checklist obligatorio ANTES de programar cualquier buscador nuevo** (de cualquiera de los
  dos patrones): 1) ¿esta lista ya está cargada en memoria/pantalla, o vive en un catálogo
  grande aparte? → decide `nxBuscaHTML` vs `ModalBusquedaBase`. 2) ¿qué tabla(s) y columnas se
  buscan? 3) ¿qué organización/RLS aplica? 4) ¿qué campo(s) devuelve al elegir y qué formulario
  los recibe? 5) ¿hace falta paginación real (>~200 filas)? 6) ¿hay filtros adicionales aparte
  del texto? 7) ¿cuál es el mensaje de "sin resultados"? 8) ¿cómo se ve en móvil angosto?
  9) ¿qué reemplaza (un `<select>` viejo, un `prompt()`, nada)? 10) confirmar con el dueño el
  caso concreto ANTES de construir el motor genérico a ciegas — no asumir dónde se usa primero.
- **Estado — HECHO v47.5 (primer caso real):** motor `ModalBusquedaBase` construido en
  `index.html` (junto a `nxBuscaHTML`, expuesto en `window`); reusa `nxBuscaHTML` por dentro
  como caja de búsqueda (los dos reglamentos se complementan, no compiten: uno es el "cómo se ve
  el campo", el otro es el "contenedor para elegir de un catálogo"). Primer caso concreto:
  `<select>` de Cliente en "Nuevo pedido" de AGUAPRO → botón que abre `nxAguaAbrirBuscadorCliente()`
  (busca por nombre/teléfono/sector/ruta, elige, guarda el id en el mismo input oculto `agPedCli`
  que ya leía `nxAguaPedidoGuardar`). **Nota honesta encontrada al construirlo:** `_ag.clientes`
  hoy se carga ENTERO en memoria (`cargarAgua`, sin paginar), así que este caso usa el modo
  `datos:` (filtra en JS, paginación local) — NO ejercita el modo `buscar:` (servidor, async,
  para catálogos que no caben en memoria), que queda listo para el próximo módulo que sí lo
  necesite. Verificado con 26 pruebas Playwright (apertura, paginación 20/página, debounce
  300ms sin perder foco, acentos, teclado ↑↓+Enter, Esc, clic fuera, sin resultados, móvil sin
  desborde) + las 37 pruebas funcionales de AGUAPRO repasadas sin regresión. Convención de
  nombres real usada: `nxAgua<Verbo>` en vez de `abrir<Entidad>Buscador()` genérico del
  reglamento — necesario para no chocar con futuros buscadores de cliente de otros módulos
  (POS, seguros...) que tienen su propia tabla de clientes. **Pendiente:** migrar el selector de
  cliente del POS (Factura/Cobro) y otros `<select>` grandes del sistema a este mismo patrón.

---

### REGLAMENTO — CADA APP DE MULTIEMPRESA CON SU PROPIO COLOR Y FORMATO (decretado por el dueño, 13-jul-2026,
### ampliado a TODOS los proyectos 18-jul-2026 — ver punto 11 de "Cómo le gusta trabajar al dueño") — OBLIGATORIO
Cada app registrada en el hub de Multiempresa (`nxMERegistrar`) debe mantener su **propia identidad
visual independiente** — color de acento e ícono propios en el tile del hub, y su propio look interno
(paleta, y cuando aplique tipografía) — **nunca compartir tema con otra app** ni "heredar" el color de
otra por accidente al copiar/pegar código de un módulo a otro. Es una regla de ESTILO hacia adelante
(no se tocó código el día que se decretó, ya se venía cumpliendo en la práctica) — aplicarla en cada
app nueva y respetarla al tocar una existente. **18-jul-2026: el dueño la reafirmó como regla GENERAL
para todo proyecto/sistema** (no solo las apps del hub) — este reglamento queda como el caso particular
ya escrito para Multiempresa; ver el punto 11 más abajo para el alcance completo.
- **Ya cumplido, ejemplos reales (no reconstruir, solo referencia):** Financiamiento verde `#059669` ·
  Vehículos violeta `#6d28d9` · POS azul `#2563eb` (el tile del hub se actualizó en v48.32 para calzar
  con el interior del POS, que pasó de índigo a azul en la Fase 3 de NEXUS PRO X 2026 — antes eran
  `#7c3aed`/`#4f46e5`, quedó desactualizado un rato hasta que se corrigió) · Rifas índigo `#4f46e5` ·
  Consultorio Médico teal `#0d9488` · AGUAPRO azul marino (sidebar propio) · Clientes SaaS verde
  `#047857` · Panel del Dueño ámbar `#b45309` · NEXUS AI CONTENT morado `#c026d3`. Cada uno con su
  ícono Tabler propio en `nxMERegistrar({icon, color, bg, ...})`.
- **Excepción ya negociada y documentada (no repetir sin pedirla):** Cuotas del POS y Financiamiento
  usan morado + Plus Jakarta Sans como excepción deliberada al índigo/Segoe UI del resto — confirmado
  caso por caso con el dueño (ver "REDISEÑO PREMIUM" más arriba), NO es la regla general.
- **Al crear una app nueva de Multiempresa:** elegir un color de acento que NO esté ya en uso por otra
  app del hub (revisar la lista de arriba primero), un ícono Tabler propio, y su propio CSS con
  prefijo/namespace único (patrón `nxAi*`, `nxSa*`, `nxMd*`, `nxRf*`...) — nunca reusar directamente
  las clases CSS de otro módulo aunque el HTML se parezca, para no arrastrar su color si ese módulo
  cambia el suyo después.
- **Aclaración explícita del dueño (19-jul-2026) — CERO arrastre visual de NEXUS PRO en un proyecto
  nuevo:** cuando el dueño manda una imagen/mockup/frontend de referencia para un sistema NUEVO de
  Multiempresa, ese proyecto se construye siguiendo ESA imagen al 100% — nunca copiando/heredando
  iconos, iconos 3D/cristal, paleta, tipografía ni ningún elemento visual ya usado en NEXUS PRO
  (núcleo de Seguros o cualquier otra app del hub). No es solo "un color distinto" (eso ya lo cubre
  el punto de arriba) — es que el proyecto nuevo debe sentirse construido desde cero, con identidad
  propia de punta a punta, sin que se le "pegue" nada del sistema madre por copiar/pegar código o por
  costumbre. Ejemplo de lo que NO se debe repetir: los iconos 3D de cristal que se probaron en el
  Dashboard de Seguros (v48.21) y se revirtieron por no gustarle al dueño (v48.24) — esa hoja de
  iconos NO debe reusarse ni sugerirse como base para ningún proyecto nuevo, cada uno arranca en
  blanco a partir de lo que el dueño mande para ESE proyecto específico.
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

### Bug del ESTADO de factura pegado (RAÍZ) — ARREGLADO v48.5 (11-jul-2026)
Síntoma reportado por el dueño: facturas con "Mes actual RD$ 0" (o sea, ya pagadas del
todo) que seguían mostrando la etiqueta "PARCIAL" en vez de "PAGADO". **Causa de raíz
encontrada en `regAbono()` (index.html):** al registrar un cobro, la actualización de
`facturas.estado` solo tocaba las filas que estaban en `estado='Pendiente'`
(`API.patch('facturas','cliente_id=eq...&estado=eq.Pendiente',...)`) — una factura que
ya había pasado a `'Parcial'` con un abono anterior JAMÁS se volvía a tocar, aunque un
cobro posterior la terminara de pagar del todo. Coincide exactamente con lo que ya
advertía este mismo CLAUDE.md desde antes: "`facturas.estado` puede quedar OBSOLETO vs
la verdad calculada... resync de estados ofrecido, NO aprobado aún" — el dueño lo
aprobó al ver el caso real en pantalla.
- **Arreglo de raíz (código):** función nueva `resyncEstadoFacturas(cid)` (junto a
  `_saldoFacturasCliente`) que recalcula el estado de CADA factura no anulada del
  cliente contra su saldo real (mismo cálculo que ya usa el monto en pantalla, reparto
  del `pagado` del cliente de la factura más vieja a la más nueva) y solo hace `PATCH`
  en las que de verdad cambiaron. Reemplaza el bloque viejo de 4 líneas en `regAbono()`.
  Probado con 4 casos (mes viejo cubierto + mes nuevo parcial, pago grande que cubre
  todo, nada pagado, factura anulada que debe ignorarse) contra el código real
  extraído del archivo — los 4 pasan.
- **Corrección de datos (una sola vez, vía SQL en Supabase):** se recalcularon las 106
  facturas activas de la base contra su saldo real. 31 tenían la etiqueta mal — 21 eran
  clientes que YA habían pagado completo y seguían marcados pendientes/parciales (no
  hay que cobrarles nada) y **8 eran el caso contrario**: decían "PAGADO" pero en
  verdad falta un resto (probablemente de una corrección de precio del v39.3 aplicada
  DESPUÉS de que la factura ya se había marcado pagada a la prima vieja) —
  **el detalle cliente por cliente (nombre + monto) se le compartió al dueño en el
  chat, no se guarda aquí por ser información de clientes** — pendiente de que el
  dueño confirme el cobro de ese resto con cada uno. También apareció una cuenta de
  prueba del propio dueño (`pagado=0` pero con facturas marcadas Pagado) — es dato
  de prueba, no un cliente real, se corrigió igual por consistencia pero no aplica cobro.
- **Nota honesta:** a mitad de la corrección de datos, un primer intento de UPDATE
  excluyó por error las facturas ya-Pagado del cálculo de la suma acumulada (rompiendo
  el orden "más vieja primero" para las demás facturas del mismo cliente) y llegó a
  marcar de más ~24 facturas de junio como pagadas incorrectamente durante unos
  segundos. Se detectó de inmediato al re-verificar contra el cálculo correcto y se
  corrigió con un segundo UPDATE antes de dar el trabajo por terminado — confirmado con
  `0` discrepancias al final. Ninguna factura quedó con un estado incorrecto persistente.

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
  ajusta el redondeo). Tab `cuotas` (sidebar Finanzas): KPIs, tarjetas por plan con estilo propio
  (`.nxFin*`, v48.8 — barra de progreso + 4 estados AL DÍA/POR VENCER/VENCIDO/SALDADO, antes prestaba
  el CSS de Clientes SaaS), **cobrar cuota** (`nxFinPagar`: marca cuota + inserta pos_abonos con
  caja_id si efectivo + salda el plan al completar), ver plan (`nxFinPlan`) y **ACUERDO DE PAGO
  imprimible** (`nxFinContrato` con calendario y firmas).
  **Mejoras arquitectónicas v48.9 (Nivel 1 de un roadmap más grande — ver análisis completo en el
  chat, no repetido aquí):** (1) **pago parcial de cuota** — tabla nueva `pos_fin_pagos` (ledger,
  org+trigger+RLS patrón POS) es la fuente de verdad; `pos_fin_cuotas.monto_pagado` (columna nueva)
  y `.pagado` son una CACHÉ recalculada por `resyncCuotasPagos()` cada vez que se carga o se registra
  un pago (mismo principio que `resyncEstadoFacturas` del seguro — nunca confiar en un booleano
  solo). `nxFinPagar` ahora deja el monto editable (prellenado con lo que falta de esa cuota, no el
  total) en vez de forzar a cobrarla completa. (2) **exposición de crédito unificada** — la ficha del
  cliente en POS (`nxPosCliVer`) ahora suma fiado + cuotas pendientes de TODOS sus planes activos en
  un solo número "Exposición total" (antes eran dos bolsillos de riesgo que nadie sumaba), con la
  lista de sus planes y acceso directo a cada uno. (3) las notificaciones de cuotas vencidas por
  WhatsApp YA EXISTÍAN (`renderAvisos`, Centro de Avisos) — no hubo que construirlas.
  **Nivel 2 — mora configurable (v48.10):** el dueño pidió mora pero dejó el % y los días de gracia a
  su propio criterio ("el % lo determino yo y los días de gracia"), así que se construyó como AJUSTE,
  no como valor fijo en código — mismo patrón que `prefijo_contado`/`prefijo_credito`. `pos_config`
  ganó `mora_pct`/`mora_dias_gracia` (default 0 = desactivada); sección nueva "Recargo por mora" en
  Ajustes (`nxPosGuardarMora`). `moraDeCuota(c)` calcula EN VIVO (nunca se guarda, mismo principio que
  `resyncEstadoFacturas`/`resyncCuotasPagos`): recargo ÚNICO (no acumula por día) sobre el monto de la
  cuota, solo si está vencida más allá del período de gracia. Se ve en la tarjeta de Cuotas (monto de
  la próxima cuota incluye mora), en `nxFinPlan` (cuota vencida muestra "+RD$X mora") y en el total
  "Por cobrar". `nxFinPagar`/`nxFinPagarGo` prellenan y validan contra pendiente+mora.
  **Nivel 2 — cartera vencida, aging 30/60/90 (v48.11):** botón "Cartera vencida (aging)" en Cuotas
  (`nxFinCarteraVencida`, solo visible si hay cuotas vencidas), mismo patrón imprimible que
  `nxPosEstadoCuenta`/`nxFinContrato` (`window.open`+`document.write`). Recorre las cuotas vencidas de
  planes activos, clasifica cada una en tramo 1-30/31-60/61-90/90+ según días de atraso (calculado en
  vivo contra `hoyISOPos()`, igual que `moraDeCuota`), incluye la mora de cada cuota en su total, y
  muestra KPIs por tramo + detalle línea por línea (cliente/plan/cuota/vencimiento/días/pendiente/
  mora/total). Verificado con datos simulados (5 escenarios: 3 tramos distintos, pago parcial, cuota
  dentro del período de gracia sin mora) — clasificación de tramos y exclusión de pagadas/no-vencidas
  correctas. **NIVEL 2 CERRADO** (12-jul-2026): "vincular financiamiento al IMEI" se descartó — el
  dueño aclaró que NO financia celulares (el módulo de Cuotas se usa para otro tipo de mercancía), así
  que esa pieza no aplica a su negocio real. No construir salvo que lo pida a futuro.
  **Pendiente del roadmap más grande** (Nivel 3, no urgente, sin pedir aún): refinanciamiento, límite
  de crédito con bloqueo automático, fiador/codeudor, historial de comportamiento de pago.
  **AUDITORÍA A FONDO (12-jul-2026) + bug crítico arreglado (v48.12):** el dueño pidió auditar el
  módulo a fondo. Se encontró 1 bug crítico y 1 importante, y se confirmó que el resto (pago parcial,
  redondeo de cuotas, orden forzado de pago, RLS/aislamiento por org, Centro de Avisos enganchado de
  verdad) está sano — sin hallazgos del linter de seguridad de Supabase para estas 3 tablas.
  - **CRÍTICO, ARREGLADO:** anular una venta financiada con cuotas YA cobradas revertía la Cuenta por
    Cobrar por el monto financiado COMPLETO (como si nada se hubiera pagado), aunque cada cobro de
    cuota ya había descontado su parte de esa misma cuenta cuota por cuota — dejaba 1103 sobre-
    acreditada y el dinero ya cobrado sin ningún rastro de que había que devolverlo. `nxPosAnularVenta`
    ahora: (1) calcula cuánto se cobró ya en cuotas ANTES de tocar nada (suma real de `pos_fin_pagos`,
    no un campo que se pueda quedar pegado); (2) avisa al cajero con el monto exacto antes de
    confirmar la anulación ("ese dinero hay que devolvérselo, el sistema no lo hace solo" — es
    decisión del dueño si es efectivo o nota de crédito, no se asume); (3) el asiento de reversión
    solo acredita 1103 por lo que de verdad seguía pendiente (`credito_monto - totalPagadoCuotas`), y
    trata lo ya cobrado igual que el pago inicial (sale de Caja, mismo criterio que ya usaba el código
    para la porción pagada al contado); (4) `logAudit('POS_FINANCIAMIENTO_CANCELADO', ...)` nuevo con
    el monto pendiente de devolver — antes cancelar un plan no dejaba ningún rastro de auditoría. Se
    verificó a mano con partida doble completa (3 asientos: venta financiada → cobro de cuota →
    anulación) que Debe=Haber cuadra y que 1103/Caja quedan en cero neto, no con saldos fantasma.
    Efecto colateral corregido de paso: un plan cancelado ya no se muestra como "VENCIDO" en la lista
    de Cuotas (badge/estado `CANCELADO` nuevo, `.nxFinCard.cancelado`).
  - **IMPORTANTE, ARREGLADO (v48.13):** la mora cobrada se mezclaba dentro del abono a Cuentas por
    Cobrar sin reconocerse nunca como ingreso — se cobraba bien en efectivo pero contablemente no
    había forma de saber cuánto se había cobrado de mora en total. Cuenta nueva `4103 "Ingresos por
    mora"` en `PLAN_BASE` (fallback a `4102 Otros ingresos` si la org no ha resembrado su plan de
    cuentas, mismo patrón que `2105` en A5). `postAsientoAbono` ganó un 6to parámetro opcional
    `moraMonto` que separa el asiento en dos créditos (CxC por el principal + 4103 por la mora) en
    vez de uno solo. `nxFinPagarGo` calcula `moraPagada` = la mora se cobra DESPUÉS de cubrir el
    principal de la cuota (si el pago no alcanza a cubrir el principal, no se reconoce mora todavía
    en ese pago — evita reconocer ingreso de mora antes de tiempo). Para ver el total cobrado de
    mora en cualquier período: Contabilidad → Libro Mayor → cuenta 4103. Verificado a mano con 3
    escenarios (mora cobrada completa, pago parcial que no alcanza a cubrir la mora, pago que
    completa un saldo previo más la mora) — partida doble cuadra en los tres.
  - **Gaps de nivel "pro" identificados, sin construir:** (1) no se puede editar/renegociar un plan ya
    creado (solo cancelar todo); (2) sin límite de crédito ni bloqueo automático a un cliente que ya
    está en mora; (3) sin manera de marcar un plan como "incobrable"/dado de baja (solo activo/
    saldado/cancelado); (4) sin reporte histórico (total financiado por mes, mora cobrada acumulada).
  - **REDISEÑO PREMIUM (v48.16, "quiero como más moderno"):** la pestaña Cuotas se rediseñó por
    completo, estilo ERP (Odoo/Zoho/Salesforce Financial), a pedido explícito del dueño con un brief
    detallado + mockup de referencia. **Decisiones confirmadas explícitamente con el dueño antes de
    construir** (4 preguntas, por conflictos reales con reglas ya establecidas): (1) se queda dentro
    del POS de siempre, NO es una app aparte con su propio header/menú inferior (el mockup traía eso,
    se descartó); (2) usa **morado** como color principal — excepción deliberada al azul índigo del
    resto del POS; (3) usa **Plus Jakarta Sans** — excepción deliberada a la fuente única del sistema
    (Segoe UI, decretada en v48.1); ambas excepciones cargadas/aplicadas SOLO dentro de `.nxFP` (el
    contenedor de este módulo), sin tocar nada fuera; (4) NO se le puso buscador en la barra superior
    (el dueño acababa de pedir quitarlo del sistema completo, v48.15 — habría sido contradictorio).
    Estructura: tarjeta `.nxFP-hero` (resumen: total por cobrar + prestado/cobrado/vencido/clientes
    activos, todo real de `_fins`/`_finPagos`), accesos rápidos (`.nxFP-quick`), pestañas de estado
    con contador (`.nxFP-tabs`, `_finFiltro`), buscador local (`.nxFP-searchRow`, usa `posBuscador`/
    `nxBuscaHTML` como manda el reglamento — NO es el buscador global que se quitó), tarjetas de
    préstamo (`.nxFP-card`, avatar de iniciales con color determinístico) y panel de indicadores del
    mes (`.nxFP-dash`). **5 estados reales, no 3:** se agregó una distinción nueva "VENCIDO" (atrasado
    pero aún dentro del período de gracia de la mora) vs **"EN MORA"** (atrasado más allá de la gracia,
    ya generando recargo) — antes solo existía un genérico "vencido"; ambos calculados en vivo con
    `moraDeCuota`/`diasAtraso`, cero campos nuevos. **"REF: PR-XXXXXX"** del mockup NO es un
    consecutivo real (`pos_financiamientos` no tiene numeración propia y no se le agregó una para no
    tocar lógica/esquema) — se deriva del `id` del plan solo para la pantalla. El "+12.5% vs mes
    anterior" del mockup tampoco se copió tal cual (no hay forma de saber el saldo pendiente de hace
    un mes, no se guarda ese historial) — se reemplazó por una comparación real y calculable: cobrado
    este mes vs. cobrado el mes pasado (de `pos_fin_pagos`, que si tiene fecha). **Excel** (botón
    nuevo, real): exporta a CSV la lista visible, 100% del lado del navegador, sin tocar Supabase.
    **Nuevo préstamo** navega a Factura con un aviso (no existe alta directa de un plan — solo se
    crean al cobrar una venta marcando "Financiar en cuotas"). **Cobranza** filtra a Vencidos.
    **Reporte** abre `nxFinCarteraVencida` (ya existía). **Configuración** salta a Ajustes → mora.
    Las funciones existentes (`nxFinPlan`, `nxFinPagar`, `nxFinPagarGo`, `nxFinContrato`,
    `nxFinCarteraVencida`) **no se tocaron** — solo el render/CSS/helpers alrededor. Cero queries
    nuevas (reusa `_fins`/`_finCuotas`/`_finPagos`/`_clientes` ya cargados en `cargarPOS`), cero
    cambios de RLS/`organizacion_id`. **Nota sobre el proceso:** el dueño mandó un mockup + código de
    otra IA (HTML/CSS/JS de un módulo "Financiamiento PRO" standalone, con datos 100% de demo/mentira
    y el mismo header/buscador/menú inferior ya descartados) pidiendo usarlo "solo como plantilla
    visual" — se auditó, se descartó como base (no conectado a datos reales, reabría decisiones ya
    cerradas) y solo se rescató una idea real y útil: el estado vacío con ícono + botón "Nuevo
    préstamo" (`.nxFP-empty`), que no existía antes. Verificado con capturas Playwright del código
    real (no una reconstrucción) en 390px/430px/tablet(820px)/escritorio(1400px), sin desbordes.
    **Publicado primero en rama aparte** (no directo a `main`, a pedido del dueño) para revisión antes
    de fusionar — ver rama `claude/fin-cuotas-premium`.
    **CORRECCIÓN IMPORTANTE:** este rediseño (v48.16) se hizo por un malentendido — el brief/mockup del
    dueño era en realidad para OTRO módulo, "Financiamiento" dentro de Multiempresa (`nxAbrirPrestamos`,
    tablas `prestamos`/`prestamo_pagos`, préstamos a personas que NO son clientes del seguro), NO para
    Cuotas del POS. El dueño decidió DEJAR este rediseño de Cuotas como está (mejora extra, aunque no
    era lo pedido) y pidió aplicar el mismo tratamiento al módulo correcto — ver v48.17 más abajo, en
    la sección de Préstamos/Financiamiento (Multiempresa).

### Préstamos / "Financiamiento" (Multiempresa) — REDISEÑO PREMIUM v48.17
Módulo DISTINTO al Cuotas del POS de arriba (no confundir): `window.nxAbrirPrestamos()`, registrado en
el hub Multiempresa (`nxMERegistrar`, orden 1, "Financiamiento"), tablas `prestamos`/`prestamo_pagos`/
`prestamos_config` (RLS solo-admin vía `mi_rol()`, sin `organizacion_id` — herramienta de un solo
dueño, no multi-tenant como el POS). Son préstamos a personas que NO son clientes del seguro, en 3
modos: `credito` (línea revolvente con interés mensual sobre saldo), `cuotas` (cuotas fijas tipo
amortización), `libre` (abonos libres contra un total fijo).
- **Se le aplicó el mismo tratamiento visual premium** que ya tenía Cuotas del POS (`.nxFP-*`, morado,
  Plus Jakarta Sans) — el CSS/fuente se **compartieron** entre los dos módulos: se extrajo a una
  función nueva `window.nxFPEnsureCSS()` (patrón `nxBuscaEnsureCSS` del reglamento de buscadores —
  idempotente, expuesta en `window`, se llama desde ambos módulos por si uno se abre sin que el otro
  haya cargado antes) en vez de duplicar el CSS dentro de cada uno.
- **Diferencia real con Cuotas del POS — solo 3 estados, no 5:** este módulo NO tiene concepto de mora/
  período de gracia ni de cancelación (no hay flujo para cancelar un préstamo aquí) — así que
  `prEstadoInfo()` solo devuelve `activo`/`vencido`/`pagado`. Se dejó así a propósito, sin inventar
  "EN MORA"/"CANCELADO" solo para parecerse al otro módulo (principio de no fabricar datos que no
  existen).
- **Reusa TODAS las funciones que ya existían**, sin duplicar lógica ni consultas: "Nuevo préstamo" →
  `nxPrestamoNuevo()`, "Ver detalle"/tocar la tarjeta → `nxPrestamoVer(id)`, "Estado de cuenta" →
  `nxPrestamoEstadoCuenta(id)`, "WhatsApp" → `nxPrestamoWA(id)`, "Excel" → `nxPrestamoExportar()` (ya
  existía, exportación CSV real), "Configuración" → `nxPrestamoConfig()` (datos del contrato/legal).
  Los filtros de estado/tipo (`nxPrestamoFiltroTipo`) y el buscador en vivo (`nxPrestamoFiltrar`, basado
  en `data-busca` sobre `.nxPrCard` dentro de `#nxPrLista`) tampoco se tocaron — solo cambió el HTML/CSS
  que pintan `cardHTML(p)`/`renderLista(view)`, no su lógica de filtrado.
- **2 acciones nuevas, chicas y reales:** "Cobranza" (`window.nxPrestamoCobranza`, solo filtra a
  Vencidos) y "Reporte" (`window.nxPrestamoReporte`, cartera vencida imprimible ordenada por días de
  atraso — mismo patrón que `nxFinCarteraVencida` del POS). Menú "..." nuevo por tarjeta
  (`window.nxPrMenu`/`nxPrMenuGo`).
- Cero cambios de RLS/esquema — mismas 3 tablas, mismo `mi_rol()`. Verificado con `node --check
  parches.js` limpio y capturas Playwright del código real (no reconstruido) a 390px/430px/tablet(820px)/
  escritorio(1400px), sin desbordes. **Publicado primero en rama aparte** (`claude/prestamos-premium`)
  para revisión antes de fusionar a `main`, mismo criterio que el ciclo anterior.
  **2 hotfixes reales, publicados directo a `main` tras confirmarse en vivo:** **v48.18** — el
  rediseño había borrado por accidente la función `kpi()` que `nxPrestamoVer` (el detalle, con el
  botón Cobrar) todavía necesitaba para pintar sus recuadros — sin ella la ventana entera tiraba error
  al abrir, así que ningún botón de ahí adentro respondía; repuesta en el mismo módulo (patrón "helper
  faltante en el scope del IIFE", igual que `moneyVal` en el POS v42.5 — al borrar/mover código
  siempre hay que buscar OTROS usos del mismo helper en el archivo, no solo donde se editó). **v48.19**
  — "Nombre del acreedor" (Configuración → datos del contrato) parecía no guardar; la causa real:
  `nxPrestamoGuardarConfig` hacía un PATCH y, si no encontraba fila, un POST de respaldo con el error
  **silenciado** (`catch(e){}` vacío) — si ese segundo paso fallaba por lo que fuera, el toast decía
  "Guardado" sin haber escrito nada. Cambiado a un UPSERT atómico (`POST .../prestamos_config?
  on_conflict=id` + `Prefer:resolution=merge-duplicates`, la tabla es de una sola fila con
  `id integer primary key check(id=1)`) — un solo paso, sin ambigüedad; cualquier fallo real ahora se
  muestra como error. Verificado con un UPSERT de prueba en una transacción con `rollback` (Supabase
  MCP) antes de confiar en el cambio.
  **v48.20 — formulario "Nuevo/Editar préstamo" con el mismo look premium:** el dueño mandó un mockup
  (imagen) de un formulario con secciones numeradas 1-5 + tarjetas de resumen + tabla de vista previa
  de cuotas. Aplicado a `abrirForm(pr)`/`window.nxPrRecalc` (mismos IDs de campo de siempre, mismo
  `nxPrestamoGuardar` sin tocar): secciones numeradas (`prSec()`, insignia morada), "Resumen del
  préstamo" ahora son tarjetas (reusa el `kpi()` ya restaurado en v48.18) en vez de un cuadro de texto,
  y "Vista previa de cuotas" NUEVA — primeras 3 filas de la tabla de amortización EN VIVO mientras se
  llena el formulario (mismas `amortizar()`/`creditoCalc()` que ya usa `nxPrestamoVer`, con un préstamo
  "fantasma" `id:'__preview__'` que no choca con ningún préstamo real — `creditoCalc` cae a "sin pagos"
  para ese id, correcto para uno nuevo, aproximado al editar uno con pagos ya hechos, pero es solo una
  vista previa, el detalle real después de guardar sigue siendo la fuente de verdad). Contador de
  caracteres en Notas (0/500, cosmético). **Deliberadamente NO se copiaron 4 piezas del mockup por no
  existir de verdad:** campo de correo electrónico, campo "día de pago" fijo, los 3 interruptores
  (pagos anticipados/recordatorios/reporte de buró), y la nota de "los pagos fuera de fecha generan
  mora" (este módulo, a diferencia de Cuotas del POS, NO calcula mora — ver más arriba). El panel
  "Cómo funciona" del formulario dice solo hechos reales del sistema. Verificado con Playwright cargando
  el **código real del módulo dentro de un navegador de verdad** (no una reconstrucción a mano ni stubs
  de DOM en Node) — la ventaja de este método es que ejecuta `abrirForm`/`nxPrRecalc`/`pintarModo` tal
  cual están en el archivo, con datos simulados servidos por un `window.API.get` de prueba, capturando
  también el estado con scroll (la sección 4 y 5 no caben completas en 390px de alto sin desplazar el
  modal — comportamiento esperado, mismo patrón que `nxPrestamoConfig`).
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
- **Buscadores unificados:** combo, tabla Productos (`nxProdTablaBuscar`), kanban Reparaciones
  (`nxRepBuscar`), prefacturas. Migrados de `.nxLupaBox` propio a `nxBuscaHTML` (componente
  global) en v47.8 — ver sección "REGLAMENTO GLOBAL DE BUSCADORES" más arriba para el detalle.
  PENDIENTE: selector de CLIENTE en cobro/factura sigue siendo `<select>` — necesita buscador
  (cirugía delicada: re-precia carrito).
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

### Skills de diseño instaladas + auditoría Login/Factura (12-jul-2026, v48.14)
Se instalaron 2 skills de diseño nuevas en el repo (`.agents/skills/` + enlace en `.claude/skills/`,
mismo patrón que `ui-ux-pro-max`/`emil-design-eng` que ya existían): **`frontend-design`** (oficial de
Anthropic, guía de dirección estética) y **`web-design-guidelines`** (oficial de Vercel, audita código
de UI contra sus Web Interface Guidelines — accesibilidad, foco, formularios, animación, etc., las
trae frescas de GitHub en cada uso). **`huashu-design`** (alchaincyf/huashu-design) se descartó por
ahora — no es solo texto, trae scripts de Node/paquete npm real para exportar video, y el entorno de
sesiones remotas bloquea instalar/ejecutar paquetes de terceros por seguridad; si se quiere, el dueño
lo instala él mismo con `npx -y skills add alchaincyf/huashu-design --skill huashu-design --agent
claude-code` desde su propia terminal.
Con esas 2 skills se auditaron **Login** (`index.html`) y **Factura del POS** (`parches.js`) — 10
hallazgos reales, todos corregidos en v48.14: zoom deshabilitado en TODA la app
(`maximum-scale=1.0` en el viewport — quitado), labels de Usuario/Contraseña/Cliente/Fecha/etc. no
conectados al campo (`for=`/`<label>` real agregado), botón mostrar/ocultar contraseña sin
`aria-label`, error de login sin `aria-live="polite"`, el logo del login tenía `cursor:pointer`
muerto (sin handler, se quitó), varios `<input>` de Factura con letra <16px causaban zoom automático
en iPhone (buscador/fecha/precio/descuento/número de factura, subidos a 16px — mismo bug que ya se
había arreglado en los `<select>` en junio v47.9, ahora en `<input>`), las lupas de
"Ver prefacturas"/"Ver todas las facturas" eran `<i onclick>` sin teclado ni `aria-label` (ahora
`<button>` real con clase `.nx-inv-iconbtn`), botones +/− de cantidad y la X de borrar línea sin
`aria-label`. **El indicador de pasos "Cliente → Productos → Pago → Confirmar" de Factura era
decorativo** (los dos primeros siempre marcados ✓ sin importar nada) — ahora es real: función
`facStepsHTML()` (se repinta también dentro de `pintarFactura()` para quedar en vivo) calcula
`cliOn=!!_factCli`, `prodOn=_cart.length>0`, `pagoOn=prodOn` y marca cada paso según corresponda.
**Rediseño del Login** (a pedido del dueño, "quiero como más moderno"): se quitaron las 4 manchas de
color flotantes animadas (`.lx-bg`), el `backdrop-filter` (cristal difuminado) y el brillo animado del
botón (`lbtnShine`) — todo eso es el "look genérico de plantilla de IA" que ya se había identificado
como problema en el propio sistema (ver "Repintado visual — fondo BLANCO + sombras negras" v38.8-39.2,
donde el dueño pidió quitar el morado del POS; el login usaba morado `#8b5cf6`/`#6d28d9` y no se había
tocado en esa pasada). Ahora: fondo `radial-gradient` navy sólido (sin blobs), tarjeta `.lbox` blanca
sólida con sombra real (sin blur), logo/botón en degradado navy→azul `#1e3a6e→#2563eb` (mismo acento
que el POS), foco de los campos en azul en vez de morado. Verificado con capturas Playwright reales
(código extraído verbatim del archivo, no una reconstrucción) en 390px y 1280px antes de publicar.
**Seguimiento v48.15 — quitado el buscador de la barra superior:** el dueño mandó captura de iPhone
mostrando el buscador chiquito (`.tn-sr`/`#gSearchIn`) apretado entre el menú ☰ y los íconos de la
derecha, pidió quitarlo (confirmó que fuera de todo el sistema, no solo el celular). Se quitó el div
del header (`index.html`), el CSS `.tn-sr` (index.html y las reglas móviles en `parches.js`), la
función `gSearch()` (solo la usaba ese input) y una IIFE completa que ya no tenía propósito
("ARREGLO DEL BUSCADOR EN MÓVIL" — abría la búsqueda global al tocar ese input, que ya no existe).
La búsqueda global de pantalla completa (`gsOverlay`/`abrirGlobalSearch`) sigue intacta: botón de
lupa junto a la campana + atajo Ctrl+K, sin cambios.

### Iconos 3D en el Dashboard/Inicio (v48.21)
El dueño mandó una hoja de iconos 3D (cristal, generada por él en ChatGPT a partir de un prompt que
le armamos) con 18 conceptos para un rediseño tipo "Apple + Odoo + Salesforce". Se auditó cuáles de
esos 18 correspondían a algo REAL en el Dashboard de Seguros (`.qa-g`, los 6 accesos rápidos que ya
existían: Facturas/Clientes/Detalles de Cobro/Facturas Pendientes/Reporte DGII/Exportar Excel) —
solo esos 6 se aplicaron; los otros 12 (Solicitudes, Consultar Cobertura, Mis Cuentas, Nexus Smart
IA, Contabilidad, Tabla Comparativa, Multiempresa...) no tienen un botón real en esta pantalla hoy,
así que NO se inventaron accesos nuevos para ellos — quedan disponibles si el dueño los pide después.
Los 6 iconos se recortaron de la hoja original (Python/Pillow), se guardaron como PNG en
`dash-icons/` (nombre por archivo: `facturas.png`, `clientes.png`, `detalles-cobro.png`,
`facturas-pendientes.png`, `reporte-dgii.png`, `exportar-excel.png`) y reemplazan el `<i class="ti
...">` de cada tile por un `<img class="qa-ico3d">` — el `onclick`/función de cada botón NO cambió,
solo el icono. CSS nueva: `.qa-ico3d{width:34px;height:34px;object-fit:contain}`.

**REVERTIDO v48.24:** el dueño no quedó contento con el resultado visual — se volvió a los iconos
Tabler de siempre (`<i class="ti ti-file-invoice qa-ico c-azul">` etc., los mismos 6 con su color por
tarjeta). El código vuelve a index.html idéntico a antes de v48.21; los `.png` de `dash-icons/`
quedan en el repo sin usar (no se borraron, no se pidió). Si se retoma un rediseño de iconos del
Dashboard más adelante, no reusar directo esta hoja sin antes mostrarle una muestra al dueño.

### POS · Productos — actualizar precios de todo el catálogo por CSV (v48.26)
Inspirado en revisar competidores (Púrpura Datos, POSMOVI): el dueño pidió la función de "subir un
archivo con los precios y que se actualicen junto con el POS", que ninguno de los dos importadores
que ya existían cubría (`nxPosImportarUI`/`nxPosImportarRun` solo pega el JSON de Infoplus, agrega
productos NUEVOS y siempre deja precio/costo en 0 — nunca toca productos existentes).
- **El modal de "Importar" (Productos) ahora tiene 2 modos** (`_impModo`, botones arriba del modal):
  "Agregar nuevos" (el de siempre, sin cambios) y **"Actualizar precios (CSV)"** (nuevo).
- **CSV con columna `codigo` obligatoria** (encabezados reconocidos sin importar mayúsculas/acentos:
  `codigo`/`código`/`code`/`sku`) + las columnas que se quieran actualizar: `precio`, `precio_mayor`
  (Precio 2/por mayor), `costo`, `stock` — todas opcionales, si una columna no viene en el CSV ese
  campo del producto **no se toca** (no se pisa con 0 ni se borra). Si el código NO existe en el
  catálogo pero la fila trae `nombre`, se crea como producto nuevo (igual que "Nuevo producto" pero
  en lote); si no trae nombre, se cuenta como "sin coincidencia" y se salta.
  - **Delimitador autodetectado** (`,` o `;` — Excel en español/RD suele exportar CSV con `;` porque
    usa `,` como separador decimal), soporta campos entre comillas con comas dentro.
  - **Montos leídos con la misma lógica de `nxMoney.parse`** (reimplementada standalone en
    `parseCSVGenerico`'s caller vía `window.nxMoney.parse`) — respeta la notación RD ("1.500" = mil
    quinientos), no `parseFloat` crudo.
  - Botón **"Descargar plantilla de ejemplo"** (CSV con 2 filas de muestra) para que el dueño no
    tenga que adivinar el formato exacto.
  - Actualiza en lotes de 15 en paralelo (`PATCH` por producto, cada uno con `id` distinto — no hay
    `UPSERT` posible sin una constraint única en `codigo`, que no existe, así que es PATCH individual
    por fila emparejada) + los nuevos en un solo `POST` en bloque (igual que el importador de
    Infoplus). Toast final con el resumen: actualizados / creados / sin código / sin coincidencia.
  - No toca RLS ni esquema — usa la tabla `pos_productos` ya existente. `node --check parches.js`
    limpio; el parser CSV (delimitador + comillas) se verificó con el código real extraído del
    archivo (no una reconstrucción), casos: coma con campo entre comillas, punto y coma, precio en
    notación RD.

### NEXUS PRO X 2026 — rediseño del POS, FASE 1: formulario de producto + niveles de precio (v48.27)
El dueño pidió un rediseño premium del POS estilo Stripe/Linear/Apple/ERPNext, inspirado en revisar
Púrpura Datos y POSMOVI. Por el tamaño (reemplazaría el shell completo del POS que usan Bayolsale/
BayolCell en producción AHORA MISMO), se acordó construir **primero una muestra visual aparte**
(ver más abajo) y aprobarla antes de tocar nada real — y entregar la parte real **por fases**, no
todo de golpe (así lo prefiere siempre el dueño).
- **Fase 1 (HECHA y en vivo):** el formulario real de "Nuevo/Editar producto" en Productos (POS) se
  rediseñó con el mismo look de la muestra — tarjetas separadas (Información, Precios, Inventario y
  reglas, Niveles de precio) + panel de resumen que se actualiza en vivo. Excepción de marca deliberada
  SOLO en este formulario (mismo criterio que Cuotas/Financiamiento premium): Plus Jakarta Sans +
  paleta azul/blanco/gris/verde, con namespace CSS propio `.nxPf` (`nxPfEnsureCSS()`, inyecta el CSS +
  el link de Google Fonts una sola vez, patrón `nxBuscaEnsureCSS`/`nxFPEnsureCSS`).
- **"Código de barras" = el mismo código de creación del artículo** (pedido explícito del dueño): NO
  se agregó una columna nueva — el campo reusa el `codigo` de siempre (`pos_productos.codigo`, el mismo
  que ya existía como "Código / barra"), solo se relabeló para que quede claro que es uno solo.
- **Niveles de precio ilimitados (pedido explícito del dueño, "habilitar la opción de creación de
  niveles de precios") — la pieza nueva real de esta fase:** antes el sistema solo tenía 2 precios fijos
  (`precio`=final, `precio_mayor`=por mayor). Tablas nuevas **`pos_niveles_precio`** (nombre, orden,
  es_default, org+trigger+RLS patrón POS) y **`pos_producto_niveles`** (producto_id+nivel_id → precio_
  contado/precio_credito/precio_minimo propios, unique por org+producto+nivel). Se puede crear cuantos
  niveles se quiera (Detalle, Mayorista, Distribuidor, VIP...) desde la Card 5 del formulario de
  producto, y cada producto tiene su propio precio por nivel (tabla editable inline, guarda con PATCH/
  POST por fila). **Aditivo, no reemplaza nada por debajo:** `precio`/`precio_mayor`/`nivel_precio`
  ('final'|'mayor') de siempre se quedan intactos como respaldo — `precioCli()` primero busca si el
  cliente tiene un `nivel_id` asignado y existe un precio configurado para ese producto+nivel; si no,
  cae exactamente al comportamiento de siempre (cero riesgo de romper el cobro en vivo si algo no está
  configurado). `pos_clientes` ganó la columna `nivel_id` (nullable). Siembra perezosa
  (`nxNivelesInit()`, patrón `nxSecInit`/`nxAccesoInit`/`nxAlmInit`): la primera vez que se edita un
  producto en una organización sin niveles, se crean automáticamente "Detalle" (es_default) y
  "Mayorista", y se copian los precios existentes de TODOS los productos a esos 2 niveles (para no
  arrancar en blanco). El selector "Nivel de precio (cliente)" en Entidades ahora lista los niveles
  reales de la organización (si ya existen) en vez de los 2 fijos de antes.
- **Deliberadamente NO se construyó en esta fase** (no estaba en el pedido explícito, se habría
  necesitado esquema nuevo sin que el dueño lo pidiera): "Promociones programadas" por producto — la
  tarjeta se ve en el formulario pero el interruptor está deshabilitado con la nota "Próximamente", en
  vez de fingir una función que no existe. "Cantidad mínima"/"Crédito %"/"Crédito $"/"Precio anterior"/
  "% Descuento" del brief original tampoco se agregaron como columnas nuevas — Card 3 se re-diseñó
  reusando SOLO los campos reales que ya existían (stock, stock mínimo, garantía, ITBIS, serial,
  descuento permitido).
- **Verificado con el código real** (no una reconstrucción): se extrajo `abrirProd`/`nxPfNivelesTabla`/
  `nxPfNivelGuardar`/`nxPfNivelNuevo`/`precioCli` tal cual del archivo y se cargaron en un navegador con
  datos simulados — el campo de código carga el valor real, la tabla de niveles trae los precios
  correctos desde `_prodNiveles`, crear un nivel nuevo dispara el `POST` correcto a
  `pos_niveles_precio`, guardar el precio de un nivel dispara el `PATCH` correcto a
  `pos_producto_niveles` con los 3 campos, y el resumen de la derecha se actualiza en vivo al escribir.
  Sin desbordes en 390px ni en escritorio. `get_advisors` sin hallazgos nuevos en las 2 tablas.

- **Fase 2, EN PROGRESO (v48.28) — Vender catálogo en lista, HECHO; Factura y carrito, PENDIENTE:**
  el dueño pidió publicar las fases 2 y 3 de una vez ("Sí, publica todo las dos fase"), pero al leer
  el código real de Vender/Factura se descubrió que es MUCHO más grande y arriesgado que lo que
  modelaba la muestra simplificada — el sistema real usa un patrón de "ventanilla" (el catálogo abre
  un panel expandible en el mismo lugar para elegir precio/IMEI, `nxProdPicker`/`ppkDetailHTML`),
  más un buscador flotante aparte con el mismo patrón, y Factura tiene selector de cliente + NCF +
  número de factura + tabla con descuento editable por línea + atajos de teclado + flujo de
  prefactura — nada de eso estaba en la muestra. Se le explicó esto al dueño y se le preguntó cómo
  seguir; eligió **"Reconstrucción completa a lista"**, con el entendido explícito de que necesita
  **varias sesiones y pruebas exhaustivas antes de publicar cada pieza** — no todo de un tirón.
  - **HECHO — catálogo de Vender (`gridHTML()`) convertido a lista**, quirúrgico: el `onclick`
    (`nxVenderSel`), el atributo `data-busca` (para `nxPosBuscar`) y la clase `.nxPosCard` se
    dejaron INTACTOS a propósito — solo cambió el HTML/CSS interno de cada fila (antes tarjeta,
    ahora fila con miniatura/nombre/categoría/stock con color/precio). Esto significa que la
    "ventanilla" de precio/IMEI, el buscador, los filtros por categoría y el carrito siguen
    funcionando exactamente igual — CERO líneas de la lógica de cobro se tocaron. En móvil angosto
    se oculta la columna de stock para no amontonar (nombre+precio solamente, igual accesible
    tocando el producto). Estilo premium `.nxPf` reusado (mismo namespace/paleta del formulario de
    producto de la Fase 1, `nxPfEnsureCSS()` ya se llama desde `renderVender()`).
  - **Verificado con el código real extraído** (`renderVender`/`gridHTML`/`nxPosCat`/`nxPosBuscar`/
    `nxVenderSel` tal cual del archivo, cargados en un navegador con datos simulados): filtro por
    categoría correcto, buscador filtra en vivo, clic en una fila sí llama a `nxProdPicker('vender')`
    (la ventanilla real), sin desbordes en 390px ni escritorio, 0 errores de JS.
  - **PENDIENTE de verdad (no completado, para no confundir con "Fase 2 lista"):** Factura
    (`renderFactura`, la tabla `nx-inv-table`, el resumen `facResumen`) y el panel de carrito de
    Vender (`pintarCarrito`) **NO se tocaron todavía** — siguen con su diseño de siempre (ya bastante
    premium de por sí, del rediseño Stitch v40.2-40.4 y el mockup BAYOL CELL aprobado antes). Se
    abordarán en incrementos separados, cada uno probado igual de a fondo antes de publicar, dado
    que ahí vive la lógica de cobro/NCF/crédito más sensible.
- **Fase 2, continuación (v48.29) — Factura: selector de cliente + comprobante fiscal:** mismo
  criterio quirúrgico que Vender. En `renderFactura()`: el `<select id="facCli">` se reemplazó por un
  botón + dropdown con buscador (`nxFacCliToggle`/`pintarFacCliDrop`/`nxFacCliFiltrar`/`nxFacCliPick`,
  filtra por nombre/código/cédula, patrón igual al buscador de cliente de la muestra); el
  `<select id="facNCF">` se reemplazó por chips (`nxFacNCFPick`). Ambos son wrappers NUEVOS que
  llaman a las funciones de siempre (`nxFacSetCli`/`nxFacSetNCF`, sin tocarlas) — se confirmó que
  esos dos ids no se leían desde ningún otro lugar del archivo antes de cambiarles el control. El
  resto de `renderFactura` (número de factura/NCF con buscador de facturas, checkbox de crédito,
  fecha, tabs de categoría, buscador de artículos, tabla, resumen, atajos de teclado) **no se tocó**.
  Verificado con el código real extraído (`renderFactura`+`inyectarCSS` del POS —hay que tener
  cuidado, HAY VARIAS FUNCIONES `inyectarCSS()` EN EL ARCHIVO, una por módulo/IIFE; el harness de
  prueba agarró por error la del principio del archivo la primera vez, no la del POS, hasta que se
  corrigió— cargados en un navegador real): el buscador de cliente filtra y al elegir actualiza
  `_factCli` + repinta el carrito con el precio del nivel correcto, los chips de NCF cambian
  `_facNCF` y su estado visual, sin desbordes en 390px ni escritorio, 0 errores de JS.
  **PENDIENTE:** la tabla de artículos (precio/cantidad/descuento por línea) y el resumen/modal de
  pago de Factura, más el panel de carrito de Vender — quedan para los próximos incrementos.
- **Fase 3 (sidebar para el resto de los ~16 módulos):** sin empezar todavía — depende de que la
  Fase 2 quede resuelta primero (comparten el mismo shell de navegación del POS).
- **Fase 1, continuación (v48.30) — formulario de precios por nivel IGUAL a Infoplus, "Productos"
  renombrado a "Inventario":** el dueño pidió explícitamente que el POS se viera **tal cual** una
  captura real que mandó de InfoplusWEB ("Nivel de Precio — Crear/Editar Nivel de Precio", no una
  interpretación) — mismos campos, mismos colores por card, misma tabla, mismo resumen, misma barra
  de botones, sin "botón 3D". Dos cambios:
  1. **Rename "Productos" → "Inventario"** en todo el POS (`MODULOS`, `shellTienda()` nav,
     `renderInicio()` tiles, mensajes vacíos de Vender/Factura). La pestaña VIEJA "Inventario"
     (kardex/valoración/ajuste) pasó a llamarse **"Kardex"** para no chocar — es la única función
     que no tenía análogo directo en la imagen del dueño, resuelta así y confirmada con él. Las
     claves internas (`productos`/`inventario`, `nxPosTab(...)`) NO cambiaron — solo las etiquetas
     visibles — así que ningún `onclick`/navegación existente se rompió.
  2. **`abrirProd()` (el formulario de artículo) reconstruido para calzar con la imagen de Infoplus:**
     nueva fila superior "NIVEL ACTUAL / ESTADO / FECHA" (`.topinfo`) bajo el encabezado. Card
     "Información del artículo" ganó un selector **"Nivel de precio a editar"** (`#ppNivelSel`,
     solo si el producto ya tiene niveles) — cambiarlo dispara `nxPfNivelCambio()`, que recarga
     Precios y una card NUEVA **"Reglas de Venta"** con los datos de ESE nivel específico (patrón
     Infoplus: un solo formulario nivel-scoped, no un precio fijo). Card "Precios" pasó a mostrar
     **Precio Lista** (global, `ppPre`) + **Precio Especial/Precio Contado/Precio Crédito**
     (por nivel, nuevos ids `ppNivEsp`/`ppNivCont`/`ppNivCred`) + Costo + 🔒Precio mínimo (global) +
     Precio 2/mayor (global, ahora etiquetado "respaldo" porque los niveles lo superan en la
     práctica pero se deja intacto por compatibilidad). Card "Reglas de Venta" (icono naranja,
     nueva) usa las **6 columnas que se agregaron a `pos_producto_niveles` en esta misma sesión**
     (`precio_especial`, `cantidad_minima`, `credito_pct`, `credito_monto`, `precio_anterior`,
     `descuento_pct` — antes existían en el esquema pero sin ninguna UI que las usara, ahora sí).
     Card "Niveles de precio" ganó buscador (`posBuscador`, reglamento de buscadores) y un
     **badge circular numerado** por nivel (azul = el nivel que estás editando ahora mismo, gris
     los demás) — igual que la tabla de Infoplus. Panel "Resumen" ganó imagen del producto (o
     ícono si no tiene), badge ACTIVO/INACTIVO, "Nivel actual", y las 4 filas de precio
     (Lista/Especial/Contado/Crédito) con chips de color, todas en vivo mientras escribes. **Barra
     de acciones con los 4 botones exactos de la imagen** (antes solo había 2): **Guardar** (verde
     sólido, guarda el producto Y el nivel seleccionado en un solo paso vía
     `nxPfGuardarNivelSiCorresponde()`), **Guardar y Nuevo** (azul sólido, nuevo — guarda y reabre
     el formulario en blanco, útil para cargar varios artículos seguidos), **Imprimir Etiqueta**
     (gris outline, nuevo — etiqueta imprimible honesta con nombre+código+precio; NO dibuja un
     código de barras falso que en realidad no escanearía, mismo criterio de "no fingir" del resto
     del sistema), **Cancelar** (rojo sólido, antes era outline). Todos los colores/badges nuevos
     viven en el mismo namespace `.nxPf` de siempre (variables `--pf-orange`/`--pf-purple` nuevas,
     con su variante de tema oscuro). **Deliberadamente NO se copiaron** los campos "Unidad" y
     "Localidad" de la imagen de Infoplus — el POS no tiene unidades de medida ni localidades
     (gap ya documentado en "Análisis POS vs Infoplus" arriba); agregarlos habría sido fingir una
     función que no existe. Verificado con el código real de `abrirProd`/`nxPfNivelCambio`/
     `nxPosGuardarProd`/`nxPfGuardarYNuevo`/`nxPfImprimirEtiqueta` extraído tal cual y cargado en un
     navegador con datos simulados (no una reconstrucción a mano): cambiar de nivel recarga los
     campos correctos, Guardar hace el PATCH correcto tanto a `pos_productos` como a
     `pos_producto_niveles` del nivel que estaba seleccionado al momento de guardar, la tabla de
     niveles resalta el nivel actual, y se ve completo sin desbordes en 390px/1280px.
  - **Seguimiento (v48.34) — ajuste visual pedido por el dueño tras comparar contra su captura de
    InfoplusWEB:** el dueño mandó 3 capturas reales (una del móvil, una de escritorio, una de la
    pantalla "Nivel de Precio") pidiendo confirmar si había quedado "exactamente así". Comparación
    honesta hecha con el código real renderizado en navegador vs las capturas: varias diferencias
    de fondo son intencionales (nuestro formulario edita producto+nivel en UNA pantalla, Infoplus
    usa dos; no fingimos Unidad/Localidad/Promociones porque no existen en el sistema) — el dueño
    confirmó que solo quería ajustar **la parte visual**, no esas diferencias funcionales. Dos
    cambios: (1) el header ahora pone el botón "Volver" como flecha circular y el título junto con
    la cajita "Nivel actual/Estado/Actualizado" en la MISMA fila (antes la cajita era una barra
    aparte de ancho completo debajo); (2) la card "Precios" pasó de cajitas-con-ícono a estilo
    plano (etiqueta de color arriba + campo con "$" abajo, sin caja ni ícono) — igual que la
    captura: Precio Lista en negro, Precio Especial en verde, Precio Contado en azul, Precio
    Crédito en morado. CSS nuevo `.preciosFlat`/`.inw .cur` en `nxPfEnsureCSS()`. Verificado
    comparando capturas lado a lado del código real contra las 3 imágenes del dueño — sin
    desbordes en 390px ni 1200px.
  - **Seguimiento (v48.42) — crear un nivel de precio nuevo en un solo paso:** antes, "Crear
    nivel" (tarjeta "Niveles de precio" del formulario de artículo) solo pedía el NOMBRE — el
    nivel se creaba vacío y había que ir fila por fila en la tabla de abajo para ponerle
    Contado/Crédito/Mínimo después (dos pasos separados). El dueño pidió ordenar ese flujo para
    que sea un solo paso. `nxPfNivelNuevo(prodId)` ahora lee también 3 inputs nuevos
    (`nxPfNivNuevoCont`/`nxPfNivNuevoCred`/`nxPfNivNuevoMin`, mismo `parseMoney` que el resto del
    formulario) y, si al menos uno trae valor, hace un segundo `POST` a `pos_producto_niveles`
    inmediatamente después de crear el nivel (mismo patrón que `nxPfNivelGuardar`) — el nivel
    aparece completo en la tabla sin un paso aparte. Si se dejan los 3 en blanco, el nivel se crea
    vacío igual que antes (no rompe el caso de "configurar los precios después"). HTML: el antiguo
    `<input>` de nombre + botón en una fila (`.nivnew` flex) pasó a un `.nivnewgrid` (grid 2
    columnas en móvil con el nombre ocupando la fila completa, 4 columnas en escritorio) con los 4
    campos etiquetados (`.fld`), y el botón "Crear nivel" (`.btn2`) quedó debajo, a todo lo ancho.
    Verificado con el código real (`abrirProd`/`nxPfNivelNuevo`/`nxPfNivelesTabla`) extraído y
    cargado en un navegador con un backend simulado: crear un nivel con precios manda un solo
    `POST` a `pos_niveles_precio` seguido de un `POST` a `pos_producto_niveles` con los 3 montos
    correctos, la tabla se repinta con el nivel nuevo ya con sus precios, el formulario se limpia,
    y no hay desbordes en 390px ni 1200px.
- **Fase 2, continuación (v48.31) — Vender: carrito con el look nuevo:** `pintarCarrito()`
  (panel `#posCartWrap`, a la derecha del catálogo de Vender) restilado al mismo lenguaje visual
  `.nxPf` que ya tenía el catálogo en lista — mismo patrón quirúrgico: los ids (`posCartWrap`) y
  TODOS los `onclick` (`nxPosQty`, `nxPosDel`, `nxPosVaciar`, `nxPosCobrar`) quedaron intactos,
  solo cambió el HTML/CSS interno. Clases CSS nuevas en `nxPfEnsureCSS()`: `.cartcard`/`.carthd`/
  `.cartlist`/`.cartitem`/`.citthumb`/`.citqty`/`.cittotal`/`.citdel`/`.carttotals`/`.cartrow`/
  `.cartpaytot`/`.cartcobrar`. El botón Cobrar reusa la clase `.ab.g1` (verde, la misma de las
  barras de acción del formulario de producto) en vez de un botón aparte. No hizo falta envolver
  el panel en otro `.nxPf` — `#posCartWrap` ya vive dentro del `<div class="nxPf nxPosGridWrap">`
  que `renderVender()` ya abría, así que las variables de color/fuente ya le llegaban heredadas.
  Verificado con el código real de `pintarCarrito`/`totales`/`gridHTML`/`renderVender` extraído tal
  cual (con stubs solo para helpers de dinero de línea que no hacían falta probar aquí,
  `lineBase`/`lineDescMonto`/`lineImporte`) y cargado en un navegador: los botones −/+ ajustan la
  cantidad y el total de la línea en vivo, sin desbordes en 390px ni escritorio.
- **Nota importante sobre Factura (NO requirió trabajo adicional):** al revisar `renderFactura()`
  para planear el resto de la Fase 2, se confirmó que la tabla de artículos y el resumen/modal de
  pago (`pintarFactura`, clases `nx-inv-*`, del rediseño premium ANTERIOR Stitch v40.2-40.4 +
  mockup BAYOL CELL ya aprobado) YA HEREDA el look nuevo — desde v48.29 `renderFactura()` envuelve
  todo su HTML en `<div class="nxPf nx-invoice-pro">`, y como `font-family` y el azul `#2563eb` de
  `.nx-inv-*` ya coinciden con la paleta de `.nxPf`, la tipografía Plus Jakarta Sans y el acento
  azul ya se aplican ahí sin tocar una sola línea de esas clases. Ya tiene precio/cantidad/
  descuento editables por línea (no hay que construirlos, ya existen). **No se rehizo** (habría
  sido riesgo innecesario sobre una pantalla de dinero ya aprobada, sin ganancia visual real) — si
  el dueño pide un día un cambio más profundo de layout ahí, sería aparte y con el mismo cuidado de
  siempre.
- **Fase 3 (v48.32) — barra lateral del POS en azul, HECHA (el resto de los módulos internos NO
  se tocó):** la barra lateral (`shellTienda()`, clases `.nxTSide`/`.nxTNav`/`.nxTBrand`/`.nxTLogo`/
  `.nxTAva`/`.nxTFoot`, hoy vive en `inyectarCSSTienda()`) pasó del gradiente índigo `#1b1f4d→
  #283593` (con acento `#6366f1`/`#4338ca`/`#818cf8`) al azul navy→azul `#1e3a6e→#2563eb` — el
  MISMO gradiente ya aprobado en el Login (v48.14, "mismo acento que el POS"). Cambio quirúrgico
  puramente de color (hex hardcodeados, mismo patrón que el swap de acento del v40.2): el HTML, la
  agrupación de secciones (Principal/Inventario/Personas y CRM/Finanzas/Sistema — coincide con los
  grupos de la muestra `muestra-pos-x2026.html`) y todos los `onclick` de navegación quedaron
  intactos. Había un bloque "BLINDAJE" aparte (`html body .nxTSide{...!important}`, para que la
  barra no saliera traslúcida bajo el tema glass) que también forzaba el índigo con `!important` —
  se actualizó igual, si no el blindaje hubiera pisado el color nuevo. **Deliberadamente NO
  tocado:** los íconos de cada módulo en el panel de Inicio (`renderInicio()`, `tile(...)`) y de
  cada KPI conservan su color propio (verde/naranja/cian/rojo/etc.) — es una regla ya establecida
  ("iconos de módulos conservan su color propio para distinguir de un vistazo"), tocar eso habría
  sido un error, no una mejora. Tampoco se tocó `.nxThSort` (acento índigo de encabezados
  ordenables, prefijo distinto `nxTh`, potencialmente compartido con otras pantallas — fuera de
  alcance) ni los colores decorativos por-tile de `renderInicio()`. **Alcance real de "Fase 3":**
  es el SHELL (barra lateral + topbar móvil + panel de Inicio), NO un rediseño de los ~15 módulos
  internos restantes (Compras, RRHH, Contabilidad, Reportes, CRM, etc. — esos siguen con su
  interfaz de siempre, sin tocar). Verificado con el código real de `inyectarCSS`/
  `inyectarCSSTienda`/`shellTienda`/`renderInicio` extraído tal cual y cargado en un navegador: el
  degradado nuevo se confirmó por `getComputedStyle` (no solo a ojo), los 23 botones de navegación
  siguen llamando a `nxPosTab(...)` correctamente, y no hay desbordes en 390px ni 1280px.
- **Orden lógico de campos, pedido a mano (v48.35):** el dueño mandó una foto de la Factura real en
  vivo (Bayolcell) pidiendo reordenar los campos de arriba "por lógica": el **número de factura va
  primero (arriba)**, y justo debajo el **Cliente con su buscador** — antes el Cliente salía primero
  y el número de factura más abajo. En `renderFactura()` (sirve Factura Y Prefactura, gateado por
  `esPreTab()`) se reordenó el HTML del grid `.nx-inv-info`: ahora es `numField` → Cliente → Tipo de
  comprobante → Fecha (antes Cliente → Tipo de comprobante → numField → Fecha). Cambio de ORDEN
  únicamente — ningún id, onclick ni lógica se tocó. Es el primer punto de una lista que el dueño
  está dando por partes ("vamos a ordenar por lógica") — pendiente confirmar si "Vender" también
  necesita este mismo campo (hoy Vender no tiene número de factura ni selector de cliente, es
  catálogo+carrito directo) y esperar los próximos puntos de su lista. Verificado con el código real
  de `renderFactura` extraído y cargado en un navegador: el orden de las 4 etiquetas se confirmó
  programáticamente (no solo a ojo), sin desbordes en 390px ni 1200px.
- **Vender: número de factura + cliente con buscador, y BUG real corregido de paso (v48.36):** el
  dueño confirmó que quería el mismo patrón de arriba (No. Factura + Cliente) también en Vender.
  `renderVender()` ganó una card nueva arriba del catálogo con "No. Factura" (preview de solo
  lectura, `proxNumeroFacturaCorto(false)`) y "Cliente" — este último REUSA literalmente los
  mismos ids/funciones de Factura (`facCliBtn`/`facCliDrop`/`facCliTxt`,
  `nxFacCliToggle`/`pintarFacCliDrop`/`nxFacCliPick`) en vez de duplicar el componente: es seguro
  porque Vender y Factura son pestañas mutuamente excluyentes (nunca están las dos en el DOM a la
  vez) y además YA COMPARTEN el mismo `_cart` (`nxPosTab` solo separa el carrito de Prefactura,
  Vender/Factura comparten uno solo) — compartir también `_factCli` es coherente con esa
  arquitectura ya existente, no una improvisación. **Bug real encontrado al construir esto:**
  `nxPosAdd` (el que de verdad agrega productos en Vender, vía la ventanilla `nxProdPicker`)
  usaba `Number(p.precio||0)` — el precio de lista crudo — en vez de `precioCli(p)`, así que
  Vender SIEMPRE cobraba precio normal sin importar el cliente elegido (solo Factura, con
  `nxFacAdd`, respetaba el nivel/precio por mayor). Corregido: `nxPosAdd` ahora usa `precioCli(p)`,
  y `gridHTML()` (la lista del catálogo) también muestra `precioCli(p)` en vez de `p.precio` para
  que el precio en pantalla ya sea el correcto antes de agregar. `nxFacSetCli` (se dispara al
  elegir cliente) ahora también llama a `pintarCarrito()` y repinta `#posGrid` — de forma segura,
  cada llamada se sale sola si su contenedor no existe en la pantalla actual. Verificado con el
  código real cargado en un navegador con 2 clientes de prueba (uno nivel normal, uno "por mayor"):
  elegir el cliente por mayor cambia el precio del catálogo Y del carrito al instante (de RD$45,000
  a RD$42,000 en la prueba), sin desbordes en 390px ni escritorio.
- **Factura: quitado el bloque de pago redundante (v48.37):** el dueño mandó 2 fotos — una del
  panel Resumen actual ("Detalle de pago" con 5 botones Efectivo/Tarjeta/Transferencia/
  Financiamiento/Nota de Crédito, cada uno "Registrar") y una de referencia de InfoplusWEB (pestaña
  "Forma de Pago", tabla compacta). Al revisar el código se confirmó que los 5 botones eran 100%
  redundantes — todos ejecutaban el mismo `onclick` (`window.nxFacFacturar()`/`nxPrefGuardar()`),
  o sea, cualquiera que tocaras abría la MISMA ventana "Cobrar" sin diferencia real. Se le
  preguntó al dueño si quería (a) solo quitar la lista redundante o (b) meter los montos de pago
  editables directo en el Resumen (como Infoplus, más grande/riesgoso porque mueve lógica de cobro
  real al panel principal) — eligió (a). En `pintarFactura()`: se eliminó el bloque `.nx-inv-paylist`
  completo (variables `metodos`/`payAction` también removidas, sin otro uso en la función); el
  panel ahora va de TOTAL directo a "Pendiente por cobrar" (renombrado de "Pendiente / Cambio",
  más claro) y el botón "Cobrar" de abajo sigue siendo el único paso real para pagar — sin cambio
  de lógica de cobro. Verificado con el código real de `pintarFactura`/`renderFactura` extraído y
  cargado en un navegador: el bloque ya no aparece, sin desbordes en 390px ni 1200px.
- **Factura/Prefactura: botón de lupa a la izquierda + checkbox simplificado (v48.39, puntos 2 y 3
  de la lista "ordenar por lógica"):** en el campo "No. Factura / NCF" (y "Prefactura No."), el
  botón de lupa (`window.nxFacHist()`/`window.nxPrefLista()`) pasó de estar DESPUÉS del número a
  estar ANTES (izquierda) — mismo `<button class="nx-inv-iconbtn">`, solo cambió su posición en el
  HTML. La casilla "A crédito (fiado)" quedó solo **"A crédito"** (confirmado con el dueño cuál de
  los dos términos dejar — el sistema usa "fiado" coloquialmente en casi todo el resto, pero para
  esta casilla específica el dueño prefirió el término formal). Cambio puramente de HTML/texto,
  ningún id/onclick/lógica se tocó. Verificado con el código real de `renderFactura` extraído y
  cargado en un navegador: el botón aparece primero en el DOM (izquierda), el texto del checkbox
  es el correcto, sin desbordes en 390px.
- **Factura/Prefactura: botones "Escanear IMEI"/"Código de Barras" quitados por redundantes
  (v48.40, punto 4 de la lista):** el dueño mandó una captura señalando que esos 2 botones (debajo
  del buscador de artículos) eran redundantes. Se confirmó en el código: `nxFacScan(kind)` solo
  hacía `document.getElementById('facBuscar').focus()` + cambiar el placeholder — cero diferencia
  real entre "IMEI" y "Código de Barras", y cero diferencia con simplemente tocar el buscador (que
  ya trae el placeholder "por nombre, código, IMEI, serial…" y ya recibe lo que escriba/escanee un
  lector USB/Bluetooth con solo estar enfocado). Se quitaron los 2 botones + la función `nxFacScan`
  completa (dead code). **Hallazgo de paso:** el pie de atajos de teclado (`.nx-inv-shortcuts`)
  anunciaba `Ctrl+B` (Código de barras), `F8` (Descuento), `F9` (Garantía) y `Alt+P` (Imprimir) —
  ninguno de los 4 estaba realmente conectado a ningún `keydown` en todo el archivo (solo existía
  el listener de `F2`/`F10`, ver `window.__nxInvKeys`). Como es la MISMA línea/función que se
  estaba limpiando, se quitaron los 4 atajos falsos también — el pie ahora solo anuncia `F2`
  (buscar) y `F10` (limpiar carrito), que sí funcionan. Aplica a Factura Y Prefactura porque
  comparten `renderFactura()`. Verificado con el código real extraído y cargado en un navegador:
  ni los botones ni los atajos falsos aparecen, sin errores de JS.
- **Factura/Prefactura: botón "Agregar producto" quitado por redundante (v48.41):** mismo patrón
  que el punto anterior — el dueño señaló que el botón "Agregar producto" (arriba del carrito,
  abría `window.nxProdPicker('factura')`, el catálogo completo) y el buscador de artículos que ya
  está justo encima llevan al mismo resultado. Se quitó el botón; el `.nx-inv-toolbar` pasó de 3 a
  2 columnas (`grid-template-columns:1fr 1fr 1fr` → `1fr 1fr`) para que "Prefacturas" y "Limpiar
  carrito" queden bien repartidos sin el hueco del tercero. `nxProdPicker` no se tocó (sigue
  usándose desde Vender al tocar un producto de la lista) — solo se quitó este acceso puntual
  duplicado. Verificado con el código real de `renderFactura`+`inyectarCSS` (POS) extraído y
  cargado en un navegador: quedan exactamente 2 botones, sin desbordes en 390px ni escritorio,
  0 errores de JS.

#### Fase 4 — módulos internos pendientes del rediseño, por tandas (19-jul-2026 en adelante)
El dueño pidió planear (con el método de "El Arquitecto", ver `/home/user/the-architect` — clon de
referencia fuera del repo, NO se mezcla con nexus-pro) el orden para aplicarle el look `.nxPf` a los
~17 módulos internos del POS que el Fase 3 (shell/sidebar) no tocó. Plan acordado, 3 tandas por riesgo:
- **Tanda 1 (bajo riesgo — listas/catálogos):** Entidades · Clientes · CRM · Cotizaciones · Notas de
  crédito · Prefacturas (historial) · Apartados · Avisos.
- **Tanda 2 (riesgo medio — flujos con más pasos):** Reparaciones · Kardex · Historial de ventas ·
  Reportes · Recursos Humanos.
- **Tanda 3 (riesgo alto — dinero/contabilidad):** Compras · Caja (arqueo) · Contabilidad · Ajustes.
Cada módulo se toca uno a la vez, verificado con Playwright contra el código real antes de publicar,
igual que el resto de esta sesión — no hay rama aparte para esto, va directo a `main` incremental.

**Tanda 1, pieza 1/8 — Entidades + Clientes (v48.43), HECHA:** ambas comparten el modal `abrirEntidad`.
CSS nuevo reusable en `nxPfEnsureCSS()` para todo lo que sigue en esta tanda: `.kpirow`/`.kpitile`
(tarjetas KPI), `.toolbar2` (botón principal + chips), `.chip`/`.chip.on` (pastillas de filtro), `.ltbl`
(tabla de lista con filas clicables `tr[data-row]`), `.rolebadge`, `.emptyrow`, `.afinrow`/`.afinchk`
(pastillas de "afines" del formulario de entidad). Se agregó `kpiPf()` (helper nuevo, NO se tocó el
`kpi()` viejo que todavía usa la pestaña Historial sin rediseñar — cambiarlo habría roto esa pestaña,
que no está en esta tanda). `renderEntidades()` y `renderClientes()` envueltos en `<div class="nxPf">`;
`abrirEntidad()` reconstruido como modal de tarjetas (¿Qué es esta entidad? / Datos / Cliente /
WhatsApp) en vez del formulario `.nxPrForm`/`.fr-row` viejo — mismos ids de campo, mismas funciones
(`nxEntGuardar`/`nxEntTipoTog`), cero cambios de lógica. `nxEntAfinTog()` ganó la responsabilidad
adicional de alternar la clase `.on` de cada pastilla de rol en vivo (antes solo mostraba/ocultaba
las cajas de Cliente/WhatsApp). Verificado con el código real (`renderEntidades`/`abrirEntidad`/
`nxEntAfinTog`/`renderClientes`) extraído y cargado en un navegador con un backend simulado: los
filtros repintan la lista, las pastillas de afines cambian de color al tocarlas, guardar manda el
POST correcto a `pos_clientes` con todos los campos, los KPI de Clientes muestran los números
correctos, y no hay desbordes en 390px ni escritorio.

**Tanda 1, pieza 2/8 — CRM (v48.44), HECHA:** `renderCRM()` envuelto en `.nxPf`, reusa `kpiPf`/
`.kpirow`/`.toolbar2`/`.chip`/`.emptyrow` ya creados para Entidades/Clientes. Tarjetas de oportunidad
nuevas (`.oppcard`, borde izquierdo del color de la etapa — dato dinámico, se queda como estilo en
línea a propósito) + selector de etapa compacto (`.oppet`). `abrirCrm()` reconstruido en 3 tarjetas
(Oportunidad/Contacto/Seguimiento) igual que el patrón de `abrirEntidad`; el botón eliminar (solo al
editar) se acomoda con una columna extra en `.actions` (`grid-template-columns:auto 1fr 1fr`). Cero
cambios de lógica — mismos ids, mismas funciones (`nxCrmEtapa`/`nxCrmVender`/`nxCrmGuardar`/`nxCrmDel`).
Verificado con el código real extraído y cargado en un navegador con backend simulado: los filtros y
el cambio de etapa mandan el PATCH correcto, guardar manda el POST correcto con el consecutivo
`nextSeq('crm')`, sin desbordes en 390px ni escritorio.

**Tanda 1, pieza 3/8 — Cotizaciones (v48.45), HECHA:** `renderCotizaciones()` envuelto en `.nxPf`
(`.ltbl` con fila clicable para editar). `abrirCotizacion()` reconstruido en 3 tarjetas (Datos de la
cotización / Productos / Notas). **Decisión deliberada de alcance:** la tabla de líneas de producto
(`pintarCotTabla()`, clases `.nxFacTbl`/`.nxFacAdd` globales — las mismas del viejo Factura pre-v40.2)
NO se reconstruyó — ya usa el mismo azul `#2563eb` y, al quedar anidada dentro del `.nxPf` nuevo,
hereda Plus Jakarta Sans por CSS normal de todos modos, así que se ve consistente sin el riesgo de
tocar la lógica de línea/descuento/totales que comparte con otros módulos. Mismo criterio que ya se
usó con la tabla de Factura en la Fase 2 ("no se rehízo, ya hereda el look"). Verificado con el código
real extraído (incluye `lineBase`/`lineImporte`/`cotTotales`) y cargado en un navegador: agregar un
producto calcula bien el total con ITBIS, guardar manda el POST correcto a `pos_cotizaciones` +
`pos_cotizacion_items`, sin desbordes en 390px ni escritorio.

**Tanda 1, pieza 4/8 — Notas de crédito (v48.46), HECHA:** `renderNotasCredito()` envuelto en `.nxPf`,
reusa `kpiPf`/`.kpirow`/`.toolbar2`/`.emptyrow` de las piezas anteriores + `.datef` nuevo (inputs de
fecha Desde/Hasta con el mismo estilo). `kpisNC()`/`filasNC()` (exclusivas de este módulo, no
compartidas con Historial — verificado antes de tocarlas) actualizadas a `kpiPf`/colores `var(--pf-*)`.
El buscador sigue usando `posBuscador()` (reglamento de buscadores, sin tocar) y los encabezados
ordenables siguen usando `thSort()`/`.nxThSort` (clase GLOBAL compartida con Historial — deliberadamente
sin tocar su color índigo, fuera de alcance de esta tanda). Verificado con el código real extraído y
cargado en un navegador: los KPI, el orden de columnas (`nxSort`) y el clic en fila (imprimir) siguen
funcionando, sin desbordes en 390px ni escritorio.

**Tanda 1, pieza 5/8 — Prefacturas (v48.47), HECHA:** dos superficies distintas, ambas tocadas.
`renderPrefHist()` (pestaña "Prefacturas" del sidebar, historial completo) envuelto en `.nxPf`, reusa
`kpiPf`/`.toolbar2`/`.datef`/`.ltbl`/`.emptyrow`; el helper local `pill()` pasó de la clase global
`.nxInvPill` (compartida con Inventario/Kardex, tanda 2, fuera de alcance) a `.chip`/`.chip.on` —
cambio seguro porque es un helper LOCAL de esta función, no toca la clase `.nxInvPill` en sí.
`nxPHVer()` (modal de detalle de una prefactura) reconstruido en tarjeta `.nxPf`. Por separado,
`nxPrefLista()`/`nxPrefListaRows()` (la ventana rápida "Prefacturas abiertas" que se abre con la lupa
desde Factura — un modal aparte del historial, mismo dato `_prefs`) también se pasó a `.nxPf`, cada
fila ahora es un `.oppcard` (reusa la clase creada para CRM). `kpisPH()`/`filasPH()`/`phBadge()`
confirmadas como exclusivas de este módulo antes de tocarlas (no compartidas con Historial). Se dejó
sin tocar `nxPHImprimir` (documento imprimible, mismo criterio que `nxCotImprimir`) y `thSort`/
`.nxThSort` (clase global compartida, fuera de alcance). Verificado con el código real extraído
(`renderPrefHist`, `nxPHVer`, `nxPrefLista`, `nxPrefListaRows`) cargado en un navegador: los KPI, los
filtros, el detalle y la ventana rápida funcionan, sin desbordes en 390px ni escritorio.

**Tanda 1, pieza 6/8 — Apartados (v48.48), HECHA:** `renderApartados()` envuelto en `.nxPf`, reusa
`kpiPf`/`.kpirow`/`.toolbar2`. Las tarjetas de apartado (antes `.nxSaCard`/`.nxSaTop`/`.nxSaEst`, clases
GLOBALES tomadas prestadas del módulo Clientes SaaS) pasaron a una clase nueva propia `.apacard` +
barra de progreso `.apabar` (ancho = % abonado) + fila de botones `.apabtns`. El badge de estado
(APARTADO/VENCIDO/COMPLETADO/CANCELADO) se dejó con color inline dinámico, mismo criterio que
`cotEstadoBadge`/`phBadge`/CRM (dato calculado, no una paleta fija). `nxApaNuevo()` y `nxApaAbonar()`
(los 2 modales) reconstruidos en tarjetas `.nxPf`. `nxApaCompletar`/`nxApaCancelar` no tienen HTML
propio (solo `confirm()` + PATCH), no requirieron cambios. Verificado con el código real extraído y
cargado en un navegador con backend simulado: abonar mueve el `abonado` correctamente y actualiza el
% de la barra, el botón "Entregar" aparece solo cuando ya no falta nada, crear un apartado nuevo manda
el POST correcto a `pos_apartados`, sin desbordes en 390px ni escritorio.

**Tanda 1, pieza 7/8 — Avisos (v48.49), HECHA — TANDA 1 COMPLETA:** `renderAvisos()` envuelto en
`.nxPf`, reusa `kpiPf`/`.kpirow`. Las 4 secciones (antes `.nxMdCard`/`.nxMdKpis`/`.nxMdRow`, clases
GLOBALES prestadas de Consultorio Médico) pasaron a `.card` + una fila nueva `.avrow`. Los botones
"ir al módulo" pasaron a `.ab g2` (icono) y el de WhatsApp a `.ab g3` con el verde de marca vía estilo
en línea (mismo criterio que los demás módulos: WhatsApp no tiene un color fijo en la paleta `.nxPf`).
Cero cambios en el CÁLCULO de qué avisar (cuotas vencidas, apartados por vencer, reparaciones listas,
bajo stock) ni en el texto de los mensajes de WhatsApp — solo el HTML/CSS alrededor. Verificado con el
código real extraído y cargado en un navegador con datos simulados de las 4 categorías: los KPI, las
4 secciones y los enlaces de WhatsApp arman el mensaje correcto, sin desbordes en 390px ni escritorio.
**Con esta pieza termina la tanda 1 completa** (Entidades, Clientes, CRM, Cotizaciones, Notas de
crédito, Prefacturas, Apartados, Avisos — los 8 módulos de "bajo riesgo" del plan). Quedan pendientes,
sin empezar: tanda 2 (Reparaciones, Kardex, Historial de ventas, Reportes, Recursos Humanos) y tanda 3
(Compras, Caja, Contabilidad, Ajustes) — ver plan completo más arriba en "Fase 4".

#### Skill nueva `webapp-testing` + auditoría de accesibilidad de la tanda 1 (19-jul-2026, v48.50)
Se instaló una 3ra skill de diseño/calidad en el repo (mismo patrón `.agents/skills/`+enlace en
`.claude/skills/` que `frontend-design`/`web-design-guidelines`): **`webapp-testing`**, oficial de
`anthropics/skills` (clonada del repo público, copiada tal cual — no vía `npx skills add`, para no
depender de ejecutar paquetes de terceros). Es el mismo método que ya se usaba a mano toda la sesión
(extraer código real, cargarlo en un navegador con Playwright, capturar pantalla, revisar consola) pero
empaquetado con scripts de ayuda (`with_server.py` para manejar el ciclo de vida de un servidor local).
**Se evaluaron también "Agent Browser" y "Find Skills"** (de una captura que mandó el dueño) — se
descartaron: no son del repo oficial de Anthropic (que solo tiene `webapp-testing`, `mcp-builder`,
`frontend-design`, etc.), su origen exacto no se pudo confirmar, y "Agent Browser" hace lo mismo que
`webapp-testing` (ya con fuente confirmada). "MCP Builder" (sí oficial) se descartó por no aplicar —
NEXUS PRO no expone un servidor MCP. Las "reglas de Vercel" que mandó ya estaban instaladas
(`web-design-guidelines`).
Con `web-design-guidelines` se auditó el código real de los 8 módulos recién rediseñados de la tanda 1
(mismo patrón que la auditoría de Login/Factura de la v48.14) — 5 hallazgos reales, todos corregidos:
(1) las filas clicables de tabla en Entidades/Clientes/Notas de crédito/Cotizaciones/Prefacturas
(`<tr data-row onclick=...>`, patrón nuevo de esta sesión) no eran alcanzables ni operables por teclado
— se les agregó `tabindex="0" role="button"` + `onkeydown` (Enter/Espacio dispara la misma función que
el clic); (2) esas mismas filas no tenían un aro de foco visible al llegar por Tab — CSS nuevo
`.nxPf [data-row]:focus-visible,.nxPf .chip:focus-visible,.nxPf .ab:focus-visible,.nxPf
.afinchk:focus-visible,.nxPf .oppet:focus-visible{outline:2px solid var(--pf-blue);outline-offset:2px}`
(cubre de una vez los 3 tipos de fila-clicable/chip/botón/select nuevos de toda la tanda 1, no solo uno);
(3) el botón de guardar de la tabla de Niveles de precio (Fase 1, `nxPfNivelGuardar`) tenía `title` pero
no `aria-label`; (4) los campos Teléfono de Entidades (`entTel`) y CRM (`crCli`... `crTel`) no tenían
`inputmode="tel"` (inconsistente con `apTel` de Apartados, que sí lo tenía) — no abrían el teclado
numérico en iPhone; (5) los campos Email de esos mismos formularios (`entEmail`/`crEmail`) no tenían
`type="email"`. Verificado que `.no-upper` (evita el mayúsculas-forzado global) sigue aplicando igual
después de agregar `type="email"` (confirmado por `getComputedStyle().textTransform`, no se rompió).
Cero cambios visuales ni de lógica de negocio — solo accesibilidad. Verificado con el código real
(`renderEntidades`/`abrirEntidad`) extraído y cargado en un navegador: la fila responde a Tab+Enter,
el aro de foco se ve (`outline:solid rgb(37,99,235)`), los campos tienen el tipo/inputmode correcto.

#### gstack — subconjunto curado de skills de metodología (25-jul-2026)
El dueño mandó una foto del README de [gstack](https://github.com/garrytan/gstack) (Garry Tan / Y
Combinator, v1.60.1.0) y pidió instalarlo. Se instaló **un subconjunto curado en el repo**, NO el
paquete completo — **12 skills de ~464 KB** en `.agents/skills/gstack-*` (+ enlaces en
`.claude/skills/`, mismo patrón que `frontend-design`/`webapp-testing`), contra los 70 MB y 53
skills del original. **El detalle completo de qué entró, qué se le quitó a cada archivo y qué
quedó fuera con su razón está en `.agents/skills/GSTACK-README.md`** — no se repite aquí.
- **Las 12:** `/gstack-investigate` (causa raíz) · `/gstack-review` (revisar un diff antes de
  publicar) · `/gstack-spec` (idea vaga → especificación) · `/gstack-plan-ceo-review` ·
  `/gstack-plan-eng-review` · `/gstack-cso` (seguridad) · `/gstack-retro` · `/gstack-health` ·
  `/gstack-careful` · `/gstack-freeze`/`/gstack-unfreeze` · `/gstack-guard`.
- **Se le quitó a cada `SKILL.md` la maquinaria del instalador** (~770 líneas por archivo, 15
  secciones: preámbulo, telemetría, prompts de primera vez, enrutamiento...). **Importante y no
  obvio:** dos de esas secciones **reescribían el `CLAUDE.md` de este proyecto** (le agregaban
  reglas de enrutamiento de gstack y hacían `commit` solas) y otra proponía `git rm -r
  .claude/skills/`. Por eso NO se corrió el instalador oficial (`./setup`) contra este repo —
  además de que el clasificador del entorno lo bloqueó, dejarlo tocar la memoria del proyecto
  habría sido un error. Los `hooks:` de careful/freeze/guard se portaron de rutas absolutas
  (`$HOME/.claude/skills/gstack/...`) a `${CLAUDE_SKILL_DIR}/../gstack-<x>/bin/...` con salida
  limpia si el archivo falta.
- **Lo grande que quedó fuera:** las 17 skills que dependen del navegador propio de gstack
  (incluida `/qa`, la primera que el dueño intentó usar) — ese binario necesita `bun install`, que
  el entorno bloquea, y **ya no hace falta**: el proyecto usa Playwright + Chromium + la skill
  `webapp-testing` para exactamente eso. También fuera: las 6 de iOS, las de gbrain/codex, y
  `ship`/`land-and-deploy` (contradicen el flujo de publicación ya establecido: subir
  `APP_VERSION` + `version.json`, rama propia → PR → fusionar con las herramientas MCP de GitHub).
- **No hay actualización automática a propósito** (`/gstack-upgrade` no se instaló, para que nada
  reescriba estos archivos solo). Para traer una versión nueva hay que repetir la curación —
  receta en el README.
- **De paso** se arregló `.agents/skills/ui-ux-pro-max/scripts/design_system.py` (línea ~437):
  un f-string con contrabarra que solo compila en Python 3.12+, y este entorno tiene 3.11 — el
  script no corría. Se factorizó el separador a una variable.

### NEXUS PRO 2.5 — rediseño del formulario de Artículos/Servicios, FASE 1 (19-jul-2026, v48.51)
El dueño pidió un rediseño grande y completo del formulario de artículo (`abrirProd`, pestaña
Inventario del POS): 10 pestañas (Información General, Precios, Costos, Inventario, Impuestos,
Compras, Ventas, Multiempresa, Integraciones, Historial), reusando el patrón organizativo de
Infoplus (no su visual — el POS ya tiene su propia identidad `.nxPf` azul/Plus Jakarta Sans, ver
regla de "cada proyecto con su diseño independiente"), sin romper funciones existentes ni duplicar
código, con arquitectura reusable y escalable.
- **Decisión de arquitectura bloqueante, resuelta con el dueño ANTES de programar:** la pestaña
  "Multiempresa" del spec original era ambigua — podía significar (A) **multi-sucursal dentro de
  la MISMA organización** (extender el Multi-almacén que ya existe, `pos_almacenes`/
  `pos_stock_almacen`) o (B) **multi-empresa real** (un mismo artículo compartido entre
  organizaciones DISTINTAS, ej. Bayolsale y BayolCell) — algo que HOY no existe: cada organización
  tiene su catálogo 100% aislado por `organizacion_id`+RLS (el modelo de seguridad de todo el
  sistema). El dueño confirmó **Opción A (multi-sucursal)** — bajo riesgo, no toca el aislamiento
  entre organizaciones. Esto se resolvió con una pregunta directa ANTES de tocar una sola línea de
  código, porque la Opción B habría exigido rediseñar el modelo de RLS de toda la aplicación.
- **HECHO — Fase 1 completa:** `abrirProd()` se reestructuró en pestañas (`.nxPfProdTabs`/
  `.nxPfProdPanel`, CSS nuevo en `nxPfEnsureCSS()`) — cambio **puramente de organización visual**:
  cada campo conserva EXACTAMENTE el mismo `id` de siempre (`ppNom`, `ppPre`, `ppCos`, `ppStk`...),
  así que `nxPfLeerProd()`/`nxPfResumen()`/`nxPfNivelCambio()` y el resto de funciones que leen por
  id no necesitaron cambiar — las pestañas son solo contenedores que se muestran/ocultan
  (`window.nxPfProdTab(key)`), cero riesgo de romper el guardado. Reparto de las cards existentes:
  Información (nombre/categoría/código/referencia/marca/imagen/**tipo**, movido aquí desde
  Inventario), Precios (precio lista/especial/contado/crédito/precio2-mayor + Reglas de Venta por
  nivel + gestor de Niveles de precio, todo igual que antes), Costos (costo + 🔒precio mínimo,
  movidos aquí desde Precios), Inventario (stock/stock mínimo/garantía/serial-IMEI), Impuestos
  (solo ITBIS), Ventas (permite descuento + combo + promociones "próximamente").
- **3 piezas genuinamente NUEVAS en esta fase** (no eran reorganización, se construyeron desde
  cero): (1) **Costos: margen bruto en vivo** (`nxPfMargenCalc()`, escucha `input` en
  `ppPre`/`ppCos`, muestra % y RD$ de utilidad, con color según el margen — rojo si negativo,
  naranja si <15%, verde si mayor) — cálculo 100% en el navegador, no toca la base. (2) **Compras:
  proveedor preferido** — columna nueva `pos_productos.proveedor_id` (uuid nullable, FK a
  `pos_proveedores`, migración `pos_productos_proveedor_id`, aditiva y sin impacto en filas
  existentes) + selector `<select id="ppProv">` poblado con `_proveedores` (la lista que ya carga
  Compras) — se guarda desde `nxPfLeerProd()`. (3) **Sucursales (multi-sucursal, la pestaña
  "Multiempresa" ya resuelta como Opción A):** lista de solo lectura del stock del artículo en
  cada almacén (`stockEnAlm(p.id, a.id)`, helper que YA existía del Multi-almacén) — solo se
  muestra si la organización tiene más de un almacén activo; si no, explica por qué no aplica. Para
  MOVER stock entre sucursales sigue usando Kardex → Multi-almacén (no se duplicó esa lógica, solo
  se enlaza con un botón). (4) **Historial:** kardex de ESE artículo (`pos_inv_movimientos`
  filtrado por `producto_id`, reusa la tabla que ya alimenta el Kardex general) cargado de forma
  perezosa (`window.nxPfHistorialCargar`, solo al abrir esa pestaña, una vez por apertura del
  modal) — evita una consulta extra si el dueño nunca la abre.
- **Deliberadamente NO construido en esta fase** (criterio de "no fingir funciones que no
  existen", igual que Cuotas/Financiamiento/NEXUS AI CONTENT): la pestaña **Integraciones**
  (publicar a WhatsApp Catálogo, tienda virtual, marketplace) muestra honestamente "Próximamente"
  — no hay ninguna de esas integraciones construida todavía, un interruptor falso habría sido peor
  que no ponerlo. Tampoco se agregaron "Unidad"/"Localidad" (ya se había decidido explícitamente en
  v48.30 que el POS no maneja unidades de medida ni localidades — no se contradice esa decisión sin
  que el dueño lo pida de nuevo).
- Verificado con Playwright cargando el **código real de la sección del POS** extraído tal cual del
  archivo (`abrirProd`/`nxPfProdTab`/`nxPfHistorialCargar`/`nxPfMargenCalc`/`nxPfLeerProd`, con
  hooks de prueba temporales solo en la copia de prueba, nunca en el archivo real) en un navegador
  con datos simulados (producto existente con proveedor y 2 almacenes con stock distinto): las 10
  pestañas cambian una por una sin dejar dos paneles visibles a la vez, el margen se recalcula en
  vivo al cambiar el costo, el selector de proveedor carga las opciones y conserva el seleccionado,
  la pestaña Sucursales muestra el stock correcto de cada almacén, el historial muestra el estado
  vacío correctamente (sin movimientos todavía), y `nxPfLeerProd()` devuelve `proveedor_id`
  correctamente tanto al editar como al crear un artículo nuevo (`null` si no se elige ninguno).
  Sin desbordes horizontales en 390px ni en escritorio (1280px). `node --check parches.js` limpio,
  los 3 `<script>` de `index.html` pasan `new Function()`, `version.json` válido.
- **Pendiente (fases siguientes, NO empezadas):** enriquecer Compras (tiempo de entrega, último
  costo de compra), comisión de venta por artículo (Ventas), impuestos adicionales (propina 10%),
  lotes/vencimiento (Inventario) — ninguno de estos se pidió explícitamente en la Fase 1, se
  agregarán cuando el dueño confirme cuáles quiere y en qué orden (mismo criterio de fases pequeñas
  y verificables de esta sesión, no todo de golpe).

**FASE 2 — HECHA (19-jul-2026, v48.52).** El dueño pidió continuar con lo que quedó pendiente de la
Fase 1. Se construyeron 2 de los 3 pendientes con efecto real (no decorativo); el tercero se
deliberadamente diferido porque hacerlo "de verdad" tocaba el cálculo de dinero del carrito:
- **Compras:** columna nueva `pos_proveedores.tiempo_entrega_dias` (migración
  `pos_productos_comision_pct_y_proveedor_entrega`, junto con la de abajo) + campo nuevo en el
  formulario de Proveedores (`abrirProv`/`nxPosGuardarProv`). Al elegir el proveedor preferido en la
  pestaña Compras del artículo, `window.nxPfProvEntrega()` muestra su tiempo de entrega en vivo
  (`onchange` del `<select id="ppProv">`). **Último costo de compra** (pieza nueva, sin columna
  nueva): `window.nxPfUltimoCosto(prodId)` consulta `pos_compra_items` por `producto_id` (patrón ya
  usado en el resto del sistema: "no depende del embed de PostgREST, carga y une en JS" — se trae
  `pos_compra_items` y `pos_compras` por separado y se unen por `compra_id` en el navegador, porque
  `pos_compra_items` no tiene su propia fecha), ordena por la fecha de la compra y muestra el costo +
  número de compra + proveedor de la más reciente. Carga perezosa al abrir el artículo (solo si
  `p` existe), igual que el Historial de la Fase 1.
- **Ventas — comisión por artículo, con efecto real en el Reporte de Comisiones:** columna nueva
  `pos_productos.comision_pct` (numeric, nullable). Campo "Comisión de venta (%)" en la pestaña
  Ventas — si se deja en blanco, no cambia nada (sigue el comportamiento de siempre). **Se reescribió
  `nxRepComisiones`** (antes calculaba la comisión sobre el TOTAL de cada venta, con el % fijo del
  vendedor) para recorrer los `pos_venta_items` de cada venta (ya vienen cargados en `_repVentas` para
  el cálculo de ganancia de Reportes, vía `repItems(v)` — no hizo falta ninguna consulta nueva) y usar,
  por línea, la comisión especial del producto si la tiene o si no la del vendedor — así que agregar el
  campo SÍ cambia el número que ve el dueño en el reporte, no es un campo de adorno. Columna del reporte
  renombrada "% base" (ya no representa una sola tasa cuando hay artículos con comisión especial
  mezclados) + nota al pie cuando aplica. Verificado con datos simulados (una venta con un artículo con
  comisión especial 3.5% y otro sin ella, cae a la del vendedor 5%): el total calculado fue el correcto
  a mano.
- **Deliberadamente NO construido en esta fase — propina legal 10% (Impuestos):** agregar un simple
  campo `propina`/checkbox en el producto sin sumarlo de verdad al cobro habría sido exactamente el
  tipo de función fingida que este sistema evita en todas partes (ver NEXUS AI CONTENT, Cuotas,
  Financiamiento) — un interruptor que no cambia ni un peso del total que paga el cliente. Para que sea
  real hay que sumarlo al cálculo del carrito en Vender/Factura (junto al ITBIS), al ticket/factura
  impresos y probablemente a los asientos contables — un cambio de mayor alcance sobre dinero en vivo,
  que se hace en su propia ronda cuando el dueño lo confirme, no colado dentro de esta fase.
- Verificado con el código real (`abrirProd`/`nxPfProvEntrega`/`nxPfUltimoCosto`/`nxPfLeerProd`/
  `nxRepComisiones`) extraído tal cual y cargado en un navegador con datos simulados: el tiempo de
  entrega cambia al cambiar de proveedor, el último costo trae el de la compra más reciente (no la
  primera del arreglo — se probó a propósito con 2 compras en orden mezclado), `nxPfLeerProd()`
  devuelve `comision_pct` correcto, y el Reporte de Comisiones (capturado abriendo la ventana real que
  genera `window.open`) calculó bien la mezcla de comisión especial + comisión base. Sin desbordes en
  390px ni escritorio. `node --check parches.js` limpio, `version.json` válido, los 3 `<script>` de
  `index.html` pasan `new Function()`.
- **Pendiente real para una fase futura:** propina 10% (requiere tocar Vender/Factura), lotes/
  vencimiento (Inventario, no se pidió aún), impuestos adicionales más allá de ITBIS.

### POS · Inventario — rediseño de "Nuevo/Editar artículo" (22-jul-2026, v48.98) — RAMA APARTE, PENDIENTE DE APROBACIÓN
El dueño pidió un rediseño funcional (no solo visual) del formulario de artículo con un encargo muy
detallado: fusionar pestañas duplicadas (Costos dentro de Información, Niveles de precio dentro de
Precios), y sobre todo **eliminar el bloqueo de "guarda el artículo primero para configurarle
precios por nivel"** — se debe poder crear niveles de precio nuevos y asignarles precios ANTES de
que el artículo exista, y guardar todo junto en una sola operación. Instrucción explícita: **"No
publicar directamente en main"** — todo este trabajo vive en la rama `claude/pos-articulo-rediseno`,
sin mezclar a `main`, a la espera de que el dueño lo revise y apruebe.
- **Auditoría previa (obligatoria, pedida por el dueño):** se confirmó que `abrirProd(p)` (en
  `parches.js`, dentro del mismo IIFE del POS que `nxPfNivelesTabla`/`nxNivelesInit`) es la única
  función real que arma esta pantalla — no `abrirProductoModal` (línea ~1046), que es de AGUAPRO, un
  módulo completamente distinto. Estructura anterior: 10 pestañas (Información, Precios, Costos,
  Inventario, Impuestos, Compras, Ventas, Multiempresa, Integraciones, Historial). Tablas reales
  verificadas por SQL directo: `pos_productos`, `pos_niveles_precio`, `pos_producto_niveles`,
  `pos_proveedores`.
- **De 10 pestañas a 4:** Información (identificación + costo/proveedor/ITBIS + imagen), Precios y
  Niveles (resumen de rentabilidad + precio principal + niveles de precio + reglas de venta),
  Inventario (stock + sucursales + kardex), Reglas Adicionales (descuento/comisión/combo/
  promociones/integraciones — lo que sobraba y no encajaba en precio ni en stock).
- **Migración aditiva:** `pos_niveles_precio` ganó `descripcion` (text), `tipo` (text, default
  `'fijo'`) y `color` (text) — campos que pedía el modal "Crear nivel de precio" y que no existían.
  `get_advisors(security)` sin hallazgos nuevos.
- **CAMBIO 3, la pieza real (borrador en memoria, nada se manda a Supabase hasta Guardar):**
  `_pfDraft = {nivelesNuevos:[], precios:{}}` (variable de módulo, junto a `_pfTmpSeq`/
  `_pfGuardando`), reiniciada por `pfDraftReset()` cada vez que se ABRE el formulario desde fuera
  (los 4 puntos de entrada reales: `nxPosNuevoProd`, `nxPosEditProd`, `nxPfGuardarYNuevo`, y el
  primer llamado del usuario) — pero NO cuando `abrirProd` se re-invoca a sí misma tras que
  `nxNivelesInit()` termine de cargar los niveles de la organización (se agregó un 2do parámetro
  `_mantenerBorrador` para ese caso puntual, si no el borrador se perdía segundos después de abrir).
  "Crear nivel de precio" (`nxPfNivelModalAbrir`/`nxPfNivelModalGuardar`) ya NO hace ningún `POST` —
  guarda el nivel nuevo en `_pfDraft.nivelesNuevos` con un id temporal `tmp_N` y lo marca "NUEVO" en
  la tabla al instante. Los precios/reglas de cualquier nivel (nuevo o existente) se anotan en
  `_pfDraft.precios[nivelId]` sin tocar la red. **`nxPfGuardarTodo(id)`** (reemplaza a
  `nxPfGuardarProdComun` como punto de entrada de `nxPosGuardarProd`/`nxPfGuardarYNuevo`) hace la
  secuencia real al tocar "Guardar": (1) valida, (2) guarda el artículo (`nxPfGuardarProdComun`),
  (3) crea en Supabase cada nivel nuevo del borrador (si uno falla, sigue con los demás y avisa por
  toast cuál falló — el artículo YA quedó guardado, nunca se pierde), (4) resuelve los ids `tmp_N` a
  los ids reales recién creados, (5) guarda/actualiza `pos_producto_niveles` por cada nivel con
  precio anotado, (6) limpia el borrador. Protegido contra doble clic (`_pfGuardando`, deshabilita
  los botones + muestra spinner mientras guarda).
- **Bug real encontrado y corregido durante la construcción (campo duplicado, justo lo que el
  encargo pedía evitar):** la tabla de niveles tenía columnas Contado/Crédito editables directo en
  cada fila (`nxPfNivC_<id>`/`nxPfNivR_<id>`), Y la tarjeta "Reglas de venta" (para el nivel
  seleccionado en el dropdown) tenía sus PROPIOS campos `#ppNivCont`/`#ppNivCred` para lo mismo — dos
  lugares editables para el mismo dato, sin sincronizarse entre sí (uno pisaba al otro en silencio).
  Arreglado de raíz: la tabla ahora solo MUESTRA el precio (con el margen calculado, en RD$) y un
  botón ✏️ que selecciona ese nivel en el dropdown — toda la edición real pasa por "Reglas de venta",
  que queda como única fuente de verdad.
- **Bug de CSS real encontrado con Playwright a 390px (mismo patrón de especificidad ya documentado
  varias veces en este archivo):** 3 tarjetas ("Reglas de venta" en Precios, "Inventario y stock",
  "Reglas de venta del artículo") tenían `class="g2" style="grid-template-columns:repeat(2,...)"` —
  el estilo en línea siempre le gana a la media query responsive de `.g2` (que colapsa a 1 columna
  bajo 540px), así que esas 3 tarjetas seguían forzando 2 columnas en el celular y las etiquetas
  largas ("Stock mínimo (alerta)", "Comisión de venta (%)") se veían cortadas sin wrap. Arreglado
  quitando el estilo en línea en las 3 — con la clase `.g2` sola ya colapsan bien a 1 columna en
  móvil y 2 en escritorio, igual que la tarjeta "Identificación" que nunca tuvo el problema.
- **Verificado con el código real extraído** (no una reconstrucción — `abrirProd`, `pfDraftReset`,
  `nxPfNivelesTabla`, `nxPfNivelPrecioInput`, `nxPfNivelModalAbrir/Guardar`, `nxPfGuardarTodo`,
  `nxPosGuardarProd`/`nxPfGuardarYNuevo` extraídos tal cual del archivo con balance de llaves real) en
  un navegador con un backend Supabase simulado y controlable (incluido un flag para simular que
  falla justo la creación de un nivel): 18 pruebas — crear con precio, crear con costo, elegir un
  nivel existente y ponerle precio, **crear un nivel nuevo y ponerle precio SIN guardar el artículo
  antes** (la pieza central del pedido), varios niveles a la vez, una regla de venta (cantidad
  mínima + % descuento), todo en una sola operación (nombre+costo+precio+nivel nuevo+regla+stock),
  fallo simulado al crear un nivel (el artículo se guarda igual, toast de aviso, el nivel roto NO
  queda creado), nombre vacío no crea nada, editar un artículo existente (precarga correcta, no
  duplica), doble clic no duplica el artículo, nombre de nivel repetido no se permite, artículo tipo
  servicio sin stock (sin movimiento de apertura), artículo tipo producto con stock inicial (con
  movimiento de apertura) — las 18 pasan, 0 errores de JavaScript. Capturas de pantalla a 390px
  (móvil) y 1280px (escritorio) en las 4 pestañas — sin desbordes horizontales en ninguna
  (`scrollWidth === clientWidth` exacto), la fila de pestañas usa scroll horizontal propio sin
  desbordar la página. `node --check parches.js` limpio, `version.json` válido, los 3 `<script>` de
  `index.html` pasan `new Function()`.
- **Deliberadamente NO construido** (no pedido explícitamente, se habría inventado sin confirmar):
  modalidades de precio "por % de descuento"/"por margen" con cálculo automático del precio final —
  el campo "Tipo" del nivel (fijo/descuento/margen) se guarda como dato, pero hoy el sistema entero
  sigue calculando con precios fijos en RD$ (igual que antes); convertir eso en un motor real de
  precio-por-fórmula habría sido un cambio de mucho mayor alcance no pedido en este encargo.
- **Pendiente:** aprobación del dueño antes de fusionar `claude/pos-articulo-rediseno` a `main`.

### Seguimiento v48.99 — mockup exacto que mandó el dueño ("quiero que se vea así mismo")
El dueño mandó una imagen (escritorio + celular) del formulario que quería exactamente. Se comparó
pieza por pieza contra lo ya construido en v48.98 y se aplicaron los cambios reales del mockup,
manteniendo el criterio de "no fingir funciones que no existen" en las 2 piezas que el mockup
insinuaba pero no existían de verdad:
- **Encabezado:** título en mayúsculas; botón nuevo **"Vista previa"** (`window.nxPfVistaPrevia()`)
  — modal de solo lectura que arma una tarjeta con los datos YA escritos en el formulario (nombre,
  imagen, precio, badge de stock con el mismo criterio ok/bajo/agotado/servicio que usa el catálogo
  real de Vender) — cero llamadas a la red, cero guardado, honesto sobre que "todavía no se ha
  guardado". Menú **"..."** (`window.nxPfMenuToggle`) con "Imprimir etiqueta" (siempre, reusa
  `nxPfImprimirEtiqueta` ya existente) y "Eliminar artículo" (solo si el artículo ya existe, reusa
  `window.nxPosDelProd` ya existente) — ambas acciones YA EXISTÍAN en el sistema, solo se juntaron
  en un solo menú en vez de inventar algo nuevo.
- **Información básica + imagen en una sola tarjeta:** los campos (Nombre/Categoría/Código/
  Referencia/Marca/Tipo) pasaron a una columna única con el panel de Imagen al lado (`.infobasica`),
  fusionando lo que antes eran las tarjetas separadas "Identificación" y "Multimedia" — mismos ids,
  mismo campo `#ppImg` (sigue siendo URL de texto). **Decisión honesta:** el mockup mostraba un botón
  "Cambiar imagen" y un checkbox "Usar imagen desde URL" que insinuaban una subida de archivos real
  — el sistema NO tiene almacenamiento/Storage para imágenes de producto (nunca lo tuvo, es solo un
  campo de texto con la URL) — se construyó el recuadro de vista previa + el campo de URL real,
  SIN el checkbox ni el botón de "cambiar imagen" falsos, para no fingir una función de subida que
  no existe.
- **Tarjeta nueva "Información adicional":** Descripción y Notas internas — 2 campos NUEVOS y reales
  (columnas `pos_productos.descripcion`/`notas`, migración `pos_productos_descripcion_notas`,
  additiva, `get_advisors` sin hallazgos nuevos), no decorativos — se guardan y se precargan al
  editar (`nxPfLeerProd`).
- **Stock inicial movido a Información (solo al crear):** el propio encargo original ya decía
  "Stock inicial cuando corresponda" dentro de la pestaña Información — el mockup lo confirmó
  visualmente. Mismo id `#ppStk`, mutuamente excluyente: vive en "Compra y fiscalidad" cuando
  `!p` (creando) y en "Inventario y stock" cuando `p` existe (editando) — nunca los dos a la vez
  (evita repetir el bug de campo duplicado que ya se había encontrado y arreglado en v48.98). La
  pestaña Inventario avisa "El stock inicial se define en la pestaña Información" cuando no aplica.
- **Pie de página simplificado a 2 acciones reales:** "Cancelar" pasó de botón rojo sólido a botón
  discreto (blanco, borde gris) — ya no se ve como una acción de alarma. "Imprimir Etiqueta" se
  movió al menú "..." del encabezado (ya no ocupa un botón del pie). "Guardar artículo" + "Guardar y
  Nuevo" se unieron en un **botón partido** (`.savewrap`/`.savechev`): el botón grande guarda, la
  flechita abre un menú angosto con "Guardar y Nuevo" — mismas funciones de siempre
  (`nxPosGuardarProd`/`nxPfGuardarYNuevo`), solo cambió cómo se presentan. Texto central honesto
  ("Los niveles nuevos se crean al Guardar", real) en vez del texto del mockup ("Los cambios se
  guardan automáticamente", que habría sido falso — nada se guarda hasta tocar Guardar).
- **BUG REAL encontrado y arreglado durante la construcción, antes de dar el trabajo por hecho:**
  el menú "Guardar y Nuevo" se posicionaba con `position:absolute` dentro de `.savewrap` (el
  contenedor del botón, angosto — solo del ancho del botón mismo) — en el celular, `right:0` medido
  desde un contenedor tan angosto hacía que el menú (190px de ancho) se saliera por el borde
  IZQUIERDO de la pantalla (medido con Playwright: `left:-22.6px`, confirmado visualmente con una
  captura donde se leía "...ardar y Nuevo" con la "Gu" cortada). Mismo problema en el menú "..." del
  encabezado, en potencia (contenedor `.headwrap` igual de angosto). **Arreglado de raíz, no con un
  parche de breakpoint:** los 2 menús pasaron de `position:absolute` (relativo a un contenedor local
  angosto) a `position:fixed` posicionado en JavaScript con la posición REAL del botón
  (`getBoundingClientRect()`, función nueva compartida `nxPfPopPosicionar(pop, btn, openUp)`) — se
  calcula `left` acotado entre 8px y `innerWidth-ancho-8px` para que NUNCA se salga de la pantalla,
  sin importar cuán angosto sea el celular ni dónde esté el botón. Reverificado tras el arreglo:
  `left:8px` (dentro del viewport) en vez de `-22.6px`.
- **Verificado con Playwright, código real extraído del archivo** (no una reconstrucción —
  `abrirProd`, `nxPfVistaPrevia`, `nxPfMenuToggle`, `nxPfSaveMenuToggle`, `nxPfPopPosicionar`,
  `nxPfImgSync`, `nxPfLeerProd` extraídos tal cual con balance de llaves real): 22 pruebas en total
  (las 18 del v48.98 siguen pasando sin regresión + 4 nuevas para las piezas de este seguimiento) —
  las 22 pasan, 0 errores de JavaScript. Capturas de pantalla en 390px y 1280px de Información/
  Precios/Inventario, del menú "..." abierto, del menú "Guardar y Nuevo" abierto (antes y después del
  arreglo del desborde) y de "Vista previa" — sin ningún desborde horizontal en ningún caso. `node
  --check parches.js` limpio, `version.json` válido, los 3 `<script>` de `index.html` pasan
  `new Function()`.
- **ACTUALIZACIÓN — fusionado a `main` (22-jul-2026, v48.99):** el dueño aprobó el rediseño ("Si") y
  pidió fusionarlo — se creó el PR #77 (`claude/pos-articulo-rediseno` → `main`) y se fusionó. Ya está
  **en producción**, no sigue pendiente de aprobación (nota histórica: la línea de arriba quedó
  desactualizada apenas se aprobó — se deja tal cual por honestidad del registro, esta línea la
  corrige). `git push`/`git checkout` directo a `main` estaban bloqueados por el clasificador del
  entorno de esta sesión — la ruta que sí funcionó fue crear el PR y fusionarlo con las herramientas
  MCP de GitHub (`mcp__github__create_pull_request` + `mcp__github__merge_pull_request`); esa es la
  ruta a usar de aquí en adelante en esta sesión cuando haga falta publicar a `main`.

### Seguimiento v49.00 — "Precios y niveles, precio principal quitarlo, niveles de precio poder agregar
### los precios y también el mínimo" (22-jul-2026)
Pedido textual del dueño sobre la pestaña **Precios y Niveles** del formulario de artículo (recién
publicado en v48.99): (1) quitar la tarjeta "Precio principal", (2) que la propia tabla "Niveles de
precio" permita agregar/editar el precio directo en cada fila, y (3) que también se pueda poner el
**Mínimo** ahí mismo, sin depender de "Reglas de venta" para eso.
- **Se quitó la tarjeta "Precio principal"** (los campos `#ppPre`/`#ppPreMay` que antes se escribían a
  mano) — pasaron a **inputs ocultos**, para no romper nada de lo que ya los lee (`nxPfLeerProd`,
  `nxPfMargenCalc`, el "Precio Lista" del panel Resumen). Función nueva **`nxPfSyncPrecioPrincipal(prodId)`**:
  busca el nivel por defecto (`es_default`, o el primero si ninguno lo es) y copia su Contado al campo
  oculto `#ppPre` — se llama al abrir el formulario y cada vez que se edita el Contado de cualquier fila
  de la tabla. La tarjeta "Resumen de rentabilidad" se quedó (muestra Costo/Precio principal/Ganancia/
  Margen, todo de solo lectura) con una nota nueva explicando de dónde sale el precio ahora ("se toma
  del nivel por defecto en la tabla de arriba — no se escribe aparte").
- **La tabla "Niveles de precio" ahora es editable en 3 columnas por fila** (antes solo mostraba
  precio+margen de solo lectura): **Contado**, **Crédito** y **🔒 Mínimo**, cada uno con su propio
  `<input data-nx-money inputmode="numeric">` (`#nxPfNivC_<id>`/`#nxPfNivR_<id>`/`#nxPfNivMinRow_<id>`),
  `onchange="window.nxPfNivelPrecioRowInput(prodId, nivelId)"`. El lápiz ✏️ de cada fila ya no "abre a
  editar" un formulario aparte — solo selecciona ese nivel en el desplegable de arriba (para configurar
  sus otros 6 campos en "Reglas de venta", que se quedó con Precio Especial/Cantidad Mínima/Crédito %/
  Crédito $/Precio Anterior/% Descuento — Contado/Crédito/Mínimo se sacaron de ahí porque ahora viven en
  la tabla).
- **Arquitectura para no repetir el bug de "campo duplicado" ya encontrado y arreglado antes en este
  mismo formulario (v48.98):** en vez de que la tabla y "Reglas de venta" escriban cada una directo sobre
  `_pfDraft.precios[nivelId]` (arriesgando que uno pise los cambios del otro sin querer), se creó un
  helper de **fusión** compartido: **`nxPfNivelPatch(prodId, nivelId, patch)`** — hace
  `Object.assign({}, prev, patch)` sobre el registro existente del borrador, nunca lo reemplaza entero.
  `nxPfNivelPrecioRowInput` (la tabla) solo manda `{precio_contado, precio_credito, precio_minimo}`;
  `nxPfNivelPrecioInput` (Reglas de venta, ya existente, ajustado) solo manda los otros 6 campos — cada
  uno "dueño" de su propio subconjunto de columnas, así que no importa en qué orden se editen, nunca se
  pisan entre sí. El resto del flujo de guardado (`nxPfGuardarTodo`, crear niveles nuevos primero y
  resolver sus ids `tmp_N`, luego `PATCH`/`POST` a `pos_producto_niveles`) no se tocó — sigue leyendo de
  `_pfDraft.precios` igual que antes.
- **BUG REAL encontrado y arreglado ANTES de publicar (no llegó a producción):** el primer intento de
  edición dejó la tarjeta "Resumen de rentabilidad" **duplicada** — el bloque de reemplazo se cortó
  después del combo original "Resumen de rentabilidad + Precio principal", así que la tarjeta original
  (que estaba ANTES de "Precio principal" en el HTML de v48.99) se quedó intacta en su lugar, Y el texto
  de reemplazo también traía su propia copia reposicionada de "Resumen de rentabilidad" — el resultado
  eran 2 tarjetas idénticas en pantalla. Detectado revisando las capturas de Playwright (no a simple
  vista en el código), confirmado con `grep -n "Resumen de rentabilidad"` mostrando 2 apariciones en el
  HTML generado. Corregido quitando la primera/original, dejando solo la que sigue después de "Niveles
  de precio" (con la nota nueva). Reverificado: `grep` da una sola aparición, las 24 pruebas automatizadas
  siguen en verde, capturas de escritorio/móvil confirman una sola tarjeta con el layout correcto.
- **Verificado con Playwright + Node, código real extraído del archivo** (no una reconstrucción): 24
  pruebas en total (las 22 de v48.98/v48.99 + 2 nuevas — `#ppPre` es `type="hidden"` y no existe ninguna
  tarjeta titulada exactamente "Precio principal"; el Mínimo se puede fijar por nivel independiente del
  Contado/Crédito y persiste correctamente en `pos_producto_niveles.precio_minimo`) — las 24 pasan, 0
  errores de JavaScript. Capturas de pantalla de escritorio (1280px) y móvil (390px) de la pestaña
  Precios y Niveles con 2 niveles reales (cada uno con Contado/Crédito/Mínimo propios) — sin desbordes
  horizontales en ninguno de los 2 anchos. `node --check parches.js` limpio; los 3 `<script>` de
  `index.html` pasan `new Function()`; `version.json` válido.
- **Publicado directo (rama `claude/pos-niveles-precio-sin-principal` → PR → `main`, mismo patrón recién
  establecido arriba)** — el dueño no pidió esta vez mantenerlo en revisión aparte.

### Seguimiento v49.01 — "Inventario: información, imagen, un botón para cargar la imagen" (22-jul-2026)
Pedido del dueño sobre la pestaña **Información** del formulario de artículo: agregar un botón para
CARGAR la imagen (no solo pegar una URL de texto, que es lo único que había desde v48.99 — ahí se dejó
fuera a propósito por no tener Storage configurado, ver esa sección arriba).
- **Mismo patrón ya probado en el sistema, no uno nuevo:** en vez de montar Supabase Storage (cambio de
  mayor alcance, el propio CLAUDE.md ya lo tenía anotado como pendiente riesgoso — "mover vouchers/
  banners a Storage... refactor grande/riesgoso"), se reusó la técnica que YA usa Rifas desde hace
  varias versiones (`nxRifaImgFile`/`nxRifaLogoFile`): leer el archivo elegido, dibujarlo en un
  `<canvas>` oculto redimensionado (máximo 640px de lado, mismo criterio de tamaño razonable que
  `nxRifaImgFile`), exportarlo a JPEG comprimido (`toDataURL('image/jpeg', 0.78)`) y guardar ese
  **dataURL directo en el mismo campo `#ppImg` de siempre** — `pos_productos.imagen` es texto, acepta
  tanto una URL real como un dataURL, así que no hizo falta ninguna columna ni tabla nueva.
- **`window.nxPfImgFile(input)`** (nueva, junto a `nxPfImgSync`): valida tamaño (tope 12MB, mismo que
  `nxRifaImgFile`), lee con `FileReader`, redimensiona con canvas, guarda el resultado en `#ppImg` y
  llama a `nxPfImgSync()` (ya existía) para refrescar la vista previa — cero cambios en cómo se lee/
  guarda la imagen en el resto del formulario (`nxPfLeerProd` sigue leyendo `val('ppImg')` igual que
  siempre, sin saber ni importarle si es una URL o un dataURL).
- **HTML:** `<input type="file" id="ppImgFile" accept="image/*" style="display:none">` + un botón
  visible **"Cargar imagen"** (`.btn2`, mismo estilo ya usado por "+ Crear nivel de precio") que abre el
  selector de archivos. El campo de texto de URL se quedó (relabeled "...o pega una URL") como
  alternativa — no se quitó nada, solo se sumó el botón. En móvil abre la cámara/galería del teléfono
  de forma nativa (comportamiento estándar de `<input type="file" accept="image/*">`, sin código extra).
- Verificado con Playwright, código real extraído del archivo (no una reconstrucción — `nxPfImgFile`/
  `nxPfImgSync`/`abrirProd` tal cual, con un PNG de prueba generado en el propio navegador): seleccionar
  un archivo dispara la compresión, `#ppImg` termina con un `data:image/jpeg;...` real, la vista previa
  se actualiza sola, sin desbordes en 390px ni 1280px, 0 errores de JS — más las 24 pruebas anteriores
  del formulario repasadas sin regresión. `node --check parches.js` limpio; los 3 `<script>` de
  `index.html` pasan `new Function()`; `version.json` válido.

### Seguimiento v49.02 — bug real: selector de Cliente en "Cobrar" sigue siendo `<select>` (22-jul-2026)
El dueño pidió cerrar uno de los pendientes conocidos del POS: el campo Cliente dentro de la ventana
**"Cobrar"** (`nxPosCobrar`, se abre desde el botón Cobrar tanto en Vender como en Factura) seguía
siendo un `<select id="posCliId">` normal con TODOS los clientes de la organización en una lista larga
sin buscador — inconsistente con el resto del sistema, donde el campo Cliente de Factura ya tiene lupa
+ ventana con buscador desde v48.97. Ya estaba anotado como pendiente en el CLAUDE.md ("selector de
CLIENTE del POS en cobro/factura sigue siendo `<select>`") desde varias versiones atrás.
- **Mismo patrón ya probado, no uno nuevo:** se replicó el patrón de `nxFacCliToggle`/`pintarFacCliDrop`/
  `nxFacCliPick` (Factura, v48.97) con nombres propios para este modal —
  `window.nxPosCobroCliToggle()`/`pintarPosCobroCliList()`/`window.nxPosCobroCliFiltrar()`/
  `window.nxPosCobroCliPick()` — mismo componente `posBuscador()` (reglamento de buscadores) y misma
  lista `.pf2clirow` (namespace `.nxPf`, por eso el modal nuevo lleva la clase `nxPf` agregada y llama a
  `nxPfEnsureCSS()` al abrir, por si el usuario llega a "Cobrar" antes de que cualquier otra pantalla del
  POS haya inyectado ese CSS).
- **`#posCliId` se quedó como el mismo campo de siempre** (id idéntico) — solo cambió de `<select>` a
  `<input type="hidden">`, así que `nxPosCobroCalc()`/`nxPosConfirmar()` (que solo hacen `val('posCliId')`,
  nunca miran si es un select o un input) no necesitaron ningún cambio. El botón visible
  (`#posCliBtn`/`#posCliDisp`) muestra "Consumidor final" o el nombre/código del cliente elegido — mismo
  texto que antes mostraba la opción seleccionada del `<select>`, incluyendo el sufijo "(por mayor)" para
  clientes con `nivel_precio='mayor'`. Al abrir "Cobrar" con un cliente ya elegido en Factura (`_factCli`),
  el botón sale precargado igual que antes salía preseleccionada la opción del `<select>`.
- Verificado con Playwright, código real extraído del archivo (no una reconstrucción — `nxPosCobrar`,
  `nxPosCobroCliToggle`, `pintarPosCobroCliList`, `nxPosCobroCliPick`, `nxPosCobroCalc`, `leerCobro`,
  `totales` tal cual, con balance de llaves real): 8 pruebas — el botón arranca en "Consumidor final" sin
  cliente previo y ya NO es un `<select>` (ahora `INPUT type=hidden`), el buscador abre y lista los
  clientes reales, filtrar por texto muestra solo los que calzan, elegir un cliente actualiza el campo
  oculto + el texto del botón + oculta el campo "Nombre para el ticket" + recalcula el cobro, reabrir con
  `_factCli` ya puesto precarga el botón correctamente, y volver a elegir "Consumidor final" limpia el
  campo — las 8 pasan, 0 errores de JavaScript, sin desbordes en 390px. `node --check parches.js` limpio;
  los 3 `<script>` de `index.html` pasan `new Function()`; `version.json` válido.

### POS · Crear cliente (Entidad) — pestañas + resumen en vivo + duplicados (spec ChatGPT "Crear Cliente V1", 23-jul-2026, v49.13)
ChatGPT dejó `docs/visual-drafts/clientes/CREAR_CLIENTE_V1_APROBADO.md` — un spec grande y cuidadoso
(pide auditar primero, no inventar campos/tablas, no publicar a main sin revisión) para un "formulario
central de cliente" reutilizable en POS/Factura/Prefactura/Taller/Financiamiento/Cobranza/Seguros.
**Auditoría real hecha (Fase 1 del spec):**
- El formulario real de crear cliente del POS es **`abrirEntidad(c, defs)`** (guarda en `pos_clientes`
  vía `nxEntGuardar`), ya en `.nxPf` desde v48.43. Es un form de **Entidad** (cliente/proveedor/
  empleado/banco), no solo cliente. Lo invocan `nxEntNueva`/`nxPosNuevoCli` (Clientes/Entidades) y
  como proveedor/vendedor. **NO** se invoca desde Factura/Cobro (esos usan `nxFacCliToggle`/
  `nxPosCobroCliToggle`, buscadores).
- **Columnas reales de `pos_clientes`** (verificado por SQL): nombre, cedula, telefono, direccion,
  email, tipo_persona, contacto, representante, limite_credito, notas, activo, codigo, nivel_precio/
  nivel_id, es_cliente/es_proveedor/es_empleado/es_banco, acepta_whatsapp. **La mayoría del spec NO
  existe** (fecha nacimiento, sexo, provincia/municipio/sector, tel secundario, ingresos, lugar de
  trabajo, referencias, nivel de riesgo, documentos, estado civil, ocupación, idioma, días de crédito,
  descuento, condición de pago…).
- **El "formulario central" cruza tablas distintas:** POS/Factura/Prefactura/Cobro comparten
  `pos_clientes` (aquí SÍ se puede reusar), pero Taller (`pos_reparaciones`, texto libre sin
  cliente_id), Financiamiento (`prestamos`, tabla propia sin `organizacion_id`) y Seguros (`clientes`)
  son tablas SEPARADAS con RLS propio — unificarlas violaría el reglamento de aislamiento. Se le
  explicó al dueño: "central" solo es seguro dentro de la familia POS.
- **Aplicado (real, `abrirEntidad`/`nxEntGuardar`, cero campo inventado, todos los ids intactos):**
  (1) el form pasó de pila de tarjetas a **2 pestañas** (`entTabs`/`nxEntTab`): **Información**
  (afines + datos + WhatsApp) y **Comercial** (nivel de precio + límite de crédito; si la entidad no
  es cliente muestra un aviso "aplica solo a clientes"). (2) **Tarjeta de resumen en vivo**
  (`entResumen`/`nxEntResumen`, avatar de inicial + nombre + tipo + código + afines + nivel + crédito)
  que se actualiza con `oninput`/`onchange` de los campos clave. (3) **Detección de duplicados** en
  `nxEntGuardar` (solo al CREAR): normaliza teléfono y cédula (solo dígitos), busca en `_clientes`; si
  hay match, `confirm()` — Aceptar crea de todos modos, Cancelar abre la entidad existente
  (`abrirEntidad(dup)`). Respeta el spec ("no bloquear silenciosamente, permitir abrir el encontrado").
- **Deliberadamente NO construido (fingiría o cruza tablas):** campos que no existen en la BD; la
  pestaña Documentos (no hay Storage); "Guardar y usar cliente" enganchado a Factura/Cobro (toca
  pantallas de dinero — su propia ronda); unificar Taller/Financiamiento/Seguros (tablas distintas,
  proyecto aparte con migraciones). Se le comunicó al dueño como fases siguientes.
- **Verificado con Playwright, código real extraído** (`abrirEntidad`/`nxEntAfinTog`/`nxEntTab`/
  `nxEntResumen`/`nxEntTipoTog`/`nxEntGuardar`, con un backend simulado): modal `.nxPf` con 2
  pestañas, los 13 ids de campo presentes, panel Info visible / Comercial oculto al abrir, cambio de
  pestaña, la caja Cliente se oculta y sale el aviso al desmarcar "Cliente", el resumen se actualiza
  al escribir, y el duplicado (mismo teléfono) muestra el aviso con el nombre existente, NO postea al
  cancelar (abre el existente) y SÍ postea al confirmar. Sin desbordes en 420px ni 1280px, 0 errores.
  `node --check parches.js` limpio; los 3 `<script>` de `index.html` pasan `new Function()`;
  `version.json` válido.

### Financiamiento — devolver una solicitud al cliente para que la corrija (25-jul-2026, v49.50)
El dueño pidió que una solicitud se pueda **reenviar para corregir** si algo quedó mal, en vez de
solo rechazarla.
- **Idea clave (por qué funciona sin tocar el link):** la función Edge solo acepta envíos de
  solicitudes en estado `pendiente`. Así que devolver una al cliente es simplemente **volverla a
  `pendiente`** — el MISMO enlace revive, sin generar uno nuevo ni perder el hilo de la solicitud.
- **Migración `prestamo_solicitudes_correccion`** (aditiva): `correccion_motivo` (text),
  `correccion_at` (timestamptz). `get_advisors` sin hallazgos nuevos.
- **`nxPrSolicitudPedirCorreccion(id)`** abre un modal con textarea (no un `prompt()`: el texto lo
  lee el cliente y va a WhatsApp, conviene poder redactarlo); **`nxPrSolicitudReenviar(id)`** hace
  el `PATCH` (`estado:'pendiente'`, `correccion_motivo`, `correccion_at`, limpia `motivo_rechazo`),
  `logAudit('PRESTAMO_SOLICITUD_CORRECCION')`, y abre `nxPrLinkFirmaMostrar` con un mensaje de
  WhatsApp que ya explica qué corregir y lleva el enlace pegado al final.
- **Lo anterior NO se borra** — se sobrescribe cuando el cliente reenvía. Si nunca vuelve, la
  evidencia previa (cédula, firma, video) sigue ahí. Decisión deliberada: borrar habría dejado la
  solicitud vacía sin ganar nada, porque el formulario del cliente exige subir todo de nuevo igual.
- **Badge nuevo "POR CORREGIR" (ámbar)**: una `pendiente` CON `correccion_motivo` no es lo mismo
  que una que nunca se ha abierto — antes las dos habrían dicho "SIN ENVIAR". El detalle de la
  solicitud muestra qué se le pidió y dice "Esperando a que el cliente lo envíe corregido".
- **Botón disponible en 2 estados:** `enviada` (junto a Aprobar/Rechazar) y `rechazada` (darle otra
  oportunidad sin crear un link nuevo). En `aprobada` NO aparece — ya es un préstamo real.
- **Lado cliente (`firma-prestamo.html`):** aviso ámbar `.corrig` **arriba del todo** (medido con
  `getBoundingClientRect` que va antes de la primera tarjeta) con el texto exacto. La función Edge
  (**v6**) devuelve `correccion_motivo` en el GET y **lo limpia al reenviar** (`correccion_motivo:
  null` en el patch de publicación) — el pedido queda atendido solo.
- Verificado con Playwright, **las dos mitades a la vez**: el panel con el código real extraído por
  contenido, y la página del cliente **real** servida por HTTP local. **23 comprobaciones** — badge
  correcto vs "SIN ENVIAR", el botón aparece en enviada y en rechazada, sin motivo no reenvía,
  el `PATCH` vuelve a `pendiente` con el motivo y limpia el rechazo, queda en auditoría, el WhatsApp
  explica y lleva el link, el cliente ve el aviso arriba del todo y el formulario sigue completo, y
  sin corrección pendiente no sale ningún aviso. Sin desborde en 390px, 0 errores de JS. Las suites
  de la página (55) y del panel (53) repasadas sin regresión.

### Financiamiento — el CONTRATO imprimible sale con la firma y la cédula anexada (25-jul-2026, v49.49)
Segunda mitad de lo que se había ofrecido al cerrar la v49.48 (el dueño: *"Hazlo"*). El contrato
(`nxPrestamoContrato`) llevaba una raya en blanco para que el cliente firmara a mano, aunque ya
hubiera firmado por link.
- **De dónde salen las imágenes:** de `_prSolicitudes` (los **dataURL** ya en memoria), NO de las
  URLs de Storage que quedaron en `p.documentos`. A propósito: el contrato se abre en una ventana
  `window.open`+`document.write` que se imprime o se guarda en PDF — con dataURL el documento queda
  **autocontenido** y no depende de la red ni de que esa ventana tenga sesión. Además la solicitud
  es el registro original: si el dueño borra una imagen de Docs, el contrato sigue siendo fiel.
- **3 piezas, todas gateadas a que exista firma real** (`firmaDeudor`): (1) la firma manuscrita
  **encima de la línea** de EL DEUDOR (`.firmaImg`, `position:absolute;bottom:100%` dentro de
  `.firma`, que pasó a `position:relative` — no descoloca la celda de EL ACREEDOR ni las de los
  testigos) + "Firmado electrónicamente" bajo el nombre; (2) **cláusula SEXTA** de firma
  electrónica con la fecha real (`revisado_at`) que enumera SOLO lo que de verdad llegó
  (`solF.selfie` / `solF.video_path` condicionan el texto); (3) **ANEXO** en página nueva
  (`page-break-before:always`) con las 2 caras de la cédula y la foto.
- **Redacción cuidada, sin prometer de más:** se cita la **Ley 126-02** (Comercio Electrónico,
  Documentos y Firmas Digitales, RD — real) y se describe lo que el sistema SÍ tiene (firma
  manuscrita capturada + cédula + foto + video). **NO** se dice "firma digital certificada": este
  sistema no emite certificados de una entidad de certificación autorizada, y afirmarlo sería
  falso en un documento legal.
- **El video no se finge en papel:** su bloque del anexo explica que la grabación está archivada y
  se consulta desde el sistema, e incluye **el texto exacto que el cliente declaró** (`video_guion`)
  — eso sí es imprimible y es lo que da valor probatorio en el papel.
- **Sin expediente, el contrato queda EXACTAMENTE como antes** (raya en blanco, sin cláusula SEXTA,
  sin anexo) — verificado explícitamente, no asumido.
- **Cuidado con `nxVehiculoContrato`:** varias cadenas del contrato (`firmaTestigo`, el CSS de
  `.firmas`, el botón de imprimir) **existen 2 veces en el archivo** — la segunda es la de
  Vehículos. Los 4 reemplazos se hicieron sobre la PRIMERA ocurrencia con un script que imprime la
  línea tocada, y se confirmó que las 4 cayeron dentro de `nxPrestamoContrato`. Al tocar estos
  documentos, verificar SIEMPRE cuál de los dos se está editando.
- Verificado con Playwright generando el **documento real** (se intercepta `window.open` para
  capturar lo que escribe `document.write`, y luego se carga ese HTML como página para medirlo):
  **19 comprobaciones** — la firma va dentro y queda **encima** de la línea (medido con
  `getBoundingClientRect`: 959.4 vs 960.4, no encimada), cláusula SEXTA con la Ley 126-02, anexo
  con 4 bloques, el texto declarado del video, salto de página, sin desborde a 760px, y los 5 casos
  del contrato SIN expediente. 0 errores de JS. Las suites de Docs (22), expediente (12) y admin
  (53) repasadas sin regresión.
  - **De paso:** las imágenes del anexo pasaron de `width:100%` a `max-height:420px;width:auto` —
    con `width:100%` una foto vertical se estiraba hasta ocupar una página entera al imprimir.

### Financiamiento — el expediente firmado se guarda en los DOCUMENTOS del préstamo (25-jul-2026, v49.48)
El dueño mandó una captura del detalle del préstamo (con los botones Contrato/Estado/Docs) y pidió
*"que todo eso se guarde en ese documento y se visualice y se pueda actualizar"*.
- **Se preguntó antes de construir** (`AskUserQuestion`): "ese documento" podía ser **DOCS** (la
  carpeta de archivos del préstamo) o el **CONTRATO** imprimible — dos trabajos muy distintos. El
  dueño eligió **DOCS**. (Un contrato no se "actualiza", se vuelve a imprimir; DOCS sí.)
- **`copiarExpedienteADocs(prestamoId, s)`** (junto a `subirDocPrestamo`, mismo IIFE): las 4
  imágenes viven como **dataURL** en `prestamo_solicitudes` → se convierten a Blob
  (`dataUrlABlob`, con `atob`+`Uint8Array`, no `fetch('data:')`) y se suben a Storage con el
  **mismo `subirDocPrestamo` de siempre** (bucket `comprobantes`, ruta `prestamos/{id}/…`), así se
  ven y se manejan igual que cualquier documento subido a mano. **El VIDEO no se copia**: ya está
  en el bucket privado `documentos` y pesa varios MB — duplicarlo sería tirar espacio; se guarda
  una referencia `{privado:true, bucket, path}` y se firma una URL temporal al abrirlo
  (`nxPrDocVerPrivado`). Un solo `PATCH` al final con todo el arreglo, no uno por archivo.
- **Enganchado en `nxPrSolicitudAprobar`**, DESPUÉS de `cargarPrestamos()` (necesita el préstamo en
  memoria) y en su propio `try` — si falla, el préstamo ya está creado y el aviso manda al botón de
  respaldo. **No bloquea la aprobación.**
- **Retroactivo a pedido:** `window.nxPrestamoTraerExpediente(id)` + aviso morado con botón
  **"Traer expediente firmado"** dentro de `nxPrestamoDocs`, visible solo si el préstamo tiene
  solicitud ligada y ningún documento con `origen:'firma'`. Cubre los aprobados antes de esta
  versión y el caso de que una pieza fallara. **Idempotente** (`yaEsta(campo)`): tocarlo dos veces
  no duplica.
- **`DOC_TIPOS` ganó 3 tipos con bandera `soloLectura`** (`selfie`/`firma`/`video`): dan etiqueta e
  ícono en la lista pero **no** pintan tile de subida (la subida a mano sigue aceptando solo
  imagen/PDF, no se tocó su validación). Los del expediente salen marcados "Firmado por link" en
  morado para distinguirlos de los subidos a mano.
- Verificado con Playwright y el código real extraído **por contenido, no por número de línea**
  (`nxPrSolicitudAprobar` + todo el bloque de Docs): **22 comprobaciones** — aprobar crea el
  préstamo y sube las 4 imágenes con el **JWT del admin** (no la anon key) a la carpeta del
  préstamo, quedan 5 documentos, el video queda como referencia sin URL pública, la carpeta los
  muestra con su nombre real y la marca, abrir el video pide URL firmada y abrir una imagen usa la
  pública, borrar uno actualiza la lista, el botón de respaldo trae los 5 y tocarlo otra vez no
  duplica. Sin desborde en 390px, 0 errores de JS.
  - **Nota de método (repetida a propósito):** este harness localiza el código con `grep` sobre el
    contenido en vez de un rango de líneas fijo — la lección de la v49.47, donde una suite falló
    solo porque el rango se había corrido.

### Financiamiento — el expediente firmado y el préstamo, conectados en los 2 sentidos (25-jul-2026, v49.47)
El dueño preguntó: *"¿Y después que esté aprobado dónde veo esos expedientes?"*
- **Lo que YA existía (se verificó en el código antes de tocar nada, no se dio por hecho):** la
  pestaña **Solicitudes** lista TODAS, incluidas las `aprobada` (badge verde + KPI "APROBADAS"), y
  `nxPrSolicitudVer` sigue mostrando los 4 documentos + el video después de aprobar — el bloque de
  documentos solo se oculta cuando el estado es `pendiente` (el cliente todavía no abrió el link).
  O sea, el expediente NO se pierde al aprobar; lo que faltaba era el camino para llegar.
- **El hueco real:** desde el **préstamo** no había forma de llegar a su expediente. La única pista
  era la nota de texto que deja `nxPrSolicitudAprobar` (`[Firmado por link — … en la solicitud
  09705b0c]`) — el número está, pero había que ir a buscarlo a mano en la lista.
- **Construido (chico, sin esquema nuevo, sin consultas nuevas):** `window.nxPrestamoExpediente(id)`
  busca en `_prSolicitudes` (ya cargado por `cargarPrestamos`) la solicitud con
  `prestamo_id === id` y abre `nxPrSolicitudVer`. El botón **"Expediente firmado"** se agregó a
  `nxPrActs` de `nxPrestamoVer` **solo si esa solicitud existe** — un préstamo tecleado a mano no
  muestra un botón que no lleva a ningún lado. Camino de vuelta: en el detalle de una solicitud
  `aprobada` con `prestamo_id`, aviso verde ("ya es un préstamo real, estos documentos quedan
  guardados como respaldo") + botón **"Ver el préstamo"**.
- Verificado con Playwright y el código real extraído (`nxPrestamoExpediente` + `nxPrSolicitudVer`
  tal cual): 12 comprobaciones — el botón abre el expediente del cliente correcto, se siguen viendo
  las 4 imágenes y se pide el video del bucket privado, NO salen Aprobar/Rechazar en una ya
  aprobada, "Ver el préstamo" salta al id correcto y cierra el expediente, y un préstamo sin link
  avisa con un toast en vez de abrir un modal vacío. Sin desborde en 390px, 0 errores de JS.
  Las 53 pruebas del lado admin repasadas sin regresión.
  - **Nota de método:** al agregar líneas en `parches.js` se corrió el rango del extractor del
    harness y una suite falló por eso (no por el código). Recordatorio: **los extractores por número
    de línea hay que recalcularlos con `grep` después de cada edición**, no reusar el rango viejo.

### `swalConfirm` decía "ELIMINAR" en rojo al APROBAR un préstamo — arreglado de raíz (25-jul-2026, v49.46)
El dueño mandó una captura: el aviso preguntaba *"¿Aprobar y crear el préstamo?"* y el botón de
confirmar decía **ELIMINAR**, en rojo. Da miedo tocarlo, y con razón.
- **Causa raíz:** `swalConfirm(icon,title,msg)` (`index.html`, ~línea 8926) nació SOLO para borrar y
  traía el botón `Eliminar` + `background:#ef4444` **escrito a fuego en el HTML**. Después se reusó
  para otras acciones (aprobar solicitud) y el botón se quedó igual. No era un descuido de esa
  pantalla — era una trampa del helper compartido: **cualquier uso futuro que no fuera borrar iba a
  repetir el mismo error**.
- **Arreglo — se cambió el DEFAULT, no solo el caso reportado:** la función ganó un 4to parámetro
  `opts` (`{ok, color}`). Clave: el default pasó a ser **neutro** (`'Confirmar'`, azul `#2563eb`), no
  "Eliminar" rojo — así, si algún día alguien agrega un aviso nuevo y olvida el texto, sale algo
  inofensivo en vez de un botón de borrado. Para borrar hay que **pedirlo explícitamente**.
- **Los 6 usos del sistema, revisados uno por uno** (son solo 6, se auditaron todos, no solo el
  reportado): 5 son de borrado y pasan `{ok:'Eliminar',color:'#ef4444'}` — quedan idénticos a como se
  veían (constante `SWAL_BORRAR` en `index.html` para los 2 del núcleo; literal en los 3 de
  `parches.js`, siguiendo el patrón de IIFE autocontenido del archivo). El 6to, aprobar la solicitud
  de préstamo (`nxPrSolicitudAprobar`), pasa `{ok:'Aprobar',color:'#16a34a'}` — **verde**, coherente
  con su ✅ y con lo que de verdad hace.
- El texto del botón se pasa por `escHtml()` (antes era literal fijo; ahora es configurable).
- Verificado con Playwright cargando el **código real de `swalConfirm` extraído de `index.html`** (no
  reconstruido): 10 comprobaciones — aprobar muestra "Aprobar" verde (`rgb(22,163,74)`) y NO dice
  "Eliminar", borrar sigue en "Eliminar" rojo (`rgb(239,68,68)`), sin opciones sale "Confirmar" azul,
  y confirmar/cancelar devuelven `true`/`false` correctamente. `node --check parches.js` limpio; los
  3 `<script>` de `index.html` y el de `firma-prestamo.html` pasan `new Function()`.
- **Confirmado de paso, con datos reales:** la solicitud de firma por link **funcionó de punta a
  punta**. En `prestamo_solicitudes` hay una fila en estado `enviada` con cédula frente/dorso, selfie
  y firma, y en Storage está el video (`documentos/prestamo-solicitudes/<id>/compromiso.mp4`, 3.83 MB,
  `video/mp4; codecs=avc1…` = grabado desde iPhone) subido a las **15:23 RD, después del arreglo de la
  v49.44**. O sea: la grabadora en página, la subida firmada y el flujo completo quedaron verificados
  en producción, no solo en pruebas.

### Financiamiento — el teléfono del cliente se quedaba con la página VIEJA del link (25-jul-2026, v49.45)
El dueño mandó 2 capturas del mismo error del video ("No se pudo subir el video…"). **Detalle que
delató lo que pasaba:** el aviso salía SIN el motivo real debajo — justo la línea que se había
agregado en la v49.44. O sea, su teléfono estaba corriendo la página ANTERIOR.
- **Confirmado con los logs, por hora exacta** (no por suposición): `14:54:36` intento 1 → 400 ·
  `15:06:27` intento 2 → 400 · `15:08:35` v5 desplegada (el arreglo) · `15:09:26` prueba real → 200.
  El reloj de su captura marca **3:06**, que calza al segundo con el intento de las `15:06:27` —
  **2 minutos ANTES del arreglo**. Sus capturas eran del problema anterior, no de uno nuevo.
- **Pero destapó un problema real y propio de este flujo:** `firma-prestamo.html` es una página
  estática que el cliente abre UNA vez desde un link de WhatsApp, y **su URL nunca cambia** — así que
  el teléfono (o Cloudflare) puede servir una copia guardada y **un arreglo publicado después nunca
  le llega**. A diferencia de la app (`index.html`), esta página no tiene botón "Actualizar" ni
  `APP_VERSION` que rompa la caché. El cliente se queda con el fallo pegado, sin manera de saberlo.
- **Arreglo, en dos capas:** (1) `<meta http-equiv="Cache-Control" no-cache, no-store,
  must-revalidate">` + `Pragma`/`Expires` en la página; (2) **el link que genera el panel ahora lleva
  `&v=<APP_VERSION>`** (`nxPrLinkFirmaMostrar`) — cada versión publicada produce una dirección
  distinta, así que después de cada actualización es imposible que abra una copia vieja. La página
  ignora ese parámetro (solo lee `id`), así que los links ya enviados siguen funcionando igual.
- **Lección para cualquier página pública futura** (`rifa.html`, `boleto.html`, `vendedor.html`, esta):
  no tienen mecanismo de actualización propio. Si se publica un arreglo, hay que asumir que el
  usuario puede seguir viendo la versión vieja — el `&v=` en el link generado es el patrón a repetir.
- 128 pruebas en verde (20 grabadora + 55 página pública + 53 lado admin, incluida la URL del link).
  `node --check parches.js` limpio; los 3 `<script>` de `index.html` y el de `firma-prestamo.html`
  pasan `new Function()`; `version.json` válido.
- **Pendiente:** que el dueño genere un link **NUEVO** (no reutilice el de antes) y confirme la
  grabación real desde su iPhone — sigue sin haber ningún intento posterior al arreglo en los logs.

### Financiamiento — el video no se guardaba: bug real de UNA LÍNEA en la función Edge (25-jul-2026, v49.44)
El dueño: *"Cuando termino el video dice que no se pudo guardar, que intente de nuevo."*
- **Cómo se encontró (no a ojo — con evidencia del servidor):** `get_logs(service:'storage')` mostró la
  línea exacta: `POST | 400 | /object/upload/sign/documentos/prestamo-solicitudes/<id>/compromiso.mp4`.
  O sea, **no fallaba la subida del video** — fallaba el paso ANTERIOR, cuando la función Edge le pide
  a Storage la URL firmada. Se descartó "el archivo ya existe" con SQL directo (`storage.objects` del
  bucket `documentos` estaba **vacío**, 0 filas).
- **Causa raíz — mía, de una línea:** la petición a `/object/upload/sign/...` mandaba
  `Content-Type: application/json` **sin body**. El servidor de Storage (Fastify) rechaza con **400**
  una petición que declara JSON y viene con el cuerpo vacío. Nunca salió en las pruebas porque en el
  harness de Playwright esa llamada a Storage estaba simulada — **la simulación no reproduce el
  contrato real del servidor.** Lección: cuando el fallo puede vivir en la frontera con un servicio
  externo, la simulación no basta como verificación.
- **Arreglo (función Edge v5):** `body: JSON.stringify({ upsert: true })` — resuelve el 400 y de paso
  permite **regrabar** (antes, un segundo intento habría fallado por archivo duplicado). En el
  navegador, el `PUT` a la URL firmada ganó `x-upsert: true` por el mismo motivo. Confirmado con la
  documentación (`search_docs`) que `upsert` es una opción válida de `createSignedUploadUrl`.
- **VERIFICADO DE VERDAD contra el servidor real, no simulado:** este entorno no tiene salida a
  internet (ni `curl`), pero **`pg_net` sí corre dentro de Supabase** — se creó una solicitud de
  prueba, se llamó a la función desplegada con `net.http_post` y se leyó la respuesta en
  `net._http_response`: **200 con `signedUrl` real** (antes: 400). Datos de prueba borrados después.
  Este es el camino a usar de aquí en adelante para probar funciones Edge desde esta sesión.
- **De paso, para que un fallo futuro no vuelva a dejar a ciegas:** la función Edge ahora devuelve el
  **detalle real de Storage** (código + texto) en vez de un "No se pudo preparar la subida" genérico, y
  la página del cliente **muestra ese motivo** debajo del aviso en vez de solo "intenta de nuevo". Un
  mensaje fijo fue justo lo que hizo falta diagnosticar esto desde los logs en vez de desde la pantalla.
- **No verificable desde aquí (queda al dueño):** el `PUT` binario a la URL firmada — `pg_net` solo
  admite `Content-Type: application/json`, así que la subida en sí no se pudo ejercitar. Es el mismo
  código de siempre + `x-upsert`; el paso que de verdad estaba roto sí está confirmado arreglado.
- 75 pruebas Playwright en verde (20 de la grabadora + 55 de la página, 1 nueva: el aviso de error
  muestra el motivo real). `node --check parches.js` limpio; los 3 `<script>` de `index.html` y el de
  `firma-prestamo.html` pasan `new Function()`; `version.json` válido.

### Financiamiento — el cliente no podía LEER el guion mientras grababa el video (25-jul-2026, v49.43)
El dueño: *"Al grabar el video, no se puede leer el texto de lo que el cliente va a decir en la
grabación del video."*
- **Causa raíz (obvia una vez vista, y es del diseño original de v49.40):** el botón "Grabar el
  video" era un `<input type="file" accept="video/*" capture="user">` — eso abre la **app de cámara
  nativa del teléfono, a pantalla completa**. El guion (`.guion`) se queda en la página, DETRÁS de
  la cámara: el cliente lo lee antes, toca grabar, y ya no lo ve. Con un guion de 2-3 líneas con
  montos exactos, es imposible repetirlo de memoria — la función servía a medias.
- **Arreglo — grabar DENTRO de la misma página, con el guion encima (teleprónter):**
  `window.__grabarVideo()` abre una capa a pantalla completa (`.rec`) con `getUserMedia`
  (`facingMode:'user'` + audio) en un `<video autoplay muted playsinline>` de fondo, el **guion fijo
  en la mitad de abajo** (`.recTxt`, 17px, fondo oscuro semitransparente, con scroll propio si es
  largo), botón de grabar/detener estilo cámara (`.recBtn`, rojo → cuadro blanco) y reloj en vivo.
  Graba con **`MediaRecorder`**, tope automático de **3 minutos**, y al detener manda el `Blob`
  directo al mismo camino de subida de siempre.
- **Refactor mínimo:** la subida se extrajo de `__videoFile(input)` a **`subirVideo(f, ext, mime)`**
  (acepta un `File` o un `Blob` indistintamente) — la URL firmada, el `PUT` a Storage y el manejo de
  error no cambiaron ni una línea de lógica. `__videoFile` quedó solo como el camino de respaldo.
- **Respaldo real, no decorativo (nunca se queda sin poder grabar):** `puedeGrabar()` comprueba
  `mediaDevices.getUserMedia` + `MediaRecorder` + que haya un `mimeType` soportado
  (`mimeGrabacion()` prueba `video/mp4` primero — el único que acepta iOS Safari — y cae a `webm`).
  Si algo falta, el botón abre la cámara nativa igual que antes. Si el cliente NIEGA el permiso de
  cámara, la capa muestra un aviso claro + el botón **"Usar la cámara del teléfono"** (que también
  está siempre visible abajo, por si prefiere ese camino). El subtítulo del botón cambia según el
  caso — no promete el teleprónter en un teléfono que no lo soporta.
- **La extensión y el tipo salen de la grabación REAL** (`extDeMime(mr.mimeType)`), no de un valor
  fijo — la función Edge ya saneaba `ext`, así que no hizo falta tocarla. Cero cambios de esquema,
  cero cambios en el Edge Function, cero cambios del lado admin.
- **Verificado con Playwright contra el archivo REAL** `firma-prestamo.html` servido por HTTP local,
  en un Chromium con cámara y micrófono falsos (`--use-fake-device-for-media-stream`): **20 pruebas
  nuevas** — se abre la grabadora en vez de la cámara nativa, el guion está visible y DENTRO de la
  pantalla (medido con `getBoundingClientRect`, no a ojo) tanto antes como **mientras graba**, la
  cámara conecta y habilita el botón, grabar cambia el botón y arranca el reloj, al detener se sube
  un video con **bytes reales** (102 KB en la prueba) por `PUT` con su tipo real, el botón queda en
  "Video listo" con vista previa, y cerrar sin grabar no sube nada ni deja la cámara encendida — más
  las **54 anteriores sin regresión** (el camino de la cámara nativa sigue igual). Capturas a 390px.
  `node --check parches.js` limpio; los 3 `<script>` de `index.html` y el de `firma-prestamo.html`
  pasan `new Function()`; `version.json` válido.
- **Nota honesta:** el entorno no tiene salida a internet, así que se probó con cámara simulada y
  backend simulado — falta que el dueño lo confirme grabando desde su iPhone real (Safari soporta
  `MediaRecorder` desde iOS 14.3; en versiones anteriores cae solo al camino de siempre).

### Financiamiento — la declaración TAMBIÉN se corrige, y fuera "Total a devolver" (25-jul-2026, v49.42)
El dueño mandó una captura de la página del cliente en su iPhone: *"Las correcciones que hago antes de
generar el link no se reflejan cuando lo envío y debajo de cuota vamos a quitar donde dice total a
devolver"*.
- **Se verificó primero, antes de tocar nada** (SQL directo sobre `prestamo_solicitudes`): su
  corrección **SÍ se había guardado bien** — el valor en `video_guion` de su solicitud era
  exactamente el texto que él escribió ("…20 cuotas quincenales de RD$ 2,000 QUE SERÁ DESCONTADO
  DESDE LA NÓMINA"). O sea, el guardado de v49.41 funcionaba.
- **Causa raíz — un hueco de diseño MÍO, no un bug de guardado:** la pantalla de revisión (v49.41)
  solo dejaba corregir el **guion del video**. Pero lo que se ve en la captura del dueño, y lo
  primero que el cliente lee, es el **recuadro morado de arriba** (la declaración de compromiso,
  tarjeta 1 "Tu préstamo") — ese se armaba solo con `terminosTexto()` y **no había forma de
  tocarlo**. Él corrigió el guion, miró la pantalla, vio el recuadro morado con el texto automático
  de siempre, y concluyó (con razón, desde su lado) que su corrección no se aplicaba.
- **Arreglo — mismo patrón de 3 capas que ya tenía el guion, ahora también para la declaración:**
  columna nueva `prestamo_solicitudes.declaracion` (migración `prestamo_solicitudes_declaracion`,
  aditiva); `prDeclaracionTexto(d)` en `parches.js` (pareja de `prGuionTexto`, duplica a propósito
  `terminosTexto()` de `firma-prestamo.html` — dos archivos independientes, si cambia hay que tocar
  los dos); tarjeta nueva **"Declaración que verá en pantalla"** (`#prLkDecl`) en `nxPrLinkRevisar`,
  prellenada y editable; `nxPrLinkCrear` la valida (no puede quedar vacía) y la guarda. En la página
  pública, `declaracionTexto()` usa `S.declaracion` si viene y solo genera la suya como respaldo
  (links viejos). La función Edge (**v4**) `traerPendiente()` ahora devuelve la fila y **solo
  escribe `declaracion`/`video_guion` si la solicitud no traía ninguno** — el navegador del cliente
  nunca pisa lo que el dueño aprobó.
- **Fuera "Total a devolver"** (lo pedido): se quitó la fila `termrow` de la tarjeta 1 de
  `firma-prestamo.html`, y **también** la cifra del total del guion (`prGuionTexto`/`guionTexto`) y
  de la declaración — si no, el número que él quitó de la pantalla seguía saliendo en el texto que
  el cliente lee en voz alta y en el recuadro morado. Ahora los tres dicen lo mismo.
- **Verificado:** **54 pruebas** contra el archivo REAL `firma-prestamo.html` servido por HTTP local
  (las 48 anteriores sin regresión + 6 nuevas: ya no aparece la fila "Total a devolver", la
  declaración se arma con los datos reales y sin el total, con `declaracion` se muestra la corregida
  y NO la automática, y al publicar se devuelve esa misma) y **53** contra el código real extraído
  de `parches.js` del lado admin (las 50 anteriores + 3 nuevas: la declaración es un textarea
  prellenado con los datos reales y lo corregido es lo que se guarda). `node --check parches.js`
  limpio; los 3 `<script>` de `index.html` y el de `firma-prestamo.html` pasan `new Function()`;
  `version.json` válido.

### Financiamiento — pantalla de revisión antes de mandar el link de firma (25-jul-2026, v49.41)
El dueño pidió **ver y poder corregir el texto antes de enviarle el link al cliente**. Antes,
`nxPrGenerarLinkFirma()` creaba la solicitud de una y el guion se generaba solo en la página
pública, sin que él lo viera nunca.
- **El botón ya no crea nada: abre una pantalla de revisión.** `nxPrGenerarLinkFirma()` ahora solo
  calcula los términos y los deja en `_prLinkDraft` (variable de módulo), y llama a
  `nxPrLinkRevisar()`. La creación real pasó a **`nxPrLinkCrear()`**, que corre al tocar "Crear el
  link". Si cancela, no se guarda nada (nunca se llegó a postear).
- **Qué se puede corregir:** el **guion del video** (`#prLkGuion`) y el **mensaje de WhatsApp**
  (`#prLkMsg`), ambos prellenados con lo que se generaba automáticamente. Los **términos** se
  muestran de solo lectura con una nota de que se cambian en el simulador — no se editan aquí a
  propósito: son los números reales del préstamo, y dejarlos editar abriría la puerta a que el
  texto no coincida con lo que se guarda en `prestamos`.
- **`prGuionTexto(d)` (parches.js)** duplica a propósito la lógica de `guionTexto()` de
  `firma-prestamo.html` — son dos archivos independientes sin nada compartido (la página pública es
  standalone, sin acceso a `parches.js`). Si un día cambia el texto base hay que tocar **los dos**.
- **El guion aprobado gana, en las 3 capas** (para que lo que el dueño corrigió no se pise nunca):
  (1) `nxPrLinkCrear` lo guarda en `video_guion` al crear; (2) la página pública usa `S.video_guion`
  si viene y solo genera el suyo como respaldo (links viejos, creados antes de esta versión); (3) la
  función Edge **ya no sobrescribe** `video_guion` al publicar — solo lo escribe si la solicitud no
  traía ninguno. Sin ese tercer candado, el navegador del cliente habría pisado el texto aprobado.
- **`nxPrLinkFirmaMostrar` ganó un 4to parámetro `mensaje`** (el de WhatsApp ya corregido), con
  respaldo al texto de siempre si no llega. El link se pega al final del mensaje, no se edita.
- **Verificado:** **50 pruebas** del lado admin (las 40 anteriores sin regresión + 10 nuevas: el
  botón no crea nada, la revisión muestra términos/guion/mensaje prellenados y editables, cancelar
  no crea, confirmar guarda el **texto corregido** y no el automático, y el WhatsApp usa el mensaje
  corregido con el link pegado) y **48 en la página pública** (las 44 anteriores + 4 nuevas: con
  `video_guion` se muestra el corregido y NO el automático, y al publicar se devuelve ese mismo).
  `node --check parches.js` limpio; los 3 `<script>` de `index.html` y el de `firma-prestamo.html`
  pasan `new Function()`; `version.json` válido. Sin migración de esquema (`video_guion` ya existía
  de v49.40 — solo cambió QUIÉN y CUÁNDO la llena: antes el cliente al publicar, ahora el dueño al
  crear el link).

### SUPABASE STORAGE — SÍ EXISTE (el CLAUDE.md decía que no) + hueco de seguridad real cerrado (25-jul-2026, v49.40)
**Hallazgo importante que corrige varias notas viejas de este mismo archivo.** Al buscar dónde
guardar el video de compromiso se descubrió que **Supabase Storage SÍ está configurado y EN USO**
desde jun-2026 — contradice las notas de v49.19/v49.23/v48.53 que decían "sin Storage" y por eso
descartaron funciones (Documentos del Historial Crediticio, del Comprobante, etc.). **Cualquier
trabajo futuro que las cite debe verificar primero, no darlas por buenas.**
- **3 buckets reales:** `comprobantes` (público, tope 5 MB, solo imágenes — 45 archivos, 8 MB:
  bauches de entregas + documentos de préstamos y vehículos), `documentos` (privado, sin tope ni
  restricción de tipo — 0 archivos, el flujo de `documentos_clientes` de `index.html` nunca se usó),
  `respaldos` (privado — 4 archivos, 17 MB, respaldos completos de la base que escribe la función
  `respaldo-diario`).
- **HUECO DE SEGURIDAD REAL, ya cerrado (migración `storage_policies_solo_autenticados`):** las 4
  políticas de `storage.objects` eran para el rol **`public`** (que incluye `anon`) **sin ninguna
  condición** — y la anon key es pública, va en el código fuente de `index.html`. O sea: cualquiera
  en internet podía **descargar y BORRAR** los 3 buckets, incluidos los **respaldos completos de la
  base de datos** (todos los clientes, facturas, cobros). Ahora: `SELECT/INSERT/UPDATE/DELETE` solo
  para `authenticated` y solo en `comprobantes`/`documentos`; **`respaldos` quedó fuera de toda
  política** (solo lo tocan las funciones Edge con service-role, que no pasa por RLS).
- **La otra mitad del arreglo, que iba OBLIGATORIAMENTE junta:** las 8 llamadas a Storage del
  frontend armaban sus headers a mano con **`api.key` (la anon key) como Bearer** en vez del JWT del
  usuario — o sea, subían como `anon`. Restringir las políticas sin esto habría **roto en producción**
  los bauches y los documentos de préstamos/vehículos. Los 8 sitios (3 en `index.html`: `subirDoc`
  ×2 + `subirDocExtra`; 5 en `parches.js`: bauches, docs de préstamo subir/borrar, docs de vehículo
  subir/borrar) pasaron a `'Bearer ' + (api.token || api.key)` — el MISMO patrón que ya usaba
  `API.hdr()` desde siempre y otros 2 sitios de `parches.js`. Verificado con grep que no queda
  ninguno con la anon key sola.
- **Por qué la lectura pública de `comprobantes` NO se rompió:** ese bucket tiene `public=true` y
  se sirve por `/storage/v1/object/public/...`, endpoint que **no evalúa RLS** — las URLs públicas
  ya guardadas en la base (45 comprobantes) siguen funcionando igual. Las políticas solo alcanzan al
  endpoint autenticado.
- **Pendiente / no tocado a propósito:** `documentos_clientes` (índex.html) construye URLs
  `/object/public/documentos/...` para un bucket que es **privado** — esas URLs nunca habrían
  funcionado. Es un bug preexistente, pero la tabla tiene **0 filas** (el flujo jamás se usó), así
  que no se tocó en esta ronda para no ampliar el alcance.

### Financiamiento — Fase 2 del link de firma: video de compromiso + foto con la cédula (25-jul-2026, v49.40)
Continuación de la Fase 1 (v49.39). El dueño eligió por `AskUserQuestion` sumar **video de
compromiso** y **selfie con la cédula en mano** (descartó comprobante de ingresos y de dirección).
- **Columnas nuevas en `prestamo_solicitudes`** (migración `prestamo_solicitudes_selfie_y_video`,
  aditiva): `selfie` (dataURL, igual que `cedula_frente`/`cedula_dorso` — es una foto, pesa poco),
  `video_path` (la RUTA en Storage, **no** el video: un video de 30s pesa varios MB y en base64
  crecería ~33% más — no cabe en una columna de texto como las fotos) y `video_guion` (deja
  constancia del texto exacto que se le pidió leer).
- **Cómo sube el video un cliente SIN sesión** (el punto delicado: tras cerrar el hueco de
  seguridad, `anon` ya no puede escribir en Storage — y así debe ser). Patrón de **URL firmada**:
  el navegador pide `POST {id, accion:'firmar-video', ext}` a la función Edge; la función valida
  que la solicitud siga `pendiente`, **decide ella la ruta** (`prestamo-solicitudes/{id}/compromiso.{ext}`,
  el cliente nunca la elige) y devuelve una URL de subida firmada; el teléfono hace `PUT` directo
  a esa URL. Así el archivo pesado **no pasa por la función** (evita su límite de payload) y nadie
  puede escribir fuera de su carpeta. Al publicar, la función **solo acepta el `video_path` si
  empieza por el prefijo de ESA solicitud** — no se puede apuntar a un archivo ajeno.
- **Bucket `documentos` (privado), no `comprobantes`:** el video es un documento legal con la cara
  y la voz del cliente — no puede quedar en un bucket público. Además `comprobantes` tiene tope de
  5 MB y solo acepta imágenes, así que técnicamente tampoco servía.
- **El guion NO es texto libre** (criterio ya acordado en la Fase 1): `guionTexto()` lo arma con los
  términos REALES de esa solicitud — nombre, monto, número y frecuencia de cuotas, monto de cuota y
  total. Para línea de crédito cambia solo (habla de tasa mensual y plazo del capital, no de cuotas).
  Así lo que el cliente dice en el video coincide exactamente con lo que firma.
- **Lado admin (`nxPrSolicitudVer`):** se muestran la selfie y el video. Como el bucket es privado,
  `nxPrSolVideoCargar(path)` pide una **URL firmada de lectura** (`POST /storage/v1/object/sign/...`,
  1 hora) con el JWT del admin y monta el `<video>`; si falla, avisa en vez de dejar un reproductor
  roto. Se muestra también el `video_guion` guardado, para comparar con lo que se oye.
- **La nota que queda en el préstamo al aprobar lista SOLO lo que de verdad llegó** (`['cédula',
  'firma']` + foto/video si existen) — una solicitud creada antes de esta versión no dice que tiene
  video. Mismo criterio de "no dar por hecho" del resto del sistema.
- **El video es obligatorio para publicar** (junto con las 2 fotos de cédula, la selfie y la firma):
  es la garantía que el dueño quería. Si la subida falla, se avisa con un mensaje claro y el botón
  Publicar sigue deshabilitado — no se puede enviar una solicitud a medias.
- **Verificado:** **44 pruebas Playwright** contra el archivo REAL `firma-prestamo.html` (no un
  extracto) — incluyendo que el guion trae los datos reales en los 2 modos (cuotas y crédito), que
  se pide el permiso de subida, que el video sube por `PUT` a la URL firmada con su tipo real, que
  se manda la RUTA y no el video entero, y que **si la subida falla no se puede publicar** — y **40
  pruebas** contra el código real extraído de `parches.js` del lado admin (las 26 anteriores sin
  regresión + 14 nuevas: se ven las 4 imágenes, se pide la URL firmada con la ruta correcta y **con
  el JWT del admin, no con la anon key**, si la firma falla se avisa, una solicitud vieja sin
  selfie/video no muestra secciones vacías, y la nota lista solo lo recibido). `node --check
  parches.js` limpio; los 3 `<script>` de `index.html` y el de `firma-prestamo.html` pasan
  `new Function()`; `version.json` válido. Sin desbordes en 390-420px, 0 errores de JS.
  **Nota honesta:** este entorno no tiene salida a internet, así que la subida real por HTTPS a
  Storage no se pudo ejercitar desde aquí — se verificó toda la lógica con el backend simulado y a
  nivel SQL. Falta la confirmación del dueño grabando un video real desde su teléfono.

### Financiamiento — link público para que el cliente firme (cédula + firma) antes de crear el préstamo (25-jul-2026, v49.39)
El dueño pidió algo nuevo: al armar un préstamo, poder mandarle al cliente un **link por WhatsApp**
(sin login) donde suba la foto de su cédula (frente/dorso) y firme con el dedo, ANTES de que el
préstamo se cree de verdad — el dueño lo revisa y aprueba después. Se le preguntó y confirmó por
`AskUserQuestion`: (1) el link se genera **ANTES** de que el préstamo exista — el cliente firma primero
y eso crea la solicitud, no al revés; (2) el video de compromiso hablado (parte del pedido original) se
**difirió a una fase futura** (necesitaría Supabase Storage para archivos de video, más pesado que una
foto — se construyó primero la Fase 1 sin video: cédula + firma).
- **Bloqueo real durante la construcción:** el conector MCP de Supabase de esta sesión se desconectó a
  mitad de camino y no volvió a responder por el resto de esa sesión — sin él no se podía crear la tabla
  ni desplegar la función Edge. Se codificó y probó TODO el lado del frontend contra un backend simulado
  (Playwright), pero **no se publicó a `main`** — se dejó en una rama aparte
  (`claude/financiamiento-link-firma`) hasta poder cerrar la pieza de Supabase, exactamente para no dejar
  un botón "Generar link" que fallara en producción. En la sesión siguiente el conector volvió a
  funcionar y se completó: tabla + función Edge + verificación de punta a punta, y AHORA sí se publicó.
- **Tabla nueva `prestamo_solicitudes`** (aditiva, mismo patrón que `prestamos`/`prestamo_clientes`: RLS
  `mi_rol()='admin'`, sin `organizacion_id` — módulo de un solo dueño). Guarda los términos del préstamo
  propuesto (nombre, cédula, teléfono, modo/capital/tasa/cuotas/etc., igual que `prestamos`) + `estado`
  (`pendiente`→`enviada`→`aprobada`|`rechazada`, con CHECK constraint) + `cedula_frente`/`cedula_dorso`/
  `firma` (dataURL, mismo patrón de compresión ya usado en Rifas — canvas, máx 1000px, JPEG 0.75) +
  `prestamo_id`/`motivo_rechazo`/`revisado_at`/`revisado_por` para cuando el dueño decide.
- **Función Edge nueva `prestamo-solicitud`** (`verify_jwt:false` — el link es público, sin sesión,
  mismo patrón que `rifa`/`boleto`/`vendedor`): GET `?id=` devuelve solo los campos que la página pública
  necesita mostrar (términos del préstamo, nunca cédula/teléfono/notas); POST `{id,cedula_frente,
  cedula_dorso,firma}` valida que las 3 imágenes sean dataURLs reales, **exige que el estado sea
  `pendiente`** antes de aceptar (blindaje server-side: si alguien reintenta publicar el mismo link ya
  usado, o lo intenta con `curl` saltándose la UI, se rechaza igual) y hace el `PATCH` con
  `estado:'enviada'`. Usa la service-role key (bypassa RLS, igual que las demás funciones públicas del
  sistema) — el navegador del cliente nunca toca `prestamo_solicitudes` directo.
- **`window.nxPrGenerarLinkFirma()`** (`parches.js`, IIFE de Financiamiento): botón "Link de firma"
  junto a "Compartir" en la vista previa de cuotas de `abrirForm` (nuevo préstamo) — lee el simulador
  TAL CUAL está en pantalla (mismo patrón que `nxPrPropuesta`, sin tocar `nxPrestamoGuardar`), valida que
  el simulador esté completo (capital+tasa para crédito, capital+n cuotas para cuotas fijas; **abonos
  libres no genera link** — no tiene cuotas fijas que mostrarle al cliente, avisa en vez de fingir),
  postea a `prestamo_solicitudes`, y muestra el link + botón de WhatsApp (`nxPrLinkFirmaMostrar`).
- **Pestaña "Solicitudes"** nueva en la barra lateral (con contador de "por revisar" en vivo,
  `_prSolicitudes.filter(s=>s.estado==='enviada').length`): 3 KPIs (por revisar/sin enviar/aprobadas),
  tabla con badge de estado, y `nxPrSolicitudVer` (modal de detalle) — si el cliente no ha abierto el
  link, avisa honesto ("todavía no ha abierto el link") en vez de mostrar campos vacíos; si ya envió,
  muestra las 3 imágenes + los términos + botones **Aprobar y crear préstamo** (hace el `POST` real a
  `prestamos` con esos términos + una nota `[Firmado por link — cédula y firma en la solicitud ...]` +
  el `PATCH` que marca la solicitud `aprobada` con el `prestamo_id`) y **Rechazar** (pide motivo,
  `PATCH` a `rechazada`).
- **Página pública `firma-prestamo.html`** (nueva, raíz del repo, mismo patrón que `rifa.html`/
  `boleto.html`/`vendedor.html` — HTML+JS vanilla standalone, sin build): 3 tarjetas (Tu préstamo —
  términos + declaración de compromiso con el nombre real del cliente; Tu cédula — 2 fotos con
  compresión client-side; Tu firma — canvas táctil) + checkbox de aceptación + botón "Publicar"
  (deshabilitado hasta que las 2 fotos + la firma + el checkbox estén completos). Maneja 4 estados
  honestos: cargando, formulario, "ya enviaste tus datos" (si vuelve a abrir el mismo link después de
  publicar), y enlace inválido/no encontrado.
- **Verificado de punta a punta:** el backend se probó con SQL directo simulando exactamente las mismas
  consultas que hace la función Edge (INSERT como lo haría el admin → SELECT con las mismas columnas que
  expone el GET público → UPDATE con la misma guardia de estado que usa el POST → confirmado que un
  segundo intento de envío ya no encuentra ninguna fila `pendiente`, 0 resultados), sin dejar datos de
  prueba en la base real. `get_advisors(security)` sin hallazgos nuevos. El frontend se verificó con
  **21 pruebas Playwright** contra el archivo REAL `firma-prestamo.html` (no un extracto) — cédula+firma
  +checkbox+validaciones+casos de link ya usado/inválido — y **26 pruebas** contra el código real
  extraído de `parches.js` del lado admin (generar link, pantalla de Solicitudes, aprobar crea el
  préstamo real, rechazar) — las 47 en verde, 0 errores de JS, sin desbordes en 390-420px. `node --check
  parches.js` limpio; los 3 `<script>` de `index.html` pasan `new Function()`; `version.json` válido.
  **Nota honesta sobre el alcance de la prueba:** este entorno de sesión no tiene salida a internet (ni
  siquiera `curl` funciona), así que la función Edge desplegada no se pudo invocar por HTTPS real desde
  aquí — se verificó su lógica exacta a nivel SQL (mismas consultas, mismos filtros) y por el mismo
  patrón ya probado en producción con `rifa`/`boleto`/`vendedor`; falta la confirmación visual del dueño
  probando el link real en su teléfono.
- **Pendiente (Fase 2, si el dueño la pide):** el video de compromiso hablado — necesitaría Supabase
  Storage (subir un archivo de video en vez de un dataURL de texto, cambio de mayor alcance) y un guion
  armado con los términos reales del préstamo (ya se había acordado el enfoque: no texto libre, sino un
  guion derivado de los datos reales, mismo criterio de "no fingir" del resto del sistema).

### Financiamiento — detalle del préstamo rediseñado con un mockup del dueño (25-jul-2026, v49.38)
El dueño mandó una imagen ("Detalle de préstamo") de un mockup de un ERP de préstamos completo — topbar
con buscador/notificaciones/perfil "Casa Matriz", barra lateral con Desembolsos/Moras/Refinanciaciones/
Fiadores/Usuarios/Sucursales, un widget "NEXUS AI" de riesgo, y una pantalla de detalle con 5 KPIs, form
de "Registrar pago", panel de cliente, panel de detalles, barra de progreso, accesos rápidos, tabla de
cuotas con columna Mora, y línea de tiempo de actividad — y pidió: **"Tal como se ve en la imagen, para
sistema de financiamiento multiempresa"**.
- **Auditado contra el código y el esquema reales ANTES de tocar nada** (mismo criterio de todo el
  módulo): la mayor parte del "shell" del mockup (topbar con buscador/notificaciones, sucursal "Casa
  Matriz", NEXUS AI de riesgo, Desembolsos/Moras/Refinanciaciones/Fiadores/Usuarios/Sucursales como
  PANTALLAS aparte) **no tiene ningún dato real detrás** — este módulo es de un solo dueño (sin
  `organizacion_id`, sin usuarios/sucursales, sin flujo de aprobación/desembolso: el préstamo se crea
  directo). Construir eso habría significado fingir un ERP que no existe, o rediseñar el modelo de datos
  completo sin que el dueño lo haya pedido explícitamente para eso. Se hizo la pieza que SÍ es 100% real
  y no depende de Supabase (que en el momento de auditar el mockup estaba con la conexión caída):
  **rediseñar `nxPrestamoVer` (el modal de detalle del préstamo)** con más información, en el mismo
  espíritu del mockup, pero solo con datos verdaderos.
- **`window.nxPrestamoVer(id)` reescrito por completo** (`parches.js`, mismo IIFE de Financiamiento):
  - **5 tarjetas de resumen** (`kpiCard`, reusa `.nxFP-kpi` ya existente en el módulo): Monto prestado,
    Balance pendiente, Capital pagado (en crédito: "Pagado a capital", del propio `creditoCalc`), Próxima
    cuota (fecha + monto, **con la mora sumada si aplica** — `+ RD$X mora`) o, si no hay cuota próxima,
    Fecha límite de capital (crédito) / Modalidad (abonos libres), y Total del préstamo con el interés.
    `capPagado`/`proximaFecha`/`proximaMonto`/`moraActual` se derivan de datos reales — cada modo (crédito/
    cuotas con interés/cuotas sin interés/libre) tiene su propia forma real de calcularlo, nunca un valor
    inventado.
  - **Columna nueva "Mora" en la tabla de amortización** (solo en cuotas con interés): usa `prMoraDe(p)`
    (ya existente, recargo único a nivel de PRÉSTAMO, no por cuota — real desde v49.19) y la muestra
    únicamente en la fila de la próxima cuota vencida — nunca en todas las filas, porque la mora del
    sistema no es per-cuota.
  - **Barra de progreso** (`.nxPrBar`, degradado morado) mostrando el % de capital ya pagado + "Capital
    pagado" / "Faltante" en números reales.
  - **Línea de tiempo real** (`tlEventos`/`.nxPrTl`): "Préstamo creado" + un evento "Pago registrado" por
    cada pago real (ordenados), + "Préstamo saldado" si ya se pagó todo. **Deliberadamente NO se
    inventaron** los pasos "Aprobado"/"Contrato firmado"/"Desembolso" del mockup — este módulo no tiene
    ese flujo, crea el préstamo directo.
  - **Modal más ancho** (`.nxPrDetWide{max-width:640px}`, antes 460px) para que quepan las 5 tarjetas +
    tarjeta de cliente (avatar+nombre+badge Al día/En mora/Saldado+teléfono+cédula) + tarjeta de detalles
    + tarjeta de progreso, todas con la clase `.prCard` ya existente. Botón nuevo **"Imprimir"** en la
    barra de acciones (reusa `nxPrestamoAmortizacion(id)`, ya existía — solo le faltaba un acceso directo
    desde el detalle).
  - **Desviación deliberada del mockup:** color morado de Financiamiento (no el azul del mockup — regla
    "cada app su color", ya decretada) y campo de nota renombrado a "Referencia / nota (opcional)" (mismo
    input de siempre, sin columna nueva).
- **BUG REAL encontrado y corregido durante la verificación (antes de publicar):** el resumen de 5
  tarjetas usaba `.nxFP-kpis{grid-template-columns:repeat(5,1fr)}` (la clase compartida que ya usan
  Contabilidad/Reportes/RRHH en pantallas de ancho completo) — dentro de este modal, fijo a 640px de
  ancho, el `1fr` de esa regla se comporta como `minmax(auto,1fr)`: como el valor de "RD$ 20,000" no se
  puede partir en dos líneas, el navegador ensancha las columnas más allá del contenedor, dejando la 5ta
  tarjeta ("Total del préstamo") oculta por scroll horizontal invisible dentro del panel — mismo patrón
  de bug ya documentado varias veces en este archivo (grid con `min-width:auto`), pero esta vez en un
  contenedor de ANCHO FIJO en vez de dependiente del viewport, así que las media queries por viewport que
  ya tiene `.nxFP-kpis` (900px/560px) no alcanzaban a corregirlo. Arreglado con un estilo en línea
  específico de este modal: `grid-template-columns:repeat(auto-fit,minmax(140px,1fr))` — responde al
  ancho REAL del contenedor (no al viewport), así que en 640px cae solo a 3+2 y en 390px a 2+2+1, sin
  desbordes en ningún caso. La clase compartida `.nxFP-kpi`/`.nxFP-kpis` no se tocó (sigue sirviendo bien
  a las pantallas de ancho completo que ya la usan).
- **Verificado con Playwright, código real extraído del archivo** (no una reconstrucción — `nxPrestamoVer`
  + los helpers reales `creditoCalc`/`pagadoDe`/`saldoDe`/`estadoDe`/`esVencido`/`amortizar`/`prMoraDe`/
  `prIniciales`/`prRef` extraídos tal cual, con balance de llaves real): **47 pruebas** en 4 escenarios —
  cuotas con interés plano y pagos parciales (los 5 KPIs correctos, la mora solo en la fila correcta
  cuando está activada y el préstamo ya venció el plazo completo — se confirmó que la mora del sistema es
  a nivel de PRÉSTAMO, no por cuota individual atrasada), cuotas sin interés, línea de crédito (con los
  botones "A capital"/"A interés"), y abonos libres ya saldado (sin botón de pago, con "Préstamo
  saldado" en la línea de tiempo) — más las comprobaciones de que NO aparece ningún campo inventado
  (Asesor/Sucursal/Producto) ni eventos de flujo falso (Aprobado/Contrato firmado/Desembolso). Sin
  desbordes en 390px ni 1280px, 0 errores de JS. `node --check parches.js` limpio; los 3 `<script>` de
  `index.html` pasan `new Function()`; `version.json` válido.
- **Pendiente si el dueño quiere seguir con el mockup completo:** el resto (topbar/buscador global,
  Desembolsos/Moras/Refinanciaciones/Fiadores/Usuarios/Sucursales como pantallas reales, NEXUS AI de
  riesgo) requeriría decisiones de arquitectura nuevas (¿de verdad hace falta multi-sucursal/multi-usuario
  aquí? ¿un asistente de riesgo con qué datos/modelo?) que no se tomaron solas — se le preguntarían al
  dueño antes de construir, mismo criterio que el resto de esta sesión.

### Financiamiento (Préstamos, Multiempresa) — HISTORIAL CREDITICIO (spec ChatGPT "Historial Crediticio V1", 24-jul-2026, v49.18)
El dueño pidió aplicar `docs/visual-drafts/financiamiento/HISTORIAL_CREDITICIO_V1_APROBADO.md` (ChatGPT lo subió a
`main`, commit `c72bd56`). Vista de solo lectura del comportamiento crediticio de un cliente antes de aprobarle
préstamos. **Todo sobre datos REALES, cero tabla nueva** — el módulo ya tenía casi todos los helpers necesarios
(`estadoDe`/`esVencido`/`saldoDe`/`pagadoDe`/`interesCobradoDe`/`prDiasVencido`/`prEstadoInfo`/`prRef`/`amortizar`/
`_pagosByPrestamo`).
- **`window.nxPrHistCredito(cid)`** — modal (`.nxFP`, morado del módulo) con header + score circular + 3 pestañas
  (Resumen/Préstamos/Pagos). Entradas: botón de historial (`ti-history`) en la fila de la lista de Clientes de
  Financiamiento (`prClientesTablaHTML`) y botón "Historial crediticio" en la tarjeta del cliente de la Evaluación
  (`evClienteBoxHTML`).
- **Score de HISTORIAL** (`prHistScore`, distinto al de la Evaluación que es sobre un préstamo propuesto): base 60,
  +20×(pagados/total), +hasta 15 por (pagado/total debe), −15 por cada vencido (tope −45), +5 si 0 vencidos y ≥1
  pagado. Clamp 0-100, se muestra ×10 (/1000) con clasificación (Excelente/Muy bueno/Bueno/Regular/Bajo) + riesgo +
  resultado (Aprobable/Revisión/No recomendable). Fórmula transparente y ajustable.
- **Resumen:** 8 KPIs de cartera (total/activos/pagados préstamos, monto financiado, total pagado, balance pendiente,
  intereses pagados [`interesCobradoDe`], puntualidad %) + recomendación (monto/tasa/plazo **derivados del historial
  real** del cliente — máx capital manejado, tasa promedio, plazo máx) + **comportamiento de pago** por cuota
  (`prCuotaDots`, puntos verde/amarillo/naranja/rojo/gris) + alerta real de préstamos vencidos.
- **Préstamos:** tabla real (Ref/Fecha/Monto/Tasa/Cuota/Pagado/Balance/Estado/Días atraso), clic abre `nxPrestamoVer`.
  Días de atraso solo en vencidos (`esVencido(p)?prDiasVencido(p):0` — un préstamo PAGADO muestra "—", no días).
- **Pagos:** todos los `prestamo_pagos` del cliente (fecha/préstamo/monto/método/registró) + total.
- **Omitido A PROPÓSITO (no se finge, se documenta):** MORA (el módulo no calcula mora — se avisa en una nota),
  documentos (sin Storage), gestiones de cobro, promesas de pago, pagos reversados, estados reestructurado/proceso
  legal (solo Activo/Pagado/Vencido), foto del cliente (avatar de inicial). El comportamiento de pago por cuota es
  un **estimado** (los pagos del ledger libre se aplican en orden a las cuotas — se etiqueta "(estimado)").
- **Desviación del spec (documentada):** el spec pedía `#2563eb`/`.nxPf`; se usó el **morado del módulo** (`.nxFP`,
  regla "cada app su color"), con verde/amarillo/naranja/rojo semánticos para los puntos y el score.
- **Bug corregido en pruebas:** un préstamo PAGADO mostraba días de atraso (prDiasVencido cuenta desde la última
  cuota sin mirar si ya está saldado) → se gateó a `esVencido(p)`.
- Verificado con **38 pruebas Playwright** sobre el código real (modal, header con score /1000, 8 KPIs, recomendación,
  comportamiento con puntos, tabla de 3 préstamos con estados PAGADO/VENCIDO/ACTIVO, tabla de pagos, alerta de
  vencido, saltos de pestaña). 0 errores de JS, sin desbordes en 390px ni 1280px. `node --check` limpio; los 3
  `<script>` de `index.html` pasan `new Function()`; `version.json` válido.
- **REDISEÑO COMPLETO (v49.19) — el dueño mandó un mockup detallado ("que se vea exactamente así"):** se reescribió
  todo `nxPrHistCredito`/`hcRender` + CSS al layout del mockup (2 columnas). **Mora ahora es REAL** — migración
  `prestamos_config_mora` (`mora_pct`/`mora_dias_gracia`, default 0 = apagada, patrón Cuotas del POS); helper
  `prMoraDe(p)` (recargo único en vivo sobre el saldo si vencido más allá de la gracia, solo si `mora_pct>0`);
  `_prCfg` ya se cargaba en `cargarPrestamos`. Con la mora apagada, "Mora acumulada" = RD$0 real (no un número
  inventado). Layout: tarjeta de cliente (avatar, cédula/tel/correo/cliente-desde/última-actividad) + **10 KPI
  tiles con ícono** (total/activos/pagados préstamos, financiado, pagado, balance, intereses, mora acumulada,
  promedio atraso [avg `prDiasVencido` de vencidos], puntualidad) + **6 pestañas** (Resumen/Préstamos/Pagos/
  Evaluaciones/Gestiones/Documentos) + panel derecho de 3 tarjetas (Recomendación / Indicadores del cliente con
  score circular /1000 / Alertas). **Comportamiento de pago = línea de tiempo MENSUAL** (`prTimelineMeses`,
  agrega el peor estado de las cuotas de cada mes, `prCuotaDots` estimado) con puntos redondos sobre una línea +
  leyenda — como el mockup (antes eran cuadritos por préstamo). **Omitido a propósito, con estado vacío honesto en
  su pestaña (no se finge):** Documentos (sin Storage), Gestiones de cobro (sin tabla de llamadas/promesas);
  "Promesas incumplidas" = 0 (no se registran); Alertas solo las reales (atraso/mora/balance) — NO evaluación/
  documento/garantía pendientes del mockup (no existen). Evaluaciones lee las notas "Evaluación: score" que deja la
  pantalla de Evaluación en el préstamo. Foto del cliente = avatar de inicial (sin columna de foto). Verificado con
  **50 pruebas Playwright** del código real (10 KPIs, timeline mensual, 3 paneles, 6 pestañas, tabla, alertas
  reales, estados vacíos honestos de Documentos/Gestiones). 0 errores de JS, sin desbordes en 390px ni 1280px.
  `node --check` limpio; los 3 `<script>` de `index.html` pasan `new Function()`; `version.json` válido;
  `get_advisors` sin hallazgos nuevos por la columna de mora.

### Financiamiento (Préstamos, Multiempresa) — COMPROBANTE DE PAGO (mockup ChatGPT "Comprobante V1", 24-jul-2026, v49.23)
El dueño mandó el mockup `docs/visual-drafts/financiamiento/comprobante_pago_v1_mockup.png` (el .md no
llegó al repo — igual que Reportes, se trabajó de la imagen directo). Recibo imprimible de **UN pago**
de préstamo. **`window.nxPrestamoComprobante(pagoId, prestamoId)`** — documento `window.open`+
`document.write` (mismo patrón que `nxPrestamoEstadoCuenta`/`nxPrestamoContrato`). Entrada: botón 🧾
(`ti-receipt`) en cada fila de pago del detalle del préstamo (`nxPrestamoVer`, `pagosHTML`).
- **Auditoría de esquema (SQL directo):** `prestamo_pagos` guarda solo `monto`/`fecha`/`metodo`/`nota`/
  `tipo`/`created_by_name`/`created_at`. NO guarda desglose capital/intereses/mora por pago, ni datos
  de transferencia (banco/referencia), ni voucher, ni sucursal/caja.
- **Construido (100% real, cero tabla/columna nueva):** encabezado (REC-XXXXXX derivado del id del pago
  —no es folio real, como `prRef`—, badge REGISTRADO, fecha+hora de `created_at`, recibido por) · cliente
  (avatar iniciales + nombre/cédula/teléfono/dirección de `prestamo_clientes` vía `cliente_id`) ·
  info del préstamo (Contrato `prRef`, monto aprobado, **Balance anterior = saldo actual + este pago**,
  **Balance actual = `saldoDe`**, próxima cuota, estado) · monto recibido + **en letras** (`numLetras`) ·
  "Aplicado a" (crédito: capital/interés real de `tipo`; cuotas/libre: "Abono al préstamo") · método
  resaltado · observaciones (`nota`) · firmas · botones Imprimir/PDF, WhatsApp (texto), Correo (mailto).
- **Omitido a propósito (no existe — no se finge):** sucursal/caja (no hay); desglose por pago capital/
  intereses/mora/otros/descuento (`prestamo_pagos` no lo guarda — solo monto+tipo); datos estructurados
  de transferencia (van en la nota); voucher/archivo (sin Storage); QR de verificación (sin endpoint
  público); badge "VALIDADO/oficial" → se usa "REGISTRADO"; contador de reimpresiones/envíos (no se
  registra); "Copiar enlace"/"Reimprimir" (sin enlace público; reimprimir = imprimir).
- **BUG real encontrado y corregido ANTES de publicar (no llegó a producción):** el primer intento metía
  los strings del mensaje de WhatsApp/correo con `JSON.stringify` DENTRO de atributos `onclick="..."`
  entre comillas dobles — las comillas dobles del JSON rompían el atributo y corrompían el parseo del
  resto del documento (los `.rec`/`.montoval` etc. no se renderizaban). Detectado en las pruebas
  Playwright (el doc cargado no tenía los elementos). Arreglado moviendo los handlers a un `<script>`
  dentro del documento generado (ahí `JSON.stringify` con comillas dobles SÍ es válido) + `addEventListener`.
- **Verificado con 18 pruebas Playwright del código real** (IIFE completo extraído + doc generado cargado
  como página real, no innerHTML): REC derivado del id, monto 5,000, letras "Cinco mil pesos
  dominicanos", badge REGISTRADO, cliente correcto, solo el método usado resaltado, observaciones,
  contrato PR-, balance anterior = actual + pago (120,000 vs 115,000), firmas, y que NO aparecen
  sucursal/caja/voucher/QR/reimpresiones. Sin desbordes en 390px ni 760px, 0 errores de consola. `node
  --check parches.js` limpio; los 3 `<script>` de `index.html` pasan `new Function()`; `version.json` válido.
- **Desviación deliberada del mockup (documentada):** el mockup usa azul; se usó el **morado del módulo**
  (`.nxFP`, regla "cada app su color"), con el monto en verde.

### Financiamiento (Préstamos, Multiempresa) — REPORTES (spec/mockup ChatGPT "Reportes V1", 24-jul-2026, v49.22)
El dueño mandó el mockup `docs/visual-drafts/financiamiento/reportes_financiamiento_mockup.png` (el .md
`REPORTES_FINANCIAMIENTO_V1_APROBADO.md` nunca llegó al repo — ChatGPT dijo haberlo subido pero no estaba
en `main`/`chatgpt/visual-draft` ni en ninguna rama, confirmado con la API de GitHub en vivo; el dueño
terminó mandando la imagen directo y se trabajó de esa como spec, igual que Historial v49.19 / Evaluación
v49.16). Pantalla **Reportes** dentro de `nxAbrirPrestamos` — antes el ítem "Reportes" del sidebar solo
abría `nxPrestamoReporte` (cartera vencida imprimible); ahora navega a un dashboard en pantalla
(`_prView='reportes'` → `prReportesMainHTML()`), y el imprimible queda como una "Acción rápida".
- **Auditoría de esquema ANTES de construir (SQL directo):** `prestamos` NO tiene columna de agente/
  vendedor, ni sucursal, ni producto (módulo de un solo dueño, sin `organizacion_id`). `prestamo_pagos`
  SÍ tiene `metodo` → el donut de "Cobros por método" es real. Mora real/configurable (`prestamos_config.
  mora_pct`/`mora_dias_gracia`, `prMoraDe`).
- **Construido (100% datos reales, cero tabla/columna/RLS nueva):** 6 KPIs (Capital colocado, Capital
  recuperado, Balance pendiente, Intereses cobrados, Mora pendiente, Índice de mora = cartera vencida/
  total; deltas reales "vs mes ant." en colocado/recuperado) · gráfica de barras SVG Colocaciones vs
  Cobros 12 meses (`prBarsSVG`) · donut SVG (`prDonutSVG`, stroke-dasharray) de Estado de cartera por
  antigüedad (Al día/1-30/31-60/61-90/+90) con índice + en mora · tabla Antigüedad de cartera · donut
  Cobros por método (`prestamo_pagos.metodo`) · Alertas SOLO reales (+30 días, vencidos, próximos 7
  días) · Acciones rápidas que reusan funciones existentes (`nxPrestamoReporte`/`nxPrestamoCobranza`/
  `nxPrestamoExportar`/`nxPrestamoFiltroTipo('pagados')`/`nxPrestamoConfig`) · selector de período
  (`_prRepPeriodo` Este mes/Este año/Todo, `nxPrRepPeriodo`) que alcanza SOLO el flujo (colocado/
  recuperado/cobros por método); la cartera/mora siempre es al día de hoy (etiquetado).
- **Omitido a propósito (no existe — no se finge, documentado):** pestañas Agentes y Sucursales +
  "Rendimiento por agente" + filtros Agente/Sucursal/Producto (sin columnas); alertas de documentos por
  vencer / promesas incumplidas / garantías pendientes (sin tablas/flujos); "Enviar por correo" y el
  conmutador de empresa actual (no aplican a este módulo).
- **Helpers nuevos** (todos en el IIFE de Financiamiento, puros): `prRepRango`/`prRepPeriodoTxt`/
  `prRepAging`/`prRepMeses`/`prRepMetodos`/`prRepColocadoMes`/`prRepCobradoMes`/`prDonutSVG`/`prBarsSVG`/
  `prReportesMainHTML`. CSS nuevo en `nxFPEnsureCSS` (`.nxFP-kpis6`/`.nxFP-repBar`/`.nxFP-perBtn`/
  `.nxFP-repGrid`/`.nxFP-repCard`/`.nxFP-donut*`/`.nxFP-bars`/`.nxFP-legend`/`.nxFP-alertRow`/etc.),
  responsive (6→3→2 KPIs, grid 2→1 col).
- **Verificado con 31 pruebas Playwright sobre el código real extraído** (IIFE completo 12825-15022 +
  CSS real de `nxFPEnsureCSS`, backend simulado con 7 préstamos en los 5 tramos de antigüedad + 1 pagado
  + 1 libre, y pagos con 4 métodos en varios meses): título/sidebar activo correctos, los 6 KPIs con los
  montos EXACTOS (colocado 280,000; recuperado 53,000), 2 donas, 24 barras (12 meses × 2), tabla de 5
  tramos + total, donut centro = 6 activos (excluye el pagado), alertas reales, 5 acciones rápidas, el
  período cambia, 0 errores de consola, sin desbordes en 390px ni 1280px. `node --check parches.js`
  limpio; los 3 `<script>` de `index.html` pasan `new Function()`; `version.json` válido.
- **Pendiente si el dueño lo pide** (no construido, sería mayor alcance): filtro de rango de fechas
  personalizado (hoy son 3 presets), "Flujo de caja proyectado" (derivable de las tablas de amortización
  futuras), y — solo si algún día el módulo suma agentes/sucursales de verdad — esas pestañas.

### NPGS §5 (buscadores) — Fase 1: Recientes + Favoritos en `ModalBusquedaBase` (25-jul-2026, v49.36)
El dueño pidió atacar el conflicto C2 de `DESIGN_SYSTEM.md` (el más grande de los que quedaban).
Se investigó primero con un agente de exploración: el conteo real, línea por línea, dio **34
buscadores en línea** y **1 solo en ventana** — no los 47/7 que decía la primera versión del
documento (esa cifra contaba coincidencias de texto, no llamadas reales; corregido). De los 34,
~9 de verdad "eligen un registro" (estructuralmente iguales al único caso real que ya usa
`ModalBusquedaBase`, elegir cliente en AguaPro) y ~24 solo "filtran la lista que ya se está
viendo" (Clientes, Facturas, Cobros, Vender — las pantallas de más uso diario). Se le planteó la
tensión real (NPGS §5 exige ventana siempre; convertir un filtro-en-vivo a ventana le agrega un
clic extra a lo más usado del sistema) y el dueño eligió **cumplimiento literal**: los 34 pasan a
ventana, sin excepción.
- **Plan en 3 fases** (mismo criterio de siempre — nunca 34 sitios de un golpe): (1) Recientes +
  Favoritos en el motor compartido — **HECHA esta versión**. (2) Migrar los ~9 "elegir registro"
  (mismo riesgo bajo que AguaPro). (3) Migrar los ~24 "filtrar lo que ya veo" — el trabajo de
  mayor riesgo, al final a propósito.
- **Fase 1 — `ModalBusquedaBase` (`index.html`), aditivo puro, cero pantallas tocadas:**
  Recientes/Favoritos se guardan en `localStorage` por `o.id` del buscador (preferencia del
  navegador, no dato del negocio — no necesitó tabla ni columna nueva). Se guarda una **foto
  chica** del registro (`mbbSnapshot`: id + título + subcampos ya visibles), nunca el objeto
  completo — así sigue viéndose bien aunque el dato cambie después. Al elegir desde Recientes/
  Favoritos en modo `datos` se busca el registro **vivo** en el array por su id (`mbbElegirGuardado`)
  — si ya no existe, cae honesto a la foto guardada en vez de fallar. El único consumidor real de
  hoy (`nxAguaAbrirBuscadorCliente`, AguaPro) heredó las 2 secciones nuevas **sin cambiar una sola
  línea de su propia llamada** — es el mismo motor.
  - **Bug real encontrado y corregido ANTES de publicar (no llegó a producción):** la navegación
    por teclado (`mbbFlecha`/`mbbEnter`) asumía que la lista visible era solo resultados
    (`st.filas`) — con Favoritos/Recientes antepuestos, el índice de las flechas apuntaba a la
    fila equivocada y Enter podía elegir un registro distinto al resaltado visualmente. Se
    corrigió con `st.navOrder` (el orden REAL de las filas en pantalla, calculado en el mismo
    orden en que `mbbCargar` arma el HTML: favoritos→recientes→resultados) en vez de indexar
    directo sobre `st.filas`.
  - Verificado con **19 pruebas Playwright** contra el motor real extraído del archivo, servido
    por un HTTP local (no `about:blank` — `localStorage` necesita un origen real para funcionar en
    el navegador de prueba). Reproduce el caso real de AguaPro: marcar/quitar favorito sin elegir
    el registro, reabrir y ver las 2 secciones nuevas con la estrella marcada, elegir desde
    Recientes con el registro vivo completo (no la foto), escribir texto oculta ambas secciones
    (solo importa filtrar), y la prueba específica del bug de navegación (bajar con flechas hasta
    la última fila visible → Enter elige exactamente esa, cruzando las 3 secciones). Sin desborde
    en 420px, 0 errores de JS.
- **Aún NO hecho, para que quede claro y no se confunda con "buscadores resueltos":** ninguno de
  los 34 buscadores en línea cambió de comportamiento — siguen siendo barra fija en producción.
  Esta fase solo construyó la capacidad que usarán al migrarse (fases 2 y 3, pendientes).

### NPGS §5 (buscadores) — Fase 2, primera pieza: unificar "elegir cliente" en Facturar/Cobrar del
### POS + Recientes/Favoritos (25-jul-2026, v49.37)
Continuación del plan de 3 fases (arriba). Al auditar los ~9 sitios "elegir un registro" se
encontró que la mayoría (Facturar/Cobrar del POS, elegir cliente en Financiamiento, elegir
artículo en Vender/Factura) **YA cumplían el requisito literal de NPGS §5** — ya son ventana con
lupa, construidos en versiones anteriores (v48.97/v49.02) — solo les faltaba Recientes/Favoritos.
Migrarlos a `ModalBusquedaBase` (el motor genérico de index.html) habría sido replatformar sin
necesidad y, peor, **habría violado el propio reglamento del sistema** ("REGLAMENTO TÉCNICO —
`ModalBusquedaBase`", más arriba): compartir el motor NO significa un buscador único — cada tabla
(`pos_clientes` del POS, `prestamo_clientes` de Financiamiento) tiene su propio buscador, nunca
uno "universal" que arriesgue traer la tabla equivocada.
- **Lo que SÍ se encontró real y se corrigió: duplicación genuina dentro del MISMO módulo.**
  `nxFacCliToggle` (elegir cliente al Facturar) y `nxPosCobroCliToggle` (elegir cliente al Cobrar)
  eran ~95% el mismo código copiado dos veces — ambas leen `_clientes` del mismo cierre del IIFE
  del POS (confirmado que no hay límite de IIFE entre ellas). Eso sí era una violación real de
  NPGS §6 ("no duplicar funciones"), previa a esta sesión.
  - **`nxPosClienteAbrir(modalId, onPick)` (nueva, parches.js, junto a `nxFacCliToggle`):** motor
    compartido SOLO entre estas 2 pantallas del POS (mismo módulo, misma tabla `pos_clientes` —
    no cruza a Financiamiento). Arma la ventana (`.modal.nxPf`, lupa+buscador+lista), agrega
    Recientes/Favoritos con el MISMO mecanismo de `localStorage` de la Fase 1 (reusa
    `mbbLSGet`/`mbbLSSet`/`MBB_REC_MAX`/`MBB_FAV_MAX` de `index.html`, formato-agnóstico) pero con
    su propio snapshot `{__id,__t,__sub}` — más simple que el de `ModalBusquedaBase`, pensado para
    reproducir EXACTO el texto que ya se mostraba ("código · por mayor"), sin arriesgar una
    regresión visual en una pantalla de dinero. **La clave de `localStorage` es el `modalId`**
    (`nxFacCliM` para Facturar, `nxPosCobroCliM` para Cobrar) — Favoritos/Recientes de Facturar y
    de Cobrar quedan DELIBERADAMENTE separados (son dos flujos distintos, no tiene sentido que
    marcar un favorito al cobrar lo muestre también al facturar sin que el usuario lo haya
    marcado ahí).
  - `nxFacCliToggle`/`nxPosCobroCliToggle` quedaron como envoltorios de una línea, cada uno con su
    propio `onPick` (Facturar actualiza `_factCli`+`#facCliTxt` vía `nxFacSetCli`; Cobrar llena el
    `<input type="hidden" id="posCliId">`+`#posCliDisp` y llama a `nxPosCobroCalc()`) — mismo
    comportamiento externo de siempre, cero cambios en `nxFacSetCli`/`nxPosCobroCalc`/
    `nxPosConfirmar` (que solo leen `val('posCliId')`, nunca supieron ni les importó cómo se
    llenó). El precio "por mayor" (`precioCli()`) no se tocó — se verificó que sigue funcionando
    igual con los 3 escenarios de siempre.
  - CSS nuevo en `nxPfEnsureCSS()`: `.pf2cliFav` (botón de estrella circular, ámbar cuando está
    marcado — mismo color `#f59e0b`/`var(--pf-orange-l)` que ya usa `.vfav` del catálogo de Vender,
    consistente con el resto del sistema), `.pf2cliSec` (etiqueta de sección), `.pf2clirow.sel`
    (resaltado de teclado). Se le agregó `position:relative;padding-right:34px` a `.pf2clirow` (la
    fila) para dejarle espacio a la estrella sin tapar el nombre/código.
  - Verificado con **24 pruebas Playwright** contra el código real extraído de ambas funciones (no
    reconstruido): abrir cada ventana, marcar/desmarcar favorito sin elegir el registro, reabrir y
    ver Favoritos→Recientes→Resultados en ese orden, elegir desde cada sección (el registro vivo,
    no la foto guardada), escribir oculta las 2 secciones y filtra, "— Consumidor final —" limpia
    el campo, navegación de teclado mixta (flechas cruzando las 3 secciones + Enter elige la fila
    correcta — la misma clase de bug ya encontrada y corregida en la Fase 1), y que Facturar/Cobrar
    tienen sus favoritos en `localStorage` bajo claves DISTINTAS (no se mezclan). Sin desborde en
    390px ni 1280px, 0 errores de JS. `node --check parches.js` limpio; los 3 `<script>` de
    `index.html` (1,423 / 433,200 / 681 caracteres) pasan `new Function()`; `version.json` válido.
- **Pendiente dentro de la Fase 2** (ya son ventana, les falta Recientes/Favoritos — cada uno su
  propio buscador, NO se unifican entre sí por el reglamento de arriba): `nxPrElegirCliente`
  (Financiamiento, elegir cliente al crear un préstamo — tabla `prestamo_clientes`, otro módulo) y
  `nxProdPicker`/`ppkQ` (POS, elegir artículo en Vender/Factura — más complejo, muestra stock/IMEI/
  precio por nivel además del nombre). Después de esos dos cierra la Fase 2 completa; sigue la
  Fase 3 (los ~24 buscadores "filtrar lo que ya veo" — Clientes/Facturas/Cobros/Vender — el trabajo
  de mayor riesgo, al final a propósito).

### Financiamiento — lista de préstamos en el celular: 2 bugs reales (25-jul-2026, v49.35)
El dueño mandó una captura de iPhone de la lista de préstamos. Se usó el método de causa raíz
(`gstack-investigate`, primer uso del enrutamiento automático de skills): **reproducido con el CSS
real de `nxFPEnsureCSS` + el markup verbatim de `prTablaHTML` en un navegador a 390px**, antes de
tocar nada. Dos hallazgos, y **una hipótesis mía que resultó FALSA** — se documenta igual:
- **Hipótesis descartada:** "hay desborde horizontal y por eso el texto sale cortado a la
  izquierda". **Falso** — medido `scrollWidth - clientWidth = 0`, cero elementos más anchos que el
  viewport. El arreglo de v49.20 (`min-width:0` en `.nxFP-tbl`) sigue funcionando.
- **BUG 1 (la franja morada) — CAUSA RAÍZ:** `.nxFP-side` conserva su
  `box-shadow:0 14px 34px rgba(76,29,149,.26)` cuando en móvil pasa a cajón fijo **cerrado**
  (`translateX(-100%)`, x de -250 a 0). El desenfoque de 34px **se derrama dentro del viewport** y,
  con `z-index:2600`, se pinta ENCIMA del contenido — de ahí la franja morada tapando el borde
  izquierdo y el texto que parecía "cortado". No era scroll ni recorte: era una sombra encima.
  Arreglado: `box-shadow:none` en `@media(max-width:900px)`, restaurada solo con `.side-open`.
  - **Trampa real encontrada al arreglarlo (y por qué este bloque va AL FINAL del CSS):** la regla
    base `.nxFP-side{...box-shadow...}` está declarada **más abajo** en la cadena de concatenación
    (posición ~13316) que la media query donde la puse primero (~13073). Misma especificidad → gana
    la última, así que el arreglo no hacía nada. Se detectó porque el harness seguía reportando
    `boxShadow` con valor. **Al agregar reglas a `nxFPEnsureCSS`, verificar la POSICIÓN en la
    cadena, no solo la especificidad** — el CSS base del shell se declara después de las media
    queries de la tabla.
- **BUG 2 (tarjeta gigante) — NPGS §7/§13/§14:** en `@media(max-width:760px)` cada `<td>` se
  pintaba como una línea `ETIQUETA .......... valor` (`td::before{content:attr(data-l)}`) → **9
  renglones y 263px de alto por préstamo**. Se rediseñó la fila como **rejilla de 2 columnas**
  (`display:grid`), sin etiquetas repetidas y con la jerarquía que pide NPGS §14: nombre + estado
  arriba, REF + cédula debajo, **total a devolver en grande** + próximo pago, y las acciones al
  pie. **263px → 120px** (más del doble de préstamos por pantalla). Se agregaron clases a las
  celdas en `prTablaHTML` (`nxFP-tCed`/`nxFP-tCap`/`nxFP-tTot`/`nxFP-tProx`/`nxFP-tEst`/
  `nxFP-tAccC`, y `cero` en Días venc. cuando es 0) — **solo HTML, cero lógica**.
  - Ocultos en móvil a propósito: **Capital** (secundario, está completo en el detalle) y
    **Días venc. cuando es 0** (no aporta). En escritorio se siguen viendo.
  - **Defecto propio corregido antes de publicar:** la primera versión dejaba a "Días venc." en un
    renglón propio (`grid-row:4`) y las acciones en el 5 — al ocultarse "Días", el grid **reservaba
    igual el renglón vacío** y quedaba un hueco visible. Se vio en la captura, no en las
    aserciones. Ahora comparten el renglón 4.
- **Verificado que el ESCRITORIO no cambió:** `tr` sigue en `table-row`, encabezados visibles, las
  9 celdas presentes (Capital y Días venc. incluidos), sidebar `sticky` con su sombra, sin
  desborde. `node --check` limpio; `version.json` válido.

### Financiamiento — bug real: la barra lateral se veía descolorida/gris en el celular (24-jul-2026, v49.21)
El dueño mandó una captura de iPhone mostrando el menú lateral morado de Financiamiento (`.nxFP-side`,
drawer móvil `@media(max-width:900px)`) renderizado **aguado/gris claro translúcido** (medido en la
propia captura con Pillow: fondo del panel ~`rgb(200,203,209)`, no el morado `#4f46e5→#6d28d9`), con el
texto casi invisible. **Diagnóstico:** el CSS base de `.nxFP-side` es un gradiente morado sólido sin
`!important` ni variables; en un harness aislado (Playwright, CSS real de `nxFPEnsureCSS` + markup real)
renderiza morado correcto, así que NO es un bug del CSS base — es que en el dispositivo real algo (un
tema activo, o alguna regla global) lo repinta a un panel frosted-white translúcido. **Mismo síntoma y
misma solución que el sidebar del POS (`.nxTSide`), ya documentado: un "BLINDAJE".** `.nxFP-side` no
tenía ninguno. Se agregó en `nxFPEnsureCSS()` un bloque de blindaje de **alta especificidad**
(`html body .nxFPShell .nxFP-side ...`, especificidad 0,2,3 — gana a cualquier `body.tema-* .nxFP-side`
que es 0,2,1) con `!important` que fuerza: fondo gradiente morado, `backdrop-filter:none`, `opacity:1`,
texto blanco, y el look de los ítems de nav / botón "Nuevo préstamo" / "Volver" / logo / divisor.
**Verificado** cargando el CSS real en un navegador CON una regla hostil que simula el aguado
(`body.tema-glass .nxFP-side{background:rgba(255,255,255,.5)!important;backdrop-filter:blur(20px)!important;
color:#1e293b!important}`): el blindaje gana — `getComputedStyle` confirma el gradiente morado, backdrop
`none`, texto blanco, pastilla activa blanca; captura visual del drawer abierto muestra el morado firme.
`node --check parches.js` limpio; `version.json` válido. Cambio 100% CSS, cero lógica tocada. **Nota
para el futuro:** cualquier cambio de color a `.nxFP-side` tiene que tocar TAMBIÉN este blindaje (igual
que el sidebar del POS tiene su base + su blindaje), si no el blindaje pisa el color nuevo.

### Financiamiento — bug real: la tabla de préstamos se desbordaba en el celular (24-jul-2026, v49.20)
El dueño mandó una captura de iPhone mostrando la lista de préstamos de Financiamiento (`.nxFP-tbl`,
`prTablaHTML`/`renderLista`, v49.11) con las columnas saliéndose por la derecha en vez de colapsar a
tarjetas. **Causa raíz — el MISMO bug de especificidad ya documentado y arreglado antes para `.sf-tbl`
(Seguros, v48.54):** la regla de colapso móvil de `.nxFP-tbl` (`nxFPEnsureCSS`, `@media(max-width:760px)`)
ponía `display:block;width:100%` pero **NO** `min-width:0`, así que la regla global de `index.html`
`@media(max-width:480px){table{min-width:500px}}` (y la de `@media(max-width:768px){table{min-width:600px}}`)
le ganaba y forzaba 500-600px de ancho en una pantalla de ~390px. Arreglado de raíz agregando
`min-width:0` a la declaración `.nxFP-tbl,.nxFP-tbl tbody,.nxFP-tbl tr,.nxFP-tbl td{display:block;width:100%}`
(+ `.nxFP-tblWrap{min-width:0}`) dentro de esa misma media query — como `.nxFP-tbl` (clase) tiene más
especificidad que `table` (elemento), ahora gana la pelea de CSS sin importar el orden de las hojas.
Verificado con Playwright usando el CSS real de `nxFPEnsureCSS` + las 2 reglas globales reales de
`index.html` + el markup real de `prTablaHTML`: en 360px/375px/390px `scrollWidth===clientWidth` exacto
(cero desborde horizontal), la tabla colapsa a tarjetas (`thead:none`) y su ancho cabe dentro del
viewport. `node --check parches.js` limpio; `version.json` válido. Cambio 100% CSS, cero lógica tocada.

### Financiamiento (Préstamos, Multiempresa) — EVALUACIÓN FINANCIERA (spec ChatGPT "Evaluación Financiera V1", 24-jul-2026, v49.15)
El dueño pidió aplicar el spec `docs/visual-drafts/financiamiento/EVALUACION_FINANCIERA_V1_APROBADA.md` (ChatGPT
lo subió a `main` directo, commit `26acc80`). Flujo: Cliente → Evaluación → Aprobación → Préstamo → Cobranza.
Componentes pedidos: info del cliente, info económica, análisis financiero, simulador en tiempo real, score
interno, recomendación automática, resumen lateral fijo, botón "Aprobar y crear préstamo".
- **Todo sobre datos REALES, cero tabla nueva** — se pudo porque las 3 piezas ya existían: el simulador
  (`amortizar`/`calcPrestamo`/`nxPrRecalc`), la creación de préstamo (`nxPrestamoGuardar`), y los datos
  económicos del cliente (`prestamo_clientes.ingreso_mensual`/`tipo_ingreso`/`ocupacion`/`tiene_fiador`, del
  módulo de Clientes v49.14). La Evaluación los junta en una pantalla nueva.
- **Nueva pantalla** (`_prView='evaluacion'`, ítem "Evaluación" en la barra lateral, se pinta en `.nxFP-main`,
  `renderLista` llama `evInit()` tras montar). Layout 2 columnas (main + `aside` sticky) que colapsa en móvil:
  (1) Cliente — reusa el picker (`nxPrElegirCliente('eval')`, ruteado por `_prCliPickTarget`) o `abrirClienteForm`;
  al elegir, `evClientePuesto` precarga ingreso + muestra ocupación/lugar de trabajo. (2) Info económica —
  ingreso (precargado, editable), otros ingresos, deudas actuales (los 2 últimos en vivo, NO se guardan en el
  cliente). (3) Simulador — **mismos ids que el form de préstamo** (`prCap`/`prTasa`/`prNumCuotas`/`prFrec`/
  `prMetodo`/`prPlazo`/`prTot`/`prFecha`/`prCliId`/`prNom`/`prCed`/`prTel`/`prNotas`) + modos (reusa
  `nxPrModo`/`pintarModo`), así que "Aprobar y crear préstamo" reusa **100%** `nxPrestamoGuardar` (lee esos ids
  del DOM). (4) Análisis — ingreso total, compromiso mensual del préstamo, capacidad de pago, ratio de
  endeudamiento con barra. Resumen lateral: score + recomendación + cuota + ratio.
- **Compromiso mensual** (`evCompromisoMensual`): cuotas → cuota × pagos-por-mes (semanal 4.33 / quincenal 2 /
  mensual 1); crédito → interés del 1er mes; libre → 0 (sin cuota fija, se avisa).
- **Score 0-100 determinístico** (`evCalcularScore`, fórmula transparente, ajustable a futuro como la mora — NO
  IA, NO llamada externa): base según ratio (cuota+deudas)/ingreso (≤30%→90, ≤40%→72, ≤50%→55, ≤65%→38, resto
  18) + bonus (fiador +5, tipo_ingreso Empleado +5 / Pensión +3, ocupación+trabajo +2), clamp 0-100.
  Recomendación: ≥70 APROBAR (verde), 50-69 REVISAR (naranja), <50 RECHAZAR (rojo). Si la recomendación no es
  aprobar, `evAprobar` pide confirmación — **la decisión final es del dueño**, nunca bloquea.
- **Sin tabla nueva:** al aprobar, la evaluación se guarda como una **línea de NOTA real** en el préstamo
  (`prestamos.notas`: "Evaluación: score X/100 · REC · ratio Y%"). Si algún día se quiere un historial de
  evaluaciones persistido, sería una tabla aparte (pendiente, no pedido).
- **Desviación deliberada del spec (documentada):** el spec decía "namespace .nxPf y color #2563eb" (azul, copiado
  del boilerplate de specs del POS), pero este módulo es Financiamiento = **morado `#4f46e5`/`#6d28d9`** (regla
  "cada app su color"). Se usó el morado del módulo para no romper su identidad visual; el score usa colores
  semánticos (verde/naranja/rojo) universales. Plus Jakarta Sans ya es la fuente del módulo.
- **Bug de UX encontrado y corregido en pruebas (antes de publicar):** `pintarModo`→`nxPrRecalc` mostraba
  "Total a devolver" en modo cuotas (ese campo es solo de modo libre) — `evRecalc` ahora fuerza `#prTotRow`
  visible solo en libre. Además `evInit` repinta la tarjeta del cliente al resetear (tras aprobar) para que no
  quede el cliente anterior mientras el resumen ya dice "Sin cliente".
- **Verificado con Playwright, código real extraído** (todo el IIFE de Financiamiento cargado en un navegador con
  backend simulado, no reconstrucción): 39 pruebas — nav, pantalla, 4 secciones, picker rutea a eval, precarga de
  ingreso, el ejemplo del dueño (20,000 al 10% / 8 quincenal, ingreso 30,000 → cuota 3,500 → ratio 23.3% → score
  95 → APROBAR), deudas altas → RECHAZAR, "Aprobar" hace el POST correcto a `prestamos` con `cliente_id` + la nota
  de evaluación + modo/método correctos — las 39 pasan, 0 errores de JS, sin desbordes en 390px ni 1280px. `node
  --check parches.js` limpio; los 3 `<script>` de `index.html` pasan `new Function()`; `version.json` válido.
- **REDISEÑO RICO (v49.16) — el dueño mandó un mockup detallado ("Quiero que quede así"):** la pantalla se rehízo
  para calzar con el mockup, siempre sobre datos reales. Se reemplazó todo `prEvalMainHTML`/`evRecalc` + CSS.
  - **Tarjeta de cliente ampliada:** avatar, "Cliente activo", cédula, teléfono, **Edad** (`evEdad` de
    `fecha_nacimiento`), **Tiempo como cliente** (`evTiempoCliente` de `created_at`) + botón "Ver perfil"
    (`evVerPerfil`→`abrirClienteForm`). Al elegir cliente, `evClientePuesto` precarga ingreso + ocupación +
    estado civil + dirección + 2 referencias (de las columnas reales).
  - **Barra de pestañas** (`ev-tab`/`window.evTab`): Información general / Análisis financiero / Simulador /
    Recomendación — hacen scroll a su sección (en escritorio todo se ve; en móvil son saltos rápidos).
  - **Análisis financiero de 5 indicadores** (`evAnRow`+`evRating`, barra + badge Excelente/Bueno/Aceptable/Bajo):
    Capacidad de pago, Relación ingresos/gastos, Nivel de endeudamiento (invertido, menor es mejor), Liquidez
    estimada, Estabilidad laboral. Todo calculado en vivo de ingreso/gastos/cuota/antigüedad.
  - **Score interno = medidor circular /1000** (`conic-gradient`, `--pct`) + estrellas + badge de Riesgo
    (Bajo/Medio/Alto). El score sigue siendo 0-100 por dentro (`evCalcularScore`, ahora incluye gastos en el
    ratio + bonus por antigüedad), se muestra ×10.
  - **Simulador con deslizadores** (`<input type=range>` para capital/tasa/#cuotas/plazo, valor en vivo) + tarjeta
    "Cuota estimada" (cuota, interés total, total a devolver, fecha 1er/última pago) + **"Ver amortización
    detallada"** (`evVerAmort`, modal con la tabla completa reusando `amortizar`/`creditoCalc`).
  - **Resumen:** Monto solicitado, **Monto recomendado** (si el endeudamiento >35% del ingreso, sugiere un capital
    más bajo que lo baje a ~35% — cálculo real de capacidad), Cuota estimada, Tipo, Ratio, Nivel de riesgo,
    Resultado. Próximos pasos (checklist informativo). Asesor responsable (`nomAdmin`) + fecha.
  - **Notas del asesor** (textarea 0/500) → al aprobar se guardan en `prestamos.notas` junto con la línea de score.
  - **Campos nuevos que la tabla NO tiene** (gastos mensuales, antigüedad laboral, dependientes): entradas EN VIVO
    usadas solo para el análisis del momento — **NO se guardan** en el cliente (no se finge una columna que no
    existe). **Dejadas FUERA a propósito** (no se finge): subir Documentos (no hay Storage), "Guardar borrador" y
    "Enviar a revisión" (no hay ese flujo/estado), foto del cliente (no hay columna), campana/perfil del header
    (chrome de app que el módulo no tiene). Se documenta en el changelog.
  - **2 bugs encontrados en pruebas (antes de publicar):** (1) `toLocaleDateString('es-DO')` puede tirar
    RangeError en el Chromium headless (ICU mínimo) y abortaba `evInit` → la fecha se arma a mano (`d/m/Y`); (2)
    `evInit` no reseteaba `_evCli`, así que al volver a la pantalla quedaba el cliente viejo con los campos vacíos
    — ahora `evInit` lo pone en `null` (pantalla siempre arranca limpia).
  - Verificado con **62 pruebas Playwright** sobre el código real (IIFE completo en navegador con backend
    simulado): tarjeta con edad/tiempo, precarga de estado civil/dirección/referencias, los 5 indicadores, el
    medidor /1000, la tabla de amortización (8 filas), los saltos de pestaña, y "Aprobar" con el POST correcto
    (`cliente_id` + nota de score + nota del asesor). 0 errores de JS, sin desbordes en 390px ni 1280px. `node
    --check` limpio; los 3 `<script>` de `index.html` pasan `new Function()`; `version.json` válido.
  - **Seguimiento (v49.17) — simulador "de ambas formas" (pedido del dueño):** cada control del simulador
    (Capital/Tasa/#cuotas/Plazo) pasó de ser SOLO un deslizador a tener **número editable + deslizador
    sincronizados**. El **número es la fuente de verdad** (mismos ids `prCap`/`prTasa`/`prNumCuotas`/`prPlazo`
    que lee `calcPrestamo`/`nxPrestamoGuardar`, sin tope); el deslizador es un `*Sl` aparte
    (`prCapSl`/`prTasaSl`/...) que solo mueve el número. Helpers `window.evSyncSl` (número→thumb del slider,
    acotado a su min/max) y `window.evSyncNum` (slider→número, con formato de miles para capital). **Clave:**
    si se escribe un monto exacto (47,350) o mayor que el tope del slider (500,000), el cálculo usa ESE número
    — el slider solo llega a su tope visual, no limita el valor real. `parseMoney` para capital, decimal para
    la tasa. Se quitaron los `<b id="evCapV">`/etc (el número editable los reemplaza) y sus `setT(...)` en
    `evRecalc` (código muerto). CSS nuevo `.ev-slnum` (cajita del número en el encabezado del slider).
    Verificado con 12 pruebas Playwright del código real (slider→número, número→slider con clamp del thumb,
    cálculo con el valor exacto aún por encima del tope del slider, tasa decimal) + las 62 anteriores sin
    regresión. `node --check` limpio; los 3 `<script>` de `index.html` pasan `new Function()`; `version.json`
    válido.

### Financiamiento (Préstamos, Multiempresa) — MÓDULO DE CLIENTES (spec ChatGPT "Crear Cliente V1", 24-jul-2026, v49.14)
El dueño pidió aplicar la carga de "Crear Cliente V1" de ChatGPT. Primero se aplicó por error al formulario
de Entidades del POS (`abrirEntidad`, v49.13) — el dueño aclaró **"Es de financiamiento que estamos"** y
confirmó **"Si"** construir un módulo de Clientes REAL dentro de Financiamiento (`nxAbrirPrestamos`,
IIFE propio de `parches.js`, tablas `prestamos`/`prestamo_pagos`/`prestamos_config`, RLS solo-dueño
`mi_rol()='admin'` sin `organizacion_id`). Antes NO había pantalla de clientes: el prestatario se tecleaba
inline en cada préstamo (solo nombre/cédula/teléfono guardados en la propia fila de `prestamos`).
- **Hallazgo clave — la tabla YA EXISTÍA:** al ir a crear `prestamo_clientes` la migración falló (la política
  `prestamo_clientes_admin` ya estaba) — **un chat paralelo ya la había creado** con un esquema MUCHO más
  rico que el que se iba a proponer. Se pivoteó a construir SOLO el frontend contra esa tabla real, adoptando
  sus columnas reales (32 columnas: datos personales, contacto, financiera, 2 referencias, fiador, notas,
  auditoría) — cero migración nueva, cero columnas inventadas. `prestamos.cliente_id` (uuid) también ya
  existía para enlazar. Confirmado por SQL directo antes de escribir el form.
- **Construido (frontend, todo en el IIFE de Financiamiento):**
  - **`_prClientes`** cargado en `cargarPrestamos` (`select=*&order=nombre.asc`, best-effort try/catch → `[]`).
    `_prView` ('prestamos'|'clientes') + `_prCliQuery` controlan qué muestra `renderLista` (mismo shell, el
    `.nxFP-main` cambia según `_prView`). Ítem **"Clientes"** nuevo en la barra lateral (`nxPrView('clientes')`,
    ícono `ti-users-group`) — se resalta solo cuando `_prView==='clientes'` (los filtros de préstamos solo se
    resaltan si `_prView==='prestamos'`, para no marcar dos a la vez).
  - **Lista de clientes** (`prClientesMainHTML`): 3 KPIs (total / con préstamo / en mora, calculados contra
    `_prestamos` por `cliente_id`), buscador (`prBuscador`, reglamento), y **tabla** (`prClientesTablaHTML`,
    `.nxFP-tbl` que colapsa a tarjetas en móvil) con Cliente/Cédula/Teléfono/Ubicación/**Préstamos** (cuántos +
    activos, vía `prCliStats` que suma `saldoDe` por `cliente_id`)/**Saldo**/Acciones (editar/WhatsApp/nuevo
    préstamo). Fila clicable abre editar.
  - **Formulario completo** (`abrirClienteForm`, patrón `.nxPrForm`/`prSec`): 5 secciones — Datos personales
    (nombre*, cédula, fecha nac., estado civil, nacionalidad), Contacto y dirección (teléfono*, alterno, correo,
    dirección, sector, ciudad, provincia), Información financiera (ocupación, lugar de trabajo, tipo de ingreso,
    ingreso mensual con `data-nx-money`), Referencias (2, con relación), fiador/garante opcional (checkbox
    `nxPrCliFiador` muestra/oculta el bloque) y Notas. `nxPrClienteGuardar` mapea las 32 columnas reales +
    `updated_at`, con **detección de duplicado** al crear (mismo teléfono o cédula normalizados → avisa quién es
    y ofrece abrir el existente). Todos los ids `prc*`.
  - **Enlace con el préstamo:** `abrirForm` (nuevo/editar préstamo) ganó un `<input type="hidden" id="prCliId">`
    + botones **"Elegir cliente"** (`nxPrElegirCliente` → modal picker con buscador, filas `.prCliPickRow`) y
    **"Nuevo cliente"** (`nxPrClienteNuevoDesdeForm` → abre el form de cliente con callback "Guardar y usar
    cliente" que vuelve al préstamo ya lleno). `prFormPonerCliente(c)` llena prCliId/prNom/prCed/prTel.
    `nxPrestamoGuardar` ahora guarda `cliente_id: val('prCliId') || null` en `prestamos`. Botón "Nuevo préstamo"
    de la fila de cliente (`nxPrestamoNuevoDeCliente`) precarga el cliente vía `_prPrefillCli`.
  - Filtros de la lista de clientes (`nxPrClienteFiltrar`) y del picker (`nxPrCliPickFiltrar`) usan el mismo
    `.toLowerCase().indexOf()` sin normalizar acentos — **consistente con el filtro de préstamos ya existente**
    (`prListaFiltrada`), no una regresión; se dejó igual a propósito.
- **Verificado con Playwright, código real extraído** (todo el IIFE de Financiamiento 12825-14270 cargado en
  un navegador con backend simulado, no reconstrucción): 34 pruebas — lista con KPIs y tabla, buscador filtra,
  form abre con las 5 secciones, fiador toggle, guardar hace el POST correcto a `prestamo_clientes` con
  `created_by_name`, duplicado por teléfono NO crea (dismiss), picker abre/filtra/elige y precarga el préstamo,
  `nxPrestamoGuardar` incluye `cliente_id` en el POST, "nuevo préstamo desde cliente" precarga bien — las 34
  pasan, 0 errores de JS, sin desbordes en 390px ni 1280px. `node --check parches.js` limpio; los 3 `<script>`
  de `index.html` pasan `new Function()`; `version.json` válido.

### Financiamiento (Préstamos, Multiempresa) — BARRA LATERAL (mockup de ChatGPT, 23-jul-2026, v49.12)
El dueño pidió construir la barra lateral del mockup ("vamos a hacer la barra lateral"). Se armó de
verdad, pero con ítems que cada uno hace algo REAL (filtros/acciones que ya existían), NO sub-módulos
falsos con su propia base. `renderLista` se reestructuró a **dos columnas** (`.nxFPShell`): `aside
.nxFP-side` (barra lateral morada) + `.nxFP-main` (contenido).
- **Barra lateral (real):** marca "NEXUS PRO Financiamiento", botón "Nuevo préstamo", nav que setea el
  filtro vía `nxPrestamoFiltroTipo` (Dashboard=todos / Activos / **Cobranza**=vencidos / Cuotas /
  Pagados / Líneas de crédito=credito), la opción activa se resalta (`_prFiltro`), + Reportes
  (`nxPrestamoReporte`) y Configuración (`nxPrestamoConfig`) abajo, + "Volver a Multiempresa". Los
  **filtros que estaban en las pestañas horizontales (`.nxFP-tabs`) se movieron a esta barra** — se
  quitó la fila de pestañas y la de "ACCIONES RÁPIDAS" (Nuevo/Excel quedaron como botones en la topbar
  del contenido; Cobranza/Reporte/Config quedaron en la barra).
- **Del mockup NO se construyó (fake/duplicado, se le explicó al dueño y va en el changelog):**
  "Clientes" (no existe pantalla de clientes en este módulo) y el selector "Taller Principal" (NO es
  multi-sucursal, sin `organizacion_id`) — se omitieron; "Cobros" y "Vencidos" se **unieron en
  "Cobranza"** (son el mismo filtro, no dos datos distintos). La campanita/usuario tampoco (decorativos).
- **Móvil:** la barra es un **cajón deslizable** (`@media(max-width:900px)`: `position:fixed` +
  `transform:translateX(-100%)`, `.side-open` la muestra) con overlay que la cierra al tocar fuera;
  botón ☰ (`.nxFP-burger`) en la topbar. `window.nxFPToggleSide()` (junto a `nxPrestamoFiltrar`)
  alterna la clase `.side-open` en `#nxFPShell`. Como tocar un filtro re-renderiza toda la vista
  (`nxPrestamoFiltroTipo`→`renderLista`), el cajón se cierra solo al navegar (el DOM nuevo no trae
  `.side-open`).
- **Verificado con Playwright, código real extraído** (`renderLista`/`nxFPToggleSide`/`prTablaHTML`/toda
  la cadena real, 15 préstamos de prueba): escritorio → barra visible, 8 ítems de nav, "Dashboard"
  activo, burger oculto, 12 filas, sin desbordes; tocar "Cobranza" cambia el activo. Móvil → burger
  visible, barra fuera de pantalla por defecto, abrir con `nxFPToggleSide` la muestra + overlay,
  cerrar la esconde de vuelta, sin desbordes, 0 errores en ambos. `node --check parches.js` limpio;
  los 3 `<script>` de `index.html` pasan `new Function()`; `version.json` válido. (Quedaron sin usar el
  helper `tab`/`quickBtns` de la fila de pestañas y las clases CSS `.nxFP-tabs`/`.nxFP-tab`/
  `.nxFP-secTitle` — se dejaron sin borrar en esta ronda; `.nxFP-quick`/`.nxFP-qbtn`/`.nxFP-qico` SÍ se
  siguen usando en el estado vacío de la tabla.)

### Financiamiento (Préstamos, Multiempresa) — lista en TABLA + KPIs (mockup de ChatGPT, 23-jul-2026, v49.11)
ChatGPT dejó un mockup (imagen, escritorio + móvil) de un rediseño completo del módulo Financiamiento
(`nxAbrirPrestamos`) — un dashboard ERP con barra lateral. Auditado contra el código real y el dueño
eligió **"las partes reales lo más semejante"**. Se aplicó SOLO lo real, sin fingir lo estructural.
- **NO se construyó (fake/duplicado en este módulo, se le explicó al dueño):** la **barra lateral** con
  Cobros/Clientes/Cuotas/Vencidos como pantallas aparte (no existen — son filtros de la misma lista);
  el selector **"Taller Principal"** (este módulo NO es multi-sucursal, no tiene `organizacion_id`);
  la **campanita** de notificaciones y la **cabecera de usuario**; **"Guardar borrador"** (no hay
  concepto de borrador); el **ID "OT-000124"** como folio consecutivo real (`prestamos` no tiene columna
  número — se deriva del id solo para pantalla, `prRef()` = `PR-`+6 hex del uuid, honesto).
- **SÍ se aplicó (real, `renderLista` reescrito, cero cambios de lógica de negocio):** (1) los 5 KPI de
  arriba pasaron del hero morado a **5 tarjetas** (`.nxFP-kpis`) como el mockup (Total por cobrar/
  Prestado/Cobrado/Vencido/Clientes activos, mismos datos reales ya calculados). (2) La **lista pasó de
  tarjetas (`cardHTML`) a TABLA** (`prTablaHTML`, `.nxFP-tbl`) con columnas Ref/Prestatario/Cédula/
  Capital/Total a devolver/**Próximo pago**/Estado/**Días venc.**/Acciones. "Próximo pago" real
  (`prProximoPago`: la primera cuota aún no cubierta; para crédito la fecha límite; para libre '—').
  **Estado en 4 vistas derivadas** (`prEstadoTabla`): Al día / **Por vencer** (próximo pago ≤7 días) /
  Vencido / Pagado — todas de fechas reales, NO inventan mora/gracia (el módulo sigue con 3 estados de
  fondo, "Por vencer" es solo una vista del próximo pago cercano). Acciones por fila: ver
  (`nxPrestamoVer`), editar (`nxPrestamoEditar`), estado de cuenta (`nxPrestamoEstadoCuenta`), WhatsApp
  (si hay teléfono) — sin el menú "..." emergente (se recorta dentro de una tabla con scroll). (3)
  **Paginación** real (`PR_PAGE_SIZE=12`, `_prPage`, `window.nxPrTablaPagina`). (4) El buscador
  (`nxPrestamoFiltrar`) pasó de ocultar filas con `display:none` a **re-renderizar** el cuerpo
  (`_prQuery`+`repintarPrLista`) — necesario para que la paginación y la búsqueda no choquen; el input
  vive fuera de `#nxPrLista`, así que no pierde el foco. (5) KPI nuevo abajo **"Próximos a vencer"**
  (activos con próximo pago en 7 días) — el dash pasó de 4 a 5 tarjetas.
- **Responsive:** la tabla `.nxFP-tbl` colapsa a tarjetas en ≤760px (mismo patrón `data-l` que
  `.sf-tbl` de Seguros) — una sola fuente, sin dos renders que se desincronicen.
- **Verificado con Playwright, código real extraído** (`renderLista`/`prTablaHTML`/`prEstadoTabla`/
  `prProximoPago`/`prListaFiltrada`/`prRef` + toda la cadena real `amortizar`/`creditoCalc`/`estadoDe`/
  `esVencido`/`saldoDe`/`pagadoDe`, con 15 préstamos de prueba): 5 KPIs, 12 filas en página 1 / 3 en
  página 2, paginación e info correctas, buscador filtra bien, 5 tarjetas abajo, sin desbordes en 390px
  ni 1280px, 0 errores de JS. Más 6 aserciones en Node de `prEstadoTabla` (los 4 estados: Pagado/
  Vencido/Por vencer/Al día) y `prRef` estable. `node --check parches.js` limpio; los 3 `<script>` de
  `index.html` pasan `new Function()`; `version.json` válido. `cardHTML` (el render de tarjeta viejo)
  quedó sin usar — se dejó por si se quiere revertir, no se borró en esta ronda.

### Financiamiento (Préstamos, Multiempresa) — método de interés PLANO vs SALDO INSOLUTO (23-jul-2026, v49.10)
El dueño reportó lo que creía un bug: prestando 20,000 al 10% mensual en **8 cuotas quincenales**, él
calculaba RD$3,500/cuota pero el sistema le daba **menos** (3,094). **No era un bug** — se auditó el motor
real (`amortizar`/`calcPrestamo`/`tasaPorCuota`/`nxPrRecalc`) y estaba correcto: el sistema usaba
**amortización de saldo insoluto** (interés solo sobre el saldo pendiente, baja cada cuota → cuota 3,094,
interés total 4,756). El 3,500 del dueño es el **método plano / interés simple** (interés fijo sobre el
monto completo: 20,000 × 5%/quincena × 8 = 8,000 → total 28,000 → 3,500/cuota). Son dos métodos legítimos;
el plano es **más rentable** para el prestamista (8,000 vs 4,756 de ganancia en este caso) y es como se
presta informalmente en RD. El dueño lo confirmó y pidió agregarlo como opción, por defecto el plano.
- **Columna nueva `prestamos.metodo_interes`** (text, default `'saldo'`, migración `prestamos_metodo_interes`,
  aditiva). Los préstamos ya creados quedan en `'saldo'` (el backfill del default) → **no cambian**. La
  tabla estaba vacía al momento del cambio (el dueño solo estaba probando cálculos). `get_advisors` sin
  hallazgos nuevos (solo agregué columna, sin tocar RLS).
- **`amortizar(capital, tasaPct, n, base, frec, metodo)`** ganó un 6to parámetro. Rama nueva `'plano'`
  (solo si hay interés): `interesTotal = round(capital × i × n)` con `i = tasaPorCuota%` (proporcional a la
  frecuencia — quincenal = 5% cuando la mensual es 10%), cuotas todas iguales `round(total/n)`, la última
  cuadra el redondeo. Si el método NO es 'plano' (incluye llamadas viejas SIN el parámetro), cae a la
  amortización francesa de siempre — **retrocompatible, verificado**.
- **Wiring** (todos pasan/leen el método, cero lógica de negocio nueva): `calcPrestamo` lee
  `val('prMetodo')` (default 'plano'); `nxPrRecalc` (vista previa) pasa `c.metodo` y muestra una nota de
  qué método es; `nxPrestamoGuardar` guarda `metodo_interes` (para cuotas; 'saldo' para libre/crédito);
  `nxPrestamoVer` (detalle, recalcula la tabla en vivo) usa `p.metodo_interes||'saldo'` y lo muestra en el
  encabezado de la tabla de amortización; el **contrato imprimible** (`nxPrestamoContrato`, cláusula de
  pago) también usa el método real del préstamo. Selector nuevo `<select id="prMetodo">` en la caja de
  cuotas del formulario (`abrirForm`), plano como primera opción (default para préstamos nuevos), y al
  editar se preselecciona `p.metodo_interes`.
- **Verificado con el código real extraído** (no reconstrucción): 18 aserciones en Node sobre `amortizar` —
  plano da exactamente 3,500 (20,000/10%/8 quincenal, total 28,000, interés 8,000, suma de cuotas == total,
  suma de capital == capital, saldo final 0), plano 4 mensual = 7,000, saldo insoluto sin cambio (3,094 /
  6,309) tanto con método explícito como SIN parámetro (retrocompat), tasa 0 cae a capital/n, y un caso de
  redondeo impar (7,000/3) cuadra al centavo. Más una prueba de DOM en Playwright con `calcPrestamo`/
  `nxPrRecalc` reales: la vista previa muestra 3,500 en plano y 3,094 en saldo insoluto, con la nota
  correcta. `node --check parches.js` limpio; los 3 `<script>` de `index.html` pasan `new Function()`;
  `version.json` válido.
- **Nota:** es el módulo Préstamos/Financiamiento de Multiempresa (`nxAbrirPrestamos`, tablas
  `prestamos`/`prestamo_pagos`), NO el Cuotas del POS (`pos_financiamientos`) — ese sigue con su cálculo
  propio (financia el saldo de una venta, sin este método plano). Si el dueño lo pide, se puede replicar
  ahí con el mismo patrón.

### Financiamiento — ELIMINAR clientes (préstamos ya se podía) (25-jul-2026, v49.33)
El dueño pidió "que se pueda eliminar los clientes y también un préstamo". **Auditoría primero:**
`nxPrestamoBorrar(id)` **ya existía** (botón "Borrar" en el detalle del préstamo) — no hacía falta nada
ahí. Lo que NO existía era borrar un cliente de `prestamo_clientes`.
- **Hallazgo de esquema (SQL directo, decidió el diseño):** `prestamo_pagos.prestamo_id` → `prestamos` es
  **CASCADE** (por eso borrar un préstamo ya arrastra sus pagos, y el confirm de siempre lo dice bien);
  pero `prestamos.cliente_id` → `prestamo_clientes` es **NO ACTION**: si se intentara borrar un cliente con
  préstamos, Postgres **rechaza** el DELETE con un error técnico feo (`violates foreign key constraint`).
- **`window.nxPrClienteBorrar(id)`** (nueva, junto a `nxPrClienteEditar`): comprueba **antes** con
  `prCliStats(c)` (helper que YA existía, cuenta préstamos/activos/saldo desde `_prestamos` en memoria —
  cero consultas nuevas). Si el cliente tiene ≥1 préstamo **no borra** y avisa con el conteo real
  ("tiene 2 préstamos registrados (2 sin saldar). Borra primero sus préstamos, o déjalo como está para
  conservar el historial"). Si no tiene ninguno: `swalConfirm` → `DELETE prestamo_clientes?id=eq.<id>` →
  `logAudit('PRESTAMO_CLIENTE_ELIMINADO', nombre · cédula, 'Financiamiento')` → recarga y repinta.
- **Decisión deliberada:** el bloqueo aplica **también a préstamos ya PAGADOS**, no solo activos —
  borrar un cliente con historial destruiría el registro de esos préstamos (el historial crediticio del
  módulo depende de `cliente_id`). Mismo criterio de proteger el dato real que el resto del sistema.
- **Entradas:** botón de basura en cada fila de la lista de Clientes (`prClientesTablaHTML`, en gris
  apagado + `title` explicativo cuando el cliente tiene préstamos, rojo cuando sí se puede) y dentro del
  formulario al EDITAR (`abrirClienteForm`, solo si `cli` existe — al crear no hay nada que borrar).
- **Verificado con Playwright, código real extraído** (`prCliStats`/`prClientesTablaHTML`/
  `nxPrClienteBorrar` + `saldoDe`/`estadoDe`/`creditoCalc` tal cual): **15 comprobaciones** — botón en las
  3 filas con el color/title correcto según tenga o no préstamos; cliente con 2 préstamos → **cero DELETE**
  a la base + aviso con el conteo correcto (plural/singular y "sin saldar"); cliente con préstamo ya
  pagado → tampoco se borra; cliente sin préstamos → DELETE correcto (`prestamo_clientes?id=eq.c1`) +
  toast + registro de auditoría con nombre y cédula; cancelar el confirm → no borra nada. 0 errores de
  consola. `node --check parches.js` limpio; los 3 `<script>` de `index.html` pasan `new Function()`;
  `version.json` válido.

### Financiamiento — compartir la PROPUESTA de un préstamo que aún no existe (25-jul-2026, v49.32)
El dueño planteó el caso real: "estoy llegando a un acuerdo con un cliente nuevo pero quiero compartir la
tabla en el módulo de consulta". **Hallazgo de la auditoría:** el botón de v49.31 NO servía para eso —
`nxPrestamoAmortizacion(id)` busca el préstamo en `_prestamos`, y en una negociación no hay préstamo
guardado. Además "módulo de consulta" no existe con ese nombre: lo que encaja es **Evaluación**
(`_prView='evaluacion'`), cuyo modal "Ver amortización detallada" (`evVerAmort`) mostraba la tabla **solo en
pantalla**, sin imprimir/compartir. El otro lugar donde se negocia es el formulario de **Nuevo préstamo**,
cuya vista previa solo enseña 3 filas. El dueño eligió (AskUserQuestion) ponerlo **en los dos**.
- **Refactor mínimo y retrocompatible:** `nxPrestamoAmortizacion` ahora acepta **un id (préstamo guardado,
  comportamiento idéntico al de antes) o un objeto "borrador"** marcado `_propuesta:true`. En modo propuesta:
  `pag=0` (nadie ha pagado), se **quita la columna Estado** (siempre la última de las 3 ramas, con
  `cols.pop()`+`filas.forEach(f=>f.pop())` — nada de duplicar el render), no se llama `prEstadoInfo`/`prRef`
  (darían un estado y un "PR-__PROP" falsos) y cambian título/badge/nota/asunto.
- **Decisión importante (criterio "no fingir"):** una simulación NO puede verse igual que un préstamo real —
  si saliera con "PR-XXXXXX" y badge ACTIVO, el cliente podría creer que ya tiene un préstamo aprobado. El
  documento sale como **"PROPUESTA DE FINANCIAMIENTO"**, badge `PROPUESTA`, **sin número de contrato**, y con
  nota al pie: *"Es una simulación de las condiciones conversadas: no es un préstamo aprobado ni un
  compromiso de desembolso... no tiene número de contrato porque el préstamo todavía no existe en el
  sistema."* El mensaje de WhatsApp cierra con el mismo aviso.
- **`window.nxPrPropuesta()`** (nueva): arma el borrador leyendo el simulador **del DOM**. Clave: Evaluación
  y el formulario de Nuevo préstamo **comparten los mismos ids** (`prCap`/`prTasa`/`prNumCuotas`/`prFrec`/
  `prMetodo`/`prPlazo`/`prFecha`/`prNom`/`prCed`/`prTel` — ver v49.15), así que **una sola función cubre las
  dos pantallas**, sin duplicar nada. Cliente: `prNom` (en el form es un campo que se teclea → sirve para un
  cliente que todavía NO está registrado) o `_evCli` como respaldo. Modos: `cuotas` (con o sin interés —
  sin interés usa `total_devolver=capital`, no depende de `calcPrestamo` que devuelve `computa:false` ahí) y
  `credito`. **`libre` avisa y no genera** (no tiene cuotas fijas). Simulador incompleto → toast, sin abrir
  documento vacío.
- **Botones:** en el modal `evVerAmort` (junto a "Volver") y en el formulario de Nuevo préstamo (junto a
  "Vista previa de cuotas"), ambos con `aria-label`.
- **Verificado con Playwright, código real extraído** (`nxPrestamoAmortizacion`/`nxPrPropuesta`/`amortizar`/
  `creditoCalc`/`mesesCompletos`/`fechaCuota`/`prEstadoInfo`/`prRef`/`prIniciales` tal cual), **22
  comprobaciones**: (a) **retrocompatibilidad** — el préstamo guardado sale idéntico (título TABLA DE
  AMORTIZACIÓN, número de contrato, badge ACTIVO, columna Estado con Pagada/Pendiente, nota de siempre, y NO
  dice propuesta); (b) **propuesta** — título/badge PROPUESTA, nombre del cliente nuevo tecleado, SIN `PR-`,
  aviso legal presente, sin cuotas "Pagada", 8 filas correctas, columnas sin Estado, montos exactos
  (28,000 / cuota 3,500), botón WhatsApp; (c) **límites** — simulador vacío avisa, abonos libres avisan,
  línea de crédito sí genera. Sin desbordes, 0 errores de consola. `node --check parches.js` limpio; los 3
  `<script>` de `index.html` pasan `new Function()`; `version.json` válido.

### Financiamiento — botón para COMPARTIR la tabla de amortización (25-jul-2026, v49.31)
El dueño pidió "botón para compartir tabla de amortización". La tabla ya existía dentro del detalle del
préstamo (`nxPrestamoVer`, variable `scheduleHTML`) pero solo se podía mirar en pantalla — no había forma de
imprimirla ni mandársela al cliente (Contrato y Estado de cuenta sí tenían su documento; el cronograma no).
- **`window.nxPrestamoAmortizacion(id)`** (nueva, junto a `nxPrestamoComprobante`): documento
  `window.open`+`document.write` con el MISMO patrón del comprobante de pago (v49.23) — encabezado con marca
  + título + `prRef` + badge de estado, tarjeta de cliente (avatar `prIniciales`, cédula, teléfono), tarjeta
  de condiciones, y el cronograma completo en tabla. Acciones: **Cerrar · Imprimir/PDF · WhatsApp · Correo**
  (los handlers van dentro de un `<script>` del documento con `addEventListener`, NO en `onclick` — evita a
  propósito el bug de comillas de `JSON.stringify` dentro de un atributo, ya documentado en v49.23).
- **Recalcula, no guarda:** usa las mismas `amortizar()`/`creditoCalc()`/`fechaCuota()` que pinta el modal, y
  el estado Pagada/Pendiente de cada cuota con el mismo criterio acumulado (`acum += cuota; pag >= acum-0.5`).
  Cero tablas/columnas nuevas, cero escrituras.
- **Los 3 modos reales, sin fingir ninguno:** `cuotas` con interés → tabla de amortización (#/Fecha/Cuota/
  Interés/Capital/Saldo/Estado); `cuotas` sin interés → calendario de cuotas (#/Fecha/Cuota/Estado);
  `credito` → interés por mes (Mes/Desde/Capital base/Interés/Estado). **`libre` (abonos libres) NO genera
  documento** — no tiene cuotas fijas que compartir, así que avisa con un toast en vez de abrir una hoja
  vacía (mismo criterio de "no fingir" del resto del sistema).
- **Entrada:** botón de compartir (`ti-share`, morado, con `aria-label`) al lado del título del cronograma
  dentro de `nxPrestamoVer`. Se factorizó un helper `schedTit(txt)` para que los 3 modos usen el mismo título
  + botón sin duplicar HTML.
- **WhatsApp:** el mensaje lleva resumen (condiciones) + el cronograma línea por línea, **acotado a 40 líneas**
  con "… y N más (ver documento completo)" — evita armar un enlace `wa.me` absurdamente largo en préstamos de
  muchas cuotas.
- **Verificado con Playwright + código real extraído** (`nxPrestamoAmortizacion`/`amortizar`/`creditoCalc`/
  `fechaCuota`/`pagadoDe`/`prEstadoInfo`/`prRef`/`prIniciales`/`waNumero`/`empresaNom` tal cual del archivo),
  **24 comprobaciones**: el documento se genera y, cargado como página REAL en el navegador, tiene las 8 filas
  correctas, las columnas correctas, 2 pagadas / 6 pendientes con RD$7,000 abonado, fechas en DD/MM/AAAA
  (confirmado que la 1ra cuota quincenal cae 15 días después del préstamo, no el mismo día), los montos exactos
  del caso real (cuota 3,500 · interés total 8,000 · total 28,000 · saldo final 0), los 4 botones de acción, y
  que un préstamo de abonos libres NO genera documento sino aviso. Más 6 del botón del modal (existe, llama a
  la función con el id correcto, `aria-label` presente, no desborda). Sin desbordes en 390px ni 820px, 0
  errores de consola. `node --check parches.js` limpio; los 3 `<script>` de `index.html` pasan
  `new Function()`; `version.json` válido.

### Financiamiento — repase de diseño con skills (ui-ux-pro-max + frontend-design), pieza 1: hero del dashboard (25-jul-2026, v49.30)
El dueño mandó un catálogo de skills de diseño (frontend-design, web-artifacts, canvas-design, algorithmic-art,
ui-ux-pro-max, slack-gif) y pidió "aplicar estos skills para mejorar los diseños de las apps". **Aclaración
honesta dada al dueño:** de las 6, solo `ui-ux-pro-max` y `frontend-design` aplican de verdad — son
*inteligencia de diseño* (guía) que sirve a cualquier stack; las de React/Tailwind/shadcn/p5.js/GIF no
encajan con NEXUS PRO (un solo HTML sin framework/build/npm). Ya se usa `web-design-guidelines` para auditar.
El dueño eligió empezar por **Financiamiento**.
- **Bug de la skill corregido:** `ui-ux-pro-max/scripts/design_system.py` línea 437 tenía un f-string con
  backslash (solo válido en Python 3.12+; el entorno tiene 3.11) — se factorizó a una variable para que el
  tool corra. El tool dio recomendaciones genéricas que NO aplican (sugirió "App Store landing", Liquid Glass,
  ámbar, Fira Code — nada que ver con un dashboard de préstamos ni con la identidad morada ya establecida); lo
  útil es su checklist de UX, que ya se sigue. Se mantuvo el morado por la regla "cada app su color".
- **Proceso (muestras aprobadas antes de tocar producción, como siempre):** se hizo primero un antes/después
  sutil (pulido de profundidad en las tarjetas KPI); el dueño pidió "algo más marcado". Se armaron **3
  direcciones** en un standalone (A Hero morado · B Panel oscuro tipo instrumento · C Bento con métrica
  destacada), renderizadas en 390px y 1080px y mostradas al dueño → **eligió A (Hero morado)**.
- **HECHO — Hero del dashboard (`renderLista`, vista principal):** la tira de 5 tarjetas KPI planas
  (`.nxFP-kpis` + helper local `kpi()`) se reemplazó por un **banner de marca** morado (`.nxFP-hA`): degradado
  `#4f46e5→#7c3aed→#6d28d9`, textura de puntos sutil (`radial-gradient` en `::before`), glow (`::after`), el
  "Total por cobrar" gigante (42px, blanco, tabular-nums) con el delta "+X% vs mes ant." en verde menta, y a la
  derecha un 2x2 de mini-stats (Prestado/Cobrado/Vencido/Clientes) con íconos Tabler reales en tiles
  translúcidos (Vencido en tinte rojo `.warn`). **Solo cambió la parte de arriba** — el topbar, buscador, la
  tabla de préstamos (`prTablaHTML`) y las tarjetas de abajo (`.nxFP-dash`) quedaron intactas. Cero cambios de
  datos/lógica: usa las MISMAS variables ya calculadas en `renderLista` (`totalSaldo`/`cobradoMes`/`tendencia`/
  `totalCap`/`totalPag`/`totalVencido`/`clientesActivos`). El helper local `kpi()` quedó sin uso y se borró
  (dead code). **`.nxFP-kpis`/`.nxFP-kpi` NO se tocaron** — los siguen usando las vistas Clientes y Reportes del
  mismo módulo (8 usos), así que su CSS se mantiene.
- **Verificado con Playwright, CSS real extraído del archivo** (las reglas `.nxFP-hA*` tal cual de
  `nxFPEnsureCSS`): el hero renderiza igual que la muestra A aprobada (número gigante, delta verde, 2x2 de
  stats, tile de vencido en rojo), sin desbordes en 390px ni 1080px, 0 errores de consola (los íconos salen
  como placeholder en el harness porque el entorno bloquea el webfont Tabler — en `nexusprord.com` sí cargan).
  `node --check parches.js` limpio; los 3 `<script>` de `index.html` pasan `new Function()`; `version.json`
  válido.
- **Pendiente (repase de diseño de Financiamiento, si el dueño quiere seguir):** mismo nivel de craft a la
  tabla de préstamos, las tarjetas de abajo (`.nxFP-dash`), y los formularios — pieza por pieza, cada una
  mostrada/aprobada antes de publicar. **Nota:** el `.agents/skills/.../design_system.py` quedó parchado
  (fix del f-string) — es un archivo de skill, no de la app; si molesta en el diff se puede revertir, pero es
  un fix legítimo y sin efecto en producción.

### Financiamiento — calcular el préstamo por el MONTO de la cuota + "Interés plano" (25-jul-2026, v49.29)
El dueño pidió (nota de voz) dos cosas sobre el formulario de préstamo (`abrirForm`, modo Cuotas fijas):
(1) quitar "— más ganancia" del método y dejarlo "Interés plano"; (2) poder poner **la cuota que el
cliente quiere pagar** (por semana/quincena/mes) y que el sistema calcule cuántas cuotas y el total, en vez
de solo poner el número de cuotas.
- **(1) Texto:** la opción del método pasó de "Interés simple (plano) — más ganancia" a **"Interés
  plano"** (loan form + Evaluación + nota del resumen + encabezado de la tabla de amortización de
  `nxPrestamoVer` + el texto de ayuda). Solo texto de UI — el cálculo no cambió.
- **(2) Calcular por MONTO de la cuota (nuevo):** segmentado nuevo "Calcular por" en la caja de Cuotas fijas
  con 2 botones: **Número de cuotas** (default, comportamiento de siempre) y **Monto de la cuota**. En el
  modo nuevo, el campo "# de cuotas" se cambia por "Cuota que pagará"; al escribir la cuota,
  `sincronizarCuotasPorMonto()` calcula el # de cuotas con `cuotasParaMonto(capital,tasa,frec,metodo,cuota)`
  y lo escribe en el MISMO campo `prNumCuotas` de siempre — así todo lo de abajo (`calcPrestamo`,
  `nxPrestamoGuardar`, `amortizar`, el resumen) funciona sin tocar nada: **`prNumCuotas` sigue siendo la
  única fuente de verdad, el modo nuevo solo es una forma de llenarlo**. Variable `_prCuotaMode`
  ('num'|'monto', se resetea a 'num' al abrir el form). `window.nxPrCuotaMode(mode)` alterna los campos.
  El enganche está en `nxPrRecalc` (llama `sincronizarCuotasPorMonto()` antes de `calcPrestamo()`), así que
  cambiar capital/tasa/frecuencia/método/cuota recalcula el # de cuotas en vivo. Aviso morado "Serán N
  cuotas quincenales (la última puede variar un poco)"; si la cuota es muy baja (no cubre ni el interés, o
  daría >360 cuotas) avisa en rojo y no calcula.
- **Matemática de `cuotasParaMonto` (por método):** plano → `n = ceil(capital/(cuota − capital×i))`; saldo
  insoluto (francés) → `n = ceil(−ln(1 − capital×i/cuota)/ln(1+i))`; sin interés → `ceil(capital/cuota)`;
  con `i = tasaPorCuota(tasa,frec)` (quincenal = 5% cuando la mensual es 10%). Se redondea hacia ARRIBA, así
  que la cuota real que sale de `amortizar(n)` es ≤ la deseada (round-trip: para el caso exacto del dueño
  —20,000/10%/quincenal/plano/3,500— da 8 cuotas y `amortizar(8)` devuelve cuota 3,500 EXACTA). Tope de 360
  cuotas para no generar cronogramas absurdos.
- **Cero cambios de esquema/lógica de guardado** — `nxPrestamoGuardar` sigue leyendo `prNumCuotas`; lo que
  se guarda es siempre # de cuotas + los términos resultantes. El modo 'monto' es puramente de entrada.
- **Verificado con Node (cálculo) + Playwright (flujo del DOM), código real extraído** (`tasaPorCuota`/
  `amortizar`/`cuotasParaMonto`/`sincronizarCuotasPorMonto`/`nxPrCuotaMode`/`calcPrestamo`/`nxPrRecalc` tal
  cual del archivo): 8 aserciones numéricas (caso del dueño → 8 cuotas + round-trip exacto, cuota baja →
  más cuotas con cuota resultante ≤ deseada, cuota que no cubre el interés → null, sin interés → división
  simple, saldo insoluto, capital/cuota 0 → null) + 7 del DOM (toggle muestra/oculta campos, escribir cuota
  calcula 8 y muestra el aviso, el resumen da 3,500/28,000/8,000, cuota 900 → aviso "muy baja", volver a
  "# de cuotas" restaura). `node --check parches.js` limpio; los 3 `<script>` de `index.html` pasan
  `new Function()`; `version.json` válido.

### Financiamiento — formulario de cliente al look premium del módulo (25-jul-2026, v49.28)
El dueño notó que el formulario de "Nuevo cliente" de Financiamiento se veía "muy diferente" al resto del
módulo. Investigado: **hay un solo formulario de cliente** (`abrirClienteForm`, `parches.js` IIFE de
Financiamiento) — todos los accesos (sidebar Clientes → `nxPrClienteNuevo`, botón del préstamo →
`nxPrClienteNuevoDesdeForm`, Evaluación → `evNuevoCliente`) abren la MISMA función, así que la diferencia
que veía el dueño no era entre dos formularios sino entre el formulario (estilo viejo `.nxPrForm`) y el
CHROME del módulo (ya premium `.nxFP` morado + Plus Jakarta Sans desde v49.11+). La causa concreta: los
modales de Financiamiento usan la clase compartida `.nxPrForm` (CSS en la línea ~15135 del IIFE), que traía
la fuente del sistema, foco violeta plano `#8b5cf6` e inputs sin acabado — nada que ver con el morado
premium del módulo.
- **Arreglo, cero cambios de campos/lógica** (`nxPrClienteGuardar` y todos los ids intactos): (1) se subió
  el CSS compartido `.nxPrForm` al look premium — `font-family:"Plus Jakarta Sans"` (la fuente del módulo,
  cargada por `nxFPEnsureCSS`), foco morado `#6d28d9` con aro `box-shadow`, inputs con fondo `#f8fafc` +
  radios/bordes premium. Como `.nxPrForm` lo comparten TODOS los modales de Financiamiento (préstamo,
  config, contrato, picker...), este único cambio los calza a todos de una vez, sin tocar el HTML de cada
  uno. (2) el formulario de cliente (`abrirClienteForm`) además envuelve sus 5 secciones (Datos personales /
  Contacto / Financiera / Referencias / Notas) en tarjetas premium `.prCard` (blanco, borde morado tenue,
  sombra suave) — mismo lenguaje visual que las tarjetas del módulo. (3) `abrirClienteForm` llama a
  `window.nxFPEnsureCSS()` al abrir para garantizar la fuente. Se respetó "cada app su color" — se usó el
  MORADO de Financiamiento (`#6d28d9`/`#4f46e5`), NO el azul del formulario de cliente del POS
  (`abrirEntidad`, `.nxPf`), que es un módulo/tabla distinto (`pos_clientes` vs `prestamo_clientes`).
- **Nota de alcance:** solo se envolvieron en `.prCard` las secciones del formulario de CLIENTE (el que el
  dueño nombró). Los demás modales de Financiamiento heredan la fuente + inputs + foco premium por el CSS
  compartido, pero no el card-wrap (no hacía falta para calzar, y evita tocar su HTML). Si el dueño quiere
  el card-wrap en el formulario de préstamo también, es un paso aparte.
- **Verificado con Playwright, código real extraído** (`abrirClienteForm`/`prSec` + el CSS real de
  `.nxPrForm` tal cual del archivo): 5 tarjetas premium, inputs con fondo `#f8fafc`, campos precargados al
  editar, caja de fiador visible con el checkbox marcado, sin desbordes en 390px ni 1000px. La fuente Plus
  Jakarta y el aro de foco morado se confirmaron en la captura del render real (el entorno bloquea el CDN de
  Google Fonts, así que el `getComputedStyle` del test headless no reflejó la fuente/`:focus` — limitación
  del entorno ya documentada, no del código; en `nexusprord.com` sí cargan). `node --check parches.js`
  limpio; los 3 `<script>` de `index.html` pasan `new Function()`; `version.json` válido.

### Financiamiento — bug real: al EDITAR un préstamo el resumen mostraba matemática equivocada (25-jul-2026, v49.27)
El dueño mandó una captura de "EDITAR PRÉSTAMO" (quincenal, 10% mensual, 8 cuotas, método plano) donde el
selector de Frecuencia mostraba **QUINCENAL** pero el resumen decía "10% mensual = 2.33% **por semana**",
cuota RD$ 2,967 / total 23,733 / interés 3,733 — la matemática **SEMANAL**, no la quincenal (que da cuota
3,500 / total 28,000 / interés 8,000). **Causa raíz en `abrirForm(pr)` (`parches.js`, IIFE de
Financiamiento):** el orden de operaciones estaba mal — `pintarModo()` (que al final llama a
`window.nxPrRecalc()`) corría PRIMERO, calculando el resumen con los valores por DEFECTO de los `<select>`
(el 1er option de Frecuencia es `semanal`, y método `plano`); recién DESPUÉS se restauraban los valores
reales del préstamo (`s.value = p.frecuencia` / `sm.value = p.metodo_interes`), pero **sin volver a
recalcular**. Así el `<select>` mostraba "Quincenal" (valor bien puesto) mientras el preview quedaba
pegado con los números de "semanal". No corrompía datos — `nxPrestamoGuardar` lee `val('prFrec')` al
guardar, que ya trae el valor correcto; era solo el preview que engañaba (y podía hacer creer que las
condiciones del préstamo eran otras). Afectaba a CUALQUIER préstamo cuya frecuencia no fuera la 1ra opción
(`semanal`) o cuyo método no fuera el default (`plano`) — al abrirlos a editar, mostraban el cálculo de
semanal/plano hasta tocar algo. **Arreglo:** tras restaurar los dos `<select>` se agregó un
`window.nxPrRecalc()` (guardado con try/catch, solo si de verdad se restauró algún valor) — así el resumen
sale correcto desde que se abre el préstamo. Cambio de una sola llamada, cero lógica de cálculo tocada
(`tasaPorCuota`/`amortizar`/`calcPrestamo` intactos — ya estaban bien: quincenal = 5% = 10%×15/30). No es
retroactivo a datos (nunca hubo datos malos, solo display). **Verificado con Playwright + código real
extraído** (`tasaPorCuota`/`amortizar`/`calcPrestamo`/`pintarModo`/`nxPrRecalc` tal cual del archivo,
simulando el flujo de edición): SIN el fix reproduce exacto la captura (2,967 / 23,733 / 3,733, nota "por
semana"); CON el fix da la matemática quincenal correcta (3,500 / 28,000 / 8,000, nota "10% mensual = 5%
por quincena"), 0 errores de consola. `node --check parches.js` limpio; los 3 `<script>` de `index.html`
pasan `new Function()`; `version.json` válido.

### SEGUROS — Ficha del cliente, rediseño Enterprise (19-jul-2026, v48.53)
El dueño pidió un rediseño visual completo del núcleo de Seguros (spec "NEXUS PRO SEGUROS 2026 –
REDISEÑO VISUAL ENTERPRISE", solo capa visual, prohibido tocar lógica/Supabase/consultas). Por el
tamaño se construyó primero una **muestra standalone** (`muestra-ficha-cliente-enterprise.html`,
scratchpad, NUNCA publicada — instrucción explícita del dueño "no lo publiques, me lo enseñas
primero", mostrada solo vía el visor de Artifacts) con 4 pantallas aprobadas una por una en varias
rondas: lista de Clientes, tabla de Facturación (sin columna "Número de Póliza", columna Cliente
más ancha con nombre+empresa, columnas finales Cliente/ARS/Factura/Fecha/Vencimiento/Total/
Balance/Estado/Acciones), Historial de Pagos (KPIs, 8 filtros, columnas con método de pago con
icono, panel lateral con resumen del pago), y la Ficha del cliente. Modo oscuro fue removido de la
muestra a pedido del dueño (una sola paleta clara). Preguntado cómo debía vivir la Ficha del cliente
real, el dueño respondió: **sigue siendo un modal (no página aparte), pero grande** — y que la Línea
de tiempo y el Panel lateral deben ser **reales y completos**, no decorativos.
- **HECHO — `verCliente(id)` reescrito por completo** (antes un modal chico `.cs-panel` de
  `400px`, ahora `width:min(1040px,95vw)`; en móvil `@media(max-width:720px)` pasa a pantalla
  completa). Contenido nuevo dentro de un namespace propio `.nxSf` (paleta azul `#2563EB`, SOLO
  dentro de `.cs-body` — no toca el resto de Seguros, que sigue con su violeta de siempre):
  encabezado (avatar+nombre+badge de estado+plan+agente+balance+WhatsApp/Editar), 4 KPIs
  (facturas totales, pendiente, prima/mes, vigencia de póliza), y 3 columnas — **Línea de tiempo**
  (nueva, ver abajo), **Historial de facturas** (`sfFacturaCard`, reusa el 100% de la lógica/botones
  reales de `rFact()`: mismos badges por estado, mismas funciones `cobrarDesdeFact`/
  `verFacturaPDF_id`/`enviarWA`/`nxEditarPrecioFactura`/`anularFactura`, mismo gating por
  `tienePermiso`), y un panel de Acciones rápidas + Información + Notas internas.
- **NUEVO — Línea de tiempo real** (`cargarTimelineCliente`, async, carga perezosa después de
  pintar el modal): mezcla 4 fuentes sin inventar ninguna tabla nueva para las primeras 3 —
  `c.created_at` (cliente registrado, ya en memoria), `ST.facturas` filtradas por `cliente_id` (ya
  en memoria, factura emitida/anulada), `abonos` vía `API.get` (mismo patrón que
  `verHistorialAbonos`, pago recibido) — y **`auditoria`** para los eventos administrativos
  (editado/inhabilitado/documento subido/ajuste de deuda/precio corregido), que SÍ necesitó una
  columna nueva: **`auditoria.cliente_id`** (migración `auditoria_cliente_id`, uuid nullable +
  índice, additiva). `logAudit(accion,detalle,modulo,clienteId)` ganó un 4to parámetro opcional
  (default `null`) — los ~40 call-sites existentes que NO lo pasan siguen funcionando exactamente
  igual; se actualizaron 9 call-sites concretos para pasar el cliente correcto
  (`FACTURA_PRECIO_CORREGIDO`, `FACTURA_ANULADA`, `COBRO_REGISTRADO`, `COBRO_DEUDA_ANTERIOR`,
  `AJUSTE_DEUDA_ANTERIOR`, `CLIENTE_EDITADO`, `CLIENTE_NUEVO`, `CLIENTE_INHABILITADO`,
  `DOCUMENTO_SUBIDO`). **Nota honesta:** los eventos de auditoría de ANTES de esta versión no
  tienen `cliente_id` — la línea de tiempo solo empieza a completarse del todo desde ahora en
  adelante, no es retroactiva.
- **Verificado con el código real** (no una reconstrucción): se extrajo `verCliente`/
  `sfFacturaCard`/`cargarTimelineCliente` tal cual del archivo junto con los helpers reales que usan
  (`getTot`/`pend`/`deudaAnt`/`pendTot`/`getEst`/`getEstPol`/`fmt`/`planB`/`nxWa`/`tienePermiso`/
  `escHtml`, y las declaraciones reales `let ST/CFG/sesion`), cargados en un navegador con datos
  simulados (un cliente con facturas, dependientes, deuda anterior, un pago y un evento de
  auditoría). **Bug real encontrado y corregido ANTES de publicar:** en móvil (390px) el nombre del
  cliente se salía del modal (`.sf-id{flex:0 0 auto}` sin `min-width:0`/`max-width:100%` — un item
  flex sin esas dos propiedades toma el ancho de su contenido sin envolver, aunque el padre tenga
  `flex-wrap:wrap`), el modal lo recortaba en silencio (`overflow:hidden`) sin generar scroll de
  página — por eso no se notaba con una revisión superficial. Arreglado agregando
  `max-width:100%;min-width:0` a `.sf-id`; reverificado sin desbordes en 390px ni en escritorio
  (1040px), 0 errores de JS. `node --check parches.js` limpio, `version.json` válido, los 3
  `<script>` de `index.html` pasan `new Function()`.
- **Las otras 3 pantallas de la muestra, LLEVADAS A REAL (19-jul-2026, v48.54):** el dueño confirmó
  "Si todo" (todo lo que faltaba de la muestra) — Clientes, Facturas e Historial de pagos.
  - **Decisiones tomadas con el dueño ANTES de programar** (2 preguntas por `AskUserQuestion`, porque
    la realidad del código no calzaba con la muestra): (1) **Facturas real NO era una tabla — eran
    TARJETAS** (`rFact()`, ya afinadas para el celular en varias versiones anteriores, ver Stitch
    v40.2-40.4 y BAYOL CELL); la muestra mostraba una tabla de escritorio. Se le explicó el riesgo
    (pantalla de facturas más usada, tabla ancha = scroll horizontal en el celular) y el dueño eligió
    **convertir a tabla de verdad como la muestra** (no quedarse en tarjetas) — se construyó con
    colapso responsive real (mismo `<table>`, CSS lo convierte en bloques tipo tarjeta en móvil, no
    hay dos renders separados que se puedan desincronizar). (2) El spec de Historial de Pagos pedía
    un badge de "Estado del pago" (Completado/Parcial/Reversado/Anulado) — se verificó la base
    (`abonos.estado`) y solo tiene `NULL` o `'ACTIVO'`, ese concepto no existe de verdad en los datos;
    el dueño eligió **quitar la columna** en vez de fingir un dato falso (mismo criterio de "no
    fingir funciones que no existen" del resto del sistema).
  - **Clientes (`rCli()`):** solo reskin — se envolvió la vista en `.nxSf` (mismo namespace/paleta
    azul de la Ficha del cliente) y se le agregaron 4 KPIs reales arriba (clientes totales/al día/con
    balance pendiente/renuevan este mes, calculados sobre `ST.clientes` completo, no sobre la
    sub-pestaña activa). La tabla (filtros, sub-pestañas Activos/Proceso/VIP/Inhabilitados, orden,
    paginación "Ver todos", menú de acciones) **no se tocó** — solo hereda el header/hover azules por
    CSS. Cero cambios de columnas.
  - **Facturas (`rFact()`), tarjetas → tabla real:** columnas Cliente (nombre+agente+empresa) / ARS
    (`cliente.ars`) / Factura (`factura.ncf`, el comprobante fiscal — no existe un "número de factura"
    separado en el esquema) / Fecha (`factura.created_at`) / Vencimiento (`cliente.fecha_fin`, la
    vigencia de la póliza — no existe una fecha de vencimiento por factura) / Total / Balance (el
    saldo real, `_saldoFacturasCliente`, sin cambios) / Estado / Acciones (mismos botones y mismas
    funciones reales: `cobrarDesdeFact`/`verFacturaPDF_id`/`enviarWA`/`nxEditarPrecioFactura`/
    `anularFactura`, mismo *gating* por `tienePermiso`). CSS nuevo reusable `table.sf-tbl` (dentro de
    `.nxSf`): en escritorio es una tabla normal; en `@media(max-width:720px)` cada fila se convierte
    en un bloque tipo tarjeta (`display:block` + `data-lb` como etiqueta de cada dato) — mismo patrón
    para Historial de Pagos. El resumen de arriba (`factResumen`) pasó de 2 a 3 KPIs (Facturas/Por
    cobrar/Pagadas), reusando `.sf-kpis`.
  - **Historial de pagos (`rPagos()`/`aplicarFiltrosPagos()`):** se auditó el esquema real de
    `abonos` antes de prometer columnas — tiene de verdad `banco`, `factura_id`, `agente_cobro`,
    `created_by_name`, `comprobante_url` (la UI vieja solo mostraba Fecha/Cliente/Monto/Método/
    Referencia, ignorando datos que ya existían). Columnas nuevas reales: **Hora** (misma columna
    `fecha`, es timestamp completo) y **Usuario** (`created_by_name`, con `agente_cobro` de respaldo
    si el primero está vacío — 99% de los pagos tienen al menos uno de los dos). `factura_id` NO se
    agregó como columna (solo 3% de los pagos lo tienen poblado — hubiera sido una columna casi
    siempre vacía). 2 filtros nuevos: **Banco** y **Método**, poblados con las opciones que de verdad
    trajo la consulta (no una lista inventada). KPIs de 3 a 4 (se agregó "Clientes que pagaron",
    cuenta de `cliente_id` únicos). Se quitó la columna "Estado del pago" por la razón de arriba. Los
    encabezados ahora son de verdad ordenables con flechas visibles (`sortPag`/`_ordArrow`) — la
    lógica de orden YA EXISTÍA en el código pero nunca estaba conectada a ningún `<th>` clicable (una
    pieza "dormida" desde antes, cero riesgo activarla ahora).
  - **2 bugs reales de desborde en el celular, encontrados y arreglados ANTES de publicar** (con el
    método de siempre: extraer el código real, cargarlo en un navegador con datos simulados, medir):
    (1) una regla global vieja `@media(max-width:480px){table{min-width:500px}}` (pensada para que
    OTRAS tablas del sistema hicieran scroll horizontal en vez de aplastarse) le pisaba el ancho a la
    tabla NUEVA `.sf-tbl`, que estaba diseñada para colapsar a bloques en vez de hacer scroll —
    arreglado agregando `min-width:0` a la regla de colapso de `.sf-tbl` (más específica, gana la
    pelea de especificidad CSS). (2) las tarjetas KPI (`.sf-kpi`) no tenían `min-width:0` — mismo bug
    de "grid con `min-width:auto`" ya documentado varias veces en este archivo — con `grid-template-
    columns:repeat(3,1fr)` en Facturas, el contenido de una tarjeta empujaba su columna más ancha que
    su 1fr en pantallas angostas. Arreglado agregando `min-width:0` a `.sf-kpi` (beneficia TODOS los
    usos de esa clase, incluida la Ficha del cliente). Reverificado tras los 2 arreglos: `scrollWidth
    === clientWidth` exacto (390px) en las 3 pantallas, 0 errores de JS, datos correctos (KPIs, tabla,
    botones de acción probados con clics reales contra las funciones reales).
  - Verificado con el código real extraído (no una reconstrucción): se construyó un extractor propio
    (balance de llaves real, no rangos de línea a mano — la lección de la sesión de la Ficha del
    cliente, donde un rango de línea mal cortado causó un `SyntaxError` difícil de diagnosticar) para
    sacar `rCli`/`rFact`/`rPagos`/`aplicarFiltrosPagos` y sus ~25 helpers reales tal cual del archivo,
    cargados en un navegador con datos simulados (3 clientes, 2 facturas, 3 abonos). `node --check
    parches.js` limpio, `version.json` válido, los 3 `<script>` de `index.html` pasan `new Function()`.
  - **Seguimiento (v48.55) — auditoría de accesibilidad:** con la skill `web-design-guidelines`
    (mismo patrón que Login/Factura v48.14 y la tanda 1 del POS v48.50). 5 arreglos reales en las
    filas/botones NUEVOS de esta versión: las celdas de Cliente en Facturas e Historial de pagos
    (`.cli-cell`, antes solo `onclick`) ganaron `tabindex="0" role="button" aria-label` + `onkeydown`
    (Enter/Espacio); los botones de solo-ícono (Ver factura/WhatsApp/Precio/Anular en Facturas;
    Recibo/Bauche/Editar/Eliminar en Pagos) ganaron `aria-label` (antes solo `title`, insuficiente
    para lectores de pantalla); los selects nuevos `pgMetodo`/`pgBanco` ganaron `aria-label`; nuevo
    `:focus-visible` (aro azul, `var(--sf-primary)`) para `.cli-cell`/`.sf-btn`/`.btn` dentro de
    `.nxSf` (no existía ninguno ahí, a diferencia de `.nxPf` que ya lo tiene desde v48.50). **Quedó
    fuera de esta pasada** (gap pre-existente, no introducido esta versión, requiere tocar más código
    compartido): las cabeceras ordenables `<th onclick="sortPag/sortCli/sortFact(...)">` tampoco
    tienen teclado ni `aria-sort` — mismo patrón en las 3 tablas, se deja para una pasada aparte si el
    dueño la pide. Verificado con el código real cargado en un navegador: Tab llega a la fila con el
    `aria-label` correcto, Enter dispara `verCliente` igual que el clic, sin desbordes ni errores de
    JS después del cambio.
  - **BUG REAL encontrado y arreglado de raíz (v48.56) — número cortado en el celular:** el dueño mandó
    una captura real de su iPhone (26 facturas, RD$ 114,500 por cobrar) mostrando el recuadro "Por
    cobrar" con el monto cortado a la mitad ("RD$ 114,50"), algo que los datos de prueba de la sesión
    (montos más cortos) no habían revelado. **Causa de raíz:** el arreglo `min-width:0` de v48.54 solo
    se aplicó a `.sf-kpi` (la tarjeta, para que el GRID no la forzara ancha) pero NO al `<div>` interno
    sin clase que envuelve `.lb`/`.v`/`.sub` — como `.sf-kpi` es `display:flex`, ese div interno seguía
    con `min-width:auto` (su comportamiento por defecto), así que el número largo lo empujaba más ancho
    que la tarjeta ya encogida; al no tener la tarjeta `overflow:hidden`, el texto se desbordaba visual
    pero quedaba TAPADO por la tarjeta vecina (pintada después, con fondo opaco) — parecía un corte
    limpio pero era una tarjeta pisando a la otra. Arreglado con `.nxSf .sf-kpi>*{min-width:0}` (todos
    los hijos directos, no solo la tarjeta) + separando el trato: `.lb`/`.sub` (etiquetas) usan
    `text-overflow:ellipsis` de verdad (con el `white-space:nowrap` que le faltaba a v48.54 para que la
    elipsis funcionara), pero `.v` (el MONTO) usa `overflow-wrap:break-word` — nunca se trunca un monto
    de dinero, si no cabe en una línea pasa a una segunda en vez de esconder dígitos. **De paso**,
    aprovechando que ya se estaba tocando el CSS del `.sf-tbl` responsive, se hicieron las tarjetas de
    factura/pago en el celular más compactas: los pares ARS/Factura, Fecha/Total y Balance/Estado ahora
    van 2 por fila (`flex:1 1 45%` en cada `<td>`, Cliente y Acciones siguen a lo ancho completo con
    `flex:1 1 100%`) — con 26 facturas como las del dueño, la mitad de scroll para verlas todas.
    Verificado reproduciendo los NÚMEROS REALES de la captura (26 facturas, ~RD$114,009 de prueba, un
    monto de 6 cifras) en el harness de Playwright — antes del arreglo se repetía el corte, después el
    monto se ve completo (envuelto en 2 líneas) y sin desbordes ni en el celular ni en escritorio.
  - **Seguimiento (v48.57) — el mismo arreglo dejó el número partido letra por letra:** el dueño mandó
    otra captura mostrando "RD$ 114,500" partido en 4 líneas ("RD"/"$"/"114,"/"500"), y las etiquetas
    de arriba cortadas ("FAC…", "POR …", "PAG…"). Causa: el resumen de Facturas forzaba
    `grid-template-columns:repeat(3,1fr)` en LÍNEA (estilo inline) para sus 3 recuadros — un inline
    style siempre le gana a la regla `@media` que reduce a 2 columnas en móvil (exactamente el mismo
    tipo de bug de especificidad que causó el desborde de 513px en v48.54), así que en el celular
    igual intentaba meter 3 columnas en ~360px, dejando ~100px por recuadro — ahí ni la etiqueta ni el
    monto caben en una línea sana. Cambiado a `repeat(auto-fit,minmax(150px,1fr))` (mismo criterio que
    ya usaba Historial de pagos, subido de 130px a 150px por el mismo motivo): en escritorio se ven los
    3 recuadros igual que siempre: en el celular el grid se acomoda solo a 2 columnas (el tercero pasa
    abajo), dando a cada recuadro el ancho real que necesita. Con eso el monto cabe en 1-2 líneas
    limpias y las etiquetas se leen completas. Verificado con los mismos números reales de la captura
    del dueño (26 facturas, RD$114,009 de prueba) en 390px: 2 columnas prolijas, sin desbordes.
  - **Seguimiento (v48.58) — pulido pedido por el dueño:** con los 3 recuadros ya arreglados (2 arriba
    + 1 solo abajo en el celular), el dueño pidió mejorar ese acomodo — el recuadro solitario
    ("Pagadas") dejaba espacio vacío a la derecha. Se le agregó una clase `sf-kpi-wide` (solo al 3er
    recuadro del resumen de Facturas) que en `@media(max-width:720px)` hace `grid-column:1/-1` — se
    estira a todo el ancho cuando queda solo, sin espacio vacío. En computadora no se toca (los 3
    siguen parejos en una fila, la regla vive dentro del mismo media query que ya reacomoda a 2
    columnas). Verificado con el código real en un navegador: 390px sin espacio vacío ni desbordes,
    1280px sigue igual que antes del cambio.

### Logos de las ARS (v48.59)
El dueño pidió mostrar el logo de la ARS del cliente en vez de solo el nombre en texto. `clientes.ars`
es texto libre (sin tabla propia) — se auditó la base real: solo 3 ARS en uso de verdad por clientes
reales (`ARS Humano` ×29, `ARS SENASA` ×27, `ARS Universal` ×1; el resto son `(sin ARS)`/`Otra ARS`).
- **Origen de los logos — limitación real de este entorno:** este entorno de sesión tiene el acceso de
  red restringido por política (confirmado con `curl`/`WebFetch` — ambos dan 403 contra CUALQUIER host,
  no solo uno en particular; es una restricción de egress, no algo que se pueda evadir). Por eso NO se
  pudieron buscar/descargar los logos automáticamente — **el dueño los mandó directamente como archivos
  adjuntos en el chat** (6 en total: `senasa.jpg`, `humano.webp`, `universal.png`, más `meta-salud.png`,
  `la-monumental.png`, `futuro.jpg` por si algún cliente futuro usa esas). Nota real encontrada al
  investigar: "ARS Humano" se rebrandeó a **"Primera ARS de Humano"** (confirmado con el logo real que
  mandó el dueño, coincide con lo que ya se sabía por fuera) — el mapa cubre ambos nombres.
- **Guardados en `/ars-logos/`** (raíz del repo, mismo patrón que `icon-*.png` — Cloudflare los sirve
  tal cual, sin build).
- **"Mapa fijo en el código"** (decisión del dueño, no un catálogo editable): `const ARS_LOGOS` en
  `index.html` (junto a `planB`/`estB`) — texto de `clientes.ars` en minúsculas → nombre de archivo.
  `arsLogoUrl(ars)` arma la URL **absoluta** (`location.origin+'/ars-logos/...'`) a propósito: los
  documentos impresos (Factura/Certificado/Expediente) abren en una ventana `about:blank`
  (`window.open('','_blank')+document.write`) donde una ruta relativa no resuelve bien — con
  `location.origin` funciona igual en la app normal y en esas ventanas. `arsLogoHTML(ars,alto)` arma
  `<img>`+texto; si la ARS no tiene logo en el mapa, cae solo al texto de siempre (nunca un ícono roto).
- **Conectado en 4 lugares:** tabla de Facturas (columna ARS), Ficha del cliente (panel Información),
  y 3 documentos impresos que ya mostraban o podían mostrar la ARS (`generarHTMLFactura` — el campo ARS
  no existía ahí, se agregó de paso; `generarHTMLCertificado`; expediente de cliente). En la lista de
  Clientes **no hay columna ARS** (nunca la tuvo) — en vez de agregar una columna nueva angosta más, se
  puso un ícono chico junto a la cédula del cliente (no se tocó el avatar con iniciales, para no verse
  inconsistente entre filas con/sin ARS reconocida).
  Verificado con el código real cargado en un navegador (datos de prueba con `ars:'ARS Humano'`/`'ARS
  Universal'`/`'ARS SENASA'`, los mismos textos reales de la base): la URL de la imagen se arma
  correctamente (`location.origin+'/ars-logos/humano.webp'`), sin desbordes en 390px ni 1280px, 0
  errores de JS. Los logos en sí no se pudieron ver renderizados en este entorno (sin salida a un
  servidor real desde el navegador de prueba) — confirmar visualmente en `nexusprord.com` una vez
  publicado.

### Pólizas, Agentes y Empresas — mismo look Enterprise (v48.60)
El dueño pidió seguir extendiendo el rediseño azul Enterprise (Clientes/Facturas/Ficha/Historial de
pagos) al resto de Seguros. Se hicieron las 3 más simples/bajo riesgo primero (listas y catálogos, sin
convertir tarjetas↔tabla como se hizo con Facturas): **Pólizas** (`rPolizas()`, envuelta en `.nxSf` +
4 KPIs nuevos: total/vigentes/en gracia/vencidas, calculados sobre la misma lista base antes de aplicar
búsqueda/filtro — igual patrón que los KPIs de Clientes), **Agentes** (`rAgentes()`, envuelta en `.nxSf`
+ 4 KPIs: total/licencia vigente/por vencer/vencida, reusando la misma categorización que ya calculaba
cada fila de la tabla) y **Empresas** (`rEmpGrd()`, envuelta en `.nxSf` + 3 KPIs: empresas/asegurados/
prima mensual total; las tarjetas por empresa conservan su color propio por índice — rasgo deliberado
que no se tocó). Nueva clase `.nxSf .sf-kpi.err` (roja, `--sf-err-l`/`--sf-err-d`) — no existía un
modificador de color rojo para las tarjetas KPI, solo blue/ok/warn/purple; se agregó siguiendo el mismo
patrón que los demás. Cero cambios de columnas, filtros, orden ni funciones — solo el header/hover de
las tablas (ya heredado del CSS `.nxSf .tw table` que se creó para Clientes) y los recuadros nuevos.
Verificado con el código real (`rPolizas`/`rAgentes`/`rEmpGrd` extraídos tal cual, con datos simulados)
cargado en un navegador: los KPIs muestran los números correctos, sin desbordes en 390px ni 1280px, 0
errores de JS. **Pendiente si el dueño quiere seguir:** Comisiones, Contabilidad (Mayor/Diario/Balance/
Estado de Resultados/Balance General) y Reportes — mayor riesgo por ser pantallas financieras, se
abordarían con más cuidado y probablemente en tandas más chicas.

### Comisiones, Contabilidad y Reportes — mismo look Enterprise, cierre de la ronda (v48.62)
El dueño confirmó seguir ("Look ENTERPRISES") con las pantallas que habían quedado pendientes por ser más
riesgosas (dinero). Se completó con el mismo criterio de todas las anteriores: **wrap visual, cero cambio
de cálculos**. Concretamente:
- **Comisiones** (`#v-comisiones`, `calcularComisiones()`): la vista ganó la clase `nxSf`. El resumen de 3
  cajas grises (`.g3`/`.sm`, "COMISIÓN BRUTA"/"ITBIS 18% RETENCIÓN"/"NETO A PAGAR") se reemplazó por
  `.sf-kpis`/`.sf-kpi` (azul/ámbar/verde, con `grid-template-columns:repeat(auto-fit,minmax(150px,1fr))`
  — el mismo patrón "auto-fit" que ya evitó el bug de columnas fijas en Facturas, así que no hacía falta
  reaprender esa lección). La tabla de agentes (`.tw table`) no se tocó — al quedar dentro de `.nxSf`
  hereda automáticamente el encabezado/hover azul (`.nxSf .tw table thead tr{background:var(--sf-primary-l)}`,
  la misma regla que ya beneficiaba a Clientes/Pólizas/Agentes/Empresas desde antes). `exportarComisionesCsv`
  no se tocó.
- **Contabilidad — las 4 vistas:** `#v-mayor` (Plan de cuentas + Resumen), `#v-asientos` (Diario),
  `#v-balance` (Balance de Comprobación) y `#v-pyg` (Estado de Resultados) ganaron la clase `nxSf`. Solo
  `rMayor()` tenía un resumen tipo `.g3`/`.sm` (Activos/Pasivos/Ingresos) — se convirtió a `.sf-kpis`/
  `.sf-kpi` igual que Comisiones. El resto de cada pantalla (`rAsientos`, `rBalance`, `rPYG`) usa filas
  `.conr`/`.cdr`/`.ccr`/`.ctot` que YA se ven bien en cualquier fondo — no se tocaron, solo heredan el
  contexto `.nxSf` sin cambiar nada (se confirmó que no existe ninguna regla `.nxSf .conr{...}` que las
  fuera a repintar por accidente).
- **Reportes — las 5 vistas:** `#v-rep-agente`, `#v-rep-plan`, `#v-rep-empresa`, `#v-rep-aging` y `#v-dgii`
  ganaron la clase `nxSf` únicamente (wrap-only, sin tocar el JS de `rRepAgt`/`detalleAgente`/render de
  plan/empresa/aging/DGII) — mismo criterio que ya se usó en la Fase 2 del POS con la tabla de líneas de
  Cotizaciones ("no se rehízo, ya hereda el look, evita el riesgo de tocar lógica compartida"). Estas 5
  pantallas usan tarjetas por agente/fila con su propio estilo (`.nc p2`, `.g3` anidado por tarjeta) que
  no chocan visualmente al quedar dentro de `.nxSf` — se dejaron intactas a propósito en vez de convertir
  cada tarjeta repetida a `.sf-kpi` (mayor riesgo de tocar plantillas con muchas interpolaciones anidadas,
  sin beneficio visual claro sobre lo que ya existía).
- **Por qué se cuidó más que las pantallas anteriores:** todo lo tocado aquí es DINERO real (comisiones a
  pagar, plan de cuentas, asientos, balance). Se verificó explícitamente, antes de tocar código, cuáles
  clases CSS existentes (`.g3`, `.sm`, `.conr`) NO tienen ninguna regla `.nxSf .g3{...}`/`.nxSf .sm{...}`
  que las repintara sin querer, y se limitó el cambio a: (1) agregar la clase `nxSf` al contenedor, (2)
  reemplazar el único patrón `.g3`/`.sm` de resumen por `.sf-kpis`/`.sf-kpi` en Comisiones y en el Resumen
  de Contabilidad — ninguna fórmula, ningún `reduce()`, ningún nombre de campo se tocó.
- **Verificado con el código real** (`calcularComisiones`/`rMayor` extraídos tal cual del archivo, con
  balance de llaves real — no un rango de línea a mano) cargados en un navegador con datos simulados (2
  agentes, 3 clientes, plan de cuentas de 6 cuentas): los montos de Comisiones (bruta/ITBIS/neta por
  agente y el total) y de Contabilidad (activos/pasivos/ingresos/gastos/utilidad) calculan exactamente
  igual que antes, las tarjetas KPI aparecen con el mismo colorido y la misma animación de entrada
  escalonada del resto del sistema, sin desbordes en 390px ni 1280px, 0 errores de JS. `node --check
  parches.js` limpio; los 3 `<script>` de `index.html` (1,423 / 423,878 / 681 caracteres) pasan
  `new Function()`.
- **Con esta versión termina la ronda completa del rediseño Enterprise del núcleo de Seguros** — las 10
  pantallas principales (Clientes, Facturas, Ficha del cliente, Historial de pagos, Pólizas, Agentes,
  Empresas, Comisiones, Contabilidad×4, Reportes×5) comparten ya la misma paleta azul `.nxSf`.

### Ajustes y Usuarios — cierre final de la ronda Enterprise (v48.63)
El dueño pidió sumar las últimas 2 pantallas que habían quedado fuera: **Ajustes/Configuración**
(`v-config`, 14 pestañas: Empresa y Tarifas/Notificaciones/Automatización/Empresas cotizantes/Agentes/
Usuarios/Roles y Permisos/Auditoría/Mis Bases/Changelog/Metas/Apariencia/Coberturas de planes/Bancos) y
**Usuarios del sistema** (`v-usuarios`, tabla aparte fuera de Ajustes).
- **Auditoría previa obligatoria (antes de tocar nada):** se revisaron TODOS los bloques `.g3`/`.sm` de
  `v-config` uno por uno para no repetir el error de convertir algo a `.sf-kpi` que en realidad NO es un
  resumen de solo-lectura. Resultado: los 4 `.g3` de la pestaña "Empresa y Tarifas" (Costos/Primas
  titular/Primas dependiente/Comisión agente) y el de "Metas mensuales" son **formularios de entrada**
  (`.fr`+`<input>`, precios y metas que el dueño edita) — `.sf-kpi` es una tarjeta de SOLO LECTURA
  (ícono+etiqueta+valor), meterle inputs adentro la habría roto. Se dejaron intactos a propósito. El
  progreso de metas (`#metasProgress`, `rMetasProgress()`) usa su propio patrón de barras (`.meta-card`/
  `.meta-row`), tampoco es un `.g3`/`.sm` — no se tocó. **Conclusión: Ajustes no tiene ningún resumen
  KPI real que convertir**, así que el cambio fue "wrap-only" — mismo criterio que ya se usó en Reportes
  y en la tabla de Cotizaciones (envolver en `.nxSf` sin tocar el contenido, cuando el contenido ya está
  bien y no hay riesgo/beneficio en reconstruirlo).
- **Cambio real:** se agregó la clase `nxSf` a los contenedores de `v-config` y `v-usuarios` — cero HTML
  interno tocado, cero función JS tocada. Las tablas de Agentes y Usuarios (dentro de Ajustes y en la
  pantalla aparte de Usuarios) heredan automáticamente el encabezado/hover azul
  (`.nxSf .tw table thead tr{background:var(--sf-primary-l)}`, la misma regla de siempre) — beneficio
  gratis sin tocar `rAgentes`/la carga de `tbUsu`.
- **Verificado con el código real:** se extrajo el HTML de `v-usuarios` tal cual del archivo (balance de
  `<div>` real, no un rango de línea a mano) y se cargó en un navegador con 2 usuarios de prueba — el
  encabezado de la tabla midió `rgb(234,241,255)` (`--sf-primary-l`, confirmando que la herencia de CSS
  funciona), el botón "Nuevo usuario" no se movió ni cambió de color, sin desbordes. Para `v-config` (327
  líneas, 14 pestañas) se confirmó por inspección exhaustiva de cada `.g3`/`.sm` en el archivo real que
  ninguno se vería afectado por la clase nueva — no se armó un harness completo de las 14 pestañas por no
  haber ningún JS/HTML interno que cambiara (el único cambio real, la clase en el `<div>` padre, ya se
  había verificado inerte contra `.g3`/`.sm`/`.conr`/`.fr` en las rondas anteriores).
- **Con esta versión, las 12 pantallas del núcleo de Seguros (las 10 anteriores + Ajustes + Usuarios)
  comparten la misma identidad visual azul Enterprise — cierra por completo el pedido del dueño.**

### POS · Garantía de reparación (v48.64)
El dueño mandó una captura de un sistema de la competencia ("Richard Celulares Servicio Técnico") pidiendo
comparar contra el módulo de Reparaciones — de la lista de diferencias reales (patrón/PIN visual, tipo de
equipo con íconos, recargo por atraso, fecha de entrega prometida, servicio rápido, cédula), eligió empezar
por **la garantía**, algo que hoy NO existe de verdad: la nota legal fija en la orden impresa habla de
**almacenaje** (cargo si no retiran el equipo en 30/90 días), no de garantía sobre la reparación en sí.
Antes de tocar código se preguntó por `AskUserQuestion` cómo debía funcionar — el dueño eligió **días
fijos configurables en Ajustes** (mismo patrón que la mora de Cuotas, no un valor por-reparación ni solo
una nota de texto sin rastrear fecha).
- **Esquema (aditivo, aplicado directo con las herramientas MCP de Supabase — proyecto `tnwsgcxurfyuszxsewsn`):**
  `pos_config.garantia_rep_dias` (integer, default 0 = desactivada, mismo criterio que `mora_pct`) y
  `pos_reparaciones.garantia_hasta` (date, nullable — se llena SOLO al entregar, nunca antes). Verificado
  con `get_advisors(security)`: sin hallazgos nuevos en ninguna de las 2 tablas.
- **Ajustes → "Garantía de reparación":** input de días + botón Guardar (`window.nxPosGuardarGarantiaRep`),
  calcado del patrón de "Recargo por mora" (`nxPosGuardarMora`) — mismo UPSERT contra `pos_config`, mismo
  `logAudit`. `_posCfg` ganó `garantia_rep_dias` (default 0 en el objeto local y en la carga real de
  `cargarPOS`).
- **Cálculo al entregar (`nxRepEntregarGo`):** si `garantia_rep_dias>0`, se calcula
  `entregado_at + N días` y se guarda en `garantia_hasta` — **UNA sola vez**, en el momento exacto de la
  entrega (no se recalcula después ni se actualiza si el dueño cambia el ajuste más tarde, igual que la
  mora nunca reescribe cuotas ya vencidas). **Bug evitado a propósito:** la fecha se arma con
  `getFullYear()/getMonth()/getDate()` (como `hoyISOPos()`), NO con `.toISOString().slice(0,10)` — ese
  segundo método usa UTC y en Republica Dominicana (UTC-4) puede correr la fecha un día si se entrega de
  noche; se evitó desde el diseño, no se descubrió después.
- **Helper nuevo `garantiaInfo(r)`:** vive junto a `repEst`/`repDias` (mismo IIFE de Reparaciones — el
  archivo ya advertía sobre el "bug clase nueva" de helpers que faltan en el IIFE donde se usan, así que se
  puso junto a sus vecinos a propósito). Devuelve `null` si la reparación no tiene `garantia_hasta`
  (nunca se entregó o la garantía estaba apagada), o `{vigente, fecha}` comparando contra `hoyISOPos()`.
- **Se muestra en 3 lugares, reusando el mismo helper (nada de lógica repetida):** (1) detalle de la
  reparación (`nxRepVer`) — verde "vigente hasta X" o rojo "vencida el X"; mientras sigue en el taller,
  muestra un aviso informativo de cuántos días de garantía se le darán al entregar, solo si la garantía
  está activada; (2) lista de "Entregadas" — mismo badge compacto junto a la fecha de entrega; (3) orden de
  servicio imprimible (`nxRepImprimir`) — igual criterio: entregada con garantía muestra la fecha exacta,
  todavía en el taller muestra la promesa ("incluye N días de garantía a partir de la entrega"), y si la
  garantía está desactivada no aparece ninguna línea.
- **Deliberadamente NO construido en esta pasada** (no fue lo que el dueño pidió, y habría sido inventar
  una función que no existe): un flujo de "reclamo de garantía" que reabra la orden original o la vincule
  a una nueva — hoy la garantía es informativa (se sabe si un equipo entregado sigue cubierto), no hay
  botón de "reabrir por garantía". Si el dueño lo pide, sería un paso aparte.
- **Reparaciones entregadas ANTES de esta versión** se quedan sin `garantia_hasta` (no es retroactivo,
  mismo criterio ya usado con la línea de tiempo de la Ficha del cliente v48.53) — no se inventó una
  fecha para historial viejo.
- **Verificado con el código real** (no una reconstrucción): se extrajo `garantiaInfo`/`hoyISOPos`
  textualmente de `parches.js` con un script Node y se probó con 4 escenarios (garantía vigente, vencida,
  reparación aún en el taller con la garantía activada en Ajustes, y garantía desactivada) — los 4
  calculan y arman el HTML esperado. `node --check parches.js` limpio; los 3 `<script>` de `index.html`
  pasan `new Function()`.

### POS · Patrón/PIN visual en Reparaciones (v48.65)
Segundo ítem de la comparación contra "Richard Celulares Servicio Técnico" (ver v48.64) — el campo
"Clave / patrón" de Reparaciones era un simple `<input>` de texto libre. Al auditar antes de tocar código
se encontró algo más importante que la falta de UI bonita: **la clave se guardaba pero JAMÁS se volvía a
mostrar en ningún lado** (ni en el detalle de la reparación, ni en la orden impresa, ni en la tarjeta del
kanban) — el campo existía en la base de datos pero era efectivamente invisible para el técnico que la
necesita para trabajar el equipo. Se corrigieron ambas cosas juntas.
- **Sin columna nueva:** se decidió a propósito NO agregar columnas (`patron`/`pin` separados) — todo
  sigue viviendo en `pos_reparaciones.clave` (texto), con un prefijo `tipo:valor` (`patron:1-2-3-6-9`,
  `pin:4521`, `otro:contraseña libre`). **Retrocompatible:** texto ya guardado ANTES de esta versión (sin
  ningún prefijo, como se guardaba antes) se interpreta automáticamente como tipo `otro` — se sigue viendo
  igual que siempre, nunca se pierde ni se rompe un dato viejo (verificado con un caso de prueba real:
  `"Contraseña vieja sin prefijo"` cae en la pestaña "Otro" con el texto intacto).
  - Se abstiene de tocar RLS/esquema. Precedente: mismo espíritu que la garantía (v48.64), aditivo.
- **Widget reusable (`claveCapturaHTML(key, raw)` + helpers `nxClaveTab/Dot/Limpiar/Pin/PinDel/OtroInput`),
  no un componente aparte:** 3 pestañas — **Patrón** (malla 3x3, tocar los puntos en orden — cada punto
  tocado se numera solo con el orden en que se marcó, no hace falta arrastrar/dibujar líneas, más simple y
  confiable en una ventana modal con scroll que un gesto de arrastre preciso), **PIN** (teclado numérico
  0-9 + borrar + limpiar, muestra puntos `●` mientras se teclea), **Otro** (campo de texto libre, para
  contraseñas alfanuméricas, "sin clave" o "solo huella" — no todos los equipos usan patrón/PIN). El
  estado vive en un objeto global `_claveCap` indexado por una `key` de texto (`'repNueva'` para recibir
  equipo, `'repEdit_'+id` para cada reparación abierta en el detalle) — mismo patrón de estado-por-clave ya
  usado en el resto del sistema (`_ordTablas`, `_stockAlmRows`, etc.).
- **Se usa en 2 lugares del formulario/detalle** (ambos alimentan el mismo helper, cero lógica
  duplicada): (1) `nxRepNueva` (recibir equipo) — al guardar, `nxRepGuardar` lee `nxClaveValor('repNueva')`
  en vez del viejo `val('repClave')`. (2) `nxRepVer` (detalle) — el widget vive DIRECTAMENTE en el modal,
  precargado con `r.clave`, editable en el momento; el botón "Guardar" que ya existía (`nxRepDet`, antes
  solo guardaba diagnóstico/presupuesto/avance) ahora también guarda `nxClaveValor('repEdit_'+id)` — no
  hizo falta un modal ni un botón "editar" aparte.
- **Se MUESTRA (antes no se mostraba en ningún lado) en 3 lugares, todos leyendo el mismo dato guardado
  con el mismo parser (`claveParse`), cero lógica repetida:** (1) tarjeta del kanban — un ícono 🔒 chiquito
  junto al nombre del equipo, solo si hay clave guardada (para saber de un vistazo sin abrir cada
  reparación); (2) el propio widget editable de `nxRepVer` ya lo muestra al estar precargado; (3) orden de
  servicio imprimible (`nxRepImprimir`) — línea nueva "Clave / patrón del equipo" con `claveImprimirHTML`
  (mismo parser, pero con estilos en línea porque esa página vive en una ventana `document.write()`
  totalmente aparte que no hereda el CSS de la app — mismo criterio ya usado con `garantiaLinea`).
- **CSS nuevo `.nxClave*`** agregado al mismo bloque `st.textContent+=` del resto del CSS del POS (patrón
  ya establecido en el archivo, no un `<style>` aparte) — pestañas, malla de puntos (captura, 40px, y
  solo-lectura, 22px más chica para la orden impresa/tarjetas), teclado numérico, todo con la paleta azul
  `#2563eb` ya usada en el resto del POS.
- **Verificado con Playwright interactuando de VERDAD con el DOM** (no solo revisar el HTML generado):
  se extrajo el bloque de funciones real de `parches.js` (con balance de código, no un rango de línea a
  mano) y el CSS real inyectado, se cargó en un navegador, y se **tocaron** los puntos de la malla en el
  orden 1→2→3→6→9 (confirmando que el resumen y el valor codificado salen en ese orden exacto), se
  **tecleó** un PIN dígito por dígito con clics reales sobre los botones del teclado, se escribió texto en
  la pestaña "Otro", y se confirmó el caso de retrocompatibilidad (texto viejo sin prefijo → pestaña
  "Otro" con el valor intacto). También se probaron `claveDisplayHTML`/`claveImprimirHTML` con los 3 tipos
  y con valor vacío (devuelve `null`, no un bloque vacío feo). Capturas de pantalla del patrón y del PIN
  revisadas visualmente. Sin desbordes en 320px ni 360px. `node --check parches.js` limpio.

### Seguros · Cobros — el recibo de pago "no se veía" (v48.66)
El dueño reportó: "cuando un cliente me hace un pago, yo quiero mandarle ese recibo de pago y no veo la
opción". El sistema de recibos YA existe y es robusto (numeración consecutiva, meses guardados en BD para
auditoría, PDF/WhatsApp/Compartir — ver sección "Recibos de pago" en el listado de módulos) — la función
no faltaba, estaba **escondida**. Causa de raíz encontrada en `regAbono()`/`nxRegAbonoDeudaAnterior()`
(`index.html`): al registrar un abono, el aviso verde "¿Enviar recibo?" (`#reciboWAbtn`) solo se mostraba
`if(reciboDiv&&c.wa)` — si el cliente NO tenía WhatsApp guardado en su ficha, el `<div>` se quedaba en
`display:none` para siempre, **sin ningún mensaje que explicara por qué** — para el dueño, la opción
simplemente no existía. Coincide exactamente con la queja: pasa con cualquier cliente sin WhatsApp en su
ficha (común, no es un caso raro).
- **Arreglo de raíz:** el aviso ahora SIEMPRE aparece después de un pago exitoso (`mostrarCajaRecibo(c)`,
  helper nuevo, reemplaza el `if(...&&c.wa)` duplicado que había en los 2 lugares donde se registra un
  abono). Adentro, el botón de WhatsApp (`#btnReciboWA`) se oculta individualmente si no hay `c.wa` — pero
  en su lugar aparece un botón nuevo **"Ver / compartir recibo"** (`#btnReciboVer`, llama al
  `nxReciboMeses()` que YA existía y ya sabe reusar el pago recién registrado — número, monto y meses via
  `_ultimoAbono` — sin necesidad de re-teclear nada) + un mensaje corto (`#reciboSinWA`) explicando que no
  hay WhatsApp y qué hacer en su lugar. Dentro del recibo completo que abre ese botón, "Compartir"
  (share nativo) e "Imprimir/PDF" YA estaban siempre disponibles (no dependen de WhatsApp) — solo hacía
  falta un camino visible para llegar ahí cuando no hay WhatsApp.
- **Cero cambios en la lógica de generación del recibo** (numeración, meses cubiertos, texto del mensaje,
  guardado en `abonos.meses_cubiertos`) — el arreglo es 100% de visibilidad/UX en el modal de Cobro.
- **Verificado con el código real** (`mostrarCajaRecibo` extraída tal cual del archivo, con balance de
  llaves real) cargado en un navegador con 2 casos simulados (cliente con WhatsApp / sin WhatsApp):
  con WhatsApp se ven ambos botones; sin WhatsApp desaparece el de WhatsApp y aparecen el botón alterno +
  el mensaje explicativo — nunca queda la caja completamente vacía o ausente. Capturas de pantalla de los
  2 casos revisadas. `node --check` limpio en los 3 `<script>` de `index.html`.

### POS · MOTOR DE DOCUMENTOS, FASE 1 (21-jul-2026, v48.67) — "Plan Maestro NEXUS PRO POS 3.0"
El dueño mandó un plan maestro de 10 fases (solo detalló la Fase 1) pidiendo un **motor universal de
documentos** que relacione Cotización/Pedido/Prefactura/Factura/Garantía/Devolución/Orden de trabajo —
cada uno con ID interno, código visible, documento origen/destino, estado e historial — con la
restricción explícita **"No modificar la lógica actual de facturación"**. Confirmado con el dueño antes
de programar: vive DENTRO del POS (no un módulo aparte), directo a `main` (sin rama de revisión), y el
alcance real de esta Fase 1 es la cadena que el dueño dibujó a mano: **Cotización → Prefactura → Factura
→ Garantía** (los otros 3 tipos del plan original — Pedido, Devolución, Orden de trabajo — quedan para
fases futuras, el diccionario `DOC_ICONO`/`DOC_NOMBRE` ya está preparado para agregarlos sin tocar el
motor).
- **Diseño elegido — capa de RELACIONES aditiva, nunca reemplaza nada:** se investigó primero (agente de
  exploración) cómo se conectan HOY `nxCotConvertir`/`nxPrefFacturar`/`nxPosConfirmar` — confirmado que
  NO existe ningún enlace real entre una cotización y la factura que nace de ella (el carrito se llena
  con los mismos datos, pero no queda ningún rastro de "esta factura vino de esa cotización"). En vez de
  tocar `pos_cotizaciones`/`pos_prefacturas`/`pos_ventas`/`pos_venta_items` (arriesgar la lógica de
  facturación que el dueño pidió explícitamente no tocar), se creó una tabla-índice nueva
  **`pos_documentos`** (tipo, código visible, `tabla_origen`+`registro_id` → apunta a la fila real que ya
  existía, `documento_padre_id` autoreferencial para la cadena, cliente_id, monto, estado) +
  **`pos_documento_eventos`** (historial: `documento_id`, evento, detalle, quién) — mismo patrón
  org+trigger `set_organizacion_id()`+RLS `mi_rol() is not null AND organizacion_id=mi_organizacion()`
  que TODAS las tablas `pos_*` (clonado con introspección SQL directa de una tabla hermana para no
  adivinar el patrón). `get_advisors(security)` sin hallazgos nuevos.
- **Helpers nuevos** (junto a `nextSeq`, mismo IIFE del POS): `registrarDocumento(tipo, codigo,
  tablaOrigen, registroId, opts)` (inserta en `pos_documentos` + loguea el evento "creado", envuelto en
  try/catch — NUNCA bloquea el flujo real de cobro si algo falla), `registrarEventoDoc(...)`,
  `buscarDocumentoDe(tablaOrigen, registroId)` (encuentra el documento ya registrado de una fila real sin
  tener que pasar IDs a mano por todo el flujo de conversión). Variable de módulo `_facOrigenDoc`
  (mismo patrón que `_factCli`/`_cart` — viaja en memoria mientras el carrito pasa de pantalla en
  pantalla, se limpia apenas se consume para no "pegar" un origen viejo a una venta sin relación real).
- **Enganchado en los 3 puntos reales de conversión, sin tocar su lógica de negocio** (solo se agregó
  código nuevo alrededor, cada uno en su propio try/catch): `nxCotGuardar` (registra la cotización nueva),
  `nxCotConvertir` (busca su documento y lo deja como "origen pendiente"), `nxPrefGuardar` (registra la
  prefactura con `documento_padre_id` = el origen pendiente, si lo hay), `nxPrefFacturar` (vuelve a dejar
  el origen pendiente, esta vez apuntando a la prefactura), y `nxPosConfirmar` (al confirmar el cobro:
  registra la factura con su padre correcto —cotización o prefactura, lo que corresponda— y, por cada
  línea del carrito que trae garantía, registra un documento de garantía hijo de esa factura, usando
  `nextSeq('garantia')` con el mismo patrón de respaldo `'GAR-'+...` que ya usan Reparaciones/Prefacturas
  si la secuencia no está sembrada para esa org).
- **UI de solo lectura para verificar la cadena — `window.nxDocCadena(tabla, registroId)`:** modal nuevo
  (estilo `.nxPf`/`.oppcard`) que sube hasta la raíz de la cadena (hasta 10 saltos) y baja recorriendo
  TODOS los niveles de descendientes (no solo hijos directos — un `while` por niveles, para que abrir
  "Ver cadena" desde la cotización también muestre la factura y las garantías que nacieron 2-3 pasos más
  adelante, no solo el siguiente eslabón). Si el documento es de antes de esta versión (sin relación
  registrada), avisa con un toast en vez de fallar. Botón **"Ver cadena"** (🔀) agregado en 3 lugares:
  lista de Cotizaciones (solo si `est==='convertida'`), historial de Prefacturas (solo si
  `est==='facturada'`) e Historial de facturas (solo si no está anulada) — los 3 con
  `event.stopPropagation()` porque la fila entera ya tiene su propio `onclick`.
- **Deliberadamente NO se tocó** ninguna tabla/función existente de facturación — se verificó línea por
  línea que el único cambio dentro de `nxPosConfirmar` fue capturar la respuesta del POST de
  `pos_venta_items` (antes se descartaba con `catch(e){}` vacío; hacía falta el `id` real de cada línea
  para poder enlazar su garantía) y agregar el bloque nuevo de registro DESPUÉS de que la venta ya se
  guardó — si el motor de documentos falla por cualquier razón, la venta ya está hecha y cobrada, nunca
  se revierte ni se bloquea por esto.
- **Verificado con el código real** (no una reconstrucción): se extrajeron `registrarDocumento`/
  `registrarEventoDoc`/`buscarDocumentoDe`/`nxDocCadena` tal cual del archivo (balance de llaves real) y
  se simuló la cadena completa contra una base en memoria (Cotización → convertir → Prefactura →
  facturar → Factura con 3 líneas, 2 con garantía y 1 sin) — confirmado que cada eslabón guarda el
  `documento_padre_id` correcto, que la garantía NO se crea para la línea sin `garantia_hasta`, que
  `nxDocCadena` arma la cadena completa (ascendente + TODOS los descendientes) se abra desde cualquier
  punto de la cadena, y que un documento sin relación no rompe nada (toast de aviso). `node --check
  parches.js` limpio; los 3 `<script>` de `index.html` (1,423 / 424,234 / 681 caracteres) pasan
  `new Function()`; `version.json` válido.
- **Pendiente:** el resto del "Plan Maestro POS 3.0" (fases 2-10) — el dueño las irá mandando conforme
  avancen; el motor ya está preparado para sumar Pedido/Devolución/Orden de trabajo sin rediseñar nada
  (son entradas nuevas en `DOC_ICONO`/`DOC_NOMBRE` + una llamada a `registrarDocumento` en su punto de
  creación real, mismo patrón ya probado).

### POS · MOTOR DE DOCUMENTOS, FASE 2 — Línea de tiempo universal (21-jul-2026, v48.68)
El dueño pidió la Fase 2 con un ejemplo concreto: cada documento debe tener un historial completo con
hora exacta — "08:05 Creado → 08:08 Cliente cambiado → 08:12 Artículo agregado → 08:15 Precio
modificado → 08:17 Facturado". `pos_documento_eventos` ya existía desde la Fase 1 (se usaba solo para
'creado'/'convertido_a_carrito') — Fase 2 amplía qué eventos reales se detectan y construye la ventana
de línea de tiempo. **Mismo criterio que toda la sesión: NUNCA se inventa un evento — cada línea sale
de una comparación real contra el estado anterior guardado, o de una acción real que de verdad ocurrió.**
- **Dónde aplica de verdad la edición granular — investigado ANTES de programar:** de los 3 tipos de
  documento (Cotización/Prefactura/Factura), solo **Cotización tiene un flujo real de "editar algo ya
  guardado"** (`nxCotEditar` carga una cotización existente, se modifica en pantalla, `nxCotGuardar` la
  vuelve a guardar). Prefactura se crea una sola vez desde el carrito y no tiene "editar" (solo se
  factura o se queda abierta); Factura, una vez confirmada, no se edita (solo se anula). Por eso
  "Cliente cambiado"/"Artículo agregado"/"Precio modificado"/"Cantidad modificada" se implementaron
  SOLO en el ciclo de edición de Cotizaciones — el único lugar donde esos cambios son datos reales, no
  fabricados. No se forzó una edición falsa en Prefactura/Factura solo para parecerse al ejemplo.
- **`diffCotizacion(orig, edit)`** (helper nuevo, junto a `registrarDocumento`): compara el snapshot
  tomado al abrir para editar contra el estado a punto de guardar y devuelve SOLO los eventos que de
  verdad cambiaron — cliente (por `cliente_id`), artículos agregados/quitados (por `producto_id`, no
  por posición en el arreglo), precio modificado y cantidad modificada (por línea que sobrevive en
  ambos estados). Si no cambió nada, devuelve `[]` (no se loguea "edición" vacía). `_cotEditSnapshot`
  (variable de módulo nueva, junto a `_cotEdit`) se toma con `JSON.parse(JSON.stringify(...))` en
  `nxCotEditar()` — copia profunda real, no una referencia que se mutaría junto con `_cotEdit` al
  editar en pantalla. En `nxCotNueva()` se limpia a `null` (una cotización nueva no tiene snapshot
  contra qué comparar). `nxCotGuardar()`: en el camino de EDICIÓN (`cotId` ya existía, no en el de
  crear) llama `diffCotizacion(_cotEditSnapshot, _cotEdit)` tras el `PATCH` exitoso y loguea cada
  evento detectado contra el documento real (`buscarDocumentoDe('pos_cotizaciones', cotId)`).
- **Propagación de "Facturado" a TODA la cadena, no solo el eslabón inmediato:** antes (Fase 1) solo se
  sabía que una factura vino de tal prefactura/cotización viendo la cadena hacia ABAJO desde la
  cotización. Ahora, en `nxPosConfirmar`, justo después de registrar el documento de la factura, se
  camina hacia ARRIBA por `documento_padre_id` (mismo patrón guard-con-tope-10 que ya usaba
  `nxDocCadena` para el ascenso) y se loguea un evento `'facturado'` en CADA ancestro — así la
  cotización original también muestra "Facturado" en su propia línea de tiempo aunque haya pasado por
  una prefactura en el medio, sin necesidad de "adivinar" la cadena completa después.
- **`window.nxDocCadena` ampliado (mismo modal de la Fase 1, no uno nuevo):** (1) cada nodo de la
  cadena/hijos ahora es CLICABLE (menos el nodo actual) — tocarlo reabre la misma ventana anclada en
  ESE documento, para "caminar" toda la cadena sin cerrar y reabrir manualmente
  (`tabindex/role="button"/onkeydown` para que también funcione por teclado); (2) sección nueva
  **"Línea de tiempo"** debajo de la cadena: trae `pos_documento_eventos` del documento ANCLADO
  (`documento_id=eq.<id del doc que se abrió>`, ordenado por `created_at.asc`) y la pinta con el mismo
  lenguaje visual de flechas `↓` que ya usaba la cadena arriba — hora `HH:MM` en negrita, nombre del
  evento (`EVENTO_NOMBRE`, mapa nuevo de claves→español), y el detalle real debajo si lo hay. Si el
  documento no tiene ningún evento (caso límite, no debería pasar en la práctica ya que `creado` es
  automático), muestra "Sin eventos registrados todavía." en vez de una sección vacía o rota.
- **Cada documento solo muestra SU PROPIO historial** (a propósito, no el de sus documentos
  relacionados) — la factura no "hereda" los eventos de la cotización que le dio origen; para ver el
  historial de la cotización hay que tocar su nodo en la cadena y saltar ahí. Mantiene cada línea de
  tiempo honesta: solo cuenta lo que le pasó a ESE documento en particular.
- **Verificado con el código real** (no una reconstrucción): se extrajeron `diffCotizacion`,
  `registrarDocumento`/`registrarEventoDoc`/`buscarDocumentoDe`, `nxDocCadena` y el bloque exacto de
  propagación de `nxPosConfirmar` tal cual del archivo, y se simuló: (1) `diffCotizacion` con los 4
  tipos de cambio del ejemplo del dueño (cliente/agregar/quitar/precio) más 2 casos límite (sin
  cambios reales → `[]`; solo cambia cantidad → detecta SOLO ese evento, no falsos positivos) — los 7
  casos correctos; (2) una cotización editada DOS veces de verdad (cambia cliente, luego agrega
  artículo y cambia precio) que se convierte en prefactura y se factura — la línea de tiempo de la
  cotización mostró los 6 eventos en el ORDEN correcto con horas reales (Creado → Cliente cambiado →
  Artículo agregado → Precio modificado → Cargado para facturar → Facturado), la prefactura mostró su
  propio historial con el detalle correcto ("Facturada como B0200005678"), la factura mostró SOLO su
  propio "Creado" (sin heredar nada de sus documentos padre), un nodo de la cadena resultó clicable
  hacia el documento correcto y el nodo actual no se autoenlaza, y un documento sin eventos mostró el
  aviso honesto en vez de romperse. `node --check parches.js` limpio; los 3 `<script>` de `index.html`
  pasan `new Function()`; `version.json` válido.
- **Pendiente:** el resto del Plan Maestro (Fases 3-10) — llegará por partes, mismo criterio de esta
  sesión: confirmar el alcance real con el dueño antes de programar, no inventar funciones para
  "completar" un ejemplo si el sistema no tiene un dato real detrás.

### POS · MOTOR DE DOCUMENTOS, FASE 3 — Cliente 360° (21-jul-2026, v48.69)
El dueño pidió que al abrir un cliente se vea TODO en una sola pantalla: Datos generales, Facturas,
Cotizaciones, Garantías, Recepciones, Créditos, Pagos, Equipos, IMEI, Historial.
- **No se tocó `nxPosCliVer`** (el modal existente, enfocado en fiado/cobranza — se sigue usando igual
  en los flujos de cobro) — se construyó **`window.nxCliente360(id)`** como función NUEVA y aparte,
  siguiendo el criterio de toda la sesión (aditivo, nunca reemplazar algo que ya funciona). Entrada
  doble: botón nuevo (🪪 `ti-id-badge-2`) junto a "Ver cuenta" en la fila de la lista de Clientes, y
  botón **"Ver 360°"** en el footer del propio `nxPosCliVer` (para quien ya está ahí y quiere ver más).
- **Investigación de esquema ANTES de programar (con SQL real, no supuestos):** se confirmó columna por
  columna qué tablas de verdad tienen `cliente_id` como FK real (`pos_ventas`, `pos_cotizaciones`,
  `pos_abonos`, `pos_documentos`, `pos_financiamientos`) y cuál NO — **`pos_reparaciones` no tiene
  `cliente_id`**, solo `cliente_nombre`/`cliente_telefono` de texto libre (se escriben a mano al recibir
  el equipo, sin selector de cliente). En vez de fingir un enlace exacto que la base no tiene, las
  Recepciones se emparejan por **teléfono normalizado** (últimos 10 dígitos) contra `_reps` (ya cargado
  en memoria por `cargarPOS`) — aproximado mas no inventado, y se documenta la limitación en el propio
  changelog. `pos_seriales`/`pos_venta_items.serial` sí están bien enlazados (vía `venta_id`→
  `pos_ventas.cliente_id`), así que Equipos/IMEI son exactos, no aproximados.
- **Qué junta cada sección (todo lectura, cero tablas nuevas, cero cambios de esquema):**
  Datos generales (`c` ya en memoria); Facturas = **TODAS** las de `pos_ventas` del cliente (no solo
  las fiadas, a diferencia de `nxPosCliVer`) con badge ANULADA/FIADO/PAGADA; Cotizaciones de
  `pos_cotizaciones`; **Garantías** = unión de `pos_venta_items.garantia_hasta` (producto vendido) +
  `pos_reparaciones.garantia_hasta` (reparación entregada, reusa `garantiaInfo()` de v48.64) — un
  mismo concepto real desde 2 fuentes distintas, con badge VIGENTE/VENCIDA calculado en vivo contra
  `hoyISOPos()`; Recepciones = `_reps` filtrado (badge de estado reusa `repEst()`/`REP_ESTADOS`
  existentes); **Créditos** = mismo cálculo de `nxPosCliVer` (fiado pendiente + cuotas pendientes +
  exposición total); **Pagos** = fusión real de `pos_abonos` (cobros de fiado) + `pos_fin_pagos` (pagos
  de cuota), ordenados por fecha — antes vivían en 2 pantallas separadas, sin un solo lugar para verlos
  juntos; **Equipos** = `pos_venta_items` con `serial` + reparaciones con `equipo`/`imei`, cada uno con
  badge de origen (Comprado / Recepción); **IMEI** = los mismos seriales de arriba, deduplicados
  (`Set`) y mostrados como chips sueltos para copiar rápido; **Historial** = línea de tiempo de
  **TODOS** los `pos_documentos` del cliente (cotización+prefactura+factura+garantía, Motor de
  Documentos Fases 1-2), reusando el mismo lenguaje visual de flechas `↓` de `nxDocCadena` — cada fila
  es clicable y abre `nxDocCadena(tabla_origen, registro_id)` directo, conectando la Fase 3 con la
  infraestructura de las 2 fases anteriores en vez de duplicar lógica.
- **Verificado con Playwright, código real extraído del archivo** (no una reconstrucción): se armó un
  harness con un cliente de prueba con datos en TODAS las tablas (3 facturas —pagada/fiada/anulada—, 2
  cotizaciones, 2 garantías —una vigente futura, una vencida—, 2 recepciones —una empareja por
  teléfono, la otra no—, 1 plan de cuotas con pagos mixtos, 3 pagos fusionados, 2 equipos con el mismo
  IMEI deduplicado a 1, y 3 documentos con cadena real) cargado en un navegador real: las 10 secciones
  muestran los conteos y montos correctos, los badges de estado calculan bien (incluida la fecha real
  del sistema para vigente/vencida), tocar una fila de Historial dispara `nxDocCadena` con la tabla/id
  correctos, tocar un botón de Ticket dispara `nxPosTicketVenta`, sin errores de JS y sin desbordes
  horizontales en 390px ni 800px (`scrollWidth === clientWidth` exacto en ambos). `node --check
  parches.js` limpio; los 3 `<script>` de `index.html` pasan `new Function()`; `version.json` válido.
- **Pendiente:** si el dueño lo pide, agregar `pos_reparaciones.cliente_id` como columna real (aditiva,
  nullable) para que las recepciones nuevas queden enlazadas de forma exacta en vez de por teléfono —
  no se hizo en esta fase porque no fue lo pedido explícitamente y el emparejamiento por teléfono ya
  resuelve el caso real sin tocar esquema.

### POS · MOTOR DE DOCUMENTOS, FASE 5 — Kardex Inteligente (21-jul-2026, v48.70)
El dueño pidió: "No modificar inventario directamente. Todo movimiento deberá provenir de: Compra,
Venta, Ajuste, Transferencia, Garantía, Taller, Producción. Con historial completo." Antes de tocar
código se auditó (agente de exploración, línea por línea) TODO el archivo buscando cada sitio que
cambia `pos_productos.stock`/`pos_stock_almacen.stock` — encontró 9 sitios reales que YA pasaban por
`logMov()` (venta, anulación, devolución, compra, reversa de compra, 2 ramas de ajuste manual, entrada
y salida de transferencia) y, más importante, **3 huecos reales** donde el stock se pisaba en silencio
sin ningún registro en el kardex.
- **Los 2 funnels nuevos (único camino permitido en todo el archivo para tocar stock):**
  `moverStock(prod, tipo, delta, opts)` — mueve el TOTAL de un producto (y, si se pasa `almacenId`,
  ese almacén por el mismo delta); valida `tipo` contra `MOV_TIPOS_VALIDOS` (rechaza con `null` si no
  es uno de los válidos, sin tocar nada), calcula `stock_anterior`/`stock_nuevo`, hace el `PATCH`,
  llama a `logMov()` y sincroniza el almacén — todo en un solo lugar. `moverStockTransferencia(prod,
  cantidad, aidOrigen, aidDestino, ...)` — mueve SOLO el stock por-almacén (el total nunca cambia en
  una transferencia interna, es el mismo inventario cambiando de sitio). `MOV_TIPOS_VALIDOS` tiene 10
  valores: los 7 que pidió el dueño (`compra`/`venta`/`ajuste`/`transferencia`/`garantia`/`taller`/
  `produccion`) + 3 subtipos reales que YA existían en producción y siguen siendo eventos genuinos
  (`devolucion`/`anulacion`/`apertura` — este último reservado desde hace tiempo en `MOV_LBL` pero
  nunca usado hasta ahora). `garantia`/`taller`/`produccion` quedan válidos en el enum pero SIN ningún
  flujo real que los dispare todavía — confirmado con la auditoría que Reparaciones (Taller) no
  consume piezas de `pos_productos` hoy (solo tiene un campo de costo manual, `costo_piezas`, sin
  ligar a productos), y que "Producción" solo existe en AGUAPRO (`agua_productos`, una tabla
  completamente distinta) — no se inventó un flujo falso solo para tener dónde usar el tipo, mismo
  criterio de "no fingir" del resto del sistema.
- **Los 9 sitios reales migrados, mismo resultado numérico de antes** (refactor puro, verificado con
  pruebas que reproducen cada fórmula exacta): `nxPosConfirmar` (venta, sin piso en 0 — igual que
  antes, el inventario estricto ya impide vender sin stock), `nxPosAnularVenta` (anulación),
  `nxDevGuardar` (devolución), `nxPosGuardarCompra` (compra, con el costo del producto actualizado en
  el MISMO `PATCH` vía `opts.extra`), `nxPosDelCompra` (reversa de compra, con piso en 0 — igual que
  antes), `nxInvGuardarAjuste` (las 2 ramas: con almacén y sin almacén), `nxAlmGuardarTransfer` (ahora
  una sola llamada a `moverStockTransferencia` por línea, en vez de 6 líneas duplicadas de
  `upsertStockAlm`+`logMov`×2).
- **Los 3 huecos reales, cerrados:**
  1. **`nxPosGuardarProd`/`nxPfGuardarYNuevo`** (formulario Nuevo/Editar producto): el campo Stock del
     formulario (`#ppStk`) se mandaba SIEMPRE dentro del mismo `PATCH` que el resto de los campos —
     editar el nombre o el precio de un producto pisaba su stock en silencio, sin ningún rastro en el
     kardex. Se factorizó un helper común nuevo `nxPfGuardarProdComun(id)` (ambas funciones lo llaman,
     eliminando además la duplicación exacta que ya tenían) que separa el `stock` del resto del
     `PATCH` y, SOLO si de verdad cambió, lo aplica con `moverStock('ajuste')` — si el usuario no tocó
     el campo, no se genera ningún movimiento (verificado con prueba específica: cero ruido en el
     kardex cuando el stock no cambia). Al crear un producto nuevo con stock inicial, ese stock ahora
     entra como `'apertura'`, no como un valor mudo en el INSERT.
  2. **`nxPosImportarPreciosRun`** (actualización masiva de precios/stock por CSV): la columna Stock
     del CSV se aplicaba con `PATCH` directo en lotes de 15, sin ningún `logMov`. Ahora, por cada fila
     con columna de stock, se separa del resto del `patch` (precio/costo siguen en el `PATCH` normal)
     y el cambio de stock —si de verdad cambia— pasa por `moverStock('ajuste', ..., {referencia:
     'Importación CSV'})`. Los productos NUEVOS que trae el mismo CSV con stock inicial se crean en 0
     y ese stock entra como `'apertura'`.
  3. **Altas nuevas por CSV/Infoplus con stock inicial** (`nxPosImportarPreciosRun` rama de nuevos,
     `nxPosImportarRun` del importador Infoplus): antes el stock inicial se horneaba directo en el
     `INSERT`, sin generar el primer registro del kardex de ese producto. Ahora se crean en 0 y, tras
     el `INSERT` (se usa la respuesta real de Supabase para tener el `id`/fila real de cada producto
     creado, zip por índice — mismo patrón ya usado en el Motor de Documentos Fase 1 con
     `pos_venta_items`), cada uno con stock inicial > 0 recibe su movimiento `'apertura'`.
- **CHECK constraint aditivo en `pos_inv_movimientos.tipo`** (migración
  `pos_inv_movimientos_tipo_check`): restringe la columna a los 10 valores reales de
  `MOV_TIPOS_VALIDOS` — verificado ANTES de aplicarlo que los datos ya existentes (`venta`,
  `transferencia`, `compra`) caben sin conflicto. Es el candado real a nivel de base: de aquí en
  adelante, ningún movimiento con un `tipo` inventado o mal escrito puede llegar a la tabla, se
  rechaza en el `INSERT`. `get_advisors(security)` sin hallazgos nuevos.
- **Por qué NO se agregó un trigger que bloquee el `PATCH` directo a `pos_productos.stock`:** se
  consideró y se descartó — un trigger a nivel de base que impida cualquier escritura de `stock` fuera
  de un camino "marcado" es mucho más invasivo (arriesga romper algo que hoy funciona bien, sin forma
  simple y segura de que el trigger sepa "esta escritura vino de moverStock" dentro de una API REST
  sin sesión de transacción compartida) que el valor que aporta, dado que el código YA queda 100%
  centralizado del lado de la aplicación — el archivo entero fue auditado y confirmado sin ningún
  `PATCH`/`POST` a `pos_productos` con `stock` fuera de `moverStock` (verificado con grep final tras
  el refactor). El candado real y de bajo riesgo quedó del lado del `tipo` (CHECK constraint).
- **Verificado con pruebas** (no una reconstrucción — `moverStock`/`moverStockTransferencia`/`logMov`/
  `upsertStockAlm`/`stockEnAlm` extraídos tal cual del archivo): 10 escenarios que reproducen cada
  fórmula exacta de los 9 sitios migrados y los 3 huecos cerrados — venta con piso desactivado
  (permite negativo, igual que antes), ajuste con piso en 0 (nunca baja de cero, igual que antes),
  compra con costo en el mismo `PATCH`, tipo inválido rechazado sin tocar nada, los 10 tipos válidos
  confirmados uno por uno, transferencia que NO toca el total del producto (invariante suma-de-
  almacenes = total verificada), ajuste por almacén, alta con `'apertura'` (kardex que antes no
  existía), y edición de producto sin cambio real de stock que no genera ningún movimiento — los 10
  pasan. `node --check parches.js` limpio; los 3 `<script>` de `index.html` pasan `new Function()`;
  `version.json` válido.
- **Pendiente:** cuando exista un flujo real de consumo de piezas en Reparaciones (Taller) o algún
  módulo de producción/ensamblaje dentro del POS, ya tienen su tipo de movimiento listo en el enum —
  solo hace falta la UI que llame a `moverStock(prod, 'taller'/'produccion', delta, opts)`, mismo
  patrón que los demás.

### POS · MOTOR DE DOCUMENTOS, FASE 4 — Artículo 360° (21-jul-2026, v48.71)
El dueño mandó la Fase 4 del plan (fuera de orden — llegó después de la Fase 5/Kardex, no antes):
"Cada artículo tendrá: Existencia, Costo, Precio, Utilidad, Proveedores, Compras, Ventas, Garantías,
Taller, IMEI, Kardex." Mismo patrón exacto que Cliente 360° (Fase 3): una función nueva de solo
lectura, `window.nxArticulo360(id)`, que junta en una sola pantalla lo que ya vive repartido —
**sin inventar ningún dato**, reusando toda la infraestructura ya construida en fases anteriores.
- **Investigación previa (agente de exploración) antes de programar:** confirmó que el formulario
  `abrirProd` (10 pestañas de NEXUS PRO 2.5, Fases 1-2) ya tenía piezas parciales de esto —
  `nxPfUltimoCosto` (solo la ÚLTIMA compra, no el historial), `nxPfHistorialCargar` (kardex por
  producto, ya listo para reusar tal cual), `_prodNiveles`/`_niveles` (niveles de precio, ya
  cargados en memoria, sin necesitar query nueva), y la pestaña Sucursales (`stockEnAlm`). Ninguna
  de esas piezas junta todo en una vista de solo-lectura — `abrirProd` es un formulario de EDICIÓN,
  no un dashboard 360°, así que se construyó una función nueva y separada en vez de seguir
  expandiendo el formulario.
- **Las 11 secciones, cada una con su fuente real:**
  - **Existencia:** `p.stock` total + desglose por almacén (`stockEnAlm`) si hay más de uno.
  - **Costo:** `p.costo` actual + historial COMPLETO de compras (mismo join `pos_compra_items`↔
    `pos_compras` que ya usaba `nxPfUltimoCosto`, pero mostrando la lista entera, no solo la más
    reciente).
  - **Precio:** lista/mayor/mínimo + cada nivel de precio configurado (`_prodNiveles` filtrado por
    `producto_id`, unido a `_niveles` por `nivel_id` — ambos arrays ya en memoria, cero queries
    nuevas).
  - **Utilidad:** margen unitario (`(precio-costo)/precio`, misma fórmula que `nxPfMargenCalc`) +
    una utilidad ESTIMADA de las ventas — con un aviso honesto explícito: `pos_venta_items` no
    guarda el costo que tenía el producto el día que se vendió cada unidad (confirmado por el propio
    comentario del código en `nxPosConfirmar`: *"Como pos_venta_items NO guarda costo, se lee de
    pos_productos.costo"*), así que la utilidad de ventas mostrada usa el costo de HOY, no el
    histórico — no se finge una precisión que los datos no tienen.
  - **Proveedores:** TODOS los que de verdad aparecen en el historial de compras de ese artículo
    (derivado de la misma consulta de Compras, sin query aparte), no solo el campo "proveedor
    preferido" — el preferido se marca con una insignia si coincide.
  - **Compras / Ventas:** listas completas (hasta 100 líneas cada una), uniendo
    `pos_compra_items`↔`pos_compras` y `pos_venta_items`↔`pos_ventas` con el mismo patrón de mapas
    en memoria (`cmap`/`vmap`) ya usado en Cliente 360° y en `nxPfUltimoCosto`.
  - **Garantías:** de las unidades YA vendidas de este artículo (`pos_venta_items.garantia_hasta`),
    vigente/vencida calculado en vivo contra `hoyISOPos()` — mismo criterio que Cliente 360°.
  - **Taller — APROXIMADO, con aviso explícito:** se confirmó con el agente de exploración que
    `pos_reparaciones` NO tiene `producto_id` (ni ahí ni en ningún otro lugar del archivo hay cruce
    con el catálogo) — solo el campo de texto libre `equipo`. Se empareja por coincidencia del
    nombre normalizado (`equipo` contiene el nombre del producto, o viceversa) contra `_reps` (ya en
    memoria) — mismo criterio honesto que el emparejamiento por teléfono de Recepciones en Cliente
    360°, con su propio aviso visible en la sección.
  - **IMEI:** `pos_seriales` filtrado por `producto_id` (FK real, exacto — a diferencia de Taller),
    con estado disponible/vendido y, si está vendido, el cliente (cruzado con el mapa de Ventas ya
    cargado).
  - **Kardex:** `pos_inv_movimientos` filtrado por `producto_id` — el MISMO dato real que ya
    alimenta la pestaña "Historial" de `abrirProd` desde la Fase 5 (Kardex Inteligente), aquí
    presentado como línea de tiempo (mismo lenguaje visual `↓` de las Fases 1-2 del Motor de
    Documentos) en vez de tabla.
- **Entrada:** botón nuevo (🪪 `ti-id-badge-2`, título "Ver 360°") en la fila de cada producto en
  Inventario (`renderProductos`), junto a los botones de IMEI/Editar/Borrar que ya existían — mismo
  patrón visual local de esa fila (`btn bsm bghost`, sin migrar toda la pantalla a `.nxPf`, fuera de
  alcance de esta fase).
- **Verificado con Playwright, código real extraído del archivo** (no una reconstrucción): harness
  con un producto de prueba completo (2 compras, 2 ventas —una anulada—, 2 niveles de precio, 2
  seriales —uno vendido, uno disponible—, garantías vigente y vencida, una reparación que coincide
  por nombre y otra que no, 4 movimientos de kardex de 4 tipos distintos) cargado en un navegador
  real: las 11 secciones muestran los conteos/montos correctos, el emparejamiento aproximado de
  Taller solo trae la reparación que de verdad coincide por nombre, sin errores de JS y sin
  desbordes horizontales en 390px ni 800px (`scrollWidth === clientWidth` exacto en ambos). `node
  --check parches.js` limpio; los 3 `<script>` de `index.html` pasan `new Function()`; `version.json`
  válido.
- **Con esta pieza el "Plan Maestro NEXUS PRO POS 3.0" tiene sus 5 fases pedidas hasta ahora
  completas** (Motor de Documentos Fases 1-2, Cliente 360° Fase 3, Kardex Inteligente Fase 5,
  Artículo 360° Fase 4) — quedan las fases 6-10 si el dueño las manda.

### POS · MOTOR DE DOCUMENTOS, FASE 6 — Buscador Universal (21-jul-2026, v48.72)
El dueño pidió una sola búsqueda que encuentre Cliente/IMEI/Factura/Serie/Artículo/Recepción/Garantía/
Proveedor/Orden **sin importar el módulo** en el que esté parado. Investigado antes de programar (agente
de exploración, la más grande de la sesión): (1) Seguros ya tiene un buscador global propio
(`gsOverlay`/`abrirGlobalSearch`, Ctrl+K) pero es 100% en memoria y vive solo en el núcleo de Seguros —
no sirve de motor para el POS, que tiene datos distintos y volúmenes distintos; (2) de las 8 categorías
pedidas, `cargarPOS()` ya deja **4 en memoria de forma garantizada** (`_clientes`, `_prods`,
`_proveedores`, `_reps` — confirmado revisando sus 23 consultas de precarga) pero **las otras 4 NO**
(`_ventas`/`_compras` solo cargan cuando se abre su pestaña; `pos_documentos` —el Motor de Documentos de
las Fases 1-2— nunca se precarga en bloque en ningún lado) — esto decidió la arquitectura: memoria =
instantáneo sin debounce, remoto = con debounce; (3) `.nxTTop` (la barra superior del POS) es
`display:none` en escritorio y solo se activa dentro de `@media(max-width:860px)` — por eso hacen falta
**2 botones de entrada**, uno en la barra lateral (siempre visible en escritorio) y otro en la barra
superior móvil, ninguno de los dos solo alcanza todos los tamaños de pantalla; (4) ya existían funciones
reales para "abrir el registro completo" de la mayoría de estas categorías — se reusaron TODAS en vez de
construir vistas nuevas.
- **Overlay único `#nxUnivS`/`.nxUnivBox`**, mismo lenguaje visual `.nxPf` del resto del rediseño del
  POS. `UNIV_CAT_LBL`/`UNIV_CAT_ORDEN` (8 categorías, orden fijo de despliegue). `univNorm(s)` (minúsculas
  + sin acentos, para comparar en memoria) y `univIlike(q)` (sanea `% _ , * ( )` antes de mandar el
  término a un filtro PostgREST `ilike`, seguido de `encodeURIComponent` — cumple el propio "REGLAMENTO
  TÉCNICO — ModalBusquedaBase" de este archivo sobre no interpolar texto de usuario crudo en `or=(...)`).
  **En memoria, instantáneo, sin debounce:** Clientes, Artículos, Proveedores, Recepciones (`.filter()`
  directo sobre los arreglos que `cargarPOS()` ya garantiza cargados, capado a 5 por categoría).
  **Remoto, debounce 300ms + contador `token` contra respuestas viejas** (mismo patrón defensivo que
  `ModalBusquedaBase`, no el de `gsOverlay` que no tiene ninguno): Facturas (`pos_ventas`, por número/NCF/
  cliente), Garantías (`pos_documentos` tipo='garantia', por código), Proveedores… ya en memoria, IMEI/
  Serie (`pos_seriales.serial`), Órdenes (`pos_compras.orden_no`) — capado `limit=6` cada una.
- **2 categorías pedidas por separado se unieron a propósito, con aviso honesto:** "IMEI" y "Serie" son
  literalmente la MISMA columna (`pos_seriales.serial`) — se muestran juntas como **"IMEI / Serie"** en
  vez de fingir 2 fuentes de datos distintas que no existen.
- **"Orden" se interpretó como `pos_compras.orden_no`** (columna real confirmada por SQL directo) — es
  una decisión de criterio (podría haberse leído distinto), documentada aquí y en el changelog.
- **Saltar al registro completo reusa funciones YA EXISTENTES, cero vistas nuevas duplicadas:**
  Cliente→`nxCliente360` (Fase 3), Artículo→`nxArticulo360` (Fase 4), Proveedor→`nxPosProvVer`,
  Recepción→`nxRepVer`, Factura→si la fila remota no está todavía en `_ventas` se le hace `unshift` antes
  de llamar a `nxPosTicket` (mismo patrón "puente en memoria" que Fase 6 de Cliente 360°), IMEI→salta
  directo al `nxArticulo360` del producto dueño del serial (que ya tiene su propia sección IMEI),
  Garantía→`nxDocCadena('pos_venta_items', registro_id)` (reusa DIRECTO el visor de cadena del Motor de
  Documentos, Fases 1-2), Orden→se hace `unshift` en `_compras` si hace falta y se llama a
  `nxPosCompraVer`.
- **Entrada:** botón **"Buscar todo"** en `.nxTBrand` (barra lateral, con chip `Ctrl K`) + ícono de lupa
  nuevo en `.nxTTop` (fila superior móvil) — los 2 llaman a `window.nxBuscadorUniversal()`. Atajo global
  `Ctrl+K`/`Cmd+K` con guardia `window.__nxUnivKeys` (mismo patrón que el guard de `F2`/`F10` del
  buscador de Factura) + comprobación `document.getElementById('v-pos')` para que sea un no-op fuera del
  POS y no choque con el Ctrl+K propio de `gsOverlay` en Seguros.
- **Bug real encontrado y corregido ANTES de publicar:** al escribir `univNorm` por primera vez, el
  regex de rango unicode `\u0300-\u036f` (quita acentos para comparar) se corrompio en caracteres crudos
  dentro del archivo (confirmado con `cat -A`, bytes ilegibles) — pasaba `node --check` (sintaxis válida)
  pero habría dejado la búsqueda sin acentos rota en silencio. Detectado por auto-revisión (no por un
  test fallido) al hacer `grep` de la función recién escrita; corregido con un script Python
  (`re.sub` con función de reemplazo, para evitar que Python interprete `\u` en el string de reemplazo) y
  reverificado.
- **Verificado con Playwright, código real extraído del archivo** (no una reconstrucción): harness con
  datos simulados en las 8 categorías, 16 comprobaciones — Ctrl+K abre, menos de 2 letras muestra ayuda
  sin buscar, resultado en memoria aparece ANTES del debounce (cliente), resultado remoto aparece
  DESPUÉS del debounce (factura) y ambos quedan agrupados por categoría, un artículo se encuentra por
  nombre y (a propósito) NO trae resultados de IMEI para ese mismo término (confirma que IMEI solo
  empareja por el valor real del serial, no por el nombre del producto dueño), el IMEI exacto sí se
  encuentra, Garantía/Orden/Proveedor/Recepción se encuentran cada uno en su categoría, flechas ↓
  seleccionan la primera fila y Enter dispara su acción y cierra, un clic directo en un resultado de IMEI
  salta a `nxArticulo360` del producto correcto, Escape cierra. Las 16 pasaron; captura de pantalla a
  390px sin desbordes ni errores de consola. `node --check parches.js` limpio; los 3 `<script>` de
  `index.html` pasan `new Function()`; `version.json` válido.
- **Con esta pieza el "Plan Maestro NEXUS PRO POS 3.0" tiene sus 6 fases pedidas hasta ahora
  completas** (Motor de Documentos Fases 1-2, Cliente 360° Fase 3, Artículo 360° Fase 4, Kardex
  Inteligente Fase 5, Buscador Universal Fase 6) — quedan las fases 7-10 si el dueño las manda.

### POS · MOTOR DE DOCUMENTOS, FASE 7 — Dashboard Operativo (21-jul-2026, v48.73)
El dueño pidió indicadores en tiempo real: Ventas hoy, Caja, Utilidad, Equipos pendientes, Garantías,
Inventario crítico, Compras pendientes, Clientes esperando. Investigado antes de programar (agente de
exploración): la pantalla "Inicio" del POS (`renderInicio()`) YA es, de hecho, el dashboard operativo del
sistema — el propio código trae comentarios explícitos "KPIs del POS: ahora para TODOS (tienda y admin)" y
"Últimas ventas: ahora para TODOS", confirmando que hace tiempo dejó de ser solo un lanzador de apps. Por
eso la Fase 7 se construyó como una AMPLIACIÓN de esa pantalla existente (5 tiles → 8, la lista exacta del
dueño) en vez de una pantalla nueva paralela — evita el riesgo real de tener dos "Ventas de hoy" en dos
pantallas distintas que algún día muestren números distintos.
- **Mapeo de cada indicador a datos reales (nunca inventados), con el trabajo de investigación primero:**
  - **Ventas hoy / Caja** — ya existían (`_dashKPI.ventasHoy`/`cajaEf`, vía `cargarDashKPI()` y
    `totalesCaja()`, ya usaba la fórmula real `monto_inicial + efectivo_ventas + efectivo_abonos +
    entradas − salidas`). Sin cambios en su fórmula, solo se conservan.
  - **Utilidad** — NUEVA: misma fórmula exacta que ya usa Reportes (`importe_sin_ITBIS − costo_producto`
    por línea, sumado), acotada a las ventas de HOY. `cargarDashKPI()` ahora trae también
    `pos_venta_items` de las ventas de hoy (por `venta_id=in.(...)`) y reusa `prodCosto()` (ya existente,
    lee `_prods.costo` en memoria) — no se reinventa la fórmula, se llama la misma lógica con un rango
    de fechas más chico.
  - **Equipos pendientes** — NUEVA pero SIN consulta nueva: `_reps.filter(r => r.estado!=='entregado' &&
    r.estado!=='cancelado').length` — el mismo filtro que ya usa `renderReparaciones()` para su vista
    "activas", `_reps` ya viene precargado por `cargarPOS()`.
  - **Garantías** — NUEVA: une las dos mismas fuentes que ya usan Cliente 360°/Artículo 360°
    (`pos_venta_items.garantia_hasta` + `_reps.garantia_hasta`) pero a nivel de TODO el sistema, contando
    solo las vigentes (`>= hoyISOPos()`, mismo criterio que `garantiaInfo()`). Requiere una consulta
    nueva y ligera (`pos_venta_items?garantia_hasta=not.is.null`, columnas mínimas) porque no existe
    ningún arreglo global con esto ya en memoria.
  - **Inventario crítico** — NUEVA pero SIN consulta nueva: mismo filtro que ya usa el Centro de Avisos
    (`stock_min>0 && stock<=stock_min`, excluyendo servicios) sobre `_prods` ya en memoria.
  - **Compras pendientes** — NUEVA: misma fórmula que `saldoProv()` (cuenta por pagar = créditos de
    compra − pagos a proveedor) pero AGREGADA sobre todos los proveedores en vez de uno solo — consulta
    ligera nueva (`pos_compras?a_credito=eq.true` + `pos_compra_pagos`, sin traer el detalle completo que
    sí carga `cargarComprasTab()` para la pestaña Compras).
  - **Clientes esperando** — decisión de criterio explícita (mismo tipo de llamada que "Orden" en la
    Fase 6, documentada aquí y en el changelog): se interpretó como **prefacturas sin facturar todavía**
    (`_prefs`, ya precargado por `cargarPOS()` filtrado por `estado=eq.abierta`) — un carrito ya armado
    con el cliente esperando a que se complete su compra es la señal más real y ya existente en el
    sistema de "alguien está esperando". Cero consulta nueva, dato ya en memoria.
- **Refresco automático ("tiempo real"):** antes `renderInicio()` solo se recalculaba al abrir el POS o
  al navegar manualmente a "Inicio" — si el usuario se quedaba parado ahí, los números NO se
  actualizaban solos. `iniciarRefrescoDashboard()` (nueva, con guardia `__nxDashRefreshOn` contra
  duplicados, mismo patrón `setInterval`+`document.hidden` ya usado en otras partes del sistema, ver
  líneas 3909-3913/6664-6668/8334-8338) arranca un ciclo de 30s que solo actúa si el usuario sigue en
  "Inicio" y la pestaña del navegador está visible — vuelve a llamar `cargarDashKPI()` y repinta. Se
  invoca desde dentro de `renderInicio()` (arranca solo la primera vez que se pinta esa pantalla, la
  guardia evita que cada repintado cree un intervalo nuevo).
- **Asimetría deliberada y documentada:** el ciclo de 30s solo vuelve a pedir a la base los 5 indicadores
  que dependen de una consulta (Ventas hoy, Caja, Utilidad, Garantías, Compras pendientes) — Equipos
  pendientes, Inventario crítico y Clientes esperando se recalculan del MISMO tick pero desde los
  arreglos que ya están en memoria (`_reps`/`_prods`/`_prefs`), sin volver a pedirlos a la base cada 30s
  (evita cargar la red de más solo porque el usuario está mirando el tablero quieto). Si el dueño visita
  Reparaciones/Inventario/Prefacturas en otra pestaña del POS mientras tanto, esos 3 números se
  actualizan solos en el próximo tick porque ya están viendo los arreglos frescos.
- Verificado con Playwright + Node, código real extraído del archivo (no una reconstrucción): 18
  comprobaciones — las 5 fórmulas de `cargarDashKPI()` contra datos simulados (ventas de hoy excluyendo
  una anulada, caja con monto inicial+efectivo+abono+entrada−salida, utilidad con ITBIS y sin, garantías
  vigentes vs. vencidas de ambas fuentes, compras pendientes con un proveedor sin crédito que no debe
  contar), los 8 tiles aparecen en el HTML con sus valores correctos, la tendencia "vs ayer" calcula bien
  el porcentaje, y la guardia del refresco automático confirma que repintar la pantalla varias veces NO
  crea intervalos duplicados. Captura de pantalla a 390px con el CSS real (`.nxTKpis` con
  `auto-fit,minmax(150px,1fr)`, sin cambios) confirmando 2 columnas parejas sin desbordes — el grid ya
  era responsive de antes, solo pasó de acomodar 5 tiles a 8. `node --check parches.js` limpio; los 3
  `<script>` de `index.html` pasan `new Function()`; `version.json` válido.
- **Pendiente:** las fases 8-10 del Plan Maestro si el dueño las manda.

### POS · MOTOR DE DOCUMENTOS, FASE 8 — Auditoría Completa (21-jul-2026, v48.74)
El dueño pidió que cada registro de auditoría capture, sin excepciones: Usuario, Fecha, Hora, IP,
Sucursal, Dispositivo, Acción. Investigado antes de programar (agente de exploración + consultas SQL
directas a la base real): `logAudit(accion,detalle,modulo,clienteId)` (`index.html`, reusada tal cual por
TODO `parches.js` vía `window.logAudit`, sin ninguna copia propia) ya manda `usuario`/`rol`/`accion`/
`detalle`/`modulo`/`cliente_id` — pero la tabla `auditoria` **YA TENÍA** columnas `ip` y `device` desde
hace tiempo (texto, nullable) que **NUNCA se habían llenado**: consulta real contra los 2,268 registros
existentes → `con_ip:0, con_device:0`. No era un campo que faltara programar desde cero — era un campo
fantasma, exactamente la misma clase de bug que el "ORIGEN" que la pantalla de Auditoría ya mostraba
(`a.origen||'web'`) sin que `logAudit` lo hubiera escrito jamás (dead code puro).
- **Decisión de arquitectura clave — IP capturada del lado del SERVIDOR, no por el navegador:** el
  navegador no tiene forma confiable de saber su propia IP pública (necesitaría llamar a un servicio
  externo, lento y con fallos), y si se le pidiera que la reportara él mismo, un usuario podría falsearla
  desde la consola del navegador antes de que el registro llegue a la base — un dato de auditoría que se
  puede mentir a sí mismo no sirve para "sin excepciones". Se investigó (documentación oficial de
  Supabase vía `search_docs`) que PostgREST expone los headers reales de cada petición a Postgres a
  través de `current_setting('request.headers', true)::json`, incluido `x-forwarded-for` — mismo mecanismo
  documentado que usa Supabase para sus propios rate-limits. Se construyó un trigger `BEFORE INSERT` en
  `auditoria` — **mismo patrón exacto que `set_organizacion_id()`** (`SECURITY DEFINER` +
  `SET search_path TO 'public'`, ya establecido en el proyecto) — que llena `ip` (de `x-forwarded-for`,
  con respaldo `cf-connecting-ip`) y `device` (de `user-agent`) **solo si el navegador no mandó nada**,
  así que es un candado de "sin excepciones" real: aunque el código del frontend tuviera un bug o se le
  olvidara mandar el dato, el registro igual queda completo. Migración `auditoria_sucursal_y_metadata_trigger`
  (aditiva): columna nueva `sucursal` (text) + función `set_auditoria_metadata()` + trigger
  `trg_auditoria_metadata`. `get_advisors(security)` solo marcó la función nueva con la MISMA advertencia
  ya aceptada para `set_organizacion_id()` (función `SECURITY DEFINER` alcanzable por RPC) — riesgo nulo en
  la práctica (Postgres rechaza ejecutar una función de trigger fuera de un trigger real).
- **Dispositivo — legible, no un user-agent crudo:** `dispositivoActual()` (helper nuevo en `index.html`,
  junto a `logAudit`) arma una etiqueta corta desde `navigator.userAgent` (`"Móvil · iOS · Safari"`,
  `"Escritorio · Windows · Chrome"`...) — no había ningún helper reusable para esto en el sistema
  (`isMobile()` de `parches.js` solo mira el ancho de la ventana, no el tipo de dispositivo real). El
  user-agent CRUDO también se guarda como respaldo vía el trigger (por si el frontend cambia o falla),
  pero lo que ve el dueño en pantalla es la etiqueta legible.
- **Sucursal — solo donde de verdad existe el concepto:** `window.nxSucursalActual()` (helper nuevo en
  `parches.js`, junto a `almNombre()`) devuelve el nombre del almacén ACTIVO (`_almacenSel`, el que de
  verdad se está usando en ese momento — no el almacén "home" del usuario, que podría no coincidir si
  cambió de almacén en la sesión) SOLO si la organización tiene Multi-almacén activado; si no, `null`
  honesto. `logAudit()` llama a esta función si existe (`typeof window.nxSucursalActual==='function'`) —
  el núcleo de Seguros, que NO tiene concepto de sucursal, simplemente nunca la define, así que ahí el
  campo queda vacío sin fingir un dato que no existe.
- **Pantalla de Auditoría (`rAuditRows()`), actualizada:** se reemplazó la columna muerta "ORIGEN"
  (siempre mostraba el literal `'web'`, cero datos reales detrás — limpieza de código muerto, regla
  #1 de "Depurar" del propio reglamento de este archivo) por **DISPOSITIVO** real, y se agregaron
  **SUCURSAL** e **IP** — la tabla ya vivía dentro del wrapper `.tw` (scroll horizontal propio, mismo
  patrón que el resto de tablas anchas del sistema), así que las 2 columnas nuevas no rompen el layout,
  solo alargan el scroll horizontal de la tabla — la página en sí nunca se desborda. `exportarAuditCSV()`
  ahora exporta también Módulo/Dispositivo/Sucursal/IP (antes solo 5 columnas, ninguna de las nuevas).
- **Bug real de seguridad menor, encontrado y corregido de paso (mismo criterio que las auditorías de
  accesibilidad de v48.14/v48.50/v48.55 — arreglar lo que se encuentra al tocar la misma función):** las
  columnas Usuario/Acción/Descripción de `rAuditRows()` **nunca escapaban su contenido** (`${a.detalle}`
  directo, sin `escHtml()`) — cualquier texto guardado en `detalle` (que en varios call-sites viene de
  campos que un admin escribe a mano, como el nombre de un cliente) se interpretaba como HTML real al
  pintarse en pantalla. Confirmado con una prueba real (`detalle:'<script>alert(1)</script>'`) que SÍ se
  ejecutaba antes del arreglo. Corregido envolviendo las 3 columnas en `escHtml()`, igual que ya se hace
  con el resto de campos de esa misma fila.
- **Alcance de "sin excepciones", aclarado (decisión de criterio, documentada aquí):** esta fase
  **endurece el REGISTRO de auditoría** — garantiza que cada vez que `logAudit()` se llama, las 7 columnas
  quedan completas (con `null` honesto donde de verdad no aplica, como Sucursal en Seguros). **NO** agrega
  `logAudit()` a acciones del sistema que hoy no lo llaman — eso sería una auditoría completa de code
  coverage sobre ~24,000 líneas de código con cientos de posibles puntos de mutación, un proyecto aparte
  de mucho mayor alcance y riesgo que no fue lo pedido. Los ~111 call-sites existentes (index.html+parches.js)
  ya cubren las acciones sensibles documentadas de siempre (login, clientes, facturas, cobros, config,
  POS, rifas, consultorio, staff...).
- Verificado con Playwright, código real extraído del archivo (no una reconstrucción): 18 comprobaciones
  — `dispositivoActual()` contra 5 user-agents reales distintos (iPhone/Safari, Android/Chrome, Windows/
  Chrome, Mac/Safari, Windows/Edge) da la etiqueta correcta en los 5; `logAudit()` sin contexto POS manda
  `sucursal:null` y NUNCA manda `ip` (la pone el trigger); `logAudit()` CON contexto POS (almacén activo
  simulado) manda el nombre de sucursal correcto; sin almacenes configurados vuelve a `null` sin fallar;
  la tabla pinta las 3 columnas nuevas con los datos reales y con guiones cuando faltan; el intento de
  XSS queda escapado; el CSV exporta las 9 columnas con los valores correctos. `node --check parches.js`
  limpio; los 3 `<script>` de `index.html` pasan `new Function()`; `version.json` válido; columna
  `sucursal` y trigger confirmados en vivo contra la base real.
- **Con esta pieza el "Plan Maestro NEXUS PRO POS 3.0" tiene sus 7 fases pedidas hasta ahora completas**
  (Motor de Documentos Fases 1-2, Cliente 360° Fase 3, Artículo 360° Fase 4, Kardex Inteligente Fase 5,
  Buscador Universal Fase 6, Dashboard Operativo Fase 7, Auditoría Completa Fase 8) — quedan las fases
  9-10 si el dueño las manda.

### POS · MOTOR DE DOCUMENTOS, FASE 9 — Automatizaciones (21-jul-2026, v48.75)
El dueño pidió que "Factura creada" dispare automáticamente toda una cadena: descontar inventario →
actualizar caja → actualizar cliente → actualizar estadísticas → actualizar utilidad → crear historial.
Investigado antes de programar (agente de exploración, auditoría línea por línea de `nxPosConfirmar` —
la función real que crea la venta, `parches.js:16749-16918` antes de este cambio): **la gran mayoría de
esa cadena YA era 100% automática**, construida en fases anteriores de esta misma sesión, y por una razón
de diseño de fondo que vale la pena dejar escrita:
- **Por qué no hacía falta "conectar" nada — el sistema no cachea agregados, los calcula en vivo:**
  Caja (`totalesCaja()`, ya existente), Estadísticas (`cargarReportes()`) y Utilidad (`cargarDashKPI()`,
  Fase 7) NO leen un número guardado que alguien tenga que ir actualizando — vuelven a sumar
  `pos_ventas`/`pos_venta_items`/`pos_abonos`/`pos_caja_movimientos` **desde cero cada vez que se
  consultan**. Eso significa que "actualizar caja/estadísticas/utilidad" no es un paso que `nxPosConfirmar`
  tenga que ejecutar — ya está automáticamente al día por construcción, sin ningún riesgo de quedar
  desactualizado (no existe ninguna tabla `pos_estadisticas`/`pos_resumen` en todo el proyecto — grep
  exhaustivo confirmado en 0 resultados). Es un diseño MÁS robusto que una cadena de "actualizar X"
  explícita: nada puede quedar a medias porque no hay nada que sincronizar.
  - **Inventario:** confirmado automático — cada línea del carrito pasa por `moverStock(p,'venta',...)`
    (Fase 5, `parches.js:16903-16905`), best-effort, después de crear la venta.
  - **Cliente (deuda/fiado):** confirmado automático — `saldoCli()` se calcula en vivo desde
    `pos_ventas.credito_monto`/`pos_abonos`; `nxPosConfirmar` solo hace un ajuste optimista en memoria
    (`_fiadoByCli[cliId]+=c.credito`, línea 16906) para que la UI no espere un refetch, pero el dato de
    verdad sigue viniendo de la base. **Aclarado explícitamente (decisión de alcance, no un gap):** NO
    existen columnas de fidelidad tipo "última compra"/"visitas"/"puntos" en `pos_clientes` — no es que
    se olvidaran actualizar, es que ese concepto (programa de lealtad) nunca se pidió ni se construyó en
    NEXUS PRO POS. No se inventó nada nuevo ahí — sería una función completamente aparte.
  - **Historial:** confirmado automático — Motor de Documentos (`registrarDocumento('factura',...)`,
    Fases 1-2) + Kardex (`logMov` dentro de `moverStock`, Fase 5) ya dejan rastro completo de cada venta.
- **Los 2 huecos reales que SÍ se cerraron, con línea exacta encontrada por la auditoría:**
  1. **Nunca existía un `logAudit` genérico de "factura creada".** El único `logAudit` dentro de
     `nxPosConfirmar` era para el plan de cuotas (`POS_FINANCIAMIENTO`, si aplicaba) — el evento más común
     de todo el POS (cobrar una venta) no dejaba NINGÚN rastro en la pantalla de Auditoría (Fase 8), a
     diferencia de la anulación de venta, que sí lo tiene. Se agregó `logAudit('POS_VENTA_CREADA', numFac
     + monto + cliente + método, 'POS')` justo antes del toast de éxito — mismo criterio best-effort que
     el resto de la función (`try{}catch{}`, nunca puede bloquear el cobro). Como beneficio gratis de la
     Fase 8 (ya construida), este registro sale automáticamente con usuario/fecha/hora/IP/sucursal/
     dispositivo sin tocar nada más.
  2. **El `INSERT` de `pos_venta_items` es silencioso por diseño** (correcto — nunca debe revertir una
     venta ya cobrada), pero si de verdad fallaba (ej. un corte de red a mitad de la operación), la venta
     quedaba "exitosa" SIN sus líneas, degradando en silencio el resto de la cadena para esa transacción
     (Reportes/Utilidad la subestiman, esa factura sale sin garantías, sin nada que avisara que pasó). Se
     agregó una comprobación (`itemsInsertados.length !== items.length`) que deja un
     `logAudit('POS_VENTA_ITEMS_INCOMPLETOS', 'Factura X — se guardaron N de M línea(s)', 'POS')` — SOLO
     un aviso, no bloquea ni reintenta (reintentar podría duplicar líneas; bloquear violaría la regla ya
     establecida de "nunca revertir un cobro ya hecho").
- **Deliberadamente NO se construyó:** ninguna tabla de caché/resumen nueva, ningún sistema de puntos o
  fidelidad de cliente, ningún cambio al comportamiento best-effort ya establecido (todos los pasos
  secundarios de `nxPosConfirmar` — líneas, documentos, seriales, NCF, asiento contable, stock, cliente,
  notas de crédito — siguen sin poder bloquear ni revertir una venta ya cobrada; se confirmó con la
  auditoría que el ÚNICO punto que de verdad puede impedir la venta es que el `INSERT` de `pos_ventas`
  en sí falle, línea 16838-16840, que es correcto).
- Verificado con Playwright, código real extraído de `nxPosConfirmar` (14,171 caracteres, la función
  completa, no una reconstrucción) cargado en un navegador con un backend simulado: 3 escenarios —
  venta con todas las líneas guardadas (solo dispara `POS_VENTA_CREADA`, con el detalle correcto de
  número/monto/cliente/método), venta con líneas parcialmente guardadas y venta con fallo total al
  guardar las líneas (ambas disparan `POS_VENTA_ITEMS_INCOMPLETOS` con el conteo correcto, Y en los 3
  casos la venta se sigue creando igual — confirmado que `pos_ventas` se postea siempre, el fallo de
  líneas nunca bloquea el cobro). `node --check parches.js` limpio; los 3 `<script>` de `index.html`
  pasan `new Function()`; `version.json` válido.
- **Con esta pieza el "Plan Maestro NEXUS PRO POS 3.0" tiene sus 8 fases pedidas hasta ahora completas**
  (Motor de Documentos Fases 1-2, Cliente 360° Fase 3, Artículo 360° Fase 4, Kardex Inteligente Fase 5,
  Buscador Universal Fase 6, Dashboard Operativo Fase 7, Auditoría Completa Fase 8, Automatizaciones
  Fase 9) — queda la fase 10 si el dueño la manda.

### POS · MOTOR DE DOCUMENTOS, FASE 10 (final) — IA NEXUS / Recomendaciones (21-jul-2026, v48.76)
El dueño pidió que el sistema RECOMIENDE 8 cosas: Compras, Reposición, Promociones, Clientes inactivos,
Productos lentos, Productos estrella, Márgenes bajos, Riesgos de inventario. Investigado antes de
programar (agente de exploración): decisión de arquitectura clave tomada ANTES de escribir código —
**esto NO llama a ningún modelo de lenguaje** (nada de Anthropic/OpenAI). Las 8 categorías pedidas son
clásicos de analítica de retail (rotación, cobertura de stock, márgenes, inactividad de clientes) —
perfectamente calculables de forma determinística sobre los datos reales que el sistema ya tiene, sin
necesitar generación de texto por IA. Se evitó a propósito repetir el problema real que ya sufrió
**NEXUS AI CONTENT** en esta misma sesión (quedó en pausa por un secreto de Anthropic mal configurado en
Supabase) — una pantalla de recomendaciones que depende de una API externa para funcionar es más frágil,
más lenta y tiene un costo por uso, sin que ninguna de las 8 categorías pedidas necesite generación de
lenguaje natural para ser útil.
- **Reusa umbrales YA establecidos en el sistema, no inventa cortes nuevos:** margen bajo = mismo
  `<15%` de `nxPfMargenCalc` (Fase 1 de NEXUS PRO 2.5); stock crítico = mismo
  `stock_min>0 && stock<=stock_min` ya usado en Avisos/Inicio/Inventario.
- **Núcleo: UN solo análisis por producto, reusado por las 6 secciones de productos** (single source of
  truth, mismo criterio que ya se aplicó en el Dashboard Operativo de la Fase 7 para no calcular "lo
  mismo" dos veces con fórmulas ligeramente distintas). `iaAnalisisProductos()` calcula, por cada
  producto no-servicio: `vend30`/`monto30` (ventas de los últimos 30 días, vía `iaVentasPorProducto()`,
  que reusa `_repVentas` ya cargado por `cargarReportes()` pero con una ventana de fecha PROPIA y FIJA de
  30 días — deliberadamente NO usa `_repDesde`/`_repHasta`, que son el filtro mutable de la pantalla
  Reportes y podrían estar en cualquier rango cuando el usuario entra a esta pestaña nueva), `velDia`
  (velocidad diaria), `diasCobertura` (stock/velDia — cuántos días de inventario quedan al ritmo
  actual), `margenPct`, `critico`, y el `proveedor` asociado (de `p.proveedor_id`, ya en memoria desde
  la Fase 1 de NEXUS PRO 2.5, cero consulta nueva).
  - **Riesgos de inventario:** `velDia>0 && diasCobertura<=7` — se está vendiendo Y se agota en una
    semana o menos al ritmo actual.
  - **Compras:** `critico && vend30>0` — bajo el mínimo que el dueño configuró Y con demanda real (no
    tiene caso "recomendar comprar" algo que nadie compra solo porque el mínimo quedó mal calibrado).
  - **Reposición:** para la lista de Compras, cantidad sugerida = `ceil(velDia*30 - stock)` — cuánto
    comprar para cubrir 30 días de venta al ritmo actual.
  - **Promociones:** `vend30===0 && stock>0` — cero ventas en 30 días con inventario real disponible,
    ordenado por capital inmovilizado (`stock*costo`) descendente.
  - **Productos lentos:** `vend30>0 && stock>0`, ranking de los que menos se vendieron (no cero — ese
    caso ya es "Promociones", categorías distintas y complementarias, no duplicadas).
  - **Productos estrella:** TOP 10 por `monto30` (no por cantidad — coincide con el criterio que ya usa
    el TOP 10 de Reportes, aunque acá se reagrupa por `producto_id` real en vez de por `nombre` como hace
    Reportes, para no separar accidentalmente un mismo producto que fue renombrado en su historial).
  - **Márgenes bajos:** `margenPct<15`, ordenado del peor margen al mejor, tope 20.
  - **Clientes inactivos:** NUEVO — no existía ningún dato cacheado de "última compra" en `pos_clientes`
    (confirmado por la auditoría, cero columnas de fidelidad en todo el proyecto). `cargarIAClientes()`
    trae `pos_ventas` (`cliente_id,created_at,total`, `estado=neq.anulada`, límite 5000) y agrupa en JS
    la fecha más reciente por cliente (mismo patrón que `cargarSaldosCli()`). Solo cuentan como
    "inactivos" los clientes que **SÍ compraron antes** pero no en 60+ días — un cliente que nunca ha
    comprado es un prospecto, no un inactivo, y se excluye a propósito (criterio de no fingir una
    categoría que no aplica). Botón de WhatsApp de 1-toque para reconectar, mismo patrón que Avisos.
- **Entrada nueva:** módulo `'ia'` agregado a `MODULOS` (aparece automático para admin/gerente vía
  `_MODKEYS.slice()`/`.filter()`, NO se agregó a los arreglos de `cajero`/`vendedor` — mismo criterio que
  Reportes/Compras/Contabilidad, ya reservados a roles de gestión), tile nuevo en `renderInicio()` y
  entrada en `shellTienda()` (grupo nuevo "Inteligencia", color `#9333ea` — confirmado sin choque contra
  ningún color ya usado ni en el hub de Multiempresa ni en los tiles de `renderInicio`, ver "REGLAMENTO
  — cada app con su propio color"), ícono `ti-brain` (deliberadamente distinto de `ti-sparkles`, ya usado
  por NEXUS AI CONTENT en el hub — evita que dos módulos de "IA" en el sistema compartan el mismo ícono).
- **BUG real encontrado y corregido ANTES de publicar (con datos de prueba, no en producción):** al
  simular una organización SIN historial de ventas cargado (`_repVentas` vacío — org nueva, o esta
  pestaña es la primera que visita el usuario), "Promociones" marcaba **el catálogo entero** como
  candidato a liquidar — porque técnicamente `vend30=0` para TODO cuando no hay ningún dato con qué
  compararlo, un falso positivo masivo y engañoso. Corregido con una guardia `sinDatos` (calculada antes
  de los filtros, `!_repVentas || !_repVentas.length`) que deja "Promociones" vacía y honesta
  ("Sin excedentes detectados") en vez de acusar productos sin ninguna base real. **Márgenes bajos NO
  se tocó** con esta guardia — es la única sección que no depende de ventas (margen = precio−costo,
  estático), así que sigue siendo útil incluso sin ningún historial de ventas todavía.
- Verificado con Playwright, código real extraído del archivo (no una reconstrucción): harness con 4
  productos (uno crítico+vendiéndose=riesgo+compra+reposición+estrella a la vez, uno con cero ventas y
  stock=promoción, uno con margen 10%=bajo, uno sano con alto volumen=estrella) y 3 clientes (uno
  inactivo a 90 días con una venta ANULADA más reciente que debía excluirse del cálculo — confirmado que
  si sale la fecha de la venta real, no la anulada —, uno activo a 5 días, uno que nunca ha comprado) —
  27 comprobaciones: las 8 secciones clasifican correctamente, los servicios quedan excluidos del
  análisis, el cliente sin historial no aparece como "inactivo", el WhatsApp arma el enlace correcto, el
  caso "sin datos" deja Promociones vacía pero Márgenes bajos sigue funcionando, y sin desbordes en
  390px. `node --check parches.js` limpio; los 3 `<script>` de `index.html` pasan `new Function()`;
  `version.json` válido.
- **Con esta pieza el "Plan Maestro NEXUS PRO POS 3.0" queda con sus 10 fases completas** (Motor de
  Documentos Fases 1-2, Cliente 360° Fase 3, Artículo 360° Fase 4, Kardex Inteligente Fase 5, Buscador
  Universal Fase 6, Dashboard Operativo Fase 7, Auditoría Completa Fase 8, Automatizaciones Fase 9, IA
  NEXUS Fase 10). Pendiente si el dueño quiere seguir: nada del plan original — cualquier trabajo nuevo
  sería un plan aparte que él mismo defina.

### POS · SISTEMA DE DISEÑO — rediseño premium por módulos (21-jul-2026, en progreso, v48.77)
Tras cerrar el "Plan Maestro POS 3.0" (0 funcionalidades nuevas pendientes), el dueño pidió algo distinto:
**"No quiero agregar funcionalidades nuevas. Quiero crear el Design System oficial de PUNTO DE VENTA,
Rediseña completamente la interfaz siguiendo un estilo premium inspirado en Linear, Stripe, Shopify y
Raycast. Conserva toda la lógica existente. Solo cambia la experiencia visual, el layout y los
componentes reutilizables. Después de crear el Design System, iremos migrando cada módulo uno por uno
sin romper el funcionamiento actual."** Plan de 3 pasos acordado con él mismo: (1) construir el Design
System como muestra aparte para aprobar, (2) confirmar la dirección visual, (3) migrar módulo por módulo
al sistema real, verificado antes de publicar cada uno — igual disciplina que el resto de esta sesión.
- **Paso 1 — muestra standalone (`design-system.html`, scratchpad, NUNCA publicada al repo):** tokens
  (color/tipografía/espaciado/elevación/movimiento) + componentes (botones/campos/badges/tabs/tabla/
  franja de KPI/tarjetas/modal/toast/paleta de comandos) + una "Pantalla compuesta" (el Dashboard
  Operativo armado solo con los componentes). Publicada primero como Artifact para que el dueño la
  revisara. **2 rondas de feedback real, no cosméticas:**
  1. El dueño: "Está aplicado ??" / "Igual que antes" — mandó una captura REAL de `nexusprord.com` en
     vivo (el dashboard actual: tarjetas con borde superior de color arcoíris, íconos en esfera 3D con
     degradado, fondo lavanda). La primera versión de la muestra (fondo navy calcado del sidebar real,
     tarjetas KPI con la misma silueta "tarjeta+ícono flotante" solo que aplanada) todavía se sentía
     igual en estructura, no solo en color.
  2. Revisión de fondo, no un ajuste de paleta: **la barra lateral pasó de navy (idéntico al sidebar
     real) a "chrome" gris grafito fijo** (no cambia con el tema claro/oscuro — mismo lenguaje que
     Linear/Vercel/Raycast, que nunca aclaran su barra de herramientas aunque el resto de la app sí
     cambie), con acento nuevo `--accent-2` índigo (`#6366f1`) para logo/estado activo, sin tocar el
     azul `#2563eb` de marca que sigue en botones/estados. **Los KPI dejaron de ser una rejilla de
     tarjetas sueltas con ícono en caja de color** (la misma silueta que ya tiene la app real, solo con
     estilos distintos) **y pasaron a una FRANJA con divisores finos** (patrón real del dashboard de
     Stripe: "Gross volume | New customers | ..." en una sola fila con líneas, no N tarjetas) — el
     número queda como único protagonista, el color se reduce a un glifo chico junto a la etiqueta. Esta
     fue la diferencia que de verdad rompió el parecido estructural, no solo cromático.
  3. Héroe reescrito más audaz (38px→52px, trama de puntos enmascarada de fondo, degradado en el
     titular, dos manchas de luz azul+índigo) — lenguaje de "portada de sistema de diseño", no de panel
     operativo, deliberadamente distinto del resto de la app.
  Verificado en cada ronda con Playwright a 1440px/390px: cero desbordes, cero errores de consola.
- **Paso 2 — aprobación:** el dueño confirmó con "Si aplícalo" — luz verde para empezar el paso 3.
- **Paso 3 — EN PROGRESO, primera pieza real aplicada (v48.77): Menú lateral + Inicio.** Cambios
  quirúrgicos en `parches.js` (`shellTienda()`, `inyectarCSSTienda()`, `renderInicio()`) — **cero IDs,
  cero `onclick`, cero lógica tocada, solo CSS/HTML del "vestido"**, mismo criterio de toda la sesión:
  - `.nxTSide` (sidebar real): del degradado `#1e3a6e→#2563eb` (navy) al graphite `#14161f→#0a0b10`,
    acento activo de `rgba(59,130,246,.28)`+barra azul a `rgba(99,102,241,.16)`+barra índigo `#6366f1`,
    `.nxTLogo`/`.nxTAva` con degradado índigo→azul. El bloque **BLINDAJE** (`!important` contra el tema
    glass, ya existía desde antes para que el sidebar no saliera translúcido) se actualizó en paralelo
    con los MISMOS valores nuevos — si no, el blindaje habría forzado el navy viejo de vuelta por encima
    del CSS base (aprendizaje ya documentado en este archivo: cualquier cambio de color al sidebar
    real SIEMPRE tiene que tocar las 2 copias, la base y el blindaje).
  - `.nxTKpis`/`.nxTKpi` (los 8 indicadores de Inicio — Ventas de hoy/Caja/Utilidad/Equipos pendientes/
    Garantías/Inventario crítico/Compras pendientes/Clientes esperando, construidos en la Fase 7 del
    Plan Maestro): de `grid-template-columns:repeat(auto-fit,minmax(150px,1fr))` con tarjetas
    individuales (`border-top:3px solid ${color}` + ícono en caja de color, exactamente el patrón que el
    dueño señaló como "igual que antes" en su captura) a una **franja única** (`border-top`+`border-left`
    en el contenedor, `border-right`+`border-bottom` en cada celda — técnica de lattice que no depende
    de cuántas columnas haya, sirve igual para 4 como para 8 celdas sin matemática de `nth-child`).
    El helper `kpi()` de `renderInicio()` se simplificó para no pintar más el `<div class="nxTKpiIc">`
    (caja de ícono de color) — ahora es un glifo de 12px junto a la etiqueta. `.nxTKpiIc` quedó como CSS
    muerto sin usar (verificado que no lo usaba nada más en todo el archivo antes de dejar de pintarlo).
  - **Deliberadamente NO tocado en esta pieza** (queda para las siguientes, "módulo por módulo" tal como
    lo pidió el dueño): los tiles del lanzador de apps (`.nxApp`/`.nxAppSec`, la rejilla de accesos
    rápidos debajo de los KPI) siguen con su estilo de siempre — es una rejilla plana y neutra (no
    glosy/degradada como las tarjetas viejas de KPI), no chocaba con el problema real que señaló el
    dueño, así que no se arriesgó tocarla sin necesidad en esta pasada. El resto de las ~20 pantallas
    del POS (Vender, Factura, Inventario, Compras, Clientes, CRM, Caja, Contabilidad, Reportes...)
    siguen exactamente igual — se migran de a una en las próximas piezas.
  - **Verificado con el código real** (no una reconstrucción): se extrajeron `shellTienda`/
    `renderInicio`/`iniciarRefrescoDashboard`/`inyectarCSSTienda` tal cual del archivo (balance de
    llaves real) y se cargaron en un navegador con datos simulados — el sidebar se ve graphite con
    acento índigo, la franja de KPI se ve como una sola pieza con divisores (no 8 tarjetas sueltas), el
    cajón lateral en móvil abre/cierra igual que siempre, sin desbordes en 390px ni 1440px, 0 errores de
    consola. `node --check parches.js` limpio; los 3 `<script>` de `index.html` (1,423 / 426,472 / 681
    caracteres) pasan `new Function()`; `version.json` válido.
- **Pendiente:** el resto de la migración módulo por módulo — el dueño la va confirmando pieza a pieza,
  igual que el resto de esta sesión (nunca todo de golpe sobre pantallas que ya funcionan en producción).
- **Paso 3, segunda pieza (v48.82) — Vender: badges de stock + botón favorito.** El dueño reportó
  "La parte visual y formato sigue igual" después de v48.77 — correcto: esa pieza solo tocó el menú
  lateral y la franja de KPI de Inicio; la pantalla que el cajero usa TODO el día (Vender, catálogo +
  carrito) seguía con su CSS de antes, sin ningún rastro del Sistema de Diseño nuevo. Se confirmó
  extrayendo el código real de `renderVender()`/`gridHTML()`/`pintarCarrito()` (no una suposición) y
  cargándolo en un navegador: en efecto, cero clases nuevas ahí, mismo look `.nxPf` azul/blanco de
  siempre. Primer ajuste real en esa pantalla, quirúrgico como toda la sesión — **cero IDs, cero
  `onclick`, cero lógica tocada**, solo las 2 reglas CSS más visibles:
  - `.vstkb` (la etiqueta de stock — "5 und"/"Bajo: 1 und"/"Agotado"/"Servicio", una por producto en la
    lista de Vender): pasó de texto de color suelto con un puntito (`color:var(--pf-green)` etc.) a
    **pastilla con fondo tenue del mismo color** (`background:var(--pf-green-l);color:var(--pf-green)`,
    mismo patrón `.ds-badge` de la muestra aprobada) — los 4 tokens `-l` (verde/naranja/rojo/azul) YA
    existían en `.nxPf` con su propia variante de tema oscuro (`body.tema-oscuro .nxPf{--pf-green-l:...}`
    etc.), así que el cambio se ve bien en los 2 temas sin tocar ningún token nuevo.
  - `.vfav` (la estrella de favorito de cada producto, de la Fase 4 de NEXUS PRO 2.5): pasó de ícono
    suelto sin área de toque visible a **botón cuadrado 30×30 con esquinas redondeadas** que resalta el
    fondo al pasar el cursor/dedo (`:hover{background:var(--pf-bg)}`) — mismo patrón `.ds-btn-icon` de
    la muestra. El precio (`.vprecio`) ganó `font-variant-numeric:tabular-nums` (los dígitos de dinero
    alinean en columna, mismo criterio ya usado en las pantallas Enterprise de Seguros).
  - **Deliberadamente NO tocado en esta pieza:** los chips de categoría (`.vchip`, filled-azul-cuando-
    activo) se dejaron igual a propósito — ese mismo patrón de "pastilla llena cuando está activa" se
    repite en Reparaciones/Inventario/Notas de crédito (`.nxRepChip`/`.nxInvPill`), cambiarlo solo en
    Vender habría roto la consistencia visual entre pantallas sin ganancia real. El resto de Vender
    (miniatura `.vthumb`, fila `.vrow`, panel del carrito `.cartcard`) ya usaba bordes/sombras/radios
    muy cercanos al lenguaje de la muestra (`--pf-shadow` ya es casi idéntico a `--shadow-md` de la
    muestra) — no hacía falta tocarlos. Factura/Prefactura/Cotizaciones (que comparten helpers con
    Vender pero tienen su propio CSS `.nx-inv-*`/`.nxFacTbl`) quedan para las próximas piezas.
  - **Verificado con el código real** (`gridHTML`/`pintarCarrito`/`nxPfEnsureCSS` extraídos tal cual del
    archivo, balance de llaves real) cargado en un navegador con datos simulados (producto con stock
    normal/bajo/agotado + un servicio): las 4 pastillas de estado se ven con su color correcto en tema
    claro Y en `body.tema-oscuro`, sin desbordes en 390px ni 1000px, 0 errores de JS. `node --check
    parches.js` limpio; los 3 `<script>` de `index.html` pasan `new Function()`; `version.json` válido.
  - **Pendiente:** seguir la migración a Factura, al panel del carrito completo, y al resto de las
    ~19 pantallas del POS — pieza por pieza, cada una probada antes de publicar, mismo criterio.

### NEXUS PRO 2.5 — REDISEÑO DEL POS, filosofía InfoPlus sin copiar su lógica (21-jul-2026, en progreso)
El dueño mandó una especificación larga y muy detallada ("NEXUS PRO 2.5 – REDISEÑO DEL PUNTO DE VENTA")
pidiendo explícitamente **NO cambiar la lógica comercial** — mantener la misma filosofía operativa de
InfoPlus (Cotización→Preventa→Factura, un solo Punto de Venta, decisión "Finalizar" al final) pero con
interfaz moderna — y pidió, **antes de escribir código**: (1) analizar el POS actual, (2) compararlo
contra la filosofía InfoPlus, (3) identificar diferencias funcionales, (4) proponer mejoras sin alterar
el flujo comercial, (5) presentar un plan por fases. Se hizo así, en ese orden, sin tocar código hasta
tener el plan aprobado.
- **Investigación (agente de exploración, 30 llamadas de herramienta, evidencia archivo:línea real):**
  hallazgo clave — **Vender, Factura y Prefactura YA son literalmente la misma pantalla.**
  `renderPrefactura()` es un wrapper de una línea (`return renderFactura()`); el modo se activa con una
  sola bandera `_posTab==='prefactura'` (`esPreTab()`); los 3 comparten `_cart`/`_factCli`. La única
  pieza genuinamente aislada es **Cotizaciones**: usa una estructura de líneas propia (`_cotEdit.lineas`,
  no `_cart`), un modal aparte (`abrirCotizacion()`), y un buscador de productos con `<datalist>` HTML5
  nativo (no el componente de búsqueda del resto del sistema). Tampoco existe hoy un botón "Finalizar"
  único — son 4 entradas separadas en el menú, elegidas ANTES de armar el pedido (al revés del pedido).
  Otros gaps reales encontrados: el panel de cliente en Factura solo mostraba código+nombre+nivel (sin
  teléfono/balance/crédito disponible/última compra, aunque `saldoCli()` ya existe y se usa en otras
  pantallas); no existe ningún concepto de favoritos/recientes de producto; no existe campo de peso en
  `pos_productos`; el margen de la venta en curso no se muestra en ningún resumen de cobro (solo existe
  como métrica del día en el Dashboard o del producto en su ficha/Artículo 360°).
- **3 decisiones confirmadas con el dueño por `AskUserQuestion` antes de tocar código** (todas la opción
  recomendada): (1) el botón "Finalizar" se agrega de forma **aditiva** — las 4 pestañas actuales
  (Vender/Factura/Prefactura/Cotizaciones) se quedan funcionando exactamente igual, el camino unificado
  se SUMA, no reemplaza nada (cero riesgo de romper el hábito de los cajeros ya entrenados); (2) el campo
  "Peso" del brief queda **fuera de alcance** (el negocio real —celulares/accesorios— no vende por peso);
  (3) el margen visible en el resumen de cobro queda **fuera de alcance por ahora** (ni admin ni gerente,
  se decide después si hace falta).
- **Plan por fases acordado:** Fase 1 (bajo riesgo, panel de cliente enriquecido) → Fase 2 (riesgo medio,
  migrar Cotizaciones a compartir `_cart`+buscador estándar, mismo patrón que ya usa Prefactura) → Fase 3
  (riesgo medio-alto, el botón "Finalizar" real) → Fase 4 (favoritos/recientes de producto).
- **FASE 1 — HECHA (v48.78): panel de cliente enriquecido en Vender y Factura.** Nuevo bloque
  `facCliInfoHTML(c)` (junto a `saldoCli`/`waNum`, mismo IIFE): teléfono (si tiene), **Balance** (
  `saldoCli(c)`, en rojo si `>0`), **Crédito disponible** (`limite_credito - saldo`, solo si el cliente
  tiene límite configurado — si no, no se muestra esa pastilla, no se finge un dato que no aplica), y
  **Última compra** — esta última resuelta APARTE y perezosa (`cargarUltimaCompraCli(id)`, con caché
  `_ultCompraCache` para no volver a golpear la red si el cajero re-selecciona el mismo cliente), mismo
  criterio ya usado en Artículo 360°/`nxPfUltimoCosto` para no retrasar el primer pintado de la pantalla
  de cobro (la más usada de todo el POS). El bloque vive en un contenedor de ID estable
  (`id="facCliInfoWrap"`, presente en Vender Y Factura — pestañas mutuamente excluyentes, mismo patrón ya
  establecido para `facCliBtn`/`facCliDrop`/`facCliTxt`); `nxFacSetCli()` ahora también llama a
  `pintarFacCliInfo()` (repintado puntual, ya que esa función no reconstruye toda la pantalla) para que
  el panel se actualice al cambiar de cliente a mitad de sesión, no solo en el primer pintado. Consumidor
  final sigue sin mostrar nada (mismo comportamiento de antes, `facCliInfoHTML(null)===''`). CSS nuevo
  `.pf2cliinfo`/`.pf2cliinfo-i` en `nxPfEnsureCSS()`, con una regla `.card .pf2cliinfo` para no duplicar
  el padding horizontal cuando el bloque vive dentro de una `.card` ya paddeada (Vender) vs. cuando es un
  hijo directo de `.nx-inv-card` sin padding propio (Factura) — mismo tipo de ajuste de especificidad ya
  documentado varias veces en este archivo. **Deliberadamente NO tocado en esta fase:** Cotizaciones,
  el botón Finalizar, favoritos/recientes — quedan para las Fases 2-4, confirmadas pieza por pieza.
  Verificado: 15 aserciones contra el código real extraído (`facCliInfoHTML`/`cargarUltimaCompraCli`/
  `pintarFacCliInfo`) — balance con color de alerta correcto, crédito disponible solo si hay límite,
  caché evita una segunda consulta a la red al re-seleccionar el mismo cliente, cliente sin compras
  muestra "Sin compras registradas" en vez de romperse, `pintarFacCliInfo()` no truena si el contenedor
  no existe en el DOM actual — más una verificación visual en navegador (Playwright, código y CSS reales
  extraídos de `nxPfEnsureCSS`) en 390px/1280px, sin desbordes, 0 errores de JS. `node --check
  parches.js` limpio; los 3 `<script>` de `index.html` pasan `new Function()`; `version.json` válido.
- **Pendiente:** Fase 2 (Cotizaciones → `_cart` + buscador estándar), Fase 3 (botón Finalizar aditivo),
  Fase 4 (favoritos/recientes) — cada una se construye y confirma por separado, mismo criterio de toda
  la sesión.
- **FASE 2 — HECHA (v48.79): "Guardar Cotización" directo desde el carrito, sin cambiar de pantalla.**
  **Corrección de rumbo durante la construcción (documentada, no oculta):** el plan original de la Fase 2
  (ver arriba) proponía Cotización como un TERCER MODO de `renderFactura()`/`pintarFactura()`, igual que
  Prefactura (`_posTab==='cotizacion'`, carrito propio `_cartCot`, intercambio de carrito en `nxPosTab`).
  Se construyó completo y se probó con un harness de Node — y ahí se encontró el problema: el intercambio
  de carrito (mismo patrón que ya usa Prefactura) significa que entrar a un modo dedicado **vacía el
  carrito activo** (arranca desde el carrito propio de ESE modo, que empieza vacío) — exactamente el
  comportamiento correcto para Prefactura, pero el OPUESTO de lo que se necesitaba aquí: la meta era que
  el cajero pudiera decidir "Cotización" SIN perder lo que ya armó. Construir una pantalla dedicada para
  cotización terminaba repitiendo el mismo problema de fragmentación que esta fase buscaba resolver — solo
  que con mejor UI. Se revirtió esa pieza (`esCotTab`, `_cartCot`, el intercambio de carrito de 3 vías, el
  título/numField/pending-block de 3 vías) ANTES de publicar, y se reemplazó por el diseño correcto: **un
  botón que guarda directo, sin cambiar `_posTab`** — exactamente el mismo patrón que ya usa "Guardar
  Prefactura" (que tampoco navega a ninguna pantalla, solo lee `_cart` tal cual está y lo guarda). Este
  cambio de rumbo se detectó ANTES de publicar (durante las pruebas con el código real, nunca llegó a
  producción) — se documenta aquí igual, con la misma honestidad que el resto de este archivo, porque
  es información real de por qué la solución final es como es.
  - **Lo construido de verdad:** botón **"Guardar Cotización"** en el panel "Opciones adicionales" de
    Factura/Prefactura (`.nx-inv-opts`, junto a "Guardar Prefactura"/"Prefacturas"/"Historial") —
    reemplaza al botón viejo "Cotización" (que antes solo saltaba a la lista, `nxPosTab('cotizaciones')`,
    sin guardar nada). Función nueva `window.nxCotGuardarDesdeCart()` (junto a `nxPrefGuardar`, mismo
    patrón): lee `_cart`/`clienteSel()`/`totales()` **tal cual están en la pantalla actual** (Vender,
    Factura o Prefactura — no le importa en cuál), consume `nextSeq('cotizacion')` (mismo consecutivo
    COT-0001 que ya usa el modal clásico, con el mismo respaldo `cotProxNumero()` si la secuencia no
    está sembrada), y postea a **las mismas tablas** `pos_cotizaciones`+`pos_cotizacion_items` que usa
    `nxCotGuardar()` (el modal clásico) — mapeando cada línea del carrito con `lineDescMonto`/
    `lineImporte`, igual que ya hace ese modal con `_cotEdit.lineas`. Registra en el Motor de Documentos
    (`registrarDocumento('cotizacion',...)`), limpia `_cart`, y salta a la lista de Cotizaciones
    (`nxPosTab('cotizaciones')`) para que el cajero vea confirmado que se guardó. Botón deshabilitado
    (`disabled` + `.nx-inv-opt:disabled{opacity:.45}`, regla CSS nueva) cuando el carrito está vacío.
  - **Por qué es seguro:** es la MISMA tabla, MISMO esquema, MISMA numeración que el modal clásico de
    Cotizaciones (`abrirCotizacion`/`nxCotGuardar`/`nxCotConvertir`, todos intactos, cero líneas
    tocadas) — lo que se crea desde el carrito se ve, se edita y se convierte en factura exactamente
    igual que una cotización creada por el camino de siempre. **Única limitación consciente:** siempre
    crea una cotización NUEVA con `validez_dias=15` (el valor por defecto de siempre) — editar una ya
    guardada, o cambiarle la validez, se sigue haciendo desde la lista con el modal clásico (que sí tiene
    ese campo). No se le agregó un campo de validez a este botón rápido para no complicar el panel de
    resumen con un campo que el flujo de "decidir al final" no pidió.
  - **Verificado con dos harnesses de Node contra el código real extraído** (balance de llaves real, no
    reconstrucción a mano): (1) el diseño descartado — confirmó el problema real del intercambio de
    carrito (11 aserciones, incluida la prueba que expuso el bug de raíz) antes de decidir revertirlo;
    (2) el diseño final — 12 aserciones: guarda con el número real de la secuencia, cliente correcto,
    total correcto, items correctos, registra en el Motor de Documentos, limpia el carrito, salta a la
    lista, funciona igual llamado desde Factura o desde Prefactura, cae al número de respaldo si no hay
    secuencia sembrada, y un carrito vacío no guarda nada (solo avisa). Más una verificación visual en
    Playwright del panel "Opciones adicionales" real (CSS extraído de la función real `inyectarCSS` del
    POS) en 390px/1000px: el botón se ve bien en los 2 estados (activo/deshabilitado), sin desbordes.
    `node --check parches.js` limpio; los 3 `<script>` de `index.html` pasan `new Function()`;
    `version.json` válido. Diff final: 3 cambios quirúrgicos (un botón, una función nueva, una regla CSS)
    — nada de lo revertido quedó rastro en el archivo (confirmado con grep de `esCotTab`/`_cartCot`/
    `nxIrACotizar`/`peekCot`: cero resultados).
- **Pendiente:** Fase 3 (botón "Finalizar" real, aditivo — Facturar/Guardar Preventa/Guardar Cotización
  como una sola decisión al final), Fase 4 (favoritos/recientes de producto).
- **FASE 3 — HECHA (v48.80): "Vender" gana los mismos 3 caminos que ya tenían Factura/Prefactura.**
  Al revisar qué faltaba de verdad para "el usuario decide AL FINAL: Facturar / Guardar Preventa /
  Guardar Cotización", se confirmó que Factura/Prefactura YA tenían los 3 caminos visibles desde la
  Fase 2 (Cobrar/Guardar · el panel "Opciones adicionales" con Guardar Prefactura + Guardar Cotización)
  — el hueco real era **Vender**, la pantalla más rápida del sistema (la que abre el botón "Venta
  rápida" del topbar), que solo tenía "Cobrar". Se decidió NO construir un botón "Finalizar" nuevo con
  menú desplegable (más riesgo, un componente nuevo) — en vez de eso, **sumar las 2 piezas que ya
  existían** (`nxPrefGuardar`/`nxCotGuardarDesdeCart`, de la Fase 2) directo al carrito de Vender,
  mismo patrón visual que ya se ve bien en Factura, más simple y más rápido de verificar.
  - `pintarCarrito()` (el panel del carrito en Vender): fila nueva `.cartsave` (grid 2 columnas) entre
    los totales y el botón grande "Cobrar" — "Prefactura" (`nxPrefGuardar()`) y "Cotización"
    (`nxCotGuardarDesdeCart()`), ambas ya construidas y probadas en la Fase 2, CERO lógica nueva, solo
    HTML/CSS. Botones deshabilitados (`disabled`, regla `.cartsavebtn:disabled{opacity:.45}`) si el
    carrito está vacío — mismo criterio que "Cobrar" ya usaba.
  - **Cero cambios de lógica de negocio:** ambas funciones ya estaban probadas (Fase 2) y no les
    importa desde qué pestaña se llaman — leen `_cart`/`clienteSel()`/`totales()` tal cual están en
    pantalla. `nxPrefGuardar()` deja al cajero en Vender con el carrito vacío, listo para la próxima
    venta (no navega). `nxCotGuardarDesdeCart()` salta a la lista de Cotizaciones para confirmar el
    guardado — mismo comportamiento ya establecido en Factura/Prefactura, deliberadamente sin crear un
    camino distinto solo porque ahora se llama desde otra pantalla (consistencia > personalización).
  - Verificado con Playwright, código real extraído de `pintarCarrito`/`totales`/`lineImporte`/
    `nxPfEnsureCSS` (CSS real, no reconstruido) y cargado en un navegador: los 2 botones nuevos se ven
    bien alineados junto a "Cobrar", se apagan correctamente con el carrito vacío, sin desbordes en
    390px ni 1000px, 0 errores de JS. `node --check parches.js` limpio; los 3 `<script>` de
    `index.html` pasan `new Function()`; `version.json` válido.
  - **Con esta pieza cierra la Fase 3** — las 3 pantallas donde se arma una venta (Vender, Factura,
    Prefactura) ofrecen ya el mismo menú de decisión final.
- **Pendiente:** Fase 4 (favoritos/recientes de producto) — última fase del plan NEXUS PRO 2.5.
- **FASE 4 — HECHA (v48.81): Favoritos y Recientes en el catálogo de Vender — CIERRA NEXUS PRO 2.5.**
  Columna nueva **`pos_productos.favorito`** (boolean, default false, migración `pos_productos_favorito`,
  aditiva — `_prods` ya carga con `select=*`, no hizo falta tocar ninguna consulta). `get_advisors`
  sin hallazgos nuevos.
  - **Favoritos:** cada fila de `gridHTML()` gana una estrella (`.vfav`, `ti-star`/`ti-star-filled`) —
    **decisión de arquitectura obligatoria antes de tocar el HTML:** la fila de producto (`.nxPosCard`)
    era un `<button>`, y un `<button>` NO puede contener otro `<button>` (HTML inválido — el navegador
    reordena el DOM en silencio, rompiendo el layout). Se cambió la fila de `<button>` a
    `<div role="button" tabindex="0" onkeydown="Enter/Espacio">` (mismo patrón ya usado en las filas
    clicables de la tanda 1 de Fase 4 del rediseño Enterprise) — así el botón de estrella real puede
    vivir dentro sin violar anidado, con `event.stopPropagation()` para que tocar la estrella nunca
    seleccione el producto (y viceversa). `window.nxProdFavToggle(id)` — optimista en memoria (se ve
    al instante) + `PATCH` real a `pos_productos`, revierte si la red falla.
  - **Recientes — dato real, no inventado:** un chip nuevo `🕒 Recientes` (junto a `⭐ Favoritos`, ambos
    como pseudo-categorías `__fav__`/`__recientes__` que `gridHTML()` interpreta aparte de las
    categorías reales de `_cats`, mismo helper `window.nxPosCat` de siempre). `cargarProdsRecientes()`
    trae `pos_venta_items` (`select=producto_id&order=id.desc&limit=80`), deduplica a los últimos ~12
    productos DISTINTOS vendidos de verdad (más reciente primero) — **perezoso**: solo se dispara la
    primera vez que el cajero toca ese chip (`_prodsRecientesIds` arranca en `null`, se cachea después),
    para no cargarle una consulta de más a la pantalla más usada del sistema a quien nunca usa ese chip.
  - Estados vacíos honestos: "Sin favoritos todavía. Toca la ☆..." / "Sin ventas recientes todavía." —
    nunca una lista vacía sin explicación ni (peor) el catálogo completo por error.
  - **Deliberadamente NO tocado:** el formulario de producto (`abrirProd`) no ganó un checkbox de
    favorito — la estrella en el catálogo ya es la única entrada, agregar una segunda habría sido
    redundante. Tampoco se guardó ningún estado de "favorito" a nivel de usuario/cajero (es a nivel de
    catálogo de la organización, como el resto de `pos_productos` — no existe un concepto de "mis
    favoritos" por persona en el POS).
  - **Verificado con dos rondas:** (1) harness de Node con el código real extraído — 18 aserciones
    (fila es `<div>` no `<button>`, con `role`/`tabindex`/`onkeydown`; la estrella SÍ es un `<button>`
    real con `stopPropagation`; filtro Favoritos muestra solo lo marcado; filtro Recientes deduplica y
    ordena correctamente; el toggle es optimista, hace el PATCH correcto, y revierte si falla; el chip
    Recientes solo dispara la consulta la primera vez). (2) Playwright con el DOM real de un navegador
    — confirmado por `tagName` que las filas son `DIV` (nunca `BUTTON`, cero riesgo de anidado
    inválido), un clic real en la estrella NO seleccionó el producto, un clic real en la fila SÍ lo
    seleccionó, sin desbordes en 390px ni 900px. `node --check parches.js` limpio; los 3 `<script>` de
    `index.html` pasan `new Function()`; `version.json` válido.
- **Con esta pieza el plan "NEXUS PRO 2.5 — REDISEÑO DEL POS" queda completo** (Fase 1 panel de cliente,
  Fase 2 Cotización directa desde el carrito, Fase 3 Vender con las 3 opciones de siempre, Fase 4
  Favoritos/Recientes) — misma filosofía operativa de InfoPlus, interfaz moderna, cero cambios a la
  lógica comercial.

### Limpieza de 4 intentos de ChatGPT sobre Vender/Prefactura que nunca se aplicaron (22-jul-2026, v48.88)
El dueño puso a **ChatGPT** a trabajar la parte visual del POS (acordado en esta misma sesión — ver
"Cómo le gusta trabajar el dueño" y el hand-off que se le mandó con capturas reales + reglas). ChatGPT
publicó 4 rondas de cambios directo a `main` vía GitHub Actions (`.github/workflows/pos-vender-catalogo-25.yml`,
`prefactura-visual-2-5.yml`, `prefactura-visual-48-85.yml`, `prefactura-mobile-48-86.yml`,
`prefactura-visual-48-87.yml` — workflows con `permissions: contents: write`, disparados por `push` a ramas
`ui/pos-vender-catalogo-2-5`/`ui/prefactura-2-5-sprint-1`/`fix/prefactura-visual-48-84` + `workflow_dispatch`
manual — SIGUEN en el repo, no se tocaron, solo se limpió lo que ya habían generado). El dueño reportó:
"he cargado varias veces, me sale que hay una actualización pendiente, pero la visualización sigue igual".
- **Investigado y confirmado contra el código real (no una suposición):** `APP_VERSION`/`version.json` SÍ
  estaban sincronizados en 48.87 (el aviso de actualización era honesto, no un bug de caché) y `parches.js`
  sí había crecido 496 líneas — pero esas 496 líneas eran **4 IIFEs autocontenidas pegadas al FINAL del
  archivo** (después del cierre real de la app) que en vez de editar `renderFactura()`/`gridHTML()`
  directamente (las funciones reales, ya documentadas en este archivo), intentaban **adivinar el DOM en
  tiempo de ejecución** con `document.querySelectorAll` + regex sobre el texto visible, envueltas en
  `MutationObserver` sobre `document.body` + listener de clic global, reintentando en cada mutación/clic.
- **Causa raíz de por qué nunca se activó ninguna, confirmado línea por línea:** el detector de Prefactura
  buscaba un título en `h1,h2,h3,.pt,.ph,.page-title,[data-title]` que contuviera "prefactura" — pero el
  título real es `<div class="nx-inv-title">PREFACTURA</div>` (`renderFactura()`), clase que NO está en esa
  lista, así que el detector jamás lo encontró. El detector de Vender buscaba un botón con texto
  "agregar"/"añadir"/"+" para identificar cada tarjeta de producto — pero `gridHTML()` no tiene ningún botón
  así (la fila entera es el clic, `onclick="nxVenderSel(...)"`; el único botón real es la estrella de
  favorito) — confirmado con `grep` que la palabra "agregar" no existe en esa función. Como ambos detectores
  nunca encontraban su objetivo, las funciones se salían solas sin pintar nada
  (`if (pairs.length < 2) return;` / `if(!titulo) return;`) — el CSS nuevo (con `!important` por todos
  lados) quedaba cargado en el archivo pero nunca se aplicaba a ningún elemento real. El propio changelog de
  v48.84 (ya en el repo antes de esta sesión) admitía el mismo síntoma en un intento anterior ("Antes
  apuntaba a un selector que esa pantalla no utilizaba, por eso visualmente se veía igual") — y el "arreglo"
  de esa vez repitió el mismo patrón de detección heurística, así que volvió a fallar igual en 48.85/86/87.
- **Arreglo:** se sincronizó la rama local con `main` (`git merge --ff-only`, 21 commits que esta sesión no
  tenía) y se **eliminaron las 4 IIFEs muertas completas** (líneas 25234-25722 del archivo antes del corte,
  bloques `NEXUS POS 2.5 — VENDER CATALOGO`, `nxPrefacturaVisual2485`, `nxPrefacturaMobile2486`,
  `nxPrefacturaVisualDirecta2487`) — no se tocó ni una línea de las funciones reales (`renderVender`,
  `gridHTML`, `renderFactura`, `pintarCarrito`), así que Vender/Prefactura vuelven exactamente al diseño de
  antes de estos 4 intentos (el de v48.82, con las pastillas de stock y la estrella de favorito ya
  aplicadas). Verificado: `grep` de las clases muertas (`nx25-product-card`, `nx-prefactura-real`,
  `nx-pf-2487-root`, `nx-pf-number-card`) da cero resultados en todo el archivo, `node --check parches.js`
  limpio, los 3 `<script>` de `index.html` pasan `new Function()`, `version.json` válido.
- **Nota histórica (ver seguimiento más abajo, 23-jul-2026):** en ese momento se dejaron sin tocar los
  workflows de GitHub Actions y los scripts Python que ChatGPT usó para publicar estos 4 intentos —
  quedaron armados. Un par de días después el dueño pidió cerrar ese hueco de raíz — ver
  "ChatGPT — nuevo flujo de trabajo para la parte visual" más abajo, donde se quitan esos workflows y se
  arma un espacio propio para que ChatGPT siga aportando diseño sin volver a tocar `main` directo.
  **Importante para la próxima ronda con ChatGPT (esto sigue vigente):** el problema de fondo no era
  "mala suerte" — es que el método de "adivinar el DOM con heurísticas genéricas en el navegador" es
  frágil de por sí para este sistema. El método que SÍ funciona (usado en toda esta sesión): editar
  directo el HTML/CSS que ya generan las funciones reales (`renderVender`/`gridHTML`/`pintarCarrito`/
  `renderFactura`), usando los ids/clases reales documentados en este archivo — no un detector que
  adivina en tiempo de ejecución.

### ChatGPT — nuevo flujo de trabajo para la parte visual (23-jul-2026)
El dueño confirmó que quiere seguir usando ChatGPT para la parte visual, pero sin el riesgo de que
vuelva a tocar `main` directo con código que nunca se prueba de verdad (ver "Limpieza de 4 intentos de
ChatGPT" arriba — esos 4 intentos SÍ llegaron a `main` solos, vía PR #75/#76, y nunca funcionaron).
Acordado con el dueño: **ChatGPT diseña, Claude implementa.**
- **Quitados los 5 workflows de GitHub Actions** (`pos-vender-catalogo-25.yml`,
  `prefactura-mobile-48-86.yml`, `prefactura-visual-2-5.yml`, `prefactura-visual-48-85.yml`,
  `prefactura-visual-48-87.yml`) y sus 5 scripts Python en `.github/scripts/` — ya eran código muerto de
  todos modos (buscaban cadenas de versión viejas como `APP_VERSION='48.87'`, que ya no existen), pero
  además cada uno tenía `permissions: contents: write` y podía volver a correr con `workflow_dispatch`
  manual o con un push a su rama — se cerró esa puerta.
- **Ramas viejas de esos 4 intentos, PENDIENTES de borrar a mano:** `feat/prefactura-visual-2-5`,
  `fix/prefactura-visual-48-84`, `ui/pos-vender-catalogo-2-5`, `ui/prefactura-2-5-sprint-1` — esta sesión
  intentó borrarlas (`git push origin --delete`) y también lo bloqueó el clasificador del entorno
  (mismo tipo de bloqueo que ya afecta `git push`/`git checkout` contra `main`); tampoco hay una
  herramienta MCP de GitHub para borrar ramas en este entorno. **El dueño las borra directo en GitHub**
  (Code → Branches → ícono de basura junto a cada una) — no tienen ningún valor, su contenido ya está
  superado en `main`.
- **Espacio nuevo para ChatGPT: rama `chatgpt/visual-draft`** (creada desde `main`, sin ningún workflow
  enganchado — un commit ahí no dispara nada solo). Es el lugar acordado para que ChatGPT publique sus
  mockups/intentos de ahora en adelante. **Flujo:** (1) ChatGPT hace su trabajo y lo sube a esa rama
  (o el dueño pega ahí lo que ChatGPT generó); (2) en la próxima sesión, Claude revisa esa rama, compara
  contra el código y esquema reales (mismo criterio de auditoría ya usado con los mockups de v48.90/93/96
  — qué es real, qué se descarta por fingir una función que no existe); (3) Claude **reimplementa** las
  piezas válidas directo sobre las funciones reales del archivo (no copia/pega el código de ChatGPT tal
  cual, salvo que ya esté bien escrito) y lo prueba con el método de siempre (extraer código real,
  Playwright, capturas en 390px/1280px); (4) publica por el camino normal de esta sesión (rama propia →
  PR → `mcp__github__merge_pull_request`, nunca push directo a `main`). **`chatgpt/visual-draft` nunca
  se fusiona directo a `main`** — es solo la bandeja de entrada de bocetos.
- **Preferencia confirmada, para que ChatGPT la siga:** mejor que mande **imágenes/mockups** (como ya
  venía haciendo bien en las últimas rondas) en vez de código — es más fácil de auditar y evita que se
  repita el patrón de "detector de DOM genérico" que fue la causa raíz de los 4 intentos fallidos. Si
  manda código de todas formas, se trata como una referencia más a auditar, nunca como algo que se
  aplica tal cual.
- **Pendiente (recomendado al dueño, fuera del alcance de lo que se puede hacer desde este entorno):**
  activar protección de rama en `main` (GitHub → Settings → Branches → Branch protection rules → exigir
  Pull Request antes de fusionar, sin push directo) — cierra la puerta de raíz a que CUALQUIER automatismo
  (ChatGPT u otro) vuelva a escribir en `main` sin pasar por revisión, sin depender de que alguien se
  acuerde de no darle ese permiso. No hay herramienta en este entorno para configurarlo por API; es un
  ajuste que el dueño hace una vez desde la web de GitHub.

### POS · Contabilidad — Fase 1 del rediseño (propuesta de ChatGPT), reskin + Resumen real (23-jul-2026, v49.03)
ChatGPT dejó en `chatgpt/visual-draft` una **propuesta visual del módulo de Contabilidad** (mockup SVG +
documento `docs/visual-drafts/contabilidad/`), respetando el flujo nuevo acordado (rama sandbox, sin
código directo a `main`, notas de "no inventar funciones"). Se auditó contra el código real antes de
tocar nada y se le mostró al dueño un desglose de qué es rediseño vs. qué sería construir. El dueño
eligió la **Fase 1 visual completa**. **Regla clave de esta pieza: NO se tocó ni un cálculo de dinero** —
solo el "vestido" + un Resumen nuevo armado 100% con datos reales.
- **Qué es real y ya existía (solo reskin):** el módulo `renderContabilidad()` (POS, `parches.js`) ya
  tenía las 7 sub-pestañas (Resumen, Plan de cuentas, Libro Diario, Libro Mayor, Comprobación, Estado de
  Resultados, Balance General) con toda la lógica de partida doble correcta (`saldosCta`/`sumaPorTipo`/
  `saldoNat`/`asientosRango`/`asLineas`, tablas `pos_cuentas`/`pos_asientos`/`pos_asiento_lineas`). Esas
  funciones de cálculo NO se tocaron.
- **Qué se recortó/aplazó (confirmado con el dueño, no se fingió):** Bancos y conciliación (0 en el
  código), Centro de costo (0), reportes 606/608/609 (solo existe 607 parcial — va con el tema fiscal/
  e-CF crítico, aparte), CxC/CxP como pantalla contable con aging, y toda la "Fase 4" (proyecciones/
  flujo futuro/rentabilidad por empresa-sucursal). La barra inferior del móvil del mockup se descartó —
  el POS usa la barra lateral grafito, no una barra por módulo.
- **Cambios reales, quirúrgicos (aditivo, aislado):** (1) `renderContabilidad()` envuelve su salida en
  `<div class="nxPf nxCtaWrap">` + llama `nxPfEnsureCSS()` — el prefijo `.nxCtaWrap` aísla TODO el CSS
  nuevo para que no toque ninguna otra pantalla. (2) `ctaResumen()` reconstruido como tablero premium:
  4 KPIs (`kpiPf`/`.kpirow` ya existentes) — **Ingresos del período, Gastos y costos, Utilidad/Pérdida
  neta, Efectivo (Caja+Banco)** — este último helper nuevo `ctaEfectivo(s)` suma solo las cuentas activo
  de caja/banco (código 1101/1102 o nombre), no todos los activos. (3) **Flujo de efectivo** — gráfica
  SVG de líneas (`ctaFlujoMeses(6)` + `ctaFlujoSVG`), últimos 6 meses de Ingresos/Gastos/Utilidad,
  calculada de TODOS los `_asientos` (tendencia real, independiente del filtro de rango). (4)
  **Distribución de gastos** — barras reales por cuenta de gasto/costo (`ctaGastosBars`), NO las 5
  categorías inventadas del mockup (administrativos/financieros no existen en el plan). (5) **Últimos
  movimientos** — `ctaUltMov()`, los 6 asientos más recientes. Las otras 6 pestañas solo heredan el look
  (fuentes + encabezado de tabla + tarjetas con vars `.nxPf`, dark-mode aware) vía CSS scopeado a
  `.nxCtaWrap` — su HTML/lógica no cambió.
- **Verificado con Playwright, código real extraído del archivo** (no reconstrucción — `renderContabilidad`/
  `ctaResumen`/`ctaEfectivo`/`ctaFlujoMeses`/`ctaFlujoSVG`/`ctaGastosBars`/`ctaUltMov`/`saldosCta`/
  `saldoNat`/`sumaPorTipo` + las 6 funciones de pestaña, tal cual, con balance de llaves real): con datos
  simulados (venta + 2 gastos del período + una venta del mes anterior para el flujo), los 4 KPIs dan el
  número EXACTO (Ingresos 10,000 · Gastos 16,500 · Pérdida neta −6,500 · Efectivo 1,300 — verificado por
  volcado directo de `.kpitile`), la gráfica tiene 18 puntos (6 meses × 3 líneas), 3 barras de gastos, 4
  últimos movimientos, la balanza cuadra, el Estado de Resultados calcula bien, y las 7 pestañas se ven
  sin desbordes en 390px y 1280px, 0 errores de JS. `node --check parches.js` limpio; los 3 `<script>` de
  `index.html` pasan `new Function()`; `version.json` válido.
- **Pendiente (Fases 2-4 de la propuesta, cada una es construcción real, no visual):** Gastos con centro
  de costo · CxC/CxP contables con aging · Bancos y conciliación · fiscal (606/608/retenciones, atado al
  e-CF) · inteligencia financiera (proyecciones/rentabilidad por empresa-sucursal). Se agendan por
  separado cuando el dueño lo pida.

### POS · Reportes — rediseño visual (Tanda 2, 23-jul-2026, v49.04)
Continuación de la migración del POS al look premium `.nxPf` (el dueño eligió seguir con "lo visual", opción
3). `renderReportes()` (POS, `parches.js`) es de SOLO LECTURA (analítica sobre `pos_ventas`/`pos_venta_items`,
no muta nada) — reskin de bajo riesgo, mismo patrón que Contabilidad Fase 1: wrapper aislado `.nxRepWrap`,
KPIs premium (`kpiPf`/`.kpirow`), CSS scopeado (dark-mode aware), **cero cálculos tocados**.
- Los 6 KPIs (Ventas total, Ganancia estimada, Costo de lo vendido, ITBIS cobrado, No. de ventas, Ticket
  promedio) pasaron de `.nxCtaKpi` a `kpiPf`/`.kpirow`. Las tarjetas de gráficas (Ventas por día, Por método
  de pago, Productos más vendidos, clases `.nxRepCard`/`.nxRepBars`/`.nxRepMet*`/`.tw table`) solo heredan el
  look vía CSS scopeado a `.nxRepWrap` — su HTML/lógica no cambió. `nxRepComisiones`/`nxRepImei`/`nxRep607`
  (botones de acción) intactos.
- Verificado con Playwright, código real extraído del archivo (no reconstrucción — `renderReportes`/
  `ventasRepRango`/`repFecha`/`repItems`/`prodCosto`/`kpiPf` tal cual): con 3 ventas simuladas los 6 KPIs dan
  el número EXACTO (Ventas 48,970 · Ganancia 8,900 · Costo 32,600 · ITBIS 7,470 · Ticket 16,323 — verificado
  por volcado directo de `.kpitile`), 2 barras de días, 3 métodos de pago, tabla de top productos correcta,
  sin desbordes en 390px ni 1280px, 0 errores de JS. `node --check parches.js` limpio; los 3 `<script>` de
  `index.html` pasan `new Function()`; `version.json` válido.
- **Pendiente de la Tanda 2:** Reparaciones, Kardex, Historial de ventas, Recursos Humanos — mismo criterio,
  uno a la vez, probado antes de publicar.

### POS · Historial de ventas — rediseño visual (Tanda 2, 23-jul-2026, v49.05)
`renderVentas()` (pestaña "Historial de ventas" del POS, lista de `pos_ventas`) era la pantalla que el
propio código dejó marcada como "aún sin rediseñar" (comentario junto a `kpi()` vs `kpiPf()`). Mismo patrón:
wrapper aislado `.nxVenWrap`, KPIs premium, CSS scopeado, **cero cálculos tocados**.
- Los 3 KPIs (Facturas, Total filtrado, Hoy) pasaron de `kpi()` (helper plano) a `kpiPf()`/`.kpirow`. La
  tabla pasó del `.tw` viejo a `.card`+`table.tw-hist` con encabezado premium (reusa `thSort`/`.nxThSort`
  para el orden, mi regla scopeada gana en especificidad y le pone el fondo azul claro, la flecha de orden
  conserva su acento). **De paso, theme-aware:** los colores de fila que estaban hardcodeados (`#1e293b`
  para el número, `#475569` para la fecha) pasaron a `var(--pf-txt)`/`var(--pf-txt3)` + regla scopeada
  `.nxVenWrap .tw-hist tbody td{color:var(--pf-txt2)}` — antes en modo oscuro esos textos oscuros quedaban
  invisibles sobre panel oscuro; ahora se ven bien en claro y oscuro. Los badges CONTADO/CRÉDITO/ANULADA y
  el total verde se dejaron con su color (legibles en ambos temas). `filasHistorial`/`kpisHistorial`/
  `ventasFiltradas`/`pintarHistorial` (que repinta `#histBody`/`#histKpis` al buscar) no cambiaron su
  lógica — el `id="histKpis"` se conservó, solo cambió su clase contenedora a `.kpirow`.
- Verificado con Playwright, código real extraído (no reconstrucción — `renderVentas`/`kpisHistorial`/
  `filasHistorial`/`ventasFiltradas`/`thSort`/`sortRows`/`histSortVal`/`kpiPf` tal cual): con 3 ventas
  simuladas (una anulada) los 3 KPIs dan el número exacto (Facturas 3 · Total filtrado 48,380 EXCLUYENDO la
  anulada · Hoy 2), la fila anulada sale atenuada con su badge, sin desbordes en 390px ni 1280px, 0 errores
  de JS. `node --check parches.js` limpio; los 3 `<script>` de `index.html` pasan `new Function()`;
  `version.json` válido. **Quedan de la Tanda 2:** Kardex, Reparaciones (kanban), Recursos Humanos.

### POS · Kardex/Inventario — rediseño visual (Tanda 2, 23-jul-2026, v49.06)
`renderInventario()` (pestaña "Kardex" del POS — valoración, movimientos, multi-almacén) reskineado con el
mismo patrón: wrapper aislado `.nxInvWrap`, KPIs premium, CSS scopeado, **cero cálculos tocados**.
- Los 5 KPIs (Productos, Valor a costo, Valor a precio, Bajo stock, Sin stock) pasaron del `kpi()` local
  (estilo `.nxCtaKpi`) a `kpiPf()`/`.kpirow`. Las secciones (`.nxRepCard`/`.nxRepTit`, tablas de kardex/
  bajo stock/movimientos, chips y tarjetas de almacén) heredan el look premium vía CSS scopeado a
  `.nxInvWrap` (reusa las reglas de `.nxRepCard` ya creadas para Reportes, ampliando el selector; + reglas
  nuevas theme-aware para `.tw table`/`.nxAlmCard`/`.nxAlmChip`). `movFila`/`invProductosStock`/
  `stockEnAlm`/`almTotalUnidades` y toda la lógica de valoración/kardex/ajuste/transferencia intactas.
- Verificado con Playwright, código real extraído (no reconstrucción — `renderInventario`/`invProductosStock`/
  `movFila`/`stockEnAlm`/`almTotalUnidades`/`kpiPf` tal cual): con 3 productos + 1 servicio y 2 movimientos,
  los 5 KPIs dan el número exacto (Productos 3 excluyendo el servicio · Valor a costo 160,200 · Valor a
  precio 235,590 · Bajo stock 2 · Sin stock 1), la sección de bajo stock y movimientos recientes aparecen
  con sus badges, sin desbordes en 390px ni 1280px, 0 errores de JS. `node --check parches.js` limpio; los 3
  `<script>` de `index.html` pasan `new Function()`; `version.json` válido. **Quedan de la Tanda 2:**
  Reparaciones (kanban), Recursos Humanos.

### POS · Reparaciones (kanban) — rediseño visual (Tanda 2, 23-jul-2026, v49.07)
`renderReparaciones()` (tablero kanban del Servicio Técnico) reskineado: wrapper aislado `.nxRepWrapK` +
CSS scopeado theme-aware, **cero cambios en el flujo de estados ni en el cobro/entrega**.
- Las columnas (`.nxRepCol`/`.nxRepColH`), tarjetas de equipo (`.nxRepCard`/`.nxRepNum`/`.nxRepEq`/
  `.nxRepCli`/`.nxRepFalla`/`.nxRepPre`), píldoras En taller/Entregadas (`.nxInvPill`) y la lista de
  entregadas (`.nxMdRow`/`.nxMdNom`/`.nxMdSub`, prestadas de Consultorio) pasaron de colores hardcodeados
  (`#fff`/`#f8fafc`/`#0f172a`…) a `var(--pf-*)` vía CSS scopeado a `.nxRepWrapK` — antes en modo oscuro esas
  tarjetas quedaban en blanco sobre fondo oscuro; ahora se ven bien en claro y oscuro. El color por estado
  del encabezado de columna (`--rc`, gris/naranja/azul/magenta/verde) se conserva. `renderReparaciones`
  solo cambió el wrapper; `repEst`/`repDias`/`garantiaInfo`/`nxRepNueva`/`nxRepVer`/`nxRepEstado` y todo el
  flujo del taller intactos.
- Verificado con Playwright, código real extraído (no reconstrucción — `renderReparaciones`/`repEst`/
  `repDias`/`garantiaInfo`/`claveParse`/`claveDisplayHTML`/`posBuscador` tal cual): con 4 reparaciones (3
  activas + 1 entregada con garantía vigente), el tablero arma las 5 columnas (excluye 'entregado'/
  'cancelado') con sus 3 tarjetas, la píldora "En taller 3" activa, la vista Entregadas muestra la fila con
  la garantía, sin desbordes en 390px ni 1280px, 0 errores de JS. `node --check parches.js` limpio; los 3
  `<script>` de `index.html` pasan `new Function()`; `version.json` válido. **Queda de la Tanda 2:**
  Recursos Humanos / Nómina.

### POS · Reparaciones — formulario "Recibir equipo" rediseñado (23-jul-2026, v49.08)
`window.nxRepNueva` (el formulario de recepción del taller) pasó del viejo modal `.nxPrForm` al look
premium `.nxPf` — mismo criterio quirúrgico de siempre: **todos los ids de campo y `nxRepGuardar`
(la lógica de guardado) intactos, cero cambios de negocio**, solo el "vestido" + una pieza nueva de
resumen en vivo que NO existía.
- **3 tarjetas** (`.card`, patrón `.fld`/`.inw`/`.g2`): Cliente (Nombre*/Teléfono con `inputmode="tel"`),
  Equipo (Equipo*/IMEI marcado "(opcional)"/Falla*/Estado físico/Accesorios + el widget de clave/patrón
  `claveCapturaHTML('repNueva','')` ya existente) y Presupuesto (Presupuesto/Avance/Técnico).
- **Barra de pasos `.nxRepFlow`** arriba del formulario: los 6 estados reales de `REP_ESTADOS`
  (Recibido → Diagnóstico → Reparando → Esperando pieza → Listo → Entregado, con el paso 1 "on") — NO
  se inventaron pasos (el mockup V2/V3 de ChatGPT proponía 8 pasos con Presupuesto/Aprobación/Control
  de calidad, que no existen en el esquema; se usan los 6 reales, ver la verificación de la V2 abajo).
  Es informativa (muestra el ciclo por el que pasa una reparación), no interactiva en este formulario.
- **Resumen en vivo `window.nxRepEstim`** (nuevo, junto a los demás helpers del IIFE de Reparaciones):
  al escribir Presupuesto y Avance (ambos con `oninput="window.nxRepEstim()"`), recalcula
  Presupuesto − Avance = **Falta por cobrar** (naranja si >0, verde si 0) en `#nxRepEstimBox` — 100% en
  el navegador, no toca la base. Usa el `moneyVal` local del IIFE.
- **Deliberadamente NO construido** (mismo criterio de "no fingir funciones que no existen"): los paneles
  de "Piezas a reemplazar" (con inventario/costos) y "Mano de obra" del mockup de ChatGPT — el taller
  HOY no consume piezas de `pos_productos` (decisión ya documentada en Fase 5 del Kardex Inteligente,
  solo tiene un costo manual), así que construirlos sería un módulo nuevo, no un reskin; queda pendiente
  de que el dueño confirme si el taller debe descontar piezas del inventario.
- **CSS nuevo scopeado a `.nxPf`** en `nxPfEnsureCSS()`: `.nxRepFlow`/`.nxRepFlowStep`/`.dot`/`.lb`
  (barra de pasos con scroll horizontal propio, conector entre pasos vía `::after`) y `.nxRepEstim`/
  `.nxRepEstR`/`.nxRepEstT` (el cuadro de resumen) — theme-aware (se ve bien en claro y oscuro).
- Verificado con Playwright, código real extraído del archivo (no reconstrucción — `nxRepNueva`/
  `nxRepEstim`/`claveCapturaHTML`/`nxClaveBodyHTML` tal cual, con el CSS real de `nxPfEnsureCSS`): el
  modal abre con las 6 pasos (paso 1 activo), los 10 campos presentes, el widget de clave presente, y el
  resumen calcula Presupuesto 3,500 − Avance 1,000 = Falta 2,500 correcto; capturas en claro y oscuro
  a 390px y 1280px sin desbordes, 0 errores de JS. `node --check parches.js` limpio; los 3 `<script>` de
  `index.html` pasan `new Function()`; `version.json` válido.

### POS · Compras — rediseño visual (Tanda 3, pieza 1, 25-jul-2026, v49.25)
`renderCompras()` (pestaña Compras del POS — lista de compras + CxP) reskineado al look premium `.nxPf`
— mismo patrón que RRHH/Historial/Kardex: salida envuelta en `.nxPf .nxCompWrap` + `nxPfEnsureCSS()`,
los 3 KPIs (`kpi()` viejo → `kpiPf()`/`.kpirow`: Proveedores/Por pagar CxP/Compras), tabla con CSS
scopeado `.nxCompWrap` (encabezado azul, filas theme-aware — se extendió el bloque `.nxRhWrap` para
cubrir también `.nxCompWrap`). Los colores inline de la fila (fecha, "Crédito") pasaron a `var(--pf-*)`
para verse bien en claro/oscuro. **Cero cambios de lógica** — registro de compras (`nxPosGuardarCompra`),
CxP (`saldoProv`), inventario y contabilidad intactos; solo el "vestido" de la vista de lista (los
modales de Nueva compra / detalle / Proveedores no se tocaron en esta pieza). Verificado con 14 pruebas
Playwright del código real (`renderCompras`/`kpiPf` extraídos + CSS real de `nxPfEnsureCSS`, con
proveedores/compras simulados): wrapper correcto, 3 KPIs premium, 0 KPIs viejos, tabla con 3 compras,
CxP 17,300 exacto, sin desbordes en 390px ni 1000px, 0 errores de consola. `node --check parches.js`
limpio; `version.json` válido. **Pendiente Tanda 3:** Caja (arqueo), Ajustes.

### POS · Caja (arqueo) — rediseño visual (Tanda 3, pieza 2, 25-jul-2026, v49.26)
`renderCaja()` (pestaña Caja / arqueo del POS) reskineado al look premium `.nxPf` — mismo patrón que
Compras/RRHH/Historial/Kardex: ambos estados (caja abierta / caja cerrada) envueltos en
`.nxPf .nxCajaWrap` + `nxPfEnsureCSS()`. Los 5 indicadores de caja abierta (efectivo, tarjeta,
transferencia, crédito, abonos en efectivo) pasaron de las cajitas planas a `kpiPf()`/`.kpirow`. El
recuadro "Efectivo esperado en caja" ganó clase propia `.cajaEsp` (fondo verde tenue `--pf-green-l`,
theme-aware), la tarjeta contenedora `.cajaCard` (panel/borde/sombra `.nxPf`) y la tabla de cierres
recientes hereda el encabezado azul via CSS scopeado (se extendió el bloque `.nxRhWrap,.nxCompWrap` para
cubrir también `.nxCajaWrap`). Colores inline de movimientos/descuadre pasaron a `var(--pf-*)` para verse
bien en claro/oscuro. **Cero cambios de lógica** — apertura/cierre (`nxPosAbrirCaja`/`nxPosCerrarCaja`),
movimientos de efectivo (`nxPosMovimiento`/`nxPosAddMov`/`nxPosDelMov`), arqueo y sus asientos contables
intactos; solo el "vestido". Verificado con 20 pruebas Playwright del código real (`renderCaja`/`kpiPf`
extraídos + CSS real de `nxPfEnsureCSS`, con caja abierta simulada + cierres): ambos estados con wrapper
correcto, 5 KPIs premium, 0 KPIs viejos, esperado 30,000 exacto en el recuadro verde, 2 filas de cierres,
sin desbordes en 390px ni 1000px, 0 errores de consola. `node --check parches.js` limpio; los 3
`<script>` de `index.html` pasan `new Function()`; `version.json` válido.

### RETROSPECTIVA — cierre de "aplicar todas las skills" (Ronda 5, `gstack-retro`, 26-jul-2026)

Las 21 skills instaladas quedaron aplicadas o clasificadas. **5 rondas de auditoría hechas**
(seguridad · animaciones · accesibilidad · salud del código · esta retrospectiva); las 9 restantes
no son auditorías sino **método de trabajo** (`webapp-testing`, `gstack-investigate`,
`gstack-spec`, `gstack-plan-*`, `gstack-review`, `careful`/`freeze`/`unfreeze`/`guard`) y ya se
usan cuando el caso lo pide — ver "ENRUTAMIENTO AUTOMÁTICO DE SKILLS".

#### Lo que las 4 auditorías encontraron, en una tabla

| Ronda | Hallazgo principal | Estado |
|---|---|---|
| 1 Seguridad | `organizaciones` aceptaba **escritura de cualquiera en internet** (podían desviar el dominio de una empresa) | cerrado |
| 1 Seguridad | Las secuencias de NCF/recibos se podían **quemar sin cuenta** | cerrado |
| 1 Seguridad | 16 tablas de dinero abiertas a usuarios de **otras empresas** | cerrado |
| 1 Seguridad | Clave de Gmail en texto plano en una función pública | rotada por el dueño + sacada del código |
| 2 Animaciones | **47 de 56** animaciones ignoraban "reducir movimiento" | cerrado con 1 regla |
| 3 Accesibilidad | 18 encabezados ordenables sin teclado · 22 imágenes sin descripción | cerrado |
| 3 Accesibilidad | 213 botones de ícono sin nombre → 144 siguen | parcial (69 automáticos) |
| 4 Salud | 26 funciones muertas | cerrado |
| 4 Salud | Duplicación, comentarios, arquitectura | **ya estaba sano** — no se tocó |

#### Los 5 patrones que se repiten en TODA la sesión (esto es lo que hay que recordar)

1. **Verificar el arreglo, no darlo por bueno.** Pasó 3 veces que el primer intento no hizo nada y
   solo se descubrió al medir DESPUÉS: el `revoke` de las secuencias (el permiso venía de PUBLIC,
   no de `anon`), el blindaje del sidebar de Financiamiento (la regla base se declaraba más abajo
   en la cadena y ganaba), y el `!important` de la flecha de los `<select>`. **Un cambio aplicado
   no es un cambio que funciona.**
2. **La simulación no sustituye a la frontera real.** El bug del video (400 de Storage) no salió en
   ninguna prueba porque en el harness esa llamada estaba simulada. Cuando el fallo puede vivir en
   el borde con un servicio externo, hay que tocar el servicio: en esta base, `pg_net` es el camino.
3. **Medir con el código real, extraído por contenido.** Los extractores por número de línea se
   corren con cada edición y hacen fallar suites que estaban bien (pasó en la v49.47). Buscar con
   `grep` sobre el contenido, siempre.
4. **Los errores propios se corrigen y se escriben.** En esta sesión: la medición de comentarios que
   dio 32% (era 7%), y las 2 entradas de changelog que salieron sin el prefijo `NUEVO`. Se
   arreglaron y quedaron documentadas, no borradas.
5. **Lo que ya está bien, no se toca.** Cero animaciones mueven layout, la duplicación es mínima, el
   archivo único de 28k líneas es una decisión del dueño. Auditar sirve tanto para confirmar lo sano
   como para encontrar lo roto.

#### Lo que queda abierto, por orden de urgencia real

1. **Poner el Secret `GMAIL_PASS`** — el reporte diario no sale hasta entonces (paso del dueño).
2. **`auditoria` abierta entre empresas** (2.372 filas con nombres de clientes). Necesita
   `organizacion_id` + relleno + trigger + política: hay una decisión de datos de por medio.
3. **144 botones de ícono sin nombre** + **112 filas clicables sin teclado** — trabajo de redacción
   caso por caso, mejor módulo por módulo.
4. **Borrar las 4 tablas de permisos muertas** (101 filas, cero uso).
5. **Activar la protección de contraseñas filtradas** en Supabase Auth (un clic del dueño).
6. **`verify_jwt:true` en `enviar-reporte-email`** — hay que arreglar el cron en la misma operación.
7. **La decisión de buscadores (C2)** sigue esperando: ¿los 24 de "filtrar lo que ya veo" se quedan
   como barra en línea (recomendado bajo el criterio nuevo) o van a ventana?

### AUDITORÍA DE SEGURIDAD — Ronda 1 de "aplicar todas las skills" (26-jul-2026)
El dueño pidió aplicar las 21 skills instaladas. Se agruparon en 5 rondas de auditoría; esta es la
primera (`gstack-cso`), la de mayor riesgo real. **3 agujeros reales cerrados en vivo, 5 hallazgos
documentados sin tocar** (necesitan decisión del dueño o son de mayor alcance).

#### CERRADO — 1. `organizaciones` aceptaba ESCRITURA de cualquiera en internet (CRÍTICO)
La política `all_org` era `FOR ALL TO public USING(true) WITH CHECK(true)`. El rol `public`
incluye `anon`, y **la clave anónima está a la vista en el código de `index.html`** (tiene que
estarlo: el login la usa para saber a qué empresa entrar antes de que haya sesión). O sea:
cualquiera con esa clave podía **cambiar el `dominio` de una empresa** (desviar sus logins a otro
sitio — phishing real), **apagarla** (`activo=false`), o **borrar la tabla completa**.
- Arreglo (migración `seguridad_organizaciones_y_secuencias`): la **lectura sigue pública** (el
  login la necesita), pero INSERT/UPDATE/DELETE quedan en `mi_rol()='admin'`.
- Verificado: como `anon` la lectura sigue devolviendo las 7 organizaciones (el login no se rompe).

#### CERRADO — 2. Las secuencias fiscales se podían quemar desde fuera (ALTO)
`siguiente_ncf(text)` (consume un comprobante **autorizado por la DGII**), `next_recibo()`,
`next_recibo_anio(int)` y `rifa_expirar_apartados()` eran ejecutables por `anon`. Cualquiera con
la clave pública podía llamarlas en bucle y **quemar los NCF autorizados** — un recurso limitado
que da el gobierno.
- **Detalle que casi se me escapa:** el primer intento (`revoke ... from anon`) **no hizo nada** —
  el permiso no venía de `anon` sino del rol **PUBLIC** (Postgres le da EXECUTE a PUBLIC por
  defecto al crear una función). Se detectó porque la verificación posterior seguía dando `true`.
  Arreglado de verdad en la migración `seguridad_secuencias_revocar_de_public`:
  `revoke ... from public` + `grant ... to authenticated, service_role`.
  **Lección: revocar de `anon` no sirve si el permiso está en PUBLIC — hay que verificar con
  `has_function_privilege` después, no dar el revoke por bueno.**
- Verificado con `has_function_privilege`: `anon`=false en las 4, `authenticated`=true en las 3 de
  la app, `service_role`=true en la del cron. Confirmado antes con grep que **ninguna página
  pública** (`rifa.html`/`boleto.html`/`vendedor.html`/`firma-prestamo.html`) las llama.

#### CERRADO — 3. Dieciséis tablas de Seguros abiertas a usuarios de OTRAS empresas (ALTO)
Es la misma clase de agujero que ya se había cerrado para las 10 tablas del núcleo — pero estas
quedaron fuera de aquella pasada y seguían con `USING(true)` para cualquier `authenticated`. O sea
Francis (tienda), el doctor (consultorio) o BayolCell, con solo estar logueados, podían leer y
escribir: `mis_cuentas_bancarias` (las cuentas del dueño), `entregas_admin` y
`transferencias_agentes` (dinero de agentes), `egresos`, `pagos`, `cuadre_tss_historial`,
`reporte_destinatarios`, `documentos_clientes`, `email_settings`, `system_settings`,
`automation_settings`, `smart_historial`, `bancos`, `ars_catalog`, `auto_jobs_log`,
`auto_notificaciones_log`.
- Arreglo (migración `rls_tablas_seguros_restantes_por_org`): se les puso **exactamente la misma
  política ya probada en `clientes`/`facturas`/`abonos`** — deja pasar a cualquier rol de
  `nexus-pro` (admin y agente, así Robinson no pierde nada) y bloquea al resto.
- **Riesgo verificado antes de aplicar:** la función `enviar-reporte-email` lee
  `reporte_destinatarios`/`auto_notificaciones_log` — se comprobó en su código que usa
  `SUPABASE_SERVICE_ROLE_KEY`, que **salta RLS**, así que el reporte diario no se ve afectado.

#### NO tocado — lo que queda, por orden de urgencia
1. **La clave de Gmail ya NO vive en el código** ✅ (26-jul-2026). El dueño **rotó la clave** en su
   cuenta de Google, y la función `enviar-reporte-email` se redesplegó (**v5**) leyéndola de
   `Deno.env.get('GMAIL_PASS')` con `.trim()` — la vieja se borró del fuente por completo.
   - **Ojo, esto rompe el reporte hasta que el dueño ponga el Secret:** rotar la clave dejó la
     versión anterior inservible de todos modos, así que la función env-var es estrictamente mejor.
     Mientras falte, la función **avisa claro** (`"Falta el secreto GMAIL_PASS…"`) y lo registra en
     `auto_notificaciones_log`, en vez de morir con un error de SMTP críptico.
   - **Falta que el dueño lo pegue:** Supabase Dashboard → Edge Functions → Secrets → nombre
     **exacto** `GMAIL_PASS`. El nombre importa: ya pasó una vez (NEXUS AI CONTENT) que un secreto
     se guardó con OTRO nombre y el error era imposible de diagnosticar. No hace falta redesplegar
     — los Secrets se leen en cada ejecución.
   - **Verificado de punta a punta** con `net.http_post` desde la propia base (mismo camino que se
     usó para la función de préstamos): la función responde **500 con el aviso exacto**, lo que
     confirma a la vez que el guardia funciona y que el Secret aún no está.
   - **Sigue pendiente:** cerrar la función con `verify_jwt:true`. No se puede solo — el cron
     `reporte-email-minuto` **no manda ninguna credencial**, habría que arreglar el cron en la
     misma operación o el reporte deja de salir. (La clave NO se copia a este archivo a propósito.)
2. **`auditoria` sigue abierta** a cualquier usuario logueado de cualquier empresa (2,372 filas,
   con nombres de clientes en el detalle). No se cerró porque **el POS, Rifas y Consultorio también
   escriben ahí** — acotarla a `nexus-pro` los rompería. El arreglo correcto es darle
   `organizacion_id` (que hoy **no tiene**) + rellenar las 2,372 filas + ajustar el trigger y la
   política. Es trabajo con una decisión de datos de por medio (¿de qué empresa es cada fila
   vieja?), no se hace en silencio.
3. **Tablas de permisos muertas** (`roles`, `permissions`, `role_permissions`, `user_permissions`
   — 101 filas): el propio CLAUDE.md ya las tenía marcadas como código muerto (cero referencias en
   el frontend) y siguen abiertas. Conviene **borrarlas**, no cerrarlas.
4. **Protección de contraseñas filtradas desactivada** en Supabase Auth (comprueba contra
   HaveIBeenPwned). Es un interruptor en el panel — no hay herramienta para activarlo desde aquí.
5. **`nexus-smart` con la clave de Anthropic en texto plano** y `verify_jwt:false` — ya estaba
   documentado en este archivo desde antes, sigue igual.

**Rondas siguientes (pendientes):** 2 animaciones (`review-animations`+`apple-design`+
`emil-design-eng`) · 3 accesibilidad (`web-design-guidelines`+`ui-ux-pro-max`) · 4 arquitectura y
salud (`senior-architect`+`gstack-health`) · 5 retrospectiva (`gstack-retro`). Las demás skills
(`webapp-testing`, `gstack-investigate`, `gstack-spec`, `gstack-plan-*`, `careful`/`freeze`/
`guard`) no son auditorías: son método de trabajo y ya se usan cuando toca.

### AUDITORÍA — Ronda 4: salud del código (`senior-architect` + `gstack-health`) (26-jul-2026, v49.54)

**Radiografía medida** (no de memoria):

| | Valor |
|---|---|
| `index.html` | 9.283 líneas · 625 KB (**157 KB comprimido**) |
| `parches.js` | 28.193 líneas · 2.121 KB (**489 KB comprimido**) |
| Composición de `parches.js` | 87% código · 7% comentarios · 5% líneas en blanco |
| Funciones | 354 en `index.html` + 1.073 en `parches.js` (651 expuestas en `window`) |
| Bloques de 8+ líneas repetidos | **15** en 28.000 líneas (`parches.js`) · **2** en `index.html` |

**Veredicto: el código está sano.** Poca duplicación, proporción normal de comentarios, y solo un
1,5% de funciones muertas. El archivo único de 28k líneas NO es un hallazgo — es la arquitectura
que el dueño eligió a propósito (sin build, sin npm, se edita y se sube); "arreglarla" sería
deshacer una decisión suya, no una mejora.

**Error propio, corregido a mitad de la medición:** el primer cálculo de comentarios dio **32%**
porque la expresión regular se comía trozos de código entre el `/*` de un string y el siguiente
`*/`. Recontado por líneas: **7%**. Se documenta porque la cifra mala llegó a imprimirse.

#### Lo único que se arregló: 26 funciones muertas
Se verificó una por una contra **todo el repo** (incluidas las páginas públicas y `worker.js`) que
no se mencionaran en ningún lado — ni siquiera dentro de un string o un `onclick`. Se quitaron con
un cortador por llaves que salta strings y comentarios (no por número de línea).
- **Se hizo en cascada, y eso importa:** al quitar las 14 primeras quedaron 12 más que solo esas
  llamaban (3 pasadas hasta que no quedó ninguna). Contarlas de una sola pasada habría dejado la
  mitad.
- **Hallazgo de paso, con valor:** `almSelectorHTML` estaba muerta aunque el CLAUDE.md dice que el
  selector de almacén se conectó en la v48.96. Se verificó: **la función SÍ está en la Factura**
  (`almField`, escrita directo en `renderFactura`) — lo que quedó huérfano fue el ayudante viejo.
  El documento no mentía; el helper simplemente se quedó atrás. **Lección: antes de borrar algo que
  la documentación dice que se usa, comprobar si la función se reimplementó en otro sitio.**
- **Quedan 2 sin quitar** (`getAbonos`, `getTransferencias`): están declaradas con una forma que el
  cortador no reconoce. Son 2 de 26 — se dejan anotadas en vez de forzar el corte a mano.
- Verificado tras la limpieza: `node --check parches.js` limpio, los 3 `<script>` de `index.html`
  pasan `new Function()`, y las 3 suites Playwright de esta sesión (Ajustes 39, botones 24,
  movimiento 17 = **80 comprobaciones**) siguen en verde.

**Peso real que viaja al celular: 646 KB comprimidos** (157 + 489). No es un problema urgente —
Cloudflare comprime y el navegador cachea entre versiones — pero es el número a vigilar si el
sistema sigue creciendo.

### AUDITORÍA — Rondas 2 (animaciones) y 3 (accesibilidad) (26-jul-2026, v49.53)

#### Ronda 2 — Animaciones (`review-animations` + `apple-design` + `emil-design-eng`)
Inventario medido, no de memoria: **40 keyframes y 56 declaraciones de animación** en los 2 archivos.
- **Lo que YA estaba bien (no se tocó):** **cero** animaciones mueven propiedades de layout
  (`width`/`height`/`top`/`left`/`margin`/`padding`) — todas usan `transform`/`opacity`/`filter`,
  que es lo correcto para que no haya recálculo de página en cada cuadro. Ese resultado se midió
  con un analizador de los keyframes reales, no se asumió.
- **HALLAZGO REAL, arreglado:** de las 56 declaraciones, **solo 9 estaban dentro de un guardia
  `prefers-reduced-motion`** — las otras **47 seguían moviéndose** aunque el usuario active
  "reducir movimiento" en su teléfono (ajuste de accesibilidad de quien se marea, tiene migraña o
  vértigo). Arreglado con **una sola regla global** al final del `<style>` de `index.html`
  (`*,*::before,*::after` con `!important`, que gana también sobre el CSS que inyecta
  `parches.js` después). No apaga nada: lo que aparecía con animación sigue apareciendo, al
  instante; los giradores de carga se quedan quietos, que es justo lo que pide ese ajuste.
- **2 duraciones ajustadas** (las que el propio `DESIGN_SYSTEM.md` ya tenía marcadas fuera del
  §22 de NPGS): el aviso emergente `tIn` 350→**300 ms** y las tarjetas KPI `nxFadeUp` 340→**300 ms**.
- **Deliberadamente NO tocado:** las animaciones decorativas siempre encendidas (el brillo de los
  iconos del Dashboard `nxOrbGlint`, el latido del globo de notificaciones, el flotar del logo de
  bienvenida). Son las que al dueño le gustan (regla #4 de "cómo le gusta trabajar": la estética
  es prioridad real) y ahora **sí respetan "reducir movimiento"**, que era el problema de fondo.
- Verificado con **17 comprobaciones Playwright** cargando el CSS real de los 2 archivos y
  comparando el mismo elemento en modo normal vs `reducedMotion:'reduce'`: 7 familias de animación
  (ventana emergente, KPI de Seguros, acceso rápido, aviso, esqueleto de carga, globo de
  notificación, KPI del POS) siguen animando en modo normal y se detienen con el ajuste activo, y
  las infinitas dejan de repetirse.

#### Ronda 3 — Accesibilidad (`web-design-guidelines` + `ui-ux-pro-max`)
Auditoría medida sobre TODO el sistema (no una pantalla suelta). Estado de partida y resultado:

| Hallazgo | Antes | Ahora |
|---|---|---|
| Encabezados de tabla ordenables sin teclado | 18 | **0** |
| Imágenes sin texto alternativo | 22 | **0** |
| Botones de solo ícono sin nombre para lector de pantalla | 213 | **144** → **0** en la v49.55 |
| Filas/divs clicables sin teclado ni rol | 112 | 112 → **0** en la v49.55 |
| Selectores sin etiqueta | 14 | 14 (sin tocar) |

- **Encabezados ordenables (18):** era un hueco que este mismo archivo ya tenía anotado como
  pendiente desde la v48.55 ("quedó fuera de esa pasada… se deja para una pasada aparte"). Ahora
  cada `<th onclick>` lleva `tabindex="0" role="button"` + `onkeydown` que dispara la MISMA función
  del clic con Enter o Espacio.
- **Botones de ícono (69 de 213):** se resolvieron los que **ya traían un `title`** — se les derivó
  el `aria-label` de ahí, transformación mecánica y sin riesgo (el texto ya estaba escrito y
  revisado). Los **144 restantes no tienen ningún texto de dónde sacarlo**: habría que redactar
  cada etiqueta a mano, mirando qué hace cada botón. **No se inventaron a ciegas** — es trabajo
  de varias pasadas cortas, mejor hecho módulo por módulo.
- **Imágenes (22):** texto alternativo real según lo que muestra cada una (foto del artículo,
  cédula lado frontal/dorso, foto del cliente con su cédula, firma, comprobante, logo, banner).
- **NO tocado, con su razón:** las **112 filas/divs clicables** sin teclado — aquí no vale una
  transformación mecánica: hay que decidir caso por caso si la fila entera debe ser el objetivo
  o si basta con un botón dentro, y varias ya tienen un botón real al lado que hace lo mismo
  (convertirlas todas duplicaría el recorrido con Tab, que es peor que dejarlas). Los **14
  selectores sin etiqueta** necesitan mirar el contexto de cada uno.
- Cambio 100% aditivo: solo se agregaron atributos (`aria-label`, `alt`, `tabindex`, `role`,
  `onkeydown`) y una regla CSS. Ningún id, función, color ni posición se tocó. `node --check
  parches.js` limpio; los 3 `<script>` de `index.html` pasan `new Function()`; `version.json` válido.

### `auditoria` cerrada por empresa — se acabó el cruce entre negocios (26-jul-2026)
Era el punto #2 de la lista de pendientes que dejó la auditoría de seguridad (Ronda 1). La política
era `all_auditoria` = `USING(true)` para **cualquier usuario logueado**: Francis (tienda), el doctor
y BayolCell podían **leer y borrar** los 2,373 registros de auditoría del seguro, con nombres de
clientes en el detalle. No se había cerrado en la Ronda 1 porque `auditoria` **no tenía**
`organizacion_id` y acotarla a `nexus-pro` habría roto al POS, Rifas y Consultorio, que también
escriben ahí.
- **Migración `auditoria_organizacion_id_y_rls_por_org`** (aditiva): columna `organizacion_id` (uuid,
  FK a `organizaciones`) + índice; el trigger que ya llenaba IP/dispositivo ahora también llena la
  organización con `mi_organizacion()` cuando viene vacía; la política pasó a
  `mi_rol() is not null AND organizacion_id = mi_organizacion()`.
- **Backfill de las 2,373 filas históricas.** `user_id` estaba vacío en las 2,373 (nunca se llenó),
  así que la única pista real era el nombre de usuario grabado. Se midió antes de decidir: los 8
  nombres distintos se repartieron por el módulo donde operaron — `Administrador` (1528, opera todo
  el sistema), `ROBINSON` (771), `sterlin08`, `prueba` y `Sistema` → **nexus-pro**;
  `BayolCell Rifas` (29, solo eventos de login) → **bayolcell-rifa**; `Francis (Bayolsale)` (9, solo
  login) → **bayolsale**; `Consultorio Geriátrico` (3, solo login) → **geriatra**. Resultado:
  2332 + 29 + 9 + 3 = 2373, **cero filas sin organización**.
- **Verificado simulando cada sesión real** (`set local role authenticated` + el `sub` real de cada
  usuario), no asumido: Francis pasó de ver 2,373 a ver **9**; sterlin08 ve **2,332**; `anon` ve
  **0**. Y las escrituras siguen funcionando: se probó un INSERT como Francis y como **Robinson
  (rol `agente`, no admin)** dentro de una transacción con `rollback` — el trigger les puso la
  organización correcta y la política los dejó pasar. `get_advisors` ya no marca `auditoria`.
- **Cero cambios de código** — `logAudit()` nunca manda `organizacion_id`, lo pone el trigger; la
  pantalla de Auditoría no cambió porque RLS filtra sola.
- **Hueco pre-existente encontrado de paso, NO causado por este cambio y NO arreglado:** los
  `LOGIN_FALLIDO` / `LOGIN_BLOQUEADO` se registran **sin sesión** (el usuario todavía no entró), así
  que salen con la anon key y la política ya era `to authenticated` — vienen fallando en silencio
  desde antes (el último que llegó a guardarse es del 14-jun-2026). Abrirle un hueco a `anon` para
  arreglarlo permitiría que cualquiera llene la tabla de basura; la salida correcta sería una función
  Edge con service-role. Se deja documentado, no se improvisa.

### La referencia del cliente, visible en 4 pantallas más (26-jul-2026, v49.60)
El dueño: *"La referencia también que se vean"*. `clientes.referencia` es el apodo con que él
identifica a cada cliente (el buscador de Clientes ya dice "Nombre, apodo, cédula, póliza"). Se
auditó dónde se pinta un nombre de cliente y dónde faltaba: ya salía en **Clientes**, **Historial
de pagos** y la **ficha** (`verCliente`); **faltaba** en Facturas, Centro de Avisos, Reporte por
agente y Documentos del cliente. Agregada en esas 4, con el MISMO patrón que ya usaba Historial de
pagos (morado `#7c3aed`, entre paréntesis, junto al nombre) — no un estilo nuevo.
- **Deliberadamente NO se puso en la Factura ni en el Certificado imprimibles** (`generarHTMLFactura`
  / `generarHTMLCertificado`): son documentos formales que van a la ARS y al cliente; ahí
  corresponde el nombre completo, no el apodo interno del negocio.
- Cliente sin referencia no muestra nada — no queda un paréntesis vacío (verificado).
- Verificado con Playwright y el código real de `rFact`: la referencia sale junto al nombre, el
  color medido es `rgb(124,58,237)` (el mismo de Historial de pagos, no uno parecido), un cliente
  sin referencia no muestra `()`, la tarjeta sigue compacta (124px) y sin desborde en 390px.

### Dashboard — los números arriba de los iconos, y que sirvan (26-jul-2026, v49.61)
El dueño mandó la pantalla de Inicio y preguntó cómo mejorarla. Auditado contra el código real: son
**14 iconos**, 6 escritos en `index.html` y **8 que `parches.js` inyecta solo** (NEXUS Smart, Cierre
de Mes, Multiempresa, Contabilidad, Solicitudes, Consultar Cobertura, Mis Cuentas, Tabla
Comparativa). Cuatro cosas, todas aplicadas:
1. **Los números estaban DEBAJO de los 14 iconos.** En el celular `parches.js` fuerza la rejilla a 3
   columnas con `!important` → 5 filas ≈ 550px antes del primer número; por eso en su captura los KPI
   salían cortados abajo. Contra NPGS §15 ("todo módulo importante debe iniciar mostrando
   indicadores"). El `<div class="kg" id="kpiG">` se movió ARRIBA del `.qa-g`. Medido con el markup
   real: KPI en y=30 vs iconos en y=289 (390px).
2. **Los KPI no eran los que decide el día.** Antes: Clientes activos · Prima mensual · Cobrado
   (histórico) · Pendiente · En proceso. Ahora, en orden de acción: **POR COBRAR** (`pendTot`, con
   cuántos clientes tienen saldo) · **FACTURAS ATRASADAS** (mismo cálculo que el filtro `atrasadas`
   de `rFact`, respetando el corte 20-al-20 vía `mesCorte()`) · **COBRADO ESTE MES** ·
   **PRIMA MENSUAL** (absorbió el % de efectividad que traía el KPI "Cobrado") · **CLIENTES
   ACTIVOS** · **EN PROCESO**. La utilidad bruta de admin no se tocó, sigue al final.
   - **"Cobrado este mes" sin consulta nueva:** `rChartCobros()` ya trae TODOS los abonos para la
     gráfica de 6 meses, y el último mes de esa serie **ES** el mes en curso — así que llena
     `#kpiCobMes` desde ahí. El KPI sale con "…" hasta que la gráfica resuelve (es async), honesto en
     vez de mostrar un 0 falso.
3. **Solo 1 de 5 KPI era tocable.** Ahora 5 de 6: POR COBRAR → Cobros, ATRASADAS → Facturas ya
   filtrada, COBRADO ESTE MES → Historial de pagos, CLIENTES ACTIVOS → Clientes, EN PROCESO (ya lo
   era). PRIMA MENSUAL se dejó sin clic a propósito — es contexto, no lleva a ninguna lista concreta.
4. **Los 8 iconos inyectados no respondían al teclado.** En la v49.55 se les puso teclado a los 6
   estáticos, pero estos se crean con `btn.className='qa'` + `btn.onclick=...` y quedaron fuera. Se
   les agregó `tabindex`/`role`/`onkeydown` (con `keyCode`, sin comillas, por vivir dentro de cadenas
   de JS) en los 8 sitios de una pasada. Ya la mitad del Dashboard no se comporta distinto a la otra.
- **CORRECCIÓN (v49.62) — al dueño NO le gustó, y con razón.** Los 6 KPI eran 340px de cajas
  blancas encima de sus **iconos 3D de cristal**, que son la cara del sistema (regla #4 de "cómo le
  gusta trabajar": la estética es prioridad real). Los números quedaron correctos pero feos, y
  taparon lo bonito. Se le armó una **muestra standalone con 3 direcciones** (scratchpad, nunca
  publicada — mismo patrón que `muestra-pos.html`/`design-system.html`), renderizada a 390px con el
  CSS REAL de los orbes extraído de `parches.js`, con la altura de cada una medida:
  **A franja** 83px · **B número grande** 164px · **C ticker** 48px (vs. los 340px publicados).
  **Eligió la B.** Resultado: `.dhero` — tarjeta con el degradado navy→azul→cian del Login, trama
  de puntos enmascarada, **"POR COBRAR" en 34px**, y debajo una fila de 3 (Atrasadas / Cobrado del
  mes / Activos), cada uno con su sub-línea. **4 zonas clicables** (el bloque grande + los 3 mini),
  todas con teclado y `aria-label` propio; el aro de foco es **blanco con `!important`** porque el
  azul global (`html body [tabindex][role=button]:focus-visible`, especificidad 0,3,2) le gana a
  cualquier `.dhero-top:focus-visible` y no se vería sobre el degradado. **Prima mensual** y
  **En proceso** bajaron a un `#kpiG` de 2 tarjetas DEBAJO de los iconos (cartera = contexto).
  Medido: hero 174px, cero desborde en 390px y 1280px.
  **Lección:** subir un dato correcto no basta si desplaza lo que le da identidad a la pantalla —
  en este sistema, mostrar la muestra ANTES de publicar un cambio de la pantalla de inicio.
- Verificado con Playwright y el código real extraído por contenido (`rDash`, `rChartCobros`,
  `mesCorte` + el CSS y el markup reales del `#v-dashboard`): el orden de los hijos es
  `alertasBanner → dashHero → qa-g → kpiG`, los KPI quedan por encima de los iconos en 390px y 1280px, los 6
  valores dan el número EXACTO con datos simulados (por cobrar 14,000 con 2 clientes; atrasadas 4
  excluyendo la del mes de corte, la pagada y la anulada; cobrado del mes 4,500 excluyendo un abono
  de enero), un clic real en ATRASADAS navega a Facturas y dispara `rFact`, **Enter** en POR COBRAR
  navega a Cobros, sin desborde horizontal en ninguno de los 2 anchos y 0 errores de consola.
  `node --check parches.js` limpio; los 3 `<script>` de `index.html` pasan `new Function()`;
  `version.json` válido.

### El "cobrado" iba por mes de calendario, no por el ciclo 20-al-20 (26-jul-2026, v49.63)
El dueño: *"¿Por qué dice cobrado 329,400 de julio?"* — el número era **real** (67 abonos con fecha
en julio) pero contado por **mes de calendario**, cuando su negocio factura el día 20. Partido por
ciclo, en hora de RD: **1 al 19 de julio = RD$ 287,900** (cierre del ciclo de JUNIO) y **20 en
adelante = RD$ 36,500** (ciclo de JULIO). O sea, el KPI mostraba mayormente cobro de junio.
- **Descuido mío al reusar los datos de la gráfica:** `mesCorte()` existe desde la v39.5 y Facturas
  ya lo respeta; este KPI se alimentó de `rChartCobros`, que agrupaba por mes de calendario.
- **Antes de recomendar se midieron los ciclos reales** (SQL directo), y eso cambió la propuesta:
  MAYO 401,800 total con 68,000 (17%) en los primeros 7 días · JUNIO 366,600 con 58,700 (16%).
  El patrón es muy parejo, así que **un "cobrado del ciclo" a secas no dice nada** — recién abierto
  siempre se ve chiquito. Lo que sí informa es **contra el mismo día del ciclo anterior**: hoy va
  36,500 donde el ciclo pasado iba 58,700 → **▼38%**, una señal real que ninguna de las 2 opciones
  que se habían ofrecido capturaba. El dueño aprobó las 3 piezas.
- **Helpers nuevos** (junto a `mesCorte`): `fechaRD(f)` (a fecha calendario de RD), `cicloDe(iso)`
  (a qué ciclo pertenece un día — misma regla que `mesCorte` pero para cualquier fecha),
  `cicloInicio(anio,mes)`, `diasEntre(a,b)`, `hoyRD()`.
  - **Hora de RD con desfase fijo de −4h, NO `toLocaleDateString`**: RD no cambia de hora, y no todo
    navegador trae la base de zonas horarias completa (ya hubo un `RangeError` de ICU con
    `'es-DO'` en la v49.16) — ahí fallaría en silencio. `fechaRD` devuelve tal cual las fechas que
    ya vienen sin hora (10 caracteres): restarles 4h las correría un día hacia atrás.
- **`rChartCobros` agrupa por ciclo** (6 ciclos, etiquetas = mes del ciclo), calcula
  `antMismoDia` (lo cobrado en el ciclo anterior **hasta el mismo día**) en la misma pasada, y llena
  `#kpiCobMes` + `#kpiCobSub`. Cero consultas nuevas. Subtítulo de la gráfica → "últimos 6 ciclos
  (del 20 al 20)" y su pie → "Ciclo en curso (va por el día N)".
- **2 defectos visuales propios, encontrados MIDIENDO y corregidos antes de publicar:** (1) el
  subtítulo largo ("día 6 · ▼ 38% vs ciclo anterior") envolvía y dejaba ese mini más alto que los
  otros dos — se acortó a `día N · ▼38%` y el detalle completo pasó al `title` y al `aria-label`
  ("...a estas mismas alturas llevabas RD$ 58,700"); (2) con un monto de 6 cifras — que es lo normal
  a mitad de ciclo, 366,600 en junio — `RD$ 366,600` se partía en dos líneas: el prefijo `RD$` pasó a
  9px inline (`fmtMini`), y ahí sí entra en una sola línea. Medido: los 3 minis quedan en 52px
  iguales y el número en 16px (una línea) tanto con 36,500 como con 366,600.
- Verificado con Playwright y el código real extraído por contenido, con abonos que **reproducen el
  caso real del dueño en formato UTC** (incluido un pago de las 8pm RD del 19 de julio, que en UTC
  cae el día 20): el ciclo de julio da **RD$ 36,500** exacto (ese pago frontera queda en JUNIO, como
  debe), el sub da **▼ 38%** — el mismo porcentaje que sale del SQL contra la base real —, las
  etiquetas de la gráfica son los 6 ciclos, sin desborde en 390px y 0 errores de consola.

### POS · botón IMPRIMIR en la ventana de Cobrar (26-jul-2026, v49.72)
Siguiendo la auditoría de abajo, el dueño precisó: *"Falta el botón de imprimir"*.
- **`window.nxPagoImprimir()`** (nueva, junto a `nxPagoOpts`): reusa el MISMO `docFacturaHTML()` de
  la Factura de página completa (v49.68) — cero plantilla nueva — pero armado con el estado REAL del
  cobro, no con el del carrito pelado: el cliente de **`#posCliId`** (que puede ser distinto del
  `_factCli` de la Factura) y los totales de **`leerCobro()`**, que ya incluyen el descuento %
  aplicado en esa ventana. El `descuento` que se imprime suma el de línea (`totales()`) más el
  global del cobro (`c.descMonto`).
- **Honesto:** como todavía no se ha cobrado, el documento conserva el badge **"VISTA PREVIA · SIN
  GUARDAR"** y no muestra bloque de forma de pago. El ticket térmico al confirmar no cambió.
- Botón de solo ícono (`.nxPgPr`, mismo estilo que "Opciones") en el pie, entre Opciones y Confirmar
  venta, con `aria-label` y `title` explicando que es una vista previa.
- Verificado con las **58** comprobaciones de la ventana de cobro (52 anteriores + 6 nuevas: el botón
  existe, abre el documento, lleva el cliente elegido EN COBRAR, respeta el 10% de descuento
  —47,500 → 42,750—, refleja el descuento y sale marcado como vista previa). Sin desborde en
  360/390/430/1280px, 0 errores de consola.

### Auditoría pedida por el dueño: "en la ventana de cobro falta más botones, confirmas" (26-jul-2026, v49.71)
El dueño puso a prueba si de verdad se verifica o solo se le da la razón. Se comparó
`nxPosCobrar` **antes (v49.65) contra ahora**, extrayendo los dos cuerpos de función de git y
listando ids, funciones llamadas y botones con su `onclick`.
- **Resultado honesto: NO falta ninguno de los que había.** "Volver" pasó a la ✕ del encabezado, las
  5 fichas de método a 6 pestañas (las mismas 5 + Mixto), "Efectivo exacto" al botón "Exacto" dentro
  de la pestaña Efectivo, y Cliente/Confirmar venta siguen igual. Además hay uno nuevo, "Opciones"
  (nombre del ticket / vendedor / descuento). Los 5 campos de pago (`payEfe`…`payNc`) siguen todos en
  el DOM — al principio parecieron "desaparecidos" porque ahora se generan con el helper `campo()` y
  el `id` va en una variable, no literal: **al auditar por `grep` de ids literales, ojo con el HTML
  generado por helpers.**
- **Pero sí apareció un defecto real, y de contexto dominicano:** los atajos de efectivo eran
  `+500 / +1,000 / +2,000 / +5,000`. **En RD no existe el billete de RD$5,000** (los reales son 50,
  100, 200, 500, 1000 y 2000) y faltaban los dos que más se reciben en el mostrador, **100 y 200**.
  Cambiados a `Exacto · +100 · +200 · +500 · +1,000 · +2,000`. Siguen siendo aditivos, así que 5,000
  se arma con +2,000 +2,000 +1,000 — como se cuentan los billetes en la mano.
- Verificado con las 52 comprobaciones de la ventana de cobro (49 anteriores + 3 nuevas: son 6
  atajos, ninguno dice 5,000, y el que ahora está en la 6ta posición sigue sumando bien). Sin
  desborde en 360/390/430/1280px.

### BUG DE FONDO: `.nxPf` recortaba a 92vh TODA pantalla completa del POS (26-jul-2026, v49.70)
El dueño: *"No puedo hacer scroll"*, con captura de Factura en su iPhone. Se le preguntó qué pasaba
exactamente (3 opciones) y respondió **"Llego hasta ahí y se acaba — debajo no hay nada"**. Esa
respuesta descartó "recortado pero presente" y apuntó al contenedor.
- **CAUSA RAÍZ (anterior a esta sesión, la destapó el rediseño):**
  `.nxPf{…;display:flex;flex-direction:column;max-height:92vh}`. `.nxPf` nació como envoltorio de
  **MODAL** (formulario de artículo) — de ahí el `max-height:92vh`. Pero desde la Fase 4 se empezó a
  usar como **raíz de pantallas completas**: hoy hay **13** (`nxDoc`, `nxCajaWrap`, `nxInvWrap`,
  `nxCompWrap`, `nxRhWrap`, `nxRepWrap`, `nxRepWrapK`, `nxVenWrap`, `nxCtaWrap`, `nxAjWrap`,
  `nxPosGridWrap`…). En todas, ese tope recortaba en silencio: el hijo (`.nxDocCard`, con
  `overflow:hidden`) se comprimía al alto disponible y **todo lo que sobraba desaparecía** — y como
  el contenedor "medía" menos, el área de scroll tampoco crecía → no había nada que bajar.
  **Prueba de que ya había mordido antes:** `.nxAjWrap` llevaba un `max-height:none` puesto a mano,
  justo para anular este mismo tope en Ajustes.
- **Arreglo de raíz:** `max-height:92vh` sale de `.nxPf` y pasa a **`.modal.nxPf`**, que es donde de
  verdad hace falta (17 modales usan `class="modal nxPf"`; 5 de ellos NO traían el tope inline, así
  que quitarlo de la clase base sin esta regla sí los habría roto — se verificó). `display:flex;
  flex-direction:column` **se queda** en `.nxPf`: varias pantallas dependen de su `gap` (Ajustes usa
  `gap:14px`), quitarlo habría pegado sus tarjetas. Se borró el `max-height:none` de `.nxAjWrap`,
  ya innecesario.
- **Por qué ninguna de las 151 pruebas lo vio, y la lección:** cada harness cargaba el CSS de SU
  pantalla (`fac.mjs` solo `nxPosCSS`, `picker.mjs` solo el trozo del picker). **Nunca se había
  cargado el stack COMPLETO junto** (`index.html` + `nxPfCSS` + `nxPosCSS` + tienda) dentro del
  armazón real de la app (`#app{height:100dvh}` → `.abody` → `.main` → `.content{overflow-y:auto}`).
  El bug vivía exactamente en el cruce entre hojas. **Al probar una pantalla del POS, montarla en el
  armazón real con TODO el CSS, no solo con el de su módulo** — y medir `scrollHeight` del
  contenedor, no solo que los elementos existan.
- Verificado con Playwright montando la pantalla real en el armazón real: `.nxDocCard` pasó de
  **h=699 recortada a h=1232 completa**, y el scroll de `.content` de **771 a 1304** sobre 736 de
  alto visible (antes no había nada que bajar). Más 6 comprobaciones de no-regresión: un
  `.modal.nxPf` SIN tope inline sigue acotado a 92vh, uno CON tope también, una pantalla completa ya
  no se recorta (2400px enteros), y Ajustes conserva su `gap:14px` y su dirección de columna. Las 4
  suites anteriores repasadas sin regresión (49 cobro + 65 factura + 37 documento + 7 picker = 158).

### BUG MÍO: el CSS de las 2 pantallas nuevas del POS se inyectaba desde el módulo equivocado (26-jul-2026, v49.69)
El dueño: *"la ventana de factura tiene un bug y lo que acordamos en cobrar aún no me sale"*, con una
captura de la ventana "Elegir cliente" en su iPhone. Dos cosas distintas, las dos reales.
- **CAUSA RAÍZ (mía, v49.66 y v49.67):** los dos bloques de CSS nuevos (`.nxPago*` de la ventana de
  cobro con pestañas y `.nxDoc*` de la Factura-documento) se insertaron con
  `s.index("    document.head.appendChild(st);")` — que agarra la **PRIMERA** ocurrencia del archivo
  (línea 592), o sea **`injectMenuEditorCSS()`, el CSS del editor del menú móvil**, no el del POS
  (`nxPosCSS`, línea ~25689). **Es exactamente la trampa que este mismo archivo ya advertía**
  ("HAY VARIAS FUNCIONES `inyectarCSS()` EN EL ARCHIVO, una por módulo/IIFE" — v48.29). Doble
  problema: (a) ese injector solo corre desde `crearMenuMas()`, que arranca con `if (!isMobile())
  return` — en escritorio el CSS **nunca** se cargaba; (b) aun en móvil, se inyecta al ARRANQUE, o
  sea **antes** que `nxPosCSS`, así que a igual especificidad las reglas viejas del POS le ganaban
  por orden de cascada. Resultado: las dos pantallas nuevas se seguían viendo como las viejas.
  Movidos al final de `nxPosCSS`, donde van.
  - **Por qué las 49 + 65 + 37 pruebas no lo atraparon:** los harness inyectan el CSS a mano en la
    página de prueba, así que verifican que las REGLAS funcionan — nunca que el CSS sea
    **alcanzable** desde el injector correcto en producción. **Lección: al agregar CSS a
    `parches.js`, comprobar con `grep`/asserción que la cadena quedó DENTRO del injector que le
    toca** (`st.id === 'nxPosCSS'`, `'nxPfCSS'`, `'nxFPCSS'`…), no solo que el archivo compila.
    Nunca anclar por `document.head.appendChild(st)` a secas.
- **BUG 2, real y desde v49.37 (independiente del anterior):** en la ventana "Elegir cliente"
  (`nxPosCliFilaHTML`) el nombre y el código salían **pegados en una sola línea**
  ("ESTERLINCL-0003 · POR MAYOR"). `.nxPf .pf2clirow` es `flex-direction:column`, pero al agregar el
  botón de favorito (v49.37) el `<b>` y el `<span>` quedaron dentro de un `<div>` intermedio **sin
  estilo** → como son elementos en línea, se pintaban uno detrás del otro. Arreglado con
  `.nxPf .pf2clirow>div{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1}`.
  Afectaba a las 2 ventanas que usan ese motor compartido (Facturar y Cobrar).
- Verificado con Playwright y el CSS + markup REALES extraídos del archivo: el nombre y el código
  quedan en líneas distintas y alineados a la izquierda (medido con `getBoundingClientRect`, no a
  ojo), la estrella no empuja el texto y sale ámbar cuando está marcada, sin desborde en 390px —
  más las 3 suites anteriores repasadas sin regresión (49 cobro + 65 factura + 37 documento = 151) y
  una asserción nueva que confirma que `.nxPago{` y `.nxDoc{` viven dentro de `nxPosCSS` y ya NO en
  `nx-menu-editor-css`.

### POS · Factura: el círculo de "Facturar a" es la lupa, y la lista de clientes con líneas (26-jul-2026, v49.74)
Dos pedidos con capturas del iPhone: *"donde el punto negro vamos a poner ese mismo punto pero con el
icono de lupa y clickear ahí para buscar los clientes"* y *"que la ventana flotante de buscar cliente
tenga líneas para diferenciar bien los clientes"*.
- **El círculo (`.pav` de `facPartesHTML`) era decorativo** — mostraba la inicial del cliente, o un `—`
  cuando no había ninguno, y **no hacía nada al tocarlo**. Pasó de `<div>` a `<button>` real con
  `<i class="ti ti-search">` que llama a `window.nxFacCliToggle()` (la misma función del enlace de
  abajo, cero lógica nueva). Mismo tamaño, misma forma, mismo color — solo cambió qué muestra y que
  ahora responde.
  - **Decisión: la lupa se queda SIEMPRE**, también con cliente ya elegido (el `aria-label`/`title`
    cambia a "Cambiar el cliente"). Un control que cambia de función según el estado es menos
    predecible, y el nombre del cliente ya se lee al lado — la inicial no aportaba nada que faltara.
  - Se borró la variable `ini` (quedó sin uso, regla #1 de depurar). CSS: `border:0;cursor:pointer;
    padding:0;font-family:inherit` + `:hover` azul + `:focus-visible`. **`:active` con
    `filter:brightness()`, NUNCA `transform`** — el propio CLAUDE.md ya advierte del bug de botones
    que se "inflan" en iPhone dentro de ventanas con `backdrop-filter`.
- **Líneas en la lista de clientes:** `.nxPf .pf2clirow` ganó `border-bottom:1px solid var(--pf-line)`
  (el token del sistema, no un gris inventado) + `:last-child{border-bottom:0}` para que la última no
  deje una raya suelta contra el borde de la ventana. Beneficia a las **dos** ventanas que comparten
  ese motor (`nxPosClienteAbrir`: Facturar y Cobrar), no solo la de la captura.
- **NO se tocó el enlace de texto "Elegir cliente"/"Cambiar cliente"** de abajo, aunque ahora hace lo
  mismo que el círculo. El dueño pidió agregar la lupa, no quitar el enlace — y el texto es más
  descubrible que un icono suelto para quien entra por primera vez. Se le comentó como algo que se
  puede quitar si prefiere.
- Verificado con Playwright y el código real extraído (`facPartesHTML`/`nxFacCliToggle`/
  `nxPosCliFilaHTML` + el CSS real de `.nxDoc` y `.nxPf`): **74 comprobaciones** de Factura (las 65
  anteriores sin regresión + 9 nuevas — es un `<button>`, lleva la lupa, ya NO muestra la inicial,
  nombre accesible correcto en los 2 estados, tocarlo abre el buscador, sigue midiendo 38×38 redondo y
  oscuro con `cursor:pointer`) y **12** del selector (las 6 anteriores + 6 nuevas: 1ra y 2da fila con
  línea de 1px medida con `getComputedStyle`, la última en `0px`, el color es el `--pf-line` real, y
  las filas quedan pegadas —la línea es lo que separa, no un hueco—). Sin desborde en 360-1440px, 0
  errores de consola. Capturas revisadas. `node --check parches.js` limpio; los 3 `<script>` de
  `index.html` pasan `new Function()`; `version.json` válido.

### POS · el botón de imprimir de Cobrar saca el TICKET, no el documento (26-jul-2026, v49.73)
El dueño: *"Que salga el ticket térmico en vez del documento grande"*. El botón de impresora que se
había puesto en la ventana de Cobrar (v49.72) abría `docFacturaHTML` (la factura de página completa);
ahora abre **`ticketHTML`** — la tirilla de 300px monospace del mostrador, la misma que sale al
confirmar la venta. Tiene sentido: quien está cobrando quiere el recibo del mostrador, no un
documento de oficina (ese sigue en "Vista previa" de Factura y en el Historial, sin cambios).
- **El problema de fondo:** `ticketHTML(v)` está escrita para una venta **YA guardada**. Se le arma
  una venta-fantasma desde `_cart` + `leerCobro()` y, clave, **se deja `v.id` AUSENTE** — los dos
  botones del ticket (`📄 Factura completa` y `↩︎ Devolver`) ya estaban gateados a `v.id`, así que
  no aparecen solos, sin tocar una línea de esa lógica. Ofrecer "Devolver" sobre una venta que
  todavía no existe habría sido un botón muerto.
- **La garantía usa la MISMA fórmula que `nxPosConfirmar`** al guardar las líneas de verdad
  (`new Date(Date.now() + gd*86400000).toISOString().slice(0,10)`), no la variante local de RD que
  usa Reparaciones — a propósito: lo que importa aquí es que la fecha del preview coincida con la
  que después queda en `pos_venta_items`, no con el calendario de RD.
- **Marca `v._preview` nueva en `ticketHTML`** (2 líneas, retrocompatible — una venta guardada sale
  idéntica a antes): recuadro punteado **"VISTA PREVIA — NO COBRADA"**, y el pie cambia de
  "¡Gracias por su compra!" a "Todavía no se ha cobrado ni guardado nada. El comprobante fiscal
  (NCF) se asigna al confirmar la venta." Un "gracias por su compra" sobre algo que no se ha
  cobrado sería justo el tipo de mentira que este sistema evita.
- **Sin NCF a propósito:** el comprobante se consume en `asignarNCF` al confirmar; imprimir un NCF
  antes sería quemarlo (o peor, mostrar uno que le va a tocar a otra factura).
- **Desglose real de cómo se está pagando:** una línea por método con monto > 0 (Efectivo/Tarjeta/
  Transferencia/Cheque/Nota de crédito) + una fila **"A crédito (fiado)"** si queda pendiente — se
  arma explícitamente para no caer en el respaldo `[{metodo:v.metodo_pago}]` de `ticketHTML`, que
  con una venta-fantasma imprimiría `undefined`.
- Verificado con Playwright y el código real extraído por contenido (`nxPosCobrar`, `nxPagoImprimir`,
  `ticketHTML`, `leerCobro` tal cual, interceptando `window.open` para capturar el HTML y luego
  cargándolo como página real): **70 comprobaciones** de la ventana de cobro (las 58 anteriores sin
  regresión + 12 nuevas) — es el ticket de 300px monospace y NO la factura de página completa, lleva
  el número que le tocará, la marca de vista previa, sin NCF, sin los 2 botones de venta guardada, el
  cliente elegido EN COBRAR, la garantía del producto, el descuento del cobro (TOTAL 42,750 sobre
  47,500 con 10%), los métodos desglosados sin ningún `undefined`, la parte a crédito, y con el
  carrito vacío avisa sin abrir nada — más **7 de no-regresión** confirmando que una venta YA
  guardada sale exactamente igual que antes (dice "¡Gracias por su compra!", muestra su NCF real,
  conserva "Factura completa" y "Devolver"). Sin desborde en 390px, 0 errores de consola. `node
  --check parches.js` limpio; los 3 `<script>` de `index.html` pasan `new Function()`;
  `version.json` válido.

### POS · FACTURA imprimible de página completa (26-jul-2026, v49.68)
El dueño dijo *"continúa con factura"*. Se auditó qué faltaba de verdad y el hueco real era este:
la PANTALLA ya se ve como documento (v49.67), pero **lo único que se podía imprimir de una venta
seguía siendo el ticket térmico de 300px** (`ticketHTML`, monospace) — correcto para el mostrador,
pobre cuando el cliente es una empresa que pide Crédito Fiscal B01.
- **`docFacturaHTML(d)` (nueva):** documento de página completa (`window.open`+`document.write`,
  mismo patrón que `nxPrestamoComprobante`/`nxRepImprimir`) con la misma cara de la pantalla:
  encabezado empresa+RNC+dirección+teléfono / FACTURA + Nº + NCF + fecha + condición, "Facturar a"
  con código y cédula, tabla con código/IMEI/garantía por línea, forma de pago, TOTAL grande, línea
  roja "Pendiente por pagar" si quedó fiado, firmas (Entregado por / Recibido conforme) y aviso
  legal. Botones **Cerrar · Imprimir/PDF · WhatsApp** — los handlers van en un `<script>` del propio
  documento con `addEventListener`, NO en `onclick` con `JSON.stringify` (el bug de comillas ya
  documentado en v49.23). `@media print` quita la barra y el fondo.
- **Recibe un objeto ya normalizado**, así que hay una sola plantilla y dos armadores:
  `facDocDesdeCarrito()` (lo que hay AHORA en pantalla — no guarda nada) y
  **`window.nxFacDocVenta(ventaId)`** (una venta ya guardada: trae `pos_venta_items` igual que
  `nxPosTicket`, cruza el cliente con `_clientes` para su cédula/RNC, y usa `v.pagos` si existe).
- **3 entradas:** el botón **"Vista previa"** de Factura (`nxFacVistaPrevia` dejó de abrir un modal
  `.nx-inv-*` y ahora abre este documento), el botón **"Factura"** nuevo en el detalle de una venta
  (`nxFacVerVenta` — el de al lado se relabeló "Ticket" para que se distingan), y **"📄 Factura
  completa"** dentro del propio ticket (vía `window.opener.nxFacDocVenta`, mismo patrón que el botón
  Devolver que ya vivía ahí).
- **Honesto sobre el estado, no finge:** antes de cobrar sale con badge **"VISTA PREVIA · SIN
  GUARDAR"** y sin bloque de forma de pago (todavía no se cobró); en Prefactura, **"BORRADOR · NO
  FISCAL"** sin NCF ni condición y con la nota impresa; una venta guardada sale **PAGADA** (verde) o
  **ANULADA** (roja, con "DOCUMENTO ANULADO — no tiene validez"). El ticket térmico **no se tocó**.
- **Desborde real encontrado midiendo y corregido antes de publicar:** a 390px la tabla de 6
  columnas se salía 13px. Arreglado en la media query del documento: se oculta la columna `#`
  (no aporta en pantalla angosta), se sueltan los anchos fijos y baja la tipografía. Medido después:
  `scrollWidth === clientWidth` exacto en 390px y en 900px.
- Verificado con Playwright y el código real extraído por contenido (`docFacturaHTML`,
  `facDocDesdeCarrito`, `nxFacDocVenta`, `nxFacVistaPrevia`, `facEmpresa`, `lineBase`/
  `lineDescMonto`/`lineImporte`), interceptando `window.open` para capturar el HTML generado y
  cargándolo después como página real: **37 comprobaciones** — vista previa con empresa/RNC/número/
  comprobante/cliente/IMEI/garantía/descuento de línea y totales exactos (39,966 / 240 / 7,194 /
  47,160), venta guardada con su NCF real, badge PAGADA, vendedor, forma de pago y pendiente 7,160,
  garantía con fecha real, el texto de WhatsApp lleva el total, prefactura con su nota y su aviso de
  proforma, y el carrito vacío avisa sin abrir nada. Sin desborde en 390/900px, 0 errores de
  consola. `node --check parches.js` limpio; los 3 `<script>` de `index.html` pasan
  `new Function()`; `version.json` válido.

### POS · Factura/Prefactura como DOCUMENTO — la muestra B aprobada (26-jul-2026, v49.67)
Segunda mitad del rediseño que el dueño aprobó ("me gusta la B... se ve incompleta" → se completó y
dijo *"Aplícalo"*). `renderFactura()`/`pintarFactura()` pasaron de un formulario de 2 columnas con
panel lateral a **un documento**: encabezado con la empresa, dos columnas Facturar a / Condición de
pago, tabla de artículos y pie con Otras acciones + totales.
- **Las 2 preguntas que quedaron sin responder, resueltas y por qué:**
  1. **El encabezado SÍ lleva empresa + RNC** — `empInfo()` (nombre/RNC/teléfono/dirección de `CFG`)
     ya existía y es lo que el ticket impreso ya usa, así que no es dato inventado. Helper nuevo
     `facEmpresa()`: si `CFG` no trae nombre (organización de tienda, que no lee la config de
     Seguros) cae al **nombre real de la organización** en vez de dejar el genérico "NEXUS PRO".
  2. **El botón Cobrar NO quedó fijo abajo en el celular.** Se descartó midiendo el riesgo: la app
     ya tiene su propia barra flotante inferior (`.mobile-bottom-nav-clean`, `position:fixed`) y dos
     barras fijas apiladas en un iPhone se tapan entre sí. En su lugar, en el celular el bloque de
     **TOTAL + Cobrar va ANTES de "Otras acciones"** (`order` en la rejilla del pie) — se llega a
     cobrar sin bajar hasta el final, con cero riesgo de choque.
- **Todos los ids y `onclick` intactos** (`facNumPrev`, `facNCFSel`, `facFecha`, `facAlmSel`,
  `facCliBtn`, `facCliTxt`, `facCliInfoWrap`, `facSearchBox`, `facTabla`, `facNota`, `facResumen`) —
  ninguna función de negocio se tocó: precios, ITBIS, descuentos, IMEI, NCF, almacén y el flujo de
  cobro son los mismos.
- **`facPartesHTML(c)` (nueva)** pinta el bloque "Facturar a" + "Condición de pago" con los datos
  reales que ya usaba `facCliInfoHTML` (`saldoCli`, `limite_credito`, última compra perezosa).
  **`pintarFacCliInfo()` elige el renderizador según la pantalla montada:** `#facCliInfoWrap` lleva
  `data-doc="1"` en Factura/Prefactura → bloque de documento; en Vender no lo lleva → tarjeta
  compacta de siempre. Así Vender no se tocó.
- **La casilla "A crédito" pasó a un segmentado Contado / A crédito** (`nxFacSetCredito`, misma
  función).
- **BUG REAL arreglado de paso:** `nxFacSetCredito` escribía el número nuevo en `el.textContent`,
  pero `#facNumPrev` es un `<input>` — en un input eso no se ve. O sea, **al marcar "A crédito" el
  número nunca cambiaba a la serie de crédito**. Ahora va en `.value` (y usa
  `proxNumeroFacturaCorto`, el mismo formato con el que se pinta al abrir). Verificado con una
  prueba dedicada: `00001248` → `CR-00000091` → vuelve al tocar Contado.
- **Segundo detalle real, encontrado al construir:** el callback de `nxFacCliToggle` pisaba
  `#facCliTxt` con texto plano DESPUÉS de que `pintarFacCliInfo()` ya había repintado el bloque
  bien formateado — en el documento eso dañaba el nombre (le pegaba el código delante y borraba el
  chip "por mayor"). Ahora ese ajuste manual solo corre cuando NO es la vista de documento (o sea,
  solo para el botón compacto de Vender).
- **Tabla de 10 columnas → 7** (# · Descripción · Precio · Cant. · Desc. · Importe · ✕): el código,
  el chip de IMEI y la garantía bajaron a una línea de etiquetas debajo del nombre. En el celular
  cada artículo colapsa a una tarjeta con `data-l` (mismo patrón que `.sf-tbl` de Seguros).
- **Quitado por redundante:** la fila "Pendiente por cobrar" del resumen (mostraba literalmente el
  mismo `t.total` de arriba) y el **indicador de pasos** Cliente→Productos→Pago→Confirmar — el
  documento ya muestra el cliente y los artículos, así que `facStepsHTML()` quedó sin llamadores y
  se borró (regla #1, depurar).
- **CSS nuevo con namespace propio `.nxDoc`** (dentro de `.nxPf`), en el mismo bloque
  `st.textContent +=` del POS. **Ojo:** el selector `td[data-l="Descripción"]` va con comillas
  DOBLES — con simples rompe la cadena de JavaScript que envuelve el CSS (pasó al escribirlo, `node
  --check` lo atrapó).
- Verificado con Playwright y el código real extraído por contenido (`facEmpresa`, `facPartesHTML`,
  `renderFactura`, `pintarFactura`, `pintarFacCliInfo`, `facCliInfoHTML`, `nxFacSetCredito`,
  `nxFacCliToggle`, `nxFacQtyStep`, `lineBase`/`lineDescMonto`/`lineImporte`/`saldoCli` + el CSS
  real): **65 comprobaciones** — encabezado con empresa/RNC/número/comprobante/fecha, cliente con
  código y cédula, balance 12,500 y crédito disponible 37,500 calculados de verdad, el segmentado
  cambia el estado Y el número de factura, la lupa abre el historial, el buscador abre la ventana de
  artículos, 7 columnas, chips de código/IMEI/garantía, el + recalcula el importe, Subtotal 39,966 /
  Descuento 240 / ITBIS 7,194 / TOTAL 47,160 exactos, Cobrar / Vista previa / Cancelar enganchados,
  el caso sin cliente no inventa balance, Prefactura sin comprobante ni crédito y con su nota, y el
  carrito vacío deja Cobrar deshabilitado. Sin desborde en 360/390/430/768/1180/1440px, 0 errores de
  consola. `node --check parches.js` limpio; los 3 `<script>` de `index.html` pasan
  `new Function()`; `version.json` válido.

### POS · Cobrar: ventana con PESTAÑAS por forma de pago (26-jul-2026, v49.66)
El dueño pidió rediseñar la Factura del POS; al mostrarle 3 direcciones eligió la **B**, y después
pidió que además **la forma de pago fuera una ventana con pestañas**. Se le enseñaron 3 muestras de
la ventana de cobro y eligió **la No. 3, completa con sus pestañas**. Se construyó esa primero (es la
más contenida y de efecto inmediato); la Factura B completa queda en cola.
- **Arquitectura que hace esto seguro (es una pantalla de DINERO):** los 5 campos reales
  (`payEfe`/`payTar`/`payTra`/`payChe`/`payNc`) **siguen SIEMPRE en el DOM**, dentro del panel
  "Mixto" (oculto cuando no toca). Las pestañas de un solo método usan un campo grande **espejo**
  (`#payBig`) que escribe en el campo real del método activo. Así `leerCobro()`, `nxPosCobroCalc()`
  y `nxPosConfirmar()` **no se tocaron** — leen exactamente lo mismo que siempre. Todos los ids
  quedaron idénticos (`posCliId`, `posCliDisp`, `posCliNomBox`, `posCli`, `posVendId`, `posDesc`,
  `posTotalLbl`, `cobroPagado`, `cobroResto`, `cobroRestoLbl`, `cobroDev`, `cobroFiadoNote`,
  `finBox`/`finChk`/`finCfg`/`finN`/`finFrec`/`finPrev`).
- **Lo que se ve:** encabezado azul degradado (el mismo del Login/POS) con **TOTAL A COBRAR** en 33px
  + el cliente; fila de 6 pestañas (Efectivo · Tarjeta · Transfer. · Cheque · N. Créd. · **Mixto**);
  en Efectivo un campo grande "Monto recibido" con botones rápidos **Exacto / +500 / +1,000 / +2,000
  / +5,000** (los `+N` SUMAN a lo tecleado, que es como cuenta billetes un cajero) y la **DEVUELTA**
  en un recuadro verde de 23px; en los otros métodos el mismo campo grande con **Todo el total /
  Mitad**; en Mixto las 5 casillas de siempre. Abajo siempre Pagado / Falta, el aviso de fiado y la
  caja de CUOTAS. Pie con **Opciones** (despliega Nombre para el ticket + Vendedor + Descuento %) y
  **Confirmar venta** en verde.
- **Funciones nuevas, todas de presentación:** `nxPagoTab(k)` (cambia de pestaña, limpia los 5
  métodos y prellena el elegido con el total), `nxPagoBigIn()` (el espejo), `nxPagoQuick(v)`
  (`'T'`=total, `'M'`=mitad, número=suma) y `nxPagoOpts()`. En `nxPosCobroCalc` solo se agregaron
  escrituras guardadas (`cobroDevBig`, la fila `pgDevRow`) y `posTotalLbl` ahora acepta `<div>` o
  `<input>` indistintamente.
- **Dead code eliminado (regla #1):** `nxPosPagoExacto` y `nxPosPayQuick` (las fichas viejas de pago)
  y su CSS `.nxPayTiles`/`.nxPayTile` — verificado con grep que no los usaba nada más en el archivo.
- **2 defectos propios encontrados MIDIENDO, corregidos antes de publicar:** (1) con las 6 pestañas
  a `flex:1 0 auto` **más su ícono**, la fila medía más que el modal y "Mixto" quedaba **cortada** —
  y como la barra tiene scroll horizontal con la barra oculta, el usuario no tendría cómo saber que
  hay más. Se quitó el ícono de las pestañas (el rótulo en español ya es claro) y pasaron a
  `flex:1 1 auto`; medido después: caben exactas en 360/390/430/1280px (`scrollWidth === clientWidth`).
  (2) El grid de Mixto colapsaba a 1 columna desde 400px, alargando muchísimo la ventana en un iPhone;
  se bajó ese corte a 340px.
- Verificado con Playwright y el código real extraído por contenido (`nxPosCobrar`, `nxPagoTab`,
  `nxPagoBigIn`, `nxPagoQuick`, `nxPagoOpts`, `nxPosCobroCliToggle`, `nxPosCobroCalc`, `leerCobro`,
  más el CSS real): **49 comprobaciones** — abre con el total correcto, Efectivo prellena y el campo
  REAL recibe el espejo, `+2,000` suma y la devuelta da 2,000 exactos, `leerCobro()` devuelve
  `efe:49500 / devuelta:2000`, cambiar a Tarjeta limpia efectivo y prellena tarjeta, "Mitad" da
  23,750 y la etiqueta pasa a "Falta / Crédito" con el aviso de elegir cliente, Mixto lee los 5
  campos reales (20,000 + 27,500 = 47,500), el botón de cliente abre la ventana compartida y al
  elegirlo aparece la caja de CUOTAS con su vista previa, Opciones despliega Vendedor/Descuento y el
  10% recalcula el total del encabezado a 42,750, Confirmar llama a `nxPosConfirmar`. Sin desborde en
  390/430/1280px, 0 errores de consola. `node --check parches.js` limpio; los 3 `<script>` de
  `index.html` pasan `new Function()`; `version.json` válido.
- **Pendiente:** la **Factura B completa** que el dueño ya aprobó (rediseño de `renderFactura`/
  `pintarFactura`), con 2 preguntas suyas sin responder todavía: si el encabezado lleva el nombre de
  la empresa + RNC, y si el botón Cobrar debe quedar fijo abajo en el celular.

### WhatsApp: elegir destinatario (cliente o agente) + ronda de cobro por agente (26-jul-2026, v49.65)
El dueño pidió un WhatsApp al AGENTE para que le dé seguimiento a su cliente atrasado; al proponerle
dos botones separados respondió *"que yo pueda elegir al cliente o al agente"* — un solo botón con
elección. **Se investigó la base ANTES de diseñar**, y eso cambió la propuesta dos veces:
- **`agentes.tel` está VACÍO en los dos agentes** (la columna existe y el campo está en el formulario
  desde siempre, nunca se llenó). Sin eso el botón no puede hacer nada → cuando falta el número, en
  vez de fallar en silencio lleva a `editarCli`/`editarAgt` para ponérselo.
- **ROBINSON tiene 60 de sus 61 clientes atrasados** (ESTERLIN 32 de 39, y ESTERLIN es el propio
  dueño). Un botón por cliente = 60 WhatsApps a la misma persona; **no es usable**. Por eso, además
  del selector pedido, se construyó la **ronda por agente**: un solo mensaje con toda su lista.
- **`nxWaElegir(cid)`** — hoja de elección (`.waSheet`, CSS propio inyectado una vez): nombre del
  cliente + cuánto debe, y dos filas — **Al cliente** (reusa `nxCobroWA`, sin tocarlo) y **A su
  agente** (`nxAgenteWA`, nueva). Cliente sin agente asignado muestra una fila honesta "Sin agente"
  en vez de una opción muerta. Entradas: botón verde nuevo en la fila de Clientes y el botón de las
  tarjetas de atrasados en Avisos (ese pasó de ir directo al cliente a dejar elegir).
- **`nxAgenteWARonda(agId)`** — sección nueva **"Seguimiento por agente"** arriba de Avisos, una
  tarjeta por agente con cuántos atrasados tiene y por cuánto. El mensaje lista sus clientes
  ordenados **de mayor a menor deuda** (el orden en que conviene perseguirlos).
  - **Corte por TAMAÑO del enlace, no por cantidad fija.** El primer intento acotaba a 30 líneas y
    midió **2.288 caracteres** — por encima del margen seguro de un `wa.me`. Se cambió a un cupo de
    1.750 caracteres del texto ya codificado, sumando línea por línea: un nombre largo pesa el doble
    que uno corto, así que una cantidad fija no sirve. Medido después: **1.948 caracteres, 25 líneas
    y "…y 35 más"**.
- Auditoría nueva: `AGENTE_SEGUIMIENTO_WA` (por cliente, con `cliente_id` para que salga en la línea
  de tiempo de su ficha) y `AGENTE_RONDA_WA` (la ronda completa).
- Verificado con Playwright y el código real extraído por contenido, con datos que **reproducen el
  caso real** (60 clientes de Robinson sin teléfono del agente + 1 de Esterlin con teléfono): la
  tarjeta de Robinson dice "Ponerle el WhatsApp" y **no abre nada** sino que lleva a editar el
  agente; con teléfono arma el enlace correcto y el registro de auditoría con el monto exacto; el
  selector muestra los 2 destinatarios con su número, elegir "A su agente" abre `wa.me` del agente
  con el nombre y la referencia del cliente en el mensaje; un cliente sin agente muestra "Sin
  agente". 0 errores de consola.
  - **Nota de método (error propio, 2da vez en la sesión):** al re-extraer una sola función con
    `re.sub` el reemplazo contenía `\n` de los template literals y Python los interpretó como
    escapes, rompiendo el harness. Para re-extraer, volver a generar el archivo entero — no parchear
    con `re.sub` texto que lleva backslashes.

### Clientes en el celular: la tabla se volvió tarjeta, y un bug real de la lupa (26-jul-2026, v49.64)
El dueño mandó DOS capturas de la misma pantalla — una con scroll a la izquierda y otra a la derecha —
y preguntó qué mejorar. Al deslizar a la derecha **se pierde el nombre**: tres filas seguidas diciendo
`PARCIAL · RD$ 4,500` sin saber de quién son.
- **Causa: un pendiente mío.** En la v48.54 Facturas se convirtió a `.sf-tbl` (colapsa a tarjeta en
  móvil) pero a Clientes **solo se le puso el color** — se quedó con `<table>` dentro de `.tw`, 9
  columnas, y la regla global `@media(max-width:480px){table{min-width:500px}}` forzándole scroll.
- **La tabla estática pasó a `class="sf-tbl sf-cli"`** y cada `<td>` del render ganó su `data-lb`.
  Bloque `.sf-cli` nuevo dentro del `@media(max-width:720px)` ya existente, con `order:` para el
  orden visual **sin tocar el DOM** (reordenar movería las columnas del escritorio): nombre (100%) →
  Pendiente + Estado → Prima · Plan · Agente → Acciones (100%). Empresa y Vigencia se ocultan con
  `sf-tbl-hide-mb`. Etiquetas `::before` en línea para las 3 celdas chicas; ocultas en Estado y
  Acciones (el badge y los botones se explican solos).
- **Fila compacta:** el nombre pasó a UNA línea con elipsis (`.cli-nom`) y referencia + cédula + ARS +
  creador a una sub-línea (`.cli-sub`). Antes "ADELMA RULLINER LUNA ALMONTE" se partía en 4 líneas.
  El nombre del agente se recorta con elipsis en vez de envolverse y salirse de la tarjeta.
- **BUG REAL encontrado MIDIENDO, no a ojo (v49.57, mío):** la lupa medía **19px de alto** cuando su
  CSS dice 42px. Causa: `nxBuscaFiltroHTML()` llamaba a `nxBuscaEnsureCSS()` (el CSS del *campo*)
  pero **no a `nxBuscaFiltroCSS()`** — que solo se invocaba desde `nxBuscaFiltroAbrir()`. O sea el
  botón salía **sin ningún estilo hasta que se abría la ventana una vez**; en la captura del dueño se
  ve como un iconito pelado. Afectaba también a Facturas. Arreglado llamándolo también al renderizar.
  Se le sumó una opción `label` (retrocompatible) y ahora dice **"Buscar"** en las dos pantallas.
- **Pestañas:** `.nxft-flex` es una tira con scroll horizontal y **la barra oculta a propósito**, así
  que la última pestaña (VIP/Inhabilitados) no se veía ni había cómo llegar a ella. En ≤620px ahora
  envuelve (`flex-wrap:wrap`) en vez de deslizarse: nada queda cortado.
- **Filtros y rótulos:** los 3 `<select>` con `flex:1 1 0;min-width:0` y etiquetas cortas (Plan /
  Estado / Agente) caben en una fila. Los rótulos de los KPI (`.lb`/`.sub`) pueden ocupar 2 líneas en
  ≤480px en vez de cortarse ("CON BALANCE PENDIE…") — **el monto (`.v`) sigue protegido** como se
  decidió en la v48.56, solo se relajaron etiqueta y subtítulo.
  - **Detalle de orden en la cadena (misma trampa que la v49.35):** la primera versión de esa media
    query se insertó en el primer bloque `@media(max-width:480px)` del archivo, que va ~230 líneas
    ANTES de la regla base `.nxSf .sf-kpi .lb` — misma especificidad, gana la última, no hacía nada.
    Se movió justo después de la regla base. Verificar la POSICIÓN, no solo la especificidad.
- **Una alternativa se probó y se descartó con medición:** meter Acciones en la misma fila que
  Pendiente/Estado bajaba la tarjeta de 167px a 149px, pero la captura mostró los botones cayendo en
  medio de la tarjeta con Prima/Plan flotando al lado. 18px no valen una tarjeta desordenada — se
  volvió al reparto limpio de 4 filas.
- Verificado con Playwright y el código real extraído por contenido (`rCli`, `pintarLupaCli`,
  `nxBuscaFiltroHTML/CSS` + ~20 helpers reales y el CSS real), servido por HTTP y con los 3 clientes
  de la captura del dueño: en 390px cada cliente es una tarjeta de 167px con **cero desborde**
  (página y contenedor de tabla en 0), el nombre y el pendiente siempre visibles, la lupa mide
  **92×42** con su texto, y en 1280px la tabla sigue con sus 9 columnas igual que antes. 0 errores de
  consola.
  - **Nota de método (error propio):** al armar el harness escribí
    `open(f,'w').write(... + open(f).read())` — Python trunca el archivo al abrirlo para escritura
    ANTES de evaluar el argumento, así que la lectura devolvió vacío y borré el extracto. Nunca leer
    y escribir el mismo archivo en una sola expresión.

### Facturas — 4 mejoras salidas de una captura del dueño (26-jul-2026, v49.59)
El dueño mandó la pantalla de Facturas en su iPhone y preguntó "cómo podemos mejorar". Se auditó
contra el código real (no solo la captura) y salieron 4 cosas, ordenadas por lo que de verdad le
ahorra tiempo:
1. **La tarjeta ocupaba ~200px con 95 facturas** → 3 por pantalla, ~32 pantallas de scroll. De sus
   8 líneas etiquetadas, **3 no aportaban**: `ARS —` (la mayoría de sus clientes no tienen ARS
   registrada), **Total y Balance mostrando el MISMO número** (solo difieren si hubo abono parcial),
   y la etiqueta "ACCIONES". Además el balance —lo que hay que cobrar— iba chiquito abajo, con el
   mismo peso que la fecha (contra NPGS §14). Reestructurada: nombre + BALANCE grandes arriba,
   pastilla de estado en `position:absolute` arriba a la derecha, resto en una línea de 10.5px.
   **Medido: 200px → 111px.**
   - **Cómo, sin romper el escritorio ni Historial de pagos:** la tabla ganó una clase extra
     `sf-fact` y TODO el CSS nuevo va scopeado a ella dentro del `@media(max-width:720px)` que ya
     existía. El orden visual se cambió con `order:` — **no** reordenando el DOM, que habría movido
     las columnas del escritorio. Ocultar ARS/Total reusa la clase `sf-tbl-hide-mb` que ya existía.
2. **El KPI "Pagadas" siempre marcaba 0**: contaba las pagadas DE LA LISTA, y con el filtro en
   "Pendientes" esa lista las excluye por definición. Cambiado por **ATRASADAS** (facturas de meses
   anteriores sin pagar, respetando el corte 20-al-20 igual que el filtro `atrasadas`), en rojo si
   hay alguna y clicable para ir a verlas.
3. **El botón rojo de anular estaba del mismo tamaño y pegado a Cobrar** — contra NPGS §4
   ("eliminar nunca junto a la acción principal") y §10 ("agrupar en ⋮ Más acciones"). A la vista
   quedan **Cobrar** y **WhatsApp**; Ver factura / Corregir precio / Anular pasaron a `nxFactMenu`.
   El menú usa `position:fixed` con la posición REAL del botón (`getBoundingClientRect`) **acotada
   al ancho de la pantalla** — misma lección del menú del POS (v48.99), donde un popup posicionado
   dentro de un contenedor angosto se salía por el borde en el celular.
4. **El buscador pasó a la ventana del §5**, mismo patrón de riesgo mínimo que Clientes: `#factQ`
   sigue existiendo oculto, así que `rFact()` lee el término igual que siempre.
- Verificado con Playwright y el código real de `rFact`/`nxFactMenu`/`pintarLupaFact` + el CSS real
  extraído: **20 comprobaciones** — alto de tarjeta 111px, sin etiquetas repetidas, ARS vacía
  oculta y ARS real visible, Total oculto cuando repite el balance y visible cuando hubo abono, el
  3er KPI dice Atrasadas con el número correcto, 3 botones a la vista, el menú abre con las 3
  opciones y **no se sale de la pantalla** (left=165, right=365 en 390px), elegir dispara la acción
  y cierra, la ventana de búsqueda filtra y la ✕ devuelve todas, Cobrar sigue funcionando, sin
  desborde, 0 errores de JS.

### BUG MÍO en producción: salía código escrito en el Inicio (26-jul-2026, v49.58)
El dueño mandó una captura de su iPhone: en el Dashboard aparecían pedazos de JavaScript como
texto (`VITCHTAB('COB'),200)`, `{VAR ETELEMENTBYID('FFA…`) encima de los accesos **Clientes** y
**Facturas Pendientes**, y esos dos botones no respondían.
- **Causa raíz, mía, de la v49.55:** al agregar el teclado a los 108 elementos clicables usé
  `<(div|tr|td|li|span|a)\b[^>]*\bonclick\s*=[^>]*>` — y **`[^>]*` se detiene en el PRIMER `>`**.
  Los `onclick` que llevan una **función flecha `=>`** tienen un `>` por dentro, así que la
  coincidencia terminaba a mitad del atributo y mis atributos nuevos se insertaban ahí, partiendo
  el `onclick` en dos: la primera mitad quedaba como atributo roto y el resto salía a la pantalla
  como texto suelto.
- **Por qué no lo atrapó la verificación:** `node --check` valida SINTAXIS de JavaScript, y el
  archivo seguía siendo JavaScript válido — el daño era en el HTML dentro de una cadena. Las
  pruebas Playwright de esa versión midieron el menú lateral (`.ni`) y un botón de ícono, que no
  tienen flechas. **Lección: una transformación mecánica sobre HTML no se valida con un chequeo de
  sintaxis de JS; hay que renderizar los elementos tocados.**
- **Detección:** un verificador que, por cada inserción, retrocede hasta el `<` que abre la
  etiqueta y comprueba que **las comillas estén balanceadas** antes de la inserción. Dio 4 rotas en
  `index.html` y 0 en `parches.js`.
- **Reparación:** por cada una, quitar la inserción de donde quedó y volver a ponerla antes del
  `>` que de VERDAD cierra la etiqueta, encontrado con una máquina de estados que respeta comillas
  (no con otra expresión regular). Las 4: los 2 accesos rápidos del Dashboard, el KPI "En proceso"
  y la zona de soltar documentos.
- **Comprobación final, más estricta:** las 108 inserciones revisadas una por una — cada una debe
  quedar justo antes del cierre real de su etiqueta. Salieron 107 bien y **1 falso positivo** del
  propio verificador (`notif-item`, donde las comillas viven dentro de una cadena de JavaScript en
  un template literal, no del HTML) — revisado a mano y correcto.
- **Verificado en navegador con el marcado REAL** del bloque `.qa-g` extraído del archivo: los 6
  accesos rápidos se ven con su etiqueta correcta, **cero código filtrado como texto**, y un clic
  real dispara `nav()`. 0 errores de JS.

### NPGS §5 — Fase 3 arrancada: la ventana de filtro compartida + Clientes (26-jul-2026, v49.57)
El dueño zanjó el conflicto C2 con **"aplicar los reglamentos"** — cumplimiento literal del §5, que
ya había elegido en la v49.36 y reafirmó ahora después de que la enmienda lo reabriera. Se procede
con su decisión: los ~24 buscadores "filtrar lo que ya veo" pasan a ventana.
- **Inventario real medido** (no el del documento, que estaba desactualizado): **25 buscadores
  renderizados por función** (`posBuscador` 14, `agBuscador` 6, `prBuscador` 3, `rfBuscador` 2,
  `vhBuscador`/`mdBuscador`/`pendBuscador` 1 c/u, `nxBuscaHTML` directo 3) **+ 5 escritos a mano
  como HTML estático** en `index.html` (`cliQ`, `polQ`, `cobQ`, `factQ`, `pgBuscar`) — estos
  últimos no aparecen buscando llamadas a función, hay que buscar el `id=` en el markup.
- **UN SOLO motor nuevo, `nxBuscaFiltroHTML` / `nxBuscaFiltroAbrir`** (`index.html`, junto a
  `nxBuscaHTML` y `ModalBusquedaBase`) — no 24 ventanas (NPGS §6). Renderiza **solo la lupa** + una
  pastilla con el término activo y su ✕; al tocarla abre una ventana con **Buscar · Recientes ·
  Favoritos · Filtros · Resultados**, tal cual el §5.
  - **Diferencia con `ModalBusquedaBase`:** aquel ELIGE un registro de un catálogo y lo devuelve a
    un formulario; este solo FILTRA lo que ya está en pantalla. Reusa `nxBuscaHTML` por dentro como
    caja de búsqueda y `mbbLSGet`/`mbbLSSet`/`MBB_REC_MAX`/`MBB_FAV_MAX` para Recientes/Favoritos.
  - **`onterm` es una FUNCIÓN, no un string** (a diferencia de `onElegir` de `ModalBusquedaBase`):
    casi todos los handlers de `parches.js` viven dentro de un IIFE y NO están en `window`, así que
    un string no los alcanzaría. La config se guarda en un registro `window.__nbfReg[id]`, y el
    HTML del botón solo lleva `nxBuscaFiltroAbrir('id')`.
  - **"Resultados" honesto:** el componente no sabe pintar filas de 24 módulos distintos, así que
    cuenta las filas reales del contenedor que le pasa el llamador (`cont:`) y muestra "N
    resultados" en vivo mientras escribes. Al aceptar cierra y la lista de atrás queda filtrada.
- **Primera pantalla migrada: Clientes de Seguros (`cliQ`).** Patrón de migración de **riesgo
  mínimo**, el que se repetirá en las demás: el `<input id="cliQ">` **sigue existiendo, oculto**
  (`type="hidden"`), así que `rCli()`/`rCliBuscar()` leen el término exactamente igual que antes —
  **cero cambios en la lógica de filtrado**. Lo único nuevo es `pintarLupaCli()`, llamada desde
  `rCli()`, que pinta la lupa y le pasa un `onterm` que escribe en ese input y vuelve a llamar
  `rCliBuscar()`.
- **Verificado con Playwright, código real extraído del archivo** (`nxBuscaEnsureCSS`,
  `nxBuscaHTML`, los helpers de localStorage y todo el bloque `nxBuscaFiltro*` tal cual), servido
  por HTTP local (localStorage necesita un origen real): **17 comprobaciones** — solo se ve la
  lupa y no queda ninguna barra fija, la ventana trae campo/Recientes/Resultados, escribir filtra
  la lista de atrás y el contador dice "2 resultados", aceptar cierra dejando la pastilla y la
  lista filtrada, reabrir muestra lo buscado en Recientes, la estrella lo guarda en Favoritos,
  elegir un guardado filtra y cierra, y la ✕ de la pastilla lo quita todo. Sin desborde en 390px,
  0 errores de JS.
  - **2 fallos iniciales eran de la prueba, no del código:** el CSS pone los títulos de sección en
    MAYÚSCULAS (`text-transform:uppercase`) y yo comparaba contra "Recientes"/"Favoritos" en
    minúscula — `innerText` devuelve el texto RENDERIZADO. Corregida la comparación, 17/17.
- **Pendiente:** los otros ~24 buscadores. Se migran en tandas con este mismo patrón (input oculto
  + `nxBuscaFiltroHTML`), cada tanda probada antes de publicar. Se publicó **una sola pantalla
  primero** a propósito, para que el dueño pruebe la sensación real en su iPhone antes de que
  cambien Facturas, Cobros y Vender — las que usa todos los días.

### Los 3 respaldos: cerrados, y el respaldo diario ya no dejaba fuera medio sistema (26-jul-2026)
Continuación directa de lo de abajo. Al aplicar el mismo arreglo a `respaldo-diario`,
`respaldo-correo-mensual` y `verificar-respaldo` aparecieron **dos cosas más graves que el hueco
que se venía a cerrar**:
- **La clave de Gmail seguía escrita en texto plano en 2 funciones.** La Ronda 1 la sacó de
  `enviar-reporte-email` pero **`verificar-respaldo` y `respaldo-correo-mensual` la tenían igual**,
  y las dos son públicas. El dueño ya rotó esa clave, así que ese valor concreto quedó neutralizado
  — pero las 2 funciones estaban rotas desde entonces (no podían enviar). Ahora las 3 leen el
  Secret `GMAIL_PASS`, igual que la primera. **Lección: cuando se saca un secreto del código, hay
  que buscarlo en TODAS las funciones, no solo en la que se está mirando.**
- **`respaldo-diario` dejaba fuera 59 tablas con datos.** Su lista de tablas estaba **escrita a
  mano** hacía un año: cubría el núcleo de Seguros y **nada** del POS, Rifas, Consultorio, AGUAPRO,
  Financiamiento, Clientes SaaS ni NEXUS AI CONTENT — ni siquiera `organizaciones`/`profiles`, sin
  las cuales no se podrían restaurar los logins. Un respaldo que no respalda el negocio es peor que
  no tenerlo: da confianza falsa. Ahora la lista **se descubre sola** con
  `tablas_para_respaldo()` (SQL `SECURITY DEFINER`, `EXECUTE` solo para `service_role`), así que un
  módulo nuevo entra al respaldo sin que nadie se acuerde. **`cron_secretos` se excluye a
  propósito** — meterla pondría los secretos compartidos dentro de un archivo del bucket.
  Queda `TABLAS_MINIMAS` como red de seguridad si la consulta fallara.
- **El peligro real de dejar `respaldo-diario` abierta** (por eso no era solo "spam"): rota y
  conserva **solo 4 copias**. Cualquiera podía llamarla 4 veces seguidas y **borrar todo el
  historial de respaldos reales**, dejando 4 copias idénticas del mismo instante.
- **Las 3 llevan ahora el mismo `x-cron-token`** (secretos propios en `cron_secretos`), y los jobs
  5, 6 y 7 se actualizaron para mandarlo. De paso se descubrió que esos 3 jobs llevaban años
  mandando un `Authorization: Bearer` que **era la clave anónima** — no protegía nada.
- **Verificado con llamadas HTTPS reales:** las 3 sin token → **401**; `verificar-respaldo` con
  token → **200** con datos correctos (último respaldo, 4 copias); `respaldo-diario` con token →
  generó un respaldo de **10.46 MB frente a los 4.43 MB del día anterior** — la prueba medida de
  que ahora sí entra todo (la lista de respaldo mínima es MÁS corta que la vieja, así que un fallo
  del descubrimiento habría dado menos de 4 MB, no más de 10).
- **Efecto de la prueba, dicho claro:** esa llamada creó un respaldo real y la rotación sacó el más
  viejo (22-jul). Se cambió una copia vieja parcial por una nueva completa.

### El reporte diario ya no lo puede disparar cualquiera desde internet (26-jul-2026, v49.56)
Punto #6 de la lista. `enviar-reporte-email` es `verify_jwt:false` (tiene que serlo, la llama un cron)
y **no comprobaba nada**: un `POST` desde cualquier parte del mundo disparaba el reporte del dueño.
- **Hallazgo que cambió el plan (por eso NO se hizo lo obvio):** la lista decía "poner
  `verify_jwt:true`". **Eso no habría protegido nada** — la clave anónima es PÚBLICA (va escrita en
  `index.html`, tiene que estar ahí para el login) y el gateway de Supabase la acepta como un JWT
  válido. Comprobado de verdad, no supuesto: con la clave anónima la función responde **401**.
  La comprobación real tiene que estar DENTRO de la función.
- **`quienLlama(req, supabase)`** (nueva, arriba de `Deno.serve`): acepta solo dos. (1) El **cron**,
  que manda un **secreto compartido** en el header `x-cron-token`; (2) un **usuario logueado con rol
  admin** (`auth.getUser(token)` → `profiles.rol==='admin'`). Cualquier otra cosa: 401 con el motivo
  concreto. También acepta la service_role por si hace falta una llamada manual.
- **Tabla nueva `cron_secretos`** (migración `cron_secretos_para_funciones`): RLS **activado y CERO
  políticas a propósito** — ni `anon` ni `authenticated` la ven; solo la service_role, o sea solo la
  función Edge por dentro. El secreto se generó con `gen_random_bytes(32)` dentro de la propia base:
  **nunca pasó por el navegador ni por este chat**.
- **Por qué un secreto compartido y no la service_role key:** se descubrió que los 3 jobs de respaldo
  (`respaldo-diario`/`respaldo-correo-mensual`/`verificar-respaldo`) llevaban años mandando un
  `Authorization: Bearer` que **es la clave ANÓNIMA**, no la de servicio (decodificada su carga:
  `"role":"anon"`). La base no puede firmar un token de servicio (`app.settings.jwt_secret` no es
  visible desde SQL, `pgjwt` no está instalado), así que la única salida sin pedirle nada al dueño
  era un secreto que ambos lados sí pueden leer. **El primer intento falló justo por esto** — el cron
  salió 401 en la prueba, y ahí se destapó que la clave guardada no era la que se creía.
- **Frontend (`nxProbarReporte`, `parches.js`):** el botón "Enviar reporte de prueba" mandaba
  `api.key` (la anónima); ahora manda `api.token || api.key` — el token de la SESIÓN — más `apikey`
  aparte. Mismo patrón que `API.hdr()` usa en todo el resto del sistema.
- **Verificado con llamadas HTTPS reales** (`pg_net`, la única salida de red de este entorno) contra
  la función ya desplegada: sin credencial → **401**; con la clave anónima pública → **401**; con un
  token de cron inventado → **401**; **como el cron real → pasa la puerta** (llega al aviso de
  `GMAIL_PASS`, que es el pendiente del dueño, no una regresión).
- **NO verificable desde aquí (queda al dueño, y se sabe cómo se ve):** la ruta del admin necesita un
  JWT de sesión real, que este entorno no puede emitir. Está construida sobre dos cosas ya
  confirmadas por SQL (`profiles.rol` de sterlin08 es `admin`). **Prueba para el dueño:** al tocar
  "Enviar reporte de prueba", si sale *"Falta el secreto GMAIL_PASS"* la puerta lo dejó pasar (bien);
  si saliera *"No autorizado"*, no.
- **Pendiente del mismo tipo, NO hecho (se documenta, no se improvisa):** `respaldo-diario`,
  `respaldo-correo-mensual` y `verificar-respaldo` siguen abiertas igual — cualquiera puede
  dispararlas (llenar el bucket de respaldos, mandar correos). El arreglo es idéntico: un
  `x-cron-token` propio en `cron_secretos` + la misma puerta. Son 3 redespliegues completos.

### Borradas 5 tablas muertas que estaban abiertas a cualquier usuario (26-jul-2026)
Punto #4 de la lista de pendientes. Eran andamiaje de cosas que nunca se conectaron, y las 5 tenían
RLS `USING(true)` **para cualquier usuario logueado de cualquier empresa** — o sea, Francis o el
doctor podían borrarlas enteras.
- **`roles` (5), `permissions` (37), `role_permissions` (59), `user_permissions` (0)** — un sistema
  de permisos que jamás se enganchó al frontend. **Verificado antes de borrar, no asumido:** cero
  referencias en `index.html`/`parches.js`, cero claves foráneas apuntándoles, y `permissions.name`
  estaba **NULL en las 37 filas** (ni siquiera era configuración real). El sistema de permisos que
  SÍ funciona es `configuracion.roles_perms` (jsonb) → `localStorage nx_roles_perms` →
  `tienePermiso()`, confirmado leyendo la función. Los 5 roles guardados (ADMINISTRADOR/SUPERVISOR/
  AGENTE/CAJERO/COBROS) quedaron registrados en el chat antes de borrar, por si alguna vez se
  quisieran de referencia.
- **`changelog`** — una tabla con **una sola columna (`id`)**, **cero filas** y cero referencias. El
  historial de versiones que ve el dueño vive en `version.json`, no aquí.
- **Resultado medido:** ya no queda **ninguna** tabla con `USING(true)` de escritura en toda la base.
  Las 2 que siguen con `USING(true)` son de **solo lectura** y a propósito: `organizaciones`
  (el login necesita leerla antes de que haya sesión — sus escrituras ya son solo-admin desde la
  Ronda 1) y `ai_content_niches` (catálogo global de plantillas; escribir sigue siendo solo-admin).
- Migraciones `borrar_tablas_permisos_muertas` y `borrar_tabla_changelog_vacia`. Cero cambios de
  código.

### Accesibilidad — el sistema completo se puede usar sin mouse (26-jul-2026, v49.55)
Cierra el punto #3 de la lista: los 144 botones de solo ícono sin nombre y los 112 elementos
clicables sin teclado que la Ronda 3 había dejado explícitamente sin tocar ("hay que redactar cada
etiqueta a mano" / "hay que decidir caso por caso").
- **Botones de solo ícono: 328 → 0 sin nombre.** Los 144 que faltaban no tenían ningún `title` de
  donde derivar la etiqueta, así que se **escribieron a mano en español**, agrupando por (ícono +
  función que llama): se midieron **82 pares distintos** cubriendo los 150 botones, y cada uno se
  redactó por lo que de verdad hace — "Eliminar este artículo", "Editar este empleado", "Registrar un
  pago al proveedor", "Limpiar el patrón", "Borrar el último dígito", "Página anterior". Los 6
  botones de editar de NEXUS AI CONTENT (que llamaban todos a `nxAiEditar(n)`) se desambiguaron
  mirando dentro de qué tarjeta vive cada uno: Empresa / Nicho / Objetivos / Público / Marca /
  Pilares.
- **108 elementos clicables que no son `<button>`** (menú lateral `.ni`, accesos rápidos del
  Dashboard `.qa`, filas de tabla, tarjetas de préstamo/vehículo, chips de IMEI, tiles de
  configuración, números de cuenta que se copian al tocarlos) ahora llevan `tabindex="0"` +
  `onkeydown` que dispara la misma acción con Enter o Espacio. **`role="button"` sí para div/span/a,
  NO para `<tr>`/`<td>`** — ponerle rol de botón a una fila la saca del árbol de la tabla para el
  lector de pantalla, que es peor que el problema que resuelve.
- **Detalle técnico que importa para el futuro:** el `onkeydown` usa `event.keyCode==13||
  event.keyCode==32` en vez de `event.key==='Enter'` **a propósito** — la mayoría de estas etiquetas
  viven dentro de cadenas de JavaScript delimitadas por comilla simple en `parches.js`, y una comilla
  simple dentro del atributo habría cortado la cadena. `keyCode` no necesita ninguna comilla. El
  handler llama `this.click()` en vez de repetir el `onclick`, así que no hay lógica duplicada ni
  problemas de comillas anidadas.
- **11 elementos se dejaron SIN teclado a propósito** (y así debe quedarse): las capas de fondo que
  cierran una ventana al tocar afuera (`.overlay`, `.gs-overlay`, `.cs-overlay`, `#mobOverlay`,
  `.nxFP-sideOverlay`, `.nxTBackdrop`), los `<td>`/`<div>` cuyo único trabajo es
  `event.stopPropagation()`, y el tile de producto de AGUAPRO cuyo `onclick` queda **vacío** cuando
  no hay existencia. Darles foco crearía paradas de Tab que no hacen nada.
- **Aro de foco nuevo** para todo esto (`[tabindex="0"][role="button"]:focus-visible` +
  `tr/td[tabindex="0"]`, azul 2px con `outline-offset:-2px` para que no se salga de la fila).
- Verificado con Playwright cargando el **CSS y el marcado reales extraídos del archivo**: Tab llega
  al primer ítem del menú lateral con `role=button`, el aro se mide como `solid 2px rgb(37,99,235)`
  (no a ojo), **Enter** dispara `nav('dashboard')`, **Espacio** dispara `nav('facturas')` sin
  desplazar la página, y un botón de ícono recibe el foco con su nombre accesible — 0 errores de JS.
- Cambio 100% aditivo: solo atributos nuevos y una regla CSS. Ningún id, función, color, posición ni
  texto visible cambió. `node --check parches.js` limpio; los 3 `<script>` de `index.html` pasan
  `new Function()`; `version.json` válido.
- **Sigue pendiente de la Ronda 3:** los **14 selectores sin etiqueta** (hay que mirar el contexto de
  cada uno, no se puede mecanizar).

### SISTEMA ÚNICO DE BOTONES en todo el ERP (NPGS §12, 25-jul-2026, v49.52)
El dueño pidió "aplicar las skills de diseño" a los **botones**. Se cargaron `ui-ux-pro-max` y
`frontend-design`, pero el estándar que manda ya estaba escrito: **NPGS §12** ("todo el ERP debe
compartir exactamente: tipografía · iconos · **botones** · sombras · bordes…"). `DESIGN_SYSTEM.md`
tenía documentado que las **alturas** ya se habían normalizado (C4, v49.34) pero que seguían
existiendo **5 familias de clases de botón** con formas distintas.
- **Auditoría con medición real, no a ojo** (Playwright cargando el CSS REAL de los 2 archivos en
  el MISMO orden que producción — `index.html` primero, lo que inyecta `parches.js` después):
  16 botones representativos de las 5 familias daban **7 radios distintos** (0/7/8/9/11/12/14 px)
  y **6 pesos de letra** (400/500/600/700/800/900), con `:hover`/`:active`/`:focus-visible`
  ausentes en la mayoría y `:disabled` con 4 opacidades diferentes (.4/.45/.5/.55) o ninguna.
- **Arreglo — un solo bloque de CSS en `index.html`**, no 5 ediciones dispersas: normaliza SOLO la
  forma y los estados de las 5 familias (`radius:10px`, `font-weight:700`, piso de letra 12px,
  `transition` explícita, `hover`/`active` por brillo, `disabled` opacidad .5 + `not-allowed`,
  `focus-visible` con el acento de SU app). **El color no se toca** — cada app conserva el suyo
  (enmienda "un color por app" del NPGS §12).
  - **Por qué `html body …` + `!important`:** `parches.js` inyecta su CSS DESPUÉS de `index.html`,
    así que sin ese blindaje ganaría el suyo. Mismo patrón ya usado y documentado con el sidebar
    del POS y el de Financiamiento. Además `.btn.bsm.bghost` (0,3,0) le gana a `html body .btn`
    (0,1,2) por especificidad — el `!important` cubre ese caso sin tener que enumerar todos los
    compuestos posibles.
  - **`:active` con `filter:brightness()`, NUNCA `transform`** — el propio CLAUDE.md ya advierte
    que `transform:scale` en `:active` dentro de ventanas con `backdrop-filter` hace que el botón
    se "infle" en iPhone. El brillo no mueve nada de sitio.
  - **Excluidos a propósito** (no son botones de acción): chips/pastillas de filtro, pestañas,
    filas del menú lateral (26px, decretadas así en v47.6), steppers +/− de las tablas,
    `.nxFP-qbtn` (mosaico de acceso, es una tarjeta) y los botones circulares por diseño
    (`.mbbFavBtn`, `.mbbHead button`).
- **Lo único que podía cambiar el ancho se midió aparte:** subir la letra de `.btn` (11px) y
  `.bsm` (10px) al piso de 12px. Se probaron 4 filas reales del peor caso (acciones de WhatsApp
  masivo, filtros de Auditoría, barra de un modal, íconos de fila de tabla) a 390px — **ninguna
  cambió de alto ni se desbordó** (las filas ya usan `flex-wrap` y tenían holgura). Honesto: son
  4 casos representativos, no los 137 sitios que usan `.btn`.
- Verificado con **24 comprobaciones Playwright** midiendo el CSS real: los 16 botones quedan con
  **un solo radio (10px) y un solo peso (700)**, ninguna etiqueta bajo 12px, los 4 deshabilitados
  con la misma opacidad y `cursor:not-allowed`, todos con transición, el aro de foco visible en
  las 5 familias y **con el color de su app** (POS azul ≠ Financiamiento morado), los 4 colores de
  marca intactos (verde Guardar, azul Cobrar, azul Seguros, morado núcleo) y las alturas NPGS §3
  sin romperse (44/40/34). Capturas antes/después revisadas. Llaves del CSS balanceadas (734/734),
  `node --check parches.js` limpio, los 3 `<script>` de `index.html` pasan `new Function()`.
- **Pendiente si el dueño quiere seguir:** unificar también el **tamaño de letra por rol**
  (hoy va de 12 a 15px según la clase; NPGS no lo especifica) y los **iconos** dentro de los
  botones (tamaños 15/17/18px según la familia). Se dejó fuera de esta ronda a propósito: son las
  dos cosas que sí mueven el ancho del botón y merecen su propia medición.

### POS · Ajustes — rediseño visual (Tanda 3, pieza 3, CIERRA LA FASE 4, 25-jul-2026, v49.51)
`renderAjustes()` (la última pantalla del POS que quedaba con el diseño viejo) reskineada al look
premium `.nxPf` — mismo patrón que Caja/Compras/RRHH: salida envuelta en `.nxPf .nxAjWrap` +
`nxPfEnsureCSS()`. Las 8 secciones (Numeración de facturas · Recargo por mora · Garantía de
reparación · Secuencias de documentos · Roles y accesos · NCF · Vendedores y comisiones · Zona de
peligro) pasaron de una sola columna con separadores `border-top` a **8 tarjetas `.card` con su
`h4` + icono de color** (helper nuevo `ajCard(ico,color,titulo,desc)`, patrón `.card/h4` ya usado
en Contabilidad/Financiamiento). Los campos `.fr`/`.fr-row` viejos pasaron a `.g2`/`.fld`/`.inw`
(los del formulario de artículo) y los botones a `.ab g2/g3/g4 sm`. CSS nuevo scopeado a
`.nxAjWrap` (encabezados de tabla azules, filas theme-aware, `max-width:660px`, `ajd`/`ajbtns`) —
en modo oscuro ya no quedan recuadros ni campos blancos (antes tenían `#fff`/`#1e293b`/`#475569`
hardcodeados). **Cero cambios de lógica:** los 5 ids de campo (`cfgPrefCo`/`cfgPrefCr`/`cfgMoraPct`/
`cfgMoraDias`/`cfgGarantiaRepDias`) y los 16 `onclick`/`onchange` (`nxPosGuardarCfg`/`nxPosGuardarMora`/
`nxPosGuardarGarantiaRep`/`nxSecNueva`/`nxSecHistTodos`/`nxSecEdit`/`nxSecHistorial`/`nxRolNuevo`/
`nxStaffNuevo`/`nxAccesoEdit`/`nxRolPreview`/`nxNcfNuevo`/`nxNcfEdit`/`nxVendNuevo`/`nxVendEdit`/
`nxLimpiarPruebas`) quedaron idénticos; solo se agregaron `aria-label` a los botones de solo-ícono
de las tablas. Verificado con 39 pruebas Playwright del código real (`renderAjustes`/`ajCard`/
`ajustesSecuencias`/`ajustesRoles`/`ajustesNCF`/`ajustesVendedores`/`rolesLista` extraídos por
contenido + CSS real de `nxPfEnsureCSS`, con datos simulados): 8 tarjetas con los títulos
correctos, los 5 campos con su valor real, los 16 handlers enganchados, secuencias/NCF/vendedores/
roles mostrando sus datos reales, sin desbordes en 390px ni 1280px, 0 errores de consola, y en
modo oscuro tarjetas/campos/encabezados oscuros (medido con `getComputedStyle`, no a ojo).
`node --check parches.js` limpio; los 3 `<script>` de `index.html` pasan `new Function()`;
`version.json` válido. **Con esta pieza cierra la Tanda 3 y la Fase 4 completa** — los ~17 módulos
internos del POS están todos en `.nxPf`.
- **Nota del harness (repetida a propósito):** el bloque extraído YA declara `const NCF_DESC` — no
  hay que volver a declararlo en los stubs o el `<script>` entero muere con
  "Identifier already declared" y la página queda en blanco (pasó al construir esta prueba).

### POS · Recursos Humanos / Nómina — rediseño visual (Tanda 2, cierre, 25-jul-2026, v49.24)
`renderRRHH()` (pestañas Empleados y Nóminas del POS) reskineado al look premium `.nxPf` — mismo patrón
que Historial/Kardex/Reportes (v49.05-06): salida envuelta en `.nxPf .nxRhWrap` + `nxPfEnsureCSS()`,
KPIs `.nxCtaKpis`/`.nxCtaKpi` → `kpiPf()`/`.kpirow` (Empleados activos/Nómina mensual en `rhEmpleados`;
Total bruto/Deducciones/Neto en `rhNominaDetalle`), y CSS scopeado a `.nxRhWrap` para las tablas
(encabezado azul `--pf-blue-l`, filas theme-aware). **Cero cambios de cálculo** — nómina, deducciones de
ley (SFS 3.04%/AFP 2.87%/ISR), recibos y contabilidad (`postAsientoNomina`) intactos; solo el "vestido".
Verificado con 21 pruebas Playwright del código real (funciones `renderRRHH`/`rhEmpleados`/`rhNominas`/
`rhNominaDetalle`/`kpiPf` extraídas + CSS real de `nxPfEnsureCSS`, con empleados/nóminas simulados): 2
KPIs en Empleados, 3 en el detalle de nómina, 0 `.nxCtaKpi` viejos, tabla con 3 empleados / 2 líneas de
nómina, neto 64,800 correcto, variables de tema oscuro aplican en `.nxPf`, sin desbordes en 390px ni
1000px, 0 errores de consola. `node --check parches.js` limpio; los 3 `<script>` de `index.html` pasan
`new Function()`; `version.json` válido. **Con esta pieza cierra la Tanda 2** de la Fase 4 (Reparaciones,
Kardex, Historial de ventas, Reportes, Recursos Humanos — todos en `.nxPf`). **Pendiente Tanda 3**
(riesgo alto, dinero): Compras, Caja (arqueo), Ajustes (Contabilidad ya está en `.nxPf` desde v49.03).

### POS · Reparaciones — modal de diagnóstico (`nxRepVer`) rediseñado (23-jul-2026, v49.09)
El dueño pidió darle "el mismo look" al modal de diagnóstico (la ventana que abre al tocar una
reparación, donde se ve el equipo, se mueve el estado, se escribe diagnóstico/presupuesto y se
entrega/cobra) — para cerrar la continuidad visual con el formulario de "Recibir equipo" (v49.08).
Es también lo que cubre lo real de la **Diagnóstico Técnico V3** y **Recepción V3** de ChatGPT
(ambas dejadas en `chatgpt/visual-draft`): las dos convergen en las mismas 2 piezas NUEVAS que
**deliberadamente NO se construyeron** — "Piezas a reemplazar" y "Mano de obra" como líneas — porque
hoy el taller solo tiene un número manual `costo_piezas`, no consume piezas del inventario, y eso
sería un módulo nuevo con esquema nuevo (pendiente de que el dueño confirme si el taller descuenta
piezas del inventario). Todo lo demás real de esas dos specs ya está hecho entre v49.07/08/09.
- `nxRepVer` pasó del viejo modal `.nxPrForm` al look `.nxPf` — **mismo criterio quirúrgico: todos los
  ids (`repDiag`/`repPre2`/`repAbo2`, la clave `repEdit_<id>`) y las funciones (`nxRepEstado`/`nxRepDet`/
  `nxRepImprimir`/`nxRepEntregar`) intactos, cero cambios de lógica**. 4 tarjetas: Equipo (+cliente/
  tel/IMEI/recibido/técnico + caja de falla/físico/dejó), Estado (los `nxRepChip` de siempre, ahora
  theme-aware dentro de `.nxPf`), Diagnóstico (textarea + widget de clave/patrón), Presupuesto
  (presupuesto/avance + resumen en vivo).
- **Barra de pasos `.nxRepFlow`** que refleja el AVANCE real: marca "on" (azul) todos los pasos hasta
  el estado actual inclusive (`REP_ESTADOS.findIndex(estado)`), no solo el primero como en Recepción —
  aquí es más informativo mostrar progreso. Badge de estado en el header (`.bdg2`, pill nuevo con el
  color real del estado).
- **`nxRepEstim` generalizado** (retrocompatible): ahora acepta `(preId, aboId, boxId)` con los
  defaults de Recepción (`repPre`/`repAbo`/`nxRepEstimBox`) — el modal de diagnóstico lo llama con
  `('repPre2','repAbo2','nxRepEstimBox2')`. La llamada de Recepción (`nxRepEstim()`) sigue igual.
- CSS nuevo scopeado a `.nxPf` en `nxPfEnsureCSS()`: `.bdg2` (pill de estado) + `.nxPf .nxRepChip`/
  `.nxPf .nxRepChip.on` (los chips globales de estado, ahora con `var(--pf-*)` para verse bien en
  claro y oscuro — antes eran blancos hardcodeados).
- Verificado con Playwright, código real extraído (no reconstrucción — `nxRepVer`/`nxRepEstim`/`repEst`/
  `repDias`/`garantiaInfo`/`claveCapturaHTML`/`nxClaveBodyHTML`/`claveParse` tal cual): el modal abre con
  6 pasos (3 "on" para una reparación en 'reparando'), los 6 chips con el activo correcto, los ids
  presentes, el resumen calcula Presupuesto 3,500 − Avance 1,000 = Falta 2,500 (y baja a 0 al igualar),
  4 botones cuando no está entregado / 3 cuando sí (sin "Entregar") con la garantía mostrada; capturas
  claro y oscuro a 390px y 1280px sin desbordes, 0 errores. `node --check parches.js` limpio; los 3
  `<script>` de `index.html` pasan `new Function()`; `version.json` válido.

### Verificación de la propuesta "Recepción de Equipos V2" de ChatGPT (23-jul-2026)
El dueño pidió verificar una spec corta que ChatGPT dejó en `chatgpt/visual-draft`
(`docs/visual-drafts/taller/RECEPCION_EQUIPOS_V2.md`, solo texto, sin mockup) para el formulario de
recibir equipo del taller. Auditada contra el código real (`nxRepNueva`, `REP_ESTADOS`, esquema
`pos_reparaciones`). Veredicto (para no fingir funciones): **la mayor parte NO es visual, es construir
funciones nuevas.**
- **Ya existe / no requiere cambio:** IMEI y Serie ya son opcionales en `nxRepNueva` (solo Cliente/Equipo/
  Falla llevan `*`); el código interno automático ya existe (`nextSeq('reparacion')` → `REP-#####`).
- **Estados inventados:** la "barra de progreso" que propone tiene 8 pasos (Recibido→Diagnóstico→
  **Presupuesto**→**Aprobación**→Reparación→**Control de calidad**→Listo→Entregado) — pero los estados
  REALES de `pos_reparaciones` son solo 6 (recibido/diagnostico/reparando/esperando_pieza/listo/entregado,
  +cancelado). Presupuesto/Aprobación/Control de calidad NO existen. Una barra con los 6 estados reales sí
  se podría, pero no con los 8 del mockup.
- **Funciones nuevas, no visuales (requieren esquema + lógica):** "Panel de Piezas a reemplazar con
  buscador, disponibilidad y costos" — el taller NO consume piezas del inventario hoy (decisión ya
  documentada en Fase 5 del Kardex Inteligente: `pos_reparaciones` solo tiene un costo manual, sin ligar a
  `pos_productos`); "Panel de Mano de obra" — no existe campo de mano de obra separado. Construir esos 2
  paneles sería un módulo nuevo (tablas/columnas + lógica), no un reskin.
- **Se puede hacer con datos reales:** el "Resumen estimado lateral" (deriva de Presupuesto/Avance que ya
  existen). **Conclusión comunicada al dueño:** de la V2, casi todo lo aprovechable ya existe; lo nuevo
  (piezas + mano de obra) es construcción de funciones que se agenda aparte si el dueño la quiere, no se
  finge. NO se implementó nada de la V2 en esta ronda (solo el reskin del kanban, arriba).

### AUDITORÍA CONTRA INFOPLUS — Contabilidad, costo/margen, botones estándar (22-jul-2026, v48.89)
El dueño pidió mejorar Prefactura y, más ampliamente, auditar el sistema contra InfoPlus antes de seguir
vendiéndolo — quiere catálogo de cuentas bien organizado, costo/ganancia/destino contable por artículo, y
botones estándar (Guardar/Imprimir/Guardar e imprimir/Cancelar/Cerrar/Devolver/buscador/tabulación) en
todas las pantallas transaccionales. Aclaración honesta: este entorno no tiene salida a internet, no se
pudo navegar InfoplusWEB en vivo — la auditoría se hizo 100% contra el código real de `parches.js` (3
agentes de investigación en paralelo, con evidencia archivo:línea, sin inventar nada).
- **Contabilidad — hallazgos:** el núcleo de partida doble es real (Debe=Haber y Activo=Pasivo+Capital se
  validan de verdad), catálogo de cuentas con código editable desde la UI, 4 reportes + Balance General.
  Gaps reales: sin jerarquía de cuentas (todo plano), **falla en silencio** si el plan de cuentas no existe
  (las ventas dejan de contabilizarse sin ningún aviso), devoluciones no revierten el inventario contable,
  nómina agrupa todas las deducciones en una sola cuenta, sin centro de costo/presupuesto/cierre de período.
- **Costo/margen/destino por artículo — hallazgo más importante:** hoy **TODAS las ventas van a una sola
  cuenta de ingreso (4101)**, sin importar qué se vendió — no existe ningún campo de "cuenta contable" en
  `pos_productos` ni en `pos_categorias`, así que no se puede saber cuánto generó cada línea de negocio por
  separado en el Estado de Resultados. Además, el costo de una venta se recalcula SIEMPRE con el costo de
  HOY (`pos_venta_items` no guarda un snapshot del costo real del día de la venta — confirmado en el INSERT
  real de `nxPosConfirmar`), y el costeo es "última compra" puro, sin promedio ponderado.
- **Botones estándar — hallazgos:** el botón "Cancelar" de Prefactura/Factura en realidad solo vaciaba el
  carrito (llamaba a `nxPosVaciar`), dejando cliente/NCF/fecha intactos — no era un cancelar real. Prefactura
  no tenía forma de imprimir antes de guardar ni combo "Guardar e imprimir" (Compras SÍ lo tenía, era el
  patrón a copiar). Sin botón "Devolver" accesible desde dentro de Factura/el ticket — solo desde Historial.
  3 patrones de icono de cierre distintos coexisten en el sistema, sin estándar único.
- **Plan de 3 fases acordado con el dueño** (por orden de riesgo, confirmado — se empezó por la Fase A que
  es justo lo que pidió abrir la conversación): **Fase A** (botones de Prefactura/Factura, bajo riesgo) →
  **Fase B** (costo y destino contable por artículo, riesgo medio) → **Fase C** (contabilidad más robusta:
  aviso si falta plan de cuentas, reversar inventario en devoluciones, separar retenciones de nómina, alto
  riesgo por tocar dinero directamente). Fase A es la única hecha hasta ahora.
- **FASE A — HECHA (v48.89), 3 cambios quirúrgicos, cero lógica de cobro/inventario/contabilidad tocada:**
  1. **`nxFacCancelar()` nuevo** (junto a `nxFacSetCredito`, mismo IIFE): reusa EXACTAMENTE el mismo reset
     de estado que el sistema ya usa tras un cobro exitoso (`_cart=[]`, `_factCli=''`, `_facNCF='sin'`,
     `_facCredito=false`, `_facFecha=''`, `_facSubTab='datos'`, seguido de `renderPOS(view)` — un
     re-render completo, no un repintado parcial, para que el botón de cliente/chips de NCF/fecha se
     limpien visualmente también). Pide confirmación SOLO si hay algo que perder (carrito, cliente,
     crédito o NCF distinto de "sin") — cancelar un formulario vacío no interrumpe con un diálogo inútil.
     Reemplaza el `onclick="window.nxPosVaciar();window.nxFacRepaint()"` de siempre.
  2. **Combo "Guardar e imprimir" en Prefactura** (mismo patrón visual que ya usa Compras — Cancelar/
     Guardar e imprimir/Guardar en una fila): `nxPrefGuardar(imprimir)` ganó un parámetro opcional — si es
     `true`, después de guardar con éxito llama a `window.nxPHImprimir(r[0].id)` (la función de impresión
     que YA existía, usada desde el historial de Prefacturas — se reusó tal cual, sin duplicar lógica de
     impresión). El botón "Guardar Prefactura" del panel "Opciones adicionales" se ocultó cuando ya se está
     EN la pestaña Prefactura (era redundante con el botón grande de abajo, que hace lo mismo) — se sigue
     mostrando en Factura, para poder guardar una factura en curso como prefactura en su lugar.
  3. **Botón "Devolver" en el ticket** (`ticketHTML`, el recibo que abre `nxPosConfirmar` al cobrar y
     `nxFacBuscarNum` al buscar una factura por número): usa `window.opener.nxDevNueva(id)` — el ticket es
     una ventana `window.open('','_blank')` aparte, así que llama a la función real del sistema en la
     ventana que lo abrió (mismo origen, `window.opener` disponible) en vez de duplicar la lógica de
     devolución. Gateado a `!v.anulada` — mismo criterio exacto que ya usaba el botón de Devolver en la
     fila de Historial (`!anulada`), para no ofrecer devolver algo ya anulado. Si se abre el ticket fuera
     del flujo normal (sin `opener`), muestra un aviso claro en vez de fallar en silencio.
  - CSS: `.nx-inv-actions` ganó `flex-wrap:wrap` + `.nx-inv-btn{flex:1 1 auto}` +
    `.nx-inv-cobrar{flex:2 1 160px}` (antes `flex:2` sin base, podía apretar el botón de en medio en
    Prefactura con 3 botones) + regla móvil nueva (`@media max-width:640px`) que apila los 3 botones en
    columna — mismo criterio de resiliencia que ya usaba Compras (`flex-wrap:wrap` sin básculas fijas).
  - **Bug real encontrado y corregido DURANTE la verificación, no en producción:** el primer harness de
    prueba midió 13px de desborde horizontal en 390px — se investigó a fondo (comparando contra una copia
    sin los cambios de esta fase) y se confirmó que el desborde **no lo causaban los botones nuevos**
    (quitarlos del DOM de prueba no cambiaba el número) — el harness de prueba le faltaba el mismo reset
    `*{box-sizing:border-box;margin:0;padding:0}` que sí tiene `index.html` real (línea 38). Con el reset
    correcto, cero desbordes en las 4 combinaciones (Factura/Prefactura × 390px/1000px). Es una lección
    metodológica, no un bug del sistema: al construir un harness aislado para una pantalla que vive dentro
    de `.nxPf`, hay que copiar el reset global real de `index.html`, no uno inventado a mano.
  - **Verificado:** `nxFacCancelar` probado con 3 escenarios reales (nada que perder → sin confirmar;
    confirm=false → no resetea; confirm=true → resetea los 6 campos) — los 3 pasan. El ticket probado con
    venta normal (botón Devolver presente, usa `window.opener`) y venta anulada (botón ausente) — ambos
    casos correctos. Capturas Playwright de Factura y Prefactura en 390px/1000px sin desbordes. `node
    --check parches.js` limpio; los 3 `<script>` de `index.html` pasan `new Function()`; `version.json`
    válido.
- **Pendiente:** Fase B (destino contable configurable por producto/categoría + snapshot de costo real por
  venta) y Fase C (robustez de Contabilidad) — quedan para cuando el dueño confirme seguir, cada una se
  construye y prueba por separado dado que tocan dinero/reportes financieros directamente.
- **Primer mockup de ChatGPT recibido y auditado (v48.90):** el dueño mandó una captura armada con
  ChatGPT usando la guía del handoff (repo/ids/funciones reales que se le compartió) — el mockup en sí
  incluía explícitamente un recuadro "PROMPT PARA CLAUDE" con las reglas correctas ("mantener todos los
  IDs y ONCLICK actuales", "no modificar la lógica existente", "no inventar funciones nuevas") y hasta
  reconocía los botones "Cancelar prefactura"/"Guardar e imprimir" que se acababan de publicar en v48.89
  — señal de que el flujo ChatGPT-mockup → Claude-implementa está funcionando como se diseñó.
  - **Auditado contra el esquema real antes de construir:** de ~8 piezas del mockup, 3 eran 100% reales y
    seguras de implementar de inmediato (RNC/cédula, teléfono, correo y `activo` SÍ existen en
    `pos_clientes`, confirmado en `nxEntGuardar`), y 3 requerían decisión antes de tocar código —
    **no se construyeron sin confirmar, mismo criterio de "no fingir funciones que no existen"** de todo
    este archivo: (1) botón "Duplicar" — función nueva, no existe ningún `nxPrefDuplicar` hoy; (2) campo
    "Agregar nota o condiciones" — `pos_prefacturas` no tiene columna `notas` (confirmado en el `POST` real
    de `nxPrefGuardar`, solo manda `numero/cliente_id/cliente_nombre/items/total/created_by_name`),
    agregarlo requiere migración; (3) botón "+ Agregar producto" junto al buscador — **este SÍ se descartó
    activamente** (no solo "pendiente"): se había quitado a propósito en v48.41 por redundante con el
    buscador, reponerlo sin que el dueño lo pida de nuevo habría revertido esa decisión en silencio.
  - **Lo construido (100% real, cero datos inventados):** `facCliInfoHTML(c)` (compartida por Vender y
    Factura/Prefactura, `parches.js` junto a `saldoCli`) se amplió con una tarjeta de cliente
    (`.pf2clicard`): avatar con inicial, nombre, badge Activo/Inactivo (`c.activo!==false`), RNC o cédula
    según `tipo_persona`, teléfono, correo, y botón **"Ver perfil"** que llama a `window.nxCliente360(c.id)`
    — la función de la Fase 3 del Motor de Documentos, reusada tal cual, no una vista nueva. El balance/
    crédito disponible/última compra que ya existía (Fase 1 de NEXUS PRO 2.5, v48.78) se quedó exactamente
    igual, ahora dentro de la tarjeta. Badge **"BORRADOR · NO FISCAL"** junto al título, solo en modo
    Prefactura (`pre===true`) — aclara al cajero que ese documento no es fiscal, sin inventar ningún dato
    (es un texto fijo, no viene de la base). Contador **"N artículos · M unidades"** debajo de la tabla
    (`pintarFactura()`), calculado de `_cart.length`/`t.items` (`totales()`, ya existía ese campo).
  - **Verificado con datos de prueba realistas** (cliente jurídico completo: RNC, teléfono, correo, límite
    de crédito, con balance y crédito disponible reales) cargados en un navegador: la tarjeta muestra todos
    los campos correctos, "Ver perfil" llama a la función real con el id correcto, el badge de Prefactura
    solo aparece en esa pestaña (no en Factura), sin desbordes en 390px ni 1000px, 0 errores de JS. `node
    --check parches.js` limpio; los 3 `<script>` de `index.html` pasan `new Function()`; `version.json`
    válido.
  - **Seguimiento (v48.91) — la pieza "Agregar nota o condiciones", pedida explícitamente ("Solamente
    agregar nota"):** de las 3 piezas deferidas arriba, el dueño solo pidió esta. Migración aditiva
    `pos_prefacturas_notas` (`ALTER TABLE pos_prefacturas ADD COLUMN IF NOT EXISTS notas text`) —
    `get_advisors(security)` sin hallazgos nuevos. Solo en **Prefactura** (no en Factura — es una
    proforma, todavía no una venta): cuadro plegable `<details class="nx-inv-notedet">` debajo de la
    tabla de artículos ("Agregar nota o condiciones" → "Nota / condiciones" una vez que tiene texto),
    textarea a 16px (anti-zoom iOS, mismo criterio que el resto del formulario), `maxlength="500"`.
    Variable de módulo `_facNota` (junto a `_factCli`/`_facNCF`/`_facCredito`), `window.nxFacNotaSet(v)`
    la actualiza en cada tecla. `nxPrefGuardar` manda `notas:_facNota||null` en el `POST` a
    `pos_prefacturas` y limpia `_facNota=''` tras guardar con éxito; `nxFacCancelar()` también la limpia
    en su reset. Se muestra en 2 lugares que leen el mismo dato guardado, sin lógica repetida:
    `nxPHVer` (detalle de una prefactura, bloque `<b>Nota:</b>` solo si `p.notas` existe) y
    `nxPHImprimir` (proforma imprimible, línea "Nota / condiciones" justo antes del aviso de "documento
    no fiscal") — en ambos, si no hay nota, no aparece ningún bloque vacío. CSS nuevo
    `.nx-inv-notedet` en el bloque `.nx-invoice-pro` de siempre (borde/radio/tipografía consistente con
    el resto de la tarjeta). **Deliberadamente NO tocado:** el botón "Duplicar" y el "+ Agregar
    producto" — el dueño pidió solo la nota, esas 2 piezas siguen fuera de alcance sin reabrir esa
    decisión. Verificado con Playwright (8 aserciones contra el código real extraído de
    `nxFacNotaSet`/`nxFacCancelar`/`nxPrefGuardar`/`nxPHVer`/`nxPHImprimir`): escribir la nota actualiza
    el estado, cancelar la limpia junto con el carrito, guardar la incluye en el `POST` y la limpia
    después, guardar sin nota manda `notas:null`, el detalle y la proforma muestran la nota cuando
    existe y la omiten por completo cuando no — más una verificación visual del widget (toggle
    abre/cierra, escribir funciona) sin desbordes en 390px ni 1000px. `node --check parches.js` limpio;
    los 3 `<script>` de `index.html` pasan `new Function()`; `version.json` válido.

### POS · Factura/Prefactura — 5 ajustes puntuales pedidos por el dueño (22-jul-2026, v48.92)
El dueño mandó una lista corta de 6 puntos sobre la pantalla de Facturación. Investigado cada uno contra
el código real antes de tocar nada (mismo criterio de siempre — no asumir).
- **(1) "Compactar Tipo de comprobante":** era una fila de 5 botones-píldora (`ncfChips`/`.pf2chip`) que
  se enrollaba en 2-3 líneas. Se cambió a un `<select id="facNCFSel">` de una sola línea — mismo patrón ya
  usado para "Fecha" en el mismo grid (`.nx-inv-field select`, CSS ya existente, no hizo falta CSS nuevo
  para el campo en sí). `window.nxFacNCFPick(v)` se simplificó (ya no hay chips que resaltar con
  `classList.toggle`, el propio `<select>` refleja el valor elegido). **Limpieza de paso:** `.pf2chip`/
  `.pf2chiprow` (CSS en `nxPfEnsureCSS()`) se borraron por completo — confirmado con grep que no los usaba
  nada más en todo el archivo (regla #1 del reglamento, "depurar — quitar dead code").
- **(2)+(3) Lupa 🔍 de "Prefacturas" junto a "Tipo de comprobante":** el dueño pidió el mismo patrón
  "lupa+click abre ventana" que ya usa "No. Factura" (su lupa abre el Historial, `nxFacHist`) pero para
  Prefacturas. Se agregó un `.nx-inv-iconbtn` (mismo componente, morado `#7c3aed` como el resto de acentos
  de Prefactura) DENTRO del campo "Tipo de comprobante", a la izquierda del `<select>`, con
  `onclick="window.nxPrefLista()"` (función ya existente, sin tocar). El botón "Prefacturas" que antes
  vivía solo en el `.nx-inv-toolbar` de abajo (compartiendo fila con "Limpiar carrito") se QUITÓ de ahí —
  quedaba redundante con la lupa nueva — y el toolbar pasó a una sola columna con solo "Limpiar carrito".
- **(4) "Historial es la misma lupa que está al lado izquierdo de No. de Factura":** confirmado, no era un
  pedido de cambio — el dueño estaba verificando que ya es así (`nx-inv-iconbtn` de `numField`,
  `onclick="window.nxFacHist()"`), correcto desde v48.39. No se tocó.
- **(5) — la pieza más grande: "al hacer clic en un historial de factura, que la jale a la misma ventana
  de facturación con los mismos campos llenos, por si quiero corregir algo".** Investigado primero: hoy
  tanto tocar una fila del Historial (`nxFacHistRows`) como escribir un número y Enter (`nxFacBuscarNum`)
  solo abrían el TICKET de reimpresión (`window.nxPosTicket`) — un recibo chiquito de solo lectura, no la
  cara de la pantalla de Facturación. **Decisión de arquitectura tomada con cuidado, no antojo:** el propio
  código del sistema ya documenta la regla "Factura, una vez confirmada, no se edita (solo se anula)" — así
  que NO se implementó "cargar la factura vieja en `_cart`/`_factCli` y dejarla lista para tocar Cobrar de
  nuevo" (eso arriesgaría un cobro duplicado/NCF duplicado, exactamente el tipo de bug de dinero que este
  archivo lleva toda la sesión evitando). En su lugar se construyó **`window.nxFacVerVenta(ventaId)`**: un
  modal nuevo con la MISMA cara visual que la pantalla de Facturación (`.nxPf`/`.nx-inv-*`, mismos
  recuadros Cliente/Tipo de comprobante/Fecha, mismo estilo de tabla) — pero de **solo lectura**: título con
  el número de factura + badge "YA FACTURADA" (verde) o "ANULADA" (rojo), 4 campos (Cliente, Tipo de
  comprobante con su NCF real, Fecha, Método de pago), tabla de artículos (cantidad/nombre/precio/importe,
  con `data-l` para que colapse igual de bien a tarjetas en el celular que el resto de tablas `.nx-inv-*`),
  total, y una fila de acciones REALES para corregir: **Imprimir** (reusa `nxPosTicketVenta`, ya existía),
  **Ver cadena** (reusa `nxDocCadena`, Motor de Documentos Fases 1-2), y si la factura NO está anulada,
  **Nota de crédito** (reusa `nxDevNueva`) y **Anular** (reusa `nxPosAnularVenta`) — los 4 son funciones
  YA EXISTENTES, cero lógica de corrección nueva, solo se juntaron en un solo lugar de un toque. Se
  reemplazó `window.nxPosTicket(...)` por `window.nxFacVerVenta(...)` en los 2 puntos de entrada
  (`nxFacHistRows` — la fila del historial cierra su propio modal antes de abrir el nuevo — y
  `nxFacBuscarNum`). El botón "Ver cadena" de la fila del historial (que ya existía, `event.stopPropagation`)
  no se tocó. `nxPosTicket` (el original) se dejó intacto — lo sigue usando "Historial de ventas" (pantalla
  aparte del sidebar, `renderVentas`, fuera de alcance de este pedido).
- **(6) "Cliente por mayor solo factura el precio de ese nivel":** investigado `precioCli(p)` y los 3
  caminos reales para agregar un artículo (`nxFacAdd`, `nxProdPickAdd`→`nxFacAdd`, sugerencias del
  buscador) — los 3 ya pasan por `precioCli()`, que ya prioriza `nivel_id` específico del cliente (precio
  configurado en `pos_producto_niveles`) sobre el legado `nivel_precio==='mayor'` sobre el precio de lista
  — esto viene de la Fase 1 de NEXUS PRO X 2026 (v48.27) y el bug ya arreglado en v48.36. **No se encontró
  ningún bug real** — se verificó con 3 escenarios (cliente normal, cliente "por mayor" legado, cliente con
  un nivel de precio específico configurado) que cada uno cobra exactamente el precio que le corresponde.
  No hizo falta ningún cambio de código para este punto — se deja documentado aquí como confirmación.
- Verificado con Playwright, código real extraído del archivo (no una reconstrucción): el `<select>` de
  comprobante cambia `_facNCF` correctamente, la lupa de Prefacturas dispara `nxPrefLista()`, el toolbar
  quedó con un solo botón, tocar una fila del historial cierra el modal de Historial y abre
  `nxFacVerVenta` con los datos correctos (cliente/comprobante+NCF/fecha/método/items/total), escribir un
  número de factura existente hace lo mismo, una factura anulada muestra solo Imprimir+Ver cadena (sin
  Nota de crédito ni Anular), tocar "Imprimir" llama a `nxPosTicketVenta` con el id correcto, y los 3
  escenarios de `precioCli()` calculan el precio correcto — sin desbordes en 390px, 812px (el mismo ancho
  de la captura real que mandó el dueño desde su iPhone en horizontal) ni 1100px, 0 errores de JS. `node
  --check parches.js` limpio; los 3 `<script>` de `index.html` pasan `new Function()`; `version.json`
  válido.

### POS · Factura — segundo mockup de ChatGPT auditado, 2 piezas reales agregadas (22-jul-2026, v48.93)
El dueño mandó "Ahora continuamos con Factura" con otro mockup de ChatGPT (mismo formato que el de
Prefactura — incluye su propio "PROMPT PARA CLOUD (claude)"). Mismo criterio de auditoría de siempre:
comparar cada pieza del mockup contra el código/esquema real ANTES de construir, no copiar a ciegas.
- **La mayor parte de lo pedido YA estaba construido** (confirmado, no reconstruido): buscar/elegir
  cliente (`nxFacCliToggle`), buscar producto por código/nombre/referencia (`facBuscar`), editar cantidad/
  descuento por línea (`nxFacQtyStep`/`nxFacDesc`, con IMEI y Garantía que el mockup ni sabía que existían),
  ITBIS por artículo (ya viene del catálogo), resumen económico en vivo (`nx-inv-summary`), guardar como
  borrador (= "Guardar Prefactura", ya en el panel de opciones desde v48.29), y la historia completa de
  "buscar una prefactura y convertirla en factura manteniendo cliente y artículos" (`nxPrefLista`+
  `nxPrefFacturar`, reforzada con la lupa nueva de v48.92).
- **2 piezas nuevas y reales:**
  1. **Dirección del cliente en la tarjeta** (`facCliInfoHTML`, la misma tarjeta compartida entre Vender/
     Factura/Prefactura desde v48.90): se agregó una línea con `c.direccion` (columna real de
     `pos_clientes`, ya usada en Entidades/`nxPosCliVer`, solo no se mostraba aquí) — debajo de RNC/
     teléfono/correo, solo si el cliente la tiene, sin dejar ningún espacio vacío si no.
  2. **"Vista previa"** (`window.nxFacVistaPrevia()`, botón nuevo en `.nx-inv-actions`, junto a
     "Cancelar"): abre un modal de SOLO LECTURA (mismo lenguaje visual `.nx-inv-*` que `nxFacVerVenta`,
     la ventana de "ver factura del historial" de v48.92 — comparten estilo, no lógica) con lo que HAY
     en pantalla ahora mismo (cliente, tipo de comprobante, fecha, condición de pago, artículos,
     subtotal/descuento/ITBIS/total) — **no escribe nada** (ni `pos_ventas` ni `pos_prefacturas`), es
     puro cálculo con `_cart`/`clienteSel()`/`totales()` ya en memoria. Deshabilitado si el carrito está
     vacío. Con esto el dueño puede revisar el documento completo antes de tocar Cobrar/Guardar, tal
     como pedía el mockup ("Vista previa del documento" en la lista de funcionalidades clave).
- **Piezas del mockup deliberadamente NO construidas, con su razón real (mismo criterio de "no fingir
  funciones que no existen" de siempre):**
  - **"Duplicar"** — no hay qué duplicar: la pantalla antes de guardar es un documento en blanco, no un
    registro existente. (Mismo botón que ya se había descartado en el mockup de Prefactura, v48.90.)
  - **Badge "AUTORIZADO"** — un documento que todavía se está armando no tiene ningún estado real de
    autorización (eso solo ocurre al consumir el NCF en `nxPosConfirmar`) — mostrarlo antes sería un dato
    inventado, exactamente lo que este archivo evita en cada módulo.
  - **Ícono de escanear código de barras** — ya documentado como gap real del sistema
    ("escáner con cámara — BarcodeDetector NO existe en iPhone/Safari — evaluar librería", sección de
    investigación POS vs mercado) — agregar el ícono sin la función real detrás habría sido un botón
    muerto.
  - **"+ Agregar producto"** — se había quitado a propósito en v48.41 por redundante con el buscador; no
    se reabre esa decisión sin que el dueño lo pida de nuevo explícitamente (mismo criterio aplicado en
    el mockup de Prefactura).
  - **Selector de "Moneda"** — el sistema no maneja multi-moneda (gap ya documentado en "Análisis POS vs
    Infoplus"); un selector con una sola opción real (DOP) habría sido decorativo, no funcional.
  - **Campo de "Hora" separado** — la fecha ya guarda hora automáticamente (`created_at`/`fecha`
    timestamp completo); pedirle al cajero que la teclee a mano sería trabajo extra sin beneficio real.
  - **"Vencimiento"** — no existe un concepto de fecha de vencimiento por factura en el esquema actual
    (`pos_ventas` no tiene esa columna); agregarla sin un flujo real detrás (recordatorios, mora, etc.)
    habría sido un campo huérfano.
- Verificado con Playwright, código real extraído del archivo (no una reconstrucción): la dirección se
  muestra cuando el cliente la tiene y el bloque no aparece vacío cuando no, el botón "Vista previa" se
  deshabilita con el carrito vacío, y al tocarlo abre el modal con cliente/comprobante/fecha/condición/
  artículos/subtotal/ITBIS/total exactamente correctos (probado con un cliente jurídico con RNC completo
  y una línea con descuento e ITBIS) — sin desbordes en 375-414px ni 1000px, 0 errores de JS. `node
  --check parches.js` limpio; los 3 `<script>` de `index.html` pasan `new Function()`; `version.json`
  válido.

### POS · Factura/Prefactura — reacomodo y compactado, 6 pedidos rápidos del dueño (22-jul-2026, v48.94)
El dueño dio una lista rápida de 6 ajustes de layout mirando la pantalla en vivo (texto suelto, sin
numerar bien — se interpretó cada uno contra el código real y se ejecutó todo junto por ser cambios
pequeños y muy relacionados entre sí, todos sobre `renderFactura()`/`pintarFactura()`).
- **(1) Lupa en Cliente:** el botón `#facCliBtn` (antes solo nombre+flecha) ahora tiene un ícono de lupa
  a la izquierda del nombre (dentro de un `<span>` envolvente, para no romper el `justify-content:
  space-between` de 2 hijos que ya tenía `.pf2clibtn` — 3 hijos directos habría descuadrado el layout).
- **(2) Al lado de esa lupa, el nombre/número de la Prefactura:** la lupa de "Ver prefacturas guardadas"
  (`nxPrefLista()`) que se había puesto junto a "Tipo de comprobante" en v48.92 SE MOVIÓ al lado del
  campo Cliente, con el número actual (`peekPref()`, ej. "PF-00002") visible junto a ella — mismo patrón
  visual que ya usaba `numField` en modo Prefactura. Gateado a `!pre` (NO se duplica cuando ya se está en
  Prefactura, porque ahí `numField` — el primer campo — ya muestra exactamente lo mismo).
- **(3) "Tipo de comprobante" más abajo:** salió del grid 2x2 de `.nx-inv-info` (que ahora solo tiene 3
  campos: número, Cliente, Fecha — el grid de 2 columnas deja la 2da columna de la fila 2 vacía, sin
  problema) y pasó a ser su propio campo de ancho completo, debajo de la tarjeta del cliente
  (`#facCliInfoWrap`) — genuinamente más abajo en la pantalla, no solo una columna distinta en la misma
  fila. Sigue siendo el `<select id="facNCFSel">` compacto de v48.92, solo cambió su posición.
- **(4) Quitados los botones de categoría:** la fila `.nx-inv-tabs` ("Todos"/categorías/"Servicio")
  desapareció por completo — el buscador de artículos ya encuentra por nombre/código sin necesitar
  filtro de categoría aparte. **Limpieza de dead code correspondiente:** `window.nxFacCat` (la función
  que pintaba esas pastillas y filtraba `_facSug` por categoría) y la variable `_facCatSel` se borraron
  — confirmado con grep que no los usaba nada más en el archivo — junto con las reglas CSS `.nx-inv-tabs`/
  `.nx-inv-tab`/`.nx-inv-tab.on` (regla #1 del reglamento: depurar).
- **(5)+(7) Buscador de artículos → lupa compacta:** el `<input id="facBuscar">` (antes siempre visible,
  ocupando una fila completa) ahora arranca como un solo botón-lupa (`#facSearchBox`, mismo patrón visual
  que ya usan "No. Factura"/"Tipo de comprobante"/Cliente). Al tocarlo, `window.nxFacSearchOpen()`
  reemplaza el contenido del contenedor por el MISMO `<input id="facBuscar">`/`onclick`/`oninput` de
  siempre (cero cambios en la lógica de búsqueda, `nxFacBuscar`/`nxFacBuscarEnter` intactos) y lo enfoca.
  `window.nxFacSearchMaybeClose()` (en el `onblur` del input) espera 200ms — igual que el patrón ya usado
  en otros buscadores de la sesión — y solo colapsa de vuelta a la lupa si el campo quedó vacío; ese
  retraso es lo que deja que un clic en una sugerencia de `#facSug` termine de dispararse ANTES de que el
  campo se destruya (si no, el clic nunca llegaría a `nxFacSugSel`). El flujo de escaneo rápido
  (`nxFacAdd` ya hacía `inp.value='';inp.focus()` tras agregar un artículo) sigue intacto — el campo
  nunca se colapsa a mitad de una sesión de escaneo porque nunca pierde el foco de verdad.
- **(6) "Guardar Prefactura" solo en Prefactura:** se quitó el botón `Guardar Prefactura` del panel
  "Opciones adicionales" de **Factura** (antes se mostraba ahí, oculto solo cuando ya se estaba en
  Prefactura, desde v48.29) — decisión de simplificación: guardar-como-prefactura ahora es una acción
  exclusiva de la propia pantalla de Prefactura (su botón grande "Guardar · $total", que ya existía) en
  vez de un atajo disperso dentro de las opciones de Factura. `nxPrefGuardar` (la función) no se tocó —
  sigue siendo la misma, solo se redujo desde dónde se puede llamar.
- **Nada de esto tocó lógica de negocio:** ni cálculo de precios, ni inventario, ni NCF, ni el flujo de
  cobro — todo cambio fue de posición/visibilidad de controles ya existentes o la forma en que se
  muestra un control (compacto vs siempre visible).
- Verificado con Playwright, código real extraído del archivo (no una reconstrucción), 12 aserciones:
  la lupa de Cliente existe, la lupa+número de Prefactura aparece junto a Cliente en Factura y llama a
  `nxPrefLista()`, en Prefactura NO se duplica (porque `numField` ya la muestra), "Tipo de comprobante"
  quedó fuera del grid y aparece justo después de la tarjeta del cliente, no quedan botones de
  categoría, el buscador arranca colapsado y se expande/filtra/vuelve a colapsar correctamente, y
  "Guardar Prefactura" ya no aparece en el panel de Factura — sin desbordes en 375-1100px, 0 errores de
  JS. `node --check parches.js` limpio; los 3 `<script>` de `index.html` pasan `new Function()`;
  `version.json` válido.

### POS · Inventario — color por IMEI/serial (22-jul-2026, v48.95)
El dueño pidió: "En inventario vamos a enlazar el color de los celulares junto a los IMEI, o sea cada
IMEI tiene un color." Columna nueva **`pos_seriales.color`** (text, nullable, migración
`pos_seriales_color`, aditiva) aplicada con las herramientas MCP de Supabase — `get_advisors(security)`
sin hallazgos nuevos.
- **Paleta fija, no texto libre:** `TEL_COLORES` (11 valores: Negro/Blanco/Azul/Rojo/Dorado/Plata/Verde/
  Morado/Rosado/Gris/Otro, cada uno con su hex) — mismo criterio de siempre en este sistema (evitar que
  cada quien escriba "negro"/"Negro"/"NEGRO" distinto, como ya se decidió con otros campos de vocabulario
  controlado). Helpers nuevos junto a `nxCargarSerialesDet` (mismo IIFE del POS): `colorHex(v)`/
  `colorLabel(v)` (buscan en la paleta), `colorDotHTML(v)` (un `<span>` circular de 9px con el hex real,
  con borde para que "Blanco" no se pierda en fondo blanco — devuelve `''` si no hay color, nunca un
  puntito roto) y `colorSelectHTML(id,val)` (el `<select>` de la paleta, con la opción actual
  preseleccionada).
- **Dónde se asigna el color:** "Administrar IMEI" (`nxSerialMgr`, se abre desde Inventario) ganó un
  campo nuevo **"Color de este lote (opcional)"** debajo del textarea de alta masiva — si se elige un
  color, `nxSerialAdd` lo manda en el `POST` de TODOS los IMEI de ese lote a la vez (agregar varios IMEI
  del mismo color de un tirón, el caso más común al recibir mercancía). Cada fila de la lista de
  "Disponibles" también ganó su propio `colorSelectHTML` + un botón de check — **`window.nxSerialColorSet
  (id, pid)`** nuevo, hace un `PATCH` puntual a `pos_seriales` con el color de ESE serial y refresca la
  lista — para corregir o completar el color de un IMEI que ya existía sin color, uno por uno.
- **Dónde se MUESTRA el color** (3 lugares, todos leyendo el mismo dato con el mismo helper, cero lógica
  repetida): (1) la ventanilla de elegir IMEI al vender/facturar (`ppkSerChipsHTML`, los chips del
  detalle de producto) — el puntito aparece junto al IMEI resaltado; (2) la ventana de asignar IMEI a una
  línea de Factura (`window.nxFacSerial`, el modal de checkboxes) — el puntito aparece junto a cada
  checkbox; (3) Artículo 360° (`nxArticulo360`, sección IMEI) — el puntito aparece junto a cada fila de
  serial, sea disponible o vendido. Los 3 sitios ya cargaban `color` de la consulta real (se agregó a la
  columna del `select=` donde hacía falta) o ya usaban `select=*` (Artículo 360°, sin cambio de query).
  IMEI sin color asignado se ven exactamente igual que antes de esta versión — `colorDotHTML` devuelve
  cadena vacía, no un espacio vacío ni un ícono roto.
- **Deliberadamente NO se agregó** un campo de color a nivel de PRODUCTO (`pos_productos`) — el color es
  por UNIDAD física (cada IMEI es un teléfono físico distinto, puede haber varios colores del mismo
  modelo en inventario), coherente con que `pos_seriales` ya es la tabla de unidades individuales, no el
  catálogo de modelos.
- **Verificado con Playwright + Node, código real extraído del archivo** (no una reconstrucción): 5
  pruebas — `nxSerialMgr` muestra el selector de color por lote y el selector de color por fila
  precargado con el valor real de cada serial (`negro`/`blanco`/sin color); `nxSerialAdd` manda el color
  del lote en el `POST` de todos los IMEI nuevos; `nxSerialColorSet` manda el `PATCH` correcto para un
  solo IMEI; `ppkSerChipsHTML` muestra el puntito de color correcto (y ninguno para el IMEI sin color);
  `nxFacSerial` muestra el puntito junto al checkbox correcto — las 5 pasan. Más una verificación
  dirigida (sin harness completo, ya que las 5 pruebas anteriores ya ejercitan los mismos helpers
  `colorDotHTML`/`colorSelectHTML` que usa `nxArticulo360`) confirmando que su línea `imeiHTML` arma el
  puntito correcto junto al IMEI y el nombre del cliente cuando está vendido. Captura de pantalla del
  modal "Administrar IMEI" a 390px sin desbordes. `node --check parches.js` limpio; los 3 `<script>` de
  `index.html` pasan `new Function()`; `version.json` válido.

### POS · Factura — tercer mockup de ChatGPT aplicado, ajustes de formato (22-jul-2026, v48.96)
El dueño mandó otro mockup ("PROMPT PARA CLOUD (claude)") con capturas de escritorio y móvil de Factura,
pidiendo aplicar ese formato "con la mejor calidad". Mismo criterio de auditoría que los mockups
anteriores (v48.90, v48.93): comparar cada pieza contra el código y el esquema reales antes de construir,
no copiar a ciegas — la mayoría del mockup ya coincidía con lo que se había construido en sesiones
anteriores (tarjeta de cliente completa, buscador compacto, resumen en vivo, contador de artículos,
"Vista previa"), así que el trabajo real fue de reacomodo, no de piezas nuevas.
- **(1) Título y etiqueta:** `renderFactura()` cambió el título de "FACTURACIÓN" a **"FACTURA"** (solo en
  esa pestaña) + una etiqueta nueva junto al nombre, **"DOCUMENTO DE VENTA"** (azul, `.nx-inv-draft` con
  color en línea) — Prefactura conserva exactamente su etiqueta de siempre ("BORRADOR · NO FISCAL"), sin
  tocar esa rama.
- **(2) Caja "Datos del documento":** "Tipo de comprobante" (que vivía como campo suelto de ancho completo,
  desde v48.94) y "Fecha" (que vivía en la fila de arriba junto a Cliente) ahora comparten una caja con su
  propio título — mismo patrón visual que `.nx-inv-sumtitle` del resumen — con los dos campos en un grid
  de 2 columnas que colapsa a 1 columna en el celular (reusa la clase `.nx-inv-info` tal cual, que ya
  tenía esa regla responsive — no hizo falta CSS nuevo). La fila de arriba (`.nx-inv-info` original) quedó
  solo con el número de documento y el Cliente.
- **(3) Almacén — bug real encontrado y corregido de paso:** el mockup traía un campo "Almacén". Al
  investigar se confirmó que el sistema YA tenía todo lo necesario para esto (`_almacenSel`/
  `nxPosSetAlmacen`, y hasta una función `almSelectorHTML()` ya escrita) desde el Multi-almacén (v26.6) —
  pero **`almSelectorHTML()` no se llamaba desde ningún lado del archivo** (confirmado con grep: cero
  usos), probablemente perdida en alguno de los rediseños de Vender/Factura de esta sesión. Un negocio con
  más de un almacén activo no tenía forma de elegir dónde se descontaba el stock al facturar. Se agregó el
  selector directo dentro de la caja "Datos del documento" (gateado a `_almacenes.length>1`, mismo criterio
  que el resto del sistema para no mostrar un selector inútil con un solo almacén), llamando al
  `window.nxPosSetAlmacen` YA EXISTENTE — cero lógica nueva, solo se le devolvió su entrada visual.
- **(4) Columna "Código/Ref" separada:** en `pintarFactura()`, el código del producto (antes
  `<div class="nx-inv-pcod">COD: xxx</div>` pegado en letra chica debajo del nombre, dentro de la celda
  "Producto") pasó a su propia columna de la tabla — header nuevo `<th>Código/Ref</th>` + celda
  `data-l="Código/Ref"` (para el colapso a tarjeta en el celular). `colspan` del estado vacío subió de 9 a
  10 (una columna más). **Limpieza de dead code correspondiente:** la clase CSS `.nx-inv-pcod` se borró —
  confirmado con grep que ya no la usaba nada más en el archivo (regla #1 del reglamento, "depurar").
- **Piezas del mockup dejadas fuera a propósito, cada una con su razón real (mismo criterio de "no
  reabrir decisiones ya tomadas sin que se pida explícito" de toda esta sesión):**
  - **"Duplicar"** — no hay nada que duplicar en una factura que todavía no existe (mismo motivo por el
    que se descartó en el mockup de Prefactura, v48.90).
  - **Etiqueta "AUTORIZADO"** — un documento en borrador no tiene ningún estado de autorización real
    todavía (eso solo pasa al confirmar el cobro) — mostrarlo antes sería un dato inventado, mismo
    criterio ya aplicado en v48.93 con este mismo mockup-cliente.
  - **Selector de "Vendedor" en la pantalla principal** — YA existe en la ventana de Cobrar
    (`posVendId`); agregarlo TAMBIÉN aquí crearía dos lugares distintos para elegir lo mismo, con riesgo
    real de que se contradigan entre sí. Se dejó fuera hasta que se pida resolver esa duplicación a
    propósito.
  - **Botón "+ Agregar producto"** — se había quitado en v48.41 por ser redundante con el buscador; no se
    reabre esa decisión sin que el dueño lo pida de nuevo.
  - **"Detalle del pago"/fichas de método de pago sueltas en la pantalla principal** (Moneda, Monto
    recibido, Cambio, Forma de cobro) — este mismo patrón ya se había considerado y descartado a propósito
    en v48.37 ("más riesgoso porque mueve lógica de cobro real al panel principal") — el mockup lo vuelve
    a mostrar, pero traerlo de vuelta es un cambio de mayor alcance sobre dinero en vivo que se hace en su
    propia ronda si el dueño lo pide de forma explícita, no inferido de una imagen.
- **Verificado con Playwright, código real extraído del archivo** (no una reconstrucción — `renderFactura`/
  `pintarFactura`/`facCliInfoHTML`/`totales`/`nxPfEnsureCSS` + el CSS real de `.nx-invoice-pro` extraído
  tal cual de `inyectarCSS()`, con datos simulados): el título y la etiqueta cambian según Factura/
  Prefactura, la caja "Datos del documento" muestra Tipo de comprobante + Fecha, el selector de Almacén
  aparece solo con más de un almacén y respeta cuál está activo, la tabla trae la columna Código/Ref con
  el valor correcto y separado del nombre, el estado vacío usa el `colspan` correcto — sin desbordes en
  390px ni 1000px (`scrollWidth===clientWidth` exacto en ambos), 0 errores de JS. `node --check
  parches.js` limpio; los 3 `<script>` de `index.html` pasan `new Function()`; `version.json` válido.

### POS · Factura — la lupa de Cliente y la de Artículo abren una ventana de verdad (22-jul-2026, v48.97)
El dueño: "Cuando se haga click en la lupa de cliente y en la de artículo abra la ventana." Investigado
antes de tocar código: en esta misma pantalla, las lupas de "No. Factura" (`nxFacHist()`) y "Tipo de
comprobante"/junto a Cliente (`nxPrefLista()`) YA abrían una ventana real (`.overlay`/`.modal`) — las
únicas 2 que NO lo hacían eran justo las que el dueño señaló: Cliente (`nxFacCliToggle`, desplegaba un
`<div class="pf2clidrop">` inline pegado debajo del botón) y Artículo (`nxFacSearchOpen`, convertía el
botón en un `<input>` en el mismo lugar). Inconsistencia real de UX, no solo percepción — coincide
exactamente con lo que reportó.
- **Cliente:** `window.nxFacCliToggle()` reescrito — ya no toca ningún `#facCliDrop` (ese `<div>` se
  quitó de las 2 pantallas que lo tenían, Vender y Factura/Prefactura, comparten la misma función desde
  v48.36) — ahora arma una ventana real (`#nxFacCliM`, `.overlay`/`.modal`, mismo patrón que
  `nxFacHist()`/`nxPrefLista()`/`nxProdPicker()`) con el buscador estándar (`posBuscador()`, reglamento
  de buscadores) + la lista de clientes. `pintarFacCliDrop(q)` (mismo nombre, se mantuvo para no romper
  su única llamada interna) ahora pinta dentro de `#facCliList` (el contenedor de la ventana) en vez de
  `#facCliDrop`. `nxFacCliPick(id)` — cero cambios de lógica (sigue llamando a `nxFacSetCli` y
  actualizando `#facCliTxt`), solo el cierre pasó de `classList.remove('open')` a `cerrarModal('nxFacCliM')`.
  Se quitó el listener global de "clic afuera cierra el dropdown" (ya no aplica — la ventana usa el mismo
  patrón de cerrar-al-tocar-el-fondo que ya tienen todas las demás en el sistema).
- **Artículo:** el botón-lupa (`#facSearchBox`) ya NO se convierte en un `<input>` inline — su `onclick`
  ahora llama directo a **`window.nxProdPicker('factura')`**, la ventana "Buscar artículo" que YA EXISTÍA
  en el sistema (el mismo catálogo completo con precio/existencia que usa "+Agregar producto" en Vender)
  — estaba construida y probada, solo hacía falta conectarla aquí. Cero función nueva. El atajo de
  teclado **F2** ("Buscar producto", ya documentado en el pie de la pantalla) también se actualizó para
  abrir esa misma ventana en vez de enfocar un campo que ya no existe.
- **Limpieza de dead code correspondiente (regla #1 del reglamento, "depurar"):** al dejar de usarse,
  se quitaron por completo `nxFacSearchOpen`, `nxFacSearchMaybeClose`, `nxFacBuscar`, `nxFacSugSel` y
  `nxFacBuscarEnter` (el buscador inline + su lógica de sugerencias/Enter-para-agregar, confirmado con
  grep que ningún otro lugar del archivo los llamaba), los 2 `<div class="pf2clidrop" id="facCliDrop">`
  (Vender y Factura), y las reglas CSS ya huérfanas `.pf2clidrop`/`.pf2clidrop.open`/`.pf2clidrop input`
  y `.nxFacSug`/`.nxFacSugIt`/`.nxFacSugNom`/`.nxFacSugSub`/`.nxFacSugPre`/`.nxFacSugEmpty` — verificado
  con grep que ninguna clase quedó sin CSS ni ninguna función sin caller antes de publicar. `nxVenderSel`
  (función distinta, para las filas del catálogo de Vender) no se tocó — solo compartía el bloque de
  código con las funciones que sí se removieron.
- **Decisión consciente, no un descuido:** al pasar de un campo de búsqueda con "Enter agrega directo si
  hay 1 solo resultado o coincide el código exacto" (bueno para lectores de código de barras) a una
  ventana de catálogo completo (clic en la fila → abre la ventanilla de precio/IMEI → botón "Agregar"),
  se pierde el atajo de una sola tecla para el escaneo rápido — el pedido explícito del dueño era que la
  lupa abriera una ventana, y se siguió al pie de la letra; si el flujo de escaneo rápido hace falta de
  vuelta, es un pedido aparte (la ventana de catálogo sigue filtrando en vivo mientras se escribe/escanea,
  solo que agregar requiere un toque más).
- **Verificado con Playwright, código real extraído del archivo** (no una reconstrucción —
  `nxFacCliToggle`/`pintarFacCliDrop`/`nxFacCliFiltrar`/`nxFacCliPick`/`nxProdPicker`/`pintarProdPick`/
  `nxProdPickAdd`/el atajo F2 real, con datos simulados): tocar la lupa de Cliente abre `#nxFacCliM` con
  el buscador y la lista; escribir filtra correctamente (sin mostrar clientes que no calzan); elegir un
  cliente cierra la ventana y actualiza `_factCli`/el texto del botón; tocar la lupa de Artículo abre
  `#nxProdPick` con el catálogo completo visible; F2 abre la misma ventana; elegir un artículo sin serial
  desde la ventanilla lo agrega al carrito — sin desbordes en 375px ni 1000px (`scrollWidth===clientWidth`
  exacto en ambos), 0 errores de JS. `node --check parches.js` limpio; los 3 `<script>` de `index.html`
  pasan `new Function()`; `version.json` válido.

### Animaciones del sistema — vocabulario CSS global reusable (v48.61)
El dueño pidió "darle animación al sistema" (mostró una referencia de un producto que renderiza HTML a
VIDEO — se le aclaró que eso genera archivos de video, no anima una app en vivo, y no encaja con la regla
de "sin build/npm/bundler" del proyecto; confirmó por `AskUserQuestion` que lo que quiere es **movimiento
real dentro de la interfaz**, no un video promocional). Se construyó un **vocabulario de animación
reusable** en el `<style>` central de `index.html` (después de las reglas de `.toast`, antes de que
termine el bloque `<style>` en la línea ~838) en vez de animaciones puntuales sueltas — mismo criterio de
"un motor compartido, no copiar/pegar por pantalla" que ya usa el resto del sistema (`nxBuscaHTML`,
`ModalBusquedaBase`).
- **2 keyframes nuevos, ambos dentro de `@media(prefers-reduced-motion:no-preference)`** (si el usuario
  tiene activada la preferencia de accesibilidad "reducir movimiento" del sistema operativo, **ninguna**
  de estas animaciones se aplica — todo aparece instantáneo, como antes; verificado con
  `reducedMotion:'reduce'` de Playwright, `animationName` computado da `'none'`):
  `@keyframes nxPopIn` (fade+scale sutil, para que algo "aparezca" con un poco de rebote —
  `cubic-bezier(.34,1.56,.64,1)`, la misma curva "spring" que ya se usaba en el `tIn` del toast) y
  `@keyframes nxFadeUp` (fade+translateY, para listas que entran una detrás de otra).
- **Conectados a clases que YA existen y se repiten por todo el sistema** (cero HTML nuevo, cero
  cambio de lógica, solo la regla CSS que dispara la animación):
  - `.overlay.open .modal{animation:nxPopIn...}` — el modal/ventana emergente de TODO el núcleo de
    Seguros (decenas de pantallas comparten esta única clase) ahora aparece con un pop suave en vez de
    salir de golpe. Como es la clase padre (`.overlay`) la que cambia de `display:none` a `display:flex`
    al abrir, la animación del hijo (`.modal`) se reinicia sola cada vez que se abre un modal — no hizo
    falta tocar `openM()`/`closeM()` ni ningún `onclick` existente.
  - `.nxSf .sf-kpis .sf-kpi` / `.nxPf .kpirow .kpitile` — las tarjetas KPI de TODAS las pantallas
    Enterprise ya rediseñadas esta sesión (Clientes/Facturas/Ficha del cliente/Historial de
    pagos/Pólizas/Agentes/Empresas en Seguros, y Entidades/Clientes/CRM/etc. en el POS) entran en fila
    con `animation-delay` escalonado por `nth-child` (1º a 4º, 0.02s a 0.17s) — se ven "aparecer" una
    detrás de otra en vez de todas de golpe. Como estos KPIs son elementos ESTÁTICOS del HTML de cada
    vista (los números se actualizan con `textContent`, no se reconstruye el `<div>` en cada filtro), la
    animación solo se dispara una vez al cargar la pantalla, no se repite en cada tecla de un buscador.
  - `.qa-g .qa` — los accesos rápidos del Dashboard de Seguros (6 tarjetas) con el mismo patrón
    escalonado (hasta el 6º hijo).
  - `.toast{animation:tIn...}` — se mantuvo la misma animación `tIn` (slide desde la derecha) pero se
    cambió el "timing" de `ease` a `cubic-bezier(.34,1.56,.64,1)` (rebote sutil tipo spring) y la
    duración de `.2s` a `.35s` — mismo mecanismo de siempre (`toast()` en `index.html`), cero cambios de
    JS, solo la curva de animación se siente con más vida.
- **Deliberadamente NO se tocó** ningún `:active`/`transform:scale` en botones — el propio CLAUDE.md
  (regla #2 de "Cómo le gusta trabajar el dueño") advierte contra `transform:scale/translate` en `:active`
  dentro de ventanas con `backdrop-filter` por el bug de "botones que se inflan" en iPhone; esta tanda se
  limitó a animaciones de ENTRADA (aparecer en pantalla), no de toque, para no arriesgar ese bug conocido.
  Tampoco se animaron las filas de tabla (`.sf-tbl tr`) porque esas SÍ se reconstruyen en cada tecla de
  búsqueda — animarlas habría hecho parpadear la lista mientras el usuario escribe.
- **Verificado con Playwright** (harness con el CSS real extraído de `index.html`, cero reconstrucción):
  se confirmó por `getComputedStyle(...).animationName` que `nxFadeUp`/`nxPopIn`/`tIn` sí se aplican en
  modo de movimiento normal y que se vuelven `'none'` en modo `prefers-reduced-motion:reduce`, captura de
  pantalla del modal+KPIs+accesos rápidos sin errores de JS. `node --check parches.js` limpio; corregido
  de paso un defecto en el propio método de verificación de esta sesión: el chequeo de "los 3 `<script>`
  de `index.html` pasan `new Function()`" venía filtrando por accidente el script PRINCIPAL (423KB) fuera
  de la validación desde hacía tiempo — el filtro buscaba la palabrita `src=` en el texto COMPLETO de
  cada script (no solo en su etiqueta de apertura), y el script principal genera HTML con atributos
  `src=` (imágenes, iframes) dentro de su propio código, así que el filtro lo excluía por error y solo
  validaba los 2 scripts cortos. Corregido para revisar `src=` únicamente en la etiqueta `<script ...>`
  de apertura — confirmado que los 3 scripts (1,423 / 423,569 / 681 caracteres) pasan `new Function()`.

#### Muestra visual — NEXUS PRO X 2026 (rama aparte, referencia para las fases siguientes)
Archivo standalone `muestra-pos-x2026.html`, publicado en la rama `claude/pos-x2026-muestra` (NO en
`main` — a pedido del dueño, para revisar antes de tocar el POS real). Datos 100% de ejemplo, sin
conexión a Supabase. Contiene 3 pantallas aprobadas visualmente por el dueño, sirven de referencia para
las fases 2 y 3:
- **Sidebar** reorganizado por grupos (Principal/Inventario/Personas/Finanzas/Sistema) con SOLO módulos
  reales (nada de "Tesorería"/"NEXUS AI"/"Dashboard" inventados — confirmado explícitamente con el dueño).
- **Vender**: catálogo en formato LISTA (no tarjetas grandes) — miniatura, nombre, categoría, código,
  estado de stock, precio, favorito, botón agregar. Carrito a la derecha con métodos de pago y COBRAR.
- **Factura**: mismo catálogo + selector de cliente con buscador, comprobante fiscal (Consumo/Crédito
  Fiscal/Gubernamental), condición de pago, NCF a asignar cuando aplica.
- **Editar producto**: el diseño que se llevó a producción en la Fase 1 (arriba) nació aquí primero.
- 2 bugs reales de CSS Grid (`min-width:auto` desbordando en móvil) encontrados y corregidos en la
  muestra ANTES de llevarlos a producción — mismo bug, mismo fix (`minmax(0,1fr)`+`min-width:0`) que se
  aplicó también al `.nxPf` real.

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

### Pestaña "Avisos" en Facturas — WhatsApp de 1 toque, automatizaciones fase 1 (10-jul-2026, v48.4)
El dueño preguntó cómo mandar WhatsApp automático a clientes. Investigado y explicado: NO existe el
envío 100% automático con WhatsApp normal (`wa.me`) — siempre hace falta que alguien toque "enviar".
Lo 100% automático de verdad requiere la **API oficial de WhatsApp Business (Meta Cloud API)**: cuenta
de Meta Business verificada, número dedicado, **plantillas de mensaje pre-aprobadas por Meta** (no se
puede mandar texto libre fuera de una ventana de 24h sin plantilla aprobada), costo por
conversación/mensaje y tarjeta de pago en la cuenta de Meta — son trámites del dueño, no algo que se
resuelva por código. El dueño eligió **mejorar primero lo de 1-toque** (gratis, sin trámites).
- **HECHO — pestaña "Avisos"** (4ta pestaña en Facturas/Cobros/Historial de pagos, `index.html`):
  detecta SOLA (sin que el dueño busque a mano) dos grupos, cada uno con botón WhatsApp 1-toque:
  1. **Facturas atrasadas** (`rAvisos()`, mismo criterio que `rFact('atrasadas')`): agrupa por cliente
     las facturas de meses anteriores sin pagar, suma el monto, ordena de mayor a menor deuda. Botón
     reutiliza `nxCobroWA()` (ya existía, usado en Cobros — arma el mensaje con pendiente + deuda
     anterior + total).
  2. **Pólizas por vencer**: usa `getEstPol()` (ya existente) para encontrar pólizas en estado
     `gracia` (dentro de `CFG.alertaDias`, default 30 días) o `vencida`. Botón nuevo `nxVencerWA(cid)`
     — mensaje de renovación distinto al de cobro (no existía antes como acción de 1 clic; solo vivía
     enterrado dentro del modal genérico "WA masivo").
  - Si el cliente no tiene WhatsApp registrado, la tarjeta muestra un aviso en vez de un botón que no
    serviría (`nxAvNoWa`). CSS nuevo `_nxAvCSS()` (mismo patrón de inyección única que `_nxCobCSS`),
    tarjetas compactas estilo Cobros (avatar+nombre+badge, sin desbordar en móvil angosto).
  - `.nxft-tabs` ya soportaba hasta 4 pestañas en su grid responsive (2 columnas en móvil, 4 en
    escritorio) sin tocar CSS — la 4ta pestaña cayó justo en el patrón existente.
  - Verificado con Playwright (13 pruebas): no crashea sin datos (`ST.clientes`/`ST.facturas` vacíos
    por defecto), detecta correctamente atrasados/por-vencer/vencidas con datos simulados, el botón
    de WhatsApp arma el link `wa.me` con el número y mensaje correctos, oculta el botón cuando no hay
    WhatsApp registrado, 0 errores de JavaScript.
- **Deliberadamente NO se agregó** un grupo separado de "deuda anterior" — ya queda cubierto dentro del
  mismo `nxCobroWA()` (que sí incluye `deuda_anterior` en su mensaje) para no duplicar/confundir con
  3 grupos que se solapan.
- **Pendiente si el dueño quiere ir más lejos:** Fase 2 = envío de correo automático (ya existe
  `enviar-reporte-email` como precedente técnico) · Fase 3 = WhatsApp API real de Meta (requiere que
  el dueño haga los trámites de cuenta/plantillas primero).

### FASE 3 — WhatsApp Business API directo con Meta (EN CONSTRUCCIÓN, 13/14-jul-2026)
El dueño usaba Twilio para WhatsApp; Twilio Fraud Operations **denegó permanentemente** la reactivación
de su cuenta (reembolso en camino, sin dar la causa exacta pese a pedirla). Se investigó la alternativa
y se decidió ir **directo con Meta** (WhatsApp Cloud API), sin intermediario/BSP — comparado contra
360dialog (mejor si no se quiere tocar código propio, tiene cuota mensual) y Gupshup (enfocado en
India/SSE Asia); Meta directo no tiene cuota mensual y NEXUS PRO ya tiene la infraestructura (Edge
Functions) para integrarlo sin plataforma intermedia.
- **Cómo funciona el consentimiento (aclarado al dueño):** Meta NO verifica el consentimiento a nivel de
  API — es responsabilidad del negocio mantenerlo, y Meta lo hace cumplir indirectamente por su
  **Quality Rating** (tasa de bloqueos/reportes de los destinatarios): mandarle a quien no autorizó baja
  la calificación y puede limitar o suspender el número. Por eso el consentimiento se guarda en NEXUS PRO
  mismo (ver abajo), no porque Meta lo pida en un campo del API.
- **HECHO — lado de NEXUS PRO (mientras el dueño hace la verificación de negocio en Meta Business
  Manager, trámite externo de 2-10 días hábiles con RNC/acta constitutiva/factura de servicios):**
  - **Columna nueva `pos_clientes.acepta_whatsapp`** (bool, default false) + `acepta_whatsapp_fecha`
    (migración `pos_clientes_consentimiento_whatsapp`). Checkbox **"Acepta recibir avisos por WhatsApp"**
    en el formulario de Entidades/Clientes del POS (`abrirEntidad`/`nxEntGuardar` en `parches.js`, dentro
    de `entWaBox`, visible solo si el afín "Cliente" está marcado — mismo patrón que `entClienteBox`).
    `acepta_whatsapp_fecha` se estampa (`new Date().toISOString()`) solo la primera vez que pasa de
    false→true (no se reescribe en cada guardado). Se muestra un badge "✓ Acepta WhatsApp" en la ficha
    del cliente (`nxPosCliVer`). **Es la ÚNICA fuente de consentimiento** — ningún envío automático debe
    saltarse esta bandera.
  - **Edge Function `whatsapp-enviar-plantilla`** (`verify_jwt:true` — solo usuarios logueados de NEXUS
    PRO): recibe `{telefono, plantilla, idioma, parametros[], acepta_whatsapp}`, **rechaza el envío si
    `acepta_whatsapp !== true`** (el llamador del frontend debe pasar el valor real del cliente, no
    asumir), arma el payload de plantilla y hace POST a
    `https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages`. Lee `WHATSAPP_ACCESS_TOKEN` y
    `WHATSAPP_PHONE_NUMBER_ID` con `Deno.env.get(...).trim()` (mismo hábito de `.trim()` defensivo que
    se agregó en NEXUS AI CONTENT tras el problema de secretos con espacios/basura) — si faltan, responde
    con un error claro en vez de fallar en silencio.
  - **Edge Function `whatsapp-webhook`** (`verify_jwt:**false**` a propósito — Meta necesita llamarla sin
    sesión): maneja el handshake `GET` de verificación de Meta (`hub.mode`/`hub.verify_token`/
    `hub.challenge`, comparando contra el secreto `WHATSAPP_WEBHOOK_VERIFY_TOKEN`) y por ahora solo
    registra los eventos `POST` entrantes con `console.log` (sin escribir en la base todavía — eso es
    para cuando se decida qué hacer con las respuestas/confirmaciones de entrega).
  - `get_advisors(security)` corrido después de las 3 piezas: sin hallazgos nuevos en `pos_clientes` ni
    en ninguna de las dos funciones (mismo listado de siempre, todo en tablas/funciones ajenas ya
    conocidas).
- **NO se construyó todavía** (bloqueado por algo que solo el dueño puede resolver, no por código): el
  botón real de "Enviar recordatorio por WhatsApp API" en el Centro de Avisos u otra pantalla. Falta que
  el dueño (1) termine la verificación de negocio en Meta Business Manager, (2) cree al menos una
  **plantilla de mensaje aprobada** (ej. recordatorio de cuota/fiado vencido — ya se le ayudó a redactar
  un borrador tipo Utility para Twilio, reutilizable en Meta con el mismo criterio: no puede empezar ni
  terminar con una variable, tiene que ser transaccional/informativa, no promocional), y (3) genere el
  **token de acceso permanente** + el **Phone Number ID** y los guarde como *Secrets* de Edge Functions en
  Supabase Dashboard (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
  — nombres EXACTOS, sensibles a mayúsculas/espacios, mismo error que ya pasó con `ANTHROPIC_API_KEY`) y
  configure la URL del webhook (`https://tnwsgcxurfyuszxsewsn.supabase.co/functions/v1/whatsapp-webhook`)
  en Meta for Developers. Construir el botón de envío ANTES de tener una plantilla aprobada real habría
  significado un botón que nunca funciona — contra el criterio de "no fingir funciones que no existen"
  que ya se sigue en el resto del sistema (ver NEXUS AI CONTENT). Cuando el dueño tenga esas 3 cosas,
  retomar: conectar el botón real (probablemente en el Centro de Avisos de POS, `renderAvisos()`, para
  cuotas/fiado vencido) pasando el nombre de la plantilla aprobada + los parámetros del mensaje.
- **Precios Meta (jul-2026):** desde jul-2025 se cobra por mensaje ENTREGADO según categoría (Marketing/
  Utility/Authentication/Service), no por conversación de 24h como antes. Plantillas Utility hoy son
  gratis para República Dominicana; Service (respuestas fuera de plantilla) se vuelve pago a partir del
  1-oct-2026. Sin la verificación de negocio completa, el límite es 250 conversaciones/24h.
- **NEXUS AI CONTENT sigue en PAUSA** (decisión del dueño, problema de configuración del secreto de
  Anthropic sin resolver del todo — ver sección arriba) — no se retomó en esta fase, es un módulo aparte.

---

### AGUAPRO ERP — módulo para distribuidoras de agua, dentro de Multiempresa (10-jul-2026)
Módulo nuevo en `parches.js` (IIFE propio, `window.nxAbrirAguaPro`), registrado en el hub Multiempresa
("AGUAPRO ERP", orden 6). **Historia:** lo construyó Codex (chat aparte) como demo visual, luego lo fue
ampliando en varias tandas hasta "fase 1 real" — pero guardaba TODO en la tabla global `configuracion`
(la misma de ARS/roles/email, sin `organizacion_id`) y el candado de "solo Administrador" no funcionaba
(usaba `esAdmin` sin declararla en su propio IIFE → `typeof esAdmin==='function'` daba falso siempre,
mismo tipo de bug que el de `moneyVal` del POS v42.5: helper que falta en el scope donde se usa).
**Auditado y reconstruido de raíz por Claude (10-jul-2026):**
- **Tablas propias** (migración `create_aguapro_tables` + `create_agua_movimientos_inventario`, proyecto
  `tnwsgcxurfyuszxsewsn`): `agua_clientes`, `agua_productos`, `agua_pedidos` (items jsonb), `agua_botellones`,
  `agua_produccion`, `agua_caja`, `agua_movimientos` (kardex) — TODAS con `organizacion_id` + trigger
  `set_organizacion_id()` + RLS `mi_rol()='admin' AND organizacion_id=mi_organizacion()` (patrón
  pos_*/rifa_*/med_*/saas_*). Aislamiento real por organización — antes todo se mezclaba en una fila global.
- **Permiso admin real:** el IIFE ahora define su propio `esAdmin()`/`getAPI()` (patrón obligatorio: CADA
  IIFE de `parches.js` necesita su propia copia de estos helpers, no son globales).
- **Bugs de dinero/inventario de la auditoría, corregidos:** cobrar un pedido ya no permite pasarse de lo
  pendiente (tope validado); cliente y producto se eligen de una lista real (`<select>`, ya no `prompt()`
  de texto libre que adivinaba con el primer producto si no coincidía); la deuda de cada cliente se calcula
  SIEMPRE en vivo sumando sus pedidos pendientes (`deudaCliente()`, nunca un campo `balance` estático que se
  quedaba pegado); los pedidos se pueden CANCELAR y el stock se devuelve solo con su movimiento de reversa;
  números en formato `es-DO` (antes salían en inglés).
- **Pantallas con datos reales:** Dashboard (KPIs + gráfica de barras 7 días + donut top productos + alertas,
  todo calculado de las tablas reales), Clientes, Inventario/Productos (+ kardex de movimientos), Pedidos
  (con ruta y cancelación), Facturación/POS (carrito con ITBIS 18%, métodos de pago), Botellones (cambio de
  estado con asignación a cliente), Producción (puede alimentar el inventario), Cobros/Caja (+ registrar
  gasto), Cuentas por cobrar, Reportes (rango Desde/Hasta). El visual sigue fiel al mockup aprobado por el
  dueño (sidebar azul marino, topbar blanca, tarjetas KPI, tablas tipo ERP) — CSS reusado de lo que ya había
  hecho Codex (estaba bien) apenas ajustado.
- **Configuración** quedó como panel visual (tiles) sin funciones reales todavía — a propósito, para no
  fingir que algo funciona cuando no: toca un tile y sale "Próximamente".
- **Pendiente:** Rutas de entrega es una lista agrupada por ruta (sin mapa interactivo real — no hay
  librería de mapas en el proyecto); Configuración (empresa, impuestos, numeración, WhatsApp, etc.) sigue
  sin construir; Compras como módulo aparte (hoy los gastos se registran directo en Cobros/Caja).

---

### AUDITORÍA DEL POS + FASE 0 (6-jul-2026) — ver `AUDITORIA-POS.md` y `FASE0-CONTEXTO.md`
Auditoría completa del POS (3 agentes: cobro/dinero, fiscal/DGII, completitud módulo por módulo).
Veredicto: **21/22 módulos completos, 0 funciones fantasma, el flujo de cobro funciona** — NO hay que
rehacer nada. Pero NO está listo para vender por: (A) **7 bugs de dinero silenciosos** (fiado no se
revierte al anular, sin costo de ventas/COGS, stock por almacén negativo, bug `tipo` en `asignarNCF`,
NC contada como caja, anulación no revierte NCF/cuotas, KPIs suman anuladas) y (B) **fiscal** (sin RNC
del comprador, sin e-CF DGII obligatoria 15-nov-2026, 607 incompleto, sin 606/608). Todo el detalle con
evidencia `archivo:línea` está en **`AUDITORIA-POS.md`**. El **código real verbatim** de las funciones
afectadas + esquemas exactos de tablas (para generar el parche de la Fase 0, p.ej. con ChatGPT) está en
**`FASE0-CONTEXTO.md`**. Roadmap: Fase 0 (bugs de dinero) → 1 (mínimo fiscal RNC/607/606/608) → 2 (e-CF).

**FASE 0 — COMPLETA (v48.7, 12-jul-2026).** Los 7 bugs de la Capa A revisados uno por uno contra el
código real: 5 ya estaban corregidos (de una sesión anterior, sin documentar en su momento — fiado al
anular, COGS, stock por almacén, bug NCF, KPIs). Los 2 que faltaban, cerrados ahora: **A5** (nota de
crédito como pago) — ya no se cuenta como efectivo/caja, se valida contra `pos_devoluciones` real del
cliente (existe, es suya, no usada) antes de aceptarla, y queda marcada `estado='aplicada'` para que no
se reuse; contablemente va a una cuenta nueva **2105 "Notas de crédito por aplicar"** (con fallback a
1101 si la org no ha recreado su plan de cuentas, para no descuadrar). **A6** (NCF perdido al anular) —
`nxPosAnularVenta` ahora emite automáticamente la nota de crédito fiscal B04 que exige la DGII cuando la
factura anulada tenía NCF (reusa `asignarNCF('B04')` + inserta en `pos_devoluciones`/`pos_devolucion_items`
SIN volver a asentar contablemente, porque el asiento inverso que ya existía deja los libros cuadrados —
evita duplicar la reversión); si no hay secuencia B04 activa, avisa por `logAudit` + toast en vez de
fallar en silencio. Verificado con `node --check`, revisión manual línea por línea y confirmando que el
Debe=Haber de los asientos sigue cuadrando en ambos escenarios (con y sin cuenta 2105). Sigue pendiente
la Capa B completa (fiscal/e-CF) y la Capa C (buscador de cliente en Cobro/Factura, confirmar
`crear-usuario-staff`, RLS server-side).

---

### REPORTE DIARIO POR CORREO (enviar-reporte-email) — rediseñado v2 (10-jul-2026)
IMPORTANTE: vive FUERA de este repo. Es una Edge Function de Supabase (proyecto
tnwsgcxurfyuszxsewsn, verify_jwt:false), NO un archivo de index.html/parches.js. Se edita con
las herramientas MCP de Supabase (get_edge_function/deploy_edge_function), no con Edit/Write
normales. Manda un correo con 11 "secciones" (resumen, proceso, cobros_hoy, quien_debe, nuevos,
vencer, facturas_hoy, comisiones, transferencias, inhabilitados, top_deudores) a empresa_email (todas
las secciones) + a cada fila activa de reporte_destinatarios (solo sus secciones elegidas, UI en
Ajustes -> Notificaciones -> "Reportes por empleado", parches.js). Disparado por pg_cron según
configuracion.reporte_horas/reporte_dias (hoy: solo 18:00 RD, lun-sáb); botón "Enviar reporte de
prueba" (nxProbarReporte()) llama la función con {forzar:true} para probar sin esperar el cron.
- Motivo del rediseño: el dueño reportó "los reportes están llegando vacíos". Investigado con las
  herramientas MCP de Supabase (execute_sql/get_logs/get_edge_function, sin acceso directo por
  curl -- el proxy de red de esta sesión bloquea *.supabase.co): el envío SÍ funcionaba (logs de
  auto_notificaciones_log mostraban ok:true todos los días) y SÍ había datos reales (97 clientes
  activos, RD$143,000 pendiente, cobros diarios reales) -- el problema era de fondo/diseño, no de
  conexión: (1) Robinson no recibía la sección "resumen" (arreglado -- se le agregó); (2) varias
  secciones son legítimamente escasas casi todos los días (facturas_hoy solo tiene datos el día 20,
  transferencias son raras) y con el diseño viejo salían como una línea plana "Sin datos", dando la
  sensación de un correo vacío aunque técnicamente funcionara; (3) bug real encontrado:
  "Quién debe"/"Top deudores"/"Pendiente total" del resumen solo miraban pend() (deuda de facturas)
  e ignoraban clientes.deuda_anterior (la deuda previa al sistema, ver sección "DEUDA ANTERIOR"
  arriba) -- un cliente cuya ÚNICA deuda fuera anterior al sistema no aparecía como deudor en el
  reporte. Ahora usa pendTotal()=pend()+deudaAnt(), igual que el resto de la app. (4) bug real:
  "Transferencias" contaba TODAS (incluidas pendientes/rechazadas, donde el dinero no se movió) --
  ahora filtra estado='aceptada'. (5) bug de zona horaria: "hoy" se calculaba con la fecha UTC en vez
  de la fecha de RD, y las ventanas "de hoy" (cobros_hoy/facturas_hoy/nuevos) comparaban contra
  medianoche UTC en vez de medianoche RD (RD es UTC-4) -- con poco impacto práctico en horario de
  oficina, pero desalineado en los bordes del día; arreglado con un helper diaRDaUTC() que calcula
  la ventana exacta del día calendario de RD en instantes UTC reales.
- Rediseño de contenido ("que nunca se vea vacío"): cobros_hoy y nuevos ahora también muestran el
  acumulado de los últimos 7 días junto al de hoy (así un día flojo igual trae contexto útil);
  facturas_hoy explica la fecha de la próxima tanda automática (día 20) en vez de una línea en
  blanco; "comisiones" se renombró a "Cartera por agente" y ahora suma lo cobrado del mes por cada
  agente (antes solo contaba clientes asignados, siempre igual y poco informativo) usando
  abonos.agente_cobro; cada sección vacía tiene un mensaje amigable en vez de una tabla en blanco.
- Rediseño visual: tarjetas con borde de color a la izquierda por sección (mismo lenguaje visual que
  el resto del sistema), tipografía Segoe UI unificada (el correo usaba Arial,sans-serif, que quedó
  fuera de la limpieza de fuentes v48.0 porque esta función no vive en el repo), badges de contador,
  jerarquía más clara. Todo con estilos en línea (sin <style> ni flexbox/grid) por compatibilidad
  con Gmail/Outlook.
- Los 11 IDs de sección NO se tocaron (a propósito): son las mismas claves que ya usa la UI de
  "Reportes por empleado" (SECCIONES en parches.js) y las que ya están guardadas en
  reporte_destinatarios.secciones de cada empleado -- cambiar los IDs habría roto sus preferencias
  guardadas sin aviso.
- Cómo probar un cambio futuro: esta sesión NO tiene salida de red a *.supabase.co (ni siquiera
  curl), así que no se puede invocar la función directamente ni ver el HTML real del correo. El único
  camino es: 1) desplegar con deploy_edge_function, 2) pedirle al dueño que toque "Enviar reporte de
  prueba" en Ajustes (o esperar al cron 18:00 RD), 3) revisar auto_notificaciones_log (tabla) con
  execute_sql para confirmar el envío, y 4) el dueño confirma visualmente revisando su correo.
- OJO credenciales: el archivo de la función trae la clave de aplicación de Gmail en texto plano
  (GMAIL_PASS, no es una variable de entorno) -- es el patrón que ya traía la función original, no se
  cambió en este rediseño. Nunca pegar esa clave en archivos del repo ni en scratchpad sin redactar.

---

### NEXUS AI CONTENT — marketing y contenido con IA (12/13-jul-2026, v48.22, FASE 1: Base)
Módulo nuevo en Multiempresa para que cada organización (negocio cliente) configure su marca y
genere después contenido de marketing con IA. Encargado por el dueño con una especificación muy larga
(36 secciones, arquitecto de software) pidiendo primero una **auditoría de solo-lectura (FASE 0)** antes
de tocar nada — se hizo, sin editar archivos ni ejecutar migraciones, y entregó un informe completo
(arquitectura real, multi-tenant, permisos, componentes reusables, riesgos, plan por fases). El dueño
confirmó 4 decisiones (todas la opción recomendada) y luego autorizó todo en bloque para construir
mientras dormía ("hazla completa... tienes todos los permisos y eliges lo más recomendable... mañana lo
vamos a revisar") — por eso esta fase se construyó y publicó DIRECTO a `main` sin rama de revisión previa
(a diferencia del patrón habitual de esta sesión de subir cambios grandes a una rama aparte), siguiendo
el propio reglamento del dueño (punto 1 de "Cómo le gusta trabajar") y la propia regla del spec de
trabajar en fases pequeñas y verificables (NO se programó el spec completo de una sola vez).
- **Identificador de tenant: `organizacion_id`** (el mismo de siempre — POS/Rifas/AGUAPRO/Consultorio/
  Clientes SaaS). El spec original sugería `empresa_id`/`tenant_id`; se descartó de raíz porque
  `empresas` YA EXISTE y significa las aseguradoras (Humano, Universal...) — usarlo como tenant hubiera
  sido una colisión conceptual grave. `tenant_id` no se usa en ningún lugar del repo.
- **Solo dentro de Multiempresa** (no hay entrada en el sidebar principal, decisión confirmada por el
  dueño) — se registra en el hub con `nxMERegistrar({orden:7, nombre:'NEXUS AI CONTENT', icon:'ti-sparkles',
  color:'#c026d3'})`. Gateado a `esAdmin()` (patrón simple, igual que Consultorio/SaaS/Financiamiento) —
  confirmado por el dueño en vez de construir sobre el sistema genérico de roles/permisos
  (`roles`/`permissions`/`role_permissions`/`user_permissions`), que se auditó y resultó ser código
  MUERTO (cero referencias en el frontend, RLS sin proteger) — no se tocó ni se construyó encima.
- **7 tablas nuevas** (`ai_content_settings`, `ai_content_niches`, `ai_content_company_niches`,
  `ai_content_audiences`, `ai_content_brand_profiles`, `ai_content_pillars`, `ai_content_acceso`),
  patrón idéntico a `pos_*`/`rifa_*`/`agua_*`/`med_*` (org+trigger `set_organizacion_id()`+RLS
  `mi_rol() is not null AND organizacion_id = mi_organizacion()`). `ai_content_niches` es la EXCEPCIÓN
  (catálogo global de plantillas, no tiene `organizacion_id`): lectura pública para cualquier
  autenticado, escritura solo `mi_rol()='admin'` — sembrado con 10 nichos (tienda/taller de celulares,
  correduría de seguros, restaurante, barbería/salón, taller mecánico, farmacia, gimnasio, bienes
  raíces, distribuidora de agua, clínica de odontología); el primero (celulares) trae además
  `pilares_sugeridos` (13 pilares con color) como ejemplo completo del spec. `ai_content_acceso`
  (patrón `pos_acceso`) quedó CREADA pero SIN UI todavía — reservada para una fase futura de permisos
  granulares por rol dentro de la org; por ahora el módulo entero es solo-admin.
- **Onboarding de 7 pasos** (`window.nxAbrirAIContent`, vista `#v-aicontent`, IIFE propio al final de
  `parches.js`): Empresa → Nicho (elegir de las 10 plantillas o "Nicho personalizado", con los campos
  editables antes de guardar) → Objetivos (checkboxes de objetivos comunes + uno libre) → Público
  (edad/ubicación/intereses/problemas/objeciones/nivel de conocimiento/plataforma preferida) → Marca
  (3 colores, tipografía, tratamiento tú/usted, estilo visual, tono, emojis sí/no, frase y llamados a
  la acción, palabras permitidas/prohibidas, estilo fotográfico) → Pilares de contenido (lista editable
  con nombre/%/formatos/plataformas/color; botón "Usar pilares sugeridos" si el nicho elegido trae
  `pilares_sugeridos`) → Resumen (revisa todo, botón "Finalizar configuración" marca
  `onboarding_completado=true`). Cada paso se guarda al tocar "Continuar" (`ai_content_settings.
  onboarding_paso` avanza en vivo) — si el dueño cierra a mitad de camino, retoma donde se quedó.
  Al terminar, la pantalla principal es un **resumen tipo tarjetas** (Empresa/Nicho/Objetivos/Público/
  Marca/Pilares) cada una con su botón de editar (reabre el mismo paso en un modo "editar" que guarda
  y regresa al resumen sin forzar los pasos siguientes) + una sección **"Próximamente"** con 6 tarjetas
  atenuadas (Generador de contenido IA, Calendario editorial, Aprobaciones, Publicaciones, Analítica,
  Automatizaciones) — comunica con claridad qué es esta fase y qué falta, no finge funciones que no
  existen.
- **Deliberadamente FUERA de esta fase** (FASE 2 en adelante, según el propio spec del dueño): el
  generador de contenido con IA en sí (necesita una Edge Function nueva con llamada real a un proveedor
  de IA), calendario editorial, aprobaciones, publicaciones, analítica, automatizaciones, integraciones,
  biblioteca de medios, bandeja de tendencias, banco de ideas.
- **Nota de seguridad encontrada de paso (no corregida, fuera de alcance):** al investigar el precedente
  de llamadas a IA desde el backend se encontró que la función Edge `nexus-smart` (ya en producción,
  respalda el chatbot "Nexus Smart IA" del dashboard de Seguros) tiene la clave de Anthropic
  **hardcodeada en texto plano** en el código de la función (no `Deno.env.get()`) y `verify_jwt:false`
  (se puede llamar sin sesión). Está limitada a datos de Seguros y usa la SERVICE_ROLE_KEY (salta RLS);
  NO es multi-tenant. No se tocó (no era el encargo), pero cuando se construya el Generador IA de este
  módulo (FASE 2) la clave se debe leer con `Deno.env.get()` — no repetir ese error.
- Verificado: `node --check parches.js` limpio, los 3 bloques `<script>` de `index.html` pasan
  `new Function()`, `version.json` válido, `get_advisors` de seguridad sin hallazgos nuevos en ninguna
  de las 7 tablas (mismo listado de siempre, todo en tablas ajenas y ya conocidas). NO se tocó
  `index.html` (el módulo vive solo en Multiempresa, como estaba decidido) salvo el bump de
  `APP_VERSION`.

**FASE 2 — el generador de contenido con IA (13-jul-2026, v48.23).** Primer pedazo real de generación:
- **Tabla nueva `ai_content_items`** (mismo patrón org+trigger+RLS): guarda cada pieza generada
  (hook, texto, caption, hashtags, cta, prompt_imagen, pilar_id opcional, plataforma, formato, estado,
  favorito). Es a la vez el "borrador" y el "historial" — no hace falta una tabla de log aparte, cada
  generación que se guarda ES un registro.
- **Función Edge nueva `ai-content-generar`** (`verify_jwt:true` — a diferencia de `nexus-smart`, SOLO
  responde a usuarios logueados). La clave de Anthropic se lee con `Deno.env.get('ANTHROPIC_API_KEY')`
  — **NO** repite el error de `nexus-smart` (clave hardcodeada). Recibe del frontend el contexto ya
  cargado en memoria (empresa/nicho/público/marca/pilar elegido — el mismo que ya tiene `cargarTodo()`)
  más el tema/plataforma/formato pedidos, arma un system prompt largo que obliga a la IA a seguir la
  marca AL PIE DE LA LETRA (tono, tratamiento tú/usted, emojis sí/no, palabras permitidas/prohibidas,
  temas a evitar del nicho) y pide la respuesta en JSON estricto. Modelo usado:
  `claude-haiku-4-5-20251001` (el mismo que ya prueba `nexus-smart` en producción — se reusó ese modelo
  a propósito para no introducir un id de modelo sin probar en este proyecto). La función NO escribe en
  la base — solo genera y devuelve el JSON; el guardado en `ai_content_items` lo hace el frontend con
  `getAPI().post(...)` como CUALQUIER otra tabla del sistema (mismo patrón de siempre, RLS de por medio),
  para no inventar un mecanismo de escritura nuevo solo para este módulo.
- **UI nueva dentro de NEXUS AI CONTENT:** la tarjeta "Generador de contenido IA" del panel dejó de ser
  "Próximamente" y ahora es real — abre un formulario (pilar/plataforma/formato/tema/instrucciones) →
  "Generar con IA" → resultado editable (puedes ajustar cualquier campo antes de guardar) → "Guardar en
  biblioteca" o "Regenerar". **Biblioteca de contenido** (`nxAiAbrirBiblioteca`) nueva: lista de piezas
  guardadas con favorito ⭐, ver completo (modal) y eliminar. Calendario/Aprobaciones/Publicaciones/
  Analítica/Automatizaciones siguen en "Próximamente" — a propósito, no se tocaron.
- **BLOQUEO REAL encontrado y resuelto con el dueño:** las herramientas MCP de Supabase disponibles en
  esta sesión NO tienen forma de crear/editar *secrets* de Edge Functions (no hay un tool equivalente a
  `supabase secrets set`) — eso solo se puede hacer desde el Dashboard de Supabase o el CLI, fuera del
  alcance de esta sesión. Por eso la función quedó desplegada y lista, pero **el dueño tiene que agregar
  el secreto `ANTHROPIC_API_KEY`** en Supabase Dashboard → Edge Functions → Secrets (puede reusar el
  mismo valor que ya usa `nexus-smart`, copiándolo desde ahí, o generar uno nuevo en la consola de
  Anthropic) antes de que el generador funcione de verdad — mientras tanto, la función responde con un
  error claro ("Falta configurar el secreto...") en vez de fallar en silencio o con un error críptico.
- Verificado: `node --check parches.js` limpio, los 3 bloques `<script>` de `index.html` pasan
  `new Function()`, `version.json` válido, `get_advisors` sin hallazgos nuevos en `ai_content_items`.
- **CONFIRMADO EN VIVO (13-jul-2026):** el dueño configuró el secreto y probó el generador real desde
  el celular. Se encontraron y corrigieron 2 problemas reales en el camino, ambos del lado de cómo se
  guardó el secreto en Supabase (no del código): (1) el secreto se había guardado con basura pegada por
  accidente en el Value (un texto de ~1024 caracteres que empezaba con `"FUNCTION_SLUG:..."`, no la
  clave real) — se agregó `.trim()` defensivo a la lectura del secreto en el código por si acaso, pero
  la causa real era el valor guardado; (2) el secreto se había creado con el **nombre** `NEXUS PRO IA`
  en vez de `ANTHROPIC_API_KEY` exacto — Supabase no relaciona secretos por parecido, el nombre tiene
  que ser idéntico al que lee `Deno.env.get()`. Para diagnosticar sin exponer la clave completa, se
  desplegó temporalmente una versión que agregaba al mensaje de error el LARGO y los primeros/últimos
  caracteres del secreto leído (nunca la clave completa) — se quitó ese código de diagnóstico en cuanto
  se confirmó que funcionaba, dejando la función limpia en producción (solo con el `.trim()` como mejora
  permanente). Generación real probada y funcionando desde la app.
- **REGRESIÓN Y PAUSA (13/14-jul-2026):** después de esa confirmación en vivo, el generador volvió a
  fallar con el mismo `AUTHENTICATION_ERROR` — el diagnóstico (repetido varias veces, con la misma salida
  de LARGO=1024/`"FUNCTION_SLUG:..."` cada vez) mostró que el secreto en Supabase había vuelto a tener el
  valor basura, sin que el dueño lo hubiera tocado, a través de 3 intentos de arreglo distintos (renombrar
  solo, editar el valor, crear una clave nueva desde cero) — se descartó código/deploy desactualizado
  (`get_logs` confirmó que cada llamada sí llegaba a la versión más reciente de la función) y se descartó
  la clave en sí (probada directo contra `api.anthropic.com`, válida). Quedó sin resolver — posible bug de
  propagación de Secrets del lado de Supabase (coincidió con un aviso de "estamos investigando un problema
  técnico" que el dueño vio en su panel, sin poder confirmarlo de forma independiente porque
  status.supabase.com no es alcanzable desde este entorno). El dueño pidió **pausar** este esfuerzo (no
  borrar nada — tablas, funciones y el módulo completo se quedan tal cual, solo no se sigue depurando el
  secreto por ahora). Si se retoma: repetir el diagnóstico temporal (largo + primeros/últimos caracteres
  del secreto en el mensaje de error, sin exponer la clave completa) para confirmar si el valor sigue
  siendo basura, y si es así, es un problema de la plataforma Supabase, no de este código.

## Seguridad (ver `SEGURIDAD-PLAN.md` y `PLAN-AUTH-OPCION-A.md`)

**Plan Opción A — Supabase Auth, por fases reversibles:**
- Fase 0 ✅: tabla `profiles` + helper `mi_rol()`.
- Fase 1 ✅: usuarios reales en Auth (correo sintético `<login>@nexus-pro.local` / `@<org>.local`).
- Fase 2 ✅: login con `signInWithPassword` (activo por defecto, ver "Entrada inteligente" arriba).
- Fase 3 — **núcleo de Seguros hecho (12-jul-2026), POS ya lo tenía:**
  - **POS (`pos_*`/`rrhh_*`):** todas con `organizacion_id` + trigger + RLS `mi_rol() is not null AND
    organizacion_id = mi_organizacion()` (aislamiento por organización, no por rol dentro de la org).
  - **Núcleo de Seguros (`clientes`, `facturas`, `abonos`, `agentes`, `asientos`, `comisiones`,
    `configuracion`, `empresas`, `secuencias_ncf`, `recibo_contador`):** **HECHO.** Hallazgo real al
    auditar (no solo lo que decía este archivo): estas tablas restringían a `authenticated` pero con
    `USING(true)` — y como NO tienen `organizacion_id`, cualquier cuenta logueada de OTRA organización
    (Francis/tienda, Doctor/consultorio, BayolCell/rifas) técnicamente podía leer/editar los clientes y
    facturas del seguro, porque la política no distinguía de qué negocio era la sesión. `recibo_contador`
    ni siquiera tenía RLS activado (no pedía login). Arreglado: las 10 tablas ahora exigen
    `mi_rol() is not null AND mi_organizacion() = (id de la org 'nexus-pro')` — verificado antes de
    aplicar que Esterlin (admin) y Robinson (agente) están bien ligados a esa organización (no se les
    afecta); las otras 3 cuentas quedan bloqueadas de estas tablas. Reversible con un solo
    `ALTER POLICY ... USING(true)` si algo se rompe. **No** separa por rol dentro de la org (agente ve
    todo igual que admin en estas tablas, como ya era) — eso sería una fase aparte si se quiere.
- Fase 4: contraseñas y limpieza — pendiente.

---

## ENRUTAMIENTO AUTOMÁTICO DE SKILLS (decretado por el dueño, 25-jul-2026) — OBLIGATORIO

**El dueño no habla inglés y no va a escribir comandos como `/gstack-investigate`.** Pidió
explícitamente que las skills se usen **solas**, según lo que él pida en español llano. Esta
sección es esa regla: **es responsabilidad de Claude reconocer el caso y cargar la skill que
corresponde, sin que el dueño la nombre.** Que el dueño no escriba el comando NO es señal de que
no quiera el método — es que no lo conoce ni tiene por qué.

### Qué skill cargar según lo que diga el dueño (en sus propias palabras)

| Cuando el dueño diga algo como… | Cargar automáticamente |
|---|---|
| "no me funciona", "está dando error", "esto está mal", "se ve raro", manda una captura de algo roto, "¿por qué pasa esto?" | **`gstack-investigate`** — obliga a demostrar la causa ANTES de escribir el arreglo (su regla #3: "arreglos de RAÍZ, no parches") |
| "revisa antes de publicar", "¿está bien esto?", o el cambio toca **dinero** (cobro, cuotas, contabilidad, facturación, comisiones, nómina, caja) | **`gstack-review`** — antes de abrir el PR |
| "quiero que haga X" sin más detalle, manda un mockup/imagen/brief de ChatGPT, "hazme un módulo de…" | **`gstack-spec`** — primero convertir en especificación (qué se construye y qué NO), después programar |
| "¿qué construyo primero?", "¿vale la pena?", "quiero vender esto", decisiones de alcance o precio | **`gstack-plan-ceo-review`** |
| Antes de un cambio grande de arquitectura, esquema o algo que toque varias pantallas | **`gstack-plan-eng-review`** |
| Cualquier cosa de RLS, permisos, `organizacion_id`, aislamiento entre empresas, logins, claves | **`gstack-cso`** |
| "el código está hecho un desastre", "¿cómo está el sistema?", limpieza general | **`gstack-health`** |
| "¿qué hemos hecho?", cierre de una tanda grande de trabajo | **`gstack-retro`** |
| Trabajo visual: rediseño, "que se vea mejor", mockup de interfaz | **`frontend-design`** + **`ui-ux-pro-max`**, y **`web-design-guidelines`** al terminar (auditoría de accesibilidad) |
| Cualquier cambio de UI que haya que verificar antes de publicar | **`webapp-testing`** (Playwright contra el código real — ya es el método estándar de este proyecto) |

### Reglas de sentido común (para no volverlo pesado)

1. **Proporción.** Un arreglo de una línea, un cambio de texto o de color NO necesita
   `gstack-review` ni `gstack-spec`. Estas skills son para trabajo con riesgo real: dinero,
   esquema de base de datos, seguridad, o algo que toque varias pantallas. Si el cambio es chico
   y evidente, hacerlo y ya — el dueño valora la velocidad tanto como el método.
2. **Avisar en una línea, en español.** Al cargar una, decirle qué se está usando y por qué:
   *"Voy a usar el método de investigación de causa raíz porque esto es un bug de dinero."* Así
   se entera de lo que existe sin tener que aprender inglés ni memorizar comandos.
3. **Él manda.** Si dice "no, hazlo directo" o "eso es muy largo", se salta la skill y se hace
   directo. La regla es un default, no una camisa de fuerza.
4. **Nunca traducir la salida en crudo.** Las skills están en inglés; el dueño solo debe ver
   español llano, del que ya se usa en todo el proyecto. Nada de pegarle texto en inglés.
5. **Este `CLAUDE.md` manda por encima de cualquier skill.** Si una skill contradice algo de aquí
   (el flujo de publicación, "no fingir funciones", el color propio de cada app, el idioma), gana
   este archivo. Las skills aportan MÉTODO de trabajo, no conocimiento de NEXUS PRO.
6. **`ship`/`land-and-deploy` de gstack NO están instaladas a propósito** — el flujo de
   publicación de este proyecto ya está definido (subir `APP_VERSION` + `version.json`, rama
   propia → PR → fusionar con las herramientas MCP de GitHub). No buscar reemplazarlo.

> Catálogo completo de las 12 skills de gstack instaladas, con qué se le quitó a cada una:
> `.agents/skills/GSTACK-README.md`.

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
11. **CADA PROYECTO CON SU DISEÑO INDEPENDIENTE (decretado 18-jul-2026) — OBLIGATORIO.**
    Regla general para TODO trabajo futuro, en cualquier sistema/proyecto (no solo las apps
    de Multiempresa — ver también el reglamento específico de ahí abajo, que queda como caso
    particular de esta regla más amplia): **cada proyecto/sistema mantiene su propia
    identidad visual independiente** — interfaz, iconos, paleta de colores, tipografía, TODO.
    Nunca copiar/heredar el look de otro proyecto solo por reusar código o por comodidad.
    Si dos sistemas comparten un motor de código (patrón ya usado: `ModalBusquedaBase`,
    `nxBuscaHTML`, `nxFPEnsureCSS`), el motor puede ser compartido — pero el **diseño final**
    (colores, iconos, tipografía) de cada uno se define y confirma aparte, nunca se asume que
    "como ya se ve bien en el otro proyecto, sirve igual aquí". Antes de aplicar un color/estilo
    nuevo a un proyecto, verificar que no sea el mismo que ya usa OTRO proyecto del dueño (repasar
    la lista de colores ya asignados — Deluxe dorado, Amatista dorado/morado, BayolCell su propio,
    POS azul, Rifas índigo, Consultorio teal, AGUAPRO azul marino, etc.) para no generar confusión
    entre sistemas.
    - **CONFIRMADO Y ACOTADO por el dueño el 25-jul-2026 ("un color por app")** al resolver el
      choque entre esta regla y el §12 de `NPGS.md`: la independencia visual entre apps **se
      mantiene** (cada una su acento), pero **DENTRO de una app va un solo acento, sin
      excepciones**, y todo lo demás (tipografía, iconos, botones, sombras, tablas, espaciados) es
      idéntico en TODO el ERP. Las excepciones de color/tipografía negociadas antes de esa fecha
      **quedan derogadas** — incluida la de Cuotas del POS (morado + Plus Jakarta Sans, v48.16),
      que es la única desviación real que queda por normalizar (ver `DESIGN_SYSTEM.md` §6, C1).
12. **EL DUEÑO NO ESCRIBE COMANDOS (decretado 25-jul-2026).** No habla inglés y no va a invocar
    skills por su nombre (`/gstack-investigate`, etc.). **Reconocer el caso y cargar la skill
    correcta es responsabilidad de Claude, no suya** — ver la sección "ENRUTAMIENTO AUTOMÁTICO DE
    SKILLS" arriba, con la tabla de "qué dice el dueño → qué skill se carga". Que no la pida por
    nombre NO significa que no la quiera. Avisarle en una línea, en español, cuál se está usando y
    por qué (así se entera de lo que existe sin tener que aprender inglés).

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
