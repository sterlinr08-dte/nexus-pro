# Shape: CLI / Library / MCP Server

> Software whose consumer is a developer or an agent, not an end user — a command-line tool, a published package or SDK, or an MCP server. The deliverable is an API surface plus a distribution channel.

Last verified: 2026-10-17

## Is this your project?

**Yes if:**
- The user says "a CLI", "a command", "a tool for my team's terminal", "scriptable".
- They want to publish a package other people install and `import` — an SDK, a client wrapper, a lint rule set.
- They want to expose their system's actions to Claude or another agent host — that is an MCP server.
- Success is measured in installs, adoption, and "it didn't break my build" — not sessions or conversions.
- There is no UI in scope beyond `--help` and a README.

**No if:**
- Humans log in and click things — `knowledge/shapes/saas-webapp.md`.
- It is a hosted HTTP service backing your own frontend or partners — `knowledge/shapes/api-backend.md`.
- The point is glue between SaaS products on a schedule or a webhook — `knowledge/shapes/automation-bot-integration.md`.
- It has a window, a tray icon, or filesystem-wide UI — `knowledge/shapes/desktop-app.md`.
- End users chat with it as a product — `knowledge/shapes/agent-app.md`.
- The consumer is a person browsing the web and the tool augments the pages they are already on — `knowledge/shapes/browser-extension.md` (installed from a store by end users, not from a registry by developers).

## Default runtime track

**Go** — see `knowledge/runtime-tracks/go.md`. A CLI's job is to start fast and install in one step; a single static binary with no runtime prerequisite beats every alternative for adoption.

Alternatives:
- `knowledge/runtime-tracks/ts-node.md` — the deliverable is an npm package or SDK, or an MCP server whose users already live in the JS ecosystem and expect `npx`.
- `knowledge/runtime-tracks/python.md` — the tool operates on data, notebooks, or ML pipelines, or its users install with `pipx`/`uvx`.

Pick the track by where the *consumer* already is. A Python data team will not install a Go binary to get a dataframe helper.

## Core capabilities

| Capability | Why this shape needs it | File |
|---|---|---|
| API design | The public surface *is* the product; naming and versioning are the architecture | `knowledge/capabilities/api-design.md` |
| Testing | Contract tests + a cross-version matrix are the only defense against silent breakage | `knowledge/capabilities/testing.md` |
| Deployment | Here it means release automation, artifact signing, and registry publication | `knowledge/capabilities/deployment.md` |
| Observability | Opt-in telemetry, structured diagnostics on stderr, crash reports with no PII | `knowledge/capabilities/observability.md` |
| Auth | Only when the tool talks to an authenticated API or the MCP server fronts a user's account | `knowledge/capabilities/auth.md` |
| AI / LLM integration | Only when the tool itself calls a model — MCP servers usually do not | `knowledge/capabilities/ai-llm-integration.md` |

## Data model

Most projects in this shape have **no database**. State lives in files and process memory. Model these concepts anyway — they become your types.

| Entity | Holds | Notes |
|---|---|---|
| Command / Tool | name, description, input schema, handler | For MCP, the description is read by a model — write it for the model |
| Parameter | name, type, required, default, validation | One schema drives parsing, `--help`, and MCP tool JSON |
| Config | resolved settings + provenance of each value | Precedence: flag → env → project file → user file → default |
| Credential | token, scope, expiry | OS keychain or a mode-restricted file — never the repo, never a plain env dump |
| Session / Context | per-connection state for MCP; per-invocation for a CLI | MCP connections are long-lived; keep them isolated per client |
| Cache entry | key, payload, TTL, schema version | Bump the schema version on layout change or you will ship poisoned caches |
| Release artifact | version, platform, checksum, provenance | Reproducible from a tag alone |

## Directory structure

```
cmd/ or bin/         # entrypoint only — parse args, wire deps, exit. No logic.
internal/            # everything private. Default home for new code.
  core/              # the actual behavior, callable without a terminal
  config/            # precedence resolution, one place
  output/            # human renderer + machine (JSON) renderer, same data source
pkg/ or src/index    # THE public surface. Explicit allowlist of exports.
mcp/                 # server: transport, capability negotiation, tool registry
  tools/             # one file per tool, schema colocated with handler
docs/
  examples/          # every example is executed by the test suite
testdata/            # golden files for output assertions
.github/workflows/   # test matrix + tag-triggered release
```

Rule: `internal/` is the default and `pkg/` is the exception. Anything reachable from the public entrypoint is a promise you now maintain.

## Build order

