-- NEXUS PRO
-- Financiamiento / Prestamos - hardening estructural
-- Fecha: 2026-08-07
-- IMPORTANTE: migracion preparada para auditoria. No aplicar en produccion
-- hasta completar la revision tecnica independiente.

begin;

-- -----------------------------------------------------------------------------
-- 0. Precondiciones
-- -----------------------------------------------------------------------------
do $$
declare
  v_org uuid;
begin
  select id into v_org
  from public.organizaciones
  where slug = 'nexus-pro';

  if v_org is null then
    raise exception 'No existe la organizacion slug=nexus-pro para el backfill';
  end if;

  if (select count(*) from public.organizaciones where slug = 'nexus-pro') <> 1 then
    raise exception 'El slug nexus-pro no es unico';
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 1. Helpers genericos
-- -----------------------------------------------------------------------------
create or replace function public.nx_impedir_cambio_organizacion()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.organizacion_id is distinct from old.organizacion_id then
    raise exception 'organizacion_id es inmutable'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.nx_actualizar_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Multiempresa: agregar organizacion_id a las 5 tablas legacy
-- -----------------------------------------------------------------------------
alter table public.prestamo_clientes
  add column if not exists organizacion_id uuid;

alter table public.prestamos
  add column if not exists organizacion_id uuid;

alter table public.prestamo_pagos
  add column if not exists organizacion_id uuid;

alter table public.prestamo_solicitudes
  add column if not exists organizacion_id uuid;

alter table public.prestamos_config
  add column if not exists organizacion_id uuid;

-- Backfill por slug estable, nunca por UUID hardcodeado.
update public.prestamo_clientes
set organizacion_id = (select id from public.organizaciones where slug = 'nexus-pro')
where organizacion_id is null;

update public.prestamos
set organizacion_id = (select id from public.organizaciones where slug = 'nexus-pro')
where organizacion_id is null;

update public.prestamo_pagos
set organizacion_id = (select id from public.organizaciones where slug = 'nexus-pro')
where organizacion_id is null;

update public.prestamo_solicitudes
set organizacion_id = (select id from public.organizaciones where slug = 'nexus-pro')
where organizacion_id is null;

update public.prestamos_config
set organizacion_id = (select id from public.organizaciones where slug = 'nexus-pro')
where organizacion_id is null;

-- Validar el backfill antes de endurecer constraints.
do $$
begin
  if exists (select 1 from public.prestamo_clientes where organizacion_id is null)
     or exists (select 1 from public.prestamos where organizacion_id is null)
     or exists (select 1 from public.prestamo_pagos where organizacion_id is null)
     or exists (select 1 from public.prestamo_solicitudes where organizacion_id is null)
     or exists (select 1 from public.prestamos_config where organizacion_id is null)
  then
    raise exception 'Backfill de organizacion_id incompleto';
  end if;
end
$$;

-- FKs directas a organizaciones.
alter table public.prestamo_clientes
  drop constraint if exists prestamo_clientes_organizacion_id_fkey,
  add constraint prestamo_clientes_organizacion_id_fkey
    foreign key (organizacion_id) references public.organizaciones(id) on delete restrict;

alter table public.prestamos
  drop constraint if exists prestamos_organizacion_id_fkey,
  add constraint prestamos_organizacion_id_fkey
    foreign key (organizacion_id) references public.organizaciones(id) on delete restrict;

alter table public.prestamo_pagos
  drop constraint if exists prestamo_pagos_organizacion_id_fkey,
  add constraint prestamo_pagos_organizacion_id_fkey
    foreign key (organizacion_id) references public.organizaciones(id) on delete restrict;

alter table public.prestamo_solicitudes
  drop constraint if exists prestamo_solicitudes_organizacion_id_fkey,
  add constraint prestamo_solicitudes_organizacion_id_fkey
    foreign key (organizacion_id) references public.organizaciones(id) on delete restrict;

-- NOT NULL luego del backfill.
alter table public.prestamo_clientes alter column organizacion_id set not null;
alter table public.prestamos alter column organizacion_id set not null;
alter table public.prestamo_pagos alter column organizacion_id set not null;
alter table public.prestamo_solicitudes alter column organizacion_id set not null;
alter table public.prestamos_config alter column organizacion_id set not null;

