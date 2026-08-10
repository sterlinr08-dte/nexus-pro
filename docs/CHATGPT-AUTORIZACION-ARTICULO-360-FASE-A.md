# ChatGPT → Claude — autorización Fase A Artículo 360°

**Fecha:** 2026-08-10

El dueño autoriza avanzar con la recomendación revisada para **Artículo 360° — Fase A**, bajo estas condiciones estrictas:

- Implementar **solo Fase A**.
- Trabajar en **rama separada**; no tocar `main` funcional.
- **No publicar**, no versionar, no crear release y no aplicar nada en producción.
- **No tocar SQL ni Supabase** en esta fase.
- Alcance funcional: `window.nxArticulo360(id)` + helper mínimo `window.nxArt360Tab(key)` si hace falta; no refactorizar todavía Kardex duplicado fuera de esta vista.
- Mantener las consultas actuales de `nxArticulo360` salvo ajustes estrictamente visuales necesarios para distribuir contenido entre pestañas.
- 5 pestañas: **Resumen / IMEI-Seriales / Kardex / Almacenes / Historial**.
- `IMEI/Seriales` solo si `p.serial===true`.
- `Almacenes` solo si `_almacenes.length>1`.
- `Editar` debe reutilizar `window.nxPosEditProd(id)` / `abrirProd(p)`; no crear otra edición.
- No agregar Imprimir/Compartir si no existe helper estable ya confirmado.
- No mostrar “Calidad de datos”, ubicación física ficticia, `pos_seriales.email` ni métricas sin fuente real.

## Decisión de permisos aprobada

El dueño aprueba introducir la protección de información sensible:

- **Costo, utilidad, margen y cualquier KPI derivado de costo** deben mostrarse solo a roles `admin` y `gerente`.
- Para `cajero`, `vendedor` u otros roles no autorizados, esos bloques simplemente **no se renderizan**; no mostrar cero, guiones ni placeholders que revelen estructura sensible.
- Puedes reutilizar el criterio de roles de `puedeVerMin()` si es el helper real que representa `admin/gerente`; si prefieres no ampliar semánticamente ese helper, crea un helper mínimo y explícito solo para esta vista (por ejemplo `puedeVerCosto360()`), sin alterar permisos globales existentes.
- No cambies el comportamiento de otras pantallas (`renderProductos`, `abrirProd`, etc.) en esta Fase A.

## Referencia visual

Usa como referencia el mockup visual que el dueño te adjuntó directamente en el chat. La imagen define **composición, jerarquía, densidad, distribución PC/móvil y estilo**, pero la auditoría técnica manda sobre cualquier dato ficticio que aparezca en la imagen.

## Entregable antes de cualquier merge/publicación

Cuando termines la Fase A en la rama separada, deja:

1. nombre de la rama;
2. commit SHA;
3. diff exacto contra `main`;
4. funciones/rangos tocados;
5. confirmación de que no hubo SQL/Supabase/versionado;
6. resultados de `node --check parches.js` y demás chequeos de sintaxis relevantes;
7. descripción de cómo se comporta en desktop y móvil;
8. cualquier diferencia inevitable respecto al mockup por datos/funciones reales.

No fusiones ni publiques hasta revisión final del dueño + ChatGPT.

---

## Claude — entregable Fase A (2026-08-10)

Implementado en rama separada, **sin tocar `main` funcional**. Los 8 puntos pedidos:

### 1. Rama
`claude/articulo-360-fase-a`

### 2. Commit SHA
`152897d043ecdd851d3bba02cb8bef6af82c5ace`

### 3. Diff exacto contra `main`
Un solo archivo tocado: `parches.js` — **+138 / −25** líneas (`git diff --stat` contra
`main` antes de este commit: `origin/main@6802289`). Nada más en el repo cambió (sin
`version.json`, sin `.sql`, sin workflows, sin secrets).

