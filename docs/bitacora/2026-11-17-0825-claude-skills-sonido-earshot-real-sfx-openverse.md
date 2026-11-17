# 17-nov-2026 08:25 (RD) — Claude — Skills de sonido: Earshot, Real SFX y Openverse

## Pedido del dueño
Tres capturas de un reel («Earshot», «Openverse», «real-sfx») y «Instala esas tres herramientas». Son las tres herramientas gratis para que los videos hechos con IA tengan buenos efectos de sonido.

## Qué es cada una y de dónde salió
| Herramienta | Qué hace | Fuente revisada |
|---|---|---|
| **real-sfx** | Pone efectos reales grabados en el cuadro exacto del video; conserva música y voz; entrega MP4 nuevo y pista de efectos aparte. Trae 78 sonidos de interfaz. | `github.com/Clipwing/skills`, commit `edbefcbc3474869e6cc1e8a7ca583b0efd0dab7e`. Scripts MIT; sonidos uisfx CC0. |
| **earshot** (+ `real-sound`) | «Oídos» para la IA: describe un sonido, dice si encaja, mide volumen y sincronía, crea sonidos por código. `real-sound` arma una banda sonora completa. | `github.com/Leonxlnx/earshot` v0.4.1, commit `4ac3d2ac2b151e1c23376f9ce7f3047a17050013`. MIT. |
| **Openverse** | Buscador de audio con licencia abierta. No se instala: es una API pública sin clave. | `api.openverse.org`. |

## Revisión antes de instalar
- Se buscó en el código: llamadas de red, `eval`/`exec`, `os.system`, `shell=True`, telemetría. Nada sospechoso.
- Lo que sí sale a internet, y es opcional:
  - `real-sfx/scripts/listen.py` baja un modelo de huggingface.co; `hear.py` instala torch.
  - `real-sfx/scripts/listen_page.py` abre un servidor local; con `--lan` lo expone a la red local (no usar `--lan`).
  - `earshot llm` manda el audio a un servicio externo de pago: **prohibido** (anotado en la skill y en `HERRAMIENTAS.md`).
  - `real-sound/scripts/audit.py` consulta páginas para comprobar licencias.

## Archivos
- `.claude/skills/real-sfx/` (8.6 MB; sin `tests/` ni `evals/`) con nota de instalación.
- `.claude/skills/earshot/` y `.claude/skills/real-sound/` (con `LICENSE`) con nota de instalación. El programa earshot **no** va en el repo: se instala en el scratchpad (~1.8 GB).
- `.claude/skills/openverse-sonidos/SKILL.md` (nueva, escrita aquí).
- `HERRAMIENTAS.md` (3 filas y un atajo) y `CLAUDE.md` (fila «Video y reels»).
- Sin cambios en la aplicación, la base de datos ni la versión.

## Pruebas
| Prueba | Resultado |
|---|---|
| Openverse: buscar «whoosh» CC0 | Funciona (200; 240 resultados). |
| Openverse: bajar el archivo | **Bloqueado**: `cdn.freesound.org` da 403 por la red de la sesión. Los 20 primeros resultados viven ahí. |
| earshot: instalar en el scratchpad | Funciona (Python 3.11, torch CPU, 1.8 GB). |
| earshot: `describe` sobre `uisfx/studio/add-to-cart.mp3` | Funciona: «a success chime (z +2.9)», -20.6 LUFS, 0.43 s. Bajó los modelos de huggingface.co. |
| real-sfx: `setup.py init/check` | **No lo verifiqué**: el control de seguridad de la sesión no dejó ejecutar los scripts descargados. ffmpeg, ffprobe, Python y Node sí están en la sesión. |

## Pendientes
- Que el dueño apruebe `cdn.freesound.org` en el entorno, para poder bajar los sonidos de Openverse.
- Primera prueba de `real-sfx` con un video real (la próxima vez que se haga un reel).
- Las otras dos casas (`bayolcell-taller`, `studio-rd`) no se tocaron; si el dueño las quiere allá, se copian.

## Estado
Rama `claude/skills-sonido`. Sin publicar; espera el «Publícalo» del dueño.
