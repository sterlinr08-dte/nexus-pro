# «Recuerda todo lo que me gusta»: gustos anotados en la memoria y aplicados a la maqueta de Unive 2

**Autor:** Claude · **Rama:** `claude/pizzeria-unive2`

- **El dueño (25-oct-2026):** «Recuerda todo lo que me gusta».
- Se juntaron en `docs/MEMORIA.md` §2 los gustos ya decididos (sacados de MEMORIA, `CLAUDE.md`, `DESIGN.md` y `docs/REFERENCIAS-DISENO.md`). A partir de ahora aplican a todo diseño nuevo, incluidos los de clientes.
- **Error corregido en la maqueta de la caja:** tenía una **barra fija abajo** («Ver pedido»), que va contra la regla del dueño. Se cambió por una **píldora arriba**, pegada al encabezado, con el total y la cantidad.
- **Maqueta v4** (https://claude.ai/artifact/JynWpSvB2H4GaueppMTMD2). Ahora tiene:
  - botones encendidos (Cobrar, Agregar, la píldora y las opciones elegidas);
  - ⓘ para el ITBIS;
  - total con números que ruedan;
  - **impresora de recibos** al cobrar («Imprimiendo recibo…» → «Pago completo ✓», el papel sale a tirones);
  - «**Mantén presionado para vaciar**» el pedido.
- **Medido con Playwright a 390 y 1280 px:**
  - 0 controles por debajo de 44 px;
  - Cobrar de 54 px;
  - sin desborde;
  - sin errores de JS.
