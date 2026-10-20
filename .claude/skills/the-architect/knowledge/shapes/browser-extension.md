# Shape: Browser Extension

> Software that lives inside the user's browser — it reads or augments pages they already visit, and ships through a store review queue instead of a deploy pipeline.

Last verified: 2026-07-27

## Is this your project?

**Yes if:**
- The value only exists *on top of* a site the user is already on — highlight, capture, rewrite, overlay, autofill.
- The user says "a Chrome extension", "a toolbar thing", "a button next to the address bar", "it should work on any page".
- You need the user's authenticated session on a third-party site without asking for their password.
- Distribution is a store listing, and installs are the metric.

**No if:**
- It needs the filesystem, native menus, background daemons, or a window that outlives the browser → `knowledge/shapes/desktop-app.md`.
- The browser is only the delivery mechanism for your own app's UI → `knowledge/shapes/saas-webapp.md`.
- It runs headless on a schedule with no human in the loop → `knowledge/shapes/automation-bot-integration.md`.
- The deliverable is a package other developers install and call → `knowledge/shapes/cli-library-mcp.md`.

## Default runtime track

**TypeScript/Node** — see `knowledge/runtime-tracks/ts-node.md`. The extension platform is JavaScript-only inside the browser; the track supplies the bundler, the type definitions for the extension APIs, and the test runner.

Alternatives: none for the extension itself. If the extension talks to your own server, that server is a separate deliverable — compose with `knowledge/shapes/api-backend.md` and pick its track independently (`knowledge/runtime-tracks/python.md` and `knowledge/runtime-tracks/go.md` are both fine there).

## Core capabilities

| Capability | Why this shape needs it | File |
|---|---|---|
| Frontend architecture | Three or four separate UI surfaces (popup, options, side panel, injected overlay) share one component layer | `knowledge/capabilities/frontend-architecture.md` |
| State management | State lives in extension storage, not memory — the background context is destroyed constantly | `knowledge/capabilities/state-management.md` |
| Styling | Injected UI must not leak into the host page and must survive the host page's CSS | `knowledge/capabilities/styling.md` |
| Testing | Manual reload-and-click does not scale past three surfaces; extensions need a real browser harness | `knowledge/capabilities/testing.md` |
| Deployment | "Deploy" means packaging, signing, store review, and staged rollout — nothing like a web deploy | `knowledge/capabilities/deployment.md` |
| Observability | You cannot SSH into a user's browser; errors only exist if you report them | `knowledge/capabilities/observability.md` |
| Auth | Only if there is an account or a paid tier — extension auth is a web flow, never a login form in the popup | `knowledge/capabilities/auth.md` |
| API design | Only if there is a backend; the message contract between contexts is its own API surface | `knowledge/capabilities/api-design.md` |
| Payments | Only for paid extensions — stores no longer run the billing, so licenses are yours to issue | `knowledge/capabilities/payments-rails.md` |

## Data model

Extensions rarely have a database. They have storage areas with different lifetimes, and you must pick deliberately per key.

| Store | Lifetime | Use for | Never put here |
|---|---|---|---|
| `sync` storage | Follows the signed-in browser profile across devices; small quota, per-item size cap | User settings, feature flags, site allowlist | Anything large or high-frequency |
| `local` storage | Per-install, survives restarts and updates | Cached content, drafts, offline queue | Secrets |
| `session` storage | Cleared when the browser closes; readable from the background context only if you say so | Short-lived tokens, in-flight job state | Anything the user expects to persist |
| Backend | Server-side | Account, entitlement, anything another device must see | — |

Core entities, wherever they land: **Settings** (one per install) · **SiteRule** (host pattern → enabled/config) · **CapturedItem** (whatever the extension collects, with source URL + timestamp) · **License** (server-issued, cached locally with an expiry) · **SchemaVersion** (integer, drives storage migrations).

## Directory structure

Shown for the TypeScript track.

```
src/
  manifest.config.ts    # manifest generated per browser target, not hand-edited JSON
  background/
    index.ts            # ONLY top-level listener registration — no work at import time
    handlers/           # one file per message type
  content/
    mount.ts            # injects the shadow root, nothing else
    ui/                 # the overlay components
    bridge.ts           # page-world <-> isolated-world postMessage, if needed
  popup/                # toolbar UI
  options/              # full-page settings
  shared/
    messages.ts         # the typed message union — single source of truth
    storage.ts          # typed wrapper + migrations; nothing calls storage APIs directly
    permissions.ts      # runtime permission requests
public/icons/
targets/                # per-browser manifest overlays and build outputs
e2e/                    # browser-driven tests against the built extension
```

