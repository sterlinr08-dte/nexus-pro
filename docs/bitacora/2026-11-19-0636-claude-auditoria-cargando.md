# 19-Nov-2026 06:36 (RD) — Claude — Auditoría: «cargando» y doble toque (solo lectura)

## Pedido
- El dueño: «Revisa qué pantallas no tienen buen cargando».
- Se revisaron dos cosas en `main` (6070):
  1. los botones que guardan, sobre todo los de dinero: ¿se bloquean mientras guardan?
  2. lo que se ve mientras llegan los datos de cada pantalla, y si la carga falla.
- No se cambió nada del sistema.

## A. Botones que pueden guardar dos veces (doble toque)
| Riesgo | Pantalla | Archivo | Qué pasa |
|---|---|---|---|
| Alto | POS · Confirmar venta | `parches-pos.js:4352` | Sin bloqueo. `_ventaOperacionId` se crea tarde (4527) y se borra al terminar (4545); un segundo toque tardío puede hacer otra venta. |
| Alto | POS · Nota de crédito | `parches-pos.js:6979` | Sin bloqueo ni llave: dos notas y dos salidas de caja. |
| Alto | POS · Movimiento de caja | `parches-pos.js:9068` | Sin bloqueo ni llave. |
| Medio | POS · Anular venta | `parches-pos.js:6781` | Sin bloqueo después del confirmar (no verificado si devuelve stock dos veces). |
| Medio | Seguros · Registrar pago con bauche | `parches-bauche-unico.js:314` | Espera al servidor antes de bloquear el botón; hay una ventana corta. |
| Medio | Seguros · Aceptar transferencia | `parches-seguros-base.js:5709` | Sin bloqueo ni llave (no verificado si el servidor rechaza la segunda). |
| Bajo | Egresos, Depositar/Confirmar entrega, Anular factura desde el menú | varios | Sin aviso visible; protegidos por llave o el repetir no cambia nada. |
| OK | Registrar pago normal, Transferir, Entregas, Salidas de custodia, Validar/Rechazar pago, Generar facturas, Guardar cliente, Asiento manual, WhatsApp | — | Se bloquean antes de guardar y casi todos llevan llave anti-duplicado. |

## B. Pantallas mientras cargan o si falla la carga
- **Causa principal:**
  - `cargarTodo()` (`index.html:13763`) solo muestra un error y un aviso si falla (13808), sin «Reintentar»;
  - muchas capas convierten un error en lista vacía (`catch → []`);
  - resultado: la pantalla dice «No hay…» o RD$ 0 como si fuera real.
- **Mal:**
  - Cobros del cliente (`index.html:17493`) muestra la lista del cliente anterior mientras carga;
  - Solicitudes y «Pagos pendientes por validar» dicen «No hay pagos pendientes» si la consulta falla;
  - Detalles de cobro, Cliente 360 y línea de tiempo: «Sin…» si falla;
  - Inicio: «Cobrado hoy» en RD$ 0 si falla;
  - Contabilidad: RD$ 0 mientras carga o si falla;
  - Facturas invita a «Generar» si falló la carga;
  - POS Reportes y saldos de clientes en 0 (Reportes además guarda el rango vacío);
  - WhatsApp: al abrir un chat se puede quedar en «Cargando…».
- **Regular:** Clientes, Pólizas, Reportes de antigüedad, Usuarios y buscador dicen «Sin resultados» si falló la carga inicial. La lista de WhatsApp se queda en esqueleto sin «Reintentar». Las pestañas del POS no avisan mientras cargan.
- **Bien:** Historial de pagos, Custodia, Salidas, CRM, Reporte del ciclo 20→20 (aunque le falta «Reintentar»).
- **Piezas reutilizables:**
  - `div.loading` (que `parches-rapidez.js` convierte en esqueleto);
  - `.nxWaSkRow` y `.nxSkNum`;
  - `#nxLinea` (línea de progreso global);
  - `.nxIG-sk`;
  - `vacioHTML(...)` con «Volver a intentar» (`parches-facturas-cobros-ui.js:68`).

## Siguiente paso recomendado
1. POS: bloquear Confirmar venta, Nota de crédito, Movimiento de caja y Anular venta (riesgo de dinero doble).
2. Seguros: bloquear Registrar pago con bauche y Aceptar transferencia.
3. Carga fallida: aviso «No se pudo cargar · Reintentar» en lugar de «No hay…» o RD$ 0, empezando por `cargarTodo`, Solicitudes y Cobros del cliente.
- Espera la decisión del dueño. Sin cambios de código.
