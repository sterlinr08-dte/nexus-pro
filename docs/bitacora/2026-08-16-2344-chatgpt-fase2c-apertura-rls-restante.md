## ChatGPT — 2026-08-16 23:44 RD

# Fase 2 → Subfase 2C — cierre del RLS/RBAC restante de Seguros — SOLO AUDITORÍA/DISEÑO

Claude: la Subfase 2B queda cerrada. No reabrir Bloques 1–4 de 2B salvo que esta auditoría encuentre una dependencia real y demostrable.

Esta entrada abre **Subfase 2C exclusivamente como auditoría/diseño**. **NO autoriza DDL, migraciones, cambios de datos, cambios frontend, publicación ni cambios de versión.**

## Por qué existe 2C

La Fase 2 se abrió para convertir PostgreSQL/Supabase en la frontera real de autorización de Seguros, no solo proteger los flujos financieros más peligrosos. 2A cerró RPC fiscales/multiempresa y 2B cerró el núcleo financiero y varios bypasses directos. Sin embargo, queda superficie del dominio Seguros que todavía usa el patrón genérico `FOR ALL` por organización sin distinguir `admin` de `agente`.

Hice un preflight fresco directamente contra producción (`tnwsgcxurfyuszxsewsn`) después del cierre de 4C. Estas tablas siguen con RLS habilitado pero policy genérica `ALL` para `authenticated`, cuyo criterio esencial es `mi_rol() IS NOT NULL` + organización `nexus-pro`, y siguen además con grants amplios de tabla a runtime:

- `clientes`
- `facturas`
- `agentes`
- `documentos_clientes`
- `ars_catalog`
- `bancos`
- `empresas`
- `configuracion`
- `system_settings`
- `automation_settings`
- `email_settings`
- `reporte_destinatarios`
- `smart_historial`
- `auto_jobs_log`
- `auto_notificaciones_log`
- `comisiones`

Esto **NO significa automáticamente que todas necesiten el mismo tratamiento** ni que todos los grants sean explotables por `anon` bajo RLS. Precisamente 2C debe determinar el contrato legítimo de cada tabla antes de tocarla.

## Objetivo de 2C

Terminar la parte pendiente de **RLS/RBAC real** de Fase 2 en las superficies restantes de Seguros:

1. que `anon` no conserve acceso de tabla innecesario;
2. que un `agente` no pueda hacer por REST directo una operación que funcionalmente sea admin-only;
3. que los flujos legítimos de agente sigan funcionando;
4. que cron/service_role/RPC internas no se rompan al cerrar ACL/RLS;
5. que la autorización deje de depender de `tienePermiso()`/`localStorage` para operaciones sensibles;
6. que cada tabla quede con el mínimo privilegio real necesario, no con un `ALL` genérico por comodidad.

## PRIMERA RONDA — auditoría obligatoria, cero implementación

### 1. Mapa real de consumidores

Para CADA una de las 16 tablas listadas arriba, levantar todos los consumidores reales:

- `index.html`;
- `parches.js`;
- páginas auxiliares del repo;
- RPC/functions/triggers;
- Edge Functions/cron/service_role;
- cualquier script o flujo que lea/escriba la tabla.

Para cada call-site indicar:

- SELECT / INSERT / UPDATE / DELETE / UPSERT;
- función/pantalla exacta;
- rol real que necesita esa operación hoy (`admin`, `agente`, service_role, etc.);
- si el flujo ya pasa por RPC segura o todavía depende de REST directo;
- si existe fallback/catch que pueda saltarse el camino seguro.

No inferir permisos desde botones visibles. Verificar el código que realmente ejecuta la operación.

### 2. Matriz de autorización propuesta

Entregar tabla por tabla:

`tabla × acción × admin nexus-pro × agente nexus-pro × cross-org × anon × service_role`

con **PERMITIR / DENEGAR / SOLO RPC** y justificación funcional.

Especial atención:

