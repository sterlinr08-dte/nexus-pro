-- Órdenes de compra (16-nov-2026, dueño: «Orden de compra»; reporte Infoplus «Faltante orden compra»).
-- La orden NO mueve inventario ni dinero: se recibe con la compra que ya existe (pos_registrar_compra_atomica) y aquí solo se anota
-- cuánto llegó. Solo agrega: tres tablas y tres funciones. Llaves sin borrado en cascada a propósito.
create table if not exists public.pos_ordenes_compra (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id),
  numero text not null,
  proveedor_id uuid,
  proveedor_nombre text,
  fecha_esperada date,
  estado text not null default 'abierta',     -- abierta | parcial | recibida | cerrada | anulada
  total_estimado numeric not null default 0,
  notas text,
  motivo text,                                 -- motivo de cierre o anulación
  created_by_name text,
  created_at timestamptz not null default now(),
  cerrada_por text,
  cerrada_at timestamptz
);
create unique index if not exists pos_ordenes_compra_num_uq on public.pos_ordenes_compra (organizacion_id, numero);
create index if not exists pos_ordenes_compra_org_idx on public.pos_ordenes_compra (organizacion_id, created_at desc);
create table if not exists public.pos_orden_compra_items (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id),
  orden_id uuid not null references public.pos_ordenes_compra(id),
  producto_id uuid not null,
  nombre text,
  cantidad numeric not null,
  costo numeric not null default 0,
  recibido numeric not null default 0
);
create index if not exists pos_orden_compra_items_ord_idx on public.pos_orden_compra_items (orden_id);
create table if not exists public.pos_orden_compra_recepciones (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id),
  orden_id uuid not null references public.pos_ordenes_compra(id),
  compra_id uuid not null,
  compra_numero text,
  created_by_name text,
  created_at timestamptz not null default now()
);
create unique index if not exists pos_orden_compra_recep_uq on public.pos_orden_compra_recepciones (orden_id, compra_id);

alter table public.pos_ordenes_compra enable row level security;
alter table public.pos_orden_compra_items enable row level security;
alter table public.pos_orden_compra_recepciones enable row level security;
revoke all on public.pos_ordenes_compra from anon, authenticated;
revoke all on public.pos_orden_compra_items from anon, authenticated;
revoke all on public.pos_orden_compra_recepciones from anon, authenticated;
grant select on public.pos_ordenes_compra to authenticated;
grant select on public.pos_orden_compra_items to authenticated;
grant select on public.pos_orden_compra_recepciones to authenticated;
create policy pos_oc_leer on public.pos_ordenes_compra for select to authenticated
  using (public.mi_rol() is not null and organizacion_id = public.mi_organizacion());
create policy pos_oc_items_leer on public.pos_orden_compra_items for select to authenticated
  using (public.mi_rol() is not null and organizacion_id = public.mi_organizacion());
create policy pos_oc_recep_leer on public.pos_orden_compra_recepciones for select to authenticated
  using (public.mi_rol() is not null and organizacion_id = public.mi_organizacion());

