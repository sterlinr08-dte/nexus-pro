# Design System: NEXUS PRO

## 1. Visual Theme & Atmosphere
NEXUS PRO is a professional insurance operations dashboard with a **Daily App Balanced** density, controlled asymmetry, and fluid but restrained motion. The interface should feel precise, calm, and operational rather than decorative. Navigation is layered: a fixed blue rail carries module icons, while a white surface carries labels and detail. These two surfaces must read as separate physical layers without overlapping text.

## 2. Color Palette & Roles
- **Canvas White** (#F8FAFC) — page and elevated surface background.
- **Pure Surface** (#FFFFFF) — sidebar panel, topbar, modal and primary card surface.
- **Charcoal Ink** (#0F172A) — primary text and headings.
- **Muted Steel** (#64748B) — secondary labels, metadata and helper text.
- **Whisper Border** (rgba(148,163,184,0.12)) — structural separators and subtle surface edges.
- **Nexus Blue** (#2563EB) — single structural accent for navigation, active states, focus and selected surfaces.
- Existing multicolor module icons are treated as semantic glyph assets, not surface accents; they must not leak into borders, glows, or large background treatments.

## 3. Typography Rules
- **Display / Headings:** Satoshi or Geist Sans, tight tracking, hierarchy through weight rather than oversized type.
- **Body / UI Labels:** Satoshi or Geist Sans, 14px minimum for body copy where space permits.
- **Mono:** JetBrains Mono for metadata, codes, compact technical labels and cycle references.
- Dashboard UI must remain sans-serif. Avoid generic serif faces and avoid Inter for new premium surfaces.

## 4. Component Stylings
- **Sidebar Rail:** fixed blue structural layer with subtle directional shadow; icons remain centered inside the rail.
- **Sidebar White Panel:** separate elevated white surface with soft border, diffused shadow and large rounded termination.
- **Navigation Labels:** live exclusively inside the white panel; never overlap or intrude into the blue rail.
- **Active Navigation State:** compact light-blue pill anchored to the label zone only. It should hug the text with controlled breathing room and never extend behind the icon rail.
- **Buttons:** tactile, compact, no neon glow; active press uses a small transform/pressed-shadow response.
- **Cards:** use elevation only when hierarchy benefits from it; keep shadows soft and tinted toward slate.
- **Topbar:** light, compact and aligned to the content grid; avoid excessive glow or visual weight.

## 5. Layout Principles
- Mobile-first below 768px.
- No horizontal scrolling.
- No text may overlap the blue navigation rail.
- Icons and labels occupy separate spatial zones.
- White label panel begins after the rail boundary with at least 10–12px internal breathing room.
- Touch targets should be at least 44px.
- Prefer grid/explicit zones over fragile spacing hacks.
- The sidebar may overlay content when expanded, but internal layers must never overlap each other semantically.

## 6. Motion & Interaction
- Use spring-like easing for drawer and active-state transitions.
- Animate transform and opacity wherever possible.
- Active-state movement should feel weighted and controlled, never bouncy or elastic.
- Drawer white panel should visually emerge from beneath the blue rail.
- Respect `prefers-reduced-motion`.

## 7. Anti-Patterns (Banned)
- No text over the blue rail.
- No active pill behind icons.
- No neon outer glows.
- No pure black.
- No oversized floating cards without hierarchy purpose.
- No duplicated actions.
- No generic three-column equal-card patterns for new layouts.
- No horizontal overflow on mobile.
- No absolute-positioned text layers that can collide with navigation.
- No decorative gradients on large text.
- No UI filler copy or emoji.
