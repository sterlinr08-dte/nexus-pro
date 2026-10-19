# 19-oct-2026 — Reportes, filtros de Facturas y detalles del menú (59.54, sin publicar)

## Pedido
El dueño dijo «Publícalo y continúa» (59.53). Después de publicar, se hizo un barrido de las pantallas que quedaban (ver `2026-10-19-0300-claude-publicado-59-53.md`) y se siguió con lo que se encontró.

## Capa `style#nxP7Pane` + `script#nxP7PaneJs`
- **Cómo se apaga:** `NX_P7_PANE=false` para todos, o `localStorage.nx_p7_pane_off='1'` en un equipo.
- **Va después de** `#nxP6Pane`. `APP_VERSION` sube a `59.54`.
- **Alcance:**
  - `#v-rep-agente`, que incluye el reporte del ciclo 20→20 (`.nxC20*`);
  - `#v-rep-aging`, `#v-rep-empresa` y `#v-rep-plan`;
  - los filtros de `#v-facturas` en la PC;
  - el visto «Marcar hecha» del Inicio (`#nxIG .nxIG-btn.chk`);
  - el botón del menú (`nav#sbEl .nx-mc-tg`).
- **Solo diseño.** No se tocan cálculos de cartera, custodia ni ciclo, ni Supabase.

### Qué cambia
- **Letra normal en los 4 reportes.** Los rótulos que venían escritos en MAYÚSCULAS en el código, como «COBRADO», «PENDIENTE» y «EFECTIVIDAD», los pasa a tipo oración `nxP7PaneJs`.
  - Toca solo textos de 5 letras o más, sin números ni «/». B/S/E+ y las siglas se quedan igual.
  - Solo cambia el texto en pantalla; no toca datos.
- **Todo lo que se toca mide 44 × 44 px o más:**
  - el botón de Excel de arriba a la derecha (era una píldora vacía de 18 × 32);
  - las pestañas Ciclo / Consolidado (28 → 44 px) y el selector del ciclo y su Excel (34 → 44 px);
  - «Ver más» de la antigüedad (30 → 44 px);
  - los filtros de mes, año, estado y agente de Facturas en la PC (34 → 44 px) y su lupa (42 → 44 px).
- **Selectores:** 48 px con letra de 16. En la PC, el del ciclo se ensancha a 260 px para que la fecha no se corte.
- **Antigüedad de cartera:** la letra de 8–10 px sube a 12–14, y las filas tienen más aire.
- **Inicio en la PC:** el visto «Marcar hecha» ya no se encoge a 23 px de ancho.
- **Botón del menú:** el círculo azul se ve igual (32–34 px), pero el área que se toca crece a 44 px con un `::after` invisible. Se comprobó tocando a 5 px fuera del círculo por los 4 lados: responde a 390 y a 1280 px.

## Cambios de texto en `index.html` (fuera de la capa)
- **`rRepAging`:**
  - **Tildes y letra normal:** «0 a 30 días» … «Más de 90 días», «Deuda total en cartera», encabezados Cliente / Período / Días / Monto, y «Todo al día».
  - **Nombre del cliente:** antes usaba solo `f.cliente_nom`. Si una factura no lo trae, salía «undefined» (se vio en el simulador). Ahora busca el nombre del cliente por `cliente_id` y, si tampoco está, pone «—».
  - **Escapado:** el nombre ahora pasa por `escHtml`; antes se insertaba sin escapar.
- **`rRepPlan`:** el título pasa de `PLAN ${p.toUpperCase()}` a `Plan ${p}`, para que «Esencial Plus» conserve su nombre. Con la capa apagada, la regla base lo sigue mostrando en mayúsculas.

## Medido con Playwright (390 y 1280 px)
| Pantalla | Antes: chicos / en MAYÚSCULAS | Ahora |
|---|---|---|
| Reporte por agente (390 / 1280) | 3 / 75 y 6 / 75 | 0 / 0 |
| Antigüedad (390 / 1280) | 0 / 81 y 1 / 81 | 0 / 0 |
| Por empresa | 1 / 10 | 0 / 0 |
| Por plan | 1 / 29 | 0 / 0 |
| Facturas PC | 5 chicos | 0 |
| Inicio PC | 1 chico | 0 |

## Pruebas
El resultado de las pruebas de regresión va en el mensaje al dueño y en la bitácora siguiente.
