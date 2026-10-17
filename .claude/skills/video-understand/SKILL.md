---
name: video-understand
description: |
  Video understanding and transcription with intelligent multi-provider fallback. Use when: (1) Transcribing video or audio content, (2) Understanding video content including visual elements and scenes, (3) Analyzing YouTube videos by URL, (4) Extracting information from local video files, (5) Getting timestamps, summaries, or answering questions about video content. Automatically selects the best available provider based on configured API keys - prefers full video understanding (Gemini/OpenRouter) over ASR-only providers. Supports model selection per provider.
---

> **Nota de instalación (NEXUS PRO, 17-oct-2026):** copiada sin cambios de
> [video-understand-skills](https://github.com/jrusso1020/video-understand-skills)
> (licencia MIT, commit `90b351b`) a pedido del dueño («Instala esa skills»). Se revisó antes:
> sin telemetría, código oculto ni instalaciones automáticas. Riesgos confirmados y reglas de uso:
> - **Siempre `--provider ffmpeg`** (cuadros + transcripción local, gratis y sin sacar nada del equipo).
>   El script, si no se le dice el proveedor, **elige solo el primer servicio de pago** que tenga llave
>   (Gemini, OpenRouter, OpenAI…) y le **sube el video completo**. Con `--asr-only` elige OpenAI (de pago)
>   antes que el Whisper local: usar `--provider local`.
> - **Nunca** Gemini, Vertex, OpenRouter, OpenAI, AssemblyAI, Deepgram ni Groq sin el OK escrito del
>   dueño, ni crear cuentas o guardar llaves. OpenRouter **no es gratis** (lo que dice abajo es falso).
>   En el nivel gratis de Gemini, Google puede usar y revisar el video: nada con datos de clientes.
> - Solo **videos** (mp4, mov, webm…): nunca pasarle otros archivos (si la conversión falla, sube el original).
> - Copiar el video a una carpeta nueva del **scratchpad** antes de procesarlo: los cuadros y `audio.mp3`
>   se guardan junto al video (o en `/tmp/video_frames`, compartida) y no se borran. Nunca dentro de un repo.
> - Enlaces: bajar primero con la skill `ver-video-redes` (yt-dlp con `--ignore-config`) y pasar el archivo.
> - No instalar `openai-whisper`/torch ni usar `brew`/`pip` del sistema sin avisar: el disco es chico.
>   En la sesión funcionó con el ffmpeg de `imageio-ffmpeg`, un `ffprobe` estático y faster-whisper en el scratchpad.
> - En modo gratis no describe el video: da los cuadros y la transcripción, y la IA los mira con Read.
> - Responder siempre en español sencillo.


# Video Understanding

Multi-provider video understanding with automatic fallback and model selection.

## Quick Start

```bash
# Check available providers
python3 scripts/check_providers.py

# Process a video (auto-selects best provider)
python3 scripts/process_video.py "https://youtube.com/watch?v=..."
python3 scripts/process_video.py /path/to/video.mp4

# Custom prompt
python3 scripts/process_video.py video.mp4 -p "List all products shown with timestamps"

# Use specific provider/model
python3 scripts/process_video.py video.mp4 --provider openrouter -m google/gemini-3-pro-preview

# List available models
python3 scripts/process_video.py --list-models
```

## Provider Hierarchy

Automatically selects the best available provider:

| Priority | Provider | Capability | Env Var | Default Model |
|----------|----------|------------|---------|---------------|
| 1 | Gemini | Full video | `GEMINI_API_KEY` | gemini-3-flash-preview |
| 2 | Vertex AI | Full video | `GOOGLE_APPLICATION_CREDENTIALS` | gemini-3-flash-preview |
| 3 | OpenRouter | Full video | `OPENROUTER_API_KEY` | google/gemini-3-flash-preview |
| 4 | FFMPEG | Frames + ASR | None (requires ffmpeg + whisper) | scene |
| 5 | OpenAI | ASR only | `OPENAI_API_KEY` | whisper-1 |
| 6 | AssemblyAI | ASR + analysis | `ASSEMBLYAI_API_KEY` | best |
| 7 | Deepgram | ASR | `DEEPGRAM_API_KEY` | nova-2 |
| 8 | Groq | ASR (fast) | `GROQ_API_KEY` | whisper-large-v3-turbo |
| 9 | Local Whisper | ASR (offline) | None | base |

**Full video** = visual + audio analysis. **Frames + ASR** = extracted screenshots + audio transcription (free, offline). **ASR** = audio transcription only.

## CLI Options

```
python3 scripts/process_video.py [OPTIONS] SOURCE

Arguments:
  SOURCE              YouTube URL, video URL, or local file path

Options:
  -p, --prompt TEXT   Custom prompt for video understanding
  --provider NAME     Force specific provider
  -m, --model NAME    Force specific model
  --asr-only          Force ASR-only mode (skip visual analysis)
  -o, --output FILE   Write JSON to file instead of stdout
  -q, --quiet         Suppress progress messages
  --list-models       Show available models per provider
  --list-providers    Show available providers as JSON
```

## Model Selection

Each provider supports multiple models. Use `--list-models` to see options:

```bash
python3 scripts/process_video.py --list-models
```

**OpenRouter models:**
- `google/gemini-3-flash-preview` (default) - Fast, free tier
- `google/gemini-3-pro-preview` - Higher quality

**Gemini models:**
- `gemini-3-flash-preview` (default) - Latest, fast
- `gemini-3-pro-preview` - Highest quality
- `gemini-2.5-flash` - Stable production fallback

**Local Whisper models:**
- `tiny`, `base` (default), `small`, `medium`, `large`, `large-v3`

**FFMPEG modes** (frame extraction strategy):
- `scene` (default) - Extract frames when scene changes (smart, efficient)
- `keyframe` - Extract I-frames only (fastest)
- `interval` - Extract frames at regular intervals (predictable)

## Quick Reference

| Task | Reference |
|------|-----------|
| **Setup & API keys** | [setup-guide.md](references/setup-guide.md) |
| Use Gemini for video | [gemini.md](references/gemini.md) |
| Use OpenRouter | [openrouter.md](references/openrouter.md) |
| **FFMPEG frames (free)** | [ffmpeg-frames.md](references/ffmpeg-frames.md) |
| ASR providers | [asr-providers.md](references/asr-providers.md) |
| Output JSON schema | [output-format.md](references/output-format.md) |
| Video sources & downloading | [video-sources.md](references/video-sources.md) |

## Verify Setup

```bash
python3 scripts/setup.py  # Check dependencies and API keys
```

## Output Format

All providers return consistent JSON:

```json
{
  "source": {
    "type": "youtube|url|local",
    "path": "...",
    "duration_seconds": 120.5,
    "size_mb": 15.2
  },
  "provider": "openrouter",
  "model": "google/gemini-3-flash-preview",
  "capability": "full_video",
  "response": "...",
  "transcript": [{"start": 0.0, "end": 2.5, "text": "..."}],
  "text": "Full transcript..."
}
```

## Features

- **Automatic provider selection** based on available API keys
- **Model selection** per provider with sensible defaults
- **Robust path handling** for macOS special characters and unicode
- **Progress output** (use `-q` for quiet mode)
- **File size warnings** for API limits
- **Auto-conversion** of video formats when needed
- **YouTube URL support** (direct or via download)

## Requirements

**For full video understanding:**
```bash
pip install google-generativeai  # Gemini
pip install openai               # OpenRouter
```

**For ASR fallback:**
```bash
brew install yt-dlp ffmpeg       # Video tools
pip install openai               # OpenAI Whisper
pip install groq                 # Groq Whisper
pip install assemblyai           # AssemblyAI
pip install deepgram-sdk         # Deepgram
pip install openai-whisper       # Local Whisper
```
