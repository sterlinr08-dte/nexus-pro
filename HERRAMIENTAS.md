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

`impeccable` (pbakaus, Apache 2.0) está en los tres repos desde el 10-oct-2026. **Figma** (MCP) está conectado para diseños.

**Conectores del proyecto (`.mcp.json` de nexus-pro, 10-oct-2026):**
- **chrome-devtools** (Google, Apache 2.0, v1.10.1 fija): abre páginas en Chrome y revisa consola, red, rendimiento (Lighthouse), estilos y accesibilidad. Con `--no-usage-statistics` y `--no-performance-crux` (sin datos a Google). En la nube no abre sitios HTTPS externos (el navegador no confía en el certificado del proxy, igual que Playwright): sirve para las páginas servidas en local (`python3 -m http.server`).
- **shadcn** (MIT, v4.21.4 fija): busca componentes y ejemplos del registro de shadcn/ui. Solo instala componentes en proyectos React con shadcn; nuestros sistemas son HTML/JS, así que sirve como referencia de diseño.

### Referencias de diseño que mandó el dueño
La lista completa (con la regla y cómo se usan) está en **`docs/REFERENCIAS-DISENO.md`**, el mismo archivo en los 3 proyectos. Leerla antes de cualquier pedido de diseño, y agregar ahí (en los 3) cada referencia nueva que mande el dueño.

### Seguridad
- `security-audit`, de Cloudflare. La auditoría completa se hace solo si se pide.
- `penetration-testing-with-strix`, `fix-security-vulnerabilities-with-strix`, `ci-security-scanning-with-strix`, `managed-pentesting-with-strix`, `gstack-cso`.

### Código, revisión y base de datos
- **Revisión y depuración:** `gstack-review`, `gstack-investigate`, `gstack-plan-eng-review`, `gstack-spec`, `gstack-health`.
- **Simplificar y arquitectura:** `ponytail*` (simplificar), `senior-architect`.
- **Pruebas:** `webapp-testing`.
- **Mapa del código:** `graphify-nexus` (18-oct-2026). Dice dónde vive una función y quién la llama sin releer `index.html`. Es local: nada sale del equipo.
- **Agent Skills de Addy Osmani** (18-oct-2026), 17 elegidas:
  - **Contexto y memoria:** `context-engineering`.
  - **Trabajo por pasos:** `incremental-implementation`.
  - **Revisar decisiones antes de actuar:** `doubt-driven-development`, `interview-me`, `idea-refine`.
  - **Calidad y pruebas:** `constraint-driven-development`, `test-driven-development`, `debugging-and-error-recovery`.
  - **Navegador:** `browser-testing-with-devtools` (con `chrome-devtools`).
  - **Documentación oficial:** `source-driven-development`.
  - **Pantallas:** `frontend-ui-engineering`.
  - **Velocidad:** `performance-optimization`.
  - **Seguridad:** `security-and-hardening`.
  - **Interfaces:** `api-and-interface-design`.
  - **Cambios de base:** `deprecation-and-migration`.
  - **Registros:** `observability-and-instrumentation`.
  - **Decisiones:** `documentation-and-adrs`.
- **Agent Skills que NO se instalaron:**
  - `code-review`, `code-simplification`, `spec`, `planning` y `git-workflow`: repiten `gstack` o `ponytail`, o las reglas de git propias.
  - `ci-cd-and-automation` y `shipping-and-launch`: chocan con la regla de publicar solo con «publícalo» y sin GitHub Actions.
  - `using-agent-skills`: es el índice del paquete completo.
- **Seguridad al editar:** `gstack-careful`, `gstack-guard`, `gstack-freeze`.
- **Base de datos:** **Supabase** (MCP), para consultar, migraciones y Edge Functions de los 3 proyectos, siempre con cuidado en producción. En bayolcell-taller también `supabase` y `supabase-postgres-best-practices`.
- **Plataformas:** **Cloudflare** (MCP), **Sentry** (MCP, errores), **GitHub**.

### Negocio, correo y documentos
- `lead-research-assistant` (buscar clientes o empresas), `invoice-organizer` (facturas), `gstack-plan-ceo-review`, `gstack-retro`.
- **Gmail** (MCP): leer y redactar. Enviar solo con OK.
- **GoDaddy** (MCP): dominios.
- **WhatsApp Business Tools** (MCP): números y plantillas de Meta. Nada se envía sin OK.
- **Docs y páginas:** documentos y páginas para compartir.

### Herramientas propias tomadas de la comunidad (23-oct-2026)
- **Candado de secretos** (`.claude/hooks/secretos.sh`, hook PreToolUse·Bash): antes de cada `git commit` o `git push` de Claude revisa lo que se va a confirmar o subir; si encuentra algo que parece una clave (Info Plus `clave=`, JWT service_role, Anthropic, Stripe, AWS, GitHub, Slack, llaves privadas, `token=…`) lo bloquea y dice la línea. Idea de *Agent Guard* (MIT), hecha en casa sin descargas. Falso positivo seguro: `SECRETOS_OFF=1` delante del comando.
- **`redaccion-clara`** (`.claude/skills/redaccion-clara`): revisa o reescribe textos en español para pantallas, WhatsApp y la IA según la regla del dueño (cortos, profesionales, sin redundancia). Adaptación en español de las categorías de *avoid-ai-writing* (MIT), que solo existe en inglés. Usarla antes de dejar un texto nuevo.
- **`launch-check`** (`.claude/skills/launch-check`, de la colección Antigravity/AAS; MIT, solo biblioteca estándar de Python, no manda nada a terceros): revisión pasiva de un sitio en vivo: claves expuestas en el frontend, tablas abiertas de Supabase (solo con `--owner-check`), cabeceras de seguridad, diseño a 375 px, SEO y velocidad. Usar antes de publicar algo grande. Primera corrida 23-oct: bayolcell.com 54/100 y nexusprord.com 58/100, sin claves expuestas; faltan cabeceras HSTS, CSP y X-Frame-Options (van en Cloudflare).
- **Revisadas y NO instaladas** de esa colección: `production-audit` (manda el repo a api.commit.show), `verify-document` y `extract-document-data` (suben los documentos a stipple.sh). Van contra la regla de no mandar datos a servicios externos.

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
| «¿Dónde está / qué rompe esto?» | `graphify-nexus` (mapa del código) |
| «Haz una campaña» | Meta Ads (con aprobación) + video con HyperFrames |
| «Revisa mis anuncios» | `ads-meta` + Meta Ads (solo lectura) |
| «Mejora este texto u oferta» | `copywriting` / `offers` |
| «Que salgamos en Google o Maps» | `seo-local` + `seo-maps` |

- **`puntos-de-control`** (23-oct-2026): forma de trabajar del dueño, inspirada en el plugin VibeWise (MIT; no instalado, solo la idea). Antes de código no trivial: 2–3 opciones con ventajas y desventajas, él decide; después, informe de qué cambió y qué pruebas pasaron. Se usa sola.