1. **Consumer brief + README first** — write the usage section before any code: three real invocations, each paired with the exact output it will print. *Done when:* `README.md` contains exactly three invocation blocks, each followed by a fenced expected-output block, and each expected output is also committed verbatim to `docs/examples/NN-<name>.txt`; a script asserts the README block and its file are byte-identical and fails on drift. Step 9 later runs these files as tests, so writing the output wrong now costs you a red build then — which is the point.

   **Two constraints on those bytes, because step 9 compares them literally and everything after step 9 chains off it.** First, **every value in an expected-output block must match the data model that defines it** — a path written relative to the run root stays relative to the run root, a field name matches its declaration, key order matches whatever the output contract promises. The blueprint states the definition and the golden in the same document, so a disagreement between them is decidable the moment it is written and blocks the build the moment it is checked. Second, **never dictate a string the runtime produces rather than your code** — a parser error, a stack trace, a library warning, an OS `errno` message. Those belong to the pinned runtime's version, they change between minor releases, and no amount of care makes them guessable from memory. Assert your own exit codes and your own error codes; where a third-party message must appear, capture it by running the command under the pinned version and say in the blueprint that it was captured, or leave it out of the byte-exact comparison entirely.
2. **Declare the public surface** — list every exported symbol, command, or MCP tool with its signature in one file. Everything else is internal. This step **declares** the surface; the **freeze** — the drift check running as a gate — lands at the step where the modules exist. See *Declaring the surface vs freezing it* below, and say in the blueprint which step carries the freeze; it is a required sentence, not an optional one. **Split the list by what survives to runtime:** value exports (functions, classes, constants, commands, tools) in one section, type-only exports (interfaces, type aliases, enums-as-types, generics) in another. *Done when:* `docs/surface.md` exists with those two sections; every row names the module path that will export it; every one of those paths appears in a later step's *Files touched*; and the drift check script is written and committed, comparing **like with like** — value rows against the module's runtime export names, type rows against the emitted declaration output — failing on drift in either. Say in the blueprint how the check script executes against the source: on a typed track that is a decision the runtime track owns, not one the check may assume.

   **The two-section split is not tidiness; it is the difference between a gate that can pass and one that cannot.** A single flat list diffed against a runtime module namespace fails forever the moment one row is a type: types are erased before the process starts, so they are absent from the namespace no matter how correct the code is, and adding them to the namespace is impossible. This is not hypothetical — a live build stalled here, and the builder's only ways out were to delete true rows from the surface doc or to weaken the check, both of which destroy the thing the step exists to protect.
3. **Skeleton + argument parsing** — command tree, flags, no behavior yet. *Done when:* `--help` prints the full tree and exits 0; an unknown flag prints usage to stderr and exits with **the usage code from step 6's table** (2 by default) — assert that exact code, not merely "non-zero", or a crashing binary passes the gate. **If the surface is the command tree — a CLI with no importable API — this is the freeze step:** the step-2 drift check now runs as a gate and exits 0 against the built command tree.
4. **Core logic behind the surface** — implemented as a callable library, with the CLI as one thin caller. *Done when:* unit tests cover the happy path plus two failure modes, invoking core directly with no terminal involved. **If the surface includes importable exports — a library, an SDK, or an MCP server's tool registry — this is the freeze step:** the step-2 drift check runs as a gate and exits 0 with every declared row backed by a real export, and `docs/surface.md` is frozen from here on (adding a row is a step-8 versioning event, not an edit).
5. **Output contract** — human renderer on a TTY, `--json` for machines, diagnostics on stderr. *Done when:* `tool run --json | jq .` parses with zero stray stdout lines, and `NO_COLOR=1` output contains no escape sequences.
6. **Exit codes + typed errors** — a documented table (0 success, 1 expected failure, 2 usage error, and any domain codes). *Done when:* a test asserts the code for each row of the table.
7. **Config precedence** — flag → env → project file → user file → default, with `tool config show` reporting where each value came from. *Done when:* a test proves each level overrides the one below it.
8. **Versioning + deprecation policy** — written down: what is public, what semver means here, how long a deprecated symbol survives. *Done when:* `VERSIONING.md` exists and CI fails a PR that changes a public signature without a release note entry.
9. **Tested documentation** — extract examples from docs and run them. *Done when:* the docs test executes every example in `docs/examples/` and fails on any output drift.
10. **Compatibility matrix** — CI runs the suite on every supported OS and on the oldest runtime the track declares as the floor. *Done when:* the matrix is green and the floor is stated in the package manifest, not just the README.
11. **Packaging + distribution** — build the real artifact for the ecosystem (see table below). *Done when:* the artifact installs in **one** command into an environment that holds no copy of this source tree, and `tool --version` prints the tag. See *Proving the install without a container* below — either path satisfies this.
12. **Release automation** — tag push builds, checksums, signs, generates the changelog, publishes. *Done when:* a dry run produces artifacts and a changelog with no manual step other than pushing the tag.
13. **MCP only — transport and dual-era versioning** — support stdio and streamable HTTP; serve the current stateless revision (per-request `_meta` version, mandatory `server/discover`) as the baseline, and also answer a legacy `initialize` so older hosts still connect. *Done when:* a test exits 0 that, over both transports, gets a `server/discover` result listing the current revision, gets a successful result for a legacy-revision `initialize`, and lists every tool with its schema in both eras.
14. **Adoption smoke test** — install the *published* artifact the way a stranger would, somewhere the source tree is not, and run the README's first example. *Done when:* the install command exits 0 and the example's stdout byte-matches `docs/examples/01-*.txt`, with the workspace unreachable from wherever the command ran. See *Proving the install without a container* below.

