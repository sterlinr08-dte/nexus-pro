-- ============================================================================
-- APLICADA el 29-sep-2026 13:00 UTC en tnwsgcxurfyuszxsewsn con autorización del dueño (no-op: los objetos ya existían).
-- ============================================================================
-- NEXUS PRO CRM · DDL documentada de crm_actividades y crm_tareas (29-sep-2026)
--
-- Estas dos tablas EXISTEN en producción (tnwsgcxurfyuszxsewsn) desde el 9-sep-2026, pero su
-- definición nunca quedó en el repositorio (solo estaban las RPC crm_registrar_actividad y
-- crm_completar_tarea). Este archivo recupera la definición REAL leída en modo solo lectura de
-- information_schema / pg_catalog / pg_policies el 29-sep-2026, escrita de forma idempotente
-- (create ... if not exists / do-blocks) para que:
--   · sirva como documentación de la fuente de verdad;
--   · si algún día se aplica sobre producción, no cambie nada (todo ya existe);
--   · en una base nueva o de pruebas cree las tablas exactamente como están hoy.
--
-- NO cambia columnas existentes: la Edge Function whatsapp-automatizaciones-run inserta en
-- crm_tareas (cliente_id, titulo, tipo, prioridad, estado, vence_en, asignado_agente_id) y las RPC
-- del CRM dependen de estas columnas y de estos CHECK.
--
-- Observación de seguridad (NO corregida aquí, solo anotada para el dueño): los GRANT actuales dan a
-- `anon` todos los privilegios sobre ambas tablas (RLS activa sin política para anon → sin acceso
-- efectivo, pero el GRANT es innecesario). Ver "Pendiente" en la bitácora 2026-09-29.
-- ============================================================================

create extension if not exists pgcrypto;

-- ── crm_actividades ─────────────────────────────────────────────────────────
create table if not exists public.crm_actividades (
  id                 uuid primary key default gen_random_uuid(),
  cliente_id         uuid not null references public.clientes(id) on delete restrict,
  tipo               text not null,
  titulo             text not null,
  detalle            text,
  resultado          text,
  proxima_accion_en  timestamptz,
  creado_por         uuid default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname='crm_actividades_tipo_check') then
    alter table public.crm_actividades add constraint crm_actividades_tipo_check
      check (tipo = any (array['llamada','whatsapp','nota','cotizacion','renovacion','documento','cobro','sistema']));
  end if;
  if not exists (select 1 from pg_constraint where conname='crm_actividades_titulo_check') then
    alter table public.crm_actividades add constraint crm_actividades_titulo_check
      check (char_length(trim(both from titulo)) >= 2 and char_length(trim(both from titulo)) <= 160);
  end if;
end $$;

create index if not exists crm_actividades_cliente_fecha_idx on public.crm_actividades (cliente_id, created_at desc);

-- ── crm_tareas ──────────────────────────────────────────────────────────────
create table if not exists public.crm_tareas (
  id                  uuid primary key default gen_random_uuid(),
  cliente_id          uuid not null references public.clientes(id) on delete restrict,
  actividad_id        uuid references public.crm_actividades(id) on delete set null,
  titulo              text not null,
  tipo                text not null default 'seguimiento',
  prioridad           text not null default 'media',
  estado              text not null default 'pendiente',
  vence_en            timestamptz,
  asignado_agente_id  uuid references public.agentes(id) on delete set null,
  completada_en       timestamptz,
  creado_por          uuid default auth.uid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname='crm_tareas_tipo_check') then
    alter table public.crm_tareas add constraint crm_tareas_tipo_check
      check (tipo = any (array['seguimiento','documento','renovacion','cobro','afiliacion','otro']));
  end if;
  if not exists (select 1 from pg_constraint where conname='crm_tareas_prioridad_check') then
    alter table public.crm_tareas add constraint crm_tareas_prioridad_check
      check (prioridad = any (array['baja','media','alta','urgente']));
  end if;
  if not exists (select 1 from pg_constraint where conname='crm_tareas_estado_check') then
    alter table public.crm_tareas add constraint crm_tareas_estado_check
      check (estado = any (array['pendiente','completada','cancelada']));
  end if;
  if not exists (select 1 from pg_constraint where conname='crm_tareas_titulo_check') then
    alter table public.crm_tareas add constraint crm_tareas_titulo_check
      check (char_length(trim(both from titulo)) >= 2 and char_length(trim(both from titulo)) <= 160);
  end if;
  if not exists (select 1 from pg_constraint where conname='crm_tareas_check') then
    alter table public.crm_tareas add constraint crm_tareas_check
      check ((estado = 'completada' and completada_en is not null) or estado <> 'completada');
  end if;
end $$;

create index if not exists crm_tareas_operacion_idx on public.crm_tareas (estado, vence_en, prioridad);
create index if not exists crm_tareas_cliente_idx   on public.crm_tareas (cliente_id, estado);

-- ── RLS (tal como está hoy): cualquier usuario autenticado con perfil, de la organización nexus-pro,
--    puede leer y escribir todo (decisión del dueño: toda la cartera es visible para todos los roles).
alter table public.crm_actividades enable row level security;
alter table public.crm_tareas      enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='crm_actividades' and policyname='crm_actividades_operacion') then
    create policy crm_actividades_operacion on public.crm_actividades
      for all to authenticated
      using  (mi_rol() is not null and mi_organizacion() = (select id from public.organizaciones where slug='nexus-pro'))
      with check (mi_rol() is not null and mi_organizacion() = (select id from public.organizaciones where slug='nexus-pro'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='crm_tareas' and policyname='crm_tareas_operacion') then
    create policy crm_tareas_operacion on public.crm_tareas
      for all to authenticated
      using  (mi_rol() is not null and mi_organizacion() = (select id from public.organizaciones where slug='nexus-pro'))
      with check (mi_rol() is not null and mi_organizacion() = (select id from public.organizaciones where slug='nexus-pro'));
  end if;
end $$;

-- Sin triggers propios en producción (no hay set_updated_at en estas dos tablas; las RPC fijan updated_at a mano).
-- Las RPC crm_registrar_actividad(...) y crm_completar_tarea(uuid) están en las migraciones
-- 20260906000000 y 20260906010000 (SECURITY INVOKER, EXECUTE solo para authenticated).
