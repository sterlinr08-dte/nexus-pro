# 59.59 «Parloteo»: la ventana del chat de WhatsApp con el estilo del reel del dueño (rama, sin publicar)

## Pedido
- El dueño mandó el reel `https://www.instagram.com/reel/De5Q5SpjmdJ/` (moxen.studio, «Chatea con tus clientes · Parloteo»). Dijo: «mira esa ventana del chat, me gusta y otra cosa: no tenemos la animación cuando el cliente está escribiendo».
- A la pregunta de qué preparar, respondió: «la ventana del chat y sus funciones».
- Primero Instagram bloqueó la descarga (error 429). El dueño pidió intentarlo de nuevo y entonces bajó con yt-dlp (7,6 s). Se analizó cuadro por cuadro.

## Aclaración importante (fuente: documentación oficial de Meta)
- **WhatsApp no avisa a ningún sistema cuando el CLIENTE está escribiendo.** Solo avisa cuando el mensaje llega.
- Meta permite lo contrario: que el cliente vea «escribiendo…» mientras responde la empresa. Eso es aparte y no se hizo; falta confirmar si Zernio lo permite.
- Por eso el «escribiendo…» de NEXUS es **entre agentes del mismo chat**: avisa que otro agente está respondiendo para que no le contesten dos a la vez al cliente.

## Qué cambia (solo el chat abierto `#v-waInbox` y el menú del mensaje)
1. **Degradado continuo:** las burbujas enviadas comparten un solo degradado, azul claro arriba e índigo/violeta abajo. Cada burbuja (y su colita) muestra su franja. Como iOS ignora `background-attachment:fixed`, la posición se calcula al hacer scroll (`--pl-y`, `--pl-ty`, `--pl-h`).
2. **«✓✓ Leído 11:24 a. m.»** debajo del último mensaje enviado cuando es el último del chat. Si no ha llegado a leído, dice «✓✓ Entregado» o «✓ Enviado». La hora se queda en cada burbuja, porque es un dato de trabajo.
3. **«escribiendo…» de otro agente:**
   - burbuja con 3 puntos animados al final del chat y «Robinson escribiendo…» en la cabecera, en lugar del teléfono;
   - se va solo a los 5 s sin aviso nuevo o cuando el otro agente vacía o envía;
   - usa un canal Realtime de difusión propio, `nx-wa-escribiendo`, aparte del canal del Buzón;
   - solo viaja `{hilo, id y primer nombre del agente}`;
   - no hay tablas, migraciones ni Edge nuevas.
4. **Enviar y micrófono:** círculo azul de 44 px con degradado. Al escribir, «enviar» entra girando y se va el micrófono (la lógica de mostrar uno u otro ya existía).
5. **Placeholder «Mensaje»:** el largo, «Escribe un mensaje…», partía en dos líneas a 390 px.
6. **Menú del mensaje:**
   - fila de 6 reacciones rápidas arriba (👍 ❤️ 😂 😮 😢 🙏, 44 px cada una);
   - tocar la que ya está puesta la quita;
   - se quitó el renglón «Reaccionar», para no duplicar la función;
   - mientras está abierto, el resto del chat se ve borroso.
7. Los textos van en minúscula normal, aunque otra capa forzaba mayúsculas. En el tema claro, la hora va en blanco legible sobre el azul.

## Archivos
- `index.html`: `script#nxParloteoOn` + `style#nxParloteo` (desde el primer pintado; 3 ID para ganarle a las capas `parches-whatsapp-*`) y `APP_VERSION` 59.59.
- `parches-whatsapp-parloteo.js` (nuevo), cargado al final en `parches-seguros.js`.
- `parches-whatsapp-voz-mensajes.js`: `reaccionRapida(m)` en el menú y clic `data-qr` con `reactTo` (la misma Edge `whatsapp-inbox-reaccionar`). Con la capa apagada vuelve «Reaccionar».
- `scripts/qa-whatsapp-parloteo.mjs` (nuevo) y `scripts/qa-whatsapp-chat.mjs`: la prueba del menú salta la fila de reacciones.
- `docs/REFERENCIAS-DISENO.md`: fila nueva. También en bayolcell-taller y studio-rd, rama `claude/ref-parloteo`.

## Pruebas (simulador, Glass oscuro y claro, 390 y 1280)
- `qa-whatsapp-parloteo`: **32/32** (degradado y colita, Leído, placeholder, enviar/micrófono, escribiendo con cabecera y que se va solo, menú con 6 reacciones ≥44 px y borroso, 👍 llama a la Edge, tema claro, apagada).
- `qa-whatsapp-chat`: **97/97**. En una corrida intermedia falló una vez «menú del último mensaje» (el menú quedó en «Cargando…»); en la corrida siguiente pasó. Es de tiempos del simulador; vigilar.

## Riesgos
- El canal `nx-wa-escribiendo` es de difusión pública con la llave publicable: alguien con esa llave podría ver o mandar avisos de «escribiendo» (hilo + primer nombre). No da acceso a mensajes ni datos de clientes.
- Se crea un segundo cliente supabase-js en el navegador, solo para ese canal (aviso «Multiple GoTrueClient» en consola, no es error).
- El borroso usa `filter` en los elementos del chat mientras el menú está abierto. Si en un iPhone viejo se siente lento, se quita solo esa regla.

## Apagar
`NX_PARLOTEO=false` en `index.html` (todos) o `localStorage.nx_parloteo_off='1'` (un equipo).

## Siguiente paso
El dueño ve las capturas. Con «publícalo», unir a `main` y verificar en vivo con dos agentes en el mismo chat.
