# NEXUS PRO — Multiempresa / Financiamiento / Cobranza V2

## Estado

- Prototipo visual aprobado por el dueño.
- Rama de trabajo: `chatgpt/visual-draft`.
- No publicar directamente en `main`.
- No usar GitHub Actions para aplicar el cambio visual.
- Archivo de referencia: `COBRANZA_V2_PROTOTIPO.html`.

## Implementación real existente

El módulo vive actualmente dentro de `parches.js` y utiliza:

- `renderLista(view)` para pintar el shell de Financiamiento.
- `_prFiltro === 'vencidos'` para representar la opción Cobranza.
- `prListaFiltrada()` y `prTablaHTML()` para la lista general.
- `prEstadoTabla(p)`, `prDiasVencido(p)`, `prProximoPago(p)`, `saldoDe(p)` y `pagadoDe(p)` para datos derivados.
- `window.nxPrestamoVer`, `window.nxPrestamoEstadoCuenta` y `window.nxPrestamoWA` como acciones reales.

## Cambio requerido

Cuando el usuario pulse **Cobranza**, no mostrar únicamente la tabla general filtrada. Dentro de `renderLista(view)` debe renderizarse una vista dedicada, sin detectores DOM ni parches posteriores.

### Funciones nuevas permitidas dentro del mismo bloque real

- `prPrioridadCobranza(p)`
- `prCobranzaListaFiltrada()`
- `prCobranzaTablaHTML()`
- `prCobranzaMainHTML()`

Estas funciones deben consumir exclusivamente `_prestamos` y `_pagosByPrestamo`.

## Clasificación derivada

No crear estados nuevos en la base de datos. La prioridad es solo visual y calculada:

- **Crítico:** préstamo vencido con más de 30 días.
- **Alta prioridad:** vencido entre 8 y 30 días.
- **Por vencer:** próximo pago entre hoy y 7 días.
- **Al día:** activo, no vencido y fuera del rango anterior.
- **Pagado:** no entra en Cobranza.

Orden recomendado:

1. Crítico.
2. Alta prioridad.
3. Por vencer.
4. Al día.
5. Dentro de cada grupo, mayor saldo pendiente primero.

## KPI permitidos con datos reales

- Cobrar hoy: suma de saldos críticos.
- Cobrar esta semana: suma de saldos vencidos entre 8 y 30 días.
- Próximos vencimientos: suma de saldos con próximo pago entre 0 y 7 días.
- Pagos registrados hoy: suma de `prestamo_pagos.monto` cuya fecha sea hoy.
- Total por cobrar: suma de `saldoDe(p)` de préstamos no pagados.

## Acciones permitidas

- Ver detalle.
- Editar.
- Estado de cuenta / imprimir.
- WhatsApp cuando exista teléfono.

No añadir todavía:

- Llamadas registradas.
- Promesas de pago.
- Agenda de contactos.
- Score persistido.
- Agentes de cobranza.
- Sucursales.

Esas funciones no tienen soporte real confirmado en las tablas actuales.

## Reglas visuales

- Mantener el namespace real `.nxFP` para no duplicar estilos.
- Tipografía Plus Jakarta Sans.
- Azul principal `#2563eb`.
- Botones compactos y de tamaño normal.
- Buscador con icono y barra unidos.
- Desktop: tabla principal y resumen lateral.
- Móvil: tarjetas/lista apilada, sin scroll horizontal.
- Mantener sidebar de Financiamiento y navegación hacia Multiempresa.
- No alterar motores de cálculo, pagos, RLS ni tablas.

## Criterios de aceptación

1. Pulsar Cobranza abre una vista diferenciada dentro del shell existente.
2. Los KPI se calculan con datos reales.
3. La prioridad se deriva sin escribir nuevos estados en Supabase.
4. Las acciones existentes continúan funcionando.
5. Desktop y móvil respetan el diseño aprobado.
6. No hay mutaciones directas en `main`.
7. No se añaden observadores DOM, `setInterval` ni detectores de pantalla para repintar la vista.