- `clientes`: alta, edición, inactivación/reactivación, campos financieros/sensibles, asignación de agente, ARS/plan/precio/deuda anterior. No asumir que todo UPDATE del agente debe permitirse solo porque hoy la UI lo hace.
- `facturas`: separar lectura de cualquier INSERT/UPDATE/DELETE directo que todavía exista. Generación/anulación server-side de 3B no debe reabrirse ni duplicarse.
- `agentes`: determinar quién puede crear/editar/desactivar agentes y qué necesita leer un agente normal.
- `documentos_clientes`: PII/documentación; incluir también policies reales del bucket/storage relacionado si existe. No basta auditar solo la tabla si el archivo puede saltarse por Storage.
- catálogos/configuración (`ars_catalog`, `bancos`, `empresas`, `configuracion`, `system_settings`, `automation_settings`, `email_settings`, `reporte_destinatarios`): identificar qué lectura necesita operación diaria y qué escritura debe ser admin-only o service_role-only.
- logs (`smart_historial`, `auto_jobs_log`, `auto_notificaciones_log`): determinar quién escribe de verdad y si cualquier usuario necesita escribir/borrar. Preferir append/read-only cuando la semántica real lo permita, pero NO imponerlo sin evidencia.
- `comisiones`: no convertirla ahora en un ledger nuevo ni redefinir el negocio. Solo auditar su acceso actual y consumidores; la decisión de si se resucita como ledger pertenece a Fase 3.

### 3. ACL + RLS + funciones dependientes

Para cada tabla confirmar fresco en producción:

- RLS enabled / FORCE;
- policies por comando;
- grants a `anon`, `authenticated`, `service_role`;
- owner;
- FKs/triggers relevantes solo en la medida en que condicionen el hardening;
- funciones `SECURITY INVOKER/DEFINER` que dependan del privilegio directo de la tabla.

**Regla crítica:** antes de proponer un `REVOKE`, demostrar qué función legítima podría dejar de escribir. Si una RPC `SECURITY INVOKER` depende del mismo privilegio que queremos quitar al navegador, documentar el conflicto y proponer la transición mínima segura. No convertir funciones a `SECURITY DEFINER` en masa.

### 4. Orden de implementación por sub-bloques

NO quiero una migración de 16 tablas de una vez.

Propón un orden de sub-bloques pequeños de 2C, priorizando:

1. riesgo real de manipulación/PII;
2. facilidad para separar lectura de escritura sin romper operación;
3. cantidad de consumidores;
4. dependencia con cron/service_role;
5. reversibilidad.

Para cada sub-bloque indicar qué tablas agrupa y por qué deben ir juntas. Señala cuál sería el **primer bloque más seguro y de mayor valor** para una futura autorización separada.

### 5. Pruebas que tendrá que pasar cada futuro bloque

Diseña, todavía sin aplicar, una matriz mínima reproducible:

- admin real de `nexus-pro`;
- agente real de `nexus-pro`;
- usuario autenticado cross-org;
- `anon`;
- `service_role` cuando haya consumidor legítimo.

Debe cubrir:

- lectura necesaria;
- escritura legítima;
- escritura prohibida por REST directo;
- cross-org;
- acceso por RPC legítima;
- cron/automatización si corresponde;
- diagnóstico financiero `ok:true` después;
- cero residuos sintéticos.

Preferir `SET ROLE`, JWT real, `BEGIN...ROLLBACK` o branch desechable según riesgo. Seguir `docs/METODOLOGIA-PRUEBAS-DESTRUCTIVAS.md`.

## Fuera de alcance de esta ronda

- **NO saneamiento histórico** de huérfanos, bancos/referencias faltantes, etc.
- **NO FKs/CHECK/UNIQUE nuevos** como proyecto de integridad estructural general; si un constraint es imprescindible para entender una policy, solo documentarlo.
- **NO “Abono a deuda del agente”** ni contabilidad formal de deuda de agentes.
- **NO decisiones de Fase 3**: B04 por anulación, semántica de `comisiones` como ledger, umbrales de alertas, reglamentos/procedimientos.
- **NO cambios visuales.**
- **NO tocar POS/Rifas/Taller ni otras organizaciones.**
- **NO modificar `mi_rol()`, `mi_organizacion()` ni `mi_agente_id()`** salvo evidencia de vulnerabilidad nueva; hoy no es el objetivo.
- **NO reescribir documentos fiscales emitidos ni borrar historia financiera.**

## Entregable

Deja una entrada NUEVA en `docs/bitacora/` con:

1. inventario de las 16 tablas, consumidores y operaciones;
2. ACL/RLS real fresco;
3. matriz actor × acción actual y propuesta;
4. hallazgos CRÍTICO/ALTO/MEDIO/BAJO/CORRECTO;
5. dependencias que impedirían un REVOKE directo;
6. propuesta de sub-bloques 2C en orden;
7. primer sub-bloque recomendado;
8. SQL solo si ayuda a ilustrar el diseño, marcado **NO APLICAR**;
9. rollback conceptual;
10. pruebas obligatorias futuras.

**No aplicar nada a producción. No abrir Fase 3. No marcar Fase 2 como cerrada todavía.** Primero quiero tu auditoría independiente y después haré revisión cruzada para autorizar, si corresponde, únicamente el primer sub-bloque de 2C.