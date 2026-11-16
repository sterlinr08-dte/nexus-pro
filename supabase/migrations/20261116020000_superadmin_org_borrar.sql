-- Panel del dueño: borrar un registro web falso o de prueba (16-nov-2026, decisión del dueño: opción A).
-- Solo el superadmin; solo tiendas que llegaron por la web (origen = 'web') y que NO tienen ventas. Nunca la empresa
-- principal ni la demo. Todo o nada: si algo no se puede borrar, no se borra nada.
create or replace function public.superadmin_org_borrar(p_org uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare o public.organizaciones%rowtype; t record; v_pasada int; v_falta boolean; n int; v_filas int := 0; v_usuarios int := 0;
begin
  if not public.mi_es_superadmin() then raise exception 'NO_AUTORIZADO' using errcode = '42501'; end if;
  select * into o from public.organizaciones where id = p_org;
  if o.id is null then raise exception 'ORG_NO_EXISTE'; end if;
  if o.slug in ('nexus-pro', 'demo') or p_org = 'de300000-0000-4000-8000-000000000001' then raise exception 'EMPRESA_PROTEGIDA'; end if;
  if o.origen is distinct from 'web' then raise exception 'SOLO_REGISTROS_WEB'; end if;
  if exists (select 1 from public.pos_ventas where organizacion_id = p_org) then raise exception 'TIENE_VENTAS'; end if;

  -- Accesos: el perfil cae en cascada al borrar el usuario de Auth; por si no, se borra antes.
  create temp table _nx_borrar_auth on commit drop as
    select p.id from public.profiles p join public.usuarios_sistema u on u.id = p.usuario_sistema_id where u.organizacion_id = p_org;
  delete from public.profiles where id in (select id from _nx_borrar_auth);
  delete from auth.users where id in (select id from _nx_borrar_auth);
  get diagnostics v_usuarios = row_count;

  for v_pasada in 1..6 loop
    v_falta := false;
    for t in select c.relname from pg_class c join pg_namespace s on s.oid = c.relnamespace
             where s.nspname = 'public' and c.relkind = 'r' and c.relname <> 'organizaciones'
               and exists (select 1 from information_schema.columns k where k.table_schema = 'public' and k.table_name = c.relname and k.column_name = 'organizacion_id')
    loop
      begin
        execute format('delete from public.%I where organizacion_id = $1', t.relname) using p_org;
        get diagnostics n = row_count; v_filas := v_filas + n;
      exception when others then v_falta := true;
      end;
    end loop;
    exit when not v_falta;
  end loop;
  if v_falta then raise exception 'BORRADO_INCOMPLETO'; end if;
  delete from public.organizaciones where id = p_org;
  begin
    insert into public.auditoria(accion, detalle, modulo) values ('SUPERADMIN_ORG_BORRAR', o.slug || ' · ' || coalesce(o.nombre, ''), 'Multiempresa');
  exception when others then null;
  end;
  return jsonb_build_object('ok', true, 'slug', o.slug, 'usuarios', v_usuarios, 'filas', v_filas);
end $fn$;
revoke execute on function public.superadmin_org_borrar(uuid) from public, anon;
grant execute on function public.superadmin_org_borrar(uuid) to authenticated;
