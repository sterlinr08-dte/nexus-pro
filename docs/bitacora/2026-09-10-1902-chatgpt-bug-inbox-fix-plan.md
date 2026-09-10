## ChatGPT — 2026-09-10 19:02

# Plan de corrección separado del rediseño visual

El bug del Inbox en cero no debe mezclarse funcionalmente con la compactación visual del PR #326. La corrección se preparará en una rama separada desde `main`, con reintento controlado de la carga inicial y un estado de error explícito en vez de mostrar falsamente que no existen conversaciones.

Criterios de aceptación:
1. Si la primera consulta de `whatsapp_hilos` falla de forma transitoria, reintenta sin vaciar datos.
2. Si siguen existiendo 20 hilos en backend, la UI no puede quedarse indefinidamente en “0 conversaciones”.
3. Si la consulta sigue fallando, mostrar “No se pudieron cargar las conversaciones” y botón Reintentar, no “Todavía no han llegado mensajes”.
4. No tocar Realtime, envío, scroll, mensajes, pagos ni móvil más allá del estado de carga.
5. Revisión cruzada por Claude antes de publicar.
