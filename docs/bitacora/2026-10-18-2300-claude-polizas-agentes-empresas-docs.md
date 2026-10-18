# 18-oct-2026 — Pólizas, Agentes, Empresas y las ventanas Nueva empresa, Nuevo agente y Documentos (59.51, sin publicar)

## Pedido
El dueño respondió «Si» para seguir con Documentos, Pólizas, Empresas y Agentes.

## Capa `style#nxP4Pane` + `script#nxP4PaneJs`
- **Cómo se apaga:** `NX_P4_PANE=false` para todos, o `localStorage.nx_p4_pane_off='1'` en un equipo.
- **Diseño:** el CSS no toca `rPolizas()`, `rAgentes()`, `rEmpGrd()`, guardar, ni subir o exportar documentos.
- **JS (`nxP4PaneJs`):** solo cambia el título de las ventanas `mEmp`, `mAgente` y `mDocs` cuando se abren:
  - quita el «// » del principio;
  - pasa a tipo oración la parte en MAYÚSCULAS antes de « — »;
  - el nombre del cliente queda igual.

**En celular y PC**
- Títulos y rótulos en tipo oración.
- Todo lo que se toca mide 44 px o más: Excel, filtro, lupa, Cert., WhatsApp, Nueva, Nuevo agente, Editar/Eliminar agente, buscadores y encabezados que ordenan.
- **Ventanas:**
  - campos de 48 px con letra de 16 (antes 35–36 px y 15);
  - X de 44 px;
  - Cancelar 44 px y Guardar 54 px;
  - el campo de «Otros documentos» pasa de 23 a 44 px.

**Solo en el celular (≤720 px)**
- **Pólizas y Agentes:** cifras 2 × 2 sin icono.
- **Pólizas:** cada póliza en 4 líneas.
  - asegurado y número;
  - plan, estado y NCF;
  - inicio;
  - fin y días;
  - Cert. y WhatsApp a la derecha.
- **Agentes:** la tabla, que se cortaba a la derecha, pasa a tarjetas: nombre y estado de licencia; cargo, licencia y vence; Editar y Eliminar de 44 px.

## Medido a 390 px
| Medida | Antes | Ahora |
|---|---|---|
| Lista de 8 pólizas | 2,110 px | 1,381 px |
| Cada póliza | ~227 px | ~135 px |
| Botones por debajo de 44 px (celular, las 6 pantallas) | 25 | 0 |
| Botones por debajo de 44 px (PC, las 6 pantallas) | 33 | 0 |

## Pruebas
- Capturas a 390 y 1280 px.
- `qa-crm`, `qa-tema-glass`, `qa-inicio-glass`, `qa-registrar-pago` y `qa-legibilidad`: el resultado va en el mensaje al dueño.

## Pendiente
- «publícalo».
- Siguientes: Usuarios, Inhabilitar cliente, Vista previa del PDF y Contabilidad.
