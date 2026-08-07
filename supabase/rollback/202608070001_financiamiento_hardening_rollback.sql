-- NEXUS PRO
-- Rollback de 202608070001_financiamiento_hardening.sql
-- USO: solo inmediatamente despues de la migracion, antes de crear datos de otras
-- organizaciones o movimientos que dependan de las nuevas constraints.
-- NO ejecutar a ciegas en produccion.

begin;

-- Guardas: este rollback colapsa prestamos_config nuevamente a singleton y elimina
-- organizacion_id de las tablas legacy. Si ya hay mas de una organizacion con datos,
-- abortar en vez de destruir aislamiento/informacion.
do $$
begin
  if (select count(distinct organizacion_id) from public.prestamo_clientes) > 1
     or (select count(distinct organizacion_id) from public.prestamos) > 1
     or (select count(distinct organizacion_id) from public.prestamo_pagos) > 1
     or (select count(distinct organizacion_id) from public.prestamo_solicitudes) > 1
     or (select count(distinct organizacion_id) from public.prestamos_config) > 1
  then
    raise exception 'Rollback inseguro: ya existen datos de prestamos en multiples organizaciones';
  end if;
end
$$;

-- RLS legacy: restaurar las policies admin previas.
drop policy if exists prestamo_clientes_tenant on public.prestamo_clientes;
create policy prestamo_clientes_admin on public.prestamo_clientes
for all to authenticated
using (public.mi_rol() = 'admin')
with check (public.mi_rol() = 'admin');

drop policy if exists prestamos_tenant on public.prestamos;
create policy prestamos_admin on public.prestamos
for all to authenticated
using (public.mi_rol() = 'admin')
with check (public.mi_rol() = 'admin');

drop policy if exists prestamo_pagos_tenant on public.prestamo_pagos;
create policy prestamo_pagos_admin on public.prestamo_pagos
for all to authenticated
using (public.mi_rol() = 'admin')
with check (public.mi_rol() = 'admin');

drop policy if exists prestamo_solicitudes_tenant on public.prestamo_solicitudes;
create policy prestamo_solicitudes_admin on public.prestamo_solicitudes
for all to public
using (public.mi_rol() = 'admin')
with check (public.mi_rol() = 'admin');

drop policy if exists prestamos_config_tenant on public.prestamos_config;
create policy prestamos_config_admin on public.prestamos_config
for all to authenticated
using (public.mi_rol() = 'admin')
with check (public.mi_rol() = 'admin');

-- POS: volver al patron previo nullable + policy que acepta NULL en WITH CHECK.
drop policy if exists pos_financiamientos_tenant on public.pos_financiamientos;
create policy pos_fin_admin on public.pos_financiamientos
for all to public
using (public.mi_rol() is not null and organizacion_id = public.mi_organizacion())
with check (public.mi_rol() is not null and (organizacion_id is null or organizacion_id = public.mi_organizacion()));

drop policy if exists pos_fin_cuotas_tenant on public.pos_fin_cuotas;
create policy pos_fincuo_admin on public.pos_fin_cuotas
for all to public
using (public.mi_rol() is not null and organizacion_id = public.mi_organizacion())
with check (public.mi_rol() is not null and (organizacion_id is null or organizacion_id = public.mi_organizacion()));

drop policy if exists pos_fin_pagos_tenant on public.pos_fin_pagos;
create policy pos_finpag_admin on public.pos_fin_pagos
for all to public
using (public.mi_rol() is not null and organizacion_id = public.mi_organizacion())
with check (public.mi_rol() is not null and (organizacion_id is null or organizacion_id = public.mi_organizacion()));

-- Quitar triggers nuevos.
do $$
declare
  t text;
