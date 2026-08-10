-- INVENTARIO VENTA ATÓMICO — prueba MANUAL de concurrencia real
-- Pedida explícitamente por ChatGPT (bitácora, 2026-08-09 07:52, punto 5):
-- "quiero un .sql de prueba manual con dos sesiones/pestañas... No presentes la
-- prueba secuencial como concurrencia real."
--
-- Este entorno de Claude (execute_sql vía MCP) SOLO puede lanzar sentencias una
-- tras otra contra el mismo canal — nunca dos transacciones EJECUTANDO al mismo
-- tiempo de verdad. Por eso este archivo NO se corrió aquí como concurrencia
-- real — es para que un humano (o cualquier agente con acceso a 2 conexiones
-- simultáneas reales) lo ejecute a mano, en 2 PESTAÑAS DISTINTAS del SQL Editor
-- de Supabase (o 2 conexiones psql aparte), sobre el proyecto real
-- tnwsgcxurfyuszxsewsn.
--
-- CORRECCIÓN 2026-08-10 (validación de punta a punta, Claude): el SETUP de
-- este archivo tenía 5 bugs REALES que lo habrían hecho fallar (3 en el
-- primer INSERT, 2 más al llegar a la RPC) si un humano lo hubiera corrido
-- tal cual (encontrados corriendo el archivo real contra el esquema real de
-- Supabase, no a ojo):
--   1) `usuarios_sistema` NO tiene columnas `nombre`/`usuario` — son `nom`/
--      `login` (confirmado con information_schema.columns).
--   2) `pos_venta_items` NO tiene columna `producto_nombre` — es `nombre`.
--   3) El INSERT de `profiles(id, rol)` asumía que `profiles.id` podía ser
--      cualquier UUID inventado — pero `profiles.id` tiene un FOREIGN KEY real
--      a `auth.users(id)` (`profiles_id_fkey`), y `mi_organizacion()` (la
--      función que usa la RPC) NO lee `usuarios_sistema.id` directo — hace
--      `profiles.usuario_sistema_id → usuarios_sistema.organizacion_id`, un
--      campo que el SETUP original nunca llenaba. Sin las 2 cosas, la sesión
--      RLS simulada habría fallado con `INVENTARIO_SIN_ORGANIZACION` en la
--      primera llamada a la RPC. Arreglado abajo: se crea una fila real (y
--      descartable) en `auth.users` con el mismo patrón que ya usa el propio
--      sistema para altas de staff reales (`crypt()` + columnas de token en
--      `''`, documentado en CLAUDE.md), y `profiles.usuario_sistema_id` queda
--      ligado a la fila de `usuarios_sistema` de prueba.
--   4) El Caso A creaba sus 2 ventas SIN mandar `inventario_aplicado`
--      explícito — correcto bajo el diseño VIEJO (donde el default terminaba
--      en `false`), pero desde el corte de migración v2 (ver
--      INVENTARIO_VENTA_ATOMICO_migracion.sql) el default es `true` PARA
--      SIEMPRE — así que esas 2 ventas nacían "ya aplicadas" y la RPC no
--      tenía nada que hacer (`ya_aplicado:true, lineas:0` en la 1ra llamada,
--      en vez de aplicar de verdad). Arreglado: el INSERT del Caso A ahora
--      manda `inventario_aplicado:false` explícito, igual que ya hacía el
--      Caso C — el mismo contrato que ahora usa el JS real. El Caso B ya
--      estaba bien (usa un `UPDATE ... SET inventario_aplicado=false`
--      explícito para su reset, no depende de ningún default de INSERT).
--   5) Los 3 INSERT a `pos_venta_items` (Casos A, B y C) nunca mandaban
--      `organizacion_id` — el trigger `set_organizacion_id()` de esa tabla
--      solo rellena si está vacío, LEYENDO `mi_organizacion()` en ese
--      instante; corriendo el INSERT bajo el rol privilegiado del SQL Editor
--      (sin sesión RLS todavía), `mi_organizacion()` da null, así que la fila
--      quedaba con `organizacion_id=null`. El `WITH CHECK` de la política de
--      esa tabla acepta null (el INSERT no fallaba), pero el `USING` para
--      LEER exige `organizacion_id = mi_organizacion()` — no acepta null. La
--      sesión `authenticated` de más abajo nunca veía esas filas, y la RPC
--      fallaba con `INVENTARIO_VENTA_SIN_ITEMS` aunque las filas sí
--      existieran. Arreglado: los 3 INSERT ahora mandan `organizacion_id`
--      explícito.
-- Los 3 casos (A, B, C) y sus expectativas NO cambiaron — solo el SETUP.
--
-- Requisito: la migración (INVENTARIO_VENTA_ATOMICO_migracion.sql) y la RPC
-- (INVENTARIO_VENTA_ATOMICO_rpc.sql) YA APLICADAS de antemano — este archivo no
-- las crea, solo las EJERCITA. Todo lo de aquí es descartable (usa datos de
-- prueba con prefijo CONCTEST- y hace ROLLBACK al final de cada caso) — no
-- toca ningún dato real de ningún cliente.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- SETUP COMÚN — correr UNA VEZ, en CUALQUIER pestaña, antes de los 3 casos.
-- Crea los datos de prueba (organización, usuario admin, productos, seriales)
-- que los 3 casos comparten. No hace falta repetirlo entre casos — cada caso
-- limpia y vuelve a dejar el producto en el estado que necesita al empezar
-- (ver "reset" en cada caso).
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- Organización de prueba, aislada de cualquier org real.
insert into organizaciones (id, nombre, slug, tipo, activo)
values ('00000000-0000-0000-0000-0000cc00ca01', 'CONCTEST ORG', 'conctest-org', 'tienda', true)
on conflict (id) do nothing;

