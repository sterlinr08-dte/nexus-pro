# Inicio en vidrio, parte 1: estilo y saludo (59.34, sin publicar) — Claude

- **Pedido del dueño:** «Empieza con Nexus». El dueño aprobó la demo del Inicio en vidrio (https://claude.ai/artifact/7BmwtpQqsg3K62gywmauAQ, inspirada en Pane). Esta es la parte 1 de 4: estilo y saludo. Faltan:
  2. Lo próximo y pendientes;
  3. buscador y ficha del cliente;
  4. anillos del ciclo, cuando se defina la meta.
- **Fuente revisada:** el Inicio real ya era el «Inicio glass» 58.88 (`#nxIG`, que llenan `rDash()`, `rChartCobros()` y `nxIGPreparar()`), con sus capas de tema:
  - `#nxInicioGlass` (base);
  - glass oscuro (`html.tema-glass-oscuro`);
  - modo claro (`html.tema-claro`, §8);
  - «Hoy, en vivo» (`.nxCV`).

  No se rehízo: se restilizó encima.
- **Rama:** `claude/inicio-vidrio`, sacada de `main` (59.33). Es una rama propia y no `claude/review-claude-md-jpzk7k`, porque esa tiene 59.28/59.29 y otros cambios sin publicar que no deben mezclarse.
- **Archivo:** solo `index.html`.
  - **Capa nueva** `<style id="nxInicioPane">` con su interruptor `<script id="nxInicioPaneOn">`, justo antes de `</head>` y después de todas las capas del Inicio. Todo cuelga de `html.nx-ig.nx-pane #nxIG`, así que ninguna otra pantalla cambia.
    - **Claro:** tarjetas de vidrio blanco sobre manchas suaves lila, azul y durazno.
    - **Oscuro:** vidrio oscuro con manchas violeta y azul. En el glass oscuro se conserva su escena de fondo.
    - Las manchas se apagan antes de los bordes, para que nunca se vea el rectángulo.
    - Sin `backdrop-filter` en las tarjetas, para no pesar en el iPhone.
    - Radios de 22 px; sombra y filo de luz arriba.
    - Al tocar, la tarjeta se encoge (`scale(.98)`) con resorte.
    - Acento con degradado violeta → azul en «Ciclo actual», el prospecto resaltado, las barras, el día de hoy del calendario y la línea de «Cobros del ciclo» y de «Hoy, en vivo» (solo cambia el color, el trazo es el mismo).
    - Títulos de sección sin la raya azul.
    - Accesos rápidos en píldoras de vidrio.
    - Respeta «reducir transparencia» y «reducir movimiento».
  - **Saludo más grande** (30–42 px, peso 800), con una línea de fecha encima, `#nxIGFecha`, que dice por ejemplo «Domingo, 18 de octubre · faltan **2 días** para el corte».
    - La escribe la función nueva `nxIGFechaTxt()` con `hoyRD()` y el corte 20 → 20, desde `nxIGPreparar()` antes de mostrar la app.
    - Tiene alto fijo, así que no salta.
    - Con la capa apagada, la línea se oculta.
  - `APP_VERSION` pasa a `'59.34'`.
- **Sin tocar:** Supabase, cálculos, consultas, cifras y lógica. Solo cambian CSS y la línea de fecha.
- **Cómo apagarla:**
  - para todos: `NX_INICIO_PANE=false`;
  - en un equipo: `localStorage.setItem('nx_inicio_pane_off','1')` y recargar.

  Así el Inicio vuelve a ser idéntico a 59.33.
- **Pruebas:**
  - `scripts/qa-inicio-glass.mjs`: **129 PASS · 0 FAIL**. Cubre 390 y 1280 px, admin y agente, cifras iguales al Inicio clásico, sin saltos del esqueleto a los datos, sin desborde, letras ≥12 px, toques ≥44 px y el Buzón igual.
  - La primera corrida dio 2 FAIL por un salto de 16 px en el celular. La causa: «Ciclo actual» quedaba en dos columnas y el texto largo bajaba a dos líneas. Ahora va siempre en una columna en el celular.
  - Capturas en claro (clásico), glass oscuro y premium a 390, 1024 y 1280: sin errores de consola. En premium el saludo grande se cortaba al lado del buscador; corregido, ahora se ajusta en varias líneas.
- **Publicación:** NO publicado. Esperar «publícalo».
- **Siguiente paso:** el dueño mira el estilo. Si le gusta, se sigue con la parte 2 (Lo próximo y pendientes) en esta misma rama.
