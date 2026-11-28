# 2026-11-27 20:55 RD · Claude — Revisión crítica de lo publicado hoy (#561, #563, #565) (sin publicar)

Sigue a `2026-11-27-1956-claude-temas-apple-linear-publicado.md`.

## Pedido
El dueño (por medio de Muse) pidió revisar con ojo crítico lo publicado el 27-nov: `/negocios`, el retiro de Premium Blue, el tema Stripe y los temas Apple y Linear. Pidió solo revisar, sin tocar `main` y sin publicar, y proponer las correcciones en una rama `claude/*`.

## Cómo se revisó
- Diff de `76fa0b6..9723df0` en `index.html`: arranque del tema en el `<head>`, `script#nxTemasPaletaOn`, `aplicarTema`, `cargarTemaGuardado`, `nxTemaPaletaVisible`/`nxStripeVisible`, `rApariencia` y `toggleDarkMode`.
- Pruebas de siempre contra `scripts/qa-crm-mock-server.js`:
  - `qa-tema-stripe.mjs`: 106/106.
  - `qa-tema-stripe-contraste.mjs`: Stripe, Apple y Linear, ningún texto empeora.
- **Prueba nueva: `scripts/qa-tema-revision.mjs`.** Simula aquí las preferencias (con retraso y conteo de guardados) y `mi_es_superadmin`, y compara con la versión anterior (`QA_VIEJO`, worktree de `76fa0b6` en otro puerto).
  - **Oráculo:** en cada elemento visible y cada color, el tema de paleta debe dar exactamente «color del tema base pasado por su paleta». Si da otro color, una copia cambió qué regla gana.
  - Glass oscuro y Claro: 1,514 a 1,588 elementos con 9 propiedades cada uno, comparados con la versión anterior.

## Errores encontrados (corregidos en esta rama)
1. **Se podían borrar las preferencias del usuario.** Archivo `index.html`, `aplicarTema`, línea del «Premium Blue retirado».
   - El caso: alguien entra con usuario y clave en un equipo cuyo espejo local `nx_tema` todavía dice `premium`.
   - `iniciarApp()` llama a `cargarTemaGuardado()` **antes** de leer la base. Con `premium`, `aplicarTema` forzaba `guardar=true` y `nxPrefSet` mandaba a la base `datos = {tema:'glass-oscuro'}` a los 900 ms. La base se lee después de bajar todos los datos.
   - Resultado: se pierden todas las demás preferencias (dónde se quedó, avisos leídos, vista de tarjetas, la marca `tema_glass_oscuro_v1`…). Además se pisa el tema elegido en otro equipo, por ejemplo Stripe.
   - Reproducido: la versión nueva manda `{"tema":"glass-oscuro"}` y la anterior no manda nada.
   - **Corrección:** solo se fuerza el guardado si `_prefsListas`. Con la base ya leída, la migración de Premium sigue igual: se guarda una vez y en la segunda carga no se repite.
2. **Equipo compartido.** Archivo `index.html`, `aplicarTema` (guarda `nx_tema_luz` y `nx_tema_noche`) y `toggleDarkMode`.
   - El caso: si el dueño usó Stripe en una PC, otro administrador que toca sol/luna en esa misma PC recibía Stripe, y le quedaba guardado. Desde ese momento también lo veía en Apariencia.
   - **Corrección:** las dos claves llevan el id del usuario (`nx_tema_luz_<id>`).
   - Efecto secundario: el valor viejo sin id se ignora una vez. El dueño vuelve al Claro con sol/luna hasta que elija Stripe de nuevo.

## Lo que está bien (verificado)
- **Glass oscuro y Claro:** clases, primer pintado y estilos idénticos a la versión anterior en Inicio, Clientes, Facturas, Custodia y Config, a 390 y a 1280 px.
- **Copias `:where(...)`:**
  - El oráculo da 0 diferencias en Stripe, Apple y Linear, a 390 y a 1280 px, en unos 18,000 valores por caso. Ninguna copia cambia qué regla gana ni toca reglas de otro tema.
  - Procesar dos veces no duplica nada. Stripe → Apple → Stripe no acumula copias.
  - Un `<style>` nuevo o con el texto reemplazado sí se copia.
- **Premium guardado en la base:** pasa a Glass oscuro con un solo guardado, sin bucle.
- **«Automático» con el celular oscuro:** Glass oscuro desde el primer pintado, sin reescribir «auto».
- **«dark» viejo:** pasa a Glass oscuro una sola vez.
- **Quién ve los temas:** el dueño (`mi_es_superadmin` = sí, con `API.token`) ve los 3. Otro administrador y los agentes no ven ninguno. Premium no aparece para nadie.
- **Tiendas:** siempre en Claro, aunque el espejo diga stripe, apple o linear y aunque se llame `aplicarTema`. Lo guardado no cambia.
- **Parpadeo:** con la CPU 6 veces más lenta y la red lenta, todos los cuadros con `<body>` ya salen con el color del tema.
- **`/negocios`:**
  - Sin desplazamiento de lado y 0 errores.
  - Todo lo que se toca mide 44 px o más. Los botones miden 48 px.
  - Los 5 destinos existen.
  - Sin precios. «14 días gratis · Sin tarjeta · Sin permanencia» coincide con `registro.html` y con `DIAS_PRUEBA = 14` en `registro-tienda`.

## Límites (no son errores hoy)
- El mecanismo no copia cuatro casos:
  - un `<style>` que llega dentro de un bloque con `innerHTML`;
  - un cambio del nodo de texto con `.data`;
  - reglas agregadas con `insertRule`;
  - reglas para `<html>` escritas sin «html», como `.tema-claro{}` o `[data-nx-tema]{}`.
- Hoy ningún archivo usa ninguno de los cuatro con colores de la paleta (revisado con grep). Si alguno aparece, ese color quedaría como en el tema base.
- Se saltan unas 10 reglas con `body:not(.tema-premium)` (`parches-sidebar-curva.css`) porque mencionan Premium. En las pantallas revisadas no se ven: las tapan reglas del Claro.
- Rendimiento: con la CPU 4 veces más lenta, el observador no suma un costo medible en Chromium (la diferencia es ruido). No se midió en un iPhone real.
- `/negocios`:
  - La sección «Para aseguradoras» solo tiene «Crear mi tienda», que crea un punto de venta; Seguros no se registra solo. Además, el cliente es una corredora, no una aseguradora.
  - Las cifras del ejemplo (48,300 · 37 · 12) no dicen «ejemplo» en pantalla.
  - La imagen para compartir es de 180 px, chica para WhatsApp.

## No verificado
- iPhone real con la sesión del dueño (Safari: rendimiento del observador y primer pintado).
- `nexusprord.com/negocios` en vivo: la consulta quedó esperando un permiso que nadie respondió.
- Módulos no recorridos por el oráculo: Préstamos, Vehículos, Rifas, POS por dentro y los estados `:hover` y animaciones.

## Rama y archivos
- Rama `claude/revision-temas-paleta`, **sin PR y sin publicar**.
- `index.html`: 2 correcciones.
- `scripts/qa-tema-revision.mjs`: nuevo.
- Esta bitácora.
- Pruebas después de corregir: `qa-tema-stripe.mjs` 106/106; `qa-tema-revision.mjs` 59 PASS · 0 FAIL, más 4 límites documentados.

## Siguiente paso
El dueño decide si publica la corrección 1 (urgente: puede borrar preferencias al entrar) y la 2.
