---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

> **Nota de instalación (18-oct-2026):** adaptada de `mattpocock/skills@49dd158d1076134a641b33efb035946536778336` (MIT), `skills/productivity/handoff/`. El original guardaba el documento en `/tmp`, que se borra al terminar la sesión. Aquí se guarda en la **bitácora del repo**, como manda `CLAUDE.md`, para que la próxima sesión (Claude o ChatGPT) lo encuentre.

Escribe un documento de traspaso que resuma la conversación actual para que una sesión nueva pueda seguir el trabajo.

- Guárdalo como entrada nueva de bitácora: `docs/bitacora/AAAA-MM-DD-HHMM-claude-handoff.md` (hora de República Dominicana). Nunca edites ni borres entradas anteriores.
- Incluye: pedidos del dueño y decisiones tomadas; qué quedó publicado y qué no (ramas, commits, versiones); migraciones o funciones aplicadas; pendientes y lo que espera autorización; el siguiente paso recomendado.
- Incluye una sección «skills sugeridas» con las skills que la próxima sesión debería usar.
- No dupliques lo que ya está en otros documentos (bitácoras, specs, PR, commits): cítalos por ruta o enlace.
- No pongas claves, contraseñas, tokens ni datos personales de clientes.
- Si el dueño pasó argumentos, tómalos como el tema de la próxima sesión y enfoca el documento en eso.
- Haz commit y push del documento a la rama de trabajo, sin publicar a `main` salvo que el dueño lo haya autorizado.
