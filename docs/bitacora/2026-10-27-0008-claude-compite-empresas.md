# POS: «Clientes con RNC», la oferta de crédito fiscal (competir legal, agente 3 de 5)

**Pedido del dueño**
- Herramientas legales para competir contra quien vende sin factura.
- Ventaja del negocio formal: la empresa con RNC que compra con factura de crédito fiscal (B01 o E31) puede usar el 18 % de ITBIS pagado como crédito fiscal.
- Esta entrega: lista de clientes con RNC, marca de oportunidad, borrador de WhatsApp sin envío y CSV.

## Qué hace (`parches-pos-empresas.js`, capa nueva)
- **Entrada única:** botón «Clientes con RNC» en POS → Clientes, en la barra del buscador. Lo pone un `MutationObserver` sobre `#v-pos`, así que `parches-pos.js` **no se tocó**.
- **Ventana:**
  - en la PC es una ventana de vidrio; en el celular ocupa la pantalla;
  - tiene 3 cifras arriba: con RNC o cédula, oportunidades y comprado en 90 días;
  - tiene buscador (nombre, RNC o teléfono) y los filtros Todos, Oportunidad y Ya con crédito fiscal.
- **Lista:** muestra los `pos_clientes` activos con `cedula` de 9 u 11 dígitos, sin contar los guiones. Para cada cliente da:
  - lo comprado en 90 días;
  - la última compra;
  - el comprobante: «Crédito fiscal», «Crédito fiscal a veces», «Solo consumo» o «Sin compras»;
  - el teléfono, con ícono si sirve para WhatsApp.
- **Crédito fiscal:** una venta cuenta como crédito fiscal si su `ncf` empieza por B01 o E31, o si su `tipo_comprobante` es `credito_fiscal`, `ecf31`, `B01` o `E31`. Las ventas `anulada` no cuentan.
- **Oportunidad:** se marca a dos tipos de cliente:
  - el que tiene al menos una compra sin crédito fiscal en el último año;
  - el que lleva 60 días o más sin comprar, o nunca ha comprado.
  Las oportunidades salen primero.
- **«Preparar mensaje»:**
  - abre un borrador que se puede editar, con trato de usted y sin exclamaciones;
  - el texto cambia según el caso: compra sin crédito fiscal (dice el ITBIS aproximado de 90 días), lleva 60 días sin comprar o ya compra con crédito fiscal;
  - **Copiar** copia el texto;
  - **Abrir WhatsApp** abre `https://wa.me/<número>?text=…` en otra pestaña, y una persona lo envía;
  - sin teléfono válido, ese botón queda apagado.
  - **Nunca se envía nada solo ni se llama a ninguna Edge Function.**
- **CSV:** «Exportar CSV» descarga `clientes-con-rnc-AAAA-MM-DD.csv` con lo filtrado. Va con BOM para Excel y protege contra fórmulas (`=`, `+`, `-`, `@`).
- **Lecturas:** lee `pos_clientes` (`activo=eq.true`) y `pos_ventas` del último año (columnas mínimas, de 1000 en 1000). **No escribe en la base.** No hay migración.
- **Apagar:** `localStorage.nx_pos_empresas_off='1'`.

## Decisión a confirmar con el dueño: wa.me frente al Buzón
- `parches-whatsapp-enrutamiento-nexus.js` desvía **todo** `wa.me` de la app al Buzón corporativo (`window.open` y enlaces).
- Ese desvío está pensado para Seguros. A un cliente de tienda sin hilo, el Buzón solo le muestra un aviso. Además, Meta no deja mandar texto libre si el cliente no escribió primero.
- Por eso «Abrir WhatsApp» abre primero una pestaña en blanco y luego le pone la dirección `wa.me`. Así el desvío no la toca.
- Es la única excepción y solo vale para este botón. Si el dueño prefiere el Buzón, se cambia en una línea.

## Archivos
- `parches-pos-empresas.js` (nuevo).
- `index.html`: una línea `cargarConReintento('parches-pos-empresas.js')` después de `parches-pos-stitch-visual.js`.
- `scripts/qa-pos-empresas.mjs` (nuevo).
- No cambian `APP_VERSION`, `parches-pos.js` ni Supabase.

## Pruebas (servidor propio en el puerto 8963 para no chocar con los otros agentes; una prueba a la vez)
- `qa-pos-empresas.mjs`: **76/76** a 390 y 1280 px, más la prueba del apagado. Revisa:
  - RNC válidos (excluye cédula vacía y «12345»);
  - total de 90 días (17,700, sin contar la venta anulada);
  - oportunidades por consumo, por 60 días y por cliente sin compras; filtro y búsqueda por RNC;
  - borrador con usted, sin «!» ni «¡», con el texto editado en el enlace y wa.me en otra pestaña;
  - que no abre el Buzón y que no hay ningún pedido a `/functions/` ni escritura en la base; solo lee `pos_clientes` y `pos_ventas`;
  - el CSV (contenido y descarga);
  - toques de 44 px o más, buscador de 48 px con letra de 16, `tabular-nums` y sin desplazamiento horizontal;
  - modo oscuro (`body.tema-premium`) y 0 errores de JS.
- `qa-pos-cubre6.mjs`: 14/14.
- `qa-ecf-caja.mjs`: 59/59.
- Capturas a 390 px: lista, borrador y oscuro.

## Rama
- `claude/compite-3-empresas`, hecha desde `claude/pos-descuento-itbis`. Sin PR y sin publicar.

## Pendiente o siguiente paso
- Que el dueño vea la ventana y confirme lo de wa.me frente al Buzón.
- Si se quiere guardar a quién se le escribió y cuándo, haría falta una tabla. Sería otra propuesta, y antes se pide permiso.
