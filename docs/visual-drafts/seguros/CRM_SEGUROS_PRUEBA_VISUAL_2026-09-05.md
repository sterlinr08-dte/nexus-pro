# CRM Seguros de Salud — validación visual 2026-09-05

Rama: `chatgpt/visual-draft`
PR: #291

## Pruebas ejecutadas

Se ejecutó el parche `parches-crm-seguros.js` en Chromium con un harness aislado del módulo Seguros, usando los tamaños 320×700, 390×844 y 1440×1000.

Resultados:
- Sin errores de JavaScript durante render de lista o ficha.
- Sin desborde horizontal del documento en 320, 390 ni 1440 px.
- La barra de pestañas de la ficha usa scroll horizontal propio en móvil, sin ensanchar la página.
- La ficha CRM limita sus pestañas visibles a Resumen, Póliza, Dependientes, Cobros, Documentos y Actividad.
- En 390 px, los datos de seguro se compactaron a dos columnas: la tarjeta principal bajó de ~554 px a ~329 px de alto.
- En 320 px, se conserva una sola columna para priorizar legibilidad.
- El encabezado móvil mantiene las 3 métricas rápidas en una fila; no se produce el patrón 2+1.
- Las etiquetas de pestañas se normalizaron con mayúscula inicial.
- Auditoría final del loader: carga secuencial `parches-seguros-base.js` → `parches-crm-seguros.js` → `parches-crm-seguros-v2.css`.
- El diff no incorpora cambios en POS, Caja, Facturación ni Financiamiento.
- GitHub no reporta checks automáticos asociados al commit de revisión; la validación de esta rama es manual/estática.

## Alcance de la prueba

Esto es una prueba visual/DOM aislada y reproducible. No sustituye la prueba manual final dentro de la aplicación completa en un iPhone físico, especialmente para teclado, safe areas, gestos y rendimiento de Safari.

## Producción

No se modificaron `APP_VERSION` ni `version.json` y no se fusionó a `main`. El bump de versión se reserva para el despliegue real, para no anunciar una actualización que todavía no está publicada.
