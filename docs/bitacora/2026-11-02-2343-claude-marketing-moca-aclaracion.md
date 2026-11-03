# 2026-11-02 23:43 (RD) — Claude — Aclaración: dos «RECIBIR IPHONE VIEJO» en Ventas Moca

Corrige y complementa `2026-11-02-2339-claude-marketing-moca-anuncio-nuevo.md`.

## Qué pasó
- El conjunto VENTAS Y FINANCIAMIENTO MOCA (120252288436220594) **ya tenía** un anuncio «RECIBIR IPHONE VIEJO» (ad 120252288436170594, creativo 2577660606033883).
  - Estaba **en pausa** desde que se creó la campaña.
  - Gasto: US$0.
- **No lo vi** porque revisé los anuncios con Windsor filtrando por gasto mayor que 0, y ese filtro deja fuera los anuncios pausados que nunca gastaron. **Error mío de método.**
- El anuncio que creé (120252593243590594) usa **otro creativo**: el 990360814108873, el mismo que el anuncio de Santiago (US$0.15 por conversación).

## Estado
- Los dos están en pausa en el mismo conjunto. El nuevo sigue en revisión de Meta.
- **Recomendación:** activar solo el nuevo, porque su creativo es el probado, y dejar el viejo en pausa. Windsor no permite borrar.

## Regla de método desde ahora
- Antes de crear un anuncio, listar **todos** los anuncios del conjunto con Meta (`ads_get_ad_entities` por conjunto, con cualquier estado), no solo los que gastan.
