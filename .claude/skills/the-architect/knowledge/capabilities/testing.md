# Capability: Testing

> Proof that a build step is finished. The test suite and the build order are the same artifact
> viewed twice — a step's *Verify* command is almost always a test command.

Last verified: 2026-07-27

## When a project needs this

Always, at some level. What changes is how much. Decide from stage and blast radius, not from taste:

- **Prototype / demo** — a build check and one smoke path. Tests written now describe a design that
  will not survive the week.
- **First paying user** — the money path, the auth path, and the destructive path get real coverage.
- **Multiple contributors** — the suite is the contract between people who no longer read each
  other's diffs.
- **Headless service, no UI to eyeball** — contract tests are the *only* evidence it works.
- **Regulated, financial, or irreversible actions** — coverage is not optional; write the test first.

Trigger phrases from the interview: "customers will pay through this", "it deletes things",
"another team will call this API", "we ship on Fridays", "last time we broke checkout."

## The build order *is* the test plan

Every build step in a blueprint carries an observable *Done when*. Read them back and the test plan is
written — each condition names a fact about the system that some command must assert.

| Build step *Done when* | Becomes |
|---|---|
| "a revoked token is rejected" | Integration test on the auth service |
| "the cursor round-trips across two pages" | Contract test on the list endpoint |
| "a subscription row appears after the webhook fires" | Integration test with a replayed webhook fixture |
| "the plaintext key never appears in any log or row" | Unit test plus a grep assertion in CI |
| "signup → paid → dashboard completes" | One E2E spec |

So: **write the acceptance criterion in EARS form, then write the command that proves it.**

> **WHEN** a request arrives with a revoked API key **THE SYSTEM SHALL** respond 401 and write one
> `auth.rejected` log line carrying the key prefix.
>
> *Verify:* `<test command> tests/contract/auth` — 4 assertions pass.

If you cannot name the command, the criterion is too vague to build against. Rewrite it before
writing code. This is the single highest-leverage habit in an autonomous build: agents drift when a
step has no machine-checkable end, and they stop drifting when it does.

Exact runner commands are per-ecosystem — see the `Testing / Lint / Build commands` table in your
`knowledge/runtime-tracks/` file. This capability decides *what* to test; the track decides *how* to
invoke it.

## Decision matrix

| Layer | What it covers | Cost to write | Cost to maintain | Verdict |
|---|---|---|---|---|
| **Static** — types, lint, schema checks | Whole-codebase invariants, free of runtime cost | Near zero | Near zero | Always. Cheapest bug-catching per unit of effort in existence |
| **Unit** | Pure logic: pricing, permissions, parsers, date math, state reducers | Low | Low | Always, for logic with branches. Skip for glue code |
| **Integration** | A slice through real seams: handler → service → database, component + store | Medium | Medium | **The default layer.** Most bugs live at seams, not inside functions |
| **Contract** | Every endpoint's request/response shape against a real database | Medium | Low | Mandatory for any API another party calls |
| **E2E** | A whole user journey in a real browser or device | High | High | Only for flows whose breakage is a business incident. Five to ten specs total |
| **Visual regression** | Rendered pixels against a baseline | Low | High | Only for a design system or a marketing page where layout *is* the product |
| **Load** | Behavior under concurrency | Medium | Low | Once, before launch, on the one endpoint you expect to be hot |

## Recommendation

**Default to an integration-heavy suite: a thin base of unit tests for branching logic, integration
tests as the bulk, and under ten E2E specs covering journeys you would roll back a deploy over.**

The classic pyramid over-weights unit tests. In application code most defects are wiring — wrong
column, missing tenant filter, a mock that drifted from the real API. Unit tests with mocked
dependencies pass happily through all of them. Test the seam and you catch them.

Concretely, per stage:

