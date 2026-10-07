# Plan: llevar al POS multiempresa de NEXUS PRO lo que STUDIO ya tiene

**Pedido del dueño (07-oct-2026):** «replicar el sistema de Studio y ponerlo en punto de venta sin la base de datos… para cuando yo quiera venderlo a un cliente», y luego «sobre replicar lo que le hace falta al punto de venta de Studio en funciones».

**Alcance:** se pasan **funciones y código genérico**. No se pasan datos, marca, dominio, números ni base de STUDIO.

**Estado:** Fase 0, la auditoría, está **hecha y es solo lectura**. No hay código. **Cada fase de abajo necesita la autorización del dueño.**

**Fuentes:**
- `main` de `sterlinr08-dte/nexus-pro` (versión 59.15, `parches-pos.js` de unas 12.0k líneas);
- `main` de `sterlinr08-dte/studio-rd` (versión 59.92, `parches-pos.js` de unas 15.7k líneas, más 6 módulos);
- migraciones de STUDIO en `supabase/studio/15–38` y `supabase/35–51`.

**Regla que hay que ajustar al empezar:** AGENTS.md §3 dice «No añadir nada de STUDIO a este repositorio».
- Esa regla protege los **datos y la operación** de STUDIO.
- Al activar la Fase 1 se escribe la excepción: se permite portar **funciones genéricas** sin datos, sin marca y sin la base de STUDIO.

## Resumen

- STUDIO salió de este mismo POS (sus migraciones 01–14 son idénticas a las de NEXUS).
- Desde la separación, el 22-sep, NEXUS **no ha tenido cambios en el POS**: de la 58.86 a la 59.15 todo fue diseño y WhatsApp.
- STUDIO tiene unas **330 funciones que NEXUS no tiene**, 6 módulos aparte y unas 35 migraciones nuevas. NEXUS no tiene nada que STUDIO no tenga, salvo `nxStaffCrear`.

## Fallas encontradas en NEXUS (verificadas)

1. **El enlace de firma del financiamiento del POS está roto.** `parches-pos.js:11932` (`nxFinV2LinkFirma`) arma `/firma-financiamiento.html?t=…`, pero esa página y sus funciones (`pos_fin_firma_ver` y `pos_fin_firma_guardar`) no existen en NEXUS. Solo existe `firma-prestamo.html`, que es de Préstamos.
2. **La cartera se corta.** `parches-pos.js:173–174` carga como máximo 300 financiamientos, 2000 cuotas y 3000 pagos. Una empresa con más ve saldos incompletos. STUDIO lo resolvió con `getTodasPOS`, que carga de 1000 en 1000 hasta el final.
3. **El abono de fiado se hace desde el navegador.** Va con un INSERT directo y para anular se borra (DELETE). No evita los cobros dobles ni deja un reverso. STUDIO lo hace con una función del servidor que lleva un id de operación, y anula con un reverso.
4. **El saldo de fiado puede contar dos veces** las ventas que tienen plan de cuotas. STUDIO usa la vista `pos_ventas_fiado`.
5. **El dinero se muestra sin centavos** (`fmt` redondea a pesos). STUDIO usa siempre «RD$ 1,250.00» y muestra la línea «Redondeo».

## Qué falta en NEXUS, por área

| Área | Función de STUDIO | En NEXUS | Base de datos |
|---|---|---|---|
| Ventas | Botones inteligentes de Factura (Guardar, +Imprimir, +WhatsApp, Anular, F4/F6/F7/F8) con revisión previa | Parcial | No |
| Ventas | Los mismos botones en Prefactura, Cotización, Reparación, Nota de crédito, Apartado y Compra | No | No |
| Ventas | Asistente de factura (precio bajo el costo, deuda del cliente, sugerencias, «En espera») | No | No |
| Ventas | Impresión moderna con QR de verificación (`verificar.html`) | Parcial, sin QR | 27, 28 |
| Ventas | Solo el administrador cambia el cliente al cobrar | No | No |
| Clientes | Crear cliente desde «Elegir cliente» | No | No |
| Clientes | Revisar y unir duplicados, cédula única, códigos C-/PR-/BC- | No | 50 (ajustar) |
| Inventario | Compra «con ITBIS» o «informal» (606 y costo real) | No | 23 |
| Inventario | Códigos automáticos PRD-00xxxx y empleados 001 | No | 48 (ajustar) |
| UI | Buscador con lupa en todas las listas de 10 o más | No | No |
| UI | Listas de 10 en 10 con búsqueda en toda la lista (Reglamento 13) | No | No |
| UI | Dinero «RD$ 1,250.00» con «Redondeo» | Parcial | No |
| Fiado | Abono por función del servidor, anulación con reverso, vista `pos_ventas_fiado` | Débil | 37, 37e |
| Financiamiento | Candados de cobro (capital + interés + mora cuadran, hora RD) | No | 37, 38 (comparar las funciones) |
| Financiamiento | «Financiamiento fácil»: inicio con 3 botones, quién paga hoy, cobrar en 3 toques, cotizador, solicitud en 5 pasos | No | 35, 36 |
| Financiamiento | Firma por enlace y expediente (cédula, selfie, video); no deja aprobar si falta algo | **Roto** (falla 1) | 24, 25 |
| Financiamiento | Perfil, fiador y evaluación con puntaje | Solo en Préstamos | 26 |
| Financiamiento | Datos legales del contrato, plantilla editable y vigencia del enlace | No | 29 |
| Financiamiento | Cuota fija (sistema francés) | Solo en Préstamos | 30 |
| Financiamiento | IMEI vendido al aprobar | No | 32 |
| Financiamiento | Recibo REC- con monto en letras y estado de cuenta | No | 28 |
| Financiamiento | Cobranza por prioridad, historial crediticio y tablero de reportes | Solo en Préstamos | No (lectura) |
| Personal | Una persona, una ficha (Entidad ↔ Empleado ↔ Usuario); vendedores y técnicos desde empleados | Parcial (`pos_vendedores`) | 47, 49 (ajustar) |
| Personal | Usuarios y acceso: ficha única, clave por WhatsApp, vincular a empleado | Parcial | 46 + función `crear-usuario-staff` |
| Configuración | Por secciones con avisos (RNC sin validar, NCF por agotarse) | Plana | No |
| Configuración | Datos de la empresa en `pos_config` (RNC, dirección, pie de factura) | Usa la config de Seguros | 43 |
| Reportes | Unos 70 reportes estilo Infoplus (606/607/ITBIS, kárdex, antigüedad, comisiones, arqueo), con impresión y Excel | Un solo tablero | No (lectura) |
| Opcional | Reacondicionado (taller por lotes en 6 etapas) | No | 18, 19 (ya multiempresa) |
| Opcional | CRM con embudo y actividades | Básico | 33, 34, 40, 41, 44, 45 |
| Opcional | Animaciones del menú del POS | — | No |

