# Consulta a la documentación de MSeller e-CF (solo lectura)

**Pedido del dueño:** «todas las preguntas están en la documentación https://ecf.mseller.app; usa uno de tus agentes y pregúntale lo que necesites».

**Fuente:** https://docs.ecf.mseller.app/llms-full.txt y sus páginas. No hubo registro, envío ni llamada a la API.

## Respuestas
- **Pruebas sin certificado:** no se puede. El .p12 es obligatorio también en TesteCF, no hay certificado de prueba y la API responde 412 `CERTIFICATE_NOT_CONFIGURED`.
- **Carga del certificado:** se sube por el portal (ecf.mseller.app/certificate/add). Un solo certificado sirve para los 3 entornos y debe estar a nombre del RNC que emite.
  - MSeller permite usar el de un cliente (o el de un amigo con su permiso), en una cuenta con su RNC.
- **Resumen de E32 menor de RD$250,000 (RFCE):** MSeller lo hace sola. Siempre se manda la factura completa.
- **Certificación (CerteCF):** MSeller envía sola las pruebas. Al contribuyente le toca:
  - la postulación en la DGII;
  - el correo a hello@mseller.app;
  - la declaración jurada;
  - los roles en la Oficina Virtual.
  - Nuestro código no necesita cambios para esta etapa.
- **Secuencias:** las lleva nuestro sistema y se piden en la Oficina Virtual de la DGII (tipos «electrónico»).
  - En TesteCF hay que usar números altos o aleatorios.
- **Webhook de cambio de estado:** solo en los planes de pago. En el plan Gratis hay que consultar.
  - Primero a los 3–5 s, luego a los 30 s y a los 2 min.
  - Después, en lote cada 15–30 min con `POST /documentos-ecf/status/batch` (hasta 100 por llamada).
- **Plan Gratis:** 250 comprobantes y 1,000 requests al mes por cliente. Al agotarse, la API responde 429.
- **Fecha límite** para pequeños, micro y no clasificados: **15-nov-2026** (Aviso DGII 06-26, según MSeller; falta confirmarlo en la DGII).

## Diferencias encontradas en nuestro código (rama `claude/ecf-mseller`, sin corregir)
1. ANECF no está programado. El endpoint es `POST /customer/void-ncf`: no usa API Key y **no es idempotente**, así que hay que guardar el `voidId` y no reintentar a ciegas.
2. Los estados `No encontrado` y `Error` no están en `ESTADOS` (`_emitir.ts:49`), y esas filas se consultan sin fin.
3. Un 429 (cuota agotada) se trata como error definitivo (`_emitir.ts:86`). Debe quedar «pendiente».
4. El seguimiento consulta uno por uno. Debe usar la consulta en lote para no gastar los 1,000 requests.
5. Hay que confirmar si la E33 exige `TablaFormasPago`. Se verifica con `validate=true` cuando haya certificado.

## Estado
- No hay cambios de código ni publicación.
- La e-CF sigue en pendiente por decisión del dueño.
- **Siguiente paso:** corregir los puntos 2–4 cuando el dueño lo autorice; el ANECF entra con los demás pendientes.
