# 2026-10-15-2209 — Claude — 13 skills de Instagram instaladas (NEXUS PRO)

## Solicitud del dueño
Mandó el reel de @el_hipster (instagram.com/reel/Degn4bFonbN) que presenta «Instagram Agent Skill». Pidió instalarlas en los 3 proyectos (nexus-pro, bayolcell-taller, studio-rd) y adaptarlas al español; autorizó por escrito la instalación de código de terceros.

## Qué se instaló
- 13 skills en `.claude/skills/ig-*`: ig-reel, ig-viral, ig-plan, ig-profile, ig-carousel, ig-story, ig-caption, ig-reply, ig-comment, ig-dm, ig-repurpose, ig-audit, ig-human.
- Fuente: https://github.com/Jakeschincariol/instagram-agent-skill, commit `d03c56b`, licencia MIT (copiada como `LICENSE` en cada carpeta).
- Archivos copiados sin cambios, salvo una **nota de instalación en español** al inicio de cada `SKILL.md`.

## Revisión antes de instalar
- Los scripts de Python (hookscore, beats, caption, humanize, detect, swipe) no importan librerías de red y no llaman a internet. No piden claves y no entran a Instagram.
- Ninguna skill publica: solo escriben borradores. ig-viral dice explícitamente que no se debe pedir la clave de Instagram ni raspar a volumen.

## Adaptación
- Todas las skills deben responder en español, sin publicar ni inventar cifras, y guardar lo útil en `docs/instagram/`, porque `~/.claude/instagram/` se borra en la nube.
- ig-reel:
  - la nota de ganchos usa palabras en inglés y sale baja en español; se usa solo como guía;
  - reels de 20 a 25 s (consejo de Meta, 15-oct-2026);
  - una sola llamada al final («Comenta PRECIO…» o WhatsApp);
  - `{{dato}}` cuando falte un dato real.
- ig-viral: buscar cuentas de RD y Latinoamérica; ver un reel con `ver-video-redes`.
- ig-human: el detector es para inglés.
- ig-reply: no reemplaza las respuestas automáticas de BAYOL.
- Se registró en HERRAMIENTAS.md y el catálogo de CLAUDE.md.

## Rama, publicación y pruebas
- Rama: `claude/review-claude-md-jpzk7k`. Sin publicar en main; no cambia nada de la app.
- Pruebas: la sesión cargó las 13 skills.
- No se ejecutaron sus scripts: el permiso de la sesión lo bloqueó y la revisión fue leyendo el código.

## Pendiente
- Crear `docs/instagram/voz-<negocio>.md` con 3 reels reales del dueño la primera vez que se use ig-reel.
