-- 17-nov-2026 (dueño, opción B): la base no deja que un empleado venda por debajo del precio mínimo.
-- Mismo piso que la pantalla (minimoDe): el mínimo del NIVEL del cliente si lo tiene (> 0); si no, el del artículo.
-- Administrador y gerente sin límite. Procesos del sistema sin rol (service_role, migraciones) no se frenan.
-- Solo revisa ventas nuevas (insert) o un cambio de precio (update de precio); el histórico no se toca.
create or replace function public.pos_venta_items_precio_minimo()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_rol text := public.mi_rol();
  v_nivel uuid;
  v_min numeric := 0;
begin
  if v_rol is null or v_rol in ('admin', 'gerente') then return new; end if;
  if new.producto_id is null then return new; end if;
  if tg_op = 'UPDATE' and new.precio is not distinct from old.precio then return new; end if;

  select c.nivel_id into v_nivel
  from public.pos_ventas v
  join public.pos_clientes c on c.id = v.cliente_id and c.organizacion_id = v.organizacion_id
  where v.id = new.venta_id;

  if v_nivel is not null then
    select coalesce(pn.precio_minimo, 0) into v_min
    from public.pos_producto_niveles pn
    where pn.producto_id = new.producto_id and pn.nivel_id = v_nivel
      and pn.organizacion_id = new.organizacion_id
    limit 1;
  end if;
  if coalesce(v_min, 0) <= 0 then
    select coalesce(p.precio_minimo, 0) into v_min
    from public.pos_productos p
    where p.id = new.producto_id and p.organizacion_id = new.organizacion_id;
  end if;

  if coalesce(v_min, 0) > 0 and coalesce(new.precio, 0) < v_min - 0.005 then
    raise exception 'PRECIO_DEBAJO_MINIMO: % (mínimo %)', left(coalesce(new.nombre, ''), 80), round(v_min, 2)
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace trigger trg_pos_venta_items_precio_minimo
  before insert or update of precio on public.pos_venta_items
  for each row execute function public.pos_venta_items_precio_minimo();
