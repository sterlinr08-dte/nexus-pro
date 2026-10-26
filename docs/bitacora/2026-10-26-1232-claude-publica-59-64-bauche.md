# Publicación 59.64: texto de la tarjeta del bauche

**Autorización del dueño:** «Aplícalo», después de ver la captura y la explicación.

## Qué se publicó
- Lo descrito en la bitácora anterior de esta rama (`claude-bauche-texto-mes`):
  - el título dice «Comprobante listo»;
  - mientras revisa, dice «Leyendo el comprobante…»;
  - la última línea dice qué cuota paga.
- **Comprobación:** el orden que usa la pantalla (de la más vieja a la más nueva) es el mismo de las funciones del servidor `seguros_meses_cubiertos_por_abono`, `seguros_anular_factura` y `seguros_corregir_precio_factura` (`order by periodo asc`).
- **Regla para el agente, sin cambios:** el cobro cuenta en el ciclo 20→20 de la fecha real del pago.
- `APP_VERSION`: 59.63 → 59.64.

## Pruebas
- `qa-bauche-unico.mjs`: 84/84.
