# Pasos que cada empresa cliente de NEXUS completa para facturar electrónicamente

> Fuente oficial: «Guía para ser Emisor Electrónico» de la DGII (PDF, leído el 25-oct-2026). Con PSFE, MSeller (asistente CerteCF).
> **Para controlarlos:** cada empresa tendrá esta lista en «Clientes SaaS», con fecha y responsable de cada paso, y una barra de avance.

| # | Paso | Quién | Qué se necesita | Listo cuando |
|---|---|---|---|---|
| 1 | **RNC** | Cliente | Constituir la empresa o inscribirse como persona física | Tiene número de RNC |
| 2 | **Clave de la Oficina Virtual (OFV)** de la DGII | Cliente | RNC y cédula | Entra a la OFV |
| 3 | **Saber su clasificación** (micro, pequeña, mediana…) | Usted lo revisa | Consulta en la OFV | Se sabe su fecha límite y si aplica el plan gratis de MSeller |
| 4 | **Certificado digital para procesos tributarios** | Cliente (usted lo acompaña) | Cédula del representante a color y prueba de vida. Digifirma USD 29.95 al año | Tiene el archivo .p12 y su clave, guardados por el cliente |
| 5 | **Subcuenta en MSeller** con el RNC del cliente | Usted | Correo del cliente; plan según sus ventas | La subcuenta está creada |
| 6 | **Subir el certificado** a MSeller | Cliente o usted, en persona | El .p12 y su clave. **Nunca por chat** | MSeller lo acepta |
| 7 | **Solicitud de Emisor Electrónico** (formulario FI-GDF-016) en la OFV | Cliente, con su ayuda | Pasos 1 a 4 listos | Llega al buzón de la OFV el enlace, el usuario y la clave del portal de certificación |
| 8 | **Set de pruebas**: datos, simulación y comunicación | NEXUS + MSeller (CerteCF) | Conexión de NEXUS lista | La DGII aprueba las pruebas |
| 9 | **Declaración jurada** | Cliente | Firma electrónica en el portal | Enviada |
| 10 | **Autorización de Emisor Electrónico** | DGII | — | Aparece el menú de Facturación Electrónica en la OFV |
| 11 | **Pedir secuencias e-NCF** (E31, E32, E34…) y **tener NCF B de reserva** para contingencia | Cliente, con su ayuda | OFV | Las secuencias están cargadas en NEXUS |
| 12 | **Primera factura real** y verificar el QR en la DGII | Usted y el cliente | Caja configurada | El QR abre en la DGII como válido |
| 13 | **Renovar el certificado** cada año | Cliente; NEXUS avisa 30 días antes | — | Renovado sin cortar la facturación |

**Reglas que se derivan:**
- Hasta el paso 10, el cliente **no puede** emitir e-CF reales. NEXUS puede vender sin comprobante (o con NCF B si los tiene).
- **Contingencia (DGII):**
  - sin internet: guardar y enviar en 72 horas como máximo;
  - si no se puede emitir: usar NCF B y reemplazarlos en 30 días, con un máximo de 15 días en contingencia. MSeller reintenta solo.
- El certificado y su clave **nunca pasan por el chat, el repo, WhatsApp ni la bitácora**.

## Detalle con MSeller (docs.ecf.mseller.app/docs/certification/process, leído el 25-oct-2026)
**Lo más importante:**
- Con MSeller, las **pruebas de la DGII las envía MSeller sola**, sin código de NEXUS. **El cliente puede quedar certificado antes de que NEXUS esté conectado.**
- Toma unos 10 minutos de trabajo. Lo demás es la espera de la DGII.
- MSeller no cobra por la certificación, y la DGII tampoco.

**Los 10 pasos del asistente** (`ecf.mseller.app/dgii-certification`) y en qué pasos de nuestra lista caen:

| MSeller | Qué | Dónde | Nuestra lista |
|---|---|---|---|
| 1 | Subir el `.p12` y su clave. Se ve el RNC y la fecha en que vence | MSeller | 6 |
| 2 | Crear la API Key de **CerteCF** (se muestra una sola vez; no copiarla al chat) | MSeller | 6 |
| 3 | **Postulación** en `ecf.dgii.gov.do/certecf/portalcertificacion` → Certificación → Emisor Electrónico → CREAR POSTULACIÓN | DGII (con el usuario de la OFV del cliente) | 7 |
| 3.2 | Datos del software: **EXTERNO**, «MSeller», versión 1.0. Recepción y aprobación comercial: `https://ecf.api.mseller.app/CerteCF`. **Autenticación: en blanco.** Proveedor: RNC **130862346**, IT SOLUCLICK SRL | DGII | 7 |
| 3.3 | Generar el XML, **firmarlo con el firmador de MSeller** y subirlo | DGII + MSeller | 7 |
| 4 | Avisar a MSeller (hello@mseller.app, con el correo ya armado) | Correo | 7 |
| 5 | **Pruebas automáticas**: un documento por cada tipo (el 32 menor a 250 mil va primero, porque el 33 y el 34 lo usan). Subir el XML del consumo menor a 250 mil a la DGII | MSeller | 8 |
| 6 | Descargar los PDF y **subir cada uno a mano** al portal DGII | DGII | 8 |
| 7 | Esperar que la DGII apruebe la representación impresa | DGII | 8 |
| 8 | Cambiar las URLs a **producción**: `https://ecf.api.mseller.app/eCF` (autenticación en blanco) | DGII | 10 |
| 9 | Declaración jurada: paso 13 del portal → generar → firmar en MSeller → subir | DGII + MSeller | 9 |
| 10 | **Asignar roles** al representante legal en la OFV, cuando la DGII avise | OFV | 10 |
| Después | **Pedir secuencias e-NCF**: OFV → Solicitudes → Comprobantes Fiscales → elegir solo tipos **«ELECTRÓNICO/ELECTRÓNICA»** → cantidad → Enviar. **No emitir hasta que estén aprobadas** | OFV | 11 |

**Quién hace qué:**
- Los pasos en la DGII se hacen con el **usuario de la Oficina Virtual del cliente**. Los hace el cliente, o usted junto con él si le da acceso.
- Los roles los asigna el **representante legal**.
- Usted decide si cobra por acompañar el proceso (la instalación de e-CF, RD$3,000–5,000).
- **Video:** youtube.com/watch?v=Y7uITwsA-LE, del autor de MSeller.
