-- NEXUS PRO Seguros — "el agente de la cuenta" pasa a significar de verdad la cuenta donde
-- entró el dinero, y no quien cobró.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- EL PROBLEMA
--
-- Todo el módulo de validación trata `abonos.agente_cobro` como si fuera "el agente de la
-- cuenta". Eso es cierto para los pagos propios y FALSO justo para los cruzados, que —desde
-- la migración 20260910120000— son los únicos que siguen validándose a mano.
--
-- Tres consecuencias medidas, no supuestas:
--
--   1. `seguros_validar_pago` dice literalmente "solo el agente de esa cuenta puede validar
--      este pago", pero compara contra `agente_cobro`. En el caso real del 10-sep, ROBINSON
--      podía validar él mismo el depósito que hizo a la cuenta de ESTERLIN: el control
--      existía, pero podía firmarlo justo quien debía ser controlado.
--
--   2. Las tres pantallas rotulan esa columna como "CUENTA" / "Cuenta / agente". Ese día la
--      fila decía CUENTA: ROBINSON cuando el dinero había entrado a la cuenta de ESTERLIN.
--      La pantalla señalaba la cuenta equivocada para ir a comprobar el depósito.
--
--   3. El aviso `pago_pendiente_validacion` salía hacia el cobrador, no hacia quien tiene
--      que validar. Si el admin no mira la cola, ese paso se queda sin hacer y nadie se
--      entera.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- LA FUENTE DE VERDAD
--
-- `entregas_admin.agente_id` de la entrega directa asociada al abono. No hay que inventar
-- nada: al momento de validar, esa entrega ya existe (se crea en la misma transacción que el
-- cobro, y en septiembre 66 de 66 pagos bancarios la tienen con `abono_id`).
--
-- Si no hay entrega directa —los 222 pagos bancarios de mayo a agosto, del flujo anterior,
-- todos ya validados— se cae a `agente_cobro`, que es el comportamiento de siempre.
--
-- El aviso es el único que no puede leer la entrega, porque se dispara en el AFTER INSERT
-- del abono, cuando la entrega todavía no existe. Usa la misma variable local a la
-- transacción que ya introdujo la migración 20260910120000.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- QUÉ NO CAMBIA
--
-- · Quién ve la cola: el admin, el dueño de la cuenta y también el cobrador, que sigue
--   viendo su pago pendiente aunque ya no pueda validarlo él.
-- · El acumulado que devuelve la validación sigue siendo el del COBRADOR, porque es el único
--   que cambia al validar: el del dueño de la cuenta ya contaba la entrega directa recibida.
--   Ahora se devuelve además su nombre, para que la pantalla pueda decir de quién es.
-- · `agente_cobro` no se toca. Ninguna cifra ni ningún histórico se modifican: esto solo
--   cambia quién puede validar, quién recibe el aviso y qué nombre muestra la pantalla.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) La cola: muestra la cuenta real y dice quién puede validar
--
-- Cambia el RETURNS TABLE (3 columnas nuevas), así que hace falta DROP + CREATE. Ojo: el
-- DROP borra los grants, se reaplican abajo.
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.seguros_pagos_pendientes_validacion();

