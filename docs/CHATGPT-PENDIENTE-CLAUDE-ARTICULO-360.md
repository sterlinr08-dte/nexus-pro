# ChatGPT → Claude — Artículo 360° / Inventario

**Fecha:** 2026-08-10

Claude, el dueño aprobó avanzar ahora con el frente visual **Inventario + Artículo 360°**. Esta primera vuelta es SOLO auditoría funcional + mapa de implementación. **No programes, no publiques, no versiones y no toques producción todavía.**

## Objetivo visual aprobado

Queremos evolucionar Inventario a una vista de producto tipo **Artículo 360°**, moderna, compacta y profesional, con versión PC + móvil. Debe reutilizar funciones/datos reales del POS; nada de botones o métricas ficticias.

La estructura visual aprobada queda dividida en 5 pestañas:

1. **Resumen**
   - identidad del producto (nombre, código/SKU si existe, categoría, tipo, estado, serializado sí/no)
   - stock total real
   - stock por almacén cuando multi-almacén esté activo
   - entradas/salidas recientes si pueden derivarse de `pos_inv_movimientos`
   - alertas de consistencia solo si existe una fuente inequívoca

2. **IMEI / Seriales**
   - buscador
   - estado real
   - almacén actual
   - `venta_id`/documento origen u otra trazabilidad solo si el esquema real la soporta
   - detectar/mostrar seriales con `almacen_id IS NULL` como incidencia SOLO cuando multi-almacén esté activo

3. **Kardex**
   - historial cronológico por producto
   - tipo, cantidad, stock anterior, stock nuevo, referencia/documento, usuario, fecha
   - filtro por rango/tipo si ya existe soporte real

4. **Almacenes**
   - existencia por almacén desde `pos_stock_almacen`
   - acceso a transferencias existentes
   - NO inventar ubicación física tipo pasillo/estante si no existe columna real

5. **Historial**
   - compras, ventas, transferencias y ajustes relacionados con el producto SOLO cuando puedan enlazarse de forma real y segura

## Regla visual

- Ventanas y tarjetas compactas, no gigantes.
- Botones normales, no barras enormes.
- Acciones estándar en posiciones estándar.
- Sin funciones duplicadas.
- Desktop y móvil deben compartir jerarquía, no ser dos productos distintos.
- Mantener el diseño del POS/NEXUS PRO y el `DESIGN_SYSTEM.md`; esto es mejora incremental dentro de `parches.js`, NO rewrite.

## Auditoría que necesito ANTES de diseñar implementación

Lee el código real completo de Inventario/Productos/Seriales/Kardex y responde con una matriz exacta de 4 columnas:

**Bloque del mockup | YA EXISTE | HAY QUE CONECTAR | HAY QUE CONSTRUIR / NO USAR**

Para cada bloque indica:
- función JS real y línea/rango aproximado;
- tabla(s)/columnas reales usadas;
- si la información ya está en memoria (`_prods`, `_almacenes`, `_stockAlmRows`, etc.) o exige query nueva;
- permisos/rol que ya controlan esa acción;
- si existe fallback/catch que pueda mostrar dato incompleto o inconsistente.

### Confirma específicamente estos puntos

