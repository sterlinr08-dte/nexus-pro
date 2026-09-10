# CLAUDE.md — NEXUS PRO Seguros

Este archivo es el **contexto de arranque obligatorio** para Claude y para cualquier sesión que trabaje en `sterlinr08-dte/nexus-pro`.

## Proyecto

- Sistema: **NEXUS PRO Seguros**.
- Repositorio: `sterlinr08-dte/nexus-pro`.
- Rama de producción: `main`.
- Producción: `https://nexusprord.com`.
- Supabase producción: proyecto `tnwsgcxurfyuszxsewsn` — **NEXUS PRO Seguros**.
- El deploy de `main` se realiza por integración Git de Cloudflare Workers. No usar GitHub Actions para publicar.

## Regla de coordinación ChatGPT ↔ Claude

Antes de modificar el proyecto:

1. Leer este `CLAUDE.md`.
2. Leer `docs/bitacora/README.md`.
3. Leer las entradas más recientes de `docs/bitacora/` en orden cronológico.
4. Revisar el código y las fuentes reales antes de asumir cómo funciona un módulo.

### Regla obligatoria de bitácora

**Cada cambio, auditoría, decisión técnica, corrección o publicación relevante debe dejar una entrada nueva `.md` para que la otra IA conozca exactamente qué se hizo.**

Formato:

`docs/bitacora/AAAA-MM-DD-HHMM-chatgpt.md`

o

`docs/bitacora/AAAA-MM-DD-HHMM-claude.md`

Nunca editar ni borrar una entrada anterior. Si hay que corregir algo, crear una entrada nueva que haga referencia a la anterior.

Cada entrada debe incluir, cuando aplique:

- solicitud del dueño / objetivo;
- diagnóstico y fuente de verdad encontrada;
- archivos modificados;
- migraciones, RPC, triggers o Edge Functions afectados;
- rama, PR y commit;
- estado de publicación/deploy;
- pruebas realizadas;
- riesgos o pendientes;
- siguiente paso recomendado.

## Regla de publicación

- No publicar a `main` sin autorización explícita del dueño.
- Si el dueño dice “publícalo”, “súbelo”, “ponlo en vivo” o equivalente, se considera autorización para esa entrega concreta.
- No tocar datos históricos ni hacer reparaciones masivas sin autorización específica.
- Antes de cambios de dinero, cobros, transferencias, comisiones o cierres, auditar primero la fuente de verdad y evitar doble contabilización.

## Estado estable reciente

### Rollback visual

El rediseño visual profesional de fases 1–4 y los hotfixes posteriores de parpadeo se revirtieron porque provocaban cambios visuales/FOUC en iPhone. El dueño confirmó que el sistema volvió correctamente al estado anterior.

- PR de rollback: `#311`.
- Commit en `main`: `39c2feb8656b55967c24f2f0f4122fa1eaf66b85`.
- Se preservaron las funciones ya existentes antes del rediseño: pagos en Solicitudes, WhatsApp, cumpleaños, automatizaciones y lógica de negocio.

### Solicitudes — pagos pendientes

Se eliminó la duplicación visual entre “Pagos pendientes de validar” y “Entregas pendientes de confirmar”. Ahora debe existir una sola cola operativa denominada:

**PAGOS PENDIENTES POR VALIDAR**

La cola reutiliza la sección operativa existente y conserva las acciones reales de confirmación/anulación. También incorpora las validaciones bancarias de `seguros_pagos_pendientes_validacion` dentro de la misma sección.

- PR: `#312`.
- Commit en `main`: `062cff2d9db00eb893257b0d926e5ad8c3cc6548`.
- Loader publicado como build `5850`.

## WhatsApp — plantillas conocidas

Plantillas que ya estaban enviando correctamente en los últimos registros verificados:

- `factura_generada`
- `pago_confirmado_periodo_v2`
- `recordatorio_atraso`
- `entrega_confirmada`

Plantillas que seguían pendientes de aprobación de Meta en el último estado comprobado:

- `pago_pendiente_validacion_agente_v2`
- `pago_validado_resumen_agente`

Existe una tarea automática que vigila estas dos plantillas y avisa cuando alguna pase a `APPROVED`.

## Próxima iniciativa acordada — acumulados, transferencias y cierre por ciclo

El dueño quiere integrar correctamente:

1. acumulado de dinero por agente y por ciclo de facturación;
2. transferencias entre agentes;
3. notificaciones WhatsApp al emisor, receptor y administrador;
4. cierre/reporte por ciclo;
5. consolidado mensual sin duplicar ingresos.

