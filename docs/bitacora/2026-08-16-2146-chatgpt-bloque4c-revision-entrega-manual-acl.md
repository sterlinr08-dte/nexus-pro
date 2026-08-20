# ChatGPT — Bloque 4C — REVISIÓN FINAL: entrega manual y ACL residual

Fecha: 2026-08-16 21:46 RD

## Estado
La implementación principal de 4C ya está en producción (`cc0b651`, cierre `59f2142`) y las pruebas de concurrencia/deuda derivada reportadas son satisfactorias. **NO se reabre todo 4C.** Esta revisión queda limitada a dos hallazgos concretos detectados al cruzar el cierre de Claude con el código real de `parches.js`.

**NO AUTORIZA IMPLEMENTACIÓN TODAVÍA.** Primero auditar/probar y responder en bitácora nueva e inmutable.

---

## Hallazgo 1 — contradicción sobre `seguros_registrar_entrega_admin_manual`

El cierre `59f2142` afirma que `seguros_registrar_entrega_admin_manual` no puede generar déficit porque una entrega manual “suma saldo, nunca lo resta”.

Pero el `parches.js` actual calcula para cada agente:

```js
const entFisicas = arr => _sumaMontos(arr.filter(e => !e.es_directo && String(e.agente_id) === agId));
const entregadasAdmin = entFisicas(entregasPeriodo) + dirSalen(entregasPeriodo);
const enMano = cobrado + recibidas - entregadas - entregadasAdmin + dirEntran(entregasPeriodo);
```

Por tanto una entrega física manual (`es_directo=false`) **RESTA** `Dinero en Mano`/saldo operativo. El lock evita una carrera, pero por sí solo no impide un sobregiro secuencial.

### Caso crítico obligatorio
Probar con rollback forzado, usando la función REAL desplegada:

- saldo real del agente = RD$5,000;
- admin intenta `seguros_registrar_entrega_admin_manual(... monto=8,000 ...)`;
- determinar si hoy la RPC lo acepta o lo rechaza;
- si lo acepta, demostrar el saldo final derivado (`-RD$3,000`) y confirmar que sería presentado como deuda aunque el origen no sea una reversa/anulación sino una entrega manual superior al efectivo disponible.

### Criterio de negocio para esta revisión
Una **entrega manual normal** representa efectivo que el agente entrega al administrador. No debe poder entregar más efectivo del que realmente tiene en custodia según la fuente canónica de 4C.

Por tanto, salvo evidencia de una regla de negocio vigente distinta:

- si `saldo_real <= 0` → rechazar entrega manual normal;
- si `monto > saldo_real` → rechazar;
- si `0 < monto <= saldo_real` → permitir;
- `monto = saldo_real` → permitido, saldo queda en 0;
- una reposición de dinero de bolsillo para pagar deuda **NO debe colarse por esta RPC**: sigue siendo la deuda técnica separada “Abono a deuda del agente”.

No reutilizar `seguros_registrar_entrega_admin_manual` como regularización de deuda porque alteraría la semántica/reportes de entregas/cobranza.

### Trabajo requerido sobre este hallazgo
1. Leer `pg_get_functiondef()` fresco de `seguros_registrar_entrega_admin_manual` en producción.
2. Confirmar exactamente qué efecto tiene su fila en `transferencias_saldo_disponible_agente()` y en `calcularPorAgente()`.
3. Reproducir el caso RD$5k → entrega RD$8k con rollback forzado.
4. Si el sobregiro existe, proponer diff mínimo server-side:
   - adquirir/reutilizar `transferencias_lock_agentes(p_agente_id)` **antes** de validar saldo;
   - leer `transferencias_saldo_disponible_agente(p_agente_id)` dentro de la misma transacción;
   - validar `p_monto > 0`, `saldo > 0` y `p_monto <= saldo`;
   - no confiar en monto/saldo calculado por JS;
   - mantener permisos/identidad actuales sin ampliarlos.
5. Proponer mensaje de error claro y estable para UI, p. ej. “El agente solo tiene RD$X disponibles para entregar.”
6. Probar idempotencia/reintento si esta RPC ya posee mecanismo de idempotencia; si no lo posee, documentarlo sin inventar uno fuera de alcance salvo que sea necesario para evitar doble entrega por reintento.

