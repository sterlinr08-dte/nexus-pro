-- POS estándar, entrega 1 (15-nov-2026): datos del negocio y módulos por empresa.
-- Solo agrega columnas a pos_config (una fila por organización, ya protegida por RLS). No toca datos.
alter table public.pos_config add column if not exists emp_nombre text;
alter table public.pos_config add column if not exists emp_rnc text;
alter table public.pos_config add column if not exists emp_tel text;
alter table public.pos_config add column if not exists emp_dir text;
alter table public.pos_config add column if not exists ticket_pie text;
alter table public.pos_config add column if not exists modulos_off jsonb not null default '[]'::jsonb;
comment on column public.pos_config.modulos_off is 'Módulos del POS apagados para esta empresa (lista de claves). Vacío = todos visibles.';
