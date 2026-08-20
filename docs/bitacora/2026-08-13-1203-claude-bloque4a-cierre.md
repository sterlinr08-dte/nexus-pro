# Claude — Bloque 4A CERRADO — ACL de `abonos` (diseño corregido, aplicado y verificado)

Fecha: 2026-08-13 (RD)

## Contexto

En `2026-08-13-0950-claude-bloque4a.md` reporté que el REVOKE ciego autorizado en
`2026-08-13-0902-chatgpt-bloque4a.md` habría roto 3 escritores reales de metadata en
producción (`comprobante_url`, `recibo_num`/`recibo_anio`, `meses_cubiertos` — ver
`parches.js` líneas ~10248, ~15945, ~16125) y propuse un diseño corregido con privilegios
**a nivel de columna** en vez de un REVOKE total sobre `authenticated`.

El dueño autorizó ese diseño corregido pegando el SQL exacto propuesto, sin más texto.
Interpreté eso como la autorización para aplicarlo — mismo patrón ya usado en este mismo
engagement para autorizar SQL de tablas financieras directo en el chat.

## Migración aplicada

`apply_migration` → `bloque4a_cerrar_acl_abonos_column_scoped`:

```sql
REVOKE ALL ON public.abonos FROM anon;
REVOKE INSERT, DELETE, TRUNCATE, TRIGGER, REFERENCES, UPDATE
ON public.abonos FROM authenticated;

GRANT UPDATE (comprobante_url, recibo_num, recibo_anio, meses_cubiertos)
ON public.abonos TO authenticated;
```

Resultado: `{"success":true}`.

## Verificación del ACL resultante (introspección directa, no supuesta)

`information_schema.role_table_grants` sobre `public.abonos`:
- `anon`: **cero grants** (tabla completa).
- `authenticated`: únicamente `SELECT` a nivel de tabla.
- `postgres`/`service_role`: sin cambios (`DELETE, INSERT, REFERENCES, SELECT, TRIGGER,
  TRUNCATE, UPDATE`).

`information_schema.column_privileges` sobre `public.abonos` para `authenticated`:
- `SELECT` en las 28 columnas.
- `UPDATE` en **exactamente** `comprobante_url`, `meses_cubiertos`, `recibo_anio`,
  `recibo_num` — ni una columna de más ni de menos.

## `get_advisors(security)` tras aplicar

Cero hallazgos nuevos relacionados con `abonos`. El listado completo de WARN son
`SECURITY DEFINER` de siempre ya aceptados en este engagement (`mi_rol`,
`mi_organizacion`, `mi_usuario_id`, `mi_agente_id`, `seguros_registrar_cobro`,
`seguros_reversar_cobro`, `seguros_anular_factura`, `seguros_generar_factura_manual`,
`seguros_registrar_asiento_manual`, `seguros_corregir_asiento_manual`,
`pos_siguiente_ncf`, `pos_transferir_stock`, `rifa_expirar_apartados`, `next_recibo*`,
`siguiente_ncf`, `set_organizacion_id`, `set_auditoria_metadata`, `superadmin_orgs`,
`tablas_para_respaldo`) más `cron_secretos` (`rls_enabled_no_policy`, intencional,
preexistente) y `auth_leaked_password_protection` (preexistente, sin relación).

## Matriz completa de pruebas (bloque atómico único con rollback forzado)

Metodología: `docs/METODOLOGIA-PRUEBAS-DESTRUCTIVAS.md` — un solo `DO $...$` con 16
subpruebas en bloques `BEGIN...EXCEPTION WHEN OTHERS` anidados (savepoints implícitos,
un fallo no aborta el resto), acumulando el resultado de cada una en un arreglo y
cerrando con `RAISE EXCEPTION ... USING DETAIL = array_to_string(...)` — el mensaje de
la excepción forzada es lo que Supabase MCP sí devuelve en el payload de error (a
diferencia de `RAISE NOTICE`, que no es recuperable ni por `execute_sql` ni por
`get_logs(service='postgres')` — hallazgo metodológico de esta sesión, documentado
para que no se repita el intento).

**Nota de corrección honesta:** la primera corrida de esta matriz (posterior a aplicar
la migración, no incluida en `2026-08-13-0950-claude-bloque4a.md`) tuvo 2 de 16
subpruebas mal diseñadas — no un problema del ACL aplicado: (a) H6/H7 usaron una fila
de `abonos` elegida sin verificar, que resultó ser
la única fila huérfana de la tabla (`abonos_huerfanos:1`, dato preexistente sin relación
con esta migración) y su UPDATE chocó con el FK guard `abonos_cliente_id_fk_guard`; (b)
H9/H13/H14 llamaron a `seguros_registrar_cobro` con `p_destino:=null`, que la función
interpreta como el camino `deuda_anterior` (no como un error de validación), y el
cliente de prueba no tenía deuda anterior. Se corrigieron los fixtures (fila de abono
verificada como no huérfana, cliente con `deuda_total>pagado` real, `p_destino:=
'facturas'` explícito) y se corrió de nuevo — resultado abajo, íntegro y limpio.

Fixtures usados: Robinson (agente, org nexus-pro), Sterlin08 (admin, org nexus-pro),
Francis (cross-org), un abono real no huérfano, un cliente con deuda pendiente real
(RD$6,000 de RD$16,000), un agente de cobro activo.

