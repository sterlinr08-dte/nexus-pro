# ChatGPT → Claude — Auditoría estricta independiente del módulo Seguros

**Fecha:** 2026-08-10

El dueño decidió pausar Artículo 360° y pasar al núcleo de **Seguros de Salud**. Esta vuelta es **SOLO auditoría independiente**: no programes, no publiques, no versiones, no apliques SQL ni cambies producción todavía.

## Objetivo

Auditar el módulo de Seguros como dinero real en producción: clientes, ARS/planes/pólizas, facturación mensual, deuda, cobros, deuda anterior, NCF, agentes, transferencias entre agentes, comisiones, documentos, auditoría, permisos, RLS/RBAC, integridad de base y procedimientos operativos.

No quiero una lectura complaciente. Contradice mis hallazgos si el código/base demuestra lo contrario. Cada conclusión debe indicar evidencia: función/tabla/constraint/policy real y, cuando aplique, conteo real de producción.

## Hallazgos preliminares de ChatGPT que debes CONFIRMAR o REFUTAR

1. **Cobro no atómico.** En el flujo actual de abono normal se actualiza `clientes.pagado` y después se inserta `abonos`; son operaciones separadas. Verifica todos los caminos de cobro, no solo uno.
2. **Cobro de deuda anterior no atómico.** Se modifica `clientes.deuda_anterior`, luego se inserta `abonos`, luego se intenta asiento contable; confirmar exactamente qué pasa si falla cada paso.
3. **Eliminación/reversa de cobro no atómica.** Se borra `abonos`, luego se recalcula `clientes.pagado` y después se intenta asiento de reversa. Determina si existe algún mecanismo que cierre la ventana de inconsistencia.
4. **`try/catch` de compatibilidad degrada datos obligatorios.** Verifica el patrón que intenta insertar abono con banco/agente y, si falla, reintenta quitando columnas hasta que guarde. Si sigue vivo en producción, clasificarlo por severidad.
5. **RLS demasiado amplia por tabla.** Confirmar policies reales: varias tablas de Seguros permiten `ALL` a cualquier `authenticated` de la organización. Distinguir: aislamiento por organización vs autorización por rol/acción. Confirmar si el frontend es hoy la única barrera para editar/borrar pagos, clientes, facturas, agentes, NCF, etc.
6. **Integridad de base insuficiente.** Confirmar FKs, CHECKs, UNIQUEs, NOT NULL reales en `clientes`, `facturas`, `abonos`, `agentes`, `ars_catalog`, `transferencias_agentes`, `entregas_admin`, `documentos_clientes`, `secuencias_ncf` y tablas relacionadas. No asumir por el JS.
7. **Datos históricos incompletos.** Medir de nuevo producción y clasificar lo histórico vs lo que todavía puede crear el sistema actual: abonos sin referencia, transferencia/depósito sin banco, abonos sin agente, clientes activos sin ARS, sin fecha de inicio, sin cédula/documento, etc.
8. **Deuda sí parece sana hoy.** Confirmar con SQL que `clientes.pagado` cuadra con ledger válido, `deuda_total` cuadra con facturas no anuladas, no hay factura duplicada por cliente/período y no hay NCF duplicados.
9. **NCF histórico vs actual.** Confirmar formato real actual, secuencia atómica, índice único y cuántos históricos están en formato viejo. No recomendar reescribir documentos fiscales ya emitidos salvo base legal/documental inequívoca.
10. **Comisiones y transferencias entre agentes quedaron fuera del §9 original.** Auditarlas ahora: fuente de verdad, estados, edición/borrado, duplicados, conciliación, entrega a administración, evidencia/comprobante y permisos.

## Auditoría funcional obligatoria

### A. Clientes / asegurados
- Alta, edición, baja/inactivación, reactivación.
- Campos realmente obligatorios hoy y cuáles solo lo son visualmente.
- Documento/cédula: normalización, duplicados, excepciones legítimas.
- ARS: `clientes.ars` vs `ars_catalog`; detectar si son dos fuentes paralelas y riesgo de divergencia.
- Plan: confirmar si existe catálogo real o strings hardcodeados; riesgos de precios/renombres.
- Póliza, fecha inicio/fin, día de facturación, permitir_facturacion, estado_cliente.
- VIP/precio especial, referencias, agente, empresa.
- Dependientes: confirmar estructura real de `deps`; si sigue siendo texto/JSON no normalizado, riesgos y propuesta.
- Documentos del cliente: tabla/storage, permisos, borrado, tipos, trazabilidad.

### B. Facturación mensual
- Función manual y auto-facturación del servidor/worker si existe.
- Anti-duplicado real en código y en DB: ¿hay UNIQUE de cliente+periodo+no anulada o depende de pre-check?
- Congelación de precio y origen del precio titular/dependiente/especial.
- Corte 20→20 y definición inequívoca de período.
- Corregir precio / anular / volver a emitir.
- Efecto de baja/reactivación del cliente sobre facturación futura.
- Cortesía/familiar/no facturable.
- Concurrencia: dos usuarios o usuario+worker facturando el mismo período.

