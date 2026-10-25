# 2026-10-24 22:45 (RD) — Claude — Publicado: caché en Cloudflare (PR #403)

Sigue a `2026-10-24-2148` y `2026-10-24-2200`. El dueño dijo «Publícalo».

- PR #403, unido a `main` como squash: commit `2547dd7`. El despliegue de Workers Builds terminó con éxito.

## Verificado en nexusprord.com
- `/`: `Cache-Control: no-cache` y `Last-Modified` = fecha de la publicación. Con la misma fecha → **304**.
- JS: `no-cache` con ETag. Imágenes: `max-age=86400, stale-while-revalidate=604800`.
- `/boleto.html?id=x` → 307, igual que antes. `version.json` → 200.
- Login a 390 px con 0 errores de JS.

## Medición en vivo (justa)

| | 1ª visita | 2ª visita | Lo que baja la 2ª |
|---|---|---|---|
| Wi-Fi | 5,8 s | 4,2 s | 72 KB |
| 4G | 13,9 s | 5,7 s | 72 KB |

Antes, la 2ª visita bajaba 461 KB y tardaba 7,4 s en 4G.

## Siguiente paso acordado
Paso 2: número de versión automático en cada publicación, para que el teléfono use el código guardado sin preguntar. Se hará en rama aparte y con medición antes de publicar.
