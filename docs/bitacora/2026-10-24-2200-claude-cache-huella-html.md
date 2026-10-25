# 2026-10-24 22:00 (RD) — Claude — Caché: fecha de publicación en la página principal (sigue a `2026-10-24-2148-claude-cache-cloudflare.md`)

Rama `claude/nexus-cache`. **Sin publicar**: falta el «publícalo» del dueño.

## Qué se encontró en la vista previa de Cloudflare
- Con `run_worker_first: ["/boleto.html"]`, `_headers` **sí** se aplica: JS y CSS salen con `no-cache` + ETag, y las imágenes con 1 día.
- La página principal `/` sigue saliendo **sin ETag**. El archivo lo trae por dentro: se comprobó con una cabecera temporal de diagnóstico, que ya se quitó. Cloudflare lo borra al final del camino, sea fuerte o débil (`W/`).

## Arreglo
- `wrangler.jsonc`:
  - `run_worker_first: ["/", "/boleto.html"]`;
  - binding `version_metadata` → `CF_VERSION`.
- `worker.js` → `conHuella()`, solo para `GET /`:
  - pone `Last-Modified` = fecha de la versión publicada (`CF_VERSION.timestamp`, cambia en cada despliegue) y `Cache-Control: no-cache`;
  - responde **304** solo si `If-Modified-Since` es **exactamente** esa fecha. Si se vuelve a una versión anterior, el teléfono también la baja.
  - Ante cualquier error, sirve el archivo tal cual (el `try/catch` existente).
- La vista previa del boleto no cambió (`/boleto.html` sigue entrando al Worker).
- `sw.js` no se tocó.

## Pruebas (vista previa `*.nexus-pro.sterlinr08.workers.dev` contra nexusprord.com)
- Comprobaciones con curl:
  - `/` con la misma fecha → 304; con otra fecha → 200;
  - ruta inexistente → 200 con index.html (el modo SPA sigue igual).
- Playwright a 390 px: el login se ve igual que en producción y hay 0 errores de JS.
- Medición justa, dos rondas, con el certificado del proxy aceptado:

| | Wi-Fi 2ª visita | 4G 2ª visita |
|---|---|---|
| Producción hoy | 3,8–5,0 s · 461 KB | 7,3–7,4 s · 462 KB |
| Rama | 4,8–5,4 s · 76–79 KB | 5,7–5,8 s · 77–78 KB |

- Ahorro: unos 385 KB por visita, y 1,6 s en 4G. En Wi-Fi no mejora el tiempo: lo que pesa es que la app tiene unos 100 archivos que se piden en cadena y un HTML de 1,7 MB que hay que ejecutar.

## Siguiente paso (opcional, decide el dueño)
- Para acercarse a Bayol (0,2 s) habría que dejar que el teléfono use los JS sin preguntar (`immutable`). Eso exige subir **siempre** la versión (`?v=` / `&b=`) al publicar; un olvido dejaría código viejo. Por eso no se hizo.
- Otra opción es reducir la cadena de ~100 archivos.
