# TRASPASO-CLAUDE.md — todo lo que sabe Claude para seguir trabajando (13-oct-2026)

**Para qué es:** el dueño pidió (13-oct-2026, 11:46 RD):
> «Antes de continuar en el chat nexus pro v2 yo quiero que él sepa todo lo que sabes y todas las skills y herramientas para yo ir haciendo trabajos allá»

Este archivo resume, en un solo lugar, el conocimiento de la sesión larga de Claude (oct-2026), que trabajó en NEXUS PRO, BAYOL CELL (taller), STUDIO y Amatista Dental.

**Cómo usarlo:**
- No reemplaza a `AGENTS.md` → `CLAUDE.md` → `HERRAMIENTAS.md` → bitácora. Se lee **después** de ellos.
- Si algo de aquí choca con el código o con una bitácora más nueva, gana lo más nuevo. Hay que comprobarlo antes de actuar.

---

## 1. Cómo hablarle al dueño (Sterling)

- **Idioma y tono:**
  - Español sencillo y directo, sin jerga técnica (o explicada en una línea).
  - Respuestas cortas: listas de una idea por renglón, tablas cuando hay que decidir.
- **Mostrar, no solo contar:** el dueño quiere **ver** el resultado. Mandar capturas, antes/después, videos cortos y mosaicos de cuadros (con `SendUserFile`). Probar en tamaño iPhone (390–430 px) y en escritorio.
- **Mensajes cortados:** el dueño escribe en varios mensajes cortos y a veces con errores de dictado («oler claude» = «poner a Claude»). Si algo no se entiende, interpretar lo más probable y confirmarlo en una línea.
- **Decisiones del dueño:**
  - Cuando dé una, escribirla en `CLAUDE.md`, `REGLAMENTOS.md` o la bitácora (de su repo).
  - Lo que solo quedó en el chat se pierde al compactar.

## 2. Reglas del dueño que no se negocian (todas las empresas)

**Publicar y gastar**
- **Publicar:** nada va a `main` ni a producción sin «publícalo», «súbelo» o «ponlo en vivo». Esa palabra vale **solo para esa entrega**.
- **Bitácora:** cada cambio deja una entrada nueva. Nunca se edita ni se borra una anterior.
- **Cuentas y dinero:** no conectar cuentas, no iniciar sesión, no crear suscripciones ni gastar sin su OK.
- **Créditos de IA:**
  - Buzzy: autorizado para los videos de BAYOL y Amatista.
  - Higgsfield y el resto: preguntar antes de gastar.

**Anuncios y mensajes**
- **Meta Ads:**
  - Nunca crear, activar, pausar ni cambiar presupuestos sin su OK escrito, cambio por cambio.
  - Leer y analizar sí se puede.
- **WhatsApp y redes:**
  - Nada se manda a clientes ni se publica sin su OK.
  - Las pruebas, solo a su número.

**Precios y datos públicos**
- **Precios:** en todo lo público, solo el **precio nivel 1** (cliente final). Nunca costo, nivel 2 (por mayor), nivel 3 (extremo) ni `precio_especial`.
- **Repos públicos:** el de BAYOL y otros son públicos. Nunca subir costos, listas internas ni el Excel de precios.

**Taller BAYOL: nombres de calidad**
- Al cliente **nunca** se le dice «Incell»: se dice **«Calidad certificada»**.
- La OLED se llama solamente **«Calidad Soft OLED»** y se ofrece **solo si el cliente pregunta** por otra calidad.

**Imágenes y videos**
- No presentar personas hechas con IA como clientes reales.
- Las fotos de **antes y después** no van en anuncios pagados de Meta.
- No usar caras de famosos.
- Videos con IA: revisarlos cuadro por cuadro antes de entregar. El iPhone tiene **un** módulo de cámara arriba a la izquierda, las manos tienen 5 dedos y no puede haber letreros con letras inventadas.

**Técnicas**
- Nunca desactivar TLS.
- Nunca poner IDs de modelo de IA en commits ni PR.
- Lo descargado de internet va al scratchpad, nunca al repo.
- HyperFrames siempre con `HYPERFRAMES_NO_TELEMETRY=1 DO_NOT_TRACK=1`, y nunca `npx hyperframes usage`.
- **Skills:** usar SIEMPRE las skills instaladas que correspondan, sin esperar a que el dueño las nombre (regla del 08-oct, ver `CLAUDE.md`).

