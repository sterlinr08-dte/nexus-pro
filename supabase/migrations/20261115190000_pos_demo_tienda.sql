-- Empresa de demostración del POS (15-nov-2026). Datos 100 % ficticios. Sin IA ni WhatsApp (regla del dueño).
-- La empresa y su usuario son fijos; `demo_reiniciar()` borra todo lo de esa empresa y vuelve a sembrar los
-- datos de ejemplo. Corre cada noche (03:00 RD). Nadie conoce la clave del usuario: la entrada es por la
-- Edge Function `demo-entrar`, que entrega una sesión ya iniciada.

insert into public.organizaciones (id, slug, nombre, tipo, color, activo)
values ('de300000-0000-4000-8000-000000000001', 'demo', 'Tienda Demo', 'tienda', '#1d4ed8', true)
on conflict (id) do nothing;

insert into public.usuarios_sistema (id, nom, cargo, login, rol, activo, organizacion_id, es_superadmin, creado_por)
values ('de300000-0000-4000-8000-000000000002', 'Visitante Demo', 'Demostración', 'demo', 'gerente', true,
        'de300000-0000-4000-8000-000000000001', false, 'setup')
on conflict (id) do nothing;

do $$
declare v_uid uuid := 'de300000-0000-4000-8000-000000000003';
begin
  if not exists (select 1 from auth.users where id = v_uid) then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current, is_sso_user)
    values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', 'demo@nexus-pro.local',
      extensions.crypt(gen_random_uuid()::text || gen_random_uuid()::text, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '', '', false);
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_uid, v_uid::text,
      jsonb_build_object('sub', v_uid::text, 'email', 'demo@nexus-pro.local', 'email_verified', true), 'email', now(), now(), now());
  end if;
  insert into public.profiles (id, usuario_sistema_id, login, nom, rol, activo, must_change_password)
  values (v_uid, 'de300000-0000-4000-8000-000000000002', 'demo', 'Visitante Demo', 'gerente', true, false)
  on conflict (id) do nothing;
end $$;

create or replace function public.demo_reiniciar()
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare
  v_org constant uuid := 'de300000-0000-4000-8000-000000000001';
  v_alm uuid; t record; v_pasada int; v_falta boolean; v_borradas int := 0; n int;