## Orden propuesto (cada fase se autoriza aparte; ninguna se publica sin «publícalo»)

**Fase 1: arreglos y mejoras sin migración.** Es el riesgo más bajo.
- Corregir el corte de la cartera (falla 2).
- Buscador con lupa.
- Listas de 10 en 10.
- Formato «RD$ 1,250.00», que toca pantallas de dinero: hay que auditar antes.
- Botones inteligentes en Factura y documentos.
- Asistente de factura.
- Crear cliente desde «Elegir cliente».
- Cambiar el cliente al cobrar, solo el administrador.

**Fase 2: dinero seguro.** Necesita migraciones y probarlas antes.
- Abono de fiado en el servidor con reverso (37, 37e).
- Vista `pos_ventas_fiado`.
- Candados de cobro: la 38 se reescribe **comparando con las funciones actuales de NEXUS**.
- Compra con ITBIS o informal (23).

**Fase 3: financiamiento completo.** Repara la falla 1.
- Firma y expediente (24, 25).
- Perfil, fiador y evaluación (26).
- Verificación QR (27, 28).
- Contrato legal y plantilla (29).
- Cuota fija (30).
- IMEI (32).
- Financiamiento fácil (35, 36).
- Recibo REC- y estado de cuenta.
- Cobranza y reportes.
- Antes de esta fase hay que decidir si el Financiamiento del POS y Préstamos (`parches-financiamiento.js`) **conviven o se unen**.

**Fase 4: personas, clientes y configuración.**
- Las migraciones 46–50 **con el relleno corregido para que vaya por organización**. Hoy, en STUDIO, el relleno de la 48 y la 49 y la línea 52 de la 50 miran la tabla entera, y en NEXUS eso afectaría a otras empresas.
- Configuración por secciones y datos de la empresa (43).

**Fase 5: reportes estilo Infoplus.** Son de solo lectura y casi todo es pantalla. Hay que comprobar que los nombres de las columnas coincidan.

**Fase 6, opcional por empresa:**
- Reacondicionado, con una bandera por empresa.
- CRM con embudo. Antes hay que elegir el proveedor de la bandeja: **Meta Cloud API, que usa NEXUS, o Zernio, que usa STUDIO**.

**Después, compartido:** la factura electrónica e-CF con MSeller (ver `docs/ECF-MSELLER.md` en studio-rd), hecha una sola vez para las dos.

**Cada fase lleva:**
- bitácora;
- pruebas de la base en una transacción que se deshace;
- QA con Playwright a 390 y 1280 px;
- y que no cambie nada a las empresas que ya usan el POS de NEXUS.

## No se porta (es de STUDIO)

- **Base de datos:**
  - proyecto Supabase `edbknlkjnlfmkkiizdbe` y su clave anónima en `web-visitas.js`, `mayoristas.html`, `firma-financiamiento.html` y `verificar.html`;
  - Sentry DSN.
- **Dominios y contacto:**
  - studiord.net y `STUDIO_APP_URL`;
  - Instagram studio__rd;
  - teléfonos 829-624-7623 y 809-570-6254;
  - la dirección de Santiago.
- **Marca:**
  - logos, negro y oro `#C9A227`;
  - `studio-*.css` y `html.nx-studio`;
  - los respaldos `|| 'STUDIO'` en mensajes y documentos, que en NEXUS deben usar el nombre de la organización.
- **Migraciones de datos o atadas a STUDIO:**
  - 16, 22 y 31;
  - `38_crm_whatsapp_studio`;
  - el slug `'studio'` de la 51;
  - `'STUDIO'` como respaldo en la 35.
- **Decisiones propias de STUDIO:**
  - `STUDIO_ASIENTO_VENTA_SERVIDOR`, que depende de su plan de cuentas;
  - el módulo de IA oculto;
  - `FIN_FACTURA_CUOTAS = false`.
- **Tienda, `lq-n9.html`, contador de visitas y catálogo mayorista.**
  - El catálogo mayorista sí puede ser un producto aparte, pero su tabla no tiene `organizacion_id` y habría que rehacerla.
