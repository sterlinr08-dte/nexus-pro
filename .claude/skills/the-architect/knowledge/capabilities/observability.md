# Capability: Observability

> Being able to answer "what is it doing right now, why did that request fail, and what is it costing
> me" — without redeploying to add a log line.

Last verified: 2026-10-17

## When a project needs this

The day it has one real user. Before that, a terminal is your observability stack. Escalate when:

- "A customer says it's broken and I can't reproduce it" — you need error tracking with context.
- "It's slow sometimes" — you need latency percentiles, not averages, and traces.
- "We found out from Twitter" — you need uptime checks and alerting.
- "The bill was how much?" — you need cost attribution before the next cycle.
- It is headless: an API, a worker, a bot, a pipeline. There is no screen to look at. Logs and traces
  are the entire user interface.
- It calls an LLM. Spend, latency, and tool-call failure are invisible without instrumentation, and
  all three move without a deploy.

## Decision matrix

| Layer | What it answers | Default tool class | Day one? |
|---|---|---|---|
| **Structured logs** | "What happened in this request?" | Platform logs, or a hosted log store (Axiom, Better Stack, Datadog) once you need search across days | **Yes** |
| **Error tracking** | "What is broken, for whom, how often, since which deploy?" | Sentry | **Yes** |
| **Uptime checks** | "Is it up from outside my own network?" | Better Stack, Checkly, UptimeRobot | **Yes** |
| **Metrics** | "How many, how fast, what percentage failed — over time?" | Platform metrics first; Prometheus-compatible or a hosted backend when you outgrow them | Week two |
| **Tracing** | "Which of the eleven hops in this request was slow?" | OpenTelemetry to any compatible backend | When more than two services or a queue exists |
| **Product analytics** | "Did anyone use the feature?" | PostHog | When shipping features you might remove |
| **LLM observability** | "Tokens, latency, tool failures, output quality" | Langfuse, Braintrust, or the model provider's console | Day one, if the app calls a model |
| **Cost visibility** | "What drives the bill and is it moving?" | Provider budget alerts + a spend metric you emit yourself | **Yes** |
| **Session replay** | "What exactly did they click?" | PostHog, Sentry replay | Only for consumer UX debugging; sample it |

## Recommendation

**Day one, in this order: structured JSON logs with a request id, Sentry, an external uptime check on
the health endpoint, and a billing alert on every paid provider.** That is under an hour of work and
covers the failures that actually happen to a young product.

Add tracing the moment a request crosses a process boundary — a second service, a queue, a worker.
Before that, correlated logs give you most of the answer for none of the setup. Add metrics
dashboards when someone starts asking about trends rather than incidents.

For instrumentation, **emit OpenTelemetry**. It is the one decision here that is expensive to
reverse: vendor SDKs sprinkled through your handlers make switching backends a refactor, while an OTel
exporter makes it a config change. Choose the backend for price and ergonomics, not for lock-in.

Deviate when: your platform's built-in observability genuinely covers you (a small Cloudflare or Fly
deployment often does), or an enterprise buyer mandates their existing vendor — in which case point
your OTel exporter at it and move on.

## Structured logging

**Log objects, not sentences.** `Failed to process order 123` is unsearchable. A JSON line with
`event`, `order_id`, and `error` is queryable across a year.

Every log line carries:

| Field | Why |
|---|---|
| `timestamp`, `level`, `event` | `event` is a stable machine name like `payment.webhook.received` — never an interpolated sentence |
| `request_id` | Generated at the edge, propagated through services, queues, and jobs. The single most valuable field you will ever add |
| `user_id` / `organization_id` | Scopes an investigation to one customer instantly |
| `duration_ms` | On any line closing an operation |
| `error.type`, `error.message`, stack | On failures only |
| `release` / build SHA | Answers "did this start with the last deploy?" in one query |

Rules:

- **Never log secrets, tokens, full card numbers, or raw request bodies.** Maintain a redaction list
  in the logger itself, not in each call site. Assume anyone with repo access can read production logs.
- **Log levels mean something.** `error` = a human must look. `warn` = degraded but handled. `info` =
  a business event worth keeping. `debug` = off in production. If `error` fires routinely, nobody
  reads `error` anymore.
- **One line per meaningful event, not per line of code.** Log at boundaries: request in, request out,
  external call, job start, job end, state transition.
- **Log the request id back to the client** in a response header and in the user-facing error string.
  "Contact support with reference `req_abc`" turns a vague bug report into a one-query investigation.

