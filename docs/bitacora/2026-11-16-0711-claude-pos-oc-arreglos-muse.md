# Órdenes de compra: arreglos de la prueba de Muse (build 6056) — Claude

## Lo que reportó Muse (demo, v6055)
1. «Guardar orden» fallaba siempre con `PROVEEDOR_NO_EXISTE`.
2. El buscador «Agregar artículo» nunca mostraba sugerencias.
3. El importe y el total no cambiaban hasta salir del campo.
4. Los reportes cargaban vacíos (bien).
5. A 880 px el proveedor salía cortado y la fecha se salía del borde.

## Diagnóstico (verificado)
1. En la base, «Distribuidora Prueba» y «Prueba» de la demo están en `pos_clientes` con `es_proveedor = true` (entidades), no en `pos_proveedores`. Compras acepta los dos tipos, pero `pos_orden_compra_crear` solo buscaba en `pos_proveedores`. **Muse acertó en que el fallo era solo de órdenes, pero se mandaba el identificador correcto, no el nombre.**
2. El campo usaba la lista nativa del navegador (`datalist`); Compras usa un buscador propio. Pedidos entre almacenes tenía el mismo campo.
3. Los campos usaban `onchange`.
5. Proveedor y fecha iban en dos columnas sin `min-width:0`.

## Arreglos
- Migración `20261116090000_pos_orden_compra_proveedor_entidad.sql`: la función de crear también acepta una entidad proveedora de la misma empresa. Ensayo con vuelta atrás como gerente de la demo con «Distribuidora Prueba»: OC-00001 por RD$140 (revertido). Aplicada.
- `parches-pos.js`: buscador con resultados debajo (botones de 44 px, Enter agrega el primero, Esc cierra), igual en Órdenes y en Pedidos entre almacenes; importe y total cambian mientras se escribe sin perder el cursor; proveedor y fecha uno debajo del otro.
- `parches-seguros.js` b=6056.

## Pruebas
- `qa-pos-ordenes-compra`: 63/63 a 390, 880 y 1280 px (nuevas: escribir «agua» sugiere, tocar y Enter agregan, total en vivo con el cursor dentro, campos dentro de la ventana).
- Regresión: pedidos-almacen 28, reportes-mas 34, compra-segura 50, precios-activos 42.

## Estado
Rama `claude/pos-oc-arreglos`. La base ya está corregida (aplica para la 6055 en vivo también). Frontend sin publicar: espera «Publícalo».
