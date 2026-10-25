# Plan: e-CF de cada cliente de NEXUS y cómo cobrarlo (borrador para decidir, 25-oct-2026)

## Lo que ya existe (no se crea contabilidad paralela)
- **Módulo «Clientes SaaS»** en NEXUS madre (`parches-panel-dueno.js`): tablas `saas_suscripciones` (nombre, sistema, dominio, `mensualidad`, `dia_cobro`, contacto, WhatsApp) y `saas_pagos` (monto, período, método, referencia). Tiene un recordatorio por WhatsApp. Solo lo ve el admin.
- **Datos al 25-oct-2026:**
  - AMATISTA DENTAL: RD$1,200;
  - CONSULTORIO GERIÁTRICO: RD$1,200, todavía activo aunque **su base se borró hoy**;
  - DELUXE BEAUTY CENTER: RD$1,200.
  - **0 pagos registrados.** Unive 2 todavía no está.

## Lo que dice MSeller (docs.ecf.mseller.app, guía multi-tenant)
- **Cuenta de proveedor:** usted. Cada cliente es una **subcuenta**, con su plan, su certificado y su llave.
- **Dos formas de pago:**
  1. el cliente pone su tarjeta;
  2. **el proveedor paga el plan del cliente y se lo cobra dentro de sus servicios** (se activa con soporte).
- **Descuento:** 10–20 % con 3 o más cuentas pagas.
- **El panel del proveedor muestra cuántos documentos emite cada cliente al mes.** No describe una API de consumo.

## Cómo sabremos cuánto consumió cada empresa
- **Fuente propia:** cada e-CF que manda NEXUS queda guardado en la base del cliente, con número, fecha y track-id.
- Un resumen mensual (cantidad de e-CF y plan que le corresponde) se copia a la madre, en una tabla nueva **`saas_consumo_ecf`**: suscripción, período, cantidad, plan y costo. Lo hace una tarea programada el día 1, sin leer datos de ventas del cliente, solo el número.
- **Se cuadra cada mes** el conteo de NEXUS contra el panel de MSeller. Si no coinciden, aviso al dueño.
- En «Clientes SaaS» se agrega a cada cliente:
  - plan e-CF;
  - consumo del mes con barra (por ejemplo «1,840 / 2,500»);
  - vencimiento del certificado, con aviso 30 días antes;
  - y la mensualidad total = sistema + e-CF.

## Opciones para cobrar
| | A · Cada cliente paga a MSeller | B · Usted paga y cobra lo exacto | C · Paquetes NEXUS todo incluido (recomendada) |
|---|---|---|---|
| Cómo | El cliente pone su tarjeta en MSeller | Usted paga cada plan y cada mes le cobra al cliente lo que costó, más un margen | Precio fijo por tamaño, por ejemplo «Caja + hasta 1,000 facturas», «Caja + hasta 2,500». Si el cliente se pasa dos meses seguidos, sube de paquete |
| A favor | Usted no adelanta dinero | Usted recibe el descuento de 10–20 % | Fácil de vender y de entender. Usted recibe el descuento. El cobro sale solo del consumo |
| En contra | El cliente necesita tarjeta en dólares; usted no gana nada por la e-CF y no controla si se le vence | Factura distinta cada mes y más explicaciones | Si un cliente crece rápido, usted pone la diferencia hasta que sube de paquete |

**Costo de MSeller por cliente, al mes** (antes del descuento): 250 gratis (solo micro); 500 RD$850; 1,000 RD$1,400; 2,500 RD$2,400; 6,000 RD$4,900; 10,000 RD$7,500.

## El certificado digital
- **Siempre a nombre del dueño del negocio cliente.** La ley lo exige así. Usted no puede tener uno por ellos.
- **Usted puede gestionarlo:** le ayuda a sacarlo (USD 29.95 al año en Digifirma) y lo cobra en el primer mes o en la instalación. NEXUS avisa la renovación.
- **Nunca pasa por el chat ni por el repo.** Lo sube el cliente o usted en MSeller, que lo guarda cifrado.

## Fases
1. **Decisión:** A, B o C, y su margen.
2. **«Clientes SaaS» v2:** plan e-CF, consumo, certificado y total. Desactivar Geriatra.
3. **Conexión NEXUS ↔ MSeller en pruebas** (gratis): Edge Function `ecf-emitir`, una sola para todos los clientes.
4. **Contador mensual** y cuadre con MSeller.
5. **Primer cliente real** (Unive 2, cuando tenga RNC y certificado).

**Todavía sin decidir:**
- opción de cobro y margen;
- si el cliente paga el certificado aparte;
- qué hacer con la fila de Geriatra.
