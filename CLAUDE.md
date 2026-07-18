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

> Versión actual: **48.21** (ver `index.html` y `version.json`).

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
