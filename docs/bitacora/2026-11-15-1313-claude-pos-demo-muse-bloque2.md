# 15-nov-2026 — Claude — Demo del POS, bloque 2 de los hallazgos de Muse (rama, sin publicar)

Bloque 1 publicado antes con el PR #479 (build 6040; verificado en vivo: 0 muestras con la pantalla de Seguros al recargar; menú de la demo sin Entidades, CRM, RRHH, Cuotas, Apartados; con Contabilidad).

## Causa común de los hallazgos 6 y 7
Al cobrar (`nxPosConfirmar`), la venta se creaba en el servidor pero la pantalla no actualizaba su memoria: `_ventas` no recibía la venta nueva y `_prods[].stock` / `_stockAlmRows` seguían con el valor viejo hasta recargar.

## Cambios en `parches-pos.js` (build 6041)
- **5 — un solo número a la vista:** el aviso «Venta registrada» y el título del ticket muestran el número de factura de la empresa (`numero_factura`); `venta.numero` (contador común a todas las empresas) queda solo como respaldo cuando no hay número de factura.
- **6 — «Últimas ventas» del Inicio:** la venta recién hecha entra a `_ventas`; además la fecha se compara en hora local (antes, después de las 8 p. m. RD, `created_at` en UTC ya era «mañana» y la venta no salía) y se excluyen las anuladas por `estado`.
- **7 — existencia al instante:** al confirmar la venta baja `stock` del artículo y de su almacén en memoria (el servidor ya lo descontó).

## Error propio detectado por las pruebas y corregido
`qa-pos-compra-segura` falló 49/50 («e-CF: la factura carta trae el QR de la DGII»): la venta que agregué a `_ventas` no llevaba los campos `ecf_*`, y la factura carta la tomaba de ahí. Se agregaron esos campos. Resultado final: compra-segura 50/50, ecf-caja 59/59, cubre6 14, volumen 51, fase1 36, fase2 11, negocio 26, prefactura 18, contabilidad 8.

## No probado
Una venta real de punta a punta con estos cambios (solo regresión con base simulada). `scripts/test-pos-venta-atomica.mjs` falla también en `main` (espera `APP_VERSION='58.37'`): prueba vieja, no relacionada.

## Pendiente (Muse)
Bloque 3: aviso de caja cerrada antes de cobrar + botón abrir caja; ITBIS por línea. Bloque 4: existencia en la cuadrícula angosta (~500 px) y agregar con un toque.
