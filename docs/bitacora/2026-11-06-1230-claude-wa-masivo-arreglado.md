# 06-nov-2026 · 59.81 · WhatsApp masivo arreglado en Clientes y Facturas (RAMA, sin publicar)

## Pedido del dueño
- La auditoría de agentes (selección en lote en NEXUS, ver chat 06-nov) encontró de paso que «WhatsApp masivo» no funciona. El dueño: «mejor vamos a arreglar el problema de WhatsApp masivo». Eligió la opción **A**.
- Aclarado al dueño: esto es solo para los botones manuales. Los envíos automáticos (auto-facturación, recordatorios por cron) no se tocan.

## Diagnóstico (fuente de verdad)
- `index.html:15359` `cliBulkWA()` (Clientes, vista cuadrícula con casillas) y `index.html:8418` «WA masivo» (Facturas › Más filtros) llamaban a `abrirWAMasivo()`.
- **Esa función no existe** en ningún archivo. Se borró cuando el envío viejo por pestañas wa.me se cambió por el envío automático del Buzón. Resultado: error y nada se enviaba.
- El envío bueno ya existía en WhatsApp › Contactos, en `parches-whatsapp-inbox.js`:
  - ventana de confirmación;
  - `nxWaIniciarEnvioMasivo` → RPC `whatsapp_crear_lote_envio_masivo` → Edge `whatsapp-envio-masivo`;
  - usa plantillas aprobadas, respeta las bajas (`whatsapp_optout_en`) y, en el tipo «pago», la cadencia.
- La auditoría decía que Contactos «muestra 14 y envía a todos». **Corrección:** eso pasa solo en el panel oculto. La ventana real de Contactos (`parches-whatsapp-contactos-fix.js`) ya lista a todos; la QA lo comprueba (30/30). No se cambió.

## Qué se hizo
- **Nuevo** `parches-whatsapp-masivo-elegidos.js` (cargado después de `parches-whatsapp-inbox.js` en `parches-seguros.js`). Define `abrirWAMasivo`:
  - `abrirWAMasivo(ids)` (Clientes) → los clientes marcados.
  - `abrirWAMasivo()` (Facturas) → los clientes de las facturas que se ven con el filtro, sin repetir y sin las anuladas. Si el filtro es «Atrasadas», viene marcado «Recordatorio de pago».
- La ventana tiene 3 pasos:
  1. Qué mensaje: factura / recordatorio de pago / póliza por vencer.
  2. A quiénes: lista completa; los que no tienen WhatsApp aparecen aparte.
  3. «Confirmar y enviar a N».
- Sin elegir el mensaje no se puede enviar. Cancelar no crea nada.
- Al confirmar se llama al **mismo** `nxWaIniciarEnvioMasivo` del Buzón. No hay envío nuevo ni contabilidad paralela.
- `parches-whatsapp-inbox.js`: las ventanas de envío y progreso se ponen sobre la página cuando el Buzón no está a la vista (`_waHostOverlay`). Antes quedaban dentro del Buzón oculto. Los estilos para ese caso están en la capa nueva.
- `index.html` (`rFact`): guarda `window._nxFactListaVisible` con la lista filtrada que se ve.
- Tamaños: tipos de mensaje ≥54 px, «Confirmar y enviar» 54 px, Cancelar ≥44 px, letra ≥13 px. Funciona en el tema oscuro y en el claro.
- Apagar en un equipo: `localStorage.nx_wa_masivo_elegidos_off='1'`.

## Pruebas
- `scripts/qa-wa-masivo.mjs` (app real contra `qa-crm-mock-server.js` con `QA_CLIENTES=30`; la RPC y la Edge se interceptan, **no sale ningún mensaje real**): **34/34** a 390 px y a 1280 px.

## Pendiente
- Que el dueño lo vea y diga «publícalo».
- Primera prueba real: solo al número del dueño (marcar solo su cliente de prueba).
