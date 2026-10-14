-- 59.25 — Un comprobante de pago («bauche») no se puede usar dos veces (dueño, 14-oct-2026).
-- Auditoría previa (bitácora 2026-10-14-0500-claude.md): nada en NEXUS comparaba comprobantes; el número de
-- referencia escrito a mano no sirve (p. ej. «242248068435» está en 65 pagos de 48 clientes). La protección sale
-- de la foto misma:
--   1) huella exacta (SHA-256 del archivo),
--   2) número de transacción leído por IA (Edge «comprobante-leer»): atrapa capturas nuevas o reenviadas del mismo pago.
--   (La huella visual dHash se guarda como dato, pero NO bloquea: en la revisión de los 131 comprobantes viejos, recibos
--    distintos del mismo banco salen casi iguales —796 pares «parecidos»—, así que daría bloqueos falsos.)
-- Un mismo depósito SÍ puede pagar a varios clientes (la revisión encontró, p. ej., una transferencia de RD$27,000 usada
-- en 5 pagos): se permite mientras la suma de los pagos no pase del monto del comprobante. Si pasa, o no se sabe el monto,
-- se BLOQUEA; solo un administrador puede aprobarlo escribiendo el motivo (decisión «B» del dueño).
-- No toca abonos ni la lógica de cobro: el comprobante se registra (con su verificación) ANTES de guardar el pago
-- y se vincula al pago después. Solo cuentan como «usados» los comprobantes vinculados a un pago no reversado.

create table if not exists public.pago_comprobantes (
  id                 uuid primary key default gen_random_uuid(),
  abono_id           uuid null references public.abonos(id) on delete set null,
  storage_ref        text not null,            -- URL pública del bucket comprobantes o «wa-media:<ruta>»
  sha256             text null check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  dhash              text null check (dhash is null or dhash ~ '^[0-9a-f]{16}$'),
  ia_banco           text null,
  ia_monto           numeric null,
  ia_fecha           date null,
  ia_numero          text null,
  ia_numero_norm     text null,
  ia_cuenta_destino  text null,
  ia_confianza       numeric null,
  ia_modelo          text null,
  ia_json            jsonb null,              -- lo que devolvió la IA, para entrenar luego el lector gratis
  coincidencias      jsonb not null default '[]'::jsonb,
  compartido         boolean not null default false,  -- mismo depósito para varios pagos, dentro de su monto
  aprobado_duplicado boolean not null default false,
  aprobado_motivo    text null,
  aprobado_por       text null,
  created_at         timestamptz not null default now(),
  created_by_uid     uuid null default auth.uid(),
  created_by_name    text null
);
create index if not exists pago_comprobantes_sha_idx   on public.pago_comprobantes (sha256)          where sha256 is not null;
create index if not exists pago_comprobantes_num_idx   on public.pago_comprobantes (ia_numero_norm)  where ia_numero_norm is not null;
create index if not exists pago_comprobantes_abono_idx on public.pago_comprobantes (abono_id);
create index if not exists pago_comprobantes_ref_idx   on public.pago_comprobantes (storage_ref);

alter table public.pago_comprobantes enable row level security;
drop policy if exists pago_comprobantes_leer on public.pago_comprobantes;
create policy pago_comprobantes_leer on public.pago_comprobantes for select to authenticated
  using (public.mi_rol() is not null and public.mi_organizacion() = (select id from public.organizaciones where slug = 'nexus-pro'));
revoke insert, update, delete on public.pago_comprobantes from authenticated, anon;
grant select on public.pago_comprobantes to authenticated;

-- Número de transacción normalizado. Si trae 5 dígitos o más, cuentan solo los dígitos (sin ceros a la izquierda):
-- «TRF-0012345», «12345» y «000 12-345» son el mismo número. Si no, letras y dígitos en mayúsculas.
create or replace function public.pago_comprobante_norm(p text)
returns text language sql immutable as $$
  select case when length(regexp_replace(coalesce(p,''), '\D', '', 'g')) >= 5
              then nullif(ltrim(regexp_replace(coalesce(p,''), '\D', '', 'g'), '0'), '')
              else nullif(upper(regexp_replace(coalesce(p,''), '[^A-Za-z0-9]', '', 'g')), '') end
