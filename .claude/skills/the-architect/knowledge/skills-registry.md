# Skills Registry / Registro de Skills

Maps Claude Code skills to The Architect's workflow and to blueprint sections.

> **Verified / Verificado:** 2026-10-17. Every star count, license, and last-push date below was
> read from the live GitHub API that day; every install command from the repo's own README or
> plugin manifest. Nothing is estimated.

**The bar / El criterio.** A skill is listed here only if it is (a) first-party or well-established,
(b) licensed, (c) pushed recently, and (d) something we actually use. Exception: repos maintained by
tododeia.com are listed regardless of star count, because we control them.

**Invocation / Invocación.** Many modern skills **auto-activate** — they are not slash commands.
A leading `/` below means it really is a slash command. No slash means it activates on intent and
must be named explicitly in prose. **Writing a slash command that does not exist is a silent
failure** — nothing happens and the workflow quietly skips the step.

---

## 1. Design-phase skills — used BY The Architect

Skills de la fase de diseño — las usa El Arquitecto durante la entrevista.

| Skill | Phase | What it adds | Repo | ★ · license | Install |
|-------|-------|-------------|------|------------|---------|
| `/last30days` | 2 | What people actually said about a stack or niche **this month** — recency-scoped research instead of model memory | `mvanhorn/last30days-skill` | ★64.6k · MIT | `/plugin marketplace add mvanhorn/last30days-skill`<br>`/plugin install last30days` |
| `find-skills` | 2 | Discovers installable build-phase skills to name in the blueprint | `vercel-labs/skills` | ★35.3k · MIT | `npx skills add vercel-labs/skills --skill find-skills -g` |
| `ui-ux-pro-max` | 3 | The concrete visual system — palette hexes, type scale, font pairing, component style | `nextlevelbuilder/ui-ux-pro-max-skill` | ★136.8k · MIT | `/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill`<br>`/plugin install ui-ux-pro-max@ui-ux-pro-max-skill` |
| `emil-design-eng` | 3 | Motion and interaction architecture — easing, duration budgets, enter/exit behavior | `emilkowalski/skills` | ★46.9k · MIT | `npx skills@latest add emilkowalski/skills` |
| `agent-browser` | 3 | Reference-site analysis + clean markdown extraction from any URL | `vercel-labs/agent-browser` | ★44.1k · Apache-2.0 | `npm install -g agent-browser`<br>`npx skills add vercel-labs/agent-browser` |
| `browser-harness` | 3 | Escalation: drives your **real logged-in Chrome** when the reference site is behind auth | `browser-use/browser-harness` | ★18.5k · MIT | Paste the setup prompt from the repo README (uses `uv`; Python requirement per the upstream README) |
| `pdf` | 1 | Reads client-supplied spec PDFs, RFPs, and brand guides during discovery | `anthropics/skills` | ★181.7k · proprietary (source-available, first-party) | `/plugin marketplace add anthropics/skills`<br>`/plugin install document-skills@anthropic-agent-skills` |
| `claude-api` | 2–4 | Current Claude model IDs, pricing, API parameters, tool use, MCP and agent SDK reference — **read before writing any Claude model ID, price, or API parameter** | `anthropics/skills` | ★181.7k · Apache-2.0 (this skill) | Bundled with Claude Code — nothing to install. Elsewhere: `/plugin marketplace add anthropics/skills`<br>`/plugin install claude-api@anthropic-agent-skills` |
| `/abogado-del-diablo` | 3 | Gate B adversarial pre-mortem — attacks the drafted architecture from eight angles before the confirmation gate | `Hainrixz/abogado-del-diablo` | ★36 · MIT · *tododeia* | `/plugin marketplace add Hainrixz/abogado-del-diablo`<br>`/plugin install abogado-del-diablo@abogado-del-diablo` |

**Notes / Notas**

- `/last30days` is a recency and sentiment engine, not a technology-comparison engine. Use it for
  "what is the current opinion on X". For version numbers and API shapes, use `WebFetch` against the
  official docs — that is always authoritative and always available.
- `browser-harness` needs a human to tick `chrome://inspect/#remote-debugging` and click Allow on
  first run. It cannot run fully autonomously — prefer `agent-browser` unless the site needs your
  real session.
- `claude-api` auto-activates when the code imports the Anthropic SDK (per code.claude.com/docs/en/skills); Claude Code's docs list it among
  the **bundled skills** (`code.claude.com/docs/en/skills`, also callable explicitly as `/claude-api`
  there). The `claude-api@anthropic-agent-skills` plugin name is read from the repo's
  `.claude-plugin/marketplace.json`; the README documents the `/plugin install <plugin>@anthropic-agent-skills`
  form. Fallback: `WebFetch` the vendor docs at `platform.claude.com/docs` — never write a model ID
  or price from memory.