create function public.seguros_pagos_pendientes_validacion()
returns table(
  abono_id uuid,
  cliente_id uuid,
  cliente text,
  monto numeric,
  metodo text,
  banco text,
  referencia text,
  comprobante_url text,
  fecha timestamptz,
  agente_id uuid,
  agente text,
  cobrado_por_id uuid,
  cobrado_por text,
  puede_validar boolean
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_agente uuid;
  v_admin boolean;
begin
  if public.mi_rol() is null
     or public.mi_organizacion() is distinct from (select id from public.organizaciones where slug='nexus-pro') then
    raise exception 'no autorizado';
  end if;

  v_agente := public.mi_agente_efectivo();
  v_admin := (public.mi_rol() = 'admin');

  return query
  with base as (
    select
      a.id, a.cliente_id, c.nom as cliente, a.monto, a.metodo, a.banco, a.referencia,
      a.comprobante_url, coalesce(a.fecha,a.created_at) as fecha,
      -- Cast defensivo: hay abonos con agente_cobro vacío; un ::uuid a secas
      -- reventaría la consulta entera por esas filas.
      case when coalesce(a.agente_cobro,'') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           then a.agente_cobro::uuid end as cobro_id,
      (select e.agente_id
         from public.entregas_admin e
        where e.abono_id = a.id
          and e.es_directo
          and not coalesce(e.anulado,false)
        order by e.created_at
        limit 1) as cuenta_id
    from public.abonos a
    join public.clientes c on c.id = a.cliente_id
    where a.validacion_estado = 'pendiente'
      and coalesce(a.estado,'') <> 'Reversado'
  ), r as (
    select b.*, coalesce(b.cuenta_id, b.cobro_id) as cuenta from base b
  )
  select r.id, r.cliente_id, r.cliente, r.monto, r.metodo, r.banco, r.referencia,
         r.comprobante_url, r.fecha,
         r.cuenta, ag.nom,
         r.cobro_id, ac.nom,
         (v_admin or (v_agente is not null and v_agente = r.cuenta))
  from r
  left join public.agentes ag on ag.id = r.cuenta
  left join public.agentes ac on ac.id = r.cobro_id
  where v_admin
     or (v_agente is not null and (v_agente = r.cuenta or v_agente = r.cobro_id))
  order by r.fecha asc;
end;
$function$;

revoke all on function public.seguros_pagos_pendientes_validacion() from public, anon;
grant execute on function public.seguros_pagos_pendientes_validacion() to authenticated;

comment on function public.seguros_pagos_pendientes_validacion() is
  'Cola de pagos bancarios pendientes. agente_id/agente son la CUENTA donde entro el dinero (entregas_admin.agente_id de la entrega directa; si no hay, agente_cobro). La ven el admin, el dueno de la cuenta y el cobrador; puede_validar dice quien puede actuar.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Validar: solo el dueño de la cuenta donde entró el dinero, o el administrador
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.seguros_validar_pago(p_abono_id uuid, p_nota text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_abono public.abonos%rowtype;
  v_agente_actual uuid;
  v_agente_pago uuid;   -- quien cobró
  v_cuenta uuid;        -- de quién es la cuenta donde entró el dinero
  v_cuenta_nom text;
  v_acumulado numeric;
begin
  if public.mi_rol() is null
     or public.mi_organizacion() is distinct from (select id from public.organizaciones where slug='nexus-pro') then
    raise exception 'no autorizado';
  end if;

  select * into v_abono from public.abonos where id=p_abono_id for update;
  if not found then raise exception 'pago no encontrado'; end if;
  if v_abono.estado='Reversado' then raise exception 'este pago está reversado'; end if;
  if v_abono.metodo not in ('Transferencia','Depósito') then raise exception 'este pago no requiere validación bancaria'; end if;

  begin v_agente_pago := nullif(v_abono.agente_cobro,'')::uuid; exception when others then v_agente_pago := null; end;

  if v_abono.validacion_estado='validado' then
    v_acumulado := case when v_agente_pago is null then 0 else public.seguros_acumulado_validado_agente(v_agente_pago) end;
    return jsonb_build_object('ok',true,'reintento',true,'abono_id',v_abono.id,
                              'agente_id',v_agente_pago,
                              'agente',(select nom from public.agentes where id=v_agente_pago),
                              'acumulado',coalesce(v_acumulado,0));
  end if;
  if v_abono.validacion_estado<>'pendiente' then raise exception 'estado de validación inválido'; end if;

  v_agente_actual := public.mi_agente_efectivo();

  -- La cuenta donde entró el dinero. La entrega directa ya existe a estas alturas; si no
  -- la hay (pagos del flujo anterior a septiembre) se cae a quien cobró, como siempre.
  select e.agente_id into v_cuenta
    from public.entregas_admin e
   where e.abono_id = p_abono_id
     and e.es_directo
     and not coalesce(e.anulado,false)
   order by e.created_at
   limit 1;
  v_cuenta := coalesce(v_cuenta, v_agente_pago);

  if v_cuenta is null then raise exception 'el pago no tiene agente de cuenta válido'; end if;

  if public.mi_rol()<>'admin' and v_agente_actual is distinct from v_cuenta then
    select nom into v_cuenta_nom from public.agentes where id=v_cuenta;
    raise exception 'este pago entró a la cuenta de %: solo esa persona o el administrador pueden validarlo',
      coalesce(v_cuenta_nom,'otro agente');
  end if;

  update public.abonos
     set validacion_estado='validado',
         validado_at=now(),
         validado_por_user_id=public.mi_usuario_id(),
         validado_por_agente_id=coalesce(v_agente_actual,v_cuenta),
         validacion_nota=nullif(btrim(coalesce(p_nota,'')),'')
   where id=p_abono_id;

  -- El acumulado que cambia al validar es el del COBRADOR: el del dueño de la cuenta ya
  -- contaba la entrega directa recibida.
  v_acumulado := case when v_agente_pago is null then 0 else public.seguros_acumulado_validado_agente(v_agente_pago) end;
  return jsonb_build_object('ok',true,'reintento',false,'abono_id',p_abono_id,
                            'agente_id',v_agente_pago,
                            'agente',(select nom from public.agentes where id=v_agente_pago),
                            'cuenta_id',v_cuenta,
                            'cuenta',(select nom from public.agentes where id=v_cuenta),
                            'acumulado',coalesce(v_acumulado,0));
end;
$function$;

comment on function public.seguros_validar_pago(uuid,text) is
  'Valida un pago bancario pendiente. Solo puede hacerlo el dueno de la CUENTA donde entro el dinero (entregas_admin.agente_id de la entrega directa) o el administrador. Devuelve el acumulado del COBRADOR, que es el unico que cambia al validar.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) El aviso va a quien tiene que validar
--
-- Reemplaza la versión de la migración 20260910120000 conservando su bloque de
-- `pago_validado_resumen`; lo único que cambia es el destinatario del aviso de pendiente.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.trg_whatsapp_pago_aplicado()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_saldo numeric;
  v_periodo text;
  v_pagado_actual numeric;
  v_agente uuid;
  v_destino uuid;
  v_cliente_nom text;
  v_acumulado numeric;
begin
  begin
    if new.estado is distinct from 'Reversado' and coalesce(new.monto,0)>0 then
      if new.metodo in ('Transferencia','Depósito') and new.validacion_estado='pendiente' then
        begin v_agente := nullif(new.agente_cobro,'')::uuid; exception when others then v_agente := null; end;

        -- Aquí la entrega directa todavía no existe (se crea después, en esta misma
        -- transacción), así que la cuenta destino llega por la variable local que fija
        -- seguros_registrar_cobro_con_entrega. Sin ella, se avisa al cobrador como antes.
        begin
          v_destino := nullif(current_setting('nexus.cobro_cuenta_destino', true),'')::uuid;
        exception when others then
          v_destino := null;
        end;
        v_destino := coalesce(v_destino, v_agente);

        select nom into v_cliente_nom from public.clientes where id=new.cliente_id;
        if v_destino is not null then
          perform public.whatsapp_notificar_pago_agente(
            'pago_pendiente_validacion',v_destino,new.id,
            jsonb_build_object(
              'monto',new.monto,
              'cliente',coalesce(v_cliente_nom,'Cliente'),
              'metodo',new.metodo,
              'banco',coalesce(new.banco,'—'),
              'referencia',coalesce(new.referencia,'—')
            )
          );
        end if;
        return new;
      end if;

      select greatest(0,coalesce(deuda_total,0)-coalesce(pagado,0))+greatest(0,coalesce(deuda_anterior,0)),
             coalesce(pagado,0)
        into v_saldo,v_pagado_actual
        from public.clientes where id=new.cliente_id;
      if new.tipo is distinct from 'deuda_anterior' then
        v_periodo := public.seguros_meses_cubiertos_por_abono(new.cliente_id,v_pagado_actual-new.monto,v_pagado_actual);
      else
        v_periodo := null;
      end if;
      perform public.whatsapp_notificar_evento(
        'pago_aplicado',new.cliente_id,new.id,
        jsonb_build_object('monto',new.monto,'saldo_actual',coalesce(v_saldo,0),'periodo',v_periodo)
      );

      -- Pago bancario que nace ya validado (no cruzado): el resumen del acumulado lo manda
      -- aquí, porque trg_whatsapp_pago_validado solo escucha UPDATE y no se va a disparar.
      if new.metodo in ('Transferencia','Depósito') and new.validacion_estado='validado' then
        begin v_agente := nullif(new.agente_cobro,'')::uuid; exception when others then v_agente := null; end;
        if v_agente is not null then
          v_acumulado := public.seguros_acumulado_validado_agente(v_agente);
          perform public.whatsapp_notificar_pago_agente(
            'pago_validado_resumen',v_agente,new.id,
            jsonb_build_object('monto',new.monto,'acumulado',coalesce(v_acumulado,0))
          );
        end if;
      end if;
    end if;
  exception when others then
    raise warning 'trg_whatsapp_pago_aplicado fallo (abono % no se vio afectado): %',new.id,sqlerrm;
  end;
  return new;
end;
$function$;
