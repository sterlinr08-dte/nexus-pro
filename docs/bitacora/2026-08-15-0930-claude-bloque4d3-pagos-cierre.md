# Claude — Cierre Bloque 4D-3 — `pagos` — IMPLEMENTACIÓN APLICADA

Fecha: 2026-08-15 09:30 RD

## Estado de partida

El diseño de este bloque (`docs/bitacora/2026-08-15-0900-claude-bloque4d3-pagos.md`) quedó publicado
en `main` a la espera de revisión cruzada. En esta sesión llegó **autorización explícita del dueño**,
directa en el chat, con el siguiente contenido textual:

> anon: ningún acceso
> authenticated: ningún acceso
> service_role: conservar acceso, principalmente para que los respaldos existentes no fallen.
>
> No migraría esa única fila hacia abonos sin evidencia inequívoca de equivalencia financiera. Sería
> peor fabricar una relación contable que actualmente no podemos demostrar.
>
> Después del congelamiento podemos mantener `pagos` como legacy read-only de infraestructura,
> documentada como deprecated. En una fase futura, después de revisar los respaldos y establecer un
> período de observación, podremos decidir si realmente merece eliminarse.
>
> 4D-3 está listo para implementar únicamente el congelamiento ACL/deprecación. No autorizaría DROP
> ni transformación de datos.

Esta autorización coincide, punto por punto, con la Opción A ya diseñada en el documento de las 09:00
— incluyendo el matiz más estricto que ya traía esa propuesta (revocar `SELECT` también a
`authenticated`, no solo a `anon`). Se procedió a implementar **exactamente y únicamente** ese alcance:
cierre de ACL + `COMMENT ON TABLE`. No se migró la fila, no hubo DROP, no se tocó ningún dato.

## 1. Migración aplicada

Preflight inmediato antes de aplicar (mismo proyecto, misma tabla, sin drift desde las 09:00): ACL
idéntica (`anon`/`authenticated`/`postgres`/`service_role`, 7 privilegios cada uno — ALL), fila con
`total_filas:1` y `hash_contenido: ef0d3c464ac4554dc341581cee37d9af` (mismo hash documentado en el
diseño).

Migración aplicada vía `apply_migration` (`bloque4d3_pagos_congelar_deprecar`):

```sql
REVOKE ALL ON public.pagos FROM anon;
REVOKE ALL ON public.pagos FROM authenticated;
COMMENT ON TABLE public.pagos IS 'DEPRECATED (Bloque 4D-3, 2026-08-15): tabla sin ningun consumidor de aplicacion demostrado (0 referencias en index.html/parches.js, 0 RPC la referencian de verdad, 0 FK, 0 vistas, 0 triggers, 0 rastro en el historial git de la app). Su unica fila (creada 2026-05-14) referencia un cliente que ya no existe en clientes y no tiene contraparte inequivoca en abonos. Los unicos lectores reales son las funciones de respaldo (service_role, via tablas_para_respaldo() y el Excel mensual de respaldo-correo-mensual) -- ninguno de los dos escribe en ella, y ninguno se ve afectado por este cierre de ACL. No usar para ningun flujo nuevo: abonos / pos_abonos / prestamo_pagos son las tablas de pago activas del sistema, una por modulo (Seguros/POS/Financiamiento). Ver docs/bitacora/2026-08-15-0900-claude-bloque4d3-pagos.md.';
```

Resultado: `success: true`.

## 2. `get_advisors(security)` tras aplicar

Corrido inmediatamente después. **Cero hallazgos nuevos relacionados con `pagos`.** Todos los avisos
devueltos son preexistentes y ya documentados en auditorías anteriores de este mismo engagement (los
`SECURITY DEFINER` ejecutables por `anon`/`authenticated` de `mi_organizacion()`, `mi_rol()`,
`siguiente_ncf()`, `pos_transferir_stock()`, etc., y "Leaked Password Protection Disabled") — ninguno
nuevo, ninguno relativo a esta tabla.

