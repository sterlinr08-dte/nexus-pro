# 15-nov-2026 — Claude — Demo del POS, bloque 4 de los hallazgos de Muse (rama, sin publicar)

Bloque 3 publicado con el PR #481 (build 6042, verificado en vivo).

## Cambios en `parches-pos.js` (build 6043)
- **1 — Existencia a la vista en la lista angosta:** la columna de existencia (`.vstk`) solo se mostraba desde 620 px. Ahora, por debajo, la existencia va en la segunda línea de cada artículo («Bebidas · 119 und», «Bajo: 3 und» en naranja, «Agotado» en rojo, «Servicio» en azul). Desde 620 px se mantiene la columna de siempre.
- **2 — Agregar con un toque:** `nxVenderSel` agregaba nada: abría la ventana «Buscar artículo». Ahora un toque agrega 1 unidad (`nxPosAdd`, con la misma regla de existencia: no deja pasar del disponible). Los artículos con IMEI/serial siguen abriendo la ventana para elegir cuál. La ventana completa sigue en la lupa del buscador.
- Aviso único abajo («+1 Agua purificada · 2 en el carrito · RD$ 480») que se actualiza con cada toque en vez de apilar avisos; la fila parpadea en verde 420 ms (sin animación con «reducir movimiento»).
- No se encontró en la bitácora por qué tocar abría la ventana (historial comprimido).

## Pruebas
`scripts/qa-pos-vender-toque.mjs` 24/24 a 390, 500 y 1280 px. Regresión: negocio 26, fase1 36, fase2 11, compra-segura 50, ecf-caja 59, cubre6 14, volumen 51, cobro-caja 22, prefactura 18. Captura con la sesión real de la demo a 500 px (solo se agregó al carrito; no se cobró nada).
