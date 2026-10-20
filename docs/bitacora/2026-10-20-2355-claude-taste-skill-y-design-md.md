# 2026-10-20 23:55 · Claude · Taste Skill instalada y DESIGN.md común a los 3 proyectos

## Pedido del dueño
- Mandó un reel con 5 skills de diseño: https://www.instagram.com/reel/DetrRD5PKKL/.
- Después pidió: «instala las dos». Son las dos que faltaban: Taste Skill y Awesome DESIGN.md.

## Lo que muestra el reel
| Skill | Estado |
|---|---|
| Frontend Design | ya instalada |
| Web Design Guidelines | ya instalada |
| Playwright | ya se usa en los bancos de prueba (`webapp-testing`) |
| Taste Skill | faltaba, se instaló |
| Awesome DESIGN.md | faltaba, se tomó la idea y se escribió el propio |

## Qué se hizo
1. **Taste Skill** (github.com/Leonxlnx/taste-skill @ 6010f91, MIT)
   - Se copió como `.claude/skills/design-taste-frontend` en `nexus-pro` y en `bayolcell-taller`, con su `LICENSE`.
   - Quedó anotada en `LICENCIAS-TERCEROS.md`.
   - **Revisión de los scripts Node:**
     - la red se usa solo para fotos de colecciones abiertas (Openverse, Wikimedia, Art Institute, Met, Archive.org, NASA, picsum) y Google Fonts;
     - abren Chrome/Chromium local;
     - guardan un historial en `~/.taste-skill`;
     - no usan claves ni telemetría.
   - **Uso:** solo para páginas públicas nuevas. Es pesada: de 30 a 45 minutos por página.
2. **DESIGN.md**
   - En `nexus-pro` ya existía uno, de la versión 58.86.
     - Por error se sobrescribió primero; se **restauró igual** y se le agregó la **sección 9 «Estilo común de los 3 proyectos»**.
     - Las secciones 1–7 de NEXUS siguen mandando.
   - En `bayolcell-taller` el mismo texto común quedó como `DESIGN.md`.
   - **Contenido de la sección común:**
     - colores reales;
     - acento por proyecto;
     - letra, con la nota de que en Bayol no se usa mono para números;
     - componentes: 44/48/16 px, estados en píldora, ventana emergente, ⓘ;
     - movimiento (nxPopIn, cascada, curva `.22,1,.36,1`);
     - las reglas del dueño.
3. **`CLAUDE.md`:** en la fila de Diseño, leer primero `DESIGN.md`, y se agrega `design-taste-frontend`.

## Pendiente
- `studio-rd` no está en esta sesión. Hay que copiar ahí el mismo `DESIGN.md` común y la skill, en una sesión con ese repo.
