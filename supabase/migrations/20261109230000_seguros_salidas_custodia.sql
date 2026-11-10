-- 09-nov-2026 · Salidas de custodia del administrador (dueño: «2 · Salidas del administrador»).
-- Problema: la custodia del administrador solo subía. Se registraba todo lo que entraba (cobros, depósitos de clientes,
-- entregas directas), pero nada de lo que salía (pago a la aseguradora, gastos, retiro del dueño).
-- Regla contable: una salida NO es un cobro ni lo toca. Solo baja la custodia de quien la registra.
--   Custodia = cobrado + recibido − enviado − entregado − SALIDAS
-- · motivo 'deposito_banco' no baja el total: solo pasa de efectivo a banco dentro de la misma custodia.
-- · La salida cuenta por su fecha de REGISTRO (created_at), nunca por una fecha escrita a mano: así un ciclo ya
--   cerrado no cambia. «fecha_real» es solo informativa.
-- · Anular una salida devuelve el dinero a la custodia en el ciclo en que se anula (igual que las entregas).
-- · Solo el administrador las registra y las ve. Solo cálculos nuevos: no toca datos existentes.

create table if not exists public.seguros_salidas_custodia (
  id uuid primary key default gen_random_uuid(),
  agente_id uuid not null references public.agentes(id),
  monto numeric not null check (monto > 0),
  motivo text not null check (motivo in ('aseguradora','gasto','retiro','ajuste_inicial','deposito_banco')),
  metodo text not null check (metodo in ('Efectivo','Banco')),
  banco text,
  referencia text,
  nota text,
  fecha_real date,
  comprobante_url text,
  created_at timestamptz not null default now(),
  created_by text,
  created_by_user_id uuid,
  idempotency_key text unique,
  anulado boolean not null default false,
  anulado_at timestamptz,
  anulado_por text,
  anulado_motivo text,
  constraint seguros_salidas_anulado_con_fecha check ((anulado and anulado_at is not null) or (not anulado and anulado_at is null)),
  constraint seguros_salidas_deposito_es_efectivo check (motivo <> 'deposito_banco' or metodo = 'Efectivo')
);
create index if not exists seguros_salidas_custodia_agente_idx on public.seguros_salidas_custodia(agente_id, created_at);

alter table public.seguros_salidas_custodia enable row level security;
-- Solo lectura para el administrador de NEXUS PRO. Se escribe únicamente con las funciones de abajo.
do $$ begin
  if not exists (select 1 from pg_policies where tablename='seguros_salidas_custodia' and policyname='salidas_custodia_admin_lee') then
    create policy salidas_custodia_admin_lee on public.seguros_salidas_custodia for select
      using (public.mi_rol() = 'admin' and public.mi_organizacion() = (select id from public.organizaciones where slug='nexus-pro'));
  end if;
end $$;

create or replace function public.seguros_acumulado_validado_agente(p_agente_id uuid)
 returns numeric
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select
      coalesce((select sum(a.monto) from public.abonos a
                 where a.agente_cobro=p_agente_id::text
                   and coalesce(a.estado,'') <> 'Reversado'
                   and not (a.metodo in ('Transferencia','Depósito') and a.validacion_estado='pendiente')),0)
    + coalesce((select sum(t.monto) from public.transferencias_agentes t
                 where t.hacia_agente=p_agente_id::text and t.estado='aceptada'),0)
    - coalesce((select sum(t.monto) from public.transferencias_agentes t
                 where t.desde_agente=p_agente_id::text and t.estado='aceptada'),0)
    - coalesce((select sum(e.monto) from public.entregas_admin e
                 where e.agente_id=p_agente_id and e.es_directo=false and e.anulado=false),0)
    - coalesce((select sum(e.monto) from public.entregas_admin e
                 where e.es_directo=true and e.anulado=false and e.agente_id<>p_agente_id
                   and coalesce(e.cobrado_por,e.agente_id)=p_agente_id
                   and public.seguros_entrega_directa_vigente_at(e.abono_id, coalesce(e.created_at,e.fecha)) is not null),0)
    + coalesce((select sum(e.monto) from public.entregas_admin e
                 where e.es_directo=true and e.anulado=false and e.agente_id=p_agente_id
                   and coalesce(e.cobrado_por,e.agente_id)<>p_agente_id
                   and public.seguros_entrega_directa_vigente_at(e.abono_id, coalesce(e.created_at,e.fecha)) is not null),0)
    - coalesce((select sum(s.monto) from public.seguros_salidas_custodia s
                 where s.agente_id=p_agente_id and s.anulado=false and s.motivo<>'deposito_banco'),0)
