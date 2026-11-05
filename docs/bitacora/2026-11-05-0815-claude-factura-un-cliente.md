# 59.78 — «Generar factura» de un solo cliente, eligiendo el mes o los meses

## Pedido del dueño (05-nov-2026)
- «Vamos a crear un botón estratégico de cuando se crea un cliente y necesito que se le genere una factura (solamente a ese cliente que se creó).»
- Eligió la opción A: el botón al registrar el cliente y también en la ficha.
- «Que pueda elegir el mes o los meses.»

## Diagnóstico (fuente de verdad)
- **Facturación automática:** la Edge `auto-facturacion` corre todos los días (cron `auto-facturacion-diaria` 10:05 UTC y 2 reintentos). Le factura a cada cliente activo el día de facturación de su ficha, con período = mes calendario.
  - Un cliente creado **después** de su día se queda sin factura ese mes.
- **Facturación manual:** `genFacturas()` factura a **todos** los clientes.
- **La RPC por cliente ya existe:** `seguros_generar_factura_manual`. Es para admin o agente. Hace todo o nada:
  - bloquea al cliente (FOR UPDATE);
  - responde `ok:false` («ya existe») si el cliente ya tiene una factura no anulada de ese período;
  - pone el NCF y suma a `deuda_total`;
  - crea el asiento 1201/4101 y escribe en la auditoría.
  - Acepta años hasta el próximo.
- **En la ficha**, «Nueva factura» (`c360AccionNuevaFactura`) solo abría la lista de Facturas filtrada: no creaba nada.
- **WhatsApp:** el trigger `trg_whatsapp_factura_generada` dispara la automatización `factura_generada` (activa, plantilla `factura_generada_v2`) con **cada** factura nueva. No se cambió; la ventana lo avisa.

## Qué se hizo
- **Capa nueva `parches-factura-cliente.js`**, cargada al final de `parches-seguros.js`. Se apaga con `localStorage.nx_fact_cli_off='1'`.
- **Ventana «Generar factura»** (`window.nxFacturarCliente(id)`):
  - Muestra la cuota mensual. Usa el precio especial del cliente si lo tiene (`getPTReal` y `getPDReal`); si no, el del plan. Es la misma fórmula de `genFacturas`.
  - Ofrece 9 meses para elegir: 6 hacia atrás, el actual y 2 hacia adelante. El mes actual viene marcado.
  - Los meses que ya tienen factura dicen «✓ Facturado» y no se pueden elegir.
  - El botón principal dice cuántas facturas se van a crear y el total. Ejemplo: «Generar 3 facturas · RD$ 13,200».
  - Las facturas se crean **una por mes, del más viejo al más nuevo**, con su propia llave. Después:
    - se resincroniza el estado de las facturas;
    - se refrescan los asientos y las pantallas;
    - se registra `FACTURA_CLIENTE_GENERADA` en la auditoría;
    - se muestra un resumen con el NCF de cada factura. Si un mes ya tenía factura, dice «Ya tenía factura».
  - Si el cliente está inactivo, tiene la facturación apagada o no tiene precio, la ventana lo explica y no muestra el botón de generar.
  - Avisa: «Al cliente le llega el aviso “Factura generada” por cada factura».
- **Al registrar un cliente nuevo** (envoltura de `guardarCli`, solo en altas): si el cliente queda activo y con facturación permitida, se abre «Cliente registrado · ¿Le generamos su factura ahora?», con el botón «Ahora no». No se genera nada hasta que alguien toca el botón.
- **En la ficha**, «Nueva factura» abre la misma ventana. Para quien no es admin ni agente, sigue haciendo lo de antes.
- **Tamaños:** botón principal de 54 px; meses de 56 px de alto; la × mide 44×44. Funciona en tema oscuro y claro, y respeta la opción de movimiento reducido.

## Archivos
- `parches-factura-cliente.js` (nuevo)
- `parches-seguros.js` (una línea en la lista de capas)
- `scripts/qa-factura-cliente.mjs` (nuevo)
- Esta bitácora y `docs/MEMORIA.md`

Sin migraciones, sin RPC nuevas y sin cambios en la Edge.

## Pruebas
`scripts/qa-factura-cliente.mjs`: **30 PASS / 0 FAIL** a 390 y 1280 px. Comprueba:
- que la ficha abre la ventana;
- que el mes actual viene marcado y que un mes ya facturado no se puede elegir;
- la cuota con precio especial y dependiente;
- los tamaños de los botones;
- que con 3 meses el botón dice «3 facturas» y el total;
- que se hace una llamada por mes, en orden, con su llave y los datos correctos;
- que un «ya existe» se muestra como «Ya tenía factura»;
- que las facturas entran en memoria y que «Listo» cierra la ventana;
- que un cliente con la facturación apagada no puede generar;
- que al registrar un cliente se ofrece su factura sin generar nada;
- que no hay errores de página.

El simulador no traía tres cosas, así que la prueba las simula: el número de póliza (`seguros_siguiente_numero_poliza`), la fila que devuelve el alta y la consulta de WhatsApp repetido.

## Riesgos y pendientes
- Cada factura manda su WhatsApp «Factura generada». Con 3 meses, el cliente recibe 3 avisos. Si el dueño prefiere uno solo, hay que cambiar la automatización (servidor) con su OK.
- Una factura de un mes viejo también cuenta en el «balance» del cliente como deuda atrasada. Es lo correcto contablemente, pero el dueño debe saberlo.
- **Sin publicar.** Rama `claude/factura-un-cliente`; falta el «publícalo».
