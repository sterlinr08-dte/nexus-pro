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