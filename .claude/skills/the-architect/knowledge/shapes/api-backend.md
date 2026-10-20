# Shape: API / Backend Service

> A headless service with no UI of its own, consumed over the network by other software — your own
> frontend, a partner's system, or an AI agent.

Last verified: 2026-10-17

## Is this your project?

**Yes if:**
- The deliverable is endpoints, not screens. "We need an API for the mobile app."
- Third parties will integrate — API keys, per-tenant quotas, published docs, versioning promises.
- The frontend already exists (or is someone else's problem) and needs a backend behind it.
- Work is request/response or job-queue shaped: validate input, touch a datastore, return JSON.
- Someone says "and agents should be able to call it too."

**No if:**
- The UI ships from the same repo and deploy — `knowledge/shapes/saas-webapp.md` (API is a folder there, not a product).
- The artifact is an installed package or a connectable MCP server, not a hosted URL — `knowledge/shapes/cli-library-mcp.md`.
- The core work is scheduled batch transforms over large datasets — `knowledge/shapes/data-pipeline-analytics.md`.
- The service runs a model in a loop with tools and memory — `knowledge/shapes/agent-app.md`.
- The client is a phone app you are also building, and the endpoints only exist to serve it — `knowledge/shapes/mobile-app.md` (compose: design the client there, this shape as its server).
- The consumers are staff on screens you also build, with roles and an audit log — `knowledge/shapes/internal-tool.md`.
- The endpoints exist to sell a catalog: cart, inventory, checkout, payouts — `knowledge/shapes/ecommerce-storefront.md` (commerce semantics dominate the API design).
- There is no published contract and no third-party client — a trigger fires and your own code reacts — `knowledge/shapes/automation-bot-integration.md`.

## Default runtime track

**TypeScript / Node** — see `knowledge/runtime-tracks/ts-node.md`. Same language as most clients
that will call it, one validation schema shared across the wire, and the shortest path from schema
to typed SDK to published docs.

Alternatives:
- `knowledge/runtime-tracks/go.md` — throughput per dollar, tail latency, single static binary, long-lived connections.
- `knowledge/runtime-tracks/python.md` — endpoints wrapping models, embeddings, or scientific libraries. Never port an ML stack to Node to satisfy a language preference.
- `knowledge/runtime-tracks/rails-laravel.md` — the team already runs one and the API is a CRUD surface over an existing schema.

## Core capabilities

| Capability | Why this shape needs it | File |
|---|---|---|
| API design | Resource naming, pagination, error envelope, versioning, idempotency | `knowledge/capabilities/api-design.md` |
| Database | The service *is* its data layer; schema and migrations are the core asset | `knowledge/capabilities/database.md` |
| Auth | Two distinct modes — user tokens and machine API keys — usually both | `knowledge/capabilities/auth.md` |
| Testing | No UI to eyeball; contract tests are the only proof it works | `knowledge/capabilities/testing.md` |
| Observability | You cannot see a headless failure without structured logs and traces | `knowledge/capabilities/observability.md` |
| Deployment | Health checks, migration ordering, zero-downtime restarts, rollback | `knowledge/capabilities/deployment.md` |
| Enterprise readiness | Add when the buyer asks for audit logs, SSO, residency, an SLA | `knowledge/capabilities/enterprise-readiness.md` |
| Credit metering | Add when the API is billed per call, token, or unit of work | `knowledge/capabilities/credit-metering.md` |

## Data model

| Entity | Holds |
|---|---|
| `organizations` | Billing and quota boundary — the tenant; has many users and api_keys |
| `users` / `refresh_tokens` | Human principals with roles; rotating refresh state, revocable per device |
| `api_keys` | Hashed key, display prefix, scopes, last_used_at, revoked_at |
| `<primary_resource>` | What the API is actually about; tenant-scoped |
| `audit_events` | actor, action, target, ip, occurred_at — append-only; the one audit table, per `knowledge/capabilities/enterprise-readiness.md` |
| `jobs` | Queued and completed background work with retry count |
| `webhook_endpoints` / `webhook_deliveries` | Outbound URLs, signing secrets, attempt history |
| `usage_events` | Metered call records, when billing per unit |

Every tenant-scoped table carries `organization_id` and is indexed on it. Never rely on application
code alone to keep tenants apart — enforce it in the query layer or the database.

## Directory structure

Shown for the TypeScript track; the same boundaries apply to any track.

```
src/
  routes/<resource>/
    handlers.*        # HTTP only — parse, call service, shape response
    schema.*          # one schema per endpoint: validation + OpenAPI + tests
    service.*         # business logic; no HTTP types leak in
  middleware/         # auth, rate limit, request id, error envelope, logging
  db/schema.*         # table definitions
  db/migrations/      # ordered, forward-only, checked in
  jobs/               # queue workers, one file per job type
  mcp/                # MCP server exposing the same services as tools
  lib/env.*           # env parsed at boot; crash on missing
  lib/errors.*        # typed errors mapped to status codes
  server.*            # composition root — routes, middleware, health
tests/contract/       # every endpoint, against a real database
tests/unit/           # services only
openapi.json          # generated from schemas, never hand-edited
public/llms.txt       # agent-facing map of the API
```

## Agent-readable surface

A meaningful share of API traffic now originates from an LLM agent, not a hand-written client.
Design for it up front — cheap at the start, painful to retrofit.

| Surface | What it is | Rule |
|---|---|---|
| OpenAPI document | Generated from the schemas that validate requests | Generated in CI; a drift check fails the build |
| `llms.txt` | Root-level plain-text map: what the API does, auth, key endpoints | Hand-written, short, kept current |
| MCP server | The same services as typed tools an agent host can connect to | Same repo, shares the service layer |
| Error text | Says what was wrong and what to send instead | No stack traces, no opaque codes |

**On MCP statefulness — get this right.** The current MCP spec revision (2026-07-28, per
`modelcontextprotocol.io/specification/versioning`) is **stateless**: every request carries its
protocol version in `_meta`, `server/discover` is mandatory, and the `initialize` handshake is the
**legacy** era. Its own compatibility matrix shows legacy-only clients — hosts still deployed today —
failing against modern-only servers. Build **dual-era**: modern per-request metadata as the baseline,
plus answering `initialize` with legacy session semantics for older hosts. Re-read the versioning
page at build time; the current revision moves.

Keep the tool surface small and task-shaped. Do not auto-generate one tool per endpoint — an agent
handed sixty CRUD tools performs worse than one handed six verbs matching real jobs.

## Build order

1. **Scaffold and boot** — init per the runtime track, env parsed at startup, `/health` returning the
   build SHA. · *Done when:* `/health` returns 200 with the SHA, and removing a required env var
   makes startup exit non-zero.
2. **Error envelope and request context** — typed errors, one failure shape, request id on every log
   line. · *Done when:* an unhandled throw returns the documented JSON error body with a request id,
   not a stack trace.
3. **Database and migrations** — organizations, users, primary resource; runner wired to CI.
   · *Done when:* up-then-down on a clean database leaves no residue and re-running up is idempotent.
4. **Tenancy enforcement** — `organization_id` everywhere plus a query-layer guard. · *Done when:* a
   test proves org A's token cannot read org B's row, returning 404 rather than 403.
5. **Auth: user tokens** — login, short-lived access token, rotating refresh, revocation.
   · *Done when:* a revoked token is rejected and reusing a rotated refresh token invalidates the
   whole family.
6. **Auth: API keys** — hashed at rest, prefix shown in listings, scopes enforced per route.
   · *Done when:* the plaintext key appears exactly once in the create response and never in any log,
   later response, or database row.
7. **Primary resource endpoints** — full lifecycle with validation, cursor pagination, filters.
   · *Done when:* contract tests cover create/read/update/delete plus a list whose cursor round-trips
   across two pages.
8. **Rate limiting and idempotency** — per-key limits with standard headers, idempotency keys on
   unsafe writes. · *Done when:* the limit test gets 429 with a retry header, and replaying a POST
   with the same key returns the original response without creating a second row.
9. **OpenAPI and llms.txt** — document served and diff-checked, agent map written. · *Done when:* CI
   fails if the committed OpenAPI document differs from the generated one.
10. **MCP server** — task-shaped tools over the existing services, dual-era (modern baseline plus
    legacy `initialize`). · *Done when:* an integration test exits 0 that (a) sends `server/discover`
    and gets a result listing the current revision, (b) sends a legacy `initialize` and gets a result
    rather than an error, and (c) lists tools and completes a call whose effect is visible via the
    HTTP API.
11. **Background jobs** — queue, worker, retry with backoff, dead-letter. · *Done when:* a job forced
    to fail three times lands in the dead-letter store and emits an alert-worthy log line.
12. **Outbound webhooks** — signed payloads, retry schedule, delivery log. · *Done when:* a receiver
    verifies the signature, and one returning 500 is retried on schedule with attempts recorded.
13. **Observability** — structured logs, request traces, error reporting, latency metrics.
    · *Done when:* one trace links an inbound request to its database calls and its queued job.
14. **Deploy** — containerized, migrations gated ahead of rollout, health-gated release.
    · *Done when:* a deploy with a failing migration aborts before traffic shifts, and a rollback
    restores the previous revision with no manual step.

## Pitfalls

- **Two validation sources.** One schema per endpoint, reused by router, OpenAPI generator, and
  tests. Separate copies drift within weeks.
- **Tenant isolation only in application code.** One forgotten `where` clause is a breach. Enforce it
  in the query layer or database and prove it with a cross-tenant test.
- **No versioning story until the first breaking change.** Decide on day one, publish a deprecation
  window, never silently break a documented field.
- **Unbounded list endpoints.** Paginate from the first commit, with cursors — offset pagination
  collapses on large tables.
- **Non-idempotent writes.** Clients retry and networks lie; without idempotency keys you will bill
  someone twice. Related: recoverable API keys — hash them, store a prefix for display, and make
  rotation an endpoint rather than a support ticket.
- **Migrations shipped with the code that needs them.** Expand, deploy, backfill, contract — four
  deploys, never one.
- **Health checks that only prove the process is alive.** Check database and queue connections too,
  or the load balancer routes happily to a broken instance.

## Skills for the build phase

Install commands and fallbacks live in `knowledge/skills-registry.md`. No leading slash means the
skill auto-activates — writing it with a slash is a no-op. Never hard-depend on one: if absent, fall
back to the knowledge base or built-in `WebSearch`/`WebFetch`, note it in a line, and keep going.

| Skill | When |
|---|---|
| `/last30days` | Current opinion when choosing between frameworks, queues, or hosts |
| `claude-api` | Mandatory before writing any model ID, price, or API parameter |
| `playwright-cli` | End-to-end contract runs against a deployed environment |
| `/humanizalo` | Public API docs, error copy, and the `llms.txt` map |

## See also

- `knowledge/runtime-tracks/ts-node.md` — default track: pinned versions, scaffolding, commands
- `knowledge/runtime-tracks/go.md` — throughput, tail latency, single-binary deploys
- `knowledge/capabilities/api-design.md` — response envelope, pagination, versioning, idempotency
- `knowledge/capabilities/observability.md` — the only way to see a headless failure
- `knowledge/shapes/cli-library-mcp.md` — when the MCP server *is* the product
- `knowledge/shapes/saas-webapp.md` — when the UI ships from the same repo
- `knowledge/shapes/mobile-app.md` — the most common client to compose with; design it there, this service here
- `knowledge/stack-compatibility.md` — combinations to avoid across track and capability
