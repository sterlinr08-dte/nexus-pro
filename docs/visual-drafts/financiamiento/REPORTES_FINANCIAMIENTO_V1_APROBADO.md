# Reportes de Financiamiento — V1 (aprobado)

Mockup: `reportes_financiamiento_mockup.png` (escritorio + móvil).

Pantalla **Reportes** dentro del módulo de Financiamiento (Préstamos, Multiempresa,
`window.nxAbrirPrestamos`). Reemplaza el "Reportes" anterior (que solo abría la cartera
vencida imprimible) por un dashboard de análisis de la cartera, **100% con datos reales**
de `prestamos` / `prestamo_pagos` / `prestamos_config`.

## Piezas construidas (reales)
- **6 KPIs:** Capital colocado, Capital recuperado, Balance pendiente, Intereses cobrados,
  Mora pendiente (recargo real, configurable; RD$0 si está apagada), Índice de mora
  (cartera vencida / cartera total). Deltas "vs mes anterior" reales en colocado/recuperado.
- **Colocaciones vs Cobros (12 meses):** barras SVG. Colocaciones por `fecha_prestamo`,
  cobros por `prestamo_pagos.fecha`.
- **Estado de la cartera:** donut + leyenda por antigüedad (Al día / 1-30 / 31-60 / 61-90 /
  +90 días) con conteo y %; índice de mora + préstamos en mora.
- **Antigüedad de cartera:** tabla (rango / préstamos / capital pendiente / % del total).
- **Cobros por método de pago:** donut + leyenda (real, de `prestamo_pagos.metodo`).
- **Alertas importantes:** solo reales (préstamos +30 días de atraso, vencidos, próximos 7 días).
- **Acciones rápidas:** reusan funciones existentes (Reporte de cartera, Cobranza, Exportar
  Excel, Préstamos cerrados, Configuración).
- **Período de flujo:** Este mes / Este año / Todo (alcanza solo las métricas de flujo;
  la cartera/mora siempre es al día de hoy).

## Omitido a propósito (no existe en este módulo — no se finge)
- **Agentes** (pestaña + "Rendimiento por agente" + filtro): `prestamos` no tiene columna de
  agente/vendedor (es una herramienta de un solo dueño).
- **Sucursales** (pestaña + filtro) y filtro por **Producto**: no existen (sin `organizacion_id`,
  sin catálogo de productos).
- **Alertas** de "documentos por vencer", "promesas de pago incumplidas", "garantías pendientes":
  no hay esas tablas/flujos.
- **Enviar por correo** y el conmutador de **empresa actual**: no aplican a este módulo.

## Notas
- Color morado del módulo (`.nxFP`), Plus Jakarta Sans (regla "cada app su color").
- Sin tabla ni columna nueva; sin cambio de RLS.
