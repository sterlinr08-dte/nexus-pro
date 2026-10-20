# Runtime Track: TypeScript / Node.js

> The default track. Choose it unless the project has a concrete reason to leave the JS ecosystem.

**Last verified: 2026-10-17** — every version below was checked against the npm registry
(`https://registry.npmjs.org/-/package/<name>/dist-tags`) and, where noted, against the vendor's own
docs on this date. When refreshing this file, re-verify and update this line.

## When to choose this track

- **One language across the whole stack.** Server, client, build scripts, and tests share types.
  For a small team this is the single biggest velocity multiplier available.
- **The UI is the product.** Anything with a real frontend starts here. React's ecosystem depth is
  not close to matched elsewhere.
- **You want to deploy in minutes, not days.** Vercel, Cloudflare, Netlify, Fly, and Railway all
  treat Node as a first-class target with zero-config adapters.
- **AI/LLM work.** The Vercel AI SDK and the Anthropic SDK are both first-class here, and streaming
  UI is a solved problem.

Leave this track when: you need heavy numeric/ML work in-process (`python.md`), you need a single
static binary or sub-10ms cold starts at high concurrency (`go.md`), you want batteries-included
server-rendered CRUD with a mature admin (`rails-laravel.md`), or you are shipping to App Store /
Play Store (`mobile-native.md`).