## Build order

1. **Permission budget** — list every host pattern and API permission with a one-line user-facing justification; cut anything you cannot justify. · *Done when:* a `PERMISSIONS.md` exists and the generated manifest declares no permission absent from it.
2. **Scaffold and manifest generation** — build tooling emits an unpacked extension directory with a generated manifest (MV3 — the extension platform spec, not a library pin). · *Done when:* a browser-driven test launches a persistent context with the unpacked build loaded, asserts the background service worker registers and reaches an active state, and asserts a runtime manifest call made from the extension's own context returns the generated manifest with no runtime error set; and the extension linter exits 0 on that same directory. Eyeballing the browser's Errors panel is a launch-checklist item, not a build gate.
3. **Dev loop** — watch-mode rebuild plus a one-key reload. · *Done when:* with the watcher running, a script records the built bundle's content hash, writes a marker change into a source file, and asserts the emitted bundle's hash differs from the recorded one within ten seconds; and the production build emits a zip under the store's package size limit.
4. **Background worker skeleton** — every listener registered synchronously at top level; zero state in module scope; long waits use alarms, never timers. · *Done when:* an automated run terminates the worker from the extensions page, triggers the extension's main action, and asserts the action completes with the same result as before termination and every value read back from storage is unchanged.
5. **Storage layer** — typed wrapper, one module, schema-versioned migrations. · *Done when:* unit tests cover read/write/migrate, and installing the new build over data written by the previous schema upgrades it with no data loss.
6. **Content script and isolated world** — inject into a shadow root; if you must read page JS, add an explicit page-world bridge. · *Done when:* on a deliberately hostile test page the overlay renders unaffected by page CSS, and the page's own layout is byte-identical with the extension on and off.
7. **Message contract** — one typed union covering content ↔ background ↔ popup, with async responses handled correctly. · *Done when:* a test asserts an unknown message type is rejected with an error rather than silently dropped, and no context calls the raw messaging API outside `shared/messages.ts`.
8. **Popup, options, side panel** — hydrate from storage on open. · *Done when:* with a known value seeded into extension storage, a test captures the popup's first painted frame and asserts that frame already contains the hydrated value and that the initial render tree contains no loading or skeleton node; and changing a setting updates an already-open content script without a page reload.
9. **Runtime permissions** — request host access on a user gesture, not at install. · *Done when:* a fresh install prompts for no host permission; clicking "Enable on this site" shows the browser's grant dialog, and immediately after the grant resolves the content script is injected and the overlay is present in the page's shadow root — asserted with no reload in between.
10. **Backend integration** *(only if there is one)* — auth via a web flow in a normal tab, token exchanged into extension storage. · *Done when:* a request succeeds with the stored token, and a server-revoked token drives a visible re-auth prompt instead of a silent failure.
11. **Cross-browser targets** — per-target manifest overlays; verify the API namespace and background declaration each target expects. · *Done when:* the build produces one zip per target and each loads in its browser with no manifest errors.
12. **Error reporting** — opt-in, scrubbed of page content and URLs by default, tagged with the extension version. · *Done when:* a test throws a deliberate error in the background worker and another in a content script, then queries the error tracker's **API** by event ID for each and asserts both events are retrievable, each event's version tag equals the version in the generated manifest, and neither payload carries page content or a page URL. Reading either event in the vendor's dashboard UI is a launch-checklist item.
13. **End-to-end tests** — a real browser loading the built extension in a persistent context. · *Done when:* the suite exercises install → grant permission → core flow → settings change, and passes in CI against the packaged zip, not the source tree.
14. **Store-ready package** — listing copy, screenshots, privacy disclosures, and a single-purpose description that matches the permission list, all committed as files in the repo. · *Done when:* the release command produces one signed zip per target under each store's size limit, and a listing-lint script asserts that every required field — title, single-purpose description, screenshots at each required size, privacy disclosure answers, and one justification string per declared permission — is present and non-empty, and that the justification keys are exactly the permission set in the generated manifest. Submission and approval are launch-checklist items below.

