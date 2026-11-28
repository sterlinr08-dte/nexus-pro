# 2026-11-27 23:05 RD · Claude — Velocidad de los temas de paleta publicada

Sigue a `2026-11-27-2254-claude-temas-velocidad.md`. El dueño tocó **«Publícalo»**.

- **PR #569 unido a `main`** (squash `c733aa2`). Lo publicó Cloudflare: nexusprord.com ya sirve `quitar()`.
- **Comprobado en vivo** (pantalla de entrada como iPhone 13; tiempo del recorrido del arranque en Chromium sin limitar la CPU), sin errores en ningún caso:
  - Stripe `#533afd`: 1,755 reglas, 60 ms.
  - Apple `#0066cc`: 2,002 reglas, 40 ms.
  - Linear `#828fff`: 1,295 reglas, 33 ms.
  - Premium guardado y sin nada guardado → Glass oscuro.
- Con esto quedan corregidos los 6 puntos de la revisión. El arranque queda +~40 ms en iPhone, por decisión del dueño.
- **No verificado:** iPhone real con la sesión del dueño.
