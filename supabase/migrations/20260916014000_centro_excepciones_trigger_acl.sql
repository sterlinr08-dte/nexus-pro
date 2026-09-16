-- Corrección defensiva para instalaciones donde la migración base ya fue aplicada:
-- la función solo debe ejecutarse como trigger, nunca desde PostgREST.
revoke all on function public.nx_capturar_excepcion_operativa() from public;
revoke all on function public.nx_capturar_excepcion_operativa() from anon;
revoke all on function public.nx_capturar_excepcion_operativa() from authenticated;
