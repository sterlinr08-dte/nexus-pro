# 2026-10-15 03:00 — Claude — Usuario de cajera LORIBEL: auditoría de permisos y arreglo parcial

## Solicitud del dueño
«Habilité un usuario para cajera que se llama Loribel, confirma los permisos; quiero que ella cobre a los clientes». Sobre a nombre de quién va el cobro: «A nombre de quien el cliente depositó el dinero».

## Diagnóstico (Supabase tnwsgcxurfyuszxsewsn)
- `usuarios_sistema` LORIBEL (id 840197dd…, login `loribel`, rol `cajero`, activo): sin `organizacion_id`, nunca entró.
- Le faltaba:
  - usuario de Auth (`loribel@nexus-pro.local`);
  - fila en `profiles`.
  - Con eso, no podía entrar (`doLoginAuth` usa Auth + `profiles`).
- Sin organización: `mi_organizacion()` da null, así que las RLS de `clientes/abonos/facturas/agentes` y `seguros_registrar_cobro` la rechazarían.
- Permisos del rol cajero (frontend + RPC):
  - puede ver clientes y facturas y registrar cobros (`seguros_registrar_cobro` solo pide rol + organización de seguros);
  - **no** puede reversar cobros, anular facturas, eliminar clientes ni ver Contabilidad/reportes de admin (todo `rol==='admin'`).
- El cobro exige `p_agente_cobro` de la tabla `agentes` (hoy ESTERLIN y ROBINSON).
- **Decisión del dueño:** la cajera elige el agente a cuyo nombre depositó el cliente. **No** se crea agente LORIBEL. La custodia sigue en ese agente (principio contable de CLAUDE.md) y queda trazado quién lo registró en `abonos.created_by_user_id/created_by_name`.

## Cambios hechos
- `usuarios_sistema.organizacion_id` de LORIBEL = `1ab0fcb7-3337-46be-afd7-4a30679de165` (organización `nexus-pro`). Cambio de un solo registro, reversible.

## Pendiente
1. **El dueño** crea en Supabase (Authentication → Users → Add user):
   - correo `loribel@nexus-pro.local`, con su contraseña (no pasa por el chat);
   - marcar Auto Confirm.
2. **Claude** inserta en `profiles`: id del usuario de Auth, `usuario_sistema_id` 840197dd…, login `loribel`, nom LORIBEL, rol `cajero`, activo, `must_change_password=false`, `agente_id` null.
3. Prueba de acceso sin registrar cobros reales.

## Hallazgo
La pantalla de Usuarios de Seguros crea solo `usuarios_sistema` (sin Auth ni perfil). El único camino que crea las 3 cosas es la función `crear-usuario-staff` (Ajustes del POS) y no permite rol cajero de seguros a un login ya existente. Conviene arreglarlo para próximos usuarios.
