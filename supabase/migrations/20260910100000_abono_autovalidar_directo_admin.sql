-- NEXUS PRO Seguros — auto-validar el pago cuando el cliente deposita DIRECTO en la
-- cuenta del administrador.
--
-- Decisión del dueño: una entrega directa a su cuenta no necesita revisión manual. El
-- dinero ya está en la cuenta y el registro trae comprobante; obligar a validarlo a mano
-- solo deja al agente que cobró con la custodia temporalmente baja (su entrega ya salió,
-- pero el cobro todavía no cuenta).
--
-- POR QUÉ EL TRIGGER VA EN entregas_admin Y NO EN abonos:
-- trg_abono_preparar_validacion es BEFORE INSERT sobre abonos, y en ese instante la entrega
-- directa todavía no existe — se crea inmediatamente después, en el mismo milisegundo. Desde
-- el abono es imposible saber a qué cuenta se depositó. La entrega es el único registro que
-- lo dice, así que es ahí donde hay que decidir.
--
-- Alcance deliberadamente estrecho: solo entregas DIRECTAS, vinculadas a un abono, cuya
-- custodia es un agente con cargo admin, y solo si el abono sigue 'pendiente'. Cualquier
-- otro pago bancario sigue requiriendo validación manual como hasta ahora.
--
-- Lo que se pierde a cambio, dicho claro: ya nadie confirma a mano que ese depósito entró
-- de verdad al banco. Se confía en el comprobante y en el registro del agente.

create or replace function public.trg_abono_autovalidar_directo_admin()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_custodia_es_admin boolean;
begin
  -- Blindado como el resto de triggers del proyecto: si algo falla aquí dentro, la entrega
  -- ya registrada NUNCA debe revertirse por ello.
  begin
    if new.es_directo and new.abono_id is not null then
      select lower(coalesce(a.cargo,''))='admin'
        into v_custodia_es_admin
      from public.agentes a
      where a.id = new.agente_id;

      if coalesce(v_custodia_es_admin,false) then
        update public.abonos
           set validacion_estado = 'validado',
               validado_at = now(),
               validado_por_agente_id = new.agente_id,
               validacion_nota = 'Validado automáticamente: el cliente depositó directo en la cuenta del administrador'
         where id = new.abono_id
           and metodo in ('Transferencia','Depósito')
           and validacion_estado = 'pendiente'
           and coalesce(estado,'') <> 'Reversado';
      end if;
    end if;
  exception when others then
    raise warning 'trg_abono_autovalidar_directo_admin fallo (la entrega % no se vio afectada): %',
      new.id, sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists trg_abono_autovalidar_directo_admin on public.entregas_admin;
create trigger trg_abono_autovalidar_directo_admin
  after insert on public.entregas_admin
  for each row
  execute function public.trg_abono_autovalidar_directo_admin();

comment on function public.trg_abono_autovalidar_directo_admin() is
  'Auto-valida el abono bancario cuando el cliente deposito directo en la cuenta del administrador (entrega directa con custodia admin). Va sobre entregas_admin porque en el BEFORE INSERT del abono la entrega todavia no existe.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Red para cualquier pendiente que cumpla el mismo criterio y siga sin validar al momento
-- de aplicar esta migracion.
--
-- Al escribirla habia uno (deposito de RD$6,000 de MIELFA GLORIBEL MERCEDES ABREU ABREU,
-- Banreservas ref 242248068435, cobrado por ROBINSON y depositado directo en la cuenta de
-- ESTERLIN), pero el dueno lo valido a mano antes de aplicar. Hoy este UPDATE no encuentra
-- nada que hacer: queda por si aparece otro caso en la ventana previa a aplicarse.
--
-- Es idempotente: solo toca lo que siga en 'pendiente'. Si actuara, dispararia
-- trg_whatsapp_pago_validado y avisaria al cliente y al agente, que es exactamente lo que
-- ocurre al validar a mano.
-- ─────────────────────────────────────────────────────────────────────────────
update public.abonos a
   set validacion_estado = 'validado',
       validado_at = now(),
       validado_por_agente_id = e.agente_id,
       validacion_nota = 'Validado automáticamente: el cliente depositó directo en la cuenta del administrador'
  from public.entregas_admin e
 where e.abono_id = a.id
   and e.es_directo
   and not coalesce(e.anulado,false)
   and e.agente_id in (select id from public.agentes where lower(coalesce(cargo,''))='admin')
   and a.metodo in ('Transferencia','Depósito')
   and a.validacion_estado = 'pendiente'
   and coalesce(a.estado,'') <> 'Reversado';
