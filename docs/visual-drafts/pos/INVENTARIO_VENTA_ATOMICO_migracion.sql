-- INVENTARIO VENTA ATÓMICO — migración
-- Aditiva. Guarda si ya se aplicó el inventario de una venta (idempotencia).
-- pos_ventas.inventario_aplicado: false hasta que pos_aplicar_inventario_venta() la marque
-- true dentro de la MISMA transacción que decrementa stock + kardex. Si esa función falla
-- (RAISE), Postgres revierte también esta bandera — nunca queda "aplicado" a medias.
--
-- CORTE DE MIGRACIÓN SEGURO (revisión de ChatGPT, punto 1, 2026-08-09 07:52) — 2 pasos, no 1:
--
-- Paso 1: agrega la columna con DEFAULT true. Como el default es una CONSTANTE, Postgres
--   rellena TODAS las filas ya existentes con `true` en el mismo instante del ALTER — nunca
--   quedan en `false`. Cualquier venta histórica (ya contabilizada por el moverStock() viejo)
--   queda marcada "ya aplicada": si alguien llama la RPC sobre su id por error/manual, la
--   idempotencia la bloquea de inmediato — nunca vuelve a descontar su inventario.
-- Paso 2: cambia el DEFAULT de la columna a false, SIN tocar ninguna fila existente (cambiar
--   un DEFAULT nunca reescribe filas — solo rige los INSERT futuros que omitan la columna).
--   De aquí en adelante, CUALQUIER venta nueva que se inserte sin mencionar esta columna
--   (el INSERT de nxPosConfirmar en parches.js NO la menciona, a propósito — ver más abajo)
--   arranca en `false`, lista para que la RPC la procese.
--
-- Los 2 pasos van en LA MISMA transacción de migración (ACCESS EXCLUSIVE lock de ALTER TABLE
-- bloquea escrituras concurrentes durante toda la transacción) — no existe ninguna ventana
-- intermedia donde otra sesión pueda ver la tabla con el default en `true` y con el default
-- en `false` a la vez, ni insertar una fila entre los 2 pasos.
--
-- Por qué esto hace el ORDEN DE DESPLIEGUE (SQL vs JS) irrelevante para la seguridad de los
-- datos (aunque SQL-primero sigue siendo la práctica recomendada, para no generar incidencias
-- de "RPC no existe" mientras el JS viejo ya está en producción):
--   - El JS (nuevo o viejo) NUNCA escribe `inventario_aplicado` en el INSERT de `pos_ventas`
--     — deliberadamente, para no acoplar el código al orden de despliegue. El valor SIEMPRE
--     lo decide el DEFAULT de la columna en ese instante.
--   - Si el SQL se aplica ANTES que el JS nuevo: cualquier venta creada en el intervalo por el
--     JS VIEJO (que sigue llamando moverStock() fire-and-forget) recibe `inventario_aplicado
--     =false` (ya rige el default nuevo) — pero como nada en el sistema hace un barrido
--     automático que llame la RPC sobre ventas viejas, esa venta simplemente nunca es tocada
--     por la RPC; su inventario ya quedó correcto por el camino viejo (moverStock). Inerte,
--     no hay ningún riesgo de doble descuento.
--   - Si el JS nuevo se despliega ANTES que el SQL (la RPC todavía no existe): la venta se crea
--     igual (el INSERT de pos_ventas no depende de esta columna en absoluto), y la llamada a
--     `rpc/pos_aplicar_inventario_venta` falla con "función no existe" — el propio try/catch
--     del bloque nuevo en `nxPosConfirmar` la atrapa, registra `POS_VENTA_INVENTARIO_PENDIENTE`
--     y muestra el toast de incidencia — la venta se cobra igual, sin bloquear al cajero.

alter table public.pos_ventas
  add column if not exists inventario_aplicado boolean not null default true;

alter table public.pos_ventas
  alter column inventario_aplicado set default false;
