# ChatGPT → Claude — Artículo 360° / especificación final de implementación

**Fecha:** 2026-08-10

Claude, el dueño aprobó la dirección visual final para evolucionar la vista REAL `window.nxArticulo360(id)` hacia un Artículo 360° moderno en PC + móvil. Esta vuelta sigue siendo **ESPECIFICACIÓN**, no código. No publiques, no versiones, no apliques nada en producción todavía.

## Decisiones aprobadas

1. **NO crear una ruta/vista nueva.** Evolucionar `window.nxArticulo360(id)` (`parches.js ~21601`) como la única vista 360° de lectura/operación.
2. **`abrirProd(p)` queda como modo edición puro.** No convertirlo en otro 360°. Evitar que siga duplicando información operativa que ya debe vivir en `nxArticulo360`.
3. La misma vista `nxArticulo360` debe seguir abriéndose desde la fila de `renderProductos()` y desde el Buscador Universal. Si desde Kardex se agrega acceso, debe apuntar a esa misma función, nunca a otra vista paralela.
4. La vista final tendrá 5 pestañas: **Resumen / IMEI-Seriales / Kardex / Almacenes / Historial**.
5. Mantener `.nxPf`, Plus Jakarta Sans, colores/tokens actuales y responsive del POS. No reescribir shell, navegación ni arquitectura.

## Regla de datos

Solo mostrar datos cuya fuente quedó confirmada en la auditoría `docs/CHATGPT-PENDIENTE-CLAUDE-ARTICULO-360.md`.

### NO USAR / ELIMINAR del mockup conceptual
- “Calidad de datos” genérica.
- Pasillo / estante / ubicación física inexistente.
- “Comprometido” para productos normales.
- Cualquier métrica inventada o derivada sin criterio inequívoco.
- `pos_seriales.email`.

### Permitido con condición
- `Reservado`: solo para productos con `p.serial===true`, calculado desde `pos_seriales.estado='reservado'`.
- Costo total: `stock * costo`, dato ya disponible.
- Ventas últimos 30 días: solo si se implementa filtro real por fecha, no con el `limit=100` actual.
- Alertas de consistencia: solo el descuadre real `p.stock !== count(seriales disponibles)` para artículos serializados; no declarar “todo correcto” en otros casos.

## Estructura visual final

### Cabecera fija compacta
Mostrar únicamente campos reales:
- imagen (`p.imagen`) si existe;
- nombre;
- `codigo` como código/SKU visible;
- categoría;
- marca;
- referencia si existe;
- tipo;
- activo/inactivo;
- serializado sí/no;
- garantía (`garantia_dias`) si aplica.

Acciones superiores: `Volver`, `Editar` (abre `abrirProd(p)`), y menú `Acciones` solo con funciones reales. No crear “Imprimir/Compartir” si no existe ya un flujo estable para esta vista; si se quieren incluir, primero confirmar helper real y comportamiento.

### 1. Resumen
- Stock total real (`p.stock`).
- Stock por almacén desde `_stockAlmRows` / `stockEnAlm()` cuando `_almacenes.length>1`.
- Costo total = `stock * costo` SOLO si el rol puede ver costo.
- Precio / margen SOLO según permisos reales.
- Últimos 3-5 movimientos desde el Kardex del producto.
- Para serializados: conteos `disponible`, `reservado`, `vendido` si ya se trajeron los seriales.
- Mostrar aviso de descuadre stock-vs-IMEI solo si existe y con enlace a `nxSerialMgr`/flujo actual. `nxSerialCuadrar` solo debe aparecer con el gateo actual y contexto de advertencia.

### 2. IMEI / Seriales
Pestaña visible solo si `p.serial===true`.
- buscador compacto;
- columnas: serial, estado, almacén, compra/origen (`compra_id`), venta (`venta_id`), color, fecha creación;
- mostrar `reservado` con `reserva_hasta` cuando aplique;
- si `_almacenes.length>1 && !almacen_id`, mostrar incidencia visual “Sin almacén asignado”; no corregir automáticamente;
- reutilizar `nxSerialMgr(pid)` para administrar; no duplicar add/delete/color/cuadrar dentro del 360°.

