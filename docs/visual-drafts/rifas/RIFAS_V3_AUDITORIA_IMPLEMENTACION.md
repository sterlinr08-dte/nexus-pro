# RIFAS V3 — AUDITORÍA DEL MÓDULO REAL VS MOCKUP APROBADO

## Propósito

Este documento compara el módulo administrativo real de Rifas de NEXUS PRO contra el mockup visual aprobado por el dueño.

No es una orden para copiar el HTML de demostración literalmente. Claude debe auditar las funciones reales, reutilizar la lógica existente y trasladar únicamente la arquitectura visual y operativa aprobada.

## Referencias visuales y técnicas

- `docs/visual-drafts/rifas/RIFAS_V3_INTERFAZ_ADMINISTRATIVA.md`
- `docs/visual-drafts/rifas/rifas-v3-mockup.html`
- `docs/visual-drafts/rifas/rifas-v3.css`
- `docs/visual-drafts/rifas/rifas-v3-demo.js`

## Reglas obligatorias

1. No publicar directamente en `main`.
2. Crear una rama `claude/rifas-v3-admin` o equivalente.
3. No crear un segundo módulo paralelo.
4. No duplicar funciones de boletos, vouchers, números, sorteos, vendedores o reportes.
5. No crear tablas o columnas sin demostrar primero que un dato real no existe.
6. Mantener el color índigo propio de Rifas.
7. Mantener la fuente y el Design System vigente de NEXUS PRO.
8. No usar observadores DOM ni temporizadores para rediseñar la interfaz.
9. Modificar las funciones reales que producen el HTML.
10. Presentar capturas de escritorio y móvil antes de fusionar.

---

# 1. INVENTARIO CONFIRMADO DEL MÓDULO ACTUAL

La implementación real ya dispone de estas piezas:

## Administración de rifas

- Lista de rifas.
- Creación y edición.
- Rifa activa.
- Premio y precio por boleto.
- Enlace público.
- Vendedores.
- Paquetes o combos.
- Reportes.
- Sorteo.

## Dashboard de una rifa

- Encabezado con nombre y premio.
- KPI de vendidos.
- KPI de confirmados.
- KPI de pendientes o por confirmar.
- KPI de recaudado.
- Barra de progreso configurable.
- Los KPI ya son interactivos y abren vistas relacionadas.

## Números

- Tablero de números.
- Paginación aproximada de 120 números por página.
- Búsqueda numérica mediante `rfTabQ` / `nxRifaBuscar`.
- Selección aleatoria.
- Estados visuales de disponible, por confirmar, confirmado y apartado.

## Tickets y comprobantes

- Ventana `nxRifaTickets`.
- Filtro por estado.
- Búsqueda por número, comprador o teléfono.
- Tabla de tickets.
- Apertura del detalle mediante `nxTkOpen` / `gestBoleto`.
- Revisión de voucher.
- Confirmación o rechazo según la lógica existente.
- Cambio administrativo del número.
- Auditoría del cambio de número.
- WhatsApp.
- Boleto imprimible o compartible.

## Otros componentes

- Participantes derivados de boletos.
- Métodos y cuentas de pago.
- Vendedores o referidos.
- Reportes.
- Página pública responsive.
- Dominio o marca blanca.
- Expiración de apartados.

## Conclusión de esta sección

La V3 no necesita reconstruir el negocio. Necesita reorganizar lo existente en una interfaz administrativa más clara.

---

# 2. MATRIZ: ACTUAL VS MOCKUP APROBADO