## 3. Skills y herramientas

### 3.1 Dónde están las listas
- **`HERRAMIENTAS.md`** (este repo) es la lista oficial de skills, conectores y atajos «quiero… → herramienta». Leerla en cada pedido.
- **Skills del repo `nexus-pro`:** `.claude/skills/` (106). En **`bayolcell-taller`** hay 126, porque se le copiaron las de NEXUS el 13-oct (kit de catálogo) y tiene además `impeccable`, `supabase`, `analizar-instagram` y `precios-competencia`. **`studio-rd`** tiene las suyas.
- La sesión también anuncia skills propias (artefactos, `xlsx`/`docx`/`pdf`/`pptx`, `dataviz`, `code-review`, etc.).

### 3.2 Conectores (MCP) usados en esta sesión y lo aprendido de cada uno
| Conector | Para qué lo usamos | Aprendido |
|---|---|---|
| **Supabase** | SQL, migraciones, Edge Functions de los 3 proyectos | NEXUS = `tnwsgcxurfyuszxsewsn`, BAYOL/taller = `vkhwdvjtowrhkhqavnvk`, STUDIO = `edbknlkjnlfmkkiizdbe`. `drop policy`/`revoke` se quedan esperando una confirmación que no llega: esas migraciones las pega el dueño en el editor SQL. |
| **GitHub** (MCP y `git`) | Ramas, PR, revisar | Push directo a `main` del taller: a veces lo bloquea el clasificador («Production Deploy»). Entonces se deja todo en la rama y el dueño autoriza, o lo une el otro chat. |
| **Firecrawl** | Buscar en la web y leer páginas | **No lee Instagram** (dice «we do not support this site»). Para Instagram usar `yt-dlp`. |
| **Buzzy** | Imágenes y video con IA | Ver la receta en 4.3. |
| **Higgsfield** | Video e imagen con IA | Preguntar antes de gastar. |
| **Meta Ads** | Biblioteca de anuncios, revisar campañas | Solo lectura sin OK. |
| **WhatsApp Business Tools** | Números y plantillas de Meta | Nada se envía sin OK. |
| **Cloudflare, Sentry, Figma, Gmail, GoDaddy, Supermetrics, Replit, Claude Docs** | Según `HERRAMIENTAS.md` | — |
| **Artifact** | Páginas para compartir | Privadas por defecto. |

### 3.3 Programas en la máquina de la sesión (se pierden al cerrarla: reinstalar)
- **ffmpeg:**
  - `pip install imageio-ffmpeg`
  - `python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"`
  - Conviene copiarlo a `$SCRATCH/bin/ffmpeg`.
- **yt-dlp:**
  - Se instala con `pip install --target $SCRATCH/redes/ytdlp_pkg yt-dlp`.
  - Se corre con `PYTHONPATH=… python3 -m yt_dlp`. **Sin `-I`**, porque `-I` ignora el `PYTHONPATH`.
  - Instagram a veces responde **429**: reintentar con `--sleep-requests 3` y pausas de 20 s.
- **Playwright + Chromium:**
  - `NODE_PATH=/opt/node22/lib/node_modules`
  - `CHROMIUM_PATH=$(ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome | head -1)`
  - Nunca `playwright install`.
- **curl a internet:** `--cacert /root/.ccr/ca-bundle.crt`. Chromium no confía en el proxy para sitios en vivo, así que las páginas en vivo se verifican con `curl` y se comparan con `sha1sum`.
- **Transcribir audio con tiempos exactos:**
  - `npx hyperframes@0.8.150 transcribe audio.wav -m large-v3 -l es -d . --json`
  - Telemetría apagada y ffmpeg en el PATH.

## 4. Recetas que funcionaron (con sus trampas)

