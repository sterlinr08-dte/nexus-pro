# HERRAMIENTAS.md — qué tenemos disponible y para qué

**Regla del dueño (08-oct-2026):** antes de empezar cualquier pedido, la IA lee este archivo y usa de una vez la herramienta que corresponda, sin esperar a que el dueño la nombre.

- Este archivo vale para los 3 negocios: NEXUS PRO, STUDIO y BAYOL CELL.
- Si se instala o conecta algo nuevo, se agrega aquí y se deja la entrada en la bitácora.

## Reglas que siempre aplican

**Cuentas, claves y pagos**
- No conectar cuentas, iniciar sesión ni gastar en servicios de pago sin el OK del dueño.
- El dueño escribe sus claves él mismo en el panel. Nunca se pegan en el chat ni en el repo.

**Redes sociales y mensajes**
- **Publicar, comentar o mandar mensajes** (Instagram, Facebook, WhatsApp, anuncios) se hace solo si el dueño lo pide y aprueba cada publicación.
- Mirar, leer o analizar sí se puede hacer libremente.

**Videos con IA**
- Revisar cuadro por cuadro antes de entregar:
  - el iPhone tiene **un solo** módulo de cámara arriba a la izquierda;
  - las manos tienen 5 dedos;
  - no hay letreros con letras inventadas;
  - nada cambia de forma de un cuadro a otro.
- No usar la cara de personas reales famosas con fines comerciales.

**HyperFrames**
- Siempre con la telemetría apagada (`HYPERFRAMES_NO_TELEMETRY=1`, `DO_NOT_TRACK=1`).
- Nunca usar `npx hyperframes usage`.

## Por necesidad

### Videos, reels y anuncios en video
| Herramienta | Para qué | Estado |
|---|---|---|
| **HyperFrames** (skills `hyperframes`, `general-video`, `motion-graphics`, `product-launch-video`, `music-to-video`, `embedded-captions`, `talking-head-recut`, `slideshow`, `faceless-explainer`, `media-use`, `hyperframes-*`) | Armar el video final en esta máquina: textos animados, transiciones, logo, música y cierre. | Instalado (nexus-pro). Gratis. |
| **Buzzy** (MCP) | Generar imágenes y clips de video con IA: escenas, manos reparando, productos. Modelos probados: MiniMax-H3 (video) y Nano Banana (imagen). Seedance falla con personas reales. | Conectado. Usa créditos; el dueño autorizó usarlos para los videos de BAYOL. |
| **Higgsfield** (MCP) | Otra opción de video e imagen con IA, avatares, anuncios y publicar en TikTok. | Conectado. Pedir OK antes de gastar créditos o publicar. |
| **Remotion** (skills `remotion-*`) | Videos hechos con código, como el de la web de BAYOL (`videos-remotion/`). | Instalado. |
| **ffmpeg / yt-dlp** | Cortar, unir, poner audio y revisar cuadros. Bajar videos públicos. | En la sesión (scratchpad). |

### Redes sociales e Instagram
| Herramienta | Para qué | Estado |
|---|---|---|
| **`ver-video-redes`** (skill) | Pasar un enlace de Instagram, TikTok, Facebook o YouTube: baja el video, saca los cuadros y el audio, y compara canciones. | Instalada (nexus-pro). Funciona con publicaciones públicas. |
| **`analizar-instagram`** (skill, BAYOL) | Leer el perfil completo, ver qué publicación funcionó mejor, sacar los precios de los flyers y guardar la guía de marca. | Creada en bayolcell-taller. Para el perfil completo hace falta Supermetrics autorizado. |
| **Supermetrics** (MCP) | Datos de Instagram y Facebook: publicaciones, likes, vistas, alcance, mejores Reels, seguidores y **perfiles públicos de la competencia** (`IGPD2`, vía oficial de Meta). | **Conectado (09-oct-2026)** con la cuenta bayolcellsrl@gmail.com, «Team bayolcellsrl», Facebook «Bayol Cell RD». Prueba gratis hasta ~21-oct. |
| **`precios-competencia`** (skill, BAYOL) | «Mira el perfil de X y mándame los precios»: lee Instagram por Supermetrics (respaldo: TikTok público) y compara con el catálogo y los flyers de BAYOL. | Creada en bayolcell-taller. |
| **Windsor.ai** (MCP) | Datos de redes y anuncios. También puede publicar imágenes en Instagram o responder comentarios, solo con aprobación. | Conectado. Requiere conectar cada cuenta. |
| **Meta Ads** (MCP) | Biblioteca de anuncios (ver qué anuncios corre la competencia en RD), campañas, públicos y promocionar publicaciones. | Conectado. Crear o pausar anuncios solo con orden del dueño. |
| **Zernio** | Bandeja de mensajes de WhatsApp, Instagram y Messenger de los CRM (BAYOL, STUDIO). | En uso por los CRM. |
| **Firecrawl** (MCP) | Buscar en la web y leer páginas: competencia, tendencias, precios públicos. | Conectado. |

