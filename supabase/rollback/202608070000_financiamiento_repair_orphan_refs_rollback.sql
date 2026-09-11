-- NEXUS PRO
-- Rollback SOLO de la reparacion previa 202608070000_financiamiento_repair_orphan_refs.sql
-- Ejecutar unicamente ANTES de aplicar el hardening principal 202608070001.
-- Despues del hardening, restaurar una referencia huerfana violaria las nuevas FKs.

begin;

update public.prestamo_solicitudes
set prestamo_id = prestamo_id_legacy
where prestamo_id is null
  and prestamo_id_legacy is not null;

alter table public.prestamo_solicitudes
  drop column if exists prestamo_id_legacy;

commit;
