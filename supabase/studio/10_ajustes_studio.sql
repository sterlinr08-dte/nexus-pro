-- STUDIO · ajustes posteriores al clon del esquema POS (aplicar después de 09).
-- 1) Tabla operacion_excepciones: la usa el trigger trg_nx_capturar_excepcion_operativa
--    (AFTER INSERT en auditoria). Copiada de la base madre.

create table if not exists public.operacion_excepciones (
  id uuid not null default gen_random_uuid(),
  auditoria_id uuid,
  organizacion_id uuid not null,
  tipo text not null,
  modulo text not null,
  severidad text not null,
  estado text not null default 'abierta'::text,
  detalle text,
  detectada_en timestamp with time zone not null default now(),
  resuelta_en timestamp with time zone,
  resuelta_por uuid,
  nota_resolucion text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint operacion_excepciones_pkey primary key (id),
  constraint operacion_excepciones_auditoria_id_key unique (auditoria_id),
  constraint operacion_excepciones_estado_check check (estado = any (array['abierta'::text, 'resuelta'::text])),
  constraint operacion_excepciones_severidad_check check (severidad = any (array['alta'::text, 'critica'::text])),
  constraint operacion_excepciones_resolucion_completa check (
    ((estado = 'abierta'::text) and resuelta_en is null and resuelta_por is null and nota_resolucion is null)
    or ((estado = 'resuelta'::text) and resuelta_en is not null and resuelta_por is not null and length(trim(both from nota_resolucion)) >= 8)
  ),
  constraint operacion_excepciones_auditoria_id_fkey foreign key (auditoria_id) references public.auditoria(id) on delete set null,
  constraint operacion_excepciones_resuelta_por_fkey foreign key (resuelta_por) references auth.users(id) on delete set null
);

create index if not exists operacion_excepciones_org_estado_fecha_idx
  on public.operacion_excepciones using btree (organizacion_id, estado, detectada_en desc);

alter table public.operacion_excepciones enable row level security;

drop policy if exists operacion_excepciones_lectura_org on public.operacion_excepciones;
create policy operacion_excepciones_lectura_org on public.operacion_excepciones
  for select to public
  using ((mi_rol() is not null) and (organizacion_id = mi_organizacion()));

drop policy if exists operacion_excepciones_cierre_admin on public.operacion_excepciones;
create policy operacion_excepciones_cierre_admin on public.operacion_excepciones
  for update to public
  using ((mi_rol() = 'admin'::text) and (organizacion_id = mi_organizacion()))
  with check ((mi_rol() = 'admin'::text) and (organizacion_id = mi_organizacion()));

grant all on public.operacion_excepciones to anon, authenticated, service_role;
