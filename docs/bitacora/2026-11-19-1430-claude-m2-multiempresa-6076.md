# 19-Nov-2026 14:30 (RD) — Claude — «Multiempresa» en la sección Inicio, solo para el dueño (6076)

## Pedido
- Captura del menú nuevo (6075) en la empresa de seguros: la sección Inicio solo tenía «Inicio».
- El dueño: «MULTI EMPRESA PONLO EN INICIO PERO SOLO YO PUEDO VERLO».

## Lo que había
- La pantalla Multiempresa (`nxAbrirMultiempresa`, `parches-financiamiento.js`) abre para cualquier `rol === 'admin'`.
- Su acceso era una tarjeta del tablero viejo (`#qaMultiempresa`), que no se ve en el Inicio nuevo.
- No estaba en el menú de dos niveles.

## Cambios (`parches-menu-dos-niveles.js`)
- `agregarMultiempresa()`:
  - al montar el menú pregunta al servidor `rpc/mi_es_superadmin` (la misma comprobación del «Panel del Dueño»);
  - solo si responde `true`, agrega en `#sbNav` un botón `#niMultiM2` «Multiempresa» (icono `ti-building-skyscraper`) justo después de «Inicio»;
  - para cualquier otro usuario, administradores incluidos, no se agrega nada.
- `seccionDe`: lo que llama `nxAbrirMultiempresa` va a la sección **Inicio**.
- Al abrirla, la página queda marcada en la columna.
- `parches-seguros.js`: `b=6075` → `b=6076`.

## No se cambió
- La pantalla Multiempresa sigue permitiendo la entrada a cualquier administrador si llega por otro camino. El pedido fue sobre lo que se ve en el menú.

## Pruebas (servidor de prueba local; respuesta de `mi_es_superadmin` simulada)
| Caso | Páginas de Inicio | Al tocar |
|---|---|---|
| Dueño, 1440 px | Inicio, Multiempresa | Abre Multiempresa y queda marcada |
| Otro administrador, 1440 px | Inicio | — |
| Dueño, 390 px (cajón ☰) | Inicio, Multiempresa | Abre Multiempresa |
- Sin errores de consola.
- `qa-menu-dos-niveles`: 62/62.

## Estado
- Rama `claude/m2-multiempresa`. Espera el «Publícalo».
