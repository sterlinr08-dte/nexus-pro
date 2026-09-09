-- NEXUS PRO Seguros — auto-validación de transferencia/depósito del administrador en su propia cuenta.
-- Solo aplica a NUEVOS abonos. No modifica pagos pendientes históricos.

create or replace function public.trg_abono_preparar_validacion()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_agente_actual uuid;
  v_agente_pago uuid;
begin
  if new.metodo in ('Transferencia','Depósito') then
    begin
      v_agente_pago := nullif(new.agente_cobro,'')::uuid;
    exception when others then
      v_agente_pago := null;
    end;

    if public.mi_rol()='admin' then
      v_agente_actual := public.mi_agente_efectivo();
    end if;

    if public.mi_rol()='admin'
       and v_agente_actual is not null
       and v_agente_pago is not null
       and v_agente_actual = v_agente_pago then
      new.validacion_estado := 'validado';
      new.validado_at := now();
      new.validado_por_user_id := public.mi_usuario_id();
      new.validado_por_agente_id := v_agente_actual;
      new.validacion_nota := 'Validado automáticamente: pago registrado por el administrador en su propia cuenta';
    else
      new.validacion_estado := 'pendiente';
      new.validado_at := null;
      new.validado_por_user_id := null;
      new.validado_por_agente_id := null;
      new.validacion_nota := null;
    end if;
  else
    new.validacion_estado := 'no_requerida';
  end if;
  return new;
end;
$function$;
