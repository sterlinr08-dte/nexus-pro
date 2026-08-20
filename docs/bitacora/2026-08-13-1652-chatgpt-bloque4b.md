# ChatGPT — Subfase 2B / Bloque 4B — EGRESOS ↔ ASIENTOS — AUDITORÍA, NO IMPLEMENTACIÓN

Fecha: 2026-08-13 16:52 RD

## Estado
Bloque 4A (`abonos`) cerrado y verificado. No reabrirlo. El Bloque 3C cerró correctamente la escritura REST directa sobre `asientos`; la auditoría del Bloque 4 detectó que el flujo actual de egresos todavía intenta escribir un asiento directamente y por tanto quedó funcionalmente roto.

## Objetivo de 4B
Diseñar la reparación y hardening definitivo del dominio `egresos ↔ asientos`, llevando la operación financiera a backend transaccional y preservando la inmutabilidad/trazabilidad contable ya establecida.

## Trabajo requerido — SOLO AUDITORÍA / DISEÑO
1. Releer producción y código desplegado. Inventariar tabla(s) de egresos/gastos, columnas, constraints, FK, índices, secuencias, RLS, policies, ACL/GRANT, triggers, owners y cualquier RPC relacionada.
2. Enumerar TODOS los lectores/escritores reales de egresos y asientos relacionados en `index.html`, `parches.js`, migrations y Edge Functions. Dar archivo + función + operación exacta.
3. Reproducir de forma segura la regresión actual: demostrar por qué crear/editar/anular/eliminar un egreso funciona o falla hoy después de 3C. No modificar datos reales persistentemente.
4. Determinar la semántica actual del módulo: quién puede crear egresos, qué campos maneja, si permite editar, eliminar, anular, categorías, cuenta Debe/Haber, comprobante, fecha, usuario/agente, etc. No inventar comportamiento.
5. Comparar permisos de UI con autorización backend real. Matriz admin nexus-pro / agente nexus-pro / cross-org / anon / service_role si aplica.
6. Diseñar RPC server-side atómica para CREAR egreso + asiento contable asociado. Debe validar organización, rol, monto > 0, cuentas válidas y distintas, campos requeridos e idempotencia. El egreso y el asiento deben confirmar o revertir juntos.
7. Si hoy existe edición: NO permitir reescribir historia financiera mediante UPDATE arbitrario. Proponer corrección mediante reversa/anulación + nuevo registro, o justificar otra semántica con evidencia. El asiento original no debe editarse/borrarse.
8. Si hoy existe eliminación: evaluar reemplazarla por anulación/reversa trazable. No aceptar DELETE destructivo de una operación financiera salvo justificación extraordinaria.
9. Diseñar vínculo inequívoco egreso↔asiento (IDs/referencia/tipo_origen) para evitar referencias frágiles por texto.
10. Revisar idempotencia y concurrencia: doble clic/reintento/red lenta no debe duplicar egreso ni asiento.
11. Revisar auditoría: actor, fecha, operación, old_data/new_data o equivalente, motivo de reversa/corrección.
12. Proponer ACL/RLS final de la tabla de egresos. El navegador no debe poder alterar columnas financieras directamente si la operación queda detrás de RPC.
13. Para cualquier SECURITY DEFINER: `search_path` fijo, guard explícito de organización/rol, mínimo GRANT EXECUTE, anon revocado. No confiar en UI/localStorage.
14. Entregar SQL exacto propuesto + rollback, pero NO aplicarlo. Si propone CREATE OR REPLACE de función existente, incluir diff fresco contra `pg_get_functiondef()` de producción.
15. Proponer cambios frontend mínimos para consumir las RPC, eliminando escrituras REST directas del flujo financiero. No publicar.

## Pruebas de diseño obligatorias
Usar `docs/METODOLOGIA-PRUEBAS-DESTRUCTIVAS.md` con rollback estructural forzado cuando se necesiten fixtures. Incluir al menos:
- admin: crear egreso válido y asiento atómico;
- agente: comportamiento según permiso real que se determine;
- cross-org bloqueado;
- anon bloqueado;
- monto 0/negativo bloqueado;
- cuenta inexistente / Debe=Haber bloqueado;
- idempotencia: misma key no duplica;
- fallo deliberado del asiento revierte también el egreso;
- corrección/anulación deja reversa y trazabilidad;
- REST directo sensible bloqueado en el diseño final;
- diagnóstico financiero `ok:true`;
- verificación independiente de cero residuos.

## Preguntas que Claude debe resolver con evidencia
- ¿Quién DEBE poder registrar un egreso: solo admin o también agente según el comportamiento actual y el modelo de permisos?
- ¿Qué significa actualmente editar/eliminar un egreso en la UI y qué efecto tiene/pretendía tener sobre el asiento?
- ¿Existen egresos históricos sin asiento, asientos de egreso huérfanos o montos discordantes? Cuantificar sin corregir todavía.
- ¿Hay algún consumidor legítimo que requiera INSERT/UPDATE/DELETE REST directo sobre egresos después de migrar este flujo?

## Límites duros
- NO aplicar SQL/migraciones.
- NO publicar frontend.
- NO tocar 4A, 4C, 4D ni otros dominios.
- NO reabrir ACL de `asientos` para “arreglar” la regresión. La solución debe ser server-side.
- NO borrar ni modificar historia contable existente.
- NO hacer limpieza de anomalías históricas dentro de 4B sin autorización separada.

## Entrega
Crear una entrada NUEVA e inmutable `docs/bitacora/AAAA-MM-DD-HHMM-claude-bloque4b.md` con evidencia, matriz, hallazgos, diseño, SQL/rollback y cambios frontend propuestos. Esperar revisión cruzada de ChatGPT antes de implementar.