## Pinned versions

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Runtime | Node.js | **24.22.0** (LTS "Krypton") | LTS — Active support ends 2026-10-20, Maintenance until 2028-04-30. 22.23.3 "Jod" for maintenance-only projects. 26.12.0 is Current and becomes Active LTS on 2026-10-28 — do not ship on it before then; re-verify this row after that date. |
| Package manager | pnpm | **12.14.0** | Strict node_modules catches phantom dependencies. Workspaces for monorepos. pnpm 12 fails on unrecognized `pnpm-workspace.yaml` keys when the project pins pnpm (`ERR_PNPM_UNRECOGNIZED_WORKSPACE_SETTINGS`) and removed `--frozen-lockfile false` (use `--no-frozen-lockfile`). |
| Language | TypeScript | **6.0.3** (default) / **7.0.2** (opt-in) | 7.0 is the Go-native rewrite, GA 2026-07-08, 8–12x faster. It has no stable JS compiler API yet — see Gotchas. Pin `~6.0.3` explicitly. |
| React framework | Next.js | **16.4.2** | App Router. Turbopack default. React peer range: `^18.2.0 \|\| 19.0.0-rc-de68d2f4-20241204 \|\| ^19.0.0`. Requires Node `>=20.9.0`. |
| UI library | React / React DOM | **19.3.1** | |
| React types | `@types/react` / `@types/react-dom` | **19.3.0** / **19.3.0** | |
| Content/static framework | Astro | **7.4.0** | Marketing, docs, blogs. Requires Node `>=22.22.0`. Strict HTML validation — see Gotchas. |
| SPA / non-Next bundler | Vite | **8.3.4** | Requires Node `^20.19.0 \|\| >=22.12.0`. |
| Vite React plugin | `@vitejs/plugin-react` | **6.1.2** | Exports `reactCompilerPreset`. Peer `vite: ^8.0.0`. Do not use `@vitejs/plugin-react-oxc`: its README marks it deprecated and its peer range (`^6.3.0 \|\| ^7.0.0`) rejects Vite 8. |
| React Compiler | `babel-plugin-react-compiler` | **1.0.0** | Optional. Next enables it via `babel-plugin-react-compiler` as an optional peer. Still npm `latest`; last stable release 2025-10-07. |
| Typed router / full-stack SPA | `@tanstack/react-router` / `@tanstack/react-start` | **1.170.45** / **1.169.3** | Both on the 1.x line. Start is the full-stack option when you want Vite instead of Next; it requires Node `>=22.12.0` and Vite `>=8.0.0`. |
| Styling | Tailwind CSS | **4.3.3** | Plus `@tailwindcss/vite`, `@tailwindcss/postcss`, or `@tailwindcss/turbopack` — all **4.3.3**. `create-next-app` 16.4 scaffolds the Turbopack loader. CSS-first config — see Gotchas. |
| Component source | `shadcn` CLI | **4.22.0** | Copies components into your repo. Not a dependency. |
| ORM (default) | `drizzle-orm` / `drizzle-kit` | **0.45.4** / **0.31.11** | The stable line is 0.x. v1 is at `1.0.0-rc.4` — see Gotchas. |
| ORM (alternative) | `prisma` / `@prisma/client` | **7.10.1** / **7.10.1** | Pick when you want a generated client and a GUI (Studio) over SQL-shaped queries. **npm `latest` for `prisma` is `8.0.0-rc.23` — an RC — while `@prisma/client` `latest` is 7.10.1. Pin both exactly; never `pnpm add prisma` bare.** |
| Postgres drivers | `postgres` / `pg` / `@neondatabase/serverless` | **3.4.9** / **8.23.1** / **1.2.0** | Use the Neon driver only on Neon over HTTP/WS. |
| Server data | `@tanstack/react-query` | **5.104.3** | Devtools: `@tanstack/react-query-devtools` **5.104.3**. |
| Validation | `zod` | **4.6.7** | v4 is the current major. Schema-first everywhere: env, forms, API boundaries. |
| Forms | `react-hook-form` | **7.90.0** | 8.x is still beta. |
| Standalone HTTP server | `hono` | **4.13.13** | Plus `@hono/node-server` **2.1.5**, `@hono/zod-validator` **0.9.1**. Runs on Node, Bun, Workers, Deno. `hono@5` exists only as `5.0.0-rc.1` on the `next` tag — never pin `^5`. |
| Auth (self-hosted) | `better-auth` | **1.7.10** | 1.7 is GA. Account rows stay keyed on `(providerId, accountId)` as in 1.6 (the `issuer` column from 1.7.0–1.7.2 was removed in 1.7.3; databases that ran those versions follow the 1.7 upgrade guide). Joins are configured at `advanced.database.joins`. 1.8 is beta. |
| Auth (hosted) | `@clerk/nextjs` | **7.9.17** | |
| BaaS | `@supabase/supabase-js` | **2.118.0** | Requires Node `>=22.0.0`. |
| Payments | `stripe` | **23.0.0** | Pins API version `2026-09-30.endive`. |
| AI SDK | `ai` / `@ai-sdk/react` | **7.0.143** / **4.0.147** | Different majors, one release train: `@ai-sdk/react` lists `ai` as an exact dependency (4.0.147 → `ai@7.0.143`). Upgrade them as a pair. |
| Anthropic SDK | `@anthropic-ai/sdk` | **0.135.0** | Never hand-write model IDs — invoke the bundled `claude-api` skill. |
| Lint + format | `@biomejs/biome` | **2.5.15** | One tool, one config, Rust-fast. Replaces ESLint + Prettier. ESLint 10.13.0 only if a required plugin has no Biome equivalent. |
| Unit tests | `vitest` | **5.0.5** | Requires Node `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0` and Vite `>=6.4`; peers `@types/node` `^22.0.0 \|\| >=24.0.0`. |
| E2E tests | `@playwright/test` | **1.64.1** | |
| Monorepo | `turbo` | **2.11.9** | Only when you actually have 2+ deployable apps. |
| Node TS runner | `tsx` | **4.23.15** | For scripts and seeds. Node's own type stripping covers most cases on 24.x. |
| Cloudflare CLI | `wrangler` | **4.151.1** | Requires Node `>=22.0.0`. |

## Setup

The full-stack block was executed end to end on a clean machine at the versions pinned above; its
comments mark every place where the obvious command fails, with the full reproduction of each in
Gotchas. Copy those comments into step 1 of a blueprint — they are the difference between a first
verify command that exits 0 and one that does not.

