# 06-nov-2026 · Buzón de WhatsApp compacto en el celular (RAMA, sin publicar)

## Pedido
- El dueño pidió «5 agentes programadores y diseñadores para NEXUS PRO» que hagan mejoras y ajustes. A este le tocó el **«Encargo visual vigente — WhatsApp móvil»** de `CLAUDE.md`: compactar cabecera, datos, acciones y filas para ver más chats, y revisar el botón flotante.
- Solo visual. No se tocó carga, envío, Realtime, el chat abierto, Supabase ni dinero.

## Auditoría de la cascada (390 px, simulador)
Medido en el navegador con las hojas reales (`document.styleSheets`), de la primera a la última que gana:

| Pieza | Capas que la tocan (en orden) | Quién gana hoy | Medida antes |
|---|---|---|---|
| Cabecera `.nxCrmHomeHead` | nxWaInboxCss → nxWaVisualCss → nxWaInboxUhdCss → nxWaInboxCompactMobileCss | CompactMobile (min 42) | 56 px, «WhatsApp» e «Inbox» en 2 líneas |
| Datos `.nxWaProGrid/.nxWaProKpi` | nxTemaGlassOscuro (2 col) → nxWaInboxCss → nxWaVisualCss → nxWaInboxUhdCss → CompactMobile | **oscuro:** nxTemaGlassOscuro (2 col, el 1.º a lo ancho) · **claro:** fila de lado con `overflow:hidden` | oscuro: 3 filas, 144 px · claro: **«Póliza» y «Sin vincular» quedaban cortados fuera de la pantalla** |
| Acciones `.nxWaProActs` | nxWaInboxCss → nxWaVisualCss → visual-v2.css → V5 → InboxUhd | InboxUhd | «Contactos» solo en una franja de 46 px |
| Barra de la lista `.nxWaListTools` | nxWaVisualCss → V4 → InboxUhd → CompactMobile | InboxUhd/CompactMobile | 56 px; campana **30×44**, lupa **40×40** (bajo la regla de 44) |
| Filas `.nxWaRow` | nxWaVisualCss → V4 → InboxUhd → CompactMobile | CompactMobile + letra forzada a 11 px | 62 px en 3 líneas; nombre y vista previa a **11 px** |
| Botón flotante `.nx-fab` | parches-seguros-base.js | — | **Ya no existe** desde 59.21 (`NX_FAB_MENU`); nada fijo tapa la lista. No había nada que arreglar. |

Resultado antes: la primera conversación empezaba a **413 px** y se veían **6 chats**.

## Qué se hizo
**Nuevo** `parches-whatsapp-movil.js` (cargado después de `parches-whatsapp-parloteo.js` en `parches-seguros.js`). Solo CSS, solo `@media(max-width:760px)` y solo dentro de `#v-waInbox`. Gana por especificidad (`html.nx-wam body #cnt #v-waInbox:not(#_)`), así no depende del orden en que otras capas inyectan su estilo.

1. **Cabecera de una línea:** ícono 32 px + «WhatsApp» + «Inbox» uno al lado del otro. 56 → **48 px**.
2. **Los 5 datos y «Contactos» en una cuadrícula de 2 columnas** (3 filas de 44 px). Antes: 5 datos en 3 filas y «Contactos» en una cuarta. Cada dato conserva ícono, nombre (13 px, entero, sin «…») y número (16 px); se oculta solo la línea pequeña de abajo («7 vinculadas»). «Contactos» usa la misma forma, con letra normal (no en mayúsculas). Si «Bauches» aparece, toma la casilla siguiente. Los botones que ya estaban ocultos (Cobranza, Pólizas por vencer, WA deuda, Automatizaciones) siguen ocultos. **Arregla el modo claro**, donde 2 datos quedaban fuera de la pantalla.
3. **Barra «Conversaciones»:** campana y lupa de **44×44**.
4. **Filas de 2 líneas:** la etiqueta (Nuevo, Cobro, Sin cliente, Al día) va al lado del nombre; nombre **15 px**, vista previa **13 px**, hora 12 px, avatar 40 px. Fila de 58 px.
5. Con un chat abierto, la cabecera y los datos se esconden igual que antes (regla propia que gana a la cuadrícula).
- En pantallas de ≤380 px (iPhone SE/mini) se quita el ícono de cada dato para que el nombre quepa.

Resultado: la lista empieza a **359 px** (54 px más arriba) y se ven **8 chats** en vez de 6, con letra más grande. En la PC no cambia nada.

## Archivos
- `parches-whatsapp-movil.js` (nuevo)
- `parches-seguros.js` (una línea en la lista de capas)
- `scripts/qa-whatsapp-movil.mjs` (nuevo)
- `docs/MEMORIA.md` (una fila)

## Pruebas
- `scripts/qa-whatsapp-movil.mjs` contra `qa-crm-mock-server.js` (PORT=8954), 20 chats simulados, nada sale a Supabase: **44/44 PASS** a 390 px (oscuro y claro) y 1280 px.
  - Mide la capa apagada como referencia y compara: cabecera 48 px; 5 datos ≥44 px, dentro de la pantalla y con el nombre entero; 2 columnas; «Contactos» ≥44 px en la fila del último dato; botones ocultos siguen ocultos; campana y lupa 44×44; fila 58 px con nombre 15 px y vista previa 13 px; etiqueta en la línea del nombre; lista 413 → 359 px; chats 6 → 8; sin scroll de lado; tocar «Sin responder» filtra; tocar un chat lo abre y esconde cabecera y datos; sin errores de página; a 1280 px idéntico a la capa apagada.
- Revisado también a 375 y 430 px: los nombres de los datos caben enteros; 8 chats a la vista.
- `qa-whatsapp-lista.mjs` (19 PASS · 1 FAIL) y `qa-whatsapp-parloteo.mjs` (31 PASS · 1 FAIL): **los mismos fallos salen con la capa quitada**, o sea que ya estaban (una ventana de error en el simulador al tocar «Archivados» y la reacción 👍 a 390 px). No los causa este cambio; quedan para revisar aparte.
- No probado en un iPhone real (Safari, teclado, zona segura): falta que el dueño lo vea.

## Cómo apagarlo
- En un equipo: `localStorage.nx_whatsapp_movil_off='1'` y recargar.
- Para todos: `window.NX_WHATSAPP_MOVIL=false` o borrar la línea de `parches-whatsapp-movil.js` en `parches-seguros.js`.

## Riesgos
- Bajo: solo CSS en una vista. Si otra capa futura cambia el HTML del panel (`.nxWaProGrid`/`.nxWaProActs`), la cuadrícula podría verse distinta; la prueba lo detecta.
- `display:contents` en los dos contenedores del panel: los botones siguen siendo botones (lectores de pantalla bien); se probó tocar.
- La capa vieja `parches-whatsapp-inbox-compact-mobile.js` (letra de 6–8 px) sigue cargando, pero esta la anula en todo lo que toca. Se podría retirar más adelante.

## Siguiente paso
- Que el dueño lo vea en su iPhone en la rama `claude/mejoras-whatsapp-movil` y diga «publícalo». Sin push ni PR todavía.
