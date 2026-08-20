-- NEXUS PRO — Transferencia de inventario con IMEI atómica
-- Prueba MANUAL de concurrencia REAL (punto 4 de la revisión de ChatGPT).
--
-- POR QUÉ ESTA PRUEBA ES MANUAL Y NO AUTOMÁTICA (honesto, no una excusa):
-- este entorno de sesión ejecuta cada llamada de `execute_sql` en su PROPIA conexión de base de
-- datos — no hay forma de mantener dos conexiones abiertas AL MISMO TIEMPO desde aquí para hacerlas
-- competir de verdad. Se investigaron las 2 rutas que sí lo permitirían y ninguna está disponible
-- en este proyecto (verificado contra `pg_extension`, no supuesto):
--   - `dblink` / `postgres_fdw`: NO instaladas.
--   - `pg_net` (sí instalada): permite disparar peticiones HTTP async desde SQL, pero para llamar
--     la RPC real por PostgREST hace falta un JWT de un usuario autenticado — esta sesión no tiene
--     forma de emitir/obtener uno desde SQL puro (ya documentado como límite del entorno en otras
--     partes de este mismo proyecto, ej. la verificación de la función Edge de Financiamiento).
-- Por eso la prueba de la ronda anterior fue SECUENCIAL (dos llamadas una detrás de otra, no dos
-- sesiones solapadas) — y por eso NO se presenta como equivalente a concurrencia real, tal como se
-- pidió. Lo que sigue es un guion literal para que un humano (el dueño o ChatGPT, con acceso a 2
-- pestañas del SQL Editor de Supabase, o `psql` en 2 terminales) lo ejecute y observe el candado de
-- fila REAL en acción — contra un proyecto de PRUEBA/staging, nunca contra producción.
--
-- QUÉ DEMUESTRA: el candado no es un artefacto de la prueba — es el mecanismo nativo de Postgres.
-- Un `UPDATE ... WHERE <condición>` sobre una fila que otra transacción YA tiene bloqueada (porque
-- la tocó y no ha hecho COMMIT/ROLLBACK todavía) se QUEDA ESPERANDO — no lee un valor "viejo" ni se
-- adelanta — hasta que la primera transacción termina; recién ahí reevalúa su propio WHERE contra el
-- estado ya definitivo. Es el mismo primitivo que ya usan en producción `pos_reservar_seriales` y
-- `pos_transferir_stock`; esta prueba solo lo hace VISIBLE para un humano, insertando una pausa
-- deliberada (`pg_sleep`) en el medio para poder alternar entre las 2 pestañas a tiempo.

-- ============================================================================================
-- ESCENARIO A — dos transferencias compitiendo por el MISMO stock del MISMO almacén
-- ============================================================================================
-- Requiere: un producto NO serializado real (o de prueba) con stock > 0 en un almacén de origen.
-- Sustituir <ORG>, <PRODUCTO>, <ALMACEN_ORIGEN>, <STOCK_ACTUAL> por valores reales de un proyecto
-- de PRUEBA antes de correr esto — NUNCA contra producción.

-- --- PESTAÑA 1 (correr primero, se queda esperando en el pg_sleep) ---
begin;
  -- Toma el candado de fila y se queda 15s con la transacción ABIERTA (sin commit todavía).
  update pos_stock_almacen
     set stock = stock - 1
   where producto_id = '<PRODUCTO>' and almacen_id = '<ALMACEN_ORIGEN>' and organizacion_id = '<ORG>'
     and stock >= 1
  returning stock;                                 -- <- anota el valor que devuelve aquí
  select pg_sleep(15);                              -- ventana para alternar a la Pestaña 2 AHORA
commit;

-- --- PESTAÑA 2 (correr MIENTRAS la Pestaña 1 está en el pg_sleep, no después) ---
-- Se va a quedar "colgada" (sin responder) hasta que la Pestaña 1 haga COMMIT — eso es lo que hay
-- que observar: NO lee el stock de antes de la Pestaña 1, espera a que termine.
update pos_stock_almacen
   set stock = stock - 1
 where producto_id = '<PRODUCTO>' and almacen_id = '<ALMACEN_ORIGEN>' and organizacion_id = '<ORG>'
   and stock >= 1
returning stock;
-- Resultado esperado: en cuanto la Pestaña 1 hace COMMIT, esta consulta despierta sola y devuelve
-- el stock YA DESCONTADO por la Pestaña 1 menos 1 más — nunca los dos restan del mismo valor
-- "viejo". Si el stock alcanzaba para una sola unidad, esta 2ª resta debe devolver CERO FILAS
-- (`stock >= 1` ya no se cumple) — la misma señal de "TRANSFER_STOCK_INSUFICIENTE" que usa la RPC.

-- ============================================================================================
-- ESCENARIO B — una transferencia y una VENTA compitiendo por el MISMO IMEI
-- ============================================================================================
-- Requiere: un `pos_seriales.id` real de prueba, `estado='disponible'`, en el almacén de origen.

-- --- PESTAÑA 1: simula la RESERVA de una venta (la RPC real pos_reservar_seriales) ---
begin;
  select pos_reservar_seriales(array['<SERIAL_ID>']::uuid[]) as token; -- toma el candado
  select pg_sleep(15);                                                  -- ventana para alternar
commit;

-- --- PESTAÑA 2 (correr MIENTRAS la Pestaña 1 está en el pg_sleep) ---
-- Intenta transferir ESE MISMO IMEI. Debe quedarse esperando y, cuando la Pestaña 1 haga commit
-- (dejando el serial en estado='reservado'), la transferencia debe VER que ya no está 'disponible'
-- y fallar limpio con TRANSFER_IMEI_NO_DISPONIBLE — nunca los dos "ganan" el mismo IMEI a la vez.
select pos_transferir_stock(
  '<ALMACEN_ORIGEN>'::uuid, '<ALMACEN_DESTINO>'::uuid, current_date, 'prueba concurrencia',
  jsonb_build_array(jsonb_build_object('producto_id', '<PRODUCTO_SERIALIZADO>', 'serial_ids', jsonb_build_array('<SERIAL_ID>'))),
  'prueba manual'
);

-- ============================================================================================
-- Cómo leer el resultado en los 2 escenarios: si la Pestaña 2 SIEMPRE tarda visiblemente en
-- responder (hasta que la Pestaña 1 libera el candado con commit) y el resultado final es
-- consistente con lo que la Pestaña 1 ya dejó (nunca un número que ignora lo que la Pestaña 1
-- hizo), el candado de fila está funcionando bajo concurrencia real — no solo en el orden
-- secuencial en que se probó desde este entorno.
