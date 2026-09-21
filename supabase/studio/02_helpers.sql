-- STUDIO — 02 helpers de sesión/tenant
-- pg_get_functiondef() literal de la base madre para: mi_organizacion, mi_rol, mi_usuario_id, set_organizacion_id,
-- mi_agente_efectivo. mi_usuario_id se añadió porque la usan pos_fin_registrar_pago_v2, pos_fin_reversar_pago
-- y la política mias_usuario_preferencias.
--
-- Las funciones LANGUAGE sql referencian profiles/usuarios_sistema, que se crean en 03; se desactiva la
-- validación de cuerpos para que compilen sobre una base vacía (Postgres las resuelve al primer uso).
-- mi_agente_efectivo referencia public.agentes: se crea aquí una tabla mínima (definición completa de la madre)
-- con "if not exists"; 03_tablas.sql la repite con la misma cláusula.

set check_function_bodies = off;

create table if not exists public.agentes (
  id uuid default gen_random_uuid() not null,
  nom text,
  cargo text,
  tel text,
  email text,
  activo boolean,
  created_at timestamp with time zone default now(),
  licencia text,
  lic_vence text,
  constraint agentes_pkey PRIMARY KEY (id)
);

CREATE OR REPLACE FUNCTION public.mi_organizacion()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select us.organizacion_id
  from public.profiles p
  join public.usuarios_sistema us on us.id = p.usuario_sistema_id
  where p.id = auth.uid()
  limit 1
$function$
;

CREATE OR REPLACE FUNCTION public.mi_rol()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ select rol from public.profiles where id = auth.uid() $function$
;

CREATE OR REPLACE FUNCTION public.mi_usuario_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select us.id
  from public.profiles p
  join public.usuarios_sistema us on us.id = p.usuario_sistema_id
  where p.id = auth.uid()
  limit 1
$function$
;

CREATE OR REPLACE FUNCTION public.set_organizacion_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.organizacion_id is null then
    new.organizacion_id := public.mi_organizacion();
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.mi_agente_efectivo()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_agente_id uuid; v_nom text;
BEGIN
  SELECT agente_id INTO v_agente_id FROM public.profiles WHERE id = auth.uid();
  IF v_agente_id IS NOT NULL THEN RETURN v_agente_id; END IF;

  SELECT us.nom INTO v_nom FROM public.profiles p JOIN public.usuarios_sistema us ON us.id = p.usuario_sistema_id
  WHERE p.id = auth.uid();
  IF v_nom IS NOT NULL THEN
    SELECT id INTO v_agente_id FROM public.agentes WHERE lower(trim(nom)) = lower(trim(v_nom)) LIMIT 1;
    IF v_agente_id IS NOT NULL THEN RETURN v_agente_id; END IF;
  END IF;

  IF public.mi_rol() = 'admin' THEN
    SELECT id INTO v_agente_id FROM public.agentes WHERE lower(cargo) = 'admin' LIMIT 1;
    RETURN v_agente_id;
  END IF;
  RETURN NULL;
END;
$function$
;

reset check_function_bodies;
