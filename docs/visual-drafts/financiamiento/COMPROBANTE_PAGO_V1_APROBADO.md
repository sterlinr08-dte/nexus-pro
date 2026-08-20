# Comprobante de Pago — V1 (aprobado)

Mockup: `comprobante_pago_v1_mockup.png` (escritorio + móvil).

Recibo imprimible/compartible de **un pago** de préstamo, en el módulo de
Financiamiento (`nxAbrirPrestamos`). Se abre desde el detalle del préstamo
(`nxPrestamoVer`), botón 🧾 en cada fila de pago → `nxPrestamoComprobante(pagoId, prestamoId)`.
Documento `window.open`+`document.write` (mismo patrón que Estado de cuenta / Contrato).
100% datos reales de `prestamo_pagos` / `prestamos` / `prestamo_clientes`.

## Piezas construidas (reales)
- **Encabezado:** NEXUS PRO Financiamiento, "COMPROBANTE DE PAGO", No. **REC-XXXXXX**
  (derivado del id del pago), badge **REGISTRADO**, fecha y hora (`created_at`),
  recibido por (`created_by_name`).
- **Cliente:** avatar de iniciales, nombre, cédula, teléfono, dirección (de
  `prestamo_clientes` vía `cliente_id`).
- **Información del préstamo:** Contrato # (`prRef`), fecha del préstamo, monto
  aprobado (capital), **Balance anterior** (= saldo actual + este pago), **Balance
  actual** (`saldoDe`), próxima cuota (`prProximoPago`), estado (`prEstadoInfo`).
- **Detalle del pago:** Monto recibido grande + **en letras** (`numLetras`),
  "Aplicado a" (para crédito: capital/interés real de `tipo`; cuotas/libre: "Abono
  al préstamo"), método de pago (pastillas, resalta el usado).
- **Observaciones:** `prestamo_pagos.nota`.
- **Firmas:** Recibido por (nombre real) + Firma del cliente (línea en blanco).
- **Acciones:** Imprimir / PDF, WhatsApp (texto), Correo (mailto), Cerrar.

## Omitido a propósito (no existe — no se finge)
- **Sucursal / Caja:** el módulo no tiene sucursales ni cajas.
- **Desglose Capital/Intereses/Mora/Otros/Descuento por pago:** `prestamo_pagos`
  guarda solo monto + método + tipo (capital/interés en crédito). No se fabrica un
  reparto que no está guardado; se muestra el monto real + a qué se aplicó.
- **Datos estructurados de transferencia** (banco origen/destino/referencia/
  autorización): no se guardan; si hay algo, va en la nota.
- **Voucher / archivo adjunto:** no hay Storage.
- **QR "verificar pago":** no existe endpoint público de verificación de pagos.
- **Badge "VALIDADO/oficial" y contador de reimpresiones/envíos:** no hay flujo de
  validación ni registro de reimpresiones — se usa "REGISTRADO" (real).
- **Copiar enlace / Reimprimir:** sin enlace público; Reimprimir = Imprimir.

## Notas
- Color morado del módulo (`.nxFP`, desviación deliberada del azul del mockup, regla
  "cada app su color"). Monto en verde.
- Sin tabla ni columna nueva; sin cambio de RLS.
