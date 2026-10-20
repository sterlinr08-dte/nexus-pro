# Shape: Desktop App

> A signed, self-updating application that installs on macOS, Windows, or Linux, owns its local data,
> and can touch the filesystem, the menu bar, and OS-level permissions.

Last verified: 2026-07-27

## Is this your project?

**Yes if:**
- The user says "installable", "runs offline", "menu bar app", "tray app", "native", ".dmg/.exe".
- It needs the local filesystem, local processes, hardware (mic, camera, screen capture), or a
  system-wide hotkey — things a browser tab cannot do or re-prompts for every session.
- Data lives on the user's machine by default; sync, if any, is an add-on rather than the substrate.
- It must keep working with no network, and distribution is a download page or app store, not a URL.

**No if:**
- It only reads or modifies pages the user is already on → `knowledge/shapes/browser-extension.md`.
- No GUI; it is driven from a terminal or wired into an agent → `knowledge/shapes/cli-library-mcp.md`.
- Everything is server-owned and a browser tab is fine → `knowledge/shapes/saas-webapp.md`.
- The primary target is a phone or tablet → `knowledge/shapes/mobile-app.md`.
- The window is thin chrome around a model loop that is the real work → `knowledge/shapes/agent-app.md`.

## Default runtime track

**TypeScript/Node** — see `knowledge/runtime-tracks/ts-node.md`. The UI is a web frontend rendered in
a webview; the track governs that frontend, the build tooling, and any Node sidecar.

**Shell framework: pick it in the runtime track, not here.** The choice is between a shell that renders
in the OS-provided webview (small installer, low idle memory, a compiled native shell you write a
little of) and one that bundles its own browser engine (one guaranteed engine everywhere, mature native
modules, larger artifact — you now patch a browser per app). The current options, their tradeoffs, and
the pinned versions live in `knowledge/runtime-tracks/ts-node.md`; the decision belongs in the
blueprint's decision log with its "would reverse if" trigger. Everything below this line holds either
way — that is deliberate, so a framework shift never edits this file.

Alternatives: `knowledge/runtime-tracks/go.md` when the app is mostly a Go daemon with a thin window;
`knowledge/runtime-tracks/python.md` when a Python compute or ML core ships as an IPC sidecar.

## Core capabilities

| Capability | Why this shape needs it | File |
|---|---|---|
| Frontend architecture | The UI is a web app in a webview; routing and layout still apply | `knowledge/capabilities/frontend-architecture.md` |
| Database | The local embedded store is the source of truth, not a cache | `knowledge/capabilities/database.md` |
| State management | Long-lived process, background jobs, windows outliving a page load | `knowledge/capabilities/state-management.md` |
| Observability | You cannot read the user's console — crash reports are the only signal | `knowledge/capabilities/observability.md` |
| Deployment | Signing, notarization, update feeds, per-OS artifacts | `knowledge/capabilities/deployment.md` |
| Testing | Native shell, UI, and updater each fail differently | `knowledge/capabilities/testing.md` |
| Accessibility | Webview a11y is not free; native menus need keyboard parity | `knowledge/capabilities/accessibility.md` |
| Sync and collab | Only if data must follow the user across machines | `knowledge/capabilities/sync-and-collab.md` |
| Auth · Payments rails | Only with accounts, licensing, or direct-sold subscriptions | `knowledge/capabilities/auth.md` · `knowledge/capabilities/payments-rails.md` |

## Data model

Local-first: the app owns its storage and works with the network unplugged.

| Entity | Purpose | Notes |
|---|---|---|
| `settings` | Preferences, window geometry, theme | Small key/value; never secrets |
| domain entities | Whatever the app edits | Locally generated stable UUIDs, never autoincrement — remote IDs cannot be assumed |
| `revisions` | Undo history, autosave snapshots | Cap by count and age or the store grows unbounded |
| `sync_queue` | Local mutations awaiting upload | Only with sync; every entry idempotent and retryable |
| `migrations` | Applied schema versions | Forward-only; must open a store written by an older build |
| `crash_reports` | Queued while offline | Flushed next launch, gated by consent |
| secrets | Tokens, license keys | OS keychain (Keychain / Credential Manager / Secret Service) — never the DB or webview storage |

