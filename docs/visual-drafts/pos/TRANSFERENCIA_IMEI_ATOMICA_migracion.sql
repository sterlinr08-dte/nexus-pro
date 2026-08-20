-- NEXUS PRO — Transferencia de inventario con IMEI atómica
-- Migración aditiva. NO aplicada a producción — para revisión antes de autorizar.
-- Patrón calcado del real (verificado contra pos_stock_almacen/pos_seriales/pos_transferencia_items
-- vía information_schema.columns + pg_policies + information_schema.triggers, no de memoria):
--   RLS: FOR ALL, USING(mi_rol() is not null AND organizacion_id = mi_organizacion()),
--        WITH CHECK(mi_rol() is not null AND (organizacion_id is null OR organizacion_id = mi_organizacion()))
--   Trigger: BEFORE INSERT, trg_org_<tabla> -> set_organizacion_id() (ya existe, no se toca)

-- 1) Tabla hija: un salto de un IMEI en una transferencia = una fila.
-- REVISIÓN (ChatGPT, punto 2): ON DELETE CASCADE se cambió a RESTRICT en las 2 FK. Con CASCADE,
-- borrar un IMEI (nxSerialDel, SÍ borra de verdad de pos_seriales) se llevaba su historial de
-- transferencias sin avisar — inaceptable para un ERP auditable. Con RESTRICT, Postgres RECHAZA
-- el DELETE si el IMEI tiene historial (nxSerialDel ahora detecta ese error y lo explica, ver
-- parches.js). pos_transferencias/pos_transferencia_items no tienen NINGÚN flujo de borrado en
-- todo el archivo (verificado con grep) — son documentos inmutables, igual que facturas/asientos —
-- así que RESTRICT en transferencia_item_id no bloquea nada real hoy; es solo la política correcta
-- por si algún día se agrega un borrado, para que nunca se lleve trazabilidad por accidente.
create table public.pos_transferencia_item_seriales (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid,
  transferencia_item_id uuid not null references public.pos_transferencia_items(id) on delete restrict,
  serial_id uuid not null references public.pos_seriales(id) on delete restrict,
  created_at timestamptz not null default now()
);

comment on table public.pos_transferencia_item_seriales is
  'Trazabilidad por IMEI de las transferencias entre almacenes. Una fila = un salto de una unidad '
  'física. ON DELETE RESTRICT en ambas FK a propósito: el historial de un IMEI transferido nunca '
  'debe desaparecer por borrar el serial o el item más adelante — Postgres rechaza ese DELETE en '
  'vez de arrastrar la trazabilidad en silencio.';

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
