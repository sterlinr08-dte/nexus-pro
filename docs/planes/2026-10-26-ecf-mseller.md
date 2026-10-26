# Plan: factura electrónica (e-CF) con MSeller

Pedido del dueño (26-oct-2026): «Lee la documentación de MSeller ECF… y ayúdame a integrarla en mi sistema». Fuente: https://docs.ecf.mseller.app (llms-full.txt, leído completo). Reglas: `REGLAMENTOS.md` §4. La e-CF es obligatoria para micro y pequeños desde el **15-nov-2026**.

## Lo que dice MSeller (resumen)
- **Tres ambientes** con la misma API; cada uno usa su propia API key:
  - `TesteCF`: pruebas, sin validez fiscal;
  - `CerteCF`: certificación con la DGII;
  - `eCF`: producción.
- **Autenticación:** `POST /{entorno}/customer/authentication` con email y contraseña devuelve un `idToken` (60 min) y un `refreshToken` (30 días). En cada llamada van `Authorization: Bearer idToken` y `X-API-KEY`. El token se reutiliza y se renueva con `{refreshToken, username: sub}`.
- **Envío:** `POST /{entorno}/documentos-ecf` con el JSON (mismos campos que el XML de la DGII). La respuesta llega al instante con `securityCode`, `qr_url`, `internalTrackId` y `signedDate`; con eso ya se imprime. La DGII responde unos segundos después (proceso asíncrono).
- **Validar sin gastar secuencia:** `?validate=true`.
- **Estados:** En Cola, Enviado a la DGII, En Proceso, Aceptado, Aceptado Condicional, Rechazado, No encontrado y Error.
- **Consulta:** `GET /{entorno}/documentos-ecf?ecf=…`, a los 3–5 s, a los 30 s y a los 2 min. Después, en lote cada 15–30 min. Webhooks solo en planes de pago.
- **Impresión:** formato propio con el QR y el código de seguridad, o el PDF carta de MSeller.
- **Anulación** de e-NCF no usados: endpoint ANECF.
- **Varios clientes:** una cuenta **Proveedor** y una **cuenta por cliente**, cada una con su email, contraseña, API key y certificado .p12 propios. Las credenciales se guardan cifradas por cliente.
- **Plan gratis:** 250 e-CF al mes por emisor, solo para micro y pequeñas empresas. Planes de pago desde US$15 al mes.

## Fases
| Fase | Qué | Estado |
|---|---|---|
| **1. Conexión** | Edge `ecf-mseller`: sesión con token reutilizado y renovado; acciones `estado`, `probar`, `consultar` y `validar`. Solo admin, clave de servicio o llave de un solo uso. | **Hecha** (v1 desplegada, 26-oct). Faltan `MSELLER_EMAIL` y `MSELLER_PASSWORD` para la prueba real. |
| **2. Datos** | Migración: secuencias e-NCF (E31/E32/E34…) por organización con apartado atómico, como `pos_siguiente_ncf`, y columnas en `pos_ventas`: `encf`, `ecf_tipo`, `ecf_estado`, `ecf_security_code`, `ecf_qr_url`, `ecf_track_id`, `ecf_firmado_at`, `ecf_respuesta`. Captura del **RNC del comprador** (lo exige el E31). | **Hecha en la base** (26-oct): 12 columnas nuevas, candados y RPC `pos_siguiente_encf`. Falta la pantalla para crear las secuencias E31/E32/E34 y pedir el RNC (fase 3). |
| **3. Emisión desde la caja** | Al cobrar: armar el JSON (E32 consumo / E31 crédito fiscal), enviarlo por la Edge, guardar el QR y el código, e imprimir. **Nunca bloquear la venta** esperando a la DGII. | **Hecha en rama** (25-oct, 59.61): Edge `ecf-mseller` v7 con `emitir`/`actualizar` (desplegada), datos del emisor en `pos_config`, opción E32/E31 en la caja, QR en el recibo. Falta la prueba real: MSeller pide el certificado .p12 incluso en TesteCF. |
| **4. Seguimiento** | Tarea programada que consulta los pendientes (3 s, 30 s, 2 min y luego en lote) y aviso de los Rechazado. | **Hecha** (25-oct, 59.62): consulta a los ~5 s y ~30 s desde la caja; `pg_cron` `ecf-seguimiento-15min` llama a la Edge (`x-cron-token`) solo si hay pendientes; historial con estado DGII, motivo del rechazo e indicador «e-CF por revisar». |
| **5. Notas de crédito y anulación** | E34 al anular una venta (reemplaza el B04) y ANECF para secuencias no usadas. | **E34 hecha** (25-oct, 59.62): al anular (código 1) o devolver parte (código 3) una factura electrónica que llegó a la DGII; indicador de 30 días; nota impresa con QR. **Falta ANECF** (anular números E no usados). |
| **5b. Nota de débito E33** | Cargo adicional sobre una factura electrónica aceptada. | **Hecha** (25-oct, 59.63): tabla `pos_notas_debito`, Edge v9 `nota_debito`, botón en el historial, cobro en efectivo/transferencia/tarjeta. Falta: a crédito (CxC) y anularla con E34. |
| **6. Certificación** | Asistente CerteCF de MSeller + portal DGII (10 pasos) con el certificado .p12 del negocio. Después, `MSELLER_ENTORNO=eCF`. | Lo hace el dueño con su cliente |
| **7. Multi-cliente** | Cada cliente con base propia (Pizzería UNIVE 2, Deluxe…) lleva los mismos secretos en su base, con su propia cuenta MSeller creada desde la cuenta Proveedor del dueño. | Pendiente |

## Lo que necesita el dueño
1. Guardar `MSELLER_EMAIL` y `MSELLER_PASSWORD` en Supabase → Edge Functions → Secrets (la API key ya está).
2. Para la pizzería: su RNC, su certificado digital (.p12, de digi.camarasantodomingo.do) y su cuenta de cliente en MSeller (creada desde una cuenta Proveedor).
