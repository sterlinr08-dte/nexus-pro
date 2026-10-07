-- Prueba de 20261007120000_pos_fiado_abono_servidor.sql en la base real SIN dejar nada: todo va en un solo bloque
-- que termina en error a propósito (RESULTADOS_QA…), así la migración, el cliente y la venta de prueba se deshacen.
-- El mensaje del error trae los resultados. Usuario simulado: el admin de Bayolsale. Venta con número -999999
-- (explícito, para no gastar un número de la secuencia de ventas).
do $qa$
declare r jsonb; r2 jsonb; r3 jsonb; out text := ''; n int; ok boolean; t text;
  op uuid := '33333333-3333-4333-8333-333333333333';
begin
  execute $m0$set local lock_timeout = '5s'$m0$;
  execute $m1$create or replace function public.nx_fin_privilegiado() returns boolean language sql stable set search_path = public
as $$ select auth.uid() is null or coalesce(current_setting('nx.fin_rpc', true), '') = '1' $$$m1$;
  execute $m2$create or replace function public.pos_fiado__caja_mia() returns uuid language sql stable set search_path = public
as $$ select id from public.pos_cajas
       where estado = 'abierta' and usuario_id = auth.uid() and organizacion_id = public.mi_organizacion()
       order by apertura desc limit 1 $$$m2$;
  execute $m3$create or replace function public.pos_fiado__sec(p_org uuid, p_tipo text) returns text language sql set search_path = public
as $$ update public.pos_secuencias set proximo = proximo + 1
       where id = (select id from public.pos_secuencias where organizacion_id = p_org and tipo = p_tipo and activo is distinct from false
                   order by created_at limit 1)
       returning coalesce(prefijo, '') || lpad((proximo - 1)::text, greatest(coalesce(longitud, 5), length((proximo - 1)::text)), '0') $$$m3$;
  execute $m4$create or replace function public.pos_fiado__asiento(p_org uuid, p_fecha date, p_concepto text, p_ref text, p_origen uuid, p_lineas jsonb)
returns uuid language plpgsql set search_path = public as $$
declare v_id uuid; l jsonb; v_cta record; v_d numeric := 0; v_h numeric := 0;
begin
  for l in select * from jsonb_array_elements(p_lineas) loop
    if not exists (select 1 from public.pos_cuentas where organizacion_id = p_org and codigo = l->>'cod') then return null; end if;
    v_d := v_d + coalesce((l->>'d')::numeric, 0); v_h := v_h + coalesce((l->>'h')::numeric, 0);
  end loop;
  if round(v_d, 2) <> round(v_h, 2) or v_d = 0 then raise exception 'FIADO_ASIENTO_DESCUADRADO'; end if;
  insert into public.pos_asientos (organizacion_id, fecha, concepto, referencia, tipo, origen_id, numero)
  values (p_org, p_fecha, p_concepto, p_ref, 'cobro', p_origen, public.pos_fiado__sec(p_org, 'asiento'))
  returning id into v_id;
  for l in select * from jsonb_array_elements(p_lineas) loop
    if coalesce((l->>'d')::numeric, 0) = 0 and coalesce((l->>'h')::numeric, 0) = 0 then continue; end if;
    select id, codigo, nombre into v_cta from public.pos_cuentas where organizacion_id = p_org and codigo = l->>'cod' limit 1;
    insert into public.pos_asiento_lineas (organizacion_id, asiento_id, cuenta_id, cuenta_codigo, cuenta_nombre, descripcion, debito, credito)
    values (p_org, v_id, v_cta.id, v_cta.codigo, v_cta.nombre, l->>'desc', coalesce((l->>'d')::numeric, 0), coalesce((l->>'h')::numeric, 0));
  end loop;
  return v_id;
end $$$m4$;
  execute $m5$create or replace function public.pos_fiado_saldo_cliente(p_cliente_id uuid) returns numeric language sql stable set search_path = public as $$
  select round(coalesce((select sum(v.credito_monto) from public.pos_ventas v
                          where v.cliente_id = p_cliente_id and v.organizacion_id = public.mi_organizacion()
                            and coalesce(v.credito_monto, 0) > 0 and v.estado is distinct from 'anulada'), 0)
             - coalesce((select sum(a.monto) from public.pos_abonos a
                          where a.cliente_id = p_cliente_id and a.organizacion_id = public.mi_organizacion()), 0), 2)
