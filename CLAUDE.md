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
- `pago_pendiente_validacion_agente_v2` — **APPROVED**
- `pago_validado_resumen_agente` — **APPROVED**

Las dos plantillas de agente anteriores ya fueron aprobadas por Meta. La vigilancia automática que esperaba su aprobación ya no es necesaria.

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

### Regla de ciclos y atribución de pagos — decisión del dueño (11-sep-2026)

- **Los agentes no tienen comisión.** No incluir comisión en reportes, acumulados ni plantillas relacionadas con este flujo.
- El ciclo operativo de agentes es **del día 20 de un mes al día 20 del mes siguiente**.
- La implementación debe definir el corte técnico del día 20 de forma que un mismo pago nunca pueda caer en dos ciclos. Antes de modificar cálculos existentes, auditar timestamps, zona horaria y fuente de verdad.
- **La atribución del acumulado del agente se hace por la fecha real en que el pago fue aplicado/cobrado, no por el período de la deuda que ese pago está saldando.**
- Si un cliente tiene, por ejemplo, una cuota atrasada del ciclo anterior y otra del ciclo actual, y el agente cobra ambas durante el ciclo actual, **ambos importes cuentan como dinero cobrado por el agente en el ciclo actual**.
- El período de la factura/cuota del cliente debe conservarse para la cuenta por cobrar y el historial del cliente, pero **no debe mover retroactivamente el efectivo cobrado hacia un ciclo anterior del agente**.
- Por tanto, NEXUS PRO debe distinguir dos conceptos distintos:
  1. **período/cuota a la que corresponde la deuda del cliente**;
  2. **fecha efectiva del pago y ciclo de cobro del agente**.
- No reconstruir el acumulado del agente usando solamente el mes o período de la factura; eso distorsionaría el dinero realmente recibido dentro de cada ciclo.

#### Caso mínimo obligatorio de QA para esta regla

Cliente con dos pagos pendientes:

- uno correspondiente al ciclo anterior;
- uno correspondiente al ciclo actual;
- ambos cobrados/aplicados por el mismo agente dentro del ciclo actual.

Resultado esperado:

- la deuda del cliente queda aplicada a sus períodos correctos;
- el acumulado de cobro del agente en el ciclo actual aumenta por **la suma de ambos pagos**;
- el ciclo anterior del agente no se recalcula retroactivamente por ese cobro tardío;
- no existe doble contabilización.

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
- comprobación matemática de que ninguna transferencia aumenta el total cobrado;
- pago tardío de un período anterior cobrado dentro del ciclo actual, verificando que el acumulado del agente se atribuya al ciclo de cobro real.

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

---

## Encargo visual vigente — WhatsApp móvil (10-sep-2026, 20:09 RD)

El dueño compartió una captura real de **NEXUS PRO en iPhone/Safari** y pidió que **Claude + ChatGPT optimicen visualmente el Inbox de WhatsApp**. Esta solicitud es de **diseño/densidad visual**, no de lógica de negocio.

### Lo que se ve en la captura y debe mejorar

La pantalla conserva el concepto visual actual y funciona, pero en móvil consume demasiada altura antes de llegar a las conversaciones:

- bloque `WHATSAPP / INBOX` demasiado alto;
- las 5 tarjetas KPI (`Conversaciones`, `Sin responder`, `Cobranza`, `Póliza`, `Sin vincular`) tienen demasiado volumen vertical;
- la zona de acciones deja `CONTACTOS` como elemento muy protagonista y ocupa otra franja completa;
- la cabecera `CONVERSACIONES / 20 CHATS` también es alta;
- las tarjetas de cada conversación son cómodas pero demasiado altas para una bandeja operativa;
- el botón flotante morado inferior derecho puede invadir visualmente la lista;
- hay mucho radio, padding y espacio en blanco acumulado entre bloques;
- resultado: se ven pocas conversaciones por pantalla y el Inbox se siente “gigante”.

### Objetivo visual

Mantener la estética moderna, clara y tipo glass/píldora que ya gusta al dueño, pero convertir la pantalla en un **Inbox móvil mucho más compacto y operativo**:

1. **Header WhatsApp compacto**: conservar logo + `WHATSAPP / INBOX`, pero reducir altura y padding sin perder identidad.
2. **KPIs compactos**: mantener los 5 datos y sus iconos, pero con menor altura, tipografía jerárquica y separación más estrecha. No eliminar información útil solo para ganar espacio.
3. **Acciones compactas**: `Contactos` y las demás acciones deben convivir sin crear otra “tarjeta gigante”. Preferir píldoras/scroll horizontal controlado si aplica.
4. **Lista como protagonista**: la zona `CONVERSACIONES` debe empezar bastante más arriba y ocupar la mayor parte del viewport.
5. **Filas de conversación**: reducir padding/altura, manteniendo avatar, nombre, preview, hora, etiqueta de estado y acceso. Deben poder verse más chats simultáneamente.
6. **Buscador**: mantener el patrón actual de lupa que abre búsqueda; evitar un input permanente ocupando ancho/alto innecesario.
7. **Botón flotante**: revisar tamaño/posición/z-index para que no tape conversaciones ni compita con acciones del módulo.
8. **Safe areas iPhone**: respetar `env(safe-area-inset-*)`, Safari y teclado. No volver a introducir FOUC, saltos al cargar ni problemas de scroll.
9. **Sin barra inferior nueva**: el dueño ha preferido evitar navegación inferior fija cuando duplica funciones.
10. **No duplicar funciones**: conservar una sola entrada por acción real.

### Restricciones técnicas

- **No tocar Supabase, pagos, Zernio, Realtime, automatizaciones ni reglas de negocio por este trabajo visual.**
- No modificar la lógica estable de carga/envío del chat para resolver un tema de tamaño.
- No reintroducir el rediseño masivo que ya fue revertido por FOUC.
- Hacer cambios visuales **aislados, por módulo y reversibles**.
- Revisar la cascada completa de capas `parches-whatsapp-*` antes de agregar otro override; hay muchas capas existentes y no queremos seguir acumulando CSS contradictorio.
- Antes de implementar, identificar cuál es hoy la **última capa que gana la cascada** para cada selector que se quiera compactar.
- Probar al menos en ancho aproximado de iPhone 390–430 px y en escritorio; no asumir que una regla desktop sirve para móvil.
- No publicar a `main` sin autorización explícita del dueño.

### Coordinación con trabajos abiertos

- **PR #326**: propuesta de compactación de WhatsApp **desktop**. Sigue siendo borrador; no mezclarla ciegamente con este encargo móvil.
- **PR #327**: fix del falso `0 conversaciones` tras fallo transitorio de carga. Es funcional/resiliencia y debe revisarse por separado; no atribuirle este cambio visual.

### Qué debe hacer Claude al leer esto

1. Leer la bitácora más reciente y revisar los PR #326 y #327 antes de tocar archivos.
2. Auditar la cascada real de `parches-whatsapp-*` en móvil.
3. Proponer una **optimización visual móvil concreta** basada en la captura del dueño, priorizando densidad y espacio útil.
4. Si implementa, hacerlo en rama/PR aislado, con bitácora nueva y sin publicar.
5. Explicar exactamente qué alturas/paddings/radios/anchos cambia y por qué, y verificar que no afecte chat, scroll, teclado, Realtime ni envío.
6. Dejar la versión lista para que el dueño la vea antes de autorizar publicación.
