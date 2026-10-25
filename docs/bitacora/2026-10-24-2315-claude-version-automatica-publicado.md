# 2026-10-24 23:15 (RD) — Claude — Publicado: número de publicación automático (PR #404)

Sigue a `2026-10-24-2247` y `2026-10-24-2300`. El dueño dijo «Publícalo».

- PR #404 unido a `main` (squash), commit `289ac12`. El despliegue de Workers Builds terminó con éxito.

## Verificado en nexusprord.com
- La página principal trae `NX_DEPLOY="d9b67489"`.
- JS: `max-age=31536000, immutable`. `sw.js`: `no-cache`.
- 82 de 82 archivos propios se pidieron con el número de publicación. 0 errores de JS.
- `/boleto.html?id=x` → 307, igual que antes.

## Medición en vivo

| | 1ª visita | 2ª visita | Lo que baja la 2ª |
|---|---|---|---|
| Wi-Fi | 4,3 s | **0,85 s** | 12 KB |
| 4G | 13,4 s | **0,95 s** | 12 KB |

Antes de los dos cambios, la 2ª visita tardaba entre 4 y 7,4 s y bajaba 461 KB.

## Regla nueva
Todo `.js` o `.css` propio se carga con el número de publicación. Está anotada en `docs/MEMORIA.md §8`.
