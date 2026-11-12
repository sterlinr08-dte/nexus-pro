# «Cuenta segura» en Registrar pago — preparado, SIN publicar y SIN aplicar al servidor

## Pedido del dueño
Tras corregir el pago de Ramón Antonio Valdez (entrada `…-claude-correccion-pago-valdez.md`) el dueño dijo «es aquí que tenemos el problema» y pidió preparar la prevención («Prepárala»): que un pago que entra a su cuenta no vuelva a quedar como efectivo o «a cuenta de» otro agente.

## Diagnóstico (fuente de verdad revisada)
- `seguros_registrar_cobro_con_entrega`: la «cuenta destino» es una persona (agente). Si quien aplica es el dueño de esa cuenta, la entrega se confirma sola (`v_auto_conf`) y `trg_abono_preparar_validacion` deja el pago `validado`. Cuando Robinson marca «mi cuenta», nadie más lo revisa.
- `seguros_validar_pago`: un pago pendiente lo valida el dueño de la cuenta o el administrador.
- Comprobantes: `pago_comprobantes` guarda la cuenta leída del comprobante (`ia_cuenta_destino`); `mis_cuentas_bancarias` solo tiene las 3 cuentas del administrador (…1654, …1036, …0011).
- Uso real de los últimos 30 días (Transferencia/Depósito): Administrador 12 de 25 con comprobante, Robinson 26 de 31, **Loribel (cajera) 0 de 24**.

## Qué se preparó
1. **Migración (NO aplicada):** `supabase/migrations/20261112220000_seguros_cobro_cuenta_segura.sql`
   - `seguros_cuenta_es_del_admin(uuid)` (nueva, auxiliar).
   - `seguros_registrar_cobro_con_entrega`: Transferencia/Depósito sin comprobante no se registra (el administrador sí puede); si el comprobante dice una cuenta del administrador y se eligió la de otro agente, se rechaza con el mensaje de qué cuenta elegir; solo la cuenta del administrador se confirma sola.
   - `trg_abono_preparar_validacion`: solo la cuenta del administrador se valida sola; la de otro agente queda `pendiente`.
   - `seguros_validar_pago`: un pago a cuenta de otro agente solo lo valida el administrador.
   - `trg_whatsapp_pago_aplicado`: el aviso «pago pendiente de validación» de esos pagos va al administrador.
   - No cambia montos, asientos, custodia ya registrada ni datos viejos.
2. **Capa de avisos:** `parches-cobro-cuenta-segura.js` (cargada desde `parches-seguros.js`, build `6036`). Envuelve `regAbono()` por fuera: sin comprobante no llama al servidor y avisa «Falta el comprobante»; bajo «Cuenta de destino» muestra «La valida el administrador» y/o «Falta el comprobante»; el rótulo pasa de «Comprobante (opcional)» a «Comprobante *». Apagar avisos en un equipo: `localStorage.nx_cuenta_segura_off='1'` (la regla del servidor es aparte).
3. **Prueba:** `scripts/qa-cuenta-segura.mjs`.

## Pruebas
- `qa-cuenta-segura.mjs`: 22 PASS · 0 FAIL (390 y 1280 px; cajero, administrador y capa apagada).
- `qa-registrar-pago.mjs`: 57 PASS · 1 FAIL. La falla («altura con Transferencia ≤ 1,450 px», mide 1,464 a 390 px) **ya ocurre en `main` sin esta capa** (comprobado quitándola del cargador); no la causa este cambio y queda pendiente aparte.
- **La migración no se ha ejecutado en ningún servidor**: no hay base de pruebas y no se tocó producción. Falta un ensayo con vuelta atrás antes de aplicarla.

## Riesgos y decisiones que faltan del dueño
- La cajera hoy no adjunta comprobantes (0 de 24). Con esta regla no podrá registrar una transferencia sin la foto. Hay que avisarle antes de publicar.
- Un mismo depósito que paga a varios clientes: se adjunta el mismo comprobante en cada pago (la capa del comprobante único ya lo permite mientras la suma no pase del monto).
- No evita que alguien elija «Efectivo» cuando fue transferencia (caso Valdez): eso solo se detecta al cuadrar el efectivo del agente.
- La cuenta de Robinson no está registrada; el control «el comprobante dice otra cuenta» solo reconoce las cuentas del administrador. La cuenta terminada en 1124 sigue sin dueño conocido.
- «Elegir una cuenta bancaria real en vez de una persona» no se hizo completo: requiere registrar las cuentas de cada agente. Queda como paso siguiente.

## Estado
Rama `claude/cobro-cuenta-segura`. Sin PR, sin publicar, sin aplicar la migración. Orden correcto al publicar: primero la migración, después la capa.
