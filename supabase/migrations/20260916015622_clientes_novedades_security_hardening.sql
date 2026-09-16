-- NEXUS PRO · hardening de funciones internas de Novedades.
-- Solo el wrapper validado queda disponible para usuarios autenticados.
revoke execute on function public.novedad_auto_upsert(uuid,text,text,text,text,text,jsonb) from public, anon, authenticated;
revoke execute on function public.novedad_auto_resolver(uuid,text,text) from public, anon, authenticated;
revoke execute on function public.novedades_sync_automaticas_core() from public, anon, authenticated;
revoke execute on function public.novedades_sync_automaticas() from public, anon;
grant execute on function public.novedades_sync_automaticas() to authenticated;
revoke execute on function public.cliente_novedades_touch() from public, anon, authenticated;
