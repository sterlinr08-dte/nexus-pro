# 16-nov-2026 — Claude — POS 6064: el empleado no cambia el precio de la línea

## Pedido del dueño
- Muse (prueba de la 6063) vio que el precio unitario de cada línea seguía editable.
- Se le preguntó al dueño y eligió **«Bloquearlo»**: solo el administrador o el gerente cambian el precio de una línea; el empleado vende al precio del nivel del cliente.
- También eligió **«Bórralo»** para el cliente duplicado «Cliente Prueba V6062» de la demo.

## Cliente duplicado de la demo
- Se revisó el registro sobrante (`9231fa5d…`, 809-555-0188, organización demo): 0 referencias en abonos, apartados, cotizaciones, créditos, CRM, devoluciones, documentos, financiamientos, notas de débito, prefacturas, ventas, ventas suspendidas, compras ni órdenes de compra.
- El `delete` se intentó dos veces y las dos se agotó el tiempo esperando la tarjeta de confirmación de Supabase, que no aparece en este chat.
- Con el OK del dueño se **desactivó** (`activo=false`). Ya no sale en Clientes. El registro con la PF-00004 sigue intacto.

## Cambios (`parches-pos.js`)
- Factura y Prefactura: si el rol no es administrador ni gerente, la casilla del precio de cada línea se cambia por un dato fijo: `precioFijoHTML`, con candado, borde punteado y 44 px de alto.
- `nxFacPrecio`: si un empleado intenta cambiar el precio, sale el aviso «Precio fijo — Solo el administrador o el gerente cambia el precio.» y se repinta. Única excepción: subirlo al mínimo con «Poner mínimo».
- Cotización: lo mismo en la tabla, y `nxCotLinea('precio')` se niega para el empleado.
- No se tocaron:
  - el descuento por línea, que sigue con sus reglas («no permite descuento»);
  - «Vender», que no tiene casilla de precio;
  - la solicitud de Financiamiento.
- `parches-seguros.js`: `b=6063` → `b=6064`.

## Alcance
- El candado está en la pantalla.
- El precio queda guardado dentro de los artículos de la venta (`items` en JSON), así que la base no lo valida por su cuenta. Validar el precio en el servidor sería un trabajo aparte.

## Pruebas
- `qa-pos-prefactura-bayol`: 119/119, a 390, 1024 y 1440 px. Pruebas nuevas:
  - el cajero ve el precio con candado y no lo cambia;
  - en Cotización, el cajero tampoco lo cambia;
  - el administrador sí lo cambia.
- Para estas pruebas, el stub le da al cajero acceso a Factura, Prefactura y Cotización (`pos_acceso`). Por defecto, el cajero solo tiene «Vender».
- Capturas en el scratchpad, `cap6064/cajero-precio-*.png`.
- Regresión completa del POS: en `regresion-6064.txt`.

## Estado
- Rama `claude/pos-precio-linea-bloqueado`. Sin publicar.
