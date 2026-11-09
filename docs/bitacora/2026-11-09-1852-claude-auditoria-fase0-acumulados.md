# Auditoría Fase 0 · acumulados, transferencias y cierre por ciclo (solo lectura)

## Pedido del dueño
«¿Qué mejoras le podemos hacer a NEXUS PRO?» → eligió «2 · Acumulados por ciclo». Se hizo la Fase 0 de `CLAUDE.md`: auditar qué existe antes de construir. **No se cambió nada** en la base ni en el código.

## Qué existe ya (fuente de verdad, en producción)
- **Tablas:** `abonos`, `transferencias_agentes`, `entregas_admin`, `seguros_cierres_ciclo`, `seguros_cierres_ciclo_agentes`.
- **Ciclo 20→20:** `seguros_ciclo_limites(periodo)`. Corta el día 20 a las 00:00 de Santo Domingo; el inicio entra y el fin no, así que un pago no cae en dos ciclos.
- **Custodia:** `seguros_acumulado_validado_agente` (hoy) y `seguros_saldo_validado_agente_asof` (a una fecha). Suma lo cobrado y lo recibido; resta lo enviado y lo entregado. Lo pendiente de validar no cuenta.
- **Reporte del ciclo:** `seguros_resumen_ciclo_agente_core` y `seguros_resumen_ciclo_admin`. Dan saldo inicial, cobrado, transferido, recibido, entregado, saldo final y diferencia de reconciliación. Atribuyen por la fecha real del cobro (o de su validación), no por el período de la factura.
- **Cierre:** `seguros_cerrar_ciclo_core`, que no cierra si hay descuadre. Corre solo el día 20 a las 00:05 RD (tarea `seguros-cierre-ciclo-20`). Hay cierres guardados de 2026-08 y 2026-09.
- **Transferencias:** `transferencias_crear / aceptar / rechazar` (pendiente → aceptada).
- **WhatsApp (automatizaciones activas):** `transferencia_confirmada_emisor`, `transferencia_recibida`, `transferencia_admin_resumen` (solo si el admin no participa), `resumen_ciclo_agente`, `cierre_ciclo_fallido`, `pago_validado_agente_ciclo` y `pago_validado_admin_ciclo`.
- **Pantalla:** `parches-reporte-ciclo-agentes.js` (pestañas Ciclo y Consolidado; usa `seguros_resumen_ciclo_admin`, `seguros_cierre_ciclo_admin` y `seguros_reporte_mensual_admin`).

## Comprobación con datos reales (09-nov-2026)
- Diferencia de reconciliación = **0** en todos los ciclos, de 2026-05 a 2026-10, para los dos agentes.
- Transferido = recibido en cada ciclo (130,800 / 90,910 / 129,900): ninguna transferencia aumenta lo cobrado.
- Custodia hoy: Robinson RD$ 419,690 · Esterlin RD$ 2,067,910. Hay 5 pagos por validar (RD$ 21,000) que no cuentan todavía.
- Transferencias: 24 aceptadas (RD$ 351,610), la última el 11-ago. Desde entonces el dinero pasa por «entrega directa» (415 vigentes, RD$ 2,041,300).

## Lo que falta o no cuadra
1. **El cierre guardado de agosto no coincide con el cálculo de hoy.**
   - Guardado: cobrado 401,300, saldo final 1,727,500.
   - Hoy: cobrado 409,300, saldo final 1,735,500.
   - Diferencia: +4,000 Robinson y +4,000 Esterlin en cobrado, y 4,500 de entrega directa que pasó a septiembre (cambio aprobado el 15-oct).
   - Ningún abono de ese ciclo fue editado ni reversado. Causa **probable, no demostrada**: la reparación del 23-sep (`validar_pagos_confirmados_sin_aviso_20260925`) validó pagos viejos sin poner la fecha de validación, y sin esa fecha el cálculo los ubica en la fecha del pago (agosto).
   - Septiembre sí coincide.
2. **La custodia del administrador nunca baja.** No hay un movimiento de salida (depósito al banco o pago a la aseguradora). Por eso Esterlin acumula RD$ 2.07 millones «en su poder».
3. **El «Consolidado» es por ciclo, no por mes calendario** («el mes identifica el período de apertura del ciclo»). `CLAUDE.md` pide cierre mensual y «dos ciclos dentro del mismo mes».
4. **Histórico aproximado.** 293 pagos validados sin fecha de validación (el último el 8-sep) y las 24 transferencias sin fecha de aceptación. Desde el 20-sep no hay ninguno nuevo. Afecta solo la ubicación por ciclo de lo anterior a esa fecha.
5. **Casos de QA de `CLAUDE.md`:** no se corrieron en esta auditoría como batería. Falta dejarlos como prueba repetible.
6. **Documentos desactualizados.** `CLAUDE.md` y `docs/MEMORIA.md` dicen que la iniciativa está por empezar; en realidad las fases A, B y C están en producción.

## Riesgos
- Si se vuelve a guardar el cierre de agosto, cambia una cifra ya enviada por WhatsApp. Necesita el OK del dueño.
- El punto 2 es una decisión de negocio, no un error.

## Siguiente paso recomendado
Que el dueño decida, en este orden: (a) qué hacer con el cierre de agosto; (b) si quiere registrar salidas del administrador; (c) si el consolidado debe ser por mes calendario. Después, una batería de QA repetible y actualizar `CLAUDE.md` y la memoria.

## Estado
- Rama `claude/review-claude-md-jpzk7k`. Solo esta bitácora. Sin migraciones ni publicación.