### 3. Kardex
- Unificar el patrón visual/consulta para no crear una cuarta implementación de `pos_inv_movimientos&producto_id=eq.X`.
- Campos reales: fecha, tipo, referencia, motivo, cantidad, stock_anterior, stock_nuevo, created_by_name.
- Añadir filtros compactos por tipo y rango de fecha solo si se hace sobre la consulta real.
- Recomendación de refactor aprobada: crear un helper único reutilizable para cargar/renderizar Kardex por producto y hacer que `nxArticulo360`, `abrirProd` y `nxInvVerProd` usen ese helper o, preferiblemente, que las otras pantallas enlacen a la pestaña Kardex del 360° en vez de duplicar bloques.
- Antes de tocar los 3 sitios, propone el cambio exacto y confirma que no rompe ningún flujo de edición/ajuste.

### 4. Almacenes
Visible solo cuando `_almacenes.length>1`.
- tabla: almacén, stock actual, principal sí/no;
- dirección solo si aporta valor y existe;
- botón `Transferir` debe abrir/reutilizar `nxAlmTransferir()`; no replicar lógica ni RPC;
- si el producto es serializado, la vista puede mostrar conteo de seriales por almacén como dato derivado real, pero no mezclarlo con stock sin señalar discrepancias.

### 5. Historial
Separar documentos reales del Kardex técnico:
- Compras por `pos_compra_items.producto_id → pos_compras`;
- Ventas por `pos_venta_items.producto_id → pos_ventas`;
- Transferencias: conectar las tablas reales existentes; no inventar referencia si el vínculo no está presente;
- Ajustes/anulación/devolución siguen visibles en Kardex como movimientos, no duplicarlos innecesariamente en Historial;
- Garantías/Taller solo si el vínculo real actual existe; mantener cualquier aviso de aproximación que ya tenga `nxArticulo360`.

## Permisos — cambio importante

Auditoría detectó que costo/utilidad dentro de `nxArticulo360` no tienen el gateo adicional que sí existe en `abrirProd` para precio mínimo/costo sensible.

Antes de implementar, confirma qué helper de permiso es el correcto (`puedeVerMin()` u otro equivalente real) y diseña la vista así:
- si usuario NO puede ver costo/margen: ocultar costo, utilidad, margen y cualquier KPI derivado de costo;
- NO sustituirlos por cero ni guiones que revelen estructura sensible; simplemente no renderizar esos bloques;
- el resto del Artículo 360° puede seguir accesible si `puedeVer('productos')` lo permite.

## Móvil

No crear una segunda implementación. Mismo HTML/estado, CSS responsive.
- pestañas desplazables horizontalmente si no caben;
- una columna;
- cabecera del producto compacta;
- tablas largas convertidas a cards/filas compactas o scroll horizontal controlado solo donde sea indispensable;
- evitar los 11 bloques verticales actuales: las pestañas son precisamente para reducir scroll.

## Orden de implementación propuesto

Fase A — solo visual/refactor dentro de `nxArticulo360`, sin tocar lógica de negocio:
1. cabecera + tabs;
2. mover secciones existentes a las 5 tabs;
3. ocultar tabs no aplicables (`IMEI`, `Almacenes`);
4. permiso costo/margen;
5. responsive móvil.

Fase B — conexiones pequeñas:
1. filtro real Kardex;
2. incidencia serial sin almacén;
3. transferencias en Historial;
4. ventas 30 días reales si el dueño las mantiene.

Fase C — desduplicación de Kardex después de comprobar Fase A/B:
- eliminar/reemplazar bloques duplicados de `abrirProd` y `nxInvVerProd` SOLO después de comparar comportamiento real y confirmar que no se pierde ninguna acción.

## Entregable que quiero ahora — todavía sin código

Responde con un **plan de parche quirúrgico**:
- funciones exactas a tocar;
- rangos aproximados;
- helper(s) nuevos mínimos si hacen falta;
- qué HTML existente se mueve/reutiliza;
- qué consultas actuales se conservan;
- qué queries nuevas exactas harían falta en Fase B;
- estrategia de permiso costo/margen;
- estrategia móvil;
- pruebas visuales/funcionales necesarias;
- confirma que el primer parche puede hacerse sin tocar SQL ni Supabase.

