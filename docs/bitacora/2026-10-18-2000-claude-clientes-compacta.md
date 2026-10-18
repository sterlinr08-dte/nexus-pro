# 18-oct-2026 — Clientes compacta (59.48, sin publicar)

## Pedido
El dueño dijo «Publícala y continúa». Se publicó 59.47 y se siguió con **Clientes**, la primera de la lista de pantallas pendientes.

## Capa `style#nxCliPane`
- **Cómo se apaga:** `NX_CLI_PANE=false` para todos, o `localStorage.nx_cli_pane_off='1'` en un equipo.
- **Solo diseño:** es CSS y no toca `rCli()`, `parches-crm.js`, filtros, datos ni funciones.

**En celular y PC**
- Títulos y rótulos en tipo oración.
- Todo lo que se toca mide 44 px o más: CRM, Excel, pestañas, filtros, lupa, «Ordenar», Lista/Cuadrícula, botones de cada fila y de «Atención prioritaria».
- En la PC, «Registrar cobro» medía 22 px de ancho; ahora mide 44.

**Solo en el celular (≤720 px)**
- **Cabecera:** el título y las 3 cifras del CRM van en una franja.
- **Cifras grandes:** 2 × 2, sin icono y más bajas (245 → 151 px).
- **Pestañas** (Nuevo, Activos, Novedades, VIP, Inhabilitados): en una sola fila que se desliza (106 → 54 px).
- **Filtros:** sin la caja; «Ordenar» con letra normal (215 → 162 px).
- **Cada cliente:**
  - Agente, Prima y Pendiente en 3 columnas;
  - Vigencia, Plan y Estado como etiquetas en una fila;
  - «Empresa: …» en una línea;
  - **Cobrar** (ancho) + Editar, WhatsApp y ⋮, todos de 44 px.

## Medido a 390 px (datos de prueba)
| Medida | Antes | Ahora |
|---|---|---|
| Primer cliente (desde arriba de la vista) | 1,167 px | 957 px |
| Alto de cada cliente | 222 px | 206 px |
| Botones por debajo de 44 px (celular) | 15 | 0 |
| Botones por debajo de 44 px (PC) | 25 | 0 |

Antes, en el celular, el cobro era un botón de 22 px sin texto. Ahora es un botón «Cobrar» ancho.

## Pruebas
- Capturas en claro y oscuro, a 390 y 1280 px.
- `qa-crm`, `qa-tema-glass`, `qa-inicio-glass` y `qa-legibilidad`: el resultado va en el mensaje al dueño.

## Pendiente
- Que el dueño la vea y diga «publícalo».
- Próximas pantallas: Cobros e Historial de pagos.
