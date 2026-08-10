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