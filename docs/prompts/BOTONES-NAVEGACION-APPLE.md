# Prompt reutilizable — Botones de barra de navegación estilo Apple (animados y «smart»)

Origen: NEXUS PRO 59.00 (01-oct-2026), capa `parches-nav-botones.js` + prueba `scripts/qa-nav-botones.mjs`.
Sirve para cualquier proyecto web (HTML/JS, React, Vue…). Copia el bloque de abajo tal cual en la sesión de Claude del otro proyecto
y cambia solo lo que está entre `<…>`.

---

## Prompt (copiar y pegar)

```text
/apple-design

Audita TODOS los botones de barra de navegación de las ventanas/modales/hojas de este proyecto
(Atrás, Cerrar, Volver, ✕, ←) y unifícalos al estilo Apple, en el lugar correcto, con animaciones y comportamiento «smart».

Contexto del proyecto:
- Tema/estilo visual: <oscuro con cristal | claro | …>. Contenedor de las ventanas: <p. ej. .overlay.open > .modal > .mt>.
- No publicar a producción sin mi autorización. Trabajar en una rama aparte. No cambiar lógica de negocio ni datos.

FASE 0 — Auditoría (antes de tocar nada):
1. Cuenta todas las cabeceras de ventana y clasifica sus botones: ✕ propia, flecha ←, «Volver» con texto, «Cerrar» con ícono de flecha.
2. Busca código que INYECTE botones automáticamente en las ventanas (observers, scripts globales) y los duplicados que provoca.
3. Busca reglas CSS que pisen estilos genéricos (selectores con #id + !important, capas que suben font-size mínimos,
   transiciones con !important) para saber qué peso de selector necesitas.
4. Escribe una prueba automática (Playwright, 390 px iPhone y 1280 px escritorio) que abra las ventanas reales y mida:
   cuántas salidas visibles hay, de qué lado, tamaño, forma, ícono, contraste y si el título está centrado.
   Córrela SIN el cambio para tener el «antes» (número de fallos).

REGLAS DE UBICACIÓN (HIG de Apple):
- Cerrar (✕) SIEMPRE a la derecha: es la salida de una ventana abierta desde una pantalla.
- Atrás (‹ chevron, no flecha) a la IZQUIERDA y solo cuando la ventana está ENCIMA de otra ventana abierta (volver a la anterior).
- Una sola salida por acción: si hay ← y ✕ que hacen lo mismo, queda una. Si la ventana no tiene salida, se le da una ✕.
- «← Cerrar» se muestra como ✕. «← Volver» en una ventana suelta (no apilada) también es ✕.
- Título centrado entre ambos lados (espaciador del tamaño del botón en el lado vacío).
- NO cambiar el onclick/handler de ningún botón: solo ícono, lugar, aspecto y aria-label («Cerrar» / «Volver»).
  El texto suelto («Volver», «Cerrar») se envuelve en un span oculto, no se borra.

ASPECTO:
- Círculo de cristal: 44×44 px en móvil (objetivo táctil HIG) y 36×36 en escritorio, con área táctil ampliada 6 px alrededor.
- Fondo translúcido + borde fino + brillo interior + backdrop-filter blur; ícono claro con contraste ≥ 4.5:1; foco visible.
- Mismo componente para Atrás y Cerrar.

ANIMACIONES (resortes reales, no ease genérico):
- Calcula curvas CSS linear() desde la fórmula de resorte de Apple (response 0.35 s; damping 1.0 / 0.8 / 0.7)
  con respaldo cubic-bezier si el navegador no soporta linear().
- Entrada: el botón se materializa con la ventana (escala .4→1 + desenfoque 6→0 px + opacidad, damping 0.8);
  la ✕ entra 50 ms después girando −90°→0. Se repite cada vez que la ventana se vuelve a abrir.
- Pulsado en pointer-down (no esperar al click; iOS necesita una clase vía JS porque :active no basta), visible ≥ 90 ms:
  se hunde a escala ~.86 en 90 ms y vuelve con leve rebote (damping 0.7). Arrastrar fuera cancela sin ejecutar.
- Micro-gestos: con mouse la ✕ gira 90° y la ‹ se adelanta 2 px hacia donde lleva; al tocar, igual.
- Aplicar las transiciones con el peso necesario para que ninguna otra regla las retrase.

«SMART»:
- Clasificación automática al abrir cada ventana (MutationObserver procesado en microtarea, antes del pintado: sin parpadeo
  ni salto). Apilada = hay otra ventana abierta debajo.
- Esc = la salida de la ventana de arriba (‹ si está apilada, si no ✕). Respetar a quien ya maneja Esc
  (buscadores, filtros, listas, menús abiertos, eventos con preventDefault). Tooltip «Cerrar (Esc)» en escritorio.
- Móvil: deslizar la cabecera hacia abajo para cerrar, con agarradera de 36×5 px:
  histéresis de 10 px, decidir vertical vs. horizontal, seguir el dedo 1:1 desde donde se apoyó (sin saltos),
  resistencia progresiva hacia arriba (rubber-band: x·d·0.55/(d+0.55·|x|)),
  al soltar proyectar el impulso con la fórmula de Apple (v·0.998/(1−0.998), v en px/ms),
  cerrar si la proyección pasa la mitad de la ventana (mín. 120 px, máx. 220 px) tocando el botón real (mismo handler),
  vibración corta en Android; si no, volver con resorte damping 1.0. Dejar la ventana sin desplazamiento para la próxima vez.
- Accesibilidad: prefers-reduced-motion = solo fundido (sin escala, giro ni rebote);
  prefers-reduced-transparency = fondo sólido; prefers-contrast: more = borde marcado.

ENTREGA:
- Implementarlo como UNA capa aislada y reversible (un archivo nuevo + una línea que lo carga), sin editar ventana por ventana.
- Prueba automática con: ubicación, una sola ✕, sin flecha indebida, tamaño/forma, ícono sin texto visible, título centrado,
  que la ✕ cierre y la ‹ vuelva a la ventana de abajo, entrada, hundido medido, cancelar arrastrando fuera, Esc suelta/apilada,
  deslizar 1:1 (±2 px), deslizar corto vuelve, deslizar largo cierra y limpia, movimiento reducido; sin errores de consola.
  Correr también las pruebas existentes del proyecto para descartar regresiones.
- Mostrarme: hoja de capturas antes/después (390 px) y un GIF con las animaciones ralentizadas 10×
  (CDP Animation.setPlaybackRate) para verlas en el teléfono.
- Explicarme en simple qué cambió, qué queda fuera (cabeceras que no siguen el patrón principal) y esperar mi «publícalo».
```