- `/abogado-del-diablo` is a real slash command (README: "invoke it with `/abogado-del-diablo`";
  `--proyecto` and `--demolicion` variants). Fallback: run the eight-angle pre-mortem inline from
  `questions/phase-3-confirmation.md` — Gate B is mandatory, only the tool is optional.
- `emil-design-eng` returns a generic pitch if invoked with no specific question. Always hand it a
  concrete one.
- The Anthropic `document-skills` PDF skill covers extraction, manipulation, and forms — **not**
  visual design. Describe it accurately. It is indexed by
  [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills) under
  `document-skills/pdf`, which points at this same upstream. Install from Anthropic directly: the
  skill is proprietary and source-available, so use it in place — never copy its text into a
  generated blueprint or target repo.

---

## 2. Build-phase skills — recommended IN blueprints

Skills de la fase de construcción — se nombran en el blueprint para el Claude que construye.

Every row goes into blueprint **Section 18** *with its install command*. Rule 8 promises a
self-contained blueprint; naming a skill the builder cannot install breaks that promise.

| Skill | Blueprint section | When to recommend | Repo | ★ · license | Install |
|-------|------------------|-------------------|------|------------|---------|
| `frontend-design` | Frontend Architecture, Build Order | Any project with a UI | `anthropics/skills` | ★181.7k · Apache-2.0 (this skill) | `/plugin marketplace add anthropics/skills`<br>`/plugin install example-skills@anthropic-agent-skills` |
| `ui-ux-pro-max` | Design System, Build Order | Any project with a UI | `nextlevelbuilder/ui-ux-pro-max-skill` | ★136.8k · MIT | see §1 |
| `emil-design-eng` | Frontend Architecture | Anything with meaningful motion or transitions | `emilkowalski/skills` | ★46.9k · MIT | `npx skills@latest add emilkowalski/skills` |
| `playwright-cli` | Testing Strategy, Build Order | E2E testing is in scope | `microsoft/playwright-cli` | ★14.3k · Apache-2.0 | `npm install -g @playwright/cli@latest`<br>`playwright-cli install --skills` |
| `agent-browser` | Build Order | Project needs web content extraction or browser automation | `vercel-labs/agent-browser` | ★44.1k · Apache-2.0 | see §1 |
| `/claude-seo-ai:audit` `:geo` `:fix` `:score` | Deployment, Build Order | Marketing sites, content platforms, any public-facing surface. Covers classic SEO **and** the GEO/AEO axis — being citable by AI answer engines | `Hainrixz/claude-seo-ai` | ★75 · MIT · *tododeia* | `/plugin marketplace add Hainrixz/claude-seo-ai`<br>`/plugin install claude-seo-ai@claude-seo-ai`<br>`/reload-plugins` |
| `/humanizalo` | Build Order (content step) | Project includes marketing copy or written content. Bilingual EN/ES | `Hainrixz/humanizalo` | ★93 · MIT · *tododeia* · **stale:** last push 2026-03-22 — re-check before recommending | `git clone https://github.com/Hainrixz/humanizalo.git ~/.claude/skills/humanizalo` |
| `pdf` | Build Order | Project generates or parses PDFs | `anthropics/skills` | ★181.7k · proprietary (source-available, first-party) | see §1 |

---

## 3. Graceful degradation — standing rules

Degradación elegante — reglas permanentes.

### EN

1. **Check, don't assume.** Before invoking any skill here, confirm it is installed. If it is not:
   do not stop, do not interrupt the interview to ask the user to install it, and do not pretend you
   ran it. Fall back and keep moving.
2. **Your knowledge base is the floor.** Every design-phase skill has a fallback in this repo:
   `capabilities/styling.md` and `frontend-architecture.md` stand in for `ui-ux-pro-max`;
   `capabilities/database.md`, `auth.md`, and `deployment.md` cover their areas. Built-in
   `WebSearch` and `WebFetch` stand in for `/last30days` and `agent-browser`. The interview never
   degrades below what those files support.
3. **Say what you did.** When you fall back, note it in one line where it matters — *"Stack
   comparison based on internal knowledge; `/last30days` was unavailable, so sentiment is uncited."*
   Never present a fallback as a research result.
4. **A skill you can't run may still belong in the blueprint.** The builder's machine is not yours.
   List it in Section 18 **with its install command** so they can install it.
5. **Never invent an install command.** If you are not certain, write *"check the repo README"*.
   A wrong install command is worse than none.
