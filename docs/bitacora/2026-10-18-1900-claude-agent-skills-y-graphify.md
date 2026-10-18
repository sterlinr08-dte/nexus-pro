# 18-oct-2026 — Agent Skills (Addy Osmani) y Graphify instaladas

## Pedido
El dueño mandó el reel de Nick Saraev «5 Claude Code plugins to code like a senior dev» y luego dijo «Sí y aplícalos». Se aplicaron las 2 recomendaciones: Graphify y Agent Skills.

## Lo que muestra el reel y qué se hizo con cada cosa
| Herramienta | Qué se hizo |
|---|---|
| Agent Skills | **Instaladas 17 de 24** (ver abajo). |
| Context7 | No se instaló por ahora. Para Supabase ya tenemos `search_docs`. |
| Graphify | **Instalado** como skill propia `graphify-nexus`. |
| 21st MCP | No. Son componentes de React, que NEXUS no usa, y pide abrir una cuenta. |
| Strix | Ya estaba instalado (4 skills). |

## Revisión de seguridad
**Agent Skills**
- Origen: `addyosmani/agent-skills`, commit `aeac41d` (13-oct-2026), licencia MIT.
- Son solo instrucciones. No traen descargas ocultas, envío de datos ni comandos peligrosos.
- No se copiaron los hooks (`session-start`, `sdd-cache`, `simplify-ignore`), ni los scripts, ni `idea-refine.sh`.
- Cada SKILL.md lleva una nota que pone por encima las reglas de `CLAUDE.md`.

**Graphify**
- Origen: `Graphify-Labs/graphify`, commit `86c57be` (16-oct-2026), Apache-2.0, paquete `graphifyy==0.9.92`.
- No tiene telemetría. La red solo se usa en `graphify add <url>` y en el pase semántico con clave de API; los dos quedan prohibidos en la skill.
- Su servicio pago, Graphify Cloud, no se usa.

## Skills de Agent Skills instaladas (17)
- **Contexto y memoria:** `context-engineering`.
- **Trabajo por pasos:** `incremental-implementation`.
- **Revisar decisiones y pedidos:** `doubt-driven-development`, `interview-me`, `idea-refine`.
- **Calidad y pruebas:** `constraint-driven-development`, `test-driven-development`, `debugging-and-error-recovery`.
- **Navegador:** `browser-testing-with-devtools`.
- **Documentación oficial:** `source-driven-development`.
- **Pantallas:** `frontend-ui-engineering`.
- **Velocidad:** `performance-optimization`.
- **Seguridad:** `security-and-hardening`.
- **Interfaces:** `api-and-interface-design`.
- **Cambios de base:** `deprecation-and-migration`.
- **Registros:** `observability-and-instrumentation`.
- **Decisiones:** `documentation-and-adrs`.

## Agent Skills que no se instalaron (7)
- Repiten lo que ya tenemos: `code-review-and-quality` (`gstack-review`), `code-simplification` (`ponytail`), `spec-driven-development` (`gstack-spec`), `planning-and-task-breakdown` (`gstack-plan-eng-review`) y `git-workflow-and-versioning` (reglas de git propias).
- Chocan con las reglas de publicación: `ci-cd-and-automation` y `shipping-and-launch`. NEXUS no publica con GitHub Actions y solo publica con «publícalo».
- `using-agent-skills` es el índice del paquete completo.

## Graphify en NEXUS
- **Problema:** Graphify solo lee archivos de código, y casi todo NEXUS está dentro de `<script>` en `index.html`.
- **Solución:** la skill copia esos 22 bloques (780 KB) a `index.inline.js` en el *scratchpad* y arma el mapa ahí.
- **Prueba hecha:** 16,689 nodos y 25,251 conexiones en unos 30 s.
  - `explain "verCliente"` dio sus 14 conexiones (`nxWa`, `planB`, `arsLogoHTML`; la llaman `reversarAbono` y `abrirNotif`).
  - `path cobrarDesdeFact → regAbono` funcionó.
- **Dónde vive el mapa:** en el *scratchpad*. Se agregaron `graphify-out/` e `index.inline.js` a `.gitignore`.

## Archivos
- `.claude/skills/<17 carpetas>`
- `.claude/skills/graphify-nexus/SKILL.md`
- `.claude/skills/LICENCIAS-TERCEROS.md`
- `HERRAMIENTAS.md`
- `CLAUDE.md` (catálogo «Código y revisión»)
- `.gitignore`

## Estado
En la rama `claude/inicio-vidrio`. Son archivos de trabajo de la IA y no cambian la app en vivo. No se subieron a `main` porque la rama también lleva 59.47, que no está autorizada para publicar.
