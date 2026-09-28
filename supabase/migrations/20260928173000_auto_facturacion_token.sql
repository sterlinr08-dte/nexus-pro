-- auto-facturacion exige x-cron-token (28-sep-2026). Ver bitácora del día.
insert into public.cron_secretos (nombre, valor)
select 'auto_facturacion', encode(extensions.gen_random_bytes(24), 'hex')
where not exists (select 1 from public.cron_secretos where nombre = 'auto_facturacion');

create or replace function public.run_auto_facturacion()
returns void language plpgsql security definer set search_path to 'public', 'extensions'
as $function$
begin
  perform net.http_post(
    url := 'https://tnwsgcxurfyuszxsewsn.supabase.co/functions/v1/auto-facturacion',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-cron-token', (select valor from public.cron_secretos where nombre = 'auto_facturacion')),
    body := '{}'::jsonb);
end;
$function$;
revoke all on function public.run_auto_facturacion() from public, anon, authenticated;