Resolve the OS app-data directory at runtime. Never hardcode a home path, never write beside the
executable — that location is read-only or wiped by updates.

## Directory structure

Boundaries, not filenames — the shell framework decides the extensions and its own config file names.

```
src/                # frontend (webview): components, routes, stores
src-native/         # the compiled shell, in whatever language it uses
  commands/         # every function the frontend may invoke, explicitly registered
  updater/          # update check + install trigger
  chrome/           # native menus, tray item, global shortcuts
  permissions/      # allowlists: which paths, which APIs, which origins
src-shared/         # IPC types, generated from the command registry, not handwritten
migrations/         # ordered, forward-only schema steps
resources/          # per-OS icons, entitlements, installer assets
build/              # packaging config (dmg, msi/nsis, deb/rpm/AppImage)
.github/workflows/  # macOS + Windows + Linux matrix, signing, release upload
tests/e2e/          # driven against the packaged binary, not the dev server
```

## Build order

1. **Shell scaffold** — window boots the frontend with hot reload. · *Done when:* `dev` opens a window and a component edit repaints without restart.
2. **IPC boundary** — each native call is one registered, typed command; types generated to `src-shared/`. · *Done when:* removing a registration breaks the frontend typecheck instead of failing silently at runtime.
3. **Local store + migrations** — embedded DB, schema, forward-only runner. · *Done when:* the current build opens a store file written by the previous schema with data intact.
4. **App chrome** — native menu bar, tray item, window-state persistence, global shortcut. · *Done when:* relaunch restores window size and position and the shortcut fires while another app has focus.
5. **Filesystem + allowlist** — open/save dialogs, drag-and-drop, explicit path allowlist. · *Done when:* a command given a path outside the allowlist returns a denial error and logs the attempt.
6. **OS permission flows** — request mic/camera/screen/notifications at first use, with an in-app explanation before the OS prompt. · *Done when:* denying the prompt shows a recovery screen pointing at System Settings, not a blank pane or a crash.
7. **Core feature loop** — the thing the app is for, offline end to end. · *Done when:* with networking disabled, an automated run creates, edits, saves, quits, and relaunches, then asserts the reopened record byte-matches what was saved — and the process made zero outbound connection attempts, asserted from the log.
8. **Work off the UI thread** — long tasks in the native side or a worker, with progress and cancel. · *Done when:* an automated run drives the longest task while sampling the renderer's event loop, and asserts no blocking task exceeds 50ms and progress events arrive at least once a second throughout; issuing cancel transitions the job to `cancelled` within 1s, asserted by the same test.
9. **Crash reporting + logs** — native crashes and frontend errors reach a collector; rolling local log the user can export. · *Done when:* a deliberate debug crash produces a symbolicated report carrying app version and OS.
10. **Code signing per OS** — macOS Developer ID with hardened runtime and entitlements; Windows via a cloud signing service or an OV/EV certificate whose key lives on an HSM or hardware token (CA rules forbid a bare key file); Linux unsigned but checksummed. · *Done when:* in CI, `codesign --verify --deep --strict` and `spctl --assess --type execute` exit 0 on the macOS artifact, `signtool verify /pa` exits 0 on the Windows artifact, and a checksum manifest covering every published Linux artifact is generated and verified. Certificate procurement and real-world SmartScreen reputation are launch-checklist items below, not build gates.
11. **Notarization** — submit the macOS build, wait for the ticket, staple it into the artifact. · *Done when:* the submit-and-wait command returns `Accepted`, `stapler validate` exits 0 against the stapled artifact, and `spctl --assess --type install` exits 0 on a CI runner with networking disabled — proving the ticket travels inside the file.
12. **Auto-update** — signed manifest, staged rollout, restart-to-install prompt; the signing key lives in CI secrets with an offline backup, because losing it strands every installed copy. · *Done when:* an older install detects, downloads, verifies, and relaunches into the new version, and a manifest signed with the wrong key is rejected.
13. **Release pipeline** — one tag builds all three OSes, signs, notarizes, publishes artifacts plus the update manifest. · *Done when:* a single tag push yields macOS (Apple Silicon + Intel), Windows, and Linux installers and the update feed resolves to them.
14. **First run and uninstall** — onboarding, telemetry consent defaulted off, clean removal. · *Done when:* uninstalling clears app-data and keychain entries and a reinstall behaves like a first run.