```bash
# Pin the toolchain first — this is what makes a build reproducible.
# Bare `corepack enable` exits 1 with EACCES wherever the global bin dir is not writable
# (root-installed Node, most CI images). Prefer an explicit writable directory:
corepack enable --install-directory "$HOME/.local/bin"   # then ensure it is on PATH
corepack prepare pnpm@12.14.0 --activate
node -v   # expect v24.x

# --- Full-stack app (default) ---
# `--eslint=false` does NOT disable ESLint — the flag takes no value and is silently ignored.
# `--biome` is the flag that gives a Biome-only project.
# Verified 2026-10-17 (create-next-app 16.4.2 + pnpm 12.14.0): the scaffold's install completes and
# writes `allowBuilds: { sharp: false, unrs-resolver: false }`. Different flags or later deps can
# still hit ERR_PNPM_IGNORED_BUILDS — see Gotchas.
pnpm create next-app@latest my-app --ts --app --tailwind --biome --src-dir --use-pnpm
cd my-app
pnpm approve-builds --all           # approves any PENDING build; leaves explicit `false` entries alone
pnpm install --frozen-lockfile      # this is the real gate

# The scaffold pins biome 2.4.2, typescript ^5 and @types/node ^20 — override all three to this track's pins
# (vitest 5 peers @types/node ^22 || >=24).
pnpm add -D typescript@~6.0.3 @biomejs/biome@2.5.15 @types/node@24 vitest@5 @playwright/test@1
pnpm add zod@4 @tanstack/react-query@5 drizzle-orm@0.45.4
pnpm add -D drizzle-kit@0.31.11
pnpm exec playwright install --with-deps   # tests fail hard without the browser binaries

# `--biome` already wrote biome.json (including "css": { "parser": { "tailwindDirectives": true } })
# and `biome init` refuses to overwrite it. EDIT it: bump "$schema" to .../2.5.15/schema.json and
# add "!**/*.svg" to files.includes — Biome 2.5.x fails lint/a11y/noSvgWithoutTitle on the five
# scaffolded public/*.svg files, and `--write` cannot fix that.
pnpm exec biome check --write .   # reconcile the scaffold's formatting with the config, once
# Bare `shadcn init` prompts for a component library and blocks an unattended run.
# Pass it explicitly — `-b, --base` takes base | radix | aria, and the CLI's own default
# preset is Base UI, so "we chose Radix" is not true unless you say so on the command line.
pnpm dlx shadcn@4 init --base radix --no-monorepo

# --- Content / marketing site ---
pnpm create astro@latest my-site -- --template minimal --typescript strict
cd my-site && pnpm add -D typescript@~6.0.3   # Astro tooling requires the 6.x line
pnpm astro add tailwind sitemap

# --- Standalone API (no UI) ---
pnpm create hono@latest my-api
cd my-api && pnpm add zod@4 drizzle-orm@0.45.4 && pnpm add -D drizzle-kit@0.31.11 tsx@4

# --- SPA / non-Next React ---
pnpm create vite@latest my-spa -- --template react-ts
cd my-spa && pnpm add -D @tailwindcss/vite@4.3.3
```

## Conventions

```
src/
  app/                  # Next.js App Router: routes, layouts, route handlers
    (marketing)/        # route groups for layout boundaries, not URL segments
    api/
  components/
    ui/                 # shadcn primitives — generated, edit freely, do not abstract early
    <feature>/          # feature-owned components
  lib/
    db/
      schema.ts         # Drizzle schema — the single source of truth for table shapes
      index.ts          # the exported db client
    auth.ts
    env.ts              # zod-parsed process.env, imported everywhere instead of process.env
  server/
    <feature>/          # server-only business logic; never imported from a "use client" file
proxy.ts                # NOT middleware.ts — see Gotchas
drizzle/                # generated SQL migrations, committed
```

- **Server-first.** A component is a Server Component until it needs state or an event handler.
  `"use client"` goes on the smallest leaf that needs it, never on a layout.
- **Validate at every boundary.** `zod` schema for env, for each route handler body, for each form.
  Infer types from the schema (`z.infer`), never declare them twice.
- **300 lines is the component ceiling.** Past that, split by responsibility, not by line count.
- **No barrel files** (`index.ts` re-export hubs). They defeat tree-shaking and slow down every
  bundler and type-checker in this table.
- **`type` over `interface`** unless you need declaration merging. Consistency beats theology.
- **ESM only.** `"type": "module"` in `package.json` for anything that is not a Next.js app.

### Module resolution — decided once, for every loader

**Write `.ts` relative specifiers. Set `allowImportingTsExtensions` and
`rewriteRelativeImportExtensions`. That is the whole convention.**

This is the one decision a blueprint on this track must not re-open, because getting it wrong
produces two hard stops one command apart, and the second error arrives in a different tool than
the mistake. A blueprint that mandates `.js` specifiers "because ESM requires them" is correct for
the *emitted build* and fatal for any plain script — Node strips types but resolves specifiers
**literally**, so `./lib.js` cannot find `lib.ts`.

Verified on this machine, Node 24 / TypeScript 6.0.3:

