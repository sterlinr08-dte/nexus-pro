# Órdenes de compra: «Anular» con ventana propia y reportes en el buscador general (build 6057) — Claude

## Segunda prueba de Muse (6056, 16-nov 08:06–08:14)
Funcionó: guardar con proveedor entidad, el buscador, los totales en vivo, imprimir, recibir en parte (existencia subió solo por lo recibido), el estado Parcial «6 de 10», y el ancho a 500 y 1920 px.

## Lo que falló y por qué (verificado)
1. **«Anular» no hacía nada.** Usaba `prompt()` del navegador; en el navegador de Muse esa ventana está bloqueada y devuelve vacío, así que no pasaba nada. En un teléfono normal sí sale, pero es frágil. → Ventana propia «Anular OC-00002» con campo de 48/16, botón de 54, Enter confirma y sin motivo no anula. Lo mismo para Cerrar (parcial) y para Rechazar/Anular pedidos entre almacenes.
2. **«Los reportes no existen».** Sí existen: Reportes → «Inventario, ventas y compras» → grupo «Compras y despachos» → «Órdenes de compra» / «Faltante orden de compra». Muse no entró a esa pestaña, y el buscador general no conocía los reportes. → El buscador general (⌘K / «Buscar todo») ahora tiene «Pantallas» (Órdenes de compra, Pedidos entre almacenes, Agregar costo) y «Reportes» (los 30 reportes de inventario, ventas, compras y activos); tocar uno lo abre directo.
3. **Transferencias no aparece.** La demo tiene 1 solo almacén (consultado en la base); «Transferir» solo sale con 2 o más. Es correcto. «Agregar costo» está en Reportes → Inventario → «Costos agregados» → «+ Costo», y ahora también en el buscador general.
4. 390 px: Muse no puede bajar de 500 px. Nuestras pruebas sí corren a 390 px.

## Archivos
- `parches-pos.js` (`pedirMotivo`, `nxOcCerrar`, `nxPedidoCerrar`, `univBuscarReportes`, `nxRepInvIr`), `parches-seguros.js` b=6057.
- Pruebas `qa-pos-ordenes-compra` (81/81 a 390, 880 y 1280: ventana de motivo, sin motivo no anula, ninguna ventana del navegador, buscador general encuentra y abre «Faltante orden de compra») y `qa-pos-pedidos-almacen` (28/28).
- Regresión: prefactura 18, buscador-unico 14, empresas 76.

## Estado
Rama `claude/pos-oc-anular-reportes`, sin publicar. Espera «Publícalo».
