# Template: Target-Project CLAUDE.md

> The `CLAUDE.md` that ships **with the built project** — not The Architect's own. It is the first
> thing the building agent reads, every session, forever.

Last verified: 2026-10-17

**Path resolution:** every bare path in this file (`knowledge/…`, `templates/…`, `questions/…`) is
relative to the plugin root — read it as `.claude/skills/the-architect/<path>`. The only exception is
`./blueprints/`, which is always the **user's current working directory**, never the plugin.

Used by `questions/phase-4-generate.md`. In **single-file mode** it fills Section 19.1 of
`templates/blueprint-template.md`, as a fenced block the builder writes out by hand. In **bundle
mode** it is written as its own file, under `workspace/`:

```
./blueprints/<project-slug>/
├── blueprint.md          # design + rationale — the 20-section narrative artifact
├── tasks.json            # the build DAG — templates/tasks-schema.md
├── epics/
│   ├── 01-<name>.md      # self-contained execution units — templates/epic-template.md
│   └── 02-<name>.md
└── workspace/            # copied INTO the target project root by the builder
    ├── CLAUDE.md         # this template, filled
    ├── AGENTS.md         # the tool-neutral stub (see Companion files)
    └── .claude/
        ├── settings.json
        ├── skills/<name>/SKILL.md
        └── rules/<name>.md
```

`workspace/` exists so the builder copies **one directory** into the target project root — `rsync -a
--ignore-existing workspace/ <project-root>/` (exits 0 either way; fallback `cp -Rn workspace/.
<project-root>/ || true`, see the blueprint template §19) — rather than picking files out of the
bundle one at a time. This
template's output lands at `workspace/CLAUDE.md` in the bundle and at `<project-root>/CLAUDE.md`
after the copy. It is never written loose at the bundle root.

---

## The context budget

`CLAUDE.md` is prepended to **every** turn. Every line you add is a line the agent re-reads
thousands of times. Three tiers, and using the wrong one is the most common blueprint defect:

| Tier | Mechanism | Loads | Use for |
|---|---|---|---|
| Always | `CLAUDE.md` body | Every turn | Commands, boundaries, non-negotiables |
| Deferred | `.claude/rules/*.md` with a `paths:` frontmatter key | Only when a file matching one of its globs is touched | Per-area conventions: schema, payments, styling |
| On demand | `docs/*.md`, the epic files | Only when the agent opens them | Long reference material |

### `@`-imports do not defer — this is verified, not folklore

**An `@file.md` import in `CLAUDE.md` is expanded and loaded in full at launch.** The referenced
file's entire contents are injected into the context alongside the rest of `CLAUDE.md`, before the
first turn. It is a copy-paste with extra steps, and it costs the same tokens every turn that
pasting the body inline would.

So reaching for `@` to "keep `CLAUDE.md` short" makes the *file* shorter and the *context* exactly as
large — often larger, because an imported file tends to be one nobody trimmed. The line count in the
pre-flight checklist below measures the wrong thing if you do this.

**The mechanism that actually defers is `.claude/rules/*.md` with a `paths:` frontmatter key holding
glob patterns.** The rule body stays out of context until the agent touches a file matching one of
those globs, then loads for that work. Both of these facts are confirmed against the official
Claude Code documentation.

The practical rule: if content applies to every turn, it goes in the `CLAUDE.md` body. If it applies
to one area, it goes in a `paths:`-scoped rule file. `@` is for neither.

**Maintainer notes are free.** Block-level HTML comments in `CLAUDE.md` are stripped before the file
is injected into context, so `<!-- … -->` costs zero tokens at runtime. Use them for the things a
human maintainer needs and the agent does not — why a rule exists, which blueprint step produced a
section, what to revisit. Keep them block-level and on their own lines.

**Hard cap: the generated `CLAUDE.md` stays under 200 lines**, counting the body and any `@`-imported
file, not the file alone. If it does not fit, the overflow is per-area convention and belongs in
`.claude/rules/`.

---

## Template

````markdown
# {PROJECT_NAME}

{One sentence: what this is, who uses it.}

## Commands

| Task | Command |
|---|---|
| Install | `{pm} install` |
| Dev server | `{pm} dev` — http://localhost:{port} |
| Build | `{pm} build` |
| Typecheck | `{pm} typecheck` |
| Lint / format | `{pm} lint` · `{pm} format` |
| Unit tests | `{pm} test` · one file: `{pm} test {path/to/file}` |
| E2E | `{pm} test:e2e` |
| DB migrate | `{pm} db:migrate` |
| DB inspect | `{pm} db:studio` |

