# Salidas de custodia del administrador · pantalla (59.83, sin publicar)

Sigue a `2026-11-09-1931-claude-salidas-custodia-base.md` (la base de datos; ya está aplicada en producción).

## Pedido del dueño
Pantalla para registrar «Salidas» de la custodia del administrador: pago a la aseguradora, gasto del negocio, retiro del dueño, depósito de efectivo al banco y ajuste inicial. Solo la ve el administrador. Capa nueva, aislada y apagable.

## Qué se hizo
- **Capa nueva `parches-salidas-custodia.js`** (trae su CSS en `<style id="nxSalCusCss">`, que se inyecta al cargar la capa).
  - **Botón «Salida»** en la cabecera de «Custodia de fondos», al lado de «Actualizar». Solo administrador.
  - **Ventana «Registrar salida»:**
    - motivo: 4 botones («Pago a la aseguradora», «Gasto del negocio», «Retiro del dueño», «Depósito al banco») y «Ajuste inicial» aparte, menos visible;
    - monto con comas mientras se escribe; el cursor entra ahí al abrir;
    - de dónde sale: Efectivo / Banco. Con «Depósito al banco» queda fijo en Efectivo (se muestra como texto) y pide el banco destino;
    - banco: el catálogo de bancos del sistema (`cargarBancos()`, el mismo de «Registrar pago») más «Otro»;
    - nota (obligatoria en «Ajuste inicial»); referencia y fecha real dentro de «Referencia y fecha»;
    - botón principal «Registrar salida RD$ X» (en el depósito dice «Registrar depósito RD$ X», porque no es una salida);
    - llave contra doble envío por cada apertura (se reutiliza si se reintenta tras un error) y botón deshabilitado mientras guarda;
    - el error del servidor se muestra tal cual, en un aviso corto encima del botón.
  - **Lista «Salidas»** debajo de la pantalla: las últimas 50 (fecha, motivo, de dónde, quién, referencia, nota y monto). Las anuladas salen tachadas con su motivo. «Anular» abre una ventana que pide el motivo. Vacía dice: «Sin salidas. Registre la primera con “Salida”.»
  - **Refresco:** tras registrar o anular se llama a `cusCargar(true)` (el refresco que ya tenía la pantalla) y se recarga la lista. El navegador no calcula la custodia.
- **Reporte del ciclo (`parches-reporte-ciclo-agentes.js`, pestaña Ciclo):** columna «Salidas» por agente entre «Entregado» y «Saldo / custodia», leída de `rpc/seguros_salidas_ciclo`. El depósito al banco no se suma (no baja el total). También va en el Excel. Si la consulta falla, la columna sale con «—» y el reporte sigue igual. Cambio pequeño; la capa no se reescribió. Se añadió `window.nxC20Invalidar()` para que el reporte no muestre cifras guardadas después de una salida.
- **Cargador (`parches-seguros.js`):** una línea para la capa nueva, al final de la lista.

## Desglose efectivo / banco
`seguros_custodia_desglose_agente` solo la puede llamar el servidor, y el navegador no tiene otro camino para el efectivo y el banco acumulados (la pantalla solo separa lo cobrado del ciclo). Por eso:
- el aviso «Supera la custodia: RD$ X» usa el total del administrador que ya está en pantalla (`saldo_final` del ciclo en curso);
- el tope por bolsa (efectivo o banco) lo valida el servidor, y su mensaje («Solo hay RD$ … en efectivo») se muestra tal cual.

## Archivos
- `parches-salidas-custodia.js` (nuevo)
- `scripts/qa-salidas-custodia.mjs` (nuevo)
- `parches-reporte-ciclo-agentes.js` (columna «Salidas»)
- `parches-seguros.js` (línea del cargador)
- No se tocó `index.html`, ni cobros, transferencias, WhatsApp o Supabase.

## Cómo apagar
`localStorage.setItem('nx_salidas_custodia_off','1')` y recargar: desaparecen el botón, la lista y la columna del reporte. Para quitarla del todo, borrar su línea en `parches-seguros.js`.

## Pruebas (datos simulados; nada tocó producción)
`PORT=8942 node scripts/qa-crm-mock-server.js &` y `node scripts/qa-salidas-custodia.mjs`, a 390 y 1280 px: **110 aprobadas, 0 fallidas.**
- El botón y la lista salen solo para el administrador; un agente no ve nada ni consulta las salidas.
- Medidas: todo lo que se toca ≥44×44; campos de 48 px con letra de 16 px; botones principales de 54 px.
- «Depósito al banco» fija Efectivo y pide el banco destino.
- Tres toques seguidos = una sola llamada a la RPC, con sus 9 parámetros correctos.
- El error del servidor se ve tal cual; al reintentar va la misma llave.
- Tras registrar o anular se vuelve a pedir la custodia al servidor.
- Anular pide motivo y llama a la RPC una vez; la anulada queda tachada.
- Reporte del ciclo con la columna «Salidas».
- Sin desplazamiento horizontal ni errores de JavaScript. Con el apagador no aparece nada y el reporte queda con sus 7 columnas.
- No se rompió lo de al lado: `qa-custodia.mjs` 68 de 68 y `qa-pulido-global.mjs` 68 de 68.
- Tema claro: revisado a la vista en capturas (390 y 1280); la prueba automática corre con el tema oscuro por defecto.

## Smart
- Piensa por el usuario: cursor en el monto, comas solas, motivo ya marcado, Efectivo fijo en el depósito, el botón dice el monto, aviso antes del error.
- Elegante: misma línea de las ventanas recientes (vidrio, radio 20, azul NEXUS), espaciado del reglamento (8 px etiqueta–campo, 20 px entre campos).
- iPhone y PC: en el celular sube desde abajo y el botón principal ocupa el ancho; en la PC los 4 motivos van en una línea.
- No pudo ser smart: no se muestra cuánto hay en efectivo y en banco antes de registrar (ver «Desglose»).

## Pendientes y riesgos
- **No probado contra la base real** con sesión de administrador (ni registrar, ni anular, ni la lectura de la tabla). Las pruebas son con respuestas simuladas.
- Los espacios del formulario están puestos en el CSS, pero no se midieron con Playwright.
- No se sube comprobante: `p_comprobante_url` va vacío.
- La lista muestra las últimas 50 salidas, sin filtro por ciclo.
- El resumen de WhatsApp todavía no menciona las salidas.
- Falta la cifra real del dueño para el ajuste inicial.

## Estado
Rama `claude/salidas-custodia`, subida. Sin PR y sin publicar. Requiere el «publícalo» del dueño.