-- -----------------------------------------------------------------------------
-- 3. Triggers: tenant automatico en INSERT e inmutable en UPDATE
-- -----------------------------------------------------------------------------
drop trigger if exists prestamo_clientes_set_org on public.prestamo_clientes;
create trigger prestamo_clientes_set_org
before insert on public.prestamo_clientes
for each row execute function public.set_organizacion_id();

drop trigger if exists prestamos_set_org on public.prestamos;
create trigger prestamos_set_org
before insert on public.prestamos
for each row execute function public.set_organizacion_id();

drop trigger if exists prestamo_pagos_set_org on public.prestamo_pagos;
create trigger prestamo_pagos_set_org
before insert on public.prestamo_pagos
for each row execute function public.set_organizacion_id();

drop trigger if exists prestamo_solicitudes_set_org on public.prestamo_solicitudes;
create trigger prestamo_solicitudes_set_org
before insert on public.prestamo_solicitudes
for each row execute function public.set_organizacion_id();

drop trigger if exists prestamos_config_set_org on public.prestamos_config;
create trigger prestamos_config_set_org
before insert on public.prestamos_config
for each row execute function public.set_organizacion_id();

-- Inmutabilidad de tenant: 5 legacy + 3 POS.
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
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.nx_impedir_cambio_organizacion()',
      t || '_org_inmutable', t
    );
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- 4. updated_at automatico
-- -----------------------------------------------------------------------------
alter table public.prestamo_clientes
  add column if not exists updated_at timestamptz default now();
alter table public.prestamos
  add column if not exists updated_at timestamptz default now();
alter table public.prestamo_pagos
  add column if not exists updated_at timestamptz default now();
alter table public.prestamo_solicitudes
  add column if not exists updated_at timestamptz default now();
alter table public.prestamos_config
  add column if not exists updated_at timestamptz default now();

do $$
declare
  t text;
begin
  foreach t in array array[
    'prestamo_clientes','prestamos','prestamo_pagos','prestamo_solicitudes','prestamos_config'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.nx_actualizar_updated_at()',
      t || '_updated_at', t
    );
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- 5. FKs compuestas del dominio Prestamos
-- -----------------------------------------------------------------------------
alter table public.prestamo_clientes
  drop constraint if exists prestamo_clientes_org_id_key,
  add constraint prestamo_clientes_org_id_key unique (organizacion_id, id);

alter table public.prestamos
  drop constraint if exists prestamos_org_id_key,
  add constraint prestamos_org_id_key unique (organizacion_id, id);

alter table public.prestamo_pagos
  drop constraint if exists prestamo_pagos_org_id_key,
  add constraint prestamo_pagos_org_id_key unique (organizacion_id, id);

-- Sustituir FK simple cliente -> cliente por FK tenant-aware.
alter table public.prestamos
  drop constraint if exists prestamos_cliente_id_fkey,
  drop constraint if exists prestamos_cliente_org_fkey,
  add constraint prestamos_cliente_org_fkey
    foreign key (organizacion_id, cliente_id)
    references public.prestamo_clientes(organizacion_id, id)
    on delete restrict;

-- Sustituir ON DELETE CASCADE de pagos -> prestamos por FK compuesta RESTRICT.
alter table public.prestamo_pagos
  drop constraint if exists prestamo_pagos_prestamo_id_fkey,
  drop constraint if exists prestamo_pagos_prestamo_org_fkey,
  add constraint prestamo_pagos_prestamo_org_fkey
    foreign key (organizacion_id, prestamo_id)
    references public.prestamos(organizacion_id, id)
    on delete restrict;

-- Solicitud -> cliente y solicitud -> prestamo: trazabilidad permanente.
alter table public.prestamo_solicitudes
  drop constraint if exists prestamo_solicitudes_cliente_org_fkey,
  add constraint prestamo_solicitudes_cliente_org_fkey
    foreign key (organizacion_id, cliente_id)
    references public.prestamo_clientes(organizacion_id, id)
    on delete restrict;

