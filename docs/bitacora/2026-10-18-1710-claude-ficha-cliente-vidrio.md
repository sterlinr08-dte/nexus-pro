# 18-oct-2026 — Ficha «Nuevo / Editar cliente» rediseñada (59.44, sin publicar)

## Pedido
El dueño eligió «Rediseño de otra ventana» después de publicar 59.42. Tomé la ficha del cliente (`#mCli`), que es la ventana más larga del sistema después de la de cobro.

## Qué cambia (solo diseño; mismos campos, mismos ids, mismas funciones)
- Capa nueva y aislada al final del `<head>`:
  - `script#nxFichaPaneOn`: pone la clase `html.nx-fcli`.
  - `style#nxFichaPane`.
  - `script#nxFichaPaneJs`.
- **Cómo se apaga:** `NX_FICHA_PANE=false` para todos, o `localStorage.nx_ficha_pane_off='1'` en un equipo.
- **Especificidad:** los selectores van con `#mCli` repetido 4 veces para ganarle a las capas viejas.

**Cabecera y pie**
- Cabecera y pie fijos al desplazarse.
- En el pie queda solo «Guardar cliente» (`#btnGCli`), centrado.
- Título en tipo oración.

**Campos**
- En 2 columnas.
- A todo el ancho: nombre, chips, cumpleaños, títulos de sección, deuda inicial y día de facturación.
- Chips de 44 px (tamaño de dedo).
- Pendientes en cuadrícula.
- Precio personalizado en 2 columnas.

**Secciones**
- Los títulos pierden el «// » y pasan a tipo oración, con la función `oracion()`.
- La tarjeta «Estado y proceso del cliente» viene plegada, con una línea de resumen; se abre tocando el título.
- La tarjeta de precio personalizado va en su propia caja.

**Notas de ayuda**
- La nota de deuda inicial y las dos notas del precio («Deja en blanco…» y «⚡ Este precio…») pasan detrás de la ⓘ, con las reglas de `NX_INFO_REGLAS`.
- `aplicarParen` ahora junta las notas en vez de sobrescribirlas.

**Altura**
- Móvil (390 px): de 3,457 px a 2,280 px.
- Escritorio (1,280 px): 1,978 px.

## Pruebas
- **Guardado igual con la capa encendida y apagada.** Prueba con Playwright y el servidor de prueba:
  - edita un cliente (teléfono, prioridad y ARS) y crea uno nuevo;
  - usa un teléfono al azar en cada corrida y compara lo que se envía a `clientes`.
- **Resultado:** 9 corridas seguidas guardaron lo escrito en los dos modos.
  - En una tanda anterior, una corrida no envió el teléfono una vez, y le pasó también al modo apagado.
  - Por eso es un problema de tiempos de la prueba con el servidor de prueba recién iniciado, no de la capa.
- **Pruebas de regresión:** `qa-tema-glass`, `qa-legibilidad`, `qa-registrar-pago`, `qa-inicio-glass`, `qa-crm` y `qa-custodia`. El resultado está en el mensaje al dueño y en el commit.
- **Capturas:** antes y después, en el *scratchpad* de la sesión. No se suben al repo.

## No se tocó
Supabase, pagos, cálculos ni la lógica de `editarCli` / `guardarCli`. Los `<select>` ocultos siguen siendo la fuente de verdad de los chips.

## Pendiente
- Que el dueño la vea y diga «publícalo».
- 59.43 (ⓘ de 12 px) también está en la rama, sin publicar.

Nota: la hora del nombre sigue la serie de bitácoras de hoy.
