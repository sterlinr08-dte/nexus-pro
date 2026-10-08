-- Prueba de 20261008110000_seguridad_superadmin_storage_destinatarios.sql en la base real SIN dejar nada.
-- Todo va en UNA transacción (begin … rollback) y, además, el bloque de pruebas termina en un error a
-- propósito (RESULTADOS_QA…) que trae los resultados: aunque alguien quite el rollback, nada se guarda.
--
-- Cómo correrla: pegar el archivo COMPLETO en el editor SQL de Supabase (proyecto tnwsgcxurfyuszxsewsn)
-- o pasarlo por la herramienta execute_sql, en una sola ejecución. Esperado: error "RESULTADOS_QA" con
-- la primera línea "TODO OK". Si dice "HAY n FALLA(S)", NO aplicar la migración.
--
-- SECCIÓN 1 es copia literal de la migración (si se cambia la migración, volver a copiarla aquí).
-- SECCIÓN 2 simula sesiones con `set local role authenticated` + request.jwt.claims (como la prueba de
-- fiado v2). Usa usuarios reales SOLO como identidad para simular la sesión; sus filas no se tocan.
-- Datos de prueba: un usuario_sistema, una solicitud de préstamo, 4–5 objetos de Storage (solo la fila del
-- catálogo, sin archivo) y un destinatario de reporte, todos con ids aaaaaaaa-… y todos se deshacen.
-- Nota: el cambio de políticas toma un candado breve sobre storage.objects mientras dura la prueba (< 1 s).

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- ═════════════════════════════════════════════════════════════════════════════════════════════
-- SECCIÓN 1 — Migración (copia literal)
-- ═════════════════════════════════════════════════════════════════════════════════════════════
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

-- ═════════════════════════════════════════════════════════════════════════════════════════════
-- SECCIÓN 2 — Pruebas. Todo termina en un error a propósito (RESULTADOS_QA…) que trae los resultados.
-- ═════════════════════════════════════════════════════════════════════════════════════════════
do $qa$
declare
  out text := '';
  fallas int := 0;
  n int; n2 int;
  v_nexus uuid;
  v_org_a uuid; v_admin_a uuid; v_us_admin_a uuid; v_noadmin_a uuid;
  v_org_b uuid; v_user_b uuid;
  v_admin_nx uuid; v_noadmin_nx uuid; v_admin_nx_nosuper uuid; v_us_super uuid;
  us_fix  constant uuid := 'aaaaaaaa-0000-4000-8000-000000000001';
  us_fix2 constant uuid := 'aaaaaaaa-0000-4000-8000-000000000002';
  sol_b   constant uuid := 'aaaaaaaa-0000-4000-8000-000000000003';
  veh     constant uuid := 'aaaaaaaa-0000-4000-8000-000000000004';
  rd_fix  constant uuid := 'aaaaaaaa-0000-4000-8000-000000000005';
  obj_a uuid; obj_a2 uuid; obj_b uuid; obj_b2 uuid; obj_na uuid;
