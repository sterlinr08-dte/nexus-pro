# Shape: Data Pipeline & Analytics

> Moving data out of the systems that produce it, reshaping it into something answerable, and putting the answers in front of a named human on a schedule.

Last verified: 2026-07-27

## Is this your project?

**Yes if:**
- The user says "pull data from X into Y", "nightly sync", "ETL", "ELT", "warehouse", "data mart".
- Numbers live in several systems and nobody trusts the total.
- Someone exports CSVs by hand and pastes them into a spreadsheet every Monday.
- The ask is a scheduled report, a daily KPI email, or charts embedded in a product for customers.
- The hard part is *correctness and freshness*, not screens.

**No if:**
- The deliverable is the dashboard UI and the data already sits in one clean database → `knowledge/shapes/internal-tool.md`. If both are in scope, build this shape first and pull the screens from there.
- It is one system reacting to another in real time ("when a payment lands, post to Slack") → `knowledge/shapes/automation-bot-integration.md`.
- The output is an HTTP surface other services query, not tables analysts read → `knowledge/shapes/api-backend.md`.
- Customers sign up, log in, and the charts are one tab of a subscription product → `knowledge/shapes/saas-webapp.md`. Analytics *inside* a product you also build is a SaaS feature; carve out this shape only if the modelling work is genuinely a separate deliverable with its own consumer.
- The batch job's output is generated images, video, or audio sold by the credit, not tables → `knowledge/shapes/generative-media-app.md`.
- The user wants to train, fine-tune, or serve an ML model. **The Architect has no shape for ML training or model serving.** Say so plainly, scope the blueprint to the data side only, and flag the model work as out of scope rather than improvising an architecture for it.

## Default runtime track

**Python** — see `knowledge/runtime-tracks/python.md`. Warehouse tooling, dataframe libraries,
connectors, and orchestrators all live here, and analysts can read the transform code.

Alternatives: `knowledge/runtime-tracks/ts-node.md` when this is a small pipeline inside an existing
JS product and a second language costs more than it saves — move to Python once the columnar work
gets real. `knowledge/runtime-tracks/go.md` for high-throughput ingestion with tight memory limits
and almost no transformation logic.

## Batch or streaming

Default to **batch**. Choose streaming only when a stated requirement forces it.

| Signal | Choose |
|---|---|
| Consumer looks at it in the morning / weekly | Batch, scheduled |
| SLA measured in hours | Batch, hourly |
| SLA measured in seconds, and a human or system acts on each event | Streaming |
| Late-arriving and corrected records are common | Batch — replay is trivial, stream reprocessing is not |
| Volume exceeds what one run can reprocess in its window | Streaming or micro-batch |

Streaming multiplies the operational surface: ordering, exactly-once semantics, windowing, replay, and a second failure mode per transform. Micro-batch on a short interval covers most "real time" asks. Never adopt streaming because the user said the word — ask what decision gets made faster because of it.

## Core capabilities

| Capability | Why this shape needs it | File |
|---|---|---|
| Database / warehouse | Storage layout, schemas, partitioning, the raw→staging→marts split | `knowledge/capabilities/database.md` |
| Observability | Freshness, volume, and failure alerting are the product, not extras | `knowledge/capabilities/observability.md` |
| Testing | Data quality checks gate every run | `knowledge/capabilities/testing.md` |
| Deployment | Scheduled workers, secrets, environment separation | `knowledge/capabilities/deployment.md` |
| API design | Source extraction is API consumption: pagination, rate limits, retries | `knowledge/capabilities/api-design.md` |
| Auth | Only when analytics are embedded per-customer — row scoping is an auth problem | `knowledge/capabilities/auth.md` |
| Enterprise readiness | PII handling, retention, audit trail, region residency | `knowledge/capabilities/enterprise-readiness.md` |

## Data model

Three zones. Never let a consumer read across the boundary.

