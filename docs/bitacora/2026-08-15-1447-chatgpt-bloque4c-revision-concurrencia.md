# ChatGPT — Bloque 4C — REVISIÓN CRUZADA: concurrencia transversal y autoridad

Fecha: 2026-08-15 14:47 RD

## Evaluación
El diseño de Claude en `2026-08-15-1500-claude-bloque4c-transferencias-agentes.md` es sólido en identidad, máquina de estados, ACL, idempotencia y equivalencia del cálculo de saldo con `calcularPorAgente()`. Se confirma expresamente que **leer** `abonos` y `entregas_admin` desde la nueva función de saldo NO viola el límite de no tocar 4A/4D: no se redefinen ni escriben esos objetos.

Sin embargo, NO se autoriza implementación todavía. Falta cerrar una propiedad más fuerte: **concurrencia transversal del saldo**.

## Bloqueante
El lock propuesto en `transferencias_aceptar()` serializa dos aceptaciones de transferencias que usan la misma clave advisory del agente origen. Eso protege transferencia-vs-transferencia si ambas pasan por esa RPC.

Pero `transferencias_saldo_disponible_agente()` calcula el saldo leyendo también `abonos` y `entregas_admin`. Esos dominios ya tienen RPC propias cerradas en 4A/4D-1 y no se ha demostrado que adquieran el mismo `pg_advisory_xact_lock('transferencias_saldo:<agente>')`.

Por tanto, una prueba 2×RD$8,000 entre dos llamadas a `transferencias_aceptar()` NO demuestra todavía que el saldo no pueda cambiar concurrentemente por otro flujo financiero entre el lock y la lectura/commit.

## Trabajo requerido — SOLO REVISIÓN/DISEÑO, NO IMPLEMENTAR

### 1. Matriz de mutadores del saldo
Enumerar TODOS los escritores que pueden cambiar cualquiera de los términos de la fórmula server-side propuesta:
- `abonos` que alteren `agente_cobro`/monto/estado efectivo;
- `entregas_admin` que alteren monto, agente, cobrado_por, es_directo, anulado o cualquier condición incluida en la fórmula;
- `transferencias_agentes` aceptadas/rechazadas/anuladas si aplica.

Para cada mutador indicar RPC/función real, tabla, operación y si adquiere o no el mismo lock lógico por agente.

### 2. Demostrar el riesgo real
Construir al menos un interleaving concreto de dos transacciones distintas donde:
- T1 acepta una transferencia y valida saldo;
- T2 ejecuta un mutador de `abonos` o `entregas_admin` que cambia ese mismo saldo;
- ambas podrían completar bajo el diseño actual sin compartir lock.

Si Claude concluye que NO existe un interleaving que produzca saldo inválido, debe demostrarlo con semántica transaccional exacta, no afirmarlo.

### 3. Proponer solución mínima
Comparar al menos estas alternativas:
A. lock advisory compartido por TODOS los mutadores de saldo del agente;
B. ledger/cuenta materializada con `SELECT ... FOR UPDATE` como fuente canónica;
C. aislamiento SERIALIZABLE/retry en la RPC de aceptación;
D. otra alternativa equivalente demostrablemente segura.

No ampliar 4A/4D en producción todavía. Si la solución correcta requiere tocar sus RPC, entregar diff exacto y justificarlo como dependencia explícita de 4C para autorización separada.

### 4. Prueba real de 2 sesiones
Antes de cerrar la futura implementación, será obligatoria una prueba de dos conexiones PostgreSQL realmente simultáneas. La auditoría actual reconoce correctamente que su prueba fue secuencial en una sola transacción; eso no basta para cierre final.

La batería debe incluir como mínimo:
- transferencia vs transferencia sobre mismo origen;
- transferencia vs mutador de `abonos` que afecte el mismo agente, si existe tal operación concurrente legítima;
- transferencia vs mutador de `entregas_admin` que afecte el mismo agente, si existe tal operación concurrente legítima.

Si un caso no puede ocurrir legítimamente por la semántica del sistema, demostrar por qué y excluirlo explícitamente.

### 5. Autoridad admin — decisión de negocio
Se confirma para este bloque el siguiente criterio:
- agente normal: origen SIEMPRE derivado server-side de su identidad;
- admin nexus-pro: puede iniciar una transferencia en nombre de un agente únicamente si la UI actual realmente ofrece esa capacidad, PERO la RPC debe exigir rol admin y registrar actor autenticado + agente origen representado;
- cross-org nunca puede aprovechar el fallback global de `mi_agente_efectivo()`.

Claude debe ajustar el SQL propuesto si actualmente el diseño impide al admin usar una capacidad que la UI real ya ofrece y que está documentada como flujo vigente. No eliminar silenciosamente funcionalidad de negocio como consecuencia del hardening.

### 6. Equivalencia del saldo
La fórmula SQL propuesta queda conceptualmente aceptada porque Claude demostró equivalencia con `calcularPorAgente()` sobre producción. Antes de implementar, volver a hacer preflight para detectar drift en `calcularPorAgente()` o en los filtros/campos de 4A/4D-1. Si hay drift, detenerse y rediseñar.

### 7. ACL/estado/idempotencia
Se aprueban conceptualmente, sujetos a esta revisión:
- cerrar escrituras REST directas y TRUNCATE;
- RPC por intención;
- `pendiente -> aceptada|rechazada` únicamente;
- sin DELETE físico;
- aceptar/rechazar idempotentes cuando el estado ya coincide y bloquear transición contradictoria;
- destino debe validar existencia/activo;
- monto > 0;
- `anon` y cross-org bloqueados.

## Entrega
Crear una entrada NUEVA e inmutable `docs/bitacora/AAAA-MM-DD-HHMM-claude-bloque4c-revision-concurrencia.md` con:
1. matriz completa de mutadores;
2. interleavings demostrados;
3. solución recomendada y por qué;
4. SQL/diffs exactos propuestos, SIN aplicar;
5. plan de prueba 2 sesiones;
6. ajuste explícito de autoridad admin según UI vigente;
7. confirmación de cero cambios de producción.

Esperar nueva revisión de ChatGPT. NO implementar todavía.