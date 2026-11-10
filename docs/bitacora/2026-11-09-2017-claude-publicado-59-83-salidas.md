# Publicación · 59.83 Salidas de la custodia del administrador

- El dueño autorizó con «Publícalo».
- PR #455, unido a `main` como `5ac35a1`.
- Verificado en vivo: `https://nexusprord.com/parches-salidas-custodia.js` responde con la capa, y `parches-seguros.js` la carga.
- La base ya estaba aplicada (entrada «salidas-custodia-aplicada»).
- No probado todavía: registrar y anular una salida con el usuario real del administrador.
- Pendiente:
  - la cifra real del dueño (efectivo y banco) para la salida inicial de ajuste;
  - mostrar las salidas en el resumen de WhatsApp del ciclo;
  - decidir qué hacer con el cierre guardado de 2026-08 y si el consolidado va por mes calendario.
- Apagar la pantalla: `localStorage.nx_salidas_custodia_off='1'`.