-- Crear: todo o nada; numera OC-00001 por empresa sin choques.
create or replace function public.pos_orden_compra_crear(p_proveedor uuid, p_fecha_esperada date, p_notas text, p_items jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_org uuid := public.mi_organizacion(); v_id uuid; v_num text; v_n int; v_usuario text; v_prov text; it jsonb; v_cant numeric; v_costo numeric; v_nom text; v_tot numeric := 0; v_items int := 0;
begin
  if v_org is null or public.mi_rol() is null then raise exception 'NO_AUTORIZADO' using errcode = '42501'; end if;
  if p_proveedor is not null then
    select nombre into v_prov from public.pos_proveedores where id = p_proveedor and organizacion_id = v_org;
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

-- Recibir: anota lo que llegó en una compra ya guardada (de esta empresa y del mismo proveedor). Una compra cuenta una sola vez.
create or replace function public.pos_orden_compra_recibir(p_orden uuid, p_compra uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_org uuid := public.mi_organizacion(); o public.pos_ordenes_compra%rowtype; c public.pos_compras%rowtype; v_usuario text; v_falta numeric; v_estado text;
begin
  if v_org is null or public.mi_rol() is null then raise exception 'NO_AUTORIZADO' using errcode = '42501'; end if;
  select * into o from public.pos_ordenes_compra where id = p_orden and organizacion_id = v_org for update;
  if o.id is null then raise exception 'ORDEN_NO_EXISTE'; end if;
  if o.estado not in ('abierta', 'parcial') then raise exception 'ORDEN_NO_ABIERTA'; end if;
  select * into c from public.pos_compras where id = p_compra and organizacion_id = v_org;
  if c.id is null or coalesce(c.estado, '') = 'anulada' then raise exception 'COMPRA_INVALIDA'; end if;
  if o.proveedor_id is not null and c.proveedor_id is distinct from o.proveedor_id then raise exception 'OTRO_PROVEEDOR'; end if;
  if exists (select 1 from public.pos_orden_compra_recepciones where orden_id = o.id and compra_id = c.id) then raise exception 'COMPRA_YA_ANOTADA'; end if;
  select nom into v_usuario from public.profiles where id = auth.uid();
  insert into public.pos_orden_compra_recepciones (organizacion_id, orden_id, compra_id, compra_numero, created_by_name) values (v_org, o.id, c.id, c.numero::text, v_usuario);
  update public.pos_orden_compra_items i set recibido = i.recibido + coalesce((select sum(ci.cantidad) from public.pos_compra_items ci where ci.compra_id = c.id and ci.producto_id = i.producto_id), 0)
    where i.orden_id = o.id;
  select coalesce(sum(greatest(cantidad - recibido, 0)), 0) into v_falta from public.pos_orden_compra_items where orden_id = o.id;
  v_estado := case when v_falta <= 0 then 'recibida' else 'parcial' end;
  update public.pos_ordenes_compra set estado = v_estado where id = o.id;
  return jsonb_build_object('ok', true, 'estado', v_estado, 'falta', v_falta);
end $fn$;
revoke execute on function public.pos_orden_compra_recibir(uuid, uuid) from public, anon;
grant execute on function public.pos_orden_compra_recibir(uuid, uuid) to authenticated;

-- Cerrar (no llegará lo que falta) o anular: solo abiertas o parciales; exige motivo. Anular solo si no ha llegado nada.
create or replace function public.pos_orden_compra_cerrar(p_orden uuid, p_estado text, p_motivo text)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_org uuid := public.mi_organizacion(); o public.pos_ordenes_compra%rowtype; v_usuario text;
begin
  if v_org is null or public.mi_rol() is null then raise exception 'NO_AUTORIZADO' using errcode = '42501'; end if;
  if p_estado not in ('cerrada', 'anulada') then raise exception 'ESTADO_INVALIDO'; end if;
  if nullif(btrim(coalesce(p_motivo, '')), '') is null then raise exception 'FALTA_MOTIVO'; end if;
  select * into o from public.pos_ordenes_compra where id = p_orden and organizacion_id = v_org for update;
  if o.id is null then raise exception 'ORDEN_NO_EXISTE'; end if;
  if o.estado not in ('abierta', 'parcial') then raise exception 'ORDEN_NO_ABIERTA'; end if;
  if p_estado = 'anulada' and o.estado = 'parcial' then raise exception 'YA_RECIBIO_ALGO'; end if;
  select nom into v_usuario from public.profiles where id = auth.uid();
  update public.pos_ordenes_compra set estado = p_estado, motivo = btrim(p_motivo), cerrada_por = v_usuario, cerrada_at = now() where id = o.id;
  return jsonb_build_object('ok', true, 'estado', p_estado);
end $fn$;
revoke execute on function public.pos_orden_compra_cerrar(uuid, text, text) from public, anon;
grant execute on function public.pos_orden_compra_cerrar(uuid, text, text) to authenticated;
