# Template: Epic File

> One epic = one self-contained execution unit. A fresh agent with **zero** context opens exactly
> one epic file and can finish it without reading `blueprint.md`, another epic, or asking anything.

Last verified: 2026-10-17

Emitted in **bundle mode** (see `questions/phase-4-generate.md`):

```
./blueprints/<project-slug>/
├── blueprint.md          # the 20-section narrative artifact
├── tasks.json            # the machine-readable task DAG
├── epics/
│   ├── 01-<name>.md
│   └── 02-<name>.md      # ← this template, one per epic
└── workspace/            # copied INTO the target project root by the builder
    ├── CLAUDE.md
    ├── AGENTS.md
    ├── <verify-critical config>   # test/e2e runner config, compose file — blueprint §19.6
    └── .claude/
        ├── settings.json
        ├── skills/<name>/SKILL.md
        └── rules/<name>.md
```

`./blueprints/` is relative to the **user's current working directory**, never the plugin. Epic
files live in `epics/`, one directory below the bundle root, as siblings of nothing else —
`tasks.json` sits *outside* `epics/`, beside `blueprint.md`. The builder copies the contents of
`workspace/` into the target project root; the bundle itself stays put.

`workspace/` carries agent configuration **and** every config file a `Verify` command needs to run —
runner configs, test setup files, the local service compose file. They are real files there, never
merely names in a directory tree. `blueprint.md` §19.6 is the rule; this template's job is to make
sure no task's `Verify` block calls a path that exists in neither `workspace/` nor some task's
**Files** list.

---

## Why this file repeats itself — do not de-duplicate

**Every epic file duplicates the stack summary, the relevant directory subtree, and its own
acceptance criteria. This is correct. Leave it.**

The instinct to factor the shared parts into one file and link to it is right for source code and
wrong here, for one reason: **the reader is a fresh agent with a finite context window, not a
human with a browser.**

| Concern | Source code | Epic files |
|---|---|---|
| Cost of duplication | Two things drift apart | ~40 lines repeated per file, all of it stable |
| Cost of indirection | One click | The agent loads `blueprint.md` in full to extract 6 lines, and the epic's own detail gets pushed out of the window |
| Who reconciles drift | A human at review time | The Architect at regeneration time — the whole bundle is emitted at once |

Context isolation beats DRY here. An epic that says "see the stack table in `blueprint.md` §2" has
just made the agent read a 900-line design document to learn it should use pnpm — and arrive at its
first task with half the budget already spent on rationale it does not need.

The duplicated content is also the *stable* content: stack, directory layout, boundaries. It changes
when the whole blueprint is regenerated, and then every epic is regenerated with it.

**If you are a future contributor about to "clean this up": don't.** If duplication is genuinely
costing you, the fix is to regenerate the bundle, never to introduce a cross-file link.

The one thing that is *not* duplicated: rationale. Why Postgres over SQLite, why this auth provider,
what alternatives were rejected — that lives only in `blueprint.md`. Epics carry decisions, not
arguments.

---

## Sizing

**`templates/blueprint-template.md` §9, "One step, one unit — the counting rule", is the single
source of truth for how many steps a build has and how many epics they divide into.** It is restated
nowhere, including here — read it there. What it says, in one line: one §9 step = one `tasks.json`
task = one task block in an epic file, an epic holds 5–9 of them, and the epic count is therefore
derived from the step count rather than chosen.

What this template owns is the size of a *task*:

| Rule | Value |
|---|---|
| Acceptance criteria per task | 2–6 (over 6, split the task) |
| Files per task | ≤ 5 (else split the task) |

**There is no line budget on an epic file.** An earlier version of this template capped it at
150–300 lines; that cap was unreachable at the density this same file mandates — the preamble alone
runs ~120 lines, and a fully specified task block is 35–45 — so a conforming epic lands between
roughly 300 and 550 lines depending on task count. The cap is gone rather than the content: the
only way to hit it was to break the anti-DRY rule above, which is the rule that makes the file work.
If an epic feels too long, it has too many tasks or tasks that are too big. Never shorten it by
deleting the repeated preamble.

Epics are ordered by dependency depth, not importance. `01-foundation` is always the scaffold.

---

## Every acceptance criterion must be checkable by a machine, inside the build

The test, applied to every numbered line under **Acceptance** and under **Epic acceptance**:

> Could a script decide this, today, on this machine, without leaving it?

If no, it is not an acceptance criterion. A criterion that waits on a human reviewer, an app-store
queue, a certificate authority, a DNS propagation window, or a physical device cannot terminate
inside an autonomous build. The agent either stalls on it forever or quietly decides it passed —
and a self-certified gate is worse than no gate, because it reports green.

