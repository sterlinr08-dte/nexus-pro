## ChatGPT — 2026-09-10 19:01

# Bug: Inbox muestra 0 conversaciones aunque existen datos

El dueño reportó con captura que WhatsApp/Inbox muestra 0 Conversaciones y el texto “Todavía no han llegado mensajes”.

Verificación read-only en producción:
- `public.whatsapp_hilos`: 20 filas.
- `public.whatsapp_hilo_mensajes`: 106 filas.
- último mensaje: 2026-09-10 17:28:54 UTC.
- `authenticated` conserva SELECT sobre `whatsapp_hilos` y la policy `whatsapp_hilos_lectura` sigue presente.

Conclusión: no hay pérdida de datos; el estado 0 es falso y se origina en el frontend/carga inicial. `parches-whatsapp-inbox.js` pinta primero con `hilos=[]`, luego `cargar()` hace la consulta y, si falla, hace `catch (e) { return; }`. No existe en ese camino un reintento real inmediato, pese al comentario que dice “se reintenta solo”. Por eso un blip inicial puede dejar el Inbox en cero hasta otro evento/reapertura.

No publicar un arreglo improvisado dentro del PR visual #326. Mantener el bug funcional separado del trabajo de compactación y pedir revisión cruzada antes de producción.