## Error tracking, metrics, and tracing

**Error tracking.** Capture unhandled exceptions with release version, user id, request id, and
breadcrumbs. Configure three things people skip: **source maps or symbols uploaded per release** (or
stack traces are unreadable), **grouping rules** (or one noisy error buries everything), and
**alert routing** (a new error type notifies; a known one does not).

**Metrics — the four that matter for any request-serving system:**

| Metric | Watch |
|---|---|
| Request rate | Traffic shape, and traffic that suddenly is not there |
| Error rate | Percentage of 5xx, tracked per endpoint |
| Latency **p50 / p95 / p99** | Never the average — the average hides the users who are leaving |
| Saturation | Connection pool, queue depth, memory, worker concurrency |

Plus, for queues: **depth**, **oldest-message age**, and **dead-letter count**. A growing oldest-age is
the earliest reliable signal that a worker is silently wedged.

**Tracing.** One trace should span the inbound request, each database call, each external API call,
and any job it enqueues. Propagate trace context into job payloads — a trace that stops at the queue
boundary answers half the question. Sample aggressively in production (a low single-digit percentage
is plenty) but always keep traces for errors and for slow outliers.

## Uptime and alerting

Check from outside your infrastructure, on an interval you would tolerate as downtime. Point checks
at a **deep health endpoint** that verifies the database and queue connections, not one that only
proves the process is alive.

Alert design is where observability succeeds or fails:

- **Alert on symptoms, not causes.** "Error rate above 2% for five minutes" and "checkout p95 above
  three seconds" page someone. "CPU above 80%" does not — it is a dashboard line.
- **Every alert names an action.** If the runbook is "look at it and hope", it is a dashboard, not an
  alert. Link the runbook from the alert body.
- **Three tiers.** Page (wake a human) · Notify (a channel, business hours) · Record (dashboard only).
  Most things are tier three. Anything paging more than once a week without a real incident is
  miscalibrated — fix the threshold that day.
- **Alert on the absence of events too.** "Zero signups in six hours" and "the nightly job did not
  report" catch failures no error tracker will ever see.
- **Status page** once you have customers who would otherwise email you one at a time.

## LLM-specific observability

An LLM feature is a distributed system with a non-deterministic, metered dependency. Standard APM
does not see any of what matters. Instrument the model call itself.

| Signal | Record per call | Why it matters |
|---|---|---|
| **Token usage** | Input, output, cached-read and cache-write counts, model name | Input and output are priced differently and cache reads are cheaper — a single "total tokens" number hides your real cost driver |
| **Cost** | Computed per call and attributed to user, organization, and feature | Without attribution you know the bill but not who or what caused it |
| **Latency** | Time to first token *and* total duration, plus streaming status | TTFT is what the user feels; total duration is what your timeouts must respect |
| **Tool calls** | Tool name, argument validity, success/failure, retry count | Tool-call failure is the top cause of "the agent got stuck" — see `knowledge/capabilities/agent-loop.md` |
| **Stop reason** | Normal stop, max tokens, refusal (with its category), tool use, error | Silent truncation at a token ceiling looks like a model quality problem and is not; a refusal is a `200`, so count refusals per category or they never show up as errors |
| **Retries and fallbacks** | Rate-limit hits, overload responses, model fallbacks taken | A creeping retry rate is a capacity problem before it is an outage |
| **Eval scores** | Offline suite score per release; online sampled grading | The only defense against a prompt or model change quietly degrading output |
| **Full trace** | Prompt, tool calls, and final output linked as one tree | You cannot debug an agent from a single log line |

Practices:

- **Trace the whole run, not each call.** One trace per user turn, with model calls, retrieval, and
  tool invocations as spans. Multi-step agent behavior is incomprehensible any other way.
- **Redact before storing prompts.** They contain user data by definition. Store a hash plus redacted
  content unless you have consent and a retention policy.
- **Keep a golden eval set from day one** — twenty to fifty real inputs with known-good outputs. Run
  it in CI on every prompt or model change. Without it, prompt edits are pure superstition.
- **Alert on cost per user per day, not just total spend.** One looping agent can burn a month's
  budget in an afternoon, and total spend crosses its threshold too late.
- **Hard-cap spend in code**: per-request token ceilings, per-user daily budgets, and a global kill
  switch. Alerts tell you it happened; caps stop it. See `knowledge/capabilities/credit-metering.md`.