### 4.1 Piezas fijas (flyers, catálogos, posts)
- HTML a tamaño real (1080×1350 feed, 1080×1920 historia) y captura con Playwright a `deviceScaleFactor:2`, luego reducido.
- Las letras van **dentro del proyecto** (`.woff2`). Esperar `document.fonts.ready` y `body[data-ready="1"]`.
- **Logo de BAYOL:** `assets/logo.png` (700×700) tiene mucho borde transparente. Se recorta **x40 y198, 622×270**.
- **Plantillas listas en `bayolcell-taller`:**
  - `herramientas/kit-catalogo/flyer-pantallas/` (pantallas iPhone)
  - `herramientas/kit-catalogo/flyer-reparaciones/` (batería y cristal trasero, `node render.js bateria|trasero feed`)
  - `herramientas/kit-catalogo/catalogo/` (carrusel o PDF con candado: se para si aparece un costo)
- **Para la web del taller:** 900×1200 `.webp` (el 1080×1350 reducido, con franjas `#0C0C0C`) y `?v=AAAAMMDD` en `index.html` para que no se vea la copia vieja.

### 4.2 Reels con animación
- La página expone `render(t)`, se captura cuadro a cuadro a 30 fps y se une con ffmpeg.
- **Trabajar por partes:**
  1. Video base con `-preset ultrafast`.
  2. Mezcla de audio a WAV.
  3. Capas y audio.
- **Trampas:**
  - `apad` sin `whole_dur=` genera audio infinito y cuelga el render.
  - `loudnorm` en una pista corta corta la cola: usar ganancia fija + `alimiter`, a −14 LUFS.
  - En `amix` usar `duration=longest`.
- **Zona segura de Reels:** texto entre el 14 % y el 65 % de la altura.
- **Subtítulos:** no escalar la palabra resaltada, porque se pegan con las vecinas. Usar margen de 11 px.

### 4.3 Buzzy
- **Video:** Seedance 2.5 (1080p, 4–30 s). Antes, `list_model`, y copiar sus valores tal cual. `GenerateVideo` devuelve un `task_id` que se consulta con `get_task` cada 1–2 min, **sin reenviar el pedido** (cobraría doble).
- **Imágenes:** `gpt-image-2` da ilustraciones 3D limpias. Para una serie, usar la misma frase de estilo en todas.
- **Música:**
  - Truco: `GenerateVideo` a 480p con una escena neutra (luces desenfocadas) y el prompt «ONLY instrumental music, no vocals, no sound effects». Se usa solo el audio.
  - No darle un video con ruidos de referencia: los copia.
- **Lo que falla:** `VideoMergeWorkflow` (se corta a los 60 s), `RegenerateBGMWorkflow` («nodeId is required») y `ExecutePromptWorkflow`. Es mejor unir con ffmpeg.
- **Personas:** los dos Seedance fallaron con personas reales. MiniMax-H3 aceptó video y audio de referencia.

### 4.4 Videos que manda el dueño
- **Más de 30 MB:** que los suba a Google Drive con «Cualquier persona con el enlace».
  - Se bajan con `curl -L "https://drive.usercontent.google.com/download?id=<ID>&export=download"`.
  - Si devuelve «Sign-in», el archivo sigue privado.
- **Enlaces de Instagram o TikTok:** skill `ver-video-redes` (yt-dlp, mosaico de cuadros y audio).

### 4.5 Info Plus (sistema de inventario del taller BAYOL)
- **Fuente de verdad de precios:** `infoplus_articulos.niveles` (`{"1","2","3"}`) en el Supabase del taller.
  - Lo llena la función `infoplus-precios-sync` (cron `infoplus-precios-diario`, 06:00 UTC).
  - Para tenerlos al día, ejecutar ese mismo cron a mano: `do $$ … execute command … $$` desde `cron.job`.
- **Cambiar precios en Info Plus** (procedimiento probado el 8-oct y el 13-oct):
  1. Mostrar una tabla «precio de hoy → precio nuevo» y obtener el **OK escrito** del dueño.
  2. Crear una función de un solo uso, con la lista fija en el código y un token de un solo uso del que solo se guarda el hash. La clave de Info Plus se redacta.
  3. **Leer en vivo** con `listaarticulos?…&detallado=true&todos=true` (la respuesta viene en `data.data`). Comprobar que la descripción coincide, porque la tabla puede tener descripciones viejas (caso del código 1500).
  4. Aplicar con `POST /api/articulo` y `{codarticulo, precios:[{codnivelprecio:1, contado, credito, minimo}]}`. **Mandar los 3 campos:** dentro de un nivel, Info Plus pone en 0 los que no se envían.
  5. Releer en vivo y confirmar que todo coincide.
  6. **Retirar** la función (stub 410) y **borrar** el token.

