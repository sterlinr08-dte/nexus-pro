-- 17-nov-2026 (dueño): en la demo, el «Café molido 1 lb» (DEMO-004) queda siempre con precio mínimo RD$240,
-- para poder probar el candado del precio. Se agrega una sola línea a demo_reiniciar() sin tocar lo demás.
do $do$ declare d text; begin
  d := pg_get_functiondef('public.demo_reiniciar()'::regprocedure);
  if position('precio_minimo = 240' in d) = 0 then
    if position(E'  insert into public.pos_stock_almacen' in d) = 0 then raise exception 'ANCLA_NO_ENCONTRADA'; end if;
    d := replace(d, E'  insert into public.pos_stock_almacen', E'  -- 17-nov-2026 (dueño): un artículo con precio mínimo para probar el candado del precio.\n  update public.pos_productos set precio_minimo = 240 where organizacion_id = v_org and codigo = ''DEMO-004'';\n\n  insert into public.pos_stock_almacen');
    execute d;
  end if;
end $do$;
revoke execute on function public.demo_reiniciar() from public, anon, authenticated;
