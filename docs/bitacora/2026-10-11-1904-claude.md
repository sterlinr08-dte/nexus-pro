# 2026-10-11 19:04 — Claude · Referencias de diseño del dueño (Kitchen y Originkit)

## Pedido del dueño
- Mandó dos reels con bibliotecas de efectos para pantallas y aclaró: «Ese link que te envié es para tomarlo como referencia para cuando queramos algo; tú lo tomes de ahí».
  - Kitchen: reel de @adrien.ninet `DeO7DugISSR`.
  - Originkit: reel de @aiboy.ai `DayD735y1oB`.

## Qué se hizo (solo documentación)
- Se analizaron los reels con `ver-video-redes` y se ubicaron las páginas:
  - **The Kitchen** (https://www.dqnamo.com/kitchen): piezas que parecen objetos reales (impresora de recibos, «mantén presionado para confirmar», boleto, botón que cambia, firma…), con el código en cada `/experiments/<nombre>`.
  - **Originkit** (https://www.originkit.dev): unos 590 efectos animados gratis; su MCP pide cuenta y clave.
- Se anotaron en el catálogo que toda sesión lee al empezar:
  - `HERRAMIENTAS.md` de nexus-pro y bayolcell-taller: sección «Referencias de diseño que mandó el dueño», con cómo usarlas y las ideas ya vistas para cada sistema, y un atajo «Quiero un efecto…».
  - `DESIGN.md` de studio-rd: sección corta que apunta ahí.
- Reglas anotadas:
  - se rehacen en nuestro código (son de React/Framer); no se pega su código sin revisar la licencia;
  - nada de cuentas ni MCP sin el OK del dueño;
  - los efectos pesados, solo en portadas, logins o páginas públicas.

## Estado
- Rama `claude/referencias-diseno` en nexus-pro, bayolcell-taller y studio-rd. No está en `main`: espera el «súbelo» del dueño.
- No cambia ninguna app ni la base.

## Siguiente paso
Cuando el dueño pida un efecto, empezar por estas referencias. Ya propuesta y pendiente de su OK: la impresora de recibos para `nxReciboAnimado` de NEXUS PRO.
