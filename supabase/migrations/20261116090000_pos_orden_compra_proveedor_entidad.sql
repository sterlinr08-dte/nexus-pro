-- 16-nov-2026 (Muse): el proveedor también puede ser una entidad marcada «es proveedor» (pos_clientes.es_proveedor), como en Compras.
-- Antes solo se buscaba en pos_proveedores y salía PROVEEDOR_NO_EXISTE. Solo reemplaza la función de crear.
create or replace function public.pos_orden_compra_crear(p_proveedor uuid, p_fecha_esperada date, p_notas text, p_items jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_org uuid := public.mi_organizacion(); v_id uuid; v_num text; v_n int; v_usuario text; v_prov text; it jsonb; v_cant numeric; v_costo numeric; v_nom text; v_tot numeric := 0; v_items int := 0;
begin
  if v_org is null or public.mi_rol() is null then raise exception 'NO_AUTORIZADO' using errcode = '42501'; end if;
  if p_proveedor is not null then
    select nombre into v_prov from public.pos_proveedores where id = p_proveedor and organizacion_id = v_org;
    if v_prov is null then select nombre into v_prov from public.pos_clientes where id = p_proveedor and organizacion_id = v_org and es_proveedor is true; end if;
    if v_prov is null then raise exception 'PROVEEDOR_NO_EXISTE'; end if;
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 300 then raise exception 'SIN_ARTICULOS'; end if;
  perform pg_advisory_xact_lock(hashtext('pos_orden_compra:' || v_org::text));
  select coalesce(max(nullif(regexp_replace(numero, '\D', '', 'g'), '')::int), 0) + 1 into v_n from public.pos_ordenes_compra where organizacion_id = v_org;
  v_num := 'OC-' || lpad(v_n::text, 5, '0');
  select nom into v_usuario from public.profiles where id = auth.uid();
  insert into public.pos_ordenes_compra (organizacion_id, numero, proveedor_id, proveedor_nombre, fecha_esperada, notas, created_by_name)
  values (v_org, v_num, p_proveedor, v_prov, p_fecha_esperada, nullif(btrim(coalesce(p_notas, '')), ''), v_usuario) returning id into v_id;
  for it in select * from jsonb_array_elements(p_items) loop
    v_cant := nullif(it->>'cantidad', '')::numeric; v_costo := coalesce(nullif(it->>'costo', '')::numeric, 0);
    if v_cant is null or v_cant <= 0 or v_cant > 1000000 then raise exception 'CANTIDAD_INVALIDA'; end if;
    if v_costo < 0 or v_costo > 100000000 then raise exception 'COSTO_INVALIDO'; end if;
    select nombre into v_nom from public.pos_productos where id = (it->>'producto_id')::uuid and organizacion_id = v_org and coalesce(tipo, 'producto') <> 'servicio';
    if v_nom is null then raise exception 'ARTICULO_NO_EXISTE'; end if;
    insert into public.pos_orden_compra_items (organizacion_id, orden_id, producto_id, nombre, cantidad, costo) values (v_org, v_id, (it->>'producto_id')::uuid, v_nom, v_cant, round(v_costo, 2));
    v_tot := v_tot + round(v_cant * v_costo, 2); v_items := v_items + 1;
  end loop;
  update public.pos_ordenes_compra set total_estimado = v_tot where id = v_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'numero', v_num, 'items', v_items, 'total', v_tot);
end $fn$;
revoke execute on function public.pos_orden_compra_crear(uuid, date, text, jsonb) from public, anon;
grant execute on function public.pos_orden_compra_crear(uuid, date, text, jsonb) to authenticated;