- **Never hand-maintain a model or price table in your own code or docs.** Invoke the bundled
  `claude-api` skill before writing any model ID, price, or API parameter, and read prices from the
  provider at runtime where possible.

## A plain cost model

Most surprise bills come from four line items. Know the shape of yours before the invoice teaches it
to you.

| Driver | What actually moves it | How to see it early |
|---|---|---|
| **Compute** | Invocation count × duration (serverless), or instance-hours (containers). A slow endpoint discovered by a crawler multiplies both | Alert on invocation count and p95 duration, not just spend |
| **Bandwidth / egress** | Images, video, and large JSON leaving the platform. Egress is the most commonly forgotten line on any cloud bill | Track bytes out per route; put a CDN in front of anything large |
| **Database** | Storage grows monotonically; connection count and read replicas are the step functions. Point-in-time backups are billed too | Alert on storage growth rate and connection saturation |
| **Third-party per-unit** | LLM tokens, email sends, SMS, image generation, search queries. These scale with *users doing the thing you built*, which is the point and the danger | Emit your own spend metric per provider per day, attributed by feature |

The habits, in order of value:

1. **Budget alerts on every paid provider, the day you add it.** At 50%, 80%, and 100% of expected
   monthly spend. This takes minutes and has saved more projects than any dashboard.
2. **Emit cost as a metric you own.** Do not rely on the vendor console — you cannot alert on it,
   correlate it, or attribute it. Write a `cost_usd` field on every metered event.
3. **Attribute by feature and by tenant.** "AI summaries cost $340 last month, 60% from three
   accounts" is a decision. "The bill is $900" is anxiety.
4. **Know your unit economics.** Cost per active user per month, and cost per unit of the thing you
   sell. If you cannot compute both, you cannot price the product.
5. **Cap before you scale.** Rate limits, payload size limits, per-user quotas, and token ceilings are
   cheaper than any alert and work while you sleep.
6. **Sample your own telemetry.** Observability tooling is itself usage-priced. Full-fidelity traces
   at volume can out-cost the application they observe.

## Data model additions

| Table | Holds |
|---|---|
| `usage_events` | Actor, organization, feature, units consumed, `cost_usd`, timestamp — the source of truth for attribution and, if you bill by usage, for invoices |
| `llm_calls` | Request id, trace id, model, token counts by type, latency, stop reason, tool-call outcomes, computed cost |
| `eval_runs` | Release, eval set version, score per case, aggregate — so a quality regression is visible per deploy |
| `incidents` (optional) | Started, detected, resolved, cause, customer impact — the input to every retrospective and to any future SLA |

Retention is a design decision: keep aggregates indefinitely, raw event rows for weeks to months.
Unbounded telemetry tables become your largest database cost within a year.

## Build steps this adds

1. **Structured logger with request id** — JSON output, redaction list, id generated at the edge and
   propagated into services and jobs. · *Done when:* one request id retrieves every line for that
   request including its background job, and a logged object containing a token shows the value
   redacted.
2. **Error tracking wired with release and user context** — SDK installed, source maps or symbols
   uploaded per deploy. · *Done when:* a test throws a deliberate error from a release-configured
   build, then queries the error tracker's **API** by event id and asserts the event is retrievable,
   that its release equals the build SHA, that the user id is present, and that the top frame of its
   stack resolves to a named symbol in project source rather than a minified name or a bare hex
   address — that symbol resolution is what "readable" means here. Asserted by reading the tracker's
   API rather than by a person seeing the event in the dashboard UI.
3. **Deep health endpoint** — verifies the database and queue, returns the build SHA. · *Done when:*
   stopping the database makes the endpoint return non-200 while the process is still running.
4. **External uptime check and alert routing** — check against the health endpoint from outside your
   infrastructure. · *Done when:* a deliberate outage delivers an alert to the routed destination and
   recovery delivers a resolution message, both asserted by reading the destination's API or a
   capture webhook rather than by a person seeing a notification.
5. **Core metrics dashboard** — request rate, error rate, p50/p95/p99 latency, queue depth.
   · *Done when:* a load generator issues a configured number of synthetic requests including a
   forced error burst, each of the four charts queried through the dashboard's API returns a
   non-empty series over that window, and the error-rate alert rule fires on the burst.
6. **Distributed tracing** — OTel exporter, context propagated across services and into job payloads.
   · *Done when:* one trace shows the inbound request, its database calls, its external calls, and
   the job it enqueued as a single tree.
