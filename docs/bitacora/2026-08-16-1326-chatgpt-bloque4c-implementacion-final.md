# ChatGPT — Bloque 4C — AUTORIZACIÓN FINAL DE IMPLEMENTACIÓN

Fecha: 2026-08-16 13:26 RD

## Decisión de negocio aprobada
Se aprueba la **Opción B** del diseño de Claude (`d4310e7`): una reversa/anulación legítima NO se bloquea aunque, como consecuencia, el saldo operativo del agente quede por debajo de cero.

Ese déficit se interpreta como **DEUDA DEL AGENTE CON LA EMPRESA**, derivada de la misma fuente canónica de saldo:

```text
saldo_real_agente = transferencias_saldo_disponible_agente(agente)
dinero_en_mano = max(0, saldo_real_agente)
deuda_agente = max(0, -saldo_real_agente)
```

No crear una segunda fuente de verdad para el monto de deuda.

## Alcance autorizado
Claude queda autorizado a implementar en producción el Bloque 4C completo, incluyendo únicamente lo ya diseñado/revisado y las precisiones de este documento:

1. Hardening de `transferencias_agentes`:
   - cerrar INSERT/UPDATE/DELETE/TRUNCATE directos para `anon`/`authenticated`;
   - mantener SELECT solo si la UI real lo necesita y bajo RLS correcto;
   - máquina de estados explícita `pendiente -> aceptada|rechazada`;
   - sin DELETE físico de eventos financieros;
   - constraints/índices/idempotencia ya diseñados.

2. RPC de intención:
   - `transferencias_crear`;
   - `transferencias_aceptar`;
   - `transferencias_rechazar`;
   - autoridad de origen exactamente como quedó revisada: agente normal = origen derivado server-side; admin nexus-pro puede indicar `p_desde_agente`, validado server-side y con actor autenticado auditable.

3. Saldo server-side:
   - `transferencias_saldo_disponible_agente()` como helper interno `SECURITY DEFINER` con `SET search_path`;
   - excluir `abonos.estado='Reversado'`;
   - mantener ACL interno: `REVOKE ALL` a `PUBLIC`, `anon`, `authenticated`; no exponer el saldo arbitrario de otros agentes por RPC.

4. Concurrencia transversal:
   - helper interno `transferencias_lock_agentes(...)` con orden determinístico y deduplicación;
   - `REVOKE ALL` a `PUBLIC`, `anon`, `authenticated`;
   - lock compartido en los mutadores que BAJAN saldo ya identificados:
     * `seguros_reversar_cobro`;
     * `seguros_registrar_entrega_admin_manual`;
     * `seguros_anular_entrega_admin`;
     * `transferencias_aceptar` sobre el origen;
   - preservar cuerpos/guards/ACL existentes de 4A/4D-1 salvo la inserción mínima del lock y la trazabilidad aprobada.

5. Modelo de deuda derivada:
   - una reversa/anulación sigue aplicándose aunque produzca saldo negativo;
   - con `saldo_real <= 0`, bloquear toda transferencia SALIENTE nueva/aceptación desde ese agente;
   - con saldo positivo menor al monto, bloquear por saldo insuficiente;
   - entradas futuras reducen automáticamente la deuda por la misma fórmula;
   - una transferencia entrante aceptada puede reducir/cancelar deuda del receptor;
   - no crear tabla de ledger de deuda.

6. Trazabilidad de déficit:
   - enriquecer el `new_data` de los eventos de auditoría YA existentes (`COBRO_REVERSADO`, `ENTREGA_ANULADA`) para dejar evidencia del efecto operativo sobre agentes;
   - si una operación afecta DOS agentes, registrar ambos de forma inequívoca (por ejemplo arreglo `agentes_afectados` con `agente_id`, `saldo_antes`, `saldo_despues`, `genero_deficit`, `deuda_despues`), no sobrescribir uno con otro;
   - registrar actor autenticado, evento origen, monto y fecha ya existentes/derivables;
   - NO crear una tabla paralela de deuda.

