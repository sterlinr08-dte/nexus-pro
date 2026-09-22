-- STUDIO · Financiamiento v2 hardening
-- Corrige permisos demasiado amplios, agrega integridad referencial por tenant
-- y evita una descripción contractual ambigua cuando no existe una fase 1.
-- Aplicar SOLO en STUDIO (proyecto edbknlkjnlfmkkiizdbe).

begin;

-- 1) El tenant es obligatorio en todas las entidades del módulo.
do $block$
declare
  t text;
  has_null boolean;
begin
  foreach t in array array[
    'pos_fin_planes',
    'pos_fin_perfil',
    'pos_fin_referencias',
    'pos_fin_documentos',
    'pos_fin_solicitudes'
  ] loop
    if exists (
      select 1 from pg_catalog.pg_attribute
      where attrelid = format('public.%I', t)::regclass
        and attname = 'organizacion_id'
        and not attnotnull
    ) then
      execute format(
        'select exists (select 1 from public.%I where organizacion_id is null)',
        t
      ) into has_null;
      if has_null then
        raise exception 'FIN_HARDENING_ORG_NULL: % contiene filas sin organización', t;
      end if;
      execute format('alter table public.%I alter column organizacion_id set not null', t);
    end if;
  end loop;
end
$block$;

-- 2) Claves candidatas compuestas para impedir referencias cruzadas entre empresas.
create unique index if not exists pos_clientes_org_id_uidx
  on public.pos_clientes(organizacion_id, id);
create unique index if not exists pos_ventas_org_id_uidx
  on public.pos_ventas(organizacion_id, id);

-- Sin fase 1, tasa2 no participa en el cálculo y debe coincidir con tasa1.
do $block$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'pos_fin_planes_fases_tasas_check'
      and conrelid = 'public.pos_fin_planes'::regclass
  ) then
    alter table public.pos_fin_planes
      add constraint pos_fin_planes_fases_tasas_check
      check (cuotas_fase1 > 0 or tasa2 = tasa1) not valid;
  end if;
end
$block$;
alter table public.pos_fin_planes validate constraint pos_fin_planes_fases_tasas_check;

-- 3) Relaciones del módulo. RESTRICT preserva el historial financiero y contractual.
do $block$
begin
  if not exists (select 1 from pg_constraint where conname='pos_fin_planes_org_fkey') then
    alter table public.pos_fin_planes add constraint pos_fin_planes_org_fkey
      foreign key (organizacion_id) references public.organizaciones(id) on delete restrict not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname='pos_fin_perfil_cliente_org_fkey') then
    alter table public.pos_fin_perfil add constraint pos_fin_perfil_cliente_org_fkey
      foreign key (organizacion_id, cliente_id) references public.pos_clientes(organizacion_id, id) on delete restrict not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname='pos_fin_referencias_cliente_org_fkey') then
    alter table public.pos_fin_referencias add constraint pos_fin_referencias_cliente_org_fkey
      foreign key (organizacion_id, cliente_id) references public.pos_clientes(organizacion_id, id) on delete restrict not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname='pos_fin_documentos_cliente_org_fkey') then
    alter table public.pos_fin_documentos add constraint pos_fin_documentos_cliente_org_fkey
      foreign key (organizacion_id, cliente_id) references public.pos_clientes(organizacion_id, id) on delete restrict not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname='pos_fin_documentos_solicitud_org_fkey') then
    alter table public.pos_fin_documentos add constraint pos_fin_documentos_solicitud_org_fkey
      foreign key (organizacion_id, solicitud_id) references public.pos_fin_solicitudes(organizacion_id, id) on delete restrict not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname='pos_fin_documentos_financiamiento_org_fkey') then
    alter table public.pos_fin_documentos add constraint pos_fin_documentos_financiamiento_org_fkey
      foreign key (organizacion_id, financiamiento_id) references public.pos_financiamientos(organizacion_id, id) on delete restrict not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname='pos_fin_solicitudes_cliente_org_fkey') then
    alter table public.pos_fin_solicitudes add constraint pos_fin_solicitudes_cliente_org_fkey
      foreign key (organizacion_id, cliente_id) references public.pos_clientes(organizacion_id, id) on delete restrict not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname='pos_fin_solicitudes_plan_org_fkey') then
    alter table public.pos_fin_solicitudes add constraint pos_fin_solicitudes_plan_org_fkey
      foreign key (organizacion_id, plan_id) references public.pos_fin_planes(organizacion_id, id) on delete restrict not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname='pos_fin_solicitudes_venta_org_fkey') then
    alter table public.pos_fin_solicitudes add constraint pos_fin_solicitudes_venta_org_fkey
      foreign key (organizacion_id, venta_id) references public.pos_ventas(organizacion_id, id) on delete restrict not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname='pos_fin_solicitudes_financiamiento_org_fkey') then
    alter table public.pos_fin_solicitudes add constraint pos_fin_solicitudes_financiamiento_org_fkey
      foreign key (organizacion_id, financiamiento_id) references public.pos_financiamientos(organizacion_id, id) on delete restrict not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname='pos_financiamientos_plan_org_fkey') then
    alter table public.pos_financiamientos add constraint pos_financiamientos_plan_org_fkey
      foreign key (organizacion_id, plan_id) references public.pos_fin_planes(organizacion_id, id) on delete restrict not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname='pos_financiamientos_solicitud_org_fkey') then
    alter table public.pos_financiamientos add constraint pos_financiamientos_solicitud_org_fkey
      foreign key (organizacion_id, solicitud_id) references public.pos_fin_solicitudes(organizacion_id, id) on delete restrict not valid;
  end if;
