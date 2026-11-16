-- Cambio de precios y Activos fijos (16-nov-2026, reportes de Infoplus pedidos por el dueño). Solo agrega: dos tablas y un disparador.
-- Las llaves a la empresa van sin borrado en cascada a propósito: al quitar una empresa, sus filas se quitan antes, tabla por tabla.

-- 1) Historial de cambios de precio y costo. Lo escribe SOLO el disparador (nadie lo puede editar ni borrar desde la app).
create table if not exists public.pos_precio_historial (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id),
  producto_id uuid,
  producto_nombre text,
  producto_codigo text,
  campo text not null,            -- precio | precio_mayor | precio_minimo | costo
  anterior numeric,
  nuevo numeric,
  usuario text,
  fecha timestamptz not null default now()
);
create index if not exists pos_precio_historial_org_fecha_idx on public.pos_precio_historial (organizacion_id, fecha desc);
alter table public.pos_precio_historial enable row level security;
revoke all on public.pos_precio_historial from anon, authenticated;
grant select on public.pos_precio_historial to authenticated;
create policy pos_precio_hist_leer on public.pos_precio_historial for select to authenticated
  using (public.mi_rol() is not null and organizacion_id = public.mi_organizacion());

create or replace function public.pos_productos_log_precio()
returns trigger language plpgsql security definer set search_path to 'public' as $fn$
declare v_usuario text;
begin
  if new.organizacion_id is null then return new; end if;
  if coalesce(new.precio, 0) is not distinct from coalesce(old.precio, 0)
     and coalesce(new.precio_mayor, 0) is not distinct from coalesce(old.precio_mayor, 0)
     and coalesce(new.precio_minimo, 0) is not distinct from coalesce(old.precio_minimo, 0)
     and coalesce(new.costo, 0) is not distinct from coalesce(old.costo, 0) then
    return new;
  end if;
  begin select nom into v_usuario from public.profiles where id = auth.uid(); exception when others then v_usuario := null; end;
  insert into public.pos_precio_historial (organizacion_id, producto_id, producto_nombre, producto_codigo, campo, anterior, nuevo, usuario)
  select new.organizacion_id, new.id, new.nombre, new.codigo, x.campo, x.anterior, x.nuevo, v_usuario
  from (values ('precio', old.precio, new.precio), ('precio_mayor', old.precio_mayor, new.precio_mayor),
               ('precio_minimo', old.precio_minimo, new.precio_minimo), ('costo', old.costo, new.costo)) as x(campo, anterior, nuevo)
  where coalesce(x.anterior, 0) is distinct from coalesce(x.nuevo, 0);
  return new;
end $fn$;
revoke execute on function public.pos_productos_log_precio() from public, anon, authenticated;
create trigger trg_pos_productos_log_precio after update of precio, precio_mayor, precio_minimo, costo on public.pos_productos
  for each row execute function public.pos_productos_log_precio();

-- 2) Activos fijos (mobiliario, equipos, vehículos). Registro y depreciación en línea recta para el reporte; no genera asientos.
create table if not exists public.pos_activos_fijos (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid references public.organizaciones(id),
  codigo text,
  nombre text not null,
  categoria text,
  ubicacion text,
  fecha_compra date,
  costo numeric not null default 0,
  vida_util_meses integer not null default 60,
  valor_residual numeric not null default 0,
  estado text not null default 'activo',   -- activo | baja
  notas text,
  created_by_name text,
  created_at timestamptz not null default now()
);
create index if not exists pos_activos_fijos_org_idx on public.pos_activos_fijos (organizacion_id);
create trigger trg_org_pos_activos_fijos before insert on public.pos_activos_fijos for each row execute function public.set_organizacion_id();
alter table public.pos_activos_fijos enable row level security;
revoke all on public.pos_activos_fijos from anon, authenticated;
grant select, insert, update on public.pos_activos_fijos to authenticated;
create policy pos_activos_leer on public.pos_activos_fijos for select to authenticated
  using (public.mi_rol() is not null and organizacion_id = public.mi_organizacion());
create policy pos_activos_crear on public.pos_activos_fijos for insert to authenticated
  with check (public.mi_rol() in ('admin', 'gerente') and (organizacion_id is null or organizacion_id = public.mi_organizacion()));
create policy pos_activos_editar on public.pos_activos_fijos for update to authenticated
  using (public.mi_rol() in ('admin', 'gerente') and organizacion_id = public.mi_organizacion())
  with check (public.mi_rol() in ('admin', 'gerente') and organizacion_id = public.mi_organizacion());