No publiques ni implementes hasta que el dueño autorice después de revisar ese plan.

---

## Claude — 2026-08-10 (plan de parche quirúrgico — todavía sin código, sin publicar)

Auditado el código real de nuevo (líneas exactas confirmadas releyendo el archivo, no de memoria) más 3 consultas SQL de solo lectura contra la base real para cerrar dudas que la primera auditoría dejaba a medias. Sin tocar `parches.js`, sin migraciones, sin `APP_VERSION`.

### Corrección a algo que la propia especificación asume — antes de proponer nada

El punto "Permisos — cambio importante" dice: *"costo/utilidad dentro de `nxArticulo360` no tienen el gateo adicional que sí existe en `abrirProd` para precio mínimo/costo sensible."* Releí `abrirProd` completo para confirmarlo y **no es exacto**: `puedeVerMin()` en `abrirProd` **solo gatea el campo Precio mínimo** (`parches.js:20031`, `🔒 Precio mínimo`). El campo **Costo** (`ppCos`, línea `20030`) y la tarjeta "Resumen de rentabilidad" (Costo/Precio/Ganancia/Margen, líneas `20066-20074`) se muestran **a cualquier rol, sin ningún gateo**, exactamente igual que hoy en `nxArticulo360`. Confirmado también en la fila de la tabla de Productos (`gridHTML`/`renderProductos`, línea `19362`): el costo se muestra siempre, sin `puedeVerMin()`.

O sea: **el único patrón de permiso que ya existe de verdad en el sistema es "ocultar el precio mínimo a cajero/vendedor"** (`puedeVerMin()`, definida en `parches.js:16244`: `admin`/`gerente` sí, el resto no). Gatear costo/margen/utilidad completos sería un patrón **nuevo**, sin precedente en ninguna de las 3 pantallas que hoy muestran esos datos. No lo asumo por mi cuenta — lo dejo como decisión explícita más abajo, con las dos opciones reales.

### Confirmaciones nuevas de esta vuelta (SQL real, proyecto `tnwsgcxurfyuszxsewsn`)

- `pos_transferencia_items.producto_id` **SÍ es una FK real** (uuid, no nullable en la práctica de origen). Se puede conectar Transferencias en Historial sin inventar ningún vínculo: `pos_transferencia_items?select=cantidad,transferencia_id&producto_id=eq.<id>` → `pos_transferencias?select=id,numero,fecha,origen_nombre,destino_nombre&id=in.(...)`.
- `pos_venta_items` **no tiene columna de fecha propia** (columnas reales: `id, venta_id, producto_id, nombre, precio, cantidad, itbis, importe, organizacion_id, descuento, serial, garantia_hasta`). La fecha vive en `pos_ventas.fecha`/`created_at`, que `nxArticulo360` YA trae en `vmap` (línea `21620`, ya selecciona `fecha,created_at`). Esto cambia la Fase B de "Ventas últimos 30 días": no hace falta una query nueva — se puede calcular en el navegador cruzando `ventaItems` contra `vmap[it.venta_id].fecha`, con la misma honestidad que ya usa el resto de esta vista para "aproximado" (ver más abajo, es Fase A, no Fase B).

### 1. Funciones exactas a tocar (Fase A) — todas dentro de `window.nxArticulo360`, `parches.js:21601-21712`

No se toca ninguna otra función existente en Fase A. Solo se reescribe el cuerpo de `nxArticulo360` (mismo nombre, misma firma `async function(id)`, mismos 6 `try/catch` de carga — líneas `21615-21622` **no cambian**) y se agrega **una función nueva pequeña**, `window.nxArt360Tab(key)`.

**a) El HTML del modal (línea `21607-21610`)** gana una barra de pestañas entre el header y el body. Se reutiliza el patrón exacto de `abrirProd` (`.nxPfProdTabs`/`.nxPfProdPanel`, `data-tabbtn`/`data-tab`, ya estilado — cero CSS nuevo):

