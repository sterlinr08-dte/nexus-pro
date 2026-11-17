# 17-nov-2026 — Claude — Demo: el Café molido queda con precio mínimo RD$240

## Pedido del dueño
- Muse no pudo probar la 6065 («precio debajo del mínimo») porque ningún artículo de la demo tenía precio mínimo.
- El dueño autorizó poner un mínimo en el «Café molido 1 lb» (DEMO-004, precio RD$260) y pidió: «Déjalo para siempre en la demo».

## Qué se hizo
- Se hizo un `update` directo en la demo: `precio_minimo = 240` para DEMO-004 (organización demo `de300000-…0001`).
- **Para siempre:** migración `20261117100000_demo_reiniciar_cafe_precio_minimo.sql` (aplicada). Agrega una línea a `demo_reiniciar()`, justo antes de sembrar el stock: `update pos_productos set precio_minimo = 240 where organizacion_id = v_org and codigo = 'DEMO-004'`.
  - La línea se inserta con `replace` sobre la definición viva, así que el resto de la función queda igual.
  - Si la línea ya está, no hace nada.
- Se repitió `revoke execute` de `demo_reiniciar()` para public, anon y authenticated. Verificado: ninguno tiene permiso.

## Pruebas
- **Ensayo con vuelta atrás:** se cambió la función y se corrió `demo_reiniciar()`. Resultado: `{"borradas": 276, "clientes": 5, "productos": 16}` y mínimo = 240. Todo se deshizo al final.
- **Después de aplicar:** la función tiene la línea nueva y el mínimo de hoy es 240.
- **No se reinició la demo:** el trabajo de Muse de hoy sigue ahí. El reinicio nocturno (`demo-reiniciar-nocturno`, 07:00 UTC) ya lo conserva.
- No hay cambios de código de la página ni de versión.
