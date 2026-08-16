# ChatGPT — Bloque 4C — saldo negativo del agente / deuda posterior a reversa — SOLO DISEÑO

Fecha: 2026-08-16 12:50 RD

## Contexto
La concurrencia transversal de 4C ya quedó técnicamente validada en rama de prueba con dos conexiones reales y `pg_locks`. También quedó corregido en producción el bug de `calcularKPIs()`/`calcularPorAgente()` que contaba abonos `Reversado`.

Sin embargo, quedó demostrado un caso SECUENCIAL legítimo que puede producir saldo negativo:
1. agente recibe/cobra fondos;
2. transfiere el saldo disponible;
3. posteriormente se reversa el cobro o se anula una entrega que sustentaba ese saldo;
4. el saldo del agente puede quedar negativo.

Este documento NO autoriza implementación de 4C ni cambios adicionales. Se pide cerrar la semántica de negocio antes de producción.

## Criterio recomendado para analizar
No bloquear automáticamente una reversa legítima solo para mantener el saldo del agente >= 0. La verdad del cliente/cobro debe poder corregirse. Si después de esa corrección el agente ya movió el dinero, el resultado económico puede ser que el agente quede debiendo a la empresa.

Pero esa deuda NO debe quedar como un número negativo opaco. Debe ser explícita, trazable, auditable y entendible en UI/reportes.

## Trabajo requerido — SOLO AUDITORÍA/DISEÑO

### 1. Definir semántica exacta
Comparar y recomendar formalmente:
A. bloquear reversa/anulación si deja saldo negativo;
B. permitir reversa/anulación y convertir el déficit en deuda del agente;
C. otra alternativa mejor si existe.

Explicar impacto en verdad financiera del cliente, caja, reportes por agente, auditoría y operación diaria.

### 2. Si se recomienda deuda del agente
Diseñar cómo representarla SIN inventar una segunda fuente de verdad innecesaria.

Analizar al menos dos opciones:
- deuda derivada dinámicamente del saldo disponible negativo;
- registro explícito/ledger de deuda con origen, motivo, actor, referencia a reversa/anulación y estado de recuperación.

Preferir el diseño más simple que preserve trazabilidad y evite desincronización. Si basta derivarla del saldo negativo, explicar cómo conservar evidencia del evento que la originó.

### 3. Recuperación de la deuda
Definir qué debe ocurrir cuando después entran nuevos fondos al agente:
- ¿se compensan automáticamente contra el saldo negativo?
- ¿se necesita una operación administrativa de regularización?
- ¿cómo se evita contar dos veces la recuperación?

No implementar. Solo diseñar flujo y fuente de verdad.

### 4. UI/UX mínima necesaria
Proponer cómo mostrarlo sin alarmas ambiguas:
- `Dinero en Mano` nunca debe presentar una deuda como si fuera efectivo disponible;
- si saldo < 0, mostrar claramente `Deuda del agente` o equivalente;
- monto, origen del déficit, fecha y referencia auditable;
- admin debe poder ver quién debe, cuánto y por qué;
- agente solo debe ver lo que le corresponda según permisos reales.

No publicar frontend todavía.

### 5. Interacción con transferencias
Definir reglas exactas:
- con saldo <= 0 no se puede crear/aceptar transferencia saliente;
- con saldo positivo menor al monto, bloquear;
- si entra dinero y el saldo sigue negativo, no debe volverse transferible hasta cubrir la deuda;
- aceptar transferencia entrante puede reducir una deuda del destinatario si la fórmula canónica así lo determina.

### 6. Asientos/contabilidad
Verificar si esta deuda requiere asiento contable adicional o si ya queda representada por los movimientos existentes. NO crear asientos nuevos por intuición. Si hay brecha contable, documentarla como decisión separada.

### 7. Casos de prueba obligatorios del diseño
Incluir escenarios numéricos claros:
- saldo 2,000 + cobro 10,000 -> transfiere 12,000 -> reversa 10,000 -> resultado esperado;
- saldo -10,000 + nuevo cobro 4,000;
- saldo -10,000 + transferencia entrante 6,000;
- saldo -10,000 + cobro 12,000;
- intento de transferencia saliente mientras saldo <= 0;
- reversa que no genera negativo;
- anulación de entrega directa que genera negativo en uno de dos agentes;
- admin y agente viendo el resultado según permisos.

### 8. No romper lo ya cerrado
No cambiar aún:
- locks y ACL propuestos de 4C;
- 4A/4B/4D salvo que la propuesta requiera una dependencia explícita;
- `seguros_diagnostico_financiero()`;
- datos históricos reales.

## Entrega
Crear entrada nueva e inmutable:
`docs/bitacora/AAAA-MM-DD-HHMM-claude-bloque4c-saldo-negativo.md`

Debe contener:
1. recomendación A/B/C con justificación;
2. modelo de datos o cálculo derivado propuesto;
3. flujo de recuperación;
4. impacto UI/reportes;
5. impacto contable;
6. casos de prueba;
7. SQL/pseudocódigo propuesto SOLO si aporta claridad, sin aplicar;
8. confirmación explícita de cero cambios en producción.

Esperar revisión de ChatGPT antes de cualquier implementación.