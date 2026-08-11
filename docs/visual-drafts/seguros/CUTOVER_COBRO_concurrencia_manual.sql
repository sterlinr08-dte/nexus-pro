-- CUTOVER COBRO FINANCIERO (Seguros) — prueba MANUAL de concurrencia real
-- Pedida por ChatGPT (docs/bitacora/2026-08-10-2321-chatgpt.md, punto 8: "dos
-- cobros concurrentes al mismo cliente"). Mismo criterio ya establecido para
-- el POS (INVENTARIO_VENTA_ATOMICO_concurrencia_manual.sql): "No presentes la
-- prueba secuencial como concurrencia real."
--
-- Este entorno de Claude (execute_sql vía MCP) SOLO puede lanzar sentencias
-- una tras otra contra el MISMO canal — nunca dos transacciones EJECUTANDO al
-- mismo tiempo de verdad. Por eso este archivo NO se corrió como concurrencia
-- real desde aquí — es para que un humano (o cualquier agente con 2
-- conexiones reales simultáneas) lo corra a mano, en 2 PESTAÑAS DISTINTAS del
-- SQL Editor de Supabase (o 2 sesiones psql aparte), sobre el proyecto real
-- tnwsgcxurfyuszxsewsn. Cada CASO lo dice explícito dónde hace falta timing
-- real y dónde una corrida en secuencia YA demuestra lo que hace falta.
--
-- ══════════════════════════════════════════════════════════════════════════
-- 2 DIFERENCIAS REALES frente al patrón ya usado en POS — encontradas
-- auditando el esquema/RLS real ANTES de escribir este archivo (mismo nivel
-- de cuidado que le costó 5 bugs al primer intento del archivo del POS):
-- ══════════════════════════════════════════════════════════════════════════
--
-- (1) `clientes`/`abonos`/`agentes`/`asientos` NO TIENEN columna
--     `organizacion_id` (confirmado con information_schema.columns — a
--     diferencia de las tablas `pos_*`, que sí la tienen). Su RLS (confirmado
--     con pg_policies, las 4 con `cmd:'ALL'`) es:
--       (mi_rol() IS NOT NULL) AND
--       (mi_organizacion() = (SELECT id FROM organizaciones WHERE slug='nexus-pro'))
--     O sea: NO hay una organización de prueba descartable posible aquí — el
--     candado no mira ninguna columna de la fila, compara la organización de
--     LA SESIÓN contra la organización REAL 'nexus-pro'
--     (id = 1ab0fcb7-3337-46be-afd7-4a30679de165, confirmado en vivo). El
--     usuario de prueba (auth.users + usuarios_sistema + profiles, sí
--     descartable) tiene que apuntar `organizacion_id` a esa organización
--     REAL para que la sesión simulada pase el candado — NO se crea ninguna
--     fila nueva en `organizaciones`, solo se REFERENCIA la que ya existe.
--
-- (2) `abonos` tiene un trigger `trg_seguros_bloquear_delete_abono`
--     (`BEFORE DELETE`, `RAISE EXCEPTION 'No se permite eliminar cobros. Use
--     la reversa financiera autorizada.'` — SIN excepción, ni para el rol de
--     superusuario del SQL Editor) — confirmado que YA vive en producción,
--     no lo agregó este cutover. Es una BUENA noticia para la decisión 2 del
--     cutover (defensa en profundidad: el borrado duro de un cobro está
--     bloqueado tanto en el frontend —ya no se llama— como en la base misma,
--     de forma incondicional) — pero significa que la LIMPIEZA de este
--     archivo NO puede hacer `DELETE FROM abonos` a secas: hay que
--     desactivar el trigger, borrar, y reactivarlo, dentro de la MISMA
--     transacción (si algo falla a mitad de camino, el ROLLBACK deshace
--     también el DISABLE — el trigger nunca queda apagado de verdad).
--
-- Requisito: los 3 puntos SÍ autorizados por ChatGPT
-- (CUTOVER_COBRO_correcciones_rpc.sql) siguen SIN aplicarse — este archivo
-- ejercita el comportamiento REAL de las 2 RPC tal como están HOY en
-- producción (search_path ya correcto en las 2 RPC, AST-COB- con el bug
-- viejo del `numero_poliza` vacío, reversa admitiendo 'admin'/'gerente'
-- todavía). Los Casos 1-4 de abajo no dependen de ninguna de esas 3
-- correcciones — prueban el candado de concurrencia (FOR UPDATE en clientes/
-- abonos), que es independiente. Todo lo de aquí es descartable (prefijo
-- CONCTEST- / ids con el patrón `0000cb00c0XX`) — no toca ningún cliente ni
-- cobro real.
--
-- ══════════════════════════════════════════════════════════════════════════
-- SETUP COMÚN — correr UNA VEZ, en CUALQUIER pestaña, antes de los 4 casos.
-- ══════════════════════════════════════════════════════════════════════════

begin;

-- Usuario de autenticación descartable — SOLO existe para satisfacer el FK
-- real `profiles.id → auth.users(id)`. No se usa para loguearse de verdad
-- (la sesión se simula con set_config, más abajo) — mismo patrón crypt()+
-- tokens vacíos que ya usa el sistema para altas de staff reales.
insert into auth.users
  (id, instance_id, aud, role, email, email_confirmed_at, encrypted_password,
   created_at, updated_at, confirmation_token, recovery_token,
   email_change_token_new, email_change, phone_change, phone_change_token,
   email_change_token_current, reauthentication_token)
values
  ('00000000-0000-0000-0000-0000cb00c001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'conctest-cobro-admin@nexus-pro.local', now(),
   crypt('conctest-descartable', gen_salt('bf')), now(), now(),
   '', '', '', '', '', '', '', '')
on conflict (id) do nothing;

-- Usuario de sistema de prueba, apuntando a la organización REAL 'nexus-pro'
-- (1ab0fcb7-3337-46be-afd7-4a30679de165) — necesario porque, a diferencia del
-- POS, estas 4 tablas NO aceptan una org descartable (ver nota (1) arriba).
insert into usuarios_sistema (id, nom, login, cargo, rol, activo, organizacion_id)
values ('00000000-0000-0000-0000-0000cb00c001', 'CONCTEST COBRO ADMIN', 'conctest-cobro-admin', 'admin', 'admin', true, '1ab0fcb7-3337-46be-afd7-4a30679de165')
on conflict (id) do update set organizacion_id = '1ab0fcb7-3337-46be-afd7-4a30679de165', rol = 'admin', activo = true;

-- Perfil de Auth ligado al usuario de sistema — ESTA es la fila que
-- mi_rol()/mi_organizacion() leen de verdad (vía auth.uid() = profiles.id).
insert into profiles (id, usuario_sistema_id, login, nom, rol, activo)
values ('00000000-0000-0000-0000-0000cb00c001', '00000000-0000-0000-0000-0000cb00c001', 'conctest-cobro-admin', 'CONCTEST COBRO ADMIN', 'admin', true)
on conflict (id) do update set usuario_sistema_id = '00000000-0000-0000-0000-0000cb00c001', rol = 'admin', activo = true;

-- Agente de cobro de prueba (activo=true, lo exige la RPC).
insert into agentes (id, nom, cargo, activo)
values ('00000000-0000-0000-0000-0000cb00c002', 'CONCTEST AGENTE', 'agente', true)
on conflict (id) do update set activo = true;

-- Clientes de prueba, uno por caso (así cada caso se puede correr sin pisar
-- el estado de los otros). deuda_total alto para que ningún monto de prueba
-- dispare el candado de "excede lo pendiente" por accidente.
insert into clientes (id, nom, cedula, deuda_total, pagado, deuda_anterior, numero_poliza, plan)
values
  ('00000000-0000-0000-0000-0000cb00c003', 'CONCTEST CLIENTE ADITIVO', '000-0000001-1', 10000, 0, 0, 'POL-2026-9101', 'Plan Prueba'),
  ('00000000-0000-0000-0000-0000cb00c004', 'CONCTEST CLIENTE DUPLICADO', '000-0000002-2', 10000, 0, 0, 'POL-2026-9102', 'Plan Prueba'),
  ('00000000-0000-0000-0000-0000cb00c005', 'CONCTEST CLIENTE REVERSA A', '000-0000003-3', 10000, 0, 0, 'POL-2026-9103', 'Plan Prueba'),
  ('00000000-0000-0000-0000-0000cb00c006', 'CONCTEST CLIENTE REVERSA B', '000-0000004-4', 10000, 0, 0, 'POL-2026-9104', 'Plan Prueba')
on conflict (id) do update set deuda_total = 10000, pagado = 0, deuda_anterior = 0;

commit;

-- ══════════════════════════════════════════════════════════════════════════
-- CASO 1 — dos cobros concurrentes AL MISMO cliente, con idempotency_keys
-- DISTINTAS (el escenario real que preguntó ChatGPT en el punto 8)
-- ══════════════════════════════════════════════════════════════════════════
-- Qué prueba: `seguros_registrar_cobro` hace `SELECT ... FOR UPDATE` sobre la
-- fila de `clientes` ANTES de sumar el monto a `pagado` — eso debe SERIALIZAR
-- las 2 transacciones a nivel de fila (Postgres bloquea la 2da hasta que la
-- 1ra libera el lock con commit/rollback), así que el resultado final debe
-- ser la SUMA correcta de los 2 montos — nunca "se pierde" uno de los dos
-- (lost update), y ninguna de las 2 llamadas debe fallar.
--
-- Cómo correr (2 pestañas del SQL Editor, o 2 sesiones psql):
--
-- SESIÓN A (pestaña 1) — pegar y correr:
--
--   begin;
--   select set_config('request.jwt.claims',
--     json_build_object('sub','00000000-0000-0000-0000-0000cb00c001','role','authenticated')::text,
--     true);
--   set local role authenticated;
--   select seguros_registrar_cobro(
--     p_cliente_id      := '00000000-0000-0000-0000-0000cb00c003'::uuid,
--     p_monto           := 1000,
--     p_metodo          := 'Efectivo',
--     p_referencia      := 'CONCTEST-CASO1-A',
--     p_agente_cobro    := '00000000-0000-0000-0000-0000cb00c002',
--     p_destino         := 'facturas',
--     p_idempotency_key := 'conctest-caso1-key-a'
--   );
--   commit;
--
-- SESIÓN B (pestaña 2) — pegar y correr AL MISMO TIEMPO que la Sesión A (con
-- 1-2 segundos de diferencia basta, el lock de `clientes` hace el resto):
--
--   begin;
--   select set_config('request.jwt.claims',
--     json_build_object('sub','00000000-0000-0000-0000-0000cb00c001','role','authenticated')::text,
--     true);
--   set local role authenticated;
--   select seguros_registrar_cobro(
--     p_cliente_id      := '00000000-0000-0000-0000-0000cb00c003'::uuid,
--     p_monto           := 1500,
--     p_metodo          := 'Efectivo',
--     p_referencia      := 'CONCTEST-CASO1-B',
--     p_agente_cobro    := '00000000-0000-0000-0000-0000cb00c002',
--     p_destino         := 'facturas',
--     p_idempotency_key := 'conctest-caso1-key-b'
--   );
--   commit;
--
-- QUÉ ESPERAR: las 2 responden `{"ok":true,"reintento":false,...}` (ninguna
-- falla), y el cliente termina con `pagado = 2500` EXACTO (nunca 1000 ni 1500
-- solos — eso sería un lost update real).
--
-- VERIFICAR (en cualquier pestaña, después de que las 2 terminaron):

select
  'CASO 1 — resultado final' as caso,
  c.pagado as pagado_final,             -- debe ser EXACTAMENTE 2500 (1000+1500)
  (select count(*) from abonos where cliente_id = c.id) as filas_abonos, -- debe ser 2
  (select count(*) from asientos where cliente_id = c.id) as filas_asientos -- debe ser 2
from clientes c
where c.id = '00000000-0000-0000-0000-0000cb00c003';

-- ══════════════════════════════════════════════════════════════════════════
-- CASO 2 — dos cobros concurrentes AL MISMO cliente, con LA MISMA
-- idempotency_key (el hallazgo real: idempotency_key SIN UNIQUE — ver
-- HALLAZGO_ADICIONAL_idempotency_key_sin_unique.sql)
-- ══════════════════════════════════════════════════════════════════════════
-- Qué prueba: la idempotencia de `seguros_registrar_cobro` es un patrón
-- "leer, y si no existe, escribir" (check-then-act) SIN ningún lock ni
-- restricción UNIQUE que lo proteja:
--   SELECT * INTO v_abono FROM abonos WHERE idempotency_key = p_idempotency_key;
--   IF FOUND THEN RETURN ...; END IF;
--   ... (recién AQUÍ toma el FOR UPDATE de clientes) ...
--   INSERT INTO abonos(..., idempotency_key) VALUES (..., p_idempotency_key);
--
-- Si las 2 llamadas llegan al SELECT de arriba ANTES de que cualquiera haya
-- terminado (ninguna las bloquea entre sí en ese punto — es un SELECT plano,
-- sin FOR UPDATE, y el abono con esa clave AÚN no existe para ninguna de
-- las 2), las 2 pasan "no encontrado" y las 2 terminan insertando un abono
-- COMPLETO con la MISMA idempotency_key (nada lo impide: no hay índice
-- único) — doble cobro real, pese a compartir la clave que se supone lo
-- evita.
--
-- OJO — LEER ANTES DE CORRER: si este caso se corre en SECUENCIA (una
-- llamada, esperar que termine, y RECIÉN ENTONCES la otra — como sería
-- correrlo en un solo canal, p.ej. este mismo `execute_sql`), el resultado
-- SIEMPRE sale "seguro" (la 2da ve el abono de la 1ra ya commiteado y
-- responde `reintento:true` sin duplicar nada) — eso NO demuestra nada, es
-- autoevidente por cómo está escrito el candado. Para exponer el hallazgo de
-- verdad hace falta que las 2 lleguen al SELECT de idempotencia AL MISMO
-- INSTANTE real — 2 pestañas, disparadas lo más simultáneo posible (no una
-- detrás de la otra con pausa).
--
-- SESIÓN A (pestaña 1) — pegar y correr:
--
--   begin;
--   select set_config('request.jwt.claims',
--     json_build_object('sub','00000000-0000-0000-0000-0000cb00c001','role','authenticated')::text,
--     true);
--   set local role authenticated;
--   select seguros_registrar_cobro(
--     p_cliente_id      := '00000000-0000-0000-0000-0000cb00c004'::uuid,
--     p_monto           := 2000,
--     p_metodo          := 'Efectivo',
--     p_referencia      := 'CONCTEST-CASO2',
--     p_agente_cobro    := '00000000-0000-0000-0000-0000cb00c002',
--     p_destino         := 'facturas',
--     p_idempotency_key := 'conctest-caso2-key-SAME'
--   );
--   commit;
--
-- SESIÓN B (pestaña 2) — EXACTAMENTE la misma llamada (mismo idempotency_key
-- literal 'conctest-caso2-key-SAME'), disparada lo más simultánea posible con
-- la Sesión A:
--
--   begin;
--   select set_config('request.jwt.claims',
--     json_build_object('sub','00000000-0000-0000-0000-0000cb00c001','role','authenticated')::text,
--     true);
--   set local role authenticated;
--   select seguros_registrar_cobro(
--     p_cliente_id      := '00000000-0000-0000-0000-0000cb00c004'::uuid,
--     p_monto           := 2000,
--     p_metodo          := 'Efectivo',
--     p_referencia      := 'CONCTEST-CASO2',
--     p_agente_cobro    := '00000000-0000-0000-0000-0000cb00c002',
--     p_destino         := 'facturas',
--     p_idempotency_key := 'conctest-caso2-key-SAME'
--   );
--   commit;
--
-- QUÉ ESPERAR — 2 resultados posibles, y los 2 son información real:
--   (a) SEGURO (si el timing no fue lo bastante simultáneo, o Postgres
--       resolvió el SELECT de una antes que la otra empezara): la 2da
--       responde `{"ok":true,"reintento":true,...}` con el MISMO `abono_id`
--       de la 1ra. `pagado` queda en 2000 (una sola vez). Repetir con mejor
--       sincronía si se quiere forzar el otro resultado.
--   (b) EL HALLAZGO REPRODUCIDO (si de verdad llegaron juntas al SELECT):
--       las 2 responden `{"ok":true,"reintento":false,...}` (ninguna avisa
--       del problema — cada una cree que fue la primera), y `pagado` queda
--       en **4000** (doble cobro real) con **2 filas** en `abonos`, ambas con
--       la MISMA `idempotency_key`.
--
-- VERIFICAR (en cualquier pestaña, después de que las 2 terminaron):

select
  'CASO 2 — resultado final' as caso,
  c.pagado as pagado_final,             -- 2000 = seguro · 4000 = hallazgo reproducido
  (select count(*) from abonos where cliente_id = c.id) as filas_abonos, -- 1 = seguro · 2 = reproducido
  (select count(*) from abonos where idempotency_key = 'conctest-caso2-key-SAME') as filas_con_misma_key -- SIEMPRE debería ser 1 si la clave protegiera de verdad; si sale 2, es la prueba directa del hallazgo
from clientes c
where c.id = '00000000-0000-0000-0000-0000cb00c004';

-- ══════════════════════════════════════════════════════════════════════════
-- CASO 3 — dos intentos de reversa concurrentes sobre el MISMO abono, con LA
-- MISMA idempotency_key de reversa (debe ser SEGURO — a diferencia del Caso
-- 2, `seguros_reversar_cobro` SÍ toma `FOR UPDATE` sobre `abonos` antes de
-- mirar `estado`)
-- ══════════════════════════════════════════════════════════════════════════
-- Qué prueba: `seguros_reversar_cobro` hace
--   SELECT * INTO v_abono FROM abonos WHERE id=p_abono_id FOR UPDATE;
-- ANTES de revisar `estado='Reversado'` — el FOR UPDATE sí bloquea a la 2da
-- transacción hasta que la 1ra libera el lock (commit), y quien llega
-- segundo ve el estado YA actualizado ('Reversado') — con la MISMA clave de
-- idempotencia de reversa, debe responder limpio `reintento:true`, sin
-- volver a mover dinero ni fallar con error.
--
-- PASO 0 (en cualquier pestaña, antes de las 2 sesiones) — crea el cobro que
-- se va a reversar (no hace falta que esto sea concurrente, es el setup):

begin;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000cb00c001','role','authenticated')::text,
  true);