$$$m5$;
  execute $m6$alter table public.pos_abonos add column if not exists operacion_id uuid$m6$;
  execute $m7$alter table public.pos_abonos add column if not exists anula_id uuid references public.pos_abonos(id)$m7$;
  execute $m8$create unique index if not exists pos_abonos_operacion_uidx on public.pos_abonos (organizacion_id, operacion_id) where operacion_id is not null$m8$;
  execute $m9$create unique index if not exists pos_abonos_anula_id_uq on public.pos_abonos (anula_id) where anula_id is not null$m9$;
  execute $m10$do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'pos_abonos_centavos_chk') then
    alter table public.pos_abonos add constraint pos_abonos_centavos_chk check (monto = round(monto, 2));
  end if;
end $$$m10$;
  execute $m11$create or replace function public.pos_fiado_registrar_abono(
  p_cliente_id uuid, p_monto numeric, p_metodo text default 'Efectivo', p_nota text default null,
  p_fecha date default null, p_operacion_id uuid default null, p_created_by_name text default null,
  p_es_cuota boolean default false, p_mora numeric default 0, p_origen_id uuid default null)
returns jsonb language plpgsql set search_path = public set timezone = 'America/Santo_Domingo' as $$
declare v_org uuid := public.mi_organizacion(); v_rol text := public.mi_rol(); v_cli record; v_monto numeric := round(p_monto, 2);
  v_mora numeric := least(greatest(round(coalesce(p_mora, 0), 2), 0), round(p_monto, 2)); v_saldo numeric;
  v_fecha date := current_date; v_met text := coalesce(nullif(trim(p_metodo), ''), 'Efectivo'); v_efe boolean;
  v_caja uuid; v_num text; v_id uuid; v_prev record; v_cod_mora text;
begin
  perform set_config('nx.fin_rpc', '1', true);
  if v_rol is null or v_org is null then raise exception 'FIADO_SIN_PERMISO'; end if;
  if p_operacion_id is not null then
    select id, numero into v_prev from public.pos_abonos where organizacion_id = v_org and operacion_id = p_operacion_id;
    if v_prev.id is not null then perform set_config('nx.fin_rpc', '', true); return jsonb_build_object('ok', true, 'id', v_prev.id, 'numero', v_prev.numero, 'repetido', true); end if;
  end if;
  if v_monto is null or v_monto <= 0 then raise exception 'FIADO_MONTO_INVALIDO'; end if;
  select id, nombre into v_cli from public.pos_clientes where id = p_cliente_id and organizacion_id = v_org for update;
  if v_cli.id is null then raise exception 'FIADO_CLIENTE_NO_ENCONTRADO'; end if;
  v_saldo := public.pos_fiado_saldo_cliente(p_cliente_id);
  if not p_es_cuota and v_monto > v_saldo then raise exception 'FIADO_EXCEDE_SALDO' using detail = format('saldo %s, abono %s', v_saldo, v_monto); end if;
  if p_fecha is not null and p_fecha <> current_date then
    if v_rol not in ('admin', 'gerente') or p_fecha > current_date then raise exception 'FIADO_FECHA_SOLO_ADMIN'; end if;
    v_fecha := p_fecha;
  end if;
  v_efe := v_met ilike '%efectivo%';
  if v_efe then
    v_caja := public.pos_fiado__caja_mia();
    if v_caja is null then raise exception 'FIADO_CAJA_CERRADA'; end if;
  end if;
  v_num := case when p_es_cuota then null else public.pos_fiado__sec(v_org, 'recibo') end;

  insert into public.pos_abonos (organizacion_id, cliente_id, monto, fecha, metodo, nota, numero, caja_id, created_by_name, operacion_id)
  values (v_org, p_cliente_id, v_monto, v_fecha, v_met, nullif(left(trim(coalesce(p_nota, '')), 300), ''), v_num, v_caja,
          nullif(trim(coalesce(p_created_by_name, '')), ''), p_operacion_id)
  returning id into v_id;

  -- Asiento igual al de la app: Debe Caja (efectivo) o Banco / Haber Cuentas por cobrar (+ mora como ingreso).
  v_cod_mora := case when exists (select 1 from public.pos_cuentas where organizacion_id = v_org and codigo = '4103') then '4103' else '4102' end;
  perform public.pos_fiado__asiento(v_org, v_fecha, 'Abono cliente ' || coalesce(v_cli.nombre, ''), v_num, coalesce(p_origen_id, v_id),
    jsonb_build_array(
      jsonb_build_object('cod', case when v_efe then '1101' else '1102' end, 'd', v_monto, 'h', 0, 'desc', case when v_efe then 'Entrada de efectivo' else 'Ingreso por medio electrónico' end),
      jsonb_build_object('cod', '1103', 'd', 0, 'h', v_monto - v_mora, 'desc', 'Abono a cuenta por cobrar'))
    || case when v_mora > 0 then jsonb_build_array(jsonb_build_object('cod', v_cod_mora, 'd', 0, 'h', v_mora, 'desc', 'Mora cobrada')) else '[]'::jsonb end);

  perform set_config('nx.fin_rpc', '', true);
  return jsonb_build_object('ok', true, 'id', v_id, 'numero', v_num, 'saldo', v_saldo - v_monto);
