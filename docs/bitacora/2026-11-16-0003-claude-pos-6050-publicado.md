# POS 6050 publicado (16-nov-2026)

- Dueño: «Publícalo». PR #491 (squash `875468e`). Verificado en vivo `b=6050`.
- Contenido: tallas y colores (un artículo por combinación) y botones de la ficha («Guardar y nuevo» con texto, sin flechita).
  Detalle en `…-claude-pos-tallas-colores.md` y `…-claude-pos-botones-ficha-articulo.md`.
- Demo real a 390 px: con «S, M» y «Negro» salen 2 filas de existencia; botones «Guardar artículo» 54 px, «Cancelar» y
  «Guardar y nuevo» **44 px** (se pidieron 48; otra capa de estilos los deja en 44, que cumple el mínimo de 44); 0 errores de JS.
  No se creó ningún artículo en la demo (la creación se probó en `qa-pos-variantes`, 18/18).
- Pendiente: vista agrupada por modelo y selector de talla al vender; subir esos dos botones a 48 px; actualizar `qa-pos-margen`
  (4 fallos del tema oscuro); botón «Borrar» del panel y demo con proveedores/ventas (esperan la ventana de confirmación de la base);
  5 reportes de inventario de Infoplus; e-CF allowlist; demo.nexusprord.com; contabilidad Bayol.
