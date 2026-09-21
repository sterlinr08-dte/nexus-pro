-- STUDIO — 05 secuencias
-- Secuencias públicas de la base madre que NO pertenecen a columnas identity/serial (owned_by = null).
-- No se incluye setval: la base nueva arranca en 1.

create sequence if not exists public.pos_compra_seq as integer start with 1 increment by 1 minvalue 1 maxvalue 2147483647 cache 1 no cycle;
create sequence if not exists public.pos_venta_seq  as integer start with 1 increment by 1 minvalue 1 maxvalue 2147483647 cache 1 no cycle;
create sequence if not exists public.recibo_seq     as integer start with 1 increment by 1 minvalue 1 maxvalue 2147483647 cache 1 no cycle;

-- Ninguna de las tres tiene OWNED BY en la base madre; no se emite "alter sequence ... owned by".
