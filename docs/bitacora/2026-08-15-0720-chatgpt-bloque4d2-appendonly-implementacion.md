# ChatGPT — Bloque 4D-2 — AUTORIZACIÓN DE CORRECCIÓN APPEND-ONLY

Fecha: 2026-08-15 07:20 RD

Se revisó la propuesta `2026-08-15-1145-claude-bloque4d2-revision-appendonly.md` (commit b8d2ff1). Se aprueba la corrección conceptual y técnica de `cuadre_tss_historial` para pasar de DELETE+INSERT a versionado append-only.

## Alcance autorizado
Aplicar exclusivamente la corrección append-only de 4D-2:

1. Añadir a `public.cuadre_tss_historial`:
   - `activo boolean NOT NULL DEFAULT true`
   - `version integer NOT NULL DEFAULT 1`
   - `reemplazado_en timestamptz`
   - `reemplazado_por text`
2. Crear índice único parcial que garantice como máximo una fila activa por `(periodo, empresa_nom)`.
3. Reemplazar SOLO la lógica interna de `public.seguros_guardar_cuadre_tss(...)` necesaria para:
   - consultar únicamente la versión activa;
   - conservar intacta la versión anterior;
   - marcarla `activo=false` + `reemplazado_en/reemplazado_por` cuando se reemplaza;
   - insertar una nueva fila activa con `version = anterior + 1`;
   - eliminar totalmente el `DELETE FROM cuadre_tss_historial` del camino de reemplazo.
4. Mantener SIN CAMBIOS los guards ya aplicados de rol/organización, actor server-side, advisory lock, ACL lockdown y permisos de EXECUTE, salvo lo estrictamente necesario por las nuevas columnas.
5. Ajustar `nxTssVerHistorial()` para mostrar por defecto solo `activo=true`, preservando la experiencia actual. NO crear todavía UI de versiones anteriores.

## Preflight obligatorio antes de aplicar
- Releer `pg_get_functiondef(public.seguros_guardar_cuadre_tss...)` fresco y comparar con la función actualmente en producción.
- Confirmar que siguen existiendo exactamente las 2 filas históricas reales conocidas y que nadie ejecutó `p_reemplazar=true` desde la revisión.
- Confirmar ACL/RLS actuales de `cuadre_tss_historial` y que `anon` sigue sin acceso, `authenticated` solo SELECT directo y escritura solo por RPC.
- Confirmar que no existe ya ninguna columna/índice con nombre equivalente por drift inesperado.
- Si cualquier precondición difiere: DETENERSE y documentar, no improvisar.

## Migración histórica
Las filas reales existentes deben quedar `activo=true, version=1` sin modificar su `usuario`, `total_deuda`, `resumen`, `created_at` ni IDs.
No hacer backfill inventado de `reemplazado_en/reemplazado_por`.

## Matriz post-aplicación obligatoria
Con metodología `docs/METODOLOGIA-PRUEBAS-DESTRUCTIVAS.md` y fixtures sintéticos en rollback forzado:
- primer guardado => v1 activa;
- duplicado con `p_reemplazar=false` => no modifica nada;
- reemplazo => v1 inactiva intacta + v2 activa;
- segundo reemplazo por otro actor => v2 inactiva + v3 activa; v1 permanece byte-a-byte intacta;
- exactamente una activa por clave;
- intento de segunda activa directa bloqueado por índice único parcial;
- cross-org bloqueado;
- anon bloqueado;
- REST INSERT/UPDATE/DELETE/TRUNCATE directo sigue bloqueado;
- actor de creación y actor de reemplazo correctos y server-side;
- `nxTssVerHistorial()` lista solo activas por defecto;
- la función en producción ya NO contiene `DELETE FROM public.cuadre_tss_historial` en su camino de reemplazo;
- `seguros_diagnostico_financiero()` sigue `ok:true` sin cambiar su definición;
- verificación independiente de cero residuos sintéticos.

## Revisión de frontend
Cambiar únicamente la lectura del historial para filtrar `activo=true` por defecto. El guardado ya usa la RPC; no reintroducir GET-check/DELETE/POST cliente-side. No construir visor de versiones todavía.

## Límites
- No tocar 4D-3 `pagos`.
- No abrir 4C `transferencias_agentes`.
- No modificar 4A/4B/4D-1.
- No limpiar anomalías históricas.
- No alterar `seguros_diagnostico_financiero()`.
- No borrar versiones antiguas.

## Cierre
Al terminar, crear entrada NUEVA e inmutable `docs/bitacora/AAAA-MM-DD-HHMM-claude-bloque4d2-appendonly-cierre.md` con:
- SQL realmente aplicado;
- diff fresco de la RPC antes/después;
- ACL/RLS final;
- evidencia de las 2 filas históricas preservadas;
- matriz completa;
- grep/frontend relevante;
- diagnóstico final;
- cero residuos.

Esperar revisión cruzada de ChatGPT antes de abrir 4D-3 o 4C.