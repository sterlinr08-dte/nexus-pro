# 4C — CIERRE FINAL: diff autorizado y aplicado a producción

**De:** Claude
**Para:** ChatGPT / dueño
**Contexto:** El dueño autorizó explícitamente ("Autorizado") aplicar el diff que quedó propuesto en
`2026-08-16-2209-claude-bloque4c-revision-entrega-manual-acl.md` y confirmado con pruebas reales de
concurrencia en `2026-08-17-0239-claude-bloque4c-concurrencia-real.md`. Este documento cierra el ciclo:
el diff **ya está aplicado en producción** (`tnwsgcxurfyuszxsewsn`), verificado, y sin ningún residuo.

---

## 1. Qué se aplicó

Confirmado el estado base ANTES de tocar nada — producción todavía corría la función original, sin el
chequeo de saldo, y todavía tenía la ACL residual:

```
ya_tiene_fix = false
tiene_check_exacto = false
ta.references_anon = true · ta.trigger_anon = true
ta.references_authenticated = true · ta.trigger_authenticated = true
```

Migración `bloque4c_revision_saldo_entrega_manual_y_acl_transferencias`, con los 2 cambios exactos ya
propuestos y probados:

1. **`CREATE OR REPLACE FUNCTION public.seguros_registrar_entrega_admin_manual(...)`** — agrega
   `v_saldo := public.transferencias_saldo_disponible_agente(p_agente_id)` y el chequeo
   `IF p_monto > v_saldo THEN RAISE EXCEPTION ...`, en la posición ya verificada (después del lock
   advisory `transferencias_lock_agentes`, después del chequeo de idempotencia, antes del INSERT en
   `entregas_admin`). Texto completo idéntico al ya publicado en `2209`.
2. **`REVOKE REFERENCES, TRIGGER ON public.transferencias_agentes FROM anon, authenticated;`**

---

## 2. Verificación post-aplicación

### 2.1 `get_advisors(security)`
Sin hallazgos nuevos relacionados con `transferencias_agentes` (el `REVOKE` no generó ningún warning
nuevo — ni siquiera aparece en la lista, porque un `REVOKE` de más restringe, no abre). El único hallazgo
sobre la función tocada es el mismo `authenticated_security_definer_function_executable` esperado y ya
documentado desde que la función existe (`EXECUTE` para `authenticated` es intencional — el chequeo de
rol vive DENTRO de la función).

### 2.2 Permisos, confirmados con `has_function_privilege`/`has_table_privilege`
```
entrega_manual_execute_authenticated = true   (intacto — el frontend sigue pudiendo llamarla)
ta_references_anon                   = false  (revocado)
ta_trigger_anon                      = false  (revocado)
ta_references_authenticated          = false  (revocado)
ta_trigger_authenticated             = false  (revocado)
ta_select_authenticated_intacto      = true   (SELECT no se tocó — RLS sigue filtrando)
```

### 2.3 Batería de 6 pruebas contra la función REAL ya desplegada en producción

Todas dentro de `BEGIN...ROLLBACK`, usando el agente real ROBINSON (saldo real en ese momento:
RD$136,690). Las pruebas T2/T3/T4 (que de verdad insertan una fila) se auto-revierten con su propio
marcador de excepción DENTRO de su propio sub-bloque, para que el saldo consultado por la siguiente
prueba dentro de la misma transacción siga siendo el real, no uno ya gastado por la prueba anterior —
y aun así todo queda bajo el `ROLLBACK` final de la transacción completa, doble seguro.

```
T1_sobregiro_1peso_mas       → ok_rechazado: "El agente solo tiene RD$136,690.00 disponibles para entregar"
T2_monto_exacto_igual_saldo  → ok_aceptado (monto == saldo exacto, frontera correcta: p_monto > v_saldo, no >=)
T3_monto_dentro_del_saldo    → ok_aceptado (RD$50,000 sobre RD$136,690)
T4_idempotencia_reintento    → ok: la 2da llamada con la misma clave devuelve reintento:true, sin duplicar
T5_agente_sin_saldo          → ok_rechazado: "El agente no tiene saldo disponible para entregar"
T6_sin_sesion_valida         → ok_rechazado: "No autorizado (org)"
```

### 2.4 Verificación independiente de cero residuo (FUERA de la transacción de prueba, ya con el ROLLBACK aplicado)

```
residuo_entregas_bateria       = 0
residuo_agente_vacio           = 0
saldo_robinson_intacto_136690  = true (sigue exactamente en RD$136,690)
```

### 2.5 `seguros_diagnostico_financiero()`

```json
{"ok": true, "ast_baja": 0, "deuda_descuadra": 0, "abonos_huerfanos": 1, "pagado_descuadra": 0,
 "cobros_sin_agente": 2, "facturas_huerfanas": 3, "asientos_no_positivos": 0,
 "cobros_sin_referencia": 8, "asientos_desbalanceados": 0, "cobros_transfer_sin_banco": 10}
```

Exactamente los mismos residuales pre-existentes ya documentados en sesiones anteriores. **Cero
anomalías nuevas.**

---

## 3. Resumen del ciclo completo (Bloque 4C, revisión)

1. **`371-372`** — reproducido el sobregiro literal (RD$5,000→RD$8,000) y confirmada la ACL residual.
2. **`373-377`** — SQL de corrección diseñado y probado con `BEGIN...ROLLBACK` (10 casos + REVOKE),
   publicado como propuesta, sin aplicar.
3. **`378-379`** — caso literal reproducido de nuevo contra la función SIN corregir en producción
   (para dejar la evidencia inequívoca antes de tocar nada), branch de Supabase preparada.
4. **`380-382`** — pruebas REALES de concurrencia con 2 conexiones físicas (`dblink`, evidencia de
   `pg_locks`) para entrega↔entrega y entrega↔transferencia aceptada, en la branch desechable.
5. **`383`** — branch borrada, bitácora de las pruebas de concurrencia publicada.
6. **HOY** — autorización explícita del dueño ("Autorizado"), diff aplicado a producción, verificado
   con la misma batería + diagnóstico financiero, cero residuo.

**El frontend no necesitó ningún cambio** — `nxGuardarEntregaAdmin` ya llamaba a esta RPC desde el
Bloque 4D-1 (tarea #258); el error que ahora lanza la función corregida ya se propaga como cualquier
otro error de RPC (toast). No hace falta bump de versión ni publicación de rama para esta pieza —
es una corrección de backend pura, sin cambio de contrato.

**Bloque 4C — revisión: CERRADO.**
