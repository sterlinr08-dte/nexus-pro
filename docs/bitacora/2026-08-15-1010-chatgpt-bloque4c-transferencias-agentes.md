# ChatGPT — Subfase 2B / Bloque 4C — `transferencias_agentes` — AUDITORÍA ESTRICTA, NO IMPLEMENTACIÓN

Fecha: 2026-08-15 10:10 RD

## Estado de partida
4A (`abonos`), 4B (`egresos ↔ asientos`) y 4D completo (`entregas_admin`, `cuadre_tss_historial`, `pagos`) están cerrados. No reabrirlos salvo evidencia reproducible de regresión. `pagos` queda deprecated/congelada y fuera de este alcance.

## Objetivo
Auditar estrictamente el dominio completo de transferencias entre agentes antes de autorizar cualquier cambio. El foco es demostrar quién puede mover dinero de quién hacia quién, cómo se resuelve identidad usuario↔agente, cuándo cambia el saldo/Dinero en Mano, qué estados existen, qué ocurre ante rechazo/anulación/reintento/concurrencia y qué controles dependen hoy solo del frontend.

## Trabajo requerido — SOLO AUDITORÍA / DISEÑO
1. Inventario fresco de producción de `transferencias_agentes` y cualquier tabla/vista/RPC/trigger/Edge Function/secuencia directamente relacionada: columnas, constraints, FK, índices, RLS/policies, ACL, owners, grants y funciones SECURITY DEFINER/INVOKER.
2. Enumerar TODOS los lectores/escritores reales en `index.html`, `parches.js`, migrations, SQL, Edge Functions y funciones PostgreSQL, con archivo/función/operación exacta. Separar UI visible de capacidad backend real.
3. Reconstruir el flujo de negocio actual extremo a extremo: crear/solicitar transferencia, aceptar/confirmar, rechazar, cancelar/anular si existe, historial y efecto sobre saldos/KPI. No inferir por nombres: demostrarlo desde código y producción.
4. Identidad: demostrar cómo se resuelve `auth.uid()` → `profiles` → agente/cuenta. Detectar perfiles sin `agente_id`, agentes compartidos, IDs enviados por navegador, nombres usados como identidad, fallbacks ambiguos y cualquier posibilidad de suplantar origen/destino.
5. Autoridad: determinar quién tiene derecho legítimo a crear una transferencia. El backend debe derivar el ORIGEN desde la identidad autenticada cuando la operación sea de agente; nunca confiar en un `agente_origen_id` arbitrario enviado por cliente. Para admin, documentar explícitamente si el negocio permite transferir en nombre de terceros y bajo qué auditoría.
6. Destino: validar server-side que el agente/cuenta destino existe, está activo, pertenece a nexus-pro y no es el mismo origen. Determinar si el destino debe aceptar antes de afectar saldos.
7. Efecto financiero: identificar exactamente qué consultas calculan “Dinero en Mano”, Caja Central, reportes por agente y cualquier otro KPI a partir de `transferencias_agentes`. Documentar en qué estado una transferencia resta al origen y suma al destino. Buscar doble conteo o ventanas donde el dinero desaparezca/aparezca dos veces.
8. Estados: inventariar valores reales y transiciones permitidas. Proponer máquina de estados explícita. Rechazo/anulación no debe destruir historia. Revisar UPDATE/DELETE físicos existentes.
9. Idempotencia: doble clic, retry de red, reenvío de la misma solicitud, aceptar dos veces, rechazar después de aceptar, cancelar simultáneamente con aceptar. Proponer claves idempotentes separadas por operación si corresponde.
10. Concurrencia: demostrar qué ocurre si el mismo agente intenta transferir simultáneamente más dinero del disponible. Diseñar locking/serialización apropiada; no basta con validar saldo antes de insertar si dos transacciones pueden pasar la misma validación.
11. Saldo disponible: determinar la fuente canónica del saldo del agente y si debe validarse server-side antes de permitir transferencia. No confiar en un saldo calculado en JavaScript.
12. ACL/RLS: revisar SELECT/INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER/REFERENCES y secuencias. TRUNCATE debe quedar explícitamente cerrado para `anon`/`authenticated` si hoy existe. No asumir que RLS protege TRUNCATE.
13. SECURITY DEFINER: toda función privilegiada propuesta debe tener `SET search_path`, guards explícitos de organización/rol/identidad y EXECUTE mínimo. No depender de RLS implícito dentro de SECURITY DEFINER.
14. Auditoría: actor fuerte (`auth.uid()`/usuario interno), timestamps, motivo cuando aplique, origen/destino inmutables una vez creada, old/new state suficiente para investigación posterior.
15. Revisar Edge Functions y reportes: confirmar si `nexus-smart`, `enviar-reporte-email`, respaldos u otros leen transferencias y qué expectativa tienen sobre estados/campos.
16. Diseñar frontend mínimo para consumir RPC seguras y eliminar escritores directos, pero NO publicarlo.
17. Entregar SQL exacto propuesto + rollback, sin aplicarlo. Para cualquier CREATE OR REPLACE de función existente, incluir diff fresco contra `pg_get_functiondef()` de producción.