-- Usuario de autenticación descartable — SOLO existe para satisfacer el FK
-- real `profiles.id → auth.users(id)`. No se usa para loguearse de verdad
-- (la sesión se simula con set_config, más abajo) — mismo patrón de
-- crypt()+tokens vacíos que ya usa el sistema para altas de staff reales.
insert into auth.users
  (id, instance_id, aud, role, email, email_confirmed_at, encrypted_password,
   created_at, updated_at, confirmation_token, recovery_token,
   email_change_token_new, email_change, phone_change, phone_change_token,
   email_change_token_current, reauthentication_token)
values
  ('00000000-0000-0000-0000-0000cc00ca02', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'conctest-admin@nexus-pro.local', now(),
   crypt('conctest-descartable', gen_salt('bf')), now(), now(),
   '', '', '', '', '', '', '', '')
on conflict (id) do nothing;

-- Usuario admin de prueba, ligado a esa org — necesario para simular sesión RLS.
insert into usuarios_sistema (id, nom, login, cargo, rol, activo, organizacion_id)
values ('00000000-0000-0000-0000-0000cc00ca02', 'CONCTEST ADMIN', 'conctest-admin', 'admin', 'admin', true, '00000000-0000-0000-0000-0000cc00ca01')
on conflict (id) do update set organizacion_id = '00000000-0000-0000-0000-0000cc00ca01', rol = 'admin', activo = true;

-- Perfil de Auth ligado al usuario de sistema — ESTA es la fila que
-- mi_rol()/mi_organizacion() leen de verdad (vía auth.uid() = profiles.id).
insert into profiles (id, usuario_sistema_id, login, nom, rol, activo)
values ('00000000-0000-0000-0000-0000cc00ca02', '00000000-0000-0000-0000-0000cc00ca02', 'conctest-admin', 'CONCTEST ADMIN', 'admin', true)
on conflict (id) do update set usuario_sistema_id = '00000000-0000-0000-0000-0000cc00ca02', rol = 'admin', activo = true;

-- Producto SIN serial (para el Caso A — última unidad, no serializado).
insert into pos_productos (id, organizacion_id, nombre, tipo, precio, costo, stock, serial)
values ('00000000-0000-0000-0000-0000cc00ca03', '00000000-0000-0000-0000-0000cc00ca01', 'CONCTEST-PROD-A', 'producto', 100, 50, 1, false)
on conflict (id) do update set stock = 1, serial = false;

-- Producto CON serial (para el Caso C — serial parcial rechazado).
insert into pos_productos (id, organizacion_id, nombre, tipo, precio, costo, stock, serial)
values ('00000000-0000-0000-0000-0000cc00ca04', '00000000-0000-0000-0000-0000cc00ca01', 'CONCTEST-PROD-C', 'producto', 100, 50, 10, true)
on conflict (id) do update set stock = 10, serial = true;