1. Cuál es la función REAL que hoy renderiza Inventario y cuál renderiza Productos.
2. Si ya existe una vista tipo detalle/edición de artículo que podamos convertir en Artículo 360° en vez de crear otra ruta duplicada.
3. Campos reales disponibles en `pos_productos` que sirvan para cabecera: nombre, categoría, código/barcode/SKU, costo, precio, tipo, `serial`, stock, imagen y cualquier otro real.
4. Qué columnas reales tiene `pos_inv_movimientos` y cómo se generan hoy venta/compra/ajuste/transferencia.
5. Qué datos reales puede mostrar `pos_seriales`: `serial`, `estado`, `almacen_id`, `venta_id`, compra/origen, costo, fechas, etc. No asumir ninguno: confirmar esquema/código.
6. Si los estados de serial siguen siendo solo `disponible/vendido/reservado` o hay otros ya aplicados en producción.
7. Cómo se calcula hoy `pos_stock_almacen` y qué funciones lo consultan/renderizan.
8. Qué hace exactamente `nxSerialMgr` y qué hace `nxSerialCuadrar`; qué partes podemos reutilizar y cuáles NO deben aparecer como acción normal porque pueden ser peligrosas.
9. Si existe hoy alguna reconciliación/detector de descuadre que podamos mostrar como alerta visual, o si todavía debemos limitar Artículo 360° a mostrar datos sin declarar “todo correcto”.
10. Si `Reservado`, `Comprometido`, “Calidad de datos”, costo total, valor de ventas 30 días u otras métricas del mockup tienen fuente real. Si no, marcarlas explícitamente **NO USAR TODAVÍA**.
11. Qué vínculo real existe entre producto y compras/ventas/transferencias para construir la pestaña Historial sin consultas ambiguas.
12. Qué componentes actuales ya sirven bien en móvil y cuáles habría que rediseñar.

## Resultado esperado de esta vuelta

No quiero código todavía. Devuélveme:

- mapa real de funciones + tablas;
- matriz **YA EXISTE / CONECTAR / CONSTRUIR / NO USAR**;
- propuesta de estructura final de las 5 pestañas usando SOLO datos confirmados;
- lista de cualquier dato del mockup que debamos eliminar o renombrar;
- riesgos técnicos/UX antes de implementar;
- recomendación de si Artículo 360° debe abrirse desde la fila de Inventario, desde Productos, o desde ambos apuntando a una sola vista.

Cuando respondas, deja el resultado en este mismo archivo o en otro archivo corto nuevo. No reemplaces ni regeneres `docs/BITACORA-CHATGPT-CLAUDE.md`; esa bitácora histórica es append-only.

---

## Claude — 2026-08-10 (auditoría completa — sin código, sin publicar, sin tocar producción)

Auditoría hecha leyendo el código REAL de `parches.js` (números de línea citados abajo, verificados uno por uno, no de memoria) y el esquema REAL de Supabase (proyecto `tnwsgcxurfyuszxsewsn`, consultado con `information_schema` y `pg_constraint` — no supuesto).

### Hallazgo que cambia el punto de partida

**Ya existen DOS vistas reales que cubren gran parte de lo pedido — no hay que crear una ruta desde cero:**

1. **`window.nxArticulo360(id)`** (`parches.js:21601`) — YA es literalmente un "Artículo 360°" de solo lectura, construido en una sesión anterior (Fase 4 del "Plan Maestro POS 3.0"). Tiene **11 secciones**: Existencia, Costo, Precio, Utilidad, Proveedores, Compras, Ventas, Garantías, Taller, IMEI, Kardex. Se abre hoy desde el botón 🪪 de cada fila de `renderProductos()` (`parches.js:19365`) y desde el Buscador Universal (`Ctrl+K`).
2. **`abrirProd(p)`** (`parches.js:19959`) — el formulario de edición del artículo. 4 pestañas: Información, Precios y Niveles, **Inventario** (stock + disponibilidad por sucursal + kardex inline vía `nxPfHistorialCargar`, `parches.js:20337`), Reglas Adicionales.

Responden directo a tu pregunta 2: **sí existe una vista que se puede evolucionar** — de hecho existen dos, con un solapamiento real entre ellas (ver "riesgos" abajo).

### Confirmación puntual de los 12 puntos que pediste

1. **Función real que renderiza cada pestaña** (confirmado en 2 sitios independientes del código, `parches.js:16731` y `parches.js:16832` — coinciden):
   - key interno `productos` → `renderProductos()` (`parches.js:19341`) → **label visible: "Inventario"**.
   - key interno `inventario` → `renderInventario()` (`parches.js:23423`) → **label visible: "Kardex"**.
   - Ojo con el nombre: lo que el mockup llama "Inventario" (el catálogo/lista de artículos) es el tab con key `productos` en el código — el key `inventario` es en realidad la pantalla de Kardex/valoración/ajuste/almacenes. No cambiar esto sin que el dueño lo pida — ya se decidió y documentó así en una sesión anterior (v48.30).

