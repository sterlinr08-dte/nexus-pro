# POS 6049 publicado (16-nov-2026)

- Dueño: «Publícalo». PR #489 (squash `f783bb4`). Verificado en vivo `b=6049`.
- Detalle: entrada `…-claude-pos-boutique-aura-contable.md` (número de asiento real del servidor, compra de contado sale de caja,
  inventario inicial y ajustes asentados, resumen con monto del documento, categoría desde la ficha).
- Demo real a 390 px: Inicio con 4 tarjetas; la ficha del artículo ofrece «+ Nueva categoría…»; el Resumen contable muestra
  «Venta CO00000008 RD$ 1,650.00» (monto de la factura); 0 errores de JS.
- **No verificado:** que la base acepte los tipos de asiento nuevos `inventario_inicial` y `ajuste_inventario` (si hay una restricción,
  ese asiento no se guarda; el movimiento de inventario sí). Se comprueba con la tarjeta de permiso pendiente.
- No se tocaron datos de Boutique Aura (caja abierta, asientos viejos).
- Pendiente: tarjeta de permiso (borrar tienda de prueba `colmado-prueba-claude`, asientos de la demo, comprobación de arriba); variantes
  talla/color; 5 reportes de inventario estilo Infoplus; e-CF allowlist; demo con proveedores y ventas; demo.nexusprord.com; contabilidad Bayol.
