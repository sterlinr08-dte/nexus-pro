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