-- NEXUS PRO · WhatsApp · Marcar conversación como no leída
-- Acción del menú de chat. Mantiene RLS cerrada: no se concede UPDATE general a authenticated.

create or replace function public.whatsapp_marcar_hilo_no_leido(p_hilo_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if mi_rol() is null or mi_organizacion() <> (select id from public.organizaciones where slug = 'nexus-pro') then
    raise exception 'no autorizado';
  end if;

  update public.whatsapp_hilos
     set no_leidos_count = greatest(coalesce(no_leidos_count,0),1),
         updated_at = now()
   where id = p_hilo_id;
end;
$$;

revoke all on function public.whatsapp_marcar_hilo_no_leido(uuid) from public, anon;
grant execute on function public.whatsapp_marcar_hilo_no_leido(uuid) to authenticated;
