# Shape: Internal Tool / Admin Dashboard

> A CRUD-and-charts panel that a known, authenticated team uses to operate the business — never the public.

Last verified: 2026-10-17

## Is this your project?

**Yes if:** the user says "our ops team", "back office", "admin panel", "internal", "for support agents" · every user has a company email and is invited, never self-signed-up · it reads and writes an existing production database rather than owning a new one · the phrase "we currently do this in a spreadsheet" appears · nobody pays to use it.

**No if:**
- The panel *is* the product and customers pay for seats → `knowledge/shapes/saas-webapp.md`.
- It is read-only charts over a warehouse, with ETL and modelling as the real work → `knowledge/shapes/data-pipeline-analytics.md`.
- Non-technical staff author articles/pages that render on a public site → `knowledge/shapes/content-community-platform.md`.
- There is no UI at all — other services are the consumers → `knowledge/shapes/api-backend.md`.
- The core is a scheduled job or Slack/webhook responder, and the UI is only a status page → `knowledge/shapes/automation-bot-integration.md`.
- Customers browse a catalog and check out, and the admin panel is only one half of it → `knowledge/shapes/ecommerce-storefront.md`. Storefront and back-office ship as one shape; do not split them.

## Default runtime track

**TypeScript/Node** — see `knowledge/runtime-tracks/ts-node.md`. Best when the tool must sit next to an existing TS codebase, embed real charts, or ship interactive tables.

**Read this before defaulting:** if the team already runs a Python or PHP backend, a batteries-included admin is usually the *fastest correct answer* — see `knowledge/runtime-tracks/rails-laravel.md` and `knowledge/runtime-tracks/python.md`. Django's built-in admin and Laravel's admin-panel ecosystem give you list views, filters, search, pagination, permissions, and an audit trail from a model definition, in hours rather than weeks. Recommend that path plainly when it fits; do not build a bespoke React admin out of habit. Go back to the TypeScript track when the tool needs heavy client-side interaction, or when the org has no Python/PHP runtime to host.

| Condition | Track |
|---|---|
| Existing TS/Node services, rich interactive UI | `knowledge/runtime-tracks/ts-node.md` |
| Existing Django/Rails/Laravel app, standard CRUD over its own models | `knowledge/runtime-tracks/rails-laravel.md` |
| Data-science team, tool wraps notebooks or model output | `knowledge/runtime-tracks/python.md` |

## Core capabilities

| Capability | Why this shape needs it | File |
|---|---|---|
| Auth | Invite-only, SSO where the org has an IdP, no public signup | `knowledge/capabilities/auth.md` |
| Enterprise readiness | Roles, permissions, audit log, session policy — the defining requirements here | `knowledge/capabilities/enterprise-readiness.md` |
| Database | Connects to an existing schema; migrations must not break production | `knowledge/capabilities/database.md` |
| API design | Server-side list endpoints: filter, sort, paginate, bulk mutate | `knowledge/capabilities/api-design.md` |
| Frontend architecture | Table-and-form-heavy layout, server-rendered lists | `knowledge/capabilities/frontend-architecture.md` |
| Observability | Ops staff report "it's broken" without detail; you need traces and logs | `knowledge/capabilities/observability.md` |
| Deployment | Often behind VPN or SSO proxy, sometimes self-hosted | `knowledge/capabilities/deployment.md` |
| Accessibility | Staff use this 8 hours a day — keyboard operation is productivity, not compliance | `knowledge/capabilities/accessibility.md` |
| Testing | E2E over the three workflows the business cannot lose | `knowledge/capabilities/testing.md` |

## Data model

The business entities already exist — you are adding an operational layer on top.

| Entity | Notes |
|---|---|
| `users` | Staff account (schema owned by `knowledge/capabilities/auth.md`). Invited, not registered. `status` for offboarding. |
| `roles` | Named bundle of permissions (`admin`, `support`, `read_only`). Assign roles, never per-user permissions. |
| `permissions` | `resource:action` strings (`order:refund`). Checked server-side on every mutation. |
| `audit_events` | **Non-negotiable.** The one audit table, defined in `knowledge/capabilities/enterprise-readiness.md`: `actor_id`, `actor_ip`, `action`, `target_type`, `target_id`, `occurred_at`, with before/after values in `metadata`. Append-only, never updated or deleted. |
| `saved_views` | A user's stored filter + column + sort combination. Cheap to add, heavily used. |
| `export_jobs` | Async export: `requested_by`, `status`, `row_count`, `file_url`, `expires_at`. |
| *domain entities* | Orders, customers, tickets — existing tables. Prefer soft delete (`deleted_at`) over hard delete everywhere. |

## Directory structure

Shown for the TypeScript track; the concept maps directly onto the others.

```
src/
  app/
    login/                  # SSO or magic-link entry; no signup route exists
    (dashboard)/
      layout                # sidebar + header shell, nav filtered by permission
      page                  # KPI overview
      [resource]/           # list (server-paginated table + filter bar)
        [id]/               # detail + edit
        new/
      audit/                # audit log viewer — searchable by actor and resource
      settings/users/       # invite, assign role, deactivate
    api/
      [resource]/           # list/create/update/delete, permission-gated
      exports/              # enqueue export job, poll status, download
  components/
    data-table/             # one generic table: sort, filter, paginate, select, bulk act
    forms/                  # one generic form driven by a schema
    layout/                 # Sidebar, Header, Breadcrumbs
  lib/
    db                      # client against the existing schema
    authz                   # can(user, 'order:refund', resource) — single choke point
    audit                   # writeAuditLog(); called inside the same transaction as the mutation
    export                  # streaming CSV writer
```

