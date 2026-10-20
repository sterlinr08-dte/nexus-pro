# Shape: Generative Media App

> A credit-metered async generation pipeline with a niche costume on top — headshots, product photos, UGC ad reels, faceless video, voice clones, music, 3D. Built by solo founders and small teams monetizing a model they did not train.

Last verified: 2026-07-27

## Is this your project?

**Yes if:**
- The user says "it turns X into Y" where Y is an image, video, audio clip, or 3D mesh
- Each action costs real money at a provider, so the product sells credits, packs, or a metered plan
- Generation takes 5 seconds to 20 minutes — too long for one HTTP request, and the user uploads something first (a face, a product shot, a voice sample, a script)

**No if:**
- The model reasons, plans, and calls tools in a loop and text is the output → `knowledge/shapes/agent-app.md`
- Generation is one feature inside a larger product with its own core domain → `knowledge/shapes/saas-webapp.md`
- There is no interactive product — it is a scheduled batch that lands in a warehouse → `knowledge/shapes/data-pipeline-analytics.md`
- The generated media is marketing for a catalog with a cart and fulfillment → `knowledge/shapes/ecommerce-storefront.md`
- The generation is a feature of a phone app whose hard parts are camera capture, push, and offline behaviour → `knowledge/shapes/mobile-app.md`. Compose instead when the phone is only the client: design the phone as that shape and this pipeline as its backend — the credit ledger and worker tier stay here, and store IAP replaces web checkout in step 12.

## Default runtime track

**TypeScript/Node** — see `knowledge/runtime-tracks/ts-node.md`. One language across the upload UI, the job API, and the worker; every provider ships a first-class JS SDK; serverless-plus-queue deploys cleanly.

Alternatives: `knowledge/runtime-tracks/python.md` when you run your own inference (self-hosted diffusion, fine-tuning, ffmpeg-heavy pipelines) instead of calling a hosted provider; `knowledge/runtime-tracks/go.md` when the worker mostly shuttles large files on long video jobs; `knowledge/runtime-tracks/mobile-native.md` only as a *client* on top of this backend.

## Core capabilities

| Capability | Why this shape needs it | File |
|---|---|---|
| Credit metering | The entire business model. Reserve before dispatch, settle on success, refund on failure | `knowledge/capabilities/credit-metering.md` |
| Payments | Credit packs, subscriptions with monthly refill, and the top-up webhook | `knowledge/capabilities/payments-rails.md` |
| Auth | Credits belong to an identity; anonymous free tiers get farmed within a week | `knowledge/capabilities/auth.md` |
| Database | Jobs, ledger, assets, outputs — all relational, all transactional | `knowledge/capabilities/database.md` |
| API design | Async job resource: create returns `202` + job id, never the finished asset | `knowledge/capabilities/api-design.md` |
| AI/LLM integration | Prompt construction, provider adapters, moderation calls | `knowledge/capabilities/ai-llm-integration.md` |
| Observability | Cost per generation vs price charged is the only number that matters | `knowledge/capabilities/observability.md` |
| Frontend architecture | Upload, live job state, gallery — optimistic UI over a slow backend | `knowledge/capabilities/frontend-architecture.md` |
| Deployment | Web tier plus a worker tier plus a queue; not a single serverless bundle | `knowledge/capabilities/deployment.md` |
| Testing | Provider adapters and the ledger are where money leaks silently — contract tests both | `knowledge/capabilities/testing.md` |

### Niche knobs — one pipeline, different settings

| Niche | Training step? | Input assets | Typical job time | Extra weight |
|---|---|---|---|---|
| Headshot / avatar generator | Yes — per-user fine-tune, then N inferences | 10-20 selfies | Minutes to train, seconds each | Likeness consent, deletion |
| Product photography | No | 1-3 product shots + background prompt | Seconds | Brand-safety on output |
| UGC ad factory | Sometimes (avatar identity) | Script + avatar + product | Minutes | Multi-step chain, per-scene retries |
| Faceless video | No | Script, stock/generated b-roll, TTS | Several minutes | Render/stitch stage, large files |
| Voice cloning | Yes — voice enrollment | 30-120s of clean audio | Seconds per line | Consent proof is legally load-bearing |
| Music generation | No | Prompt, optional reference | Tens of seconds | Licensing terms in the UI |
| 3D / mesh | No | Single image or multi-view | Minutes | Huge outputs, viewer in the browser |

