# Claude — Bloque 4D-2 CERRADO — `cuadre_tss_historial` vía RPC atómica (backend + frontend)

Fecha: 2026-08-15 (RD)

## Contexto

`2026-08-15-0135-claude-bloque4d2.md` dejó el diseño completo publicado (auditoría fresca,
hallazgo real, SQL candidato de `seguros_guardar_cuadre_tss`, batería de pruebas T1-T8 con
rollback forzado), sin implementar — a la espera de autorización. El dueño preguntó primero
*"¿Qué tan importante aplicar el sql y la migración?"* (respondido con honestidad: el hueco es
tan real como cualquier otro de este engagement, pero el radio de impacto es el más bajo de
todos los cerrados hasta ahora — 2 filas de datos, sin dinero de por medio) y luego autorizó con
**"Aplica todo"**. Esta entrada cierra la implementación completa: backend aplicado a
producción, frontend migrado, ambos verificados de punta a punta.

## El hallazgo, en una frase

`cuadre_tss_historial` tenía `TRUNCATE`/`DELETE`/`INSERT`/`UPDATE` abiertos a `anon` y
`authenticated` a nivel de tabla. `TRUNCATE` ignora RLS por completo en Postgres — así que
cualquiera con la clave pública (embebida en `index.html`, visible para cualquiera), o un
usuario de otra organización conectada a NEXUS PRO, podía vaciar o manipular el historial de
cuadres TSS de Contabilidad → Reportes → Tabla Comparativa, sin dejar ningún rastro de quién lo
hizo. El actor (`usuario`) tampoco tenía ninguna validación server-side — el navegador podía
mandar cualquier nombre.

## Backend aplicado en esta sesión

**Migración `seguros_guardar_cuadre_tss_rpc`**, aplicada con `apply_migration`:

- `public.seguros_guardar_cuadre_tss(p_periodo, p_empresa_nom, p_total_deuda, p_resumen,
  p_reemplazar DEFAULT false) RETURNS jsonb`, `SECURITY DEFINER`, `SET search_path='public'`:
  - Guard de rol/organización server-side (`mi_rol() IS NULL` → `RAISE EXCEPTION`;
    `mi_organizacion()` debe calzar con la org `nexus-pro` — mismo patrón ya usado en
    3A/3B/3C/4A/4B/4D-1).
  - `pg_advisory_xact_lock(hashtextextended(p_periodo || '|' || p_empresa_nom, 0))` — serializa
    llamadas concurrentes sobre la MISMA clave de negocio (mismo patrón ya en producción desde
    4A, `seguros_registrar_cobro`).
  - Actor resuelto **server-side**, nunca del cliente: `SELECT us.nom FROM usuarios_sistema us
    WHERE us.id = mi_usuario_id()` — no hay `p_usuario` en la firma de la función. Corrección de
    diseño confirmada contra el esquema real antes de escribir el SQL: la columna es `nom`, no
    `nombre`.
  - Detección de duplicado (mismo `periodo`+`empresa_nom`) → si `p_reemplazar=false`, devuelve
    `{ok:false, duplicado:true, existente_id}` sin tocar nada; si `p_reemplazar=true`, borra el
    registro anterior e inserta el nuevo, dentro de la misma transacción.
- ACL lockdown en `cuadre_tss_historial`: `REVOKE ALL ... FROM anon` (cero privilegios);
  `REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ... FROM authenticated` (solo
  conserva `SELECT`).
- `REVOKE ALL ... FROM PUBLIC, anon` + `GRANT EXECUTE ... TO authenticated` en la función nueva.

## Verificación del backend

- `get_advisors(security)`: solo el WARN esperado
  (`authenticated_security_definer_function_executable`), misma categoría que toda otra RPC ya
  publicada en este engagement — nada nuevo ni distinto.
- `has_function_privilege`: `anon_exec=false`, `authenticated_exec=true`.
- `has_table_privilege` sobre `cuadre_tss_historial`: `anon_select/insert/truncate=false`;
  `authenticated_select=true`, `authenticated_insert/delete/truncate=false`.
- **Batería forced-rollback T1-T8 contra la función REAL ya desplegada** (no una copia local) —
  8/8 pasaron. T1 necesitó corregir su propia aserción a mitad de la corrida: el primer intento
  esperaba únicamente el mensaje interno `'No autorizado.'`, pero como el ACL lockdown YA estaba
  aplicado en este run, `anon` es rechazado por Postgres a nivel de `GRANT`
  (`permission denied for function ...`) **antes** de que el cuerpo de la función llegue a
  evaluar `mi_rol() IS NULL` — una defensa más temprana y más fuerte que la que la prueba
  original esperaba. Se corrigió la aserción para aceptar cualquiera de los dos mensajes, y la
  batería completa terminó con el marcador `ROLLBACK_FORZADO_FIN_DE_PRUEBA` (transacción
  revertida, cero residuo por diseño de la propia metodología).