$function$;

create or replace function public.seguros_saldo_validado_agente_asof(p_agente_id uuid, p_corte timestamp with time zone)
 returns numeric
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select
      coalesce((select sum(a.monto) from public.abonos a where a.agente_cobro=p_agente_id::text and (case when a.metodo in ('Transferencia','Depósito') then case when a.validacion_estado='validado' then coalesce(a.validado_at,a.fecha,a.created_at) else null end else coalesce(a.fecha,a.created_at) end) < p_corte and (coalesce(a.estado,'') <> 'Reversado' or a.reversado_at is not null) and (a.reversado_at is null or a.reversado_at >= p_corte)),0)
    + coalesce((select sum(t.monto) from public.transferencias_agentes t where t.hacia_agente=p_agente_id::text and t.estado='aceptada' and coalesce(t.aceptado_en,t.fecha,t.created_at) < p_corte),0)
    - coalesce((select sum(t.monto) from public.transferencias_agentes t where t.desde_agente=p_agente_id::text and t.estado='aceptada' and coalesce(t.aceptado_en,t.fecha,t.created_at) < p_corte),0)
    - coalesce((select sum(e.monto) from public.entregas_admin e where e.agente_id=p_agente_id and e.es_directo=false and coalesce(e.created_at,e.fecha) < p_corte and (not coalesce(e.anulado,false) or e.anulado_at is not null) and (e.anulado_at is null or e.anulado_at >= p_corte)),0)
    - coalesce((select sum(e.monto) from public.entregas_admin e where e.es_directo=true and e.agente_id<>p_agente_id and coalesce(e.cobrado_por,e.agente_id)=p_agente_id and public.seguros_entrega_directa_vigente_at(e.abono_id, coalesce(e.created_at,e.fecha)) < p_corte and (not coalesce(e.anulado,false) or e.anulado_at is not null) and (e.anulado_at is null or e.anulado_at >= p_corte)),0)
    + coalesce((select sum(e.monto) from public.entregas_admin e where e.es_directo=true and e.agente_id=p_agente_id and coalesce(e.cobrado_por,e.agente_id)<>p_agente_id and public.seguros_entrega_directa_vigente_at(e.abono_id, coalesce(e.created_at,e.fecha)) < p_corte and (not coalesce(e.anulado,false) or e.anulado_at is not null) and (e.anulado_at is null or e.anulado_at >= p_corte)),0)
    - coalesce((select sum(s.monto) from public.seguros_salidas_custodia s where s.agente_id=p_agente_id and s.motivo<>'deposito_banco' and s.created_at < p_corte and (s.anulado_at is null or s.anulado_at >= p_corte)),0)
$function$;

create or replace function public.seguros_resumen_ciclo_agente_core(p_agente_id uuid, p_periodo text)
 returns table(agente_id uuid, periodo text, ciclo_inicio timestamp with time zone, ciclo_fin timestamp with time zone, corte timestamp with time zone, cerrado boolean, saldo_inicial numeric, cobrado_validado numeric, transferido_confirmado numeric, recibido_confirmado numeric, entregado_admin_directo numeric, directo_recibido numeric, reversas_cobros_previos numeric, reintegros_entregas_previas numeric, directos_previos_anulados numeric, saldo_final numeric, saldo_reconciliado numeric, diferencia_reconciliacion numeric, historico_aproximado boolean)
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_inicio timestamptz;
  v_fin timestamptz;
  v_corte timestamptz;
  v_saldo_inicial numeric;
  v_cobrado numeric;
  v_transferido numeric;
  v_recibido numeric;
  v_entregado numeric;
  v_directo_recibido numeric;
  v_reversas_previas numeric;
  v_reintegros_entregas_previas numeric;
  v_directos_previos_anulados numeric;
  v_saldo_final numeric;
  v_reconciliado numeric;
  v_salidas numeric;
  v_reintegros_salidas numeric;
  v_aprox boolean;
