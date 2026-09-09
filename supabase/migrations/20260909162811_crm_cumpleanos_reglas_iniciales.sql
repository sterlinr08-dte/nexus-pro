-- NEXUS PRO Seguros — reglas iniciales de cumpleaños.
-- Aplicada en producción el 2026-09-09 como crm_cumpleanos_reglas_iniciales.

insert into public.whatsapp_reglas_custom (
  organizacion_id,nombre,activo,trigger_tipo,trigger_dias,
  accion_tipo,accion_config,repetir_dias
)
select o.id,'Cumpleaños próximo',true,'cumpleanos',3,'crear_tarea',
       jsonb_build_object(
         'titulo','Preparar felicitación de cumpleaños',
         'prioridad','media',
         'vence_dias',3,
         'asignar','agente_cliente'
       ),365
from public.organizaciones o
where o.slug='nexus-pro'
  and not exists (
    select 1 from public.whatsapp_reglas_custom r
    where r.organizacion_id=o.id and r.nombre='Cumpleaños próximo'
  );

insert into public.whatsapp_reglas_custom (
  organizacion_id,nombre,activo,trigger_tipo,trigger_dias,
  accion_tipo,accion_config,repetir_dias
)
select o.id,'Feliz cumpleaños por WhatsApp',false,'cumpleanos',0,'whatsapp_plantilla',
       jsonb_build_object(
         'template_name','feliz_cumpleanos_nexus',
         'template_language','es',
         'param_keys',jsonb_build_array('cliente.nombre')
       ),365
from public.organizaciones o
where o.slug='nexus-pro'
  and not exists (
    select 1 from public.whatsapp_reglas_custom r
    where r.organizacion_id=o.id and r.nombre='Feliz cumpleaños por WhatsApp'
  );
