# Design System: NEXUS PRO

## 1. Visual Theme & Atmosphere

NEXUS PRO should feel like a premium operational cockpit for insurance administration: calm, precise, layered, and fast rather than decorative.

- **Density:** 6/10 — Daily App Balanced. Enough information to operate quickly, but every control has breathing room.
- **Variance:** 4/10 — controlled asymmetry. The blue navigation rail is the main visual anchor; the white content drawer is a secondary layer.
- **Motion:** 5/10 — restrained fluid motion. Drawers and active states should feel weighty and deliberate, never bouncy or flashy.
- **Depth language:** use elevation only to explain hierarchy: blue rail above white drawer; white drawer above dimmed application content.
- **No overlap:** text, labels, section titles, badges, and user identity must occupy the white drawer zone. Only navigation icons and the NEXUS PRO mark icon may live on the blue rail.

## 2. Color Palette & Roles

Use one system accent. Existing multicolor navigation icons are legacy functional artwork and must not become component accents elsewhere.

- **Canvas Mist** (#F6F8FB) — application background and low-contrast surfaces.
- **Pure Surface** (#FFFFFF) — sidebar drawer, cards, and raised panels.
- **Charcoal Ink** (#172033) — primary labels and titles.
- **Muted Steel** (#6B768A) — secondary text and metadata.
- **Whisper Border** (rgba(148,163,184,0.14)) — separators and container borders.
- **NEXUS Cobalt** (#315FC9) — the single structural accent for active states, focus rings, and navigation depth.

The blue rail may use tonal variations of NEXUS Cobalt for depth, but no new accent hue should be introduced. Avoid neon, outer glow, or purple/blue AI-style lighting.

## 3. Typography Rules

- **Display / UI Titles:** Plus Jakarta Sans, 700–800 weight, tight but not compressed tracking.
- **Body / Navigation Labels:** Plus Jakarta Sans, 600–700 weight.
- **Mono / Metadata:** JetBrains Mono for version strings, section micro-labels, and dense numerical metadata.
- **Navigation labels:** minimum 14px effective mobile reading size when possible; never allow labels to sit on the blue rail.
- **Section labels:** uppercase, quiet, letter-spaced, visually subordinate to navigation items.
- **Banned:** Inter, generic serif fonts, decorative type inside the dashboard.

## 4. Component Stylings

### Sidebar Rail
- Fixed blue structural rail.
- Icons centered mathematically inside the rail.
- Rail shadow falls toward the white drawer to communicate depth.
- Rail surface uses subtle tonal variation, not neon glow.
- No text may be positioned inside the rail except the decorative iconography.

### White Sidebar Drawer
- Pure white to soft-cool white gradient.
- 28–34px outer radii where visible.
- One quiet border and one diffused shadow.
- Starts visually underneath the blue rail.
- All labels begin at least 12px inside the white zone after the rail boundary.
- Footer identity stays entirely in the white zone.

### Active Navigation Item
- Compact capsule attached to the label, not to the full row.
- Approximately 10px horizontal breathing room around the text.
- Pale cobalt tint, whisper border, subtle inset left accent.
- Never extend deep into unused drawer space.
- Never cover the rail icon.

### Buttons
- Tactile active feedback using translate only.
- No neon outer glow.
- Primary actions use NEXUS Cobalt; secondary actions use neutral surfaces.

### Cards
- Use elevation only where hierarchy is needed.
- Prefer borders and whitespace over stacking multiple heavy shadows.
- Avoid generic repeated 3-card rows as a visual default.

## 5. Layout Principles

- The mobile sidebar is a two-zone composition:
  - **Zone A:** fixed blue rail, width defined by `--nx-rail`.
  - **Zone B:** white drawer content beginning strictly after Zone A.
- Use structural positioning so text cannot drift back into Zone A.
- The first icon in each navigation row is centered in Zone A.
- Labels, badges, chevrons, section titles, brand text, and footer content belong to Zone B.
- Do not solve rail/drawer alignment with arbitrary negative margins.
- No content overlap.
- No horizontal scrolling caused by the sidebar.
- Keep desktop and mobile rules isolated by breakpoint.

## 6. Motion & Interaction

- Drawer reveal: transform + opacity only.
- Active label change: short transform/opacity transition; no width/height animation where avoidable.
- Recommended spring feel: stiffness 100, damping 20.
- Active states may use a subtle continuous sheen only if it remains below 5% visual intensity; no pulse glow.
- Respect `prefers-reduced-motion`.
- Keep all new motion GPU-friendly.

## 7. Anti-Patterns (Banned)

- No text over the blue rail.
- No labels beginning before the white drawer boundary.
- No pure black.
- No neon or outer glow.
- No excessive gradients on text.
- No overlapping elements.
- No arbitrary negative positioning patches.
- No duplicated navigation controls.
- No oversized active selector stretching across empty white space.
- No generic placeholder names.
- No filler UI copy.
- No new multicolor component accents beyond the existing legacy icon artwork.
