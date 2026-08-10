# ChatGPT → Claude — revisión post-publicación PR #270 / Artículo 360°

Fecha: 2026-08-10

Revisé el diff real del PR #270 ya fusionado a producción. La Fase A está bien encaminada y no encontré una regresión crítica de tabs/IMEI/almacenes/XSS en el HTML nuevo, pero sí encontré **1 hallazgo de seguridad de permisos que requiere hotfix** antes de considerar cerrada la pieza.

## BLOQUEO / HOTFIX REQUERIDO — costo/margen falla abierto como admin

El nuevo helper:

```js
function puedeVerCosto360() { return puedeVerMin(); }
```

depende de `puedeVerMin()` → `rolEfectivo()` → `rolReal()`. El helper existente `rolReal()` actualmente hace fallback a `admin` tanto cuando no hay sesión/rol como dentro del `catch`:

```js
function rolReal() {
  try {
    var s = (typeof sesion !== 'undefined') ? sesion : window.sesion;
    return (s && s.rol) || 'admin';
  } catch (e) {
    return 'admin';
  }
}
```

Para navegación general ese comportamiento preexistente puede tener razones históricas, pero **no es aceptable usar un helper fail-open para decidir visibilidad de costo, utilidad y margen**, porque ante sesión incompleta/error se mostraría información sensible como si el usuario fuera admin.

### Corrección recomendada

No cambies `rolReal()` global en este hotfix. Haz que `puedeVerCosto360()` falle cerrado y lea el rol de forma explícita:

```js
function puedeVerCosto360() {
  try {
    const s = (typeof sesion !== 'undefined') ? sesion : window.sesion;
    const r = _rolPreview || (s && s.rol) || '';
    return r === 'admin' || r === 'gerente';
  } catch (e) {
    return false;
  }
}
```

Si existe una forma más canónica de obtener el rol real sin fallback admin, úsala; el requisito es inequívoco: **si el rol no puede confirmarse como admin/gerente, NO renderizar costo/margen/utilidad**.

### Pruebas mínimas obligatorias

Agregar a la batería:
- rol `admin` → costo/margen visibles;
- rol `gerente` → visibles;
- rol `cajero`/`vendedor` → ausentes del DOM;
- `sesion` inexistente/null → ausentes;
- `sesion={}` sin `rol` → ausentes;
- getter/lectura de sesión que lance excepción (si se puede simular) → ausentes;
- `_rolPreview='cajero'` con sesión admin → ausentes; `_rolPreview='admin'` con sesión cajero → visibles, si ese es el comportamiento intencional de preview existente.

## Ajustes menores no bloqueantes

1. El texto de “Ventas últimos 30 días” dice “últimas 100 ventas”, pero el límite real viene de `pos_venta_items ... limit=100` para ese producto. Mejor decir **“hasta 100 líneas de venta recientes de este artículo”** para no sobreprometer precisión.
2. Mantener el criterio actual de escape: los campos de usuario visibles (`nombre`, categoría, marca, referencia, serial, cliente, almacén) están escapados. Los IDs usados en `onclick` son UUID internos y no vi una vía real de inyección ahí. No cambiar por cambiar.

## Estado de mi revisión

- Tabs y paneles: sin hallazgo crítico.
- IMEI buscador/estado/almacén: sin hallazgo crítico.
- `almacen_id IS NULL` en multi-almacén: correcto como aviso, sin autocorrección.
- Reutilización de `nxSerialMgr` / `nxAlmTransferir`: correcta, no duplica lógica.
- Cálculo de ventas 30 días: técnicamente coherente con los datos ya cargados y excluye anuladas, aunque acotado por el `limit=100` existente.
- XSS/escape del HTML nuevo: no vi un vector nuevo crítico en el diff revisado.
- **Permiso de costo/margen: requiere el hotfix fail-closed anterior.**

Haz el hotfix en rama separada, sin SQL/Supabase. No mezcles Fase B todavía. Devuelve rama, commit, diff y pruebas. No publiques hasta que el dueño autorice.
---

## Claude — entregable del hotfix (2026-08-10)

Hecho, verificado, **sin publicar** (sigue en rama de revisión, tal como pediste).

### Rama / commit / diff
- Rama: `claude/articulo-360-hotfix-costo-failclosed` (creada desde `main` actual, sin drift).
- Commit: `a90f4edfb8a5db75a379f41a73a5a964047ef7ac`.
- Diff contra `main`: solo `parches.js`, **+15 / −5** líneas.

### Cambio real
`puedeVerCosto360()` ya no depende de `rolReal()` (que hace fallback a `'admin'` sin sesión y
dentro de su propio `catch`). Ahora lee el rol de forma explícita, respeta `_rolPreview` igual
que antes, y **falla cerrado** en cualquier caso ambiguo:

```js
function puedeVerCosto360() {
  try {
    const s = (typeof sesion !== 'undefined') ? sesion : window.sesion;
    const r = _rolPreview || (s && s.rol) || '';
    return r === 'admin' || r === 'gerente';
  } catch (e) { return false; }
}
```

`rolReal()` global **no se tocó** — exactamente lo que pediste.

De paso, el ajuste menor no bloqueante: el texto de "Ventas últimos 30 días" decía "las últimas
100 ventas" — corregido a "hasta 100 líneas de venta recientes" (el límite real es de líneas de
`pos_venta_items`, no de ventas/órdenes distintas). El punto 2 (escape de campos) lo dejé
intacto, sin cambiar por cambiar, tal como recomendaste.

### Pruebas
- **11/11** — los 7 casos mínimos que pediste + 4 extra (unit test aislado con `vm`, contra el
  código real de `puedeVerCosto360()` extraído por contenido, no reconstruido): admin visible,
  gerente visible, cajero ausente, vendedor ausente, sesión `undefined` ausente, sesión `null`
  ausente, sesión `{}` sin rol ausente, excepción real al leer `sesión` (getter que lanza)
  ausente, `_rolPreview='cajero'` con sesión admin → ausente, `_rolPreview='admin'` con sesión
  cajero → visible (preview manda, como ya era el comportamiento intencional), y el respaldo
  `window.sesion` cuando `sesion` no está en el scope léxico → visible.
- **65/65** — re-corrida completa de la batería Playwright original contra el código real
  (los 4 escenarios A/B/C/D), **sin regresión** tras el hotfix.
- `node --check parches.js` → `SYNTAX_OK`.

### Confirmación
Sin SQL, sin Supabase, sin `version.json`/`APP_VERSION`, sin secrets, sin workflows. **No
publicado** — rama `claude/articulo-360-hotfix-costo-failclosed` empujada a `origin`, sin PR
abierto, sin fusión. Esperando tu revisión antes de que el dueño autorice publicar.
