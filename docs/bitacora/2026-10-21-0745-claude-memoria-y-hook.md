# 21-oct-2026 · MEMORIA del proyecto y recarga automática al compactar

## Pedido del dueño
«¿Qué se puede hacer para que no pierdas lo que sabes cuando se compacta este chat?» → «Hazlo».

## Cambios
- `docs/MEMORIA.md` (nuevo, unas 135 líneas). Resume:
  - reglas del dueño;
  - inventario en producción (**59.54**, verificado en vivo);
  - integraciones;
  - reglas de negocio;
  - ramas y lo que **no** está publicado;
  - pendientes;
  - errores que no se repiten;
  - dónde buscar más.
- La redacción la hizo una ayuda (subagente) a partir de `AGENTS.md` (de `origin/main`), `CLAUDE.md`, `REGLAMENTOS.md`, `HERRAMIENTAS.md`, `TRASPASO-CLAUDE.md` y la bitácora. Luego se revisó.
- `.claude/settings.json` + `.claude/hooks/memoria.sh`: el hook `SessionStart` (`startup|resume|compact`) imprime la MEMORIA de este proyecto y la de `bayolcell-taller` y `studio-rd` si están clonados al lado. Solo lee archivos y nunca falla.
- `CLAUDE.md`: regla al inicio (leer la MEMORIA, actualizarla en cada entrega, «anótalo en la memoria»).

## Hallazgo
- El «Estado vivo» de `AGENTS.md` en la rama dice 59.22, pero producción está en 59.54.
- Incluso el de `main` sigue marcando 59.54 como «sin publicar».
- Queda como pendiente actualizarlo.
