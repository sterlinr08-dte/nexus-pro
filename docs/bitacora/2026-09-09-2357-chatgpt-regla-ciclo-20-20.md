## ChatGPT — 2026-09-09 23:57

# Regla de negocio confirmada por el dueño — ciclo 20 a 20

El dueño confirmó explícitamente la regla de corte para NEXUS PRO Seguros:

> "De 20 a 20 de cada mes inicia y cierra ciclo"

## Regla definitiva

- Cada ciclo **inicia el día 20 de un mes a las 00:00, hora de República Dominicana**.
- El mismo ciclo **cierra el día 20 del mes siguiente a las 00:00**.
- El instante exacto del cierre es a la vez el inicio del ciclo siguiente, por lo que no debe existir hueco ni solapamiento entre ciclos.
- Ejemplo: ciclo `2026-08` = desde 20-ago-2026 00:00 hasta 20-sep-2026 00:00, zona `America/Santo_Domingo`.
- Los reportes, acumulados, transferencias, cierres y consolidado mensual de Fase C deben respetar esta misma regla server-side y no mantener una segunda interpretación en frontend.

## Estado técnico actual

La Fase A ya usa `seguros_ciclo_limites(p_periodo)` con el día configurado del ciclo y `America/Santo_Domingo`; hoy el valor efectivo es día 20. Esta decisión del dueño confirma que **20 es la regla de negocio que debe quedar fija para los cierres de seguros**.

## Punto todavía separado

Esta confirmación define el **inicio/cierre del ciclo**, pero no cambia por sí sola la semántica de qué fecha asigna un pago bancario al ciclo cuando el cliente paga antes del corte y el administrador valida después. La implementación actual usa la **fecha de validación** para transferencias/depósitos bancarios validados. Ese criterio debe mantenerse salvo instrucción expresa distinta del dueño.

## Siguiente paso

Construir Fase C sobre esta regla: cierre por ciclo 20→20, histórico por agente, consolidado mensual y tratamiento de agentes desactivados que hayan tenido movimientos o custodia en el período.
