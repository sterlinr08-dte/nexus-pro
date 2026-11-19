# 18-Nov-2026 22:45 (RD) — Claude — Cajón del Punto de venta en el iPhone: velo pegado y altura (6070)

## Pedido
- Prueba de Muse de la 6069 en el iPhone, demo de la tienda:
  - punto 5: al cerrar el cajón ☰ tocando fuera, a veces quedaba un velo oscuro que bloqueaba la página;
  - punto 6: el cajón era más alto que la pantalla, y para ver «Cerrar sesión» y la versión había que desplazarlo.

## Diagnóstico (demo en vivo, iPhone 13 simulado)
- **No viene de la 6069.** El menú de dos niveles no se activa en las tiendas; los dos fallos son del cajón propio del Punto de venta (`#nxTSide`, `parches-pos.js`).
- **Velo pegado:**
  - con el cajón abierto en Inicio, el refresco automático de cada minuto vuelve a dibujar la pantalla;
  - el cajón nuevo sale cerrado, pero `body.nxTDrawer` seguía puesto, así que el fondo oscuro quedaba solo;
  - además, tocar el fondo alternaba (`nxPosToggleSide`) y en ese estado reabría el cajón en vez de cerrarlo.
  - Reproducido: a los 65 s con el cajón abierto queda el velo y el cajón escondido.
- **Altura:**
  - la animación de entrada de las vistas (`.view.on`, `nxFadeSlideRight ... both`, en `parches-seguros-base.js`) deja `transform` y `filter` puestos en `#v-pos`;
  - por eso el cajón fijo medía lo que la página (1412 px) y no lo que la pantalla (664 px).

## Cambios (`parches-pos.js`)
- Nueva `window.nxPosCerrarSide()`. El fondo oscuro ahora siempre **cierra** el cajón.
- Al volver a dibujar, el cajón conserva su estado: si estaba abierto, sigue abierto.
- En el celular (≤860 px): `#v-pos.view.on{animation-fill-mode:backwards}`.
  - La entrada animada se ve igual.
  - Al terminar, la vista queda sin transform y el cajón mide la pantalla.
- `parches-seguros.js`: `b=6069` → `b=6070`.

## Pruebas (demo en vivo con el archivo nuevo inyectado; nada se escribió)
- 8 aperturas y cierres tocando fuera: 8/8 cierran sin velo.
- Cajón abierto 65 s (refresco de Inicio): sigue abierto; tocar fuera lo cierra sin velo.
- Altura del cajón en el iPhone: antes 1412 px, ahora 664 px (igual a la pantalla). «Cerrar sesión» y la versión se ven sin desplazar.
- PC 1280: medidas iguales antes y después; sin errores de consola; sin scroll horizontal.
- «Cerrar sesión» en la demo: pide confirmar y vuelve a la pantalla de entrada (sí cierra). Si Muse vuelve a /demo, entra de nuevo; eso es normal.

## Puntos de Muse que no se tocaron
- 3: en la tienda sigue el menú de siempre; el de dos niveles es solo de seguros (a propósito).
- 8 (texto del buscador cortado), 9 (tema en la demo) y 10 (rótulos en MAYÚSCULAS): quedan anotados para otra entrega.

## Estado
- Rama `claude/pos-cajon-velo`. Espera el «Publícalo» del dueño.
