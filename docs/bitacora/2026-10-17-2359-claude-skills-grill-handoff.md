# Skills instaladas: grill-me (+grilling), wait-what, handoff, abogado-del-diablo — Claude

- **Pedido del dueño:** mandó el reel de @ayestaran.fer («cinco skills que cambian cómo te responde Claude») y, tras la recomendación, dijo «instala las recomendaciones».
- **Revisión previa** (un agente aparte; solo descargó y leyó, sin ejecutar nada):
  - `mattpocock/skills@49dd158d1076134a641b33efb035946536778336` (MIT): `grill-me`, `grilling`, `wait-what` y `handoff`;
  - `Hainrixz/abogado-del-diablo@7ba9a5fbca612531e7871ac41a71b410a03af76f` (MIT, tododeia).
  - Sin scripts, red, telemetría ni lectura de secretos. Tampoco tienen caracteres Unicode ocultos.
- **Instaladas en `.claude/skills/`**, cada una con su `LICENSE` y una nota de instalación:
  - `grill-me` y `grilling` (grill-me no funciona sin grilling);
  - `wait-what`, **adaptada**: explica en español sencillo, en vez de inglés técnico con glosario;
  - `handoff`, **adaptada**: guarda el resumen como entrada de `docs/bitacora/` en vez de `/tmp`, que se borra;
  - `abogado-del-diablo`: solo lectura y búsqueda web; la nota prohíbe meter datos de clientes en las búsquedas.
- **No instalada:** `caveman`, porque contesta demasiado corto para el dueño.
- **Uso:**
  - `/grill-me` antes de un pedido grande;
  - `/wait-what` cuando una explicación no quede clara;
  - `/handoff` antes de abrir una sesión nueva por tema;
  - `/abogado-del-diablo` para probar una idea de negocio.
