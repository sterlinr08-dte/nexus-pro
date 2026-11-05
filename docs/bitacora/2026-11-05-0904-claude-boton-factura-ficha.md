# 59.79 — «Generar factura» en la ficha normal del cliente (corrige 59.78)

## Pedido del dueño
«¿Dónde está el botón de generar la factura a los nuevos que ya están creados?»

## Diagnóstico
- En 59.78 la entrada para los clientes que ya existen se puso en «Nueva factura» (`c360AccionNuevaFactura`). Ese botón solo existe en la vista **Cliente 360**.
- Esa vista **no tiene entrada en el menú de Seguros**: solo se llega desde Financiamiento. Por eso, en la práctica, el botón no estaba a la vista.
- La ficha que abre la lista de Clientes es `verCliente` (barra `.sf-toolbar`: Documentos · Abonos · Certificado PDF) y no tenía el botón.
- Error mío al entregar 59.78: probé la función, pero no el camino que usa el dueño.

## Qué se hizo
- `parches-factura-cliente.js` agrega **«Generar factura»** como primer botón de la barra `.sf-toolbar` de la ficha.
  - Solo lo ven el administrador y el agente.
  - El id del cliente se toma del botón «Documentos» de la misma barra.
  - Un `MutationObserver` lo vuelve a poner si la ficha se dibuja de nuevo. Para no gastar, revisa como mucho una vez por cuadro de pantalla (`requestAnimationFrame`).
- Abre la misma ventana de 59.78. Al registrar un cliente nuevo y en Cliente 360 todo sigue igual.

## Pruebas
- `scripts/qa-factura-cliente.mjs`: **34 PASS / 0 FAIL** a 390 y 1280 px. Son 4 casos nuevos:
  - la ficha normal muestra «Generar factura» y mide 44 px o más;
  - el botón abre la ventana de ese mismo cliente.
- Capturas revisadas: en el iPhone el botón queda primero en la barra, en la misma fila que Documentos y Abonos. En la PC sale igual.

## Archivos
- `parches-factura-cliente.js`
- `scripts/qa-factura-cliente.mjs`
- Esta bitácora y `docs/MEMORIA.md`

## Estado
Rama `claude/factura-boton-ficha`. **Sin publicar**: falta el «publícalo» del dueño.