| Reject | Write instead |
|---|---|
| "WHEN the build is submitted THE SYSTEM SHALL be accepted into store review." | "WHEN `{pm} package` runs THE SYSTEM SHALL emit a store-ready artifact with every required manifest field non-empty." |
| "WHEN a clean machine runs the installer THE SYSTEM SHALL show no security warning." | "WHEN `codesign --verify --deep --strict` runs THE SYSTEM SHALL exit 0." |
| "WHEN a reviewer reads the page THE SYSTEM SHALL feel fast." | "WHEN the Lighthouse CI budget runs THE SYSTEM SHALL report LCP under 2.5s on the throttled profile." |
| "WHEN the theme switches THE SYSTEM SHALL not flash." | "WHEN the initial HTML is fetched THE SYSTEM SHALL already contain the theme class before hydration." |
| "WHEN design signs off THE SYSTEM SHALL use the approved palette." | "WHEN `{pm} test tests/tokens.test.ts` runs THE SYSTEM SHALL assert every color literal resolves to a named token." |

Two more things that are not tasks and do not belong in an epic:

- **Anything requiring an external party.** Store approval, a real-device pass, a security review, a
  legal sign-off. Real work, still written down — in `blueprint.md`'s post-build launch checklist,
  clearly separated from the build order. Not a build gate.
- **Anything the blueprint already satisfies before code is written.** "The stack is documented",
  "the data model is defined". That gates nothing.

If a task's acceptance survives this test but you cannot name a command for it, the task is not
ready to emit — either find the assertion or cut the criterion.

---

## Template

````markdown
# Epic {NN}: {Name}

> {One sentence: what exists after this epic that did not before.}

| | |
|---|---|
| **Epic id** | `{NN}-{slug}` |
| **Tasks** | `E{N}-T1` … `E{N}-T{n}` |
| **Depends on** | {epic ids, or "nothing — start here"} |
| **Unlocks** | {epic ids that wait on this one} |
| **Parallel with** | {epic ids that share no files with this one} |

You do not need any other file to complete this epic. Everything below is repeated here on purpose.

---

## Stack

{Framework} · {language} · {styling} · {database} · {ORM} · {auth} · {hosting}.
Package manager: `{pm}`. Runtime pinned in `{.nvmrc | .tool-versions}`. Dependency versions are in
the lockfile — read it, never guess one.

| Task | Command |
|---|---|
| Dev | `{pm} dev` |
| Typecheck | `{pm} typecheck` |
| Lint | `{pm} lint` |
| Test (one file) | `{pm} test {path}` |
| {epic-specific, e.g. migrate} | `{pm} db:migrate` |
| {local services — required if any Verify here needs one} | `{up command}` / `{down command}` |

**Gate:** `{pm} typecheck && {pm} lint && {pm} test` passes before any task here is marked done.

If any task below verifies against a real service, start it first with the command above. The file
that defines it shipped in `workspace/` and is already at the project root — you do not write it,
and you never substitute a fake for a service the acceptance criteria name.

## Directory subtree

Only the parts this epic touches:

```
src/
  {dir}/
    {file}          # {what it does — NEW in this epic}
    {file}          # {what it does — exists, you will edit it}
  {dir}/
    {file}          # {exists, read-only for this epic}
tests/
  {dir}/{file}      # {what it proves}
```

Everything outside this subtree is out of scope. If a task seems to require editing a file not
listed here, stop and report — it means the epic boundary is wrong.

## Data model touched here

| Entity | Fields this epic adds or reads | Notes |
|---|---|---|
| `{table}` | `{fields}` | {relations, indexes, constraints} |

## Contracts

**Consumed** — already exists, do not rebuild:

| From | Interface | Guarantee |
|---|---|---|
| `{epic id}` | `{exported function or route}` | {what it returns, what it throws} |

**Produced** — later epics depend on exactly these signatures. Changing one breaks them:

| Export | Signature | Used by |
|---|---|---|
| `{path}` → `{name}` | `{signature}` | `{epic id}` |

## Conventions that bite in this area

- {Convention specific to this epic — the thing an agent gets wrong by default.}
- {…}

Full project rules: `CLAUDE.md`. Area rules: `.claude/rules/{name}.md`. Both sit in the project
root — the builder copied them there from the bundle's `workspace/` before task one.

---

## Tasks

Listed in the same order as `tasks.json`. That order is the build order — work top to bottom and do
not re-rank by priority or by what looks quick.

### `E{N}-T1` — {Title}

**Depends on:** {task ids, or "nothing"} · **Priority:** {p0|p1|p2} — metadata for scope cuts, not
a running order

{2–4 sentences of implementation direction. What to build, the approach to take, the approach to
avoid and why. Not a tutorial — assume competence in the stack, supply only what is specific to
this project. This block is the only place implementation direction exists — `tasks.json` has no
field for it.}

**Files**
- `{path}` — {new | edit: what changes}

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*. Each one is decidable by a
command below, on this machine, during the build.

1. **WHEN** {trigger} **THE SYSTEM SHALL** {observable response}.
2. **WHEN** {edge case} **THE SYSTEM SHALL** {observable response}.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is
correct; the last one exiting 0 is what makes the task done.

```bash
{pm} test {path}
{pm} test {second path, if the task has more than one check}
```

