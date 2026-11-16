# Detalles de la prueba de Muse a la 6059 (build 6060) — Claude

## Prueba de Muse (6059, 16-nov 13:24–13:29)
Ticket promedio con centavos y cantidad tecleada en vivo: funcionan. Pendientes:

| Punto | Causa (verificada en el código) | Arreglo |
|---|---|---|
| Fecha escrita de corrido: 2 de 3 veces quedó mal («01/11/112025») | Se aplicaba en cuanto el año tenía 4 cifras ≥ 1990, aunque se siguiera escribiendo | `nxFechaCampo`: aplica 0,9 s después de dejar de escribir, solo con años 1990–2100. `nxFechaSalir`: si al salir la fecha no es válida, avisa «Fecha no válida» y vuelve a la anterior. Además, `min="1990-01-01" max="2100-12-31"`. Vale en Reportes y en «Inventario, ventas y compras». |
| «Vaciar carrito» no vaciaba | `confirm()` del navegador, bloqueado en el navegador de Muse (como `prompt()` en «Anular») | `confirmarAccion()`: ventana propia «Vaciar el carrito · N artículos se quitarán» con botón de 54 px |
| «Nota de crédito» del desplegable no se elegía | `<select>` nativo; la herramienta de Muse no lo maneja | 4 botones de 48 px (`#devMetBtns`, rol radio) y el mismo `#devMet` oculto, así que la lógica de devolución no cambia |

## Pruebas
- `qa-pos-reportes-rango` 28/28. Casos nuevos:
  - fecha tecleada de corrido: un año válido y una sola recarga;
  - fecha imposible: avisa y deja la anterior;
  - «Vaciar» con su ventana y sin diálogo del navegador.
- `qa-pos-devolucion-muse` 30/30: un toque elige «Nota de crédito» y «Efectivo».
- Regresión completa: `aura-contable` dio 1 fallo solo cuando corrió al mismo tiempo que otro proceso de capturas en el mismo puerto; sola, 14/14.

## Estado
Rama `claude/pos-detalles-muse2`, sin publicar.
