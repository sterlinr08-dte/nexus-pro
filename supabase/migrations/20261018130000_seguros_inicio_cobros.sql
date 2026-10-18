-- Cobros del Inicio en una sola consulta (18-oct-2026). Solo lectura.
-- Antes, rChartCobros() (index.html) bajaba TODOS los abonos (fecha, monto), sin orden ni filtro, al abrir el Inicio y
-- cada 30 s, para sumar en el teléfono la gráfica de 6 ciclos 20→20, el «Cobrado» del ciclo, el ciclo anterior al mismo
-- día, el calendario diario y «Hoy, en vivo». Con el tope de filas de PostgREST esa lista se recortaría en silencio.
-- Esta función devuelve lo mismo ya agrupado:
--   · dias: una fila por día de RD (UTC-4 fijo, igual que fechaRD) con la suma (t) y la cantidad de pagos (n);
--   · filas: los pagos sueltos de p_hoy y del día anterior (fecha con hora), que necesita «Hoy, en vivo».
-- Misma fuente de verdad (public.abonos) y mismas reglas que antes: todos los abonos, sin filtros nuevos. El teléfono
-- sigue haciendo los mismos cálculos de ciclo. SECURITY INVOKER: RLS de abonos se aplica igual que con la lectura directa.

create or replace function public.seguros_inicio_cobros(p_hoy date)
returns jsonb language sql stable security invoker set search_path = public
as $$
  with a as (
    select fecha, monto, ((fecha at time zone 'UTC') - interval '4 hours')::date as dia
    from public.abonos where fecha is not null
  )
  select jsonb_build_object(
    'dias', coalesce((select jsonb_agg(jsonb_build_object('d', dia, 't', t, 'n', n) order by dia)
                      from (select dia, sum(monto) as t, count(*) as n from a group by dia) g), '[]'::jsonb),
    'filas', coalesce((select jsonb_agg(jsonb_build_object('fecha', fecha, 'monto', monto) order by fecha)
                       from a where dia between p_hoy - 1 and p_hoy), '[]'::jsonb)
  );
$$;
revoke all on function public.seguros_inicio_cobros(date) from public, anon;
grant execute on function public.seguros_inicio_cobros(date) to authenticated;

-- Reversa:
-- drop function if exists public.seguros_inicio_cobros(date);