| Context | Command that exercises it | What happens |
|---|---|---|
| App source | the framework bundler | resolves either form |
| Test files | the test runner | resolves either form |
| **Standalone scripts** | `node scripts/check.ts` | `.js` → `ERR_MODULE_NOT_FOUND` · **`.ts` → runs** |
| **Build** | `tsc -p tsconfig.build.json` | `.ts` without the flag → **`TS5097`** · with both flags → **exit 0** |

With both flags set, `tsc` rewrites `./lib.ts` to `./lib.js` on emit, so the built output runs on
plain Node with no loader. One convention, four contexts, nothing to reconcile later:

```jsonc
// tsconfig.json — the compiler options that make it work
{
  "compilerOptions": {
    "module": "nodenext",
    "allowImportingTsExtensions": true,      // lets source say ./lib.ts
    "rewriteRelativeImportExtensions": true  // emits ./lib.js so dist/ runs bare
  }
}
```

**Do not** solve this per-script with a loader hook, and do not let one context use `.js` while
another uses `.ts`. If a blueprint on this track states any import convention at all, it fills the
resolution convention matrix in its §19.6 with these four rows and this answer.

## Testing / Lint / Build commands

| Task | Command |
|---|---|
| Dev server | `pnpm dev` |
| Type check | `pnpm exec tsc --noEmit` |
| Lint | `pnpm exec biome check .` |
| Lint + autofix | `pnpm exec biome check --write .` |
| Unit tests | `pnpm exec vitest run` |
| Unit tests (watch) | `pnpm exec vitest` |
| Coverage | `pnpm exec vitest run --coverage` |
| E2E tests | `pnpm exec playwright test` |
| Install E2E browsers | `pnpm exec playwright install --with-deps` |
| Production build | `pnpm build` |
| Build with webpack (fallback) | `pnpm exec next build --webpack` — first add `@tailwindcss/postcss` + `postcss.config.mjs`, see Gotchas |
| Generate migration | `pnpm exec drizzle-kit generate` |
| Apply migration | `pnpm exec drizzle-kit migrate` |
| Inspect DB | `pnpm exec drizzle-kit studio` |
| Full CI gate | `pnpm exec biome ci . && pnpm exec tsc --noEmit && pnpm exec vitest run && pnpm build` |

## Deployment notes

- **Next.js → Vercel.** Zero-config, and every feature in the table above ships there first. Self-host
  with `output: "standalone"` + a Node 24 slim image when you must.
- **Astro → Cloudflare Pages or Netlify.** Static output by default; add an adapter only when you
  actually need SSR.
- **Hono → Cloudflare Workers** (`wrangler deploy`) or a Node container. Hono's portability is the
  reason to pick it; do not import Node built-ins in shared handler code or you lose it.
- **Database.** Neon or Supabase for serverless Postgres; both give branch-per-PR databases, which
  is worth more than any performance difference at this stage.
- **Pin the runtime in CI.** `.nvmrc` with `24` and `packageManager: "pnpm@12.14.0"` in
  `package.json`. Unpinned CI is the most common source of "works on my machine".
- Run migrations as an explicit deploy step, never on app boot. Concurrent instances will race.

## Gotchas

Re-verified 2026-10-17 on a clean scaffold (create-next-app 16.4.2, pnpm 12.14.0, Biome 2.5.15,
TypeScript 6.0.3/7.0.2): the pnpm, Biome-parser, Biome-SVG, TS 7 and webpack-Tailwind items below.
The corepack and next/font items were reproduced on 2026-07-27 and not re-run. The cron item is quoted
from the vendor's docs. Everything after that is documentation- or changelog-sourced.

- **pnpm 11+ aborts install when a dependency's build script has not been reviewed: `ERR_PNPM_IGNORED_BUILDS`, exit 1.**
  Re-verified on pnpm 12.14.0. The fresh create-next-app 16.4.2 scaffold no longer triggers it: sharp
  0.35 ships without an install script, and the scaffolder writes explicit `allowBuilds:` /
  `  sharp: false` / `  unrs-resolver: false`, so `pnpm install --frozen-lockfile` exits 0 untouched.
  It still fires the moment you add a dependency with an install script. Three details, all verified:
  1. **The key is `allowBuilds`; the pnpm 10 key `onlyBuiltDependencies` is silently ignored** — on
     pnpm 12.14.0 install still exits 1 with the identical error and no warning.
  2. **`pnpm approve-builds --all`** is non-interactive, runs the pending scripts, and writes
     `<pkg>: true`. It does **not** flip entries already set to `false` — edit those by hand if you
     need the script (e.g. `sharp: true`).
  3. **pnpm 12 rejects unknown `pnpm-workspace.yaml` keys** with
     `ERR_PNPM_UNRECOGNIZED_WORKSPACE_SETTINGS` when the project pins pnpm; elsewhere it only warns.
  Read the package list off the error rather than hardcoding it. A `dangerouslyAllowAllBuilds: true`
  escape hatch also exists; it discards the supply-chain gate, so never put it in a blueprint.

