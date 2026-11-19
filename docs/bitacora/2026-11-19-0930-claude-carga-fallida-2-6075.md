# 19-Nov-2026 09:30 (RD) — Claude — Carga fallida, segunda parte: Inicio, Contabilidad, Cliente 360, POS y WhatsApp (6075)

## Pedido
- El dueño: «CARGANDO». Terminar lo que quedó pendiente en la 6073.

## Cambios (solo pantalla; sin tocar servidor, RPC ni datos)
- **Inicio** (`index.html`, `rChartCobros` y la nueva `nxInicioCobrosFallo`):
  - si no llegan los cobros, en vez de RD$ 0 se ve «—» y «No se pudo cargar» en: «Cobrado hoy», «Cobrado» del ciclo (`kpiCobMes`), «Hoy, en vivo» y el saludo;
  - «Reintentar» va en la tarjeta del ciclo.
- **Contabilidad** (Mayor, Diario, Balance y P&G; `nav` y la nueva `nxAsiAviso`):
  - mientras bajan los asientos: «Cargando asientos…»;
  - si fallan: «No se pudieron cargar los asientos. Los saldos no están completos. · Reintentar».
- **Cliente 360** (`c360CargarTodo`, 11 cargas):
  - si alguna falla: «Parte de la información no se pudo cargar · Reintentar»;
  - `c360Reintentar` borra lo guardado y vuelve a cargar.
- **Línea de tiempo de la ficha**: si falla una consulta, «Parte del historial no se pudo cargar · Reintentar», en vez de «Sin eventos todavía».
- **Punto de venta** (`parches-pos.js`):
  - Reportes: si fallan las ventas, aviso arriba y el rango no queda guardado como «ya cargado» (antes quedaba vacío hasta recargar la página);
  - Clientes: si fallan los saldos a crédito, aviso arriba;
  - «Reintentar» vuelve a abrir la pestaña.
- **WhatsApp** (`parches-whatsapp-inbox.js`, `programarReintentoCarga`):
  - si el chat sigue sin cargar tras el reintento de 3 s: «No se pudieron cargar los mensajes · Reintentar» (antes, «Cargando…» para siempre);
  - se vuelve a intentar solo a los 10 s;
  - no se tocó la carga ni el envío normal.
- `parches-seguros.js`: `b=6074` → `b=6075`.

## Pruebas (servidor de prueba local; cada falla simulada con un error 503; también el caso normal)
| Pantalla | Normal | Con falla |
|---|---|---|
| Inicio | RD$ 4,000; «Hoy llevas 2 cobros»; ciclo RD$ 19,000 | «—»; «No se pudieron cargar los cobros…»; «Reintentar» |
| Balance | Sin aviso | «No se pudieron cargar los asientos… · Reintentar» |
| Cliente 360 | Sin aviso | «Parte de la información no se pudo cargar · Reintentar» |
| Línea de tiempo | Pagos y eventos | Aviso, y se ve lo que sí cargó (cliente registrado, facturas) |
| POS Reportes y Clientes | Sin aviso | Aviso con «Reintentar» en cada uno |
| WhatsApp, abrir chat | Mensajes normales | «No se pudieron cargar los mensajes · Reintentar» |
- Sin errores de consola en ningún caso.
- `qa-whatsapp-chat` sale distinta en cada corrida:
  - en `main`: 2 a 4 fallas;
  - con el cambio: 3 a 4 fallas;
  - siempre de las mismas pruebas inestables («al ir al final el contador se apaga», «posición de lectura», «Borrar para mí», «Destacar»);
  - no hay una falla nueva que aparezca siempre con el cambio.

## Estado
- Rama `claude/carga-fallida-2`. Espera el «Publícalo».