$$;

-- Distancia de Hamming entre dos dHash hexadecimales de 64 bits.
create or replace function public.pago_comprobante_dist(a text, b text)
returns int language sql immutable as $$
  select case when a ~ '^[0-9a-f]{16}$' and b ~ '^[0-9a-f]{16}$'
    then bit_count(('x' || a)::bit(64) # ('x' || b)::bit(64))::int end
$$;

create or replace function public._pago_comprobante_permiso()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if public.mi_rol() is null
     or public.mi_organizacion() is distinct from (select id from public.organizaciones where slug = 'nexus-pro') then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
end $$;

-- ¿Ya se usó este comprobante? Devuelve las coincidencias con pagos vigentes (no reversados).
create or replace function public.comprobante_buscar(
  p_sha256 text default null, p_dhash text default null, p_numero text default null, p_storage_ref text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_num text := public.pago_comprobante_norm(p_numero);
  v_out jsonb;
begin
  perform public._pago_comprobante_permiso();
  if v_num is not null and length(v_num) < 5 then v_num := null; end if;  -- números muy cortos no identifican nada
  with cand as (
    -- comprobantes ya registrados y vinculados a un pago vigente
    select a.id abono_id,
           case when p_sha256 is not null and pc.sha256 = p_sha256 then 'misma_foto'
                when p_storage_ref is not null and pc.storage_ref = p_storage_ref then 'misma_foto'
                when v_num is not null and pc.ia_numero_norm = v_num then 'mismo_numero' end tipo,
           pc.ia_monto tope,
           pc.storage_ref
    from public.pago_comprobantes pc
    join public.abonos a on a.id = pc.abono_id
    where a.reversado_at is null and coalesce(a.estado, '') <> 'Reversado'
      and ((p_sha256 is not null and pc.sha256 = p_sha256)
        or (p_storage_ref is not null and pc.storage_ref = p_storage_ref)
        or (v_num is not null and pc.ia_numero_norm = v_num))
    union all
    -- cualquier pago (también los de antes de esta versión): mismo archivo guardado, o la referencia escrita igual al
    -- número real leído por la IA. Si un pago sale por las dos vías, se queda una sola fila (distinct on abono_id).
    select a.id,
           case when p_storage_ref is not null and a.comprobante_url = p_storage_ref then 'misma_foto' else 'mismo_numero' end,
           null::numeric, a.comprobante_url
    from public.abonos a
    where a.reversado_at is null and coalesce(a.estado, '') <> 'Reversado'
      and ((p_storage_ref is not null and a.comprobante_url = p_storage_ref)
        or (v_num is not null and length(v_num) >= 6 and coalesce(a.metodo, '') <> 'Efectivo'
            and public.pago_comprobante_norm(a.referencia) = v_num))
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'tipo', c.tipo, 'abono_id', c.abono_id, 'tope', c.tope, 'comprobante', c.storage_ref,
           'cliente', cl.nom, 'monto', a.monto, 'fecha', a.fecha, 'agente', a.agente_cobro, 'metodo', a.metodo, 'banco', a.banco)
           order by case c.tipo when 'misma_foto' then 0 else 1 end, a.fecha desc), '[]'::jsonb)
    into v_out
  from (select distinct on (abono_id) * from cand where tipo is not null
        order by abono_id, case tipo when 'misma_foto' then 0 else 1 end, tope desc nulls last) c
  join public.abonos a on a.id = c.abono_id
  left join public.clientes cl on cl.id = a.cliente_id;
  return v_out;
end $$;

-- Registrar el comprobante ANTES de guardar el pago. Si ya se usó: error, salvo administrador con motivo.
create or replace function public.comprobante_registrar(
  p_storage_ref text, p_sha256 text default null, p_dhash text default null,
  p_ia jsonb default null, p_motivo text default null, p_nombre text default null, p_monto numeric default null)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare
  v_coinc jsonb;
  v_id uuid;
  v_usado numeric;
  v_tope numeric;
  v_compartido boolean := false;
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
  v_num text := nullif(btrim(coalesce(p_ia->>'numero', '')), '');