alter table public.prestamo_solicitudes
  drop constraint if exists prestamo_solicitudes_prestamo_org_fkey,
  add constraint prestamo_solicitudes_prestamo_org_fkey
    foreign key (organizacion_id, prestamo_id)
    references public.prestamos(organizacion_id, id)
    on delete restrict;

-- -----------------------------------------------------------------------------
-- 6. prestamos_config deja de ser singleton global id=1
-- -----------------------------------------------------------------------------
alter table public.prestamos_config
  drop constraint if exists prestamos_config_id_check;

alter table public.prestamos_config
  drop constraint if exists prestamos_config_pkey;

alter table public.prestamos_config
  drop column if exists id;

alter table public.prestamos_config
  add constraint prestamos_config_pkey primary key (organizacion_id);

alter table public.prestamos_config
  drop constraint if exists prestamos_config_organizacion_id_fkey,
  add constraint prestamos_config_organizacion_id_fkey
    foreign key (organizacion_id) references public.organizaciones(id) on delete restrict;

-- -----------------------------------------------------------------------------
-- 7. Estados: solo ciclo de vida. La mora es DERIVADA, nunca estado almacenado.
-- -----------------------------------------------------------------------------
update public.prestamos
set estado = 'activo'
where estado is null or estado not in ('activo','reestructurado','liquidado','cancelado');

alter table public.prestamos
  alter column estado set default 'activo',
  alter column estado set not null,
  drop constraint if exists prestamos_estado_check,
  add constraint prestamos_estado_check
    check (estado in ('activo','reestructurado','liquidado','cancelado'));

-- POS Cuotas usa `saldado` al completar el plan. Vencido/en mora siguen derivados.
update public.pos_financiamientos
set estado = 'activo'
where estado is null or estado not in ('activo','saldado','cancelado');

alter table public.pos_financiamientos
  alter column estado set default 'activo',
  alter column estado set not null,
  drop constraint if exists pos_financiamientos_estado_check,
  add constraint pos_financiamientos_estado_check
    check (estado in ('activo','saldado','cancelado'));

-- -----------------------------------------------------------------------------
-- 8. Ledger: preparar reversos sin romper la columna legacy `tipo`
-- `tipo` sigue temporalmente como aplicacion/destino del pago por compatibilidad
-- con parches.js. El rename se difiere hasta adaptar frontend.
-- -----------------------------------------------------------------------------
alter table public.prestamo_pagos
  add column if not exists tipo_movimiento text not null default 'pago',
  add column if not exists movimiento_origen_id uuid,
  add column if not exists motivo_reverso text;

alter table public.prestamo_pagos
  drop constraint if exists prestamo_pagos_tipo_movimiento_check,
  add constraint prestamo_pagos_tipo_movimiento_check
    check (tipo_movimiento in ('pago','reverso'));

alter table public.prestamo_pagos
  drop constraint if exists prestamo_pagos_movimiento_origen_org_fkey,
  add constraint prestamo_pagos_movimiento_origen_org_fkey
    foreign key (organizacion_id, movimiento_origen_id)
    references public.prestamo_pagos(organizacion_id, id)
    on delete restrict;

create unique index if not exists prestamo_pagos_un_reverso_por_movimiento_uidx
  on public.prestamo_pagos (movimiento_origen_id)
  where tipo_movimiento = 'reverso' and movimiento_origen_id is not null;

-- Integridad semantica minima del reverso.
alter table public.prestamo_pagos
  drop constraint if exists prestamo_pagos_reverso_origen_check,
  add constraint prestamo_pagos_reverso_origen_check
  check (
    (tipo_movimiento = 'pago' and movimiento_origen_id is null)
    or
    (tipo_movimiento = 'reverso' and movimiento_origen_id is not null)
  );

-- PENDIENTE FASE RPC/LOCKDOWN:
-- La estructura de ledger ya existe, pero el UPDATE/DELETE directo de authenticated
-- se mantendra temporalmente por compatibilidad. Antes del cierre del modulo se
-- revocara DML directo y registrar/reversar pagos pasara exclusivamente por RPC PG.

-- Soft delete solo donde tiene semantica de maestro/entidad, no en ledger.
alter table public.prestamo_clientes
  add column if not exists deleted_at timestamptz;
