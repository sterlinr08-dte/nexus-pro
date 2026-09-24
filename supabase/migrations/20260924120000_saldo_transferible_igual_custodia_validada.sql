-- Saldo transferible = custodia validada.
--
-- Antes, transferencias_saldo_disponible_agente() sumaba los abonos bancarios
-- (Transferencia/Depósito) con validacion_estado='pendiente', mientras que
-- seguros_acumulado_validado_agente() los excluye. Un agente podía transferir o
-- entregar dinero que aún no estaba validado. Ver docs/bitacora/2026-09-24-1103-claude.md.
--
-- Se mantiene la firma y el nombre (lo usan transferencias_crear/aceptar,
-- seguros_registrar_entrega_admin_manual, seguros_anular_entrega_admin,
-- seguros_reversar_cobro y trg_whatsapp_entrega_confirmada) y se delega en la
-- fuente de verdad única. No toca datos.

CREATE OR REPLACE FUNCTION public.transferencias_saldo_disponible_agente(p_agente_id uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT public.seguros_acumulado_validado_agente(p_agente_id)
$function$;

REVOKE ALL ON FUNCTION public.transferencias_saldo_disponible_agente(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transferencias_saldo_disponible_agente(uuid) TO service_role;