### C. Deuda y cobros
- Fuente de verdad exacta de deuda facturada, pagado, deuda anterior y estado de factura.
- FIFO `_saldoFacturasCliente` / `resyncEstadoFacturas`: confirmar consistencia y edge cases.
- Pago adelantado: dónde queda representado contablemente y cómo se aplica a facturas futuras.
- Abono normal vs deuda anterior: que nunca se crucen accidentalmente.
- Métodos de pago; banco/referencia/agente/comprobante/recibo.
- Recibo: unicidad, numeración, año, edición/reimpresión.
- Edición de abono: qué campos pueden cambiar y cómo se revierte/reaplica deuda/asiento.
- Eliminación física vs anulación/reversa: clasificar si el hard delete actual debe eliminarse.
- Contabilidad: confirmar si los asientos son transaccionales o best-effort y si se pueden duplicar.

### D. Agentes / entregas / transferencias / comisiones
- `agentes`, `transferencias_agentes`, `entregas_admin` y cualquier tabla de comisión.
- Flujo real desde cobrar → dinero en manos de agente → entrega administración → depósito banco.
- Estados válidos y si existen CHECKs.
- Quién puede crear/confirmar/rechazar/editar/eliminar cada paso.
- Evitar doble entrega/doble depósito/doble comisión.
- Si una transferencia entre agentes cambia la propiedad económica del cobro o solo custodia.
- Conciliación agente ↔ abonos ↔ entregas ↔ banco.

### E. Fiscal / NCF / e-CF
- `siguiente_ncf`, formato, concurrencia, tipo de NCF por cliente.
- B01/B02/B14 y cualquier B15/B04 aplicable al módulo.
- Anulación de factura con NCF: confirmar qué documento fiscal se emite hoy realmente en Seguros.
- e-CF: separar claramente requisito externo/pendiente técnico de lo ya implementado. No afirmar fechas legales sin fuente vigente si no la verificas.

### F. Seguridad / permisos / auditoría
- Mapear roles reales y `tienePermiso(...)` usados en Seguros.
- Comparar botones ocultos vs capacidad real de llamar REST directamente bajo RLS.
- Policies por SELECT/INSERT/UPDATE/DELETE y por rol.
- Riesgo de IDOR dentro de la misma organización.
- Auditoría: qué operaciones financieras guardan before/after, quién, cuándo, motivo y referencia.
- Storage/documentos: policies de buckets/objetos si aplica.
- Campos PII/sensibles visibles por rol.

### G. Integridad y reconciliación
Diseña un conjunto de chequeos SQL de solo lectura para detectar periódicamente:
- deuda_total ≠ facturado no anulado;
- pagado ≠ ledger de abonos válidos;
- factura.estado ≠ saldo real;
- abonos huérfanos;
- facturas huérfanas;
- duplicados cliente/período;
- NCF duplicado/formato no vigente;
- cobros sin banco/referencia/agente cuando aplica;
- entrega_admin no conciliada;
- transferencias agente atascadas;
- asientos faltantes/duplicados para cobros;
- clientes facturables sin datos mínimos.

## Reglamentos/procedimientos a evaluar

No los decretes todavía. Confirma qué ya existe y qué falta para proponer una nueva tanda del `REGLAMENTOS.md`:

1. Alta y activación del asegurado.
2. Cambio de plan/ARS/precio/póliza.
3. Gestión de dependientes.
4. Facturación mensual y cierre de período.
5. Cobranza y aplicación de pagos.
6. Reversa/corrección de cobros — sin hard delete de dinero.
7. Caja/custodia del agente, entregas y depósitos.
8. Comisiones de agentes.
9. Mora/seguimiento/suspensión/cancelación/reactivación.
10. Correcciones fiscales y NCF.
11. Seguridad/RBAC y segregación de funciones.
12. Auditoría y reconciliación diaria/mensual.
13. Gestión documental y privacidad de datos.

## Entregable

Devuelve en este mismo archivo o en otro archivo corto nuevo:

- resumen ejecutivo;
- matriz **CRÍTICO / ALTO / MEDIO / BAJO / CORRECTO**;
- cada hallazgo con evidencia exacta de código/base;
- conteos de producción relevantes;
- qué hallazgos de ChatGPT confirmas, corriges o refutas;
- mapa de funciones JS + tablas + RPC/worker involucrados;
- mapa RLS/RBAC real;
- lista de constraints/índices que faltan;
- propuesta de reglamentos y procedimientos, todavía en borrador;
- plan de remediación en fases, priorizado por riesgo de dinero/datos;
- qué puede corregirse sin migración y qué requiere SQL/RPC;
- pruebas mínimas antes de tocar producción.

**No programes ni apliques nada. No publiques. No versiones. No hagas DDL.** Primero auditamos y comparamos resultados.

Regla de bitácora: no reemplazar `docs/BITACORA-CHATGPT-CLAUDE.md`; solo append real. Usa este archivo corto para responder si es más seguro.
