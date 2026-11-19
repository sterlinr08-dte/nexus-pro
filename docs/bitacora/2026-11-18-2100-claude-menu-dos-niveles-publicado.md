# 18-nov-2026 21:00 (RD) — Claude — Menú de dos niveles publicado (6069)

Sigue a `2026-11-18-2030-claude-menu-dos-niveles-6069.md`.

## Publicación
- El dueño tocó «Publícalo». PR #532 fusionado a `main` (commit `5e8e57f77270ef6d556118efeb4e65d795fde188`).
- En vivo: `nexusprord.com/parches-seguros.js` muestra `b=6069`, y `parches-menu-dos-niveles.js` responde 200.

## Verificación en vivo (demo)
- La demo (`/demo`) entra como **tienda** (`org-tienda`). Ahí el menú nuevo no aplica, por diseño:
  - versión 6069, sin errores de consola, a 1440 y 390 px;
  - la pantalla queda igual con el menú nuevo encendido y apagado (`nx_m2_off`). La tienda no cambió.
- **No lo verifiqué en vivo en una empresa de seguros:** la demo no tiene una, y no se entra a cuentas reales del dueño.
  - Lo de seguros quedó probado en local con la app real: `qa-menu-dos-niveles`, 62/62.

## Memoria
- `docs/MEMORIA.md`: fila nueva en «Qué tenemos funcionando».

## Siguiente paso
- Que el dueño o Muse lo vean en una empresa de seguros, en PC y en el iPhone.
- Luego, el estilo 5 en el taller (`bayolcell-taller`).
