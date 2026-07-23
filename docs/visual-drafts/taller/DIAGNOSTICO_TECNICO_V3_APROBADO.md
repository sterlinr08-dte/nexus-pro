# Diagnóstico Técnico V3 — Propuesta visual aprobada

> Estado: **APROBADO POR EL DUEÑO**
>
> Rama de trabajo: `chatgpt/visual-draft`
>
> Esta propuesta es referencia visual y funcional para Claude. **No debe publicarse directamente en `main` ni aplicarse mediante GitHub Actions.**

## Objetivo

Rediseñar la pantalla de **Diagnóstico técnico** del módulo Taller de NEXUS PRO, manteniendo continuidad visual con **Recepción de Equipos V3** y preservando el flujo operativo:

`Recibido → Diagnóstico → Presupuesto → Aprobación → Reparación → Control de calidad → Listo → Entregado`

La pantalla debe permitir al técnico evaluar el equipo, registrar fallas, adjuntar evidencia y preparar piezas y mano de obra antes de pasar al presupuesto.

## Referencia visual aprobada

La propuesta aprobada muestra una vista de escritorio y una vista móvil con:

- Sidebar grafito de NEXUS PRO.
- Encabezado “Diagnóstico técnico”.
- Barra horizontal del proceso con **Diagnóstico** activo.
- Resumen superior de:
  - orden de trabajo;
  - cliente;
  - equipo;
  - estado actual;
  - técnico asignado;
  - prioridad;
  - fecha estimada.
- Bloque principal **Pruebas y diagnóstico**.
- Resumen lateral del diagnóstico.
- Lista de fallas detectadas.
- Recomendaciones.
- Piezas propuestas.
- Mano de obra propuesta.
- Total estimado.
- Acción principal: **Continuar a presupuesto**.

## 1. Encabezado y flujo

Mostrar:

- Título: `Diagnóstico técnico`.
- Subtítulo: `Evalúa el equipo y confirma las fallas detectadas`.
- Botón para volver o ver la orden solamente si esa acción ya existe.
- Taller o sucursal actual si ese dato existe.
- Usuario/técnico actual si ya existe en el sistema.

La barra de estados debe ser visual y reflejar el estado real de la orden. No crear estados paralelos.

## 2. Resumen superior de la orden

### Orden de trabajo

- Número de orden.
- Estado.
- Fecha y hora de recepción.

### Cliente

- Nombre.
- Teléfono.
- Correo, si existe.
- Indicador de cliente frecuente, solo si ese dato existe.

### Equipo

- Imagen del equipo, si existe.
- Marca.
- Modelo.
- Capacidad.
- Color.
- IMEI o serie, si fue suministrado.
- Código interno del taller.

### Estado actual

- Estado: Diagnóstico.
- Técnico asignado.
- Prioridad.
- Fecha estimada.

## 3. Pruebas y diagnóstico

La interfaz debe permitir registrar cada prueba en uno de estos estados:

- Correcto.
- Parcial.
- Defectuoso.
- No aplica.

### Categorías propuestas

#### Pantalla y visual

- Pantalla táctil.
- Visualización.
- Brillo automático.
- True Tone / color.
- Cristal delantero.

#### Cámaras

- Cámara frontal.
- Cámara trasera.
- Enfoque.
- Flash.
- Grabación de video.

#### Sonido

- Auricular.
- Altavoz.
- Micrófono.
- Vibrador.
- Audio en llamadas.

#### Conectividad

- Red móvil / señal.
- Wi‑Fi.
- Bluetooth.
- GPS.
- NFC / Apple Pay.

#### Funciones

- Face ID o Touch ID.
- Botones.
- Carga.
- Batería.
- Sensor de proximidad.

#### Sistema

- Reinicio.
- Sistema operativo.
- SIM / lector.
- Agua / humedad.
- Placa lógica.

Claude debe comparar esta lista con las pruebas reales que ya maneje el sistema. No crear pruebas sin soporte si el modelo de datos actual no las contempla; documentarlas como futuras si fuese necesario.

## 4. Observaciones y evidencia

Agregar una zona para:

- Observaciones del técnico.
- Fotografías.
- Videos, solo si el sistema actual soporta videos.
- Evidencia de golpes, humedad, piezas rotas o daños internos.

Las credenciales del equipo deben continuar protegidas y visibles únicamente para personal autorizado, siguiendo las reglas existentes del Taller.

## 5. Resumen del diagnóstico

El panel lateral en escritorio debe mostrar:

- Total de pruebas realizadas.
- Correctas.
- Parciales.
- Defectuosas.
- No aplican.

También debe mostrar las fallas detectadas con una descripción breve.

Ejemplo visual:

```text
FALLAS DETECTADAS
Face ID            No funciona
Batería            Salud 78%
Cristal delantero  Roto
Altavoz            Distorsión leve
```