exception when unique_violation then
  if p_operacion_id is not null then
    select id, numero into v_prev from public.pos_abonos where organizacion_id = v_org and operacion_id = p_operacion_id;
    if v_prev.id is not null then perform set_config('nx.fin_rpc', '', true); return jsonb_build_object('ok', true, 'id', v_prev.id, 'numero', v_prev.numero, 'repetido', true); end if;
  end if;
  raise;
end $$$m11$;
  execute $m12$create or replace function public.pos_fiado_eliminar_abono(p_abono_id uuid) returns jsonb
language plpgsql set search_path = public set timezone = 'America/Santo_Domingo' as $$
declare v_org uuid := public.mi_organizacion(); v_ab record; v_cli record; v_efe boolean; v_caja uuid; v_id uuid; v_num text; v_quien text;
begin
  perform set_config('nx.fin_rpc', '1', true);
  if public.mi_rol() not in ('admin', 'gerente') then raise exception 'FIADO_ELIMINAR_SOLO_ADMIN'; end if;
  select * into v_ab from public.pos_abonos where id = p_abono_id and organizacion_id = v_org for update;
  if v_ab.id is null then raise exception 'FIADO_ABONO_NO_ENCONTRADO'; end if;
  if v_ab.monto <= 0 or v_ab.anula_id is not null then raise exception 'FIADO_ABONO_ES_ANULACION'; end if;
  if exists (select 1 from public.pos_abonos where anula_id = v_ab.id) then raise exception 'FIADO_ABONO_YA_ANULADO'; end if;
  select id, nombre into v_cli from public.pos_clientes where id = v_ab.cliente_id and organizacion_id = v_org;
  v_efe := coalesce(nullif(trim(v_ab.metodo), ''), 'Efectivo') ilike '%efectivo%';
  if v_efe then
    v_caja := public.pos_fiado__caja_mia();
    if v_caja is null then raise exception 'FIADO_CAJA_CERRADA'; end if;
  end if;
  select us.nom into v_quien from public.profiles pr join public.usuarios_sistema us on us.id = pr.usuario_sistema_id where pr.id = auth.uid() limit 1;
  v_num := 'ANUL-' || coalesce(v_ab.numero, substr(v_ab.id::text, 1, 8));
  insert into public.pos_abonos (organizacion_id, cliente_id, venta_id, monto, fecha, metodo, nota, numero, caja_id, created_by_name, anula_id)
  values (v_org, v_ab.cliente_id, v_ab.venta_id, -v_ab.monto, current_date, v_ab.metodo,
          'Anulación del abono ' || coalesce(v_ab.numero, '') || ' del ' || to_char(v_ab.fecha, 'DD/MM/YYYY'), v_num, v_caja, v_quien, v_ab.id)
  returning id into v_id;
  -- Asiento inverso del original (con sus mismas cuentas, incluida la mora si la hubo).
  perform public.pos_fiado__asiento(v_org, current_date, 'Anulación de abono ' || coalesce(v_cli.nombre, ''), v_num, v_id,
    coalesce((select jsonb_agg(jsonb_build_object('cod', l.cuenta_codigo, 'd', l.credito, 'h', l.debito, 'desc', 'Reversa: ' || coalesce(l.descripcion, '')))
                from public.pos_asiento_lineas l join public.pos_asientos a on a.id = l.asiento_id
               where a.organizacion_id = v_org and a.tipo = 'cobro' and a.origen_id = v_ab.id), '[]'::jsonb));
  perform set_config('nx.fin_rpc', '', true);
  return jsonb_build_object('ok', true, 'id', v_id, 'numero', v_num, 'monto', v_ab.monto);
end $$$m12$;
  execute $m13$create or replace function public.pos_abonos_aa_guard_directo() returns trigger language plpgsql set search_path = public as $$
begin
  if public.nx_fin_privilegiado() then return coalesce(new, old); end if;
  if tg_op = 'DELETE' and public.mi_rol() = 'admin' then return old; end if;   -- borrar datos de prueba (Ajustes)
  raise exception 'ABONO_SOLO_POR_SISTEMA' using detail = 'Los abonos se registran y anulan con sus botones (contabilidad incluida)';
