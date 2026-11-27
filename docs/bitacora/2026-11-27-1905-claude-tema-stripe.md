# 2026-11-27 19:05 RD · Claude — Apariencia: se quita Premium Blue y entra el tema «Stripe» (sin publicar)

## Pedido del dueño
- Le mostré el sistema de Seguros en 3 estilos (Apple, Stripe, Linear). Preguntó si podían ser temas de **Configuración → Apariencia**, quitando uno oscuro que se ve feo.
- Decidió: «**Quita el Premium Blue y empieza con Stripe**».

## Cómo se hizo (fuente de verdad revisada)
- Los temas se ponen en el `<head>` (`script#nxTemaGlassOscuroOn`, sin parpadeo) y en `aplicarTema()`. La preferencia vive en la base (`nxPref('tema')`) y localmente hay un espejo en `nx_tema`.
- El **Claro** (`html.tema-claro`, style#nxTemaClaro y unas 370 reglas más repartidas en index y parches) ya cubre todas las pantallas. Por eso **Stripe = Claro + paleta Stripe**: en `<html>` van `tema-claro` y `tema-stripe`, y `data-nx-tema` sigue en «clasico» para todo lo que pregunta por el claro.
- **Colores:** `script#nxTemaStripeOn`, al final del `<head>`, antes del primer pintado.
  - Con `tema-stripe` puesto, recorre las hojas de estilo y, **al lado de cada regla** que lleva un azul o una tinta del Claro, inserta una copia con el color de Stripe y la condición `:where(html.tema-stripe)`, que no suma prioridad.
  - Cada copia empata con su original y gana por ir justo después. Es como si esa regla tuviera el color de Stripe, sin cambiar qué regla manda sobre cuál.
  - Se saltan las reglas solo del Glass oscuro, Premium y Liquid Glass, y el modo oscuro del equipo.
  - Vigila los `<style>`/`<link>` que agregan los parches después.
  - Resultado: **1,755 reglas en unos 24 ms**.
  - Colores: azul `#2563EB`→`#533AFD`, `#1D4ED8`→`#4434D4`, tinta `#0F172A`→`#0D253D`, gris `#64748B`→`#64748D`, fondo `#EEF1F5`→`#F6F9FC` (lista completa en el script).
- `style#nxTemaStripe`: el **degradado de colores de arriba** (naranja, rosado, morado y celeste) en lugar de la foto de la oficina. Stripe no descarga esa foto.
- Primero se probó una hoja aparte, generada con las copias. Se descartó: le subía la prioridad a las copias y la pestaña activa salía con letra oscura sobre morado (1.89:1). Con las copias al lado de su original, eso no pasa.
- Paleta: `github.com/VoltAgent/awesome-design-md` → `design-md/stripe/DESIGN.md` (MIT). Solo colores; no lleva marca de Stripe.

## Premium Blue
- **Ya no aparece en Apariencia.**
- Quien lo tenga guardado pasa solo al **Glass oscuro** y queda guardado así.
- «Automático» con el celular en oscuro usa Glass oscuro. La migración vieja de «dark» también va a Glass oscuro.
- Premium queda solo como respaldo interno si alguien apaga el Glass oscuro (`NX_TEMA_GLASS_OSCURO=false`).

## Quién lo ve
- **Stripe sale en Apariencia solo para el administrador.** Para todos, poner `window.NX_TEMA_STRIPE_TODOS=true` cuando el dueño lo apruebe.
- El botón sol/luna vuelve al último tema claro elegido: Claro o Stripe (`nx_tema_luz`).
- Interruptor: `NX_TEMA_STRIPE=false` en el `<head>` → quien lo tenga ve el Claro.
- Las tiendas (POS y demo) siguen siempre en Claro, como antes.

## Archivos
- `index.html`: arranque del tema, `aplicarTema`, `toggleDarkMode`, `cargarTemaGuardado`, `rApariencia` y el bloque nuevo antes de `</head>`.
- `scripts/qa-tema-stripe.mjs` y `scripts/qa-tema-stripe-contraste.mjs` (nuevos).
- No hay migración, RPC ni Edge Function.

## Pruebas (app real contra `scripts/qa-crm-mock-server.js`)
- `qa-tema-stripe.mjs`: **37/37**, a 390 y 1280 px.
  - Clases correctas, morado `#533afd` y fondo `#f6f9fc`. El primer pintado ya sale con Stripe.
  - Sin desplazamiento de lado en Inicio, Clientes, Facturas, Cobros, Custodia, Registrar pago y Apariencia.
  - Apariencia: sin Premium, con Stripe marcado como activo.
  - Premium guardado pasa a Glass oscuro; el Claro sigue azul y el Glass oscuro no cambia. Sin errores de la página.
- `qa-tema-stripe-contraste.mjs`: en 10 pantallas, a 390 y 1280 px, **ningún texto empeora** de contraste frente al Claro.
- **No verificado:** el iPhone real con datos reales, ni los módulos no revisados uno por uno (Préstamos, Vehículos, Rifas, Contabilidad en detalle). Por eso por ahora solo lo ve el administrador.

## Siguiente paso
- El dueño lo prueba en su celular (Configuración → Apariencia → Stripe) y dice «Publícalo».
- Después: abrirlo para todos y seguir con Apple y Linear con el mismo método.