## Build order

1. **Scaffold + connect to the real database read-only** — project skeleton, formatter, path aliases, a connection to a *replica or dev copy* of production. · *Done when:* the dev command boots and a `/health` route returns a row count queried from the actual schema.
2. **Auth and the no-signup rule** — login via the org's IdP or magic link; every route outside `/login` redirects when unauthenticated. · *Done when:* WHEN an anonymous request hits any dashboard route THE SYSTEM SHALL redirect to `/login`; no route exists that creates an account from an unauthenticated request.
3. **Roles and the `can()` choke point** — role/permission tables, seed `admin` and `read_only`, one authorization function used by every route. · *Done when:* a `read_only` session receives 403 from every mutating endpoint, proven by an automated test per endpoint.
4. **Audit log before any write ships** — append-only table plus `writeAuditLog()` invoked in the same transaction as each mutation. · *Done when:* one update writes exactly one audit row containing before/after values, and a test asserts an update wrapped without audit fails the transaction.
5. **App shell** — sidebar, header, breadcrumbs; nav items hidden when the user lacks the permission. · *Done when:* the sidebar rendered for `read_only` omits every admin-only link, verified by a snapshot test.
6. **First resource, server-side list** — filter, sort, and paginate *in the database*, never in the browser. · *Done when:* the list route over a table seeded with 1M rows returns page 1 in under 500ms and issues a query containing `LIMIT`.
7. **Detail and edit** — read view, edit form with server-side validation, soft delete behind a confirm dialog. · *Done when:* an invalid field returns a field-level error without losing entered data, and delete sets `deleted_at` while the row stays queryable.
8. **Bulk actions** — multi-select with an explicit selected count, confirmation naming the action and count, chunked execution. · *Done when:* selecting 500 rows and applying an action produces 500 audit rows and reports partial failures instead of silently succeeding.
9. **Exports** — enqueue a job, stream rows to CSV, notify on completion, expire the file. · *Done when:* exporting 200k rows completes without the process exceeding its memory limit and the download matches the on-screen filters.
10. **Saved views** — persist filter + sort + visible columns per user, restore on return. · *Done when:* a saved view reloads with identical filters after logout and login.
11. **KPI overview with real data** — a small number of numbers that drive decisions, cached, each linking through to its filtered list. · *Done when:* every KPI on the page matches a count run directly against the database, and the page loads under 1s cached.
12. **User management** — invite, assign role, deactivate; deactivation kills live sessions. · *Done when:* a deactivated user's next request returns 401 within the session-check interval.
13. **Observability and error handling** — structured logs with actor and request id, error tracking, empty and loading states on every list. · *Done when:* a deliberately thrown error appears in the error tracker with the acting user's id attached.
14. **Deploy behind the org's perimeter** — VPN, SSO proxy, or IP allowlist; secrets from the platform, never the repo. · *Done when:* the deployed URL from an unauthenticated network returns 403 or a login redirect, never data.

## Pitfalls

- **Audit logging bolted on later.** Retrofitting it means every mutation path must be rediscovered, and you have no history for the period that mattered. Write it in step 4, in the same transaction, or it will drift.
- **Client-side pagination.** Internal databases are big. Fetching all rows and slicing in the browser works on the seed data and dies on production day one. Paginate in the database from the first list you build.
- **Permission checks only in the UI.** Hiding the button is presentation. Every mutation re-checks server-side through the single `can()` function.
- **Over-designing.** Function over form. Density, keyboard shortcuts, and fast page loads beat animation. Staff use this all day.
- **Destructive bulk actions without a count.** "Delete selected" must say *what* and *how many*, and prefer soft delete so a mistake is recoverable.
- **Building realtime that nobody asked for.** Polling on a sane interval, or a manual refresh, covers almost every dashboard. Add live updates only when a stated workflow breaks without them.
- **Writing directly against production.** Develop against a replica or seeded copy; a bad migration in an internal tool takes the business down.
- **Reinventing the admin.** If the stack already ships one (see `knowledge/runtime-tracks/rails-laravel.md`), a bespoke build must be justified by a requirement the built-in admin genuinely cannot meet.

## Skills for the build phase

Install commands and graceful fallbacks: `knowledge/skills-registry.md`. No leading slash means the skill auto-activates — do not invoke it as a command.

| Skill | When |
|---|---|
| `ui-ux-pro-max` | Dense table, form, and dialog styling; a data-viz palette that survives dark mode |
| `frontend-design` | Dashboard shell and list/detail layout during the build phase |
| `playwright-cli` | E2E over the three workflows the business cannot lose |
| `pdf` | Only if the tool emits PDF reports |

If a skill is not installed, fall back to this knowledge base plus `WebSearch`/`WebFetch`, note the substitution in one line, and continue.

## See also

- `knowledge/runtime-tracks/ts-node.md` — default track and its pinned versions
- `knowledge/runtime-tracks/rails-laravel.md` — the built-in-admin shortcut; check this first
- `knowledge/capabilities/enterprise-readiness.md` — roles, permissions, audit log, session policy
- `knowledge/capabilities/api-design.md` — server-side pagination, filtering, bulk mutation contracts
- `knowledge/shapes/saas-webapp.md` — when the panel is the product being sold
- `knowledge/shapes/data-pipeline-analytics.md` — when the real work is modelling data, not operating on it
- `knowledge/shapes/ecommerce-storefront.md` — when the same build also has to take money from customers