set local role authenticated;
select seguros_registrar_cobro(
  p_cliente_id      := '00000000-0000-0000-0000-0000cb00c005'::uuid,
  p_monto            := 3000,
  p_metodo           := 'Efectivo',
  p_referencia       := 'CONCTEST-CASO3-SETUP',
  p_agente_cobro     := '00000000-0000-0000-0000-0000cb00c002',
  p_destino          := 'facturas',
  p_idempotency_key  := 'conctest-caso3-setup-key'
) as resultado_setup;
commit;

-- Anota el `abono_id` que devolvió la llamada de arriba (o consúltalo así):

select id as caso3_abono_id from abonos where idempotency_key = 'conctest-caso3-setup-key';
-- ↑ sustituye <ABONO_ID_CASO3> en las 2 sesiones de abajo por el uuid real que salga aquí.

-- SESIÓN A (pestaña 1):
--
--   begin;
--   select set_config('request.jwt.claims',
--     json_build_object('sub','00000000-0000-0000-0000-0000cb00c001','role','authenticated')::text,
--     true);
--   set local role authenticated;
--   select seguros_reversar_cobro(
--     p_abono_id         := '<ABONO_ID_CASO3>'::uuid,
--     p_motivo           := 'Prueba de concurrencia — Caso 3',
--     p_idempotency_key  := 'conctest-caso3-rev-key-SAME'
--   );
--   commit;
--
-- SESIÓN B (pestaña 2) — MISMA idempotency_key de reversa, disparada lo más
-- simultánea posible con la Sesión A:
--
--   begin;
--   select set_config('request.jwt.claims',
--     json_build_object('sub','00000000-0000-0000-0000-0000cb00c001','role','authenticated')::text,
--     true);
--   set local role authenticated;
--   select seguros_reversar_cobro(
--     p_abono_id         := '<ABONO_ID_CASO3>'::uuid,
--     p_motivo           := 'Prueba de concurrencia — Caso 3 (B)',
--     p_idempotency_key  := 'conctest-caso3-rev-key-SAME'
--   );
--   commit;
--
-- QUÉ ESPERAR (a diferencia del Caso 2, este SIEMPRE debe salir seguro, sea
-- cual sea el timing — el FOR UPDATE lo garantiza, no depende de suerte):
--   - Una sesión responde `{"ok":true,"reintento":false,"estado":"Reversado",...}`
--   - La OTRA responde `{"ok":true,"reintento":true,"abono_id":...,"estado":"Reversado"}`
--   - NINGUNA falla con error. El cliente queda con `pagado = 0` (se reversó
--     UNA sola vez, nunca 2 veces ni -3000).
--
-- VERIFICAR:

select
  'CASO 3 — resultado final' as caso,
  c.pagado as pagado_final,             -- debe ser EXACTAMENTE 0 (se reversó 1 sola vez)
  (select estado from abonos where idempotency_key = 'conctest-caso3-setup-key') as estado_abono, -- 'Reversado'
  (select count(*) from asientos where tipo_origen = 'reversa_cobro' and cliente_id = c.id) as filas_reversa -- debe ser EXACTAMENTE 1
from clientes c
where c.id = '00000000-0000-0000-0000-0000cb00c005';

-- ══════════════════════════════════════════════════════════════════════════
-- CASO 4 — dos intentos de reversa concurrentes sobre el MISMO abono, con
-- idempotency_keys DISTINTAS (debe rechazar el 2do con un error CLARO — mismo
-- criterio de la decisión 3 de ChatGPT: "nunca absorber en silencio")
-- ══════════════════════════════════════════════════════════════════════════
-- Qué prueba: el mismo lock de `abonos FOR UPDATE` del Caso 3, pero ahora las
-- 2 llamadas traen claves de reversa DISTINTAS — la que pierde la carrera
-- debe ver `estado='Reversado'` con una clave que NO coincide con la suya, y
-- rechazar con el error real (`RAISE EXCEPTION 'Este cobro ya fue
-- reversado'`), no fingir un éxito ni una reversa doble.
--
-- PASO 0 — nuevo cobro para reversar (cliente aparte, para no mezclar con el
-- Caso 3):

