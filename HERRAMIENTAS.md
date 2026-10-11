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
| **Avisos «Dynamic Island»**: reel de @adrien.ninet `DeWaJ8PgQK8` (proyecto `rit3zh/expo-dynamic-notifications`, React Native) | Avisos que salen de la isla del iPhone. | **Hecho** en NEXUS PRO 59.20 (`parches-isla-avisos.js`, rama `claude/isla-avisos`), pendiente de publicar. |

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
| «Quiero un efecto, una animación o algo más bonito» | Primero las **Referencias de diseño** (Kitchen, Originkit) + `apple-design` |
| «Revisa la seguridad» | `security-audit` |
| «Algo falla» | `gstack-investigate` + Sentry + Supabase logs |
| «Haz una campaña» | Meta Ads (con aprobación) + video con HyperFrames |
| «Revisa mis anuncios» | `ads-meta` + Meta Ads (solo lectura) |
| «Mejora este texto u oferta» | `copywriting` / `offers` |
| «Que salgamos en Google o Maps» | `seo-local` + `seo-maps` |
