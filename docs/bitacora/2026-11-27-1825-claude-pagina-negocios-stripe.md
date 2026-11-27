# 2026-11-27 18:25 RD · Claude — Página pública `/negocios` en estilo Stripe (sin publicar)

Sigue a `2026-11-27-1755-claude-referencia-design-md.md`.

## Pedido y decisiones del dueño
1. «Enséñame ejemplo de Apple, Stripe y Linear» → le gustaron los 3.
2. «Primero una maqueta real» → se armó la página pública de NEXUS PRO en los 3 estilos, a 390 y a 1280 px.
3. «Vamos primero con Stripe».
4. Dónde ponerla: eligió **«Página aparte»**. La raíz `/` sigue siendo la entrada al sistema (agentes, empleados y la app guardada en el celular).

## Qué se hizo
- **`negocios.html` nuevo** (único archivo de código). Se abre en `nexusprord.com/negocios`. No se tocó nada más.
- **Estilo Stripe**, tomado de `github.com/VoltAgent/awesome-design-md` (`design-md/stripe/DESIGN.md`, licencia MIT):
  - tinta `#0d253d` y morado `#533afd`;
  - degradado de colores arriba;
  - letra fina (300) en los títulos;
  - tarjetas blancas con sombra azulada;
  - cierre en azul oscuro `#1c1e54`.
  - No lleva el logo, el nombre ni las imágenes de Stripe.
- **Contenido real**, el mismo de `registro.html` y `demo.html`:
  - «Crear mi tienda», 14 días gratis, sin tarjeta, sin permanencia;
  - ventas y facturas, inventario y compras, contabilidad y reportes;
  - sección «Para aseguradoras»: ciclo 20→20, transferencias sin doble conteo, avisos por WhatsApp, comprobante del banco leído.
  - **Sin precios:** no hay ninguno publicado.
- **Enlaces:**
  - Entrar → `/`;
  - Crear mi tienda → `/registro.html`;
  - Demo → `/demo.html`;
  - Privacidad y Términos → sus páginas.
- **Sin fuentes ni scripts de terceros:** usa la letra del equipo, como `registro.html`, y los íconos son SVG propios.
- Tiene etiquetas para compartir por WhatsApp (Open Graph) y respeta «reducir movimiento».
- El Worker y el service worker no tocan esta ruta: el Worker solo atiende `/` y `/boleto.html`.

## Pruebas (Playwright)
- **A 390 px, como iPhone 13 y a 1280 px:**
  - no hay desplazamiento de lado;
  - todo lo que se toca mide 44 px o más, y «Cobrar» del ejemplo mide 54 px;
  - 0 errores en la consola.
- **Letra:** la más chica es 12 px, en la etiqueta «Juan Pérez» del ejemplo, que no se toca. Los controles miden 14–17 px.
- **Enlaces:** los 4 archivos de destino existen en el repo.
- **No verificado:** que `nexusprord.com/negocios` (sin `.html`) abra la página en Cloudflare. Debería, por el manejo automático de `.html`, pero se comprueba al publicar. Si no abre, el enlace sería `/negocios.html`.

## Riesgos y siguiente paso
- Es una página nueva: no cambia la entrada al sistema ni el resto de las páginas.
- Siguiente: el dueño la ve y dice «Publícalo». Después se puede usar en anuncios y WhatsApp, y probar también Apple o Linear.
