# ponytail en NEXUS PRO

Qué es: [ponytail](https://github.com/DietrichGebert/ponytail) (Dietrich Gebert), un paquete de
skills que hace que un agente de código sea "el senior más flojo del cuarto" — antes de escribir
código pregunta si de verdad hace falta (YAGNI), si ya existe en el repo, si lo resuelve el
stdlib, si hay una función nativa, si ya hay una dependencia instalada, si cabe en una línea — y
solo al final construye lo mínimo. El dueño pidió instalarlo el 1-ago-2026 tras verlo en una
captura ("17 principios").

## Las 6 skills, copiadas tal cual (sin recortar nada)

A diferencia de `gstack` (que traía ~770 líneas de maquinaria de instalador por skill y hubo que
recortar), los 6 archivos `SKILL.md` de ponytail son chicos y limpios de por sí (41-120 líneas
cada uno) — sin telemetría, sin binarios externos, sin nada que reescriba `CLAUDE.md` o toque
`.claude/skills/` solo. Se copiaron **idénticos al repo de origen**, verificado con `diff`.

| Skill | Para qué |
|---|---|
| `/ponytail [lite\|full\|ultra]` | Modo perezoso — la solución más simple que funciona de verdad |
| `/ponytail-review` | Audita un DIFF por sobre-ingeniería (qué borrar, no bugs/seguridad) |
| `/ponytail-audit` | Lo mismo pero sobre TODO el repo, no solo un diff |
| `/ponytail-debt` | Junta los comentarios `ponytail: ...` (atajos deliberados) en una lista |
| `/ponytail-gain` | Muestra las métricas publicadas del proyecto (no inventa números por-repo) |
| `/ponytail-help` | Tarjeta de referencia rápida |

## Lo que NO se instaló, y por qué

**El plugin oficial de Claude Code** (`/plugin marketplace add DietrichGebert/ponytail` +
`/plugin install ponytail@ponytail`) — esos son comandos de barra propios de la CLI de Claude
Code, y este entorno de sesión no tiene una herramienta que ejecute esa instalación de plugin de
verdad. Lo que sí se pudo hacer, y es equivalente en la práctica: copiar los 6 `SKILL.md` reales
al mismo lugar donde ya viven `frontend-design`/`gstack-*`/`webapp-testing`/etc. — quedan
invocables por nombre (`/ponytail`, `/ponytail-review`...) igual que las demás skills de este
repo, con la ÚNICA diferencia real de fondo:

**Sin activación automática por sesión.** El plugin oficial trae 3 hooks (`hooks/claude-codex-
hooks.json`: `SessionStart`/`SubagentStart`/`UserPromptSubmit`) que inyectan el modo "full" en
CADA sesión nueva sin que nadie escriba `/ponytail` — instalado así, quedaría siempre activo de
fondo. Wirear eso a mano habría significado tocar `.claude/settings.json` (hooks a nivel de
sesión, no solo skills de proyecto) — un cambio de mayor alcance que instalar un skill invocable,
así que no se hizo sin que el dueño lo pida explícito. Por ahora ponytail se invoca con `/ponytail`
(o cuando el propio nombre/las palabras "modo perezoso"/"la más simple" aparecen en el pedido),
igual que el resto de las skills — no está "siempre encendido".

## Cómo actualizarlo

```bash
git clone --depth 1 https://github.com/DietrichGebert/ponytail.git /tmp/ponytail-src
```
y copiar de nuevo los 6 `skills/<nombre>/SKILL.md` — no hace falta recortar nada (a diferencia de
gstack), son archivos autocontenidos.

Versión de origen: **ponytail v4.8.4** (1-ago-2026).
