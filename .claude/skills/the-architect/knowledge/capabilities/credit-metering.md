# Capability: Credit Metering

> Charging for work that costs you real money per unit — reserve before you dispatch, settle on success, refund on failure, and never let a balance go negative.

Last verified: 2026-07-27

## When a project needs this

- Every user action calls a paid provider: image/video/audio generation, LLM tokens, enrichment, transcription, scraping.
- The brief says "credits", "tokens", "packs", "pay as you go", "N generations per month", or "free tier".
- The unit of work takes longer than one HTTP request and can fail after you have already paid for it.
- An API is billed per call or per unit of work rather than per seat.
- Marginal cost per active user is non-trivial and a single abusive account could cost more than a month of revenue.

If none of these hold — cost per action is effectively zero — you do not need a ledger. Rate limits are enough.

## Decision matrix

| Option | Best for | Pros | Cons |
|---|---|---|---|
| **Prepaid credit ledger** | Generative media, agents, anything with real per-action cost | Cash up front, no bad debt, hard spend cap by construction, users already understand "credits" | Needs a ledger, holds, and a refund path; credit→cost mapping must be maintained |
| Post-paid usage metering | B2B APIs with signed contracts and known customers | No top-up friction, matches enterprise procurement | You carry runaway-usage risk, need invoicing and collections, disputes are manual |
| Included quota on a seat plan | SaaS where AI is one feature, not the product | One counter, reset monthly, almost no billing code | Breaks the moment one heavy user's provider cost exceeds their seat price |
| Rate limits only | Internal tools, closed betas | Zero billing code | Every abuse is a direct cash loss; not a business model |

## Recommendation

**Prepaid credits on an append-only ledger, reserved before dispatch.** It is the only model where the worst case is bounded: a user cannot spend money you have not already collected, and an abuse spike costs you nothing but capacity.

Deviate in exactly two cases: **included quota** when generation is a side feature of an otherwise ordinary subscription product, and **post-paid metering** when you are selling to companies with procurement and purchase orders.

Three pricing rules that keep the model solvent:

- A credit is **your** internal unit. Never map it 1:1 to a provider's token or second — provider pricing moves and you would be repricing your product every time it does.
- Price a credit against **worst-case** provider cost for that job kind, not average. Retries, upscales, and failed-then-retried jobs all land on you.
- Charge a whole number of credits per job kind, published in the UI before the user clicks. Fractional or post-hoc credit math destroys trust faster than a high price does.

## Data model additions

| Table | Key fields | Rules |
|---|---|---|
| `credit_ledger` | `account_id`, `delta` (signed integer), `kind`, `job_id`, `external_ref`, `idempotency_key` (unique), `created_at` | Append-only. No `UPDATE`, no `DELETE`, ever. `kind` ∈ `grant, purchase, hold, release, settle, refund, expiry, adjustment` |
| `accounts` | `balance_permanent`, `balance_expiring`, `expiring_resets_at` | Cached balances maintained **inside the same transaction** as the ledger insert. The ledger is the source of truth; these two columns are a lock target and a fast read |
| `jobs` | `account_id`, `kind`, `params`, `status`, `credits_held`, `provider_ref`, `provider_cost_cents`, `attempts`, `expires_at` | Status is a closed set: `queued → running → succeeded \| failed \| cancelled \| expired` |
| `provider_events` | `provider`, `external_event_id` (unique), `payload_hash`, `processed_at` | The idempotency table for every provider callback |
| `purchases` | `payment_ref` (unique), `credits_granted`, `granted_at` | One row per settled payment event — see `knowledge/capabilities/payments-rails.md` |

**Credits are integers.** Never floats — the rounding drift shows up as a balance that will not reach zero.

**Two balances, not lot tracking.** Plan credits expire at period end; purchased packs do not. Deduct from `balance_expiring` first, then `balance_permanent`. This gets you FIFO-by-expiry behaviour without per-lot bookkeeping.

## The reservation lifecycle

The single most important rule in this document: **reserve in the same transaction that creates the job, and enqueue only after that transaction commits.**

```
BEGIN
  SELECT ... FROM accounts WHERE id = :account FOR UPDATE   -- serializes this account
  if (balance_expiring + balance_permanent) < cost: ROLLBACK → HTTP 402, no job row
  INSERT credit_ledger (delta = -cost, kind = 'hold', job_id, idempotency_key)
  UPDATE accounts SET balance_... (expiring first)
  INSERT jobs (status = 'queued', credits_held = cost)
COMMIT
→ enqueue(job_id)
```

- **Success:** append `settle` with `delta = 0` (the hold already debited). If actual cost differs from the quote, append one `adjustment` row and state the policy in the UI.
- **Failure, timeout, cancellation, expiry:** append `refund` with `delta = +credits_held`, keyed on `job_id` so a second attempt is a no-op. One function, one call site per terminal state.
- **Retries:** a retry reuses the existing hold. Never reserve twice for one job, and never retry a job whose credits are already settled.
- **Stale holds:** a sweeper releases any hold whose job has no terminal state past `expires_at`. Without it, a crashed worker silently eats a customer's balance.

Charging *after* the provider returns is the classic mistake. Every abandoned, cancelled, or timed-out job then costs you money you never collected.

## Queue, worker, and provider callbacks

