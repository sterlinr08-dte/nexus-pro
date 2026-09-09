-- NEXUS PRO · Abrir/crear hilo de WhatsApp para un AGENTE
-- Permite que los selectores Cliente/Agente abran el destino dentro del Inbox corporativo
-- sin confundir un teléfono de agente con "número no vinculado a cliente".
-- El hilo del agente queda con cliente_id NULL y nombre_perfil = nombre del agente.
-- La regla de 24 h de Meta NO cambia: si el agente nunca escribió o pasaron más de 24 h,
-- el composer de texto libre sigue cerrado.

create or replace function public.whatsapp_hilo_por_agente(p_agente_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_org uuid;
  v_nom text;
  v_tel text;
  v_digits text;
  v_hilo_id uuid;
  v_cliente_id uuid;
begin
  if mi_rol() is null then
    raise exception 'no autorizado';
  end if;

  select id into v_org from public.organizaciones where slug = 'nexus-pro';
  if mi_organizacion() <> v_org then
    raise exception 'no autorizado';
  end if;

  select nom, tel into v_nom, v_tel
  from public.agentes
  where id = p_agente_id and coalesce(activo, true) = true;

  if v_tel is null or trim(v_tel) = '' then
    raise exception 'agente sin whatsapp registrado';
  end if;

  v_digits := regexp_replace(v_tel, '\D', '', 'g');
  if length(v_digits) = 10 then
    v_digits := '1' || v_digits;
  end if;
  if length(v_digits) < 11 then
    raise exception 'numero de whatsapp invalido';
  end if;

  select id, cliente_id into v_hilo_id, v_cliente_id
  from public.whatsapp_hilos
  where telefono_e164 = v_digits;

  if v_hilo_id is not null then
    -- No mezclar identidades: si ese mismo número ya está formalmente ligado a un cliente,
    -- dejamos que el flujo de cliente sea la única fuente de verdad para ese teléfono.
    if v_cliente_id is not null then
      raise exception 'numero ya vinculado a un cliente';
    end if;

    update public.whatsapp_hilos
      set nombre_perfil = coalesce(nullif(v_nom, ''), nombre_perfil, v_digits),
          updated_at = now()
    where id = v_hilo_id;
    return v_hilo_id;
  end if;

  insert into public.whatsapp_hilos (telefono_e164, cliente_id, nombre_perfil)
  values (v_digits, null, coalesce(nullif(v_nom, ''), v_digits))
  returning id into v_hilo_id;

  return v_hilo_id;
end;
$$;

revoke all on function public.whatsapp_hilo_por_agente(uuid) from public, anon;
grant execute on function public.whatsapp_hilo_por_agente(uuid) to authenticated;
