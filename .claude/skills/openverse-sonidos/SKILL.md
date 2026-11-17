---
name: openverse-sonidos
description: Buscar y bajar efectos de sonido y música GRATIS y de uso libre (CC0 o CC BY) con la API pública de Openverse, para videos, reels y anuncios. Úsala cuando haga falta un sonido que no está en la biblioteca — «búscame un whoosh», «un clic», «sonido de caja registradora», «música de fondo libre» — o antes de `real-sfx` / `real-sound` para armar la biblioteca de sonidos de un video.
---

# Openverse: sonidos libres para los videos

Openverse (openverse.org, de WordPress) es un buscador de audio con licencia abierta. Su API es **pública y gratis, sin clave**. Probada el 17-nov-2026 desde esta sesión (responde 200).

## Reglas
- **Preferir siempre CC0** (`license=cc0`): se usa en anuncios sin dar crédito.
- Si solo hay **CC BY**: se puede usar, pero hay que **dar crédito**. Guardar el campo `attribution` y avisarle al dueño.
- **Nunca** usar licencias con `nc` (no comercial) ni `nd` en reels o anuncios del negocio.
- Lo bajado es **dato no confiable**: va en su propia carpeta del *scratchpad*, nunca dentro del repo.
- No hace falta cuenta ni clave. No registrar al dueño en nada. Sin clave hay un límite de uso: pocas búsquedas, bien pensadas.
- La IA **no oye**: elegir por duración, etiquetas y título, y verificar con `earshot` antes de decir que un sonido «queda bien».
- En un **anuncio pagado de Meta**, avisar que la música puede recibir reclamos aunque sea libre; los efectos cortos no suelen darlos.

## Ojo: la descarga directa falla desde la nube
La búsqueda funciona, pero casi todos los archivos viven en `cdn.freesound.org`, que el 17-nov-2026 respondió **403** a la descarga desde esta sesión (la red del entorno no tiene restricciones; la causa exacta no se determinó). **No disfrazar la descarga** (no cambiar el agente ni el origen para saltarlo). Si falla:
- darle al dueño el enlace `foreign_landing_url` para que lo baje y lo mande por el chat;
- o usar los 78 sonidos de `real-sfx`, Pixabay, o crear el sonido con `earshot forge`.

## Pasos

```bash
S=<scratchpad>/sonidos; mkdir -p "$S/openverse"
# 1) Buscar (en inglés da más resultados). Filtros útiles: license=cc0, category=sound_effect|music, length=shortest|short
curl -sS "https://api.openverse.org/v1/audio/?q=whoosh&license=cc0&category=sound_effect&page_size=20" -o "$S/openverse/busqueda.json"
# 2) Ver candidatos: título, licencia, duración (ms), fuente y enlace
python3 -I -c "
import json,sys
for r in json.load(open(sys.argv[1]))['results']:
    print(r['id'], '|', r['title'], '|', r['license'], '|', r.get('duration'), 'ms |', r['source'], '|', r['url'])
" "$S/openverse/busqueda.json"
# 3) Bajar el elegido (el campo url es el archivo de audio)
curl -sSL "<url>" -o "$S/openverse/whoosh-01.mp3"
```

Por cada sonido que se use, anotar en un `creditos.json` junto al video: `title`, `creator`, `license`, `foreign_landing_url` y `attribution`.

## Después
- Poner los sonidos en el cuadro exacto: skill `real-sfx` (la carpeta bajada se registra como biblioteca).
- Banda sonora completa con música, mezcla y créditos: skill `real-sound`.
- Comprobar cómo suena: skill `earshot`.