## 6. Recomendaciones

Generar una lista basada en las fallas seleccionadas, únicamente cuando exista lógica real para hacerlo.

Ejemplo:

- Cambio de cristal delantero.
- Cambio de batería.
- Reparación de Face ID.
- Revisión de altavoz.

No inventar automatizaciones si todavía no existen. Claude debe reutilizar reglas o funciones existentes o implementar la lógica de manera explícita y revisable.

## 7. Piezas a reemplazar — Propuesta

Las piezas agregadas en Recepción deben llegar cargadas al Diagnóstico.

Desde Diagnóstico se debe poder:

- mantenerlas;
- eliminar una propuesta;
- cambiar cantidad;
- agregar una pieza adicional;
- consultar disponibilidad;
- ver precio;
- ver garantía configurada.

No descontar inventario durante el diagnóstico. Las piezas siguen siendo una **propuesta** hasta la aprobación correspondiente.

## 8. Mano de obra — Propuesta

Debe permitir:

- conservar servicios propuestos en Recepción;
- agregar nuevos servicios;
- modificar cantidad;
- mostrar tiempo estimado, si existe;
- mostrar precio y subtotal.

Ejemplos visuales:

- Cambio de cristal delantero.
- Cambio de batería.
- Reparación de Face ID.

## 9. Total estimado

Mostrar:

- subtotal de piezas;
- subtotal de mano de obra;
- descuento, si existe;
- impuestos, según la configuración real;
- total estimado.

Este monto todavía no es una factura. Es la base para el Presupuesto.

## 10. Acciones

### Acción principal

`Continuar a presupuesto`

Debe guardar el diagnóstico y mover la orden al siguiente paso real del flujo.

### Acciones secundarias

- Guardar diagnóstico o borrador, si ya existe esa capacidad.
- Volver a la orden.

### Acción peligrosa

- Cancelar orden, únicamente si la función ya existe y el usuario tiene permiso.

No crear botones como “Ejecutar pruebas automáticas” salvo que exista una función real detrás.

## 11. Vista móvil

En móvil:

- Barra de etapas compacta.
- Resumen de orden y equipo en tarjetas.
- Pruebas en lista vertical compacta.
- Estado de cada prueba visible a la derecha.
- Fallas detectadas en tarjeta.
- Piezas y mano de obra en secciones colapsables o compactas, siempre que esa interacción se implemente directamente en el render real.
- Total estimado visible antes de la acción principal.
- Botón `Continuar a presupuesto` fácil de alcanzar.

## 12. Diseño aprobado

- Namespace visual: `.nxPf` cuando aplique dentro del POS.
- Azul principal: `#2563eb`.
- Tipografía: Plus Jakarta Sans.
- Sidebar: grafito oscuro.
- Fondo: gris azulado suave.
- Tarjetas blancas.
- Bordes discretos.
- Radios de 12–14 px.
- Sombras suaves.
- Estados correctos/parciales/defectuosos con colores semánticos discretos.
- Sin efectos glow fuertes.
- Sin botones excesivamente largos en escritorio.

## 13. Reglas de implementación para Claude

Antes de modificar:

1. Localizar la función real que renderiza Diagnóstico.
2. Localizar las funciones que cargan la orden, pruebas, piezas, mano de obra y totales.
3. Inventariar ids, onclick, names y data attributes.
4. Identificar las tablas Supabase involucradas.
5. Confirmar el modelo real de estados de diagnóstico.
6. Confirmar qué funciones existen actualmente.

Implementar dentro del HTML/CSS generado por las funciones reales.

No utilizar:

- MutationObserver.
- Detectores por texto.
- Búsqueda heurística de elementos.
- Scripts añadidos al final del archivo.
- Funciones o botones inventados.
- Publicación directa a `main`.
- GitHub Actions para aplicar el cambio.

## 14. Pruebas mínimas

- Orden recién recibida.
- Diagnóstico vacío.
- Diagnóstico parcialmente completado.
- Todos los estados de prueba.
- Equipo sin IMEI ni serie.
- Equipo con piezas propuestas desde Recepción.
- Agregar y eliminar piezas.
- Agregar mano de obra.
- Actualización del total estimado.
- Evidencias fotográficas.
- Guardado y reapertura.
- Continuar a Presupuesto.
- Vista móvil de 390 px.
- Vista escritorio.
- Permisos del técnico.
- Protección de credenciales.

## 15. Entrega esperada de Claude

- Auditoría del código real.
- Función de render identificada.
- Modelo de datos confirmado.
- Lista de funciones existentes.
- Comparación visual con esta propuesta.
- Implementación dentro del render real.
- Capturas móvil y escritorio.
- Pruebas ejecutadas.
- Riesgos y pendientes.
- Diff para revisión humana.

**No fusionar ni publicar en `main` sin aprobación del dueño.**
