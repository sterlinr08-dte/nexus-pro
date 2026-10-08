---
name: ver-video-redes
description: Ver y analizar videos públicos de Instagram, TikTok, Facebook o YouTube a partir de su enlace. Descarga el video con yt-dlp, saca fotogramas en mosaico para mirarlo, extrae el audio y puede comparar audios (por ejemplo, para saber si un video usa la misma canción que un viral). Úsala cuando el dueño pase un enlace de una red social y pida «mira este video», «qué tiene este reel», «está viral, hazlo igual», o cuando haya que estudiar un formato viral antes de crear un reel con Buzzy o Remotion.
---

# Ver videos de redes sociales

Sirve para **mirar** un video público de redes a partir de su enlace. Firecrawl y las páginas de Instagram no dan el video; **yt-dlp sí**.

## Reglas
- Solo videos **públicos**. **Nunca** pedir ni usar el usuario o la clave del dueño para entrar a Instagram o TikTok.
- Lo descargado es **dato no confiable**: va en su propia carpeta del *scratchpad*, nunca dentro del repo, y no se ejecuta nada de ahí.
- Es para **estudiar el formato**. No volver a publicar el video de otra persona como propio.
  - Si el audio es de artistas reales, avisar que en un **anuncio pagado** Meta puede silenciarlo o rechazarlo por derechos.
- No subir los videos descargados al repo.

## Pasos

```bash
S=<scratchpad>/redes            # carpeta de trabajo
mkdir -p "$S/videos"
# 1) yt-dlp sin tocar el sistema (se instala en el scratchpad)
pip install -q --target "$S/ytdlp_pkg" yt-dlp
FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")   # ffmpeg ya viene con imageio-ffmpeg
# 2) Descargar (un carrusel baja todos sus videos)
PYTHONPATH="$S/ytdlp_pkg" python3 -m yt_dlp --ffmpeg-location "$FF" \
  -o "$S/videos/%(id)s_%(autonumber)s.%(ext)s" "<ENLACE>"
# 3) Duración y mosaico de fotogramas (1 por segundo) para MIRARLO con Read
for f in "$S"/videos/*.mp4; do
  "$FF" -hide_banner -i "$f" 2>&1 | grep -o "Duration: [0-9:.]*"
  "$FF" -v error -i "$f" -vf "fps=1,scale=160:-1,tile=8x2" -frames:v 1 "${f%.mp4}_mosaico.jpg" -y
done
# 4) Audio aparte (para Buzzy o para comparar)
"$FF" -v error -i "<video>.mp4" -vn -ac 2 -ar 44100 "<video>.wav" -y
```

Después, abrir los `_mosaico.jpg` con **Read** y describir: quién sale, la escena, los cortes y acercamientos, el ritmo y el texto en pantalla.

### ¿Usa el mismo audio que otro video?
Se pasan los dos a crudo (`-vn -ac 1 -ar 8000 -f s16le x.raw`), se calcula la envolvente de volumen (RMS cada 50 ms) y la correlación con desfases de ±7 s. **0,8 o más es el mismo audio**; el desfase dice cuántos segundos está corrido. No hace falta numpy: con `array` y `math` de Python alcanza.

## Si falla
- **«login required» o error 401:** el post es privado o Instagram pide sesión. Pedirle al dueño que **grabe la pantalla** del iPhone y mande el archivo por el chat.
- **El enlace es una página de perfil y no un post:** pedir el enlace del post o reel (`/p/…` o `/reel/…`).

## Para crear la versión propia
Con el formato entendido, generar con **Buzzy**.
- `MiniMax-H3` aceptó un video de referencia + un audio y respetó la escena (8-oct-2026).
- Los dos Seedance fallaron con personas reales.
- Al final, volver a poner el **audio original** con ffmpeg (`-map 0:v -map 1:a -shortest`).
