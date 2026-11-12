# «Costado» en Clientes y Facturas (resumen al lado, sin tapar la lista)

## Pedido del dueño
Reel de Moxen `DfnsWJABIDo` («Costado»). Dijo «para nexus también podemos sacarle provecho» y eligió por dónde empezar: «Clientes y facturas». En Bayol ya está publicado en Reacondicionados (PR #311 de `bayolcell-taller`).

## Diagnóstico
- En Clientes y en Facturas, tocar el nombre llamaba a `verCliente()`: la ficha completa en una ventana al centro que tapa la lista.
- Ya existía una ficha rápida lateral en el Inicio (`nxIGFicha`, clases `.nxPnFicha`, capa `#nxInicioPane`). Se reutiliza su aspecto y sus variables; no se creó otro estilo.

## Qué se hizo
- Archivo nuevo `parches-costado.js`, cargado al final de la lista de `parches-seguros.js` (build `6033` → `6034`). No toca `index.html`.
- Clientes (`#tbCli`, lista y cuadrícula): tocar el nombre abre el resumen del cliente al costado.
- Facturas (`#tbFact`, tarjetas y tabla): tocar el nombre abre el resumen de ESA factura (balance, total, meses anteriores, estado, agente, empresa, fecha, NCF).
- PC (≥ 1100 px): panel a la derecha, sin fondo; la lista se encoge y sigue a la vista. ↑ ↓ / J K pasan de fila; Esc cierra.
- Celular: hoja desde abajo con fondo; flechas ▲▼ y ✕ de 44 px.
- Botones: Cobrar (`abrirAbono`), WhatsApp (`nxAbrirWhatsAppDeCliente` / `enviarWA`), Ficha completa (`verCliente`), Ver factura (`verFacturaPDF_id`), Meses anteriores (`nxMesesAntVer`). Cierran el panel y abren lo de siempre.
- Con Ctrl/⌘ + clic, con el teclado (Enter) o sin la capa de vidrio, el nombre abre la ficha completa como antes.

## Fuente de verdad (no se calcula nada nuevo)
`getEst`, `pendTot`, `getTot`, `getEstPol`, `_saldoFacturasCliente`, `clasificarFacturaUrgencia`, `deudaAnt`: las mismas de la ficha y de la lista. SOLO LEE: ninguna consulta ni escritura propia. Corregir precio y anular factura siguen solo en el menú ⋮.

## Qué hace solo
| Acción | Detalle |
|---|---|
| Marca la fila abierta | Borde morado en la lista |
| Se actualiza | Si la lista se repinta (búsqueda, cobro), el panel se repinta con ella |
| Se cierra solo | Al cambiar de pantalla o si la fila ya no está |
| No estorba | Con una ventana abierta, las teclas no mueven el panel |

## Apagar
`localStorage.nx_costado_off='1'` en un equipo, o quitar la línea de `parches-seguros.js`.

## Pruebas
- `scripts/qa-costado.mjs` (nuevo): 36 PASS · 0 FAIL a 390 y 1280 px y con la capa apagada; cero escrituras a la base.
- `scripts/qa-clientes-ficha.mjs`: 72 PASS · 0 FAIL.
- Sin probar en un iPhone real ni con datos reales (el servidor de prueba no trae `cliente_nom` en las facturas; el panel usa el nombre del cliente como respaldo).

## Riesgos y pendientes
- En PC el panel queda por encima del buscador de la cabecera (igual que la ficha rápida del Inicio).
- Las flechas recorren solo la página visible de la lista.
- Faltan Cobros y Solicitudes (el dueño eligió Clientes y Facturas primero).

## Estado
Rama `claude/review-claude-md-jpzk7k`. **Sin publicar**: espera el «Publícalo» del dueño.