begin
  if p_agente_id is null
     or not exists(select 1 from public.agentes a where a.id=p_agente_id) then
    raise exception 'Agente invalido';
  end if;

  select l.inicio,l.fin,l.corte
    into v_inicio,v_fin,v_corte
  from public.seguros_ciclo_limites(p_periodo) l;

  v_saldo_inicial := public.seguros_saldo_validado_agente_asof(p_agente_id,v_inicio);
  v_saldo_final := public.seguros_saldo_validado_agente_asof(p_agente_id,v_corte);

  select coalesce(sum(a.monto),0)
    into v_cobrado
  from public.abonos a
  where a.agente_cobro=p_agente_id::text
    and (
      case
        when a.metodo in ('Transferencia','Depósito')
          then case when a.validacion_estado='validado'
                    then coalesce(a.validado_at,a.fecha,a.created_at)
                    else null end
        else coalesce(a.fecha,a.created_at)
      end
    ) >= v_inicio
    and (
      case
        when a.metodo in ('Transferencia','Depósito')
          then case when a.validacion_estado='validado'
                    then coalesce(a.validado_at,a.fecha,a.created_at)
                    else null end
        else coalesce(a.fecha,a.created_at)
      end
    ) < v_corte
    and (coalesce(a.estado,'') <> 'Reversado' or a.reversado_at is not null)
    and (a.reversado_at is null or a.reversado_at >= v_corte);

  select coalesce(sum(t.monto),0)
    into v_transferido
  from public.transferencias_agentes t
  where t.desde_agente=p_agente_id::text
    and t.estado='aceptada'
    and coalesce(t.aceptado_en,t.fecha,t.created_at) >= v_inicio
    and coalesce(t.aceptado_en,t.fecha,t.created_at) < v_corte;

  select coalesce(sum(t.monto),0)
    into v_recibido
  from public.transferencias_agentes t
  where t.hacia_agente=p_agente_id::text
    and t.estado='aceptada'
    and coalesce(t.aceptado_en,t.fecha,t.created_at) >= v_inicio
    and coalesce(t.aceptado_en,t.fecha,t.created_at) < v_corte;

  -- Entregas: la directa cuenta desde que su pago quedó validado (ver cabecera).
  select
      coalesce(sum(x.monto) filter (
        where x.agente_id=p_agente_id and x.es_directo=false
      ),0)
    + coalesce(sum(x.monto) filter (
        where x.es_directo=true
          and x.agente_id<>p_agente_id
          and coalesce(x.cobrado_por,x.agente_id)=p_agente_id
      ),0),
      coalesce(sum(x.monto) filter (
        where x.es_directo=true
          and x.agente_id=p_agente_id
          and coalesce(x.cobrado_por,x.agente_id)<>p_agente_id
      ),0)
    into v_entregado,v_directo_recibido
  from (
    select e.*,
           case when e.es_directo then public.seguros_entrega_directa_vigente_at(e.abono_id, coalesce(e.created_at,e.fecha))
                else coalesce(e.created_at,e.fecha) end as t_vigente
      from public.entregas_admin e
  ) x
  where x.t_vigente >= v_inicio
    and x.t_vigente < v_corte
    and (not coalesce(x.anulado,false) or x.anulado_at is not null)
    and (x.anulado_at is null or x.anulado_at >= v_corte);

  select coalesce(sum(a.monto),0)
    into v_reversas_previas
  from public.abonos a
  where a.agente_cobro=p_agente_id::text
    and (
      case
        when a.metodo in ('Transferencia','Depósito')
          then case when a.validacion_estado='validado'
                    then coalesce(a.validado_at,a.fecha,a.created_at)
                    else null end
        else coalesce(a.fecha,a.created_at)
      end
    ) < v_inicio
    and a.reversado_at >= v_inicio
    and a.reversado_at < v_corte;

  select coalesce(sum(x.monto),0)
    into v_reintegros_entregas_previas
  from (
    select e.*,
           case when e.es_directo then public.seguros_entrega_directa_vigente_at(e.abono_id, coalesce(e.created_at,e.fecha))
                else coalesce(e.created_at,e.fecha) end as t_vigente
      from public.entregas_admin e
  ) x
  where x.t_vigente < v_inicio
    and x.anulado_at >= v_inicio
    and x.anulado_at < v_corte
    and (
      (x.agente_id=p_agente_id and x.es_directo=false)
      or (
        x.es_directo=true
        and x.agente_id<>p_agente_id
        and coalesce(x.cobrado_por,x.agente_id)=p_agente_id
      )
    );

  select coalesce(sum(e.monto),0)
    into v_directos_previos_anulados
  from public.entregas_admin e
  where public.seguros_entrega_directa_vigente_at(e.abono_id, coalesce(e.created_at,e.fecha)) < v_inicio
    and e.anulado_at >= v_inicio
    and e.anulado_at < v_corte
    and e.es_directo=true
    and e.agente_id=p_agente_id
    and coalesce(e.cobrado_por,e.agente_id)<>p_agente_id;

  -- Salidas de custodia (pago a la aseguradora, gasto, retiro, ajuste inicial). Cuentan por su fecha de registro.
  select coalesce(sum(s.monto),0)
    into v_salidas
  from public.seguros_salidas_custodia s
  where s.agente_id=p_agente_id
    and s.motivo<>'deposito_banco'
    and s.created_at >= v_inicio
    and s.created_at < v_corte
    and (s.anulado_at is null or s.anulado_at >= v_corte);

  -- Salidas de ciclos anteriores que se anularon en este ciclo: el dinero vuelve a la custodia.
  select coalesce(sum(s.monto),0)
    into v_reintegros_salidas
  from public.seguros_salidas_custodia s
  where s.agente_id=p_agente_id
    and s.motivo<>'deposito_banco'
    and s.created_at < v_inicio
    and s.anulado_at >= v_inicio
    and s.anulado_at < v_corte;

  v_reconciliado := v_saldo_inicial
                  + v_cobrado
                  + v_recibido
                  + v_directo_recibido
                  - v_transferido
                  - v_entregado
                  - v_reversas_previas
                  + v_reintegros_entregas_previas
                  - v_directos_previos_anulados
                  - v_salidas
                  + v_reintegros_salidas;

  select exists(
    select 1
    from public.transferencias_agentes t
    where t.estado='aceptada'
      and t.aceptado_en is null
      and (t.desde_agente=p_agente_id::text or t.hacia_agente=p_agente_id::text)
      and coalesce(t.fecha,t.created_at) < v_corte
  ) or exists(
    select 1
    from public.abonos a
    where a.agente_cobro=p_agente_id::text
      and a.metodo in ('Transferencia','Depósito')
      and a.validacion_estado='validado'
      and a.validado_at is null
      and coalesce(a.fecha,a.created_at) < v_corte
  ) into v_aprox;

  return query select
    p_agente_id,
    p_periodo,
    v_inicio,
    v_fin,
    v_corte,
    (v_corte >= v_fin),
    v_saldo_inicial,
    v_cobrado,
    v_transferido,
    v_recibido,
    v_entregado,
    v_directo_recibido,
    v_reversas_previas,
    v_reintegros_entregas_previas,
    v_directos_previos_anulados,
    v_saldo_final,
    v_reconciliado,
    v_saldo_final-v_reconciliado,
    coalesce(v_aprox,false);
