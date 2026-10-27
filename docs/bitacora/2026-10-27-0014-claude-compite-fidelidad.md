# 2026-10-27 00:14 (RD) · Claude · POS «Clientes que vuelven» (competir sin bajar precios, agente 5 de 5)

## Pedido
El dueño quiere herramientas legales para competir contra negocios informales que venden más barato. Esta parte cubre
la fidelidad: reconocer a los clientes frecuentes, recuperar a los que se están yendo y hacer volver a los de una sola
compra, sin depender del precio.

## Qué se hizo
Capa nueva **`parches-pos-fidelidad.js`**, que se carga desde `index.html` después de `parches-pos-stitch-visual.js`.
Para apagarla: `localStorage.nx_pos_fidelidad_off='1'`. Con la capa apagada no aparece nada y no se inyecta CSS.

- **Clientes → «Clientes que vuelven»**: panel con 3 grupos calculados de `pos_ventas` (`estado=completada`, sin `anulada`,
  con cliente, últimos 365 días, por la fecha de la venta) y `pos_clientes` activos.
  - **Frecuentes**: 3 compras o más en 90 días, con lo gastado en 90 días y el ticket promedio.
  - **Por perder**: 3 compras o más en el año y más de 45 días sin volver. Los grupos no se repiten: si un frecuente deja
    de venir más de 45 días, pasa a «por perder».
  - **Una sola compra**: una sola compra, hecha en los últimos 120 días.
  - El criterio está detrás de la ⓘ del panel.
- **«Preparar mensaje»**: abre un borrador editable, en usted y sin exclamaciones, que cambia según el grupo
  (agradecimiento, «le extrañamos», o recordatorio de garantía o servicio).
  - En «una sola compra» se lee `pos_venta_items` para nombrar el artículo y la garantía si sigue vigente.
  - Solo ofrece **Copiar texto** o **Abrir WhatsApp** (`https://wa.me/<número>?text=…` con `target=_blank`). No envía
    nada por su cuenta, no hace POST y no llama Edge Functions.
- **Exportar CSV** del grupo abierto, con BOM para Excel. Columnas: cliente, teléfono, grupo, compras en 90 días,
  compras en el año, total, ticket, última compra y días sin comprar.
- **Ajustes → «Descuento de cliente frecuente»**: porcentaje sugerido (0 = apagado, máximo 50). Se guarda en
  `localStorage.nx_pos_fid_pct` de cada equipo; no se escribe en la base.
- **Factura**: si el cliente elegido es frecuente y el % es mayor que 0, aparece en `facSugerencias()` / `.facSugIt` el
  aviso «Cliente frecuente: puede ofrecerle X %» con lo que serían X % de esa factura.
  - No aplica nada: el cajero decide y lo da con el descuento por línea.
  - Convive con `it.cubre6`: la prueba da un total de 11,200 y la sugerencia sigue.

## Cambios mínimos en `parches-pos.js` (3 ganchos, una línea cada uno)
1. `facSugerencias()`, en el bloque del cliente: `window.nxPosFidSug(c, t)` si existe.
2. `renderClientes()`, en la barra: `window.nxPosFidBotonHTML()` si existe.
3. `renderAjustes()`, antes de Secuencias: `window.nxPosFidAjustesHTML()` si existe.

## Hallazgo para el dueño: «Abrir WhatsApp»
La app tiene `parches-whatsapp-enrutamiento-nexus.js` (08-sep-2026), que intercepta **todo** enlace o `window.open` a
wa.me y lo manda al Inbox corporativo. Ahí solo deja el texto escrito; no lo envía.
- Ese enrutador busca el número en los clientes de Seguros y en los agentes. Un cliente del POS de una tienda normalmente
  no aparece, así que el botón abre el Inbox con el aviso «número no vinculado».
- Lo mismo le pasa hoy a `nxPosCliWA` (el recordatorio de saldo).
- No se esquivó esa regla. Mientras tanto, **«Copiar texto» siempre funciona**.
- Si el dueño quiere que en el POS se abra el WhatsApp del teléfono (wa.me de verdad), hay que decidir una excepción para
  `#v-pos` en el enrutador.

## Hallazgo menor
En el tema de fábrica (`html.tema-glass-oscuro`) la factura se ve blanca, pero la regla oscura de `.facSugTx b` pone el
texto casi blanco. Por eso los demás avisos de la factura se leen mal en ese tema. Solo se corrigió el aviso nuevo
(`.facSugIt.nxFidSug`); los demás quedan para revisar aparte.

## Pruebas (Playwright, servidor local, REST simulada)
- `scripts/qa-pos-fidelidad.mjs` (nuevo): **62 pasaron, 0 fallaron**.
  - Clasificación con fechas conocidas: 89 días cuenta como frecuente y 46 días como por perder; 119 días sí entra y
    121 no; las anuladas no cuentan.
  - Conteos 1/2/1 en la app y nombres por grupo.
  - Borrador con 16 px, editable y sin «!¡». El enlace lleva el texto editado y no hay ningún POST ni Edge Function.
  - CSV correcto.
  - Sugerencia con 10 %, nada con 0 %, nada para un cliente que no es frecuente, y convive con cubrir 6 %.
  - Campo del % de 48/16 px.
  - Todos los toques miden 44 px o más, sin mayúsculas forzadas, `tabular-nums`, sin scroll horizontal.
  - 390 y 1280 px, temas glass oscuro, premium y claro, apagado, y 0 errores de JS.
- `scripts/qa-pos-cubre6.mjs`: 14 pasaron, 0 fallaron.
- `scripts/qa-ecf-caja.mjs`: 59 pasaron, 0 fallaron.

## Estado
- Rama `claude/compite-5-fidelidad`, sobre `claude/pos-descuento-itbis`. Sin PR y sin publicar.
- `APP_VERSION` sin cambiar.
- Solo lectura de la base; no hay SQL ni migraciones.

## Siguiente paso
Que el dueño lo vea y decida sobre la excepción de wa.me en el POS. Si quiere que el % sea por empresa y no por equipo,
hace falta una columna en `pos_config`, con migración propuesta aparte.