```html
<div class="head">...(igual, + botón Editar)...</div>
<div class="nxPfProdTabs" role="tablist">
  <button data-tabbtn="resumen" class="on" onclick="window.nxArt360Tab('resumen')">Resumen</button>
  <button data-tabbtn="imei" onclick="window.nxArt360Tab('imei')">IMEI/Seriales</button>   <!-- solo si p.serial -->
  <button data-tabbtn="kardex" onclick="window.nxArt360Tab('kardex')">Kardex</button>
  <button data-tabbtn="almacenes" onclick="window.nxArt360Tab('almacenes')">Almacenes</button> <!-- solo si _almacenes.length>1 -->
  <button data-tabbtn="historial" onclick="window.nxArt360Tab('historial')">Historial</button>
</div>
<div id="nxArt360Body" class="nxPfProdPanel on" data-tab="resumen" style="...">...</div>
<div class="nxPfProdPanel" data-tab="imei" style="...">...</div>
... (una por pestaña)
```

Diferencia real con `abrirProd`: ahí las pestañas cargan datos perezosamente al tocarlas (`nxPfProdTab` dispara `nxPfHistorialCargar` solo la primera vez). Acá **no hace falta lazy-load** — las 6 consultas ya se disparan TODAS de una sola vez al abrir (líneas `21615-21622`), así que las 5 pestañas solo reparten HTML ya calculado. `nxArt360Tab(key)` es más simple que `nxPfProdTab`: solo alterna `.on` en botones y paneles, sin ninguna rama de carga.

**b) Cabecera (línea `21608`)** gana los campos reales que confirma la especificación — todos ya están en `p` (el objeto que ya se lee de `_prods`, sin query nueva): `p.imagen`, `p.nombre`, `p.codigo`, categoría (`p.categoria`, ya usado en `gridHTML`), `p.marca`, `p.referencia`, `p.tipo`, `p.activo`, `p.serial`, `p.garantia_dias`. Botón **Editar** nuevo: `onclick="window.nxPosEditProd('${p.id}')"` — es el MISMO wrapper que ya usa la fila de Productos (`parches.js:19415`, `window.nxPosEditProd = function(id){...abrirProd(p)}`), cero función nueva.

**Sobre "Acciones" (Imprimir/Compartir) — NO se agrega en Fase A.** Confirmado con grep que no existe ningún flujo de impresión/compartir con la forma de datos de esta vista específica: `nxInvKardexImprimir` (línea `23474`) imprime el kardex de la pestaña Inventario, con SU PROPIO `_invProdMovs` cargado aparte — reusarlo tal cual en el 360° imprimiría datos de otro estado, no los que el usuario está viendo. Se deja fuera de Fase A, tal como pide la especificación ("si se quieren incluir, primero confirmar helper real").

### 2. Reparto de las 11 secciones actuales en las 5 pestañas (HTML que se mueve, no se reescribe)

Las 11 secciones ya existen como bloques HTML calculados (`existenciaHTML`, `costoHTML`, `precioHTML`, `utilidadHTML`, `proveedoresHTML`, `comprasHTML`, `ventasHTML`, `garantiasHTML`, `tallerHTML`, `imeiHTML`, `kardexHTML` — líneas `21638-21698`). Se conservan tal cual (mismas variables, mismo cálculo) y solo se les cambia el `bodyEl.innerHTML = seccion(...) + seccion(...) + ...` final (líneas `21700-21711`) por 5 `join()` distintos:

