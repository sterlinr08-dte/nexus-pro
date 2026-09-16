# 2026-09-16 08:05 — ChatGPT — POS bancos y conciliación operativa

## Alcance

Se continuó la auditoría integral del POS NEXUS PRO omitiendo deliberadamente la parte impositiva. Este corte cubre bancos, movimientos, pagos a proveedores y conciliación bancaria de BAYOLSALE.

## Estado encontrado

- La contabilidad operativa no fiscal ya estaba aplicada mediante `20260916115506_pos_contabilidad_operativa_no_fiscal`.
- BAYOLSALE tiene 1 venta completada y 1 compra recibida; ambas poseen asiento contable y los asientos están cuadrados.
- Producción tenía aplicada `20260916120521_pos_bancos_conciliacion_operativa`, pero su archivo aún no estaba versionado en GitHub.
- BAYOLSALE actualmente tiene 0 cuentas bancarias configuradas y 0 movimientos bancarios reales. No se inventó ninguna cuenta ni número bancario.

## Funcionalidad bancaria verificada

La fase incluye:

- CRUD de cuentas bancarias por organización con validación de duplicados y una sola cuenta predeterminada activa.
- Registro de movimientos bancarios con origen trazable.
- Registro de extractos con fingerprint anti-duplicado.
- Conciliación 1:1 por cuenta y monto; no permite reutilizar un movimiento o extracto ya conciliado.
- Desconciliación controlada.
- Asignación de cobros de venta por tarjeta/transferencia sin exceder el importe cobrado por ese método.
- Clasificación de compras de contado como efectivo o banco.
- Pagos parciales a proveedores para compras a crédito, con asiento contable y movimiento bancario cuando aplica.
- Resumen por cuenta: saldo libro, saldo conciliado, pendientes del sistema y pendientes del extracto.

## QA transaccional

Se ejecutó una prueba completa dentro de `BEGIN ... ROLLBACK` usando contexto autenticado del administrador de BAYOLSALE:

1. Cuenta temporal con saldo inicial RD$1,000.
2. Movimiento de sistema +RD$250.
3. Extracto bancario +RD$250.
4. Conciliación.
5. Verificación: saldo libro RD$1,250, saldo conciliado RD$1,250, 0 pendientes.
6. Desconciliación.
7. Verificación: 1 pendiente del sistema y 1 pendiente del extracto.
8. `ROLLBACK` final: no quedó ningún dato ficticio.

Resultado: `banco_qa = OK`.

## Endurecimiento aplicado

Migración `20260916121420_pos_bancos_concurrencia_y_rls`:

- Reemplaza la policy histórica `pos_compra_pagos_admin` dirigida a `PUBLIC` por policies explícitas para `authenticated` y por organización.
- Lectura de pagos de compra: usuarios autenticados válidos de su empresa.
- Inserción: admin, gerente y cajero.
- Actualización/eliminación: admin y gerente.
- `pos_banco_asignar_pago_venta` bloquea la venta con `FOR UPDATE` antes de calcular cuánto ya fue asignado.
- `pos_banco_clasificar_compra_contado` y `pos_banco_registrar_pago_proveedor` bloquean la compra con `FOR UPDATE`, evitando doble clasificación/doble pago concurrente.
- Las RPC bancarias permanecen `SECURITY INVOKER`; `anon`/`PUBLIC` no tienen `EXECUTE`.

## Seguridad

El asesor de Supabase no reportó una nueva alerta originada por las tablas/RPC bancarias. Persisten hallazgos globales anteriores ajenos a este corte, entre ellos protección de contraseñas filtradas desactivada y funciones `SECURITY DEFINER` históricas que requieren revisión separada.

## Archivos sincronizados

- `supabase/migrations/20260916120521_pos_bancos_conciliacion_operativa.sql`
- `supabase/migrations/20260916121420_pos_bancos_concurrencia_y_rls.sql`

## Pendiente funcional

No hay una cuenta bancaria real de BAYOLSALE configurada. Para comenzar a conciliar operaciones reales se debe registrar la cuenta verdadera desde Configuración/Bancos con banco, alias, número, tipo, moneda y saldo inicial reales. No se creó información ficticia.
