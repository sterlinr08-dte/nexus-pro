# Pizzería Unive 2: paleta elegida por la dueña

**Autor:** Claude · **Rama:** `claude/pizzeria-unive2`

**Decisión de la dueña (25-oct-2026, vía el dueño):** paleta «Dopely Palette 02».

| Nombre | Hex | Uso propuesto |
|---|---|---|
| Tomato Red | `#8C1D18` | Color de marca y botón principal (Cobrar), con texto blanco |
| Sauce Orange | `#D9472B` | Solo para detalles grandes: chip activo con letra en negrita de 18 px o más, ilustraciones, barra del pedido. **No para letra chica** |
| Pasta Cream | `#F6C6A8` | Opción elegida, chips y fondos de tarjetas destacadas |
| Warm Plate | `#FFF1E6` | Fondo general en modo claro |
| Deli Brown | `#2D211B` | Texto principal y fondo del modo oscuro (en lugar de negro puro) |

**Contraste medido (WCAG), cifras de este cálculo:**

| Combinación | Contraste | Resultado |
|---|---:|---|
| Blanco sobre Tomato | 9.11 | ✅ |
| Deli sobre Plate | 14.11 | ✅ |
| Deli sobre Cream | 10.08 | ✅ |
| Tomato sobre Plate | 8.24 | ✅ |
| Blanco sobre Sauce | 4.30 | ❌ letra normal (pide 4.5); ✅ letra grande |
| Sauce sobre Plate | 3.88 | ❌ letra normal |
| Deli sobre Sauce | 3.63 | ❌ letra normal |

**Riesgo anotado:** el rojo de marca coincide con el rojo de «peligro».
- Anular, borrar y faltante en el cuadre **no se marcan solo con color**: llevan ícono, texto y confirmación.
- El color de error usa un tono distinto del de marca.

**Alcance:** la paleta aplica **solo a la instancia `unive2`**. El estilo NEXUS (`DESIGN.md`) se mantiene para lo demás.
