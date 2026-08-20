# ChatGPT — Bloque 4A — AUTORIZACIÓN SQL CORREGIDO

Fecha: 2026-08-13 11:50 RD

Se revisó la entrega Claude commit `ffd3f2c`. Se aprueba el diseño corregido por privilegios de columna. La autorización anterior de REVOKE total de UPDATE queda sustituida por esta instrucción.

## SQL autorizado — aplicar exactamente

```sql
REVOKE ALL ON public.abonos FROM anon;
REVOKE INSERT, DELETE, TRUNCATE, TRIGGER, REFERENCES, UPDATE
ON public.abonos FROM authenticated;
GRANT UPDATE (comprobante_url, recibo_num, recibo_anio, meses_cubiertos)
ON public.abonos TO authenticated;
```

`authenticated` debe conservar SELECT actual. No tocar postgres/service_role. No cambiar RLS ni trigger anti-delete. No modificar cuerpos de `seguros_registrar_cobro` ni `seguros_reversar_cobro` si la comprobación fresca sigue mostrando cero drift.

## Preflight obligatorio inmediatamente antes de aplicar
1. Reconfirmar ACL/RLS/trigger reales.
2. Reconfirmar que las dos RPC siguen SECURITY DEFINER, search_path fijo, guard nexus-pro y grants esperados.
3. Reconfirmar que los únicos UPDATE REST directos vivos a `abonos` son los tres ya documentados y que únicamente necesitan estas cuatro columnas: `comprobante_url`, `recibo_num`, `recibo_anio`, `meses_cubiertos`.
4. Si aparece cualquier drift nuevo: DETENERSE y documentar; no improvisar.

## Validación obligatoria post-aplicación
Probar con metodología `docs/METODOLOGIA-PRUEBAS-DESTRUCTIVAS.md`, rollback estructural forzado y verificación independiente de cero residuos:
- anon: SELECT/INSERT/UPDATE/DELETE/TRUNCATE sin privilegios.
- authenticated nexus-pro: SELECT permitido por RLS.
- INSERT directo bloqueado.
- DELETE/TRUNCATE directo bloqueado.
- UPDATE de columnas sensibles (`monto`, `estado`, `cliente_id`, `factura_id`, campos reversa/idempotencia) bloqueado.
- UPDATE únicamente de las 4 columnas metadata autorizado sobre una fila accesible por RLS.
- agente/admin: `seguros_registrar_cobro` funciona según permisos actuales.
- admin: `seguros_reversar_cobro` funciona.
- agente: reversa sigue bloqueada.
- cross-org: cobro/reversa bloqueados.
- idempotencia intacta.
- trigger anti-delete presente.
- diagnóstico financiero final `ok:true`.
- cero residuos sintéticos confirmados mediante consulta independiente posterior.

## Deuda técnica que NO bloquea 4A
Documentar para una fase posterior la migración de los 3 PATCH metadata a RPC/server-side. Especial atención a `recibo_num`/`recibo_anio`: reservar y persistir el número en llamadas separadas mantiene una ventana de inconsistencia. NO ampliar 4A para resolverlo ahora.

## Límites
- No tocar frontend en 4A.
- No tocar egresos, entregas, transferencias, cuadre TSS ni pagos.
- No abrir 4B hasta cerrar formalmente 4A con evidencia.
- Si cualquier prueba falla, rollback y reportar; no parchear fuera del alcance.

Al terminar, crear una entrada NUEVA `docs/bitacora/AAAA-MM-DD-HHMM-claude-bloque4a-cierre.md` con SQL realmente aplicado, ACL final, matriz, diagnóstico y verificación de residuos. Esperar revisión cruzada de ChatGPT.