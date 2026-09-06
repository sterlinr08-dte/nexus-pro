# CRM Seguros de Salud — validación visual 2026-09-05

Rama: `chatgpt/visual-draft`
PR: #291

## Pruebas ejecutadas

Se ejecutó la misma composición que queda en la rama (`parches-crm-seguros.js` + `parches-crm-seguros-v2.css`) en Chromium con un harness aislado del módulo Seguros, usando los tamaños 320×700, 390×844 y 1440×1000.

Resultados:
- Sin errores de JavaScript durante render de lista o ficha.
- Sin desborde horizontal del documento en 320, 390 ni 1440 px.
- La barra de pestañas de la ficha usa scroll horizontal propio en móvil, sin ensanchar la página.
- La ficha CRM limita sus pestañas visibles a Resumen, Póliza, Dependientes, Cobros, Documentos y Actividad.
- En 390 px, los datos de seguro se compactaron a dos columnas: la tarjeta principal bajó de ~554 px a ~329 px de alto.
- En 320 px, se conserva una sola columna para priorizar legibilidad.
- El encabezado móvil mantiene las 3 métricas rápidas en una fila; no se produce el patrón 2+1.
- `Seguros` se presenta como `Póliza` y `Pagos` como `Cobros` dentro del contexto CRM; las demás pestañas conservan la nomenclatura del Cliente 360 existente.

## Alcance de la prueba

Esto es una prueba visual/DOM aislada y reproducible. No sustituye la prueba manual final dentro de la aplicación completa en un iPhone físico, especialmente para teclado, safe areas, gestos y rendimiento de Safari.

## Producción

No se modificaron `APP_VERSION` ni `version.json` y no se fusionó a `main`.
