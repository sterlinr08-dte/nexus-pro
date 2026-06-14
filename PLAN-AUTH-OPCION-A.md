# Plan de migración a Supabase Auth (Opción A)

Objetivo: cerrar la base con RLS real **sin dejar a nadie fuera**, migrando el
login a Supabase Auth por fases, con posibilidad de revertir en cada paso.

## Punto de partida (hoy)
- La app entra con la **anon key** y un login propio (`usuarios_sistema`,
  validado en el navegador).
- Todas las tablas tienen RLS `USING(true)` → abiertas.
- Los usuarios entran con **usuario (login) + clave**, no con correo.

## Reto principal: las contraseñas y el correo
- Supabase Auth trabaja con **correo + clave**. Las claves actuales están
  hasheadas y **no se pueden leer** para copiarlas → cada usuario tendrá que
  **establecer su clave una vez**.
- Como los usuarios entran con "login" (no correo), usaremos **correo sintético**
  (`login@nexus-pro.local`) por detrás, para que sigan entrando con su usuario.

---

## Fases

### Fase 0 — Preparación (NO rompe nada, reversible)
- Crear tabla `profiles`: `id (uuid, = auth.users.id)`, `usuario_sistema_id`,
  `login`, `nom`, `rol`, `agente_id`, `activo`. (Vacía por ahora.)
- Función helper `mi_rol()` que lea el rol del `profiles` del usuario logueado.
- La app sigue funcionando **igual** (todavía con anon key).

### Fase 1 — Crear usuarios en Auth (en paralelo, sin cambiar el login aún)
- Por cada `usuario_sistema` activo, crear su usuario en Auth (correo sintético)
  con **clave temporal**.
- Llenar `profiles` enlazando cada auth user con su rol y agente.
- La app **todavía usa el login viejo** → nadie nota cambios.

### Fase 2 — Cambiar el login de la app (con interruptor de reversa)
- La app inicia sesión con `signInWithPassword` y adjunta el **token del usuario**
  a las llamadas (en vez de solo la anon key).
- Se agrega un **flag** para volver al login viejo al instante si algo falla.
- Probar con UNA cuenta admin antes de soltarlo a todos.

### Fase 3 — Activar RLS real, tabla por tabla
- Reemplazar `USING(true)` por políticas reales, p. ej.:
  - **Lectura:** solo usuarios autenticados.
  - **Escritura/borrado:** según `mi_rol()` (admin vs agente); donde aplique, el
    agente solo sus propios registros.
  - `usuarios_sistema`, `permissions`, `roles`, `profiles`: solo admin.
- Se hace **una tabla a la vez**, probando la app después de cada una.

### Fase 4 — Contraseñas y limpieza
- Verificar que TODAS las claves pasen por Auth.
- Quitar la validación de clave en el navegador y el manejo viejo.

## Reversa
En cada fase, el estado anterior sigue funcionando. El flag de la Fase 2 permite
volver al login viejo en segundos.

## Decisión que necesito de ti (define la Fase 1)
Cómo establecen los usuarios su clave nueva:
1. **Clave temporal + cambio obligatorio** al primer ingreso (recomendado).
2. **El admin define** las claves nuevas y las comunica.
3. **Correo + enlace mágico** (requiere correo real de cada usuario).
