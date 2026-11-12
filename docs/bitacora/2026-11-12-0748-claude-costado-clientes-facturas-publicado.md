# «Costado» en Clientes y Facturas · publicado

## Autorización
El dueño escribió «Publícalo» (12-nov-2026) después de ver las capturas. Antes había escrito «1 y 2…», que era ambiguo; se le preguntó y confirmó.

## Publicación
- PR #462 (squash) → `main` `fb64774b607ceafcee43da7a0c4c2715ea72b313`.
- Verificado en vivo en nexusprord.com: `parches-seguros.js` trae `parches-costado.js` y el build `6034`; `parches-costado.js` responde 200 con la versión `20261112a`.

## Pruebas antes de unir
- `scripts/qa-costado.mjs`: una corrida dio 35 PASS · 1 FAIL mientras otra tarea cargaba la máquina (no se anotó cuál); las dos corridas siguientes dieron 36 PASS · 0 FAIL. Se trata como intermitencia de tiempo de la prueba, no confirmada.

## Apagar si hiciera falta
`localStorage.nx_costado_off='1'` en un equipo, o quitar la línea de `parches-seguros.js`.

## Pendiente
- Probar en un iPhone real y con datos reales.
- La rama `claude/review-claude-md-jpzk7k` en GitHub tiene 96 archivos que no están en `main`: no se tocó; falta revisar con el dueño qué contiene.
- Siguiente: stepper (variantes 1 y 2 del reel `Dfor45ND65b`) y más lugares para «Costado» (inventario hecho el 12-nov: Cobros / Historial de pagos y tareas del CRM en NEXUS; búsqueda de clientes en Bayol).
