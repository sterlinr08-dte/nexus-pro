# 15-nov-2026 — Claude — Empresa de demostración del POS PUBLICADA

**Autorización:** el dueño escribió «Publícalo». Regla del dueño: la demo va **sin IA ni WhatsApp**.

## Qué se publicó (build `6038`)
- `demo.html` → `nexusprord.com/demo`: botón «Entrar a la demo» (54 px, sin desplazamiento horizontal a 390 y 1280 px).
- Edge Function `demo-entrar` v1 (`verify_jwt=false`, pública a propósito): pone una clave al azar al usuario demo, inicia sesión y devuelve solo la sesión; la página entra por el pase `#access_token=…` que ya existía (`nxRecibirPaseSSO`).
- `parches-pos.js`: interruptor «Botones de WhatsApp» por empresa (clave `whatsapp` en `pos_config.modulos_off`; clase `body.nx-sin-wa`).
- Migración `20261115190000_pos_demo_tienda.sql` (aplicada por SQL directo): organización `demo` (`de300000-…0001`, tipo tienda), usuario `demo` rol **gerente** (no admin), usuario de Auth con clave al azar, función `demo_reiniciar()` (borra todo lo de esa empresa y siembra 16 artículos, 5 categorías, 5 clientes de ejemplo, almacén, secuencias, 20 cuentas; `modulos_off = ia, reparaciones, whatsapp`). Sin NCF y sin ventas sembradas.

## Verificado en producción con la sesión de la demo
- Ve: 16 productos, 5 clientes, su organización.
- No ve (0 filas): `clientes`, `abonos`, `agentes`, `usuarios_sistema`, `whatsapp_config`, `configuracion`.
- No puede cambiar `pos_config` (0 filas afectadas); `seguros_acumulado_validado_agente` → permission denied; SMS → sin configurar.

## Pendiente
- Programar la limpieza nocturna (`cron.schedule('demo-reiniciar-nocturno','0 7 * * *')`) y probar un segundo reinicio con datos creados.
- Prueba de punta a punta en vivo (entrar, vender, imprimir).
- `demo.nexusprord.com` (Cloudflare) cuando el dueño quiera.
- Desplegar `ecf-mseller` con lista de autorizadas antes del registro por la web.
