# 2026-10-15 04:30 — Claude — Usuarios con acceso real: PUBLICADO (59.30)

- El dueño dijo «Publícalo» para la entrega de la bitácora 2026-10-15-0400.
- **Edge Function `usuarios-acceso`:**
  - desplegada en tnwsgcxurfyuszxsewsn: versión 1, ACTIVE, verify_jwt=true;
  - el código desplegado es idéntico al del repo (diff vacío, SHA-256 8fb7c058…);
  - sin token responde 401.
- **`main`:**
  - solo este cambio, por cherry-pick (bitácoras 0300 y 0400 + función + pantalla + QA), con `APP_VERSION='59.30'`;
  - **no** incluye 59.28 (tamaño de textos) ni 59.29 (azul marino), que siguen en `claude/review-claude-md-jpzk7k` sin publicar;
  - avance rápido de 962b1c2 a e376ae8 (rama `claude/usuarios-acceso-main`).
- **Verificado en vivo:** nexusprord.com sirve 59.30 con la pantalla nueva (`nxUsuAcc`). QA en la rama publicada: 21 PASS · 0 FAIL.
- **Siguiente:**
  - el dueño entra a Configuración → Usuarios → LORIBEL → «Crear acceso» y le pone su contraseña;
  - después Claude puede confirmar en la base que LORIBEL tiene perfil (rol cajero, organización nexus-pro).
- **Nota de versiones:** cuando se publiquen 59.28/59.29, subir la versión por encima de 59.30.
