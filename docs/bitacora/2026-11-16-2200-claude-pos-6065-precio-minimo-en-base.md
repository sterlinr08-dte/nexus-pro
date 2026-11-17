# 17-nov-2026 — Claude — POS 6065: la base revisa el precio mínimo

## Pedido del dueño
- Pidió: «Haz que la base también revise el precio».
- Se le presentaron 3 opciones: A (piso del cliente), B (solo el mínimo) y C (A + sin descuento). Eligió **B. Solo el mínimo**.

## Auditoría (Fase 0)
- Todas las ventas se guardan con `pos_registrar_venta_atomica` (RPC). Esa función ya revisaba precio > 0, que el total cuadre, el cliente, el vendedor, el almacén y la caja. **No revisaba el precio contra el mínimo.**
- El piso que usa la pantalla (`minimoDe`): el mínimo del nivel del cliente si es mayor que 0; si no, el del artículo.
- «Cubrir 6 %» es un descuento, no un precio.
- Los precios por cantidad (`parches-pos-volumen.js`) ya respetan el mínimo.

## Cambio en la base (aplicado)
Migración `20261117090000_pos_venta_items_precio_minimo.sql`:
- función `pos_venta_items_precio_minimo()` (security definer) y trigger `trg_pos_venta_items_precio_minimo`, que corre antes de cada insert o update de `precio` en `pos_venta_items`;
- si el rol no es admin ni gerente, el precio de la línea no puede quedar debajo del mínimo; si queda debajo, da el error `PRECIO_DEBAJO_MINIMO: <artículo> (mínimo X)`;
- los procesos sin rol (service_role, migraciones) no se frenan;
- el histórico no se toca: solo se revisan las ventas nuevas o un cambio de precio.

**Ensayo con vuelta atrás** (demo, servicio con mínimo puesto en 50 solo dentro del ensayo):

| Quién | Precio | Resultado |
|---|---|---|
| Gerente | 40 | `ok` |
| Cajero | 40 | `PRECIO_DEBAJO_MINIMO: x (mínimo 50.00)` |
| Cajero | 60 | `ok` |

Todo se deshizo al final del ensayo.

## Cambio en pantalla (`parches-pos.js`)
- Al cobrar, si la base responde `PRECIO_DEBAJO_MINIMO`, sale el aviso «Precio debajo del mínimo — <artículo>: mínimo RD$ X», en vez del texto técnico. La venta no se pierde: se puede corregir y cobrar otra vez.
- `parches-seguros.js`: `b=6064` → `b=6065`.

## Datos que ya estaban debajo del mínimo (no se tocaron)
En «Correduría de Seguros» (`1ab0fcb7…`):
- «CELULAR IPHONE 11 NORMAL»: precio por mayor 9,000 y nivel 9,000, con mínimo 10,000.
- «BATERIA IPHONE 8G ORIGINAL»: nivel 400, con mínimo del nivel 4,000 (posible error al escribir el número).

Desde ahora, un empleado no podrá vender esos artículos a esos precios. Hay que corregir el dato en la ficha del artículo. Queda pendiente con el dueño.

En los últimos 30 días no hubo ninguna venta por debajo del mínimo.

## Pruebas
- `qa-pos-cubre6`: 16/16. Incluye la nueva prueba del aviso, a 390 y 1280 px.
- En verde: `apartar`, `compra-segura`, `itbis-linea`, `volumen`, `cobro-caja`, `fase1` y `fase2`.
- `margen`: 84/4, las mismas 4 fallas ya conocidas.

## Estado
- La regla en la base ya está activa.
- El aviso en pantalla está en la rama `claude/pos-precio-servidor`, sin publicar.
