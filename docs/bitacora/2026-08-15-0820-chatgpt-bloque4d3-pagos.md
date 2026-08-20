# ChatGPT — Subfase 2B / Bloque 4D-3 — `pagos` — AUDITORÍA ESTRICTA, NO IMPLEMENTACIÓN

Fecha: 2026-08-15 08:20 RD

## Estado de partida
4D-1 (`entregas_admin`) y 4D-2 (`cuadre_tss_historial`, append-only) están cerrados. No reabrirlos salvo evidencia reproducible de regresión. 4C (`transferencias_agentes`) sigue pendiente y NO se abre dentro de este trabajo.

La auditoría general de 4D encontró una tabla `public.pagos` con 1 fila y, en ese momento, cero lectores/escritores/RPC conocidos. Ese dato es SOLO una hipótesis de partida: debe releerse fresco contra producción y contra el repo actual antes de decidir nada.

## Objetivo
Determinar con evidencia si `public.pagos` es:
1. una tabla huérfana/legacy que puede congelarse y deprecarse;
2. una dependencia histórica todavía necesaria;
3. un artefacto con información que deba migrarse a otra fuente canónica;
4. o una superficie financiera todavía expuesta que requiera hardening distinto.

NO borrar, renombrar, migrar ni modificar datos en esta fase.

## Trabajo requerido — SOLO AUDITORÍA / DISEÑO

### 1. Inventario de producción fresco
Releer:
- esquema completo de `public.pagos`;
- fila(s) reales y timestamps;
- PK/FK/constraints/indexes/secuencias;
- RLS/policies;
- ACL/GRANT por `anon`, `authenticated`, `service_role`, `postgres`;
- owner;
- triggers;
- vistas/materialized views que la referencien;
- funciones/RPC (`pg_proc.prosrc`, dependencias de catálogo) que la referencien;
- Edge Functions activas y código relacionado;
- cualquier job/cron/respaldo que dependa de ella específicamente.

### 2. Consumidores reales del repo
Grep exhaustivo de `index.html`, `parches.js`, migrations, SQL, Edge Functions y demás archivos del repo para:
- `pagos` exacto;
- `public.pagos`;
- REST `/pagos`;
- `api.get/post/patch/del('pagos'...)`;
- consultas SQL `FROM/INTO/UPDATE/DELETE pagos`.

Separar cuidadosamente de `abonos`, `pos_abonos`, `prestamo_pagos` u otras tablas de pagos activas. No confundir por substring.

### 3. Historia Git
Buscar en el historial del repositorio si `pagos` fue usada antes:
- commits que agregaron/eliminaron referencias;
- funciones antiguas;
- migraciones eliminadas;
- nombres anteriores del módulo.

Si existió un consumidor histórico, documentar cuándo dejó de usarse y qué tabla/flujo lo sustituyó, con commit/evidencia si es posible.

### 4. Analizar la única fila real
Sin modificarla:
- documentar sus columnas y valores relevantes;
- verificar si `cliente_id` existe en `clientes`;
- si `factura_id` existe en `facturas`/tabla canónica correspondiente;
- si monto/fecha/método/referencia coinciden inequívocamente con un `abono` u otro registro canónico;
- resolver `created_by_user_id` / `updated_by_user_id` si existen;
- determinar si es evidencia de una operación real o fixture/prueba/legacy.

NO deducir equivalencia solo por monto o fecha si no es inequívoca.

### 5. Riesgo actual
Demostrar qué podría hacer HOY:
- `anon`: SELECT / INSERT / UPDATE / DELETE / TRUNCATE;
- authenticated nexus-pro admin;
- authenticated nexus-pro agente;
- authenticated cross-org;
- service_role cuando corresponda.

Recordatorio: `TRUNCATE` ignora RLS. Revisar ACL además de policies.

### 6. Decisión de ciclo de vida
Proponer UNA recomendación principal con evidencia:

**A. Congelar + deprecar** si no tiene consumidores legítimos.
- preservar tabla y fila;
- bloquear escrituras de `anon`/`authenticated`;
- decidir justificadamente si `authenticated` necesita conservar SELECT o si puede revocarse también;
- `service_role`/postgres deben conservar lo requerido para respaldos/administración;
- opcional: `COMMENT ON TABLE`/`COMMENT ON COLUMN` para marcar legado, si procede;
- NO borrar todavía.

**B. Migrar** si contiene información canónica no representada en otro lugar.
- diseñar migración exacta, idempotente y reversible;
- NO ejecutarla;
- conservar origen hasta revisión posterior.

**C. Mantener activa + hardening** si existe un consumidor real actual.
- explicar por qué;
- proponer RPC/ACL/RLS mínimo necesario.

### 7. Defensa contra regresión futura
Si se recomienda deprecar, diseñar cómo evitar que un desarrollador vuelva a usar `pagos` accidentalmente:
- comentario de esquema y documentación;
- ACL cerrado;
- si propone trigger anti-write, justificar compatibilidad con `service_role`/respaldos;
- grep/test estático posible para detectar nuevas referencias.

No agregar mecanismos innecesarios si ACL + documentación bastan.

## Pruebas obligatorias
Usar `docs/METODOLOGIA-PRUEBAS-DESTRUCTIVAS.md`. Preferir solo lectura. Cualquier DDL/DML de prueba debe estar en rollback forzado + verificación independiente posterior.

Mínimo demostrar:
- conteo de filas pre/post idéntico;
- contenido/hash o snapshot de la fila real idéntico pre/post;
- matriz de privilegios real;
- cero consumidores actuales demostrados por grep/catálogo, si esa es la conclusión;
- `seguros_diagnostico_financiero()` continúa `ok:true` y NO se modifica su definición;
- cero residuos de fixtures.

## Límites duros
- NO DELETE/DROP/TRUNCATE/RENAME de `pagos`.
- NO modificar la fila real.
- NO migrar datos reales.
- NO publicar frontend.
- NO tocar 4D-1 ni 4D-2.
- NO abrir 4C.
- NO modificar `seguros_diagnostico_financiero()`.
- NO afirmar "huérfana" únicamente porque no aparezca en `parches.js`; hay que demostrarlo en repo + catálogo + historial razonable.

## Entrega
Crear una entrada NUEVA e inmutable `docs/bitacora/AAAA-MM-DD-HHMM-claude-bloque4d3-pagos.md` con:
- evidencia reproducible;
- inventario;
- historia de uso;
- análisis de la fila real;
- matriz de acceso;
- recomendación A/B/C;
- SQL exacto propuesto + rollback si recomienda cambios;
- riesgos y deuda técnica residual.

Esperar revisión cruzada de ChatGPT antes de aplicar cualquier cambio.