| Área | Estado actual | Objetivo V3 | Trabajo requerido |
|---|---|---|---|
| Navegación | Acciones y ventanas distribuidas | Sidebar estable con secciones claras | Reorganizar navegación, sin duplicar destinos |
| Dashboard | 4 KPI + progreso | Centro operativo con 5 KPI, alertas, progreso, recaudado y próximo sorteo | Rediseñar `renderRifaPanel` usando datos reales |
| Rifa activa | Existe en el contexto | Selector o bloque visible de rifa activa | Mostrar rifa activa claramente; no inventar multi-selector si no existe |
| Números | Tablero principal paginado | Pantalla dedicada con filtros, rangos, leyenda fija y panel lateral | Separar tablero del resumen y rediseñar el detalle |
| Ticket | Modal de hasta 560 px | Panel lateral contextual | Reutilizar `gestBoleto`; cambiar contenedor visual |
| Pagos por revisar | Filtro dentro de tickets | Bandeja operativa dedicada | Reutilizar boletos `por_confirmar`; no crear entidad nueva |
| Participantes | Información dispersa en boletos | Ficha consolidada | Agrupar datos reales por teléfono/cliente; evitar duplicados visuales |
| Acciones | Varios botones visibles | Acción principal + menú de tres puntos | Reordenar, sin eliminar funciones reales |
| Comprobante | Se abre en flujo del ticket | Vista clara junto a monto, banco, fecha y acciones | Mejorar jerarquía visual |
| Alertas | Información disponible parcialmente | Tarjetas: vouchers pendientes y apartados por vencer | Calcular solo desde datos reales |
| Próximo sorteo | Disponible en configuración/sorteo | Tarjeta destacada | Mostrar fecha real o estado vacío honesto |
| Móvil | Tablero y modales adaptados | Navegación inferior + listas + panel a pantalla completa | Rediseñar por breakpoint |

---

# 3. HALLAZGOS PRINCIPALES

## Hallazgo A — El dashboard actual no es un centro de operaciones

Los KPI son útiles, pero la pantalla continúa enfocada en el tablero de números. La V3 debe mostrar primero lo que requiere acción:

- pagos pendientes de revisión;
- apartados próximos a expirar;
- confirmados;
- disponibles;
- recaudado;
- progreso;
- próximo sorteo.

No inventar «todo al día» si no se puede demostrar con los estados reales.

## Hallazgo B — Tickets vive en un modal cuando debería ser una pantalla o panel

`nxRifaTickets` abre una ventana administrativa con tabla. Para una operación diaria, debe convertirse en una vista principal del módulo.

El modal puede permanecer para acciones pequeñas, pero no debe contener una sección completa de trabajo.

## Hallazgo C — El detalle del boleto debe reutilizarse, no duplicarse

La lógica de `gestBoleto` ya contiene los datos y acciones importantes. Debe dividirse en:

- generador de contenido reutilizable;
- contenedor modal existente cuando sea necesario;
- panel lateral V3 para escritorio;
- pantalla completa en móvil.

No crear `gestBoletoV3` copiando toda la función.

## Hallazgo D — «Pagos por revisar» ya existe como estado, no como experiencia

La entidad real es el boleto con estado `por_confirmar`. La V3 debe presentar esos registros como una bandeja de revisión.

No crear una tabla `rifa_pagos_revision` si el estado actual ya representa el flujo.

## Hallazgo E — Participante debe ser una vista derivada

Antes de crear una tabla nueva, Claude debe comprobar si los participantes pueden agruparse desde boletos por:

1. identificador de cliente, si existe;
2. teléfono normalizado;
3. correo o cédula, si existen.

La primera versión de la ficha puede ser una vista derivada y de solo lectura.

## Hallazgo F — Los estados visuales necesitan nombres coherentes

Usar los estados reales del sistema. No mezclar:

- estado del número;
- estado del boleto;
- estado del pago.

Antes de implementar badges, documentar el mapeo real.

Ejemplo orientativo, sujeto a auditoría:

- Disponible: no existe boleto activo para ese número.
- Apartado: boleto temporal reservado.
- Pendiente: comprobante o aprobación pendiente.
- Confirmado: pago aprobado y boleto válido.
- Anulado: boleto cancelado.

## Hallazgo G — El mockup usa algunas cifras demostrativas

Los valores 1,000 / 648 / 42 / 15 / 295 / RD$324,000 son datos de demostración.

