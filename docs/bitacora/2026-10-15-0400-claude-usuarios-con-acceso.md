# 2026-10-15 04:00 — Claude — Usuarios con acceso real desde Configuración → Usuarios (sin publicar)

## Solicitud del dueño
Tras el caso LORIBEL (bitácora 2026-10-15-0300), el dueño preguntó por qué hay que ir a Supabase cada vez que crea un empleado, cuando lo normal es crear empleado y contraseña en un solo paso. Respondió «Sí» a arreglarlo.

## Diagnóstico
La pantalla Usuarios (index.html) escribía solo `usuarios_sistema` con un hash SHA-256 sin sal en `pwd` (login viejo). El login actual usa Supabase Auth (`<login>@nexus-pro.local`) + `profiles`, así que el empleado nuevo no podía entrar.

Lo mismo fallaba con otros cambios:
- **Rol:** no tocaba `profiles.rol`, que es lo que mira `mi_rol()`.
- **Estado:** no tocaba `profiles.activo` ni bloqueaba Auth, así que un usuario «Inactivo» seguía pudiendo entrar.
- **Contraseña:** solo cambiaba el hash viejo; la clave real de Auth seguía igual.
- **Usuario:** no cambiaba el correo de Auth.
- **Eliminar:** dejaba el acceso vivo.

## Cambios
- **Nueva Edge Function `supabase/functions/usuarios-acceso`** (verify_jwt por defecto, sin publicar).
  - Verifica el token con `auth.getUser`.
  - Solo la usa un admin activo, y solo sobre usuarios de **su** organización. La cuenta superadmin solo la toca ella misma.
  - Acciones:
    - `lista`: estado de acceso de cada usuario;
    - `crear`: usuarios_sistema + Auth + profiles, con marcha atrás si algo falla;
    - `crear_acceso`: para usuarios a medias como LORIBEL;
    - `clave`: Auth, y anula el hash viejo;
    - `rol`: usuarios_sistema + profiles;
    - `estado`: usuarios_sistema + profiles + bloqueo/desbloqueo en Auth;
    - `login`: usuarios_sistema + profiles + correo de Auth;
    - `eliminar`: se niega si validó pagos; si no, borra el acceso y el usuario.
  - Candados: no quitarse a uno mismo el admin, no desactivarse ni eliminarse.
  - Roles válidos: admin, supervisor, cajero, agente, cobros.
  - `deno check` sin errores.
- **`index.html` (pantalla Usuarios):**
  - todo pasa por la función (`nxUsuAcc`);
  - chip «Con acceso» / «Sin acceso» y botón **«Crear acceso»**;
  - ventana propia para la contraseña (no `prompt()`; pide repetirla y mínimo 6);
  - nombres escapados (`escHtml`);
  - si la función rechaza un cambio, la lista vuelve a lo real;
  - en modo legacy (sin token) avisa que hay que entrar normal.
- **`scripts/qa-usuarios-acceso.mjs`:** 21 PASS · 0 FAIL.

## Riesgos
- Al cambiar la contraseña o crear el acceso se borra el hash viejo de `usuarios_sistema.pwd`: ese usuario ya no podrá entrar por el modo «legacy».
- Las cuentas actuales (admin, Robinson, etc.) ya usan Auth y no se afectan.

## Estado / siguiente paso
- En la rama `claude/review-claude-md-jpzk7k`. **No publicado.**
- Al recibir «publícalo»:
  1. desplegar `usuarios-acceso`;
  2. llevar a `main` **solo** este cambio (cherry-pick, sin 59.28/59.29 si el dueño no los pide);
  3. el dueño entra a Usuarios → LORIBEL → «Crear acceso».
- Ya no hace falta el paso manual en Supabase de la bitácora 0300.
