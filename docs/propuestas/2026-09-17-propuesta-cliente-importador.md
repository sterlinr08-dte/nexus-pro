# Propuesta comercial — Sistema de gestión integral para importador de electrónica y vehículos eléctricos

> Fuente de la propuesta enviada al cliente potencial (importador de pasolas eléctricas, motos eléctricas, aires acondicionados y TV Smart). Documento de negocio, no forma parte del código de NEXUS PRO Seguros. Se conserva aquí como registro y para poder regenerar el `.docx`/artefacto web si se necesita ajustar.

- **Preparado para:** [Nombre del cliente / empresa importadora]
- **Giro del cliente:** importación y venta de pasolas eléctricas, motos eléctricas, aires acondicionados y televisores Smart
- **Preparado por:** [Nombre de tu empresa]
- **Fecha:** 17 de septiembre de 2026
- **Vigencia de la propuesta:** 30 días desde la fecha de emisión
- **Decisiones de alcance/modelo tomadas por el dueño (17-sep-2026):** desarrollo nuevo e independiente (no reutiliza la base de código de NEXUS PRO Seguros); modelo comercial de suscripción mensual (SaaS); entrega en Word/PDF y como página web.

## 1. Resumen ejecutivo

El cliente es un importador y distribuidor de pasolas eléctricas, motos eléctricas, aires acondicionados y televisores Smart. Necesita centralizar cuatro operaciones hoy dispersas o manuales: taller de servicio técnico/garantías, catálogo de mercancías e inventario, presencia web comercial, y contabilidad.

Se propone un sistema único donde estas cuatro áreas comparten la misma base de clientes, productos y transacciones: una venta o un servicio de taller se refleja automáticamente en inventario y en contabilidad, sin doble digitación.

## 2. Alcance de la solución

### 2.1 Sistema de taller (servicio técnico y garantías)
- Recepción de equipos con checklist de estado de entrada y fotos.
- Orden de servicio con número único, tipo (garantía/pagado) y prioridad.
- Asignación a técnico, diagnóstico, repuestos y mano de obra.
- Flujo de estados: recibido → diagnóstico → en reparación → esperando repuesto → listo → entregado.
- Historial de servicio por cliente y por número de serie/IMEI.
- Control de garantías por marca/modelo.
- Notificación automática al cliente (WhatsApp) cuando el equipo está listo.
- Comprobante de entrega con firma digital.

### 2.2 Catálogo de mercancías e inventario
- Productos por categoría (pasolas, motos eléctricas, A/C, TV) con atributos propios de cada línea.
- Inventario por almacén/sucursal con alertas de stock mínimo.
- Proveedores e importaciones, costo en moneda extranjera y tasa de cambio.
- Identificación por código de barras, número de serie o IMEI según el producto.
- Listas de precio diferenciadas (mayorista/detalle).
- Sincronización automática del stock con el catálogo publicado en la web.

### 2.3 Página web
- Sitio institucional (quiénes somos, marcas, sucursales, contacto).
- Vitrina conectada en vivo al catálogo/inventario.
- Formulario de contacto/cotización y botón de WhatsApp Business.
- Responsive, con SEO básico.
- Opcional: agenda en línea para solicitar servicio de taller.

### 2.4 Contabilidad
- Facturación con comprobantes fiscales electrónicos (NCF) según la DGII.
- Cuentas por cobrar y por pagar.
- Registro de ingresos/gastos y conciliación de caja/bancos.
- Reportes: estado de resultados, flujo de caja, balance.
- Integración automática con ventas de mostrador, catálogo web y taller (un cobro genera su asiento y su NCF sin captura duplicada).

## 3. Fuera de alcance
- Hardware físico (impresoras fiscales, lectores de código de barras, servidores propios).
- Pasarela de pagos en línea en la web.
- Integraciones con terceros no mencionadas aquí.
- Fotografía/contenido comercial para la web (lo provee el cliente).

## 4. Supuestos
- Cliente opera en República Dominicana y requiere NCF según la DGII.
- Cliente cuenta con al menos un almacén/sucursal al arranque.
- Cliente provee catálogo inicial de productos, precios y saldos de inventario.

Estos supuestos deben validarse en la Fase 0. Cualquier variación de alcance se cotiza aparte.

## 5. Metodología y cronograma

| Fase | Contenido | Duración estimada |
|---|---|---|
| Fase 0 — Descubrimiento | Levantamiento de procesos, validación de supuestos y alcance final | 1–2 semanas |
| Fase 1 — Núcleo operativo | Catálogo + Taller (órdenes, garantías, notificaciones) | 4–6 semanas |
| Fase 2 — Contabilidad | Facturación fiscal (NCF), CxC/CxP, reportes, integración con ventas y taller | 3–4 semanas |
| Fase 3 — Página web | Sitio institucional + vitrina + formulario de contacto | 2–3 semanas |
| Fase 4 — QA y arranque | Pruebas integrales, migración de datos, capacitación, puesta en producción | 1–2 semanas |
| **Total estimado** | | **11–17 semanas (≈3–4 meses)** |

## 6. Modelo comercial (SaaS)

> Cifras orientativas, no validadas contra costos reales — ajustar antes de presentarlas como oferta final.

### 6.1 Cargo de implementación (pago único)
RD$450,000 – RD$650,000. Cubre desarrollo de los 4 módulos, migración de datos iniciales, capacitación y puesta en producción. Pago sugerido: 40% al iniciar, 30% al completar Fase 1, 30% contra puesta en producción.

### 6.2 Planes de suscripción mensual

| Plan | Incluye | Cuota mensual |
|---|---|---|
| Básico | 1 sucursal, hasta 3 usuarios, hospedaje, soporte y respaldos | RD$15,000 |
| Profesional | Hasta 3 sucursales, hasta 10 usuarios, notificaciones automáticas por WhatsApp | RD$28,000 |
| Premium | Sucursales ilimitadas, soporte prioritario, reportes avanzados | RD$45,000 |

## 7. Próximos pasos
1. Reunión de descubrimiento (Fase 0).
2. Ajuste y confirmación del alcance final y precio de implementación.
3. Firma de propuesta/contrato y anticipo.
4. Inicio de Fase 0 según cronograma.