-- 2 seriales para el producto C, uno vendido (confirmado) y uno disponible
-- (simula IMEI aún sin confirmar — el escenario real que describió ChatGPT).
insert into pos_seriales (id, organizacion_id, producto_id, serial, estado, venta_id)
values ('00000000-0000-0000-0000-0000cc00ca05', '00000000-0000-0000-0000-0000cc00ca01', '00000000-0000-0000-0000-0000cc00ca04', 'CONCTEST-IMEI-001', 'disponible', null)
on conflict (id) do update set estado = 'disponible', venta_id = null;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- CASO A — dos ventas compitiendo por la ÚLTIMA unidad (no serializada)
-- ═══════════════════════════════════════════════════════════════════════════
-- Qué prueba: con stock=1, si DOS ventas llegan a la vez pidiendo 1 unidad
-- cada una, la RPC debe dejar exactamente UNA ganadora (stock 1→0, 1 fila de
-- kardex) y la OTRA debe fallar limpio con INVENTARIO_STOCK_INSUFICIENTE, sin
-- que el stock quede en -1 ni en un número raro. Esto es lo que el patrón
-- `UPDATE ... WHERE stock >= x RETURNING` garantiza a nivel de fila en
-- Postgres — esta prueba lo demuestra con 2 conexiones REALES, no en
-- secuencia.
--
-- Cómo correr (2 pestañas del SQL Editor, o 2 sesiones psql):
--
-- PASO 0 (en CUALQUIER pestaña, antes de abrir las 2 sesiones concurrentes):
--   Reset del producto A a stock=1 y crea las 2 ventas de prueba (A1 y A2),
--   cada una con su propia línea en pos_venta_items pidiendo 1 unidad.

update pos_productos set stock = 1 where id = '00000000-0000-0000-0000-0000cc00ca03';
delete from pos_inv_movimientos where producto_id = '00000000-0000-0000-0000-0000cc00ca03';

-- OJO: `inventario_aplicado` va EXPLÍCITO en `false` (2da corrección de la
-- validación de punta a punta, 2026-08-10) — desde el corte de migración v2,
-- el DEFAULT de la columna es `true` PARA SIEMPRE (ver
-- INVENTARIO_VENTA_ATOMICO_migracion.sql), así que una fila nueva SIN
-- mencionar la columna ya no nace "pendiente" — nace igual que una venta ya
-- procesada por el flujo viejo. Para que la RPC tenga algo que aplicar en
-- este caso de prueba, hay que mandar `false` a mano, tal como ahora lo hace
-- el JS real (`nxPosConfirmar` en parches.js) para sus ventas nuevas.
insert into pos_ventas (id, organizacion_id, numero, total, created_by_name, inventario_aplicado)
values
  ('00000000-0000-0000-0000-0000cc00ca06', '00000000-0000-0000-0000-0000cc00ca01', 900001, 100, 'CONCTEST', false),
  ('00000000-0000-0000-0000-0000cc00ca07', '00000000-0000-0000-0000-0000cc00ca01', 900002, 100, 'CONCTEST', false)
on conflict (id) do update set total = 100, inventario_aplicado = false;

-- OJO: `organizacion_id` va EXPLÍCITO (3ra corrección de la validación de
-- punta a punta) — el trigger `set_organizacion_id()` de esta tabla solo
-- rellena si está vacío, LEYENDO `mi_organizacion()` en ese instante; si el
-- INSERT corre bajo el rol privilegiado del SQL Editor (sin `request.jwt.
-- claims` puesto), `mi_organizacion()` da null y la fila queda con
-- `organizacion_id=null` — el INSERT lo permite (el `WITH CHECK` de la
-- política acepta null), pero el `USING` de la misma política para LEER
-- (`organizacion_id = mi_organizacion()`) NO acepta null — la sesión
-- `authenticated` de más abajo nunca vería estas filas, y la RPC fallaría con
-- `INVENTARIO_VENTA_SIN_ITEMS` aunque las filas sí existan.
insert into pos_venta_items (venta_id, producto_id, nombre, cantidad, precio, organizacion_id)
values
  ('00000000-0000-0000-0000-0000cc00ca06', '00000000-0000-0000-0000-0000cc00ca03', 'CONCTEST-PROD-A', 1, 100, '00000000-0000-0000-0000-0000cc00ca01'),
  ('00000000-0000-0000-0000-0000cc00ca07', '00000000-0000-0000-0000-0000cc00ca03', 'CONCTEST-PROD-A', 1, 100, '00000000-0000-0000-0000-0000cc00ca01')
on conflict do nothing;

