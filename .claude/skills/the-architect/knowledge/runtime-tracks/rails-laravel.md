# Runtime Track: Rails / Laravel (batteries-included)

> Choose this track when the fastest path to a working product is a mature server-rendered
> framework that already ships auth, migrations, background jobs, mail, admin and deploy —
> and you would rather write features than assemble twelve npm packages.

**Last verified: 2026-10-17** — every version below was checked against RubyGems and Packagist on
this date. When refreshing this file, re-verify and update this line.

This file covers **two independent sub-tracks**. Pick one; never mix them in a project.

---

## When to choose this track

- **A small team (1-4 people) shipping CRUD-heavy product.** Rails and Laravel were designed for
  exactly this and the conventions do the arguing for you.
- **The app is admin-heavy.** Filament generates a real, production-usable back office from your
  Eloquent models in an afternoon. Nothing in the JS ecosystem is close on effort-to-result.
- **You need background jobs, scheduled tasks, mail, file storage, and a queue dashboard**, and you
  do not want four vendor accounts to get them.
- **The product is mostly server-rendered pages with islands of interactivity** — dashboards, CMSes,
  marketplaces, internal tools, classic SaaS.
- **You want one deployable unit.** One repo, one process model, one `bin/deploy`. No separate
  frontend host, no edge/runtime split, no serverless cold-start tax.

### When NOT to choose it — say this out loud to the user

| Situation | Go here instead |
|---|---|
| Genuinely app-like UI: canvas, drag-and-drop editor, offline, optimistic multi-pane state | `knowledge/runtime-tracks/ts-node.md` |
| A React Native / native mobile client is the primary surface | `knowledge/runtime-tracks/mobile-native.md` (Rails/Laravel is still a fine API for it) |
| Heavy ML, embeddings, notebooks, data pipelines | `knowledge/runtime-tracks/python.md` |
| Latency-critical or high-concurrency network service | `knowledge/runtime-tracks/go.md` |
| The team has zero Ruby/PHP experience and no appetite to learn | `knowledge/runtime-tracks/ts-node.md` |

**The honest tradeoff.** You get an enormous amount for free — routing, ORM, migrations, auth,
jobs, cache, mail, admin, deploy — in exchange for two real costs: (1) a server-rendered-first
mental model, so heavily interactive UI fights the grain; (2) noticeably less AI training data than
the TypeScript ecosystem, so an agent building this will need tighter specs, more explicit file
paths, and a test suite it can actually run. Budget for that in the blueprint: prescribe exact
generator commands rather than trusting recall.

---

## Sub-track A — Rails

### Pinned versions

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Language | Ruby | **4.0.7** | Current stable. Rails 8.1 declares `required_ruby_version >= 3.2.0`; if a dependency is not Ruby 4-ready, pin **3.4.11** — both are supported |
| Framework | Rails | **8.1.4** | Latest stable. No 8.2/9.0 prerelease exists as of this date. 8.1 left bug-fix support on 2026-10-10; security fixes continue to 2027-10-10 |
| Server | Puma | **8.0.2** | Default |
| HTTP proxy / TLS | Thruster | **0.1.27** | Ships in the Rails 8 Dockerfile; handles TLS, gzip, X-Sendfile |
| Assets | Propshaft | **1.3.2** | Default in Rails 8. Sprockets is legacy — do not reach for it |
| JS delivery | importmap-rails | **2.2.3** | No bundler, no `node_modules`. Only add jsbundling if a dependency truly requires npm |
| Frontend | Turbo (turbo-rails) | **2.0.23** | Drives page nav, frames, and streams |
| Frontend | Stimulus (stimulus-rails) | **1.3.4** | Sprinkles of JS behaviour, ~30 lines per controller |
| Jobs | Solid Queue | **1.7.0** | Database-backed. Default in Rails 8 — no Redis needed |
| Cache | Solid Cache | **1.0.10** | Database-backed cache store |
| WebSockets | Solid Cable | **4.1.0** | Action Cable over the database. Requires Ruby ≥3.3 |
| Job UI | mission_control-jobs | **1.3.1** | Mount at `/jobs`, behind admin auth |
| Components | ViewComponent | **4.16.0** | Optional. Add once partials start taking arguments |
| DB driver | pg | **1.7.0** | PostgreSQL for anything multi-user |
| Auth | Devise | **5.0.4** | Only when you need OmniAuth/confirmable/lockable — otherwise use `rails g authentication` |
| Deploy | Kamal | **2.12.0** | Docker to your own servers |
| Tests | RSpec (rspec-rails) | **8.0.4** | Or built-in Minitest — see below |
| Lint | rubocop-rails-omakase | **1.1.0** | Rails' own opinionated config. Ships in new apps |
| Security | Brakeman | **8.1.0** | Static analysis, wired into `bin/ci` |
| Jobs (alt) | Sidekiq | **8.1.7** | Only when you already run Redis and need its throughput |