end $$$m13$;
  execute $m14$drop trigger if exists pos_abonos_aa_guard_directo on public.pos_abonos$m14$;
  execute $m15$create trigger pos_abonos_aa_guard_directo before insert or update or delete on public.pos_abonos
  for each row execute function public.pos_abonos_aa_guard_directo()$m15$;
  execute $m16$create or replace function public.pos_asiento_aa_guard_cobro() returns trigger language plpgsql set search_path = public as $$
declare v_tipo text;
begin
  if public.nx_fin_privilegiado() then return coalesce(new, old); end if;
  if tg_table_name = 'pos_asientos' then
    if (tg_op <> 'INSERT' and old.tipo = 'cobro') or (tg_op <> 'DELETE' and new.tipo = 'cobro') then
      if tg_op = 'DELETE' and public.mi_rol() = 'admin' then return old; end if;
      raise exception 'ASIENTO_COBRO_SOLO_POR_SISTEMA' using detail = 'Los asientos de abonos se crean y anulan con el abono';
    end if;
  else
    select a.tipo into v_tipo from public.pos_asientos a where a.id = coalesce(new.asiento_id, old.asiento_id);
    if v_tipo = 'cobro' then
      if tg_op = 'DELETE' and public.mi_rol() = 'admin' then return old; end if;
      raise exception 'ASIENTO_COBRO_SOLO_POR_SISTEMA' using detail = 'Los asientos de abonos se crean y anulan con el abono';
    end if;
  end if;
  return coalesce(new, old);
