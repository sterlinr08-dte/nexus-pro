# «Cuenta segura» publicada (servidor + avisos)

Sigue a `2026-11-12-1814-claude-cobro-cuenta-segura.md` y `2026-11-13-0006-claude-cuenta-segura-ensayo.md`.

## Autorización
El dueño respondió «2- si» a la pregunta de publicar o no la «Cuenta segura» de los cobros (14-nov-2026).

## Qué se hizo, en este orden
1. **Comprobación previa:** las 4 funciones de producción seguían igual que cuando se hizo el ensayo (mismos tamaños: `seguros_registrar_cobro_con_entrega` 4303, `seguros_validar_pago` 3592).
2. **Servidor:** se aplicó en producción (`tnwsgcxurfyuszxsewsn`) el contenido de `supabase/migrations/20261112220000_seguros_cobro_cuenta_segura.sql` con `execute_sql` (el mismo texto del ensayo de 8 casos): función nueva `seguros_cuenta_es_del_admin` y nuevas versiones de `seguros_registrar_cobro_con_entrega`, `trg_abono_preparar_validacion`, `seguros_validar_pago` y `trg_whatsapp_pago_aplicado`.
3. **Verificación en vivo:** las 5 funciones existen y usan la función nueva. Prueba sin efecto: como cajera, transferencia sin comprobante a un cliente inexistente → «Falta el comprobante: adjunte la foto de la transferencia o del depósito» (se rechaza antes de tocar nada).
4. **Avisos en pantalla:** PR de la rama `claude/cobro-cuenta-segura` a `main` (`parches-cobro-cuenta-segura.js`, build `6036`).

## Qué cambia para cada quien
- Cajera y agentes: Transferencia/Depósito sin comprobante no se registra.
- Agente que marca su propia cuenta: el pago queda pendiente; lo valida el administrador, a quien le llega el aviso de WhatsApp.
- Administrador: registra como antes; su cuenta se valida sola.
- Si el comprobante dice una cuenta del administrador (…1654, …1036, …0011) y se elige la de otro agente: se rechaza con el mensaje de qué cuenta elegir.

## Vuelta atrás
Avisos: `localStorage.nx_cuenta_segura_off='1'` o quitar la línea del cargador. Servidor: volver a crear las 4 funciones con su definición anterior (migraciones previas) y borrar `seguros_cuenta_es_del_admin`.

## Pendientes
- El dueño debe avisar a la cajera: la transferencia ahora lleva la foto del comprobante.
- La migración no quedó anotada en la tabla de migraciones de Supabase (se aplicó con `execute_sql`).
- No corrige pagos viejos: siguen por cotejar los 111 sin cuenta registrada (antes del 14-ago) y los 51 marcados «cuenta de Robinson».
- No evita elegir «Efectivo» cuando fue transferencia.
- Falla previa de `qa-registrar-pago.mjs` (alto de la ventana 1,464 > 1,450 px a 390) sigue aparte.
