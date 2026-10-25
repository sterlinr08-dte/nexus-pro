# Design System: NEXUS PRO

## 1. Visual Theme & Atmosphere
NEXUS PRO is a professional insurance operations dashboard with **Daily App Balanced** density (6/10), controlled asymmetry (6/10) and calm, physical motion (6/10). It should feel precise, dependable and quietly premium: a blue structural navigation rail, a clean white operational surface and information that arrives in a measured sequence. Motion supports orientation and feedback; it must never delay a task.

## 2. Color Palette & Roles
- **Canvas White** (#F8FAFC) — page and elevated-surface background.
- **Pure Surface** (#FFFFFF) — sidebar panel, topbar, modal and primary card fill.
- **Charcoal Ink** (#0F172A) — primary text and headings.
- **Muted Steel** (#64748B) — secondary labels, metadata and helper text.
- **Whisper Border** (rgba(148,163,184,0.12)) — separators and subtle surface edges.
- **Nexus Blue** (#2563EB) — the single structural accent for navigation, selected states and focus.
- Existing multicolor module icons are semantic glyph assets. They must not become large surface colors, borders or glows.

## 3. Typography Rules
- **Display / Headings:** Geist Sans or Satoshi, controlled scale, tight tracking and hierarchy through weight.
- **Body / UI Labels:** Geist Sans or Satoshi; operational body copy is 14px minimum where space permits.
- **Mono:** JetBrains Mono for amounts, dates, technical metadata and cycle references.
- Dashboard UI remains sans-serif. Do not introduce Inter or serif fonts.

## 4. Component Stylings
- **Sidebar Rail:** fixed blue structural layer with a restrained gray contour shadow. Icons stay centered in the rail.
- **Sidebar White Panel:** separate elevated white surface, soft border and rounded lower termination. When an accordion is open, its vertical edge extends so no new option is visually cut by the curve.
- **Navigation Labels:** live only in the white panel; never overlap or intrude into the blue rail.
- **Active Navigation State:** a compact light-blue pill anchored to the label zone; it hugs the text and never extends behind the icon rail.
- **Buttons:** compact, tactile, no neon glow. Hover lifts by 1px only on pointer devices; active state presses down by 1px.
- **Cards:** elevation only where it communicates hierarchy. Use slate-tinted shadows; status and amount cards enter in a short cascade instead of all appearing at once.
- **Modals:** surface fades in while its content rises 8px. Dismissal is quicker than entry.
- **Loaders:** skeletal shimmer matching actual layout dimensions. Never use generic circular spinners for page loading.

## 5. Layout Principles
- Mobile-first below 768px, with no horizontal scrolling.
- Mobile blue rail is 76px; expanded navigation surface is 228px. Labels start at least 20px inside the white zone after the rail boundary.
- Touch targets are at least 44px.
- Use explicit grids and zones instead of fragile positional spacing.
- The sidebar may overlay content when expanded, but its physical layers must not overlap semantically.
- Content changes may scroll inside the navigation zone; the dashboard itself must not jump when an accordion opens.

## 6. Motion & Interaction
- **Timing:** 160ms for tactile feedback, 220ms for local surface changes, 320–420ms for drawers and accordions.
- **Easing:** default is a controlled spring curve: `cubic-bezier(.22,1,.36,1)`. Do not use linear movement.
- **Drawer:** the white panel emerges from beneath the fixed blue rail. Labels follow after 85–115ms in a short cascade.
- **Views:** the first 8–12 visible operational surfaces enter with 22ms stagger: opacity from 0 to 1 and translateY from 8px to 0. Re-enter only on a real navigation change.
- **Accordions:** options reveal downward with real measured height; the rail’s lower contour continues vertically while open. The navigation zone may auto-scroll just enough to reveal the first new option.
- **Buttons and cards:** pointer hover uses translateY(-1px); active press uses translateY(1px). Never use scale for primary taps on iOS.
- **Active navigation glyph:** use an extremely subtle opacity breath (2.8–3.2s) to confirm the current module; no glow, bounce or color flashing.
- **Performance:** animate only `transform` and `opacity`. Do not animate `top`, `left`, `width` or `height`; accordion height is a controlled exception required to reveal its content.
- **Accessibility:** `prefers-reduced-motion: reduce` removes nonessential animation and smooth scrolling while preserving visibility and state changes.

## 7. Anti-Patterns (Banned)
- No text over the blue rail.
- No active pill behind icons.
- No neon outer glows, oversaturated accent surfaces or purple/blue neon treatments.
- **Excepción decidida por el dueño (25-oct-2026): «botones encendidos».** El botón PRINCIPAL de cada pantalla y la opción ELEGIDA llevan luz: brillo por dentro arriba, sombra abajo, canto iluminado y halo de SU PROPIO color (morado-azul NEXUS; los chips, su `--chip-c`). Los demás botones no brillan. Implementación: `style#nxLuz` en `index.html` (59.57). Fuera de esos dos casos, la regla de arriba sigue.
- No pure black.
- No oversized floating cards without a hierarchy purpose.
- No duplicated actions or decorative filler copy.
- No generic three-column equal-card layouts for new areas.
- No horizontal overflow on mobile.
- No absolute-positioned text layers that can collide with navigation.
- No decorative gradients on large text.
- No emoji in the operational UI.
- No mount animations that repeatedly replay during routine data updates.


## 7b. Single Graphic Line — implementation contract (POS, 2026-09-22)
The owner decided that this file is the **only** graphic line of the product. It is materialized in code as
CSS custom properties injected by `parches-pos-stitch-visual.js` (layer `#nxLineaUnicaCSS`), scoped to
`#v-pos`, `#v-multiempresa`, POS modals (`.modal.nxPrForm`, `.nxPf`) and `body.org-tienda`. Seguros views are
outside that scope on purpose (FOUC rollback history on iPhone).

| Token | Value | Role |
|---|---|---|
| `--nx-bg` | #F8FAFC | page canvas |
| `--nx-surface` | #FFFFFF | cards, modals, top bar |
| `--nx-ink` / `--nx-steel` / `--nx-mute` | #0F172A / #64748B / #94A3B8 | text hierarchy |
| `--nx-line` / `--nx-line-2` | rgba(148,163,184,.12 / .18) | separators / card borders |
| `--nx-blue` / `--nx-blue-d` / `--nx-blue-l` / `--nx-blue-b` | #2563EB / #1D4ED8 / #EFF6FF / #BFDBFE | the single accent |
| `--nx-r` / `--nx-r-md` / `--nx-r-sm` | 16px / 12px / 10px | surfaces / bars / buttons & inputs |
| `--nx-font` | Geist, Segoe UI, system-ui | all text (Google Fonts, `display=optional`, loaded when the POS opens) |
| `--nx-mono` (also `--mono`) | JetBrains Mono, ui-monospace | amounts, dates, references, serials |

Rules the layer enforces: legacy purple/indigo (`#6d28d9`, `#7c3aed`, `#4f46e5`, tints) is remapped to
Nexus Blue everywhere in the POS; `.bc1` and the sticky action bar (`.fbP`) are Nexus Blue; white cards get
16px radius; inputs focus with a 3px rgba(37,99,235,.12) halo; buttons lift 1px on pointer hover and press 1px.
New POS code must use the tokens directly instead of hex literals. The Stitch design system
"NEXUS PRO · POS (DESIGN.md)" (project *POS Dominicana*) mirrors these values so generated screens match.

## 8. Multiempresa POS Profile
- **Atmosphere:** an operational workspace for daily sales: balanced density (6/10), structured asymmetry (5/10), and restrained motion (5/10). The Multiempresa hub is the administrative launcher; the POS shell is the focused work area.
- **POS canvas:** Slate White (#F8FAFC) behind Pure Surface (#FFFFFF). **Nexus Blue** (#2563EB) remains the only structural accent for the quick-sale action, focus states and the navigation shell.
- **Navigation:** the POS side rail is a calm blue structural plane. Its active item is a translucent white inset, never a neon glow or oversized pill.
- **Dashboard:** operational KPIs use tabular numbers and compact 16px-radius surfaces. App shortcuts form an adaptive grid, not a fixed three-column feature row.
- **Multiempresa cards:** each business/module card is a 112px minimum touch surface with icon, title, role-specific description and directional affordance. On mobile it becomes a single column.
- **Motion:** cards and KPIs enter at 24ms intervals; hover lifts 1–2px only on pointer devices. Buttons press down 1px on activation. All movement uses transform and opacity, and respects reduced-motion settings.
- **Never:** blend business identity colors into large backgrounds, duplicate navigation actions, animate sales amounts continuously, or use cosmetic motion that delays a sale, payment or inventory action.

---

## 9. Estilo común de los 3 proyectos (NEXUS PRO · Bayol Cell · STUDIO) — 20-oct-2026
Agregado con el dueño tras ver Awesome DESIGN.md. **No reemplaza las secciones 1–7**: en NEXUS PRO mandan esas; esto suma las decisiones del dueño que valen para los 3 repos (el mismo texto está como DESIGN.md en Bayol Cell). Donde haya diferencia: en NEXUS la sección 3 (mono para montos) sigue vigente; en Bayol el dueño pidió números con la letra del sistema.

Guía de diseño que toda IA debe leer **antes de crear o cambiar una pantalla** en cualquiera de los 3 proyectos.
Idea tomada de Awesome DESIGN.md (formato Google Stitch), escrita con los valores reales de NEXUS PRO y con las
decisiones del dueño. Va igual en los 3 repos; lo que cambia por proyecto está en «Acento por proyecto».
Creado el 20-oct-2026. Si el dueño decide algo nuevo de diseño, se agrega aquí y en la bitácora.

### 1. Ambiente
- **Claro, ordenado y elegante**, con estilo Apple y vidrio esmerilado. Superficies blancas translúcidas sobre un fondo suave.
- **Denso pero aireado.** Las pantallas son de trabajo: hay que ver más datos con menos desplazamiento, sin apretar.
- **Nada de adornos que no ayuden.** Las ayudas largas van detrás de una ⓘ, nunca como avisos grandes en la pantalla.
- **Una sola entrada por función.** Nunca dos botones que hagan lo mismo. Revisar antes de agregar uno.

### 2. Color
| Rol | Valor | Uso |
|---|---|---|
| Tinta | `#0f172a` | Texto principal |
| Texto secundario | `#475569` / `#64748b` | Subtítulos, etiquetas |
| Texto apagado | `#94a3b8` | Encabezados de tabla en mayúscula, ayudas |
| Borde | `rgba(15,23,42,.08)` | Líneas finas, tarjetas |
| Vidrio | `rgba(255,255,255,.86)`; fuerte `.94` + `blur(24px) saturate(180%)` | Ventanas, tarjetas flotantes |
| Fondo de modal | `rgba(15,23,42,.35)` + `blur(6px)` | Detrás de ventanas emergentes |
| Azul NEXUS (acción, foco) | `#2563eb` / `#1d4ed8`; suave `rgba(59,130,246,.07–.16)` | Enlaces, foco, selección, consultas |
| Éxito / disponible | `#15803d` sobre `#f0fdf4`; punto `#22c55e` | «Disponible», «En Info Plus», pagado |
| Aviso | `#b45309` sobre `#fef3c7`; punto `#f59e0b` | «Crear», pendientes |
| Error / sin stock | `#b91c1c` sobre `#fef2f2` | «Sin stock», errores. **El rojo solo para problemas** |
| Sin leer (como WhatsApp) | `#25d366`, texto blanco | Círculos de conteo |
| Almacén / existencia | `#0e7490` sobre `#ecfeff` | Píldoras de almacén |

### Acento por proyecto
- **NEXUS PRO:** azul NEXUS. Menú con riel azul en el modo claro.
- **Bayol Cell:** naranja `#e4572e` / `#FF6B35` para acciones principales (Guardar, +). Barra superior azul noche. Las consultas y ventanas emergentes usan el azul NEXUS.
- **STUDIO:** su propio acento, sobre la misma base. Revisar el repo antes de cambiarlo.

### 3. Tipografía
- **Letra del sistema** en todo, números incluidos: `-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui`. Bayol puede usar «Plus Jakarta Sans».
  - **No usar letra de máquina de escribir** (monospace) para fechas, totales ni precios. El dueño la rechazó.
  - Para que las cifras se alineen: `font-variant-numeric: tabular-nums`.
- **Escala NEXUS:**
  - grande 28;
  - título 1: 24;
  - título 2: 20;
  - título 3: 17;
  - texto 15;
  - destacado 14;
  - subtítulo 13;
  - nota 12;
  - leyenda 11.
- **Campos de escribir:** 16 px mínimo, para que el iPhone no haga zoom.
- **Encabezados de columna:** 12 px, mayúscula, `letter-spacing .04–.06em`, color apagado.
- **Dinero:** siempre `RD$ 1,250.00`, con dos decimales y separador de miles.

### 4. Componentes
- **Botones:**
  - toque mínimo de 44 px;
  - forma de píldora (`border-radius: 999px`) o 10–14 px;
  - al presionar, `scale(.94–.97)`.
  - El texto es corto y dice la acción («Consulta», «Servicio», «Guardar»). Nada de palabras de relleno como «Elegir —».
- **Botón de solo ícono:** 36–44 px, redondo, con `aria-label`. Usarlo solo si el ícono se entiende solo: ✕, lupa, copiar.
- **Campos:**
  - alto 48 px, letra 16 px, radio 12–14 px;
  - al enfocar: borde azul `rgba(59,130,246,.6)` y anillo `0 0 0 4px rgba(59,130,246,.16)`.
  - Lo que no se puede editar se muestra como texto, nunca como una caja que parezca campo.
- **Etiqueta de estado:** píldora pequeña de 26 px con un punto de color y una palabra («Crear», «En Info Plus», «Error»). Nada de frases largas.
- **Ventana emergente (consultas, buscadores):**
  - vidrio fuerte, radio 20 y sombra suave por capas;
  - barra de título clara: ícono azul, título de 17 px y ✕ redonda gris de 36 px;
  - en la PC se arrastra desde la barra; en el celular ocupa la pantalla y sube desde abajo.
- **Listas y tablas:**
  - fila de 52 px o más;
  - al pasar el ratón, `rgba(59,130,246,.07)`;
  - al tocar, se abre el detalle debajo de la fila.
  - El mismo dato no se repite en dos lugares.
- **Ayudas:** detrás de una ⓘ junto a la etiqueta. No van en cajas amarillas grandes.

### 5. Medidas y espacio
- Espacios de 4, 8, 12, 16, 24 px.
- Margen lateral de 16 px en el celular.
- **Radios:**
  - píldoras 999;
  - tarjetas y ventanas 16–20;
  - campos 12–14;
  - chips 6–8.
- En la PC, lo que es una sola cosa va **en una línea**, aprovechando el ancho.
- En el celular, lo esencial va arriba y lo opcional en desplegables («Equipo, falla y más datos (opcional)»).
- **No poner barra inferior fija** si repite funciones.

### 6. Profundidad
- **Sombras suaves por capas:**
  `0 1px 0 rgba(255,255,255,.8) inset, 0 0 0 1px rgba(15,23,42,.06), 0 30px 70px -24px rgba(15,23,42,.45), 0 12px 24px -12px rgba(15,23,42,.18)`.
- **Niveles:** fondo → tarjeta de vidrio → ventana emergente (con fondo oscurecido y desenfocado).

### 7. Movimiento (rápido y fluido)
- **Curva base:** `cubic-bezier(.22,1,.36,1)`. Rápido 160 ms, base 220 ms, cajón 360 ms.
- **Abrir ventana:** resorte `nxPopIn .26s cubic-bezier(.34,1.56,.64,1)`, desde `translateY(10px) scale(.96)`. Cerrar en 140 ms.
- **Listas:** las filas entran en cascada (8 px, 18 ms entre filas, máximo 90 ms) **solo al escribir**. Con las flechas o al tocar una fila, no se repite.
- **Solo animar `transform` y `opacity`.**
- Respetar `prefers-reduced-motion`: con esa opción, todo instantáneo.
- **Nunca** causar parpadeo al cargar (FOUC). Fue la causa del rollback del rediseño (#311).

### 8. Reglas técnicas del dueño
- **Cambios visuales en capas aisladas** (un archivo o bloque por módulo), reversibles y con versión `?v=`.
  - No acumular CSS contradictorio: antes de agregar un override, ver qué regla gana hoy.
- **Probar a 390–440 px (iPhone) y a 1280 px**, con capturas, antes de entregar.
- **Español sencillo, trato de «usted».** Nombres que dicen lo que hacen.
- **No publicar** sin «publícalo» del dueño.

### 9. Guía rápida para pedir pantallas a una IA
«Usa el DESIGN.md del proyecto:
- vidrio claro y radio 16–20;
- azul NEXUS para foco y consultas;
- botones de 44 px, campos de 48 px con letra de 16 px;
- letra del sistema y dinero en RD$ con dos decimales;
- estados en píldora con punto de color;
- ayudas detrás de una ⓘ;
- una sola entrada por función;
- animación de 160–260 ms con la curva `(.22,1,.36,1)`;
- probar a 390 y 1280.»
