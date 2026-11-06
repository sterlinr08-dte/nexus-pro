# 06-nov-2026 · 59.82 · Facturas, Cobros e Historial de pagos más claros (RAMA, sin publicar)

## Pedido
- El dueño pidió agentes programadores y diseñadores para hacer mejoras y ajustes en NEXUS PRO. A este agente le tocó: pantallas de Facturas, Cobros e Historial de pagos, **solo lo visual y la claridad**.
- Rama: `claude/mejoras-facturas-ui`. Sin push y sin publicar.

## Qué se encontró (revisado en el simulador a 390 y 1280 px)
1. Las listas vacías decían poco o confundían:
   - Facturas decía «Sin facturas generadas todavía» aunque el mes sí tuviera facturas y solo las ocultara el filtro (por ejemplo, todas pagadas).
   - «Sin facturas pendientes de meses anteriores 🎉» lleva emoji (DESIGN.md lo prohíbe en la operación).
   - Cobros decía solo «Sin resultados». Historial: «No hay pagos que coincidan con los filtros».
   - Todo con la clase `.empty` vieja: letra de 10 px, monoespaciada y en mayúsculas.
   - Si la carga del historial fallaba, salía «Error al cargar pagos» sin forma de reintentar.
2. Historial de pagos: la fecha salía como `2026-11-06`, que cuesta leer.
3. Historial en el celular: la línea de abajo mostraba «Banco: —» cortado («Banc…») y «Registró: —» cuando no había dato.

## Qué se hizo
**Capa nueva:** `parches-facturas-cobros-ui.js`. Se carga al final de `parches-seguros.js`.
- No cambia `rFact`, `rCob`, `aplicarFiltrosPagos` ni `rPagos`.
- Vigila con un MutationObserver (solo `childList`) lo que esas funciones ya pintan en `#tbFact`, `#tbCob` y `#tbPagos`.

1. **Listas vacías que dicen por qué y ofrecen el arreglo a un toque.**
   - Facturas:
     - el mes no tiene facturas: «Aún no hay facturas de octubre 2026», con «Ir al mes en curso» o «Ver atrasadas (N)»;
     - el filtro las oculta: «Todo cobrado en …» o «No hay facturas pagadas en …», con «Ver todas (N)»;
     - la búsqueda o el agente no coinciden: «Quitar búsqueda y agente»;
     - no hay atrasadas: «No hay facturas atrasadas» (sin emoji).
   - Cobros: «Ningún cliente coincide» o «Nadie tiene deuda pendiente», con «Quitar filtros» o «Ver a todos».
   - Historial:
     - «No hay pagos con estos filtros», con «Quitar filtros». Limpia la búsqueda, la empresa, el agente, el método y el banco; **no toca el período ni las fechas**;
     - si la carga falla: «No se pudieron cargar los pagos», con «Volver a intentar» (vuelve a llamar a `rPagos()`).
   - No se agregó un segundo «Generar»: el texto remite al botón de arriba (una sola entrada por función).
2. **Fecha legible en el historial:** se ve «vie 6 nov» (el año solo si no es el actual).
   - La fecha original queda en el `title` de la celda.
   - Ordenar, exportar a Excel y filtrar siguen usando el dato de siempre (`p.fecha`).
   - Solo se cambia el formato del texto: el día es el mismo que ya mostraba la celda.
3. **Celular:** las celdas Banco y Usuario sin dato («—») se ocultan solo a menos de 720 px. La PC conserva la tabla completa.

- Medidas: botones de 44 px de alto (o más) con letra de 14 px; título de 15 px; texto de 13 px.
- Tema oscuro (por defecto) y claro (`html.tema-claro` / `data-nx-tema="clasico"`).
- Respeta `prefers-reduced-motion`.

## Archivos
- `parches-facturas-cobros-ui.js` (nuevo).
- `parches-seguros.js`: una línea en la lista de capas.
- `scripts/qa-facturas-cobros-ui.mjs` (nuevo).

Sin cambios en Supabase, RPC, Edge Functions, cálculos, dinero ni WhatsApp.

## Pruebas
`scripts/qa-facturas-cobros-ui.mjs` corre la app real contra `qa-crm-mock-server.js` en el puerto 8953, a 390 y 1280 px, en tema oscuro y claro. **95/95 PASS.** Comprueba:
- cada lista vacía y cada botón;
- tamaños (≥44 px, letra ≥13);
- la fecha nueva;
- las celdas ocultas en el celular;
- que «Quitar filtros» no cambia las fechas;
- el reintento después de un error simulado (HTTP 500 en `abonos`);
- que no haya scroll de lado ni `pageerror`;
- que con el interruptor apagado todo quede como antes.

Uso: `PORT=8953 node scripts/qa-crm-mock-server.js &` y luego `QA_BASE=http://127.0.0.1:8953 node scripts/qa-facturas-cobros-ui.mjs` (opcional: `QA_TABLER=<carpeta>` para ver los iconos en las capturas).

## Smart (regla del 30-oct)
1. Piensa por el usuario: dice la causa y deja el arreglo a un toque.
2. Elegante: tarjeta suave con ícono y botones en píldora.
3. Igual en iPhone y PC: probado a 390 y 1280 px.

## Cómo apagarlo
En un equipo: `localStorage.nx_facturas_cobros_ui_off='1'`. Para todos: borrar la línea de la capa en `parches-seguros.js`.

## Riesgos y pendientes
- Si otra capa futura cambia el texto de `.empty` en esas listas, el bloque nuevo igual lo reemplaza (solo cuando la lista tiene un único `.empty`).
- La fecha sale de los mismos 10 caracteres que ya se mostraban. Si ese día está en UTC, sigue igual que antes; no se corrigió aquí porque es dato, no vista.
- Visto de paso, sin tocar:
  - en el simulador, las facturas sin `cliente_nom` salen «UNDEFINED» (solo pasa con los datos de prueba);
  - en el error de carga, las cifras de arriba quedan con los valores anteriores.
- Que el dueño lo vea y diga «publícalo».
