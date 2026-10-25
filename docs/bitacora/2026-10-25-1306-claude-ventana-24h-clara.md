# 59.60 — Chat con la ventana de 24 h cerrada: la caja lo dice y abre las plantillas (rama, sin publicar)

## Reporte del dueño
- «Hay un bug, no puede escribir desde el WhatsApp del NEXUS». A la pregunta de qué pasaba eligió «Escribo pero no envía».
- Mandó una captura de su propio chat (829-717-3291), que decía «solo plantilla».

## Diagnóstico (fuente de verdad: `whatsapp_hilos` y `whatsapp_hilo_mensajes`)
- Ese número no le escribe a la línea de NEXUS desde el **14-oct-2026**. Pasaron las 24 h, así que WhatsApp solo acepta plantillas aprobadas.
- `parches-whatsapp-inbox.js` ya cambia la caja de texto por `.nxWaCerrada` cuando la ventana está cerrada. `parches-whatsapp-replica-referencia.js` le ponía encima una **caja falsa**: decía «Escribe un mensaje…», tenía micrófono y estaba bloqueada con `pointer-events:none`. Parecía activa, pero no dejaba escribir. **Ese era el «bug».**
- Los mensajes de las 12:15, 12:17, 12:48 y 12:49 **no salieron desde NEXUS**: no tienen `enviado_por_agente_id`. Salieron desde la app de WhatsApp Business o desde otra herramienta conectada a la línea. El «Ok» se entregó; los demás siguen en «enviado». En el chat anterior le dije al dueño que el «Hola» había salido de NEXUS, y se le corrigió.
- No tiene relación con 59.59 «Parloteo»: en el simulador, escribir y enviar funciona con la capa encendida y apagada.

## Cambio
- `parches-whatsapp-replica-referencia.js`, `enhanceClosed()`: la caja falsa ahora es un **botón** con candado que dice «Ventana de 24 h cerrada · toque para usar una plantilla» (50 px de alto, texto de 14 px sin mayúsculas forzadas, borde punteado azul) y abre `nxWaAbrirPlantillas({estado:'APPROVED'})`. Se quitó el micrófono falso.
- `index.html`: `APP_VERSION` 59.60.

## Pruebas
- Simulador, chat sin ventana (Wilson): botón visible y tocable en Glass oscuro y claro a 390, y en 1280. Al tocarlo se abren las plantillas. Sin errores de consola.
- `qa-whatsapp-chat`: **97/97**. La primera corrida se cortó por tiempos del simulador (`scrollIntoView` de null); la repetición pasó completa.

## Siguiente paso
Con «publícalo», unir a `main`. Para escribir libre en ese chat, el dueño debe mandar antes un mensaje desde su WhatsApp personal a la línea 849-373-0829.
