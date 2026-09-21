-- STUDIO — 08 RLS y políticas
-- Todas las 65 tablas del set tienen relrowsecurity = true en la base madre (ninguna con FORCE).
-- 79 políticas reconstruidas desde pg_policies (permissive/cmd/roles/qual/with_check).
-- Requiere 02_helpers.sql (mi_rol, mi_organizacion, mi_usuario_id).
--
-- ATENCIÓN (flags para el dueño):
--  * all_agentes, org_bancos, all_recibo_contador, all_secuencias_ncf comparan mi_organizacion() con la
--    organización de slug 'nexus-pro' en la madre. Para STUDIO el literal ya se sustituyó por 'studio' (ver README).
--  * mias_usuario_preferencias depende de mi_usuario_id() (incluida en 02_helpers.sql).

-- ---------------------------------------------------------------- enable RLS
alter table public.organizaciones enable row level security;
alter table public.usuarios_sistema enable row level security;
alter table public.profiles enable row level security;
alter table public.agentes enable row level security;
alter table public.bancos enable row level security;
alter table public.auditoria enable row level security;
alter table public.secuencias_ncf enable row level security;
alter table public.recibo_contador enable row level security;
alter table public.usuario_preferencias enable row level security;
alter table public.pos_abonos enable row level security;
alter table public.pos_acceso enable row level security;
alter table public.pos_almacenes enable row level security;
alter table public.pos_apartado_pagos enable row level security;
alter table public.pos_apartados enable row level security;
alter table public.pos_asiento_lineas enable row level security;
alter table public.pos_asientos enable row level security;
alter table public.pos_banco_conciliaciones enable row level security;
alter table public.pos_banco_extractos enable row level security;
alter table public.pos_banco_movimientos enable row level security;
alter table public.pos_caja_movimientos enable row level security;
alter table public.pos_cajas enable row level security;
alter table public.pos_categorias enable row level security;
alter table public.pos_clientes enable row level security;
alter table public.pos_compra_items enable row level security;
alter table public.pos_compra_pagos enable row level security;
alter table public.pos_compras enable row level security;
alter table public.pos_config enable row level security;
alter table public.pos_cotizacion_items enable row level security;
alter table public.pos_cotizaciones enable row level security;
alter table public.pos_credito_eventos enable row level security;
alter table public.pos_crm enable row level security;
alter table public.pos_cuentas enable row level security;
alter table public.pos_cuentas_bancarias enable row level security;
alter table public.pos_devolucion_items enable row level security;
alter table public.pos_devoluciones enable row level security;
alter table public.pos_documento_eventos enable row level security;
alter table public.pos_documentos enable row level security;
alter table public.pos_fin_cuotas enable row level security;
alter table public.pos_fin_pagos enable row level security;
alter table public.pos_financiamientos enable row level security;
alter table public.pos_inv_movimientos enable row level security;
alter table public.pos_ncf_secuencias enable row level security;
alter table public.pos_niveles_precio enable row level security;
alter table public.pos_periodos_contables enable row level security;
alter table public.pos_prefacturas enable row level security;
alter table public.pos_producto_niveles enable row level security;
alter table public.pos_productos enable row level security;
alter table public.pos_proveedores enable row level security;
alter table public.pos_reparacion_piezas enable row level security;
alter table public.pos_reparaciones enable row level security;
alter table public.pos_secuencias enable row level security;
alter table public.pos_seriales enable row level security;
alter table public.pos_stock_almacen enable row level security;
alter table public.pos_transferencia_item_seriales enable row level security;
alter table public.pos_transferencia_items enable row level security;
alter table public.pos_transferencias enable row level security;
alter table public.pos_vendedores enable row level security;
alter table public.pos_venta_items enable row level security;
alter table public.pos_ventas enable row level security;
alter table public.pos_ventas_suspendidas enable row level security;
alter table public.rrhh_empleados enable row level security;
alter table public.rrhh_nomina_lineas enable row level security;
alter table public.rrhh_nominas enable row level security;
alter table public.saas_pagos enable row level security;
alter table public.saas_suscripciones enable row level security;

-- ---------------------------------------------------------------- políticas
create policy all_agentes on public.agentes as permissive for all to authenticated using (((mi_rol() IS NOT NULL) AND (mi_organizacion() = ( SELECT organizaciones.id
   FROM organizaciones
  WHERE (organizaciones.slug = 'studio'::text))))) with check (((mi_rol() IS NOT NULL) AND (mi_organizacion() = ( SELECT organizaciones.id
   FROM organizaciones
  WHERE (organizaciones.slug = 'studio'::text)))));
create policy auditoria_por_org on public.auditoria as permissive for all to authenticated using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion())));
create policy org_bancos on public.bancos as permissive for all to authenticated using (((mi_rol() IS NOT NULL) AND (mi_organizacion() = ( SELECT organizaciones.id
   FROM organizaciones
  WHERE (organizaciones.slug = 'studio'::text))))) with check (((mi_rol() IS NOT NULL) AND (mi_organizacion() = ( SELECT organizaciones.id
   FROM organizaciones
  WHERE (organizaciones.slug = 'studio'::text)))));
