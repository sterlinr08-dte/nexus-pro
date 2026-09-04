-- NEXUS PRO
-- Reparacion previa de referencias legacy huerfanas en solicitudes de prestamos.
-- Motivo: el esquema historico permitia prestamo_solicitudes.prestamo_id sin FK.
-- Esta migracion NO borra evidencia: preserva el UUID original antes de limpiar la FK operativa.

begin;

alter table public.prestamo_solicitudes
  add column if not exists prestamo_id_legacy uuid;

update public.prestamo_solicitudes s
set prestamo_id_legacy = coalesce(s.prestamo_id_legacy, s.prestamo_id),
    prestamo_id = null
where s.prestamo_id is not null
  and not exists (
    select 1
    from public.prestamos p
    where p.id = s.prestamo_id
  );

do $$
begin
  if exists (
    select 1
    from public.prestamo_solicitudes s
    where s.prestamo_id is not null
      and not exists (select 1 from public.prestamos p where p.id = s.prestamo_id)
  ) then
    raise exception 'Persisten referencias huerfanas prestamo_solicitudes.prestamo_id';
  end if;
end
$$;

comment on column public.prestamo_solicitudes.prestamo_id_legacy is
  'UUID historico preservado cuando una solicitud legacy apuntaba a un prestamo inexistente. No usar como FK operativa.';

commit;