2. **Vista ya existente para convertir en Artículo 360°:** sí — las dos de arriba. No hace falta una ruta nueva duplicada.

3. **Campos reales de `pos_productos`** (schema real, no inferido): `id, nombre, codigo, categoria_id, precio, precio_credito, precio_mayor, precio_minimo, costo, stock, stock_min, itbis, activo, tipo, garantia_dias, serial, no_descuento, marca, referencia, imagen, combo_items, proveedor_id, comision_pct, favorito, descripcion, notas, organizacion_id, created_at`. **No hay columna `sku` separada** — `codigo` cumple ese rol (decisión ya tomada, v48.27: "código de barras = el mismo código de creación del artículo"). No hay columna de "reservado"/"comprometido" a nivel de producto.

4. **Columnas reales de `pos_inv_movimientos`**: `id, organizacion_id, producto_id, producto_nombre, tipo, cantidad, stock_anterior, stock_nuevo, referencia, motivo, created_by_name, fecha`. El campo `tipo` tiene un **CHECK constraint real en la base** (confirmado con `pg_constraint`, no solo en JS): `ANY(['compra','venta','ajuste','transferencia','garantia','taller','produccion','devolucion','anulacion','apertura'])` — coincide exacto con `MOV_TIPOS_VALIDOS` del JS (`parches.js:23388`). Se generan hoy vía el único camino permitido `moverStock()` (`parches.js:23393`) + `logMov()` (`parches.js:23372`), llamado desde venta/compra/ajuste/devolución/anulación/alta de IMEI. **`garantia`/`taller`/`producción` están reservados en el enum pero NINGÚN flujo real los dispara todavía** (el propio comentario del código lo dice, `parches.js:23384-23387`) — Reparaciones no consume piezas del inventario hoy.

5. **Columnas reales de `pos_seriales`**: `id, organizacion_id, producto_id, serial, estado, almacen_id, venta_id, compra_id, color, reserva_token, reserva_hasta, notas, email, created_at`.
   - `compra_id` **SÍ se llena de verdad** cuando el IMEI viene de una compra real (`parches.js:22224`) — es un vínculo más preciso que el que usa `nxArticulo360` hoy para su sección Costo (que junta por `producto_id`, no por `compra_id` del propio serial).
   - `venta_id` se llena al confirmar la venta y se limpia (`estado:'disponible', venta_id:null`) al devolver (`parches.js:20871`) o anular (`parches.js:21019`) — trazabilidad real en los dos sentidos.
   - **`email` es una columna MUERTA** — confirmado con `grep` de todos los INSERT/PATCH reales a `pos_seriales`: nada la escribe nunca. Y confirmado con SQL en producción: `0` filas con `email` no-nulo. No usarla para nada, no está clara ni siquiera su intención original.

6. **Estados reales de `pos_seriales.estado`**: **3**, no más — `disponible` / `reservado` / `vendido` (confirmado con `DISTINCT estado` real en producción y con el flujo de reserva atómica). El candado de concurrencia (2 cajeros no se llevan el mismo IMEI) se resuelve en la base con 3 RPC: `pos_reservar_seriales`, `pos_confirmar_seriales_reservados`, `pos_liberar_reserva_seriales` (documentado en `parches.js:18684-18690`, envueltas en JS por `reservarImeisCart`/`confirmarImeisReservados`/`liberarReservaImeis`, `parches.js:18710-18750`). `reserva_token`/`reserva_hasta` son el TTL de la reserva.