Claude debe reemplazarlos por cálculos reales y estados vacíos honestos.

---

# 4. ARQUITECTURA VISUAL PROPUESTA

## Navegación del módulo

### Operación

- Resumen
- Números
- Pagos por revisar
- Participantes
- Tickets
- Apartados

### Configuración

- Rifas
- Premios y sorteo
- Vendedores
- Métodos de pago
- Configuración

No crear destinos que no tengan función real. Si «Apartados» no tiene pantalla independiente, puede ser un filtro de Tickets hasta que se justifique separarlo.

## Escritorio

- Sidebar fijo del módulo.
- Topbar con búsqueda contextual.
- Área principal.
- Panel lateral de detalle de 360–420 px.
- Un solo panel lateral abierto.
- Modales pequeños únicamente para confirmar, rechazar, cambiar número o editar un campo puntual.

## Móvil

- Barra inferior: Resumen, Números, Revisar, Más.
- El panel lateral pasa a pantalla completa.
- No mostrar tabla horizontal.
- Tickets y pagos se muestran como tarjetas compactas.
- El tablero se abre bajo demanda y conserva búsqueda, rango y filtros.

---

# 5. ESPECIFICACIÓN POR PANTALLA

## 5.1 Resumen

### Encabezado

- «Bienvenido» o título operativo.
- Nombre de la rifa activa.
- Estado de la rifa.
- Acciones rápidas en menú compacto.

### KPI

1. Total de números.
2. Confirmados.
3. Pendientes de revisión.
4. Apartados.
5. Disponibles.

Cada KPI debe abrir su vista o filtro real.

### Bloque central

- Progreso de ventas.
- Recaudado.
- Precio por número.
- Monto pendiente para completar, solo si puede calcularse correctamente.
- Próximo sorteo.

### Alertas

- Comprobantes por revisar.
- Apartados que vencen pronto.
- Pagos rechazados o problemas, únicamente si existe ese estado real.

## 5.2 Números

### Controles

- Selector de rango o página.
- Buscar número.
- Filtros por estado.
- Leyenda fija.
- Paginación.

### Tablero

- Celdas compactas.
- Solo número y color de estado.
- No meter nombre del cliente dentro de la celda.
- Al seleccionar, abrir panel lateral.

### Panel lateral

- Número.
- Estado.
- Cliente.
- Teléfono.
- Ticket.
- Fecha.
- Monto.
- Método de pago.
- Comprobante.
- Acciones reales.

## 5.3 Pagos por revisar

### Lista o tabla de escritorio

- Participante.
- Números.
- Monto.
- Método de pago.
- Miniatura de comprobante.
- Antigüedad.
- Aprobar.
- Rechazar.

### Reglas

- Aprobar y rechazar deben llamar las funciones existentes.
- Al seleccionar una fila, mostrar panel lateral con voucher grande.
- El botón principal es «Aprobar pago».
- Rechazar exige el motivo si la lógica actual ya lo soporta; si no, Claude debe informar antes de inventar almacenamiento.

## 5.4 Participantes

### Lista

- Nombre.
- Teléfono.
- Cantidad de tickets.
- Cantidad de números.
- Total pagado.
- Pendiente.
- Última actividad.

### Ficha

Pestañas o bloques:

- Resumen.
- Tickets.
- Números.
- Pagos.
- Comprobantes.
- Historial.

La ficha debe derivar sus datos del modelo real.

## 5.5 Tickets

- Lista completa.
- Filtros por estado.
- Buscador existente `tkQ` o motor compartido equivalente.
- Acciones agrupadas en menú.
- Detalle en panel lateral.

## 5.6 Modales compactos

Mantener modales únicamente para:

- Confirmar una acción irreversible.
- Rechazar pago.
- Cambiar número.
- Anular ticket.
- Editar un dato puntual.

Formato:

- máximo 440–520 px en escritorio;
- pie fijo con Cancelar + acción principal;
- títulos claros;
- no cerrar al tocar fuera si hay datos escritos.

