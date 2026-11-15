-- Registro de tiendas por la web (15-nov-2026). Decisiones del dueño: 14 días de prueba, cobro por transferencia que él
-- activa, teléfono WhatsApp + su aprobación. No toca datos existentes.

-- 1) Datos del registro en la empresa. `email_dominio` (ya existía, se usaba para SSO de bases propias) ahora también
--    sirve a las tiendas de ESTA base: sus usuarios entran como usuario@empresa y su correo interno es
--    usuario@empresa.nexus-pro.local, así dos tiendas pueden tener el mismo nombre de usuario.
alter table public.organizaciones add column if not exists contacto_nombre text;
alter table public.organizaciones add column if not exists contacto_tel text;
alter table public.organizaciones add column if not exists origen text;
alter table public.organizaciones add column if not exists aprobado boolean;
comment on column public.organizaciones.origen is 'web = creada por el registro público; null = creada a mano.';
comment on column public.organizaciones.aprobado is 'Registro web: null/false = pendiente de revisión del dueño; true = aprobado.';

-- 2) Límite de intentos del registro público (solo la Edge Function lo usa, con la clave de servicio).
create table if not exists public.registro_intentos (
  id bigserial primary key,
  ip_hash text not null,
  ok boolean not null default false,
  creado timestamptz not null default now()
);
create index if not exists registro_intentos_ip_idx on public.registro_intentos (ip_hash, creado desc);
alter table public.registro_intentos enable row level security;
revoke all on public.registro_intentos from anon, authenticated;

-- 3) Empresa suspendida = sin acceso. Una empresa inactiva o con la prueba/mensualidad vencida (activo_hasta < ahora)
--    deja de «tener» organización: todas las políticas RLS por empresa la dejan sin datos. Hoy ninguna empresa tiene
--    activo_hasta y la única inactiva es `geriatra` (base propia).
create or replace function public.mi_organizacion()
returns uuid language sql stable security definer set search_path to 'public' as $$
  select us.organizacion_id
  from public.profiles p
  join public.usuarios_sistema us on us.id = p.usuario_sistema_id
  join public.organizaciones o on o.id = us.organizacion_id
  where p.id = auth.uid()
    and coalesce(o.activo, true)
    and (o.activo_hasta is null or o.activo_hasta > now())
  limit 1
$$;

-- 4) Tienda nueva lista para vender: configuración, almacén, secuencias y catálogo de cuentas. Sin productos.
create or replace function public.pos_sembrar_tienda(p_org uuid)
returns void language plpgsql security definer set search_path to 'public' as $fn$
declare v_nom text;
begin
  select nombre into v_nom from public.organizaciones where id = p_org;
  if v_nom is null then raise exception 'ORG_NO_EXISTE'; end if;
  insert into public.pos_config (organizacion_id, prefijo_contado, prefijo_credito, mora_pct, mora_dias_gracia, garantia_rep_dias, emp_nombre, modulos_off)
  values (p_org, 'CO', 'CR', 0, 0, 0, v_nom, '["ia","reparaciones","entidades","crm","rrhh","cuotas","apartados"]'::jsonb)
  on conflict (organizacion_id) do nothing;
  if not exists (select 1 from public.pos_almacenes where organizacion_id = p_org) then
    insert into public.pos_almacenes (organizacion_id, nombre, es_principal, activo) values (p_org, 'Almacén Principal', true, true);
  end if;
  insert into public.pos_secuencias (organizacion_id, tipo, nombre, prefijo, longitud, proximo, activo) values
    (p_org,'factura_contado','Factura contado','CO',8,1,true),(p_org,'factura_credito','Factura crédito','CR',8,1,true),
    (p_org,'cotizacion','Cotización','COT-',5,1,true),(p_org,'prefactura','Prefactura','PF-',5,1,true),
    (p_org,'nota_credito','Nota de crédito / Devolución','NC-',5,1,true),(p_org,'transferencia','Transferencia / Despacho','TR-',5,1,true),
    (p_org,'nomina','Nómina','NOM-',5,1,true),(p_org,'recibo','Recibo de abono','REC-',5,1,true),
    (p_org,'pago_prov','Pago a proveedor','PG-',5,1,true),(p_org,'asiento','Asiento contable','AS-',5,1,true),
    (p_org,'crm','Oportunidad (CRM)','OP-',5,1,true)
  on conflict (organizacion_id, tipo) do nothing;
  insert into public.pos_cuentas (organizacion_id, codigo, nombre, tipo, naturaleza, activo) values
    (p_org,'1101','Caja','activo','deudora',true),(p_org,'1102','Banco','activo','deudora',true),
    (p_org,'1103','Cuentas por cobrar (clientes)','activo','deudora',true),(p_org,'1104','Inventario de mercancías','activo','deudora',true),
    (p_org,'1105','ITBIS pagado (adelantado)','activo','deudora',true),(p_org,'2101','Cuentas por pagar (proveedores)','pasivo','acreedora',true),
    (p_org,'2102','ITBIS por pagar','pasivo','acreedora',true),(p_org,'2103','Sueldos por pagar','pasivo','acreedora',true),
    (p_org,'2104','Retenciones por pagar (TSS/ISR)','pasivo','acreedora',true),(p_org,'2105','Notas de crédito por aplicar','pasivo','acreedora',true),
    (p_org,'3101','Capital','capital','acreedora',true),(p_org,'3102','Resultados acumulados','capital','acreedora',true),
    (p_org,'4101','Ventas','ingreso','acreedora',true),(p_org,'4102','Otros ingresos','ingreso','acreedora',true),
    (p_org,'4103','Ingresos por mora','ingreso','acreedora',true),(p_org,'5101','Costo de mercancía vendida','costo','deudora',true),
    (p_org,'6101','Sueldos y salarios','gasto','deudora',true),(p_org,'6102','Alquiler','gasto','deudora',true),
    (p_org,'6103','Servicios (luz, agua, internet)','gasto','deudora',true),(p_org,'6104','Gastos varios','gasto','deudora',true)
  on conflict (organizacion_id, codigo) do nothing;