begin
  -- 1) Borrar todo lo de la empresa demo (nunca de otra): cada tabla filtra por su organizacion_id.
  for v_pasada in 1..6 loop
    v_falta := false;
    for t in select c.relname from pg_class c join pg_namespace s on s.oid = c.relnamespace
             where s.nspname = 'public' and c.relkind = 'r' and c.relname not in ('organizaciones', 'usuarios_sistema')
               and exists (select 1 from information_schema.columns k where k.table_schema = 'public' and k.table_name = c.relname and k.column_name = 'organizacion_id')
    loop
      begin
        execute format('delete from public.%I where organizacion_id = $1', t.relname) using v_org;
        get diagnostics n = row_count; v_borradas := v_borradas + n;
      exception when others then v_falta := true;
      end;
    end loop;
    exit when not v_falta;
  end loop;
  if v_falta then raise exception 'DEMO_REINICIO_INCOMPLETO'; end if;

  -- 2) Sembrar los datos de ejemplo.
  insert into public.pos_config (organizacion_id, prefijo_contado, prefijo_credito, mora_pct, mora_dias_gracia, garantia_rep_dias,
    emp_nombre, emp_rnc, emp_tel, emp_dir, ticket_pie, modulos_off)
  values (v_org, 'CO', 'CR', 0, 0, 0, 'Tienda Demo', null, '809-555-0100', 'Av. Principal 123, Santiago',
    'Datos de demostración. ¡Gracias por probar NEXUS PRO!', '["ia","reparaciones","whatsapp","entidades","crm","rrhh","cuotas","apartados"]'::jsonb);

  insert into public.pos_almacenes (organizacion_id, nombre, es_principal, activo) values (v_org, 'Almacén Principal', true, true) returning id into v_alm;

  insert into public.pos_secuencias (organizacion_id, tipo, nombre, prefijo, longitud, proximo, activo) values
    (v_org,'factura_contado','Factura contado','CO',8,1,true),
    (v_org,'factura_credito','Factura crédito','CR',8,1,true),
    (v_org,'cotizacion','Cotización','COT-',5,1,true),
    (v_org,'prefactura','Prefactura','PF-',5,1,true),
    (v_org,'nota_credito','Nota de crédito / Devolución','NC-',5,1,true),
    (v_org,'transferencia','Transferencia / Despacho','TR-',5,1,true),
    (v_org,'nomina','Nómina','NOM-',5,1,true),
    (v_org,'recibo','Recibo de abono','REC-',5,1,true),
    (v_org,'pago_prov','Pago a proveedor','PG-',5,1,true),
    (v_org,'asiento','Asiento contable','AS-',5,1,true),
    (v_org,'crm','Oportunidad (CRM)','OP-',5,1,true);

  insert into public.pos_cuentas (organizacion_id, codigo, nombre, tipo, naturaleza, activo) values
    (v_org,'1101','Caja','activo','deudora',true),(v_org,'1102','Banco','activo','deudora',true),
    (v_org,'1103','Cuentas por cobrar (clientes)','activo','deudora',true),(v_org,'1104','Inventario de mercancías','activo','deudora',true),
    (v_org,'1105','ITBIS pagado (adelantado)','activo','deudora',true),(v_org,'2101','Cuentas por pagar (proveedores)','pasivo','acreedora',true),
    (v_org,'2102','ITBIS por pagar','pasivo','acreedora',true),(v_org,'2103','Sueldos por pagar','pasivo','acreedora',true),
    (v_org,'2104','Retenciones por pagar (TSS/ISR)','pasivo','acreedora',true),(v_org,'2105','Notas de crédito por aplicar','pasivo','acreedora',true),
    (v_org,'3101','Capital','capital','acreedora',true),(v_org,'3102','Resultados acumulados','capital','acreedora',true),
    (v_org,'4101','Ventas','ingreso','acreedora',true),(v_org,'4102','Otros ingresos','ingreso','acreedora',true),
    (v_org,'4103','Ingresos por mora','ingreso','acreedora',true),(v_org,'5101','Costo de mercancía vendida','costo','deudora',true),
    (v_org,'6101','Sueldos y salarios','gasto','deudora',true),(v_org,'6102','Alquiler','gasto','deudora',true),
    (v_org,'6103','Servicios (luz, agua, internet)','gasto','deudora',true),(v_org,'6104','Gastos varios','gasto','deudora',true);

  insert into public.pos_categorias (organizacion_id, nombre, orden) values
    (v_org,'Bebidas',1),(v_org,'Alimentos',2),(v_org,'Limpieza',3),(v_org,'Cuidado personal',4),(v_org,'Servicios',5);

  insert into public.pos_productos (organizacion_id, nombre, codigo, categoria_id, precio, costo, stock, stock_min, itbis, activo, tipo, favorito)
  select v_org, x.nombre, x.codigo, (select id from public.pos_categorias c where c.organizacion_id = v_org and c.nombre = x.cat),
         x.precio, x.costo, x.stock, 5, x.itbis, true, x.tipo, x.fav
  from (values
    ('Agua purificada 500 ml','DEMO-001','Bebidas',25,14,120,true,'producto',true),
    ('Refresco de cola 2 L','DEMO-002','Bebidas',110,78,48,true,'producto',true),
    ('Jugo de naranja 1 L','DEMO-003','Bebidas',95,66,30,true,'producto',false),
    ('Café molido 1 lb','DEMO-004','Alimentos',260,190,25,false,'producto',true),
    ('Arroz selecto 5 lb','DEMO-005','Alimentos',185,150,60,false,'producto',true),
    ('Aceite vegetal 1 L','DEMO-006','Alimentos',240,195,36,false,'producto',false),
    ('Azúcar crema 2 lb','DEMO-007','Alimentos',85,64,50,false,'producto',false),
    ('Galletas surtidas','DEMO-008','Alimentos',60,38,80,true,'producto',false),
    ('Detergente en polvo 1 kg','DEMO-009','Limpieza',165,118,40,true,'producto',false),
    ('Cloro 1 galón','DEMO-010','Limpieza',130,88,32,true,'producto',false),
    ('Papel higiénico 4 rollos','DEMO-011','Limpieza',150,108,45,true,'producto',true),
    ('Jabón de baño 3 unidades','DEMO-012','Cuidado personal',120,82,55,true,'producto',false),
    ('Pasta dental 100 ml','DEMO-013','Cuidado personal',135,96,38,true,'producto',false),
    ('Champú 400 ml','DEMO-014','Cuidado personal',295,210,6,true,'producto',false),
    ('Desodorante en barra','DEMO-015','Cuidado personal',210,150,3,true,'producto',false),
    ('Entrega a domicilio','DEMO-016','Servicios',100,0,0,true,'servicio',true)
  ) as x(nombre, codigo, cat, precio, costo, stock, itbis, tipo, fav);

  insert into public.pos_stock_almacen (organizacion_id, producto_id, almacen_id, stock)
  select v_org, p.id, v_alm, p.stock from public.pos_productos p where p.organizacion_id = v_org and p.tipo = 'producto';

  insert into public.pos_clientes (organizacion_id, nombre, cedula, telefono, direccion, limite_credito, activo, es_cliente, tipo_persona, acepta_whatsapp) values
    (v_org,'María Ejemplo Pérez',null,'809-555-0111','Calle 1 #10, Santiago',5000,true,true,'fisica',false),
    (v_org,'José Muestra Rodríguez',null,'809-555-0122','Calle 2 #20, Santiago',0,true,true,'fisica',false),
    (v_org,'Colmado La Esquina (ejemplo)',null,'809-555-0133','Av. Central 45, Santiago',20000,true,true,'juridica',false),
    (v_org,'Ana Prueba Gómez',null,'809-555-0144','Calle 3 #30, Moca',3000,true,true,'fisica',false),
    (v_org,'Ferretería Demo SRL (ejemplo)',null,'809-555-0155','Carretera Duarte km 5',50000,true,true,'juridica',false);

  return jsonb_build_object('borradas', v_borradas, 'productos', (select count(*) from public.pos_productos where organizacion_id = v_org),
    'clientes', (select count(*) from public.pos_clientes where organizacion_id = v_org));
end $fn$;

revoke execute on function public.demo_reiniciar() from public, anon, authenticated;

select public.demo_reiniciar();

select cron.unschedule('demo-reiniciar-nocturno') where exists (select 1 from cron.job where jobname = 'demo-reiniciar-nocturno');
select cron.schedule('demo-reiniciar-nocturno', '0 7 * * *', $$select public.demo_reiniciar()$$);
