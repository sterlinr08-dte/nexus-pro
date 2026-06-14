# Plan de seguridad — cerrar la base sin romper la app

## El problema (confirmado con los advisors de Supabase)
Hoy **todas** las tablas tienen una política RLS `USING(true) WITH CHECK(true)`
para el rol público. Como la *anon key* viaja dentro de la app (es pública por
diseño), **cualquiera que la extraiga puede leer/editar/borrar todo**: clientes
(cédula, teléfono, dirección), abonos, facturas e incluso `usuarios_sistema`.

Además:
- `run_auto_facturacion()` y `siguiente_ncf()` son `SECURITY DEFINER` y las
  puede invocar el rol `anon` por RPC.
- El login compara la contraseña/hash **en el navegador** tras traerla de la BD,
  así que el hash es accesible con la anon key.

## Por qué no se arregla "de golpe"
La app NO usa Supabase Auth: entra con la anon key y un login propio
(`usuarios_sistema`). Si simplemente cambio las políticas a `auth.uid()`, la app
deja de poder leer/escribir y se cae. Hay que migrar primero el acceso.

## Plan por pasos (de menor a mayor riesgo)

### Paso 1 — Endurecer lo que no rompe nada (rápido)
- Revocar `EXECUTE` de `run_auto_facturacion()` y `siguiente_ncf()` al rol
  `anon` (dejar solo el rol/servicio que de verdad las usa) o pasarlas a
  `SECURITY INVOKER`.
- Verificar que la **anon key** publicada sea la `anon` (no la `service_role`).
- Activar **backups** automáticos y confirmar el export de la app cubre todo.

### Paso 2 — Autenticación real (base del cierre)
Elegir una de estas vías:
- **A. Supabase Auth (recomendado):** cada usuario del sistema pasa a ser un
  usuario de Auth (email/clave). La app inicia sesión con Auth y usa el token
  del usuario para todas las llamadas. El login propio se reemplaza/gradúa.
- **B. Edge Functions:** la app deja de hablar directo con la BD; pasa por
  funciones que validan sesión y aplican permisos. Más trabajo, más control.

### Paso 3 — Políticas RLS por rol
Con auth en su lugar, reemplazar `USING(true)` por políticas reales, por ejemplo:
- Lectura: solo usuarios autenticados.
- Escritura/borrado: según `rol` (admin vs agente) y, donde aplique, solo sus
  propios registros (p. ej. un agente ve/edita sus clientes).
- `usuarios_sistema`, `permissions`, `roles`: solo admin.

### Paso 4 — Contraseñas
- Asegurar que **todas** las contraseñas estén hasheadas (no en texto plano) y,
  idealmente, mover la verificación al servidor (Auth o Edge Function), no al
  navegador.

## Orden sugerido
1. Paso 1 (hoy, sin riesgo).
2. Paso 2A en un entorno de prueba.
3. Migrar usuarios y activar Paso 3 tabla por tabla, probando que la app sigue
   funcionando en cada una.
4. Paso 4.

> Nota: este archivo es un **plan**, no cambia la app ni la base. Cada paso se
> ejecuta y se prueba por separado para no dejar el sistema fuera de servicio.
