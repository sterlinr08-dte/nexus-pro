# Pizzería Unive 2: plan antes de desarrollar y 3 opciones de fondo

**Autor:** Claude · **Rama:** `claude/pizzeria-unive2` · no se tocó código ni base.

**Pedido del dueño (25-oct-2026):** «Antes de comenzar a desarrollar, vamos a planificar bien. Un fondo con los colores. Utiliza todas las skills necesarias.»

**Skills usadas:**
- `puntos-de-control`: opciones con maqueta, el dueño decide, y después el informe;
- `frontend-design`: fondo sacado del mundo de la pizzería;
- `apple-design`: materiales de vidrio y reducir transparencia;
- `the-architect`: el plano completo queda para cuando lleguen las respuestas (la skill no permite plano con preguntas abiertas).

**Opciones de fondo** (https://claude.ai/artifact/NPnaN5m7ZaJoxMnDiVC82k). Las tres son solo con colores, sin foto: cargan al instante.
- **A · Brasa del horno** (recomendada). Degradado cálido que sube desde abajo (Sauce y Tomato) sobre Warm Plate. En oscuro, sobre Deli Brown.
- **B · Mantel de cuadros.** Cuadros de trattoria al 10 % y viñeta. Sale de la foto de la paleta, pero es un patrón detrás del vidrio.
- **C · Caja de pizza.** Fondo liso con grano de harina (SVG feTurbulence) y una franja Tomato arriba.

**Medido con Playwright a 390 y 1280 px, en claro y oscuro:**
- sin desborde;
- controles de 44 px o más;
- 0 errores de JS.
- Se corrigió que el modo oscuro no cambiaba el fondo: el selector `.dark .fA` pasó a `.dark.fA`.

**Plan de trabajo propuesto (orden):**
1. Respuestas del formulario de la dueña.
2. Fondo elegido.
3. Plano completo con `the-architect`, para que el dueño lo apruebe.
4. Montar el esquema POS en `gzdkzcspmvyxgfcytpgy`.
5. Pantalla de venta.
6. Comanda.
7. Cierre de caja.
8. QA a 390 y 1280 px.
9. Activar `unive2.nexusprord.com` con el «publícalo» del dueño.
