# RIFAS V3 — Interfaz administrativa clara y operativa

## Objetivo

Rediseñar la parte administrativa de Rifas para que funcione como un centro de operaciones moderno: una pantalla principal clara, paneles laterales contextuales, pocas ventanas emergentes y acciones agrupadas.

Este documento y los archivos `rifas-v3-mockup.html`, `rifas-v3.css` y `rifas-v3-demo.js` son una referencia de UX/UI. No deben convertirse en un módulo paralelo ni sustituir la lógica real.

## Principios obligatorios

1. Mantener la lógica actual de rifas, tickets, números, comprobantes, apartados, confirmaciones, vendedores y auditoría.
2. No crear tablas ni columnas nuevas para implementar solo el rediseño.
3. Reutilizar funciones reales existentes.
4. No duplicar acciones de aprobar, rechazar, cambiar número, WhatsApp, imprimir o ver ticket.
5. Mantener el acento índigo propio de Rifas y el lenguaje visual general de NEXUS PRO.
6. Botones de tamaño normal; nada gigante o estirado.
7. Modales solo para confirmaciones breves o formularios cortos.
8. En móvil, priorizar lista y búsqueda; el tablero completo debe ser una vista opcional.

## Arquitectura visual propuesta

### Pantalla principal

Debe incluir:

- Encabezado con rifa activa, estado, fecha del sorteo y acciones principales.
- KPI de disponibles, apartados, pagos por revisar, confirmados y recaudado.
- Barra de progreso de la rifa.
- Bloque “Atención requerida”.
- Navegación interna: Resumen, Números, Pagos por revisar, Participantes, Boletos, Vendedores, Sorteo y Configuración.

### Bandeja de pagos

Debe funcionar como una bandeja de trabajo, no como una colección de ventanas:

- Cliente y teléfono.
- Números asociados.
- Monto.
- Hora o antigüedad.
- Vista previa del comprobante.
- Aprobar, rechazar y WhatsApp.
- Selección de una fila abre un panel lateral sin ocultar la lista.

### Tablero de números

- Vista compacta.
- Leyenda persistente.
- Búsqueda por número.
- Filtros por estado.
- Saltar a rango.
- Selección múltiple cuando la lógica real lo permita.
- Colores suaves: disponible blanco, apartado amarillo, revisión naranja, confirmado verde, bloqueado rojo, seleccionado índigo.

### Panel lateral

Al seleccionar ticket, participante o número:

- Mostrar contexto completo.
- Mantener visible la pantalla de fondo.
- Acciones principales claras.
- Menú de tres puntos para acciones secundarias.
- Cierre por botón visible; no depender solo de clic fuera.

### Modales compactos

Usarlos únicamente para:

- Cambiar número.
- Rechazar comprobante con motivo.
- Confirmar acciones destructivas.
- Formularios breves.

## Integración esperada

Claude debe primero localizar las funciones reales del módulo de Rifas y mapear cada pieza del prototipo a ellas. Antes de programar debe entregar:

- funciones reales que serán modificadas;
- acciones que serán reutilizadas;
- elementos del prototipo descartados por no tener datos reales;
- riesgos de regresión;
- plan de pruebas.

## Pruebas mínimas

- 390, 760, 901, 1024, 1280 y 1600 px.
- Sin desborde horizontal.
- Tablero paginado sin pérdida de filtros.
- Aprobar/rechazar usa el ticket correcto.
- Cambiar número valida disponibilidad real.
- WhatsApp abre el comprador correcto.
- Menús no quedan abiertos al cambiar de vista.
- Panel lateral se cierra correctamente.
- Navegación por teclado y nombres accesibles en botones de icono.
- Sin errores de consola.

## Archivos de referencia

- `docs/visual-drafts/rifas/rifas-v3-mockup.html`
- `docs/visual-drafts/rifas/rifas-v3.css`
- `docs/visual-drafts/rifas/rifas-v3-demo.js`

## Entregable final de Claude

1. Auditoría antes de cambiar código.
2. Capturas de escritorio y móvil.
3. Lista exacta de funciones modificadas.
4. Pruebas ejecutadas.
5. Elementos descartados y razón.
6. PR en rama propia; nunca publicación directa sin revisión.