## Post-build launch checklist

None of these can gate an autonomous build — each waits on a certificate authority, a store queue, or a machine you have to walk over to. They still get written into the blueprint, with an owner and a start date, because two of them take weeks.

| Item | Why it cannot be a build gate | Start it |
|---|---|---|
| Apple Developer enrollment; Windows OV/EV certificate issuance | Identity verification by a third party, days to weeks | Day one — before step 1 |
| Download the published artifact on a clean machine per OS and launch it | Requires real machines and real Gatekeeper/SmartScreen state | After step 13 |
| SmartScreen reputation accrual on a fresh Windows certificate | Accrues with download volume; nothing you can assert | Expect a noisy first few weeks |
| Store listing submission and review, if you chose a store over direct download | External review queue, and it changes the architecture — see the pitfall | Decide before step 12 |
| Offline backup of the update-signing key, stored away from CI | An operational act, not a test | With step 12 |

## Pitfalls

- **Three webview engines, not one.** A shell that borrows the OS webview renders on a different engine per platform, and the Linux one lags the other two badly. Test all three before you rely on a CSS or JS feature — this, not language preference, is the real argument for a shell that bundles its own engine.
- **Signing is procurement, not code.** Apple enrollment and Windows certificate validation take days to weeks and involve identity checks. Start day one; teams discover this the week they meant to launch.
- **Notarization is separate from signing.** A signed-but-unnotarized macOS app is still blocked, and the failure is worse offline.
- **Fresh Windows certificates carry no SmartScreen reputation** and antivirus flags new unsigned binaries. Expect a noisy first few weeks of downloads.
- **Auto-update is load-bearing.** Without it every bug is permanent for users who never re-download. Ship it before launch; test interrupted downloads and downgrades.
- **Per-machine Windows installers cannot self-update** without elevation. Choose per-user install for silent updates.
- **Linux packaging fragments.** Pick one primary format and treat the rest as best effort; do not promise deb, rpm, AppImage, Flatpak, and Snap.
- **Never load remote content into the app webview** while native commands are exposed — that is remote code execution with filesystem rights. Strict CSP, bundle everything, open links in the system browser.
- **macOS permission prompts fire once.** A user who denies is never re-asked, so detect the denied state and route them to System Settings.
- **App stores change the architecture.** Mac App Store means sandboxing and no self-updating; decide store-vs-direct before designing updates and billing. And you cannot sign macOS builds off macOS — stand up the CI matrix early, not at release.

## Skills for the build phase

See `knowledge/skills-registry.md` for the authoritative list. If one is unavailable, fall back to this
knowledge base plus `WebSearch`/`WebFetch`, note the substitution in one line, and keep going.

- `ui-ux-pro-max` — desktop needs density, keyboard affordances, and a real light/dark system; set the visual system before component work.
- `emil-design-eng` — window, panel, and tray motion; desktop users notice jank the web forgives.
- `frontend-design` — build-phase UI inside the webview.
- `playwright-cli` — drive the packaged binary end to end, not just the dev server.
- `/last30days` — current desktop-shell tradeoffs and OS signing requirements, both of which move often. Run it before the runtime track's framework choice is locked, not after.

## See also

- `knowledge/runtime-tracks/ts-node.md` — pinned frontend and tooling versions, **and the shell-framework comparison and choice**
- `knowledge/runtime-tracks/go.md` — when the app is a Go daemon with a thin window
- `knowledge/capabilities/deployment.md` — signing, notarization, release pipelines
- `knowledge/capabilities/database.md` — embedded local store and migration strategy
- `knowledge/capabilities/observability.md` — crash reporting when you cannot see the machine
- `knowledge/shapes/browser-extension.md` — when the surface is the user's existing web pages
- `knowledge/shapes/cli-library-mcp.md` — when there is no GUI at all
- `knowledge/shapes/mobile-app.md` — the same signing, store, and release-train problems on a phone; read it if "desktop and mobile" both appear in the brief
- `knowledge/stack-compatibility.md` — known-bad combinations across tracks and shapes
