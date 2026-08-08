# Adición propuesta — Reglamento de Venta / IMEI

12. Un IMEI se toma de forma ATÓMICA al confirmar la venta. Verlo como `disponible` en el selector no garantiza que siga disponible segundos después: la base de datos es la autoridad final. Dos cajeros nunca pueden adjudicarse el mismo IMEI.

13. Al iniciar la confirmación, cada IMEI elegido pasa temporalmente de `disponible` a `reservado`. La reserva pertenece a una sola operación y vence automáticamente si la venta no termina. Solo una reserva válida puede convertir el IMEI a `vendido`.

14. Si uno solo de los IMEI seleccionados ya no está disponible, se rechaza la reserva COMPLETA y se obliga a re-elegir. Nunca se confirma parcialmente una línea serializada.

15. Marcar un IMEI vendido no es una tarea `best-effort`. Es una operación crítica: si no queda ligado a su factura, el sistema debe avisar explícitamente y dejar rastro; nunca ocultar el error.

## Evidencia del hueco actual

El código vivo en `main` marca los IMEI vendidos al final con un `PATCH pos_seriales` filtrado solo por `id=eq.<id>`, ejecutado como `best-effort` y sin esperar el resultado. No exige `estado=eq.disponible`, por lo que dos cajas pueden seleccionar el mismo IMEI y la segunda puede sobrescribir `venta_id` de la primera.

## Alcance de esta tanda

Solo cierra concurrencia de venta IMEI. No mezcla todavía transferencias, ubicación por almacén, RMA, garantías ni trade-in.
