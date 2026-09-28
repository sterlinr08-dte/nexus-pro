-- Seguridad (28-sep-2026, auditoría): un usuario con sesión podía cambiar SU PROPIO perfil (rol, agente,
-- usuario del sistema, activo) con PATCH /rest/v1/profiles, porque la política profiles_self_update solo
-- exige id = auth.uid() y «authenticated» tenía UPDATE sobre esas columnas. Todas las comprobaciones de
-- permisos (mi_rol, mi_agente_efectivo, mi_organizacion) leen esas columnas → cualquiera podía hacerse admin.
--
-- El frontend solo actualiza must_change_password; la gestión de usuarios se hace en el servidor (service_role).
-- 1) Se quita el permiso de columna a anon/authenticated para las columnas de privilegio.
-- 2) Además, un trigger rechaza el cambio si no viene de service_role / conexión directa / un admin.

revoke update (rol, agente_id, usuario_sistema_id, activo, id, login) on public.profiles from anon, authenticated;

create or replace function public.profiles_proteger_privilegios()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if (new.id is distinct from old.id
      or new.rol is distinct from old.rol
      or new.agente_id is distinct from old.agente_id
      or new.usuario_sistema_id is distinct from old.usuario_sistema_id
      or new.activo is distinct from old.activo
      or new.login is distinct from old.login)
     and auth.role() is not null                      -- sin JWT = conexión directa (migraciones, panel)
     and auth.role() <> 'service_role'
     and coalesce(public.mi_rol(), '') <> 'admin' then
    raise exception 'No autorizado: solo un administrador puede cambiar el rol, el agente o el estado de un usuario'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_proteger_privilegios on public.profiles;
create trigger trg_profiles_proteger_privilegios
  before update on public.profiles
  for each row execute function public.profiles_proteger_privilegios();