end
$block$;

alter table public.pos_fin_planes validate constraint pos_fin_planes_org_fkey;
alter table public.pos_fin_perfil validate constraint pos_fin_perfil_cliente_org_fkey;
alter table public.pos_fin_referencias validate constraint pos_fin_referencias_cliente_org_fkey;
alter table public.pos_fin_documentos validate constraint pos_fin_documentos_cliente_org_fkey;
alter table public.pos_fin_documentos validate constraint pos_fin_documentos_solicitud_org_fkey;
alter table public.pos_fin_documentos validate constraint pos_fin_documentos_financiamiento_org_fkey;
alter table public.pos_fin_solicitudes validate constraint pos_fin_solicitudes_cliente_org_fkey;
alter table public.pos_fin_solicitudes validate constraint pos_fin_solicitudes_plan_org_fkey;
alter table public.pos_fin_solicitudes validate constraint pos_fin_solicitudes_venta_org_fkey;
alter table public.pos_fin_solicitudes validate constraint pos_fin_solicitudes_financiamiento_org_fkey;
alter table public.pos_financiamientos validate constraint pos_financiamientos_plan_org_fkey;
alter table public.pos_financiamientos validate constraint pos_financiamientos_solicitud_org_fkey;

create index if not exists pos_fin_perfil_cliente_org_idx on public.pos_fin_perfil(organizacion_id, cliente_id);
create index if not exists pos_fin_referencias_cliente_org_idx on public.pos_fin_referencias(organizacion_id, cliente_id);
create index if not exists pos_fin_documentos_cliente_org_idx on public.pos_fin_documentos(organizacion_id, cliente_id);
create index if not exists pos_fin_documentos_solicitud_org_idx on public.pos_fin_documentos(organizacion_id, solicitud_id);
create index if not exists pos_fin_documentos_financiamiento_org_idx on public.pos_fin_documentos(organizacion_id, financiamiento_id);
create index if not exists pos_fin_solicitudes_cliente_org_idx on public.pos_fin_solicitudes(organizacion_id, cliente_id);
create index if not exists pos_fin_solicitudes_plan_org_idx on public.pos_fin_solicitudes(organizacion_id, plan_id);
create index if not exists pos_financiamientos_plan_org_idx on public.pos_financiamientos(organizacion_id, plan_id);
create index if not exists pos_financiamientos_solicitud_org_idx on public.pos_financiamientos(organizacion_id, solicitud_id);

-- 4) RLS por operación y rol. Se conserva la lectura dentro del tenant.
drop policy if exists pos_fin_planes_tenant on public.pos_fin_planes;
drop policy if exists pos_fin_perfil_tenant on public.pos_fin_perfil;
drop policy if exists pos_fin_referencias_tenant on public.pos_fin_referencias;
drop policy if exists pos_fin_documentos_tenant on public.pos_fin_documentos;
drop policy if exists pos_fin_solicitudes_tenant on public.pos_fin_solicitudes;

create policy pos_fin_planes_select on public.pos_fin_planes for select to authenticated
  using (organizacion_id = (select mi_organizacion()) and (select mi_rol()) is not null);
create policy pos_fin_planes_insert on public.pos_fin_planes for insert to authenticated
  with check (organizacion_id = (select mi_organizacion()) and (select mi_rol()) in ('admin','gerente'));
create policy pos_fin_planes_update on public.pos_fin_planes for update to authenticated
  using (organizacion_id = (select mi_organizacion()) and (select mi_rol()) in ('admin','gerente'))
  with check (organizacion_id = (select mi_organizacion()) and (select mi_rol()) in ('admin','gerente'));
create policy pos_fin_planes_delete on public.pos_fin_planes for delete to authenticated
  using (organizacion_id = (select mi_organizacion()) and (select mi_rol()) = 'admin');