### 4. Funciones/rangos tocados
- `puedeVerCosto360()` — **nueva**, línea 16248 (junto a `puedeVerMin()`). Helper
  dedicado y explícito solo para esta vista, reusa el criterio de rol de
  `puedeVerMin()` (`admin`/`gerente`) sin ampliar su semántica global, tal como pedía
  la autorización.
- `window.nxArticulo360(id)` — **reescrita completa**, líneas 21610-21820. Mismas 6
  consultas de siempre (compra_items, compras, venta_items, ventas, seriales, kardex),
  sin ninguna query nueva.
- `window.nxArt360Tab(key)` — **nueva**, líneas 21821-21825. Alterna panel/botón activo
  por `data-tab`/`data-tabbtn`, igual patrón que `nxPfProdTab` en `abrirProd`.
- **Bug encontrado y corregido de paso**: el candado 🔒 MÍNIMO se mostraba a
  *cualquier* rol (no tenía ningún gateo) — ahora usa `puedeVerMin()`, el helper que
  ya protege ese mismo dato en `abrirProd`. Cero cambio de comportamiento en
  `renderProductos`/`abrirProd` en sí — solo se reutilizó el helper existente aquí.

### 5. Confirmación: sin SQL / Supabase / versionado
- `git diff origin/main --stat`: **solo `parches.js`**.
- Cero migraciones, cero llamadas a herramientas de Supabase en esta tarea.
- `version.json`/`APP_VERSION` **sin tocar** (rama de revisión, no se publica).
- Ninguna Secret, ningún workflow de GitHub Actions tocado.

### 6. Resultados de verificación
- `node --check parches.js` → `SYNTAX_OK`.
- Batería Playwright contra el código real de la rama, corriendo `index.html`+
  `parches.js` servidos por HTTP local, login real bypaseado, `window.nxAbrirPOS()`
  real ejecutado para poblar `_prods`/`_almacenes`/`_niveles`/`_prodNiveles`/`_reps`
  (no simulado a mano) — **65 comprobaciones, 65 pasaron, 0 fallaron**:
  - **Escenario A** (multi-almacén + producto serializado + rol `admin`): 5 pestañas
    en el orden correcto, invariante de "solo 1 panel `.on`" verificado cambiando por
    las 5, header con nombre/badge/Editar, costo/utilidad/🔒MÍNIMO visibles, aviso de
    descuadre stock-vs-IMEI (5 stock vs 2 disponibles → avisa), pestaña IMEI con
    RESERVADO + `reserva_hasta` + "Sin almacén" + aviso agregado + buscador en vivo
    (filtra a 1 fila, se limpia a 5), Almacenes con los 2 almacenes + columna IMEI
    disp. + botón Transferir, Historial con Proveedores/Compras-con-costo/Ventas/
    Garantías-vigente-y-vencida/Taller-emparejado-por-nombre y **sin** Transferencias
    (Fase B), botones reales: "Administrar IMEI" abre `nxSerialMgr` de verdad,
    "Transferir" abre `nxAlmTransferir` de verdad, "Editar" cierra el 360° y abre
    `abrirProd`/`nxPosEditProd` con el producto correcto precargado. 0 errores de JS.
  - **Escenario B** (1 solo almacén, producto no serializado, inactivo): exactamente 3
    pestañas (sin IMEI, sin Almacenes), sin errores por campos ausentes (categoría/
    marca/imagen vacíos), badge INACTIVO visible, 0 errores de JS.
  - **Escenario C** (mismos datos de A, rol `cajero`): Costo/Utilidad/🔒MÍNIMO
    **ausentes del DOM** (no en cero, no en guion — no se renderizan), Precio y
    Existencia siguen visibles, Compras no muestra el costo por línea pero sí número/
    proveedor/cantidad. 0 errores de JS.
  - **Escenario D** (mismo que A, viewport 390×844 móvil): sin desborde horizontal ni
    del modal ni de la página, la barra de pestañas tiene su propio scroll horizontal.
    0 errores de JS.

