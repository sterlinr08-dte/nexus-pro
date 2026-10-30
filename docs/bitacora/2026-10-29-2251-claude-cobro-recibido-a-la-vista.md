# 2026-10-29 22:51 (RD) · Claude · Registrar pago: «Recibido por» a la vista al abrir (59.72, SIN publicar)

Sigue a `2026-10-29-2245-claude-espaciado-todos.md`, que no se edita.

## Pedido
El dueño escribió «corrige lo de recibido por». El encargo es que al **abrir** Registrar pago se vean los botones de «Recibido por» sin tener que bajar, en celular (390) y en PC (1280).

## Qué cambió
Es solo CSS, en `style#nxFormEspaciado`, bloque `⟦59.72⟧`, apartado 13. No se tocaron JS ni ids.
- El pie `#mAbono .fe` pasa a `display:contents`. Sus hijos quedan en la ventana sin mover el HTML.
- El **resumen** («Indique el monto… · Bajo custodia de…») ahora se desplaza con el contenido, a 24 px justo después de «Recibido por».
- Queda fijo abajo **solo el botón principal** (`#btnAbo`, y `#btnAboListo` cuando ya se cobró):
  - mide 54 px y es `position:sticky`;
  - queda a 24 px del borde en celular y a 48 en PC, más la zona segura del iPhone.
- `.modal::after` es una franja fija del color de la hoja: hace de fondo del botón y de margen inferior. Es de 90 px en celular y 114 en PC, con un degradado de 12 px arriba.
- `scroll-padding` abajo se ajusta a 116 px (celular) y 140 px (PC), para que un campo con foco quede sobre el botón.

## Medidas (Playwright, ventana recién abierta, sin desplazar)
La «cubierta» es la parte de abajo que tapa el contenido: en `main` es el pie fijo entero y en 59.72 es el botón más los 12 px de la franja de encima.

| | 390 `main` | 390 59.72 | 1280 `main` | 1280 59.72 |
|---|---|---|---|---|
| Inicio de la cubierta (y) | 663 (pie con resumen) | 754 | 703 | 765 |
| Rótulo «Recibido por» (y) | 652–667 | 640–655 | 612–627 | 646–661 |
| Primera fila de botones de «Recibido por», borde inferior | 727, **tapada** | 707, **visible** (sobran 47 px) | 687, visible (sobran 16 px) | 713, **visible** (sobran 52 px) |
| Botón principal: alto · distancia al borde inferior · visible | 54 · 16 · sí | 54 · **24** · sí | 54 · 17 · sí | 54 · **49** · sí |
| Al bajar hasta el final, controles tapados | ninguno | ninguno | ninguno | ninguno |
| Foco en Referencia («Transferencia»), visible sobre el botón | no | **sí** | no | **sí** |

Otras comprobaciones:
- Con `nx_fesp_off='1'` las medidas son **idénticas a `main`**.
- La regla del formulario sigue en «cumple» a 390 y a 1280, sin scroll horizontal.

Capturas lado a lado en `docs/bitacora/img/2026-10-29-espaciado-todos/registrar-pago-abrir-{390,1280}.jpg`.

## Riesgos
- El resumen ya no está siempre a la vista: se ve al bajar, justo antes del botón. El botón sigue cambiando su texto («Indique el monto», «Registrar…»), así que el aviso principal sigue visible.
- El estado «pago hecho» (con el botón Listo) usa la misma regla, pero no se midió con un cobro real.

## Estado
Rama `claude/espaciado-piloto`, sin PR y sin publicar. Siguiente paso: que el dueño lo vea y diga «publícalo».