-- PASO 1 — en la SESIÓN A (pestaña 1), pegar y NO commitear todavía —
-- solo hasta el BEGIN + SELECT, y dejarlo ahí abierto:
--
--   begin;
--   select set_config('request.jwt.claims',
--     json_build_object('sub','00000000-0000-0000-0000-0000cc00ca02','role','authenticated')::text,
--     true);
--   set local role authenticated;
--   -- ahora, en el MISMO instante que corres el PASO 1 en la Sesión B (abajo),
--   -- ejecuta esta línea:
--   select pos_aplicar_inventario_venta('00000000-0000-0000-0000-0000cc00ca06'::uuid);
--   commit;
--
-- PASO 1 (simultáneo) — en la SESIÓN B (pestaña 2), pegar y correr AL MISMO
-- TIEMPO que el select de la Sesión A de arriba (con solo 1-2 segundos de
-- diferencia entre pestañas es suficiente para forzar la carrera real, ya que
-- el UPDATE con WHERE stock>=x en Postgres serializa las 2 transacciones a
-- nivel de fila):
--
--   begin;
--   select set_config('request.jwt.claims',
--     json_build_object('sub','00000000-0000-0000-0000-0000cc00ca02','role','authenticated')::text,
--     true);
--   set local role authenticated;
--   select pos_aplicar_inventario_venta('00000000-0000-0000-0000-0000cc00ca07'::uuid);
--   commit;
--
-- QUÉ ESPERAR (uno de los 2 resultados, según quién gane la carrera — el
-- orden no importa, lo que importa es que SOLO UNA gane):
--   - Una sesión responde con {"ok":true,"ya_aplicado":false,"lineas":1}
--   - La OTRA sesión responde con un error:
--       ERROR:  INVENTARIO_STOCK_INSUFICIENTE: CONCTEST-PROD-A
--     (esto es CORRECTO y ESPERADO — no es un bug, es el candado funcionando)
--
-- PASO 2 — verificar el resultado final (en cualquier pestaña, después de que
-- ambas sesiones terminaron):

select
  'CASO A — resultado final' as caso,
  p.stock as stock_final,               -- debe ser EXACTAMENTE 0 (nunca -1, nunca 1)
  (select count(*) from pos_inv_movimientos where producto_id = p.id) as filas_kardex, -- debe ser EXACTAMENTE 1
  (select inventario_aplicado from pos_ventas where id = '00000000-0000-0000-0000-0000cc00ca06') as venta_a1_aplicada,
  (select inventario_aplicado from pos_ventas where id = '00000000-0000-0000-0000-0000cc00ca07') as venta_a2_aplicada
  -- exactamente UNA de las 2 líneas de arriba debe ser `true`, la otra `false`
from pos_productos p
where p.id = '00000000-0000-0000-0000-0000cc00ca03';

-- ═══════════════════════════════════════════════════════════════════════════
-- CASO B — dos reintentos SIMULTÁNEOS del MISMO venta_id (idempotencia real)
-- ═══════════════════════════════════════════════════════════════════════════
-- Qué prueba: el escenario real de un cajero que hace doble-clic o cuya
-- primera llamada se cae por timeout de red y el navegador reintenta — DOS
-- llamadas a la RPC con el MISMO venta_id, disparadas literalmente al mismo
-- tiempo desde 2 conexiones distintas. El candado de idempotencia
-- (`UPDATE ... WHERE inventario_aplicado=false RETURNING ...`) debe dejar que
-- SOLO UNA de las 2 aplique el inventario de verdad; la otra debe recibir
-- {"ok":true,"ya_aplicado":true,"lineas":0} SIN volver a descontar stock.
--
-- PASO 0 — reset del producto A a stock=5 y una sola venta pidiendo 2:

update pos_productos set stock = 5 where id = '00000000-0000-0000-0000-0000cc00ca03';
delete from pos_inv_movimientos where producto_id = '00000000-0000-0000-0000-0000cc00ca03';
update pos_ventas set inventario_aplicado = false where id = '00000000-0000-0000-0000-0000cc00ca06';
delete from pos_venta_items where venta_id = '00000000-0000-0000-0000-0000cc00ca06';
insert into pos_venta_items (venta_id, producto_id, nombre, cantidad, precio, organizacion_id)
values ('00000000-0000-0000-0000-0000cc00ca06', '00000000-0000-0000-0000-0000cc00ca03', 'CONCTEST-PROD-A', 2, 100, '00000000-0000-0000-0000-0000cc00ca01');

