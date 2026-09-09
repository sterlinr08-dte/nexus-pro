-- NEXUS PRO · Vista previa segura antes de activar una regla inteligente.
create or replace function public.whatsapp_reglas_custom_previsualizar(p_trigger_tipo text,p_dias integer)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v_org uuid; v_total integer; v_muestra jsonb;
begin
  if mi_rol() <> 'admin' then raise exception 'no autorizado'; end if;
  select id into v_org from public.organizaciones where slug='nexus-pro';
  if mi_organizacion() <> v_org then raise exception 'no autorizado'; end if;
  with x as (select * from public.whatsapp_regla_candidatos(p_trigger_tipo,p_dias))
  select count(*) into v_total from x;
  with x as (select * from public.whatsapp_regla_candidatos(p_trigger_tipo,p_dias) limit 5)
  select coalesce(jsonb_agg(jsonb_build_object('cliente_id',x.cliente_id,'nombre',c.nom,'contexto',x.contexto)),'[]'::jsonb)
  into v_muestra from x left join public.clientes c on c.id=x.cliente_id;
  return jsonb_build_object('total',coalesce(v_total,0),'muestra',coalesce(v_muestra,'[]'::jsonb));
end;$$;
revoke all on function public.whatsapp_reglas_custom_previsualizar(text,integer) from public,anon;
grant execute on function public.whatsapp_reglas_custom_previsualizar(text,integer) to authenticated;
