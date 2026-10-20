# Capability: Accessibility

> Making the product usable by people using keyboards, screen readers, magnification, and reduced
> motion — and meeting the legal standard that most consumer-facing products are now held to.

Last verified: 2026-07-27

Treat this at the same status as security. It is a legal gate, not a polish pass. A product that
ships inaccessible ships with a liability, and retrofitting accessibility into a finished component
library costs several times what building it in costs.

## When a project needs this

**Assume yes.** The question is which standard applies, not whether one does.

| Driver | Applies to | Working standard |
|---|---|---|
| **European Accessibility Act** (Directive (EU) 2019/882) | Consumer-facing products and services sold in the EU — e-commerce, banking, e-books, transport, telecoms — applicable since June 2025 | EN 301 549, which incorporates WCAG at level AA |
| **Section 508** (US) | Anything sold to or used by US federal agencies; procurement blocks without it | WCAG AA, evidenced by a VPAT / Accessibility Conformance Report |
| **ADA** (US) | Consumer-facing commercial sites; the practical driver behind US demand letters and lawsuits | WCAG 2.x AA, as courts and DOJ rulemaking have converged on |
| **AODA** (Ontario), **ACA** (Canada), **UK public sector regulations**, and equivalents | Regional | WCAG AA |
| **Enterprise procurement** | B2B deals of any size with a large or public-sector buyer | An accessibility conformance report, requested alongside the security questionnaire |

**Genuinely lower stakes:** an internal-only prototype, a CLI, a personal side project with no
commercial offering. Even then, the semantic-HTML and keyboard baseline below costs nothing.

**Microenterprise note (EU):** very small service providers have a carve-out under the EAA, but it
is narrow and it does not survive growth. Do not architect around an exemption you will outgrow.

**The working standard for every blueprint: WCAG 2.2, level AA.** WCAG 3.0 remains a working draft
— do not target it. WCAG 2.2 AA is a superset of 2.1 AA, so meeting it satisfies the regulations
above that still reference 2.1.

## Decision matrix

The real decision is not "which tool" — it is where accessibility lives in the build.

| Approach | Best for | Pros | Cons |
|---|---|---|---|
| **Accessible headless primitives** (React Aria Components, Radix, Ariakit, Base UI, Reka UI for Vue) | Any project with custom-designed interactive components | Focus management, roving tabindex, dialog semantics, and combobox behavior already correct; full visual freedom | You still own contrast, labels, copy, and page structure |
| **A component library with a real a11y track record** (built on the above, e.g. shadcn-style Radix wrappers) | Teams that want defaults plus source access | Fastest path to accessible defaults | Wrapping or restyling can break what you were relying on — re-test after customizing |
| **Native HTML elements** | Forms, links, buttons, disclosure, dialog | Free and unbreakable; works before your JS loads | Less styling control on a few elements (`select`, date inputs) |
| **Hand-rolled ARIA on `div`s** | Nothing | — | Custom comboboxes, menus, and dialogs are where nearly all serious failures live. Do not. |

**Rule:** if a native element exists, use it. If it does not, use a headless primitive. Write ARIA
by hand only for a genuinely novel widget, and then test it with an actual screen reader.

## Recommendation

**Default: native HTML for everything it covers, an accessible headless primitive library for
everything it does not, and automated a11y checks wired into CI from the first UI commit.**

Reasoning: roughly half of real-world violations are structural — missing labels, non-semantic
buttons, broken focus order, insufficient contrast — and all of them are prevented for free by
choosing the right element. The remaining half needs manual testing, but that testing is only
tractable if the structural layer is already clean.

Deviate when: the design system is fixed and inaccessible and you cannot change it. Then budget a
remediation project and say so in the blueprint rather than pretending the checks will pass.

Wire the visual decisions in `knowledge/capabilities/styling.md` to the contrast and target-size
numbers below, so the palette and spacing scale are compliant before a single component is built.
The `ui-ux-pro-max` skill can produce the palette; verify its contrast ratios rather than assuming.

## Data model additions

Accessibility is mostly not a data concern, with three exceptions:

