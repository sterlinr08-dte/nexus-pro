# NEXUS PRO — Expediente 360° del Cliente

## Objetivo
Centralizar en una sola ficha toda la información empresarial relacionada con un cliente, sin obligar al usuario a navegar entre Seguros, POS, Financiamiento, Facturación, Taller, MDM o CRM.

## Propósito empresarial
Reducir tiempo de búsqueda, errores operativos y duplicación de acciones. El expediente debe responder en segundos: quién es el cliente, qué tiene, cuánto debe, qué ha pagado, qué compró, qué pólizas posee, qué documentos existen y qué ocurrió recientemente.

## Alcance visual v1
- Buscador global de cliente.
- Encabezado de identidad + estado + acciones rápidas.
- KPIs de relación comercial.
- Tabs: Resumen, Financiamiento, Pagos, Seguros, Facturas, Equipos, Documentos, Actividad.
- Responsive real: desktop con paneles; móvil con tarjetas compactas y barra de acciones inferior.
- Estado vacío, carga y error separados.

## Reglas
1. El expediente es agregador, no una nueva fuente de verdad.
2. Cada dato viene de su módulo autoritativo.
3. No duplicar saldo, stock, total pagado ni estados derivables.
4. Ocultar una acción por rol es solo UX; backend/RLS decide autoridad.
5. Ningún tab puede borrar toda la pantalla si una consulta secundaria falla.
6. Consultas async deben invalidarse al cambiar de cliente/empresa.
7. Al cambiar de empresa: limpiar cliente, tabs, modales y datos anteriores.
8. Mobile-first: evitar tablas comprimidas; usar cards para detalle operativo.
9. Acciones peligrosas o financieras nunca viven solo en frontend.
10. El módulo no crea tablas nuevas en esta fase de UX.

## Criterios de aceptación del prototipo
- Se entiende el estado financiero del cliente en menos de 5 segundos.
- Cobrar, WhatsApp, nueva factura y ver documentos están a 1–2 toques.
- No hay más de 4 KPIs principales visibles a la vez en móvil.
- La ficha funciona en 390px y desktop sin scroll horizontal.
- Tabs no recargan la página.
- El prototipo usa datos simulados y no toca Supabase.

## No hacer
- No conectar a producción en esta fase.
- No crear un `cliente_360` persistido que replique información de otros módulos.
- No meter todos los campos del cliente en una sola pantalla.
- No usar neumorfismo fuerte, botones gigantes ni exceso de gradientes.
- No modificar `main`.
