# 15-nov-2026 — Claude — Demo del POS: corrección para usuarios no administradores (build 6039)

Parte de la entrega autorizada «Publícalo» de la demo (ver `…pos-demo-publicada.md`).

## Error encontrado al probar en vivo
La demo iniciaba sesión, pero abría la pantalla de Seguros vacía en vez del POS. Causa: `nxCargarOrg()` lee la empresa en `usuarios_sistema`, y la política `all_usuarios_sistema` solo deja leer esa tabla al **admin**. El usuario demo es `gerente`, así que su empresa quedaba sin resolver. Afectaba a cualquier usuario no administrador de una tienda (hasta hoy solo había administradores en tiendas).

## Arreglo (`index.html`)
Si no se pudo leer la empresa, se pregunta al servidor con `rpc/mi_organizacion` (función ya existente, devuelve solo la empresa del propio usuario).

## Prueba
Local con sesión real de la demo, 390 y 1280 px: abre «TIENDA DEMO · Punto de venta», Vender lista los 16 artículos, sin IA, sin Reparaciones, sin Ajustes, botones de WhatsApp apagados, 0 errores de JS. `qa-pos-negocio` 26/26, `qa-pos-fase1` 36/36.
