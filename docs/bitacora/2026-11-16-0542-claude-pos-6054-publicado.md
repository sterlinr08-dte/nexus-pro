# POS 6054 publicado (16-nov-2026)

- Dueño: «Publícalo». PR #499 (squash `c307afa`). Verificado en vivo `b=6054`.
- Contenido: pedidos entre almacenes y reportes Solicitudes de inventario / Requisiciones pendientes (detalle en `…-claude-pos-pedidos-almacen.md`).
- Demo real a 390 px: las 4 funciones de pedidos están cargadas; la demo tiene **un solo almacén**, así que el botón «Pedidos» no aparece
  (es lo correcto: necesita 2 o más). Los dos reportes abren vacíos con su explicación; 0 errores de JS.
- El recorrido completo (pedir → despachar → rechazar) no se pudo probar en vivo por eso; pasó en el ensayo con vuelta atrás de la base
  (transferencia real incluida) y en `qa-pos-pedidos-almacen` (28/28).
- De los 6 de Infoplus faltan solo «Faltante orden compra» (requiere órdenes de compra).
