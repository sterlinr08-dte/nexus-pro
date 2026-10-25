# 59.57 — Botones encendidos (capa `style#nxLuz`, sin publicar)

## Pedido del dueño
- Mandó una barra en píldora con un botón central que brilla. Pidió verla primero adaptada a NEXUS.
- Al ver la maqueta genérica dijo: «no me gustó, quiero que a mi estilo». Explicó que se refería al **efecto**: «se siente como si fuera un botón encendido», y solo en los **botones de dentro**.
- Al ver el efecto sobre la ventana real «Registrar pago» dijo: «me gusta, el acabado se ve realista».

## Qué hace
Capa en el `<head>`: primer pintado, sin FOUC. **No cambia formas, colores, textos ni lógica.**

**Qué se enciende**
- Los principales:
  - `.btn.bxl` grande del color de marca;
  - `.btn.bc1` que no es pequeño;
  - «Cobrar» del Inicio (`.nxIG-btn.pri`).
- Lo elegido:
  - pestañas `.nxft-tab.is-active`;
  - vista `.nxVistaOpt.on`;
  - «Saldo total» y demás `.aboQbtn.nxSel`;
  - chips `.nxOptChip.on`, cada uno en su propio color (`--chip-c`).

**Cómo se ve la luz**
- Brillo por dentro arriba y sombra abajo.
- Canto iluminado y halo centrado del mismo color.
- Al presionar, la luz baja.
- En tema claro el halo es más corto, azul y sin brillo de texto.

**Qué queda igual**
- Los pequeños (`.bsm`), los fantasma y los de otros colores (`bc2`…`bc5`, `bwa`).
- Los deshabilitados y «Falta…» (`.pgIncompleto`).
- Los temas Premium, Liquid Glass y clásico viejo.

**Cómo se apaga**
- Para todos: `NX_LUZ=false`.
- En un equipo: `localStorage.nx_luz_off=1`.

## Por qué tanta especificidad
Varias capas usan `#mAbono#mAbono#mAbono#mAbono #btnAbo#btnAbo` con `!important`. La capa usa `:not(#nxl1)`…`(#nxl8)`, que equivale a 8 ids, para ganar sin tocar esas capas.

## Archivos
- `index.html`: `script#nxLuzOn` y `style#nxLuz` antes de `</head>`; `APP_VERSION` 59.57.
- `DESIGN.md`: excepción del dueño a la regla «sin brillo neón».
- `docs/MEMORIA.md`.
- `scripts/qa-botones-encendidos.mjs`: prueba nueva.

## Pruebas (simulador `qa-crm-mock-server.js`)
- `qa-botones-encendidos`: **80 PASS / 0 FAIL**. Cubre oscuro y claro, 390 y 1280 px, y la capa encendida y apagada. Comprueba:
  - que los principales y lo elegido llevan halo;
  - que lo no elegido, los pequeños, los fantasma y «Falta…» quedan sin luz;
  - que con `nx_luz_off` no cambia nada;
  - que hay 0 errores de JS.
- Regresión:
  - `qa-registrar-pago`: 58/58;
  - `qa-cobro-adelanto`: 20/20;
  - `qa-inicio-glass`: 125/129. Las 4 fallas son del caso «ciclo anterior al mismo día» y **salen igual en `main` sin este cambio**: dependen de la fecha (hoy es día 25). No son de esta capa; queda pendiente revisar esa prueba.

## Siguiente paso
Que el dueño lo vea y diga «publícalo».
