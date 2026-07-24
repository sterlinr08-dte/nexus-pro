# Crear Cliente V1 — Propuesta visual aprobada

## Estado

**APROBADO POR EL USUARIO**

Esta propuesta es la referencia oficial para rediseñar el módulo **Crear cliente** de NEXUS PRO.

No implementar directamente en `main`. Trabajar únicamente en la rama `chatgpt/visual-draft` hasta revisión final.

---

## Objetivo

Convertir **Crear cliente** en un módulo central y reutilizable para:

- Punto de venta
- Facturación
- Prefactura
- Taller
- Financiamiento
- Cobranza
- Cuentas por cobrar
- Contabilidad

No debe ser un formulario aislado. Debe permitir crear el cliente sin abandonar el flujo desde donde fue invocado.

---

## Reglas técnicas obligatorias

- No inventar funciones, ids, eventos ni tablas.
- No modificar lógica de negocio sin autorización.
- No usar `MutationObserver`.
- No usar detectores por texto.
- No agregar listeners globales para corregir la interfaz después del render.
- No crear parches que adivinen el DOM.
- Identificar primero la función real que renderiza el formulario.
- Modificar directamente el HTML/CSS generado por la función real.
- Conservar todos los `id`, `name`, `onclick`, `data-*`, eventos y contratos existentes.
- Mantener Plus Jakarta Sans.
- Mantener el color primario `#2563eb`.
- Respetar el namespace visual existente; usar `.nxPf` cuando corresponda al módulo.

---

## Concepto visual aprobado

Diseño tipo ERP moderno inspirado en Linear, Stripe, Shopify e InfoPlus.

### Escritorio

- Sidebar oscura de NEXUS PRO.
- Encabezado limpio con breadcrumb:
  - Clientes
  - Nuevo cliente
- Formulario principal ancho.
- Tarjetas blancas sobre fondo gris suave.
- Columna principal para captura de datos.
- Columna lateral fija con resumen del cliente.
- Botonera inferior claramente jerarquizada.

### Móvil

- Una sola columna.
- Navegación por pasos o acordeones compactos.
- Indicador de progreso superior.
- Botón principal fijo o visible al final de cada paso.
- El resumen se muestra antes de guardar.

---

## Estructura funcional

### 1. Información básica

Campos:

- Tipo de cliente:
  - Persona física
  - Empresa
- Nombre completo o razón social
- Cédula o RNC
- Código interno automático
- Fecha de nacimiento, opcional
- Sexo, opcional
- Estado:
  - Activo
  - Inactivo

### 2. Contacto

Campos:

- Teléfono principal
- WhatsApp
- Teléfono secundario
- Correo electrónico
- Dirección
- Provincia
- Municipio
- Sector
- Referencia de ubicación

### 3. Información comercial

Campos:

- Categoría de cliente:
  - Detalle
  - Mayorista
  - Técnico
  - Distribuidor
  - Financiamiento
- Nivel de precio
- Vendedor o agente asignado
- Límite de crédito
- Días de crédito
- Balance inicial, si aplica
- Descuento autorizado
- Condición de pago predeterminada

### 4. Crédito y financiamiento

Esta sección solo debe desplegarse cuando el cliente use crédito o financiamiento.

Campos sugeridos, únicamente si ya existen o si se aprueban en la arquitectura:

- Ingresos aproximados
- Lugar de trabajo
- Tiempo laborando
- Dirección laboral
- Referencias personales
- Contacto de emergencia
- Límite de financiamiento
- Nivel de riesgo
- Documentos adjuntos

### 5. Taller

Datos reutilizables para recepción de equipos:

- Preferencia de contacto
- Autoriza llamadas
- Autoriza WhatsApp
- Notas internas
- Equipos vinculados por IMEI, serie o código interno

No inventar estas propiedades en base de datos. Mostrar únicamente lo que tenga soporte real o documentar la migración necesaria antes de implementarlo.

### 6. Documentos

Posibles adjuntos:

- Cédula frontal
- Cédula trasera
- RNC o registro mercantil
- Comprobante de dirección
- Contratos
- Otros documentos

Los documentos no serán obligatorios para crear un cliente básico.

### 7. Historial

Después de guardar, el cliente podrá mostrar:

- Facturas
- Prefacturas
- Préstamos
- Cobros
- Reparaciones
- Equipos
- Cuentas por cobrar

Para un cliente nuevo, la pestaña debe mostrarse vacía o deshabilitada hasta que exista un id persistido.

---

## Pestañas aprobadas

```text
[ Información ] [ Comercial ] [ Crédito ] [ Documentos ] [ Historial ]
```

En móvil pueden convertirse en pasos o acordeones.

---

## Resumen lateral en escritorio

La columna derecha debe actualizarse en tiempo real.

Ejemplo:

```text
Cliente nuevo

Tipo: Persona física
Categoría: Detalle
Nivel de precio: Precio lista
Crédito: No habilitado
Sucursal: Santiago
Agente: Sin asignar
```

También puede mostrar, cuando exista soporte real:

- Iniciales o fotografía
- Código automático
- Fecha de registro
- Estado
- Total de préstamos
- Total cobrado
- Total pendiente

No consultar métricas históricas hasta que el cliente haya sido guardado.

---

## Flujo de guardado

Debe permitirse un registro rápido con los datos mínimos:

- Nombre
- Teléfono principal