## 3. Matriz de acceso post-aplicación (rollback forzado)

Una sola transacción `DO $...$` con `RAISE EXCEPTION` final (rollback forzado real, no simulado —
metodología de `docs/METODOLOGIA-PRUEBAS-DESTRUCTIVAS.md`), acumulando resultados en un `text` plano
(sin `RAISE NOTICE`, que este harness no surface cuando la transacción termina en excepción) para que
el mensaje de error final los traiga todos:

| # | Prueba | Resultado |
|---|---|---|
| T1 | `anon` SELECT | **BLOQUEADO** (`permission denied for table pagos`) |
| T2 | `anon` INSERT | **BLOQUEADO** |
| T3 | `anon` TRUNCATE (el hallazgo crítico original de la auditoría) | **BLOQUEADO** |
| T4 | `authenticated` (admin nexus-pro real) SELECT | **BLOQUEADO** |
| T5 | `authenticated` (admin nexus-pro real) INSERT | **BLOQUEADO** |
| T6 | `authenticated` (agente nexus-pro real) TRUNCATE | **BLOQUEADO** |
| T7 | `authenticated` (usuario de otra organización real) SELECT | **BLOQUEADO** |
| T8 | `authenticated` (usuario de otra organización real) TRUNCATE | **BLOQUEADO** |
| T9 | `service_role` SELECT | **1 fila** (acceso conservado, tal como se autorizó) |
| T10 | `seguros_diagnostico_financiero()` corrido como el admin real | **`ok:true`**, sin cambios |

Salida cruda del rollback forzado:

```
setup: admin_uid=35319647-f721-40b2-a01d-c3ccb1642649 agente_uid=9758c18f-22eb-4d5b-b99a-2fc4b9791f2c crossorg_uid=f56c1315-d29c-4afd-9185-8c6dd234b59b |
T1 anon-SELECT: BLOQUEADO (permission denied for table pagos) |
T2 anon-INSERT: BLOQUEADO (permission denied for table pagos) |
T3 anon-TRUNCATE: BLOQUEADO (permission denied for table pagos) |
T4 admin-SELECT: BLOQUEADO (permission denied for table pagos) |
T5 admin-INSERT: BLOQUEADO (permission denied for table pagos) |
T6 agente-TRUNCATE: BLOQUEADO (permission denied for table pagos) |
T7 crossorg-SELECT: BLOQUEADO (permission denied for table pagos) |
T8 crossorg-TRUNCATE: BLOQUEADO (permission denied for table pagos) |
T9 service_role-SELECT: 1 filas |
T10 diagnostico: ok=true |
```

**El hallazgo crítico original queda cerrado del todo:** antes de esta migración, `anon` (T-anon-TRUNCATE
del diseño de las 09:00), cualquier `authenticated` de la propia org (T-agente-TRUNCATE), y cualquier
`authenticated` de OTRA organización (T-crossorg-TRUNCATE) podían vaciar la tabla sin que RLS lo
impidiera — el mismo patrón ya cerrado antes en `entregas_admin` (4D-1) y `cuadre_tss_historial` (4D-2).
Ahora los tres caminos están bloqueados a nivel de ACL, que es donde vive de verdad la protección contra
`TRUNCATE` (RLS nunca lo cubre).

## 4. Verificación independiente de cero residuos

Consulta separada, fuera de la transacción de rollback forzado (para no leer un estado contaminado por
ningún TRUNCATE de la batería — los 4 intentos de TRUNCATE de arriba fallaron por permisos antes de
llegar a ejecutarse, así que no había nada que contaminar, pero se verifica igual de forma aislada por
disciplina):

```json
{"total_filas": 1, "hash_contenido": "ef0d3c464ac4554dc341581cee37d9af"}
```

**Idéntico byte a byte** al hash documentado en el diseño de las 09:00 y al preflight de esta misma
sesión. La fila real no se tocó en ningún momento de esta implementación.