alter table public.prestamos
  add column if not exists deleted_at timestamptz;

-- Indices tenant-aware para consultas frecuentes y filtros RLS.
create index if not exists idx_prestamos_org_estado
  on public.prestamos (organizacion_id, estado);
create index if not exists idx_prestamo_pagos_org_prestamo
  on public.prestamo_pagos (organizacion_id, prestamo_id);
create index if not exists idx_prestamo_solicitudes_org_estado
  on public.prestamo_solicitudes (organizacion_id, estado);

-- -----------------------------------------------------------------------------
-- 9. POS Financiamiento: tenant NOT NULL + FKs compuestas + RESTRICT
-- -----------------------------------------------------------------------------
-- No existen filas actualmente, pero se valida de todos modos.
do $$
begin
  if exists (select 1 from public.pos_financiamientos where organizacion_id is null)
     or exists (select 1 from public.pos_fin_cuotas where organizacion_id is null)
     or exists (select 1 from public.pos_fin_pagos where organizacion_id is null)
  then
    raise exception 'Hay filas POS financiamiento sin organizacion_id; requiere backfill explicito';
  end if;

  if exists (select 1 from public.pos_fin_cuotas where financiamiento_id is null) then
    raise exception 'Hay cuotas POS sin financiamiento_id; requiere correccion previa';
  end if;
end
$$;

alter table public.pos_financiamientos alter column organizacion_id set not null;
alter table public.pos_fin_cuotas alter column organizacion_id set not null;
alter table public.pos_fin_cuotas alter column financiamiento_id set not null;
alter table public.pos_fin_pagos alter column organizacion_id set not null;

alter table public.pos_financiamientos
  drop constraint if exists pos_financiamientos_org_id_key,
  add constraint pos_financiamientos_org_id_key unique (organizacion_id, id);

alter table public.pos_fin_cuotas
  drop constraint if exists pos_fin_cuotas_org_id_key,
  add constraint pos_fin_cuotas_org_id_key unique (organizacion_id, id);

-- Reemplazar FKs simples/CASCADE por tenant-aware + RESTRICT.
alter table public.pos_fin_cuotas
  drop constraint if exists pos_fin_cuotas_financiamiento_id_fkey,
  drop constraint if exists pos_fin_cuotas_financiamiento_org_fkey,
  add constraint pos_fin_cuotas_financiamiento_org_fkey
    foreign key (organizacion_id, financiamiento_id)
    references public.pos_financiamientos(organizacion_id, id)
    on delete restrict;

alter table public.pos_fin_pagos
  drop constraint if exists pos_fin_pagos_financiamiento_id_fkey,
  drop constraint if exists pos_fin_pagos_financiamiento_org_fkey,
  add constraint pos_fin_pagos_financiamiento_org_fkey
    foreign key (organizacion_id, financiamiento_id)
    references public.pos_financiamientos(organizacion_id, id)
    on delete restrict;

alter table public.pos_fin_pagos
  drop constraint if exists pos_fin_pagos_cuota_id_fkey,
  drop constraint if exists pos_fin_pagos_cuota_org_fkey,
  add constraint pos_fin_pagos_cuota_org_fkey
    foreign key (organizacion_id, cuota_id)
    references public.pos_fin_cuotas(organizacion_id, id)
    on delete restrict;

-- -----------------------------------------------------------------------------
-- 10. RLS tenant-aware
-- -----------------------------------------------------------------------------
-- Legacy prestamos: reemplazar admin-global por tenant authenticated.
drop policy if exists prestamo_clientes_admin on public.prestamo_clientes;
drop policy if exists prestamo_clientes_tenant on public.prestamo_clientes;
create policy prestamo_clientes_tenant
on public.prestamo_clientes
for all
to authenticated
using (organizacion_id = public.mi_organizacion() and public.mi_rol() is not null)
with check (organizacion_id = public.mi_organizacion() and public.mi_rol() is not null);

drop policy if exists prestamos_admin on public.prestamos;
drop policy if exists prestamos_tenant on public.prestamos;
create policy prestamos_tenant
on public.prestamos
for all
to authenticated
using (organizacion_id = public.mi_organizacion() and public.mi_rol() is not null)
with check (organizacion_id = public.mi_organizacion() and public.mi_rol() is not null);

