## ChatGPT — 2026-09-10

# Fase C — cierre contable oficial 20 → 20 (PREPARADO, NO PUBLICADO)

## Decisión confirmada por el dueño

La regla de negocio queda fijada así:

- Cada ciclo **abre el día 20 a las 00:00** y **cierra el día 20 del mes siguiente a las 00:00**, zona `America/Santo_Domingo`.
- El periodo se identifica por el mes en que **abre**. Ejemplo: `2026-08` = 20-ago-2026 00:00 → 20-sep-2026 00:00.
- En el instante en que cierra un ciclo empieza el siguiente; no hay huecos ni solapamientos.
- Para `Transferencia`/`Depósito` bancario se mantiene la semántica ya usada por Fase A: el pago pertenece al ciclo por la fecha de **validación** (`validado_at`), no por la fecha en que fue capturado.
- Las transferencias entre agentes mueven custodia; **no** son cobros nuevos y no inflan el total real cobrado.

## Implementación preparada

Rama: `chatgpt/fase-c-cierre-ciclo-20`

Migración nueva:

`supabase/migrations/20260910002000_seguros_cierre_ciclo_20.sql`

### Qué agrega

1. `seguros_resumen_ciclo_agente_core()`
   - Core privado de la matemática que ya pasó QA en Fase A.
   - Permite que el cierre automático use exactamente la misma fuente de verdad sin depender de una sesión de navegador/JWT.

2. Wrappers autorizados de reporte
   - `seguros_resumen_ciclo_agente()` conserva acceso por agente/admin.
   - `seguros_resumen_ciclo_admin()` ahora incluye también a un agente desactivado si durante el ciclo tuvo saldo, cobros, transferencias, entregas, reversas o custodia. Esto cierra el riesgo señalado por Claude: desactivar a un agente ya no lo hace desaparecer del reporte histórico.

3. Snapshots inmutables
   - `seguros_cierres_ciclo`
   - `seguros_cierres_ciclo_agentes`
   - Una vez cerrado un periodo, el snapshot no se recalcula. Esto evita que una reversa o ajuste posterior cambie silenciosamente un cierre ya reportado.

4. Cierre manual e interno
   - `seguros_cerrar_ciclo_core(periodo,origen,user)` — privado, idempotente y con advisory lock.
   - `seguros_cerrar_ciclo(periodo)` — admin.
   - No permite cerrar un ciclo antes de su `ciclo_fin`.

5. Reportes
   - `seguros_cierre_ciclo_admin(periodo)` devuelve el snapshot por agente.
   - `seguros_reporte_mensual_admin(mes)` consolida todos los ciclos que hayan cerrado dentro del mes calendario; normalmente será uno, pero no pierde detalle de ciclos si hubiera más de uno por correcciones/importaciones futuras.
   - El saldo final mensual es el del último cierre, **no** la suma de saldos finales.
   - El total real del negocio suma solamente `cobrado_validado`, nunca transferencias internas.

6. Automatización
   - Cron `seguros-cierre-ciclo-20` a `5 4 20 * *`.
   - Eso corresponde a las **00:05 del día 20 en República Dominicana**.
   - Se ejecuta cinco minutos después de la frontera para no competir con procesos que terminen exactamente a medianoche.
   - Cierra el periodo que abrió el día 20 del mes anterior.

## Estado

**Nada de Fase C está aplicado todavía a Supabase producción.**

La migración está solo en rama para revisión cruzada. No se han creado tablas, RPC nuevas ni cron de Fase C en producción.

## Qué debe revisar Claude

Antes de publicar, revisar especialmente:

1. Que el core sea matemáticamente idéntico a la versión corregida de Fase A (`20260909222500_seguros_resumen_ciclo_reversas.sql`).
2. Que el filtro de agentes inactivos cubra a cualquiera con actividad/custodia sin inflar el total.
3. Que `seguros_cerrar_ciclo_core` sea realmente idempotente ante doble ejecución manual/cron.
4. Que el snapshot no pueda mutarse desde `authenticated`/`anon`.
5. Que el cron UTC corresponda a 00:05 RD durante todo el año (República Dominicana no usa DST).
6. Que `seguros_reporte_mensual_admin` no sume saldos finales entre ciclos.
7. Que no haya dependencia accidental de JWT en el cierre automático.
8. Que el cambio de `seguros_resumen_ciclo_admin()` no rompa consumidores actuales.

## Siguiente paso propuesto

Claude revisa esta rama/PR. Si no hay bloqueantes, hacer QA transaccional con rollback sobre un ciclo histórico cerrado, verificando:

- snapshot creado una sola vez;
- segunda ejecución devuelve el mismo `cierre_id`;
- 6/6 reconciliaciones históricas permanecen en RD$0;
- agente desactivado con movimiento sigue apareciendo;
- total real no incluye transferencias internas;
- cron queda exactamente 20→20;
- rollback deja cero residuo.

Después de ese QA, pedir/usar autorización explícita del dueño para publicar Fase C en producción.
