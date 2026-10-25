-- 59.58 — Cobro rápido con el bauche (dueño, 25-oct-2026: «vamos a usar la IA de los bauches smart para agilizar el
-- proceso de cobro»; eligió «leer apenas llegan» y «poner el monto del bauche y avisar»).
-- Solo agrega: columnas nuevas (nulas) en whatsapp_hilo_mensajes y una RPC de solo lectura. No toca datos existentes.

-- 1) Lo que leyó la IA de una foto que mandó un cliente por WhatsApp (lo llena la Edge `bauche-auto-leer`).
alter table public.whatsapp_hilo_mensajes
  add column if not exists bauche_ia jsonb,
  add column if not exists bauche_sha256 text,
  add column if not exists bauche_leido_at timestamptz;

comment on column public.whatsapp_hilo_mensajes.bauche_ia is
  'Lectura de la IA (banco, monto, fecha, número, cuenta y titular de destino…) de una foto entrante; la llena bauche-auto-leer. Solo ayuda a llenar el cobro: el pago siempre lo registra una persona.';

-- 2) Cuenta de destino sugerida: a qué cuenta (agente) se asignaron antes los pagos cuyo bauche decía esa misma
--    cuenta (últimos 4 dígitos). Sale del historial real (pago_comprobantes + entregas_admin directas no anuladas).
create or replace function public.comprobante_cuenta_sugerida(p_cuenta text)
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $$
declare v jsonb; v_cta text := right(regexp_replace(coalesce(p_cuenta, ''), '\D', '', 'g'), 4);
begin
  perform public._pago_comprobante_permiso();
  if length(v_cta) < 4 then return null; end if;
  select jsonb_build_object('agente_id', e.agente_id, 'nombre', ag.nom, 'veces', count(*))
    into v
    from public.pago_comprobantes pc
    join public.entregas_admin e on e.abono_id = pc.abono_id and e.es_directo and not coalesce(e.anulado, false)
    join public.agentes ag on ag.id = e.agente_id and coalesce(ag.activo, true)
   where right(regexp_replace(coalesce(pc.ia_cuenta_destino, ''), '\D', '', 'g'), 4) = v_cta
   group by e.agente_id, ag.nom
   order by count(*) desc
   limit 1;
  return v;
end $$;

revoke all on function public.comprobante_cuenta_sugerida(text) from public, anon;
grant execute on function public.comprobante_cuenta_sugerida(text) to authenticated;
