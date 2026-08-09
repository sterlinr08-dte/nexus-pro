-- INVENTARIO VENTA ATÓMICO — migración
-- Aditiva. Guarda si ya se aplicó el inventario de una venta (idempotencia).
-- pos_ventas.inventario_aplicado: false hasta que pos_aplicar_inventario_venta() la marque
-- true dentro de la MISMA transacción que decrementa stock + kardex. Si esa función falla
-- (RAISE), Postgres revierte también esta bandera — nunca queda "aplicado" a medias.

alter table public.pos_ventas
  add column if not exists inventario_aplicado boolean not null default false;
