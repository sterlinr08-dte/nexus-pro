# 18-oct-2026 — Ficha del cliente: tamaño de los botones (sigue 59.44, sin publicar)

Sigue a `2026-10-18-1710-claude-ficha-cliente-vidrio.md`.

## Pedido
El dueño: «recuerda el tamaño de los botones» (con la skill `apple-design`).
La regla quedó escrita en `CLAUDE.md`, en la sección «Regla del dueño: tamaño de los botones».

## Medición de `#mCli` antes del arreglo (390 px)
Los chips, la ⓘ y «Guardar» ya cumplían. Fallaban:

| Elemento | Medida |
|---|---|
| Botón «+» de agregar dependiente | 20 × 48 px (aplastado) |
| «×» para quitar un dependiente | 8 × 44 px |
| Casilla «Cliente VIP» | fila de 16 px |
| Casilla «Activar precio especial» | fila de 13 px |
| Casilla «Permitir facturación» | fila de 38 px |
| Casillas de pendientes | filas de 40 px |
| Etiqueta del tipo de cliente | letra de 11 px |
| Campos de dependiente | letra de 10 px |

## Arreglo
Solo CSS, dentro de `style#nxFichaPane`; se apaga junto con la capa.
- Filas de casilla de 44 px como mínimo.
- Casillas de 22 px.
- Botón «+» de 48 × 48 px.
- Chip del dependiente de 44 px, con la «×» de 44 × 44 px.
- Nombre y parentesco del dependiente en 48 px con letra de 16 px; «Cónyuge» ya no se corta.
- «Ajustar» a 48 px con letra de 14 px.
- Etiqueta del tipo de cliente a 13 px.

## Resultado
Medido de nuevo a 390 y 1280 px: **ningún elemento que se toque queda por debajo de 44 px**.
Lo que sigue midiendo menos son títulos de sección, que no se tocan.
No se tocaron ids, funciones ni datos.
