# 18-oct-2026 — Configuración/Usuarios, Contabilidad y 4 ventanas (59.52, sin publicar)

## Pedido
El dueño respondió «Si» para seguir con Usuarios, Inhabilitar cliente, Vista previa del PDF y Contabilidad.

## Capa `style#nxP5Pane` + `script#nxP5PaneJs`
- **Cómo se apaga:** `NX_P5_PANE=false` para todos, o `localStorage.nx_p5_pane_off='1'` en un equipo.
- **Alcance:**
  - pantallas `#v-config`, `#v-comisiones`, `#v-mayor`, `#v-asientos`, `#v-balance`, `#v-pyg` y `#v-dgii`;
  - ventanas `#mAsiento`, `#mInhab`, `#mPDF` y `#mUsuario`.
- **Solo diseño:** no se tocan cálculos contables, asientos, IT-1/ARS, usuarios ni roles.

**Qué cambia (celular y PC)**
- Todo lo que se toca mide 44 × 44 px o más: botones, Excel, Ver, Calcular, la «×» de quitar, el icono de exportar en Resultados y las lupas.
- **Campos de escribir:** 48 px con letra de 16 (antes 29–38 px, y en la PC 11–15 px).
- **Rótulos, títulos de tabla, títulos y pestañas:** en tipo oración.
- **Ventanas:** título sin «// », X de 44 px, Cancelar 44 px y la acción principal 54 px.
- **Inhabilitar cliente:** el aviso deja las MAYÚSCULAS y queda en tipo oración.
- **Configuración:** las pestañas ya no cortan las palabras («NOTIFICA / CIONES»). Cada una mide lo que su palabra y la fila se desliza.
- **JS `nxP5PaneJs`:** limpia el título de las 4 ventanas al abrirse, igual que `nxP4PaneJs`.

## Medido (390 y 1280 px)
| Medida | Antes | Ahora |
|---|---|---|
| Elementos por debajo de 44 px (celular) | ~60 | 0 |
| Elementos por debajo de 44 px (PC) | ~65 | 0 |

Antes, Usuarios, Mayor, Asientos, Resultados, DGII y las 4 ventanas tenían campos y botones de 29–38 px.

## Pruebas
- Capturas a 390 y 1280 px.
- `qa-crm`, `qa-tema-glass`, `qa-inicio-glass`, `qa-registrar-pago`, `qa-custodia` y `qa-legibilidad`: el resultado va en el mensaje al dueño.

## Con esto
Quedan revisadas todas las pantallas fijas de `index.html` de la lista que se le dio al dueño.

**Pendientes, porque se arman aparte (parches):** CRM, Solicitudes, Avisos y Novedades.
