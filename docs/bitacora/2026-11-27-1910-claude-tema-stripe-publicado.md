# 2026-11-27 19:10 RD · Claude — Tema Stripe publicado y Premium Blue retirado

Sigue a `2026-11-27-1905-claude-tema-stripe.md`. El dueño tocó **«Publícalo»**.

- Antes de unir el PR: Stripe quedó **solo para el dueño del sistema** (`rpc/mi_es_superadmin`), no para cualquier administrador. Así coincide con lo que se le dijo al dueño. Prueba `qa-tema-stripe.mjs`: 38/38.
- **PR #563 unido a `main`** (squash `a56e065`). Lo publicó Cloudflare.
- **Comprobado en vivo** (nexusprord.com, pantalla de entrada como iPhone 13, 19:08 RD):
  - con `nx_tema=stripe`: `tema-stripe tema-claro`, `--c1 #533afd`, 1,746 reglas cambiadas en 43 ms y 0 errores;
  - con `nx_tema=premium`: Glass oscuro, 0 errores;
  - sin nada guardado: Glass oscuro, igual que antes.
- **No verificado:** el sistema adentro con la sesión real del dueño en su iPhone. Lo prueba él: Configuración → Apariencia → Stripe.
- **Para volver atrás:** `NX_TEMA_STRIPE=false` en el `<head>` (quien lo tenga ve el Claro), o revertir `a56e065`.
- **Siguiente:** si al dueño le gusta, abrirlo a todos (`NX_TEMA_STRIPE_TODOS=true`) y seguir con Apple y Linear.