begin;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000cb00c001','role','authenticated')::text,
  true);
set local role authenticated;
select seguros_registrar_cobro(
  p_cliente_id      := '00000000-0000-0000-0000-0000cb00c006'::uuid,
  p_monto            := 1750,
  p_metodo           := 'Efectivo',
  p_referencia       := 'CONCTEST-CASO4-SETUP',
  p_agente_cobro     := '00000000-0000-0000-0000-0000cb00c002',
  p_destino          := 'facturas',
  p_idempotency_key  := 'conctest-caso4-setup-key'
) as resultado_setup;
commit;

select id as caso4_abono_id from abonos where idempotency_key = 'conctest-caso4-setup-key';
-- ↑ sustituye <ABONO_ID_CASO4> en las 2 sesiones de abajo por el uuid real que salga aquí.

-- SESIÓN A (pestaña 1):
--
--   begin;
--   select set_config('request.jwt.claims',
--     json_build_object('sub','00000000-0000-0000-0000-0000cb00c001','role','authenticated')::text,
--     true);
--   set local role authenticated;
--   select seguros_reversar_cobro(
--     p_abono_id         := '<ABONO_ID_CASO4>'::uuid,
--     p_motivo           := 'Prueba de concurrencia — Caso 4, motivo A',
--     p_idempotency_key  := 'conctest-caso4-rev-key-A'
--   );
--   commit;
--
-- SESIÓN B (pestaña 2) — clave de reversa DISTINTA, disparada lo más
-- simultánea posible con la Sesión A:
--
--   begin;
--   select set_config('request.jwt.claims',
--     json_build_object('sub','00000000-0000-0000-0000-0000cb00c001','role','authenticated')::text,
--     true);
--   set local role authenticated;
--   select seguros_reversar_cobro(
--     p_abono_id         := '<ABONO_ID_CASO4>'::uuid,
--     p_motivo           := 'Prueba de concurrencia — Caso 4, motivo B',
--     p_idempotency_key  := 'conctest-caso4-rev-key-B'
--   );
--   commit;
--
-- QUÉ ESPERAR: UNA de las 2 responde `{"ok":true,"reintento":false,...}`
-- (ganó la carrera, reversó de verdad). La OTRA falla con:
--   ERROR:  Este cobro ya fue reversado
-- (esto es CORRECTO y ESPERADO — el rechazo limpio es el comportamiento
-- deseado, no un bug. Si en cambio la 2da respondiera `ok:true` habría sido
-- una reversa doble real — un bug serio que este caso está pensado para
-- atrapar).
--
-- VERIFICAR:

