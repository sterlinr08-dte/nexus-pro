# 18-oct-2026 — Facturas y Ficha del cliente (resumen) rediseñadas (59.45–59.46, sin publicar)

## Pedido
El dueño mandó 2 capturas del iPhone (Facturas y la Ficha del cliente) y eligió «Rediseñar las dos».
Se aplicó la regla de botones de 44 px (`CLAUDE.md`, 18-oct-2026) y la skill `apple-design`.

## Facturas — capa `style#nxFactPane` (59.45)
- **Cómo se apaga:** `NX_FACT_PANE=false` para todos, o `localStorage.nx_fact_pane_off='1'` en un equipo.
- **Hueco vacío bajo el título:**
  - Causa: el marco `.nxbp-marco` de la lupa vieja (`#factQBar`) seguía visible y medía 52 px aunque la barra de adentro estaba oculta.
  - Arreglo: se oculta solo cuando la barra de adentro está oculta.
- **Título:** en tipo oración («Facturas / Cobra y factura a tus clientes»). «Generar» y los botones de «Más filtros» pasan a 44 px.
- **Ajustes solo para el celular (≤720 px):**
  - **Filtros:** sin la caja de vidrio alrededor.
  - **Cifras:** «Facturas» y «Por cobrar» en una fila; «Atrasadas» en una barra fina debajo, y se sigue tocando igual.
  - **Tarjeta de cada factura:** pasa a una rejilla:
    - arriba, cliente y estado;
    - luego, monto y total;
    - luego, ARS y fecha;
    - luego, «Meses anteriores» (si hay);
    - al final, **Cobrar + WhatsApp + ⋮ en una sola fila**, todos de 44 px.
- **Medido a 390 px:**
  - la tarjeta pasa de 241 a 205 px de promedio;
  - la lista empieza 60 px más arriba;
  - ningún botón queda por debajo de 44 px (antes había 7).

## Ficha del cliente, resumen `#csPanel` — capa `style#nxCsPane` (59.46)
- **Cómo se apaga:** `NX_CS_PANE=false` para todos, o `localStorage.nx_cs_pane_off='1'` en un equipo.
- **Cabecera:** una sola línea «Ficha del cliente» con la X de 44 px. Se quitó «Resumen del cliente», que repetía el título.
- **Rótulos:** sin MAYÚSCULAS forzadas. Los datos se muestran como están guardados.
- **Tarjeta azul:**
  - el nombre ahora va en blanco (antes era azul oscuro sobre azul, poco legible);
  - WhatsApp, Editar y ★ miden 44 px;
  - las 3 cifras (Prima, Pendiente, Vigencia) van en 3 columnas.
- **Accesos:** Documentos, Abonos y Certificado PDF son 3 botones iguales en una fila.
- **Pestañas:** van como control segmentado de 44 px. Se ocultó la luz `nx-luz` que dejaba una rayita azul encima.
- **Información:** en filas «rótulo — dato» de 40 px con separador.
- **Tema oscuro:** se quitó el reflejo blanco de la tarjeta, que tapaba los textos y dejaba «Editar» casi invisible. Ya pasaba antes de este cambio.

## No se tocó
Funciones, ids, datos, cálculos, Supabase ni pagos. Todo es CSS en capas que se pueden apagar.

## Pruebas
- Capturas antes y después en claro y oscuro, a 390 y 1280 px (en el *scratchpad* de la sesión).
- Medición de los tamaños de toque.
- Pruebas de regresión: el resultado va en el mensaje al dueño.

## Pendiente
Que el dueño lo vea y diga «publícalo». Van juntas 59.43 a 59.46.
