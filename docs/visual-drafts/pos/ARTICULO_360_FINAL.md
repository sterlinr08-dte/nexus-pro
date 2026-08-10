# Artículo 360° — mockup final (compartido por el dueño directo en chat, 2026-08-10)

**Nota de origen:** este mockup lo mandó el dueño como IMAGEN adjunta en el chat (no llegó como
archivo al repo, ni a `main` ni a `chatgpt/visual-draft` — se revisaron las 200+ ramas y no está en
ninguna). Como este entorno no tiene herramienta para extraer bytes de imagen de un mensaje y
escribirlos a disco, se transcribe aquí en texto fiel a lo que se ve, para que quede en el repo y
sirva de referencia — **no es el PNG original**. Si se quiere el archivo binario en el repo, hay
que subirlo con git desde fuera de esta sesión.

Dos vistas en la imagen: escritorio (dashboard completo) y celular (mismo contenido, una columna).

## Escritorio

**Cabecera:** breadcrumb "Inventario > Artículo 360°" · buscador global "Buscar artículos, IMEI,
código o descripción..." con atajo ⌘K · campana de notificaciones (badge 3) · ícono de ayuda.

**Barra lateral** (genérica, no es la real del POS — ver desajuste #3 abajo): Dashboard, Ventas,
Caja, Clientes, Inventario (expandido) → Artículos, **Artículo 360°** (activo), Entradas,
Transferencias, Ajustes, luego Compras, Kardex, Reportes, Configuración. Pie: selector "Sucursal
Principal / Almacén: Todos" + usuario "AD Admin admin@nexus.com".

**Encabezado del artículo:** botón "← Volver a lista" · imagen del producto · **iPhone 15 Pro
256GB** + badge verde "Activo" · SKU `IP15P-256GB` · Código de barras `7894901234567` · Categoría
Celulares · Marca Apple · Tipo Producto · Unidad UND · Garantía 12 meses · IVA 18%.

**Tarjeta de la derecha:** "Stock total disponible" **25 unidades** (número grande verde) +
Reservado 2 / Comprometido 1 / Disponible neto 22.

**Botones de acción arriba:** 🖨 Imprimir · ⇗ Compartir · "Acciones ▾" (azul).

**Pestañas:** Resumen (activa) | IMEI / Seriales | Kardex | Almacenes | Historial.

### Contenido de la pestaña Resumen

- **"Stock por almacén"** (tabla): Almacén | Disponible | Reservado | Comprometido | Total —
  Almacén Principal 18/1/1/20, Almacén Secundario 6/1/0/7, Total 24/2/1/27.
- **3 tarjetas KPI en fila:**
  - "Entradas (30 días)" ↑ 52 unidades · S/ 65,230.00 costo total
  - "Salidas (30 días)" ↓ 31 unidades · S/ 48,750.00 valor total ventas
  - "Movimientos (30 días)": Entradas 52, Salidas 31, Transferencias 8, Ajustes 0
- **"Kardex últimos 30 días"** — gráfica de líneas/barras (Entradas verde, Salidas rojo, Stock
  línea azul), eje X con fechas 20 Abr → 18 May, eje Y 0-80.
- **"Últimos movimientos"** (tabla): Fecha | Tipo | Documento | Almacén | Entrada | Salida | Saldo
  — 5 filas de ejemplo (ventas V-001234/V-001233/V-001232, compras C-000567/C-000566). Link "Ver
  kardex completo →".
- **"IMEI / Seriales (25 unidades)"**: buscador "Buscar IMEI / Serial..." + filtro "Todos los
  almacenes". Tabla: IMEI/Serie | Estado | Almacén | Documento origen | Fecha entrada | Precio
  compra — 5 filas de ejemplo (Disponible/Vendido/Reservado con sus colores verde/gris/naranja).
  Link "Ver todos los IMEI (25) →".
- **"Alertas"**: ⚠ Stock bajo (22 unid. ≤ 30 mínimo) · ℹ IMEI sin precio (2 sin precio de compra) ·
  ✓ Consistencia OK (stock total coincide con almacenes e IMEI).

## Celular

Mismo contenido, una sola columna, con las 5 pestañas como chips horizontales y barra inferior de
navegación (Inicio/Ventas/Inventario activo/Clientes/Más).

---

## Desajustes reales contra lo YA APROBADO (`ARTICULO_360.md` + `ARTICULO_360_IMPLEMENTACION.md`)

No se implementa nada de esto todavía — se deja anotado para no confundir "el mockup lo trae" con
"ya está aprobado tal cual", porque 3 piezas contradicen decisiones que el propio dueño ya tomó:

1. **"Comprometido"** aparece 2 veces (tarjeta de arriba y columna de la tabla "Stock por almacén").
   La especificación aprobada dice literal: *"NO USAR / ELIMINAR del mockup conceptual: ...
   'Comprometido' para productos normales."* Confirmado también en el esquema real: `pos_seriales`
   solo tiene el estado `reservado` (con `reserva_hasta`) — no existe ningún tercer estado
   "comprometido" distinto de reservado. Este mockup lo reintroduce; no se debe implementar sin que
   el dueño lo reconfirme explícitamente.
2. **Moneda "S/" (soles)** en vez de "RD$" — el sistema es 100% República Dominicana (`es-DO`), nunca
   usa soles. Es un descuido genérico del mockup (probablemente una plantilla base sin localizar) —
   si se implementa, todo monto va en `RD$` con el formato `es-DO` de siempre (`fmt()`).
3. **La barra lateral es genérica**, no la real del POS. El sidebar de producción
   (`shellTienda()`) está agrupado por secciones (Principal / Inventario / Personas y CRM / Finanzas
   / Sistema), sin un ítem "Kardex" ni "Caja" sueltos de primer nivel como muestra el mockup. La
   propia especificación aprobada ya dice *"No reescribir shell, navegación ni arquitectura"* — esta
   parte de la imagen es solo ambientación, se descarta por completo.

Otras 2 notas menores, sin ser "NO USAR" pero sí a verificar antes de construir:

4. **"Precio compra" por IMEI individual** — `pos_seriales` no tiene columna de costo propia; el
   costo vive en `pos_compra_items.costo` (costo de la LÍNEA de compra, vía `compra_id`). Si una
   compra trae varias unidades a precios distintos dentro de la misma línea, mostrar "precio de
   compra" por IMEI sería un promedio o un dato aproximado, no exacto por unidad — hay que decidir
   cómo presentarlo honesto (mismo criterio de "aproximado" que ya usa el resto de esta vista).
5. **Números de documento** (`V-001234`, `C-000567`, `RES-00045`) son de ejemplo — al implementar se
   usan los números reales de `pos_ventas`/`pos_compras` tal cual salen de la base, no un formato
   inventado.

Todo lo demás (5 pestañas, stock por almacén, entradas/salidas 30 días, últimos movimientos, IMEI
con estado/almacén, alertas de stock bajo/consistencia) calza con la especificación ya aprobada y
con el plan de parche quirúrgico entregado — es una referencia visual válida para esa parte.
