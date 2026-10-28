# 2026-10-27 21:30 — Claude — Premium Blue «como la imagen» (59.70, sin publicar)

## Solicitud del dueño
Después de publicar la 59.69: «Pero no son las paletas de colores que quería para esa apariencia». Se le ofrecieron tres opciones y eligió **«Como la imagen»**: el fondo va de azul claro arriba a azul rey y marino abajo, igual que la imagen de @uiuxaadi, y los azules claros se ven más.

## Diagnóstico
La 59.69 usaba los 5 colores, pero el fondo quedó casi negro (#021024 → #052659), así que solo se veían los dos más oscuros. Tres capas tapaban el fondo:
- `#nxBgPhoto` (la capa fija del fondo) estaba en #021024;
- `#nxIG` (Inicio) tenía su propio fondo oscuro, más `box-shadow:0 0 0 48px` oscuro, que pinta un marco alrededor del Inicio.

## Cambio (solo en `style#nxPremiumBlue` de `index.html`)
- Fondo degradado como la imagen: `#7DA0CA → #4F86D6 → #2D63BE → #123F8F → #052659 → #021024`. Va en `#nxBgPhoto` y en `<html>`; el `body` queda transparente.
- `#nxIG` sin fondo ni sombra de marco en Premium Blue, para que se vea el degradado.
- Las tarjetas siguen en azul marino (#052659) con letras blancas, así que se leen igual.
- Versión 59.70.

## Pruebas
- Playwright a 390 y 1280 px: Inicio, Clientes, Facturas y Ajustes, sin errores de JavaScript. Capturas en `docs/bitacora/img/2026-10-27-premium-blue/` (`v2-*`).
- Solo cambian colores: las medidas de los botones no cambian.

## Rama / PR
Rama `claude/nexus-premium-blue-2` desde `origin/main` (59.69). PR sin publicar; espera «publícalo».

## Pendiente
- La fecha pequeña de arriba del Inicio queda en azul claro sobre el cielo claro: se lee, pero con poco contraste. Si el dueño lo nota, se pone en blanco.
