# 2026-11-27 21:40 RD · Claude — Correcciones de la revisión de temas publicadas

Sigue a `2026-11-27-2055-claude-revision-temas-paleta.md`. El dueño aprobó publicar las correcciones 1 y 2 (lo transmitió Muse, 21:24 RD).

- **Publicado:** `main` avanzó por fast-forward de `051724b` a **`55399b2`**, el mismo commit de la rama `claude/revision-temas-paleta`. No hubo PR: el CLI de GitHub no tenía sesión válida, y `main` no se había movido.
- **Contenido** (nada más):
  - `index.html`, corrección 1: Premium solo se guarda con la base ya leída (`_prefsListas`).
  - `index.html`, corrección 2: `nx_tema_luz` / `nx_tema_noche` llevan el id del usuario.
  - `scripts/qa-tema-revision.mjs`: prueba nueva, no se sirve en la app.
  - La bitácora de la revisión.
- **En vivo (21:36 RD, despliegue `b8c9137e`):**
  - `nexusprord.com/` es idéntico a `55399b2:index.html`. La única diferencia es la marca `NX_DEPLOY` que agrega el Worker.
  - Probado como iPhone 13 con `nx_tema` en stripe, apple, linear, premium, clasico y sin nada guardado: clases y acento correctos y 0 errores. Premium y sin nada guardado quedan en Glass oscuro.
  - Las dos correcciones están en `aplicarTema` y `toggleDarkMode`.
- **No verificado:** la sesión real del dueño en su iPhone.
- **Para volver atrás:** `git revert 55399b2`.
- Esta bitácora queda en la rama, no en `main`: el dueño pidió no publicar nada más que las dos correcciones.
