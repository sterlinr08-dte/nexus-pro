# Stepper «Onda» · publicado

## Autorización
El dueño escribió «Publícalo» (12-nov-2026) después de ver el video de la variante 3.

## Publicación
- PR #464 (squash) → `main` `011ad27e361b580a01d53c90080cecaa8285739b`.
- Verificado en vivo en nexusprord.com: `parches-seguros.js` trae `parches-stepper.js` y el build `6035`; `parches-stepper.js` responde con la versión `20261112b`.

## Qué quedó en vivo
En el carrito y la factura del POS y en los meses adelantados de «Registrar pago», al tocar − o + sale una onda del botón y destapa el número nuevo. Solo aspecto.

## Apagar si hiciera falta
`localStorage.nx_stepper_off='1'` en un equipo, o quitar la línea de `parches-seguros.js`.

## Pendiente
- Verlo en el POS real y en un iPhone (se probó en un banco con el mismo marcado).
- Mismo stepper en STUDIO y Bayol, y en los boletos de la rifa (`rifa.html`, `vendedor.html`).
- «Costado» en Cobros / Historial de pagos.