begin
  execute $s$set local client_min_messages = warning$s$;
  execute $s$set local statement_timeout = '45s'$s$;

  -- ── Identidades (solo se usan para simular sesiones; sus filas no se modifican) ──
  select id into v_nexus from public.organizaciones where slug = 'nexus-pro';
  -- Org A: un admin que NO es superadmin, de una organización distinta de NEXUS PRO (Bayolsale primero).
  select p.id, us.id, us.organizacion_id into v_admin_a, v_us_admin_a, v_org_a
    from public.profiles p join public.usuarios_sistema us on us.id = p.usuario_sistema_id
   where p.rol = 'admin' and p.activo is not false and not coalesce(us.es_superadmin, false)
     and us.organizacion_id is not null and us.organizacion_id <> v_nexus
   order by (us.organizacion_id = 'c6e4b954-45ee-46b9-ba94-ae1cbbcc7e10') desc
   limit 1;
  if v_admin_a is null then raise exception 'QA_SIN_DATOS: no hay un admin (no superadmin) fuera de NEXUS PRO'; end if;
  select p.id into v_noadmin_a
    from public.profiles p join public.usuarios_sistema us on us.id = p.usuario_sistema_id
   where us.organizacion_id = v_org_a and p.rol <> 'admin' and p.activo is not false limit 1;
  -- Org B = NEXUS PRO.
  v_org_b := v_nexus;
  select p.id into v_admin_nx
    from public.profiles p join public.usuarios_sistema us on us.id = p.usuario_sistema_id
   where us.organizacion_id = v_nexus and p.rol = 'admin' and p.activo is not false
   order by coalesce(us.es_superadmin, false) limit 1;
  select p.id into v_admin_nx_nosuper
    from public.profiles p join public.usuarios_sistema us on us.id = p.usuario_sistema_id
   where us.organizacion_id = v_nexus and p.rol = 'admin' and p.activo is not false
     and not coalesce(us.es_superadmin, false) limit 1;
  select p.id into v_noadmin_nx
    from public.profiles p join public.usuarios_sistema us on us.id = p.usuario_sistema_id
   where us.organizacion_id = v_nexus and p.rol <> 'admin' and p.activo is not false limit 1;
  v_user_b := coalesce(v_noadmin_nx, v_admin_nx);
  if v_user_b is null then raise exception 'QA_SIN_DATOS: no hay usuarios de NEXUS PRO'; end if;
  select id into v_us_super from public.usuarios_sistema where es_superadmin limit 1;

  -- ── Datos de prueba (como postgres; todo se deshace) ──
  insert into public.usuarios_sistema (id, nom, login, rol, activo, organizacion_id)
  values (us_fix, 'QA SEGURIDAD (se deshace)', 'qa_seg_fix_1', 'cajero', false, v_org_a);
  insert into public.prestamo_solicitudes (id, organizacion_id, nombre, modo)
  values (sol_b, v_org_b, 'QA SEGURIDAD (se deshace)', 'qa');
  insert into storage.objects (bucket_id, name, owner, owner_id)
  values ('comprobantes', 'vehiculos/' || veh || '/qa-a.jpg', v_admin_a, v_admin_a::text) returning id into obj_a;
  insert into storage.objects (bucket_id, name, owner, owner_id)
  values ('comprobantes', 'vehiculos/' || veh || '/qa-b.jpg', v_user_b, v_user_b::text) returning id into obj_b;
  insert into storage.objects (bucket_id, name, owner, owner_id)          -- como lo sube la Edge Function: sin owner
  values ('documentos', 'prestamo-solicitudes/' || sol_b || '/compromiso.mp4', null, null) returning id into obj_b2;
  insert into public.reporte_destinatarios (id, nombre, correo, secciones, activo)
  values (rd_fix, 'QA SEGURIDAD (se deshace)', 'qa@invalid.example', '[]', false);

  -- ════════════ Sesión: ADMIN de la organización A ════════════
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin_a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  out := out || 'admin A: org=' || coalesce(public.mi_organizacion()::text, 'NULL') || ' rol=' || coalesce(public.mi_rol(), 'NULL')
             || ' superadmin=' || public.mi_es_superadmin() || E'\n';

  -- 1. Darse superadmin a sí mismo → bloqueado
  begin
    update public.usuarios_sistema set es_superadmin = true where id = v_us_admin_a;
    out := out || 'FALLA 1: el admin se dio superadmin' || E'\n'; fallas := fallas + 1;
  exception when others then out := out || '1 OK  propio es_superadmin → ' || sqlerrm || E'\n'; end;
  -- 2. Mover un usuario de su organización a otra → bloqueado
  begin
    update public.usuarios_sistema set organizacion_id = v_org_b where id = us_fix;
    out := out || 'FALLA 2: cambió organizacion_id' || E'\n'; fallas := fallas + 1;
  exception when others then out := out || '2 OK  cambiar organizacion_id → ' || sqlerrm || E'\n'; end;
  -- 3. Edición normal (nombre, cargo, rol, activo) de un usuario de su organización → funciona
  begin
    update public.usuarios_sistema set nom = 'QA EDITADO', cargo = 'QA', rol = 'vendedor', activo = true where id = us_fix;
    get diagnostics n = row_count;
    if n = 1 then out := out || '3 OK  edición normal por admin → 1 fila' || E'\n';
    else out := out || 'FALLA 3: edición normal afectó ' || n || ' filas' || E'\n'; fallas := fallas + 1; end if;
  exception when others then out := out || 'FALLA 3: edición normal rechazada → ' || sqlerrm || E'\n'; fallas := fallas + 1; end;
  -- 4. Crear un usuario superadmin → bloqueado
  begin
    insert into public.usuarios_sistema (nom, login, rol, activo, organizacion_id, es_superadmin)
    values ('QA SUPER', 'qa_seg_super', 'admin', false, v_org_a, true);
    out := out || 'FALLA 4: creó un superadmin' || E'\n'; fallas := fallas + 1;
  exception when others then out := out || '4 OK  crear superadmin → ' || sqlerrm || E'\n'; end;
  -- 5. Crear un usuario normal de su organización → funciona
  begin
    insert into public.usuarios_sistema (id, nom, login, rol, activo, organizacion_id)
    values (us_fix2, 'QA NUEVO', 'qa_seg_fix_2', 'cajero', false, v_org_a);
    out := out || '5 OK  crear usuario normal' || E'\n';
  exception when others then out := out || 'FALLA 5: crear usuario normal → ' || sqlerrm || E'\n'; fallas := fallas + 1; end;
  -- 6. Repuntar su propio perfil a otro usuario del sistema → bloqueado
  begin
    update public.profiles set usuario_sistema_id = us_fix where id = v_admin_a;
    out := out || 'FALLA 6: repuntó su perfil' || E'\n'; fallas := fallas + 1;
  exception when others then out := out || '6 OK  repuntar profiles.usuario_sistema_id → ' || sqlerrm || E'\n'; end;
  -- 6b. Lo que la app sí hace en profiles (must_change_password) → funciona
  begin
    update public.profiles set must_change_password = must_change_password where id = v_admin_a;
    get diagnostics n = row_count;
    out := out || case when n = 1 then '6b OK must_change_password → 1 fila' else 'FALLA 6b: ' || n || ' filas' end || E'\n';
    if n <> 1 then fallas := fallas + 1; end if;
  exception when others then out := out || 'FALLA 6b: ' || sqlerrm || E'\n'; fallas := fallas + 1; end;
  if public.mi_es_superadmin() then out := out || 'FALLA 7: quedó superadmin' || E'\n'; fallas := fallas + 1;
  else out := out || '7 OK  sigue sin ser superadmin' || E'\n'; end if;

  -- Storage
  select count(*), count(*) filter (where id = obj_a) into n, n2 from storage.objects where id in (obj_a, obj_b, obj_b2);
  if n = 1 and n2 = 1 then out := out || '8 OK  A ve solo su archivo (no los de B)' || E'\n';
  else out := out || 'FALLA 8: A ve archivos ajenos o no ve el suyo' || E'\n'; fallas := fallas + 1; end if;
  update storage.objects set metadata = coalesce(metadata, '{}'::jsonb) || '{"qa":1}' where id in (obj_b, obj_b2);
  get diagnostics n = row_count;
  if n = 0 then out := out || '9 OK  A no puede modificar archivos de B' || E'\n';
  else out := out || 'FALLA 9: A modificó ' || n || ' archivos de B' || E'\n'; fallas := fallas + 1; end if;
  update storage.objects set metadata = coalesce(metadata, '{}'::jsonb) || '{"qa":1}' where id = obj_a;
  get diagnostics n = row_count;
  if n = 1 then out := out || '10 OK A modifica su propio archivo' || E'\n';
  else out := out || 'FALLA 10: A no pudo modificar su archivo' || E'\n'; fallas := fallas + 1; end if;
  begin
    insert into storage.objects (bucket_id, name, owner, owner_id)
    values ('documentos', 'prestamo-solicitudes/' || sol_b || '/intruso.mp4', v_admin_a, v_admin_a::text);
    out := out || 'FALLA 11: A subió dentro de la carpeta de una solicitud de B' || E'\n'; fallas := fallas + 1;
  exception when others then out := out || '11 OK subir a carpeta de B → ' || sqlerrm || E'\n'; end;
  begin
    insert into storage.objects (bucket_id, name, owner, owner_id)
    values ('comprobantes', 'vehiculos/' || veh || '/qa-a2.jpg', v_admin_a, v_admin_a::text) returning id into obj_a2;
    out := out || '12 OK A sube un archivo nuevo' || E'\n';
  exception when others then out := out || 'FALLA 12: A no pudo subir → ' || sqlerrm || E'\n'; fallas := fallas + 1; end;
  perform set_config('storage.allow_delete_query', 'true', true);   -- lo mismo que hace la API de Storage
  delete from storage.objects where id in (obj_b, obj_b2);
  get diagnostics n = row_count;
  if n = 0 then out := out || '13 OK A no puede borrar archivos de B' || E'\n';
  else out := out || 'FALLA 13: A borró ' || n || ' archivos de B' || E'\n'; fallas := fallas + 1; end if;
  delete from storage.objects where id = obj_a;
  get diagnostics n = row_count;
  if n = 1 then out := out || '14 OK admin A borra un archivo de su organización' || E'\n';
  else out := out || 'FALLA 14: admin A no pudo borrar su archivo' || E'\n'; fallas := fallas + 1; end if;
  execute 'reset role';

  -- ════════════ Sesión: NO admin de la organización A (si existe) ════════════
  if v_noadmin_a is not null and obj_a2 is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', v_noadmin_a, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select count(*) into n from storage.objects where id = obj_a2;
    out := out || case when n = 1 then '15 OK no admin de A ve el archivo de su organización' else 'FALLA 15: no lo ve' end || E'\n';
    if n <> 1 then fallas := fallas + 1; end if;
    update storage.objects set metadata = coalesce(metadata, '{}'::jsonb) || '{"qa":2}' where id = obj_a2;
    get diagnostics n = row_count;
    out := out || case when n = 0 then '16 OK no admin no reemplaza archivo ajeno' else 'FALLA 16: lo modificó' end || E'\n';
    if n <> 0 then fallas := fallas + 1; end if;
    delete from storage.objects where id = obj_a2;
    get diagnostics n = row_count;
    out := out || case when n = 0 then '17 OK no admin no borra' else 'FALLA 17: borró' end || E'\n';
    if n <> 0 then fallas := fallas + 1; end if;
    begin
      insert into storage.objects (bucket_id, name, owner, owner_id)
      values ('comprobantes', 'vehiculos/' || veh || '/qa-na.jpg', v_noadmin_a, v_noadmin_a::text) returning id into obj_na;
      update storage.objects set metadata = coalesce(metadata, '{}'::jsonb) || '{"qa":3}' where id = obj_na;
      get diagnostics n = row_count;
      out := out || case when n = 1 then '18 OK no admin sube y reemplaza su propio archivo' else 'FALLA 18: no reemplazó el suyo' end || E'\n';
      if n <> 1 then fallas := fallas + 1; end if;
    exception when others then out := out || 'FALLA 18: ' || sqlerrm || E'\n'; fallas := fallas + 1; end;
    execute 'reset role';
  else
    out := out || '15-18 omitidas: no hay un usuario no admin en la organización A' || E'\n';
  end if;

  -- ════════════ Sesión: usuario de la organización B (NEXUS PRO) ════════════
  perform set_config('request.jwt.claims', json_build_object('sub', v_user_b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from storage.objects where id in (obj_b, obj_b2);
  out := out || case when n = 2 then '19 OK B ve sus 2 archivos (también el video subido sin owner, por la ruta)' else 'FALLA 19: B ve ' || n || ' de 2' end || E'\n';
  if n <> 2 then fallas := fallas + 1; end if;
  select count(*) into n from storage.objects where id = obj_a2;
  out := out || case when n = 0 then '20 OK B no ve archivos de A' else 'FALLA 20: B ve archivos de A' end || E'\n';
  if n <> 0 then fallas := fallas + 1; end if;
  execute 'reset role';

  -- ════════════ reporte_destinatarios ════════════
  if v_noadmin_nx is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', v_noadmin_nx, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select count(*) into n from public.reporte_destinatarios where id = rd_fix;
    out := out || case when n = 1 then '21 OK no admin de NEXUS ve la lista' else 'FALLA 21: no ve la lista' end || E'\n';
    if n <> 1 then fallas := fallas + 1; end if;
    begin
      insert into public.reporte_destinatarios (nombre, correo, secciones, activo) values ('QA', 'qa2@invalid.example', '[]', false);
      out := out || 'FALLA 22: no admin insertó destinatario' || E'\n'; fallas := fallas + 1;
    exception when others then out := out || '22 OK no admin no inserta → ' || sqlerrm || E'\n'; end;
    begin
      update public.reporte_destinatarios set correo = 'qa3@invalid.example' where id = rd_fix;
      get diagnostics n = row_count;
      if n = 0 then out := out || '23 OK no admin no edita (0 filas)' || E'\n';
      else out := out || 'FALLA 23: no admin editó' || E'\n'; fallas := fallas + 1; end if;
    exception when others then out := out || '23 OK no admin no edita → ' || sqlerrm || E'\n'; end;
    delete from public.reporte_destinatarios where id = rd_fix;
    get diagnostics n = row_count;
    out := out || case when n = 0 then '24 OK no admin no borra' else 'FALLA 24: no admin borró' end || E'\n';
    if n <> 0 then fallas := fallas + 1; end if;
    execute 'reset role';
  else
    out := out || '21-24 omitidas: no hay usuario no admin en NEXUS PRO' || E'\n';
  end if;
  if v_admin_nx is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin_nx, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
      insert into public.reporte_destinatarios (nombre, correo, secciones, activo) values ('QA', 'qa4@invalid.example', '[]', false);
      update public.reporte_destinatarios set activo = false where id = rd_fix;
      delete from public.reporte_destinatarios where id = rd_fix;
      get diagnostics n = row_count;
      out := out || case when n = 1 then '25 OK admin de NEXUS inserta, edita y borra destinatarios' else 'FALLA 25: borrar afectó ' || n end || E'\n';
      if n <> 1 then fallas := fallas + 1; end if;
    exception when others then out := out || 'FALLA 25: admin rechazado → ' || sqlerrm || E'\n'; fallas := fallas + 1; end;
    execute 'reset role';
  end if;

  -- ════════════ La cuenta del superadmin no la toca otro admin ════════════
  if v_admin_nx_nosuper is not null and v_us_super is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin_nx_nosuper, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
      update public.usuarios_sistema set activo = false where id = v_us_super;
      get diagnostics n = row_count;
      if n = 0 then out := out || '26 OK otro admin no ve/edita la cuenta del superadmin (0 filas)' || E'\n';
      else out := out || 'FALLA 26: otro admin desactivó al superadmin' || E'\n'; fallas := fallas + 1; end if;
    exception when others then out := out || '26 OK otro admin no edita al superadmin → ' || sqlerrm || E'\n'; end;
    execute 'reset role';
  else
    out := out || '26 omitida: no hay otro admin (no superadmin) en NEXUS PRO' || E'\n';
  end if;

  raise exception 'RESULTADOS_QA %', E'\n' || case when fallas = 0 then 'TODO OK' else 'HAY ' || fallas || ' FALLA(S)' end || E'\n' || out;
end $qa$;

rollback;
