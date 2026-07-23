# Propuesta visual — Módulo de Contabilidad

> Rama de trabajo: `chatgpt/visual-draft`
>
> Esta propuesta es visual y funcional. **No modifica `main`, no usa GitHub Actions y no debe implementarse mediante detectores del DOM.** Claude debe revisar el código real y reimplementar únicamente lo compatible dentro de las funciones reales del sistema.

## Objetivo

Crear un módulo contable moderno para NEXUS PRO Multiempresa que centralice la información financiera proveniente de Facturación, Caja, Compras, Inventario, Bancos, Cuentas por cobrar y Cuentas por pagar.

El módulo debe permitir responder rápidamente:

- cuánto ingresó la empresa;
- cuánto gastó;
- cuál es la utilidad;
- cuánto hay en caja y bancos;
- cuánto deben los clientes;
- cuánto se debe a proveedores;
- qué documentos están pendientes de contabilizar;
- y si existe algún descuadre.

## Navegación propuesta

1. Resumen
2. Diario
3. Mayor
4. Plan de cuentas
5. Bancos y conciliación
6. Cuentas por cobrar
7. Cuentas por pagar
8. Gastos
9. Impuestos
10. Reportes
11. Configuración

## Pantalla inicial — Resumen contable

### Encabezado

- Título: **Contabilidad**
- Empresa activa
- Sucursal activa
- Período contable
- Acción de filtros

### Indicadores principales

- Ingresos
- Gastos
- Utilidad neta
- Saldo en cuentas
- Cuentas por cobrar
- Cuentas por pagar
- ITBIS por pagar
- Documentos pendientes

Cada indicador debe mostrar:

- valor del período;
- comparación con el período anterior;
- estado visual sutil;
- acceso al detalle real, únicamente cuando exista la función.

### Flujo de efectivo

Visualización de:

- ingresos;
- gastos;
- utilidad;
- comparación mensual.

### Distribución de gastos

Categorías sugeridas:

- costo de ventas;
- gastos operativos;
- gastos administrativos;
- gastos financieros;
- otros gastos.

### Últimos movimientos

Columnas en escritorio:

- fecha;
- comprobante;
- descripción;
- cuenta;
- débito;
- crédito;
- estado.

En móvil debe convertirse en filas compactas, sin una tabla horizontal ilegible.

## Diario contable

Cada asiento debe incluir:

- fecha;
- número de asiento;
- descripción;
- empresa;
- sucursal;
- origen;
- documento relacionado;
- cuentas afectadas;
- débito;
- crédito;
- usuario;
- estado.

Estados:

- Borrador
- Contabilizado
- Pendiente de revisión
- Anulado

## Automatización contable

Las operaciones existentes deben poder generar asientos sin duplicar registros.

### Factura de contado

- Débito: Caja o banco
- Crédito: Ventas
- Crédito: ITBIS por pagar
- Débito: Costo de ventas
- Crédito: Inventario

### Factura a crédito

- Débito: Cuentas por cobrar
- Crédito: Ventas
- Crédito: ITBIS por pagar

### Compra

- Débito: Inventario o gasto
- Débito: ITBIS adelantado
- Crédito: Caja, banco o cuentas por pagar

### Pago de gasto

- Débito: Cuenta de gasto
- Crédito: Caja o banco

No inventar integraciones que no existan. Claude debe identificar primero qué documentos y tablas reales están disponibles.

## Bancos y conciliación

Mostrar por cuenta:

- saldo contable;
- saldo bancario;
- diferencia;
- movimientos conciliados;
- movimientos pendientes;
- cargos bancarios;
- depósitos en tránsito.

La acción **Conciliar cuenta** solo debe implementarse si existe el flujo real o si se desarrolla formalmente con datos persistentes.

## Caja

Contabilidad no cobrará desde esta pantalla.

Debe limitarse a visualizar:

- aperturas;
- cierres;
- arqueos;
- ingresos;
- egresos;
- diferencias;
- depósitos;
- movimientos contabilizados.

Los cobros continúan realizándose desde Facturación y Forma de pago.

## Cuentas por cobrar

Indicadores de antigüedad:

- por vencer;
- 1–30 días;
- 31–60 días;
- 61–90 días;
- más de 90 días.

Datos principales:

- cliente;
- documento;
- monto original;
- balance;
- vencimiento;
- días vencidos;
- agente;
- sucursal;
- estado.

## Cuentas por pagar

- proveedor;
- factura de compra;
- fecha;
- vencimiento;
- monto original;
- balance;
- pagos parciales;
- anticipos;
- retenciones;
- estado.

## Gastos

Registro con:

- fecha;
- categoría;
- proveedor;
- descripción;
- monto;
- ITBIS;
- método de pago;
- caja o banco;
- comprobante;
- evidencia;
- sucursal;
- centro de costo.

## Impuestos — República Dominicana

Preparación y validación de:

- ITBIS;
- 606;
- 607;
- 608;
- 609 cuando aplique;
- NCF utilizados;
- NCF anulados;
- retenciones.

No prometer envío automático a la DGII sin confirmar integración, certificación y requisitos técnicos.

## Reportes

- Balance general
- Estado de resultados
- Balanza de comprobación
- Libro diario
- Libro mayor
- Flujo de efectivo
- Gastos por categoría
- Cuentas por cobrar
- Cuentas por pagar
- Inventario valorizado
- Costo de ventas
- Impuestos
- Rentabilidad por empresa
- Rentabilidad por sucursal

## Diseño visual aprobado

- Namespace de referencia: `.nxPf`
- Azul principal: `#2563eb`
- Tipografía: Plus Jakarta Sans
- Sidebar grafito: `#14161f` → `#0a0b10`
- Fondo gris azulado suave
- Tarjetas blancas
- Bordes discretos
- Radios de 12–14 px
- Sombras suaves
- Botones de ancho natural
- Tablas compactas en escritorio
- Filas o tarjetas compactas en móvil
- Sin efectos glow fuertes
- Sin exceso de colores

## Reglas de implementación

Claude debe:

1. Auditar primero las funciones reales, tablas, estados e integraciones existentes.
2. No añadir scripts al final de `parches.js`.
3. No usar `MutationObserver`.
4. No buscar botones o pantallas por texto visible.
5. No inventar funciones, estados, botones, cifras o integraciones.
6. Modificar directamente el HTML/CSS generado por las funciones reales.
7. Mantener ids, `onclick`, `name`, `data-*` y lógica existente.
8. Validar escritorio y móvil.
9. Implementar por fases.

## Fases recomendadas

### Fase 1 — Base

- Resumen
- Plan de cuentas
- Diario
- Mayor
- Asientos manuales
- Asientos automáticos básicos
- Balance general
- Estado de resultados

### Fase 2 — Operación

- Gastos
- Cuentas por cobrar
- Cuentas por pagar
- Bancos
- Conciliación
- Centros de costo

### Fase 3 — Fiscal

- ITBIS
- 606
- 607
- 608
- Retenciones
- Validación de NCF

### Fase 4 — Inteligencia financiera

- Proyecciones
- Flujo de efectivo futuro
- Alertas
- Rentabilidad por empresa
- Rentabilidad por sucursal
- Detección de descuadres

## Mockup

Ver: [`mockup-contabilidad-desktop-mobile.svg`](./mockup-contabilidad-desktop-mobile.svg)