begin
  perform public._pago_comprobante_permiso();
  if coalesce(btrim(p_storage_ref), '') = '' then raise exception 'Falta el comprobante'; end if;
  v_coinc := public.comprobante_buscar(p_sha256, p_dhash, v_num, p_storage_ref);
  if jsonb_array_length(v_coinc) > 0 then
    -- ¿Mismo depósito para varios pagos? Se permite si la suma no pasa del monto del comprobante (+1 peso de redondeo).
    select coalesce(sum((x->>'monto')::numeric), 0), max(nullif(x->>'tope', '')::numeric) into v_usado, v_tope
      from jsonb_array_elements(v_coinc) x;
    v_tope := coalesce(nullif(p_ia->>'monto', '')::numeric, v_tope);
    if v_tope is not null and p_monto is not null and p_monto > 0 and v_usado + p_monto <= v_tope + 1 then
      v_compartido := true;
    end if;
  end if;
  if jsonb_array_length(v_coinc) > 0 and not v_compartido then
    if v_motivo is null then
      raise exception 'COMPROBANTE_DUPLICADO' using detail = v_coinc::text, errcode = 'P0001';
    end if;
    if public.mi_rol() is distinct from 'admin' then
      raise exception 'COMPROBANTE_DUPLICADO_SOLO_ADMIN' using detail = v_coinc::text, errcode = 'P0001';
    end if;
  end if;
  insert into public.pago_comprobantes (storage_ref, sha256, dhash, ia_banco, ia_monto, ia_fecha, ia_numero, ia_numero_norm,
         ia_cuenta_destino, ia_confianza, ia_modelo, ia_json, coincidencias, compartido, aprobado_duplicado, aprobado_motivo, aprobado_por, created_by_name)
  values (p_storage_ref, p_sha256, p_dhash,
          nullif(p_ia->>'banco', ''), nullif(p_ia->>'monto', '')::numeric,
          case when (p_ia->>'fecha') ~ '^\d{4}-\d{2}-\d{2}$' then (p_ia->>'fecha')::date end,
          v_num, public.pago_comprobante_norm(v_num), nullif(p_ia->>'cuenta_destino', ''),
          nullif(p_ia->>'confianza', '')::numeric, nullif(p_ia->>'modelo', ''), p_ia,
          v_coinc, v_compartido, jsonb_array_length(v_coinc) > 0 and not v_compartido,
          case when jsonb_array_length(v_coinc) > 0 and not v_compartido then v_motivo end,
          case when jsonb_array_length(v_coinc) > 0 and not v_compartido then coalesce(p_nombre, auth.uid()::text) end, p_nombre)
  returning id into v_id;
  return v_id;
end $$;

-- Vincular el comprobante ya registrado al pago que se acaba de guardar (una sola vez, y solo quien lo registró).
create or replace function public.comprobante_vincular(p_id uuid, p_abono_id uuid)
returns boolean language plpgsql volatile security definer set search_path = public as $$
declare v_n int;
begin
  perform public._pago_comprobante_permiso();
  update public.pago_comprobantes set abono_id = p_abono_id
   where id = p_id and abono_id is null and created_by_uid is not distinct from auth.uid()
     and exists (select 1 from public.abonos a where a.id = p_abono_id);
  get diagnostics v_n = row_count;
  return v_n = 1;
end $$;

revoke all on function public.comprobante_buscar(text, text, text, text) from public, anon;
revoke all on function public.comprobante_registrar(text, text, text, jsonb, text, text, numeric) from public, anon;
revoke all on function public.comprobante_vincular(uuid, uuid) from public, anon;
revoke all on function public._pago_comprobante_permiso() from public, anon;
grant execute on function public.comprobante_buscar(text, text, text, text) to authenticated;
grant execute on function public.comprobante_registrar(text, text, text, jsonb, text, text, numeric) to authenticated;
grant execute on function public.comprobante_vincular(uuid, uuid) to authenticated;
grant execute on function public.pago_comprobante_norm(text) to authenticated;
grant execute on function public.pago_comprobante_dist(text, text) to authenticated;
