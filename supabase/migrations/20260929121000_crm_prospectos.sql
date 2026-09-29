-- ============================================================================
-- NO APLICADA — pendiente de publicación autorizada por el dueño.
-- ============================================================================
-- NEXUS PRO CRM · Embudo de prospectos (29-sep-2026, v58.86)
--
-- Tablas nuevas: crm_prospectos y crm_prospectos_historial. No toca ninguna tabla existente
-- (crm_tareas.cliente_id y crm_actividades.cliente_id son NOT NULL, así que NO se les agrega
-- prospecto_id: una tarea/actividad de prospecto sin cliente rompería esa regla y las RPC actuales.
-- Las notas del prospecto viven en crm_prospectos_historial (tipo='nota'); las tareas con fecha
-- se llevan en el cliente una vez vinculado al pasar a «emitida»).
--
-- Sin dinero: prima_estimada es informativa (no genera facturas, abonos ni asientos).
-- Sin envíos: el sistema no manda WhatsApp desde aquí; el botón de la app solo abre wa.me.
--
-- Etapas: nuevo → cotizado → documentos → emitida | perdida.
-- Motivos de pérdida (lista fija): precio, otra_aseguradora, no_respondio, no_califico, otro.
-- Alcance (decisión del dueño 29-sep-2026): todos los roles ven TODOS los prospectos de la
-- organización nexus-pro; leer/crear/editar cualquier usuario autenticado con perfil; borrar solo admin.
-- ============================================================================

create extension if not exists pgcrypto;

-- ── Tabla principal ─────────────────────────────────────────────────────────
create table if not exists public.crm_prospectos (
  id                  uuid primary key default gen_random_uuid(),
  nombre              text not null,
  telefono            text not null,
  cedula              text,
  interes             text,                       -- tipo de seguro / producto de interés
  aseguradora         text,                       -- ARS / aseguradora (opcional)
  origen              text not null default 'Otro',
  etapa               text not null default 'nuevo',
  motivo_perdida      text,
  motivo_detalle      text,
  asignado_agente_id  uuid references public.agentes(id) on delete set null,
  cliente_id          uuid references public.clientes(id) on delete set null,   -- se llena al emitir
  numero_poliza       text,                       -- en NEXUS la póliza vive en clientes.numero_poliza (no hay tabla polizas)
  prima_estimada      numeric(12,2),              -- informativa, sin contabilidad
  notas               text,
  creado_por          uuid default auth.uid(),
  etapa_cambiada_en   timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint crm_prospectos_nombre_check   check (char_length(trim(both from nombre)) between 2 and 120),
  constraint crm_prospectos_telefono_check check (char_length(regexp_replace(telefono, '\D', '', 'g')) >= 10),
  constraint crm_prospectos_origen_check   check (origen = any (array['WhatsApp','Referido','Redes','Llamada','Visita','Otro'])),
  constraint crm_prospectos_etapa_check    check (etapa = any (array['nuevo','cotizado','documentos','emitida','perdida'])),
  constraint crm_prospectos_motivo_check   check (motivo_perdida is null or motivo_perdida = any (array['precio','otra_aseguradora','no_respondio','no_califico','otro'])),
  constraint crm_prospectos_prima_check    check (prima_estimada is null or prima_estimada >= 0),
  -- Perdida exige motivo; emitida exige cliente vinculado. (La app también lo valida; aquí es la regla dura.)
  constraint crm_prospectos_perdida_check  check (etapa <> 'perdida' or motivo_perdida is not null),
  constraint crm_prospectos_emitida_check  check (etapa <> 'emitida' or cliente_id is not null)
);

create index if not exists crm_prospectos_etapa_idx    on public.crm_prospectos (etapa, etapa_cambiada_en desc);
create index if not exists crm_prospectos_agente_idx   on public.crm_prospectos (asignado_agente_id, etapa);
create index if not exists crm_prospectos_cliente_idx  on public.crm_prospectos (cliente_id) where cliente_id is not null;

-- ── Historial (etapas escritas por el servidor + notas del equipo) ──────────
create table if not exists public.crm_prospectos_historial (
  id              uuid primary key default gen_random_uuid(),
  prospecto_id    uuid not null references public.crm_prospectos(id) on delete cascade,
  tipo            text not null default 'etapa',        -- 'etapa' (trigger) | 'nota' (equipo) | 'sistema'
  etapa_anterior  text,
  etapa_nueva     text,
  agente_id       uuid references public.agentes(id) on delete set null,
  usuario_id      uuid default auth.uid(),
  fecha           timestamptz not null default now(),
  nota            text,
  constraint crm_prospectos_historial_tipo_check check (tipo = any (array['etapa','nota','sistema'])),
  constraint crm_prospectos_historial_nota_check check (nota is null or char_length(nota) <= 2000)
);

create index if not exists crm_prospectos_historial_idx on public.crm_prospectos_historial (prospecto_id, fecha desc);