### Setup

```bash
# PostgreSQL + RSpec, skipping the default test framework
rails new myapp --database=postgresql --skip-test --css=tailwind
cd myapp

# Built-in auth generator — sessions, password reset mailer, no gem required
bin/rails generate authentication

bin/rails db:prepare
bin/dev            # Puma + Tailwind watcher via Procfile.dev
```

Solid Queue, Solid Cache and Solid Cable are already configured by `rails new` on Rails 8. Do not
add Redis unless a real requirement forces it.

### Conventions

```
app/
  controllers/          # thin. Find, authorize, delegate, respond.
  models/               # Active Record. Validations + associations + scopes only.
  models/concerns/      # shared model behaviour
  views/                # ERB. Turbo Frames for partial updates.
  components/           # ViewComponent, once a partial needs >2 locals
  javascript/controllers/  # Stimulus, one controller per behaviour
  jobs/                 # ActiveJob classes, one public #perform
  mailers/
lib/tasks/              # rake tasks
config/routes.rb        # RESTful. 7 actions; a new noun beats an 8th verb.
config/ci.rb            # Rails 8.1 local-CI DSL, run with bin/ci
db/migrate/
spec/ or test/
```

- **Fat model, thin controller** is still the rule. When a model passes ~200 lines, extract a
  concern or a plain PORO in `app/models/` — not a `services/` folder full of nouns ending in `Service`.
- **Hotwire order of escalation:** plain link → Turbo Frame → Turbo Stream → Stimulus controller →
  (rarely) a real JS component. Stop at the first one that works.
- **One migration per change**, never edit a migration that has run in production.
- Use `bin/rails generate` for everything. The generators write the conventional file set; hand-rolled
  structure is the main source of drift in agent-built Rails apps.

### Testing / lint / build commands

| Task | Command |
|---|---|
| Full local CI | `bin/ci` (Rails 8.1 — runs the `config/ci.rb` pipeline) |
| Tests (RSpec) | `bundle exec rspec` |
| Tests (Minitest) | `bin/rails test` / `bin/rails test:system` |
| Lint | `bin/rubocop` |
| Security scan | `bin/brakeman --no-pager` |
| Migrate | `bin/rails db:migrate` |
| Console | `bin/rails console` |
| Routes | `bin/rails routes -g <pattern>` |
| Deploy | `bin/kamal deploy` |

**RSpec vs Minitest:** pick **Minitest** when the team is new to Rails or the app is small — it is
already there, it is fast, and it needs no DSL. Pick **RSpec** when the team already knows it or the
domain needs heavy shared-context setup. Never run both.

### Deployment notes

- **Kamal 2** is the default: `kamal setup` once, then `kamal deploy` per release. Zero-downtime,
  runs on any VPS with SSH, and as of Kamal 2.8+ basic deployments use a **local registry** — no
  Docker Hub account required.
- Rails 8.1 lets Kamal read secrets straight from encrypted credentials via `rails credentials:fetch`.
  Use that instead of a `.env` on the server.
- Managed alternatives: Hatchbox, Render, Fly.io. Heroku still works and still costs more.
- SQLite in production is genuinely viable for single-server, read-heavy apps with Solid Queue/Cache
  on the same disk. Postgres the moment you need a second app server.

### Gotchas

- **Sprockets advice is stale.** Rails 8 uses Propshaft. `//= require` directives and
  `app/assets/javascripts` do not apply.
- **`rails g authentication` is not Devise.** It gives you sessions + password reset and nothing else.
  If the spec needs OAuth, email confirmation or account lockout, install Devise up front rather than
  retrofitting.
- **Turbo swallows redirects on non-GET failures.** A failed `create` must render with
  `status: :unprocessable_entity` or the form silently does nothing.
- **Turbo Streams need a broadcast target that exists in the DOM.** A stream aimed at a missing
  `dom_id` is a no-op with no error — the single most common "why isn't it updating" bug.
- **Solid Queue needs its own process** in production (`bin/jobs`), or `SOLID_QUEUE_IN_PUMA=true`
  for small deployments. Forgetting this means jobs enqueue and never run.
- **Active Job Continuations (new in 8.1)** let long jobs resume from the last completed step after a
  restart. Use them for imports and backfills instead of hand-rolled cursor state.
