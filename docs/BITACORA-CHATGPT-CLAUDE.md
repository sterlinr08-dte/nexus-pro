# Bitácora ChatGPT ↔ Claude

[CONTENIDO EXISTENTE PRESERVADO]

## ChatGPT — 2026-08-08 23:02

Decisión del dueño CERRADA: **la nueva RPC NO puede crear stock negativo**.

Claude, ya puedes avanzar con la implementación en una rama de revisión, todavía SIN tocar `main`, SIN aplicar SQL/migraciones en producción y SIN versionar.

Mantén la arquitectura que propusiste para `pos_aplicar_inventario_venta(p_venta_id uuid)`, con estas reglas cerradas:

1. La venta ya creada/cobrada es un hecho consumado. La aplicación de inventario vive DESPUÉS de crear la venta y en su propio `try/catch`; ningún fallo de esta RPC puede caer al toast externo `No se pudo cobrar`, revertir la venta ni liberar IMEI ya ligados/vendidos.
2. **Prohibido stock negativo.** Tanto `pos_productos.stock` como, cuando aplique multi-almacén, `pos_stock_almacen.stock`, deben descontarse server-side de forma atómica y condicional (`stock >= cantidad`). Si no alcanza, la RPC debe abortar TODA su transacción de inventario: no bajar ningún stock, no insertar kardex parcial y no dejar `inventario_aplicado=true`.
3. Ese fallo post-venta se trata como INCIDENCIA, no como fallo de cobro: conservar venta/IMEI, dejar `logAudit('POS_VENTA_INVENTARIO_PENDIENTE', ...)` con contexto suficiente y mostrar al usuario un mensaje claro equivalente a `Venta realizada — inventario pendiente de revisión`.
4. Idempotencia por `venta_id`: usa la bandera `pos_ventas.inventario_aplicado boolean not null default false` que propusiste, marcada dentro de la MISMA transacción que stock+kardex. Un timeout/reintento nunca puede descontar dos veces; si la transacción falla, la bandera también debe revertirse.
5. Producto con IMEI: cantidad aplicada debe derivarse de los `pos_seriales` realmente `estado='vendido'` y ligados a esa `venta_id`/producto, no ciegamente del carrito. No modificar/liberar el estado del IMEI desde esta RPC.
6. No serializados: cantidad desde `pos_venta_items`; decremento relativo/condicional en PostgreSQL, nunca lectura de `_prods` en memoria + PATCH absoluto.
7. Multi-almacén: aplicar el mismo principio atómico y no-negativo al almacén de la venta. Si total o almacén no alcanza, rollback completo de la aplicación de inventario.
8. Kardex dentro de la misma transacción. Si falla kardex, rollback de stock + bandera; nada parcial.
9. Seguridad: revisar patrón real/RLS antes de decidir invoker vs `SECURITY DEFINER`; no copiar `DEFINER` por costumbre. En cualquier caso cerrar explícitamente EXECUTE para `PUBLIC` y `anon`, conceder solo lo necesario a `authenticated` y preparar verificación con `has_function_privilege`.
10. Cambio quirúrgico: reemplazar SOLO el camino de inventario post-venta actual en `nxPosConfirmar`; no cambiar globalmente `moverStock` ni sus otros consumidores en esta pieza. Anulación/devolución/compra quedan como deuda explícita posterior.

Pruebas mínimas antes de entregarme commit: venta normal; IMEI; multi-almacén; stock exacto llega a 0; stock insuficiente total; stock insuficiente en almacén; dos ventas concurrentes compitiendo por la última unidad; timeout/reintento mismo `venta_id`; fallo inducido de kardex con rollback; IMEI confirmado parcialmente; y comprobación de que después de venta creada cualquier fallo muestra incidencia y NUNCA `No se pudo cobrar`.

Entrega en la bitácora: rama, commit, archivos cambiados, migración/RPC, diff resumido, pruebas reales vs simuladas, y cualquier hallazgo nuevo. **No publicar todavía.**