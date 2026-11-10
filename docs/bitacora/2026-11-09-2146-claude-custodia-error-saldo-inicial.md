# Custodia de fondos · «No se pudieron cargar las cifras» (error 42702) — arreglado en la base

## Reporte del dueño
Captura del iPhone (09-nov, 9:43 p. m.): en Custodia de fondos salía «No se pudieron cargar las cifras. … column reference "saldo_inicial" is ambiguous».

## Diagnóstico
- La pantalla llama a `seguros_resumen_ciclo_admin`. Dentro de esa función, las columnas internas se llamaban igual que sus columnas de salida, y Postgres no sabía a cuál se refería `saldo_inicial`.
- Reproducido con el usuario administrador simulado: mismo error, en la línea del `RETURN QUERY` de esa función.
- **No lo causó el cambio de «Salidas».** Los registros de Postgres muestran el mismo error el 09-nov a las 14:02 y de 16:12 a 16:22 (UTC), horas antes de aplicar las salidas (23:46 UTC). Esa función no se tocó en la entrega de salidas. No se revisaron registros de días anteriores, así que no se sabe desde cuándo fallaba.

## Arreglo
- Migración aplicada `seguros_resumen_ciclo_admin_sin_ambiguedad` (archivo `supabase/migrations/20261110014800_…`): las columnas internas pasan a llamarse `x_…`. Misma firma, mismo cálculo y mismas columnas de salida.

## Pruebas
- Antes de aplicar, dentro de un bloque revertido y con el administrador simulado: la función devuelve Esterlin (saldo final 2,067,910) y Robinson (419,690), diferencia 0 y total cobrado del ciclo 284,500. Son las mismas cifras de la auditoría.
- Después de aplicar, con el administrador simulado, todas responden sin error: `seguros_resumen_ciclo_admin` (2026-09 y 2026-10), `seguros_cierre_ciclo_admin`, `seguros_reporte_mensual_admin`, `seguros_salidas_ciclo` y `seguros_resumen_ciclo_agente`.
- No probado: la pantalla real en el iPhone del dueño (debe tocar «Reintentar»).

## Pendiente
- Las pruebas de pantalla usan datos simulados y por eso no vieron este error. Conviene una prueba que llame a las funciones reales con un usuario de prueba.
- Esta rama (`claude/fix-resumen-ciclo-admin`) solo trae el archivo de la migración y esta bitácora; falta unirla a `main`.
