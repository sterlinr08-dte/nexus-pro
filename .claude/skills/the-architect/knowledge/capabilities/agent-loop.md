# Capability: Agent Loop

> The execution engine for an agent that acts: model proposes a tool call, you run it, you feed the result back — plus everything that makes that loop survive a crash, a deploy, a retry, and a human saying "no".

Last verified: 2026-10-17

The loop itself is fifteen lines. Everything expensive is around it: persistence, idempotency, budgets, approvals, cancellation, and traces. Design those first — retrofitting durability into a loop that kept its state in a local variable is a rewrite.

For provider mechanics — streaming, structured output, caching, cost — see `knowledge/capabilities/ai-llm-integration.md`. This file assumes that gateway exists.

## When a project needs this

- The model calls tools, hits APIs, or writes to your data on the user's behalf.
- Work is described in minutes or hours, not seconds: "it researches", "it migrates", "it processes the whole inbox".
- A step is irreversible — sends email, charges money, posts publicly, deletes records — so somebody wants to approve it first.
- The brief mentions "multi-agent", "planner", "sub-agents", or a workflow diagram with boxes.
- Not needed for a single request-and-answer chat with no tools. Do not build this for a summarize button.

## Decision matrix

| Option | Best for | Pros | Cons |
|---|---|---|---|
| **In-process loop** — a `while` in the request handler | Tool-using chat that finishes in seconds | Trivial to write and debug; no infrastructure | Dies with the request; a deploy kills active runs; nothing to resume, nothing to inspect |
| **Queue-backed worker with persisted steps** | The default for real agent work | Survives restarts and deploys; resumable; steps are inspectable rows; scales by adding workers | You own retries, idempotency, and step-boundary discipline |
| **Durable execution engine** (Temporal, Restate, Inngest, DBOS, Step Functions, Cloudflare Workflows) | Long-horizon runs, fan-out, waits measured in days, compensations | Durability, retries, timers, and replay are the platform's job; runs resume exactly where they stopped | Real learning curve; determinism constraints on replayed code; an operational dependency |
| **In-memory agent framework graph** (graph- and crew-style orchestration libraries) | Prototypes and demos | Fastest path to something impressive | State lives in process memory. See below |

## Recommendation

**Queue-backed worker with a persisted step table.** Every step is written to the database *before* it executes and updated after. That single discipline gives you resumption, retry safety, an audit trail, a UI, and debuggability — for a schema and a worker process.

Start the loop in-process if the whole run reliably finishes inside a request, but put it behind the same `runs`/`steps` tables from day one so promoting it to a worker is a deployment change, not a rewrite.

**Adopt a durable execution engine when** runs wait on external events for hours or days, fan out across many parallel branches, need compensating actions on failure, or when you find yourself building timers, dead-letter queues, and replay-from-step by hand. That is the moment to buy instead of build.

**On in-memory multi-agent graphs: be honest with the user.** They demo beautifully and break in production, predictably:

- Run state is a variable in one process. A deploy, an OOM kill, or a rolling restart loses it, and there is nothing to resume from.
- Retries re-execute side effects, because the framework retries a *node*, not an idempotent operation.
- Agents talking to agents multiply token cost roughly with the square of the chatter, and the cost is invisible until the bill.
- When a customer asks what the agent did at 03:00, you have logs, not a transcript with arguments and results.
- Debugging happens inside someone else's control flow, at exactly the moment you most need to understand yours.

Use a framework for the *prompt-and-tool ergonomics* if you like it, but make its unit of work one durable step that you persist. Durable execution is what makes multi-agent work at scale — not a nicer graph API.

## The loop, and its invariants

```
load run + history
loop:
  budget check (steps, wall clock, tokens, cost)  -> exceed = terminate, status budget_exceeded
  call model with history + tool schemas          -> persist raw response blocks verbatim (incl. thinking)
  no tool calls?                                  -> terminate, status succeeded
  for each tool call:
    validate args against schema                  -> invalid = return error result to model, continue
    approval required?                            -> persist, status awaiting_approval, RETURN
    write tool_call row WITH idempotency key      -> BEFORE executing
    execute with per-tool timeout
    persist result (or error, or timeout) as a tool result the model can read
  append results to the END of history, repeat
```

Six invariants, all non-negotiable:

1. **Persist before executing.** The row that says "I am about to send this email" is written and committed first. Otherwise a crash mid-call leaves you unable to tell whether it happened.
2. **Tool failures are results, not exceptions.** A timeout, a `404`, a validation error — all return to the model as a tool result. Throwing through the loop kills a run the model could have recovered from.
3. **Every side-effecting tool carries an idempotency key**, generated from run id + step index + tool + a hash of the arguments, written before execution and honored by the downstream API. Retries are guaranteed; duplicates must not be.
4. **The loop terminates on budget, always.** The model does not get to decide when to stop.
5. **Status is a column, never inferred** from the presence of rows: `queued → running → awaiting_approval → succeeded | failed | cancelled | budget_exceeded`.
6. **Replay history byte-faithfully.** With tool results, the provider requires the assistant's thinking blocks back complete and unmodified. Persist the raw provider response content blocks — thinking included — as the replay source, encrypted at rest. History is append-only: redact the trace/display copy, never the replay copy, and bound context with the provider's server-side compaction or context editing instead of rewriting earlier turns. The unredacted replay copy exists only while the run can resume: purge or crypto-shred it when the run reaches a terminal state (or after a stated retention window), include it in deletion requests, let only the loop worker decrypt it, and keep its keys in a KMS, never next to the data. Confirm the mechanics with `claude-api`.

## Data model additions

| Entity | Holds |
|---|---|
| `runs` | input, mode, status, budgets, totals (steps, tokens, cost), started/ended, cancel_requested |
| `steps` | run id, ordinal, kind (`model` / `tool` / `approval`), state, attempt, input, output, error |
| `tool_calls` | step id, tool name, validated args, idempotency key, result, error, duration |
| `approvals` | tool_call id, requester, approver, decision, args_hash, expires_at, decided_at |
| `traces` | run + step, model id, latency, tokens in/out/cached, cost |

`args_hash` on `approvals` is not optional: on resume, re-hash the pending arguments and compare. Otherwise anything that mutates the pending call between request and approval gets executed under a human's signature.

Where the shape already defines `runs` and `steps` — see `knowledge/shapes/agent-app.md` — this is the same tables, not a second set.

## Budgets, timeouts, cancellation

**Budgets.** Every run carries hard caps: max steps, max wall-clock, max total tokens, max cost, and max calls per individual tool. Check them at the top of every iteration. Exceeding a budget is a *terminal status with a reason*, surfaced to the user — never a silent stop and never an infinite loop. Set the caps from the run's own configuration so an expensive run type can be allowed a bigger budget without a code change.

**Timeouts.** Three distinct levels, and they are not the same number: per-tool (seconds to a minute, tuned per tool), per-model-call (from the gateway), per-run (the wall-clock budget). A tool timeout must produce a `timed out` tool result the model can react to. A run timeout terminates the run.

**Cancellation.** Cooperative and durable: the user sets `cancel_requested` on the row; the worker checks it at every step boundary and passes an abort signal into in-flight model and tool calls. It must survive a worker restart — a cancel that only lives in memory is not a cancel. Cancellation always lands on a terminal status with the partial output preserved; a run stuck in `running` forever is the most common production bug in this whole capability. Ship a sweeper that fails runs whose heartbeat has gone stale.

## Human-in-the-loop approval

Gate a tool when it spends money, sends external communication, deletes or overwrites data, changes permissions, or touches production infrastructure. Everything else runs unattended — approval fatigue destroys the value of approval.

- Approval is a **server-side property of the tool**, not a UI affordance. A client that skips the dialog must still be blocked.
- The pause is durable: the worker persists `awaiting_approval` and *returns*. It does not hold a connection open waiting for a human.
- Show the approver the exact arguments, and re-verify `args_hash` on resume.
- Approvals expire. An unanswered gate after its window terminates the run rather than hanging forever.
- Record who decided, when, and why — this is the audit trail an enterprise buyer will ask for. See `knowledge/capabilities/enterprise-readiness.md`.
- Reject must be as easy as approve, and a rejection is a *tool result* fed back to the model ("the human declined"), so the agent can adapt instead of dying.

## Observability

Traces are the debugger. Without them, every incident is guesswork.

- One trace per run, one span per step, with model id, prompt version, latency, tokens, and cost on every span.
- The full transcript — messages, tool arguments, tool results — must be replayable from the database. Keep two copies: the encrypted, verbatim replay copy (invariant 6) and a trace/display copy with secrets redacted on write. Never redact or truncate the replay copy; its retention and access rules are invariant 6.
- Dashboards that earn their place: run success rate, p95 steps per run, p95 wall clock, cost per successful run, tool error rate by tool, approval wait time, and stuck-run count.
- Alert on runs in `running` past their wall-clock budget and on any single tool's error rate spiking — those two catch most real failures.

