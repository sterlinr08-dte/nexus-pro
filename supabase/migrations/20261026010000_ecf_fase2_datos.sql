-- e-CF con MSeller — fase 2: datos (dueño, 26-oct-2026: «Sí, empieza»). Ver docs/planes/2026-10-26-ecf-mseller.md.
-- Solo AGREGA: columnas nuevas (vacías) en pos_ventas, una regla para las secuencias e-NCF y una RPC nueva. No toca
-- pos_siguiente_ncf (B01/B02… en uso) ni ningún dato existente.

-- 1) Lo que se guarda de cada factura electrónica. El e-NCF va en la columna ncf de siempre (índice único por organización).
alter table public.pos_ventas
  add column if not exists comprador_rnc text,
  add column if not exists comprador_razon_social text,
  add column if not exists ecf_tipo smallint,
  add column if not exists ecf_entorno text,
  add column if not exists ecf_estado text,
  add column if not exists ecf_security_code text,
  add column if not exists ecf_qr_url text,
  add column if not exists ecf_track_id text,
  add column if not exists ecf_firmado text,
  add column if not exists ecf_enviado_at timestamptz,
  add column if not exists ecf_actualizado_at timestamptz,
  add column if not exists ecf_respuesta jsonb;

-- RNC (9 dígitos) o cédula (11), sin guiones. Estados: los de MSeller + «pendiente» (aún no enviado).
alter table public.pos_ventas drop constraint if exists pos_ventas_comprador_rnc_fmt;
alter table public.pos_ventas add constraint pos_ventas_comprador_rnc_fmt check (comprador_rnc is null or comprador_rnc ~ '^([0-9]{9}|[0-9]{11})$');
alter table public.pos_ventas drop constraint if exists pos_ventas_ecf_estado_chk;
alter table public.pos_ventas add constraint pos_ventas_ecf_estado_chk check (ecf_estado is null or ecf_estado in
  ('pendiente','En Cola','Enviado a la DGII','En Proceso','Aceptado','Aceptado Condicional','Rechazado','No encontrado','Error'));
alter table public.pos_ventas drop constraint if exists pos_ventas_ecf_entorno_chk;
alter table public.pos_ventas add constraint pos_ventas_ecf_entorno_chk check (ecf_entorno is null or ecf_entorno in ('TesteCF','CerteCF','eCF'));
create index if not exists idx_pos_ventas_ecf_pendientes on public.pos_ventas (organizacion_id, ecf_enviado_at)
  where ecf_estado in ('pendiente','En Cola','Enviado a la DGII','En Proceso');

-- 2) Secuencias e-NCF en la misma tabla: tipo E31, E32, E34… con prefijo igual al tipo y hasta 10 dígitos.
alter table public.pos_ncf_secuencias drop constraint if exists pos_ncf_secuencias_encf_chk;
alter table public.pos_ncf_secuencias add constraint pos_ncf_secuencias_encf_chk check (
  tipo !~ '^E' or (tipo ~ '^E(31|32|33|34|41|43|44|45|46|47)$' and prefijo = tipo and hasta <= 9999999999 and desde >= 1));

-- 3) Siguiente e-NCF, apartado atómico (mismo candado que pos_siguiente_ncf: UPDATE…RETURNING bloquea la fila).
--    E + tipo (2) + 10 dígitos = 13 caracteres. Sin secuencia vigente con números por delante → null (no se inventa).
create or replace function public.pos_siguiente_encf(p_tipo text)
returns text
language plpgsql security definer set search_path to 'public'
as $$
declare v_org uuid; v_pref text; v_num bigint;
begin
  if p_tipo is null or p_tipo !~ '^E(31|32|33|34|41|43|44|45|46|47)$' then
    raise exception 'Tipo de e-CF inválido: %', p_tipo using errcode = '22023';
  end if;
  v_org := mi_organizacion();
  if v_org is null then return null; end if;
  update pos_ncf_secuencias
     set actual = coalesce(actual, desde, 1) + 1
   where tipo = p_tipo and organizacion_id = v_org and activo is true
     and coalesce(actual, desde, 1) <= coalesce(hasta, 0)
     and (vencimiento is null or vencimiento >= current_date)
   returning prefijo, actual - 1 into v_pref, v_num;
  if v_num is null then return null; end if;
  return v_pref || lpad(v_num::text, 10, '0');
end $$;

revoke all on function public.pos_siguiente_encf(text) from public, anon;
grant execute on function public.pos_siguiente_encf(text) to authenticated;