### 7. Comportamiento desktop vs. móvil
- **Desktop** (probado a 1400px): modal `.nxPf` a `max-width:720px`, las 5 pestañas
  en una fila, contenido en scroll vertical único dentro del modal, sin desborde.
- **Móvil** (probado a 390px): mismo modal, la fila de pestañas (`.nxPfProdTabs`) hace
  scroll horizontal propio en vez de envolver o desbordar la pantalla — mismo
  contenedor/CSS que ya usa `abrirProd`, sin CSS nuevo para esto.

### 8. Diferencias inevitables contra el mockup
(referencia: `docs/visual-drafts/pos/ARTICULO_360_FINAL.md`, la transcripción del
mockup que mandó el dueño por chat)
- **Sin "Comprometido"** — el esquema real (`pos_seriales.estado`) solo tiene
  `disponible`/`reservado`/`vendido`; no existe un tercer estado. Ya estaba marcado
  "NO USAR" en la especificación aprobada original.
- **RD$, no S/** — el mockup traía soles por descuido de plantilla; todo monto usa
  `fmt()` en `es-DO` como el resto del sistema.
- **Barra lateral real del POS**, no la genérica del mockup — no se tocó
  `shellTienda()` ni la navegación, tal como exige la especificación original ("no
  reescribir shell/navegación").
- **Sin Imprimir/Compartir** — no hay ningún helper estable ya confirmado para eso en
  esta vista (condición explícita de la autorización).
- **"Ventas últimos 30 días" en vez de "Entradas/Salidas 30 días" con gráfica** — se
  implementó el dato real y honesto (cantidad + monto, cruzando `venta_items` ya
  cargado contra la fecha real de cada venta, sin query nueva) con su propio
  disclaimer de aproximación (`limit=100`, excluye anuladas); no se construyó la
  gráfica de líneas del mockup (fuera del alcance de "ajustes estrictamente
  visuales" sobre las consultas ya existentes).
- **Sin columna "Precio compra" por IMEI individual** en la tabla de seriales — el
  costo vive en `pos_compra_items.costo` (por línea de compra, no por unidad); se
  mantiene fuera para no mostrar un promedio disfrazado de precio exacto, tal como
  señalaba la propia nota #4 de `ARTICULO_360_FINAL.md`.
- **Sin "Alertas" con "IMEI sin precio"/"Consistencia OK"** — solo se implementó el
  aviso de descuadre stock-vs-IMEI (mismo patrón/wording ya usado y probado en
  `nxSerialMgr`), sin inventar una sección de alertas nueva sin fuente real detrás.

**Estado:** rama publicada en `origin/claude/articulo-360-fase-a`, sin PR abierto, sin
fusión a `main`. Esperando revisión del dueño + ChatGPT antes de cualquier siguiente
paso.

---

## ACTUALIZACIÓN — fusionado y en producción (2026-08-10)

El dueño confirmó por escrito, explícito, dos veces ("Ponlo en en vivo" → se le hizo
notar que este documento pedía revisión de ChatGPT también y no había llegado
todavía → "Publicar ya, sin esperar") que **quería publicar sin esperar la segunda
revisión de ChatGPT** que este mismo documento pedía originalmente. Se dejó
constancia de esa decisión, no se resolvió por cuenta propia.

Publicado: bump `APP_VERSION` 56.22→56.23 + entrada de changelog en `version.json`
(rama), PR **[#270](https://github.com/sterlinr08-dte/nexus-pro/pull/270)** →
fusionado a `main` en `f1c078d`. Verificado tras el merge: `APP_VERSION` y
`version.json` coinciden en `main` (56.23) — el push dispara el despliegue
automático de Cloudflare.

Si ChatGPT revisa esto DESPUÉS de la publicación: el código ya está en vivo. Cualquier
hallazgo real de la revisión se trata como lo que es — un bug a corregir en una
versión nueva — no como un bloqueo retroactivo de lo ya publicado.