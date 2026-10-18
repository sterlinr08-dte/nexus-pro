# Inicio en vidrio, parte 3: buscador y ficha rápida (59.36, sin publicar) — Claude

- **Pedido del dueño:** «Publícalo y continúa». Se publicó 59.35 y se hizo esta parte 3 de 4.
- **Fuente revisada:**
  - El buscador global (`#gsOverlay`, `globalSearch()`, Ctrl+K) busca en `ST.clientes`, `ST.facturas` y `ST.empresas` y abre la ficha completa `verCliente()`, un modal grande con muchas capas de estilo.
  - Las cifras de la ficha completa salen de `getEst`, `pendTot`, `getTot`, `getEstPol` y `gAgt`.
- **Cambios en `index.html` (todo solo con la capa `#nxInicioPane` encendida):**
  1. **Buscador en vidrio.** Lo ven todas las pantallas, pero cuelga de `html.nx-pane`.
     - Hoja de vidrio de 600 px con lupa y letra más grande.
     - Los clientes llevan sus iniciales en un círculo con degradado, en vez del emoji 👤.
     - Ya no sale todo en mayúsculas.
     - ↓ y ↑ recorren los resultados y Enter abre (`nxGsFlechas` y un listener de teclado).
     - Lo que busca y lo que abre no cambió: el resultado sigue abriendo la ficha completa.
  2. **Ficha rápida del cliente** (`nxIGFicha()` / `nxIGFichaCerrar()`, elemento `#nxIGFicha`, creado al primer uso dentro de `<body>`).
     - Se abre al tocar un nombre en «Lo próximo». En la computadora sale de lado; en el celular, desde abajo y con su propio scroll.
     - Muestra iniciales, nombre, plan y póliza, el estado, **Pendiente**, **Prima mensual**, **Vigencia** (las mismas funciones que la ficha completa: nada nuevo se calcula), los datos (agente, cédula, ARS, teléfono, vencimiento) y las tareas pendientes del CRM de ese cliente.
     - Botones: **Cobrar** (`abrirAbono`), **WhatsApp** (`nxAbrirWhatsAppDeCliente`), **Ficha completa** (`verCliente`) e **Historial del CRM** (`nxCrmAbrirCliente`).
     - Se cierra con la ✕, tocando fuera o con Esc, y el foco vuelve a donde estaba.
     - Es un `div` con `role="dialog"`: un `aside` hereda una regla global que lo volvía gris claro.
  3. **`planB()`:** una factura sin plan ya no rompe la ficha completa (`String(p||'—')`). Lo encontró la prueba con las facturas simuladas.
  - `APP_VERSION` pasa a `'59.36'`.
- **Cambio en `scripts/qa-inicio-glass.mjs`:** con la capa, el nombre abre la ficha rápida, y la prueba sigue a la ficha del CRM por «Historial del CRM».
- **Pruebas:**
  - `qa-inicio-glass.mjs`: **129 PASS · 0 FAIL**.
  - Prueba propia en claro y glass oscuro, a 390 y 1280 px:
    - el buscador muestra los resultados y ↓ pone el foco en el primero;
    - la ficha se abre con las cifras de la ficha completa;
    - Esc la cierra;
    - «Ficha completa» abre `verCliente`;
    - sin errores de consola.
- **Publicación:** NO publicado. Rama `claude/inicio-vidrio`. Esperar «publícalo».
- **Siguiente:** parte 4, los anillos del ciclo 20 → 20. Hace falta que el dueño defina la **meta del ciclo** (cuánto se espera cobrar, por ejemplo la suma de las primas mensuales activas). Sin meta no se dibuja un anillo de progreso honesto.