create policy org_delete_admin on public.organizaciones as permissive for delete to authenticated using ((mi_rol() = 'admin'::text));
create policy org_insert_admin on public.organizaciones as permissive for insert to authenticated with check ((mi_rol() = 'admin'::text));
create policy org_lectura_publica on public.organizaciones as permissive for select to public using (true);
create policy org_update_admin on public.organizaciones as permissive for update to authenticated using ((mi_rol() = 'admin'::text)) with check ((mi_rol() = 'admin'::text));
create policy pos_abonos_admin on public.pos_abonos as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_acceso_admin on public.pos_acceso as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_alm_admin on public.pos_almacenes as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_apap_admin on public.pos_apartado_pagos as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_apa_admin on public.pos_apartados as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_aslin_admin on public.pos_asiento_lineas as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_asientos_admin on public.pos_asientos as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_banco_conc_select on public.pos_banco_conciliaciones as permissive for select to authenticated using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion())));
create policy pos_banco_conc_write on public.pos_banco_conciliaciones as permissive for all to authenticated using (((mi_rol() = ANY (ARRAY['admin'::text, 'gerente'::text])) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() = ANY (ARRAY['admin'::text, 'gerente'::text])) AND (organizacion_id = mi_organizacion())));
create policy pos_banco_ext_select on public.pos_banco_extractos as permissive for select to authenticated using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion())));
create policy pos_banco_ext_write on public.pos_banco_extractos as permissive for all to authenticated using (((mi_rol() = ANY (ARRAY['admin'::text, 'gerente'::text])) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() = ANY (ARRAY['admin'::text, 'gerente'::text])) AND (organizacion_id = mi_organizacion())));
create policy pos_banco_mov_select on public.pos_banco_movimientos as permissive for select to authenticated using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion())));
create policy pos_banco_mov_write on public.pos_banco_movimientos as permissive for all to authenticated using (((mi_rol() = ANY (ARRAY['admin'::text, 'gerente'::text])) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() = ANY (ARRAY['admin'::text, 'gerente'::text])) AND (organizacion_id = mi_organizacion())));
create policy pos_caja_mov_admin on public.pos_caja_movimientos as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_cajas_admin on public.pos_cajas as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_categorias_admin on public.pos_categorias as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_clientes_admin on public.pos_clientes as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_compra_items_admin on public.pos_compra_items as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_compra_pagos_delete on public.pos_compra_pagos as permissive for delete to authenticated using (((mi_rol() = ANY (ARRAY['admin'::text, 'gerente'::text])) AND (organizacion_id = mi_organizacion())));
create policy pos_compra_pagos_insert on public.pos_compra_pagos as permissive for insert to authenticated with check (((mi_rol() = ANY (ARRAY['admin'::text, 'gerente'::text, 'cajero'::text])) AND (organizacion_id = mi_organizacion())));
create policy pos_compra_pagos_select on public.pos_compra_pagos as permissive for select to authenticated using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion())));
create policy pos_compra_pagos_update on public.pos_compra_pagos as permissive for update to authenticated using (((mi_rol() = ANY (ARRAY['admin'::text, 'gerente'::text])) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() = ANY (ARRAY['admin'::text, 'gerente'::text])) AND (organizacion_id = mi_organizacion())));
create policy pos_compras_admin on public.pos_compras as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_config_org on public.pos_config as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_cotiz_items_admin on public.pos_cotizacion_items as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_cotiz_admin on public.pos_cotizaciones as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_credito_eventos_insert on public.pos_credito_eventos as permissive for insert to authenticated with check (((mi_rol() = ANY (ARRAY['admin'::text, 'gerente'::text, 'cajero'::text])) AND (organizacion_id = mi_organizacion())));
create policy pos_credito_eventos_select on public.pos_credito_eventos as permissive for select to authenticated using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion())));
create policy pos_crm_admin on public.pos_crm as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_cuentas_admin on public.pos_cuentas as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_cuentas_bancarias_select on public.pos_cuentas_bancarias as permissive for select to authenticated using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion())));
create policy pos_cuentas_bancarias_write on public.pos_cuentas_bancarias as permissive for all to authenticated using (((mi_rol() = ANY (ARRAY['admin'::text, 'gerente'::text])) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() = ANY (ARRAY['admin'::text, 'gerente'::text])) AND (organizacion_id = mi_organizacion())));
create policy pos_dev_items_admin on public.pos_devolucion_items as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_dev_admin on public.pos_devoluciones as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_documento_eventos_admin on public.pos_documento_eventos as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_documentos_admin on public.pos_documentos as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_fin_cuotas_tenant on public.pos_fin_cuotas as permissive for all to authenticated using (((organizacion_id = mi_organizacion()) AND (mi_rol() IS NOT NULL))) with check (((organizacion_id = mi_organizacion()) AND (mi_rol() IS NOT NULL)));
create policy pos_fin_pagos_insert on public.pos_fin_pagos as permissive for insert to authenticated with check (((mi_rol() = ANY (ARRAY['admin'::text, 'gerente'::text, 'cajero'::text])) AND (organizacion_id = mi_organizacion())));
create policy pos_fin_pagos_select on public.pos_fin_pagos as permissive for select to authenticated using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion())));
create policy pos_financiamientos_tenant on public.pos_financiamientos as permissive for all to authenticated using (((organizacion_id = mi_organizacion()) AND (mi_rol() IS NOT NULL))) with check (((organizacion_id = mi_organizacion()) AND (mi_rol() IS NOT NULL)));
create policy pos_invmov_admin on public.pos_inv_movimientos as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_ncf_admin on public.pos_ncf_secuencias as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_niveles_precio_admin on public.pos_niveles_precio as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_periodos_admin on public.pos_periodos_contables as permissive for all to authenticated using (((mi_rol() = 'admin'::text) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() = 'admin'::text) AND (organizacion_id = mi_organizacion())));
create policy pos_pref_admin on public.pos_prefacturas as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_producto_niveles_admin on public.pos_producto_niveles as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_productos_admin on public.pos_productos as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_prov_admin on public.pos_proveedores as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_rep_piezas_select on public.pos_reparacion_piezas as permissive for select to authenticated using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion())));
create policy pos_rep_piezas_write on public.pos_reparacion_piezas as permissive for all to authenticated using (((mi_rol() = ANY (ARRAY['admin'::text, 'gerente'::text, 'cajero'::text])) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() = ANY (ARRAY['admin'::text, 'gerente'::text, 'cajero'::text])) AND (organizacion_id = mi_organizacion())));
create policy pos_rep_admin on public.pos_reparaciones as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_sec_admin on public.pos_secuencias as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_seriales_admin on public.pos_seriales as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_stkalm_admin on public.pos_stock_almacen as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_transf_item_seriales_admin on public.pos_transferencia_item_seriales as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_transf_items_admin on public.pos_transferencia_items as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_transf_admin on public.pos_transferencias as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_vendedores_admin on public.pos_vendedores as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_venta_items_admin on public.pos_venta_items as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_ventas_admin on public.pos_ventas as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy pos_venta_susp_admin on public.pos_ventas_suspendidas as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy profiles_self_read on public.profiles as permissive for select to authenticated using ((id = auth.uid()));
create policy profiles_self_update on public.profiles as permissive for update to authenticated using ((id = auth.uid())) with check ((id = auth.uid()));
create policy all_recibo_contador on public.recibo_contador as permissive for all to public using (((mi_rol() IS NOT NULL) AND (mi_organizacion() = ( SELECT organizaciones.id
   FROM organizaciones
  WHERE (organizaciones.slug = 'studio'::text))))) with check (((mi_rol() IS NOT NULL) AND (mi_organizacion() = ( SELECT organizaciones.id
   FROM organizaciones
  WHERE (organizaciones.slug = 'studio'::text)))));
