-- NEXUS PRO · Abrir/crear el hilo de WhatsApp de un cliente desde su ficha
-- Hoy los hilos (whatsapp_hilos) solo se crean reactivamente cuando llega un mensaje entrante por
-- el webhook. Este RPC permite abrir la conversación de un cliente DESDE la ficha aunque todavía
-- no exista un hilo -- lo crea vacío (sin mensajes, ultimo_inbound_at null) para que el Buzón lo
-- muestre y el agente pueda mandarle una plantilla que reabra la conversación (la ventana de texto
-- libre de Meta sigue cerrada hasta que el cliente escriba primero, eso no cambia).
--
-- Normaliza el teléfono EXACTO igual que whatsapp-webhook/index.ts (normalizarTelefono) y
-- whatsapp-notificar/index.ts (formatearTelefono): si son 10 dígitos les antepone '1' (código de
-- país RD/NANP). Usar la misma regla acá es lo que garantiza que, si el cliente después escribe de
-- verdad, el webhook encuentre y reuse ESTE MISMO hilo por telefono_e164 en vez de crear uno
-- duplicado.

create or replace function public.whatsapp_hilo_por_cliente(p_cliente_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_org uuid;
  v_wa text;
  v_digits text;
  v_hilo_id uuid;
begin
  if mi_rol() is null then
    raise exception 'no autorizado';
  end if;
  select id into v_org from public.organizaciones where slug = 'nexus-pro';
  if mi_organizacion() <> v_org then
    raise exception 'no autorizado';
  end if;

  select wa into v_wa from public.clientes where id = p_cliente_id;
  if v_wa is null or trim(v_wa) = '' then
    raise exception 'cliente sin whatsapp registrado';
  end if;

  v_digits := regexp_replace(v_wa, '\D', '', 'g');
  if length(v_digits) = 10 then
    v_digits := '1' || v_digits;
  end if;
  if length(v_digits) < 11 then
    raise exception 'numero de whatsapp invalido';
  end if;

  select id into v_hilo_id from public.whatsapp_hilos where telefono_e164 = v_digits;
  if v_hilo_id is not null then
    -- Si el hilo ya existia (llego un mensaje antes de que este numero se cargara en la ficha)
    -- pero todavia no estaba vinculado a ningun cliente, lo vincula ahora -- nunca pisa un
    -- cliente_id ya distinto (podria ser un numero que cambio de dueño).
    update public.whatsapp_hilos set cliente_id = p_cliente_id, updated_at = now()
      where id = v_hilo_id and cliente_id is null;
    return v_hilo_id;
  end if;

  insert into public.whatsapp_hilos (telefono_e164, cliente_id)
  values (v_digits, p_cliente_id)
  returning id into v_hilo_id;

  return v_hilo_id;
end;
$$;

revoke all on function public.whatsapp_hilo_por_cliente(uuid) from public, anon;
grant execute on function public.whatsapp_hilo_por_cliente(uuid) to authenticated;
