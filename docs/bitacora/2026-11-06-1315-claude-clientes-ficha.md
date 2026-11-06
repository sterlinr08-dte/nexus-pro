# 06-nov-2026 · Clientes y ficha del cliente: buscar, elegir y llenar con menos errores (sin publicar)

> Nombre con 1315 para que quede después de `2026-11-06-1300-claude-publicado-59-81.md` (el reloj del servidor marcaba 07:13 AST).

- **Pedido del dueño:** «Manda 5 agentes programadores y diseñadores para nexus pro a que hagan mejoras y ajustes». Esta parte: **Clientes** (lista, cuadrícula, búsqueda, selección) y la **ficha Nuevo/Editar cliente**.
- **Rama:** `claude/mejoras-clientes` (un commit, sin push, sin PR, sin publicar).
- **Regla respetada:** no se tocó Supabase, ni el dinero, ni WhatsApp. **No cambia cómo se guarda un cliente**: `guardarCli()` sigue igual con sus validaciones.

## Qué se encontró (auditoría en el simulador, 390 y 1280 px)
1. **La barra «N clientes seleccionados» no se leía en el tema oscuro**: fondo celeste claro (`#eff6ff`) con botones de texto blanco. «Quitar selección» y «WhatsApp masivo» casi invisibles. Botones de 34 px y letra de 12 px.
2. **Cuadrícula:** la casilla medía 22×22, la estrella 26 de ancho (se veía como una píldora alta) y el «⋮» 40×40. Las páginas (1 2 3) medían 32 px, con letra de 12 px, y **caían dentro de una celda de la cuadrícula** al lado de las tarjetas.
3. **Búsqueda:** no encontraba «martínez» si el nombre está sin tilde, ni «martinez ana» (otro orden), ni la cédula escrita sin guiones (`00100000201`), ni el teléfono con guiones (`809-555-0002`).
4. **Ficha:** el aviso de **cédula repetida** de `parches-seguros-base.js` **nunca salía**: busca en `window.ST`, pero `ST` es `let` en `index.html` y no cuelga de `window`. La cédula repetida solo se descubría al tocar Guardar. Además el aviso tenía letra de 10 px, gris oscuro sobre fondo oscuro, decía «9/11 dígitos» a un RNC válido de 9 y hablaba de tú («verifica»). El correo y el WhatsApp repetido solo se revisaban al Guardar.

## Qué se cambió (capa nueva `parches-clientes-ficha.js`, cargada al final de `parches-seguros.js`)
| # | Mejora | Detalle |
|---|---|---|
| 1 | Búsqueda que perdona | `window.nxCliCoincide(c,q)`: sin tildes, sin importar el orden de las palabras (nombre, apodo, póliza, correo), y por **solo dígitos** en cédula, teléfono, WhatsApp, WhatsApp de la referencia y póliza (si lo escrito es ≥4 dígitos). En `rCli()` se **suma** a la condición de siempre (una línea en `index.html`): nunca encuentra menos que antes. |
| 2 | Barra de selección | Oscuro: fondo azul translúcido, «Quitar selección» en vidrio y «WhatsApp masivo» azul lleno; botones de 44 px y letra de 13. En la cuadrícula la barra se ve siempre: sin marcar dice «Marque clientes para enviarles un WhatsApp» con **«Elegir los 10 de esta página»**; con todas marcadas ese botón se esconde (ya está «Quitar selección»). En Lista no cambia nada. |
| 3 | Toques de 44 en la cuadrícula | Casilla (24), estrella (32) y «⋮» (40) conservan su dibujo, pero un `::before` cuadrado de 44×44 recibe el dedo. Las páginas ocupan su propia fila (`grid-column:1/-1`) y miden 44×44 con letra de 14. Todo con alcance `#tbCli` (no toca las páginas de otros módulos). |
| 4 | Avisos al momento en la ficha | Cédula: si ya la tiene otro cliente sale en rojo «Esta cédula ya es de X (activo). No se puede repetir.»; dígito malo → «El último dígito no corresponde. Revise la cédula.»; 9 dígitos → «RNC de 9 dígitos (si es cédula, faltan 2).»; «N de 11 dígitos». Letra 13 px y colores legibles en oscuro y claro. Correo: «gmial.com», «hotmial.com», «gmail.con»… → «¿Quiso decir ana@gmail.com?» con botón **Usar** (44 px); un correo incompleto avisa al salir del campo. WhatsApp: si ya lo tiene otro cliente avisa con su nombre («Puede guardar igual si es correcto»; al editar, su propio número no avisa). Al abrir otra ficha no quedan avisos de la anterior. |

## Archivos
- `parches-clientes-ficha.js` (nuevo).
- `parches-seguros.js`: una línea al final de la lista de capas.
- `index.html`: una línea en el filtro de `rCli()` (llama a `nxCliCoincide` si existe).
- `scripts/qa-clientes-ficha.mjs` (nuevo).

## Pruebas
`QA_CLIENTES=30 PORT=8952 node scripts/qa-crm-mock-server.js &` y `QA_BASE=http://127.0.0.1:8952 node scripts/qa-clientes-ficha.mjs`:
**72 PASS · 0 FAIL** a 390×844 (táctil, iPhone) y 1280×800, más la capa apagada.
- Medidas: «Elegir…», «Quitar selección» y «WhatsApp masivo» ≥44 px y letra ≥13; casilla, estrella y «⋮» responden en las 4 esquinas de un cuadro de 44×44 (`elementFromPoint`) y un toque real en el borde marca al cliente sin abrir la ficha; páginas 44×44 en fila completa; «Usar …» ≥44; avisos de 13 px.
- Tema oscuro: barra oscura con textos claros. Tema claro revisado a mano: barra celeste con texto oscuro.
- Sin `pageerror`, sin scroll de lado, y ninguna escritura a `clientes` durante la prueba.
- Con `nx_clientes_ficha_off='1'`: la capa no se carga, la búsqueda de siempre funciona y la barra queda oculta sin marcar, como antes.
- No probado: iPhone real (Safari). En el simulador los íconos Tabler no cargan (se ven círculos vacíos), igual que en las demás pruebas.

## Cómo apagarlo
- En un equipo: `localStorage.nx_clientes_ficha_off='1'` y recargar.
- Para todos: borrar la línea `['js','parches-clientes-ficha.js']` de `parches-seguros.js` (la línea de `index.html` no hace nada sin la capa).

## Riesgos
- La búsqueda ahora encuentra **más** clientes (por ejemplo, «809» con 3 dígitos no busca por números; «8095» sí). No oculta ninguno que antes saliera.
- El aviso de cédula repetida ahora **sí sale** al escribir (antes no salía por el error de `window.ST`); el bloqueo al Guardar es el mismo de siempre.
- En la cuadrícula la barra ocupa una franja más (la guía «Marque clientes…») aunque no haya nada marcado.
- `docs/MEMORIA.md` no se tocó para no chocar con las otras 4 ramas de hoy; anotarla al publicar.

## Siguiente paso
Que el dueño lo vea en su iPhone (Clientes › Cuadrícula y Nuevo cliente) y, si le gusta, diga «publícalo».
