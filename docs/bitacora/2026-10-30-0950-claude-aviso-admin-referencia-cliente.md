# 2026-10-30 09:50 (RD) — Claude — El aviso al administrador lleva la referencia del cliente

## Solicitud del dueño
«En NEXUS PRO yo quiero que al administrador los mensajes de confirmación me lleguen también el nombre de las referencias.»
Preguntado, eligió: la **persona de referencia/apodo de la ficha del cliente** (campo «Referencia o apodo», `clientes.referencia`),
y la forma «junto al cliente, hoy mismo» (sin plantilla nueva de Meta).

## Diagnóstico y fuente de verdad
- El aviso al administrador al validarse un pago es la plantilla aprobada `pago_validado_admin_ciclo`
  (Edge `whatsapp-pagos-agente-notificar`, variable {{4}} = cliente). La arma el trigger `trg_whatsapp_pago_validado` sobre los abonos.
- La definición vigente en producción incluía `validado_por_agente_id` (25-sep) y **no coincidía** con el último archivo de migración
  (`20260921160000`), así que la nueva migración parte de la definición real de la base.
- 97 de 118 clientes tienen referencia. Un solo administrador activo (ESTERLIN).

## Cambio
- Migración `supabase/migrations/20261030134500_pago_validado_admin_referencia_cliente.sql`: redefine `trg_whatsapp_pago_validado`.
  Solo cambia la variable «cliente» del mensaje al administrador: `NOMBRE (ref.: REFERENCIA)`; sin referencia, solo el nombre.
  El mensaje al agente y el del cliente quedan igual. Plantillas: ninguna nueva.
- Resultado: «Hola ESTERLIN. El agente ROBINSON validó un pago de RD$ 4,500.00 del cliente LORENZO SOLIS PEREZ (ref.: EDWIN MENSAJERO) en NEXUS PRO. …»

## Pruebas
- La función se creó dentro de una transacción con ROLLBACK (compila, texto de ejemplo con un cliente real) antes de aplicarla.
- **Aplicada en producción** (`tnwsgcxurfyuszxsewsn`) con `apply_migration`, 09:47 RD. Verificado: la función contiene el cambio y el trigger sigue activo (1).
- No se envió ningún WhatsApp de prueba. El primer pago que se valide ya saldrá con la referencia.

## Riesgos / pendientes
- Si la referencia es muy larga, el mensaje crece; Meta admite variables largas, pero conviene que las referencias sean cortas.
- Rama `claude/aviso-admin-referencia` con la migración y esta bitácora; se fusiona a `main` solo como registro (no hay cambio de frontend).
