# 2026-11-06 14:30 — Claude — Inicio y menú: textos completos, toques de 44 px y buscador con «Ir a…»

## Solicitud del dueño
«Manda 5 agentes programadores y diseñadores para NEXUS PRO a que hagan mejoras y ajustes.» A este agente le tocó el
**Inicio** (pantalla de vidrio, «Lo próximo», buscador ⌘K) y el **menú lateral** en iPhone y PC.

## Qué se encontró (simulador, 390 y 1280 px)
- El menú y la barra decían **«Dashboard» / «DASHBOARD»** (inglés) en un sistema todo en español.
- En las tarjetas del Inicio las frases se **cortaban**: «76 % de efectividad de…», «facturas de meses…». Una regla
  vieja fijaba `height:16px` aunque otra ya permitía 2 líneas. En el iPhone la fecha se cortaba («…para el co…») y en
  el perfil «Vencen ≤30 d» se partía en dos renglones («d» solo abajo).
- En PC los botones redondos de la barra medían **42 px** y «Actualizar» **34 px** de ancho (regla: 44). El botón azul
  que abre el menú medía 34 px de alto (32 de ancho en el iPhone).
- Buscador ⌘K: la ayuda y el aviso salían en **MAYÚSCULAS** y la ayuda se cortaba en el iPhone; decía «Escribe…» (tuteo);
  el atajo **⌘K no funcionaba en Mac** (solo se escuchaba Ctrl+K) y en Windows la pista decía «⌘K».

## Qué se cambió
1. **«Inicio»** en el menú y en la barra (`TITLES.dashboard` y la etiqueta del menú). El `aria-label` se copia solo.
2. **Textos del Inicio completos**: «76 % de efectividad», «de meses anteriores» (el título ya dice «Atrasadas»), la línea
   puede usar 2 renglones si hiciera falta; en el celular la fecha usa el mes corto («Viernes 6 nov · faltan 14 días para
   el corte»); en el perfil «Por vencer» (con la explicación «Vencen en los próximos 30 días» al pasar el ratón).
3. **Toques de 44 px**: botones de la barra en PC 44×44 (incluido «Actualizar»), píldora de búsqueda 44 de alto (y un poco
   más ancha para que el texto no se corte), botón del menú con zona de toque de 44 px; **el círculo azul se ve en el mismo
   sitio** (medido: 71,33 en PC y 253,21 en el iPhone, igual que antes).
4. **Buscador más útil**: al abrirlo vacío muestra **«Ir a…»** con 8 secciones del menú que ese usuario ve (Clientes,
   Facturas, WhatsApp, Solicitudes, CRM, Pólizas, Custodia, Reporte agente; usa los mismos botones del menú, así que
   respeta los permisos). Al escribir «whats», «cobr», «metas»… la sección sale arriba como «Sección» y se abre con
   flecha + Enter. Clientes y facturas se buscan igual que antes. ⌘K funciona en Mac; la pista dice «Ctrl K» en Windows;
   en el celular no se muestra la pista de teclado. Textos de usted: «Escriba al menos 2 letras o números…».
   La píldora «Buscar…» del menú ya no sale en mayúsculas.

No se tocó Supabase, dinero, cobros ni WhatsApp. La búsqueda de clientes/facturas (`globalSearch`) sigue igual: la capa
solo añade filas de sección arriba.

## Archivos
- `index.html`: `script#nxInicioMenuOn` + `style#nxInicioMenu` (justo después de `#nxInicioPane`, primer pintado);
  textos «Inicio», «Por vencer», «de efectividad», «de meses anteriores», «Escriba…»; fecha corta en celular en
  `nxIGFechaTxt()` (solo con `html.nx-im`).
- `parches-inicio-menu.js` (nuevo, último de la lista de `parches-seguros.js`): «Ir a…», secciones al escribir, ⌘K en Mac,
  pista «Ctrl K».
- `parches-seguros.js`: carga la capa nueva (con `qv()` como las demás).
- `scripts/qa-inicio-menu.mjs` (nuevo).
- `scripts/qa-menu-cristal.mjs`: dos ajustes de la prueba por la geometría nueva (el punto «tocar fuera» de respaldo era
  600,30, que ahora cae dentro de la píldora de 44 px; y el borde izquierdo de la zona de toque del menú en el iPhone
  pasó de 253 a 247 px aunque el círculo sigue en 253).

## Cómo apagarlo
En un equipo: `localStorage.setItem('nx_inicio_menu_off','1')` y recargar (`removeItem` para volver). Quita el CSS
(`html.nx-im`), la fecha corta y toda la capa JS. Quedan solo los textos («Inicio», «Por vencer», «Escriba…»).

## Pruebas (simulador `PORT=8951 node scripts/qa-crm-mock-server.js`)
- `scripts/qa-inicio-menu.mjs`: **88 PASS · 0 FAIL** a 390 y 1280 px, tema oscuro y claro, y con el interruptor apagado.
  Mide: barra 3 botones (390) y 8 botones (1280) ≥ 44×44; botón del menú 44×44 (390) y 122×44 (1280); «Ir a…» botones
  ≥ 44 px de alto con letra 14 px; ayuda del buscador completa y sin mayúsculas; sin desborde horizontal; sin `pageerror`.
- Comparado contra la versión sin cambios (copia de `HEAD` servida en otro puerto):
  - `qa-menu-cristal.mjs`: 67/67 (base 67/67) después del ajuste de la prueba.
  - `qa-busqueda-premium.mjs`: 229 PASS · 6 FAIL, **los mismos 6 fallos en la base** (lupas de Pólizas…Prospectos a 1280
    después de Clientes; ya fallaban).
  - `qa-nav-botones.mjs`: 245/17, base 244/18 (los mismos fallos viejos: la prueba espera ✕ de 36 px).
  - `qa-inicio-glass.mjs` (copia con el puerto 8951): 125/4, base 126/3. Son los «saltos del esqueleto» que la base ya
    tenía (cambio de ancho 352→343 del arranque a los 6 s; al azar entre 390-admin y 390-agente). El salto de
    `.nxIG-stats` (66→74 px en PC por «Vencen ≤30 d» en dos renglones) **desaparece** con «Por vencer».
- Capturas: Inicio, menú y buscador a 390 y 1280, oscuro y claro (en la carpeta de pruebas de la sesión, no en el repo).

## Riesgos / pendientes
- No se probó en un iPhone real; el cambio es CSS de tamaños y textos, sin animaciones nuevas.
- Rol agente: «Ir a…» usa las secciones visibles del menú, así que debería esconder lo que el agente no ve; la prueba
  automática es solo con admin.
- El logo del menú (escudo, 40×40) sigue en 40 px; hace lo mismo que el botón azul de 44, así que no se tocó para no mover
  el riel.
- `docs/MEMORIA.md` no se tocó para no chocar con los otros 4 agentes de esta tanda; anotar al publicar.

## Rama y commit
Rama `claude/mejoras-inicio-menu` (sin push, sin publicar). Siguiente paso: que el dueño lo vea y, si le gusta, PR a `main`.
