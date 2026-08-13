# Bloque 3 — CERRADO (3A + 3B + 3C)

**De:** Claude
**Fecha:** 2026-08-13
**Responde a:** aprobación explícita del dueño sobre `2026-08-13-claude-bloque3c.md` (commit `0ac384a`), condicionada a un diff pre-vuelo.

---

## 0. Autorización del dueño (verbatim)

> "Apruebo el diseño de 3C para implementación, con una condición: antes de ejecutar el CREATE OR REPLACE de las dos RPC de cobro/reversa, Claude debe comparar el cuerpo actual de producción contra el SQL propuesto y demostrar que la única diferencia funcional es el guard de organización + SECURITY DEFINER. Esas funciones manejan dinero y no quiero una regresión accidental por recrearlas desde una copia desactualizada.
>
> Después puede aplicar el cierre ACL, ejecutar la matriz final y verificar que:
>
> agente/admin vía RPC = funciona,
> REST directo a asientos = bloqueado,
> anon = cero,
> cross-org = bloqueado,
> cron = intacto,
> diagnóstico financiero = ok:true.
>
> Si eso pasa, Bloque 3 completo podrá cerrarse"

Las 6 condiciones se cumplieron. Detalle abajo.

---

## 1. Precondición: diff producción vs. SQL propuesto

Antes de tocar nada se releyó, fresco desde producción, `prosecdef`/`proconfig`/`prosrc` completo de `seguros_registrar_cobro` y `seguros_reversar_cobro` — idéntico byte a byte a lo capturado en la sesión de auditoría (0 drift, esperado porque esa auditoría solo corrió pruebas con rollback forzado).

Comparado contra el cuerpo propuesto, la diferencia es exactamente:

- **`seguros_registrar_cobro`**: un bloque insertado justo después de `IF public.mi_rol() IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;`:
  ```sql
  IF public.mi_organizacion() IS DISTINCT FROM (SELECT id FROM public.organizaciones WHERE slug='nexus-pro') THEN
    RAISE EXCEPTION 'No autorizado: este módulo es exclusivo de la organización de seguros';
  END IF;
  ```
  Nada más — las 15+ validaciones (monto, método, referencia, agente, banco, destino), el `SELECT...FOR UPDATE`, el cálculo de pendiente/adelanto, el `INSERT INTO abonos`, la selección de cuenta contra `metodo`, el `INSERT INTO asientos` y el `jsonb_build_object` de retorno son carácter por carácter idénticos. Defaults de parámetros preservados exactos.

- **`seguros_reversar_cobro`**: mismo bloque, justo después del check `v_rol IS NULL OR v_rol <> 'admin'`. Resto del cuerpo (lock del abono, retry idempotente, ajuste de `deuda_anterior`/`pagado`, asiento de reversa, `UPDATE abonos`, `INSERT INTO auditoria`) sin cambios.

- Cambio de firma en ambas: `SECURITY INVOKER` (implícito) → `SECURITY DEFINER SET search_path = public, pg_temp`.

Diff presentado al dueño en el chat antes de aplicar. Ver conversación para el texto completo lado a lado.

---

## 2. Migración aplicada (2 pasos, orden obligatorio)

**Paso 1 — `bloque3c_paso1_rpcs_a_security_definer`**: convierte las 6 RPC a `SECURITY DEFINER SET search_path = public, pg_temp` — 4 vía `ALTER FUNCTION` (sin tocar cuerpo/firma: `seguros_registrar_asiento_manual`, `seguros_corregir_asiento_manual`, `seguros_anular_factura`, `seguros_generar_factura_manual`, ya tenían guard de organización de bloques anteriores) + 2 vía `CREATE OR REPLACE FUNCTION` (`seguros_registrar_cobro`, `seguros_reversar_cobro`, con el guard nuevo del §1) + `GRANT EXECUTE ... TO authenticated, service_role` explícito en las 2 últimas.

**Paso 2 — `bloque3c_paso2_cerrar_acl_asientos`**: con las 6 RPC ya en DEFINER (sin ventana rota),
```sql
REVOKE ALL ON public.asientos FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON public.asientos FROM authenticated;
```
`authenticated` conserva `SELECT` (las pantallas de Contabilidad leen Libro Diario/Mayor/Balance directo por REST, acotado por la policy RLS `all_asientos` que ya exige `mi_rol() IS NOT NULL AND mi_organizacion()=nexus-pro`). `postgres`/`service_role` sin tocar.

ACL final verificado por `information_schema.role_table_grants`:
```
authenticated → SELECT (único)
postgres      → DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
service_role  → DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
anon          → (ninguno)
```

---

## 3. `get_advisors(security)` tras aplicar

6 hallazgos WARN nuevos, todos de la categoría `authenticated_security_definer_function_executable` — la misma clase ya aceptada para `pos_transferir_stock`, `next_recibo`, `next_recibo_anio`, `pos_siguiente_ncf`, `siguiente_ncf`, `mi_rol()`, `mi_organizacion()`, `mi_usuario_id()` (RPC `SECURITY DEFINER` llamables por `authenticated`, por diseño). **Cero hallazgos nuevos bajo `anon_security_definer_function_executable`** — ninguna de las 6 RPC es alcanzable sin sesión. `cron_secretos` (RLS sin policy, intencional) y `auth_leaked_password_protection` son preexistentes y sin relación.

---

## 4. Matriz final contra producción ya aplicada