| Zone | Contents | Rule |
|---|---|---|
| `raw` | Source payloads, append-only, untouched | Immutable. Never edit; only add. |
| `staging` | Typed, deduped, renamed, one row per source entity | Rebuildable from `raw` alone |
| `marts` | Business-grain tables the consumer queries | Rebuildable from `staging` alone |

Every raw row carries `_source`, `_extracted_at`, `_batch_id`, and the source's natural key. Tables the pipeline itself owns:

| Table | Purpose |
|---|---|
| `pipeline_run` | run id, dag, start/end, status, rows in/out |
| `pipeline_state` | per-source watermark (last successful cursor or timestamp) |
| `data_quality_result` | run id, check name, severity, pass/fail, offending row count |
| `schema_change_log` | source, column, change type, detected at |

Decide per dimension at design time whether history is kept (price, plan, territory usually need it) — not after someone asks "what plan were they on in March".

## Directory structure

Shown for the Python track; the shape holds regardless of language.

```
pipelines/
  sources/               # one module per source system — extraction only, no business logic
  transforms/staging/    # 1:1 with source entities: type, rename, dedupe
  transforms/marts/      # business grain: fct_*, dim_*
  quality/               # declarative checks: not_null, unique, accepted_values, referential
  orchestration/         # dag definitions, schedules, retry + alert policy
  state/                 # watermark read/write, run bookkeeping
migrations/              # warehouse schema, versioned and forward-only
scripts/                 # probe_sources, backfill, rebuild
docs/metrics.md          # every metric: definition, grain, owner, refresh SLA
docs/runbook.md          # what to do when the overnight run fails
tests/                   # unit tests on transforms with fixture data
```

## Build order

1. **Name the consumer and the questions** — write `docs/metrics.md` before any code. · *Done when:* every metric has a definition, grain, owner, and refresh SLA, and each maps to exactly one planned mart table.
2. **Source inventory and access** — read-only credentials per source, stored in the secret manager. · *Done when:* `scripts/probe_sources` prints row count and max updated-at for every source and exits 0 with no credentials in the repo.
3. **Warehouse bootstrap** — create `raw`, `staging`, `marts` schemas and the four operational tables via migration. · *Done when:* a fresh environment reaches the same schema by running migrations only, verified by a catalog query listing all three schemas.
4. **Landing extraction** — one source, full pull, written append-only to `raw` with all `_` metadata columns. · *Done when:* running the same window twice produces zero duplicate natural keys in `raw` and both runs appear in `pipeline_run`.
5. **Incremental extraction and watermarks** — cursor stored in `pipeline_state`, advanced only on success. · *Done when:* killing the job mid-run and rerunning yields the same row count as an uninterrupted run, and the watermark did not advance on the failed attempt.
6. **Staging transforms** — typed, renamed, deduped, one row per source entity. · *Done when:* dropping and rebuilding all of `staging` from `raw` produces identical row counts and checksums, with no manual steps.
7. **Quality checks as a gate** — declarative not-null / unique / accepted-values / referential checks writing to `data_quality_result`. · *Done when:* injecting a null into a required staging column fails the run with a non-zero exit and a named check in the results table.
8. **Marts** — the tables in `docs/metrics.md`, at the stated grain. · *Done when:* each metric returns from exactly one mart query, and two independently written queries for the headline number agree exactly.
9. **Orchestration** — dependency graph, schedule, retries with backoff, alert routing. · *Done when:* a forced failure in one task leaves downstream tasks unrun and posts an alert to the on-call channel within five minutes.
10. **Backfill and replay** — a bounded-window rerun path. · *Done when:* `scripts/backfill --from <date> --to <date>` reprocesses that window and final mart counts match a full rebuild from `raw`.
11. **Freshness and volume monitoring** — alert on stale sources and on row counts outside expected bounds. · *Done when:* a source held back past its SLA pages within one schedule interval, and a run delivering 10% of the usual volume triggers a warning.
12. **Schema evolution drill** — add a column upstream, drop a nullable one, rename a required one. · *Done when:* the first two complete with no code change and log to `schema_change_log`; the third fails at staging with a named error instead of silently nulling the mart.
13. **Serving layer** — the dashboard, scheduled report, or embedded charts the consumer actually opens. · *Done when:* an automated run renders or delivers the artifact end to end (page returns 200, or the scheduled job produces the file and the send API returns success), and a test asserts every headline figure on it equals the result of the direct mart query named in `docs/metrics.md` — same value, same grain, same timezone. Whether the consumer can find and read it without help belongs to the launch checklist below.
14. **Runbook and cost guard** — failure playbook plus a warehouse spend alert. · *Done when:* `docs/runbook.md` answers "the overnight run failed at 3am, what now" in concrete commands, and a spend threshold alert is live.

