# Cliente 360 · Integración visual

Esta rama contiene un prototipo visual aislado del Expediente Cliente 360.

## Estado
- Datos simulados.
- Sin escrituras en Supabase.
- `cliente-360.js` expone `nx360Abrir()` y `nx360Cerrar()`.
- `cliente-360-preview.html` carga el `index.html` real en un preview de la misma rama e inyecta Cliente 360 para validación UX.

## Regla arquitectónica
Cliente 360 es un agregador. No replica saldos, inventario, pólizas o facturas como una nueva fuente de verdad.

## Pendiente antes de producción
1. Aprobar UX desktop/móvil.
2. Conectar lecturas reales por `organizacion_id`.
3. Conectar acciones financieras únicamente mediante RPC aprobadas.
4. Integrar el launcher en la navegación principal cuando se autorice el cambio del monolito.
5. Auditoría independiente y pruebas en navegador real.
