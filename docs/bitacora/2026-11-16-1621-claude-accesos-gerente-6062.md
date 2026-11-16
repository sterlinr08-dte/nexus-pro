# Accesos rápidos que sí se guardan, favoritos primero y «Limpiar» de la prefactura (build 6062) — Claude

## Prueba de Muse a la 6061 (16-nov 15:41–15:59)
Funcionó: prefactura estilo Bayol, WhatsApp primero (cliente existente y cliente nuevo), foto en el Resumen y los 3 arreglos de la 6060.

| Punto | Causa verificada | Arreglo |
|---|---|---|
| 4. Los accesos «se guardaban» pero volvían a los automáticos al guardar un artículo | En la base `pos_config.accesos_rapidos` de la demo seguía `null`. La política `pos_config_admin` solo deja escribir al **admin**; el usuario de la demo es **gerente**. El PATCH no cambiaba ninguna fila y la pantalla decía «Accesos guardados». Guardar un artículo recarga `pos_config` desde la base. | RPC `pos_accesos_rapidos_guardar(p_ids)`: admin o gerente de la misma empresa, solo esa columna, máx. 8, artículos de la empresa. La pantalla usa lo que el servidor confirma. Si falla: «No se guardaron los accesos» y no cambia nada. |
| 4b. Los automáticos no coinciden con los favoritos (★) de Vender | Los automáticos solo usaban servicios y lo más prefacturado | Ahora van primero los favoritos, luego servicios y lo más prefacturado |
| «Limpiar» de la prefactura pareció no vaciar a la primera | Desde la 6060, `nxPosVaciar` pregunta en ventana propia; el botón llamaba `nxFacRepaint()` antes de confirmar y al confirmar solo se repintaba Vender | Al confirmar también repinta la factura/prefactura |
| 2. Teléfono nuevo guardado «8095550199» (los demás «809-555-01xx») | Se guardaba tal como se escribió | Con 10 cifras se guarda como 809-555-0199 |
| 1. No hay selector de Almacén | La demo tiene 1 almacén; el selector sale con 2 o más | Sin cambio (correcto) |
| 3. «Precio» no cambia nada en la demo | Los niveles de la demo valen lo mismo | Sin cambio (son los datos) |

## Base de datos
- `20261116120000_pos_accesos_rapidos_guardar.sql`: aplicada. Ensayo con vuelta atrás: como gerente de la demo guarda y se lee; un artículo de otra empresa → `ARTICULO_NO_EXISTE`.

## Pruebas
- `qa-pos-prefactura-bayol` 92/92 a 390, 1024 y 1440 px. Casos nuevos:
  - se guarda por la RPC (no PATCH);
  - si el servidor falla, avisa y no cambia nada;
  - automáticos con favoritos primero;
  - «Limpiar» vacía a la primera.
- Relacionadas en verde: prefactura 18, vender-toque 24, devolucion-muse 30, reportes-rango 28, cobro-caja 22, fidelidad 62, buscador-unico 14, empresas 76.

## Estado
Rama `claude/pos-accesos-gerente`, sin publicar. Espera «Publícalo».
