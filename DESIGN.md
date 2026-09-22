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
