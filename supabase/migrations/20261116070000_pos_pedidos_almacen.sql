-- Pedidos entre almacenes (16-nov-2026, dueño: «Pedido entre almacén»; reportes Infoplus «Requisiciones pendientes» y «Solicitudes inventario»).
-- Un almacén pide mercancía a otro. El pedido NO mueve inventario: se atiende con la transferencia que ya existe (pos_transferir_stock)
-- y aquí solo se anota que quedó despachado. Solo agrega: dos tablas y dos funciones. Llaves sin borrado en cascada a propósito.
create table if not exists public.pos_pedidos_almacen (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id),
  numero text not null,
  pide_id uuid not null,            -- almacén que necesita la mercancía (destino)
  surte_id uuid not null,           -- almacén al que se le pide (origen)
  estado text not null default 'pendiente',   -- pendiente | despachado | rechazado | anulado
  notas text,
  motivo text,                      -- motivo de rechazo o anulación
  transferencia_id uuid,
  transferencia_numero text,
  created_by_name text,
  created_at timestamptz not null default now(),
  atendido_por text,
  atendido_at timestamptz
);
create unique index if not exists pos_pedidos_almacen_num_uq on public.pos_pedidos_almacen (organizacion_id, numero);
create index if not exists pos_pedidos_almacen_org_idx on public.pos_pedidos_almacen (organizacion_id, created_at desc);
create table if not exists public.pos_pedido_almacen_items (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id),
  pedido_id uuid not null references public.pos_pedidos_almacen(id),
  producto_id uuid not null,
  nombre text,
  cantidad numeric not null,
  despachado numeric not null default 0
);
create index if not exists pos_pedido_almacen_items_ped_idx on public.pos_pedido_almacen_items (pedido_id);

alter table public.pos_pedidos_almacen enable row level security;
alter table public.pos_pedido_almacen_items enable row level security;
revoke all on public.pos_pedidos_almacen from anon, authenticated;
revoke all on public.pos_pedido_almacen_items from anon, authenticated;
grant select on public.pos_pedidos_almacen to authenticated;
grant select on public.pos_pedido_almacen_items to authenticated;
create policy pos_ped_alm_leer on public.pos_pedidos_almacen for select to authenticated
  using (public.mi_rol() is not null and organizacion_id = public.mi_organizacion());
create policy pos_ped_alm_items_leer on public.pos_pedido_almacen_items for select to authenticated
  using (public.mi_rol() is not null and organizacion_id = public.mi_organizacion());

