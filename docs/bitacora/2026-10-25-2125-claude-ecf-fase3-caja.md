# 2026-10-25 21:25 (RD) — Claude — e-CF fase 3: emisión desde la caja (59.61, rama sin publicar)

## Pedido del dueño
- «¿Dónde lo vas a poner?» → se le explicó: en la caja (Ajustes → Comprobantes fiscales, selector del comprobante en Factura y recibo). «Sí, empieza».

## Fuente de verdad revisada
- La venta se crea con `rpc/pos_registrar_venta_atomica` (lista fija de columnas: **no guarda `comprador_rnc`**). Por eso el comprador lo toma la Edge del servidor desde `pos_clientes.cedula` y lo copia a la venta.
- En el POS el precio y el importe **incluyen** ITBIS (18 %) y puede haber descuento global (`pos_ventas.descuento`).
- `pos_siguiente_ncf` (B01/B02) **no se tocó**. Las e-CF usan `pos_siguiente_encf` (fase 2), llamada desde la Edge con la sesión del usuario.

## Qué se hizo
| Pieza | Cambio |
|---|---|
| `supabase/functions/ecf-mseller/_doc.ts` (nuevo) | Arma el JSON E31/E32 con la estructura de la DGII. Montos sin ITBIS (`IndicadorMontoGravado` 0), descuento prorrateado, redondeo repartido: gravado + ITBIS + exento = total exacto. E31 exige RNC del cliente y vencimiento de la secuencia; E32 ≥ RD$250,000 exige RNC. |
| `_emitir.ts` (nuevo) | Orden seguro: idempotente si ya tiene respuesta → reclama la venta (`ecf_enviado_at`, 90 s) → valida los datos **antes** de gastar un e-NCF → toma el e-NCF y lo guarda en la venta **antes** de enviar → envía. 4xx = «Error» y el reintento usa el mismo número; 5xx/sin red = «pendiente» y el reintento primero consulta en MSeller. Acción `actualizar` copia el estado de la DGII. |
| `index.ts` | Acciones `emitir` y `actualizar` para cualquier usuario con sesión (la venta se lee con su sesión: RLS por organización). Las demás acciones siguen solo para admin. **Desplegada v7** (verify_jwt false, valida su propia sesión). |
| `_lib.ts` | `enviar` (POST real a `/documentos-ecf`). |
| Migración `20261026030000_ecf_fase3_emisor.sql` | `pos_config.ecf_rnc`, `ecf_razon_social`, `ecf_direccion` + candado de RNC (9 u 11 dígitos). **Aplicada en producción** (solo agrega columnas nulas). |
| `parches-pos.js` | Opciones «Consumo electrónica (E32)» y «Crédito fiscal electrónica (E31)» **solo si hay secuencia E activa**. Al cobrar: valida E31 con RNC antes de gastar el número de factura, guarda la venta y luego llama a la Edge (15 s máx.); si falla, la venta queda y se avisa. Recibo con «Factura de consumo electrónica», e-NCF, QR (qrcode.js local), código de seguridad y fecha de firma. Reimprimir desde el historial reintenta o actualiza. Ajustes: secuencias E con 10 dígitos, prefijo = tipo, E31 exige vencimiento; tarjeta «Factura electrónica (e-CF)» (RNC, razón social, dirección, Probar conexión) que solo aparece si hay secuencia E. Campos 48/16, botones ≥ 44, sin mayúsculas forzadas. |
| `index.html` | `APP_VERSION` 59.61. |

## Pruebas
- Deno `ecf-mseller`: **23/23** (15 nuevas: montos, descuento, exento, redondeo, E31, fechas RD, orden de emisión, doble toque, 4xx, sin red, sin secuencia, venta B02/anulada).
- `scripts/qa-ecf-caja.mjs` (app real, REST y Edge simuladas, 390 y 1280 px): **32/32**. Sin secuencia E nada cambia; B02 sigue con `pos_siguiente_ncf`.
- Regresión: `qa-pos-fase1` 36/36, `qa-pos-fase2` 11/11. `test-pos-venta-atomica` y `test-pos-caja-por-cajero` fallan **igual en la base** (buscan `APP_VERSION 58.37`: pruebas viejas).
- En vivo: `emitir` sin sesión → 401 «Inicie sesión»; `probar` → conectado a TesteCF.
- **Prueba real con MSeller: no se pudo.** Incluso `validate=true` responde 412 `CERTIFICATE_NOT_CONFIGURED`: hay que subir el certificado .p12 en la cuenta de MSeller.

## Riesgos / pendientes
- Hay **una sola cuenta MSeller** por base (secretos de la Edge). El RNC del emisor debe ser el del certificado (fase 7: secretos por base de cada cliente).
- Fase 4 (seguimiento automático de estados), fase 5 (E34 al anular; hoy anular una venta e-CF no emite nota de crédito), fase 6 (certificación DGII, la hace el dueño).
- `qa-pos`: el estilo del POS en el simulador muestra etiquetas en mayúsculas (preexistente).

## Rama y publicación
- Rama `claude/ecf-mseller`. **Sin publicar** a `main` (falta «publícalo»). La Edge y las migraciones ya están en el servidor; no las usa nadie hasta que haya una secuencia E.

## Siguiente paso
- Subir el certificado .p12 a MSeller (TesteCF), llenar RNC/razón social/dirección y una secuencia E32 de prueba, y emitir una venta real de prueba.