```
H1 anon: SELECT=f INSERT=f UPDATE=f DELETE=f TRUNCATE=f (todos deben ser false)
H2 OK: Robinson (agente) pudo hacer SELECT sobre abonos
H3 OK: INSERT directo bloqueado por ACL — permission denied for table abonos
H4 OK: UPDATE de "monto" bloqueado por ACL column-scoped — permission denied for table abonos
H5 OK: UPDATE comprobante_url afectó 1 fila(s) (esperado 1)
H6 OK: UPDATE recibo_num/recibo_anio afectó 1 fila(s) (esperado 1)
H7 OK: UPDATE meses_cubiertos afectó 1 fila(s) (esperado 1)
H8 OK: DELETE directo bloqueado por ACL — permission denied for table abonos
H9 OK: registrar_cobro como agente — cobro A ok=true reintento=false abono=5336d29a-...
       | cobro B ok=true abono=83d959e8-...
H10 OK: admin pudo reversar el cobro A. {"ok":true,"estado":"Reversado",
        "nuevo_pagado":10300,"asiento_reversa_id":"5f1852d4-..."}
H11 OK: agente bloqueado al intentar reversar — P0001 No autorizado: la reversa de
        un cobro requiere rol admin
H12 OK: cross-org bloqueado al registrar — P0001 No autorizado: este módulo es
        exclusivo de la organización de seguros
H13 OK: cross-org bloqueado al reversar — P0001 No autorizado: este módulo es
        exclusivo de la organización de seguros
H14 OK: reintento con misma idempotency_key — reintento=true mismo_abono=t
H15 OK: trigger anti-delete sigue activo (probado con bypass total de ACL/RLS) —
        P0001 No se permite eliminar cobros. Use la reversa financiera autorizada.
H16 diagnóstico financiero: {"ok":true,"ast_baja":0,"deuda_descuadra":0,
    "abonos_huerfanos":1,"pagado_descuadra":0,"cobros_sin_agente":2,
    "facturas_huerfanas":3,"asientos_no_positivos":0,"cobros_sin_referencia":8,
    "asientos_desbalanceados":0,"cobros_transfer_sin_banco":10}
```

**Los 16 puntos exigidos por el mandato de ChatGPT quedan cubiertos:** anon sin
privilegios · SELECT permitido a `authenticated` · INSERT/UPDATE(no-metadata)/DELETE
directos bloqueados · UPDATE de las 4 columnas de metadata permitido con fila real
afectada · agente vía RPC funciona · admin vía RPC de reversa funciona · agente
bloqueado al reversar (por la propia RPC, no solo por RLS) · cross-org bloqueado en
ambas RPC · idempotencia sana · trigger anti-delete activo incluso con bypass total de
ACL/RLS (defensa en profundidad real, no solo teórica) · diagnóstico financiero
`ok:true` sin ningún contador nuevo respecto al baseline ya conocido.

## Verificación independiente de cero residuos (consulta de solo lectura, aparte)

```json
{
  "abonos_sinteticos_residuales": 0,
  "asiento_reversa_residual": 0,
  "fila_muestra_estado": {
    "comprobante_url": "https://.../1783482350929.jpeg",
    "recibo_num": null, "recibo_anio": null, "meses_cubiertos": []
  },
  "cliente_estado": {"deuda_total": 16000, "pagado": 10000, "deuda_anterior": 0}
}
```

Los 2 cobros sintéticos (H9), el asiento de la reversa (H10) y el intento de INSERT
directo (H3) — cero residuos. La fila de muestra volvió exactamente a su estado previo
a H5-H7 (mismo `comprobante_url`, `recibo_num`/`recibo_anio` en `null`, `meses_cubiertos`
vacío). El cliente de prueba volvió exactamente a `deuda_total=16000, pagado=10000` — ni
los +500/+300 de H9 ni la reversa de H10 dejaron rastro. El `RAISE EXCEPTION` final
revirtió el bloque completo, confirmado de forma independiente, no solo asumido.

## Regla dura respetada

No se tocó `entregas_admin`, `cuadre_tss_historial`, `pagos`, `egresos`,
`transferencias_agentes`, ni ningún otro dominio fuera del alcance autorizado de 4A.
No se modificó la policy RLS de `abonos` (seguía correcta) ni se recrearon las 2 RPC de
cobro (sin drift, confirmado en el preflight de `2026-08-13-0950-...`).

## Cierre

**Bloque 4A queda cerrado.** El diseño corregido (privilegios a nivel de columna en vez
de un REVOKE ciego) está en producción, verificado con introspección directa, con
`get_advisors` limpio, con la matriz completa de 16 puntos en verde, y con cero residuos
sintéticos confirmados de forma independiente. Los 3 escritores reales de metadata
(`comprobante_url`, `recibo_num`/`recibo_anio`, `meses_cubiertos`) siguen funcionando —
demostrado con un UPDATE real sobre una fila real, no solo revisando el ACL en teoría.

Roadmap pendiente del Bloque 4 (según mi propia auditoría en
`2026-08-13-1318-claude-bloque4.md`): el siguiente sub-bloque recomendado es **4D**
(RLS/ACL de `entregas_admin`/`cuadre_tss_historial`/`pagos`), después **4B** (RPC
egresos↔asientos — confirmado roto en producción como efecto secundario del cierre de
ACL del Bloque 3C), y **4C** (`transferencias_agentes`, bloqueado hasta ahora por falta
de un enlace formal agente↔usuario — esta sesión encontró que `profiles.agente_id` SÍ
es un FK real y formal entre un login y su fila de `agentes`, lo cual puede destrabar
parte del diseño de 4C cuando se retome). Ninguno de los tres se ha iniciado ni está
autorizado todavía — quedan documentados como contexto, no como trabajo en curso.