select
  'CASO 4 — resultado final' as caso,
  c.pagado as pagado_final,             -- debe ser EXACTAMENTE 0 (se reversó 1 sola vez, la otra fue rechazada)
  (select estado from abonos where idempotency_key = 'conctest-caso4-setup-key') as estado_abono, -- 'Reversado'
  (select motivo_reversa from abonos where idempotency_key = 'conctest-caso4-setup-key') as motivo_que_ganó, -- 'Prueba de concurrencia — Caso 4, motivo A' o '...motivo B', el que ganó la carrera
  (select count(*) from asientos where tipo_origen = 'reversa_cobro' and cliente_id = c.id) as filas_reversa -- debe ser EXACTAMENTE 1 (nunca 2)
from clientes c
where c.id = '00000000-0000-0000-0000-0000cb00c006';

-- ══════════════════════════════════════════════════════════════════════════
-- NOTA APARTE (no es un "caso" de concurrencia, no necesita 2 sesiones) —
-- la RPC `seguros_reversar_cobro`, TAL COMO ESTÁ HOY en producción (las
-- correcciones de CUTOVER_COBRO_correcciones_rpc.sql siguen SIN aplicarse),
-- todavía acepta rol 'gerente' además de 'admin' (`v_rol NOT IN
-- ('admin','gerente')`). El FRONTEND del cutover YA es admin-only
-- (`reversarAbono()` corta en `sesion?.rol!=='admin'` antes de llamar a la
-- RPC — verificado en el punto 9 de la batería Playwright) — pero si alguien
-- llamara la RPC DIRECTO (saltándose la UI, p.ej. con curl y el token de un
-- gerente), hoy en día SÍ lo dejaría reversar. Es el mismo hueco ya anotado
-- como riesgo abierto (decisión 8 de ChatGPT: RLS/RBAC estructural pendiente
-- para otra pieza) — no se corrige aquí, solo se deja constancia con una
-- consulta de solo-lectura de la política real:

select
  'Confirmación — rol permitido en la RPC de reversa HOY (sin aplicar corrección)' as nota,
  pg_get_functiondef(oid) ilike '%NOT IN (''admin'',''gerente'')%' as permite_gerente_hoy
from pg_proc
where proname = 'seguros_reversar_cobro' and pronamespace = 'public'::regnamespace;

-- ══════════════════════════════════════════════════════════════════════════
-- LIMPIEZA — borrar TODOS los datos de prueba de este archivo (correr al
-- final, en cualquier pestaña, cuando los 4 casos ya se verificaron). Orden
-- importa por las llaves foráneas; y `abonos` necesita el trigger de borrado
-- desactivado A PROPÓSITO (ver nota (2) al inicio de este archivo) —
-- desactivar/borrar/reactivar TODO dentro de la MISMA transacción, así un
-- fallo a mitad de camino revierte también el DISABLE (nunca queda apagado).
-- ══════════════════════════════════════════════════════════════════════════

begin;

delete from asientos
where cliente_id in (
  '00000000-0000-0000-0000-0000cb00c003',
  '00000000-0000-0000-0000-0000cb00c004',
  '00000000-0000-0000-0000-0000cb00c005',
  '00000000-0000-0000-0000-0000cb00c006'
);

-- El trigger de borrado de abonos es real y correcto en producción (bloquea
-- el hard-delete para SIEMPRE, sin excepción de rol) — se apaga SOLO dentro
-- de esta transacción de limpieza, y se reactiva antes de comprometerla.
alter table abonos disable trigger trg_seguros_bloquear_delete_abono;