These lines are this task's `verify` **array** in `tasks.json`, one per line, **copied with any
exit-code wrapping intact** — `status=0; {cmd} || status=$?; test "$status" -eq {n}`, which survives
`set -e` (`{cmd}; test $? -eq {n}` does not, and `! cmd` is not a gate). Do not unwrap them into the
"cleaner" bare command: a line whose success case is a non-zero exit is a permanently red gate. If
the array has three commands, three lines appear here — a task is not done until the last one passes.

**Checkpoint**

```bash
git add -A && git commit -m "E{N}-T1: {title}"
git tag {this task's `checkpoint` value from `tasks.json`, verbatim}
```

Run both after the last `Verify` command exits 0, before starting the next task. The tag is this
task's rollback target and the thing the build's final gate counts — if the next task goes wrong,
`git reset --hard` to *this* tag rather than debugging forward. Never invent the tag: copy the
`checkpoint` field. If it is missing from `tasks.json`, stop and report rather than making one up.

### `E{N}-T2` — {Title}

{…same block, 5–9 total…}

---

## Epic acceptance

The epic is done when every task is `done` **and**:

1. **WHEN** {end-to-end trigger crossing several tasks} **THE SYSTEM SHALL** {observable response}.
2. **WHEN** {failure mode the epic is responsible for} **THE SYSTEM SHALL** {degrade this way}.

```bash
{pm} typecheck && {pm} lint && {pm} test
{epic-level e2e or integration command}
```

Run from the project root. Both criteria must be decidable by these commands — an epic gate that
waits on a human or an external service blocks the whole build behind it.

## Pitfalls

- **{Trap}** — {why it bites here specifically, what to do instead}

## Before moving on

- [ ] Every task in this epic is `done` in `tasks.json` — no task left `in_progress`.
- [ ] Every `verify` command of every task in this epic passed, not just the first one.
- [ ] No `verify` command was edited, and none was skipped because a file it names did not exist.
- [ ] **Every task in this epic has its `checkpoint` tag in version control** — one tag per task,
      matching the `checkpoint` value in `tasks.json`. `git tag -l 'step-*'` lists them.
- [ ] Gate command passes clean, run from the project root.
- [ ] Every "Produced" contract above exists with the stated signature.
- [ ] No file outside the subtree was modified.
- [ ] `.env.example` updated if this epic added a variable — or state that this project has none.
- [ ] One commit per task, each prefixed with its task id, each followed by its checkpoint tag.
````

---

## Precedence

The task blocks here and the entries in `tasks.json` describe the same tasks. When they disagree:

| Field | Winner | Why |
|---|---|---|
| `id`, `dependencies`, `status`, task order | `tasks.json` | It is the graph; the epic is a view of it |
| `verify` commands | `tasks.json` | The resume protocol executes them, and it executes the whole array |
| Implementation direction, contracts, pitfalls | the epic file | It does not exist in `tasks.json` |
| `acceptance` | must be identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings* — copy them, do not paraphrase | |

Paraphrasing acceptance criteria between the two files is the most common bundle defect. Copy the
strings; only the emphasis markers and list numbering may differ.

Two corollaries worth stating outright:

- **The epic's Verify block lists every command in that task's `verify` array, one per line.** If
  the epic shows one command and `tasks.json` holds three, the builder runs three and the epic is
  lying about what "done" costs. They run from the target project root, never from the bundle
  directory.
- **Every path a Verify command names is authored somewhere.** Before emitting an epic, take each
  path out of each `Verify` command and find it in this task's **Files** list, in an earlier task's,
  or in the bundle's `workspace/`. If it is in none of the three, the gate runs a file that nothing
  creates: the builder gets `No test files found` or `Cannot find module` and has to invent the
  file and guess what it should assert. This is the single most common reason a bundle's own gates
  cannot run, and it is mechanically checkable in a few seconds.

- **`priority` never reorders anything.** The epic lists tasks in `tasks.json` array order, which is
  already the build order. `priority` is there so a human can answer "what falls out if we ship in a
  week" — it is not a selector, and no agent re-sorts by it.

---

## What does not belong in an epic file

| Keep out | Where it goes |
|---|---|
| Why the stack was chosen | `blueprint.md` §2 |
| Other epics' tasks | their own files |
| The full data model | `blueprint.md` §4 — epics carry only their slice |
| Design tokens | `CLAUDE.md` — one source, referenced by name |
| Generic framework tutorials | nowhere; assume competence |
| Status tracking | `tasks.json` — never mark done inside the epic file |
| Work that needs an external party (store review, real device, human sign-off) | `blueprint.md`'s post-build launch checklist — never a build gate |

---

## See also

- `templates/tasks-schema.md` — the DAG that decides which epic runs when
- `templates/claude-md-template.md` — the always-loaded project rules epics defer to
- `templates/blueprint-template.md` — the design document epics deliberately do not link into
- `questions/phase-4-generate.md` — bundle mode and how epics get split
