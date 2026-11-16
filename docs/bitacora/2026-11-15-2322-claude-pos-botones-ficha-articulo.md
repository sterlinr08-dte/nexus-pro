# POS — botones de la ficha del artículo (16-nov-2026)

- Dueño al ver la captura de tallas y colores: «¿por qué el botón verde tiene un vacío?». Era la flechita «Más opciones de guardado»
  (en vivo sí se dibuja; en la captura local no carga la fuente de iconos). Pidió arreglarlo.
- Cambio (misma rama `claude/pos-variantes`, build 6050, sin publicar): se quitó la flechita y su menú; ahora hay un botón con texto
  «Guardar y nuevo» (48 px) junto a «Guardar artículo» (54 px). En móvil: «Guardar artículo» a todo el ancho y debajo «Cancelar» y
  «Guardar y nuevo» a la mitad cada uno; nada pegado al borde.
- Complementa `2026-11-15-2303-claude-pos-tallas-colores.md`.
- Pruebas: `qa-pos-variantes` 18/18; negocio 26, fase1 36, volumen 51, aura-contable 14. `margen` sigue 84/4 igual que en main (tema oscuro).