7. **Provider budget alerts** — thresholds on every paid service, configured through each provider's
   API so the configuration is reproducible. · *Done when:* a script iterates the configured provider
   list, queries each provider's budget or alert API, asserts a threshold object exists with the
   configured value, and exits non-zero if any provider lacks one; and a forced test notification is
   received at the destination webhook and asserted on.
8. **LLM instrumentation** *(if the app calls a model)* — per-call tokens, cost, latency, stop reason,
   and tool outcomes written to `llm_calls` and to a trace. · *Done when:* seeded `llm_calls` rows
   across two features over a known window make the spend-per-feature query return the expected
   totals per feature, and a call that stopped at the token ceiling is distinguishable by its
   `stop_reason` from one that completed normally.
9. **Eval suite in CI** *(if the app calls a model)* — golden set scored on every prompt or model
   change. · *Done when:* a deliberately degraded prompt drops the score below threshold and fails
   the PR check.
10. **Runbook for the top three alerts** — checked into the repo, linked from each alert body.
    · *Done when:* a check asserts the set of alert names with a section in the runbook equals the set
    of rule names in the alerting configuration; every such section contains at least one fenced
    command block; and a fault-injection test that trips the top three alerts asserts each delivered
    alert body contains a link resolving to the matching runbook anchor.

## Post-build launch checklist

Not build steps — each one needs a human, a pager rotation, or a real incident, so none of them can
terminate inside an autonomous build. Write them into the blueprint with an owner each.

| Item | Why it cannot be a build gate | Start it |
|---|---|---|
| Confirm the release's error is visible in the error tracker's dashboard with source maps or symbols applied | Symbol upload and dashboard ingestion run on the vendor's infrastructure, on their schedule; the build can only assert what the API already returns | With step 2 |
| A dry run of each runbook by someone who did not build the system | The build can verify the runbook's structure and links; only a second person can prove it is *followable* | First week after launch |
| Confirm a page actually wakes the on-call human on their own phone | Depends on a device, a rotation, and a person acknowledging | Before the first night on call |
| Confirm someone reads the notify channel, and name the owner of each dashboard | Observability with no reader is false confidence, and ownership is a human agreement | Launch day |
| Recalibrate alert thresholds against real production traffic | Synthetic load does not produce the real distribution; thresholds set at build time are guesses | Two weeks of real traffic |
| Compare your emitted `cost_usd` against the first real invoice from each provider | The invoice arrives on the provider's cycle, not the build's | First billing cycle |
| Run one incident retrospective and file the gaps back as work | Requires an actual incident and the people who handled it | After the first tier-one alert |

## Pitfalls

- **Logging strings instead of objects.** You will not know what you needed until an incident, and by
  then the format is fixed. Structure from the first line.
- **No request id.** Every investigation becomes timestamp archaeology across services. This is the
  cheapest field with the highest payoff in the entire capability.
- **Averages instead of percentiles.** A 200ms average with a 4s p99 means your most valuable users
  are having the worst time and your dashboard says everything is fine.
- **Alerting on causes.** CPU, memory, and disk pages train people to ignore the pager. Alert on what
  users experience.
- **Secrets and PII in logs.** Logs are usually the least access-controlled data store you own.
  Redact centrally, and treat any secret that reached a log as burned.
- **Instrumenting only the happy path.** Timeouts, retries, and cancelled requests are where the
  interesting failures live; make sure they emit something.
- **Observability with no owner.** A dashboard nobody opens and alerts routed to a muted channel are
  worse than nothing — they create false confidence. Name the destination and confirm someone reads it.
- **Discovering cost after the invoice.** Every paid provider gets a budget alert the day it is added.
  This is a five-minute task that regularly saves four figures.
- **Unbounded telemetry retention.** Trace and event tables grow faster than your product does. Decide
  retention on day one, not when the storage bill arrives.

## See also

- `knowledge/capabilities/deployment.md` — health checks, deploy-time smoke tests, rollback triggers
- `knowledge/capabilities/testing.md` — the checks that run before deploy, versus the signals after it
- `knowledge/capabilities/ai-llm-integration.md` — where model calls are made and what to wrap them with
- `knowledge/capabilities/agent-loop.md` — tool-call failure modes and why traces must span a whole run
- `knowledge/capabilities/credit-metering.md` — turning `usage_events` into quotas, caps, and invoices
- `knowledge/shapes/api-backend.md` — why a headless service is unobservable without this
- `knowledge/skills-registry.md` — `claude-api` invocation form, mandatory before writing any model ID or price