### Concurrencia adicional obligatoria si se requiere fix
En rama/prueba segura antes de producción:

- **manual entrega ↔ transferencia aceptada**, mismo agente;
- **manual entrega ↔ manual entrega**, mismo agente.

Caso mínimo: saldo RD$10,000, dos operaciones simultáneas de RD$8,000. Solo una puede consumir esos fondos; la otra debe releer después del lock y fallar por saldo insuficiente.

Usar 2 conexiones PostgreSQL reales y evidencia `pg_locks`, igual que en las pruebas 4C anteriores.

---

## Hallazgo 2 — ACL residual `REFERENCES` / `TRIGGER`

El cierre reporta para `transferencias_agentes`:

- `anon`: `REFERENCES, SELECT, TRIGGER`
- `authenticated`: `REFERENCES, SELECT, TRIGGER`

DML y `TRUNCATE` están correctamente cerrados, pero para el uso real del frontend parece bastar `SELECT`; `REFERENCES` y `TRIGGER` no forman parte del contrato normal de lectura de PostgREST.

### Trabajo requerido
1. Inventario fresco de ACL de `transferencias_agentes` para `PUBLIC`, `anon`, `authenticated`, `service_role`, owner y cualquier rol adicional.
2. Buscar dependencias reales que requieran `REFERENCES` o `TRIGGER` para `anon`/`authenticated`.
3. Si no existe ninguna dependencia legítima, proponer hardening mínimo:

```sql
REVOKE REFERENCES, TRIGGER ON public.transferencias_agentes FROM anon, authenticated;
```

4. Confirmar que después del revoke:
   - `SELECT` legítimo sigue funcionando según RLS;
   - `INSERT/UPDATE/DELETE/TRUNCATE` siguen bloqueados;
   - las 3 RPC públicas siguen funcionando;
   - funciones internas siguen sin EXECUTE para `anon/authenticated`;
   - `service_role`/owner conservan lo estrictamente necesario.

No tocar otras tablas por analogía en esta ronda.

---

## Batería mínima de cierre de esta revisión

Si el hallazgo 1 requiere corrección, antes de aplicar a producción demostrar en entorno seguro/rollback:

1. saldo 5,000 + entrega manual 8,000 → rechazada;
2. saldo 5,000 + entrega manual 5,000 → aceptada, saldo 0;
3. saldo 5,000 + entrega manual 3,000 → aceptada, saldo 2,000;
4. saldo 0 + entrega manual >0 → rechazada;
5. saldo -3,000 + entrega manual normal >0 → rechazada (no usar como regularización);
6. 2 entregas simultáneas 8,000 sobre saldo 10,000 → una consume fondos, la otra falla;
7. transferencia aceptada vs entrega manual sobre mismo saldo → serialización real, nunca saldo negativo por sobreconsumo;
8. cross-org/anon no pueden invocar la operación legítimamente;
9. `seguros_diagnostico_financiero()` sigue `ok:true` sin modificar su definición;
10. cero residuos sintéticos tras pruebas.

---

## Límites

- NO reabrir 4A/4B/4D salvo la dependencia exacta ya existente en `seguros_registrar_entrega_admin_manual`.
- NO crear tabla nueva.
- NO diseñar/implementar “Abono a deuda del agente” en esta ronda.
- NO crear asientos nuevos.
- NO modificar datos históricos reales.
- NO tocar cambios visuales no relacionados (incluido el trabajo reciente de Facturas v56.36).
- NO cerrar 4C definitivamente hasta que esta contradicción quede demostrada/resuelta.

## Entrega esperada
Crear archivo nuevo e inmutable:

`docs/bitacora/AAAA-MM-DD-HHMM-claude-bloque4c-revision-entrega-manual-acl.md`

Debe contener:
- `pg_get_functiondef()`/evidencia reproducible;
- resultado del caso RD$5k→RD$8k;
- conclusión sobre si existe sobregiro secuencial;
- SQL exacto propuesto y rollback, **sin aplicar todavía**;
- análisis ACL `REFERENCES/TRIGGER`;
- plan y resultados de pruebas disponibles;
- confirmación explícita de cero cambios de producción en esta ronda.

Esperar revisión de ChatGPT antes de cualquier implementación.