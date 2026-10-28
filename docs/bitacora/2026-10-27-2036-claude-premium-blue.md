# 2026-10-27 20:36 — Claude — Tema «Premium Blue» (59.69, sin publicar)

## Solicitud del dueño
Imagen de la paleta de @uiuxaadi y el mensaje: «En nexus pro vamos a usar esos colores en premium dark y cambiarle el nombre de premium blue».
Paleta: `#021024` (azul noche) · `#052659` (marino) · `#5483B3` (acero) · `#7DA0CA` (cielo) · `#C1E8FF` (hielo).

## Qué se hizo
- El tema `premium` (antes «Premium Dark») ahora se llama **PREMIUM BLUE** en Apariencia, con su muestra en azul. El id interno sigue siendo `premium`, así que quien ya lo tenía elegido lo ve azul sin hacer nada.
- Una sola capa nueva, `style#nxPremiumBlue`, al final del `<head>` de `index.html`. Todas sus reglas empiezan por `html:not(.nx-pb-off) body.tema-premium`, así que no toca los otros temas (Grafito, Clásico, Liquid Glass, Auto).
- Qué cambia de color (solo color; no cambian medidas, espacios ni lógica):
  - fondos, tarjetas, KPI, ventanas, menú y campos → azul noche y marino;
  - textos → blanco hielo y cielo;
  - acentos, botón principal, pestañas activas, chips y barras → acero y cielo;
  - pantallas en vidrio (Inicio, cobro, ficha, chat…) → sus variables `--pn-*`, `--pf-*`, `--cv-*`, `--cb-*`, `--ig-*` y `--pl-grad` en azul;
  - orbes 3D del menú (todos los grupos que eran morado, índigo o rosa), ícono del elemento activo, avatares, ⓘ, «Lo próximo», leyenda del calendario, botones y bordes del CRM, tablas y paneles de Ajustes.
- Versión **59.69**.

## Apagar (reversible)
- En un equipo: `localStorage.nx_premium_blue_off='1'` y recargar → vuelve el Premium morado de antes.
- Para todos: borrar el bloque `style#nxPremiumBlue` (y su script) de `index.html`.
- No hay parpadeo al cargar: la clase `tema-premium` ya se pone desde el `<head>` (arreglo de 59.22) y la capa es CSS puro.

## Pruebas
- Banco local (`scripts/qa-crm-mock-server.js`, puerto 8942) con Playwright a **1280 px** y **390 px** (iPhone): Inicio, Clientes, Facturas y Ajustes. Sin errores de JavaScript.
- Barrido automático de colores en 10 pantallas (Inicio, Clientes, Facturas, Pólizas, Cobros, Agentes, Reporte por agente, Ajustes, CRM, WhatsApp): busca cualquier color de tono morado en fondo, borde, texto, sombra o trazo.
  - Queda: los íconos de colores por categoría (personas, reloj) que un script pinta directo en el ícono con `style` en línea, y un brillo pequeño de un indicador. No se pueden cambiar desde el tema sin tocar ese script; se dejan así.
- Medidas de botones: no cambian (la capa solo cambia colores).
- Capturas antes/después: `docs/bitacora/img/2026-10-27-premium-blue/`.

## Rama / PR
- Rama `claude/nexus-premium-blue` desde `origin/main` (59.68). PR sin publicar; espera «publícalo».

## Riesgos / pendientes
- Pantallas poco usadas (Préstamos, POS, Contabilidad) pueden tener algún morado suelto del kit viejo; se corrige si el dueño lo ve.
- Siguiente: vidrio sobre foto (Inicio, CRM 3 columnas, Prefacturas en tarjetas, menú en píldora) cuando el dueño lo pida.
