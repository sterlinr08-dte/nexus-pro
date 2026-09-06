-- NEXUS PRO · Aviso de WhatsApp al AGENTE cuando cobra Y deposita a SU PROPIA cuenta
-- Pedido del dueño (2026-09-06): "cuando un agente cobra y deposita a la cuenta de él le
-- envía un mensaje diciendo cuánto tiene acumulado".
--
-- El caso real ya existe en el sistema desde el Bloque 4 (Detalles de cobro/transferencias
-- entre agentes): seguros_registrar_cobro_con_entrega() inserta en entregas_admin con
-- confirmado=true SOLO cuando quien registra el cobro (su sesión, vía mi_agente_efectivo())
-- es el MISMO agente dueño de la cuenta donde se depositó (p_cuenta_destino_id) -- eso ES
-- "cobrar y depositar a la cuenta de él". Cualquier otro caso (depositar a la cuenta de OTRO
-- agente, o una entrega física manual vía seguros_registrar_entrega_admin_manual) entra con
-- confirmado=false. Por eso el trigger de abajo dispara EXACTAMENTE y SOLO en ese escenario
-- con "AFTER INSERT ... WHEN (NEW.confirmado AND NEW.es_directo)" -- no hace falta repetir la
-- comparación de agentes, ya la resolvió la RPC al decidir el valor de confirmado.
--
-- "Cuánto tiene acumulado" = transferencias_saldo_disponible_agente(agente_id), la MISMA
-- función que el sistema YA usa para decirle a un agente cuánto puede entregar físicamente
-- (ver seguros_registrar_entrega_admin_manual, "El agente solo tiene RD$X disponibles para
-- entregar") -- no se inventa un cálculo nuevo, se reusa el saldo real ya auditado.
--
-- Mismo patrón de aislamiento que trg_whatsapp_factura_generada/trg_whatsapp_pago_aplicado:
-- todo el cuerpo va en un bloque exception-safe -- un fallo aquí (bug propio, pg_net caído,
-- Zernio sin configurar, lo que sea) jamás debe poder tumbar el cobro/entrega real que ya se
-- insertó en la transacción de la RPC.

-- whatsapp_mensajes pasa de "solo clientes" a "clientes O agentes" -- reusa la MISMA tabla de
-- historial/auditoría en vez de duplicar una tabla paralela (mismo criterio "aditivo, no
-- reemplaza nada" del resto del sistema). cliente_id se relaja a nullable; agente_id es
-- columna nueva nullable; el CHECK nuevo exige que venga uno de los dos (nunca ninguno, nunca
-- pensado para los dos a la vez -- el llamador siempre manda uno solo).
alter table public.whatsapp_mensajes
  alter column cliente_id drop not null;

alter table public.whatsapp_mensajes
  add column if not exists agente_id uuid references public.agentes(id);

alter table public.whatsapp_mensajes
  drop constraint if exists whatsapp_mensajes_destino_check;
alter table public.whatsapp_mensajes
  add constraint whatsapp_mensajes_destino_check
  check (cliente_id is not null or agente_id is not null);

create index if not exists whatsapp_mensajes_agente_idx on public.whatsapp_mensajes (agente_id, created_at desc);

-- Nuevo tipo de evento en el CHECK existente (antes solo factura_generada/atrasado/pago_aplicado).
alter table public.whatsapp_mensajes
  drop constraint if exists whatsapp_mensajes_tipo_check;
alter table public.whatsapp_mensajes
  add constraint whatsapp_mensajes_tipo_check
  check (tipo in ('factura_generada', 'atrasado', 'pago_aplicado', 'entrega_confirmada'));

-- ────────────────────────────────────────────────────────────────────────────────────────
-- Mismo mecanismo que whatsapp_notificar_evento (net.http_post + secreto de Vault), pero el
-- body lleva agente_id en vez de cliente_id -- la Edge Function whatsapp-notificar (v3) ya
-- distingue los dos casos y busca en agentes/clientes según cuál venga.
create or replace function public.whatsapp_notificar_evento_agente(p_tipo text, p_agente_id uuid, p_referencia_id uuid, p_datos jsonb)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'whatsapp_internal_secret';
  perform net.http_post(
    url := 'https://tnwsgcxurfyuszxsewsn.supabase.co/functions/v1/whatsapp-notificar',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRud3NnY3h1cmZ5dXN6eHNld3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NDM3NzIsImV4cCI6MjA5NjUxOTc3Mn0.G7hRg4Cdki0jilRMg2hUZ6dVJsqvXWXOPFQOdGVbR1k',
      'X-Internal-Secret', coalesce(v_secret, '')
    ),
    body := jsonb_build_object('tipo', p_tipo, 'agente_id', p_agente_id, 'referencia_id', p_referencia_id, 'datos', p_datos),
    timeout_milliseconds := 15000
  );
end;
$$;

revoke all on function public.whatsapp_notificar_evento_agente(text, uuid, uuid, jsonb) from public, anon, authenticated;

create or replace function public.trg_whatsapp_entrega_confirmada()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_acumulado numeric;
begin
  -- Blindado igual que los otros triggers de WhatsApp: un fallo aquí adentro nunca debe poder
  -- tumbar la entrega/cobro real que ya se insertó.
  begin
    if new.confirmado and new.es_directo then
      v_acumulado := public.transferencias_saldo_disponible_agente(new.agente_id);
      perform public.whatsapp_notificar_evento_agente(
        'entrega_confirmada', new.agente_id, new.id,
        jsonb_build_object('monto', new.monto, 'acumulado', coalesce(v_acumulado, 0))
      );
    end if;
  exception when others then
    raise warning 'trg_whatsapp_entrega_confirmada fallo (entrega % no se vio afectada): %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.trg_whatsapp_entrega_confirmada() from public, anon, authenticated;

drop trigger if exists trg_whatsapp_entrega_confirmada on public.entregas_admin;
create trigger trg_whatsapp_entrega_confirmada
  after insert on public.entregas_admin
  for each row
  when (new.confirmado and new.es_directo)
  execute function public.trg_whatsapp_entrega_confirmada();
