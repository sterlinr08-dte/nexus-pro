-- «Agregar costo» (16-nov-2026, dueño): sumarle un costo extra a un artículo ya comprado (reacondicionado, flete, reparación).
-- El monto se reparte entre las unidades en existencia (costo promedio). Todo o nada, en el servidor. Solo agrega.
create table if not exists public.pos_costos_agregados (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id),
  producto_id uuid not null,
  producto_nombre text,
  producto_codigo text,
  monto numeric not null,
  unidades numeric not null,
  costo_anterior numeric not null,
  costo_nuevo numeric not null,
  motivo text,
  metodo text,                    -- efectivo | banco | por_pagar
  referencia text,
  created_by_name text,
  fecha timestamptz not null default now()
);
create index if not exists pos_costos_agregados_org_fecha_idx on public.pos_costos_agregados (organizacion_id, fecha desc);
alter table public.pos_costos_agregados enable row level security;
revoke all on public.pos_costos_agregados from anon, authenticated;
grant select on public.pos_costos_agregados to authenticated;
create policy pos_costos_agr_leer on public.pos_costos_agregados for select to authenticated
  using (public.mi_rol() is not null and organizacion_id = public.mi_organizacion());

create or replace function public.pos_agregar_costo(p_producto uuid, p_monto numeric, p_motivo text, p_metodo text, p_referencia text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_org uuid := public.mi_organizacion(); p public.pos_productos%rowtype; v_nuevo numeric; v_id uuid; v_usuario text;
begin
  if v_org is null or public.mi_rol() is null or public.mi_rol() not in ('admin', 'gerente') then raise exception 'NO_AUTORIZADO' using errcode = '42501'; end if;
  if p_monto is null or p_monto <= 0 or p_monto > 100000000 then raise exception 'MONTO_INVALIDO'; end if;
  if p_metodo is null or p_metodo not in ('efectivo', 'banco', 'por_pagar') then raise exception 'METODO_INVALIDO'; end if;
  select * into p from public.pos_productos where id = p_producto and organizacion_id = v_org for update;
  if p.id is null then raise exception 'ARTICULO_NO_EXISTE'; end if;
  if coalesce(p.tipo, 'producto') = 'servicio' then raise exception 'ES_SERVICIO'; end if;
  if coalesce(p.stock, 0) <= 0 then raise exception 'SIN_EXISTENCIA'; end if;
  v_nuevo := round(coalesce(p.costo, 0) + p_monto / p.stock, 2);
  select nom into v_usuario from public.profiles where id = auth.uid();
  update public.pos_productos set costo = v_nuevo where id = p.id;
  insert into public.pos_costos_agregados (organizacion_id, producto_id, producto_nombre, producto_codigo, monto, unidades, costo_anterior, costo_nuevo, motivo, metodo, referencia, created_by_name)
  values (v_org, p.id, p.nombre, p.codigo, round(p_monto, 2), p.stock, coalesce(p.costo, 0), v_nuevo, nullif(btrim(coalesce(p_motivo, '')), ''), p_metodo, nullif(btrim(coalesce(p_referencia, '')), ''), v_usuario)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'costo_anterior', coalesce(p.costo, 0), 'costo_nuevo', v_nuevo, 'unidades', p.stock, 'monto', round(p_monto, 2));
end $fn$;
revoke execute on function public.pos_agregar_costo(uuid, numeric, text, text, text) from public, anon;
grant execute on function public.pos_agregar_costo(uuid, numeric, text, text, text) to authenticated;