### 4.6 WhatsApp: lo que se puede y lo que no (investigado el 13-oct)
- **Grupos por la vía oficial (Meta o Zernio):**
  - Solo grupos **creados por un número solo de API** con la **marca de cuenta oficial (OBA)**, de **máximo 8** personas, a los que se entra por enlace.
  - **No funciona en coexistencia** (app WhatsApp Business + API en el mismo número), y en ese modo Meta desactiva los grupos.
  - **Nunca** llega a los grupos que ya existen en el teléfono.
- **Zernio:** tiene Groups API (`/v1/whatsapp/wa-groups`) con esas mismas limitaciones. El número de ventas de BAYOL (18495644791) está en coexistencia.
- **Agente en WhatsApp (OpenClaw, «el del video»):**
  - Se conecta como **dispositivo vinculado** (QR, igual que WhatsApp Web).
  - Usa los grupos existentes, pero no es oficial, así que el número puede ser suspendido.
  - El teléfono debe conectarse al menos una vez cada ~14 días.
  - Su tienda de complementos tuvo skills dañinas reportadas: no instalar ninguna sin revisarla.
- **Vender la conexión oficial a otros CRM:** ver `docs/bitacora/2026-10-13-0130-claude.md`, en la rama `claude/claro-contraste`.
  - Ser **Tech Provider** de Meta exige verificar la empresa y pasar App Review.
  - Hoy se puede vender con Zernio.
  - Omnivis solo con garantías por escrito.
  - Bayol se puede verificar en Meta: el dueño tiene los documentos y debe hacerlo él.

## 5. Estado de todo al 13-oct-2026, 11:46 RD

### 5.1 NEXUS PRO (este repo)
- **Producción: 59.22.** Ver `AGENTS.md` §4.
- **59.23 lista para publicar** en `claude/claro-contraste` (contraste del modo claro en Préstamos y POS). No publicar sin «publícalo».
- **Bitácoras de Claude que siguen en ramas, no en `main`:**
  - `claude/claro-contraste`: `2026-10-12-1330`, `1415`, `1435`, `2300`, `2330`, `2358` y `2026-10-13-0100`, `0130`.
  - Temas: contraste, Amatista, Omnivis y Tech Provider, catálogo y precios.
  - Leerlas desde esa rama: `git fetch origin claude/claro-contraste`.
- **`claude/review-claude-md-jpzk7k`** (la rama de este traspaso) trae además, sin publicar, la skill `impeccable` y los conectores `chrome-devtools` (sin estadísticas a Google) y `shadcn` en `.mcp.json`. Son del 10-oct; ver la bitácora `2026-10-10-0130-claude.md`.
- **Pendientes de siempre:** iniciativa de acumulados y transferencias (Fase 0 de auditoría, ver `CLAUDE.md`); PR #326 y #327; encargo visual móvil del Inbox de WhatsApp; migración `20261007120000_pos_fiado_abono_servidor.sql` sin aplicar; rotar la Global API Key de Cloudflare.

### 5.2 BAYOL CELL — `sterlinr08-dte/bayolcell-taller` (web `bayolcell.com`, GitHub Pages)
| Trabajo | Rama | Estado |
|---|---|---|
| Imágenes nuevas de **batería** y **cristal trasero** de iPhone (precios nivel 1 verificados) | `claude/flyers-reparacion` | **PUBLICADO** el 13-oct (`main` en `e8d57f1`). En vivo y verificado. |
| Precios en Info Plus: 2550 batería iPhone 11 800 → **1,400**; 2220 tapa XS blanca 3,000 → **1,500** | — | **APLICADO** y verificado. Función `infoplus-precios-ajuste-20261013` retirada. |
| **Catálogo web nuevo** `tienda.html` (estilo STUDIO: celulares + «Cambio de pantalla» solo al buscar; animaciones del pedido: foto que vuela, resumen que asoma, carrito que se lleva el pedido) + botón **«Busca el precio de tu pantalla»** en la portada (`tienda.html#pantallas`) | `claude/catalogo-web` (commit `47016d1`, ya unido con `main`, 34/34 pruebas) | **El dueño dijo «Si» a publicarlo.** Falta solo `git push origin 47016d1:main`, que bloqueó el clasificador. `catalogo.html` (celulares) **se queda como está**: decisión del dueño. |
| Función **`pantallas-publico`** (precio nivel 1 de pantallas por búsqueda; mínimo 2 letras, máximo 6 resultados; sin «Incell»; Soft OLED solo si se busca) | — | **DESPLEGADA** (v1, `verify_jwt:false`) y probada en vivo. |
| **Cotizar pantalla** en el chat de WhatsApp del CRM (`crm-cotizar-pantalla.js`, tarjeta 1080×1350) | `claude/cotizar-pantalla` (`8b0a344`) | Espera «publícalo». |
| Imagen «Cambia el cristal de la pantalla» (precios viejos, más caros que la pantalla completa) | — | El dueño dijo **«déjalo igual»**. |
| Migración `20261008000000_ajuste_permisos.sql` | — | La pega el dueño en el editor SQL y luego se corre su prueba. |

