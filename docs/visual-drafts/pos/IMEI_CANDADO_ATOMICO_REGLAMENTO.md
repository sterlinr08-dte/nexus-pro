# Adición propuesta — Reglamento de Venta / IMEI

12. Un IMEI se toma de forma ATÓMICA al confirmar la venta. Verlo como `disponible` en el selector no garantiza que siga disponible segundos después: la base de datos es la autoridad final. Dos cajeros nunca pueden adjudicarse el mismo IMEI.

13. Al iniciar la confirmación, cada IMEI elegido pasa temporalmente de `disponible` a `reservado`. La reserva pertenece a una sola operación, vive en la base de datos y vence en aproximadamente 60 segundos si la venta no termina. Solo una reserva válida puede convertir el IMEI a `vendido`.

14. Si uno solo de los IMEI seleccionados ya no está disponible, se rechaza la reserva COMPLETA y se obliga a re-elegir. Nunca se confirma parcialmente una línea serializada.

15. Si la venta todavía NO existe y falla su creación, cualquier reserva IMEI de esa operación se libera.

16. Si la venta YA existe y falla la confirmación final de uno o más IMEI, la venta NO se revierte y nunca se informa al usuario que “no se pudo cobrar”. Se registra `POS_VENTA_IMEI_SIN_CONFIRMAR`, se avisa que existe una incidencia administrativa y NO se libera la reserva a ciegas.

17. Las RPC de reserva/confirmación/liberación solo pueden ejecutarlas usuarios `authenticated`; no quedan ejecutables por `public`.

18. Los errores deben diferenciar al menos entre IMEI ya no disponible, sesión/organización inválida y error técnico de la RPC, para no atribuir falsamente todos los fallos a otro cajero.

## Evidencia del hueco actual

El código vivo en `main` marca los IMEI vendidos al final con un `PATCH pos_seriales` filtrado solo por `id=eq.<id>`, ejecutado como `best-effort` y sin esperar el resultado. No exige `estado=eq.disponible`, por lo que dos cajas pueden seleccionar el mismo IMEI y la segunda puede sobrescribir `venta_id` de la primera.

## Alcance de esta tanda

Solo cierra concurrencia de venta IMEI. No mezcla todavía transferencias, ubicación por almacén, selectores por almacén, compra serializada, RMA, garantías ni trade-in.