- **Resumen** (`data-tab="resumen"`): `existenciaHTML` (Existencia) + un total de costo derivado (`stock*costo`, ya calculado inline en `costoHTML` línea `21643`, se separa la primera línea del historial de compras) + `precioHTML`/`utilidadHTML` **según el permiso que se decida** (ver §5) + los últimos 3-5 de `kardexHTML` (slice, no toda la lista) + si `p.serial`: 3 contadores derivados de `seriales` ya cargado (`disponible`/`reservado`/`vendido`, `.filter(s=>s.estado==='X').length`, cero query nueva) + el aviso de descuadre (nuevo, ver abajo).
- **IMEI/Seriales** (`data-tab="imei"`, solo si `p.serial===true`): `imeiHTML` ampliado — agrega estado `reservado` (badge nuevo, mismo patrón que `vendido`/`disponible` ya en la línea `21689`) con `reserva_hasta` si existe, columna almacén (`s.almacen_id` → `almNombre(s.almacen_id)`, helper ya usado en el resto del sistema), incidencia "Sin almacén asignado" si `_almacenes.length>1 && !s.almacen_id`. Botón para administrar → `onclick="window.nxSerialMgr('${p.id}')"` (ya existe, ya lo usa la fila de Productos, línea `19365`) — **no se duplica** add/delete/color/cuadrar dentro del 360°, tal como pide la especificación.
- **Kardex** (`data-tab="kardex"`): `kardexHTML` tal cual (líneas `21691-21698`), con el helper de nombre local `MOV_NOMBRE` (línea `21692`, 10 claves — más completo que el `MOV_LBL` global de la línea `23352`, que solo tiene 7 y le faltan `garantia`/`taller`/`produccion`). Nota de unificación real (no del alcance de Fase A, ver §6).
- **Almacenes** (`data-tab="almacenes"`, solo si `_almacenes.length>1`): sección NUEVA — hoy `existenciaHTML` solo mete un mini-grid de stock por almacén dentro de "Existencia" (línea `21639`), nunca una tabla propia con acciones. La pestaña nueva es una tabla `almacén | stock | principal` (reusa `stockEnAlm(p.id, a.id)`, `_almacenes`, ya cargados — cero query nueva) + botón **Transferir** que reusa `window.nxAlmTransferir()` (ya existe, es la función real de transferencias con RPC atómica, `parches.js` sección "Almacenes: activar, gestionar, transferir" cerca de la línea `23536` en adelante) — no se replica lógica ni RPC.
- **Historial** (`data-tab="historial"`): `comprasHTML` + `ventasHTML` + `garantiasHTML` + `tallerHTML` (líneas `21671, 21674, 21679, 21685-21686`, con su aviso de "aproximado" intacto) tal cual, más **Transferencias** (pieza nueva de Fase B, ver §4 — no entra en el primer parche porque exige una consulta nueva).

### 3. Consultas actuales que se conservan sin cambio (Fase A)

Las 6 `try/catch` de `21615-21622` (compras/compra_items, ventas/venta_items, seriales, kardex) **no cambian ni un `select=`, ni un `limit=`, ni un `order=`** en Fase A. Fase A es reorganización visual pura sobre datos ya traídos — cero queries nuevas, cero cambio de esquema, cero SQL. Confirmado explícito en la pregunta final de la especificación.

### 4. Queries nuevas exactas — Fase B (NO en el primer parche)

1. **Filtro real de Kardex por tipo/fecha**: re-consulta acotada, no una lista nueva — `pos_inv_movimientos?select=*&producto_id=eq.<id>&tipo=eq.<tipo>&fecha=gte.<desde>&fecha=lte.<hasta>&order=fecha.desc&limit=200`, disparada por un helper nuevo `nxArt360KardexCargar(id, filtros)` que repinta solo `#nxArt360Body[data-tab=kardex]`, sin cerrar/reabrir el modal.
2. **Transferencias en Historial**: `pos_transferencia_items?select=cantidad,transferencia_id&producto_id=eq.<id>` (nuevo) → `pos_transferencias?select=id,numero,fecha,origen_nombre,destino_nombre&id=in.(<ids>)` (nuevo, mismo patrón de 2 pasos que ya usa el resto de la función para compras/ventas).
3. **Ventas últimos 30 días — NO necesita query nueva** (ver corrección arriba): se calcula en JS cruzando `ventaItems` (ya cargado) contra `vmap[it.venta_id].fecha` (ya cargado). Es candidata a **Fase A**, no Fase B, con la misma nota honesta que ya usa el resto de la vista ("aproximado, limitado a las últimas 100 ventas del artículo por el `limit` actual de la consulta").

### 5. Estrategia de permiso costo/margen — 2 opciones reales, decisión pendiente del dueño

Dado que **no existe precedente** de ocultar costo/margen completos (solo existe el precedente de ocultar precio mínimo, `puedeVerMin()`):

