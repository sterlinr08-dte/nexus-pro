# 2026-10-27 16:30 (RD) — Animación «materializar» al cambiar de pantalla (59.68)

## Pedido del dueño
Mandó el reel «Glassy Dashboard V5» (@code.xr): «Ese efecto me gusta». Eligió NEXUS PRO: «lo que más deseo es la
animación». Vio la demo (https://claude.ai/artifact/2TQ1V4jnJy4JRjHWRVwnbj) y dijo «Me gusta, ponlo en NEXUS».
Referencia anotada en los 3 proyectos (PR nexus-pro #415, bayolcell-taller #136, studio-rd #19, sin unir).

## Diagnóstico
`nav()` enciende `.view.on` y pinta la pantalla en la misma tarea. Ya existía una cascada pequeña
(`parches-motion-fase2.js`: 8 px, 22 ms, al tocar un botón del menú). Algunas tarjetas traen su propia entrada (`nxFadeUp`).

## Cambio (capa aislada)
`parches-nx-materializar.js` (nuevo, cargado con `cargarConReintento`, `APP_VERSION` 59.68):
- Al encenderse una pantalla (MutationObserver solo sobre las 19 `.view`; corre antes del primer dibujo, sin parpadeo),
  elige hasta 10 «piezas» visibles (bloques con fondo o borde y esquinas ≥ 8 px, sin entrar en una ya elegida), ordenadas
  de arriba abajo y de izquierda a derecha, y las hace entrar: borrosas 8 px, 10 px más abajo y al 97,5 % → nítidas,
  460 ms, 45 ms entre una y otra. Las barras de los reportes (`.nxRepBarV`) crecen desde abajo.
- No anima al abrir la app ni al refrescar datos; con «reducir movimiento» no anima.
- `animation-fill-mode: backwards`: al terminar no deja filtro ni transformación (un `filter` fijo rompería menús
  flotantes dentro de las tarjetas). La marca se queda puesta para que no vuelva a correr la entrada vieja (`nxFadeUp`).
- Apaga la cascada vieja mientras está encendida (`html.nx-mat .nx-motion-item{animation:none}`).
- Apagar: `window.NX_MATERIALIZAR=false` o `localStorage.nx_materializar_off='1'`.
- Nota DESIGN.md §6: el desenfoque anima `filter` (no solo transform/opacity); se acepta por pedido del dueño, limitado a
  10 piezas y 8 px.

## Pruebas
`scripts/qa-materializar.mjs` contra `qa-crm-mock-server.js`, oscuro y claro, 390 y 1280 px: **84/84**. Clientes 10
piezas (0–405 ms), Pólizas 5, Facturas 2, Inicio 1–2; al terminar, sin filtro, sin transformación y opacidad 1; la primera
pantalla no se anima; refrescar datos no anima; apagada y con reducir movimiento no anima; 0 errores de JS.
Videos: `nexus-materializar-1280.mp4` y `-390.mp4` (en el chat).

## Estado
Rama `claude/nexus-animacion-pantallas`, PR sin publicar. Siguiente (si el dueño quiere): vidrio sobre foto por pantalla.
