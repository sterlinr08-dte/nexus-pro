# 2026-11-27 22:54 RD · Claude — Velocidad de los temas de paleta (sin publicar)

Sigue a `2026-11-27-2142-claude-temas-arreglos-revision.md`. Es el punto 3 de la revisión. El dueño: «Haz el arreglo de velocidad de los temas».

## Medición (Chromium a 390 px, CPU 4× más lenta, prueba `rv/t6` del revisor, medianas)
| Tema | Primer pintado | 8 cambios de pantalla |
|---|---|---|
| Claro / Glass oscuro | ~360 ms | ~6.7 s / ~6.0 s |
| Stripe / Linear **antes** | ~560 / ~600 ms | ~8.9 s / ~7.9 s (+25 a 40 %) |
| Stripe / Linear **ahora** | ~545 ms | ~7.3 s / ~6.3 s (igual que su tema base, dentro del ruido) |

## Causa
- **Uso diario:** la culpa era de las copias, que llevaban la condición `:where(html.tema-x)` delante. Al dibujar cada pantalla, el navegador tenía que subir hasta `<html>` por cada elemento. El vigilante (MutationObserver) no costaba nada: medido con y sin él.
- **Arranque:** el recorrido inicial lee las ~102,000 propiedades de las ~11,300 reglas. Tarda ~165 ms con la CPU 4× más lenta, unos 40 ms en un iPhone real.

## Cambios (`script#nxTemasPaletaOn`, `aplicarTema`)
- **Las copias van sin condición:** el mismo selector que su original, justo después de ella. Misma prioridad; gana por el orden.
  - En una página hay un solo tema de paleta a la vez: al cambiar de tema sin recargar, `quitar()` borra las copias del anterior.
  - `aplicarTema` llama a `nxTemaPaletaProcesar` siempre, también al pasar a un tema sin paleta, para borrarlas.
- **Filtro rápido:** cada regla se prueba una vez contra «¿tiene algún color de la paleta?» (`T.tiene`, sobre `style.cssText`). Solo las que sí lo tienen se revisan propiedad por propiedad.
- **De paso:** ahora sí cambian las reglas del propio `<html>` escritas sin «html» (por ejemplo `.tema-claro{}`). Era un límite anotado.
- Se volvió a poner el comentario `/* Reglas de OTROS`, que usa `qa-tema-revision.mjs`.
- Nuevo `window.__nxTemaMs0`: lo que tarda el recorrido del arranque.

## Decisión del dueño
- Para el arranque (+~40 ms en iPhone) se le ofreció guardar los colores en el celular.
- Eligió **«Dejarlo así»**: no se nota y no agrega riesgo.

## Pruebas (servidor simulado, puerto 8951)
- `qa-tema-stripe.mjs`: **106/106**.
- `qa-tema-revision.mjs`: **46/46**.
  - Su oráculo de colores no da diferencias en Stripe, Apple ni Linear.
  - Al volver al tema base todo queda igual que en una carga limpia.
  - `reglaHtmlSinHtml` ahora da `#533afd`.
- `qa-tema-stripe-contraste.mjs`: Stripe, Apple y Linear, ningún texto empeora.
- **No verificado:** iPhone real (Safari).

## Rama
`claude/temas-velocidad`, sin publicar. Archivo: `index.html`.