end;
$function$;

create or replace function public.seguros_custodia_desglose_agente(p_agente_id uuid)
returns table(total numeric, efectivo numeric, banco numeric)
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $$
  with t as (
    select public.seguros_acumulado_validado_agente(p_agente_id) as total
  ), e as (
    select
        coalesce((select sum(a.monto) from public.abonos a
                   where a.agente_cobro=p_agente_id::text
                     and a.metodo='Efectivo'
                     and coalesce(a.estado,'') <> 'Reversado'),0)
      + coalesce((select sum(x.monto) from public.transferencias_agentes x
                   where x.hacia_agente=p_agente_id::text and x.estado='aceptada' and x.metodo='Efectivo'),0)
      - coalesce((select sum(x.monto) from public.transferencias_agentes x
                   where x.desde_agente=p_agente_id::text and x.estado='aceptada' and x.metodo='Efectivo'),0)
      - coalesce((select sum(en.monto) from public.entregas_admin en
                   where en.agente_id=p_agente_id and en.es_directo=false and en.anulado=false
                     and en.metodo='Efectivo'),0)
      - coalesce((select sum(s.monto) from public.seguros_salidas_custodia s
                   where s.agente_id=p_agente_id and s.anulado=false and s.metodo='Efectivo'),0) as efectivo
  )
  select t.total, e.efectivo, t.total - e.efectivo from t, e;
