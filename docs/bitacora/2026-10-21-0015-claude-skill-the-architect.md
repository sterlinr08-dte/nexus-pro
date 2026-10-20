# 2026-10-21 00:15 · Claude · Skill The Architect instalada

## Pedido del dueño
El dueño mandó una captura de un reel de The Architect (tododeia) y pidió «Instalar skills».

## Qué es
Un «arquitecto» para Claude Code. Funciona en tres pasos:
1. te entrevista sobre lo que quieres construir;
2. elige la tecnología y diseña el sistema completo;
3. escribe un **plano** (blueprint) en markdown, del que otra sesión de Claude construye paso a paso. Cada paso trae sus criterios de aceptación y su comando de verificación.

No escribe código de la app. Sirve para proyectos nuevos y para proyectos existentes (modo brownfield).

## Revisión
- Repo: github.com/Hainrixz/the-architect @ a25b09e, v2.6.0, licencia MIT. Es del mismo autor que `abogado-del-diablo`.
- Solo trae instrucciones .md. No tiene scripts ni telemetría.
- La única red que usa es consultar versiones en npm, PyPI y registros parecidos.

## Instalación
- Se copió a `.claude/skills/the-architect` en `nexus-pro` y en `bayolcell-taller`. Incluye `SKILL.md`, `knowledge/`, `questions/`, `templates/`, `agents/`, `commands/` y `LICENSE`.
- En la nube los plugins no corren. Por eso se cambió `${CLAUDE_PLUGIN_ROOT}` por `.claude/skills/the-architect`.
- Se agregó en `LICENCIAS-TERCEROS.md` y en `CLAUDE.md` (NEXUS), en la fila «Código y revisión».

## Uso recomendado
Antes de proyectos o funciones grandes. Ejemplos:
- la iniciativa de custodia y cierre por ciclo;
- una app nueva;
- la integración de IMEI por almacén cuando llegue la respuesta de Dagoberto.

No usarla para arreglos chicos.

## Estado
En las ramas (`claude/review-claude-md-jpzk7k` y `claude/prefactura-limpia`). No se publica sin «publícalo».
