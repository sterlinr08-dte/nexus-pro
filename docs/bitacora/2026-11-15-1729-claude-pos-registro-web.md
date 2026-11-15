# 15-nov-2026 — Claude — Registro de tiendas por la web (rama, SIN publicar)

**Pedido del dueño:** «Termina lo de las tiendas primero». Entrega 1 del plan: registro por la web.
**Decisiones del dueño (botones):** 14 días de prueba · cobro por transferencia que él activa · teléfono WhatsApp + su aprobación.

## Qué hace
1. `registro.html` → `nexusprord.com/registro`: negocio, nombre, WhatsApp (809/829/849), usuario y clave (8+). Al terminar muestra «su usuario para entrar: maria@colmado-la-fe», la fecha de la prueba y «Entrar a mi tienda» (entra ya logueado, en modo claro). Enlace desde la demo.
2. Edge `registro-tienda` (nueva, pública, `verify_jwt=false`): valida; límite 3 intentos por conexión al día y 40 tiendas nuevas al día; dirección única a partir del nombre (sin acentos, reservadas: nexus*, demo, admin, studio, bayol…); crea organización (tipo tienda, `activo_hasta` = hoy + 14 días, `origen` web, `aprobado` false, `email_dominio` `@<slug>.nexus-pro.local`), su admin (usuarios_sistema + Auth + profiles) y la siembra; si algo falla, deshace todo. Devuelve la sesión.
3. **Usuarios por empresa:** el correo interno de una tienda es `usuario@<slug>.nexus-pro.local`. Dos tiendas pueden tener «maria». Se entra con `usuario@tienda`. Cambios: `index.html` (`doLogin` toma `email_dominio` de la empresa si no tiene app propia; aviso «El acceso de X venció»), `crear-usuario-staff` (su fuente no estaba en el repo: copiada de la v16 desplegada y ajustada; único por empresa; rechaza si la empresa está suspendida), `usuarios-acceso` (mismo criterio). Empresas sin `email_dominio` (correduría, bayolsale, demo) siguen exactamente igual.
4. **Suspensión real:** `mi_organizacion()` devuelve null si la empresa está inactiva o con `activo_hasta` vencido → sin datos por RLS. Hoy ninguna empresa tiene `activo_hasta`; la única inactiva es `geriatra` (base propia; su único usuario aquí deja de ver datos de esta base).
5. **Panel del dueño:** `superadmin_orgs` trae contacto/origen/aprobado y pone primero las tiendas por aprobar; `superadmin_org_accion(org, aprobar|suspender|activar|mas30)` solo para el superadmin y nunca sobre `nexus-pro`. Botones en la tarjeta (≥44 px) y enlace al WhatsApp del registro.
6. `pos_sembrar_tienda(org)`: configuración (nombre del negocio; módulos de tienda general apagados: ia, reparaciones, entidades, crm, rrhh, cuotas, apartados — el dueño de la tienda los puede encender), almacén, 11 secuencias, 20 cuentas. Sin productos.

## Migración `20261115230000_pos_registro_web.sql` (NO aplicada)
Ensayos con vuelta atrás en producción: (a) demo vencida → `mi_organizacion` null y 0 productos; reactivada → 16; correduría igual (admin `nexus-pro`, cajera 119 clientes). (b) siembra: config + 1 almacén + 11 secuencias + 20 cuentas, repetible sin duplicar; `authenticated` no puede sembrar; `anon` no lee intentos. (c) panel: superadmin ve 9 empresas con los campos nuevos; +30 días; suspender deja sin acceso; no se puede tocar `nexus-pro`; la cajera recibe NO_AUTORIZADO y lista vacía.

## Pruebas
`scripts/qa-registro-web.mjs` 22/22 a 390 y 1280 px (función simulada). Regresión: negocio 26, fase1 36, vender-toque 24. Funciones: sintaxis revisada con esbuild (no hay Deno aquí). **No probado:** el registro real de punta a punta (requiere desplegar la función).

## Para publicar
Aplicar la migración; desplegar `registro-tienda` (nueva), `crear-usuario-staff` y `usuarios-acceso`; publicar build 6047. Luego crear una tienda de prueba real, entrar con `usuario@tienda`, crear un cajero, vender, y borrarla.