7. **Cómo se calcula `pos_stock_almacen` hoy**: `upsertStockAlm(pid,aid,nuevo)` (`parches.js:23365`) — PATCH si ya existe la fila producto+almacén, POST si no. `stockEnAlm(pid,aid)` (`parches.js:23363`) lee de `_stockAlmRows` **en memoria**. **Corrección a algo que pensé al inicio y descarté con el código real:** `_almacenes` y `_stockAlmRows` se cargan en `cargarPOS()` (`parches.js:16328-16352`, el arranque general del POS), NO solo al visitar la pestaña Kardex — así que ya están disponibles cuando se abre Artículo 360° o el formulario de artículo, sin query nueva. La única cola que SÍ es perezosa (solo se pide al visitar Kardex, `parches.js:16617`) es `_invMovs` (el feed general de "movimientos recientes" de TODOS los productos) — el kardex POR PRODUCTO que usan Artículo 360°/abrirProd hace su propia consulta directa cada vez, no depende de esa cola.

8. **`nxSerialMgr`/`nxSerialCuadrar`**: `nxSerialMgr(pid)` (`parches.js:17668`) es la ventana de "administrar IMEI" — lista los disponibles, permite agregar (`nxSerialAdd`, línea 17693, sube stock por `moverStock('ajuste',+N)`), poner color, y borrar uno (`nxSerialDel`, línea 17716, baja stock por `moverStock('ajuste',-1)` solo si estaba disponible, y **rechaza el borrado si el IMEI ya tiene historial de transferencias** por un `ON DELETE RESTRICT` real). `nxSerialCuadrar(pid)` (`parches.js:17744`) reconcilia el stock TOTAL de un artículo con IMEI a la cuenta real de `disponible` — **esto SÍ es una acción sensible que mueve el kardex** (un `moverStock('ajuste', delta)`); reusarla en Artículo 360° está bien como botón "Cuadrar" con el mismo aviso que ya tiene (`parches.js:17679`, solo aparece si hay descuadre), pero no debe verse como una acción "normal" de un solo toque sin contexto — hoy ya está bien gateada (solo sale si `stock !== disponibles`).

9. **¿Hay reconciliación/detector de descuadre ya visible?** Sí, uno real: el aviso de `nxSerialMgr` de arriba (punto 8). **No hay ningún indicador de "Calidad de datos" ni nada parecido en Artículo 360° hoy** — sus 11 secciones ya están escritas con el criterio de "no declarar todo correcto" (ej. la sección Utilidad avisa explícito que es aproximada porque el sistema no guarda el costo histórico exacto por venta, `parches.js:21663`; la sección Taller avisa que el vínculo es aproximado por coincidencia de nombre, `parches.js:21686`).

10. **Métricas del mockup sin fuente real — confirmado con el esquema, no supuesto:**
    - **"Reservado"/"Comprometido"** — SÍ existe una fuente real parcial: el estado `reservado` de `pos_seriales` (punto 6) — pero solo aplica a artículos serializados (IMEI). Un producto normal (sin serial) no tiene concepto de "reservado" en ningún lado del esquema. **Marcar "NO USAR" para productos sin serial; para productos con serial, si se quiere, es un conteo real: `count(estado='reservado')`.**
    - **"Calidad de datos"** — no existe ninguna fuente. **NO USAR.**
    - **Costo total (valor de inventario)** — SÍ existe, ya calculado hoy en `renderInventario()` (`valCosto`/`valPrecio`, `parches.js:23426-23427`) a nivel de TODO el catálogo, no por artículo — se puede replicar por artículo (`stock × costo`) sin query nueva, es aritmética sobre datos ya en memoria.
    - **Valor de ventas 30 días** — se puede calcular real filtrando `pos_venta_items` por fecha, PERO `nxArticulo360` hoy trae ventas con `limit=100` sin filtro de fecha (línea 21618) — para un "últimos 30 días" real habría que ajustar el filtro, es CONECTAR, no CONSTRUIR desde cero.

