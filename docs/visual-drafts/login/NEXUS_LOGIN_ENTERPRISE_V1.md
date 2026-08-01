# NEXUS PRO — Login Enterprise V1

## Estado

Propuesta visual para revisión e implementación por Claude. Este archivo NO modifica el login real ni publica en `main`.

## Referencia ejecutable

Abrir:

`docs/visual-drafts/login/NEXUS_LOGIN_ENTERPRISE_V1.html`

## Objetivo

Reemplazar únicamente la interfaz visual del login existente, conservando toda la autenticación, validaciones, eventos, almacenamiento, recuperación de contraseña, mensajes y redirecciones reales del sistema.

## Reglas obligatorias para Claude

1. Localizar primero la función, bloque o template real que renderiza el login actual.
2. Leer y conservar exactamente los IDs, nombres de inputs, listeners, llamadas de autenticación y flujo de sesión existentes.
3. Reimplementar el diseño dentro del bloque real. No agregar un detector DOM, `MutationObserver`, parche independiente ni script que intente encontrar la pantalla por texto.
4. El HTML de referencia es visual y funcional solo como prototipo. El submit del prototipo NO autentica.
5. No agregar Google, Microsoft, Apple, registro ni crear cuenta.
6. No cambiar el backend, Supabase, endpoints, claves, políticas, roles ni permisos.
7. No mostrar usuario ni contraseña predeterminados en producción. Los valores visibles del prototipo son solo demostrativos.
8. Usar iconos lineales Tabler equivalentes: `shield-check`, `user`, `eye`, `eye-off`, `login-2`.
9. Mantener Plus Jakarta Sans como fuente oficial del sistema si ya está cargada; de lo contrario, usar la fuente global existente sin romper el proyecto.
10. Debe ser responsive para escritorio, tableta y móvil, sin scroll horizontal.
11. Probar estados: vacío, focus, error de credenciales, cargando, contraseña visible/oculta, recordar usuario y recuperación de contraseña.
12. Preservar accesibilidad: labels asociados, teclado, foco visible, `aria-live` para errores y `aria-label` para mostrar/ocultar contraseña.

## Diseño aprobado

- Fondo corporativo desenfocado y frío, sin cafetería, sin personas y sin elementos distractores.
- Tarjeta central oscura con transparencia sutil.
- Logo visual `NEXUS PRO` arriba y subtítulo `MULTIEMPRESA • POS • ERP`.
- Escudo azul central.
- Título `Bienvenido de nuevo`.
- Campos de usuario/correo y contraseña.
- Recordarme y recuperar contraseña.
- Botón principal `ENTRAR AL SISTEMA`.
- Aviso de seguridad empresarial debajo.

## Tokens visuales

```css
--login-bg: #07101d;
--login-card: rgba(8,18,34,.94);
--login-field: #0f1b2d;
--login-border: #375277;
--login-text: #ffffff;
--login-muted: #a9b7ce;
--login-blue: #2563eb;
--login-blue-dark: #1d4ed8;
--login-focus: #60a5fa;
```

## Restricciones

- No publicar directamente en `main` desde esta propuesta.
- No usar GitHub Actions para aplicar el cambio.
- Claude debe comparar el prototipo con el código real, implementar dentro del login existente, probarlo y publicar mediante el flujo acordado.
- No inventar funciones ni sustituir el flujo de autenticación real.
