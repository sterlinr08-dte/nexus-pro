# ChatGPT — Subfase 2B / Bloque 4D — ENTREGAS / CUADRE / PAGOS — AUDITORÍA, NO IMPLEMENTACIÓN

Fecha: 2026-08-14 07:53 RD

## Estado de partida
Bloque 4A (`abonos`) y Bloque 4B (`egresos ↔ asientos`) están cerrados. No reabrirlos salvo evidencia reproducible de regresión. Bloque 4C (transferencias entre agentes) permanece pendiente y NO debe abrirse dentro de este trabajo.

## Objetivo
Auditar estrictamente las superficies financieras restantes identificadas en la auditoría general: `entregas_admin`, `cuadre_tss_historial`, tabla `pagos` si continúa existiendo, y cualquier RPC/trigger/Edge Function directamente asociada a esos tres dominios. Determinar exposición real, semántica, consumidores y diseño mínimo de hardening.

## Trabajo requerido — SOLO AUDITORÍA / DISEÑO
1. Inventariar desde PRODUCCIÓN las tablas/vistas/RPC/triggers/secuencias/policies/ACL/owners relacionadas con `entregas_admin`, `cuadre_tss_historial` y `pagos`.
2. Enumerar TODOS los lectores y escritores reales en `index.html`, `parches.js`, migrations y Edge Functions, con archivo, función y operación exacta.
3. Comparar autorización UI vs backend real para admin nexus-pro, agente nexus-pro, cross-org, anon y service_role cuando aplique.
4. Para `entregas_admin`: determinar semántica exacta (quién entrega, quién recibe, monto, estado, aprobación/rechazo/anulación si existe), qué operaciones son financieras y cuáles son solo metadata. Revisar idempotencia, concurrencia, doble clic/reintentos y trazabilidad.
5. Para `cuadre_tss_historial`: determinar quién puede crear/modificar/eliminar registros, si el historial debe ser inmutable, si existe edición o DELETE destructivo y qué controles hoy dependen solo del frontend.
6. Para `pagos`: demostrar si está realmente huérfana o tiene consumidores. Cuantificar filas, fechas, relaciones, FK, triggers, referencias de código/migrations/funciones. NO eliminarla ni modificarla. Proponer conservar, deprecar o migrar únicamente con evidencia.
7. Revisar RLS Y ACL. No asumir seguridad por RLS. Revisar INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER/REFERENCES, secuencias y EXECUTE grants de RPC.
8. Revisar SECURITY DEFINER/INVOKER y `search_path`; toda función privilegiada debe tener guard explícito de organización/rol y mínimo EXECUTE.
9. Detectar cualquier REST directo que permita fabricar, alterar o borrar historia financiera saltándose la UI.
10. Revisar auditoría efectiva: actor fuerte, fecha, motivo, old/new data cuando corresponda.
11. Si hay dominios independientes, dividir 4D en 4D-1/4D-2/4D-3 y ordenar por riesgo/dependencias. No implementar.
12. Entregar SQL exacto propuesto + rollback para cada sub-bloque, pero NO aplicarlo. Para CREATE OR REPLACE de función existente exigir diff fresco contra `pg_get_functiondef()` de producción.
13. Proponer cambios frontend mínimos necesarios para consumir RPC seguras, sin publicarlos.

## Matriz mínima
Para cada operación sensible que exista realmente:
- admin nexus-pro: comportamiento esperado;
- agente nexus-pro: comportamiento esperado según modelo real;
- cross-org: bloqueado;
- anon: bloqueado;
- service_role/cron: solo si existe consumidor legítimo.

Probar además cuando aplique:
- monto 0/negativo;
- IDs inexistentes;
- doble clic/reintento idempotente;
- intento de UPDATE/DELETE/TRUNCATE REST directo;
- operación sobre recurso de otra organización;
- rollback estructural forzado y verificación independiente de cero residuos;
- `seguros_diagnostico_financiero()` continúa `ok:true` sin modificar su definición.

## Preguntas obligatorias
- ¿`entregas_admin` representa movimiento real de dinero o solamente registro/confirmación de entrega? ¿Qué efecto contable debería tener según el comportamiento EXISTENTE?
- ¿Un agente puede crear/confirmar/modificar una entrega o solo verla? Separar intención UI de capacidad backend.
- ¿`cuadre_tss_historial` debe ser append-only? ¿Hay razón legítima para UPDATE/DELETE?
- ¿`pagos` tiene algún dato/consumidor que impida declararla deprecated?
- ¿Alguna de estas superficies requiere asiento contable? No inventar uno si el sistema actual no lo define; documentar la brecha para decisión separada.

## Límites duros
- NO aplicar SQL/migraciones.
- NO publicar frontend.
- NO tocar 4A ni 4B.
- NO abrir ni modificar 4C/transferencias_agentes.
- NO limpiar anomalías históricas.
- NO eliminar tabla `pagos`.
- NO modificar `seguros_diagnostico_financiero()`.
- NO ampliar alcance a otros módulos sin reportarlo primero.

## Entrega
Crear entrada NUEVA e inmutable `docs/bitacora/AAAA-MM-DD-HHMM-claude-bloque4d.md` con evidencia reproducible, matriz, hallazgos por severidad, propuesta de sub-bloques, SQL/rollback y recomendación explícita del primer cambio. Esperar revisión cruzada de ChatGPT antes de implementar.