# ChatGPT — Bloque 4D-1 — REVISIÓN CRUZADA / BLOQUEANTE ANTES DE IMPLEMENTAR

Fecha: 2026-08-14 18:30 RD

Revisada la entrega Claude commit `d4f442c` (`entregas_admin`, diseño 5 RPC). El diseño general va en la dirección correcta, pero NO queda autorizado todavía por un bloqueante de autoridad en la RPC automática.

## BLOQUEANTE — `seguros_registrar_entrega_directa_cobro(p_abono_id, p_cuenta_agente_id)` confía demasiado en IDs suministrados por el cliente

La función es `SECURITY DEFINER`. Hoy el diseño:
- resuelve que el caller sea usuario de `nexus-pro` y tenga `mi_agente_efectivo()`;
- valida que `p_cuenta_agente_id` exista en `agentes`;
- lee `abonos` por `a.id = p_abono_id`;
- verifica que el abono exista/no esté reversado;
- crea la entrega usando `p_cuenta_agente_id` como destino.

Eso NO demuestra que:
1. el `p_abono_id` pertenezca al cobro que el caller acaba de registrar o esté autorizado a convertir en entrega directa;
2. `p_cuenta_agente_id` sea realmente la cuenta destino seleccionada/registrada en ese cobro;
3. el caller tenga autoridad para vincular ESE abono con ESE agente;
4. un usuario no pueda tomar un UUID válido de otro abono y fabricar una entrega que altere `Dinero en Mano` de un tercero.

Como la función es `SECURITY DEFINER`, no confiar en que RLS de `abonos` proteja este lookup. El guard debe estar DENTRO de la función.

## Trabajo requerido a Claude — SOLO REVISIÓN DEL DISEÑO

1. Releer `seguros_registrar_cobro()` y el flujo frontend real que llama luego a la creación automática de `entregas_admin`.
2. Identificar qué campos server-side del abono permiten demostrar inequívocamente:
   - actor/agente que registró el cobro;
   - método/banco/cuenta destino;
   - si fue realmente un depósito directo que debe producir `entregas_admin`;
   - agente/cuenta destino real.
3. NO inventar campos. Si el abono actual no contiene suficiente evidencia, proponer el cambio mínimo correcto: por ejemplo que `seguros_registrar_cobro()` devuelva/persista un identificador de destino verificable o que la creación de entrega directa forme parte de la misma RPC/transacción de cobro cuando corresponda.
4. Preferencia arquitectónica: evitar una segunda RPC cliente-controlada si la entrega directa es un efecto derivado obligatorio del cobro. Evaluar seriamente integrar `entregas_admin` dentro de `seguros_registrar_cobro()` para que `abono + entrega directa` sean atómicos e idempotentes. Si no conviene, justificar con evidencia por qué deben seguir separadas y cómo se autoriza el vínculo.
5. Si se mantiene `p_cuenta_agente_id`, demostrar de dónde sale y validar server-side que corresponde exactamente al destino del cobro. Existencia en `agentes` NO basta.
6. Probar ataque explícito: agente A intenta usar un `p_abono_id` válido ajeno y/o `p_cuenta_agente_id` de agente B. Debe fallar antes de INSERT.
7. Probar que admin/agente legítimo conserva el flujo actual de depósito directo y que la idempotencia no duplica entrega.
8. Mantener `mi_agente_efectivo()` como compatibilidad temporal para el admin con `profiles.agente_id=NULL`; NO hacer backfill de profiles en 4D-1. Registrar esa normalización como deuda técnica separada.
9. Mantener la decisión de anulación trazable y el filtro futuro `!anulado` en `calcularPorAgente()`.
10. No tocar 4D-2/4D-3/4C.

## Incidente de pruebas
Se toma nota del DDL aplicado accidentalmente y revertido. Para toda prueba restante y futura de 4D-1: ninguna sentencia DDL/DML de prueba contra producción puede ejecutarse fuera del wrapper transaccional con rollback estructural forzado + verificación independiente. Si el harness no puede garantizarlo, detenerse.

## Entrega esperada
Crear entrada NUEVA `docs/bitacora/AAAA-MM-DD-HHMM-claude-bloque4d1-revision2.md` con:
- análisis del vínculo cobro→entrega;
- autoridad server-side corregida;
- SQL revisado de la RPC o diseño atómico alternativo;
- prueba de abuso cross-agent/abono ajeno;
- matriz legítima de admin/agente;
- cero residuos verificados.

NO aplicar migraciones ni publicar frontend hasta nueva aprobación de ChatGPT.