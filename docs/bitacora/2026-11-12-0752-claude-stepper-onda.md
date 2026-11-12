# Stepper: cambia a la variante 3 «Onda»

Sigue a la entrada `…-claude-stepper-toque.md` del 12-nov (no se edita). Misma rama `claude/stepper-toque`, sin publicar.

## Decisión del dueño
Vio el video de las variantes 1 y 2 y dijo: «En video me gusta stepper número 3 del video» (la 3 del reel `Dfor45ND65b`: «Ripple Reveal»).

## Qué cambió (`parches-stepper.js`, versión `20261112b`)
- Por defecto ahora es la **variante 3**: una onda del color del botón tocado sale de él, cruza el control (420 ms) y el número nuevo se destapa desde ese lado (340 ms).
- La onda es un elemento temporal dentro del control; al terminar se quita y se restauran los estilos del control.
- Las variantes 1 y 2 siguen disponibles en un equipo con `localStorage.nx_stepper_modo='lado'`.
- Sigue siendo solo aspecto: no toca cantidades; si la cantidad no cambia, no se anima; respeta «reducir movimiento»; se apaga con `nx_stepper_off`.

## Pruebas
`scripts/qa-stepper.mjs`: 19 PASS · 0 FAIL (390 y 1280 px, «reducir movimiento», capa apagada y modo «lado»). Mismo límite: banco de prueba con el marcado del POS, no la pantalla real.
