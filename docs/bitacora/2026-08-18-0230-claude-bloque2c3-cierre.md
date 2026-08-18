## Claude — 2026-08-18 02:30

# Bloque 2C-3 — CERRADO: corregir el precio de una factura ya no es un PATCH directo

Cierre del hallazgo H1 (CRÍTICO) de la auditoría Fase 2C
(`docs/bitacora/2026-08-17-0844-claude-fase2c-auditoria-16-tablas.md`), autorizado explícito por el
dueño con un "Si" sobre la propuesta ya publicada y probada en
`docs/bitacora/2026-08-17-2132-claude-bloque2c3-diseno-probado.md` (ese documento tiene el SQL
completo, el detalle línea por línea, y los 14 casos probados en una rama descartable de Supabase —
no se repite aquí; esta entrada cierra el bloque con lo que se aplicó a producción y la verificación
final).

## El problema (H1)

`nxEditarPrecioFactura()` (`index.html`) hacía un `PATCH` directo a `facturas.prima_base/prima_deps/
total`, con el único candado del lado del navegador: `tienePermiso('modificar_precio')` — un permiso
que se lee de `configuracion.roles_perms` (la misma fila que se blindó en 2C-1) pero que, del lado del
servidor, no bloqueaba nada. Cualquier usuario `authenticated` con algo de conocimiento técnico
(DevTools, curl con su propio token) podía cambiar el precio de cualquier factura sin pasar por la app
ni por el permiso.

## Qué se aplicó a producción (`tnwsgcxurfyuszxsewsn`)

1. **Migración `bloque2c3_seguros_corregir_precio_factura`** — RPC nueva
   `seguros_corregir_precio_factura(p_factura_id, p_nuevo_monto_mes, p_motivo)`, `SECURITY DEFINER`,
   exige `mi_rol()='admin'` y `mi_organizacion()` = la org de seguros. Bloquea facturas
   `Anulada`/`Pagado`. Recalcula `prima_base/prima_deps/total` preservando la fórmula real (deps se
   queda igual, base absorbe el ajuste, total suma `deuda_ant`), ajusta `clientes.deuda_total` por el
   diff, y **resincroniza el estado de TODAS las facturas no anuladas del cliente** (mismo reparto
   oldest-first que ya usaba el resync existente del sistema) — no solo la factura tocada. Registra en
   `auditoria` con el detalle en español (cliente · período · monto anterior → nuevo · diff de deuda ·
   motivo si lo hubo). Idempotente por diseño: recalcula contra la fila bloqueada `FOR UPDATE`, así que
   reintentar con el mismo valor da `{ok:true, sin_cambios:true, ...}` sin volver a tocar nada.
2. **Migración `bloque2c3_acl_rpc_y_columnas_facturas`** — ACL: `REVOKE ALL` de la función seguido de
   `GRANT EXECUTE` solo a `authenticated`/`postgres`, con `REVOKE EXECUTE` explícito de `anon` y
   `service_role` (el gotcha ya documentado varias veces en esta serie: Supabase le da `EXECUTE` a los
   3 roles por default en toda función nueva de `public`, hay que revocarlo a mano). Y el candado de
   columna: `REVOKE UPDATE ON facturas FROM authenticated, anon` + `GRANT UPDATE` solo en las 20
   columnas sin dinero — `prima_base`, `prima_deps` y `total` quedaron **fuera** de ese `GRANT`, así
   que ni siquiera un `UPDATE` crudo (sin pasar por la RPC) puede tocarlas, sin importar el rol.

## Verificación contra producción real (todo con `BEGIN...ROLLBACK`, cero dato tocado)

- **Permisos:** `has_function_privilege` confirmó `authenticated=true`, `anon=false`,
  `service_role=false` en la RPC. `has_column_privilege` confirmó que `authenticated` y `anon` NO
  tienen `UPDATE` en `prima_base`/`prima_deps`/`total`, y SÍ lo tienen en las otras 20 columnas
  (verificado una por una, no solo el conjunto).