- **`create-next-app --eslint=false` is a no-op — the flag does not take a value.** The scaffolder
  does not parse `=false`; it treats the option as *unprovided* and applies the default, printing
  `Using defaults for unprovided options: --eslint  ESLint (use --biome for Biome, --no-eslint for
  None)`. Verified: `eslint` and `eslint-config-next` install anyway and `"lint": "eslint"` lands in
  `package.json` — silently contradicting a Biome-only decision. Use **`--biome`** (scaffolds
  `biome.json` and `"lint": "biome check"`, no ESLint anywhere) or `--no-eslint` for neither. Two
  follow-ons that a blueprint's step 1 must handle explicitly, both verified on the `--biome`
  scaffold: it pins `@biomejs/biome@2.4.2`, `typescript@^5` (resolved 5.9.3) and `@types/node@^20`,
  **not** this file's `2.5.15`, `~6.0.3` and `24` — upgrade all three in the next command; and `biome init` refuses to touch an
  existing `biome.json` ("It seems that a configuration file already exists", file left byte-identical),
  so the scaffolded config must be **edited**, not regenerated. Its defaults are
  `indentStyle: "space"`, `indentWidth: 2` — `biome init` would have written tabs, so any hand-written
  config or checked-in JSON in the blueprint must match whichever one actually ends up on disk or the
  project fails its own lint gate on files nobody wrote.

- **Biome cannot parse Tailwind v4's `@theme` unless its CSS parser option is on.** The key is exactly
  `{ "css": { "parser": { "tailwindDirectives": true } } }` — Biome 2.5.15's published
  `configuration_schema.json` accepts only `allowWrongLineComments`, `cssModules`, `tailwindDirectives`
  under `css.parser`. create-next-app 16.4's `--tailwind --biome` scaffold already writes it; any
  hand-written biome.json in a blueprint must carry it too. Cross-referenced as a role-level row in
  `knowledge/stack-compatibility.md`.

- **Biome 2.5.x fails an untouched Next 16.4 scaffold on its own SVGs.** After upgrading from the
  scaffold's 2.4.2 (which passes), `biome check` exits 1 with `lint/a11y/noSvgWithoutTitle` on
  `public/{file,globe,next,vercel,window}.svg`; `--write` cannot fix it. Add `"!**/*.svg"` to
  `files.includes` (verified: exit 0 after one `biome check --write .`) or delete the unused SVGs.
  2.5.x also prints an info-level deprecation for `linter.rules.recommended` ("use preset instead").

- **`corepack enable` fails with EACCES wherever the global bin directory is not writable.** Verified:
  `Internal Error: EACCES: permission denied, symlink '../lib/node_modules/corepack/dist/pnpm.js' ->
  '/usr/local/bin/pnpm'`, exit 1. This is the *first* command in the Setup block above, so it takes
  the whole build down on any machine where Node was installed as root, and on most CI images.
  `corepack enable --install-directory <writable-dir>` exits 0 and writes `pnpm`, `pnpx`, `yarn`,
  `yarnpkg` shims there; put that directory on `PATH`. A blueprint that lists `corepack enable` as a
  prerequisite must carry the fallback next to it, not leave the builder to find it.

- **`next/font` emits fallback `@font-face` rules with no `font-display`, and no option changes that.**
  A production build of an untouched `create-next-app` app has 13 `@font-face` rules in its CSS; 2
  have no `font-display`, and both are the metric-override fallbacks next/font generates —
  `font-family: Geist Fallback` / `Geist Mono Fallback`, `src: local(Arial)` plus
  `ascent-override` / `descent-override` / `size-adjust`. Verified that passing `display: "swap"` to
  the font loader does not add it: the count stays at 2 after a clean rebuild. `display` governs the
  real font faces only. Consequence for blueprints: an acceptance criterion of the form *"every
  shipped `@font-face` SHALL declare a font-display strategy"* is **unsatisfiable** while using
  next/font, and a builder will burn a step discovering that. Scope the criterion to the faces you
  control — "every `@font-face` that loads a font file over the network", or assert `display: "swap"`
  at the loader call site instead of over the built CSS.

