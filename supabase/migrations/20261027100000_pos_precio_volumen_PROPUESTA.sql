-- PROPUESTA (27-oct-2026) — NO APLICADA. Requiere el OK del dueño antes de correrla en producción.
-- Precios por cantidad («desde 2 unidades a RD$ X c/u») para el Punto de Venta (capa parches-pos-volumen.js).
--
-- Diseño: una columna jsonb en pos_productos en vez de una tabla nueva. Así hereda TAL CUAL la RLS por
-- organización que ya tiene pos_productos (mismas políticas, mismo organizacion_id) y viaja con el
-- select=* que la caja ya hace: cero consultas nuevas al vender.
--
-- Formato: [{"desde": 2, "precio": 950}, {"desde": 5, "precio": 900}]  (precio con ITBIS incluido, por unidad)
-- La validación de negocio (nunca debajo del costo con ITBIS ni del precio mínimo) la hace la interfaz;
-- aquí solo se asegura la forma (arreglo o null) para que una fila mal formada no rompa la caja.
--
-- Reversible: alter table public.pos_productos drop column if exists precio_volumen;

alter table public.pos_productos
  add column if not exists precio_volumen jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pos_productos_precio_volumen_arreglo') then
    alter table public.pos_productos
      add constraint pos_productos_precio_volumen_arreglo
      check (precio_volumen is null or jsonb_typeof(precio_volumen) = 'array');
  end if;
end $$;

comment on column public.pos_productos.precio_volumen is
  'Precios por cantidad del POS: [{desde:int>=2, precio:numeric con ITBIS}]. Lo usa parches-pos-volumen.js. Hereda la RLS por organización de pos_productos.';