Detalle en las bitácoras de `bayolcell-taller/docs/bitacora/2026-10-13-*`.

### 5.3 Asistente de WhatsApp para mandar tareas a los empleados (en conversación)
- **Lo que quiere el dueño:**
  - Hablarle a Claude por WhatsApp para mandar tareas y avisos **a los grupos de empleados que ya existen**.
  - Lo vio en un reel: OpenClaw, «escanea el QR».
- **Decisión:** **opción 1, OpenClaw**, con el **WhatsApp Business viejo de la tienda BAYOL** (poco uso), que se agrega a los grupos.
- **Respuestas ya dadas al dueño:**
  - Ese teléfono solo ve los chats de ese número.
  - Las notificaciones se pueden silenciar.
  - El teléfono debe seguir con WhatsApp y conectarse cada ~14 días.
- **Gastos explicados:** OpenClaw gratis; computadora de la tienda (RD$0) o servidor de ~US$5–6 al mes; Claude por API ~US$5–15 al mes con **límite de gasto**. La suscripción de Claude no sirve.
- **Falta que el dueño:**
  1. Elija computadora de la tienda o servidor.
  2. Cree la cuenta de API de Claude con su tarjeta y límite (por ejemplo US$15 al mes).
  3. Agregue el número viejo a los grupos.
- **Diseño acordado:**
  - Solo obedece el número del dueño.
  - **Siempre pregunta «¿Lo envío?»** antes de publicar.
  - Al inicio solo hace mensajes, recordatorios y resúmenes.
  - Sin complementos de la tienda de OpenClaw.

### 5.4 Amatista Dental (clienta; los archivos se entregaron por el chat)
- Hechos:
  - anuncio «3 sonidos pro» con música;
  - reel de la doctora «corona, carilla y puente» (29 s, ilustraciones 3D);
  - antes/después en reel y post, con carillas.
- **Texto de Instagram** del reel de la doctora: entregado el 13-oct.
  - En el texto se usó «el puente fijo **repone** dientes perdidos», aunque en el audio la doctora dice «reposicionar».
- Los archivos vivían en el scratchpad de la sesión vieja y **no se guardan**. Si hacen falta, pedírselos al dueño.

### 5.5 Otras ideas ofrecidas y pendientes
- **Humanizar la IA que responde en los CRM:** se dieron recomendaciones y no se implementó nada.
  - Ejemplos de conversación real.
  - Modelo más nuevo.
  - Precios en vivo.
  - La regla de nombres de calidad.
- Reels con el estilo del carrusel «Claude Motion» (contador que rueda, «✓ Agregado»): ya aplicado en el catálogo.

## 6. Cómo trabajar en esta sesión nueva
1. Leer `AGENTS.md` → `CLAUDE.md` → `HERRAMIENTAS.md` → las 5 bitácoras más recientes → **este archivo**.
2. Si el pedido es del taller BAYOL o de STUDIO, clonar ese repo (con `add_repo` si no está en la sesión) y leer **su** `CLAUDE.md` y **su** bitácora antes de tocar nada.
3. Elegir las skills del catálogo y decir cuáles se usan.
4. Hacer el cambio en una rama `claude/*`, con pruebas y capturas o video, y una bitácora nueva.
5. Enseñárselo al dueño y esperar el «publícalo».