11. **Vínculo producto↔compras/ventas/transferencias para Historial:** ya resuelto y en uso real dentro de `nxArticulo360` — `pos_compra_items.producto_id` → `pos_compras` (por `compra_id`), `pos_venta_items.producto_id` → `pos_ventas` (por `venta_id`). **Transferencias NO están enlazadas hoy en Artículo 360°** — existe la tabla `pos_transferencia_item_seriales` (serial_id → transferencia_item_id) pero nada en `nxArticulo360` la consulta todavía; es CONECTAR (la tabla y el dato existen desde la pieza de "Transferencia IMEI atómica", ya en producción), no CONSTRUIR.

12. **Qué ya sirve bien en móvil:** `nxArticulo360` y `abrirProd` ya usan el mismo namespace visual `.nxPf` (Plus Jakarta Sans, tokens de color, responsive con `grid-template-columns:minmax(0,1fr)` a 1 columna en pantallas chicas, `card`/`emptyrow`/`oppcard` ya probados en otras pantallas del POS) — no hay que rediseñar el sistema visual, solo reorganizar contenido dentro de él. **Lo que SÍ se ve pesado en móvil hoy:** `nxArticulo360` pinta las 11 secciones una debajo de otra sin pestañas — en un artículo con mucho historial (muchas compras/ventas), la ventana queda muy larga para hacer scroll. Pasarlo a pestañas (como pide el mockup) es una mejora real, no cosmética.

### Matriz YA EXISTE / CONECTAR / CONSTRUIR / NO USAR (por pestaña del mockup)

**1. Resumen**

| Bloque | Estado | Detalle |
|---|---|---|
| Identidad (nombre, código/SKU, categoría, tipo, estado, serializado) | **YA EXISTE** | `pos_productos` en memoria (`_prods`); ya se pinta en `abrirProd` y en el encabezado de `nxArticulo360`. |
| Stock total | **YA EXISTE** | `p.stock`, en memoria. |
| Stock por almacén | **YA EXISTE** | `stockEnAlm()` sobre `_stockAlmRows`, ya en memoria desde `cargarPOS()` (ver punto 7) — gateado a `_almacenes.length>1`, ya implementado así en `nxArticulo360` línea 21638. |
| Entradas/salidas recientes | **YA EXISTE (parcial)** | La sección Kardex de `nxArticulo360` (línea 21691) trae los movimientos reales; para un resumen corto ("últimos 3") es CONECTAR (recortar lo que ya se trae). |
| Alertas de consistencia | **CONECTAR (solo la real)** | El único descuadre real detectable es stock-vs-IMEI-disponibles de `nxSerialMgr` (punto 8/9) — no inventar otras alertas. |

**2. IMEI / Seriales**

| Bloque | Estado | Detalle |
|---|---|---|
| Buscador | **YA EXISTE** | El Buscador Universal ya busca por IMEI (`univBuscarImei`, `parches.js:21753`); dentro de la pestaña se puede reusar `posBuscador()` (reglamento de buscadores) filtrando `seriales` en memoria si ya se trajeron. |
| Estado real | **YA EXISTE** | `pos_seriales.estado`, 3 valores confirmados. |
| Almacén actual | **YA EXISTE** | `pos_seriales.almacen_id`. |
| `venta_id`/documento origen | **YA EXISTE** | `venta_id` real; `compra_id` real (más preciso que lo que usa hoy Costo en `nxArticulo360`, ver punto 5). |
| Incidencia `almacen_id IS NULL` solo con multi-almacén activo | **CONSTRUIR (chico)** | No existe ese aviso hoy; es una comparación simple (`if(_almacenes.length>1 && !s.almacen_id)`), sin query nueva. |

**3. Kardex**