---

# 6. PLAN DE IMPLEMENTACIÓN EN 4 FASES

## Fase 1 — Auditoría técnica y mapa de funciones

Claude debe entregar antes de programar:

- función que renderiza lista de rifas;
- función que renderiza panel de una rifa;
- función del tablero;
- función de tickets;
- función del detalle del boleto;
- funciones de aprobar, rechazar, cambiar, anular, imprimir y WhatsApp;
- tablas reales usadas;
- estados reales y transiciones;
- datos disponibles para participantes y alertas.

Entregable: ✅ existe / ⚠️ parcial / ❌ no existe.

## Fase 2 — Shell, navegación y Resumen

- Crear la estructura visual V3.
- Mantener la lógica actual.
- Implementar Resumen.
- Crear sidebar y topbar internos.
- Aplicar responsive.

No modificar todavía el flujo de aprobación.

## Fase 3 — Números, tickets y pagos

- Pantalla Números.
- Panel lateral reutilizando `gestBoleto`.
- Pantalla Pagos por revisar desde `por_confirmar`.
- Pantalla Tickets.
- Modales compactos de acciones.

## Fase 4 — Participantes, móvil y validación final

- Ficha derivada de participantes.
- Navegación móvil.
- Estados vacíos.
- Accesibilidad.
- Rendimiento.
- Pruebas de regresión.

---

# 7. PRUEBAS OBLIGATORIAS

## Lógica

- Disponible.
- Apartado.
- Por confirmar.
- Confirmado.
- Anulado.
- Apartado expirado.
- Cambio de número.
- Pago aprobado.
- Pago rechazado.
- Ticket sin comprobante.
- Comprador sin teléfono.

## Interacción

- KPI abre filtro correcto.
- Buscar número encuentra coincidencias reales.
- Seleccionar número abre el boleto correcto.
- Aprobar actualiza la pantalla sin duplicar acciones.
- Rechazar actualiza la pantalla.
- Cambiar número verifica disponibilidad.
- WhatsApp usa el teléfono correcto.
- Imprimir usa el boleto correcto.

## Responsive

Probar al menos:

- 1600 px.
- 1366 px.
- 1024 px.
- 768 px.
- 430 px.
- 390 px.
- 320 px.

Cero desbordes horizontales.

## Rendimiento

- No recalcular toda la cartera de boletos varias veces por tarjeta.
- No renderizar todos los números de una rifa grande.
- Mantener paginación.
- No agregar listeners duplicados en cada render.

## Seguridad operativa

Auditar y documentar, aunque no forme parte del rediseño:

- doble selección del mismo número;
- doble confirmación del mismo boleto;
- expiración simultánea con confirmación;
- cambio a un número ocupado;
- anulación de un boleto confirmado;
- autorización de acciones administrativas.

---

# 8. CRITERIOS DE ACEPTACIÓN

La V3 se considera lista cuando:

1. El administrador entiende qué requiere acción sin abrir ventanas.
2. El tablero no domina toda la experiencia administrativa.
3. Pagos por revisar es una bandeja real.
4. El detalle se abre en panel lateral en escritorio.
5. En móvil, el detalle ocupa una sola pantalla clara.
6. Las acciones existentes siguen funcionando.
7. No existen funciones duplicadas.
8. No se inventan datos.
9. No se crean tablas innecesarias.
10. Hay capturas de escritorio y móvil comparadas contra el mockup.
11. Las pruebas de estados y regresión están en verde.

---

# 9. INSTRUCCIÓN FINAL PARA CLAUDE

Audita este documento contra el código real antes de aceptar cualquier afirmación. Si el mockup pide un dato o acción que no existe, no la simules: indícalo, explica la alternativa más simple y solicita aprobación cuando implique una decisión de negocio o una migración de base de datos.

Primero entrega el mapa de funciones y la matriz ✅/⚠️/❌. Luego implementa por fases en una rama separada.