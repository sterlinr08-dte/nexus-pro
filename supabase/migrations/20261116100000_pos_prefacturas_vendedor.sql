-- 16-nov-2026 (dueño: «La ventana de prefactura yo quiero que replique la de Bayol Cell taller»).
-- La prefactura estilo Bayol lleva «Vendedor» arriba, junto a Cliente, Precio y Almacén. Se guarda con la prefactura y,
-- al facturarla, el cobro propone ese mismo vendedor. Solo agrega columnas; no toca datos.
alter table public.pos_prefacturas add column if not exists vendedor_id uuid;
alter table public.pos_prefacturas add column if not exists vendedor_nombre text;