end $$$m16$;
  execute $m17$drop trigger if exists pos_asiento_aa_guard_cobro on public.pos_asientos$m17$;
  execute $m18$create trigger pos_asiento_aa_guard_cobro before insert or update or delete on public.pos_asientos
  for each row execute function public.pos_asiento_aa_guard_cobro()$m18$;
  execute $m19$drop trigger if exists pos_asiento_aa_guard_cobro on public.pos_asiento_lineas$m19$;
  execute $m20$create trigger pos_asiento_aa_guard_cobro before insert or update or delete on public.pos_asiento_lineas
  for each row execute function public.pos_asiento_aa_guard_cobro()$m20$;
  execute $m21$revoke all on function public.pos_fiado_registrar_abono(uuid, numeric, text, text, date, uuid, text, boolean, numeric, uuid) from public, anon$m21$;
  execute $m22$revoke all on function public.pos_fiado_eliminar_abono(uuid) from public, anon$m22$;
  execute $m23$revoke all on function public.pos_fiado_saldo_cliente(uuid) from public, anon$m23$;
  execute $m24$revoke all on function public.pos_fiado__caja_mia() from public, anon$m24$;
  execute $m25$revoke all on function public.pos_fiado__sec(uuid, text) from public, anon$m25$;
  execute $m26$revoke all on function public.pos_fiado__asiento(uuid, date, text, text, uuid, jsonb) from public, anon$m26$;
  execute $m27$revoke all on function public.nx_fin_privilegiado() from public, anon$m27$;
  execute $m28$grant execute on function public.pos_fiado_registrar_abono(uuid, numeric, text, text, date, uuid, text, boolean, numeric, uuid) to authenticated, service_role$m28$;
  execute $m29$grant execute on function public.pos_fiado_eliminar_abono(uuid) to authenticated, service_role$m29$;
  execute $m30$grant execute on function public.pos_fiado_saldo_cliente(uuid) to authenticated, service_role$m30$;
  execute $m31$grant execute on function public.pos_fiado__caja_mia() to authenticated, service_role$m31$;
  execute $m32$grant execute on function public.nx_fin_privilegiado() to authenticated, service_role$m32$;
  execute $m33$grant execute on function public.pos_fiado__sec(uuid, text) to authenticated, service_role$m33$;
  execute $m34$grant execute on function public.pos_fiado__asiento(uuid, date, text, text, uuid, jsonb) to authenticated, service_role$m34$;
  execute $p$insert into public.pos_clientes (id, organizacion_id, nombre) values ('11111111-1111-4111-8111-111111111111', 'c6e4b954-45ee-46b9-ba94-ae1cbbcc7e10', 'QA FIADO (prueba, se deshace)')$p$;
  execute $p$insert into public.pos_ventas (id, organizacion_id, numero, cliente_id, total, credito_monto, a_credito, estado) values ('22222222-2222-4222-8222-222222222222', 'c6e4b954-45ee-46b9-ba94-ae1cbbcc7e10', -999999, '11111111-1111-4111-8111-111111111111', 1000, 1000, true, 'completada')$p$;
  perform set_config('request.jwt.claims', '{"sub":"f56c1315-d29c-4afd-9185-8c6dd234b59b","role":"authenticated"}', true);
  execute 'set local role authenticated';
  out := out || 'org=' || coalesce(public.mi_organizacion()::text,'NULL') || ' rol=' || coalesce(public.mi_rol(),'NULL') || E'\n';
  out := out || 'saldo inicial=' || public.pos_fiado_saldo_cliente('11111111-1111-4111-8111-111111111111') || E'\n';
  -- 1. efectivo sin caja abierta → rechazo
  begin perform public.pos_fiado_registrar_abono('11111111-1111-4111-8111-111111111111', 100, 'Efectivo'); out := out || 'FALLA: efectivo sin caja entró' || E'\n';
  exception when others then out := out || '1 efectivo sin caja → ' || sqlerrm || E'\n'; end;
  -- 2. abono por transferencia de 250.50
  r := public.pos_fiado_registrar_abono('11111111-1111-4111-8111-111111111111', 250.50, 'Transferencia', 'qa', null, op, 'QA');
  out := out || '2 abono → ' || r::text || E'\n';
  -- 3. repetir la misma operación → no duplica
  r2 := public.pos_fiado_registrar_abono('11111111-1111-4111-8111-111111111111', 250.50, 'Transferencia', 'qa', null, op, 'QA');
  select count(*) into n from public.pos_abonos where cliente_id = '11111111-1111-4111-8111-111111111111';
  out := out || '3 repetido → ' || (r2->>'repetido') || ' filas=' || n || E'\n';
  -- 4. más que el saldo → rechazo
  begin perform public.pos_fiado_registrar_abono('11111111-1111-4111-8111-111111111111', 800, 'Transferencia'); out := out || 'FALLA: excedió saldo' || E'\n';
  exception when others then out := out || '4 excede saldo → ' || sqlerrm || E'\n'; end;
  -- 5. asiento cuadrado del abono
  select count(*) into n from public.pos_asiento_lineas l join public.pos_asientos a on a.id=l.asiento_id where a.origen_id = (r->>'id')::uuid and a.tipo='cobro';
  out := out || '5 asiento lineas=' || n || E'\n';
  -- 6. insertar directo → candado
  begin insert into public.pos_abonos (cliente_id, monto) values ('11111111-1111-4111-8111-111111111111', 1); out := out || 'FALLA: insert directo entró' || E'\n';
  exception when others then out := out || '6 insert directo → ' || sqlerrm || E'\n'; end;
  -- 7. anular → reverso
  r3 := public.pos_fiado_eliminar_abono((r->>'id')::uuid);
  out := out || '7 anular → ' || r3::text || ' saldo=' || public.pos_fiado_saldo_cliente('11111111-1111-4111-8111-111111111111') || E'\n';
  select count(*) into n from public.pos_asiento_lineas l join public.pos_asientos a on a.id=l.asiento_id where a.origen_id = (r3->>'id')::uuid;
  select coalesce(sum(l.debito),0) = coalesce(sum(l.credito),0) into ok from public.pos_asiento_lineas l join public.pos_asientos a on a.id=l.asiento_id where a.origen_id in ((r->>'id')::uuid, (r3->>'id')::uuid);
  out := out || '7b asiento reverso lineas=' || n || ' cuadra=' || ok || E'\n';
  -- 8. anular dos veces → rechazo
  begin perform public.pos_fiado_eliminar_abono((r->>'id')::uuid); out := out || 'FALLA: anuló dos veces' || E'\n';
  exception when others then out := out || '8 doble anulación → ' || sqlerrm || E'\n'; end;
  -- 9. cuota con mora (sin chequeo de saldo), asiento con mora
  r := public.pos_fiado_registrar_abono('11111111-1111-4111-8111-111111111111', 1200, 'Transferencia', 'Cuota 1/3', null, null, 'QA', true, 200, null);
  select string_agg(l.cuenta_codigo || ':' || l.debito || '/' || l.credito, ' ' order by l.cuenta_codigo) into t from public.pos_asiento_lineas l join public.pos_asientos a on a.id=l.asiento_id where a.origen_id = (r->>'id')::uuid;
  out := out || '9 cuota con mora → ' || r::text || ' asiento ' || coalesce(t,'(sin asiento)') || E'\n';
  raise exception 'RESULTADOS_QA%', E'\n' || out;
end $qa$;