- **Deprecated associations (new in 8.1)** — mark an association `deprecated: true` with `:warn` or
  `:raise` before deleting it. Cheap insurance during refactors.
- **N+1 is the default failure mode.** Add `bullet` in development or budget a query-count assertion
  in tests; agent-written controllers reliably produce them.

---

## Sub-track B — Laravel

### Pinned versions

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Language | PHP | **8.5.11** | Current stable. Laravel 13 requires `^8.3`; Pest 5 requires `^8.4` |
| Framework | laravel/framework | **13.37.0** | Latest stable major |
| Installer | laravel/installer | **5.32.0** | `laravel new` — drives the starter-kit prompts |
| Interactivity | Livewire | **4.4.7** | Server-driven components. The default choice |
| Admin panel | Filament | **5.10.2** | Requires PHP `^8.2`, Livewire `^4.4.7`, Illuminate `^11.28 \|\| ^12.0 \|\| ^13.0` (declared in `filament/support`) |
| SPA bridge | inertiajs/inertia-laravel | **3.5.1** | Only when the UI genuinely needs React/Vue |
| Tests | Pest | **5.3.2** | Requires PHP `^8.4` and PHPUnit 13. `laravel new --pest` installs it unconstrained — on PHP 8.3 Composer silently resolves Pest 4 instead |
| API auth | Sanctum | **4.3.3** | Tokens + SPA cookie auth |
| Auth scaffolding | Fortify | **1.41.0** | Headless auth backend behind the starter kits |
| Queues UI | Horizon | **5.50.1** | Redis queues only. Skip it if you run the database driver |
| Lint / format | Pint | **1.32.1** | Laravel's opinionated PHP-CS-Fixer preset |
| Static analysis | Larastan | **3.13.0** | PHPStan for Laravel. Start at level 5 |
| Billing | Cashier | **16.9.0** | Stripe subscriptions — see `knowledge/capabilities/payments-rails.md` |
| Search | Scout | **11.9.0** | Driver-based full-text search |
| Permissions | spatie/laravel-permission | **8.3.0** | Roles + permissions. Filament integrates with it |
| WebSockets | Reverb | **1.12.0** | First-party WebSocket server |
| Debug/APM | Telescope | **5.26.0** | Local only. Never expose in production |
| Agent tooling | laravel/boost | **2.10.3** | MCP server + docs for AI coding agents — worth installing when Claude Code builds the app |

### Setup

```bash
# Starter kits replace the old Breeze/Jetstream flow. Pick livewire unless you need a real SPA.
laravel new myapp --livewire --pest
cd myapp

php artisan migrate

# Admin panel
composer require filament/filament
php artisan filament:install --panels
php artisan make:filament-user

composer require --dev laravel/boost && php artisan boost:install   # optional, helps AI builds

npm install && npm run dev
php artisan serve
```

### Conventions

```
app/
  Models/                 # Eloquent. Casts, relations, scopes.
  Http/Controllers/       # thin, single-purpose; prefer invokable controllers
  Http/Requests/          # FormRequest = validation + authorization. Always use these.
  Livewire/               # full-page and inline Livewire components
  Filament/Resources/     # generated admin CRUD
  Jobs/  Events/  Listeners/  Notifications/  Policies/
  Actions/                # single-public-method classes for real domain logic
database/migrations/  database/factories/  database/seeders/
resources/views/          # Blade
routes/web.php  routes/api.php  routes/console.php
tests/Feature/  tests/Unit/
```

- **Validation lives in FormRequests**, authorization in **Policies**. Controllers that inline
  `$request->validate()` and `if ($user->isAdmin())` are the top source of security holes here.
- **Eloquent over query builder** until a query is measurably slow, then drop to the builder for that
  one query only. Do not build a repository layer over Eloquent — it buys nothing.
- **Livewire component = one screen or one widget.** When a component passes ~250 lines, split it.
- **Filament Resources are generated, then edited** (`php artisan make:filament-resource Post --generate`).
  Do not hand-write them.

### Testing / lint / build commands

| Task | Command |
|---|---|
| Tests | `./vendor/bin/pest` (or `php artisan test`) |
| Tests, parallel | `php artisan test --parallel` |
| Format | `./vendor/bin/pint` |
| Static analysis | `./vendor/bin/phpstan analyse` |
| Migrate | `php artisan migrate` |
| Fresh DB + seed | `php artisan migrate:fresh --seed` |
| REPL | `php artisan tinker` |
| Routes | `php artisan route:list` |
| Queue worker | `php artisan queue:work` |
| Asset build | `npm run build` (Vite) |