- **Queue:** a durable queue with at-least-once delivery and a visibility timeout. On a relational database, a `jobs` table claimed with a locking read that skips locked rows is enough until you outgrow it — one fewer service to operate. Move to a dedicated broker when queue depth or fan-out justifies it.
- **Worker:** separate process from the web tier. The web tier must never block on a provider. Claim → call provider → store `provider_ref` → mark `running`. Cap `attempts` and use exponential backoff with jitter; an uncapped retry loop against a paid API is an unmetered outflow.
- **Webhook vs polling — build both.** Treat the provider's webhook as an optimization and a reconciling poller as the guarantee. Webhooks get lost, arrive out of order, and arrive twice; a poller that sweeps `running` jobs older than a threshold is the thing that keeps a customer's balance honest when the webhook never lands.
- **Idempotency on the callback:** insert into `provider_events` under the unique constraint *first*, in the same transaction as the settle. Duplicate delivery then fails the insert and does nothing else.
- **Never trust the webhook body for the result.** Take it as "something changed", then fetch the job from the provider API. That removes ordering bugs entirely and makes forged payloads useless.

## Outputs, storage, and moderation

- **Copy the asset into your own bucket during finalize.** Provider URLs expire, often within a day; store one and your gallery is broken next week. Store only your storage key on the output row.
- **Presign both directions.** The browser uploads straight to the bucket and downloads via short-lived signed URLs. Streaming large files through the web tier is how you find your memory ceiling.
- **CDN in front of delivery**, with signed URLs whose TTL is short enough that a leaked link expires before it spreads. Public gallery assets get a separate, cacheable path.
- **Moderate the input before you reserve.** A blocked prompt or upload must cost zero credits and return `422` — never a held-then-refunded round trip.
- **Moderate the output before you deliver.** Provider filters are not your policy. A flagged output is stored, not served, and the credit policy for that case is documented in the UI before the user clicks generate.

## Build steps this adds

1. **Ledger and balances** — append-only table, cached balances, `reserve()`, `settle()`, `refund()`, each one transaction. · *Done when:* 20 concurrent `reserve()` calls against a balance of 5 produce exactly 5 successes, 15 `402`s, a final balance of 0, and no negative row.
2. **Single-writer discipline** — only the credits module writes `credit_ledger`. · *Done when:* a grep-based test fails the build if any other module inserts into the ledger; a second `refund()` for the same `job_id` is a proven no-op.
3. **Idempotency keys on every mutation** — client-supplied on job create, provider-supplied on callbacks. · *Done when:* replaying the same key returns the original response and writes zero additional rows.
4. **Job create endpoint** — WHEN a user submits work THE SYSTEM SHALL reserve credits and return `202` with a job id in one transaction, or return `402` and write no job row. · *Done when:* both branches are tested and the `402` path leaves the ledger byte-identical.
5. **Worker claim loop** — locking read that skips locked rows, capped attempts, backoff with jitter. · *Done when:* two workers started simultaneously against 50 queued jobs produce exactly 50 provider calls and zero duplicates.
6. **Callback path: webhook + poller** — both terminate through one `finalize(job)` function. · *Done when:* replaying a webhook three times yields one output row and one settle; with webhooks disabled entirely, a completed job still finalizes via the poller within its stated interval.
7. **Failure and refund path** — provider error, timeout, and user cancellation all route to `refund()`. · *Done when:* forcing the adapter to throw leaves the job `failed` and restores the pre-submit balance exactly.
8. **Sweeper** — expires jobs past `expires_at`, releases orphaned holds, alerts on both. · *Done when:* a job stuck in `running` past its TTL is marked `expired` and refunded within one sweeper run, and the release fires a warning-level log.
9. **Moderation gates** — input before reserve, output before delivery. · *Done when:* a known-bad input fixture returns `422` with zero ledger rows written; a flagged output is retained but never served by the delivery endpoint.
10. **Margin telemetry** — provider cost cents recorded per job next to credits charged. · *Done when:* a dashboard reports gross margin per job kind on seeded data and alerts when any kind goes negative.

## Pitfalls

- **Charging after the work completes.** You pay for every abandoned job. Reserve inside the job-create transaction or the model does not hold.
- **A mutable balance column as the source of truth.** Keep the append-only ledger authoritative and reconcile the cached balance nightly; drift means a bug you can still trace instead of money you cannot explain.
- **No row lock on the account.** Two concurrent requests both read a balance of 1 and both succeed. Lock the account row, or use a check constraint that forbids a negative balance and map the violation to `402`.
- **Refunding a settled job.** Key refunds on `job_id` and make the second call a no-op, or a retry loop becomes a credit printer.
- **Fractional credits.** Integers only. Fractions produce balances that never hit zero and support tickets you cannot close.
- **Free tier with no identity or throttle.** Anonymous free credits are farmed within a week. Bind credits to an account, throttle signups, and cap concurrency per account.
- **One provider hardcoded across the codebase.** Prices and quality move monthly. One adapter interface — `submit`, `poll`, `cancel`, `estimateCost` — is cheap on day one and impossible to retrofit later.
- **No cost telemetry.** Without provider cost next to credits charged from step one, you cannot tell a popular feature from an unprofitable one.

## See also

- `knowledge/capabilities/payments-rails.md` — turning money into credit grants idempotently
- `knowledge/capabilities/database.md` — transactional modelling, locking, and migrations for the ledger
- `knowledge/capabilities/observability.md` — queue depth, p95 job duration, cost-vs-charged dashboards
- `knowledge/capabilities/ai-llm-integration.md` — provider adapters, prompt construction, moderation calls
- `knowledge/shapes/generative-media-app.md` — the shape this capability was extracted from
- `knowledge/shapes/agent-app.md` — metering a reasoning loop rather than a render
- `knowledge/shapes/api-backend.md` — metering an API billed per call