create policy rrhh_empleados_admin on public.rrhh_empleados as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy rrhh_nlin_admin on public.rrhh_nomina_lineas as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy rrhh_nominas_admin on public.rrhh_nominas as permissive for all to public using (((mi_rol() IS NOT NULL) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() IS NOT NULL) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy saas_pagos_admin on public.saas_pagos as permissive for all to public using (((mi_rol() = 'admin'::text) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() = 'admin'::text) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy saas_sus_admin on public.saas_suscripciones as permissive for all to public using (((mi_rol() = 'admin'::text) AND (organizacion_id = mi_organizacion()))) with check (((mi_rol() = 'admin'::text) AND ((organizacion_id IS NULL) OR (organizacion_id = mi_organizacion()))));
create policy all_secuencias_ncf on public.secuencias_ncf as permissive for all to authenticated using (((mi_rol() IS NOT NULL) AND (mi_organizacion() = ( SELECT organizaciones.id
   FROM organizaciones
  WHERE (organizaciones.slug = 'studio'::text))))) with check (((mi_rol() IS NOT NULL) AND (mi_organizacion() = ( SELECT organizaciones.id
   FROM organizaciones
  WHERE (organizaciones.slug = 'studio'::text)))));
create policy mias_usuario_preferencias on public.usuario_preferencias as permissive for all to authenticated using ((usuario_id = mi_usuario_id())) with check ((usuario_id = mi_usuario_id()));
create policy all_usuarios_sistema on public.usuarios_sistema as permissive for all to authenticated using ((mi_rol() = 'admin'::text)) with check ((mi_rol() = 'admin'::text));
