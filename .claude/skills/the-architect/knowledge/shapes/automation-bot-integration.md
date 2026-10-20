# Shape: Automation / Bot / Integration

> Event-driven software with no UI of its own: a trigger fires, work runs, a result lands somewhere else — and it has to survive failure while nobody is watching.

Last verified: 2026-07-27

## Is this your project?

**Yes if:**
- The user describes a **trigger**, not a screen: "when someone posts in Slack", "every morning at 7", "when Stripe sends a webhook", "when a new row appears".
- The product's entire surface is someone else's platform — Discord, Slack, Telegram, WhatsApp, GitHub, a CRM.
- Words like *sync*, *bot*, *scraper*, *cron*, *pipeline between two SaaS tools*, *auto-post*, *auto-reply*, *Zapier but custom*.
- Success is measured in "it ran and nothing broke", not in sessions or conversions.
- There may be a tiny admin page, but nobody would call it the product.

**No if:**
- The UI *is* the product and the automation is one feature → `knowledge/shapes/saas-webapp.md`
- The deliverable is a documented HTTP surface other people's clients call → `knowledge/shapes/api-backend.md`
- The value is a reasoning loop with tools and a conversation the user drives → `knowledge/shapes/agent-app.md`
- The point is moving/modeling volumes of data for analysis, not reacting to events → `knowledge/shapes/data-pipeline-analytics.md`
- A developer invokes it by hand from a terminal or an MCP client → `knowledge/shapes/cli-library-mcp.md`
- It runs inside the user's browser on pages they are already looking at, and there is a human in the loop → `knowledge/shapes/browser-extension.md`. "Automate this site for me" is this shape only when it runs headless on a server; if it needs the user's own logged-in tab, it is an extension.
- Staff need screens to see what ran, retry it, and act on the result — the run history is a product, not a log → `knowledge/shapes/internal-tool.md`

Social schedulers, PR-review bots, invoice-sync jobs, and price scrapers are all **variants of this shape**, not shapes of their own. The trigger taxonomy is the same; only the handler changes.

## Default runtime track

**TypeScript / Node** — see `knowledge/runtime-tracks/ts-node.md`. Every major chat platform ships a first-party Node SDK, long-lived socket clients are idiomatic, and one language covers webhook receiver, worker, and scheduler.

Alternatives:
- `knowledge/runtime-tracks/python.md` — scraping, data-shaped handlers, or when the automation calls ML/scientific libraries.
- `knowledge/runtime-tracks/go.md` — thousands of concurrent connections, single static binary, tight memory budget on a cheap box.

## Core capabilities

| Capability | Why this shape needs it | File |
|---|---|---|
| Observability | Nobody is watching. Silent failure is the default failure mode. | `knowledge/capabilities/observability.md` |
| Database | Idempotency keys, job state, cursors, dead letters — all need durable storage. | `knowledge/capabilities/database.md` |
| API design | Inbound webhook contract: signature, raw body, fast ack, versioned payloads. | `knowledge/capabilities/api-design.md` |
| Deployment | Always-on worker + scheduler, not a request-scoped function. | `knowledge/capabilities/deployment.md` |
| Auth | OAuth to each platform, per-tenant token storage and refresh. | `knowledge/capabilities/auth.md` |
| Testing | Handlers are pure functions over envelopes — the cheapest thing here to test well. | `knowledge/capabilities/testing.md` |
| AI/LLM integration | Only if the bot generates or classifies content. Skip otherwise. | `knowledge/capabilities/ai-llm-integration.md` |
| Enterprise readiness | Multi-workspace installs, audit trail, per-tenant secrets. | `knowledge/capabilities/enterprise-readiness.md` |

## Data model

| Entity | Purpose | Key fields / relationships |
|---|---|---|
| `connection` | One installed integration per tenant/workspace | provider, external_workspace_id, encrypted credentials, scopes, expires_at |
| `event` | Immutable inbound envelope | dedupe_key (unique), source, type, payload, received_at, status |
| `job` | Unit of work derived from an event or a schedule | event_id?, schedule_id?, handler, run_after, attempts, state |
| `attempt` | One execution of a job | job_id, started_at, duration_ms, outcome, error |
| `dead_letter` | Job that exhausted retries | job_id, last_error, payload snapshot, replayed_at |
| `schedule` | Recurring trigger definition | cron expression, timezone, catch-up policy, last_fired_at |
| `cursor` | Resume point for pollers and scrapers | source, position (timestamp or opaque token) |
| `delivery` | Outbound result sent to a platform | job_id, target, external_message_id, status |

`dedupe_key` unique constraint is the backbone of the whole shape. Design it first.

## Directory structure

```
src/
  triggers/        # webhook receiver, socket client, poller, scheduler — all emit Envelope
  envelope.ts      # the one normalized shape every trigger produces
  handlers/        # pure(envelope, ctx) -> actions; one file per command/automation
  queue/           # enqueue, lease, ack, retry policy, dead-letter
  clients/         # outbound platform SDK wrappers, each with its own rate limiter
  store/           # schema + repositories (events, jobs, connections, cursors)
  config.ts        # env schema, validated at boot, fails fast
  observability/   # logger, correlation ids, metrics, alerts
ops/               # runbook.md, replay script, backfill script
tests/
  fixtures/        # captured real webhook payloads — never hand-written
```
*(Shown for the TypeScript track; the same boundaries apply on any track.)*

## Build order

