-- Seguridad previa a la demo pública del POS (15-nov-2026). No toca datos.
-- 1) Configuración del POS: la lee toda la empresa; solo el administrador la cambia.
drop policy if exists pos_config_org on public.pos_config;
create policy pos_config_leer on public.pos_config for select to authenticated
  using (public.mi_rol() is not null and organizacion_id = public.mi_organizacion());
create policy pos_config_admin on public.pos_config for all to authenticated
  using (public.mi_rol() = 'admin' and organizacion_id = public.mi_organizacion())
  with check (public.mi_rol() = 'admin' and (organizacion_id is null or organizacion_id = public.mi_organizacion()));

drop policy if exists pos_acceso_admin on public.pos_acceso;
create policy pos_acceso_leer on public.pos_acceso for select to authenticated
  using (public.mi_rol() is not null and organizacion_id = public.mi_organizacion());
create policy pos_acceso_admin on public.pos_acceso for all to authenticated
  using (public.mi_rol() = 'admin' and organizacion_id = public.mi_organizacion())
  with check (public.mi_rol() = 'admin' and (organizacion_id is null or organizacion_id = public.mi_organizacion()));

-- Secuencias NCF: crear y borrar, solo el administrador. Actualizar sigue abierto a la empresa porque la venta
-- avanza el número (camino de respaldo cuando la RPC atómica no responde).
drop policy if exists pos_ncf_admin on public.pos_ncf_secuencias;
create policy pos_ncf_leer on public.pos_ncf_secuencias for select to authenticated
  using (public.mi_rol() is not null and organizacion_id = public.mi_organizacion());
create policy pos_ncf_avanzar on public.pos_ncf_secuencias for update to authenticated
  using (public.mi_rol() is not null and organizacion_id = public.mi_organizacion())
  with check (public.mi_rol() is not null and organizacion_id = public.mi_organizacion());
create policy pos_ncf_crear on public.pos_ncf_secuencias for insert to authenticated
  with check (public.mi_rol() = 'admin' and (organizacion_id is null or organizacion_id = public.mi_organizacion()));
create policy pos_ncf_borrar on public.pos_ncf_secuencias for delete to authenticated
  using (public.mi_rol() = 'admin' and organizacion_id = public.mi_organizacion());

-- 2) Factura electrónica: solo las empresas que el dueño del sistema autorice. Sin políticas = nadie la lee
-- ni la escribe desde la app; la consulta la Edge Function `ecf-mseller` con la clave de servicio.
create table if not exists public.pos_ecf_autorizadas (
  organizacion_id uuid primary key references public.organizaciones(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.pos_ecf_autorizadas enable row level security;
revoke all on public.pos_ecf_autorizadas from anon, authenticated;

-- 3) Funciones internas de seguros y de mantenimiento: solo las usan otras funciones del servidor.
revoke execute on function public.seguros_acumulado_validado_agente(uuid) from public, anon, authenticated;
revoke execute on function public.seguros_cuenta_es_del_admin(uuid) from public, anon, authenticated;
revoke execute on function public.seguros_entrega_directa_vigente_at(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.tablas_para_respaldo() from public, anon, authenticated;
revoke execute on function public.rifa_expirar_apartados() from public, anon, authenticated;
