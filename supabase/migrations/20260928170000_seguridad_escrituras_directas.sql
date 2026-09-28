-- Seguridad (28-sep-2026, auditoría). Las tablas de dinero (abonos, entregas_admin, transferencias_agentes,
-- egresos, asientos) YA estaban cerradas a escritura directa por permisos de tabla; solo se escriben por RPC.
-- Aquí se cierran los huecos reales que quedaban para escrituras DIRECTAS por REST de usuarios no admin.
--
-- Criterio: current_user IN ('authenticated','anon') = llamada directa desde el navegador. Dentro de una RPC
-- SECURITY DEFINER current_user es el dueño (postgres), así que las RPC siguen funcionando igual.

create or replace function public.nx_escritura_directa_no_admin()
returns boolean
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
  select current_user in ('authenticated', 'anon') and coalesce(public.mi_rol(), '') <> 'admin'
$$;

-- 1) agentes: solo el administrador crea, edita o borra agentes (teléfono y cargo definen a quién le llegan
--    los WhatsApp y las copias de administrador).
create or replace function public.nx_agentes_solo_admin()
returns trigger language plpgsql set search_path to 'public', 'pg_temp' as $$
begin
  if public.nx_escritura_directa_no_admin() then
    raise exception 'No autorizado: solo un administrador puede modificar agentes' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists trg_nx_agentes_solo_admin on public.agentes;
create trigger trg_nx_agentes_solo_admin before insert or update or delete on public.agentes
  for each row execute function public.nx_agentes_solo_admin();

-- 2) facturas: el navegador de un no admin solo puede recalcular el estado Pendiente/Parcial/Pagado
--    (resyncEstadoFacturas) y marcar wa_sent. No puede crear, borrar, anular ni cambiar montos/NCF/período.
create or replace function public.nx_facturas_proteger()
returns trigger language plpgsql set search_path to 'public', 'pg_temp' as $$
begin
  if not public.nx_escritura_directa_no_admin() then return coalesce(new, old); end if;
  if tg_op in ('INSERT', 'DELETE') then
    raise exception 'No autorizado: las facturas se crean o eliminan solo desde el sistema' using errcode = '42501';
  end if;
  if old.estado = 'Anulada' or new.estado = 'Anulada'
     or new.estado not in ('Pendiente', 'Parcial', 'Pagado')
     or (to_jsonb(new) - array['estado','wa_sent','updated_at','updated_by_name','updated_by_user_id'])
        is distinct from (to_jsonb(old) - array['estado','wa_sent','updated_at','updated_by_name','updated_by_user_id']) then
    raise exception 'No autorizado: solo un administrador puede modificar esta factura' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists trg_nx_facturas_proteger on public.facturas;
create trigger trg_nx_facturas_proteger before insert or update or delete on public.facturas
  for each row execute function public.nx_facturas_proteger();

-- 3) clientes: un no admin sigue editando datos del cliente, pero NO el dinero ya cobrado ni el saldo inicial.
--    (pagado lo mueven las RPC de cobro; la auto-reconciliación del navegador solo corre bien con admin.)
create or replace function public.nx_clientes_proteger_dinero()
returns trigger language plpgsql set search_path to 'public', 'pg_temp' as $$
begin
  if public.nx_escritura_directa_no_admin() and (
       new.pagado is distinct from old.pagado
    or new.saldo_inicial is distinct from old.saldo_inicial
    or new.saldo_inicial_pagado is distinct from old.saldo_inicial_pagado
    or new.saldo_inicial_meses is distinct from old.saldo_inicial_meses
    or new.saldo_inicial_fecha is distinct from old.saldo_inicial_fecha
    or new.saldo_inicial_detalle is distinct from old.saldo_inicial_detalle) then
    raise exception 'No autorizado: solo un administrador puede cambiar lo pagado o el saldo inicial' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists trg_nx_clientes_proteger_dinero on public.clientes;
create trigger trg_nx_clientes_proteger_dinero before update on public.clientes
  for each row execute function public.nx_clientes_proteger_dinero();

-- 4) configuracion: precios, primas, costos, correo de reportes/respaldos (empresa_email, emailjs),
--    auto_facturacion… Todas son ajustes de administrador → escribir solo admin.
drop policy if exists configuracion_insert on public.configuracion;
drop policy if exists configuracion_update on public.configuracion;
drop policy if exists configuracion_delete on public.configuracion;
create policy configuracion_insert on public.configuracion for insert to authenticated
  with check (mi_rol() = 'admin' and mi_organizacion() = (select id from organizaciones where slug = 'nexus-pro') and clave <> 'seq_poliza');
create policy configuracion_update on public.configuracion for update to authenticated
  using (mi_rol() = 'admin' and mi_organizacion() = (select id from organizaciones where slug = 'nexus-pro') and clave <> 'seq_poliza')
  with check (mi_rol() = 'admin' and mi_organizacion() = (select id from organizaciones where slug = 'nexus-pro') and clave <> 'seq_poliza');
create policy configuracion_delete on public.configuracion for delete to authenticated
  using (mi_rol() = 'admin' and mi_organizacion() = (select id from organizaciones where slug = 'nexus-pro') and clave <> 'seq_poliza');

-- 5) Multiempresa: el admin de OTRA organización (rifas, bayolsale, geriatra…) ya no puede tocar usuarios
--    ni la ficha de NEXUS PRO. Solo su propia organización, salvo superadmin.
drop policy if exists all_usuarios_sistema on public.usuarios_sistema;
create policy all_usuarios_sistema on public.usuarios_sistema for all to authenticated
  using (mi_rol() = 'admin' and (organizacion_id = mi_organizacion() or mi_es_superadmin()))
  with check (mi_rol() = 'admin' and (organizacion_id = mi_organizacion() or mi_es_superadmin()));
drop policy if exists org_update_admin on public.organizaciones;
drop policy if exists org_delete_admin on public.organizaciones;
drop policy if exists org_insert_admin on public.organizaciones;
create policy org_update_admin on public.organizaciones for update to authenticated
  using (mi_rol() = 'admin' and (id = mi_organizacion() or mi_es_superadmin()))
  with check (mi_rol() = 'admin' and (id = mi_organizacion() or mi_es_superadmin()));
create policy org_delete_admin on public.organizaciones for delete to authenticated using (mi_es_superadmin());
create policy org_insert_admin on public.organizaciones for insert to authenticated with check (mi_es_superadmin());