begin
  foreach t in array array[
    'prestamo_clientes','prestamos','prestamo_pagos','prestamo_solicitudes','prestamos_config',
    'pos_financiamientos','pos_fin_cuotas','pos_fin_pagos'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_org_inmutable', t);
  end loop;

  foreach t in array array[
    'prestamo_clientes','prestamos','prestamo_pagos','prestamo_solicitudes','prestamos_config'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated_at', t);
  end loop;
end
$$;

drop trigger if exists prestamo_clientes_set_org on public.prestamo_clientes;
drop trigger if exists prestamos_set_org on public.prestamos;
drop trigger if exists prestamo_pagos_set_org on public.prestamo_pagos;
drop trigger if exists prestamo_solicitudes_set_org on public.prestamo_solicitudes;
drop trigger if exists prestamos_config_set_org on public.prestamos_config;

-- Quitar FKs compuestas de prestamos.
alter table public.prestamo_solicitudes
  drop constraint if exists prestamo_solicitudes_prestamo_org_fkey,
  drop constraint if exists prestamo_solicitudes_cliente_org_fkey;

alter table public.prestamo_pagos
  drop constraint if exists prestamo_pagos_movimiento_origen_org_fkey,
  drop constraint if exists prestamo_pagos_prestamo_org_fkey,
  add constraint prestamo_pagos_prestamo_id_fkey
    foreign key (prestamo_id) references public.prestamos(id) on delete cascade;

alter table public.prestamos
  drop constraint if exists prestamos_cliente_org_fkey,
  add constraint prestamos_cliente_id_fkey
    foreign key (cliente_id) references public.prestamo_clientes(id);

alter table public.prestamo_pagos drop constraint if exists prestamo_pagos_org_id_key;
alter table public.prestamos drop constraint if exists prestamos_org_id_key;
alter table public.prestamo_clientes drop constraint if exists prestamo_clientes_org_id_key;

-- Reversion ledger additivo.
drop index if exists public.prestamo_pagos_un_reverso_por_movimiento_uidx;
alter table public.prestamo_pagos
  drop constraint if exists prestamo_pagos_reverso_origen_check,
  drop constraint if exists prestamo_pagos_tipo_movimiento_check,
  drop column if exists motivo_reverso,
  drop column if exists movimiento_origen_id,
  drop column if exists tipo_movimiento;

-- Estados: quitar CHECK nuevo. No se borran datos de estado.
alter table public.prestamos drop constraint if exists prestamos_estado_check;
alter table public.pos_financiamientos drop constraint if exists pos_financiamientos_estado_check;

-- POS: restaurar FKs simples con CASCADE y nullable.
alter table public.pos_fin_pagos
  drop constraint if exists pos_fin_pagos_cuota_org_fkey,
  drop constraint if exists pos_fin_pagos_financiamiento_org_fkey,
  add constraint pos_fin_pagos_financiamiento_id_fkey
    foreign key (financiamiento_id) references public.pos_financiamientos(id) on delete cascade,
  add constraint pos_fin_pagos_cuota_id_fkey
    foreign key (cuota_id) references public.pos_fin_cuotas(id) on delete cascade;

alter table public.pos_fin_cuotas
  drop constraint if exists pos_fin_cuotas_financiamiento_org_fkey,
  add constraint pos_fin_cuotas_financiamiento_id_fkey
    foreign key (financiamiento_id) references public.pos_financiamientos(id) on delete cascade;

alter table public.pos_fin_cuotas drop constraint if exists pos_fin_cuotas_org_id_key;
alter table public.pos_financiamientos drop constraint if exists pos_financiamientos_org_id_key;

alter table public.pos_fin_pagos alter column organizacion_id drop not null;
alter table public.pos_fin_cuotas alter column financiamiento_id drop not null;
alter table public.pos_fin_cuotas alter column organizacion_id drop not null;
alter table public.pos_financiamientos alter column organizacion_id drop not null;

-- prestamos_config vuelve a singleton id=1.
alter table public.prestamos_config drop constraint if exists prestamos_config_organizacion_id_fkey;
alter table public.prestamos_config drop constraint if exists prestamos_config_pkey;
alter table public.prestamos_config add column id integer not null default 1;
alter table public.prestamos_config add constraint prestamos_config_pkey primary key (id);
alter table public.prestamos_config add constraint prestamos_config_id_check check (id = 1);

-- Quitar FKs a organizaciones y columnas legacy de tenant.
alter table public.prestamo_solicitudes drop constraint if exists prestamo_solicitudes_organizacion_id_fkey;
alter table public.prestamo_pagos drop constraint if exists prestamo_pagos_organizacion_id_fkey;
alter table public.prestamos drop constraint if exists prestamos_organizacion_id_fkey;
alter table public.prestamo_clientes drop constraint if exists prestamo_clientes_organizacion_id_fkey;

alter table public.prestamo_solicitudes drop column if exists organizacion_id;
alter table public.prestamo_pagos drop column if exists organizacion_id;
alter table public.prestamos drop column if exists organizacion_id;
alter table public.prestamo_clientes drop column if exists organizacion_id;
alter table public.prestamos_config drop column if exists organizacion_id;

-- Soft delete agregado por la migracion.
alter table public.prestamos drop column if exists deleted_at;
alter table public.prestamo_clientes drop column if exists deleted_at;

-- updated_at: conservar prestamo_clientes.updated_at y prestamos_config.updated_at
-- porque ya existian antes. Quitar solo las columnas creadas en tablas que no la tenian.
alter table public.prestamo_solicitudes drop column if exists updated_at;
alter table public.prestamo_pagos drop column if exists updated_at;
alter table public.prestamos drop column if exists updated_at;

-- Restaurar privilegios administrativos previos de authenticated.
grant truncate, references, trigger on table
  public.prestamo_clientes,
  public.prestamos,
  public.prestamo_pagos,
  public.prestamo_solicitudes,
  public.prestamos_config,
  public.pos_financiamientos,
  public.pos_fin_cuotas,
  public.pos_fin_pagos
to authenticated;

-- No restaurar anon automaticamente: hacerlo solo si una auditoria confirma que
-- el camino publico lo requiere. El rollback de datos/esquema no debe reabrir
-- privilegios anon por defecto.

-- Helpers nuevos: remover solo si no quedaron otros modulos usandolos.
drop function if exists public.nx_impedir_cambio_organizacion();
drop function if exists public.nx_actualizar_updated_at();

commit;
