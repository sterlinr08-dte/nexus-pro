# Skills nuevas: Superpowers (parte), Find Skills; revisión de Claude-mem

## Pedido del dueño
Mandó una lista de 5 skills: Find Skills, Skill Creator, Superpowers, Claude-mem y Frontend Design. Dijo: «Antes vamos a instalar estas skills».

## Revisión (regla: las skills nuevas se revisan antes de instalarlas)

| Skill | Estado |
|---|---|
| Frontend Design | Ya estaba (`.claude/skills/frontend-design`) |
| Skill Creator | Ya estaba (`skill-creator`, de Anthropic, a nivel de cuenta) |
| Find Skills (`vercel-labs/skills` @ a80e4c9, MIT) | **Instalada**, solo el `.md`. Nota NEXUS: aquí solo busca; nunca `npx skills add` directo |
| Superpowers (`obra/superpowers` @ 2ce8aa1, MIT) | **Instalada en parte**, ver abajo |
| Claude-mem (`thedotmack/claude-mem`, Apache 2.0) | **No instalada**, ver abajo |

### Superpowers
- **Instaladas, solo `.md`:**
  - `brainstorming`, sin el servidor visual;
  - `writing-plans`;
  - `verification-before-completion`;
  - `systematic-debugging`;
  - `requesting-code-review`;
  - `receiving-code-review`.
- Cada una lleva una nota NEXUS al inicio:
  - español sencillo;
  - `superpowers:x` se cambia por la skill `x` del repo;
  - planes en `docs/planes/`;
  - publicar solo con «publícalo».
- **No se instalaron:**
  - **El gancho de inicio de sesión.** Inyecta `using-superpowers` como «EXTREMELY_IMPORTANT» en cada sesión y obliga a pasar por skills antes de cualquier respuesta. Choca con la forma de trabajar del dueño (respuestas cortas) y con `CLAUDE.md`.
  - **Las que dependen de programas suyos:** `executing-plans` y `subagent-driven-development` (scripts de workspace).
  - **`test-driven-development`.** Ya existe una con ese nombre.
  - **Otras:** `using-git-worktrees`, `finishing-a-development-branch` (ofrece unir a main, y aquí la regla de publicación manda), `dispatching-parallel-agents`, `writing-skills` (para eso está `skill-creator`) y `diagnosing-superpowers`.
- Revisado: los `.md` instalados no mandan nada a terceros. El único enlace externo de los programas es un logo en el servidor visual, que no se instaló.

### Claude-mem: por qué NO
- **Graba todo lo que hace la IA.** Tiene ganchos en el inicio de sesión, en cada mensaje, antes y después de cada herramienta, y al cerrar. Ahí entran datos de clientes y cualquier clave que aparezca en pantalla.
- **Comunicación con terceros:**
  - envía estadísticas a PostHog (`us.i.posthog.com`);
  - tiene sincronización con su nube (`sync.cmem.ai`);
  - puede usar OpenRouter.
  - Esto va contra la regla de no mandar datos a servicios externos.
- **No serviría en estas sesiones.** Corren en la nube y el contenedor se borra al terminar; su base local se perdería.
- **Ya tenemos lo mismo.** `docs/MEMORIA.md` se recarga sola con el gancho `.claude/hooks/memoria.sh`, junto con la bitácora.

## Archivos
- `.claude/skills/{brainstorming,writing-plans,verification-before-completion,systematic-debugging,requesting-code-review,receiving-code-review,find-skills}/`
- `.claude/skills/LICENCIAS-TERCEROS.md`: licencias MIT.
- `HERRAMIENTAS.md`: nueva sección «Método de trabajo».

## Publicación
- Rama `claude/skills-nuevas`. Las skills solo se cargan en las sesiones nuevas cuando están en `main`.
- Subir a `main` cuenta como publicación: los teléfonos bajan los archivos una vez. Mejor juntarlo con la próxima entrega o publicarlo cuando el dueño diga.
