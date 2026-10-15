# 2026-10-15 06:30 — Claude — 59.29 corregido: solo el FONDO en azul marino con el mar (sin publicar)

## Solicitud del dueño
Al preguntarle por el azul marino (bitácoras 2026-10-14-2200 y 2215), aclaró: «Era el fondo solamente, hazlo sin publicar para ver».

## Cambio (`index.html`, bloque `html.tema-glass-oscuro.tgo-navy`)
- **Se queda:**
  - color base del fondo (`--tgo-bg` #051A3A, `--tgo-base-1..3`, brillo, velo y viñeta);
  - la foto `assets/fondo-mar-navy(-movil).webp`;
  - un borde de campo un poco más claro (`--tgo-field-edge:#8A9AB8`), porque sobre el fondo azul los selectores de Clientes, P&G y DGII daban 2.7:1 y el mínimo es 3:1.
- **Se quitó:** el azul marino de las tarjetas y el cristal (`--tgo-glass/solid/line/card`), la cabecera `.tnav`, el buzón `#nxIG`, el cuadro de login `.lbox`, el riel y cajón del menú (`--nx-mc-glass`), el panel principal `.main::before`, y `--bg0/--bg2`. Todo eso vuelve al grafito 59.21.
- `scripts/qa-tema-glass.mjs`: cabecera, panel, login y cajón vuelven a esperar grafito. Fondo, splash y foto siguen en azul marino.

## Pruebas
- qa-tema-glass: 550 PASS · 0 FAIL.
- qa-inicio-glass: 129/0.
- qa-modo-claro: 99/0.
- Capturas a 1440 px y 390 px revisadas.

## Estado
- Rama `claude/review-claude-md-jpzk7k`. **No publicado.** El dueño lo quiere ver primero.
- Al publicar, poner `APP_VERSION` por encima de 59.30 (main ya está en 59.30).
