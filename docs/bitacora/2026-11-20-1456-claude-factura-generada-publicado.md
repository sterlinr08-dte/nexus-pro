# 20-Nov-2026 14:56 (RD) — Claude — Publicado: «factura generada» no se avisa a quien pagó por adelantado

Sigue a la entrada anterior de hoy (diagnóstico y pruebas).

- El dueño respondió «Publícalo».
- Migración `whatsapp_factura_generada_omitir_adelantado` aplicada en producción (`tnwsgcxurfyuszxsewsn`) con el MCP de Supabase. Es el archivo `supabase/migrations/20261120120000_whatsapp_factura_generada_omitir_adelantado.sql`.
- Comprobado en vivo:
  - la restricción de `whatsapp_mensajes.estado` acepta `omitido`;
  - el disparador usa `whatsapp_factura_cubierta`;
  - `anon` y `authenticated` no pueden llamar esa función; `whatsapp_automatizaciones_estado` conserva su permiso;
  - José Natividad: diciembre sale cubierto; enero, no.
- Prueba de 3 facturas dentro de un bloque que se deshace solo, ya con la migración aplicada:
  - cubierta → 0 llamadas a WhatsApp y 1 fila «omitido»;
  - no cubierta → 1 llamada;
  - cliente con deuda → 1 llamada.
  - Después: 0 facturas de prueba, 0 omitidos, cola vacía. Ningún mensaje salió.
- No hay cambio de pantalla ni de versión del sistema.
- **No verificado:** una facturación real. La próxima automática es el 20-dic; ese día revisar las filas `estado='omitido'` de `whatsapp_mensajes`.
- **Pendiente con permiso del dueño (opción C):** las facturas 2026-10 y 2026-11 de José Natividad siguen «Pendiente» aunque su saldo las cubre.
