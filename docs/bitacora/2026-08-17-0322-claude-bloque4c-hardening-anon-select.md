# 4C — micro-hardening: `anon` sin `SELECT` sobre `transferencias_agentes`

**De:** Claude
**Para:** ChatGPT / dueño
**Contexto:** ChatGPT revisó el cierre de `af5d756` y confirmó todo correcto (validación de saldo,
REFERENCES/TRIGGER revocados, pruebas con rollback, idempotencia, cero residuos, diagnóstico
`ok:true`). Señaló un único detalle menor de mínimo privilegio: `anon` conservaba `SELECT` sobre
`transferencias_agentes` — **no una vulnerabilidad activa** (RLS ya devolvía 0 filas siempre, sin
excepción, porque `mi_rol()` da `NULL` sin sesión válida), pero recomendó quitarlo igual como
limpieza. El dueño autorizó explícitamente en esta conversación ("Sí, aplícalo").

---

## 1. Verificación antes de aplicar

```
anon.select      = true   (el único privilegio que quedaba — REFERENCES/TRIGGER ya revocados en af5d756)
authenticated.select = true
rls_activo        = true
política          = "org_transferencias_agentes" (ALL) USING (mi_rol() IS NOT NULL AND
                     mi_organizacion() = <id nexus-pro>)
```

Con `mi_rol()` resolviendo a `NULL` sin JWT válido, la condición nunca se cumple para `anon` — 0 filas
garantizadas por diseño, no por casualidad.

**Grep del repo:** único consumidor de esta tabla es `parches.js` (2 sitios, ambos `api.get(...)`
dentro del panel de Transferencias, que solo se abre logueado — usan el token de sesión del rol
`authenticated`, nunca la clave `anon` sola). Ninguna página pública (`rifa.html`, `boleto.html`,
`vendedor.html`, `firma-prestamo.html`) toca esta tabla. Confirmado: quitarle `SELECT` a `anon` no
tiene ningún impacto funcional.

---

## 2. Cambio aplicado

```sql
REVOKE SELECT ON public.transferencias_agentes FROM anon;
```

## 3. Verificación después de aplicar

```
anon_select_transferencias      = false  (revocado)
authenticated_select_intacto    = true   (sin cambios — sigue filtrado por RLS)
```

```json
{"ok": true, "ast_baja": 0, "deuda_descuadra": 0, "abonos_huerfanos": 1, "pagado_descuadra": 0,
 "cobros_sin_agente": 2, "facturas_huerfanas": 3, "asientos_no_positivos": 0,
 "cobros_sin_referencia": 8, "asientos_desbalanceados": 0, "cobros_transfer_sin_banco": 10}
```

Mismos residuales de siempre, `ok:true`, cero anomalías nuevas.

---

## 4. `transferencias_agentes` — ACL final

| grantee | SELECT | INSERT/UPDATE/DELETE directo | REFERENCES | TRIGGER |
|---|---|---|---|---|
| `anon` | ❌ | ❌ (nunca lo tuvo) | ❌ | ❌ |
| `authenticated` | ✅ (filtrado por RLS) | ❌ (todo pasa por las RPC SECURITY DEFINER) | ❌ | ❌ |

Sin cambios de frontend — no hace falta, `anon` nunca fue el camino real de lectura de esta tabla.

**Bloque 4C — CERRADO por completo**, incluida la limpieza de mínimo privilegio.
