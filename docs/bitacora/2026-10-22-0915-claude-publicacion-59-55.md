# Publicación NEXUS 59.55 — «Registrar pago» con meses por adelantado

- **Solicitud del dueño:** «Si» a publicar la 59.55 (ver `2026-10-22-0900-claude-cobro-meses-adelantados.md`).
- **Rama:** `claude/cobro-adelanto-meses` (commit `6c48a2b`), basada en `origin/main` `b96efcc`. Subida a `main` por avance rápido.
- **Deploy:** integración Git de Cloudflare Workers.
- **Verificación en vivo:** `https://nexusprord.com/` sirve `APP_VERSION='59.55'` y el bloque `nxAdelPaneJs`.
- **Pruebas previas:** `scripts/qa-cobro-adelanto.mjs` 20 PASS; `scripts/qa-registrar-pago.mjs` 58 PASS.
- **Sin cambios** en Supabase, RPC, triggers ni Edge Functions. Solo frontend.
- **Apagar si hace falta:** `localStorage.nx_adel_off='1'` en el equipo.
- **Nota:** `version.json` sigue en 59.24 (ya estaba atrasado antes de esta entrega; no se tocó).
- **Siguiente paso:** que el dueño lo pruebe en el iPhone (cerrar y abrir la app, o Ctrl+Shift+R en PC).