## Post-build launch checklist

These wait on a review queue, an account you must own in person, or a human's own eyes on a vendor UI — so none of them can gate an autonomous build. Put them in the blueprint with an owner; start the account work first.

| Item | Why it cannot be a build gate | Start it |
|---|---|---|
| Store developer accounts (and, for Safari, a paid Apple developer account plus a native wrapper project) | Payment and identity verification by a third party | Day one |
| Submit to each store and clear review | Same-day to multiple weeks; broad permissions draw the slow path | After step 14 |
| First approved build live on the public listing | The store decides | Never schedule a marketing push against it |
| Self-hosted enterprise build path and an email list outside the store | Insurance against a suspension you cannot appeal quickly | Before launch |
| Open the extension's Errors panel in each target browser after a real install and read it | A browser UI surface with no API behind it; step 2 asserts the machine-checkable half | After step 11 |
| Read the first real reports in the error tracker's dashboard UI and confirm the scrubbing looks right to a human | Judging whether redacted content is still identifiable is a human call; step 12 asserts retrievability and tags | First week after launch |

## Pitfalls

- **Treating the background worker as persistent.** It is killed aggressively and restarted on the next event. Module-scope variables, open timers, and in-flight promises all vanish. Keep state in storage, use alarms for scheduling, and make every handler resumable.
- **Over-requesting permissions.** Broad host access is the single biggest cause of review rejection and of install-time scare warnings that kill conversion. Ship with `activeTab` plus optional host permissions requested on a gesture. Reviewers compare your permission list to your stated single purpose — a mismatch fails.
- **Remotely hosted code.** Loading executable script from a server, or evaluating strings, is banned and detected. Bundle everything, including any model or config you might have been tempted to fetch as JS.
- **Secrets in the bundle.** Everything you ship is readable by anyone who unzips it. No API keys, no service credentials. If a third-party API needs a key, proxy it through your own backend and rate-limit per license.
- **CSS collisions in both directions.** Without a shadow root the host page restyles your UI and your reset destroys theirs. Mount into a shadow root from the first commit; retrofitting it is a rewrite.
- **Isolated-world confusion.** Content scripts share the DOM but not the page's JavaScript. Reading a page's framework state requires an injected page-world script and `postMessage` — plan for it or drop the feature.
- **Store review as an afterthought.** Reviews range from same-day to multiple weeks, and any build touching broad permissions or user data draws the slow path. Safari additionally requires a native wrapper project and a paid Apple developer account. Verify current queue times before promising a launch date, and never schedule a marketing push against an unapproved build.
- **The one-store dependency.** A listing can be suspended without warning and you cannot roll back a published version — you can only publish a higher one. Keep a self-hosted enterprise build path and collect emails outside the store.
- **Silent updates that are not silent.** Updates install automatically, but adding a *new required* permission disables the extension until the user re-approves. Add permissions as optional, or accept the reactivation cliff.
- **Testing only the source tree.** Bundling changes behavior — manifest paths, content-script world, CSP. Test the packaged zip.

## Skills for the build phase

Per `knowledge/skills-registry.md`, and every one degrades gracefully — if a skill is absent, fall back to this knowledge base and note it in one line.

- `frontend-design` and `ui-ux-pro-max` — the popup and overlay are tiny surfaces where design quality is immediately visible.
- `emil-design-eng` — for the overlay's enter/exit behavior; injected UI that pops in abruptly reads as malware.
- `playwright-cli` — the E2E harness in step 13; it can load an unpacked extension in a persistent browser context.
- `/humanizalo` — store listing copy, which is marketing text read by a human reviewer.

## See also

- `knowledge/runtime-tracks/ts-node.md` — the pinned bundler, type definitions, and test runner for the extension itself.
- `knowledge/capabilities/state-management.md` — storage-backed state for a context that gets destroyed constantly.
- `knowledge/capabilities/deployment.md` — packaging, signing, and staged rollout instead of a web deploy.
- `knowledge/shapes/api-backend.md` — compose with this when the extension has a server; it is a separate deliverable with its own track.
- `knowledge/shapes/desktop-app.md` — when the requirement outgrows the browser sandbox.
- `knowledge/stack-compatibility.md` — check before pairing a bundler or UI framework with the extension platform.
