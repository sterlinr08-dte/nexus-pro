-- Tallas y colores (16-nov-2026, Boutique Aura). Cada combinación es un artículo propio (su código, existencia y kardex);
-- `variante_grupo` une las que nacieron del mismo modelo. Solo agrega columnas: no cambia ni borra datos.
alter table public.pos_productos add column if not exists talla text;
alter table public.pos_productos add column if not exists color text;
alter table public.pos_productos add column if not exists variante_grupo uuid;
create index if not exists pos_productos_variante_grupo_idx on public.pos_productos (variante_grupo) where variante_grupo is not null;
