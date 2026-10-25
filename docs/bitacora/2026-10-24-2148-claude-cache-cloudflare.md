# 2026-10-24 21:48 (RD) — Claude — Caché del navegador en Cloudflare (rama `claude/nexus-cache`, sin publicar)

## Pedido del dueño
«Puedes probar cuál es más rápido de nexus pro o bayol taller» → «Hazlo» (arreglar la caché de NEXUS en rama aparte, sin publicar).

## Diagnóstico
- Con `assets.run_worker_first: true`, el Worker (`worker.js`, solo hace la vista previa de `/boleto.html`) corría en **todas** las peticiones. Según la documentación de Cloudflare (Workers → Static assets → Headers), en ese modo **no se aplica el archivo `_headers`**.
- En producción el HTML (`/`, 395 KB comprimido) sale **sin `ETag`**: el teléfono lo vuelve a bajar entero en cada visita. Los JS sí tienen `ETag` y responden 304.
- **Corrección de una medición anterior:** la primera comparación (NEXUS 2ª visita ≈ 2 MB) estaba inflada. El proxy de la sesión hace que Chromium marque el certificado como no seguro, y en ese caso no revalida lo guardado. Repetida aceptando el certificado del proxy (como un teléfono real):

| Sitio (producción) | Wi-Fi 1ª | Wi-Fi 2ª | 4G 1ª | 4G 2ª |
|---|---|---|---|---|
| NEXUS PRO | 4,9 s · 2,1 MB | 3,8 s · 461 KB | 13,7 s | 7,6 s · 461 KB |
| Bayol taller | 1,6 s · 1,9 MB | 0,18 s · 1 KB | 10,2 s | 0,15 s |

- Esos 461 KB de la 2ª visita son casi todos el HTML sin `ETag`.
- `sw.js` **no** es el culpable: en servidor local con el mismo `sw.js` los JS vuelven con 304. No se tocó.

## Cambios
- `wrangler.jsonc`: `run_worker_first: true` → `["/boleto.html"]`. El Worker sigue armando la vista previa del boleto; lo demás se sirve directo como archivo estático.
- `_headers` (nuevo):
  - JS y CSS: `no-cache` (se revalidan con `ETag` → 304). **No** se usa `immutable` porque las capas se versionan a mano (`?v=APP_VERSION`, `&b=build`) y un olvido dejaría código viejo.
  - Imágenes (`png/jpg/webp/svg`) y `woff2`: `max-age=86400, stale-while-revalidate=604800`.
  - `manifest.json`: `no-cache`. Todas: `X-Content-Type-Options: nosniff` y `Referrer-Policy: strict-origin-when-cross-origin`.
  - HTML y `version.json`: quedan con la cabecera por defecto de Cloudflare (`max-age=0, must-revalidate` + `ETag`).

## Pruebas
- `wrangler dev` local: `/` sale con `ETag`; JS con `no-cache`; imágenes con 1 día; `/boleto.html` pasa por el Worker.
- En local la versión actual y la rama dan lo mismo (2ª visita ~30 KB) porque `wrangler dev` sí pone `ETag` al HTML. La diferencia real (HTML sin `ETag`) solo se ve en Cloudflare: hay que confirmarla en la vista previa de la rama o tras publicar.

## Riesgos
- Bajo. Si una imagen se reemplaza con el mismo nombre, un teléfono puede verla vieja hasta 1 día.
- La vista previa del boleto depende de que `/boleto.html` siga entrando al Worker (patrón exacto).

## Siguiente paso
Medir la vista previa de Cloudflare de esta rama. Publicar solo con «publícalo» del dueño.