**Gate:** `{pm} typecheck && {pm} lint && {pm} test` must pass before any task is marked done.

Runtime version is pinned in `{.nvmrc | .tool-versions | pyproject.toml}`. Dependency versions live
in the lockfile — read it, never guess one.

## Stack

{Framework} · {language} · {styling} · {component library} · {database} · {ORM} · {auth} · {hosting}.

## Architecture

**Request path.** {Trace one real request end to end, naming the actual files it passes through.
Example: browser → `src/app/{route}/page.tsx` (server) → `src/server/{domain}.ts` → `src/db/client.ts`
→ Postgres. Mutations go through `src/app/{route}/actions.ts`, never a client `fetch`.}

**Boundaries.** Cross one of these the wrong way and the build breaks:

{The rows below are an example for a Next.js track. Replace them with this project's own layers and
directories; never ship them to a Python, Go or CLI project.}

| Layer | May import from | Must never |
|---|---|---|
| `src/app/**` (routes) | `components`, `server`, `lib` | Import `db/` directly |
| `src/components/**` | `lib`, other components | Import `server/` or `db/` |
| `src/server/**` | `db`, `lib` | Import React or anything in `components/` |
| `src/db/**` | nothing internal | Import `server/` |

**Where things live.**

| Concern | Single source of truth |
|---|---|
| DB schema | `src/db/schema.ts` — change here, then `{pm} db:migrate` |
| Env access | `src/lib/env.ts` — validated at boot; never read `process.env` elsewhere |
| Design tokens | `{tokens file}` — no raw hex or px in components |
| Shared types | Inferred from schema and validators; hand-written types only in `src/types/` |
| Auth session | `src/lib/auth.ts` — one `getSession()`, used everywhere |

## Code rules

1. **One component per file. Max {N} lines.** Longer means it should be split.
2. **{Import convention from the runtime track, e.g. path alias `@/` → `src/`; no `../../..` imports.}**
3. **{Framework-specific rules from the runtime track, e.g. for Next.js: server components by default,
   `"use client"` only for state, effects or event handlers, pushed to the leaf. Delete this rule if
   the track has none.}**
4. **{Module rule from the runtime track, e.g. no barrel files: import from the source module.}**
5. **Validate at the edge.** Every route handler and server action parses its input with a schema
   before touching business logic. No unvalidated input reaches `src/server/`.
6. **Errors return typed results**, not thrown strings. Shape: `{ ok: true, data } | { ok: false, error }`.
7. **Colocate.** A component used by exactly one route lives beside that route.
8. **No new dependency without a reason in the commit message.** Check for a stdlib or existing dep first.

## Design system

Tokens are defined once in `{tokens file}`. Components reference token names only.

| Role | Value | Used for |
|---|---|---|
| Primary | `{#hex}` | Primary buttons, active states, links |
| Background | `{#hex}` | Page background |
| Surface | `{#hex}` | Cards, panels, popovers |
| Border | `{#hex}` | Dividers, input outlines |
| Text | `{#hex}` | Body copy |
| Muted text | `{#hex}` | Captions, placeholders |
| Destructive | `{#hex}` | Errors, delete |
| Success | `{#hex}` | Confirmations |

- **Type:** headings `{font}` {weights}; body `{font}` {size}/{line-height}; mono `{font}`.
- **Scale:** {e.g. 12 / 14 / 16 / 20 / 24 / 32 / 48 px}.
- **Spacing:** {N}px base — {4, 8, 12, 16, 24, 32, 48, 64}. No arbitrary values.
- **Radius:** {N}px inputs and buttons, {N}px cards, full for avatars.
- **Elevation:** {shadow values, or "flat — borders only"}.
- **Motion:** {N}ms, `{easing}`. Transform and opacity only. Respect `prefers-reduced-motion`.
- **Layout:** max content width {N}px; breakpoints {sm/md/lg/xl}; mobile-first.

## Environment

| Variable | Required | Used by | Source |
|---|---|---|---|
| `{VAR}` | yes/no | `{file}` | {dashboard URL or command} |

`.env.example` is committed and stays in sync. `.env*` files with real values never are.

## Rules

Deferred conventions — read the matching file before editing that area:

| File | Applies to |
|---|---|
| `.claude/rules/{name}.md` | `{glob}` |

## Non-negotiable

1. {Rule that causes real damage if broken.}
2. {…}
3. Never commit secrets, `.env`, or generated build output.
4. Never edit generated files ({migrations, generated clients}) by hand.
5. Never mark a task done with a failing gate command.
````

---

## Section rules