## Matriz mínima obligatoria
Usar identidades reales ya establecidas cuando sigan vigentes y revalidarlas antes de probar:
- admin nexus-pro;
- agente nexus-pro;
- usuario cross-org;
- anon;
- service_role solo donde exista consumidor legítimo.

Probar/demostrar, cuando aplique:
- agente transfiere desde sí mismo a otro agente válido;
- intento de agente de elegir como origen a un tercero;
- destino inexistente/inactivo/cross-org/mismo origen;
- monto 0/negativo y monto superior al saldo disponible;
- doble creación con misma idempotency key;
- dos transferencias concurrentes que individualmente caben pero juntas exceden saldo;
- aceptar dos veces;
- aceptar y rechazar concurrentemente;
- rechazo/anulación preserva historia;
- REST directo INSERT/UPDATE/DELETE/TRUNCATE;
- admin y capacidad de actuar por terceros según intención real del negocio;
- cross-org bloqueado;
- anon bloqueado;
- diagnóstico financiero `seguros_diagnostico_financiero()` sigue `ok:true` sin modificar su definición;
- rollback estructural forzado y verificación independiente de cero residuos.

## Preguntas que Claude debe contestar explícitamente
1. ¿Quién es hoy el dueño real del dinero durante una transferencia `pendiente`? ¿Origen, destino o ninguno en los KPI?
2. ¿La transferencia debe afectar saldo al CREARSE o al ACEPTARSE? Responder según comportamiento actual y riesgo; si recomienda cambiar semántica, marcarlo como decisión de negocio, no asumirla.
3. ¿Puede un admin transferir dinero entre dos agentes sin ser ninguno de ellos? ¿Existe UI/uso real que lo requiera?
4. ¿Cómo se resuelve hoy un usuario agente a su agente financiero? ¿Hay registros reales ambiguos o sin vínculo?
5. ¿Qué ocurre si un agente tiene RD$10,000 disponibles y lanza simultáneamente dos transferencias de RD$8,000?
6. ¿Hay DELETE físico o UPDATE libre que permita reescribir origen, destino, monto o estado después de creado?
7. ¿Qué consumidores deben modificarse si se introduce una máquina de estados/soft-cancel?
8. ¿Existe alguna relación contable/asiento para estas transferencias? No inventar asientos si el sistema actual no los define; documentar la brecha para decisión separada.

## Criterio de diseño preferido (no autorización)
Si la evidencia lo permite, preferir una API transaccional con RPC separadas por intención (`crear`, `aceptar`, `rechazar/cancelar`) o equivalente, identidad/origen derivado server-side, destino validado server-side, idempotencia, locking por agente/saldo y tabla financiera sin DELETE físico. Pero Claude debe demostrar que ese diseño encaja con el comportamiento real antes de proponer SQL final.

## Límites duros
- NO aplicar SQL/migraciones.
- NO publicar frontend.
- NO modificar datos históricos.
- NO limpiar transferencias existentes.
- NO tocar 4A, 4B ni 4D.
- NO modificar `seguros_diagnostico_financiero()`.
- NO crear asientos contables nuevos sin decisión separada.
- NO ampliar alcance silenciosamente.

## Entrega
Crear entrada NUEVA e inmutable `docs/bitacora/AAAA-MM-DD-HHMM-claude-bloque4c-transferencias-agentes.md` con evidencia reproducible, inventario, flujo actual, identidad, matriz de permisos/ataques/concurrencia, hallazgos por severidad, SQL/rollback propuesto y recomendación explícita. Esperar revisión cruzada de ChatGPT antes de implementar.