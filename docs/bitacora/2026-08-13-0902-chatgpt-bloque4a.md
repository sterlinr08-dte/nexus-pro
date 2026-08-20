# ChatGPT — Subfase 2B / Bloque 4A — Cierre ACL de `abonos`

Fecha: 2026-08-13 (RD)

## Alcance autorizado
Implementar EXCLUSIVAMENTE el hardening ACL de `public.abonos` identificado en la auditoría del Bloque 4. No tocar todavía egresos, entregas_admin, transferencias_agentes, cuadre_tss_historial, pagos, bancos, comisiones ni ningún otro dominio.

## Precondiciones obligatorias
1. Releer en producción el estado REAL de `abonos`: RLS/policy, ACL de `anon`/`authenticated`/`service_role`, trigger anti-delete y grants/definiciones de `seguros_registrar_cobro` y `seguros_reversar_cobro`.
2. Confirmar que las 2 RPC siguen `SECURITY DEFINER`, con `search_path=public,pg_temp`, guard de organización `nexus-pro` y grants esperados. Si hay drift, detenerse y documentar — NO aplicar REVOKE a ciegas.
3. Confirmar por grep que sigue habiendo 0 escritores REST directos a `abonos` en `index.html`, `parches.js` y Edge Functions.

## Cambio autorizado
Si las precondiciones se cumplen, aplicar una migración independiente que:

```sql
REVOKE ALL ON public.abonos FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON public.abonos FROM authenticated;
```

`authenticated` debe conservar únicamente `SELECT` directo (acotado por el RLS actual), porque las pantallas/historial pueden necesitar lectura. No tocar `service_role`/`postgres` salvo evidencia concreta de exceso no necesario dentro de este mismo alcance.

NO modificar la policy RLS si ya está correcta. NO recrear las RPC salvo que el preflight demuestre que es imprescindible y se haga diff fresco de `pg_get_functiondef()`.

## Matriz post-migración obligatoria
Usar `docs/METODOLOGIA-PRUEBAS-DESTRUCTIVAS.md` (rollback estructural forzado + SELECT independiente posterior):

- `anon`: SELECT/INSERT/UPDATE/DELETE/TRUNCATE = bloqueados / sin privilegios.
- `authenticated agente nexus-pro`: SELECT permitido; INSERT/UPDATE/DELETE directo bloqueados.
- agente vía `seguros_registrar_cobro()` = funciona.
- admin vía `seguros_reversar_cobro()` = funciona.
- agente intentando reversa = bloqueado por la RPC.
- cross-org intentando registrar/reversar = bloqueado.
- idempotencia de cobro/reversa sigue sana.
- trigger anti-delete sigue presente (aunque ACL bloquee antes el DELETE directo).
- diagnóstico financiero final = `ok:true`.
- verificación independiente de 0 residuos sintéticos.

## Reglas duras
- Backend primero; no hay cambio de frontend esperado.
- No abrir 4B/4C/4D todavía.
- No tocar datos históricos.
- No modificar Fase 1/Bloques 1-3 salvo verificación de no regresión.
- Si cualquier prueba financiera falla, detenerse y no declarar cierre.

## Entrega
Crear una entrada NUEVA `docs/bitacora/AAAA-MM-DD-HHMM-claude-bloque4a.md` con preflight, migración aplicada, ACL final, matriz de pruebas, diagnóstico y cero residuos. Solo entonces 4A podrá marcarse cerrado y pasaremos a 4B (egresos).