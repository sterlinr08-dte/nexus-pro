# e-CF: 3 ajustes según la documentación de MSeller

**Pedido del dueño:** «Ok» a corregir los puntos 2, 3 y 4 de `2026-10-26-0817-claude-consulta-docs-mseller.md`.
**Rama:** `claude/ecf-mseller`. No se publicó nada y no se desplegó la Edge: la de producción sigue en v9.

## Cambios
1. **Estados «No encontrado» y «Error» de MSeller** (`_emitir.ts`, `ESTADOS`): ahora se guardan.
   - La tarea de cada 15 min deja de consultarlos, porque cada consulta gastaba cuota.
   - Se revisan a mano con «Actualizar».
   - En la caja salen como «DGII no lo encuentra» o «e-CF con error» y cuentan en «Por revisar» (`parches-pos.js`).
2. **429 (cuota del mes agotada)**: ya no se marca «Error».
   - El comprobante queda «pendiente» con el mismo e-NCF, con un mensaje claro.
   - El 408 tampoco se toma como definitivo.
   - Si el seguimiento recibe un 429, se detiene hasta la próxima vuelta.
3. **Consulta en lote**: `_lib.ts` tiene `consultarLote` (`POST /documentos-ecf/status/batch`).
   - El seguimiento consulta en grupos de 50, con una sola llamada de cuota por grupo.
   - Los documentos con `found=false` se dejan para la próxima vuelta.
   - Los «pendiente» se siguen reenviando uno por uno, sin gastar números nuevos.
   - `index.ts` ahora lee también el `ncf` de cada pendiente.
   - Se refactorizó `aplicarConsulta`, que comparten la consulta individual y la del lote.

## Pruebas
- Deno: **38/38**, con 4 pruebas nuevas: 429, estados nuevos, lote y lote con 429.
- `deno check index.ts`: OK.
- `scripts/qa-ecf-caja.mjs`: **59/59**.

## Pendiente
- Desplegar la Edge v10 y publicar la 59.63 cuando el dueño diga «publícalo».
- Sigue faltando el ANECF y lo demás de la lista de MEMORIA.
