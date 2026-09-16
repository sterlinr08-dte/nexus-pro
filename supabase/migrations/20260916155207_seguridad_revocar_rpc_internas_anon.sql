-- NEXUS PRO · seguridad
-- Cierra ejecución directa de funciones internas que no son RPC públicas.
-- Mantiene intactos los helpers históricos aceptados por POLITICA-SEGURIDAD.md.

revoke execute on function public.trg_abono_preparar_validacion() from public,anon,authenticated;
revoke execute on function public.trg_whatsapp_pago_validado() from public,anon,authenticated;
revoke execute on function public.whatsapp_notificar_atraso_v2_base(uuid,uuid,jsonb) from public,anon,authenticated;