end $fn$;
revoke execute on function public.pos_sembrar_tienda(uuid) from public, anon, authenticated;

-- 5) Panel del dueño: ve el contacto de las tiendas que llegan por la web y las aprueba, suspende o extiende.
create or replace function public.superadmin_orgs()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare res jsonb;
begin
  if not public.mi_es_superadmin() then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(t order by (t.origen = 'web' and coalesce(t.aprobado, false) = false) desc, t.nombre), '[]'::jsonb) into res from (
    select o.id, o.slug, o.nombre, o.tipo, o.activo, o.activo_hasta, o.dominio, o.created_at,
      o.origen, o.aprobado, o.contacto_nombre, o.contacto_tel,
      (select count(*) from public.usuarios_sistema u where u.organizacion_id = o.id) as usuarios,
      (select count(*) from public.rifas r where r.organizacion_id = o.id) as rifas,
      (select coalesce(sum(b.precio),0) from public.rifa_boletos b where b.organizacion_id = o.id and b.estado = 'confirmado') as rifa_recaudado,
      (select count(*) from public.pos_ventas v where v.organizacion_id = o.id) as pos_ventas,
      (select coalesce(sum(v.total),0) from public.pos_ventas v where v.organizacion_id = o.id) as pos_total
    from public.organizaciones o
  ) t;
  return res;
end $function$;

create or replace function public.superadmin_org_accion(p_org uuid, p_accion text)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare o public.organizaciones%rowtype;
begin
  if not public.mi_es_superadmin() then raise exception 'NO_AUTORIZADO' using errcode = '42501'; end if;
  select * into o from public.organizaciones where id = p_org;
  if o.id is null then raise exception 'ORG_NO_EXISTE'; end if;
  if o.slug = 'nexus-pro' then raise exception 'NO_SE_PUEDE_CAMBIAR_LA_EMPRESA_PRINCIPAL'; end if;
  if p_accion = 'aprobar' then update public.organizaciones set aprobado = true where id = p_org;
  elsif p_accion = 'suspender' then update public.organizaciones set activo = false where id = p_org;
  elsif p_accion = 'activar' then update public.organizaciones set activo = true where id = p_org;
  elsif p_accion = 'mas30' then update public.organizaciones set activo = true, activo_hasta = greatest(now(), coalesce(activo_hasta, now())) + interval '30 days' where id = p_org;
  else raise exception 'ACCION_INVALIDA';
  end if;
  begin
    insert into public.auditoria(accion, detalle, modulo) values ('SUPERADMIN_ORG_' || upper(p_accion), o.slug, 'Multiempresa');
  exception when others then null;
  end;
  select * into o from public.organizaciones where id = p_org;
  return jsonb_build_object('ok', true, 'activo', o.activo, 'activo_hasta', o.activo_hasta, 'aprobado', o.aprobado);
end $fn$;
revoke execute on function public.superadmin_org_accion(uuid, text) from public, anon;
grant execute on function public.superadmin_org_accion(uuid, text) to authenticated;
