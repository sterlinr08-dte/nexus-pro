-- 16-nov-2026 (dueño: «Habilita una opción donde uno pueda agregar los botones de acceso directo y cambiarlo»).
-- Lista ordenada de producto_id que salen como accesos rápidos debajo del buscador de la Prefactura.
-- null o vacía = automáticos (servicios y lo que más se prefactura). Solo agrega la columna.
alter table public.pos_config add column if not exists accesos_rapidos jsonb;
