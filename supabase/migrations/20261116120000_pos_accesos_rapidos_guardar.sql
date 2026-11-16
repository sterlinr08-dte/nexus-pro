-- 16-nov-2026 (prueba de Muse a la 6061): los accesos rápidos no se guardaban para el gerente. pos_config solo deja escribir
-- al admin (política pos_config_admin), el PATCH no cambiaba ninguna fila y la pantalla decía «Accesos guardados».
-- Esta función deja guardar SOLO esa lista a admin y gerente de la misma empresa, valida que los artículos sean de la
-- empresa (máx. 8) y devuelve lo que quedó guardado. Ensayo con vuelta atrás: gerente de la demo guarda; un artículo de
-- otra empresa se rechaza con ARTICULO_NO_EXISTE.
create or replace function public.pos_accesos_rapidos_guardar(p_ids jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_org uuid := public.mi_organizacion(); v_rol text := public.mi_rol(); v_lista jsonb; v_n int; v_total int;
begin
  if v_org is null or coalesce(v_rol, '') not in ('admin', 'gerente') then raise exception 'NO_AUTORIZADO' using errcode = '42501'; end if;
  if p_ids is null or jsonb_typeof(p_ids) = 'null' then v_lista := null;
  else
    if jsonb_typeof(p_ids) <> 'array' or jsonb_array_length(p_ids) > 8 then raise exception 'LISTA_INVALIDA'; end if;
    v_total := jsonb_array_length(p_ids);
    select coalesce(jsonb_agg(to_jsonb(x.id) order by x.ord), '[]'::jsonb), count(*) into v_lista, v_n
      from (select e.value #>> '{}' as id, e.ord from jsonb_array_elements(p_ids) with ordinality as e(value, ord)) x
      where exists (select 1 from public.pos_productos p where p.id::text = x.id and p.organizacion_id = v_org);
    if v_n <> v_total then raise exception 'ARTICULO_NO_EXISTE'; end if;
    if v_n = 0 then v_lista := null; end if;
  end if;
  update public.pos_config set accesos_rapidos = v_lista where organizacion_id = v_org;
  if not found then insert into public.pos_config (organizacion_id, accesos_rapidos) values (v_org, v_lista); end if;
  return jsonb_build_object('ok', true, 'accesos', v_lista);
end $fn$;
revoke execute on function public.pos_accesos_rapidos_guardar(jsonb) from public, anon;
grant execute on function public.pos_accesos_rapidos_guardar(jsonb) to authenticated;