### Marketing, anuncios y SEO (skills de terceros revisadas, 10-oct-2026)
Copiadas solo como instrucciones, sin programas. Licencias en `.claude/skills/LICENCIAS-TERCEROS.md`.

| Necesidad | Skills |
|---|---|
| Contexto del negocio (primero) | `product-marketing` |
| Textos, ofertas y persuasión | `copywriting`, `copy-editing`, `offers`, `marketing-psychology` |
| Redes y contenido | `social`, `content-strategy`, `influencer-marketing`, `image` |
| WhatsApp y SMS | `sms` (con la nota de que RD usa +1 pero no es EE. UU.) |
| Referidos y reseñas | `referrals` |
| Plan y competencia | `marketing-plan`, `competitor-profiling` |
| Páginas web | `cro`, `analytics` |
| Anuncios (Meta) | `ads` (base), `ads-meta`, `ads-creative`, `ads-competitor`, `ads-plan`, `ads-create`, `ads-math`, `ads-budget`. **Solo lectura: ningún cambio en campañas sin aprobación del dueño.** |
| SEO y Google Maps | `seo-local`, `seo-maps`, `seo-technical`, `seo-page`, `seo-schema`, `seo-sitemap`, `seo-images`, `seo-content`, `seo-plan` |

### Diseño de pantallas y páginas
`apple-design`, `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `emil-design-eng`, `review-animations`, `animation-vocabulary`, `canvas-design`.

En bayolcell-taller y studio-rd también está `impeccable`. **Figma** (MCP) está conectado para diseños.

### Referencias de diseño que mandó el dueño (11-oct-2026)
**Regla del dueño:** «Ese link que te envié es para tomarlo como referencia para cuando queramos algo; tú lo tomas de ahí.» Cuando pida un efecto, una animación o algo «más bonito», **mirar primero estas referencias** y proponer la pieza que encaje.

**Cómo se usan:**
- Están hechas en React o Framer, y nuestras apps usan HTML y JavaScript normal. Se **rehacen** en nuestro código, como la isla de avisos de NEXUS 59.20. No se pega su código sin revisar antes la licencia de esa pieza.
- No se conecta su MCP ni se crean cuentas en esas páginas sin el OK del dueño.
- Los efectos pesados (3D, partículas, fondos animados) van solo en portadas, logins o páginas públicas, nunca en pantallas de trabajo. Por eso el dueño quitó la rueda de las listas en NEXUS 59.19.
- Siempre con «reducir movimiento», con la línea gráfica de cada negocio y probado en iPhone.

| Referencia | Qué trae | Ideas ya vistas para nosotros |
|---|---|---|
| **The Kitchen**: https://www.dqnamo.com/kitchen (estudio dqnamo, Londres; reel de @adrien.ninet `DeO7DugISSR`) | Piezas que parecen objetos reales. Cada una tiene su página `/experiments/<nombre>` con el código: Receipt Printer, Hold to Confirm, Dynamic Button, Ticket, Stamp, Tactile Button, Scramble Text, Cassette Player, Magnetic Drop Zone, Playing Cards, Scroll Fade List, Animated Signature, Logo Trace Loader, Iridescent Foil, Model Selector. | **Impresora de recibos** para `nxReciboAnimado` (Seguros, Financiamiento y POS): impresora con «Imprimiendo recibo…» que pasa a «Pago completo ✓», y el papel sale a tirones. **Mantén presionado para confirmar**: anular o reversar pagos y eliminar abonos, en NEXUS y STUDIO. **Boleto perforado**: rifas de NEXUS y rifa de Bayol. **Botón que cambia**: «Registrar pago» → «Registrando…» → «Listo ✓». **Firma que se dibuja sola**: firma del financiamiento. |
| **Originkit**: https://www.originkit.dev (beta, ~590 efectos gratis; reel de @aiboy.ai `DayD735y1oB`) | Fondos, textos, cursores, galerías, botones, cargadores y 3D. Se puede copiar el código, usar en Framer o conectar por MCP (pide cuenta y clave). | Para logins y portadas: Kinetic Grid (malla que sigue el dedo), Particle Sphere (esfera de puntitos), Text Morph (texto que se transforma) y Proximity Orbit (círculo de fotos de clientes). |
| **GetLayers AI**: https://www.getlayers.ai (agencia Textura; reel de @textura.us `DeMmzkxMpFZ`) | Instrucciones listas («prompts») para que la IA haga páginas web de cine: 54 plantillas de página completa, escenas 3D, secciones, fondos y degradados. Se copia la instrucción y se le pasa a Claude. **Muchas son Premium, de pago.** | Para portadas públicas: la tienda STUDIO, la web de Bayol Cell o una portada de NEXUS PRO. La cafetería «Brewns» tiene una impresora térmica que saca el recibo, la misma idea que la de Kitchen. Las de pago, solo con el OK del dueño. |
| **Stage**: https://getstage.co (de @adrien.ninet; reel `Dds6cC0Iz37`). **Es un método, no efectos.** | Antes de que la IA programe, ordena el trabajo: investigar la competencia, definir la estrategia, juntar referencias, armar la guía de estilo, dibujar el recorrido de las pantallas y exportar todo en un `AGENTS.md`. Es una app para Mac de pago (29 dólares al mes, 14 días gratis). | No hace falta comprarla: ya lo hacemos con `AGENTS.md`, `CLAUDE.md`, `DESIGN.md`, las skills (`competitor-profiling`, `ui-ux-pro-max`, `product-marketing`) y estas referencias. Para una pantalla o un sistema nuevo grande se sigue ese orden y se le muestra al dueño una maqueta para tocar antes de programar, como la de «Mejoras del Buzón» (11-oct). |
| **Raylight**: https://www.raylight.app (captura del dueño de un reel de Instagram, 11-oct). **Es para videos, no para pantallas.** | Arma videos de presentación de una app con capturas de pantalla y clips: movimientos de cámara en 3D, desenfoque de fondo y transiciones, con un agente de IA. Plan gratis con marca de agua «Made in Raylight» a 1080p. Los de pago van de 12 a 49 dólares al mes (o desde 9 al año); el de 12 quita la marca y exporta en 4K. Pide crear una cuenta. | Referencia de estilo para videos de NEXUS PRO, STUDIO o Bayol hechos con capturas (por ejemplo, presentar la isla de avisos o el Buzón). Lo mismo se hace sin pagar con `product-launch-video` (HyperFrames) o Remotion. La cuenta y los planes, solo con el OK del dueño. |
| **Avisos «Dynamic Island»**: reel de @adrien.ninet `DeWaJ8PgQK8` (proyecto `rit3zh/expo-dynamic-notifications`, React Native) | Avisos que salen de la isla del iPhone. | **Hecho** en NEXUS PRO 59.20 (`parches-isla-avisos.js`, rama `claude/isla-avisos`), pendiente de publicar. |
| **Reel «8 páginas para que lo que se programa con IA parezca hecho por un diseñador»** de @adrien.ninet (`DdZo10doQI7`, 11-oct). Trae 8 páginas; Stage (getstage.co) ya está arriba y las otras 7 van en las filas siguientes. | Revisadas el 11-oct (bitácora `2026-10-11-2238-claude.md`). Casi todas son componentes de React y nuestras apps no usan React, así que se **rehacen** en nuestro código como las demás referencias. | Las 3 ideas más útiles para NEXUS: **Liveline** (gráfica en vivo de lo cobrado), **border beam** de libraries.dev (borde de luz para lo que espera acción) y las **barras de progreso** de MetalForge (para «Sincronizando…» o al subir un comprobante). |
| **Skiper UI**: https://skiper-ui.com | Más de 106 componentes animados para React (shadcn, Tailwind, Next.js, Motion): revelado de imagen, isla dinámica, tooltip, rastro de imágenes con el cursor. Algunos gratis; Premium de pago único (129 dólares). | Referencia de animaciones para portadas y tarjetas. Lo Premium, solo con el OK del dueño. |
| **Libraries.dev / Orbs**: https://libraries.dev/orbs | «Thinking orbs»: esferas animadas para cuando una IA está pensando (9 estados), para React, React Native y SwiftUI. También trae **border beam** (un brillo que recorre el borde de una tarjeta), voz, avatares de bot y metal. Tiene un plan Pro de pago, sin precio publicado. | **Border beam** para la tarjeta de un pago por validar o del cliente que hay que cobrar hoy. Las esferas sirven si algún día se pone un asistente de IA dentro de NEXUS. |
| **Limora AI**: https://limora.ai | Genera imágenes de marca (fondos, mockups, íconos, ilustraciones, 3D y movimiento) con tu logo, colores y letras. Prueba gratis; luego 29 dólares al mes (unas 30 imágenes) o 59 (unas 90). Pide cuenta, y no está claro el permiso para uso comercial. | Fondos y mockups para anuncios de STUDIO, Bayol y NEXUS. Ya tenemos Buzzy y Higgsfield conectados para imágenes; Limora, solo con el OK del dueño. |
| **MetalForge**: https://metalforge.xyz (editor en `/editor`) | Efectos con *shaders* y animaciones para web, SwiftUI y React Native, sobre todo **cargadores y barras de progreso** con textura (humo, hexágonos, gotas, líquido, hilos). Algunos son gratis y el resto va por suscripción; tiene un MCP en prueba. | Barra de progreso para «Sincronizando…», para subir la foto de un comprobante o para cargar el Buzón. Solo mientras se espera, liviana y con «reducir movimiento». Su MCP y la suscripción, solo con el OK del dueño. |
| **Liveline** (Benji Taylor): https://benji.org/liveline | Gráfica de línea **en vivo**: cuando llega un dato nuevo, la línea se mueve suave a 60 cuadros por segundo. Hecha en React y canvas, con licencia MIT (gratis). | **Hecho** en NEXUS PRO 59.21: «Hoy, en vivo» en el Inicio, rehecha en JavaScript normal (bitácora `2026-10-11-2257-claude.md`; rama `claude/tema-oscuro-cristal`, pendiente de publicar). |
| **Agentation** (Benji Taylor): https://agentation.com | Una barra para marcar con el ratón cualquier parte de la pantalla, escribir la nota («haz esto más grande») y copiar un texto listo para pegárselo a Claude, con el elemento exacto. Gratis para uso interno y no manda datos a ningún lado. **Es solo para React y solo para computadora.** | No sirve tal cual: NEXUS no usa React y el dueño trabaja desde el iPhone. Con capturas marcadas ya se hace lo mismo. Si hace falta, se puede hacer un «modo comentario» propio para el admin. |
| **Fancy Components**: https://www.fancycomponents.dev | Componentes de React gratis y de código abierto: efectos de texto (resaltador, gravedad), rastro de imágenes y una marquesina que sigue una línea. | Textos animados para portadas públicas, como la tienda STUDIO o la web de Bayol. |
| **REA**: https://github.com/morluto/rea (captura del dueño de un reel, 11-oct: «Clona cualquier aplicación con Claude»). **Sirve para estudiar cómo funciona otra app, no para copiarla de un clic.** | Herramienta gratis (licencia MIT) de «ingeniería inversa»: se conecta a la IA (MCP y skill) y mira, sin el código fuente, programas de computadora, apps JavaScript/Electron, .NET, APK de Android y páginas web. Explica cómo funciona una función y con eso la IA escribe su propia versión. Pide Node 22 o más nuevo. Para programas de computadora usa Hopper (de pago, con modo de prueba), Ghidra (gratis) o IDA. | **No se instala por ahora** (revisada el 11-oct; ver la bitácora `2026-10-11-2232-claude.md`). NEXUS, STUDIO y Bayol ya tienen su propio código, y para ver cómo hace algo una página web ya usamos Playwright y estas referencias. Sirve si el dueño quiere la misma función que tiene una app concreta: se prueba en una carpeta aparte, sin cuentas ni pagos, solo para entenderla, y se rehace en nuestro código. Nunca se copia código ajeno ni se saltan protecciones. |
| **Notas de voz «Hold to record. Slide to cancel.»**: reel de @designmotionhq (UX Patterns · Design + Motion, `DeY-H8hDDRk`, 12-oct). Al final anuncia «UX Engine», un complemento para Claude Code que se consigue por el enlace de su perfil: **no se instaló**. | Las cinco decisiones del botón de nota de voz: responde desde el primer toque (contador y el botón que crece), una línea que, al deslizar y soltar pasado ella, borra la nota, deslizar hacia arriba para bloquear y soltar el dedo, la onda en vivo que avisa «micrófono silenciado» si no entra sonido en 2 s, y al oírla una barra para saltar a la parte que interesa y velocidad 1,5x. | Mejorar las **notas de voz del WhatsApp de NEXUS** (`parches-whatsapp-voz-mensajes.js`, que ya graba y deja oír antes de enviar). Pendiente de que el dueño lo pida (bitácora `2026-10-12`, entrega 59.22). |

### Seguridad
- `security-audit`, de Cloudflare. La auditoría completa se hace solo si se pide.
- `penetration-testing-with-strix`, `fix-security-vulnerabilities-with-strix`, `ci-security-scanning-with-strix`, `managed-pentesting-with-strix`, `gstack-cso`.

### Código, revisión y base de datos
- **Revisión y depuración:** `gstack-review`, `gstack-investigate`, `gstack-plan-eng-review`, `gstack-spec`, `gstack-health`.
- **Simplificar y arquitectura:** `ponytail*` (simplificar), `senior-architect`.
- **Pruebas:** `webapp-testing`.
- **Seguridad al editar:** `gstack-careful`, `gstack-guard`, `gstack-freeze`.
- **Base de datos:** **Supabase** (MCP), para consultar, migraciones y Edge Functions de los 3 proyectos, siempre con cuidado en producción. En bayolcell-taller también `supabase` y `supabase-postgres-best-practices`.
- **Plataformas:** **Cloudflare** (MCP), **Sentry** (MCP, errores), **GitHub**.

### Negocio, correo y documentos
- `lead-research-assistant` (buscar clientes o empresas), `invoice-organizer` (facturas), `gstack-plan-ceo-review`, `gstack-retro`.
- **Gmail** (MCP): leer y redactar. Enviar solo con OK.
- **GoDaddy** (MCP): dominios.
- **WhatsApp Business Tools** (MCP): números y plantillas de Meta. Nada se envía sin OK.
- **Docs y páginas:** documentos y páginas para compartir.

## Atajos: «quiero…» → herramienta

| El dueño dice | Se usa |
|---|---|
| «Hazme un video o reel» | `hyperframes` + Buzzy para escenas + revisión cuadro por cuadro |
| «Mira este video de Instagram/TikTok» | `ver-video-redes` |
| «Qué está funcionando en mi Instagram» | `analizar-instagram` + Supermetrics |
| «Qué hace la competencia» | Biblioteca de anuncios de Meta + Firecrawl + Supermetrics (perfiles públicos) |
| «Mejora esta pantalla» | `apple-design` / `impeccable` / `ui-ux-pro-max` |
| «Quiero un efecto, una animación o algo más bonito» | Primero las **Referencias de diseño** (Kitchen, Originkit, GetLayers) + `apple-design` |
| «Revisa la seguridad» | `security-audit` |
| «Algo falla» | `gstack-investigate` + Sentry + Supabase logs |
| «Haz una campaña» | Meta Ads (con aprobación) + video con HyperFrames |
| «Revisa mis anuncios» | `ads-meta` + Meta Ads (solo lectura) |
| «Mejora este texto u oferta» | `copywriting` / `offers` |
| «Que salgamos en Google o Maps» | `seo-local` + `seo-maps` |
