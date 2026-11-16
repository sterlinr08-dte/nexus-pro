# Prefactura estilo Bayol Cell, accesos rápidos editables y foto en el Resumen (build 6061) — Claude

## Pedidos del dueño (16-nov-2026)
1. «La ventana de prefactura yo quiero que replique la de Bayol Cell taller». Se le mostraron las dos pantallas lado a lado (390 y 1440 px, mismos datos inventados) y eligió las 4 partes.
2. «Habilita una opción donde uno pueda agregar los botones de acceso directo y cambiarlo».
3. «En la creación de artículo, en Resumen, la opción para subir fotos».
4. Un reel de colores (Code & Chill, «Identity verification dashboard»): Instagram pidió sesión. Pendiente: que el dueño mande una captura.

## Fuente revisada
`bayolcell-taller`: `taller-prefactura.js` + `bc-prefactura-pro.js/.css` + `bc-prefactura-compacta.js/.css` (bitácora Bayol 2026-11-09). Capturas con su banco de pruebas local (`scripts/pruebas/prefactura-compacta.cjs`).

## Qué se hizo (capa nueva, solo Prefactura)
- `renderPrefB()` cuando `pfbOn()`. Usa los mismos IDs y funciones de siempre: `#facTabla`, `#facResumen`, `#facSearchSlot`, `nxPrefGuardar` y `nxDocAccion('pref', …)`. La Factura no cambia.
  1. **Resumen a la derecha** (≥ 1280 px): total, «Guardar e imprimir», «Guardar» y Cancelar · Imprimir · WhatsApp. En pantallas menores sigue la barra de abajo.
  2. **Cliente · Precio · Almacén · Vendedor** en una fila; en el celular, una píldora que se abre. El precio puede ser «Del cliente», «De lista» o un nivel (`_prefNivel` en `filaNivel`/`precioCli`, solo en Prefactura). El vendedor se propone solo (`_posVendAuto`).
  3. **WhatsApp primero**: con 10 cifras busca el cliente por teléfono y lo elige. Si no existe, se escriben nombre y cédula y **se registra al guardar** (`pfbAsegurarCliente`, sin duplicar por teléfono).
  4. **Artículos en 2 filas** en el celular (≤ 140 px). **Nombres en minúscula normal** solo en pantalla (`nombreLindo`, copia de `bcPfcBonito`); lo guardado conserva el nombre original. **Encabezado limpio** con «Nueva» (ventana propia, sin `confirm()`).
  5. **Accesos rápidos** debajo del buscador.
- **Accesos editables**: «Cambiar accesos» (solo admin/gerente) → `nxRapEditar`: agregar con el buscador de Factura, ordenar ↑ ↓, quitar ✕, hasta 8; «Volver a los automáticos». Se guardan para la tienda en `pos_config.accesos_rapidos`.
- **Foto en el Resumen** de la ficha de artículo (`pfResImgHTML`): «Subir foto» / «Cambiar foto» / «Quitar». Usa el mismo `#ppImgFile` y `#ppImg` (dataURL JPEG 640 px) y se guarda con «Guardar artículo». Hoy es una foto por artículo.
- `nxFacCancelar` pregunta en ventana propia (`confirmarAccion`), no con `confirm()`.
- Gráfica de Reportes: «Ventas por día (1 día)» en vez de «(últimos 1)», que vio Muse.
- Incluye lo de la 6060 (bitácora `…-claude-detalles-muse-6060.md`).

## Base de datos (aplicadas; solo agregan columnas)
- `20261116100000_pos_prefacturas_vendedor.sql`: `pos_prefacturas.vendedor_id`, `vendedor_nombre`. Al facturar la prefactura, el cobro propone ese vendedor (`_facVendPre`).
- `20261116110000_pos_config_accesos_rapidos.sql`: `pos_config.accesos_rapidos jsonb`.

## Apagar
`window.NX_PFB=false` o `localStorage.nx_pfb_off='1'` → vuelve la prefactura anterior.

## Pruebas
- Nueva `qa-pos-prefactura-bayol` 83/83 a 390, 1024 y 1440 px:
  - píldora y vendedor automático;
  - nombres en minúscula y lo guardado sin cambiar;
  - 2 filas por artículo;
  - niveles Mayorista 1,200 / De lista 1,500;
  - accesos y «Agregado»;
  - WhatsApp de cliente existente y cliente nuevo registrado al guardar;
  - vendedor guardado;
  - Resumen a la derecha sin barra en 1440, y debajo con barra en 390/1024;
  - toques ≥ 44 px;
  - «Nueva» con ventana propia;
  - Factura igual e interruptor de apagado;
  - editor de accesos (agregar, ordenar, guardar en `pos_config`, automáticos);
  - foto en el Resumen (subir, cambiar, quitar);
  - 0 errores.
- Todas las pruebas POS en verde (27 archivos). `margen` mantiene sus 4 fallos de tema oscuro, que ya fallaban en main.

## Estado
Rama `claude/pos-prefactura-bayol`, sin publicar. Espera «Publícalo».
