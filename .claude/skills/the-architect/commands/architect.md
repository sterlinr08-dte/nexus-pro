---
description: Interview, design, and emit a self-contained build bundle for a new project — 4 phases, acceptance criteria on every step, validator-gated. / Entrevista, diseña y genera un bundle autocontenido para un proyecto nuevo.
argument-hint: "[what you want to build]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - WebFetch
  - WebSearch
  - Agent
  - Skill
  - AskUserQuestion
---

# `/architect` — design a new project end to end

You are being invoked as the `/architect` slash command. This file sets the **mode**. It does not
contain the interview — the interview lives in `questions/` and is the single source of truth.

**Read these before saying anything to the user:**

- Plugin install: `.claude/skills/the-architect/skills/architect/SKILL.md`
- Clone install: `./CLAUDE.md` at the repo root — the clone-mode mirror of the skill. Same rules,
  same state machine, repo-relative paths, and the subagent work done inline.

Read the skill end to end, then execute the four phases exactly as written there.

## Mode

| Setting | Value |
|---|---|
| Entry | Greenfield — nothing exists yet |
| Depth | Full 4-phase interview |
| Question budget | Max 3 per message, conversational |
| Output | Bundle or single file — derived and announced at phase-4 Step 2 (12 or more steps = bundle); an explicit user preference wins. Both land in the user's cwd under `./blueprints/`: `./blueprints/<project-slug>/` for a bundle, `./blueprints/<project-slug>-blueprint.md` for a single file. |
| Gate | `blueprint-validator` must return **PASS** before you hand anything over |

`.claude/skills/the-architect/questions/phase-4-generate.md` Step 3 is the authority on the emitted tree —
do not reproduce it from memory here. One thing worth repeating: **`.claude/commands/` is never
emitted into a generated project.** A slash command only fires when a human types it, and an
autonomous builder types nothing; repeatable project workflows go in `.claude/skills/<name>/SKILL.md`.

## Phase pointers — read, never paraphrase from memory

| Phase | Read | Produces |
|---|---|---|
| 1 · Discovery | `.claude/skills/the-architect/questions/phase-1-discovery.md` | The shape → `.claude/skills/the-architect/knowledge/shapes/<shape>.md` |
| 2 · Deep dive | `.claude/skills/the-architect/questions/phase-2-branches.md` | Runtime track + capability set |
| 3 · Architecture | `.claude/skills/the-architect/questions/phase-3-confirmation.md` | Confirmed stack, signed off by the user |
| 4 · Generate | `.claude/skills/the-architect/questions/phase-4-generate.md` | The bundle, then the validator |

Supporting files, loaded on demand and only when the phase calls for them:
`knowledge/runtime-tracks/`, `knowledge/capabilities/`, `knowledge/stack-compatibility.md`,
`knowledge/skills-registry.md`, `templates/blueprint-template.md`, `templates/claude-md-template.md`,
`templates/tasks-schema.md`, `templates/epic-template.md` — all under `.claude/skills/the-architect/`.

## Arguments

`$ARGUMENTS` is an optional project description. It **seeds** Phase 1 Q1 — it does not replace it.

- Empty → open Phase 1 with Q1 as written.
- Non-empty → treat it as the answer to Q1. Play back the shape you read from it in one line, then
  ask the next 2 unanswered Phase 1 questions.

A description in the argument never authorizes skipping Phases 2 and 3. If the user wants speed,
that is `/architect-quick`.

## Subagents

Dispatch these with the Agent tool (formerly Task) — that is the preferred path. If dispatch fails,
do the work in the main thread and say so in one line; see *Never hard-depend on a subagent* in
`.claude/skills/the-architect/questions/phase-4-generate.md`.

| Agent | When | File |
|---|---|---|
| `stack-researcher` | Phase 4 Step 1 — verify every pin against the live registry | `.claude/skills/the-architect/agents/stack-researcher.md` |
| `blueprint-writer` | Phase 4 — compose the bundle from the confirmed architecture | `.claude/skills/the-architect/agents/blueprint-writer.md` |
| `blueprint-validator` | Phase 4, after writing — the gate | `.claude/skills/the-architect/agents/blueprint-validator.md` |

If the validator returns FAIL, fix the bundle and re-run it. Never hand the user a failing bundle
with an apology attached.

## The rules that matter here

1. **No blueprint before Phase 3 is confirmed.** The user says go, or you keep designing.
2. **Every build step carries an observable "Done when".** WHEN `<trigger>` THE SYSTEM SHALL
   `<observable response>`. "It works" is not a criterion.
3. **The bundle is self-contained.** A Claude Code instance with zero context builds from it without
   asking a single clarifying question.
4. **Write to the user's cwd, never inside the plugin.** The plugin cache is not a workspace.
5. **Detect the user's language from their first message** and stay in it — interview and bundle.
6. **Never hard-depend on a skill.** Not installed → fall back to the knowledge base and
   `WebFetch`/`WebSearch`, say so in one line, keep going.

## After completion

Print the bundle path, the task count, the first task id, and one line: run `/architect-next` from
the **target project root** to start building. Single-file mode has no `tasks.json`, so say that
resume is manual and hand over the path alone.
