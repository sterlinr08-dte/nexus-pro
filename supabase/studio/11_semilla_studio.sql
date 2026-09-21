-- STUDIO · semilla mínima para arrancar el POS (aplicar después de 10).
-- Sin secretos. El usuario de Supabase Auth se crea aparte (ver 12_admin_auth.template.sql).
--
-- El id de la organización es FIJO y coincide con la fila slug='studio' en la base madre
-- y con el uuid que usan las funciones contables de 06_funciones.sql.

-- 1) Organización (inquilina de ESTA base: sin dominio ni SSO aquí; eso vive en la base madre).
insert into public.organizaciones (id, slug, nombre, tipo, color, activo)
values ('e404d1c4-24c5-4e17-88f6-84bef09d6d19', 'studio', 'STUDIO', 'tienda', '#1d4ed8', true)
on conflict (slug) do update set nombre=excluded.nombre, tipo=excluded.tipo, activo=true;

-- 2) Usuario administrador (registro de negocio; el login real lo hace Supabase Auth + profiles).
insert into public.usuarios_sistema (id, nom, cargo, login, rol, activo, organizacion_id, es_superadmin, creado_por)
values ('a1b2c3d4-0000-4000-8000-000000005701'::uuid, 'ADMINISTRADOR STUDIO', 'Administrador', 'admin', 'admin', true,
        'e404d1c4-24c5-4e17-88f6-84bef09d6d19', false, 'setup')
on conflict (id) do nothing;

-- 3) Configuración POS (mismos valores iniciales que Bayolsale; se ajustan en Ajustes del POS).
insert into public.pos_config (organizacion_id, prefijo_contado, prefijo_credito, mora_pct, mora_dias_gracia, garantia_rep_dias)
values ('e404d1c4-24c5-4e17-88f6-84bef09d6d19', 'CO', 'CR', 0, 0, 0)
on conflict (organizacion_id) do nothing;

-- 4) Almacén principal.
insert into public.pos_almacenes (organizacion_id, nombre, es_principal, activo)
select 'e404d1c4-24c5-4e17-88f6-84bef09d6d19', 'Almacén Principal', true, true
where not exists (select 1 from public.pos_almacenes where organizacion_id='e404d1c4-24c5-4e17-88f6-84bef09d6d19' and es_principal);

-- 5) Secuencias de documentos (mismo catálogo que Bayolsale, todas desde 1).
insert into public.pos_secuencias (organizacion_id, tipo, nombre, prefijo, longitud, proximo, activo) values
  ('e404d1c4-24c5-4e17-88f6-84bef09d6d19','factura_contado','Factura contado','CO',8,1,true),
  ('e404d1c4-24c5-4e17-88f6-84bef09d6d19','factura_credito','Factura crédito','CR',8,1,true),
  ('e404d1c4-24c5-4e17-88f6-84bef09d6d19','custom_venta_al_contado','VENTA AL CONTADO','CO',5,1,true),
  ('e404d1c4-24c5-4e17-88f6-84bef09d6d19','custom_venta_credito','VENTA CREDITO','CR',5,1,true),
  ('e404d1c4-24c5-4e17-88f6-84bef09d6d19','cotizacion','Cotización','COT-',5,1,true),
  ('e404d1c4-24c5-4e17-88f6-84bef09d6d19','nota_credito','Nota de crédito / Devolución','NC-',5,1,true),
  ('e404d1c4-24c5-4e17-88f6-84bef09d6d19','transferencia','Transferencia / Despacho','TR-',5,1,true),
  ('e404d1c4-24c5-4e17-88f6-84bef09d6d19','nomina','Nómina','NOM-',5,1,true),
  ('e404d1c4-24c5-4e17-88f6-84bef09d6d19','recibo','Recibo de abono','REC-',5,1,true),
  ('e404d1c4-24c5-4e17-88f6-84bef09d6d19','pago_prov','Pago a proveedor','PG-',5,1,true),
  ('e404d1c4-24c5-4e17-88f6-84bef09d6d19','asiento','Asiento contable','AS-',5,1,true),
  ('e404d1c4-24c5-4e17-88f6-84bef09d6d19','crm','Oportunidad (CRM)','OP-',5,1,true)
on conflict (organizacion_id, tipo) do nothing;

-- 6) Plan de cuentas operativo: 9 cuentas vía la función del sistema + la 4103 (mora) que esa función no crea.
select public.pos_asegurar_cuentas_operativas('e404d1c4-24c5-4e17-88f6-84bef09d6d19');
insert into public.pos_cuentas (organizacion_id, codigo, nombre, tipo, naturaleza, activo)
values ('e404d1c4-24c5-4e17-88f6-84bef09d6d19', '4103', 'Recargos por mora', 'ingreso', 'acreedora', true)
on conflict (organizacion_id, codigo) do nothing;

-- NO se siembran secuencias NCF (pos_ncf_secuencias): el rango B01/B02 lo aporta el cliente según su
-- autorización de la DGII y se carga desde Ajustes del POS.
