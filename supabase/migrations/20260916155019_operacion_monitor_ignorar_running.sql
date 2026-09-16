-- NEXUS PRO · monitor de automatizaciones
-- Corrige falso positivo: una ejecución con estado running no es un fallo.
-- La salud se calcula con la última ejecución terminal.

create or replace function public.operacion_monitorear_automatizaciones()
returns integer
language plpgsql
security definer
set search_path=public,cron
as $$
declare
  rec_job record;
  rec_run record;
  rec_cat record;
  rec_prev record;
  v_salud text;
  v_fallos integer;
  v_count integer:=0;
  v_alertar boolean;
begin
  for rec_job in select jobid,jobname,schedule,active from cron.job loop
    select runid,status,return_message,start_time,end_time into rec_run
      from cron.job_run_details
      where jobid=rec_job.jobid and status is distinct from 'running'
      order by start_time desc nulls last,runid desc
      limit 1;

    select objetivo,meta,max_minutos_sin_ejecucion,criticidad into rec_cat
      from public.operacion_automatizaciones_catalogo where jobname=rec_job.jobname;

    select ultimo_runid,fallos_consecutivos,ultima_alerta_runid,ultima_alerta_at into rec_prev
      from public.operacion_automatizaciones_estado where jobid=rec_job.jobid;

    if not rec_job.active then
      v_salud:='inactiva';
    elsif rec_run.runid is null then
      v_salud:='sin_ejecucion';
    elsif rec_run.status<>'succeeded' then
      v_salud:='error';
    elsif rec_cat.max_minutos_sin_ejecucion is not null
      and coalesce(rec_run.end_time,rec_run.start_time) < now()-(rec_cat.max_minutos_sin_ejecucion||' minutes')::interval then
      v_salud:='atrasada';
    else
      v_salud:='ok';
    end if;

    if rec_run.runid is distinct from rec_prev.ultimo_runid then
      v_fallos:=case
        when rec_run.status='succeeded' then 0
        when rec_run.runid is null then coalesce(rec_prev.fallos_consecutivos,0)
        else coalesce(rec_prev.fallos_consecutivos,0)+1
      end;
    else
      v_fallos:=coalesce(rec_prev.fallos_consecutivos,0);
    end if;

    v_alertar:=v_salud in ('error','atrasada')
      and (rec_prev.ultima_alerta_at is null
           or rec_prev.ultima_alerta_at<now()-interval '60 minutes'
           or rec_run.runid is distinct from rec_prev.ultima_alerta_runid);

    insert into public.operacion_automatizaciones_estado(
      jobid,jobname,schedule,active,objetivo,meta,criticidad,
      ultimo_runid,ultimo_estado,ultimo_inicio,ultimo_fin,ultimo_mensaje,
      salud,fallos_consecutivos,ultima_alerta_runid,ultima_alerta_at,updated_at)
    values(
      rec_job.jobid,rec_job.jobname,rec_job.schedule,rec_job.active,
      rec_cat.objetivo,rec_cat.meta,coalesce(rec_cat.criticidad,'media'),
      rec_run.runid,rec_run.status,rec_run.start_time,rec_run.end_time,left(rec_run.return_message,1000),
      v_salud,v_fallos,
      case when v_alertar then rec_run.runid else rec_prev.ultima_alerta_runid end,
      case when v_alertar then now() else rec_prev.ultima_alerta_at end,
      now())
    on conflict (jobid) do update set
      jobname=excluded.jobname,schedule=excluded.schedule,active=excluded.active,
      objetivo=excluded.objetivo,meta=excluded.meta,criticidad=excluded.criticidad,
      ultimo_runid=excluded.ultimo_runid,ultimo_estado=excluded.ultimo_estado,
      ultimo_inicio=excluded.ultimo_inicio,ultimo_fin=excluded.ultimo_fin,
      ultimo_mensaje=excluded.ultimo_mensaje,salud=excluded.salud,
      fallos_consecutivos=excluded.fallos_consecutivos,
      ultima_alerta_runid=excluded.ultima_alerta_runid,
      ultima_alerta_at=excluded.ultima_alerta_at,updated_at=now();

    if v_alertar then
      insert into public.auto_notificaciones_log(tipo,titulo,mensaje,estado,detalle)
      values(
        'AUTOMATIZACION_FALLO',
        'Automatización requiere atención: '||rec_job.jobname,
        case when v_salud='atrasada'
          then 'No registra una ejecución exitosa dentro de la meta definida.'
          else 'La última ejecución terminó con estado '||coalesce(rec_run.status,'desconocido')||'.'
        end,
        'error',
        jsonb_build_object('jobid',rec_job.jobid,'jobname',rec_job.jobname,'runid',rec_run.runid,'salud',v_salud,'return_message',left(rec_run.return_message,1000)));
    end if;

    v_count:=v_count+1;
  end loop;

  delete from public.operacion_automatizaciones_estado e
  where not exists(select 1 from cron.job cj where cj.jobid=e.jobid);
  return v_count;
end;
$$;

revoke all on function public.operacion_monitorear_automatizaciones() from public,anon,authenticated;