-- ── Trigger: updated_at, etapa_cambiada_en y fila de historial en cada cambio de etapa ──
-- SECURITY DEFINER para que la fila de historial la escriba el servidor aunque la política de
-- inserción directa del usuario solo permita tipo='nota'.
create or replace function public.crm_prospectos_tg_etapa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.etapa_cambiada_en := coalesce(new.etapa_cambiada_en, now());
    insert into public.crm_prospectos_historial (prospecto_id, tipo, etapa_anterior, etapa_nueva, agente_id, usuario_id, nota)
    values (new.id, 'etapa', null, new.etapa, coalesce(new.asignado_agente_id, public.mi_agente_id()), auth.uid(), 'Prospecto creado');
    return new;
  end if;
  if new.etapa is distinct from old.etapa then
    new.etapa_cambiada_en := now();
    if new.etapa <> 'perdida' then
      new.motivo_perdida := null;
      new.motivo_detalle := null;
    end if;
    insert into public.crm_prospectos_historial (prospecto_id, tipo, etapa_anterior, etapa_nueva, agente_id, usuario_id, nota)
    values (
      new.id, 'etapa', old.etapa, new.etapa, public.mi_agente_id(), auth.uid(),
      case
        when new.etapa = 'perdida' then 'Motivo: ' || coalesce(new.motivo_perdida, 'otro') || coalesce(' · ' || new.motivo_detalle, '')
        when new.etapa = 'emitida' then 'Cliente vinculado' || coalesce(' · póliza ' || new.numero_poliza, '')
        else null
      end
    );
  else
    -- Edición de datos sin cambio de etapa: no se mueve etapa_cambiada_en (así «días en la etapa» es real).
    new.etapa_cambiada_en := old.etapa_cambiada_en;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_crm_prospectos_etapa on public.crm_prospectos;
create trigger trg_crm_prospectos_etapa
  before insert or update on public.crm_prospectos
  for each row execute function public.crm_prospectos_tg_etapa();

-- ── RLS: mismo patrón que crm_tareas / crm_actividades (organización nexus-pro) ──
alter table public.crm_prospectos            enable row level security;
alter table public.crm_prospectos_historial  enable row level security;

do $$ begin
  -- Prospectos: leer / crear / editar → cualquier usuario autenticado con perfil de la organización.
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='crm_prospectos' and policyname='crm_prospectos_leer') then
    create policy crm_prospectos_leer on public.crm_prospectos for select to authenticated
      using (mi_rol() is not null and mi_organizacion() = (select id from public.organizaciones where slug='nexus-pro'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='crm_prospectos' and policyname='crm_prospectos_crear') then
    create policy crm_prospectos_crear on public.crm_prospectos for insert to authenticated
      with check (mi_rol() is not null and mi_organizacion() = (select id from public.organizaciones where slug='nexus-pro'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='crm_prospectos' and policyname='crm_prospectos_editar') then
    create policy crm_prospectos_editar on public.crm_prospectos for update to authenticated
      using  (mi_rol() is not null and mi_organizacion() = (select id from public.organizaciones where slug='nexus-pro'))
      with check (mi_rol() is not null and mi_organizacion() = (select id from public.organizaciones where slug='nexus-pro'));
  end if;
  -- Borrar: solo admin.
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='crm_prospectos' and policyname='crm_prospectos_borrar_admin') then
    create policy crm_prospectos_borrar_admin on public.crm_prospectos for delete to authenticated
      using (mi_rol() = 'admin' and mi_organizacion() = (select id from public.organizaciones where slug='nexus-pro'));
  end if;
  -- Historial: leer todos; insertar directo SOLO notas (las filas de etapa las escribe el trigger); nunca editar ni borrar.
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='crm_prospectos_historial' and policyname='crm_prospectos_historial_leer') then
    create policy crm_prospectos_historial_leer on public.crm_prospectos_historial for select to authenticated
      using (mi_rol() is not null and mi_organizacion() = (select id from public.organizaciones where slug='nexus-pro'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='crm_prospectos_historial' and policyname='crm_prospectos_historial_nota') then
    create policy crm_prospectos_historial_nota on public.crm_prospectos_historial for insert to authenticated
      with check (tipo = 'nota' and mi_rol() is not null and mi_organizacion() = (select id from public.organizaciones where slug='nexus-pro'));
  end if;
end $$;

-- ── Privilegios: nada para anon; authenticated solo lo que las políticas permiten. ──
revoke all on public.crm_prospectos           from anon, public;
revoke all on public.crm_prospectos_historial from anon, public;
grant select, insert, update, delete on public.crm_prospectos to authenticated;
grant select, insert                 on public.crm_prospectos_historial to authenticated;
grant all on public.crm_prospectos, public.crm_prospectos_historial to service_role;
revoke execute on function public.crm_prospectos_tg_etapa() from public, anon, authenticated;

-- ── Comprobación rápida tras aplicar (solo lectura) ──
-- select etapa, count(*) from public.crm_prospectos group by 1;
-- select * from public.crm_prospectos_historial order by fecha desc limit 5;
