# Páginas legales: privacidad, términos y cookies (nexusprord.com)

## Pedido del dueño (05-nov-2026)
Envió capturas de un reel con una lista para lanzar una página (rendimiento, Google Search Console, y privacidad, términos y cookies). Después de la revisión eligió «A y C»: páginas legales y Search Console.

## Revisión (Lighthouse 12, celular simulado, desde el servidor de la sesión)
| Sitio | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP |
|---|---|---|---|---|---|
| bayolcell.com | 57 | 93 | 100 | 100 | 11.2 s |
| nexusprord.com | 37 | 100 | 96 | 92 | 7.4 s |
- El medidor de Google (PageSpeed API) dio «cuota agotada»; por eso se usó Lighthouse en la sesión.
- Ninguno de los dos sitios tenía páginas legales. En NEXUS, `/privacidad.html` devolvía el sistema, porque el sitio responde con la app a cualquier página que no existe.
- bayolcell.com tiene `robots.txt` y `sitemap.xml`, pero no se ve verificación de Search Console en el HTML.

## Qué se hizo
- `privacidad.html`, `terminos.html` y `cookies.html` nuevos, en español sencillo, con un resumen arriba. Siguen el tema claro u oscuro del equipo, con letra de 17 px y enlaces de 44 px.
- El contenido sale de lo que el sitio hace de verdad: qué datos se piden, con quién se comparten (banco solo con permiso, Supabase, WhatsApp/Meta; en NEXUS también Cloudflare y la IA que lee los comprobantes) y que no se usan cookies de publicidad ni rastreo. Cita la Ley 172-13.
- No se inventaron condiciones comerciales. La garantía remite a la orden o factura; una cláusula sobre almacenamiento se quitó antes de entregar.
- Contacto: solo WhatsApp. El correo de la empresa no se publicó sin el OK del dueño.
- Enlaces Privacidad · Términos · Cookies debajo de «Entrar al sistema» en la pantalla de entrada (`index.html`, 44 px de alto).
- Cloudflare sirve los archivos de la raíz tal cual; el service worker no toca los `.html`.

## Pruebas
- Script de Playwright: **101 PASS / 0 FAIL**.
  - Las 6 páginas a 390 y 1280 px, en tema claro y oscuro: responden 200, sin desplazamiento de lado, enlaces de 44 px o más, letra de 16 px o más y sin errores.
  - Los enlaces existen en los pies de página y en la pantalla de entrada.
- Se revisaron las capturas.

## Pendientes
- **Sin publicar.** Rama `claude/paginas-legales`; falta el «publícalo».
- Que un abogado revise los textos.
- Search Console: el dueño agrega la propiedad con su cuenta de Google y manda la etiqueta HTML; después se coloca en `index.html` de Bayol.
