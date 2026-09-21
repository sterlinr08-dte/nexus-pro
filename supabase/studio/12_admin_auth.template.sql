-- STUDIO · PLANTILLA para crear el usuario de Supabase Auth del administrador.
-- NO aplicar tal cual: sustituir __PASSWORD__ al momento de ejecutar y NUNCA guardar la clave
-- en el repo, bitácora ni chat compartido. El login en la app es `admin` (o `admin@studio`);
-- la convención de correo sintético `@nexus-pro.local` está fija en index.html (doLoginAuth).
--
-- must_change_password=true → la app obliga a definir una clave nueva en el primer ingreso.

do $$
declare
  v_uid uuid := gen_random_uuid();
  v_us  uuid := 'a1b2c3d4-0000-4000-8000-000000005701'::uuid; -- usuarios_sistema del admin (11_semilla)
begin
  if exists (select 1 from auth.users where email='admin@nexus-pro.local') then
    raise notice 'auth user ya existe';
    return;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current, is_sso_user
  ) values (
    '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
    'admin@nexus-pro.local', extensions.crypt('__PASSWORD__', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
    '', '', '', '', '', false
  );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_uid, v_uid::text,
          jsonb_build_object('sub', v_uid::text, 'email', 'admin@nexus-pro.local', 'email_verified', true),
          'email', now(), now(), now());

  insert into public.profiles (id, usuario_sistema_id, login, nom, rol, activo, must_change_password)
  values (v_uid, v_us, 'admin', 'ADMINISTRADOR STUDIO', 'admin', true, true)
  on conflict (id) do nothing;
end $$;
