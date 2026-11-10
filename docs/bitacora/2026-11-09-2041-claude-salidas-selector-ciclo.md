# Custodia · el selector del ciclo se lee completo en el celular (59.84, sin publicar)

- Pedido: al enseñar el antes y después de «Salidas» (59.83), en el iPhone el selector del ciclo se veía recortado («20 oct → 20 no…») por el botón nuevo. El dueño dijo «Sí» a arreglarlo.
- Cambio en `parches-salidas-custodia.js`, solo CSS, hasta 640 px: el selector va en su propia fila, y debajo «Actualizar» y «Salida» a partes iguales. La cabecera recibe la clase `nxSalCuHead` solo cuando existe el botón «Salida». En PC no cambia nada.
- En el camino usé por error la clase `nxSalHead`, que ya era la cabecera de la ventana; la prueba lo detectó (5 fallos) y la renombré antes de subir.
- Prueba nueva en `scripts/qa-salidas-custodia.mjs`: a 390 px mide que el texto del ciclo cabe en el selector.
- Resultados: `qa-salidas-custodia.mjs` 111 aprobadas, 0 fallidas; `qa-custodia.mjs` 68 PASS, 0 FAIL.
- Rama `claude/salidas-selector`. Falta el «Publícalo» del dueño.
