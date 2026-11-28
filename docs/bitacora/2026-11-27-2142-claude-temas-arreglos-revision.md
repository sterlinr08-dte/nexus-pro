# 2026-11-27 21:42 RD · Claude — Arreglos 4, 5 y 6 de la revisión de los temas de paleta (sin publicar)

Sigue a `2026-11-27-1956-claude-temas-apple-linear-publicado.md` y a `2026-11-27-2055-claude-revision-temas-paleta.md`.

## Contexto
- El dueño pidió que otro Claude verificara lo hecho el 27-nov. Hubo **dos revisiones independientes**:
  - **A.** Un agente lanzado desde esta sesión, que encontró 5 errores y 1 sospecha.
  - **B.** Otra sesión de Claude, a la que el dueño le pasó el mensaje (sesión 01GnKb7…).
- La sesión B corrigió los **errores 1 y 2** en el commit `55399b2`:
  - **1:** no se fuerza el guardado de la migración de Premium hasta que la base respondió. Antes podía borrar preferencias.
  - **2:** `nx_tema_luz` y `nx_tema_noche` llevan el id del usuario.
- Su bitácora dice «rama `claude/revision-temas-paleta`, sin PR y sin publicar», pero **el commit está en `main`** sin PR.
  - Comprobado: nexusprord.com ya sirve esa corrección.
  - Queda anotado para que se sepa que ya está en vivo. No se revirtió: corrige un riesgo real de perder preferencias.
- El dueño eligió corregir **1, 2, 4, 5 y 6**. El 3 (velocidad) queda para antes de abrir los temas a todos. Como 1 y 2 ya estaban, esta entrega hace **4, 5 y 6**.

## Cambios
- **4 · Menú en Stripe y Apple.** En `script#nxTemasPaletaOn`, la regla que decide si un selector es «de otro tema» ya no mira lo que está dentro de `:not(...)` (función `sinNot`).
  - `html:not(.tema-glass-oscuro) body:not(.tema-premium) …` (`parches-sidebar-curva.css`, `parches-foco-lista.css`) sí se aplica en el Claro; antes se descartaba.
  - Resultado: la marca y el resaltado del menú ya salen en el color del tema (Stripe `rgba(83,58,253)`), no en el azul NEXUS.
- **5 · Linear con el Glass oscuro apagado** (`NX_TEMA_GLASS_OSCURO=false` o `nx_tgo_off`). `aplicarTema` vuelve a revisar «glass-oscuro con el interruptor apagado» **después** de cambiar Linear por su tema base.
  - Ahora cae en Claro desde el arranque, sin cambio de tema a mitad de la carga, y el espejo local queda en «clasico».
- **6 · `negocios.html`.** La barra de arriba pasa de `height:64px` a `min-height:calc(64px + env(safe-area-inset-top))`.
  - Guardada como app en la pantalla de inicio del iPhone, el menú ya no queda debajo de la hora.

## Pruebas (servidor simulado, puerto 8951)
- Pruebas del revisor A:
  - `t9`: marca y resaltado del menú en Stripe = `rgba(83,58,253)` (antes, azul NEXUS).
  - `t4b`: Linear con `nx_tgo_off` da `tema-claro` desde el primer pintado y `nx_tema=clasico`, 0 errores.
- `qa-tema-stripe.mjs`: **106/106**.
- `qa-tema-stripe-contraste.mjs` (Stripe, Apple y Linear): ningún texto empeora.
- `qa-tema-revision.mjs` (de la sesión B): **46 PASS · 0 FAIL**.
  - Su oráculo de colores sigue sin diferencias. Las copias no se duplican.
  - Siguen los 4 límites ya documentados por B.
- `/negocios` a 390 px, iPhone 13 y 1280 px: sin desplazamiento de lado, todo lo tocable de 44 px o más, enlaces correctos.

## Pendiente
- **3 · Velocidad.** Unos +170 ms al primer pintado con la CPU 4× más lenta. Generar las copias una vez por tema antes de abrirlos a todos.
- Límites anotados por B: `<style>` dentro de `innerHTML`, `.data`, `insertRule`, reglas de `<html>` sin «html».
- `/negocios`: la sección de aseguradoras solo tiene «Crear mi tienda»; las cifras del ejemplo no dicen «ejemplo»; la imagen para compartir es de 180 px.
- No verificado: iPhone real con la sesión del dueño.

## Rama
`claude/temas-arreglos`, sin publicar. Archivos: `index.html` y `negocios.html`.