### Principio contable obligatorio

**Una transferencia entre agentes NO es un nuevo cobro. Solo cambia la custodia del dinero.**

Ejemplo:

- Robinson cobra RD$25,000.
- Robinson transfiere RD$20,000 a Esterlin.
- Total cobrado real del negocio sigue siendo RD$25,000.
- Robinson queda con RD$5,000 en custodia.
- Esterlin pasa a custodiar RD$20,000 provenientes de Robinson.

Nunca sumar una transferencia interna nuevamente al total cobrado.

### Ecuación de custodia por agente

`Cobrado directamente + transferencias confirmadas recibidas - transferencias confirmadas enviadas = dinero actualmente en custodia`

Las transferencias pendientes no deben cambiar la custodia oficial hasta ser confirmadas por el receptor.

### Flujo esperado de transferencia

Preferencia funcional:

`Pendiente → Confirmada`

Con anulación/corrección si el sistema actual ya la soporta.

Registrar y conservar trazabilidad de:

- agente origen;
- agente destino;
- monto;
- fecha;
- ciclo/período;
- estado;
- referencias/auditoría.

### Notificaciones WhatsApp esperadas

Al confirmarse una transferencia:

- Emisor: monto transferido, receptor y saldo que queda bajo su custodia.
- Receptor: quién transfirió, monto recibido y nuevo acumulado/custodia.
- Administrador: informar si no es participante; si es receptor/emisor, evitar mensaje administrativo duplicado.

También se requiere:

- resumen del acumulado del período para cada agente;
- resumen administrativo por agente;
- cierre por ciclo;
- consolidado mensual.

Posibles plantillas nuevas, sujetas a auditoría y a convención existente:

- `transferencia_agente_confirmada_emisor`
- `transferencia_agente_recibida`
- `resumen_ciclo_agente`
- `resumen_ciclo_admin`

No crear plantillas nuevas sin revisar primero si alguna existente cubre el mismo caso.

### Reporte por ciclo

Para cada agente y ciclo debe poder determinarse:

- cobrado directamente;
- transferido a otros agentes;
- recibido de otros agentes;
- saldo pendiente en su poder;
- movimientos que explican cada cifra.

Ejemplo:

| Agente | Cobrado | Transferido | Recibido | Pendiente en poder |
|---|---:|---:|---:|---:|
| Robinson | RD$25,000 | RD$20,000 | RD$0 | RD$5,000 |
| Esterlin | RD$40,000 | RD$0 | RD$20,000 | RD$60,000 |

En ese ejemplo el total real cobrado es **RD$65,000**, no RD$85,000.

### Orden de trabajo obligatorio

Antes de implementar esta iniciativa:

**Fase 0 — Auditoría.** Revisar tablas, RPC, triggers, Edge Functions y frontend reales relacionados con cobros, `entregas_admin`, transferencias entre agentes, acumulados, períodos y reportes. Determinar qué ya existe y cuál es la fuente de verdad. No crear contabilidad paralela.

Después, si la auditoría lo confirma:

- **Fase A:** modelo/cálculo de custodia y transferencias.
- **Fase B:** notificaciones WhatsApp.
- **Fase C:** cierre por ciclo y reportes.
- **Fase D:** QA y reconciliación matemática.

### Casos mínimos de QA

Probar como mínimo:

- Robinson cobra RD$25,000 y transfiere RD$20,000 a Esterlin;
- transferencia parcial;
- varias transferencias en el mismo ciclo;
- transferencia pendiente sin confirmar;
- transferencia anulada;
- agente que recibe de dos agentes;
- administrador cobrando directamente y recibiendo transferencias;
- dos ciclos dentro del mismo mes;
- cierre mensual;
- comprobación matemática de que ninguna transferencia aumenta el total cobrado.

## Criterio de aceptación de la iniciativa

NEXUS PRO debe responder sin ambigüedad:

- ¿Cuánto cobró cada agente?
- ¿Cuánto transfirió?
- ¿Cuánto recibió?
- ¿Cuánto todavía tiene bajo su custodia?
- ¿Cuánto recibió el administrador de cada agente?
- ¿Cuánto cobró el administrador directamente?
- ¿Cuál fue el total real cobrado del ciclo?
- ¿Cuál fue el consolidado mensual sin doble contabilización?

Si alguna respuesta depende de sumar manualmente datos de distintas pantallas, la implementación todavía no está completa.