-- PASO 1 — SESIÓN A y SESIÓN B, AL MISMO TIEMPO, llaman la RPC con el MISMO
-- venta_id (ventaA1, la misma de arriba). Pegar en cada pestaña y correr
-- simultáneo:
--
--   begin;
--   select set_config('request.jwt.claims',
--     json_build_object('sub','00000000-0000-0000-0000-0000cc00ca02','role','authenticated')::text,
--     true);
--   set local role authenticated;
--   select pos_aplicar_inventario_venta('00000000-0000-0000-0000-0000cc00ca06'::uuid);
--   commit;
--
-- QUÉ ESPERAR:
--   - Una sesión responde {"ok":true,"ya_aplicado":false,"lineas":1}
--   - La OTRA responde {"ok":true,"ya_aplicado":true,"lineas":0}
--   - NINGUNA de las 2 debe fallar con error — el reintento es el camino feliz,
--     no una incidencia.
--
-- PASO 2 — verificar:

select
  'CASO B — resultado final' as caso,
  p.stock as stock_final,               -- debe ser EXACTAMENTE 3 (5-2, nunca 1 = 5-2-2)
  (select count(*) from pos_inv_movimientos where producto_id = p.id) as filas_kardex -- debe ser EXACTAMENTE 1
from pos_productos p
where p.id = '00000000-0000-0000-0000-0000cc00ca03';

-- ═══════════════════════════════════════════════════════════════════════════
-- CASO C — venta serializada PARCIAL, se rechaza COMPLETA (no aplica parcial)
-- ═══════════════════════════════════════════════════════════════════════════
-- Qué prueba: el escenario exacto que describió ChatGPT en el punto 2 — el
-- carrito pidió 2 unidades de un producto con IMEI, pero al momento en que la
-- RPC corre, solo 1 de los 2 IMEI reales quedó 'vendido' (el otro sigue
-- 'disponible', como si su confirmación llegara tarde o se corrigiera
-- después). La RPC debe RECHAZAR TODA la aplicación (0 unidades descontadas,
-- 0 kardex, inventario_aplicado sigue false) — nunca aplicar 1 de 2.
--
-- Aquí no hace falta 2 sesiones reales concurrentes — es un solo escenario de
-- datos (confirmación parcial), pero se incluye en este archivo porque
-- ChatGPT lo pidió como parte del mismo paquete de prueba manual antes de
-- producción. Basta con 1 sesión.
--
-- PASO 0 — reset: producto C con stock=10, 1 solo serial 'disponible' (el
-- otro NO existe todavía — simula que el carrito pidió 2 pero solo se generó/
-- confirmó 1 IMEI real hasta ahora), venta pidiendo 2:

update pos_productos set stock = 10 where id = '00000000-0000-0000-0000-0000cc00ca04';
delete from pos_inv_movimientos where producto_id = '00000000-0000-0000-0000-0000cc00ca04';

insert into pos_ventas (id, organizacion_id, numero, total, created_by_name, inventario_aplicado)
values ('00000000-0000-0000-0000-0000cc00ca08', '00000000-0000-0000-0000-0000cc00ca01', 900003, 200, 'CONCTEST', false)
on conflict (id) do update set total = 200, inventario_aplicado = false;

delete from pos_venta_items where venta_id = '00000000-0000-0000-0000-0000cc00ca08';
insert into pos_venta_items (venta_id, producto_id, nombre, cantidad, precio, organizacion_id)
values ('00000000-0000-0000-0000-0000cc00ca08', '00000000-0000-0000-0000-0000cc00ca04', 'CONCTEST-PROD-C', 2, 100, '00000000-0000-0000-0000-0000cc00ca01');
-- ^ el carrito pide 2 unidades

update pos_seriales
   set estado = 'vendido', venta_id = '00000000-0000-0000-0000-0000cc00ca08'
 where id = '00000000-0000-0000-0000-0000cc00ca05';
-- ^ pero solo 1 serial real quedó 'vendido' — el 2do IMEI nunca se confirmó

-- PASO 1 — correr en cualquier pestaña, sesión RLS simulada:

begin;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000cc00ca02','role','authenticated')::text,
  true);
set local role authenticated;
select pos_aplicar_inventario_venta('00000000-0000-0000-0000-0000cc00ca08'::uuid);
-- ESPERADO: esta llamada debe FALLAR con:
--   ERROR:  INVENTARIO_SERIALES_INCOMPLETOS: CONCTEST-PROD-C (esperado 2, confirmado 1)
-- (correcto y esperado — no es un bug)
commit;
-- si la llamada de arriba lanzó el error, el `commit` no tiene nada que
-- confirmar (la transacción ya abortó) — es normal ver "current transaction
-- is aborted" si se intenta seguir usando la misma sesión sin rollback antes.