6. **Never block generation on a missing skill.** Rule 8 requires a self-contained blueprint. A
   missing skill degrades the *research*, never the *deliverable*.

### ES

1. **Verifica, no asumas.** Antes de invocar cualquier skill de aquí, confirma que está instalada. Si
   no lo está: no te detengas, no interrumpas la entrevista para pedirle al usuario que la instale, y
   no finjas que la ejecutaste. Usa el respaldo y sigue.
2. **Tu base de conocimiento es el piso.** Cada skill de diseño tiene un respaldo en este repo:
   `capabilities/styling.md` y `frontend-architecture.md` sustituyen a `ui-ux-pro-max`;
   `capabilities/database.md`, `auth.md` y `deployment.md` cubren lo suyo. `WebSearch` y
   `WebFetch` sustituyen a `/last30days` y `agent-browser`. La entrevista nunca baja de ahí.
3. **Di lo que hiciste.** Cuando uses un respaldo, anótalo en una línea donde importe — *"Comparación
   basada en conocimiento interno; `/last30days` no estaba disponible, así que el sentimiento no está
   citado."* Nunca presentes un respaldo como resultado de investigación.
4. **Una skill que no puedes correr igual puede ir en el blueprint.** La máquina de quien construye no
   es la tuya. Inclúyela en la Sección 18 **con su comando de instalación**.
5. **Nunca inventes un comando de instalación.** Si no estás seguro, escribe *"revisa el README del
   repo"*. Un comando equivocado es peor que ninguno.
6. **Nunca bloquees la generación por una skill ausente.** La Regla 8 exige un blueprint
   autocontenido. Una skill ausente degrada la *investigación*, jamás el *entregable*.

---

## 4. Corrected and removed

Corregido y eliminado. One line each, so this is settled.

| Previous entry | Verdict | Why | Now |
|---------------|---------|-----|-----|
| `/deep-research` | **REPLACED** | Pointed nowhere. The closest real skill is unlicensed and needs paid third-party API keys | `/last30days` (★64.6k, MIT, key-free) |
| `/seo-audit` | **REPLACED** | Generic and stale — optimized for classic crawlers only. In 2026 the GEO/AEO axis is a first-class distribution channel | `/claude-seo-ai:audit` `:geo` `:fix` `:score` |
| `/pdf-design` | **REPLACED** | The skill it referred to was superseded by its own maintainer and hardcodes Linux-only Chromium paths | `pdf` from `anthropics/skills` — first-party |
| `/chrome-bridge-automation` | **REPLACED** | Merged away upstream on 2026-03-25; the skill no longer exists under that name | `agent-browser` (default), `browser-harness` (real-Chrome escalation) |
| `/web-reader` | **REMOVED** | No canonical skill by this name exists — several unrelated implementations share it | `agent-browser read <url>`, or built-in `WebFetch` |
| `/shadcn-ui` | **REPLACED** | Not a slash command; the shadcn skill is auto-activating, so `/shadcn-ui` was a silent no-op | `ui-ux-pro-max` for the design system |
| `/humanizer` | **CORRECTED** | The tododeia skill's real invocation is `/humanizalo` — a blueprint following the old entry literally would fail | `/humanizalo` |
| `/ui-ux-pro-max`, `/frontend-design`, `/playwright-cli` | **CORRECTED** | Slash form does not exist on Claude Code — all three auto-activate | Same skills, slash dropped |
| *(registry had no install commands)* | **FIXED** | A blueprint that names skills the builder cannot install violates Rule 8 | Every row now carries a verified install command |

---

## 5. How to include skills in a blueprint

In Section 18 (Skills to Use During Build), list each relevant skill with:

1. **Skill name** — in its real invocation form (slash only if it is really a slash command)
2. **When to use** — which build step, referencing the build order
3. **Why** — what it helps accomplish
4. **Install** — the verbatim command, so the builder can actually get it

```markdown
| Skill | When to Use | Why | Install |
|-------|-------------|-----|---------|
| ui-ux-pro-max | Steps 2, 4 (design system, layouts) | Concrete palette, type scale, component style | `/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill` then `/plugin install ui-ux-pro-max@ui-ux-pro-max-skill` |
| frontend-design | Steps 4, 5, 10 (layouts, feature UI, landing) | Production-grade, distinctive UI | `/plugin marketplace add anthropics/skills` then `/plugin install example-skills@anthropic-agent-skills` |
| /claude-seo-ai:audit | Step 11 (polish) | SEO + AI-answer-engine visibility before launch | `/plugin marketplace add Hainrixz/claude-seo-ai` then `/plugin install claude-seo-ai@claude-seo-ai` |
```
