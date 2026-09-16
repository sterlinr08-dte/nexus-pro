# Certificación operativa NEXUS PRO POS — alcance no fiscal

Fecha: 16 de septiembre de 2026  
Repositorio: `sterlinr08-dte/nexus-pro`  
Producción: `https://nexusprord.com`  
Supabase producción: `tnwsgcxurfyuszxsewsn`

## Alcance

Esta certificación cubre la operación interna del POS y excluye deliberadamente e-CF, ITBIS fiscal, 606/607/608 y demás obligaciones impositivas pendientes de implementación o revisión.

Por esa exclusión, el resultado debe interpretarse como **certificación operativa no fiscal**, no como certificación tributaria ni legal.

## Estado

**APROBADO OPERATIVAMENTE, CON OBSERVACIONES CONTROLADAS.**

Los controles duros de integridad financiera, inventario, IMEI, caja y excepciones críticas quedaron en cero incidencias al cierre de la revisión.

## Fases implementadas y verificadas

1. Seguridad de `nexus-smart` y cierre de acceso no autorizado.
2. Centro de excepciones operativas.
3. Venta atómica: cabecera + líneas + IMEI + inventario, con idempotencia.
4. Caja independiente por cajero y cierre calculado en servidor.
5. Inventario/almacenes conciliados y movimientos atómicos.
6. Compras atómicas con artículos, stock e IMEI; reversa segura.
7. Contabilidad operativa automática no fiscal.
8. Bancos, movimientos y conciliación bancaria.
9. Cartera de crédito: vencimiento, promesas, refinanciación y castigo.
10. Apartados enlazados a cliente y reserva de IMEI.
11. Taller integrado con piezas de inventario y reclamos de garantía.
12. Monitor central de automatizaciones con objetivos, metas y alertas.
13. Cierre y reapertura de periodos contables con bloqueo de movimientos en meses cerrados.
14. Certificación final de invariantes y endurecimiento adicional de RPC internas.

## Evidencia final de integridad

Consulta final sobre la organización POS principal:

| Control | Resultado |
|---|---:|
| Ventas completadas sin líneas | 0 |
| Ventas completadas sin asiento | 0 |
| Compras recibidas sin líneas | 0 |
| Compras recibidas sin asiento | 0 |
| Asientos descuadrados | 0 |
| Productos descuadrados frente a suma por almacén | 0 |
| Stock global negativo | 0 |
| IMEI vendidos sin venta asociada | 0 |
| Excepciones críticas/altas abiertas | 0 |
| Residuos de la prueba reversible de periodo contable | 0 |

Además, en la corrida ampliada previa también resultaron en cero:

- almacenes con stock negativo;
- seriales reservados incompletos;
- usuarios con más de una caja abierta;
- cajas cerradas con descuadre sin nota;
- crédito simple sin vencimiento;
- planes de cuotas descuadrados;
- apartados activos sin cliente;
- apartados con IMEI inconsistente;
- garantías cobradas sin autorización;
- piezas usadas de taller sin almacén.

## Prueba de cierre contable

Se ejecutó una prueba como administrador dentro de una transacción reversible:

1. cierre de un mes histórico;
2. intento de insertar un asiento dentro del periodo cerrado;
3. bloqueo correcto por `CONTABILIDAD_PERIODO_CERRADO`;
4. reapertura con motivo obligatorio;
5. confirmación de estado `abierto`;
6. `ROLLBACK` completo;
7. verificación posterior: 0 filas de prueba residuales.

## Automatizaciones

El monitor detectó inicialmente un falso positivo en `monitor-automatizaciones-nexus`: al observarse a sí mismo durante su propia ejecución veía estado `running` y lo clasificaba como error antes de terminar correctamente.

Se corrigió para evaluar la última ejecución terminal y no considerar `running` como fallo. La ejecución real observada terminó `succeeded` en aproximadamente 0.6 segundos.

Quedan dos trabajos en estado `sin_ejecucion`, pero **no están vencidos**:

- `seguros-cierre-ciclo-20` — programado para el día 20 de cada mes;
- `reporte-whatsapp-agentes-diario` — programado a las 22:00 en días laborables definidos.

Ambos fueron creados antes de su primera ventana programada, por lo que `sin_ejecucion` no constituye un error operativo en esta fecha.

## Seguridad

El asesor de Supabase detectó inicialmente 10 funciones `SECURITY DEFINER` ejecutables por `anon`.

La política histórica del proyecto documenta 7 como advertencias aceptadas y necesarias para helpers de identidad/RLS/respaldo. Se identificaron 3 adicionales que sí eran exposición innecesaria y se revocó su ejecución directa para `public`, `anon` y `authenticated`:

- `trg_abono_preparar_validacion()`;
- `trg_whatsapp_pago_validado()`;
- `whatsapp_notificar_atraso_v2_base(uuid,uuid,jsonb)`.

Después del cambio, el asesor volvió al baseline histórico de 7 advertencias anónimas documentadas.

### Pendiente manual de seguridad

Supabase Auth mantiene desactivado **Leaked Password Protection**. Esta opción se activa desde el Dashboard de Supabase y no está expuesta por las herramientas disponibles en esta sesión.

Referencia oficial:
`https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection`

## Migraciones finales sincronizadas

- `20260916141339_pos_cierre_periodos_contables.sql`
- `20260916141410_pos_cierre_periodos_fix_fin_mes.sql`
- `20260916155019_operacion_monitor_ignorar_running.sql`
- `20260916155207_seguridad_revocar_rpc_internas_anon.sql`

Con esto, los cambios finales aplicados en Supabase quedaron también versionados en GitHub.

## Veredicto técnico

El POS queda certificado para operación interna no fiscal bajo las reglas y datos evaluados el 16-sep-2026.

No se declara cumplimiento fiscal ni tributario porque ese bloque fue excluido expresamente del alcance.

Dos verificaciones quedan necesariamente diferidas a su primera ventana programada: cierre de ciclo del día 20 y reporte diario de las 22:00. El monitor ya está preparado para registrar y alertar si cualquiera falla.
