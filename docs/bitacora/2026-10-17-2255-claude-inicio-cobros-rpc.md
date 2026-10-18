# Inicio: cobros en una sola consulta resumida (59.33, sin publicar) — Claude

Continúa `docs/bitacora/2026-10-17-2217-claude.md` (auditoría del Inicio), punto 2.

## Pedido del dueño
- «Continúa»: hacer el punto 2 de la propuesta (Inicio de NEXUS con menos descarga), en rama y sin publicar.

## Fuente de verdad y diagnóstico
- La gráfica de 6 ciclos 20→20, el «Cobrado» del ciclo, la comparación con el ciclo anterior al mismo día, el calendario y «Hoy, en vivo» salen de **`public.abonos`** (fecha timestamptz, monto).
- Antes, `rChartCobros()` bajaba **todos** los abonos (`select=fecha,monto`, sin orden ni filtro) al abrir el Inicio y cada 30 s. Si el proyecto tiene el tope de 1,000 filas, esa lista se iba a recortar en silencio al crecer.
- No se tocó dinero: no hay sumas nuevas ni otra fuente. Las transferencias y las entregas no entran aquí, igual que antes.

## Cambios
- `supabase/migrations/20261018130000_seguros_inicio_cobros.sql` (**sin aplicar**):
  - función `seguros_inicio_cobros(p_hoy date) → jsonb` con `dias` (suma y cantidad por día de RD, UTC-4 igual que `fechaRD`) y `filas` (pagos sueltos de hoy y de ayer, con su hora);
  - solo lectura y SECURITY INVOKER, así que se aplica la misma RLS de `abonos`;
  - execute solo para `authenticated`; la reversa está al final del archivo.
- `index.html`:
  - nueva `nxInicioAbonos(hoyIso)`, que convierte la respuesta en la misma lista de antes (un renglón por día con `_n` y los pagos reales de hoy y ayer). Si la función no existe, baja la lista completa como siempre.
  - `rChartCobros()` la usa.
  - El calendario cuenta los pagos con `a._n||1`.
  - `APP_VERSION='59.33'`.
- Sin cambios en otras pantallas (Cobros, reportes, cierre) ni en `ST`.

## Pruebas
- Base real, solo lectura (cuerpo de la función como SELECT):
  - 80 días, suma RD$2,226,600 y 452 pagos, igual que la tabla completa;
  - ciclo actual (desde el 20-sep): RD$443,700 por los dos caminos;
  - respuesta de ~3 KB contra ~26 KB antes.
- Prueba de la conversión en Node con 903 pagos sintéticos, incluidos los bordes 03:59Z y 04:00Z: suma por día, cantidad por día y pagos de hoy y ayer **idénticos** a la lista completa. El respaldo sin función también da lo mismo.
- `node --check` del script principal: OK.

## Riesgos y pendientes
- Para publicar hay que aplicar la migración (no tiene drop ni delete, así que pasa por la API) y llevar la rama a `main`.
- El sondeo de «hoy» cada 30 s sigue igual: ya pedía solo los pagos de hoy.
- Pendientes de la auditoría: `cargarTodo` (6 tablas completas), `asientos` (1,014 filas) y `nxSyncDatos`.

## Rama
- `claude/inicio-cobros-rpc` (desde `main` 56022bc). Sin publicar.