| Bloque | Estado | Detalle |
|---|---|---|
| Historial cronológico por producto | **YA EXISTE, TRIPLICADO** | La MISMA consulta (`pos_inv_movimientos&producto_id=eq.X`) vive en 3 lugares: `nxArticulo360` (línea 21622), `nxPfHistorialCargar` dentro de `abrirProd` (línea 20337-20341), y `nxInvVerProd` dentro de `renderInventario` (línea 23468-23470). **Esto es la duplicación real que hay que resolver, no inventar una cuarta.** |
| Tipo/cantidad/stock anterior/nuevo/referencia/usuario/fecha | **YA EXISTE** | Todas son columnas reales de `pos_inv_movimientos`, ya se pintan (`movFila()`, `parches.js:23417`, y el bloque equivalente dentro de `nxArticulo360`). |
| Filtro por rango/tipo | **NO EXISTE hoy en ninguna de las 3** | Las 3 traen `limit` fijo sin filtro de fecha/tipo. Es CONSTRUIR (chico, un `where` más sobre una query que ya existe). |

**4. Almacenes**

| Bloque | Estado | Detalle |
|---|---|---|
| Existencia por almacén | **YA EXISTE** | Igual que en Resumen. |
| Acceso a transferencias | **YA EXISTE** | `nxAlmTransferir()` (`parches.js:23578`) — se puede enlazar con un botón, sin duplicar su lógica (que ya usa la RPC atómica `pos_transferir_stock`). |
| Ubicación física (pasillo/estante) | **NO USAR** | Confirmado con el schema real de `pos_almacenes` (`id, organizacion_id, nombre, direccion, es_principal, activo, created_at`) — no existe esa columna. El mockup no debe mostrarla. |

**5. Historial**

| Bloque | Estado | Detalle |
|---|---|---|
| Compras | **YA EXISTE** | Vínculo real, ya en uso en `nxArticulo360`. |
| Ventas | **YA EXISTE** | Vínculo real, ya en uso. |
| Ajustes | **YA EXISTE** | Vienen dentro del mismo Kardex (`tipo='ajuste'`), no es una fuente aparte. |
| Transferencias | **CONECTAR** | El dato existe (`pos_transferencia_item_seriales`) pero `nxArticulo360` no lo consulta todavía — ver punto 11. |

### Estructura final propuesta de las 5 pestañas (solo con lo confirmado arriba)

1. **Resumen** — identidad + stock total/por almacén + 3-4 KPIs reales (costo total = `stock×costo`, margen%, últimos movimientos) + el aviso de descuadre de IMEI si aplica (solo artículos serializados).
2. **IMEI/Seriales** — SOLO visible si `p.serial===true` (hoy `nxArticulo360` ya muestra la sección siempre, aunque esté vacía para un producto sin serial — con pestañas, ocultar la pestaña entera si no aplica es mejor UX). Buscador + tabla con estado/almacén/origen(compra o venta)/aviso de `almacen_id IS NULL`.
3. **Kardex** — la consulta ya existente, con el filtro de rango/tipo nuevo, sirviendo a las 3 pantallas que hoy la duplican (ver "riesgos").
4. **Almacenes** — SOLO visible si `_almacenes.length>1` (mismo criterio que ya usa el resto del sistema, ej. `abrirProd` línea 20105). Tabla de stock por almacén + botón a Transferencias.
5. **Historial** — Compras + Ventas ya reales; Transferencias conectada; Ajustes ya vienen incluidos en Kardex (no duplicar como pestaña aparte, o dejar claro que "Historial" en este mockup significa "todo excepto Kardex line-item" si se quiere separar).

### Datos del mockup a eliminar o renombrar

- **Eliminar**: "Calidad de datos" (sin fuente), "Ubicación física / pasillo / estante" (columna no existe), cualquier métrica de "Reservado/Comprometido" para productos SIN serial (el concepto no existe para ellos).
- **Renombrar con cuidado**: si el mockup usa "Inventario" para el catálogo de artículos, aclarar que en el código ESE tab se llama internamente `productos` (la pantalla de key `inventario` es Kardex) — no renombrar el código, solo tener claro el mapeo al escribir el plan de implementación.
- **Marcar como aproximado, no ocultar**: "Reservado" para artículos CON serial (sí tiene fuente real, pero acotada a IMEI); "Valor de ventas 30 días" (hay que agregar el filtro de fecha que hoy no existe); "Taller" en la pestaña Historial (ya viene con su propio aviso de aproximación, mantenerlo).