$$;


-- ── Registrar una salida ──
create or replace function public.seguros_registrar_salida_custodia(
  p_monto numeric, p_motivo text, p_metodo text, p_banco text default null, p_referencia text default null,
  p_nota text default null, p_fecha_real date default null, p_comprobante_url text default null, p_idempotency_key text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_agente uuid; v_actor text; v_id uuid; v_total numeric; v_efectivo numeric; v_banco numeric;
begin
  if public.mi_rol() is distinct from 'admin'
     or public.mi_organizacion() is distinct from (select id from public.organizaciones where slug='nexus-pro') then
    raise exception 'Solo el administrador puede registrar una salida';
  end if;
  if p_monto is null or p_monto <= 0 then raise exception 'El monto debe ser mayor que cero'; end if;
  if p_motivo is null or p_motivo not in ('aseguradora','gasto','retiro','ajuste_inicial','deposito_banco') then
    raise exception 'Motivo inválido';
  end if;
  if p_metodo is null or p_metodo not in ('Efectivo','Banco') then raise exception 'Elija Efectivo o Banco'; end if;
  if p_motivo = 'deposito_banco' and p_metodo <> 'Efectivo' then
    raise exception 'El depósito al banco siempre sale del efectivo';
  end if;
  if p_motivo = 'ajuste_inicial' and coalesce(trim(p_nota),'') = '' then
    raise exception 'El ajuste inicial necesita una nota';
  end if;

  v_agente := public.mi_agente_efectivo();
  if v_agente is null or not exists (select 1 from public.agentes a where a.id=v_agente and lower(coalesce(a.cargo,''))='admin') then
    raise exception 'Su usuario no está vinculado al agente administrador';
  end if;

  perform public.transferencias_lock_agentes(v_agente);

  if p_idempotency_key is not null then
    select id into v_id from public.seguros_salidas_custodia where idempotency_key = p_idempotency_key;
    if v_id is not null then return jsonb_build_object('ok', true, 'id', v_id, 'reintento', true); end if;
  end if;

  select d.total, d.efectivo, d.banco into v_total, v_efectivo, v_banco
  from public.seguros_custodia_desglose_agente(v_agente) d;

  -- Nunca sacar más de lo que hay en la bolsa elegida (efectivo o banco).
  if p_metodo = 'Efectivo' and p_monto > coalesce(v_efectivo,0) then
    raise exception 'Solo hay RD$ % en efectivo', to_char(greatest(coalesce(v_efectivo,0),0), 'FM999,999,990.00');
  end if;
  if p_metodo = 'Banco' and p_monto > coalesce(v_banco,0) then
    raise exception 'Solo hay RD$ % en banco', to_char(greatest(coalesce(v_banco,0),0), 'FM999,999,990.00');
  end if;

  select coalesce(us.nom,'admin') into v_actor
  from public.usuarios_sistema us join public.profiles p on p.usuario_sistema_id=us.id
  where p.id=auth.uid();

  insert into public.seguros_salidas_custodia(agente_id, monto, motivo, metodo, banco, referencia, nota, fecha_real,
                                              comprobante_url, created_by, created_by_user_id, idempotency_key)
  values (v_agente, p_monto, p_motivo, p_metodo, nullif(trim(p_banco),''), nullif(trim(p_referencia),''), nullif(trim(p_nota),''),
          p_fecha_real, nullif(trim(p_comprobante_url),''), coalesce(v_actor,'admin'), auth.uid(), p_idempotency_key)
  returning id into v_id;

  insert into public.auditoria(usuario, rol, accion, detalle, modulo, entity_table, entity_id)
  values (coalesce(v_actor,'admin'), public.mi_rol(), 'SALIDA_CUSTODIA_REGISTRADA',
          p_motivo||' · '||p_metodo||' · RD$ '||p_monto, 'Seguros', 'seguros_salidas_custodia', v_id::text);

  return jsonb_build_object('ok', true, 'id', v_id, 'reintento', false,
                            'custodia', public.seguros_acumulado_validado_agente(v_agente));
end;
$function$;

-- ── Anular una salida (el dinero vuelve a la custodia) ──
create or replace function public.seguros_anular_salida_custodia(p_id uuid, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare v_row public.seguros_salidas_custodia; v_actor text;
begin
  if public.mi_rol() is distinct from 'admin'
     or public.mi_organizacion() is distinct from (select id from public.organizaciones where slug='nexus-pro') then
    raise exception 'Solo el administrador puede anular una salida';
  end if;
  if coalesce(trim(p_motivo),'') = '' then raise exception 'Escriba el motivo'; end if;

  select * into v_row from public.seguros_salidas_custodia where id = p_id;
  if v_row.id is null then raise exception 'La salida no existe'; end if;
  perform public.transferencias_lock_agentes(v_row.agente_id);
  select * into v_row from public.seguros_salidas_custodia where id = p_id;
  if v_row.anulado then return jsonb_build_object('ok', true, 'id', p_id, 'reintento', true); end if;

  select coalesce(us.nom,'admin') into v_actor
  from public.usuarios_sistema us join public.profiles p on p.usuario_sistema_id=us.id
  where p.id=auth.uid();

  update public.seguros_salidas_custodia
     set anulado = true, anulado_at = now(), anulado_por = coalesce(v_actor,'admin'), anulado_motivo = trim(p_motivo)
   where id = p_id and anulado = false;

  insert into public.auditoria(usuario, rol, accion, detalle, modulo, entity_table, entity_id)
  values (coalesce(v_actor,'admin'), public.mi_rol(), 'SALIDA_CUSTODIA_ANULADA',
          'RD$ '||v_row.monto||' · '||trim(p_motivo), 'Seguros', 'seguros_salidas_custodia', p_id::text);

  return jsonb_build_object('ok', true, 'id', p_id, 'reintento', false,
                            'custodia', public.seguros_acumulado_validado_agente(v_row.agente_id));
end;
$function$;

-- ── Salidas de un ciclo, por motivo (para el reporte) ──
create or replace function public.seguros_salidas_ciclo(p_periodo text)
returns table(agente_id uuid, agente text, motivo text, movimientos integer, total numeric)
language plpgsql
stable security definer
set search_path to 'public', 'pg_temp'
as $function$
declare v_inicio timestamptz; v_corte timestamptz;
begin
  if public.mi_rol() is distinct from 'admin'
     or public.mi_organizacion() is distinct from (select id from public.organizaciones where slug='nexus-pro') then
    raise exception 'Solo administrador';
  end if;
  select l.inicio, l.corte into v_inicio, v_corte from public.seguros_ciclo_limites(p_periodo) l;
  return query
  select s.agente_id, a.nom, s.motivo, count(*)::integer, sum(s.monto)
  from public.seguros_salidas_custodia s join public.agentes a on a.id = s.agente_id
  where s.created_at >= v_inicio and s.created_at < v_corte
    and (s.anulado_at is null or s.anulado_at >= v_corte)
  group by s.agente_id, a.nom, s.motivo
  order by a.nom, s.motivo;
end;
$function$;

revoke all on function public.seguros_registrar_salida_custodia(numeric,text,text,text,text,text,date,text,text) from public, anon;
revoke all on function public.seguros_anular_salida_custodia(uuid,text) from public, anon;
revoke all on function public.seguros_salidas_ciclo(text) from public, anon;
grant execute on function public.seguros_registrar_salida_custodia(numeric,text,text,text,text,text,date,text,text) to authenticated;
grant execute on function public.seguros_anular_salida_custodia(uuid,text) to authenticated;
grant execute on function public.seguros_salidas_ciclo(text) to authenticated;

-- La tabla solo se lee (y solo el administrador, por RLS). Se escribe únicamente con las funciones de arriba.
revoke all on table public.seguros_salidas_custodia from anon;
revoke insert, update, delete, truncate, references, trigger on table public.seguros_salidas_custodia from authenticated;
