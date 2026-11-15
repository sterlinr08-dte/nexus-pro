# 2026-11-15 09:34 — Claude — Análisis: POS como sistema estándar para cualquier empresa

**Pedido del dueño:** «El sistema POS ayúdame a analizar para ponerlo como un sistema standard que lo pueda usar cualquier empresa». Solo análisis: no se cambió código, base ni datos.

## Fuentes revisadas (nada supuesto)
- Código de `origin/main` (commit 0dbf0c2): `parches-pos.js`, `parches-pos-*.js`, `index.html`, `parches-panel-dueno.js`, `supabase/migrations/`, `supabase/studio/`, `supabase/functions/`.
- Base de producción `tnwsgcxurfyuszxsewsn` (solo lectura, 15-nov-2026).
- `ARQUITECTURA-POS.md`, `AUDITORIA-POS.md`.

## Lo que ya está listo
- 52 tablas `pos_*`, todas con `organizacion_id` y RLS; 62 políticas, todas filtran por `mi_organizacion()`; ninguna abierta a `anon`. 71 funciones `pos_*`, 3 `security definer`, las 3 filtran por empresa.
- 24 módulos (vender, facturas, inventario, compras, caja, cuotas, apartados, contabilidad, reportes, reparaciones…).
- Permisos por rol y empresa en `pos_acceso` (qué módulos ve cada rol).
- e-CF por MSeller con datos del emisor por empresa (`pos_config.ecf_*`); bloqueado por el certificado .p12.
- Libro manual «Clientes SaaS» (`saas_suscripciones`, `saas_pagos`).

## Lo que impide venderlo a cualquier empresa
1. **Alta de empresa a mano:** no hay pantalla ni función; se hace con scripts SQL (`supabase/studio/01..14`). Panel superadmin solo lectura.
2. **Usuarios globales:** el correo interno es `usuario@nexus-pro.local`; dos empresas no pueden tener el mismo usuario.
3. **Recibo y reportes con datos globales:** `empInfo()` lee `configuracion` (solo la escribe la org `nexus-pro`); el ticket no usa logo ni datos de la empresa; pie fijo.
4. **Contabilidad automática solo para una empresa:** 4 funciones en producción llevan fijo el uuid `c6e4b954…`; las demás empresas no generan asientos.
5. **Permisos de rol solo en pantalla:** en la base, cualquier usuario de la empresa puede escribir casi todas las tablas POS (solo 11 de 62 políticas distinguen rol). Roles del POS (gerente, vendedor) no coinciden con los que acepta `usuarios-acceso`.
6. **Suspensión no real:** `mi_organizacion()` no revisa `activo` ni `activo_hasta`; solo se bloquea en una de las rutas de login.
7. **Sin módulos por empresa ni tipo de negocio:** IMEI (184 líneas), reparaciones y financiamiento salen para todos; no se apagan por empresa.
8. **Fijo a RD:** «RD$» (~120 líneas), ITBIS 18 % (~62), NCF/e-CF. Sirve para RD; no para otro país.
9. **Fiscal incompleto:** 607 solo imprimible (no TXT DGII); 606 y 608 no existen; una sola cuenta MSeller global.
10. **Operación:** sin importar clientes ni Excel; respaldo no cubre POS; sin modo sin internet; impresión solo por el navegador; una sola clave global de WhatsApp (Zernio) y de IA.
11. **Marca:** «NEXUS PRO» fijo en ~100 líneas; `crear-usuario-staff` y `superadmin_orgs` existen en producción pero no en el repo.

## Uso real hoy
8 organizaciones; solo `nexus-pro` (10 ventas, última 30-ago-2026) y `bayolsale` (1 venta, 21-jun-2026) tienen ventas POS. Ninguna lo usa a diario.

## Nota de seguridad verificada
`organizaciones` se lee sin sesión (`org_lectura_publica`), incluido `auth_key` de 3 empresas. Se comprobó que las 3 llaves son de tipo `anon` (públicas por diseño), no secretas. Conviene igual limitar las columnas visibles.

## Propuesta por fases (pendiente de decisión del dueño)
- **Fase 1 — Base vendible:** datos de empresa por organización (nombre, RNC, logo, pie del recibo), alta de empresa con un botón para el dueño, usuarios por empresa, suspensión real, contabilidad para todas, permisos de rol en la base.
- **Fase 2 — Tipos de negocio:** módulos encendidos por empresa y plantillas (tienda general, celulares, taller, servicios).
- **Fase 3 — Fiscal RD completo:** 606/607/608 en formato DGII, e-CF por empresa.
- **Fase 4 — Operación:** importar productos y clientes por Excel, respaldo POS, impresora térmica, sin internet.
- **Fase 5 — Venta:** planes, prueba gratis, registro por la web, cobro.

## Estado
Sin cambios en código ni base. Rama `claude/bitacora-pos-estandar` (solo bitácora y memoria). Siguiente paso: el dueño decide alcance (solo RD o no, a quién vender primero) y si arranca la Fase 1.