1. **Skeleton + config contract** — env schema validated at boot. · *Done when:* booting with one required var unset exits non-zero and names the missing key; a complete env prints `ready`.
2. **Envelope + trigger interface** — one normalized type all triggers emit. · *Done when:* unit tests build an Envelope from a fake webhook body, a fake schedule tick, and a fake socket event, and all three assert-equal on shape.
3. **Webhook receiver** — raw-body signature verification, ack fast, work later. · *Done when:* a tampered signature returns 401 and writes no row; a valid one returns 200 in under 500 ms and inserts an `event` with status `received`.
4. **Idempotency store** — unique `dedupe_key` from the provider's event id. · *Done when:* replaying the same signed payload three times leaves exactly one `event` row and one `job`.
5. **Queue + worker** — enqueue, lease with visibility timeout, ack. · *Done when:* SIGKILL-ing the worker mid-job and restarting re-leases that job and completes it once; the `attempt` log shows one success.
6. **Retry policy + dead letter** — exponential backoff with jitter, capped attempts. · *Done when:* an always-throwing handler produces N `attempt` rows with increasing delays then exactly one `dead_letter`; a handler failing twice then succeeding produces zero dead letters.
7. **Outbound client with rate limiting** — token bucket per platform *and* per route. · *Done when:* firing 50 sends at a stub allowing 5/s logs zero 429s and takes at least 10 s wall clock.
8. **Scheduler** — cron triggers with timezone and an explicit catch-up policy. · *Done when:* a job whose window elapsed while the process was down behaves per the configured policy (run-once or skip), and a DST spring-forward date fires exactly once.
9. **Handlers** — the actual commands / automations, as pure functions over envelopes. · *Done when:* each handler has a fixture-driven test asserting the exact outbound actions, with no network calls in the test run.
10. **Connections + secret handling** — OAuth install flow, encrypted credential storage, refresh-on-expiry. · *Done when:* reading a `connection` row straight from the database shows ciphertext, and an expired token triggers a refresh whose retried call succeeds.
11. **Observability + alerting** — correlation id per envelope, run metrics, alerts on dead-letter depth *and* on zero-runs. · *Done when:* one trigger yields end-to-end logs sharing a single correlation id, and a synthetic dead letter alerts the configured channel within 5 minutes.
12. **Ops surface** — replay-from-dead-letter script, `ops/runbook.md`, heartbeat job. · *Done when:* replaying a dead letter re-executes the handler and clears the row, and the heartbeat posts on schedule to the ops channel.
13. **Deploy** — always-on worker plus a single scheduler leader. · *Done when:* the deployed instance passes its health check, killing the process auto-restarts it, and scaling to two instances produces no duplicate scheduled runs.

## Pitfalls

- **Acking after the work** — Slack and Discord expect a response in ~3 seconds. Persist the envelope, ack, then process. Doing the work inside the request handler is the single most common failure here.
- **Assuming exactly-once delivery** — every platform is at-least-once. Without a unique `dedupe_key` a retried webhook posts the message twice. Idempotency is not an optimization.
- **Global rate limiters** — Discord and most large APIs limit *per route*, sometimes per guild. One shared bucket either throttles you needlessly or still gets you 429'd.
- **Parsed body breaks signatures** — signature verification needs the raw bytes. If a body-parser middleware runs first, every signature fails and the cause is invisible.
- **Cron duplicated by autoscaling** — two instances each running the scheduler double-fire everything. Use a leader lock or a dedicated scheduler process.
- **Naive timezones** — cron in UTC drifts against user-visible times twice a year. Store IANA timezone with the schedule, never a fixed offset.
- **Retry storms** — fixed-delay retries synchronize and hammer a recovering API. Always exponential, always jittered, always capped.
- **Silence read as health** — a bot that stopped receiving events looks identical to a quiet week. Alert on *absence* of runs, not just on errors.
- **Storing raw payloads forever** — inbound events carry PII. Set a retention window and strip fields you never read.
- **Scraping without a plan** — check ToS, set a real user agent, back off on 429/503, and expect selectors to break. Treat markup as a versioned external contract.

## Skills for the build phase

From `knowledge/skills-registry.md`:

| Skill | Use for |
|---|---|
| `/last30days` | Platform API changes — chat and social APIs deprecate faster than any docs cache. Check before pinning behavior. |
| `agent-browser` | Scrapers and any handler that turns a URL into text. |
| `playwright-cli` | Browser-driven automations and end-to-end tests of an install flow. |
| `find-skills` | Discovering a platform-specific skill before writing an SDK wrapper by hand. |
| `/humanizalo` | Only if the bot writes user-facing copy (social schedulers, digest posts). |

None of these are hard dependencies. If a skill is absent, fall back to this knowledge base plus `WebSearch`/`WebFetch`, note the fallback in one line, and keep building.

## See also

- `knowledge/runtime-tracks/ts-node.md` — default track: pins, scaffolding, worker and scheduler conventions
- `knowledge/runtime-tracks/python.md` — alternative track for scraping and data-shaped handlers
- `knowledge/capabilities/observability.md` — the capability this shape cannot ship without
- `knowledge/capabilities/deployment.md` — always-on worker vs. request-scoped function
- `knowledge/shapes/api-backend.md` — when the HTTP surface itself is the deliverable
- `knowledge/shapes/data-pipeline-analytics.md` — when the goal is modeling data, not reacting to events
- `knowledge/shapes/browser-extension.md` — when the automation needs the user's own logged-in browser tab
- `knowledge/stack-compatibility.md` — check queue/runtime/host combinations before committing