## Declaring the surface vs freezing it

Step 2 exists because **every accidental export is a support obligation**, and the cheapest moment to
decide what is public is before anything is public. That rationale is right and it does not change.
What changes with the project is **when the freeze can physically happen** — and a blueprint that
gets this wrong produces a step that documents nothing.

**The two are different acts and they belong at different steps.**

| Act | What it produces | When it can happen |
|---|---|---|
| **Declare** | `docs/surface.md` with the two sections, every row naming the module path that will export it, and the drift-check script written and committed | **Step 2, always.** It is a design decision; it needs no code |
| **Freeze** | the drift check running **as a gate** — every declared row backed by a real export, every real export declared, failing the step on drift in either direction | **Only once the modules exist.** Step 3 for a CLI whose surface is its command tree; step 4 for a library, an SDK, or an MCP server's tool registry |

**Greenfield — the common case here.** At step 2 there are no modules, so there is nothing to diff.
A step-2 gate that runs the drift check has three possible readings and all three are wrong: it
passes trivially against zero exports (gating nothing), it fails against zero exports (unpassable),
or the builder is asked to judge which of those was meant — a clarifying decision an autonomous build
cannot make. So on greenfield, **step 2's gate is that the declaration is complete and internally
consistent**, and the drift check becomes a gate at the freeze step named above. Say the freeze step
by number in the blueprint.

**Brownfield — the surface already exists.** Modules are on disk at step 2, so declaring and freezing
are the same act and both land there: run the drift check at step 2, exit 0 against the current build
output, and treat any surprise row it finds as a finding about the existing package rather than a
reason to weaken the check. This is the reading the original phrasing assumed, and it is correct —
for this case only.

**Either way, the freeze is real from its step onward.** After it, `docs/surface.md` is not edited to
match the code; the code is changed to match it, or the change goes through step 8's versioning
policy. That is the property step 2 exists to protect, and moving *where* the gate starts does not
weaken it — declaring early is what keeps everything else internal in the meantime.

## Proving the install without a container

Steps 11 and 14 both exist to test **one property: at install and at run time, nothing resolves to the
workspace copy.** Not "a container was used" — the container is a means. Say the property in the
blueprint, then give whichever path the build machine can actually execute.

| Path | Use it when | How |
|---|---|---|
| **Container** *(stronger)* | a container runtime is present | Fresh image, no bind mount of the repo, install the artifact by one command, run the example. Strongest because the OS, the toolchain and the dependency root are all new. |
| **Pack + install into temp dirs** *(container-free)* | no container runtime — a normal laptop | Build the distributable (`npm pack`, `python -m build`, `go build`, `cargo package`), then install **that file** into a directory created **outside the repo** with `mktemp -d`, giving it its own dependency root: a temp `npm init -y` then `npm i /abs/path/tool-<version>.tgz`; a fresh virtualenv then `pip install /abs/path/dist/*.whl`; `GOBIN=$TMPDIR/bin go install`. Run the example from that directory. |

Two temp directories, not one, is the honest version of the container-free path: one to build and
hold the artifact, one to install into. It keeps the install root free of anything the build produced.

Whichever path is used, these are the failure conditions — a run that skips them proves nothing:

- **Never verify from the repo root**, and never from a child of it. Workspace resolution walks
  upward; a parent `node_modules`, a `go.work`, a `.venv`, or a `pyproject.toml` above you will be
  found and will hide the defect the step exists to catch.
- **Never install by a link** — `npm link`, `pip install -e .`, a workspace protocol specifier, a
  replace directive. Those resolve *to* the source on purpose; they are the opposite of this test.
- **Install the built file by path, not the package by name**, until the artifact is actually
  published — otherwise the registry serves you the previous release and the gate passes on old bytes.
- **State in the blueprint which path the step takes**, and pick the container path only if the
  target build environment is known to have a runtime. A blueprint that hard-requires a container
  stops a builder that does not have one, and stopping is what the builder is told to do.

## Distribution by ecosystem