- **Verificación independiente de cero residuos**: `cuadre_tss_historial` conserva exactamente
  las 2 filas originales (`06a62f27-...` "PLAN VOLUNTARIO HUMANO" 36500,
  `3fe7bed9-...` "LAS MATAS" 55000) tras toda la batería.

## Frontend migrado en esta sesión

`window.nxTssGuardarHistorial` (`parches.js`) — reemplazó la secuencia vieja (GET-check manual
por `periodo`+`empresa_nom` → `confirm()` en el navegador → `DELETE` condicional → `POST`
directo, los 4 pasos escritos como REST crudo desde el cliente) por una sola llamada:

```js
const r = await _api.post('rpc/seguros_guardar_cuadre_tss', {
  p_periodo: periodo,
  p_empresa_nom: empNom,
  p_total_deuda: _ultimoCuadre.totalDeuda || 0,
  p_resumen: resumen,
  p_reemplazar: !!_reemplazar
});
```

Si `r.duplicado`, el `confirm()` de "¿reemplazar?" se sigue mostrando (misma UX de siempre) —
solo que ahora, al aceptar, el frontend se reintenta a sí mismo (`nxTssGuardarHistorial(true)`)
y es el SERVIDOR quien decide/ejecuta el reemplazo dentro de una sola transacción, no una
secuencia de 2 llamadas REST separadas desde el navegador. `window.nxTssVerHistorial` (la
lectura del historial) no se tocó — sigue con su `SELECT` directo, correcto porque
`authenticated` conserva ese privilegio.

## Verificación del frontend

- `node --check parches.js` — limpio.
- Los 4 bloques `<script>` de `index.html` compilan con `new Function()`.
- `version.json` es JSON válido; `version` (56.32) == `APP_VERSION`.
- Harness E2E (Node `vm`, código real extraído por balance de llaves de `parches.js`, no una
  reconstrucción a mano) — **21/21 aserciones pasaron**: primer guardado postea los 5 parámetros
  correctos; duplicado + aceptar reemplazo → 2 llamadas a la RPC, la segunda con
  `p_reemplazar:true`, termina en éxito; duplicado + cancelar → 1 sola llamada, sin reintento,
  toast "Ya fue guardada", **sin** registro de auditoría (nada se guardó); la RPC lanza un error
  → se muestra al usuario, sin fingir éxito; sin `_ultimoCuadre` → cero llamadas a la API; `r.ok
  === false` sin `duplicado` (caso defensivo) → no finge éxito.
- Grep global: `cuadre_tss_historial` aparece una sola vez en todo `parches.js`/`index.html` —
  el `SELECT` de solo lectura de `nxTssVerHistorial`. Cero escrituras REST directas restantes.

## Regla dura respetada

No se tocó 4D-3 (`pagos`) ni ningún otro bloque. Ninguna migración/RPC ajena a
`seguros_guardar_cuadre_tss`/`cuadre_tss_historial` en esta sesión.

## Publicación

Rama `claude/cuadre-tss-atomico` → PR
[#275](https://github.com/sterlinr08-dte/nexus-pro/pull/275) → fusionada a `main`
(squash) en `b56b8ab`. `mergeable_state` pasó de `"unstable"` (transitorio, justo tras crear el
PR) a limpio en cuanto el único check configurado en el repo (Cloudflare Workers Build) terminó
con `conclusion:"success"` — no hay workflows de CI propios en este repo, el despliegue es
automático vía Cloudflare Workers git-integration. 0 hilos de revisión pendientes (PR recién
creada). El bot de Cloudflare confirmó "Deployment successful!" para el commit `7d05148` antes
de la fusión — el árbol fusionado a `main` es idéntico. Este entorno no tiene salida a internet
(bloqueado por el proxy de egress), así que no se pudo verificar `nexusprord.com` en vivo desde
aquí — la confirmación de despliegue queda en el mismo criterio ya usado en cada bloque anterior:
commit real en `main` (confirmado por `git log` contra `origin/main`) + build de Cloudflare ya
exitoso para ese árbol.

## Cierre

**Bloque 4D-2 queda cerrado — backend y frontend en producción, verificados de punta a punta.**
`cuadre_tss_historial` ya no acepta ninguna escritura REST directa desde el navegador (ACL +
RPC atómica con guard de rol/organización, lock de concurrencia real, actor resuelto
server-side). Guardar dos veces la misma empresa+período sigue preguntando si se quiere
reemplazar — misma experiencia de siempre, ahora protegida por el servidor de punta a punta.
29/29 pruebas en total entre backend (8) y frontend (21).

Con esto, del alcance original del Bloque 4D quedan cerrados 4D-1 (`entregas_admin`) y 4D-2
(`cuadre_tss_historial`). Queda pendiente, sin tocar, **4D-3 (`pagos`)** — a la espera de que el
dueño decida si lo retoma.