Un solo bloque `DO $$...$$` atómico, con rollback forzado al final (`RAISE EXCEPTION 'ROLLBACK_FORZADO_...'` incondicional), impersonando usuarios reales vía `SET LOCAL ROLE` + `set_config('request.jwt.claims', ...)`. **Resultado: 12 de 12 aserciones OK.**

| # | Punto exigido por el dueño | Cómo se probó | Resultado |
|---|---|---|---|
| A1-A3 | REST directo a `asientos` = bloqueado | Como Robinson (`authenticated`, agente): `INSERT`/`UPDATE`/`DELETE` directos → los 3 fallan con `insufficient_privilege` (42501) | ✅ bloqueado |
| A4 | (control) `SELECT` sigue permitido | Como Robinson: `SELECT` sobre `asientos` | ✅ funciona (RLS ya lo acota a nexus-pro) |
| B1-B2 | `anon` = cero | `has_table_privilege` en los 4 verbos = `false`; y como rol `anon` real, `SELECT` → `insufficient_privilege` | ✅ cero |
| C1 | Agente vía RPC = funciona | Robinson llama `seguros_registrar_cobro(...)` con `p_permitir_adelanto:=true` → `ok:true`, `abono_id`/`asiento_id` reales | ✅ funciona |
| D1 | Admin vía RPC = funciona | Sterlin08 llama `seguros_reversar_cobro(...)` sobre el abono de C1 → `ok:true`, `estado:'Reversado'` | ✅ funciona |
| E1 | Cross-org bloqueado (cobro) | Francis (admin de `bayolsale`) llama `seguros_registrar_cobro` contra un cliente de nexus-pro → excepción exacta `'No autorizado: este módulo es exclusivo de la organización de seguros'` | ✅ bloqueado |
| E2 | Cross-org bloqueado (reversa) | Francis llama `seguros_reversar_cobro` sobre el mismo abono → misma excepción exacta | ✅ bloqueado |
| F1-F2 | Cron intacto | `crear_factura_auto_tx`: sigue `SECURITY INVOKER`, dueño `postgres`, solo `service_role` puede ejecutarla (`authenticated` no), y `service_role` conserva `INSERT` en `asientos` — exactamente como antes de este bloque (nunca se tocó esta función ni sus grants) | ✅ intacto |
| G1 | Diagnóstico financiero | `seguros_diagnostico_financiero()` → `ok:true` | ✅ ok:true |

**Nota real sobre F**: mi primer intento asumió `crear_factura_auto_tx` era `SECURITY DEFINER` sin verificarlo — falló. Al comprobar, resultó `SECURITY INVOKER` (dueño `postgres`, solo `service_role` la ejecuta) — funciona sin `DEFINER` porque el `service_role` que la invoca (desde la Edge Function del cron) ya salta RLS por sí mismo. Diseño correcto y preexistente, no tocado por 3C. Se corrigió la aserción para medir lo que de verdad importa (permisos intactos), no una suposición.

**Verificación independiente post-rollback** (consulta de solo lectura aparte, per `docs/METODOLOGIA-PRUEBAS-DESTRUCTIVAS.md`):
```
asientos_residuo: 0   abonos_residuo: 0
asientos_por_key: 0   abonos_por_key: 0
```
Cero rastro de los datos sintéticos (cobro de RD$1.00, su reversa, los 2 intentos cross-org). El robo/reversa de C1/D1 y los intentos bloqueados de A1-A3/E1-E2 quedaron completamente deshechos por el rollback forzado del bloque.

---

## 5. Sin cambios de frontend

`index.html` ya llamaba exclusivamente a `seguros_registrar_cobro`/`seguros_reversar_cobro` vía RPC desde la Fase 1 ("cutover-cobro-financiero", cerrada antes de que empezara este Bloque 3) — confirmado en la auditoría §1 de `2026-08-13-claude-bloque3c.md`: cero escritores directos a `asientos` en todo el frontend + las 16 Edge Functions, fuera de las 6 RPC y el cron. Por eso cerrar el ACL de tabla no rompe ningún flujo real — el frontend nunca dependió de la puerta que se acaba de cerrar. Sin bump de `APP_VERSION`, sin cambios de código publicado — este bloque es 100% del lado de Supabase.

---

## 6. Estado de las reglas duras del encargo original (verificado, no solo declarado)

- `clientes`/`facturas`/`abonos`/cuentas bancarias/NCF-recibos/datos históricos: **sin tocar**.
- Bloque 4: **no abierto**.
- Cambios visuales: **ninguno**.
- Asientos históricos: **ninguno borrado ni alterado** — el `UPDATE`/`DELETE` de prueba (A2/A3) fueron bloqueados por el ACL antes de tocar ninguna fila real, y el `INSERT` de prueba (A1) nunca llegó a escribirse (mismo motivo).
- `tienePermiso()`/localStorage como frontera de seguridad: **no se usó** — la frontera real es el guard `mi_organizacion()` dentro de cada RPC `SECURITY DEFINER`, verificado con impersonación real de usuarios, no con supuestos del cliente.
- Ninguna RPC quedó rota por el cierre de ACL — las 4 que ya eran `DEFINER`-compatibles (guard preexistente) y las 2 nuevas se convirtieron ANTES del `REVOKE`, en el orden documentado, sin ninguna ventana intermedia.

---

## 7. Bloque 3 — CERRADO

**3A** (asiento manual balanceado) + **3B** (generación/anulación de factura) + **3C** (cierre de ACL sobre `asientos` + hardening de cobro/reversa a `SECURITY DEFINER`) — completos, aplicados a producción, verificados contra el estado real desplegado, sin regresión en ningún flujo existente.
