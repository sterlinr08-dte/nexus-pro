# 59.80 — Solicitudes: el mismo pago ya no sale dos veces

## Pedido del dueño (05-nov-2026)
Mandó una captura de Solicitudes y preguntó «¿por qué me sale dos veces?». Era MARIA GILSA REYES MORALES, transferencia de RD$4,500 en Banreservas, ref. 243383474974: la cobró ROBINSON y el dinero entró a la cuenta de ESTERLIN.

## Diagnóstico (producción)
- Es **un solo pago** (`abonos`) que crea dos pendientes:
  1. una **entrega directa** (`entregas_admin.es_directo`, ligada por `abono_id`) que sale arriba, con Confirmar / Anular;
  2. una **validación bancaria** (`abonos.validacion_estado='pendiente'`) que sale abajo, con Validar / Rechazar.
- `seguros_confirmar_entrega_admin` confirma la entrega **y también valida el pago**.
- `seguros_validar_pago` solo valida el pago: la entrega de arriba se quedaba pendiente.
- `seguros_anular_entrega_admin` solo anula la entrega y no toca el pago.
- Hoy había 1 validación pendiente, y es este caso.

## Qué se hizo
- `parches-solicitudes-pagos-validacion.js` (`cargar`): de la lista de validaciones se esconden los pagos que tienen una entrega pendiente (sin confirmar ni anular).
  - La consulta es de solo lectura: `entregas_admin?select=abono_id&confirmado=eq.false&anulado=eq.false`.
  - Si esa consulta falla, se muestran todos, igual que antes.
- Así queda **una sola fila**: **Confirmar** resuelve todo.
- Si se **anula** la entrega, el pago vuelve a salir abajo con Validar / Rechazar, para decidir si se quita el cobro.
- No se tocó la base de datos ni las funciones del servidor.

## Pruebas
- `scripts/qa-rechazar-pago.mjs`: **27 PASS / 0 FAIL** a 390 y 1280 px, con 2 casos nuevos (un pago con entrega pendiente no sale dos veces).
- La primera corrida falló porque el servidor de prueba acababa de arrancar; la segunda pasó completa.

## Estado
Rama `claude/solicitudes-sin-duplicado`. **Sin publicar.**