| Section | Rule |
|---|---|
| Commands | **First, always.** The agent needs to run something before it needs to know anything. Include the single-file test form — the agent runs it far more often than the full suite. |
| Stack | One line. It is a reminder, not a decision record — rationale belongs in `blueprint.md`. |
| Architecture | Describe **how things connect**, not what folders exist. A folder list is `ls` output the agent can get itself; an import-direction table is knowledge it cannot infer. Trace one real request through real file paths. |
| Code rules | Numbered, testable, specific. "Max 300 lines" is a rule; "keep files small" is a wish. Every rule should be one an agent can check itself against. |
| Design system | Real hex codes and real pixel values. "Clean and modern" tells the builder nothing and produces the default AI look. If `ui-ux-pro-max` ran in Phase 3, its output lands here verbatim. |
| Rules table | Just the pointer table. Never inline the rule bodies — that defeats the deferral. |
| Non-negotiable | 5–8 maximum. Everything is important, so nothing is. Cut any rule whose violation would merely be untidy. |

---

## Companion files

### `AGENTS.md`

Other coding agents read `AGENTS.md`, not `CLAUDE.md`. Ship both.

**`CLAUDE.md` is canonical.** `AGENTS.md` is a ~15-line stub: the one-line description, the commands
table, the non-negotiables, and a pointer:

```markdown
# {PROJECT_NAME} — agent instructions

{One sentence.}

## Commands
{copy of the commands table}

## Non-negotiable
{copy of the numbered list}

Full architecture, boundaries, and design tokens: see `CLAUDE.md` in this directory.
```

Duplicating the commands and the hard rules is deliberate — they are short and they almost never
change, so drift risk is near zero, and a non-Claude agent that reads only `AGENTS.md` still gets the
things that break the build. On an all-macOS/Linux team, `ln -s CLAUDE.md AGENTS.md` is the cheaper
option; skip the symlink if any Windows checkout is likely.

### `.claude/rules/*.md`

The deferral mechanism. Frontmatter `paths:` globs decide when the body loads:

```markdown
---
description: Database schema and migration conventions
paths:
  - "src/db/**"
  - "migrations/**"
---

- Every table has `id`, `created_at`, `updated_at`.
- Never edit a migration that has run. Add a new one.
- Soft-delete with `deleted_at`; every query filters it.
```

Emit 3–6 of these, one per area with non-obvious conventions. Good candidates: database and
migrations, payments and webhooks, styling and tokens, API route contracts, test conventions.
Each stays under 60 lines.

### `.claude/skills/` — never `.claude/commands/`

**Never scaffold `.claude/commands/` into a generated project.** A slash command only fires when a
human types it. An autonomous builder types nothing, so a scaffolded command is dead weight that
was never invoked once.

Put the same content in `.claude/skills/{name}/SKILL.md` with a `description` that states *when* it
applies. Skills activate on intent, which is the only trigger a headless build actually has.

---

## Anti-patterns

| Don't | Do |
|---|---|
| Paste the whole directory tree | Give the import-direction table |
| `@`-import five files "to stay short" | Move them to `paths:`-scoped rules |
| "Use a modern, clean aesthetic" | `#0F172A`, `Inter 600`, `radius 8px` |
| 25 non-negotiable rules | 6 that actually break things |
| Explain what React or Postgres is | Assume competence; state *this project's* choices |
| Restate the build order | Point at `tasks.json` and `epics/` |
| Repeat pinned versions in prose | Point at the lockfile — prose drifts, lockfiles do not |

---

## Pre-flight checklist

- [ ] Under 200 lines, counting the body plus any `@`-imported file — imports do not defer.
- [ ] Commands section is first and every command was taken from `package.json` (or equivalent), not invented.
- [ ] Architecture names real file paths that appear in the directory structure.
- [ ] Every design token is a literal value.
- [ ] Every `.claude/rules/` file in the pointer table is actually emitted, and each carries a `paths:` frontmatter key.
- [ ] No `.claude/commands/` directory anywhere.
- [ ] `AGENTS.md` stub emitted alongside, in the same directory.
- [ ] In bundle mode: all of the above sit under `workspace/`, not at the bundle root.
- [ ] Nothing in it contradicts `blueprint.md` or `tasks.json`.

---

## See also

- `templates/blueprint-template.md` — §19.1 embeds the filled output of this template
- `templates/tasks-schema.md` — the build DAG this file points at
- `templates/epic-template.md` — the self-contained execution units
- `questions/phase-4-generate.md` — when and how this file gets written
- `knowledge/skills-registry.md` — real invocation and install forms for any skill named here