| Track | Primary channel | Also ship | Verify with |
|---|---|---|---|
| Go | Tagged release binaries per OS/arch | Homebrew tap, `go install`, container image | Install on a clean machine, no toolchain present |
| TypeScript / Node | npm registry with provenance attestation | `npx` one-shot use, correct exports map for both module systems | `npm pack` and install the tarball, not the workspace |
| Python | PyPI wheel + sdist | `pipx` / `uvx` for tools, extras for optional deps | Fresh virtualenv install, import in a REPL |
| MCP server | However the host runs it — binary, `npx`, `uvx` | A copy-paste host config block in the README | Connect with an inspector before publishing |

Every row's *Verify with* is the same property in that ecosystem's vocabulary: the artifact under
test must be the packaged one, and the place it runs must not be able to see the workspace. Run it by
either path in *Proving the install without a container*.

## Pitfalls

- **Shipping a modern-only (or legacy-only) MCP server.** The current spec revision is stateless — version in every request's `_meta`, `server/discover` mandatory, `initialize` legacy — and its compatibility matrix says legacy clients, still common among deployed hosts, fail against modern-only servers. Build dual-era: modern baseline, legacy `initialize` answered. Re-check `modelcontextprotocol.io/specification/versioning` at build time.
- **Anything printed to stdout that is not data.** Logs on stdout break pipes, and on an MCP stdio transport one stray print corrupts the JSON-RPC stream permanently. Data to stdout, everything else to stderr.
- **A barrel file that re-exports everything.** Every accidental export is a support obligation. Allowlist exports; keep the rest internal.
- **Untested examples.** Docs drift within one release. If an example is not executed by CI, assume it is already wrong.
- **Interactive prompts with no escape hatch.** A CLI that blocks on a prompt hangs CI forever. Detect a non-TTY, honor `--yes`, and fail loudly instead of waiting.
- **Breaking changes shipped as patches.** Renaming a flag, changing an exit code, or altering JSON output shape is a major. Removing a log line is not.
- **Too many MCP tools.** Tool names and descriptions are consumed as prompt context. Ten sharp tools beat forty thin ones; return compact structured results, not raw API dumps.
- **Publishing from a laptop.** No provenance, no reproducibility, and one compromised machine owns your users. Release only from CI on a tag.
- **Requiring the newest runtime.** Declare a floor, test it in the matrix, and raise it only in a major.
- **A surface check that diffs type-only exports against a runtime namespace.** Types are erased before the process starts, so they can never appear in the module's exports — the gate fails on correct code, in both directions, forever. Compare value rows to the runtime namespace and type rows to the declaration output. Step 2 above.
- **Freezing a surface that does not exist yet.** On a greenfield build there are no exports at step 2, so a drift check gated there either passes against nothing or fails against nothing, and the builder has to guess which was meant. Declare at step 2, freeze at step 3 or 4 — *Declaring the surface vs freezing it* above, and name the freeze step in the blueprint.
- **Verifying the packaged artifact from inside the workspace.** Every ecosystem resolves upward, so a check run in the repo (or a child of it, or through a link) silently tests the source you were trying to exclude and passes on a broken package. Steps 11 and 14 above.

## Skills for the build phase

Reference `knowledge/skills-registry.md` for install commands. Every reference degrades gracefully — if a skill is absent, fall back to the knowledge base or built-in `WebSearch`/`WebFetch`, note it in one line, and keep going.

| Skill | Use it for |
|---|---|
| `/last30days` | Current ecosystem norms — packaging conventions and registry policy move fast |
| `find-skills` | Discovering build-phase skills worth naming in the blueprint |
| `agent-browser` | Pulling the current MCP spec or a registry's publishing rules into markdown |
| `/humanizalo` | The README and docs — this is the marketing surface for a developer tool |
| `claude-api` | **Mandatory** before writing any model ID, price, or API parameter if the tool calls Claude |

Skip the UI skills entirely. There is no interface to design here.

## See also

- `knowledge/runtime-tracks/go.md` — the default track: static binaries, cross-compilation, release tooling
- `knowledge/runtime-tracks/ts-node.md` — npm packaging, exports maps, and the JS-ecosystem MCP path
- `knowledge/runtime-tracks/python.md` — wheels, `uvx`, and data/ML tooling
- `knowledge/capabilities/api-design.md` — versioning and surface design, the core of this shape
- `knowledge/capabilities/testing.md` — contract tests, golden files, matrix strategy
- `knowledge/shapes/api-backend.md` — when it is actually a hosted service, not a distributed artifact
- `knowledge/shapes/agent-app.md` — when the agent itself is the product rather than the tools it calls
- `knowledge/shapes/browser-extension.md` — when the consumer is a person on a web page, not a developer at a registry
