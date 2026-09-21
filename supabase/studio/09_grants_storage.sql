-- STUDIO — 09 grants y storage
-- Grants estándar de Supabase para public + buckets/políticas de storage que existen en la base madre
-- para 'comprobantes' y 'documentos'.
--
-- FLAG: en la madre existe además la política storage.objects.whatsapp_inbox_media_lectura (bucket
-- whatsapp-inbox-media, filtra por slug 'nexus-pro'). Pertenece al módulo WhatsApp y NO se incluye.
-- Tampoco se incluyen los buckets 'respaldos' ni 'whatsapp-inbox-media'.

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

insert into storage.buckets (id, name, public)
values ('comprobantes','comprobantes',true), ('documentos','documentos',false)
on conflict do nothing;

-- Políticas storage.objects (pg_policies where schemaname='storage'), sólo las de estos dos buckets.
create policy nx_obj_delete on storage.objects as permissive for delete to authenticated using ((bucket_id = ANY (ARRAY['comprobantes'::text, 'documentos'::text])));
create policy nx_obj_insert on storage.objects as permissive for insert to authenticated with check ((bucket_id = ANY (ARRAY['comprobantes'::text, 'documentos'::text])));
create policy nx_obj_select on storage.objects as permissive for select to authenticated using ((bucket_id = ANY (ARRAY['comprobantes'::text, 'documentos'::text])));
create policy nx_obj_update on storage.objects as permissive for update to authenticated using ((bucket_id = ANY (ARRAY['comprobantes'::text, 'documentos'::text]))) with check ((bucket_id = ANY (ARRAY['comprobantes'::text, 'documentos'::text])));
