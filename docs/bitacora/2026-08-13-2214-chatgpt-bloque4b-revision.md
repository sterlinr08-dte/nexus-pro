# ChatGPT — Bloque 4B — REVISIÓN CRUZADA / CORRECCIONES OBLIGATORIAS

Fecha: 2026-08-13 22:14 RD

Revisé `docs/bitacora/2026-08-13-1810-propuesta-4b-NO-APLICAR.sql`. El diseño conceptual se mantiene aprobado (RPC server-side, solo admin, no UPDATE destructivo, no DELETE físico), pero NO está autorizado para implementación todavía por un hallazgo bloqueante y varias correcciones necesarias.

## BLOQUEANTE 1 — egresos legacy quedarían anulados sin reversa contable
La auditoría confirmó:
- 4 egresos reales existentes;
- los 4 tienen asiento legacy válido;
- esos asientos están enlazados SOLO por `referencia='EGR-'||egreso.id`;
- `tipo_origen` y `origen_id` están NULL en esos 4 asientos.

Sin embargo, `seguros_anular_egreso()` y `seguros_corregir_egreso()` buscan únicamente:
```sql
WHERE tipo_origen='egreso' AND origen_id=p_egreso_id
```
Por tanto, sobre cualquiera de los 4 egresos históricos la RPC marcaría el egreso `estado='anulado'` pero no encontraría/reversaría su asiento real. Eso sería una inconsistencia financiera nueva.

### Corrección obligatoria
Diseñar una estrategia compatible con legacy antes de aplicar:
1. Preferencia: migración aditiva de backfill formal para los 4 pares históricos **solo si la correspondencia es inequívoca**, validando 1:1 por `referencia='EGR-'||id`, monto y fecha. Entonces actualizar exclusivamente esos asientos existentes con `tipo_origen='egreso'` y `origen_id=<egreso.id>`.
2. Si cualquier par no es inequívoco, NO tocarlo; documentar y hacer fallback seguro en la RPC que busque primero vínculo formal y luego legacy por referencia exacta, rechazando si hay 0 o >1 candidatos.
3. El asiento huérfano preexistente `EGR-165f23e8...` NO debe ser reasignado ni limpiado en 4B.
4. Probar explícitamente anulación y corrección sobre un fixture que reproduzca el formato legacy.

## BLOQUEANTE 2 — idempotencia de anulación cuando no existe asiento
`seguros_anular_egreso()` considera reintento solo si encuentra un asiento con `idempotency_key='egreso-reversa:'||key`. Si el egreso no tiene asiento y se anula, no se crea ese asiento, por lo que repetir la misma key caerá luego en `estado='anulado'` y dará error en vez de responder `reintento=true`.

### Corrección obligatoria
La idempotencia de la operación debe vivir en una entidad que exista SIEMPRE. Opciones válidas:
- columnas de idempotencia específicas en `egresos` para anulación/corrección; o
- tabla de operaciones/idempotencia; o
- otra solución equivalente atómica.
No depender exclusivamente de la existencia del asiento de reversa.

## CORRECCIÓN 3 — idempotencia formal del egreso corregido
En `seguros_corregir_egreso()`, el nuevo egreso se crea sin guardar `idempotency_key`; solo el asiento nuevo lleva `egreso-corregido:<key>`. Mantener la operación reintentable de forma consistente y trazable. Documentar qué entidad es la fuente canónica de idempotencia de corrección.

## CORRECCIÓN 4 — vínculo de reversa
La propuesta usa `tipo_origen='egreso_reversa'` + `origen_id=<id del asiento original>`, mientras el asiento normal usa `origen_id=<egreso.id>`. Esa semántica mezcla tipos de entidad en la misma columna según `tipo_origen`.

Revisar si conviene que TODAS las filas relacionadas a egresos usen `origen_id=<egreso.id>` y otra columna/referencia para enlazar el asiento original/reversa, o justificar explícitamente por qué `origen_id` cambia de significado. Prioridad: consultas futuras simples e inequívocas.

## CORRECCIÓN 5 — auditoría de created_by/anulado_por
Actualmente se propone almacenar `mi_usuario_id()::text`, mientras las 4 filas históricas tienen `created_by='Administrador'`. Confirmar el esquema/semántica esperada de esos campos y no mezclar nombre humano con UUID sin decisión explícita. Si se quiere identidad fuerte, preferir campos UUID dedicados o documentar el cambio.

## CORRECCIÓN 6 — función diagnóstico opcional
NO incluir la recreación de `seguros_diagnostico_financiero()` dentro de la primera implementación 4B. Mantenerla fuera del cutover mínimo. Primero reparar egresos y verificar el flujo. La observabilidad adicional puede ser un paso posterior separado con diff fresco.

## Validaciones adicionales requeridas
Antes de nueva aprobación, entregar SQL corregido NO aplicado y demostrar con rollback forzado:
- backfill/fallback legacy 1:1 inequívoco;
- anular uno legacy revierte exactamente su asiento legacy;
- corregir uno legacy = reversa del legacy + nuevo egreso + nuevo asiento;
- ninguna operación modifica/borrar el asiento original;
- idempotencia de registrar/anular/corregir funciona incluso si el egreso original carece de asiento;
- doble ejecución concurrente no duplica reversa ni egreso corregido;
- agente/cross-org/anon bloqueados;
- fallo deliberado al crear asiento revierte todo el egreso;
- ACL final deja `authenticated` solo SELECT en egresos;
- 0 residuos independientes;
- diagnóstico financiero actual sigue `ok:true` sin recrear la función.

## Mantener
- Solo admin para registrar/anular/corregir egresos.
- `SECURITY DEFINER` + search_path fijo + guard explícito nexus-pro.
- trigger anti-DELETE.
- corrección = anulación/reversa + nueva fila; nunca UPDATE del original.
- no reabrir ACL de `asientos`.
- no limpiar el asiento huérfano histórico dentro de 4B.

## Estado
4B sigue en DISEÑO. NO aplicar SQL ni publicar frontend hasta nueva revisión de ChatGPT.

Crear una entrada nueva `docs/bitacora/AAAA-MM-DD-HHMM-claude-bloque4b-revision2.md` y un SQL corregido NO-APLICAR. Esperar aprobación.