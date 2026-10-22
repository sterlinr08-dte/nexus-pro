-- 59.56 — Bauche repetido «de manera smart» (dueño, 22-oct-2026). Complemento de 20261014120000_comprobantes_sin_repetir.
-- Caso que la huella exacta y el número no atrapan: otra captura del MISMO depósito (recortada, reenviada, con otro
-- tamaño) donde la IA no pudo leer el número. Se AVISA en ámbar («posible repetido, revise la foto») si otro comprobante
-- leído coincide en monto exacto + fecha + banco emisor Y además en la hora (±2 min) o en quién envía el dinero.
-- Solo monto+fecha+banco NO basta: en la revisión del 22-oct, cuotas iguales (RD$4,500) pagadas el mismo día por el mismo
-- banco daban hasta 6 «parecidos» por pago. NO bloquea. Solo lectura; no toca abonos ni comprobante_registrar.
-- Los pagos de antes de 59.25 no tienen lectura: entran aquí cuando se lean con la IA (paso aparte, con OK del dueño).
create or replace function public.comprobante_parecidos(
  p_monto numeric, p_fecha date, p_banco text default null, p_cuenta text default null, p_excluir_ref text default null,
  p_hora text default null, p_ordenante text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_banco text := nullif(split_part(btrim(regexp_replace(lower(coalesce(p_banco, '')),
                    '(banco|dominicano|del|de|s\.?a\.?|múltiple|multiple|\.)', ' ', 'g')), ' ', 1), '');
  v_hora int := case when p_hora ~ '^\d{1,2}:\d{2}' then split_part(p_hora, ':', 1)::int * 60 + substr(split_part(p_hora, ':', 2), 1, 2)::int end;
  v_ord text := nullif(regexp_replace(translate(lower(coalesce(p_ordenante, '')), 'áéíóúüñ', 'aeiouun'), '[^a-z]', '', 'g'), '');
  v_out jsonb;
begin
  perform public._pago_comprobante_permiso();
  if p_monto is null or p_monto <= 0 or p_fecha is null or (v_hora is null and v_ord is null) then return '[]'::jsonb; end if;
  with cand as (
    -- comprobantes ya leídos por la IA y vinculados a un pago vigente
    select a.id abono_id, pc.storage_ref comp
    from public.pago_comprobantes pc
    join public.abonos a on a.id = pc.abono_id
    where a.reversado_at is null and coalesce(a.estado, '') <> 'Reversado'
      and pc.ia_monto = p_monto and pc.ia_fecha between p_fecha - 1 and p_fecha + 1
      and (v_banco is null or pc.ia_banco is null or lower(pc.ia_banco) like '%' || v_banco || '%')
      and (p_cuenta is null or pc.ia_cuenta_destino is null or right(pc.ia_cuenta_destino, 4) = right(p_cuenta, 4))
      and pc.storage_ref is distinct from p_excluir_ref
      and ((v_hora is not null and (pc.ia_json->>'hora') ~ '^\d{1,2}:\d{2}'
            and abs(split_part(pc.ia_json->>'hora', ':', 1)::int * 60 + substr(split_part(pc.ia_json->>'hora', ':', 2), 1, 2)::int - v_hora) <= 2)
        or (v_ord is not null and length(v_ord) >= 6
            and regexp_replace(translate(lower(coalesce(pc.ia_json->>'ordenante', '')), 'áéíóúüñ', 'aeiouun'), '[^a-z]', '', 'g') = v_ord))
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'tipo', 'parecido', 'abono_id', a.id, 'comprobante', c.comp,
           'cliente', cl.nom, 'monto', a.monto, 'fecha', a.fecha, 'agente', a.agente_cobro, 'metodo', a.metodo, 'banco', a.banco)
           order by a.fecha desc), '[]'::jsonb)
    into v_out
  from (select distinct on (abono_id) * from cand limit 10) c
  join public.abonos a on a.id = c.abono_id
  left join public.clientes cl on cl.id = a.cliente_id;
  return v_out;
end $$;

revoke all on function public.comprobante_parecidos(numeric, date, text, text, text, text, text) from public, anon;
grant execute on function public.comprobante_parecidos(numeric, date, text, text, text, text, text) to authenticated;