| Addition | Where | Why |
|---|---|---|
| `alt_text` on every uploaded image/media record | Media tables | Required at authoring time — you cannot backfill descriptions for user uploads later |
| `caption_track` / `transcript` on video and audio records | Media tables | WCAG 1.2.2 captions and 1.2.1 alternatives; also improves search |
| `prefers_reduced_motion` / `prefers_contrast` if you persist user preferences | User settings | Only if the product overrides OS settings; otherwise read the CSS media query and store nothing |

If the product accepts user-generated media, the upload form must require alt text or an explicit
"decorative" checkbox. Making it optional means it is never filled in.

## Build steps this adds

These splice throughout a shape's build order, not at the end.

1. **Fix the palette and type scale against contrast targets** — before any component exists.
   · *Done when:* every foreground/background pair in the design tokens is checked and recorded;
   body text ≥ 4.5:1, large text (≥24px, or ≥18.7px bold) ≥ 3:1, and UI component boundaries and
   meaningful graphics ≥ 3:1.
2. **Establish the semantic page skeleton** — one `<h1>` per page, correct heading nesting, landmark
   regions, a skip-to-content link, `lang` on the root element, and a unique descriptive `<title>`
   per route. · *Done when:* an automated check asserts exactly one `h1`, no skipped heading levels,
   and the presence of `main`, `nav`, and a skip link on every route.
3. **Adopt the primitive library and ban raw interactive `div`s** — a lint rule, not a guideline.
   · *Done when:* `eslint-plugin-jsx-a11y` (or the framework equivalent) runs in CI at error level
   and the build fails on `onClick` attached to a non-interactive element.
4. **Wire automated a11y checks into CI** — axe-core through the E2E runner, run against real
   rendered routes, not just component stories. · *Done when:* WHEN a pull request introduces a
   serious or critical axe violation on any covered route THE SYSTEM SHALL fail the build; the
   route list covers every top-level page and the primary authenticated flow.
5. **Do a keyboard-only pass on every flow** — no mouse, no trackpad.
   · *Done when:* every interactive element is reachable with Tab in a logical order, activatable
   with Enter/Space, has a visible focus indicator with ≥ 3:1 contrast against its background, and
   is never obscured by a sticky header or toolbar when focused (WCAG 2.4.11).
6. **Implement focus management for overlays** — dialogs, drawers, menus, toasts.
   · *Done when:* WHEN a modal opens THE SYSTEM SHALL move focus into it, trap Tab within it, close
   on Escape, and return focus to the triggering element on close — asserted by an automated test.
7. **Make forms accessible** — every input has a programmatically associated `<label>` (placeholder
   is not a label), required fields are marked in text not only by color, `autocomplete` is set on
   personal-data fields (WCAG 1.3.5), and errors are announced.
   · *Done when:* WHEN validation fails THE SYSTEM SHALL render the error adjacent to the field,
   reference it with `aria-describedby`, set `aria-invalid`, move focus to the first invalid field,
   and write a summary into a live region — asserted by an automated test reading the live region's
   text content and its `aria-live`/`role` attributes after a failed submit.
8. **Never require a cognitive test to log in** (WCAG 3.3.8) — allow password-manager paste, do not
   block autofill, and offer an alternative to any puzzle-based challenge.
   · *Done when:* pasting into every auth field works and the flow is completable end to end with a
   password manager only.
9. **Handle motion and animation** — respect `prefers-reduced-motion: reduce` globally.
   · *Done when:* WHEN reduced motion is enabled THE SYSTEM SHALL disable parallax, autoplay,
   large-scale transitions, and any looping animation; anything that auto-moves for more than five
   seconds has a pause control; nothing flashes more than three times per second.
10. **Verify zoom and reflow** — at 400% browser zoom / a 320 CSS px viewport width, content reflows
    to a single column with no horizontal scrolling and nothing is clipped (WCAG 1.4.10). Text also
    survives 200% text-only resize (1.4.4) and forced text-spacing overrides (1.4.12).
    · *Done when:* a Playwright test at 320×256 CSS px asserts `document.scrollWidth` does not
    exceed the viewport width on every covered route.
11. **Meet minimum target size** — interactive targets are at least 24×24 CSS px, or have equivalent
    spacing (WCAG 2.5.8). Any drag interaction has a click or keyboard alternative (2.5.7).
    · *Done when:* a test measures bounding boxes of all interactive elements and reports any under
    24×24 without sufficient offset; each drag feature has a documented non-drag path.
