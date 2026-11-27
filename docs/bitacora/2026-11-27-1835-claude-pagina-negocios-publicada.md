# 2026-11-27 18:35 RD · Claude — Página `/negocios` publicada

Sigue a `2026-11-27-1825-claude-pagina-negocios-stripe.md`. El dueño tocó **«Publícalo»**.

- Este proyecto no tiene pruebas de GitHub en los PR (no hay `.github/workflows`). Valieron las pruebas con Playwright de la entrada anterior.
- **PR #561 unido a `main`** (squash `2773a91`). Lo publicó Cloudflare.
- **Comprobado en vivo (18:33 RD):**
  - `nexusprord.com/negocios` responde 200 con la página nueva.
  - `/negocios.html` redirige (307) a `/negocios`. El punto que antes quedó sin verificar ya está resuelto.
  - La raíz `/` sigue con la entrada al sistema («NEXUS PRO — Plataforma de Gestión RD»).
  - Como iPhone 13: sin desplazamiento de lado y 0 errores. «Crear mi tienda» abre `nexusprord.com/registro`.
- **Para quitarla:** revertir `2773a91`. Es un solo archivo nuevo.
- **Siguiente:** usar el enlace en anuncios y WhatsApp. Si el dueño quiere, probar también las versiones Apple o Linear.
