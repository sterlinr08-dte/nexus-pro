# 2026-10-15 07:00 — Claude — Ventana «Registrar pago»: cabe en la pantalla y se ven las 5 formas de pago (sin publicar)

## Solicitud del dueño
Mandó una captura de la computadora (1920×1080) y pidió «Vamos a arreglar la ventana de pago». Eligió dos puntos:
- «No cabe en la pantalla»;
- «Formas de pago cortadas».

## Diagnóstico (medido con Playwright, 1920×920 y 1366×640)
- La ventana medía 944 px de alto, más que la pantalla. El pie (Cancelar / Registrar) quedaba fuera, porque en computadora `.modal` no tenía alto máximo y el `position:sticky` del pie no tenía contenedor que se deslizara. En el iPhone ya funcionaba.
- `#aMetChips` era una tira de una sola fila que se deslizaba de lado: medía 654 px dentro de 386, así que Tarjeta y Depósito quedaban fuera.

## Cambios (solo `index.html`, capa 59.01 de `#mAbono .nxPago`; nada de lógica)
- Computadora (`min-width:769px`): `max-height: calc(100dvh - 40px)` y `overflow-y: auto` en la ventana. Se desliza por dentro y el pie queda siempre visible.
- Formas de pago en 2 filas que se reparten el ancho (`flex-wrap: wrap`, `flex: 1 1 auto`), con chips de 40 px e ícono de 28 px.
- Para no alargar el teléfono: espacio entre secciones de 12 a 10 px y campo de monto de 56 a 52 px.

## Pruebas
- Medición: el pie queda visible a 1920×920, 1366×640 y 390 px; las 5 formas de pago entran en el ancho, sin desplazamiento.
- qa-registrar-pago: 54/0. La altura en 390 px con Efectivo es 997, el límite es 1,000.
- qa-cobros: 174/0.
- qa-iphone: 563/6. Los 6 fallos (`.nxft-add` con degradado en Clientes) **ya estaban en main sin este cambio**; no están relacionados.

## Estado
- Rama `claude/ventana-pago`, desde main. **No publicado.**