delete from abonos
where cliente_id in (
  '00000000-0000-0000-0000-0000cb00c003',
  '00000000-0000-0000-0000-0000cb00c004',
  '00000000-0000-0000-0000-0000cb00c005',
  '00000000-0000-0000-0000-0000cb00c006'
);

alter table abonos enable trigger trg_seguros_bloquear_delete_abono;

delete from clientes
where id in (
  '00000000-0000-0000-0000-0000cb00c003',
  '00000000-0000-0000-0000-0000cb00c004',
  '00000000-0000-0000-0000-0000cb00c005',
  '00000000-0000-0000-0000-0000cb00c006'
);

delete from agentes where id = '00000000-0000-0000-0000-0000cb00c002';
delete from profiles where id = '00000000-0000-0000-0000-0000cb00c001';
delete from usuarios_sistema where id = '00000000-0000-0000-0000-0000cb00c001';
delete from auth.users where id = '00000000-0000-0000-0000-0000cb00c001';

commit;

-- Verificación final de que no quedó nada (debe devolver 0 filas en las 6):
select 'auth.users'      as tabla, count(*) from auth.users      where id = '00000000-0000-0000-0000-0000cb00c001'
union all select 'usuarios_sistema', count(*) from usuarios_sistema where id = '00000000-0000-0000-0000-0000cb00c001'
union all select 'profiles',        count(*) from profiles        where id = '00000000-0000-0000-0000-0000cb00c001'
union all select 'agentes',         count(*) from agentes         where id = '00000000-0000-0000-0000-0000cb00c002'
union all select 'clientes',        count(*) from clientes        where id in ('00000000-0000-0000-0000-0000cb00c003','00000000-0000-0000-0000-0000cb00c004','00000000-0000-0000-0000-0000cb00c005','00000000-0000-0000-0000-0000cb00c006')
union all select 'abonos',          count(*) from abonos          where referencia like 'CONCTEST-CASO%';

