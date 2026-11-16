-- 16-nov-2026 (dueño: «el nivel del precio solo se pueda facturar o prefacturar a los clientes que lo tengan asignado
-- … y que los empleados no lo puedan cambiar o modificar»).
-- Candado en la base: solo admin o gerente pueden asignar o cambiar nivel_id / nivel_precio de un cliente. Los demás
-- roles (cajero, agente…) pueden crear clientes con el nivel por defecto y editar otros datos, pero no el nivel.
-- Ensayo con vuelta atrás: cajera de otra empresa → cambiar nivel NIVEL_SOLO_ADMIN, otro dato OK, alta normal OK,
-- alta con nivel VIP NIVEL_SOLO_ADMIN; gerente de la demo → cambia nivel OK.
create or replace function public.pos_clientes_nivel_candado() returns trigger language plpgsql security definer set search_path to 'public' as $fn$
declare v_rol text := public.mi_rol(); v_def uuid;
begin
  if v_rol is null or v_rol in ('admin', 'gerente') then return new; end if;
  if tg_op = 'UPDATE' then
    if new.nivel_id is distinct from old.nivel_id or coalesce(new.nivel_precio, 'final') is distinct from coalesce(old.nivel_precio, 'final') then
      raise exception 'NIVEL_SOLO_ADMIN' using errcode = '42501';
    end if;
  else
    select id into v_def from public.pos_niveles_precio where organizacion_id = coalesce(new.organizacion_id, public.mi_organizacion()) and es_default is true and coalesce(activo, true) limit 1;
    if (new.nivel_id is not null and new.nivel_id is distinct from v_def) or coalesce(new.nivel_precio, 'final') <> 'final' then
      raise exception 'NIVEL_SOLO_ADMIN' using errcode = '42501';
    end if;
  end if;
  return new;
end $fn$;
create or replace trigger trg_pos_clientes_nivel_candado before insert or update on public.pos_clientes for each row execute function public.pos_clientes_nivel_candado();