Never design these as separate systems — they are the same rows with different values. What actually changes: `job.kind`, credit cost per kind, whether a `training_runs` row precedes inference, output MIME and size class, moderation strictness. Nothing else.

## Data model

| Entity | Key fields | Relationships |
|---|---|---|
| `users` | identity, plan, signup ip/fingerprint | 1-N everything |
| `credit_ledger` | delta, reason, job_id, idempotency_key, created_at | Append-only. Balance = SUM(delta). Never store a mutable balance column as the source of truth |
| `assets` | owner, storage_key, kind, bytes, content_type, moderation_status | Uploaded inputs |
| `presets` | slug, prompt template, credit cost, provider + model handle | The niche's menu |
| `training_runs` | owner, status, provider_ref, model handle | Fine-tune niches only; N inferences point back at one |
| `jobs` | owner, kind, preset, input asset ids, params, status, provider_ref, credits_reserved, cost_cents, attempts, expires_at | The spine |
| `outputs` | job_id, storage_key, mime, width/height/duration, moderation_status, is_public | N per job |
| `provider_events` | provider, external_id, payload_hash, processed_at | Webhook idempotency table |
| `purchases` | provider ref, credits_granted, event_id | One row per settled payment event |

Job status is a closed set: `queued → running → succeeded | failed | cancelled | expired`. Refund fires on the last three, exactly once, keyed by `job_id`.

## Directory structure

Shown for the TypeScript track; mirror the layout in any other track.

```
src/
  app/
    (marketing)/            # landing, pricing, public gallery
    (app)/                  # create/ (the product), jobs/[id]/, library/, billing/
    api/
      uploads/sign/         # presigned PUT — server signs, browser uploads
      jobs/                 # POST create (202), GET status
      webhooks/             # provider/ and payments/ — both idempotent
  worker/                   # dispatch (claim, call provider), finalize (copy, moderate, settle), sweeper
  lib/
    providers/              # one adapter per provider, ONE shared interface
    credits/                # reserve / settle / refund — the only ledger writers
    moderation/             # input gate + output gate
    storage/                # presign, copy, signed delivery URLs
```

## Build order

1. **Scaffold + auth** — project from the runtime track, session-gated app route group. · *Done when:* an unauthenticated request to `/create` redirects to sign-in; a signed-in request renders the user's own identity server-side.
2. **Credit ledger first, before anything generates** — append-only table plus `reserve()`, `settle()`, `refund()`, each one transaction. · *Done when:* the ledger test suite passes, including two concurrent `reserve()` calls against a 1-credit balance where exactly one succeeds and the balance never goes negative.
3. **Object storage + direct upload** — server issues a presigned PUT, the browser uploads straight to the bucket. · *Done when:* a 20 MB upload creates an `assets` row with correct `bytes` and `content_type`, and no request body larger than 1 KB reaches the app server.
4. **Input moderation gate** — classify every uploaded asset and every prompt before it can be referenced by a job. · *Done when:* a known-bad fixture is rejected with `422`, the asset is marked `blocked`, and no credits were reserved.
5. **Job create endpoint** — WHEN a user submits a generation request THE SYSTEM SHALL reserve credits and return `202` with a job id inside one transaction, or return `402` and write no job row. · *Done when:* both branches are covered by tests and a `402` leaves the ledger untouched.
6. **Provider adapter + contract test** — one `GenerationProvider` interface (`submit`, `poll`, `cancel`, `estimateCost`), one concrete implementation. · *Done when:* the shared contract test passes against a recorded fixture and against a live sandbox key.
7. **Worker dispatch** — claim `queued` jobs with a locking read, call the provider, store `provider_ref`, move to `running`. · *Done when:* two worker processes started simultaneously against 50 queued jobs produce exactly 50 provider calls, zero duplicates.
8. **Webhook receiver (or poller) + finalize** — idempotent on the provider's external event id via `provider_events`. · *Done when:* replaying the same payload three times yields exactly one `outputs` row and exactly one settle entry in the ledger.
9. **Failure and refund path** — provider error, timeout, and cancellation all route to one refund function. · *Done when:* forcing the adapter to throw leaves the job `failed` and restores the pre-submit balance exactly, and a second refund attempt is a no-op.
10. **Output moderation + own-bucket delivery** — copy the provider's asset into your storage, classify it, serve via short-lived signed URLs. · *Done when:* a delivered URL 403s after its TTL, and no provider-hosted URL is stored on the `outputs` row.
11. **Generation UI** — form, optimistic job card, live status, library grid. · *Done when:* submitting renders a pending card in under 300 ms and it becomes the finished asset with no manual refresh.
12. **Billing** — credit packs plus a plan that refills monthly, granted from the payment webhook. · *Done when:* a test-mode checkout grants exactly the advertised credits, and replaying that event grants zero additional credits.
13. **Sweeper + cost dashboard** — cron expires jobs past `expires_at`; a dashboard shows queue depth, p95 job duration, failure rate, and provider cost vs credits charged. · *Done when:* a job stuck in `running` past its TTL is marked `expired` and refunded by the sweeper, and all four metrics report non-zero on seeded data.
14. **Abuse limits + launch pass** — per-user concurrency cap, signup throttle, consent copy for likeness and voice, account deletion that purges bucket objects. · *Done when:* a free user's 4th concurrent job returns `429` while the 3rd succeeds, and deleting an account removes its storage objects within one sweeper run.