12. **Add media alternatives** — captions on prerecorded video, transcripts for audio, alt text on
    every meaningful image, `alt=""` on decorative ones.
    · *Done when:* no image lacks an `alt` attribute, no published video lacks a caption track, and
    the upload form blocks submission without alt text or an explicit decorative flag.

## Post-build launch checklist

Not build steps — each one needs a person driving assistive technology or signing an attestation, so
none of them can terminate inside an autonomous build. Write them into the blueprint as launch items
with an owner each; the blueprint template already parks them among its Section 20.1 manual gates.

| Item | Why it cannot be a build gate | Start it |
|---|---|---|
| Manual screen-reader pass on the top three flows — signup, the core action, and checkout or its equivalent — at minimum NVDA with Firefox and VoiceOver with Safari, plus VoiceOver on iOS or TalkBack on Android for mobile web, with session notes and every defect found recorded in the repo | A human must drive the speech output; no script can judge whether a flow is completable by ear, or whether an accessible name is *meaningful* rather than merely present | As soon as step 7 lands and the three flows are navigable end to end; repeat before every release |
| *(procurement-triggered)* Accessibility conformance report — a VPAT covering WCAG 2.2 AA, Section 508, and EN 301 549, with honest "partially supports" entries and remarks, dated, signed by a named owner, and linked from the trust page described in `knowledge/capabilities/enterprise-readiness.md` | A signature is a human attestation, and its honest entries come from the manual pass above, not from the automated suite | When the first procurement request arrives — earlier if enterprise is in the plan |

## Pitfalls

- **Treating automated scans as coverage.** Automated tooling reliably catches roughly a third of
  real WCAG failures — it finds missing alt attributes and contrast, and it cannot tell you whether
  the alt text is meaningful, the focus order makes sense, or the flow is completable by ear. A
  clean axe run is the floor, not the ceiling.
- **The accessibility overlay widget.** Third-party "one line of JavaScript makes you compliant"
  scripts do not achieve conformance, are actively rejected by the disability community, and have
  been named in lawsuits rather than preventing them. Never recommend one.
- **Placeholder as label.** It disappears on input, is often below contrast minimums, and is not
  reliably announced. Always a real `<label>`.
- **Removing the focus outline.** `outline: none` without a replacement is the single most common
  serious violation in custom design systems. Restyle it; never delete it.
- **Color as the only signal.** Required fields, error states, chart series, and status badges all
  need a shape, an icon, or text in addition to color.
- **`div` with `onClick`.** No keyboard activation, no role, no focusability. Use a `<button>`.
- **`aria-label` on everything.** ARIA overrides the accessible name and silently hides the visible
  text from speech users; a mismatch between visible label and accessible name also fails WCAG 2.5.3.
  Prefer visible text; add ARIA only when nothing visible exists.
- **Toasts and async updates nobody hears.** Content that appears without a focus change must go
  through a live region, or screen-reader users never learn the save succeeded (WCAG 4.1.3).
- **Testing only on the happy path.** Error states, empty states, and loading states are where
  accessibility breaks — they are rendered conditionally and rarely audited.
- **Deferring it to "before launch".** Every deferred day compounds: the component library, the
  design tokens, and the page templates all encode the problem. Fixing it later is a rewrite of the
  UI layer, not a sprint.
- **Assuming a headless primitive makes you compliant.** It gives you correct semantics and focus
  behavior. Contrast, copy, heading structure, and flow logic are still entirely yours.

## See also

- `knowledge/capabilities/styling.md` — palette and type scale must be chosen against the contrast
  targets in step 1, before components exist
- `knowledge/capabilities/frontend-architecture.md` — where the primitive library and semantic
  skeleton decisions land
- `knowledge/capabilities/testing.md` — the CI harness that runs axe and the keyboard/zoom assertions
- `knowledge/capabilities/enterprise-readiness.md` — VPAT/ACR requests arrive with the security
  questionnaire
- `knowledge/shapes/marketing-site.md` — highest legal exposure per line of code; consumer-facing and
  publicly indexed
- `knowledge/shapes/ecommerce-storefront.md` — explicitly named under the European Accessibility Act
- `knowledge/skills-registry.md` — `ui-ux-pro-max` for the visual system, `playwright-cli` for the
  automated keyboard, zoom, and axe passes