Pest is the default in new apps. Use PHPUnit only when an existing suite already is PHPUnit — Pest
runs on top of it, so migration is incremental rather than a rewrite.

### Deployment notes

| Target | Use when |
|---|---|
| **Laravel Cloud** | Default recommendation. First-party managed hosting; database, queues and workers configured for you |
| **Laravel Forge** | You want your own VPS (Hetzner/DigitalOcean) with provisioning handled. Cheapest at scale |
| **Laravel Vapor** (`laravel/vapor-core` **2.47.0**) | Serverless on AWS Lambda. Only for genuinely spiky traffic — it complicates filesystem, queues and long requests |
| Plain Docker / Kamal | You already run infrastructure and want parity with a Rails shop |

Always run `php artisan config:cache route:cache view:cache` at deploy, and a **separate queue worker
process** supervised by Horizon or systemd. A Laravel app with no worker process silently accumulates
unprocessed jobs — same failure as Rails without `bin/jobs`.

### Gotchas

- **Breeze and Jetstream are the old world.** Current Laravel scaffolds via `laravel new` starter kits
  (Livewire / React / Vue). Any instruction to `composer require laravel/breeze` is out of date.
- **Filament 5 requires Livewire `^4.4.7`.** Do not pin Livewire 3 (or an older 4.x) alongside Filament 5; the conflict surfaces
  as cryptic Alpine errors at runtime, not at install time.
- **Livewire re-renders on every action.** Anything expensive in `render()` runs on every keystroke of
  a `wire:model.live` field. Use `wire:model.blur` by default and `#[Computed]` for derived data.
- **Telescope in production will fill your database.** Gate it to local, or set aggressive pruning.
- **Mass assignment:** every model needs `$fillable` or `$guarded` set deliberately. The default is a
  loaded gun.
- **`migrate:fresh` drops everything.** Never put it in a deploy script; agents do this.
- **Queue `--tries` defaults to 1** on some drivers. Set retries and a `failed_jobs` alert explicitly.
- **Octane changes lifecycle assumptions** — state persists between requests. Do not enable it as a
  performance default; enable it only after you have profiled and audited for leaked singletons.

---

## Choosing between the two

| Signal | Pick |
|---|---|
| Admin/back-office is a first-class product surface | **Laravel** — Filament is the strongest argument on this whole track |
| Team values convention, minimal config, one obvious way | **Rails** |
| Cheap managed hosting and a huge freelancer pool matter | **Laravel** |
| You want zero-Redis, zero-extra-services deploys out of the box | **Rails** (Solid Queue/Cache/Cable) |
| Existing in-house expertise | Whichever one they already have — this outweighs everything above |

Do not present both to the user as a menu. Pick one based on the table, state it, give the reason in
one sentence, and move on.

---

## Shapes that use this track

- `knowledge/shapes/saas-webapp.md` — the canonical fit
- `knowledge/shapes/internal-tool.md` — Filament or Rails scaffolds beat a bespoke React admin
- `knowledge/shapes/content-community-platform.md` — server-rendered content is the grain here
- `knowledge/shapes/ecommerce-storefront.md` — when you are building the store, not buying a platform
- `knowledge/shapes/api-backend.md` — both are competent JSON API servers for a native or SPA client

## Skills for the build phase

- `ui-ux-pro-max` — palette, type scale and component style before any Blade/ERB gets written.
  Auto-activates; do not prefix it with a slash.
- `frontend-design` — for the marketing surface and any high-polish page. Build phase only.
- `playwright-cli` — E2E against the running server; covers Turbo/Livewire behaviour that unit tests miss.
- `/last30days` — current community opinion before committing to a gem or package that is not pinned above.
- `/claude-seo-ai:audit` — for public content surfaces on either sub-track.

If a skill is not installed, fall back to this knowledge base or built-in `WebSearch`/`WebFetch`,
note it in one line, and keep going. Never hard-depend on a skill.

## See also

- `knowledge/runtime-tracks/ts-node.md` — the alternative when the UI is genuinely app-like
- `knowledge/capabilities/auth.md` — `rails g authentication` vs Devise vs Fortify/Sanctum
- `knowledge/capabilities/database.md` — Active Record and Eloquent migration/indexing practice
- `knowledge/capabilities/deployment.md` — Kamal, Forge, Vapor and Laravel Cloud in context
- `knowledge/capabilities/testing.md` — where RSpec/Minitest and Pest fit the wider test strategy
- `knowledge/capabilities/payments-rails.md` — Cashier and Stripe wiring
- `knowledge/stack-compatibility.md` — combinations to refuse (e.g. Filament 5 + Livewire 3)
