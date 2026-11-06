# 06-nov-2026 · Pulido global de interfaz (rama `claude/mejoras-pulido-global`, SIN publicar)

## Pedido
Dueño: «Manda 5 agentes programadores y diseñadores para nexus pro a que hagan mejoras y ajustes».
Esta parte: pulido general y errores de interfaz **fuera** de Inicio, Clientes, Facturas/Cobros y WhatsApp
(otros agentes trabajan ahí).

## Cómo se buscó
Recorrido con Playwright contra el simulador (`scripts/qa-crm-mock-server.js`, puerto 8955), sesión admin,
a 390 y 1280 px, por Pólizas, Empresas, Agentes, Comisiones, Mayor, Asientos, Balance, PyG, Reporte de agentes,
Custodia, Reportes por plan/empresa/antigüedad, DGII, Configuración, CRM y Solicitudes. Se midieron:
errores de página (ninguno), controles de menos de 44 px, campos de menos de 48 px / 16 px, cosas que se salen
de la pantalla y textos cortados. Se corrigieron los 4 peores.

## Qué cambió (capa nueva `parches-pulido-global.js`, solo CSS + 1 detalle de desplazamiento)
| # | Pantalla | Antes | Ahora |
|---|---|---|---|
| 1 | Reporte de agentes › Ciclo 20→20 (celular) | El elegidor del ciclo medía 91 px y se leía «20 oct» | Renglón propio (≈306 px, 48 px de alto, letra 16): «20 oct 2026 → 20 nov 2026». Ciclo/Consolidado y Excel debajo |
| 2 | Comisiones (celular) | La fila Mes · Año · Calcular · Excel medía 424 px en una tarjeta de 332: «Excel» quedaba fuera de la pantalla | La fila baja de renglón; Calcular y Excel quedan anchos y dentro de la tarjeta |
| 3 | Campos | Ciclo de Custodia con letra 14 (el iPhone hace zoom al tocarlo); filtro de Pólizas con letra 11,5 en PC; buscadores de Empresas y Agentes de 44 px | 48 px de alto; letra 16 en el celular (sin zoom) y 13 como mínimo en PC; buscadores 48 px y 16 |
| 4 | Configuración (pestañas) | 14 pestañas en una barra que se cortaba en seco («Aparienci…») sin aviso; en PC la rueda del ratón no la movía | El borde se desvanece del lado donde hay más pestañas (derecho, izquierdo o ambos) y en PC la rueda la desplaza de lado (en los extremos la página sigue bajando) |

Detalles técnicos:
- Las capas existentes usan `#v-x` repetido 4 veces con `!important` (`nx-p7`, `nx-cusp`); esta usa 5 para ganar
  sin tocar las anteriores. Todo va bajo `html.nx-pulido` (clase que pone la capa).
- El aviso de Configuración es `mask-image` con clases `nxPgIzq` / `nxPgDer` en `.cfg-tabs-bar`, que se recalculan
  con `scroll`, `resize`, `ResizeObserver` y al abrir Configuración. No se envolvió `switchCfgTab`.
- Se carga en `parches-seguros.js` después de `parches-transferir-arrastrar.js`. No afecta el primer pintado
  de Inicio (solo pantallas que se abren después).

## Archivos
- `parches-pulido-global.js` (nuevo)
- `parches-seguros.js` (una línea en la lista de capas)
- `scripts/qa-pulido-global.mjs` (nuevo)
- Esta bitácora

No se tocó Supabase, RPC, Edge Functions, dinero (cobros, facturas, NCF, custodia, transferencias, cierres) ni WhatsApp.

## Pruebas
`PORT=8955 node scripts/qa-crm-mock-server.js &` y `QA_BASE=http://127.0.0.1:8955 node scripts/qa-pulido-global.mjs`
→ **68 PASS · 0 FAIL** (390 y 1280 px, tema oscuro y claro, y con la capa apagada).
- Ciclo 20→20: 390 px → 306×48, letra 16; 1280 px → ≥260 px.
- Comisiones: Calcular y Excel dentro de la tarjeta, ≥44 px, sin scroll de lado.
- Custodia, Pólizas, Empresas y Agentes: campos 48 px; letra ≥16 en celular, ≥13 en PC.
- Configuración: aviso derecho al empezar; en PC la rueda la mueve y aparece el aviso izquierdo; al ir a la
  pestaña 13 (al final) aparece el aviso izquierdo; pestañas ≥44 px; sin scroll de lado.
- Sin errores de página en ninguna pasada.

## Lo que se vio y NO se tocó
- Custodia en el simulador dice «No se pudieron cargar las cifras. Invalid time value»: es el simulador, que no
  devuelve las fechas del ciclo en la RPC. Es zona de dinero; no se tocó.
- Las tablas anchas de Reportes (Ciclo 20→20, plan, empresa) se desplazan de lado dentro de su caja, a propósito.
- Comisiones sigue en el menú aunque los agentes no tienen comisión (regla del dueño). Decidir aparte si se oculta.

## Cómo apagarlo
- En un equipo: `localStorage.nx_pulido_global_off='1'` y recargar.
- Para todos: borrar la línea `['js','parches-pulido-global.js']` en `parches-seguros.js`.

## Riesgos
- Bajos: solo CSS con alcance por pantalla y una escucha de rueda en la barra de pestañas de Configuración.
- Si otra capa cambia el marcado de `#nxCiclo20 .nxC20Top` o el `.ch` de Comisiones, la regla deja de aplicar
  (no rompe nada; vuelve a verse como antes).
- No se probó en un iPhone real (solo emulación de Safari a 390 px).
- Al terminar se cerró el simulador con `pkill -f qa-crm-mock-server.js`, que también cierra los simuladores de
  otras sesiones que estuvieran corriendo en ese momento en esta máquina.
- `docs/MEMORIA.md` no se actualizó en esta rama para no chocar con las otras 4 ramas del mismo pedido; anotarlo al unirlas.

## Siguiente paso
El dueño lo ve (capturas a 390 y 1280) y, si le gusta, dice «publícalo». Rama `claude/mejoras-pulido-global`, sin push.
