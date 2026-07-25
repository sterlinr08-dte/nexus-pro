# gstack en NEXUS PRO — subconjunto curado

Qué es: [gstack](https://github.com/garrytan/gstack) (Garry Tan / Y Combinator), un paquete
de "skills" de metodología para agentes de código. El dueño pidió instalarlo el 25-jul-2026.

**Aquí NO está gstack completo.** El paquete original pesa **70 MB** y trae 53 skills; en este
repo viven **12** que suman **~464 KB**. Lo que se dejó fuera y por qué está más abajo — para
que nadie asuma que faltan por descuido.

## Las 12 que sí están

| Skill | Para qué |
|---|---|
| `/gstack-investigate` | Depuración con investigación de causa raíz (calza con la regla #3 del dueño: "arreglos de RAÍZ, no parches") |
| `/gstack-review` | Revisión de un diff antes de publicarlo (SQL peligroso, efectos secundarios condicionales, etc.) |
| `/gstack-spec` | Convertir una idea vaga en una especificación ejecutable (útil para los mockups/briefs que llegan por chat) |
| `/gstack-plan-ceo-review` | Revisar un plan desde el lado del negocio (alcance, prioridad, qué se corta) |
| `/gstack-plan-eng-review` | Revisar un plan desde el lado de ingeniería (arquitectura, riesgo, orden) |
| `/gstack-cso` | Modo "director de seguridad" — repaso de seguridad del código |
| `/gstack-retro` | Retrospectiva de lo trabajado |
| `/gstack-health` | Panorama de calidad del código |
| `/gstack-careful` | Aviso antes de comandos destructivos |
| `/gstack-freeze` · `/gstack-unfreeze` | Limitar las ediciones a una carpeta durante la sesión |
| `/gstack-guard` | Los dos anteriores juntos |

## Qué se le quitó a cada skill (y por qué)

Cada `SKILL.md` original traía ~770 líneas de **maquinaria del instalador de gstack**, no de
metodología. Se quitaron 15 secciones por archivo:

`Preamble (run first)` · `Plan Mode Safe Operations` · `Skill Invocation During Plan Mode` ·
`First-run guidance` · `Skill routing` · `AskUserQuestion Format` · `Artifacts Sync` ·
`Model-Specific Behavioral Patch` · `Context Recovery` · `Continuous Checkpoint Mode` ·
`Context Health` · `Question Tuning` · `Operational Self-Improvement` · `Telemetry (run last)` ·
`Plan Status Footer`

Se quitaron porque llamaban a binarios de una instalación global que aquí no existe, mandaban
telemetría a un servidor externo, y —lo más importante— **dos de esas secciones proponían
reescribir el `CLAUDE.md` de este proyecto** (agregando reglas de enrutamiento de gstack y
haciéndole `commit` solo) y **borrar `.claude/skills/` con `git rm -r`**. Eso habría pisado la
memoria del proyecto, que es justo lo que no se debe tocar sin permiso.

También se ajustaron los `hooks:` de `careful`/`freeze`/`guard`: apuntaban a
`$HOME/.claude/skills/gstack/...` (instalación global). Ahora usan `${CLAUDE_SKILL_DIR}/../gstack-<x>/bin/...`
con salida limpia si el archivo no está — el mismo patrón portable que ya usaba `investigate`.

## Lo que quedó FUERA (41 skills) y por qué

- **17 dependen de un navegador propio de gstack** (`browse`, `qa`, `qa-only`, `design-review`,
  `design-html`, `design-consultation`, `design-shotgun`, `benchmark`, `canary`, `connect-chrome`,
  `pair-agent`, `devex-review`, `plan-design-review`, `office-hours`, `land-and-deploy`,
  `open-gstack-browser`, `setup-browser-cookies`). Ese navegador es un binario que hay que
  compilar con `bun install`, y el clasificador de este entorno lo bloquea. Además **ya no hacen
  falta**: este repo tiene Playwright + Chromium y la skill `webapp-testing`, que es el método que
  se usa en todo el proyecto para verificar contra el código real.
- **6 de iOS** (`ios-*`) — no aplica, NEXUS PRO es una PWA.
- **4 de gbrain / codex** (`setup-gbrain`, `sync-gbrain`, `codex`, `skillify`) — dependen de
  servicios externos que este proyecto no usa.
- **`ship`, `land-and-deploy`, `setup-deploy`** — contradicen el flujo de publicación ya
  establecido en `CLAUDE.md` (subir `APP_VERSION` + `version.json`, rama propia → PR → fusionar
  con las herramientas MCP de GitHub). Mejor no tener dos rituales de publicación compitiendo.
- **`learn`, `document-release`, `context-save`, `context-restore`** — este proyecto ya guarda su
  memoria y su historial en `CLAUDE.md` + `version.json`. Un segundo sistema de memoria en
  paralelo confunde más de lo que ayuda.
- El resto (`autoplan`, `diagram`, `scrape`, `landing-report`, `make-pdf`, `benchmark-models`,
  `document-generate`, `plan-devex-review`, `plan-tune`, `gstack-upgrade`, `guard`-adyacentes)
  — o dependen de las anteriores, o no aplican al proyecto.

## Cómo actualizarlo

No hay actualización automática (a propósito: `/gstack-upgrade` no se instaló para que nada
reescriba estos archivos solo). Para traer una versión nueva:

```bash
git clone --depth 1 https://github.com/garrytan/gstack.git /tmp/gstack
```

y repetir la curación: copiar solo las 12 carpetas, quitar las 15 secciones de maquinaria,
portar los `hooks:`, y poner `name: gstack-<x>` en el frontmatter para que calce con la carpeta.

Versión de origen: **gstack v1.60.1.0** (25-jul-2026).
