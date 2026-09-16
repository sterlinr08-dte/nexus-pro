-- NEXUS PRO · monitor central de automatizaciones
create table if not exists public.operacion_automatizaciones_catalogo (
  jobname text primary key, objetivo text not null, meta text not null,
  max_minutos_sin_ejecucion integer not null check (max_minutos_sin_ejecucion>0),
  criticidad text not null default 'media' check (criticidad in ('baja','media','alta','critica')),
  updated_at timestamptz not null default now()
);
create table if not exists public.operacion_automatizaciones_estado (
  jobid bigint primary key, jobname text not null unique, schedule text, active boolean not null default true,
  objetivo text, meta text, criticidad text, ultimo_runid bigint, ultimo_estado text, ultimo_inicio timestamptz,
  ultimo_fin timestamptz, ultimo_mensaje text,
  salud text not null default 'sin_ejecucion' check (salud in ('ok','error','atrasada','sin_ejecucion','inactiva')),
  fallos_consecutivos integer not null default 0, ultima_alerta_runid bigint, ultima_alerta_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.operacion_automatizaciones_catalogo enable row level security;
alter table public.operacion_automatizaciones_estado enable row level security;
drop policy if exists op_auto_catalogo_admin on public.operacion_automatizaciones_catalogo;
create policy op_auto_catalogo_admin on public.operacion_automatizaciones_catalogo for select to authenticated using (mi_rol()='admin');
drop policy if exists op_auto_estado_admin on public.operacion_automatizaciones_estado;
create policy op_auto_estado_admin on public.operacion_automatizaciones_estado for select to authenticated using (mi_rol()='admin');
insert into public.operacion_automatizaciones_catalogo(jobname,objetivo,meta,max_minutos_sin_ejecucion,criticidad) values
('auto-facturacion-diaria','Generar la facturación automática diaria sin duplicados','1 ejecución exitosa diaria',1800,'critica'),
('auto-facturacion-reintento-1','Primer reintento de facturación automática','Recuperar fallos del proceso principal 15 minutos después',1800,'alta'),
('auto-facturacion-reintento-2','Segundo reintento de facturación automática','Recuperar fallos persistentes 30 minutos después',1800,'alta'),
('respaldo-diario-nexus','Crear respaldo diario de NEXUS PRO','1 respaldo exitoso cada 24 horas',1800,'critica'),
('respaldo-correo-mensual-nexus','Enviar respaldo mensual fuera del sistema','1 envío exitoso por mes',72000,'alta'),
('verificar-respaldo-nexus','Comprobar que el respaldo diario exista y sea utilizable','1 verificación exitosa cada 24 horas',1800,'critica'),
('rifa_expirar_apartados','Liberar apartados vencidos de rifas','Ejecución al menos cada 45 minutos',45,'media'),
('whatsapp-detectar-atrasados-diario','Detectar clientes atrasados para cobranza WhatsApp','1 evaluación exitosa diaria',1800,'alta'),
('whatsapp-reglas-custom-hourly','Ejecutar reglas personalizadas de WhatsApp','1 ejecución exitosa cada 2 horas',130,'alta'),
('seguros-cierre-ciclo-20','Cerrar y custodiar el ciclo de seguros del día 20','1 cierre exitoso por ciclo mensual',65000,'critica'),
('reporte-whatsapp-agentes-diario','Enviar el reporte operativo diario a agentes','1 reporte por día laborable',4320,'alta'),
('novedades-sync-hourly','Sincronizar novedades operativas','1 ejecución exitosa cada 2 horas',130,'media'),
('monitor-automatizaciones-nexus','Supervisar salud, fallos y retrasos de las automatizaciones','1 evaluación exitosa cada 2 horas',130,'critica')
on conflict (jobname) do update set objetivo=excluded.objetivo,meta=excluded.meta,max_minutos_sin_ejecucion=excluded.max_minutos_sin_ejecucion,criticidad=excluded.criticidad,updated_at=now();

create or replace function public.operacion_monitorear_automatizaciones()
returns integer language plpgsql security definer set search_path=public,cron as $$
declare rec_job record; rec_run record; rec_cat record; rec_prev record; v_salud text; v_fallos integer; v_count integer:=0; v_alertar boolean;
begin
  for rec_job in select jobid,jobname,schedule,active from cron.job loop
    select runid,status,return_message,start_time,end_time into rec_run from cron.job_run_details where jobid=rec_job.jobid order by start_time desc nulls last,runid desc limit 1;
    select objetivo,meta,max_minutos_sin_ejecucion,criticidad into rec_cat from public.operacion_automatizaciones_catalogo where jobname=rec_job.jobname;
    select ultimo_runid,fallos_consecutivos,ultima_alerta_runid,ultima_alerta_at into rec_prev from public.operacion_automatizaciones_estado where jobid=rec_job.jobid;
    if not rec_job.active then v_salud:='inactiva'; elsif rec_run.runid is null then v_salud:='sin_ejecucion'; elsif rec_run.status<>'succeeded' then v_salud:='error';
    elsif rec_cat.max_minutos_sin_ejecucion is not null and coalesce(rec_run.end_time,rec_run.start_time)<now()-(rec_cat.max_minutos_sin_ejecucion||' minutes')::interval then v_salud:='atrasada'; else v_salud:='ok'; end if;
    if rec_run.runid is distinct from rec_prev.ultimo_runid then v_fallos:=case when rec_run.status='succeeded' then 0 when rec_run.runid is null then coalesce(rec_prev.fallos_consecutivos,0) else coalesce(rec_prev.fallos_consecutivos,0)+1 end; else v_fallos:=coalesce(rec_prev.fallos_consecutivos,0); end if;
    v_alertar:=v_salud in ('error','atrasada') and (rec_prev.ultima_alerta_at is null or rec_prev.ultima_alerta_at<now()-interval '60 minutes' or rec_run.runid is distinct from rec_prev.ultima_alerta_runid);
    insert into public.operacion_automatizaciones_estado(jobid,jobname,schedule,active,objetivo,meta,criticidad,ultimo_runid,ultimo_estado,ultimo_inicio,ultimo_fin,ultimo_mensaje,salud,fallos_consecutivos,ultima_alerta_runid,ultima_alerta_at,updated_at)
    values(rec_job.jobid,rec_job.jobname,rec_job.schedule,rec_job.active,rec_cat.objetivo,rec_cat.meta,coalesce(rec_cat.criticidad,'media'),rec_run.runid,rec_run.status,rec_run.start_time,rec_run.end_time,left(rec_run.return_message,1000),v_salud,v_fallos,case when v_alertar then rec_run.runid else rec_prev.ultima_alerta_runid end,case when v_alertar then now() else rec_prev.ultima_alerta_at end,now())
    on conflict (jobid) do update set jobname=excluded.jobname,schedule=excluded.schedule,active=excluded.active,objetivo=excluded.objetivo,meta=excluded.meta,criticidad=excluded.criticidad,ultimo_runid=excluded.ultimo_runid,ultimo_estado=excluded.ultimo_estado,ultimo_inicio=excluded.ultimo_inicio,ultimo_fin=excluded.ultimo_fin,ultimo_mensaje=excluded.ultimo_mensaje,salud=excluded.salud,fallos_consecutivos=excluded.fallos_consecutivos,ultima_alerta_runid=excluded.ultima_alerta_runid,ultima_alerta_at=excluded.ultima_alerta_at,updated_at=now();
    if v_alertar then insert into public.auto_notificaciones_log(tipo,titulo,mensaje,estado,detalle) values('AUTOMATIZACION_FALLO','Automatización requiere atención: '||rec_job.jobname,case when v_salud='atrasada' then 'No registra una ejecución exitosa dentro de la meta definida.' else 'La última ejecución terminó con estado '||coalesce(rec_run.status,'desconocido')||'.' end,'error',jsonb_build_object('jobid',rec_job.jobid,'jobname',rec_job.jobname,'runid',rec_run.runid,'salud',v_salud,'return_message',left(rec_run.return_message,1000))); end if;
    v_count:=v_count+1;
  end loop;
  delete from public.operacion_automatizaciones_estado e where not exists(select 1 from cron.job cj where cj.jobid=e.jobid);
  return v_count;
end; $$;
revoke all on function public.operacion_monitorear_automatizaciones() from public,anon,authenticated;
select cron.unschedule(jobid) from cron.job where jobname='monitor-automatizaciones-nexus';
select cron.schedule('monitor-automatizaciones-nexus','7 * * * *','select public.operacion_monitorear_automatizaciones();');
select public.operacion_monitorear_automatizaciones();
