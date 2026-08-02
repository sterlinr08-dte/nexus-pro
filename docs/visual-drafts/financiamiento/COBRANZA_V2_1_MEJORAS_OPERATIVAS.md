# COBRANZA V2.1 — Mejoras operativas y correcciones obligatorias

## Objetivo
Convertir la vista actual de Cobranza en una herramienta operativa real, sin crear tablas nuevas ni romper el flujo existente. Trabajar únicamente sobre las funciones actuales del módulo Financiamiento dentro de `parches.js`.

## Restricciones
- No publicar directo a `main`.
- No usar observadores DOM, timers ni parches posteriores al render.
- No duplicar funciones ya existentes.
- Reutilizar acciones y datos reales del módulo.
- Mantener responsive móvil y escritorio.
- Mantener namespace CSS `.nxFP`.
- No agregar botones gigantes ni ventanas anchas.

## 1. Corregir clasificación de prioridad

Reemplazar el modelo actual por cinco grupos:

- `critico`: más de 30 días vencido.
- `alta`: entre 8 y 30 días vencido.
- `morareciente`: entre 1 y 7 días vencido.
- `porvencer`: próxima cuota entre hoy y 7 días.
- `aldia`: resto de préstamos activos.
- Préstamos pagados: fuera de Cobranza.

No guardar la prioridad en Supabase. Debe seguir siendo derivada.

Agregar etiquetas:

```js
const PR_COB_LBL = {
  critico: 'Crítico',
  alta: 'Alta prioridad',
  morareciente: 'Mora reciente',
  porvencer: 'Por vencer',
  aldia: 'Al día'
};
```

Orden:

```js
const PR_COB_ORD = {
  critico: 0,
  alta: 1,
  morareciente: 2,
  porvencer: 3,
  aldia: 4
};
```

## 2. Corregir KPIs engañosos

Eliminar los nombres actuales `COBRAR HOY` y `COBRAR ESTA SEMANA`, porque no corresponden con lo que calculan.

Usar estos KPI:

1. `SALDO CRÍTICO`
   - suma del saldo de préstamos con más de 30 días vencidos.

2. `SALDO VENCIDO`
   - suma del saldo de préstamos con 1 a 30 días vencidos.

3. `VENCE EN 7 DÍAS`
   - suma del saldo de préstamos `porvencer`.

4. `PAGOS REGISTRADOS HOY`
   - mantener cálculo actual usando `_pagosByPrestamo`.

5. `TOTAL POR COBRAR`
   - mantener suma de cartera activa.

Subtextos:
- Saldo crítico: `N préstamos con más de 30 días`.
- Saldo vencido: `N préstamos vencidos entre 1 y 30 días`.
- Vence en 7 días: `N préstamos próximos a vencer`.

## 3. Orden operativo correcto

Dentro de cada prioridad, ordenar por:

1. Mayor cantidad de días vencido.
2. Fecha de próximo pago más cercana.
3. Mayor saldo pendiente.

No ordenar únicamente por saldo.

## 4. Modelo derivado único para evitar recálculos

Crear una colección derivada una sola vez por render:

```js
function prCobranzaModelo() {
  return _prestamos.map(p => ({
    p,
    prio: prPrioridadCobranza(p),
    saldo: saldoDe(p),
    prox: prProximoPago(p),
    diasVencido: prDiasVencido(p),
    ultimoPago: prUltimoPagoResumen ? prUltimoPagoResumen(p) : null
  })).filter(x => x.prio);
}
```

Reutilizarla para:
- KPIs.
- pestañas.
- resumen lateral.
- tabla.
- exportación.

No llamar repetidamente `prCobranzaConPrioridad()` para cada bloque.

## 5. Cambiar pestaña inicial

La vista no debe abrir en `Todos`.

Agregar pestaña inicial:

- `pendientes`: incluye crítico, alta, mora reciente y por vencer.

Orden de pestañas:

1. Pendientes.
2. Críticos.
3. Alta prioridad.
4. Mora reciente.
5. Por vencer.
6. Al día.
7. Todos.

Valor inicial:

```js
let _prCobTab = 'pendientes';
```

Cuando se vuelva a entrar a Cobranza, debe iniciar nuevamente en `pendientes`.

## 6. Mejorar buscador

El buscador debe filtrar por:

- nombre.
- cédula.
- teléfono.
- referencia del préstamo.

Construcción sugerida:

```js
const b = [
  x.p.nombre,
  x.p.cedula,
  x.p.telefono,
  prRef(x.p)
].filter(Boolean).join(' ').toLowerCase();
```

Placeholder:

`Nombre, cédula, teléfono o referencia…`

## 7. Acción principal Registrar pago

La finalidad principal de Cobranza es cobrar.

Agregar en cada fila un botón principal compacto:

- Texto escritorio: `Registrar pago`.
- Texto móvil: `Cobrar`.
- Debe reutilizar la función real existente para abrir el formulario de pago del préstamo.
- No inventar nombres de funciones. Localizar la acción real actual dentro del detalle o lista de préstamos.

Mantener acciones secundarias:
- Ver detalle.
- Editar.
- Estado de cuenta.
- WhatsApp.

En escritorio:
- botón principal visible.
- acciones secundarias compactas.

En móvil:
- botón Cobrar.
- WhatsApp.
- menú compacto para las demás acciones si la fila queda saturada.

## 8. Exportación específica de Cobranza

No usar `nxPrestamoExportar()` sin validar, porque puede exportar el listado general.

Crear una exportación específica:

```js
window.nxPrCobranzaExportar = function () { ... }
```

Debe respetar:
- pestaña activa.
- búsqueda actual.
- orden actual.

Columnas:
- Referencia.
- Cliente.
- Cédula.
- Teléfono.
- Saldo pendiente.
- Próximo pago.
- Días vencido.
- Prioridad.
- Fecha de último pago, si existe.
- Monto de último pago, si existe.

Nombre:

`cobranza-[filtro]-AAAA-MM-DD.xlsx`

Reutilizar el motor de exportación existente del sistema. No agregar una librería nueva.

## 9. Mejorar tabla

Columnas recomendadas en escritorio:

- Cliente.
- Contacto.
- Saldo pendiente.
- Próximo pago / días vencido.
- Último pago.
- Prioridad.
- Acción principal.
- Más acciones.

La referencia puede mostrarse debajo del nombre para reducir ancho.

En móvil, cada tarjeta debe mostrar:

- Nombre y referencia.
- Teléfono.
- Saldo.
- Estado temporal: `18 días vencido` o `Vence el 08/08/2026`.
- Prioridad.
- Botones Cobrar y WhatsApp.

No mostrar cédula completa como dato principal en móvil.

## 10. Resumen lateral

Cambiar el contenido a:

- Total pendientes.
- Críticos.
- Alta prioridad.
- Mora reciente.
- Por vencer.
- Saldo vencido total.

En móvil, el resumen debe aparecer antes de la lista como franja compacta o acordeón. No dejarlo al final después de todos los registros.

## 11. Paginación

Agregar paginación propia para Cobranza:

```js
let _prCobPage = 1;
const PR_COB_PAGE_SIZE = 25;
```

- Reiniciar página al cambiar pestaña o búsqueda.
- Mostrar `Mostrando X–Y de Z`.
- No renderizar toda la cartera de una vez.

## 12. Accesibilidad y errores

Cambiar:

```js
event.keyCode == 13 || event.keyCode == 32
```

por:

```js
event.key === 'Enter' || event.key === ' '
```

Agregar `aria-label` descriptivo a la fila.

No usar `catch (e) {}` silencioso en inicialización de Cobranza. Usar:

```js
catch (error) {
  console.error('[Cobranza] Error al inicializar:', error);
}
```

## 13. CSS

Agregar estilo para `morareciente`:

```css
.nxFP-tBadge.morareciente {
  background: #fef3c7;
  color: #92400e;
}
```

Usar:
- rojo: crítico.
- naranja: alta prioridad.
- ámbar: mora reciente.
- amarillo: por vencer.
- verde: al día.
- azul institucional: acciones principales.

No usar colores inline nuevos en cada tarjeta. Centralizar los estilos de Cobranza.

## 14. Pruebas obligatorias

Agregar pruebas para:

1. 31 días vencido → crítico.
2. 30 días vencido → alta.
3. 8 días vencido → alta.
4. 7 días vencido → mora reciente.
5. 1 día vencido → mora reciente.
6. vence hoy → por vencer.
7. vence en 7 días → por vencer.
8. vence en 8 días → al día.
9. pagado → excluido.
10. pestaña inicial `pendientes` excluye `aldia`.
11. búsqueda por teléfono.
12. búsqueda por referencia.
13. orden por días vencido antes que saldo.
14. exportación respeta filtro y búsqueda.
15. paginación 25 registros.
16. botón Registrar pago abre la acción real.
17. sin desborde en 390, 760, 1280 y 1600 px.
18. sin errores de consola.
19. `node --check parches.js` limpio.
20. `APP_VERSION` sincronizado con `version.json`.

## Criterio de aceptación

La pantalla debe permitir responder rápidamente:

- ¿Quién requiere gestión hoy?
- ¿Cuánto está realmente vencido?
- ¿Cuál cliente lleva más tiempo atrasado?
- ¿Cómo registro el pago inmediatamente?
- ¿Qué lista exacta estoy exportando?

No considerar terminada la mejora si solo cambia textos, colores o tarjetas sin corregir la lógica operativa.