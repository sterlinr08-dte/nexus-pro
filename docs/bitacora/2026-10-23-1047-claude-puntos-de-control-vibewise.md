# Skill «puntos-de-control»: la forma de trabajar del reel de VibeWise — 23-Oct-2026 10:47 RD

**Dueño:** mandó el reel instagram.com/reel/De0wcU4Pxl9 (Fer Ayestarán, sobre el plugin VibeWise) y dijo «me gustaría eso».

## Qué se vio en el reel (26 s, descargado con yt-dlp y revisado cuadro a cuadro)
Barra «lo que entiendes de tu app» que baja de 80 % a 15 % mientras la IA escribe sola (+16, +78, +140, +203 líneas). Luego el
plugin la frena: **pregunta cómo lo harías tú**, **muestra opciones A/B con ventajas e inconvenientes**, **decides tú** (sello «TU
DECISIÓN», 0 líneas escritas hasta elegir), **informe de qué cambió y por qué**, y para un proyecto existente **antes dibuja un
mapa**. «Vas igual de rápido; dentro de un mes tu app la entiendes tú».

## Revisión del plugin (github.com/nykooi1/vibe-wise)
MIT, de Noah Kim (no es de Anthropic), 3.9k estrellas, 79 commits, última versión 9-oct-2026. Trae ganchos (hooks), scripts de
Python y notas en `.vibe-wise/`; está hecho para programadores que quieren aprender. **No se instaló** (regla: nada de ganchos ni
scripts de terceros sin revisar; y el dueño no es programador). Se tomó **solo la forma de trabajar**.

## Qué quedó (igual en nexus-pro, bayolcell-taller y studio-rd)
- `.claude/skills/puntos-de-control/SKILL.md`: antes de código no trivial → 2–3 opciones en palabras sencillas con ventajas y
  desventajas (y maqueta si se puede ver) → el dueño decide → después informe (qué cambió, por qué, qué pruebas pasaron, qué le
  toca a él) → mapa corto antes de tocar un módulo desconocido. Cambios triviales se hacen directo.
- `CLAUDE.md`: regla corta del dueño que apunta a la skill.
- `HERRAMIENTAS.md` (donde existe): fila nueva.

## Nota
Hoy ya se trabajó así en la Prefactura de Bayol (maquetas A/B → eligió B → informe). La skill lo vuelve regla.
