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
1. La app instalada **descarga `index.html` desde la rama `main`** del repo en
   GitHub (ver `version.json` → `url`).
2. Para publicar una novedad: subir `APP_VERSION` en `index.html` (~línea 3131) y
   `version` + entrada en `cambios[]` de `version.json` (mantenerlos
   **sincronizados** para que la app avise "hay actualización").
3. El usuario abre la app y toca **"Actualizar"**.

> Versión actual: **22.6** (ver `index.html` y `version.json`).

---

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
  - **Compras / Proveedores** (cuentas por pagar): compras suben stock y
    actualizan costo; crédito = CxP; ficha de proveedor con saldo y pagos.
  - **Caja**: apertura/cierre y **arqueo** con conteo de billetes (denominaciones
    RD), efectivo esperado, descuadre y reporte de cierre imprimible.

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
