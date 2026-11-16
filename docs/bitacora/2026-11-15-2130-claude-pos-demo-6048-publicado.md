# POS demo 6048 publicado (16-nov-2026)

- Dueño: «Publicar». PR #487 (squash `f7d95ac`). Verificado en vivo `b=6048`.
- Detalle de los cambios: entrada `2026-11-15-1818-claude-pos-demo-mejoras-muse.md`.
- Prueba en la demo real (390 px): Inicio con 4 tarjetas (Ventas, Caja, Utilidad, Inventario crítico 1), secciones Vender/Documentos;
  CO00000007 «DEV. PARCIAL» RD$75 → RD$50, CO00000006 «DEVUELTA» RD$725 → RD$0; NC-00001/00002 con fecha 15/11/2026 sin «20:00»; 0 errores de JS.
- Pendiente: borrar la tienda de prueba del registro (org `3efbf123-…`), punto 10 (resumen contable) y 12 (proveedores en la demo); las tres esperan la tarjeta de permiso.
