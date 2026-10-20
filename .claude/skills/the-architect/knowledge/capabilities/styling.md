# Capability: Styling

> The design tokens, styling mechanism, and component library that make a product look like one
> product instead of forty screens built by forty people.

Last verified: 2026-07-27

## When a project needs this

- Any shape with a UI. This is not optional, and it is decided before the second screen is built.
- The brief mentions a brand, a reference site, dark mode, or "make it look premium".
- More than one person (or more than one agent session) will write UI.
- The product will be white-labeled or themed per customer.

## Decision matrix

| Option | Best for | Pros | Cons |
|---|---|---|---|
| **Utility-first (Tailwind)** | Almost everything | No naming, no dead CSS, styles read where they are used, huge component ecosystem, agents write it accurately | Dense class strings; needs discipline to keep tokens semantic; a build step |
| **CSS Modules** | Teams that want plain CSS, or a framework where utilities feel foreign | Native CSS, zero runtime, scoped by default, no vendor lock-in | You invent your own token system; class naming returns; harder to keep consistent across many files |
| **CSS-in-JS (runtime)** | Heavily dynamic theming computed at runtime | Styles co-located with components; props drive styles directly | Runtime cost on every render; server-rendering complications; the ecosystem has moved on |
| **Zero-runtime typed CSS** | Design-system packages consumed by several apps | Type-safe tokens, compiled away, no runtime | Extra build machinery; smaller ecosystem; overkill for a single app |
| **Plain CSS + custom properties** | Tiny sites, embeds, extensions with a strict CSP | No tooling at all, ships anywhere | Consistency is entirely manual past a handful of components |

## Recommendation

**Utility-first with Tailwind, tokens as CSS custom properties.** It is the default for every web
shape. Utilities remove naming and dead CSS; custom properties keep the tokens portable so the same
palette drives charts, emails, and canvas rendering where utility classes cannot reach.

Deviate when:

- **Native mobile** — utilities do not apply; the platform's styling system wins. See
  `knowledge/runtime-tracks/mobile-native.md`.
- **Strict CSP / no build step** (some browser extensions, embeds) — plain CSS with custom
  properties. See `knowledge/shapes/browser-extension.md`.
- **The design system is a shipped package** consumed by multiple apps — zero-runtime typed CSS
  earns its build cost there, and only there.

Never mix two styling mechanisms in one codebase. Pick one; the second one is how a design system
dies.

## Design tokens: three layers

The layer split is the whole point. Components reference **semantic** tokens only, so a rebrand is
one file.

| Layer | Example | Who reads it |
|---|---|---|
| **Primitive** — raw values, no meaning | `--blue-600: #2563eb`, `--space-4: 1rem` | Only the semantic layer |
| **Semantic** — role in the UI | `--color-primary: var(--blue-600)`, `--color-danger`, `--color-surface`, `--color-text-muted` | Components, always |
| **Component** — one component's contract | `--button-bg: var(--color-primary)`, `--input-border: var(--color-border)` | That component only |

```css
:root {
  /* primitive — never used directly in a component */
  --blue-600: #2563eb;
  --slate-50:  #f8fafc;
  --slate-900: #0f172a;

  /* semantic — this is what components use */
  --color-primary: var(--blue-600);
  --color-surface: var(--slate-50);
  --color-text:    var(--slate-900);
}
```

Rules:

- A hex code appearing in a component file is a bug. So is a raw pixel value outside the scale.
- Name semantic tokens by role, never by appearance. `--color-danger`, not `--color-red`.
- Keep the semantic set small — roughly a dozen colors. A palette with forty roles has none.
- Add a component layer only when a component genuinely needs to be themed independently.

## Dark mode

- **Attribute or class on the root, not media query alone.** Users expect an explicit toggle; a
  media-only implementation cannot honor it. Read the system preference as the *initial* value, then
  let an explicit choice override and persist it.
- **Redefine semantic tokens per theme.** Only the semantic layer changes; components are untouched.
- **Prevent the flash.** The theme must be applied before first paint — a tiny inline script in the
  document head, or a server-rendered attribute from a cookie. Reading the preference in an effect
  guarantees a white flash on every load.
- **Dark is not inverted light.** Elevated surfaces get *lighter*, not darker. Drop pure black
  (`#000`) backgrounds and pure white text; both cause halation. Desaturate accent colors slightly.
- **Re-check contrast in both themes.** A palette that passes in light routinely fails in dark. See
  `knowledge/capabilities/accessibility.md`.

## Typography, spacing, breakpoints

**Type scale** — one scale, defined once, applied everywhere:

| Role | Size | Weight | Line height |
|---|---|---|---|
| Display | 3rem | 700 | 1.1 |
| h1 | 2.25rem | 700 | 1.2 |
| h2 | 1.875rem | 600 | 1.3 |
| h3 | 1.5rem | 600 | 1.4 |
| Body | 1rem | 400 | 1.6 |
| Small | 0.875rem | 400 | 1.5 |
| Caption | 0.75rem | 500 | 1.4 |

Two families maximum: one sans for UI, one mono for code and numeric columns. Load with the
framework's font pipeline so metrics are known before paint — a swapping webfont is layout shift.
Body text never goes below 16px on mobile; iOS zooms form inputs under that.

**Spacing** — one 4px-based scale (4, 8, 12, 16, 24, 32, 48, 64). Any value off the scale is a bug.
Vertical rhythm comes from container gap, not from margins on children.

**Breakpoints** — mobile-first, base styles unprefixed:

| Name | Min width | Target |
|---|---|---|
| sm | 640px | Large phones |
| md | 768px | Tablets |
| lg | 1024px | Small laptops |
| xl | 1280px | Desktops |
| 2xl | 1536px | Large screens |

Design at 375px first. Every layout is verified at 375px and 1440px before the step is done.

## Component library selection

Decide two axes before naming a library.

**Owned or dependency?** Copy-in libraries (components generated into your repo, e.g. shadcn/ui)
give full edit rights and no upgrade treadmill — the right default when the design is yours. An
installed package is right when you want upstream bug fixes and accessibility maintenance more than
you want control.

**Headless or styled?** Headless primitives (Radix, Ark, Headless UI) ship behavior and
accessibility, no opinion on looks — correct when there is a real design system. Pre-styled kits
(dashboard and chart kits, Tailwind component plugins) get an internal tool or an admin panel
shipped in days, at the cost of looking like everything else built with them.

Selection criteria, in priority order:

1. **Accessibility is built in** — focus trap, keyboard nav, ARIA, portal behavior. Rebuilding this
   yourself is weeks and you will get it wrong.
2. **It matches the runtime track's framework**, not just "React-ish".
3. **Styling mechanism agrees with yours.** A component kit with its own runtime styling inside a
   utility-first codebase means two systems.
4. **Escape hatches exist** — you can override any element's classes and get the underlying ref.
5. **Dark mode is token-driven**, not a second stylesheet.

Default: **copy-in components over headless primitives, styled with your tokens.** Install only the
components a step actually needs — button, input, label, dialog, dropdown, card, table, toast, form
covers most first releases.

## Data model additions

| Table / field | Purpose |
|---|---|
| `user.theme_preference` | `light` / `dark` / `system`. Also mirrored to a cookie so the server can render the right theme without a flash |
| `organization.branding` | White-label only: logo URL plus overrides for a handful of semantic tokens. Never accept raw CSS from a customer |

Most projects add nothing here — theme preference in a cookie is enough until accounts exist.

## Build steps this adds

1. **Define the token file** — primitive, semantic, and (if needed) component layers for both themes,
   plus type and spacing scales. *Done when:* a grep for hex codes and raw pixel values outside the
   token file returns nothing.
2. **Wire the styling engine and fonts** — per the runtime track. *Done when:* a production build
   ships styles for used classes only; a test parses the built CSS and asserts every shipped
   `@font-face` declares the `font-display` strategy the design calls for, and a test fetching the
   raw server HTML asserts the initial `<head>` contains a preload (`<link rel="preload" as="font"
   crossorigin>`, or the framework's equivalent) for every self-hosted font file the first paint
   needs.
3. **Build the theme switch** — system default, explicit override, persisted, applied before paint.
   *Done when:* a test fetching the raw server HTML with a dark-mode cookie set finds the dark theme
   class already on the root element in the first response — before any client script runs.
4. **Install the base component set and restyle to tokens.** *Done when:* a snapshot test renders
   every installed component under both themes and reports no diff against its approved snapshot in
   each, and a grep asserts no component file contains a hard-coded color value.
5. **Build a component gallery route** (dev-only) showing every primitive in both themes and all
   states — default, hover, focus, disabled, error, loading. *Done when:* the gallery covers every
   component in use and every state is reachable without editing code.
6. **Verify contrast and responsive behavior.** *Done when:* an automated contrast check runs over
   the gallery in both themes and reports zero pairs below the targets in
   `knowledge/capabilities/accessibility.md`, and a viewport test asserts
   `document.documentElement.scrollWidth === clientWidth` on the gallery and both main app routes at
   375px.

## Pitfalls

- **Skipping the semantic layer.** Components referencing primitives directly means a rebrand is a
  find-and-replace across the codebase, and dark mode requires editing every component.
- **Palette by vibes.** Picking colors ad hoc per screen produces eleven grays. Fix the palette in
  step 1 and treat additions as design decisions, not implementation details.
- **Dark mode retrofitted.** Adding it after fifty components exist costs more than building both
  themes from the start. Define both token sets on day one even if the toggle ships later.
- **Theme flash.** The most-reported visual bug in themed apps, and always the same cause: the theme
  is applied in an effect instead of before paint.
- **Component-library lock-in.** A kit whose components cannot be restyled becomes the design system.
  Verify the escape hatch before adopting, not after twenty screens.
- **Arbitrary values everywhere.** Utility frameworks allow one-off values; every use is a token you
  did not define. Allowed rarely, never in a shared component.
- **Icons from three sets.** Pick one icon family and one weight. Mixed icon sets read as unfinished
  faster than almost anything else.

## Skills

Install commands and fallbacks: `knowledge/skills-registry.md`. These auto-activate — no leading
slash. If absent, use the token, type, and breakpoint tables above and note the substitution in one
line.

| Skill | When |
|---|---|
| `ui-ux-pro-max` | Before step 1 — concrete palette hexes, font pairing, type scale, component style |
| `emil-design-eng` | Steps 4-5 — motion, easing, durations, enter/exit behavior. Hand it a specific question; a bare invocation returns a generic pitch |
| `frontend-design` | Build phase, once tokens exist — production-grade screens that use them |

## See also

- `knowledge/capabilities/frontend-architecture.md` — the shells and route structure these tokens dress
- `knowledge/capabilities/accessibility.md` — contrast targets, focus visibility, motion preferences
- `knowledge/capabilities/state-management.md` — where the theme preference lives at runtime
- `knowledge/runtime-tracks/ts-node.md` — styling engine setup and font pipeline for the web default
- `knowledge/shapes/marketing-site.md` — where the visual system carries most of the product's weight
