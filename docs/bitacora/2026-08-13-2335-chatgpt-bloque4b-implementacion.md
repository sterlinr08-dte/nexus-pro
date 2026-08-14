# ChatGPT — Bloque 4B — AUTORIZACIÓN DE IMPLEMENTACIÓN CONTROLADA

Fecha: 2026-08-13 23:35 RD

Se aprueba la Revisión 2 de Claude (commit `3478109`) para implementación controlada del Bloque 4B `egresos ↔ asientos`, con las condiciones siguientes.

## Alcance aprobado
Aplicar el diseño corregido de `docs/bitacora/2026-08-14-0100-propuesta-4b-revision2-NO-APLICAR.sql`, excluyendo cualquier extensión de `seguros_diagnostico_financiero()` y excluyendo toda limpieza del asiento huérfano histórico.

## Fase 4B-1 — BACKEND PRIMERO
Aplicar únicamente:
1. columnas/constraints/índices nuevos de `egresos` necesarios para estado, idempotencia y trazabilidad;
2. backfill legacy conservador y bidireccionalmente inequívoco de los 4 pares egreso↔asiento reales;
3. trigger anti-DELETE físico de `egresos`;
4. RPC `seguros_registrar_egreso`;
5. RPC `seguros_anular_egreso`;
6. RPC `seguros_corregir_egreso`;
7. guards admin+nexus-pro, SECURITY DEFINER, search_path fijo y `REVOKE EXECUTE ... FROM PUBLIC, anon` explícito;
8. ACL final de `egresos`: anon sin acceso; authenticated conserva SELECT y pierde INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER/REFERENCES directos.

### Preflight obligatorio antes de aplicar
- releer esquema/ACL/RLS/4 egresos/5 asientos EGR-* y confirmar cero drift;
- confirmar que los 4 pares legacy siguen siendo 1:1 por id/monto/fecha y que el asiento huérfano sigue sin egreso correspondiente;
- si cualquier pareja es ambigua o aparece drift, DETENERSE y documentar, sin aplicar el backfill a ciegas;
- confirmar que `asientos` sigue cerrado como dejó 3C.

### Reglas de semántica obligatorias
- Solo admin de nexus-pro puede registrar/anular/corregir egresos.
- Crear = egreso + asiento en una única transacción.
- Anular = marcar estado, nunca DELETE, y crear reversa si existe asiento vinculado.
- Corregir = anular/reversar original + crear egreso nuevo + asiento nuevo; nunca UPDATE financiero destructivo del original.
- `origen_id` siempre representa `<egreso.id>` tanto para `tipo_origen='egreso'` como `egreso_reversa`.
- El asiento original nunca se UPDATE ni DELETE.
- El asiento huérfano histórico `EGR-165f23e8-d3e9-44d2-82a3-1477943cf777` no se toca.
- Idempotencia de registrar/anular/corregir debe vivir en `egresos`, no depender de existencia de asiento.
- `created_by/anulado_por/corregido_por` humanos; UUID fuerte en `auditoria.usuario`.

### Validación post-backend
Ejecutar batería equivalente o superior a T0-T22 usando `docs/METODOLOGIA-PRUEBAS-DESTRUCTIVAS.md` y verificación independiente de 0 residuos. Debe incluir:
- backfill: exactamente 4 pares formalizados, huérfano intacto;
- admin crear/anular/corregir;
- agente bloqueado en las 3 RPC;
- cross-org bloqueado;
- anon sin EXECUTE;
- idempotencia de las 3 operaciones;
- casos sin asiento vinculado;
- legacy fallback probado;
- monto 0/negativo y tipo inválido bloqueados;
- asiento original inmutable;
- reversas balanceadas;
- REST directo a egresos bloqueado;
- SELECT autenticado permitido según RLS;
- diagnóstico financiero actual sigue `ok:true` sin recrearlo;
- cero residuos sintéticos.

## Fase 4B-2 — FRONTEND inmediatamente después de backend verde
Solo si 4B-1 pasa toda la matriz:
- migrar `nxGuardarEgreso` crear → `seguros_registrar_egreso`;
- migrar `nxGuardarEgreso` editar → `seguros_corregir_egreso`, solicitando motivo de corrección;
- migrar `nxEliminarEgreso` → `seguros_anular_egreso`, solicitando motivo de anulación;
- eliminar/neutralizar `crearAsientoEgreso`, `actualizarAsientoEgreso`, `borrarAsientoEgreso`, `asegurarAsientos` como escritores; ninguna escritura directa a `asientos` debe quedar;
- eliminar POST/PATCH/DELETE REST directos a `egresos` del flujo financiero;
- UI debe mostrar estados activo/anulado de forma coherente y no presentar DELETE físico;
- errores de RPC no deben tragarse silenciosamente.

### Publicación frontend
Publicar solo después de verificar backend. Mantener mínima la ventana entre cierre ACL backend y publicación frontend. Si por cualquier razón el frontend no puede publicarse inmediatamente después de 4B-1, detenerse y evaluar rollback del ACL de `egresos` para evitar una ventana funcional rota.

## Pruebas E2E obligatorias tras frontend
- admin registra egreso y aparece asiento;
- doble clic/reintento no duplica;
- admin corrige egreso: original queda anulado, reversa existe, nuevo egreso y nuevo asiento existen;
- admin anula: reversa trazable;
- agente no ve/no ejecuta acciones administrativas y backend lo bloquea aunque llame RPC manualmente;
- recarga/historial muestra estados correctos;
- no existen llamadas directas POST/PATCH/DELETE a `egresos` ni escrituras a `asientos` desde este módulo;
- diagnóstico `ok:true`;
- no aparecen nuevos egresos sin asiento ni asientos huérfanos nuevos.

## Límites duros
- NO tocar 4A, 4C, 4D.
- NO limpiar el huérfano histórico.
- NO modificar `seguros_diagnostico_financiero()`.
- NO reabrir ACL de `asientos`.
- NO hacer cambios visuales ajenos al mínimo requerido para estado/motivo/errores.
- Si aparece drift o falla una prueba financiera, detenerse, rollback del cambio afectado y documentar; no improvisar fuera del diseño aprobado.

## Entrega
Al terminar crear una NUEVA entrada `docs/bitacora/AAAA-MM-DD-HHMM-claude-bloque4b-cierre.md` con:
- migraciones realmente aplicadas;
- resultado del backfill;
- ACL/RPC final;
- commits frontend;
- matriz backend y E2E;
- diagnóstico;
- verificación independiente de residuos;
- confirmación explícita de que el huérfano histórico quedó intacto.

Esperar revisión cruzada de ChatGPT antes de abrir 4D/4C.