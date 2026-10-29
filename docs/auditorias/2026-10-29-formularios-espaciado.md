# NEXUS PRO: auditoría de espaciado de formularios (29-oct-2026)

Solo se leyó. No se cambió nada en el repositorio, no hubo commits y no se publicó nada. Se trabajó sobre una copia de `origin/main` (commit `fde941d`, versión 59.70). La regla usada es la de DESIGN.md, sección «Espaciado de formularios», que está en la rama `claude/regla-espaciado`, más las reglas de botones de CLAUDE.md. Se aceptó una diferencia de ±2 px.

## Resultado en pocas palabras
- **74 formularios** revisados. **54 se midieron** con Playwright a 390 y 1280 px y **20 se revisaron leyendo el código**.
- **0 cumplen, 1 casi cumple y 73 no cumplen.**
- El que casi cumple es «WhatsApp: nueva plantilla». Le fallan dos cosas: el espacio entre la cajita y la ayuda es de 9 px y la etiqueta está en MAYÚSCULAS.
- Los que están más cerca de cumplir son los que ya pasaron por una capa nueva: Nuevo cliente (#nxFichaPane), Registrar pago (#nxCobroPane) y Nueva empresa, Nuevo agente y Usuario (#nxP4Pane y #nxP5Pane). Ya tienen campos de 48 px, botón de 54 px y etiquetas de 13 px en letra normal. Les falta el aire: el borde interior, el espacio de 20 px entre campos y el de 8 px entre etiqueta y cajita.

## Las fallas que más se repiten (de 54 medidos)
1. **Borde interior de la ventana** (53). Hoy es de 14–15 px en el celular y de 20 px en la PC. La regla pide 24/16 en el celular y 48/40 en la PC.
2. **Etiqueta → cajita** (45). Hoy es de 3 px; la regla pide 8 px.
3. **Botón principal** (44). Hoy mide 32–38 px de alto; la regla pide 54 px.
4. **Cosas que se tocan de menos de 44 × 44 px** (43). Entran aquí botones de 32–38 px, la X de cerrar de 35–36 px, casillas de 16–20 px y el ojo de la contraseña.
5. **Etiquetas en MAYÚSCULAS** (41) y **campos de 37–42 px en vez de 48** (41). Cerca van **campo → campo** (39): hoy 9 px, la regla pide 20.

## Por qué pasa
Casi todas las ventanas que arman los parches (POS, Rifas, Préstamos, Vehículos, Seguros base, Consultorio) usan las mismas piezas: `.modal`, `.mt`, `.fr` y `.fe`. Para ellas gana el `<style>` base de index.html (cerca de la línea 450):
`.fr{margin-bottom:9px}`, `.fr label{margin-bottom:3px;text-transform:uppercase}`, `.modal{padding:20px}` (14 px en el celular) y `.btn{min-height:32–34px}`. La capa `style#nxTipoApple` solo cambia la letra: 16 px en los campos del celular y 11 px en las etiquetas.
Por eso **una sola capa nueva y aislada** puede corregir unas 45 ventanas a la vez. Por ejemplo, `<style id="nxFormEspaciado">` al final de index.html, con interruptor `html.nx-fesp` y apagable desde localStorage, como las otras capas «Pane». Las que ya tienen capa propia (#nxFichaPane, #nxCobroPane, #nxP4Pane y #nxP5Pane) se ajustan dentro de esa capa. Las ventanas de WhatsApp (reglas, automatizaciones y validar pagos) tienen CSS propio con letra de 8,5–10 px y se corrigen en su propio parche.
Cada fila de `nexus.json` trae el CSS sugerido y en qué capa va.
Ojo con la regla anti-FOUC: según DESIGN.md esto se corrige **cuando se toque cada formulario**, sin hacer un rediseño masivo.

## Lo que no se pudo medir, dicho con honestidad
- No se inició sesión con una cuenta real. Se simuló una sesión de administrador y datos falsos mínimos (1 cliente, 1 agente y 1 empresa), y Supabase quedó **bloqueado por completo**: no se escribió nada en la base.
- No abrieron, por depender de datos reales: Cerrar caja, Movimiento de caja, Cobrar venta, Registrar gasto, Nota de débito, Devolución y Financiamiento del POS; Vender, Editar, Cambiar número y Rechazar boleto de Rifas; Pedir corrección de Préstamos; y Reglas, Automatizaciones y Validar pagos de WhatsApp. Están marcados **«por código»**. Los del POS, Rifas y Préstamos usan las mismas piezas y el mismo CSS que una ventana hermana que sí se midió (se indica cuál). Los de WhatsApp se leyeron de su propio CSS.
- **«Cobrar venta» del POS** es la pantalla de dinero y tiene medidas puestas directamente en el código. Hay que medirla en vivo antes de tocarla.
- «Cambiar usuario de acceso» no es un formulario: usa el `prompt()` del navegador. «Cierre de caja (Seguros)» e «Historial de cobros» no tienen campos. Ninguno de los tres se contó.
- Los íconos (Tabler) no cargaron en la prueba. Los botones que solo tienen ícono pueden medir 1–2 px distinto en la app real.
- Las medidas automáticas de «campo → campo» y «etiqueta → cajita» usan el valor que más se repite en cada ventana. En formularios con varias columnas o cuadrículas (Nueva rifa, Nueva consulta, Nuevo producto) puede haber valores raros, que se muestran como rango.

## Archivos
- `nexus.json`: una fila por formulario, con sus fallas (qué se esperaba y qué hay) y el arreglo sugerido.
- `nexus-raw.json`: todas las medidas sin procesar (getBoundingClientRect) a 390 y 1280 px.
- Capturas del «antes»: `nexus-antes-login-390.png`, `nexus-antes-nuevo-cliente-390.png`, `nexus-antes-registrar-pago-390.png` y `nexus-antes-pos-nueva-cuenta-1280.png`.
