# 19-Nov-2026 07:03 (RD) — Claude — Publicada la 6071 (candado contra el doble toque)

- El dueño tocó «Publícalo».
- PR #537, fusionado en `main` (commit `53b4f3c`). El detalle está en `*-claude-candado-doble-toque-6071.md`.
- Cloudflare: `b=6071` en vivo en unos 60 s. Los tres archivos traen el candado.
- Verificado en la demo en vivo, sin inyectar nada y con las escrituras bloqueadas:
  - tres toques en Confirmar venta envían **1** venta;
  - el segundo y el tercero avisan «Guardando, espere»;
  - el botón se apaga mientras guarda y vuelve tras el error.
- Siguiente:
  - las pantallas que dicen «No hay…» o RD$ 0 cuando falla la carga;
  - probar Aceptar transferencia y pago con bauche en la empresa de seguros real.
