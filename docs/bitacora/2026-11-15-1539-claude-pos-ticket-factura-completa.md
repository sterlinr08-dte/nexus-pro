# 15-nov-2026 — Claude — Tercera prueba de Muse y botón «Factura completa» del ticket (rama, sin publicar)

## Muse confirmó en vivo (venta CO00000004, RD$210, 15/11 15:29)
- Modo claro (6045): carga en blanco, también con F5; sin botón de modo oscuro en Inicio, Vender, Caja ni menú.
- ITBIS por línea (6044): ticket «(G)/(E)», «Exento de ITBIS RD$185», leyenda; factura carta con insignias G/E y leyenda.
- «Últimas ventas»: al entrar ya estaban CO00000001–03 (Ventas hoy RD$445, 3 facturas); tras vender, CO00000004 (RD$655, 4).
- Arqueo: al abrir, «Esperado RD$420 · Contado 0 · Descuadre −RD$420» en rojo. (El −RD$235 era del cierre anterior, 14:33.) La caja de la demo quedó abierta; se limpia esta noche.

## Detalle encontrado: «Factura completa» dentro del ticket no cambiaba nada
Causa: el botón de la barra del ticket llamaba `window.opener.nxFacDocVenta(id)`, que abre la factura en una pestaña NUEVA desde la ventana principal. Como no viene de un toque en esa ventana, el navegador suele bloquearla, y el ticket se quedaba igual. (Desde el aviso «Vendido» sí funcionaba porque ahí el toque es en la ventana principal.)

Arreglo (`parches-pos.js`): `window.nxFacDocVentaAqui(id, win)` deja como destino la propia pestaña del ticket (`_facVentana = win`) y llama a `nxFacDocVenta`; el botón del ticket la usa (con el comportamiento anterior como respaldo).

## Prueba
`qa-pos-itbis-linea.mjs` 13/13 (nuevo: «Factura completa» cambia ESA pestaña a la carta sin abrir otra, 390 y 1280 px); **sin el arreglo** falla 2 (abre otra pestaña y el ticket queda igual). Regresión: compra-segura 50, ecf-caja 59, fase1 36. Build 6046.
