---
description: Fast-track blueprint — three questions, smart defaults for everything else, still validator-gated. For when you just want it built. / Blueprint express — tres preguntas, defaults inteligentes, con el mismo validador.
argument-hint: "[one-line project description]"
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

# `/architect-quick` — fast-track

You are being invoked as `/architect-quick`. Same machinery as `/architect`, compressed interview.
Read the skill first — it is still the source of truth:

- Plugin install: `.claude/skills/the-architect/skills/architect/SKILL.md`
- Clone install: `./CLAUDE.md` at the repo root — the clone-mode mirror of the skill. Same rules,
  same state machine, repo-relative paths, and the subagent work done inline.

## Mode

| Setting | Value |
|---|---|
| Entry | Greenfield |
| Depth | 3 questions, one message, then defaults |
| Output | Derived and announced at `.claude/skills/the-architect/questions/phase-4-generate.md` **Step 2, which is authoritative on emission mode** (12 or more steps = bundle); an explicit user preference wins. Quick builds usually land under the threshold, but the step count decides, not this row. Single file → `./blueprints/<project-slug>-blueprint.md` in the user's cwd; bundle → `./blueprints/<project-slug>/`. |
| Gate | `blueprint-validator` must return **PASS** — speed does not buy an exemption |

## The three questions — ask all three in ONE message

1. **What is it?** One or two sentences.
2. **Who uses it?** Public users, an internal team, other developers — and roughly how many.
3. **Any tech you must use or must avoid?** Existing stack, hosting constraint, language. "No
   preference" is a valid answer and the fastest one.

If `$ARGUMENTS` already answers Q1, say so and ask only Q2 and Q3. Do not re-ask what you were told.

Then stop asking. Everything else is a default you choose and **state out loud**.

## Defaults — decide, announce, do not ask

| Decision | Default |
|---|---|
| Shape | Classify from the three answers using `.claude/skills/the-architect/questions/phase-1-discovery.md`. Ambiguous → pick the closer one, say why, and name the rejected alternative. |
| Runtime track | The shape file's **Default runtime track**. Deviate only if Q3 forces it. |
| Capabilities | The shape file's **Core capabilities** table, nothing extra. |
| Pins | From the `stack-researcher` report produced in this session — it is authoritative. `.claude/skills/the-architect/knowledge/runtime-tracks/<track>.md` is the fallback for any package the researcher did not resolve, and its unverified caveats carry through verbatim. Never write a pin from memory. |
| Stage | MVP. Testing is smoke-level, observability is logs plus error tracking. |
| Scope | The shape's build order, trimmed to what ships something usable. |

## Flow

1. Ask the three questions. Wait.
2. Classify the shape. Read `.claude/skills/the-architect/knowledge/shapes/<shape>.md` and its default
   runtime track. Check `.claude/skills/the-architect/knowledge/stack-compatibility.md` for known-bad pairs.
3. Print a **6-line architecture card** — shape, track, data store, auth, hosting, scope — and one
   line naming the output mode the step count derives (phase-4 Step 2). Ask for a single yes. This is
   Phase 3 compressed, not skipped: the user still signs off before you write. The yes approves the
   architecture; it is not an emission-mode question. If they volunteer a mode preference, it wins.
4. Dispatch `stack-researcher` to verify pins.
5. Dispatch `blueprint-writer` to emit the blueprint from
   `.claude/skills/the-architect/templates/blueprint-template.md`,
   `.claude/skills/the-architect/templates/claude-md-template.md`,
   `.claude/skills/the-architect/templates/tasks-schema.md`, and
   `.claude/skills/the-architect/templates/epic-template.md`. Tell it the output mode explicitly — the one
   Step 2 derived, or the user's explicit preference. In single-file mode the workspace files (`CLAUDE.md`,
   `AGENTS.md`, `.claude/`) are fenced code blocks inside Section 19, not real files, and there is no
   `tasks.json` and no `epics/`. **`.claude/commands/` is never emitted in either mode.**
6. Dispatch `blueprint-validator`. FAIL → fix and re-run. Do not narrate the failure as a caveat and
   hand it over anyway.

## Rules

1. **Never more than one round of questions.** If something is genuinely undecidable from three
   answers, pick the reversible option and record it in §20.3 Decision log with its
   `Would reverse if` trigger. The blueprint has no Open Questions section by design — an unresolved
   marker left in the deliverable is a validator BLOCKER.
2. **Every build step still gets an observable "Done when"** and a verify command. This is the part
   people try to cut for speed. It is the part that makes the build survive.
3. **State every default you applied** in the summary, so the user knows what they got by omission.
4. Detect and use the user's language.

## After completion

Print the output path and the applied-defaults list. Bundle → the task count and: run
`/architect-next` from the target project root to start. Single file → say resume is manual and hand
over the path. If any default is wrong, `/architect` does the full interview instead.