-- PASO 2 — verificar (en una transacción NUEVA, limpia):

select
  'CASO C — resultado final' as caso,
  p.stock as stock_final,               -- debe seguir en EXACTAMENTE 10 (sin tocar)
  (select count(*) from pos_inv_movimientos where producto_id = p.id) as filas_kardex, -- debe ser 0
  (select inventario_aplicado from pos_ventas where id = '00000000-0000-0000-0000-0000cc00ca08') as venta_aplicada, -- debe ser false
  (select estado from pos_seriales where id = '00000000-0000-0000-0000-0000cc00ca05') as serial_1_estado -- debe SEGUIR 'vendido' (la RPC nunca toca/libera seriales, solo lee)
from pos_productos p
where p.id = '00000000-0000-0000-0000-0000cc00ca04';

-- ═══════════════════════════════════════════════════════════════════════════
-- LIMPIEZA — borrar TODOS los datos de prueba de este archivo (correr al
-- final, en cualquier pestaña, cuando los 3 casos ya se verificaron). Orden
-- importa por las llaves foráneas: primero lo que depende, al final lo que
-- otras filas dependen de ello.
-- ═══════════════════════════════════════════════════════════════════════════

begin;
delete from pos_inv_movimientos where producto_id in ('00000000-0000-0000-0000-0000cc00ca03', '00000000-0000-0000-0000-0000cc00ca04');
delete from pos_seriales where id = '00000000-0000-0000-0000-0000cc00ca05';
delete from pos_venta_items where venta_id in ('00000000-0000-0000-0000-0000cc00ca06', '00000000-0000-0000-0000-0000cc00ca07', '00000000-0000-0000-0000-0000cc00ca08');
delete from pos_ventas where id in ('00000000-0000-0000-0000-0000cc00ca06', '00000000-0000-0000-0000-0000cc00ca07', '00000000-0000-0000-0000-0000cc00ca08');
delete from pos_productos where id in ('00000000-0000-0000-0000-0000cc00ca03', '00000000-0000-0000-0000-0000cc00ca04');
delete from profiles where id = '00000000-0000-0000-0000-0000cc00ca02';
delete from usuarios_sistema where id = '00000000-0000-0000-0000-0000cc00ca02';
delete from organizaciones where id = '00000000-0000-0000-0000-0000cc00ca01';
delete from auth.users where id = '00000000-0000-0000-0000-0000cc00ca02';
commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- RESULTADO ESPERADO — resumen para copiar en el reporte de la bitácora
-- ═══════════════════════════════════════════════════════════════════════════
-- CASO A (última unidad, 2 ventas concurrentes): stock 1→0, 1 fila de kardex,
--   exactamente 1 de las 2 ventas queda `inventario_aplicado=true`, la otra
--   `false` con su llamada habiendo lanzado INVENTARIO_STOCK_INSUFICIENTE.
-- CASO B (mismo venta_id, 2 llamadas concurrentes): stock se descuenta UNA
--   sola vez (nunca doble), 1 fila de kardex, ninguna de las 2 llamadas falla
--   — una aplica, la otra devuelve ya_aplicado:true.
-- CASO C (serial parcial): la aplicación se rechaza COMPLETA — stock intacto,
--   0 kardex, inventario_aplicado sigue false, el IMEI ya confirmado NO se
--   toca ni se libera.
--
-- VALIDACIÓN DE PUNTA A PUNTA HECHA POR CLAUDE (2026-08-10, contra el
-- proyecto REAL tnwsgcxurfyuszxsewsn, todo dentro de transacciones con
-- ROLLBACK — nada quedó escrito): el SETUP corregido, los 3 casos y la
-- LIMPIEZA se corrieron de punta a punta, EN SECUENCIA (un solo canal, no 2
-- conexiones reales — ver nota arriba). Los 3 casos dieron exactamente el
-- resultado esperado de esta sección. La CARRERA DE TEMPORIZACIÓN real (2
-- sesiones humanas tocando "ejecutar" al mismo instante) sigue sin ejecutarse
-- — eso solo lo puede correr un humano con 2 pestañas, tal como pide este
-- archivo. El detalle completo de la corrida está en la bitácora.
