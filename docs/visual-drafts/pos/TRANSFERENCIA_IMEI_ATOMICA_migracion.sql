-- NEXUS PRO — Transferencia de inventario con IMEI atómica
-- Migración aditiva. NO aplicada a producción — para revisión antes de autorizar.
-- Patrón calcado del real (verificado contra pos_stock_almacen/pos_seriales/pos_transferencia_items
-- vía information_schema.columns + pg_policies + information_schema.triggers, no de memoria):
--   RLS: FOR ALL, USING(mi_rol() is not null AND organizacion_id = mi_organizacion()),
--        WITH CHECK(mi_rol() is not null AND (organizacion_id is null OR organizacion_id = mi_organizacion()))
--   Trigger: BEFORE INSERT, trg_org_<tabla> -> set_organizacion_id() (ya existe, no se toca)

-- 1) Tabla hija: un salto de un IMEI en una transferencia = una fila.
create table public.pos_transferencia_item_seriales (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid,
  transferencia_item_id uuid not null references public.pos_transferencia_items(id) on delete cascade,
  serial_id uuid not null references public.pos_seriales(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.pos_transferencia_item_seriales is
  'Trazabilidad por IMEI de las transferencias entre almacenes. Una fila = un salto de una unidad '
  'física. ON DELETE CASCADE en ambas FK a propósito: si se borra el item o el serial padre (acción '
  'explícita y confirmada en la UI), la fila de trazabilidad de ESE salto deja de tener sentido por '
  'sí sola (no duplica el texto del serial, solo apunta a él).';

create index idx_pos_transf_item_seriales_serial on public.pos_transferencia_item_seriales(serial_id);
create index idx_pos_transf_item_seriales_item on public.pos_transferencia_item_seriales(transferencia_item_id);
create index idx_pos_transf_item_seriales_org on public.pos_transferencia_item_seriales(organizacion_id);

create trigger trg_org_pos_transf_item_seriales
  before insert on public.pos_transferencia_item_seriales
  for each row execute function public.set_organizacion_id();

alter table public.pos_transferencia_item_seriales enable row level security;

create policy pos_transf_item_seriales_admin
  on public.pos_transferencia_item_seriales
  for all
  using (mi_rol() is not null and organizacion_id = mi_organizacion())
  with check (mi_rol() is not null and (organizacion_id is null or organizacion_id = mi_organizacion()));