- **Vercel Cron issues `GET`, so a `POST`-only scheduled endpoint never fires — silently.** Vercel's
  docs: *"To trigger a cron job, Vercel makes an HTTP GET request to your project's production
  deployment URL, using the `path` provided in your project's `vercel.json`."* A route handler that
  exports only `POST` returns 405 to every invocation, the schedule looks healthy in the dashboard,
  and the only symptom is that the work never happens. Related facts from the same docs, all of which
  a blueprint gets wrong by default: a cron path that does not exist returns 404 and **still counts as
  executed**; cron requests do **not** follow redirects, and a 3xx is treated as final; delivery is
  best effort and can both skip and duplicate a run, so handlers must be idempotent and
  reconciliation-based ("set status to active", never "increment by 10"); a long job can overlap its
  own next invocation, so take a lock; failures are never retried. Secure the endpoint with a
  `CRON_SECRET` env var — Vercel sends it as `Authorization: Bearer <secret>` — and compare it inside
  the `GET` handler. Every request also carries `user-agent: vercel-cron/1.0` and an
  `x-vercel-cron-schedule` header with the triggering expression, which is how one path serves two
  schedules. `vercel dev` / `next dev` do not run crons; hit the URL directly in local testing.
  If the job genuinely needs a request body, keep the `GET` handler as the trigger and have it call
  the real work — do not change the platform's method.

- **`middleware.ts` is gone — the file is now `proxy.ts`.** Renamed and deprecated in Next.js 16.0.0.
  The exported function is `proxy`, not `middleware`. Migrate with
  `npx @next/codemod@canary middleware-to-proxy .`. Proxy now defaults to the **Node.js runtime**, and
  setting the `runtime` route-segment config inside a proxy file throws.
  Related trap: Server Functions are POSTs to the route that uses them, so a matcher that excludes a
  path silently skips auth for its Server Functions. Authorize inside each Server Function.
- **`experimental.ppr` and `experimental.dynamicIO` no longer exist.** Next.js 16.0.0 folded `ppr`,
  `useCache`, and `dynamicIO` into a single top-level `cacheComponents: true` flag, paired with the
  `"use cache"` directive. `experimental_ppr` as a route-segment export was removed outright. Under
  `cacheComponents`, PPR is the default App Router behavior and navigation preserves state via React
  `<Activity>` — components stay mounted instead of unmounting.
- **Turbopack is the default for `next dev` AND `next build`** as of 16.0.0. Consequences: `webpack()`
  config in `next.config.js` is ignored, webpack *plugins* are unsupported (loaders are), Yarn PnP is
  unsupported, and `sassOptions.functions` does not work. Opt out per-command with `--webpack`.
  On platforms with no native bindings (FreeBSD, OpenBSD) `--webpack` is mandatory.
- **Drizzle v1 is a release candidate. Never pin `^1`.** The npm `latest` tag is `drizzle-orm@0.45.4`;
  `1.0.0-rc.4` sits behind the `rc` tag (and `1.0.0-beta.22` behind `beta`) with dozens of ad-hoc
  prerelease tags around it. Pin the exact 0.x pair (`drizzle-orm@0.45.4`, `drizzle-kit@0.31.11`) — a
  caret on a 0.x package still moves the minor, and Drizzle ships breaking changes in minors.
- **Tailwind v4 is configured in CSS, not JavaScript.** `@import "tailwindcss";` then `@theme { ... }`
  in your global stylesheet. If you see a `tailwind.config.js` in a v4 project it is a v3 leftover
  being ignored — delete it and port the tokens into `@theme`. Wire it with `@tailwindcss/vite` (Vite),
  `@tailwindcss/turbopack` (what create-next-app 16.4 scaffolds, via `turbopack.rules` in
  next.config.ts) or `@tailwindcss/postcss`, never the old `tailwindcss` PostCSS plugin entry.
  **The Turbopack loader does nothing under `next build --webpack`:** verified, that build exits 0 and
  ships CSS with zero Tailwind utilities. If a blueprint needs the webpack fallback, it must add
  `@tailwindcss/postcss` + `postcss.config.mjs` (not re-tested here). The same scaffold also turns on
  `cacheComponents: true` and `partialPrefetching: true` by default.