## Pitfalls

- **Charging after dispatch.** Reserve credits in the same transaction that writes the job row. Charge on success and you will pay for every job a user abandons mid-flight.
- **Non-idempotent webhooks.** Providers retry. Without a `provider_events` uniqueness check you will double-settle, double-grant credits, or double-store outputs.
- **Synchronous generation.** A request that waits for the model dies at the platform's request timeout, usually right after you paid for the job. Always `202` plus a job resource.
- **Storing the provider's asset URL.** Those URLs expire, often within 24 hours. Copy to your own bucket in finalize, or your gallery is a wall of broken images next week.
- **Proxying file bytes.** Presign both directions; streaming a 500 MB render through the web tier is how you find your memory ceiling.
- **One provider hardcoded everywhere.** Prices and quality shift monthly. The adapter interface is cheap on day one and impossible to retrofit on day ninety.
- **Unbounded retries.** Cap `attempts`, and never retry a job whose credits were already settled. A retry loop against a paid API is an unmetered outflow.
- **No cost telemetry.** Log provider cost per job next to credits charged from step one, or you cannot tell a popular feature from an unprofitable one.
- **Likeness and voice with no consent record.** Store a timestamped consent row for any upload of a real person's face or voice, and honor deletion for the trained artifact too, not just the source files.

## Skills for the build phase

See `knowledge/skills-registry.md` for the full roster. For this shape:

- `ui-ux-pro-max` — the visual system. Output galleries live or die on grid, aspect-ratio handling, and loading states.
- `frontend-design` — the create form and result view during the build phase.
- `emil-design-eng` — pending-to-done transitions. This app is mostly waiting; the waiting must feel deliberate.
- `playwright-cli` — E2E the full path: upload, submit, webhook, delivered asset.
- `/last30days` — current standing of generation providers before you commit to an adapter; pricing and quality move fast.

If a skill is unavailable, fall back to this knowledge base plus `WebSearch`/`WebFetch`, note the substitution in one line, and continue. Never block the build on a missing skill.

## See also

- `knowledge/runtime-tracks/ts-node.md` — pinned versions and scaffolding for the default track
- `knowledge/capabilities/credit-metering.md` — the ledger, reservation semantics, and refund rules in full
- `knowledge/capabilities/payments-rails.md` — turning money into credits idempotently, plus the provider-cost vs credits-charged view in `knowledge/capabilities/observability.md`
- `knowledge/shapes/agent-app.md` — when the loop reasons and the output is text or tool calls
- `knowledge/shapes/saas-webapp.md` — when generation is a feature, not the product
- `knowledge/shapes/mobile-app.md` — the usual client on top of this backend; store IAP and offline job state live there
- `knowledge/stack-compatibility.md` — known-bad combinations to rule out before you commit
