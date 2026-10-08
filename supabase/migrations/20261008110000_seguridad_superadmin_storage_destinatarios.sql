-- Seguridad (08-oct-2026, auditoría run-1). Tres arreglos de permisos, sin tocar datos ni el frontend.
-- Bitácora: docs/bitacora/2026-10-08-0706-claude.md. Prueba: supabase/pruebas/20261008110000_prueba_seguridad_graves.sql
--
-- Este archivo NO usa DROP: todo es "create or replace", "alter policy" o se crea solo si falta,
-- así se puede volver a correr sin efecto (idempotente).
--
--  1) usuarios_sistema / profiles: nadie que no sea superadmin puede darse ni dar el permiso de
--     superadministrador, cambiar la organización de un usuario, ni repuntar su perfil a otro usuario.
--  2) Storage (buckets 'comprobantes' y 'documentos'): cada organización solo ve y sube sus archivos;
--     reemplazar un archivo: el admin de esa organización o quien lo subió; borrar: solo el admin.
--  3) reporte_destinatarios: todos los usuarios de NEXUS PRO pueden VER la lista; solo el admin la cambia.

set lock_timeout = '5s';

-- ═════════════════════════════════════════════════════════════════════════════════════════════
-- 1) usuarios_sistema: proteger es_superadmin, organizacion_id e id
-- ═════════════════════════════════════════════════════════════════════════════════════════════
-- Por qué un disparador y no "revoke update (columna)": authenticated tiene UPDATE a nivel de TABLA,
-- y en Postgres quitar el permiso de una columna no tiene efecto mientras exista el de la tabla
-- (lo mismo pasa hoy en profiles: allí también lo que protege de verdad es el disparador).
--
-- Criterio "llamada directa desde el navegador" = current_user in ('authenticated','anon'), igual que
-- nx_escritura_directa_no_admin(): service_role (Edge Functions como crear-usuario-staff), migraciones y
-- RPC SECURITY DEFINER pasan sin cambios. El superadmin real también pasa.
create or replace function public.usuarios_sistema_proteger_privilegios()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if current_user not in ('authenticated', 'anon') or public.mi_es_superadmin() then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.es_superadmin, false) then
      raise exception 'No autorizado: solo el superadministrador puede crear otro superadministrador'
        using errcode = '42501';
    end if;
    if new.organizacion_id is distinct from public.mi_organizacion() then
      raise exception 'No autorizado: solo puedes crear usuarios de tu propia organización'
        using errcode = '42501';
    end if;
    return new;
  end if;

  -- La cuenta del superadministrador solo la toca el superadministrador (ni editar ni borrar).
  if coalesce(old.es_superadmin, false) then
    raise exception 'No autorizado: la cuenta del superadministrador no se puede modificar desde aquí'
      using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  if new.es_superadmin is distinct from old.es_superadmin
     or new.organizacion_id is distinct from old.organizacion_id
     or new.id is distinct from old.id then
    raise exception 'No autorizado: solo el superadministrador puede cambiar el permiso de superadministrador o la organización de un usuario'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace trigger trg_usuarios_sistema_proteger_privilegios
  before insert or update or delete on public.usuarios_sistema
  for each row execute function public.usuarios_sistema_proteger_privilegios();

-- 1b) profiles: mismo hueco por otra puerta. mi_organizacion() y mi_es_superadmin() se leen siguiendo
-- profiles.usuario_sistema_id; el disparador anterior (20260928160000) dejaba que un admin cambiara ese
-- campo en SU propio perfil y así "ser" otro usuario (incluido el superadmin). Ahora cambiar id o
-- usuario_sistema_id exige superadmin; el resto de la regla (rol, agente, activo, login → admin) queda igual.
-- El frontend solo actualiza must_change_password; la gestión de usuarios va por service_role.
create or replace function public.profiles_proteger_privilegios()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if auth.role() is null or auth.role() = 'service_role' then   -- sin JWT = conexión directa (migraciones, panel)
    return new;
  end if;

  if (new.id is distinct from old.id
      or new.usuario_sistema_id is distinct from old.usuario_sistema_id)
     and not public.mi_es_superadmin() then
    raise exception 'No autorizado: solo el superadministrador puede ligar un perfil a otro usuario del sistema'
      using errcode = '42501';
  end if;

  if (new.rol is distinct from old.rol
      or new.agente_id is distinct from old.agente_id
      or new.activo is distinct from old.activo
      or new.login is distinct from old.login)
     and coalesce(public.mi_rol(), '') <> 'admin' then
    raise exception 'No autorizado: solo un administrador puede cambiar el rol, el agente o el estado de un usuario'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
-- (el disparador trg_profiles_proteger_privilegios ya existe y apunta a esta función; no se recrea)