| Stage | Suite |
|---|---|
| Prototype | Typecheck + lint + build in CI. One E2E smoke: app loads, primary action works |
| MVP with users | The above, plus integration tests on auth, the money path, and every destructive action. Three E2E specs |
| Production SaaS | Integration tests on every service; contract tests on every endpoint; 5–10 E2E specs; nightly full run |
| Public API | Contract tests on every endpoint against a real database, run on every PR. This is the whole product's warranty |
| Library / CLI / MCP server | Unit-heavy — the public surface *is* the unit. Plus one install-and-run smoke test on a clean machine |

Non-negotiables at every stage:

1. **Test behavior, not implementation.** Assert what a caller observes. Tests that assert internal
   call order break on every refactor and catch nothing.
2. **Use a real database, not a mocked one.** A disposable container or a per-run schema. Mocked
   database tests assert that your mock matches your mock.
3. **Fast suites get run.** Keep the PR suite under about ten minutes. Move the slow tail to nightly.
4. **Every bug fix ships with the test that would have caught it.** This is how a suite earns its
   keep instead of accumulating ritual.
5. **A flaky test is a broken test.** Quarantine it the day it flakes. One tolerated flake teaches
   the team to ignore red, and then the suite is decorative.

## What NOT to test

Coverage targets produce tests that exist to raise a number. Skip:

- **Framework and library behavior.** The ORM's `findMany` works. Test *your* query, not theirs.
- **Third-party services.** Test your adapter against a recorded fixture; do not assert Stripe's
  internals. Use their test mode and their CLI to replay real events.
- **Styling, spacing, and copy** in functional tests. Selecting by visible text is fine; asserting a
  hex value is a maintenance tax with no defect-finding power.
- **Generated code** — migrations, clients, route types. Test that generation is current instead: a
  CI drift check that regenerates and fails on a diff.
- **Trivial pass-throughs.** A getter that returns a field needs no test.
- **Every permutation of filters and sorts.** Test the pagination mechanism once, plus the one filter
  with real logic in it.
- **Error states already covered by a type.** If the compiler rejects it, a test asserting it is dead
  weight.

## File organization

```
tests/
  unit/            # pure logic, no I/O, milliseconds
  integration/     # real database, real service wiring, mocked network edges only
  contract/        # every API endpoint: status, shape, auth, pagination
  e2e/             # browser or device journeys; one file per journey
  fixtures/        # factories that build valid entities with overridable fields
  helpers/         # database reset, authenticated client, time control
```

Conventions that keep it usable:

- **One factory per entity**, returning a valid object with sensible defaults and overridable fields.
  Inline literal test data is why suites become unmaintainable.
- **Reset state per test**, in a transaction rolled back afterward or by truncating between tests.
  Order-dependent tests are a slow-motion outage.
- **Name the test after the behavior**: `rejects a revoked refresh token` — not `test auth 3`. The
  failure output should read like a bug report.
- **Freeze time** anywhere dates matter. A suite that fails at month boundaries trains everyone to
  rerun instead of read.
- Colocating unit tests beside source (`foo.test.*` next to `foo.*`) is fine and common; keep
  integration, contract, and E2E in `tests/` regardless — they need shared setup.

## Testing in CI

| Trigger | Runs | Budget |
|---|---|---|
| Every push (local hook, optional) | Lint + typecheck on changed files | seconds |
| Pull request | Static + unit + integration + contract, plus a preview deploy | under ~10 min |
| Merge to main | The PR suite, then migrations, deploy, then a smoke test against the live URL | under ~15 min |
| Nightly | Full E2E suite, dependency audit, load check on the hot endpoint | unbounded |

Mechanics that matter more than the tool choice:

- **Run integration tests against a real database service in CI**, seeded from your migrations. Never
  against production, never against a shared staging database that another job is also mutating.
- **Cache dependencies and build output** — cold installs dominate CI time.
- **Shard slow suites in parallel jobs.** Wall-clock is the metric people actually feel.
- **Upload E2E artifacts on failure** — trace, video, screenshot. A CI failure you cannot reproduce
  locally gets ignored.
