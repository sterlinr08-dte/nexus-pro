# HISTORIAL CREDITICIO V1 — DISEÑO APROBADO

## Estado

Aprobado para implementación en NEXUS PRO.

## Objetivo

Crear una vista integral del comportamiento crediticio del cliente antes de aprobar nuevos préstamos, consultar su cartera, analizar riesgo y revisar su historial de pagos.

## Ubicación

- Clientes → Perfil del cliente → Historial crediticio
- Evaluación financiera → Historial crediticio

## Diseño principal

La pantalla debe conservar la línea visual de NEXUS PRO:

- Tipografía Plus Jakarta Sans
- Color principal `#2563eb`
- Interfaz ERP moderna
- Tarjetas blancas con bordes suaves
- Fondo gris claro
- Diseño responsive para escritorio y móvil
- Namespace CSS `.nxPf`

## Encabezado aprobado

El encabezado debe mostrar:

- Foto del cliente
- Nombre completo
- Estado del cliente
- Cédula o RNC
- Teléfono
- Correo
- Fecha desde que es cliente
- Última actividad

### Score interno circular grande

El Score interno será el elemento visual principal del encabezado.

Debe mostrarse como un indicador circular grande con:

- Puntaje actual, por ejemplo: `820 / 1000`
- Clasificación: `Muy bueno`
- Nivel de riesgo: `Bajo`
- Estado: `Aprobable`

El indicador debe permitir identificar el nivel de riesgo en menos de un segundo.

## Resumen de cartera

Mostrar tarjetas compactas con:

- Total de préstamos
- Préstamos activos
- Préstamos pagados
- Monto financiado
- Total pagado
- Balance pendiente
- Intereses pagados
- Mora acumulada
- Promedio de atraso
- Puntualidad de pago

## Recomendación del sistema

Panel visible con:

- Cliente confiable / riesgo medio / riesgo alto
- Historial resumido
- Monto recomendado
- Tasa sugerida
- Plazo máximo sugerido
- Nivel de riesgo
- Resultado: Aprobable / Revisión / No recomendable

## Pestañas

- Resumen
- Préstamos
- Pagos
- Evaluaciones
- Gestiones de cobro
- Documentos

## Comportamiento de pago

Mostrar una línea de tiempo mensual con estados visuales:

- Verde: pagó puntual
- Amarillo: 1 a 5 días de atraso
- Naranja: 6 a 15 días de atraso
- Rojo: más de 15 días
- Gris: sin pago

## Historial de préstamos

Tabla con:

- Número de préstamo
- Fecha
- Monto original
- Tasa
- Plazo
- Cuota
- Total pagado
- Balance
- Estado
- Días de atraso
- Acciones

Estados permitidos:

- Activo
- Al día
- Pagado
- Vencido
- Reestructurado
- Cancelado
- En proceso legal

## Indicadores del cliente

Panel con:

- Puntualidad de pago
- Días promedio de atraso
- Préstamos completados
- Préstamos en mora
- Promesas incumplidas
- Nivel de riesgo
- Score interno

## Alertas importantes

Mostrar alertas para:

- Mora activa
- Evaluación pendiente
- Documento vencido
- Garantía pendiente
- Promesa de pago incumplida
- Pago reversado
- Solicitud rechazada
- Préstamo en proceso legal

## Vista móvil

La versión móvil debe mantener:

- Encabezado compacto del cliente
- Score circular grande en la parte superior
- Recomendación del sistema
- Cuatro KPI principales
- Lista de últimos préstamos
- Acceso a ver todos
- Navegación inferior existente de NEXUS PRO

## Reglas de implementación

- No modificar lógica existente sin autorización.
- No inventar botones, datos o acciones sin soporte real.
- Implementar sobre las funciones reales de renderizado.
- Preservar ids, eventos, `onclick`, atributos `data-*` y contratos actuales.
- No usar `MutationObserver`.
- No aplicar parches DOM posteriores al render.
- No interceptar clics globalmente.
- Mantener compatibilidad con escritorio y móvil.

## Resultado esperado

El módulo debe permitir que un asesor pueda responder rápidamente:

- ¿El cliente paga a tiempo?
- ¿Cuánto ha financiado?
- ¿Cuánto debe?
- ¿Ha tenido mora?
- ¿Cuál es su nivel de riesgo?
- ¿Qué monto, tasa y plazo recomienda el sistema?

Este documento define el diseño visual aprobado para el módulo Historial crediticio de NEXUS PRO.