-- ═════════════════════════════════════════════════════════════════════════════════════════════
-- 2) Storage: buckets 'comprobantes' y 'documentos' separados por organización
-- ═════════════════════════════════════════════════════════════════════════════════════════════
-- Las rutas actuales NO llevan la organización (abonos/<cliente>/…, clientes/<cliente>/…,
-- prestamos/<préstamo>/…, vehiculos/<vehículo>/…, prestamo-solicitudes/<solicitud>/…), así que la
-- organización dueña del archivo se deduce así:
--   a) por la ruta, cuando el 2º segmento es el id de una fila conocida:
--        prestamo-solicitudes/<id> → prestamo_solicitudes.organizacion_id
--        prestamos/<id>            → prestamos.organizacion_id
--        abonos/<id>, clientes/<id> con <id> en public.clientes (clientes de Seguros) → organización 'nexus-pro'
--   b) si no, por quién lo subió (storage.objects.owner / owner_id → profiles → usuarios_sistema).
--   Si no se puede deducir, ningún usuario lo ve (service_role sigue pudiendo todo).
-- No hace falta cambiar el frontend: los archivos que sube la app ya llevan owner, y los que sube una
-- Edge Function (video de compromiso, por URL firmada) se resuelven por la ruta.
create or replace function public.nx_storage_objeto_de_mi_org(p_name text, p_owner text)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_mia uuid := public.mi_organizacion();
  v_org uuid;
  s1 text := split_part(coalesce(p_name, ''), '/', 1);
  s2 text := split_part(coalesce(p_name, ''), '/', 2);
  re_uuid constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
begin
  if v_mia is null or public.mi_rol() is null then
    return false;
  end if;

  -- a) por la ruta
  if s2 ~ re_uuid then
    if s1 = 'prestamo-solicitudes' then
      select organizacion_id into v_org from public.prestamo_solicitudes where id = s2::uuid;
    elsif s1 = 'prestamos' then
      select organizacion_id into v_org from public.prestamos where id = s2::uuid;
    elsif s1 in ('abonos', 'clientes') and exists (select 1 from public.clientes where id = s2::uuid) then
      select id into v_org from public.organizaciones where slug = 'nexus-pro';
    end if;
  end if;

  -- b) por quién lo subió
  if v_org is null and p_owner ~ re_uuid then
    select us.organizacion_id into v_org
      from public.profiles p
      join public.usuarios_sistema us on us.id = p.usuario_sistema_id
     where p.id = p_owner::uuid
     limit 1;
  end if;

  return v_org is not null and v_org = v_mia;
end;
$$;

revoke all on function public.nx_storage_objeto_de_mi_org(text, text) from public, anon;
grant execute on function public.nx_storage_objeto_de_mi_org(text, text) to authenticated, service_role;

-- Se cambian las condiciones de las 4 políticas existentes (mismo nombre, mismo comando).
alter policy nx_obj_select on storage.objects to authenticated
  using (bucket_id = any (array['comprobantes', 'documentos'])
         and public.nx_storage_objeto_de_mi_org(name, coalesce(owner::text, owner_id)));

alter policy nx_obj_insert on storage.objects to authenticated
  with check (bucket_id = any (array['comprobantes', 'documentos'])
              and public.nx_storage_objeto_de_mi_org(name, coalesce(owner::text, owner_id)));

-- Reemplazar (PUT / upsert): admin de esa organización, o quien subió el archivo.
alter policy nx_obj_update on storage.objects to authenticated
  using (bucket_id = any (array['comprobantes', 'documentos'])
         and public.nx_storage_objeto_de_mi_org(name, coalesce(owner::text, owner_id))
         and (public.mi_rol() = 'admin' or owner = auth.uid() or owner_id = auth.uid()::text))
  with check (bucket_id = any (array['comprobantes', 'documentos'])
              and public.nx_storage_objeto_de_mi_org(name, coalesce(owner::text, owner_id)));

-- Borrar: solo el admin de esa organización.
alter policy nx_obj_delete on storage.objects to authenticated
  using (bucket_id = any (array['comprobantes', 'documentos'])
         and public.nx_storage_objeto_de_mi_org(name, coalesce(owner::text, owner_id))
         and public.mi_rol() = 'admin');

-- ═════════════════════════════════════════════════════════════════════════════════════════════
-- 3) reporte_destinatarios: ver = cualquier usuario de NEXUS PRO; escribir = solo admin
-- ═════════════════════════════════════════════════════════════════════════════════════════════
-- La política es FOR ALL (no se puede cambiar de comando sin borrarla). Se deja:
--   USING      = la condición de lectura de siempre (ver, y elegir filas a editar/borrar)
--   WITH CHECK = admin                  → INSERT y UPDATE solo admin
-- y una política RESTRICTIVA para DELETE → borrar solo admin.
alter policy org_reporte_destinatarios on public.reporte_destinatarios to authenticated
  using (mi_rol() is not null
         and mi_organizacion() = (select id from public.organizaciones where slug = 'nexus-pro'))
  with check (mi_rol() = 'admin'
              and mi_organizacion() = (select id from public.organizaciones where slug = 'nexus-pro'));

do $$
begin
  if not exists (select 1 from pg_policies
                  where schemaname = 'public' and tablename = 'reporte_destinatarios'
                    and policyname = 'reporte_destinatarios_borrar_solo_admin') then
    create policy reporte_destinatarios_borrar_solo_admin on public.reporte_destinatarios
      as restrictive for delete to authenticated
      using (mi_rol() = 'admin');
  end if;
end $$;

reset lock_timeout;
