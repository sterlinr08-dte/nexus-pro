# Financiamiento — mover Documentos fuera de Cobranza al perfil del cliente

## Decisión del dueño

La ventana **DOCUMENTOS — [cliente]** no debe abrirse ni presentarse como parte del flujo de Cobranza. Debe estar dentro de la información del cliente.

## Diagnóstico del código real

La función existente es:

```js
window.nxPrestamoDocs(id)
```

Los archivos se almacenan en `prestamos.documentos` y están ligados al préstamo, no directamente al registro general del cliente. Por eso la solución correcta no es mover físicamente los documentos a otra tabla ni cambiar Storage.

La interfaz debe mostrarlos dentro del perfil del cliente, pero agrupados por préstamo para conservar su relación legal y operativa.

## Objetivo funcional

### En Cobranza

Eliminar cualquier acceso directo visible a:

- Documentos
- Cédula
- Contrato firmado
- Garantías
- Otros archivos

La fila o tarjeta de Cobranza debe concentrarse solamente en:

- Cobrar
- WhatsApp
- Registrar promesa
- Estado de cuenta
- Ver cliente
- Más acciones estrictamente relacionadas con cobro

No borrar `nxPrestamoDocs(id)`. Solo retirar su entrada desde el flujo de Cobranza.

### En Información del cliente

Agregar una pestaña real llamada:

```text
Documentos
```

Debe ubicarse junto a las pestañas existentes de la ficha o historial del cliente, por ejemplo:

```text
Resumen | Préstamos | Pagos | Documentos | Notas | Historial
```

## Comportamiento de la pestaña Documentos

1. Localizar todos los préstamos del cliente usando la relación existente.
2. Mostrar los documentos agrupados por préstamo.
3. Cada bloque debe indicar:
   - referencia del préstamo;
   - estado;
   - fecha;
   - saldo, si aplica;
   - cantidad de documentos.
4. Al abrir un bloque, reutilizar la lógica real de documentos del préstamo.
5. No duplicar subida, borrado, descarga ni firma de URL privada.

Ejemplo visual:

```text
DOCUMENTOS DEL CLIENTE

Préstamo PR-000245 · Activo
4 documentos

✓ Cédula
✓ Contrato firmado
✓ Foto con la cédula
✓ Firma del cliente

[Administrar documentos]

--------------------------------

Préstamo PR-000198 · Pagado
2 documentos

✓ Cédula
✓ Garantía

[Administrar documentos]
```

El botón **Administrar documentos** debe llamar a la función existente:

```js
window.nxPrestamoDocs(prestamoId)
```

No crear otra ventana paralela con otra lógica.

## Garantías

Aunque el acceso aparezca dentro del perfil del cliente, la garantía debe seguir vinculada al préstamo correspondiente.

No convertir `garantia` en un documento general del cliente.

## Cambios concretos que Claude debe realizar

1. Identificar dónde Cobranza abre o expone `nxPrestamoDocs(id)`.
2. Retirar esa acción únicamente de la tabla, tarjeta o menú de Cobranza.
3. Identificar la ficha real del cliente en Financiamiento:
   - historial crediticio;
   - detalle del cliente;
   - o la pantalla que ya agrupa Resumen/Préstamos/Pagos.
4. Agregar una pestaña `Documentos` en esa ficha.
5. Renderizar los préstamos del cliente que contengan documentos.
6. Incluir préstamos sin documentos con estado vacío compacto y opción de administrar, si el usuario necesita subirlos.
7. Reutilizar `nxPrestamoDocs(id)` para administrar.
8. Mantener permisos, Storage, subida, borrado, descarga, documentos privados y expediente firmado exactamente como están.

## Diseño móvil

No abrir automáticamente una ventana de documentos desde Cobranza.

En la ficha del cliente:

- usar una lista vertical compacta;
- un bloque por préstamo;
- mostrar máximo 3 documentos y luego `Ver todos`;
- botón normal `Administrar`;
- evitar cuatro tiles grandes en una sola fila;
- evitar textos completamente en mayúsculas;
- no usar modal excesivamente ancho.

## Diseño de la ventana existente

Cuando se abra `nxPrestamoDocs(id)` desde la ficha del cliente:

- título: `Documentos del préstamo`;
- subtítulo: nombre del cliente + referencia del préstamo;
- botón estándar de cerrar o volver;
- tiles de subida compactos;
- lista de archivos debajo;
- mantener cédula, contrato, garantía y otro;
- mantener los tipos de expediente firmado de solo lectura.

No usar el encabezado `DOCUMENTOS — FRANCIS` como único contexto, porque no indica a qué préstamo pertenecen los archivos.

## Pruebas obligatorias

- Cobranza ya no muestra ni abre Documentos.
- `Cobrar`, WhatsApp, promesa y estado de cuenta siguen funcionando.
- La ficha del cliente muestra la pestaña Documentos.
- Cliente con un préstamo muestra un bloque.
- Cliente con varios préstamos muestra documentos separados correctamente.
- Un documento nunca aparece asignado al préstamo equivocado.
- Subir un documento actualiza el préstamo correcto.
- Borrar un documento actualiza el préstamo correcto.
- Documentos privados siguen abriendo con URL firmada.
- El expediente firmado sigue visible.
- Sin desborde en 320, 390, 760, 1024 y 1440 px.
- Sin errores de consola.
- `node --check parches.js` limpio.
- Scripts de `index.html` válidos.
- `version.json` válido.

## Restricciones

- No tocar `main` directamente.
- No crear tabla nueva.
- No migrar archivos entre buckets.
- No duplicar `nxPrestamoDocs`.
- No usar observadores DOM ni timers.
- No usar parches que busquen elementos después del render.
- Modificar las funciones reales que generan Cobranza y la ficha del cliente.
- Mantener namespace `.nxFP`.