drop policy if exists prestamo_pagos_admin on public.prestamo_pagos;
drop policy if exists prestamo_pagos_tenant on public.prestamo_pagos;
create policy prestamo_pagos_tenant
on public.prestamo_pagos
for all
to authenticated
using (organizacion_id = public.mi_organizacion() and public.mi_rol() is not null)
with check (organizacion_id = public.mi_organizacion() and public.mi_rol() is not null);

drop policy if exists prestamo_solicitudes_admin on public.prestamo_solicitudes;
drop policy if exists prestamo_solicitudes_tenant on public.prestamo_solicitudes;
create policy prestamo_solicitudes_tenant
on public.prestamo_solicitudes
for all
to authenticated
using (organizacion_id = public.mi_organizacion() and public.mi_rol() is not null)
with check (organizacion_id = public.mi_organizacion() and public.mi_rol() is not null);

drop policy if exists prestamos_config_admin on public.prestamos_config;
drop policy if exists prestamos_config_tenant on public.prestamos_config;
create policy prestamos_config_tenant
on public.prestamos_config
for all
to authenticated
using (organizacion_id = public.mi_organizacion() and public.mi_rol() is not null)
with check (organizacion_id = public.mi_organizacion() and public.mi_rol() is not null);

-- POS: quitar la excepcion organizacion_id IS NULL.
drop policy if exists pos_fin_admin on public.pos_financiamientos;
drop policy if exists pos_financiamientos_tenant on public.pos_financiamientos;
create policy pos_financiamientos_tenant
on public.pos_financiamientos
for all
to authenticated
using (organizacion_id = public.mi_organizacion() and public.mi_rol() is not null)
with check (organizacion_id = public.mi_organizacion() and public.mi_rol() is not null);

drop policy if exists pos_fincuo_admin on public.pos_fin_cuotas;
drop policy if exists pos_fin_cuotas_tenant on public.pos_fin_cuotas;
create policy pos_fin_cuotas_tenant
on public.pos_fin_cuotas
for all
to authenticated
using (organizacion_id = public.mi_organizacion() and public.mi_rol() is not null)
with check (organizacion_id = public.mi_organizacion() and public.mi_rol() is not null);

drop policy if exists pos_finpag_admin on public.pos_fin_pagos;
drop policy if exists pos_fin_pagos_tenant on public.pos_fin_pagos;
create policy pos_fin_pagos_tenant
on public.pos_fin_pagos
for all
to authenticated
using (organizacion_id = public.mi_organizacion() and public.mi_rol() is not null)
with check (organizacion_id = public.mi_organizacion() and public.mi_rol() is not null);

-- -----------------------------------------------------------------------------
-- 11. Grants de riesgo bajo: retirar privilegios administrativos innecesarios.
-- NO se revoca aun INSERT/UPDATE/DELETE de authenticated: se hara despues de
-- desplegar y adaptar RPCs/frontend. Esto evita romper el sistema durante transicion.
-- -----------------------------------------------------------------------------
revoke truncate, references, trigger on table
  public.prestamo_clientes,
  public.prestamos,
  public.prestamo_pagos,
  public.prestamo_solicitudes,
  public.prestamos_config,
  public.pos_financiamientos,
  public.pos_fin_cuotas,
  public.pos_fin_pagos
from authenticated;

-- anon no necesita DML financiero directo. El flujo publico de solicitudes debe
-- operar por Edge Function/service_role si necesita acceso no autenticado.
revoke all on table
  public.prestamo_clientes,
  public.prestamos,
  public.prestamo_pagos,
  public.prestamos_config,
  public.pos_financiamientos,
  public.pos_fin_cuotas,
  public.pos_fin_pagos
from anon;

-- PRESTAMO_SOLICITUDES se deja fuera del REVOKE ALL de anon en esta migracion
-- hasta auditar de forma independiente el flujo publico de solicitudes.
-- Su RLS interna ya no concede acceso anon, por lo que no queda una ruta directa
-- utilizable sin una policy publica explicita.

commit;