Cédula o RNC no serán obligatorios para un cliente básico, salvo que una operación específica los exija.

### Acciones inferiores

- Cancelar
- Guardar cliente
- Guardar y usar cliente

`Guardar y usar cliente` debe:

1. Validar los campos mínimos.
2. Guardar el cliente.
3. Recuperar el id creado.
4. Cerrar la ventana o formulario.
5. Devolver el cliente seleccionado al flujo de origen.

Flujos de origen previstos:

- Factura
- Prefactura
- Recepción de taller
- Financiamiento
- Cobranza

No duplicar la lógica de creación en cada módulo. Utilizar un único flujo reutilizable.

---

## Validaciones

### Duplicados

- Buscar coincidencias por teléfono.
- Buscar coincidencias por cédula o RNC.
- Mostrar advertencia antes de guardar.
- Permitir abrir el cliente encontrado.
- No bloquear silenciosamente.
- No crear duplicados por diferencias simples de formato.

Normalizar antes de comparar:

- Teléfonos sin espacios ni guiones.
- Cédula/RNC sin separadores.
- Correos en minúsculas.

### Campos mínimos

Para cliente básico:

- Nombre o razón social
- Teléfono principal

Para empresa, crédito o financiamiento, aplicar las reglas específicas ya existentes en el sistema.

---

## Diseño de escritorio

### Tarjeta 1 — Datos personales

Distribución recomendada en tres columnas:

- Nombre completo
- Cédula/RNC
- Fecha de nacimiento
- Teléfono principal
- Teléfono secundario
- Correo
- Dirección
- Ciudad/Municipio
- Provincia

### Tarjeta 2 — Información adicional

- Estado civil
- Ocupación
- Empresa o negocio
- Ingresos aproximados
- Referencia personal
- Teléfono de referencia
- Notas

No hacer obligatorios estos datos para el alta básica.

### Tarjeta 3 — Preferencias y configuración

- Canal preferido de contacto
- Idioma
- Permitir notificaciones
- Nivel de precio
- Límite de crédito sugerido, si aplica

### Columna derecha

- Avatar o iniciales
- Código del cliente
- Fecha de registro
- Estado
- Resumen comercial
- Indicadores históricos, solo después de guardar

---

## Diseño móvil

Usar tres etapas visuales:

1. Datos personales
2. Información adicional
3. Preferencias

Reglas:

- Una columna.
- Campos altos y táctiles.
- Labels visibles; no depender solo de placeholders.
- Selectores nativos o compatibles con móvil.
- Teclado numérico para teléfono, cédula y montos.
- Botón `Siguiente` durante la captura.
- En el último paso mostrar resumen y guardar.

---

## Estilo visual

- Tipografía: Plus Jakarta Sans.
- Color primario: `#2563eb`.
- Fondo de página: gris muy suave.
- Tarjetas: blancas, borde sutil y radio moderado.
- Sombras: ligeras, sin glow.
- Íconos: Tabler Icons o los ya utilizados por NEXUS PRO.
- Botones compactos; evitar botones excesivamente largos.
- Acciones principales en azul.
- Cancelar como acción secundaria o de peligro suave.
- No usar degradados fuertes.

---

## Auditoría obligatoria antes de implementar

Claude debe identificar y documentar:

1. Función real que abre el formulario de cliente.
2. Función real que renderiza el HTML.
3. Función de guardado actual.
4. Tabla y columnas reales en Supabase.
5. Validaciones actuales.
6. Módulos que invocan el alta de cliente.
7. ids, names, onclick, data attributes y listeners existentes.
8. CSS actual asociado.
9. Riesgo de duplicar clientes.
10. Forma actual de devolver el cliente al módulo de origen.

---

## Implementación por fases

### Fase 1 — Auditoría

No cambiar código. Entregar mapa real de funciones, datos y eventos.

### Fase 2 — Rediseño visual

Modificar únicamente HTML/CSS de las funciones reales, conservando comportamiento.

### Fase 3 — Guardar y usar

Unificar el retorno del cliente creado a Factura, Prefactura, Taller, Financiamiento y Cobranza.

### Fase 4 — Duplicados y normalización

Agregar o mejorar advertencias de duplicados sin romper el alta rápida.

### Fase 5 — Campos avanzados

Solo después de revisar qué columnas existen y aprobar cualquier migración necesaria.

---

## Entrega esperada de Claude

1. Auditoría del módulo actual.
2. Nombre y ubicación de las funciones reales.
3. Lista de ids y eventos preservados.
4. Problemas UX encontrados.
5. Propuesta de implementación por fases.
6. HTML de reemplazo dentro de la función real.
7. CSS con namespace correcto.
8. Captura de escritorio.
9. Captura móvil.
10. Pruebas realizadas.
11. Diff final.
12. Riesgos o migraciones pendientes.

---

## Prohibiciones

- No publicar a `main`.
- No usar GitHub Actions para inyectar cambios visuales.
- No crear una pantalla paralela desconectada.
- No reemplazar el flujo real por un mockup estático.
- No inventar botones, campos ni métricas sin soporte.
- No cambiar la base de datos sin aprobación.
- No eliminar validaciones existentes sin documentarlo.

---

## Decisión aprobada

La propuesta visual mostrada al usuario fue aprobada como **Crear Cliente V1**.

Claude debe utilizar este documento como referencia funcional y visual, pero debe implementar únicamente sobre las funciones y contratos reales encontrados en el repositorio.