- **Required checks on the default branch.** A suite that can be merged around is advisory, not a gate.
- Retry an E2E spec at most once, and log the retry. Silent unlimited retries hide real flakiness.

`playwright-cli` covers browser E2E authoring and CI wiring; see `knowledge/skills-registry.md` for
its install form and fallback. Never hard-depend on it — if absent, use the runner directly and note
it in one line.

## Data model additions

None. Testing adds no production tables. It does add two things that belong in the repo:

| Artifact | Purpose |
|---|---|
| **Seed script** | Deterministic fixture data for local development and preview environments — the same factories the suite uses |
| **Test database provisioning** | A disposable database per CI run (container, branch database, or per-run schema), created and dropped by the pipeline |

## Build steps this adds

1. **Static gate first** — typecheck and lint wired to a single command and to CI. · *Done when:* a
   deliberate type error fails the PR check before any test runs.
2. **Test runner and one real test** — the runner configured per the runtime track, plus one
   meaningful assertion. · *Done when:* the project's test command runs green locally and in CI, and
   flipping the assertion makes CI red.
3. **Database harness** — disposable test database, migrations applied, reset between tests.
   · *Done when:* the integration suite passes twice in a row from a clean checkout, and shuffling
   test order does not change the result.
4. **Fixture factories** — one factory per core entity with overridable fields. · *Done when:* a new
   test creates a valid user and tenant in one line each.
5. **Cover the money and destruction paths** — integration tests on billing, permissions, and every
   irreversible action. · *Done when:* a test proves tenant A cannot read or delete tenant B's row,
   and a replayed payment webhook produces exactly one subscription row.
6. **E2E on the primary journey** — one spec covering the flow that defines the product.
   · *Done when:* the spec passes against a preview deploy in CI, with trace and video uploaded on
   failure.
7. **CI gate** — the suite is a required check on the default branch. · *Done when:* a PR with a
   failing test cannot be merged, and the full PR pipeline finishes under ten minutes.
8. **Post-deploy smoke test** — a handful of assertions against the live URL after each production
   deploy. · *Done when:* a deploy whose smoke test fails marks the pipeline red and pages whoever
   shipped it.

## Pitfalls

- **Writing tests before the design settles.** In week one they encode a shape you will delete.
  Static checks and one smoke path are the right coverage for a prototype.
- **Chasing a coverage percentage.** It rewards testing trivia and says nothing about whether the
  checkout flow works. Track "is the risky path covered" instead.
- **Mocking the database.** The highest-cost, lowest-value habit in testing. Run a real one.
- **E2E as the primary layer.** Slow, flaky, and it tells you *something* broke, not what. Push
  assertions down to integration; keep E2E for journeys.
- **Tolerating one flaky test.** It is never one. Quarantine same-day or watch the whole gate erode.
- **Tests that share state.** Passing individually and failing together, or vice versa, is the most
  expensive class of test bug to debug. Isolate per test from the first commit.
- **A suite nobody can run locally.** If it needs six secrets and a VPN, only CI runs it and
  feedback loops stretch from seconds to minutes. Docker Compose plus `.env.example` is the fix.
- **Acceptance criteria with no command.** "Done when billing works" cannot be verified, so an agent
  declares it done. Every criterion names a command and an expected result.

## See also

- `knowledge/capabilities/deployment.md` — CI/CD tiers, preview environments, post-deploy smoke tests
- `knowledge/capabilities/observability.md` — what to check when a test passes but production does not
- `knowledge/capabilities/database.md` — migrations, seeds, and disposable test databases
- `knowledge/runtime-tracks/ts-node.md` — the concrete test, lint, and build commands for this track
- `knowledge/runtime-tracks/go.md` — the concrete test, lint, and build commands for this track
- `knowledge/shapes/api-backend.md` — contract tests as the sole proof a headless service works
- `knowledge/skills-registry.md` — `playwright-cli` invocation form and graceful fallback
