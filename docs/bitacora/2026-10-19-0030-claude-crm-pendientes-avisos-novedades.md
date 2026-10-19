# 19-oct-2026 — CRM, Solicitudes, Pendientes, Avisos y Novedades (59.53, sin publicar)

## Pedido
El dueño respondió «Si» a la pregunta: «Solo faltan los módulos que se arman aparte: CRM, Solicitudes, Avisos y Novedades. ¿Sigo con esos?».

## Capa `style#nxP6Pane` (solo CSS)
- **Cómo se apaga:** `NX_P6_PANE=false` para todos, o `localStorage.nx_p6_pane_off='1'` en un equipo.
- **Va después de** `nxP5PaneJs` en `index.html`. `APP_VERSION` sube a `59.53`.
- **Alcance:**
  - `#v-crm`: panel CRM y tareas;
  - `#v-solicitudes`;
  - `#panelPend`: Facturas → Pendientes;
  - `#panelAvisos`: Facturas → Avisos;
  - `#v-clientes .nxnov-shell`: Novedades.
- **Solo diseño.** No se tocan los parches (`parches-crm*.js`, `parches-seguros-base.js`, `parches-clientes-novedades.js`), ni Supabase, ni los cobros, ni WhatsApp.

### Qué cambia (celular y PC)
- **Letra normal en vez de TODO EN MAYÚSCULAS** en estos 5 módulos. La regla base «MAYÚSCULAS GLOBALES» (`index.html`, ~línea 2420) se deja tal cual. Los campos de escribir siguen como estaban.
- **Todo lo que se toca mide 44 × 44 px o más.** Los campos de escribir miden 48 px con letra de 16, y tienen el anillo azul de foco igual que en las otras capas.
- **CRM:** «Ver las N tareas» pasa de 40 a 44 px.
- **Pendientes:**
  - **Arreglo:** Cobrar y Recordar se veían **blancos sobre blanco**, casi invisibles. Una regla de vidrio de los temas les pisaba el degradado. Ahora tienen color sólido: Cobrar `#047857` y Recordar `#15803D`, con letra blanca legible.
  - Esos dos botones bajan a una fila propia de 44 px. Antes medían 103 × 32 y apretaban el nombre.
  - El nombre del cliente ya no se corta. «Toca para ver resumen» sube de 9 px a 13 px.
- **Avisos:** «Mandarle su lista» y «Enviar recordatorio» suben de 34 a 44 px. El verde pasa a `#15803D`, porque el verde claro anterior no daba contraste con la letra blanca. Es el mismo arreglo que en el Inicio.
- **Novedades:** «Nueva novedad» sube a 44 × 44 (en el celular medía 22 × 36). Los filtros Todas, Entrada, Salida, Pendientes, Resueltos, Por activar, En gestión, En riesgo y Por retirar suben de 34 a 44 px.
- **Solicitudes:** recibe las mismas reglas generales: 44 px, 48/16 y letra normal. En el simulador no hay solicitudes, así que solo se vio la pantalla vacía.

## Medido con Playwright (390 y 1280 px, tema clásico y oscuro)
| Pantalla | Antes (390 / 1280) | Ahora |
|---|---|---|
| CRM | 1 / 1 menores de 44 px | 0 / 0 |
| Pendientes | 8 / 9 | 0 / 0 |
| Avisos | 0 / 7 | 0 / 0 |
| Novedades | 6 / 11 | 0 / 0 |
| Solicitudes | 0 / 0 (vacía) | 0 / 0 |

## Pruebas de regresión
| Prueba | Resultado |
|---|---|
| `qa-tema-glass` | 550 PASS · 0 FAIL |
| `qa-registrar-pago` | 58 PASS · 0 FAIL |
| `qa-crm` | 105 PASS · 2 FAIL |
| `qa-inicio-glass` | 121 PASS · 8 FAIL |
| `qa-legibilidad` | ver la bitácora siguiente o el mensaje al dueño |

- **`qa-crm` (2 FAIL):** el conteo de atrasados del simulador viejo; ver la entrada de 59.51.
- **`qa-inicio-glass` (8 FAIL):** son todos de «cobrado hoy = RD$ 4,000», y el simulador dio RD$ 3,000. Son datos del simulador, que se armó con la fecha de ayer y cambió de día a medianoche. No es la capa, que no toca el Inicio.

## Riesgos
- La letra normal se aplica a todo lo que está dentro de estos 5 módulos. Si algún parche escribe un texto que *debe* ir en mayúsculas (por ejemplo una sigla), seguirá saliendo bien, porque la sigla ya viene en mayúsculas en el texto.

## Siguiente paso
Mostrar el antes y después al dueño y esperar «publícalo».
