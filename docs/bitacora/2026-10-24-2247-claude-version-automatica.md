# 2026-10-24 22:47 (RD) — Claude — Paso 2: número de publicación automático (rama `claude/version-auto`, sin publicar)

Sigue a `2026-10-24-2245-claude-cache-publicado.md` (PR #403). El dueño pidió: «Hazlo, el paso 2».

## Objetivo
Que el teléfono use los JS y CSS guardados **sin preguntar** al servidor, pero que nunca quede uno viejo. La versión no depende de que alguien suba `APP_VERSION` o `&b=` a mano.

## Cómo funciona
1. **`worker.js` (`conHuella`, solo `GET /`)**
   - Inserta `<script>window.NX_DEPLOY="xxxxxxxx";</script>` justo después de `<meta charset>`, con HTMLRewriter.
   - `xxxxxxxx` son los primeros 8 caracteres de `CF_VERSION.id`, que cambia en cada despliegue.
2. **Cargadores**
   - **`index.html`** (cargador final): las URLs pasan a `?v=APP_VERSION&d=NX_DEPLOY`. Además, `nxPrecargarParche` no precarga cuando hay `NX_DEPLOY`, porque las URLs nuevas no se conocen de antemano.
   - **`parches-seguros.js`**: la consulta se calcula una vez al cargar.
     - Antes, `document.currentScript` valía `null` dentro de los callbacks y las ~70 capas salían solo con `?b=6033`.
     - Ahora todas salen con `?v=…&d=…&b=6033`.
   - **`parches-rifas.js`**: `qrcode.js` también lleva `&d=`.
   - **Sin `NX_DEPLOY`** (copia de GitHub, servidor local, ruta SPA): se usa `&t=<hora>`. Se pide fresco y nunca se reutiliza.
3. **`_headers`**
   - JS y CSS: `public, max-age=31536000, immutable`.
   - `sw.js`: `! Cache-Control` + `no-cache`, para que el navegador vea siempre su versión nueva.
   - Imágenes: igual que antes (1 día).

## Pruebas (vista previa de Workers Builds)
- La página principal trae `NX_DEPLOY`. JS y CSS salen `immutable`; `sw.js` sale `no-cache`.
- Carga completa a 390 px: **82 archivos** propios pedidos, **82 con número de publicación**, 0 sin él. 0 errores de JS.
- Medición justa, dos rondas:

| | Wi-Fi 2ª visita | 4G 2ª visita | Lo que baja |
|---|---|---|---|
| Producción hoy (PR #403) | 4,0 s | 5,6 s | 72 KB |
| Paso 2 | **0,9–1,0 s** | **0,9–1,0 s** | 11 KB |

- Prueba de una publicación nueva: abrir, publicar otra versión y volver a abrir en el mismo perfil. El resultado queda en la entrada siguiente.

## Riesgos
- Tras cada publicación, cada teléfono baja una vez todos los archivos (~2 MB), aunque solo cambie uno. Es aceptable y es lo mismo que hoy en la 1ª visita.
- Si algún día se agrega un cargador nuevo que no use `qv()`, el cargador de `index.html` o `NX_DEPLOY`, ese archivo quedaría guardado un año. **Regla: todo archivo `.js` o `.css` propio se carga con el número de publicación.** Va anotada en la MEMORIA.