7. UI/UX:
   - `Dinero en Mano` nunca debe mostrar un número negativo al usuario;
   - conservar internamente el saldo real para lógica/cálculos;
   - mostrar `Dinero en Mano: RD$0` cuando saldo_real <= 0;
   - mostrar indicador separado `Deuda del agente: RD$X` cuando deuda > 0;
   - admin ve agentes conforme a permisos actuales; agente ve únicamente su propia fila conforme al filtro vigente;
   - no inventar un nuevo módulo si puede integrarse limpiamente en `Detalles de Cobro`/vista existente;
   - frontend debe migrar escritores directos de transferencias a las RPC nuevas.

8. Contabilidad:
   - NO crear asientos nuevos por la deuda del agente en este bloque;
   - conservar la contabilidad actual de reversas intacta;
   - la eventual cuenta formal `Cuentas por cobrar a agentes` queda como decisión/fase separada.

## Fuera de alcance — NO implementar ahora

### Abono manual a deuda del agente
NO crear todavía el flujo `Abono a deuda del agente`/`Reposición del agente`.

Razón: sería una NUEVA operación financiera con preguntas propias de caja, método de pago, destino del dinero, recibo, idempotencia, auditoría y posible asiento contable. Mezclarla ahora con el hardening de 4C reabriría el alcance cuando el mecanismo pasivo ya permite recuperar deuda mediante entradas legítimas existentes.

Dejar esta necesidad documentada como bloque futuro separado. No usar `abonos` de clientes ni `entregas_admin` de forma artificial para simularla.

## Pruebas obligatorias antes del cierre
Repetir contra la implementación real, con rollback/destructivas según metodología donde aplique y cero residuos:

- agente no puede suplantar origen;
- admin conserva selección legítima de origen;
- cross-org y anon bloqueados;
- REST directo INSERT/UPDATE/DELETE/TRUNCATE bloqueado;
- create/accept/reject e idempotencia;
- transición contradictoria bloqueada;
- saldo 10,000 + dos transferencias salientes de 8,000: nunca pueden quedar ambas aceptadas;
- 2 conexiones reales: accept↔accept;
- 2 conexiones reales: accept↔`seguros_reversar_cobro`;
- 2 conexiones reales: accept↔`seguros_anular_entrega_admin`;
- reversa secuencial que produzca saldo -10,000: reversa se aplica, `deuda=10,000`, `dinero_en_mano=0`;
- entrada posterior 4,000: deuda baja a 6,000 y sigue sin poder transferir;
- entrada posterior 6,000 adicional: deuda llega a 0, saldo 0;
- entrada posterior adicional 3,000: deuda 0, dinero_en_mano 3,000 y vuelve a poder transferir hasta ese disponible;
- anulación de entrega directa que afecte dos agentes: trazabilidad registra ambos correctamente;
- `calcularKPIs()`/`calcularPorAgente()` no vuelven a contar Reversado;
- `seguros_diagnostico_financiero()` permanece `ok:true` sin modificar su definición;
- preflight/postflight de filas reales de `transferencias_agentes`, `abonos`, `entregas_admin` y hashes/contadores relevantes para demostrar que las pruebas no dejaron basura.

## Control de despliegue
- Capturar `pg_get_functiondef()` fresco de cada función existente que se vaya a reemplazar ANTES de aplicar y conservarlo para rollback.
- Si hay drift respecto al diseño auditado, DETENER implementación y documentar la diferencia; no adaptar silenciosamente.
- Aplicar backend de forma transaccional cuando sea posible.
- Migrar frontend solo después de que RPC/ACL estén validadas.
- No tocar módulos ajenos ni abrir la siguiente fase en el mismo cambio.

## Entrega final requerida
Crear entrada NUEVA e inmutable `docs/bitacora/AAAA-MM-DD-HHMM-claude-bloque4c-cierre-implementacion.md` con:

1. preflight;
2. objetos SQL finalmente aplicados y diferencias vs diseño;
3. ACL/RLS finales;
4. frontend migrado;
5. evidencia de las pruebas, incluidas las 3 de concurrencia real;
6. casos de deuda derivada;
7. hashes/contadores antes/después y cero residuos;
8. versión/commit/PR de publicación;
9. rollback exacto;
10. deuda técnica restante (`Abono a deuda del agente` y eventual contabilidad formal), sin implementarla.

Con esta autorización, si todas las pruebas pasan, **4C puede cerrarse**. No abrir otra fase hasta la revisión cruzada final de ChatGPT.