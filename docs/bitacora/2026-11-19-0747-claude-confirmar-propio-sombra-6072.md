# 19-Nov-2026 07:47 (RD) — Claude — Preguntas en la ventana de NEXUS PRO y sombra del cajón (6072)

## Pedido
- El dueño, ante la prueba de Muse de la 6071, eligió «Las 3». Esta es la primera entrega (puntos 1 y 2).
- Lo que reportó Muse:
  - «Anular venta» no hacía nada;
  - antes, «Cerrar sesión» no cerraba;
  - no veía Contabilidad en el cajón.

## Diagnóstico
- Las dos acciones preguntaban con `confirm()` del navegador.
  - En Chrome la pregunta sí sale (verificado en la demo).
  - La herramienta de Muse la cierra sola, sin mostrarla.
  - En Safari no se verificó.
- Contabilidad sí estaba, al final de la lista del cajón, debajo de Reportes; había que deslizar.

## Cambios
- `parches-pos.js`, `nxPosAnularVenta`:
  - pregunta en `nxConfirm`: «¿Anular la factura X?», con «Se devolverá el stock.» y el aviso de cuotas si aplica;
  - botones «No» / «Sí, anular» (rojo);
  - sin `nxConfirm`, vuelve al `confirm()` del navegador;
  - sigue con el candado de la 6071.
- `index.html`, `logout()`:
  - pregunta en `nxConfirm`: «¿Cerrar sesión?» con «Seguir aquí» / «Cerrar sesión»;
  - el cierre forzado por inactividad sigue sin preguntar;
  - sin `nxConfirm`, usa `confirm()`.
- `parches-seguros-base.js`, `nxConfirm`:
  - antes, los dos botones salían azules e iguales en la tienda y en modo claro (la regla del claro tiene 5 ids);
  - ahora «Cancelar» es blanco y «Confirmar» azul, o rojo en las preguntas de peligro;
  - texto centrado y 48 px de alto (`style#nxConfirmCSS`, prefijo de 7 ids).
  - Esto vale para todas las preguntas del sistema que usan `nxConfirm`.
- `parches-pos.js`, cajón del Punto de venta:
  - la lista `.nxTScroll` lleva una sombra al pie (`mask-image`) mientras quedan opciones abajo, y se quita al llegar al final (clase `nxMas`).
- `parches-seguros.js`: `b=6071` → `b=6072`.

## Pruebas (demo en vivo, iPhone 13 simulado, archivos nuevos inyectados, escrituras bloqueadas)
- Sombra: sale con la lista arriba y desaparece al final.
- «Cerrar sesión»:
  - abre la ventana de NEXUS PRO;
  - «Seguir aquí» mantiene la sesión;
  - «Cerrar sesión» lleva a la pantalla de entrada.
- «Anular»: abre la ventana de NEXUS PRO con «No» blanco y «Sí, anular» rojo; «No» no cambia nada.
- 0 preguntas del navegador; sin errores de consola.

## Estado
- Rama `claude/confirmar-propio-cajon`. Espera el «Publícalo».
- Siguiente entrega (6073): las pantallas que dicen «No hay…» o RD$ 0 cuando falla la carga.