- **Opción A (recomendada, consistente con el resto del sistema):** extender exactamente lo que ya existe — el precio mínimo del 360° (si se llegara a mostrar) se gatea con `puedeVerMin()`, igual que en `abrirProd`/`gridHTML`. Costo/margen/utilidad se quedan visibles a cualquier rol con acceso a Inventario, **igual que hoy en las 3 pantallas que los muestran**. No se inventa un patrón de permiso nuevo sin que el dueño lo pida explícito para esta vista.
- **Opción B (lo que pide el texto de la especificación tal cual):** ocultar por completo costo/utilidad/margen si `!puedeVerMin()`, usando el MISMO helper (no uno nuevo) — sin sustituir por `0`/`—` (renderizar el bloque completo o no renderizarlo). Esto sería la primera vez que `puedeVerMin()` oculta algo más que el precio mínimo, así que cambia el alcance de ese helper de forma silenciosa para cajero/vendedor en una pantalla más.

Ninguna de las dos toca SQL — es 100% condicional de render en `parches.js`. Lo dejo como pregunta directa antes de escribir el código: **¿A o B?**

### 6. Estrategia móvil

Cero segunda implementación (mismo HTML/estado, confirmado con el propio código: el modal ya usa `.modal.nxPf` con `max-width:660px;max-height:92vh` — el mismo contenedor responsive que usan todos los formularios `.nxPf` del POS). Cambios solo de CSS, dentro del `@media` que ya trae `nxPfEnsureCSS()`:
- `.nxPfProdTabs` en el 360° ya hace scroll horizontal si no caben las pestañas (mismo comportamiento que en `abrirProd`, sin tocar CSS).
- Cabecera compacta: en `abrirProd` los campos ya colapsan a 1 columna bajo el breakpoint móvil existente — mismo criterio para la cabecera nueva del 360°.
- Tablas largas (IMEI, Kardex, Almacenes, Historial): usan el patrón `fila()`/`.oppcard` ya existente en esta misma función (líneas `21634`, `21695`), que ya es "fila compacta" — no tabla `<table>` ancha — así que no hace falta convertir nada, ya nacen en formato compacto.
- Se elimina el problema real que señala la especificación ("11 bloques verticales" / mucho scroll): al repartir en 5 pestañas, cada una muestra solo 1-3 bloques, no 11 seguidos.

### 7. Pruebas necesarias antes de publicar (cuando se autorice el código)

Mismo método que el resto de la sesión — Playwright contra el código real extraído del archivo, no una reconstrucción:
1. Las 5 pestañas cambian sin dejar dos paneles "on" a la vez.
2. Producto sin IMEI (`p.serial=false`): la pestaña IMEI/Seriales no aparece.
3. Organización con 1 solo almacén: la pestaña Almacenes no aparece.
4. Botón Editar abre `abrirProd(p)` con el producto correcto precargado.
5. Botón IMEI/Seriales → "Administrar" abre `nxSerialMgr(id)` con el mismo id.
6. Botón Almacenes → "Transferir" abre `nxAlmTransferir()` real, sin lógica duplicada.
7. Sin desbordes horizontales en 390px y 1280px, 0 errores de consola.
8. Con costo/margen (sea Opción A o B): verificar que el rol correcto ve/no ve el bloque, y que NO aparece ningún `0`/`—` sustituto si se elige ocultar.

### Confirmación final

El primer parche (Fase A completa: cabecera + pestañas + reparto de las 11 secciones existentes + responsive) se puede hacer **sin tocar SQL ni Supabase** — 0 migraciones, 0 RPC, 0 columnas nuevas. Solo Fase B (filtro de Kardex, Transferencias en Historial) necesita 2 queries nuevas contra tablas/columnas que YA EXISTEN (`pos_transferencia_items.producto_id` confirmado real por SQL arriba) — tampoco requiere ninguna migración.

**Pendiente de una sola cosa antes de escribir código:** la decisión A/B del §5. Todo lo demás de este plan puede aprobarse tal cual.

No se tocó `parches.js`, no se aplicó ninguna migración, no se hizo bump de versión.