- **TypeScript 7 is GA but will break framework tooling.** `pnpm add -D typescript` installs **7.0.2**,
  the Go-native rewrite. It has no stable programmatic compiler API, so Vue, Svelte, Astro, MDX, and
  Angular template tooling must stay on the **6.0.x** line — Microsoft says so explicitly in the 7.0
  announcement. It also drops the `tsserver` binary (`bin` is `tsc` only), removes ES5/AMD/UMD targets,
  and defaults `strict: true` and `types: []`. **Next.js no longer refuses TS 7:** since 16.3.0
  `experimental.useTypeScriptCli` defaults to `true` (16.2.x: `false`), and `next build` on 16.4.2 with
  `typescript@7.0.2` exits 0 with no flag. Default to `typescript@~6.0.3` for the whole track anyway —
  Astro/MDX/Vue/Svelte tooling and the Expo template stay on 6.x; adopt 7 deliberately, per project,
  for the 8–12x speedup.
- **Do not claim Next.js requires a specific React minor.** Its actual peer range is
  `"react": "^18.2.0 || 19.0.0-rc-de68d2f4-20241204 || ^19.0.0"`. React 18 apps upgrade to Next 16
  without touching React.
- **The React Compiler Vite export is `reactCompilerPreset`, not a "plugin".** From
  `@vitejs/plugin-react` 6.x: `import react, { reactCompilerPreset } from '@vitejs/plugin-react'`, then
  `plugins: [react(), babel({ presets: [reactCompilerPreset()] })]`. It needs `@rolldown/plugin-babel`,
  `@babel/core`, and `babel-plugin-react-compiler` as peers. There is no
  `preconfiguredReactCompilerPlugin` export in any current version — the README uses the word
  "preconfigured" only to describe the preset's default file filter.
- **Astro 7 has a Rust compiler that no longer forgives bad markup.** Unclosed non-void tags are now
  errors, and semantically invalid HTML is passed through as-is instead of being silently reordered.
  Expect a v6 → v7 migration to surface markup bugs that were previously invisible. It also requires
  Node `>=22.22.0`.
- **TanStack Start is on the 1.x line** (currently 1.169.3) and moves fast. Pin the exact version and
  upgrade deliberately; do not describe any single release as the long-awaited stable milestone.
- **The AI SDK's core and React packages are on different majors** (`ai` 7.x, `@ai-sdk/react` 4.x) but
  ship as one train: `@ai-sdk/react@4.0.147` depends on `ai` at exactly `7.0.143`. Bump them together.

## Shapes that use this track

Default track:

- `knowledge/shapes/saas-webapp.md`
- `knowledge/shapes/marketing-site.md`
- `knowledge/shapes/internal-tool.md`
- `knowledge/shapes/content-community-platform.md`
- `knowledge/shapes/ecommerce-storefront.md`
- `knowledge/shapes/agent-app.md`
- `knowledge/shapes/generative-media-app.md`
- `knowledge/shapes/automation-bot-integration.md`
- `knowledge/shapes/cli-library-mcp.md`
- `knowledge/shapes/browser-extension.md`
- `knowledge/shapes/desktop-app.md`
- `knowledge/shapes/api-backend.md`

Not the default, but commonly paired with it:

- `knowledge/shapes/mobile-app.md` — the app itself uses `knowledge/runtime-tracks/mobile-native.md`;
  its backend and web dashboard land here.
- `knowledge/shapes/data-pipeline-analytics.md` — pipelines default to
  `knowledge/runtime-tracks/python.md`; the dashboard on top of them lands here.

## See also

- `knowledge/stack-compatibility.md` — combinations from this table that are known to conflict
- `knowledge/capabilities/frontend-architecture.md` — server vs client component boundaries
- `knowledge/capabilities/database.md` — choosing between Drizzle and Prisma for a given shape
- `knowledge/capabilities/testing.md` — what to cover with Vitest vs Playwright
- `knowledge/runtime-tracks/python.md` — when the workload is ML/numeric rather than product UI
- `knowledge/runtime-tracks/go.md` — when you need a single binary or extreme concurrency