-- ══════════════════════════════════════════════════════════════════════════
-- RESULTADO ESPERADO — resumen para copiar en el reporte de la bitácora
-- ══════════════════════════════════════════════════════════════════════════
-- CASO 1 (cliente compartido, idempotency_keys distintas): las 2 llamadas
--   tienen éxito, `pagado` termina en la SUMA exacta de ambos montos (2500 =
--   1000+1500) — el lock `FOR UPDATE` de `clientes` serializa correctamente,
--   sin lost update.
-- CASO 2 (cliente compartido, MISMA idempotency_key): SIN protección real —
--   si las 2 llamadas llegan de verdad juntas al SELECT de idempotencia
--   (sin FOR UPDATE ni índice único), ambas pasan y el cliente termina
--   doblemente cobrado (4000 en vez de 2000), con 2 filas en `abonos`
--   compartiendo la misma clave. Confirma el hallazgo ya documentado en
--   HALLAZGO_ADICIONAL_idempotency_key_sin_unique.sql — este archivo es la
--   prueba manual pendiente que ese documento ya anticipaba.
-- CASO 3 (misma reversa, misma clave de reversa): SEGURO por construcción —
--   el `FOR UPDATE` sobre `abonos` sí serializa; la que pierde ve el estado
--   ya actualizado y responde limpio `reintento:true`, sin volver a mover
--   dinero ni fallar.
-- CASO 4 (misma reversa, claves de reversa distintas): SEGURO — la que
--   pierde recibe un error real y claro ("Este cobro ya fue reversado"), no
--   una reversa doble ni un éxito fingido.
--
-- VALIDACIÓN DE PUNTA A PUNTA HECHA POR CLAUDE (contra el proyecto REAL
-- tnwsgcxurfyuszxsewsn, 2026-08-11): antes de escribir el SETUP se confirmó
-- en vivo —con SELECT de solo lectura, sin escribir nada— el esquema exacto
-- (columnas/FK/RLS) de las 4 tablas, el texto EXACTO de las 2 RPC y de los 3
-- triggers relevantes (incluido el hallazgo del trigger
-- `trg_seguros_bloquear_delete_abono`, ya vivo en producción, no agregado
-- por este cutover), y se trazó a mano el orden de operaciones de cada RPC
-- para fundamentar el resultado esperado de cada caso.
--
-- Después, el SETUP + los 4 casos (EN SECUENCIA — un solo canal, no 2
-- conexiones reales, ver nota al inicio) + la LIMPIEZA se corrieron de
-- verdad contra la base real, con estos resultados EXACTOS (no simulados):
--   CASO 1: pagado_final=2500, filas_abonos=2, filas_asientos=2 — la suma
--     aditiva cuadra perfecto, como se esperaba.
--   CASO 2 (secuencial): pagado_final=2000, filas_abonos=1,
--     filas_con_misma_key=1 — confirma que EN SECUENCIA sale seguro (la 2da
--     llamada ve el abono de la 1ra ya commiteado y responde reintento:true)
--     — exactamente lo que este archivo advierte que NO prueba el hallazgo;
--     la carrera real (b) sigue sin poder reproducirse desde este entorno de
--     un solo canal.
--   CASO 3: pagado_final=0, estado_abono='Reversado', filas_reversa=1 (nunca
--     2) — el FOR UPDATE de abonos protege la reversa incluso llamada 2
--     veces con la misma clave.
--   CASO 4: la Sesión A reversó con éxito
--     (motivo_que_ganó='Prueba de concurrencia — Caso 4, motivo A'); la
--     Sesión B, con clave de reversa distinta, fue rechazada tal cual se
--     esperaba con el error EXACTO `ERROR: P0001: Este cobro ya fue
--     reversado` — texto literal confirmado, no aproximado. pagado_final=0,
--     filas_reversa=1 (nunca 2).
--   LIMPIEZA: el trigger `trg_seguros_bloquear_delete_abono` se desactivó,
--     se borraron los 4 abonos de prueba, se reactivó dentro de la MISMA
--     transacción — confirmado con `pg_trigger.tgenabled='O'` (habilitado)
--     después del commit. Las 6 tablas de prueba (auth.users, usuarios_
--     sistema, profiles, agentes, clientes, abonos) quedaron en 0 filas —
--     nada de este archivo quedó escrito en la base real.
--
-- La CARRERA DE TEMPORIZACIÓN real (2 sesiones humanas disparando al mismo
-- instante, sobre todo la del Caso 2b) sigue sin ejecutarse desde aquí — eso
-- solo lo puede correr un humano con 2 pestañas reales, tal como pide este
-- archivo y el precedente del POS.
