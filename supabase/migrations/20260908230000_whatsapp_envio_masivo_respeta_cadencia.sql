-- NEXUS PRO · El envío masivo de tipo "pago" (Recordar deuda) respeta la MISMA cadencia que ya
-- usa el aviso automático de atraso (whatsapp_detectar_atrasados/dias_entre_avisos_atraso) y el
-- botón manual (whatsapp_recordatorio_manual, migración 20260908220000).
--
-- Hallazgo de la auditoría del Reglamento §12 (REGLAMENTOS.md): hasta hoy los 3 caminos que le
-- avisan a un cliente sobre su deuda (cron automático, botón manual del Buzón, este envío masivo)
-- eran completamente independientes -- un cliente podía recibir 3 plantillas de deuda distintas
-- el mismo día sin que ningún camino se enterara de los otros 2. clientes.ultimo_aviso_atraso_en
-- pasa a ser la marca de tiempo COMPARTIDA por los 3 caminos:
--   - cron automático: ya la respeta y la actualiza (sin cambios).
--   - botón manual (Buzón): la sigue actualizando vía whatsapp_notificar_evento -> whatsapp-
--     notificar -> marcarClienteAvisadoAtraso -- sigue pudiendo saltarse la cadencia a propósito
--     (es una decisión puntual del agente sobre UN cliente que tiene abierto en pantalla, no un
--     envío a ciegas) pero ahora SÍ cuenta para bloquear al envío masivo de abajo.
--   - envío masivo tipo "pago": esta migración lo hace RESPETAR la cadencia por primera vez -- un
--     cliente con un aviso de deuda (por cualquier camino) más reciente que dias_entre_avisos_
--     atraso días queda excluido del lote, marcado 'fallido' con el motivo, en vez de recibir un
--     4to/5to mensaje de deuda sin que nadie se diera cuenta. La actualización de
--     ultimo_aviso_atraso_en tras un envío EXITOSO de este tipo la hace la Edge Function
--     (supabase/functions/whatsapp-envio-masivo/index.ts), no esta migración.

create or replace function public.whatsapp_crear_lote_envio_masivo(p_tipo text, p_cliente_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_org uuid;
  v_lote_id uuid;
  v_dias_cadencia int;
begin
  if mi_rol() is null then
    raise exception 'no autorizado';
  end if;
  select id into v_org from public.organizaciones where slug = 'nexus-pro';
  if mi_organizacion() <> v_org then
    raise exception 'no autorizado';
  end if;
  if p_tipo not in ('factura', 'pago', 'vence') then
    raise exception 'tipo invalido: %', p_tipo;
  end if;
  if p_cliente_ids is null or array_length(p_cliente_ids, 1) is null then
    raise exception 'sin destinatarios';
  end if;

  select coalesce(dias_entre_avisos_atraso, 3) into v_dias_cadencia
  from public.whatsapp_config where activo = true limit 1;
  if v_dias_cadencia is null or v_dias_cadencia < 1 then
    v_dias_cadencia := 3;
  end if;

  insert into public.whatsapp_envio_masivo_lotes (organizacion_id, tipo, creado_por_usuario_id)
  values (v_org, p_tipo, auth.uid())
  returning id into v_lote_id;

  -- Elegibles: activos, con WhatsApp, y (si el tipo es "pago") sin un aviso de deuda reciente por
  -- NINGÚN camino -- mismo campo/cadencia que el cron y el botón manual.
  insert into public.whatsapp_envio_masivo_destinatarios (lote_id, cliente_id)
  select v_lote_id, c.id
  from public.clientes c
  where c.id = any(p_cliente_ids) and c.activo and c.wa is not null and c.wa <> ''
    and (
      p_tipo <> 'pago'
      or c.ultimo_aviso_atraso_en is null
      or now() >= c.ultimo_aviso_atraso_en + make_interval(days => v_dias_cadencia)
    )
  on conflict (lote_id, cliente_id) do nothing;

  -- Los excluidos SOLO por la cadencia (tipo="pago", ya avisados hace poco) quedan igual en el
  -- lote pero marcados 'fallido' con el motivo -- así el agente ve en el resultado final CUÁNTOS
  -- se omitieron y por qué, en vez de que el conteo total simplemente sea más chico sin explicación.
  if p_tipo = 'pago' then
    insert into public.whatsapp_envio_masivo_destinatarios (lote_id, cliente_id, estado, error_detalle, enviado_at)
    select v_lote_id, c.id, 'fallido', 'ya se le avisó de su deuda hace menos de ' || v_dias_cadencia || ' día(s) (cron automático, botón manual o otro envío masivo)', now()
    from public.clientes c
    where c.id = any(p_cliente_ids) and c.activo and c.wa is not null and c.wa <> ''
      and c.ultimo_aviso_atraso_en is not null
      and now() < c.ultimo_aviso_atraso_en + make_interval(days => v_dias_cadencia)
    on conflict (lote_id, cliente_id) do nothing;
  end if;

  update public.whatsapp_envio_masivo_lotes
    set total_destinatarios = (
      select count(*) from public.whatsapp_envio_masivo_destinatarios where lote_id = v_lote_id
    )
    where id = v_lote_id;

  return v_lote_id;
end;
$$;

revoke all on function public.whatsapp_crear_lote_envio_masivo(text, uuid[]) from public, anon;
grant execute on function public.whatsapp_crear_lote_envio_masivo(text, uuid[]) to authenticated;
