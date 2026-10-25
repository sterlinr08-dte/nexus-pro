# 2026-10-24 23:00 (RD) — Claude — Paso 2: prueba de publicación nueva (sigue a `2026-10-24-2247-claude-version-automatica.md`)

Prueba hecha con el alias de vista previa de la rama `claude/version-auto` y un perfil de navegador persistente:

| Momento | NX_DEPLOY | JS bajados de la red | Errores JS |
|---|---|---|---|
| A: 1ª apertura | 9fc203ad | 75 | 0 |
| A2: reabrir, misma publicación | 9fc203ad | **0** (todo de la caché del teléfono) | 0 |
| B: reabrir tras otra publicación | **9ca153a9** | **75** (todo fresco, URLs nuevas) | 0 |

Conclusión: el teléfono no pregunta mientras no haya publicación nueva, y con cada publicación baja todo fresco solo. Sigue **sin publicar**: espera el «publícalo» del dueño.