## Post-build launch checklist

The consumer is a person, and people cannot be asserted on. These are real and they are written down — they are just not build gates.

| Item | Why it cannot be a build gate | Start it |
|---|---|---|
| The named consumer from step 1 opens the serving layer unaided and finds the number they asked for | Requires that human, at their desk | The day step 13 lands |
| They confirm the number matches what they were computing by hand | This is the only real correctness check the pipeline gets | Same week — before the manual process is retired |
| On-call rota agreed and the alert channel actually watched | An organizational commitment | Before the first unattended overnight run |
| Retire the spreadsheet the pipeline replaced | Otherwise you now maintain two sources of truth, which is the failure mode this shape exists to end | Two weeks after both agree |

## Pitfalls

- **Transforming during extraction** — mixing business logic into the pull means a definition change forces a re-pull from a source that may no longer have the history. Land raw first, always.
- **Non-idempotent loads** — reruns that double-count are the most common data bug. Make every load append-with-dedupe-key or delete-window-then-insert, and test by running twice. Advance the watermark only after the load transaction commits, or a failed run silently loses a window.
- **Silent source schema drift** — a renamed upstream column that maps to null makes a dashboard wrong rather than broken. Fail loudly on missing required columns; log additions.
- **Timezones and "day"** — source day, warehouse day, and consumer day differ. Store UTC, convert once at the mart, record the business timezone in `docs/metrics.md`.
- **Deletes that never propagate** — incremental extraction usually sees only inserts and updates. Per source, pick tombstones, periodic full reconciliation, or documented drift.
- **Two definitions of one metric** — the fastest way to lose the consumer's trust. One metric, one mart, one owner.
- **PII by default** — extract columns on an allowlist, hash identifiers you only join on, set retention before the first production run.
- **No named consumer** — pipelines nobody reads still cost money and page people. If step 1 cannot name a human, stop.

## Skills for the build phase

- `ui-ux-pro-max` — palette, type scale, and chart styling when the serving layer is a real UI rather than a scheduled email.
- `frontend-design` — build-phase UI for the dashboard or embedded charts. Name it in the blueprint; do not invoke it during design.
- `/last30days` — current standing of a warehouse, orchestrator, or connector before committing.
- `find-skills` — look for a connector-specific skill before hand-rolling extraction.
- `pdf` — when the deliverable is a scheduled PDF report rather than a screen.

Invocation forms come from `knowledge/skills-registry.md`. None are hard dependencies — if a skill is absent, fall back to this knowledge base or `WebSearch`, note it in one line, and continue.

## See also

- `knowledge/runtime-tracks/python.md` — the default track: pinned versions, setup, commands.
- `knowledge/capabilities/database.md` — warehouse choice, partitioning, and schema strategy.
- `knowledge/capabilities/observability.md` — freshness, volume, and failure alerting.
- `knowledge/shapes/internal-tool.md` — when the dashboard, not the pipeline, is the deliverable.
- `knowledge/shapes/saas-webapp.md` — when the charts are one tab of a product customers pay for.
- `knowledge/shapes/automation-bot-integration.md` — when the job reacts to events rather than reshaping volumes on a schedule.
