# 2026-10-26 00:10 (RD) — Claude — Nota de débito electrónica E33 (59.63, rama sin publicar) y Pixabay

## Pedido del dueño
- «Me informan que hay un truco con la nota de crédito investida» → aclaró: «La nota de débito E33». Luego: «Sí, haz el débito E33».
- Mandó una captura de un reel que recomienda **pixabay.com**. A la pregunta de para qué usarlo respondió «1 - sí»: para reels y anuncios.

## Pixabay
- Anotado en `HERRAMIENTAS.md` (Videos, reels y anuncios): gratis, uso comercial, sin crédito. Reglas: no vender el archivo tal cual; personas o marcas reconocibles no se usan como si respaldaran el negocio; revisar la música antes de un anuncio pagado de Meta. Sin conectar la API (pide una clave gratis, que iría como secreto, nunca en el chat).

## Auditoría del dinero (antes de construir)
- Arqueo de caja (`totalesCaja`): ventas con `caja_id` + abonos + `pos_caja_movimientos` (entradas/salidas). El efectivo de la nota entra como **entrada de caja** (mismo camino que los abonos de apartado y de reparación), así cuenta una sola vez.
- Fiado: `cargarSaldosCli` y la RPC del servidor `pos_fiado_registrar_abono` validan el saldo **solo** contra `pos_ventas.credito_monto`. Una nota de débito a crédito no se podría cobrar después → **primera versión sin crédito** (efectivo, transferencia o tarjeta).
- Contabilidad: asiento propio Debe 1101 Caja / Haber 4101 Ventas + 2102 ITBIS, una vez, con `postAsientoConcepto` (tipo `nota_debito`).

## Qué se hizo
| Pieza | Cambio |
|---|---|
| Migración `20261026050000_ecf_nota_debito.sql` | Tabla `pos_notas_debito` (concepto, ITBIS sí/no, subtotal/itbis/total, método, caja, estado y campos e-CF), `set_organizacion_id`, RLS por organización, índice único del e-NCF, y la tarea `ecf-seguimiento-15min` ahora también mira esta tabla. **Aplicada en producción** (tabla nueva vacía). |
| `_doc.ts` | Tipo 33: lleva `FechaVencimientoSecuencia` (obligatoria) e `InformacionReferencia` con código 3 y el concepto como razón. |
| `_emitir.ts` | `emitirDebito` con el mismo orden seguro; solo si la factura original llegó a MSeller y la nota no está anulada. El seguimiento la incluye. |
| `index.ts` | Acciones `nota_debito` y `actualizar_debito`. **Desplegada v9.** |
| `parches-pos.js` | Botón «Nota de débito» en el historial (solo facturas electrónicas aceptadas y con secuencia E33 activa). Ventana: concepto, monto, ¿lleva ITBIS?, cómo paga (campos 48/16, botones ≥ 44, sin mayúsculas). Guarda la nota → entrada de caja si es efectivo → asiento → pide la E33 → imprime con QR y la factura que modifica. Etiqueta «+ RD$ X débito» en el historial (toque para reimprimir). E33 en Ajustes exige vencimiento. |
| `HERRAMIENTAS.md` | Pixabay. |
| `index.html` | `APP_VERSION` 59.63. |

## Pruebas
- Deno: **34/34** (4 nuevas de E33).
- `qa-ecf-caja.mjs`: **59/59** (15 nuevas: botón solo con E33 y factura aceptada, medidas, sin concepto no guarda, 150 = 127.12 + 22.88, entrada de caja en efectivo, orden nota → E33, impresión con QR, transferencia exenta sin caja).
- Regresión: `qa-pos-fase1` 36/36, `qa-pos-fase2` 11/11.
- En vivo: `nota_debito` sin sesión → 401; `seguimiento` con la llave de la tarea → 200 (lee las tres tablas sin error).

## Pendientes
- Nota de débito **a crédito** (requiere tocar la RPC de abonos del servidor: con autorización).
- Anular una nota de débito (con E34) y que anular la factura anule también sus notas de débito.
- Incluir las notas de débito en el reporte 607.
- Sigue faltando el certificado .p12 para probar contra MSeller real.

## Rama
- `claude/ecf-mseller`. **Sin publicar.**
