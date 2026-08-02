# COBRANZA V3 — Guía de integración visual

## Archivos de referencia

- Prototipo funcional: `docs/visual-drafts/financiamiento/cobranza-v3-mockup.html`
- Rama de diseño: `chatgpt/visual-draft`

## Objetivo

Trasladar el lenguaje visual del prototipo a la pantalla real de **Financiamiento → Cobranza**, conservando toda la lógica ya corregida en Cobranza V2.1.

El prototipo es una referencia de jerarquía, distribución, responsive y comportamiento. No debe copiarse como un módulo paralelo ni reemplazar la lógica productiva.

## Funciones reales que deben mantenerse

Integrar sobre las funciones actuales del módulo, especialmente:

- `prCobranzaMainHTML()`
- `prCobranzaTablaHTML()`
- `prCobranzaTabsHTML()`
- `prCobranzaListaFiltrada()`
- `pintarLupaPrCob()`
- acciones reales de pago, detalle, estado de cuenta y WhatsApp

No crear un segundo sistema de Cobranza.

## Cambios visuales prioritarios

### 1. Encabezado

- Título `Cobranza`.
- Subtítulo corto: `Gestión y seguimiento de cartera`.
- Botón `Exportar` compacto.
- Mantener el botón de menú móvil existente.

### 2. Buscador y filtros

- Una fila superior compacta con la lupa del sistema.
- Pestañas desplazables horizontalmente en móvil.
- Estados: Todos, Críticos, Alta prioridad, Mora reciente, Por vencer y Al día.
- Mostrar contador real en cada pestaña.

### 3. KPI

Usar cinco tarjetas compactas:

1. Saldo crítico.
2. Alta prioridad.
3. Mora reciente.
4. Vence en 7 días.
5. Al día.

Cada tarjeta debe contener monto o cantidad, número de clientes y color semántico suave. Evitar fondos saturados.

### 4. Tabla de escritorio

Columnas recomendadas:

- Cliente.
- Referencia.
- Estado.
- Días vencido.
- Próxima cuota.
- Monto vencido.
- Saldo total.
- Último pago.
- Acciones.

La acción principal debe ser `Cobrar`. Las acciones secundarias deben ir en el menú `…`.

### 5. Panel lateral

En escritorio mostrar un panel compacto con:

- Cobrar hoy.
- Clientes críticos.
- Promesas de pago, solo si existe dato real.
- Pagos registrados.
- Meta del día, solo si existe configuración real.
- Actividad reciente, solo si ya existe una fuente real.

No inventar información ni tablas nuevas únicamente para llenar el panel. Cuando un dato no exista, omitir el bloque.

### 6. Móvil

En pantallas pequeñas:

- No mostrar la tabla.
- Convertir cada préstamo en una tarjeta compacta.
- Mostrar cliente, teléfono, estado, días vencido, monto vencido, próxima cuota y saldo.
- Botón principal `Cobrar` ancho normal, no gigante.
- Botón secundario `…`.
- Mantener la navegación móvil real de NEXUS PRO; no copiar la barra inferior ficticia del mockup si el sistema ya tiene otra.

## Reglas de diseño

- Namespace CSS `.nxFP`.
- Azul principal `#2563eb`.
- Botones de tamaño normal.
- Radios entre 8 y 14 px.
- Sombras sutiles.
- Tipografía y escala existentes del sistema.
- No crear ventanas anchas.
- No repetir acciones.
- No usar observadores DOM ni temporizadores para corregir el render.
- No tocar Supabase para una mejora puramente visual.

## Comportamientos del prototipo

El prototipo demuestra:

- Filtro por prioridad.
- Búsqueda local por cliente, teléfono y referencia.
- Tabla en escritorio.
- Tarjetas en móvil.
- Botón de pago primario.
- Exportación contextual simulada.

Claude debe conectar esos comportamientos con las funciones reales existentes, no copiar el JavaScript de demostración.

## Validación obligatoria

Probar con el código real en:

- 1600 px.
- 1280 px.
- 1024 px.
- 901 px.
- 760 px.
- 390 px.
- 320 px.

Verificar:

- Cero desbordamiento horizontal.
- Botones sin cortar texto.
- Montos largos legibles.
- Nombres y teléfonos largos.
- Filtros y búsqueda activos.
- Pago rápido abre el préstamo correcto.
- Menú secundario no dispara el clic de la fila.
- Exportación respeta filtro y búsqueda.
- Sin regresión en Préstamos, Clientes, Reportes, Solicitudes y Evaluación.

## Flujo de publicación

1. Auditar el prototipo y esta guía.
2. Implementar en una rama `claude/...` nueva desde `main` actualizado.
3. Ejecutar pruebas.
4. Crear PR.
5. No publicar directamente a `main` sin revisión.