- **`get_advisors(security)`:** sin hallazgos nuevos relacionados con esta función ni con `facturas`.
- **Batería de rollback forzado con identidades e invoices REALES** (`sterlin08`=admin,
  `robinson`=agente, facturas reales en estados Pendiente/Pagado/Anulada — sin exponer más detalle de
  cliente del que hace falta aquí): agente bloqueado con el mensaje exacto ("No autorizado..."), admin
  corrige el precio de una factura Pendiente y el diff se refleja correctamente en
  `clientes.deuda_total` y en el resync de las demás facturas del mismo cliente, factura Pagada
  rechazada, factura Anulada rechazada, reintento con el mismo monto da `sin_cambios:true` sin volver a
  escribir nada, monto negativo/NULL rechazado, factura inexistente rechazada, identidad de otra
  organización rechazada por el chequeo de `mi_organizacion()`, y — la prueba que cierra el hallazgo de
  raíz — un `UPDATE facturas SET prima_base=... WHERE id=...` crudo, como `authenticated`, sin pasar
  por la RPC, queda rechazado por el motor con el error de columna sin privilegio (`42501`), confirmado
  en producción, no solo en la rama de prueba.
- **Bug propio, autodetectado y corregido durante esta misma verificación** (documentado en el diseño
  original, se repite aquí por completitud): un primer intento de leer la fila de `auditoria` recién
  insertada DENTRO de la misma sentencia SQL que llamaba a la RPC (vía `WITH ... AS (...)`) dio `null`
  — investigado a fondo (se llegó a revisar la policy de `auditoria` completa antes de descartar un
  bug de RLS real), la causa terminó siendo que Postgres no garantiza el orden de evaluación entre una
  función volátil y una subconsulta independiente dentro del mismo `SELECT`. Se corrigió separando la
  llamada a la RPC y la lectura de verificación en sentencias distintas — patrón que se usó desde
  entonces para el resto de las pruebas de este bloque.

## Frontend migrado (`index.html`)

`nxEditarPrecioFactura()` reescrita para llamar `rpc('seguros_corregir_precio_factura', {...})` en vez
de hacer `PATCH` directo. **Misma UX exacta que antes** — mismo `prompt()`, mismo mensaje de error si
el precio no es válido, mismo flujo de "¿quieres que este precio se quede así para los próximos meses
también?" (`nxSincronizarFacturaPrecio`), mismos toasts de éxito/error. El único cambio invisible para
el usuario: el log de auditoría del lado del navegador se quitó (ya no hace falta, la RPC audita del
lado del servidor con datos que no se pueden falsear) y el "precio permanente" ahora se toma del valor
que la propia RPC confirma como autoritativo, no de un recálculo local aparte. Los 2 puntos de entrada
(`index.html`, botón "Precio" en la tarjeta de factura, y "Corregir el precio" en el menú contextual)
siguen llamando a `nxEditarPrecioFactura('${fid}')` con la misma firma, sin cambios.

Verificado: los 4 bloques `<script>` de `index.html` compilan con `new Function()`; `parches.js` sin
cambios (`node --check` limpio); `version.json` válido, `APP_VERSION` 56.40→56.41 con una entrada de
changelog en español llano explicando el arreglo sin tecnicismos.

## Publicado

Rama `claude/bloque2c3-precio-factura` → PR #284 → fusionado a `main` (merge commit
`0b7a89f7fea478c8643f9614d090a69cb19f1b3a`, confirmado en `origin/main`).

## Estado

**2C-3 CERRADO.** El precio de una factura solo se puede corregir siendo Administrador de verdad —
la base lo exige a nivel de función y a nivel de columna, no solo la app. Con esto, los dos hallazgos
CRÍTICOS de la Fase 2C (H1 y H2) quedan cerrados. Quedan por decidir, sin urgencia, los 2 puntos que el
diseño original de 2C-3 dejó explícitamente fuera de alcance: `facturas.estado` (tiene su propia
segunda vía de exposición vía `regAbono()`) y `clientes.precio_titular` — ambos anotados como
sub-bloques futuros si el dueño los quiere.