-- Crear: todo o nada; numera PA-00001 por empresa sin choques.
create or replace function public.pos_pedido_almacen_crear(p_pide uuid, p_surte uuid, p_notas text, p_items jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_org uuid := public.mi_organizacion(); v_id uuid; v_num text; v_n int; v_usuario text; it jsonb; v_cant numeric; v_nom text; v_items int := 0;
begin
  if v_org is null or public.mi_rol() is null then raise exception 'NO_AUTORIZADO' using errcode = '42501'; end if;
  if p_pide is null or p_surte is null or p_pide = p_surte then raise exception 'ALMACENES_INVALIDOS'; end if;
  if (select count(*) from public.pos_almacenes where organizacion_id = v_org and id in (p_pide, p_surte) and coalesce(activo, true)) <> 2 then raise exception 'ALMACENES_INVALIDOS'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 300 then raise exception 'SIN_ARTICULOS'; end if;
  perform pg_advisory_xact_lock(hashtext('pos_pedido_almacen:' || v_org::text));
  select coalesce(max(nullif(regexp_replace(numero, '\D', '', 'g'), '')::int), 0) + 1 into v_n from public.pos_pedidos_almacen where organizacion_id = v_org;
  v_num := 'PA-' || lpad(v_n::text, 5, '0');
  select nom into v_usuario from public.profiles where id = auth.uid();
  insert into public.pos_pedidos_almacen (organizacion_id, numero, pide_id, surte_id, notas, created_by_name)
  values (v_org, v_num, p_pide, p_surte, nullif(btrim(coalesce(p_notas, '')), ''), v_usuario) returning id into v_id;
  for it in select * from jsonb_array_elements(p_items) loop
    v_cant := nullif(it->>'cantidad', '')::numeric;
    if v_cant is null or v_cant <= 0 or v_cant > 1000000 then raise exception 'CANTIDAD_INVALIDA'; end if;
    select nombre into v_nom from public.pos_productos where id = (it->>'producto_id')::uuid and organizacion_id = v_org and coalesce(tipo, 'producto') <> 'servicio';
    if v_nom is null then raise exception 'ARTICULO_NO_EXISTE'; end if;
    insert into public.pos_pedido_almacen_items (organizacion_id, pedido_id, producto_id, nombre, cantidad) values (v_org, v_id, (it->>'producto_id')::uuid, v_nom, v_cant);
    v_items := v_items + 1;
  end loop;
  return jsonb_build_object('ok', true, 'id', v_id, 'numero', v_num, 'items', v_items);
end $fn$;
revoke execute on function public.pos_pedido_almacen_crear(uuid, uuid, text, jsonb) from public, anon;
grant execute on function public.pos_pedido_almacen_crear(uuid, uuid, text, jsonb) to authenticated;

-- Atender: solo desde «pendiente». despachado → exige la transferencia (de esta empresa, del almacén que surte al que pide)
-- y anota lo despachado por artículo. rechazado / anulado → exige motivo.
create or replace function public.pos_pedido_almacen_atender(p_pedido uuid, p_estado text, p_motivo text default null, p_transferencia uuid default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_org uuid := public.mi_organizacion(); p public.pos_pedidos_almacen%rowtype; t public.pos_transferencias%rowtype; v_usuario text;
begin
  if v_org is null or public.mi_rol() is null then raise exception 'NO_AUTORIZADO' using errcode = '42501'; end if;
  select * into p from public.pos_pedidos_almacen where id = p_pedido and organizacion_id = v_org for update;
  if p.id is null then raise exception 'PEDIDO_NO_EXISTE'; end if;
  if p.estado <> 'pendiente' then raise exception 'PEDIDO_YA_ATENDIDO'; end if;
  if p_estado not in ('despachado', 'rechazado', 'anulado') then raise exception 'ESTADO_INVALIDO'; end if;
  select nom into v_usuario from public.profiles where id = auth.uid();
  if p_estado = 'despachado' then
    select * into t from public.pos_transferencias where id = p_transferencia and organizacion_id = v_org;
    if t.id is null or t.origen_id is distinct from p.surte_id or t.destino_id is distinct from p.pide_id then raise exception 'TRANSFERENCIA_INVALIDA'; end if;
    update public.pos_pedido_almacen_items i set despachado = coalesce((select sum(ti.cantidad) from public.pos_transferencia_items ti where ti.transferencia_id = t.id and ti.producto_id = i.producto_id), 0)
      where i.pedido_id = p.id;
    update public.pos_pedidos_almacen set estado = 'despachado', transferencia_id = t.id, transferencia_numero = t.numero, atendido_por = v_usuario, atendido_at = now() where id = p.id;
  else
    if nullif(btrim(coalesce(p_motivo, '')), '') is null then raise exception 'FALTA_MOTIVO'; end if;
    update public.pos_pedidos_almacen set estado = p_estado, motivo = btrim(p_motivo), atendido_por = v_usuario, atendido_at = now() where id = p.id;
  end if;
  return jsonb_build_object('ok', true, 'estado', p_estado);
end $fn$;
revoke execute on function public.pos_pedido_almacen_atender(uuid, text, text, uuid) from public, anon;
grant execute on function public.pos_pedido_almacen_atender(uuid, text, text, uuid) to authenticated;