---

## Valores de referencia (los que usó NEXUS PRO)

| Elemento | Valor |
|---|---|
| Tamaño | 44 px móvil (≤ 768 px) · 36 px escritorio · área táctil +6 px |
| Fondo / borde | `rgba(255,255,255,.10)` · `1px rgba(255,255,255,.16)` · brillo `inset 0 1px 0 rgba(255,255,255,.14)` |
| Ícono | `#F1F5F9`, 18 px móvil / 16 px escritorio (Tabler `ti-x`, `ti-chevron-left`) |
| Hover / pulsado | fondo .16 / .22 · escala .86 en 90 ms |
| Foco | `outline 2px #60A5FA`, offset 2 px |
| Resorte damping 1.0 | `linear(0,.024,.082,.158,.243,.33,.413,.491,.562,.626,.682,.731,.774,.81,.841,.868,.89,.909,.925,.938,.949,.958,.965,.972,.977,.981,.984,.987,1)` · 370 ms |
| Resorte damping 0.8 | `linear(0,.019,.068,.136,.216,.302,.389,.473,.553,.626,.692,.751,.802,.846,.883,.914,.94,.96,.976,.989,.998,1.005,1.009,1.013,1.014,1.015,1.015,1.015,1)` · 320–420 ms |
| Resorte damping 0.7 | `linear(0,.025,.088,.176,.278,.385,.491,.591,.682,.763,.832,.889,.936,.972,1,1.02,1.033,1.041,1.045,1.046,1.044,1.041,1.037,1.032,1.027,1.022,1.018,1.014,1)` · 370 ms |
| Proyección de impulso | `destino = desplazamiento + v·0.998/(1−0.998)` (v en px/ms) |
| Rubber-band | `x·d·0.55 / (d + 0.55·|x|)` |

Para generar otras curvas de resorte (response `r` s, damping `z`): `ω = 2π/r`;
si `z < 1`: `x(t) = 1 − e^(−zωt)·(cos(ω_d t) + (zω/ω_d)·sin(ω_d t))`, `ω_d = ω·√(1−z²)`;
si `z = 1`: `x(t) = 1 − e^(−ωt)·(1 + ωt)`. Muestrear ~28 puntos hasta que se asiente y escribirlos en `linear(…)`.

## Trampas encontradas en NEXUS PRO (revisarlas en otros proyectos)

1. Un script global inyectaba una flecha ← en TODAS las ventanas → duplicado con la ✕. Se ocultó/convirtió, no se borró.
2. Reglas `#idVentana .btn{border-radius:13px!important}` → hizo falta `:not(#_n):not(#_n)` para ganar en peso.
3. Una capa de legibilidad sube cualquier `font-size` < 11 px → no usar `font-size:0` para ocultar texto; envolverlo en un span oculto.
4. Otra regla con `transition … !important` retrasaba el hundido ~100 ms → transiciones propias con `!important`.
5. Si se convierte la flecha en ✕ antes de que corra el inyector, el inyector vuelve a poner otra → marcar la cabecera para que la ignore.
6. Medir tamaños con `offsetWidth` (no `getBoundingClientRect`) mientras haya animación de entrada.