create policy pos_fin_perfil_select on public.pos_fin_perfil for select to authenticated
  using (organizacion_id = (select mi_organizacion()) and (select mi_rol()) is not null);
create policy pos_fin_perfil_insert on public.pos_fin_perfil for insert to authenticated
  with check (organizacion_id = (select mi_organizacion()) and (select mi_rol()) in ('admin','gerente','cajero'));
create policy pos_fin_perfil_update on public.pos_fin_perfil for update to authenticated
  using (organizacion_id = (select mi_organizacion()) and (select mi_rol()) in ('admin','gerente','cajero'))
  with check (organizacion_id = (select mi_organizacion()) and (select mi_rol()) in ('admin','gerente','cajero'));
create policy pos_fin_perfil_delete on public.pos_fin_perfil for delete to authenticated
  using (organizacion_id = (select mi_organizacion()) and (select mi_rol()) in ('admin','gerente'));

create policy pos_fin_referencias_select on public.pos_fin_referencias for select to authenticated
  using (organizacion_id = (select mi_organizacion()) and (select mi_rol()) is not null);
create policy pos_fin_referencias_insert on public.pos_fin_referencias for insert to authenticated
  with check (organizacion_id = (select mi_organizacion()) and (select mi_rol()) in ('admin','gerente','cajero'));
create policy pos_fin_referencias_update on public.pos_fin_referencias for update to authenticated
  using (organizacion_id = (select mi_organizacion()) and (select mi_rol()) in ('admin','gerente','cajero'))
  with check (organizacion_id = (select mi_organizacion()) and (select mi_rol()) in ('admin','gerente','cajero'));
create policy pos_fin_referencias_delete on public.pos_fin_referencias for delete to authenticated
  using (organizacion_id = (select mi_organizacion()) and (select mi_rol()) in ('admin','gerente'));

create policy pos_fin_documentos_select on public.pos_fin_documentos for select to authenticated
  using (organizacion_id = (select mi_organizacion()) and (select mi_rol()) is not null);
create policy pos_fin_documentos_insert on public.pos_fin_documentos for insert to authenticated
  with check (organizacion_id = (select mi_organizacion()) and (select mi_rol()) in ('admin','gerente','cajero'));
create policy pos_fin_documentos_update on public.pos_fin_documentos for update to authenticated
  using (organizacion_id = (select mi_organizacion()) and (select mi_rol()) in ('admin','gerente','cajero'))
  with check (organizacion_id = (select mi_organizacion()) and (select mi_rol()) in ('admin','gerente','cajero'));
create policy pos_fin_documentos_delete on public.pos_fin_documentos for delete to authenticated
  using (organizacion_id = (select mi_organizacion()) and (select mi_rol()) in ('admin','gerente'));

create policy pos_fin_solicitudes_select on public.pos_fin_solicitudes for select to authenticated
  using (organizacion_id = (select mi_organizacion()) and (select mi_rol()) is not null);
create policy pos_fin_solicitudes_insert on public.pos_fin_solicitudes for insert to authenticated
  with check (
    organizacion_id = (select mi_organizacion())
    and (select mi_rol()) in ('admin','gerente','cajero')
    and estado in ('borrador','pendiente')
  );
create policy pos_fin_solicitudes_update on public.pos_fin_solicitudes for update to authenticated
  using (
    organizacion_id = (select mi_organizacion())
    and (
      (select mi_rol()) in ('admin','gerente')
      or ((select mi_rol()) = 'cajero' and estado in ('borrador','pendiente'))
    )
  )
  with check (
    organizacion_id = (select mi_organizacion())
    and (
      (select mi_rol()) in ('admin','gerente')
      or ((select mi_rol()) = 'cajero' and estado in ('borrador','pendiente'))
    )
  );
create policy pos_fin_solicitudes_delete on public.pos_fin_solicitudes for delete to authenticated
  using (
    organizacion_id = (select mi_organizacion())
    and (select mi_rol()) in ('admin','gerente')
    and estado = 'borrador'
  );

-- 5) El contrato comunica el costo total sin describir una fase inexistente.
update public.pos_config
set fin_contrato_plantilla = replace(
  fin_contrato_plantilla,
  'bajo el plan "{{plan}}" ({{cuotas}} cuotas {{frecuencia}}es, interés {{metodo_interes}}: {{cuotas_fase1}} cuota(s) al {{tasa1}} y el resto al {{tasa2}}), para un interés total',
  'bajo el plan "{{plan}}" ({{cuotas}} cuotas {{frecuencia}}es, interés {{metodo_interes}} conforme a las condiciones del plan), para un interés total'
)
where organizacion_id = 'e404d1c4-24c5-4e17-88f6-84bef09d6d19'
  and fin_contrato_plantilla is not null;

commit;