Details in `knowledge/capabilities/observability.md`.

## Build steps this adds

1. **Run and step schema** — migrations for runs, steps, tool_calls, approvals, with the status enum. · *Done when:* migrations apply and roll back on a clean database; a seed inserts one run with three steps and a query returns them in ordinal order.
2. **Tool registry** — one file per tool: schema, handler, timeout, approval flag, and whether it is side-effecting. · *Done when:* a tool invoked with invalid arguments returns a structured validation error to the model instead of throwing, covered by a test.
3. **Loop executor** — persist-then-execute, tool errors as results, budget check per iteration. · *Done when:* a test with a tool that always fails ends the run with a terminal status and a step-by-step record, and never exceeds the step cap.
4. **Durable worker** — queue-backed, heartbeating, picks up `queued` runs. · *Done when:* killing the worker mid-run and restarting resumes from the last committed step, with a test asserting exactly one side-effect row.
5. **Idempotency** — key written before execution, honored on retry. · *Done when:* forcing a retry of a side-effecting tool produces one downstream effect and two attempt records.
6. **Approval gates** — durable pause, notify, resume, expiry, args re-verification. · *Done when:* WHEN a run reaches an approval-gated tool THE SYSTEM SHALL set status `awaiting_approval`, notify the approver, and resume on approve or terminate on reject — surviving a process restart; and a mutated argument after request is rejected on resume.
7. **Cancellation and stuck-run sweeper** — cancel flag, abort propagation, heartbeat timeout. · *Done when:* cancelling a running run reaches a terminal status within one step boundary, and a run whose worker was killed without cleanup is failed by the sweeper within its timeout.
8. **Run timeline UI** — every step with arguments, result, error, and cost, plus an approval inbox. · *Done when:* an E2E test loads a seeded run by id and asserts the rendered timeline contains exactly one row per persisted step, each carrying its arguments, result, error, and token cost, and that no request captured during that page load queries the database directly.
9. **Load and cost check** — concurrent runs under realistic fan-out. · *Done when:* a soak of concurrent runs completes with no duplicate side effects, no stuck runs, and measured cost per successful run recorded as a baseline.

## Pitfalls

- **Running the loop on the HTTP request lifetime.** Serverless timeouts and load-balancer idle limits kill long runs. Queue-backed worker from day one.
- **Letting the model decide when to stop with no cap.** Loops that reconsider their own plan can run until the budget is your entire month.
- **Non-idempotent side effects.** The email sends twice. It always sends twice eventually.
- **Approval enforced only in the UI.** The first API client bypasses it.
- **Reflection and self-critique loops added by reflex.** They multiply cost and frequently make output worse. Add one only when an eval shows it helps — see `knowledge/capabilities/testing.md`.
- **A dozen tools with overlapping descriptions.** Selection accuracy collapses. Fewer, sharply described tools beat a large registry; split into sub-agents with narrow toolsets before growing one flat list.
- **Trusting tool output.** Tool results and retrieved documents are attacker-controlled text. An instruction inside a result must never trigger a gated tool.
- **Retry storms.** Backoff with jitter, cap attempts, dead-letter the rest. Retrying every failed step immediately turns a provider blip into an outage.
- **Non-deterministic code inside a durable engine's replayed path.** Wall-clock reads, random values, and direct network calls in replayed code produce impossible-to-reproduce bugs. Keep them in activities, not in workflow code.
- **Secrets in persisted tool arguments.** Traces are read by support staff. Redact the trace copy at write time; the replay copy stays verbatim, encrypted, off support's screens, and shredded once the run is terminal (invariant 6).
- **Editing history before replay.** Redacting, truncating, or reordering earlier turns corrupts the thinking blocks the provider expects back unchanged — the next call errors or silently loses its reasoning.
- **No stuck-run detection.** Runs quietly wedged in `running` are invisible until a customer asks; the sweeper is not optional.

## See also

- `knowledge/capabilities/ai-llm-integration.md` — the gateway this loop calls, plus structured output and cost accounting
- `knowledge/capabilities/observability.md` — traces, spans, and the run dashboards
- `knowledge/capabilities/credit-metering.md` — turning run cost into quotas and billing
- `knowledge/capabilities/enterprise-readiness.md` — audit trails, approval records, retention
- `knowledge/shapes/agent-app.md` — the shape that owns this loop end to end
- `knowledge/shapes/automation-bot-integration.md` — when the "agent" is really a scheduled integration and this is overkill