## 5. Estado final del ACL y del comentario

```sql
SELECT grantee, string_agg(privilege_type, ',' ORDER BY privilege_type)
FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name='pagos'
GROUP BY grantee ORDER BY grantee;
```

```json
[
  {"grantee": "postgres",     "privilegios": "DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE"},
  {"grantee": "service_role", "privilegios": "DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE"}
]
```

`anon` y `authenticated` ya no aparecen en la lista — quedaron sin ningún privilegio. `postgres` (owner)
y `service_role` conservan acceso completo, exactamente como autorizó el dueño.

`obj_description('public.pagos'::regclass, 'pg_class')` devuelve el comentario completo aplicado en el
paso 1, intacto.

## 6. Los respaldos siguen viendo `pagos` (confirmado, no supuesto)

Se corrió, como `service_role`, `SELECT 'pagos' = ANY(public.tablas_para_respaldo())` → **`true`**. La
función de descubrimiento dinámico de tablas para el respaldo diario sigue incluyendo `pagos` sin
ningún cambio (es `SECURITY DEFINER` y no depende de los grants de `anon`/`authenticated` que se
revocaron). El Excel mensual de `respaldo-correo-mensual` (que la referencia de forma hardcodeada,
hallazgo del documento de diseño) tampoco se ve afectado — ninguna de las dos funciones se tocó, y
ambas corren como `service_role`, cuyo acceso se conservó intacto.

## 7. Qué NO se hizo (límites respetados)

- **No** se migró la fila hacia `abonos` ni ninguna otra tabla — se preserva exactamente como está, sin
  fabricar una relación contable no demostrada, tal como pidió el dueño explícitamente.
- **No** hubo `DROP`/`TRUNCATE`/`RENAME` de `pagos`.
- **No** se modificó la fila real (confirmado con hash idéntico en 3 momentos distintos: diseño de las
  09:00, preflight de esta sesión, verificación final post-aplicación).
- **No** se tocó `seguros_diagnostico_financiero()` — se corrió sin modificar su definición, y sigue
  devolviendo `ok:true`.
- **No** se tocó 4D-1 ni 4D-2.
- **No** se abrió 4C.
- **No** se publicó ningún cambio de frontend — este bloque es 100% backend/infraestructura
  (`index.html`/`parches.js`/`version.json` no se tocaron, no hay nada que publicar en Cloudflare).

## 8. Deuda técnica residual (sin cambios respecto al diseño de las 09:00)

1. El destino final de la fila real (¿es un duplicado de algo en `abonos` que nunca se pudo confirmar,
   o es un dato genuinamente huérfano?) sigue sin resolverse — congelarla en vez de borrarla la
   preserva intacta para la revisión futura que el propio dueño propuso ("período de observación").
2. La hoja "Pagos" del Excel mensual de `respaldo-correo-mensual` va a seguir exportando una tabla
   congelada, sin valor de negocio nuevo — limpieza cosmética menor, deliberadamente fuera de alcance
   (tocar código de Edge Function es infraestructura, no correspondía a esta fase).
3. La anomalía de tipo `factura_id text` vs. `facturas.id uuid` sigue documentada, sin corregir — no
   aplica: la tabla está congelada, no se le va a volver a escribir.

## 9. Cierre

Bloque 4D-3 queda **implementado y cerrado**. `pagos` es ahora legacy read-only de infraestructura
(`postgres`/`service_role` únicamente), documentada como deprecated vía `COMMENT ON TABLE`, con su
única fila preservada sin cambios, y sin ningún consumidor de aplicación que pueda verse afectado
(ninguno existía). Con este cierre terminan los 3 sub-bloques de la auditoría general de Bloque 4D
(`entregas_admin`, `cuadre_tss_historial`, `pagos`) — quedan pendientes, sin abrir, 4C
(`transferencias_agentes`) y cualquier fase futura de revisión/eliminación de `pagos` que el propio
dueño decida iniciar más adelante.