### Riesgos técnicos/UX antes de implementar

1. **Triplicación real de la consulta de Kardex-por-producto** (punto 3 de la matriz) — si se construye una pestaña Kardex nueva sin unificar las 3 existentes, quedarían 4 lugares haciendo lo mismo. Recomendación: la nueva pestaña de Artículo 360° debería ser la ÚNICA fuente, y `abrirProd`/`renderInventario` deberían enlazar a ella en vez de duplicar su propio bloque — pero esto es una decisión de refactor que toca 3 funciones existentes, hay que confirmarla contigo/el dueño antes de tocar código real.
2. **Solapamiento entre `abrirProd` (editar) y `nxArticulo360` (ver)** — hoy son 2 ventanas separadas con contenido parecido (ambas muestran stock, precio, niveles). Si el nuevo Artículo 360° absorbe TODO lo de `nxArticulo360` más lo nuevo del mockup, hay que decidir si `abrirProd` se queda solo como "modo edición" puro (sacándole el Kardex/sucursales que hoy tiene inline) o si las dos ventanas coexisten con contenido distinto a propósito. No lo decidí por mi cuenta — es justo el tipo de llamada que se te pide confirmar antes de programar.
3. **`nxSerialCuadrar` es una acción que mueve el kardex** (un `ajuste` real) — si se pone visible "a mano" en la pestaña IMEI sin el mismo gateo que tiene hoy (solo aparece si hay descuadre), un usuario podría dispararla sin necesidad. Mantener el gateo actual.
4. **Permisos:** el tab `productos` (donde vive el botón que abre Artículo 360° hoy) está gateado por `puedeVer('productos')` — por defecto solo `admin`/`gerente` lo ven (`cajero`/`vendedor` no, según `ROLES_DEF`, `parches.js:16233-16238`), pero es configurable por organización vía `pos_acceso`. Dentro de Artículo 360°, el costo/margen (secciones "Costo"/"Utilidad") se muestran SIN el gateo adicional `puedeVerMin()` que sí protege el precio mínimo en `abrirProd` (`parches.js:20031`) — si una org le da acceso a `productos` a un rol tipo cajero vía `pos_acceso`, ese cajero vería costo y margen real sin querer. Vale la pena decidir si Artículo 360° debe ocultar Costo/Utilidad cuando `!puedeVerMin()`, aunque el usuario tenga acceso al tab.
5. **`pos_seriales.email` es basura** — no reflejarla en ningún diseño ni preguntarse "para qué es", confirmado que nadie la escribe.
6. **Dataset real hoy es chiquito** — solo 2 filas en `pos_seriales` en producción (1 vendido, 1 disponible, ninguno con almacén asignado) — cualquier prueba visual del rediseño debería armar datos de ejemplo más ricos (varios almacenes, varios estados, historial largo) para no aprobar un diseño que "se ve bien" solo porque no hay datos que lo estresen.

### Recomendación: dónde se abre Artículo 360°

**Desde ambos apuntando a UNA sola vista — ya es así hoy, mantenerlo.** El botón 🪪 ya vive en `renderProductos()` (el tab "Inventario" del catálogo) y también se llega por el Buscador Universal desde cualquier pantalla. No hace falta agregarlo también dentro de `renderInventario()` (Kardex) como entrada nueva — mejor que ese tab, al mostrar un producto en la lista de "Bajo stock" o el detalle, tenga un enlace que abra la MISMA `nxArticulo360`, no una ruta paralela. Esto evita el riesgo de "dos rutas duplicadas" que ya señalaste como preocupación en el pedido original.

---

No se tocó ningún archivo de código en esta vuelta (`index.html`/`parches.js` intactos), no se aplicó nada en Supabase, no se hizo commit de código, no se subió versión. Solo este documento de auditoría. Sigo a la espera de tu confirmación de la estructura final antes de escribir una sola línea de implementación.