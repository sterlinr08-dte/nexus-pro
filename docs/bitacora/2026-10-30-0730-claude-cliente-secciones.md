# 2026-10-30 07:30 (RD) · Claude · Ficha «Nuevo / Editar cliente» en 6 secciones (59.74, paquete C parte 2, SIN publicar)

## Pedido del dueño
- Vio la maqueta del paquete C (`maqueta-c.html`, orden por secciones) y dijo **«Sí, publícalo»**.
- Esta entrega construye esa maqueta sobre la ventana real `#mCli`. Va en la rama `claude/cliente-secciones`, sacada de `origin/main` 3a3e0fd (que ya trae el paquete B, PR #425). Sin PR y sin publicar: se publica cuando el dueño lo vea.
- Referencias: bitácora `2026-10-30-0028-claude-cliente-ficha.md` (paquete B), informe de auditoría (hallazgos I8, I12 e I16) y la regla «Espaciado de formularios» de `DESIGN.md`.

## Cómo se hizo: se MUEVEN los nodos, no se reescribe el HTML
Se eligió **reordenar el DOM desde JavaScript** (capa `script#nxCliSecJs`) y no reescribir el HTML estático de `#mCli`. Por qué:
- **Mismos ids.** `guardarCli()`, `editarCli()`, `abrirNuevoCli()`, `parches-crm.js` (`#cAgt`), `parches-cumpleanos-clientes.js` (`#cFecNac`, que se inserta después de `#cEmail` cuando el parche carga) y `parches-seguros-base.js` (`#nx-cedula-aviso` bajo `#cCed`) siguen encontrando exactamente los mismos nodos. No se tocó ni un `id`.
- **Interruptor real.** Con `localStorage.nx_cli_sec_off='1'` o `NX_CLI_SEC=false` la capa no corre y el HTML queda como en 59.73, con las capas `#nxFichaPane`, `#nxFormEspaciado` y `#nxCliFicha` intactas. Con el HTML reescrito habría que mantener dos copias de la ventana.
- **Menos riesgo con las capas que ya existen.** `#nxFichaPaneJs` busca la caja de «Estado y proceso» con `closest('.modal > div')`: dentro del `<details>` nuevo ya no la encuentra y no le pone `.nxFcCaja/.nxFcPleg`; lo único que sigue haciendo es poner `.nxFcCaja` a «Precio personalizado», y la capa nueva fija ese relleno desde el primer cuadro (padding 14, sin margen) para que no haya salto.
- **Idempotente y sin saltos.** `armar()` corre una vez al cargar la página (la ventana está oculta) y otra vez en el mismo instante en que `#mCli` recibe `.open` (MutationObserver sobre la clase y sobre el texto de `#mCliT`, que `abrirNuevoCli/editarCli` escriben en cada apertura). Volver a ejecutarla solo re-apendea los mismos nodos en el mismo orden.
- Lo que sobra (las dos `.gf2` vacías, los `.div`, los títulos «// PÓLIZA Y ARS» y «// DEPENDIENTES» y la fila vieja del dependiente) se guarda escondido en `#nxCliResto`; **no se borra** nada.

### Las 6 secciones (`<section class="nxSec">` con `<h2>` numerado y rejilla de 2 columnas)
1. **Datos personales:** Nombre (ancho), Cédula o RNC · Fecha de nacimiento.
2. **Contacto:** WhatsApp · Teléfono, Correo, Dirección, Referencia · WhatsApp de la referencia.
3. **Seguro:** Número de póliza (solo al editar, de solo lectura), Plan (segmento de 3), ARS (buscador), Agente (buscador), Empresa que paga (las fichas de siempre), Comprobante NCF, Día de facturación, Inicio · Fin de la póliza, y «Precio personalizado» si hay permiso.
4. **Deuda:** Deuda antes del sistema con «Ajustar» y su ⓘ.
5. **Estado y proceso:** `<details>` plegado con resumen («Activo · prioridad media» / «Sin pendientes · toque para ver»). Dentro va la caja de siempre sin tocar: estado, prioridad, facturación automática, pendientes, avance, nota, seguimiento, responsable y VIP. El resumen se actualiza con cada cambio.
6. **Dependientes:** lista en tarjetas (nombre, parentesco, cédula y «nació el…») y tarjeta para agregar con Nombre, Parentesco, Cédula y Fecha de nacimiento; botón «Agregar dependiente» a lo ancho.
- Cabecera: al editar, debajo del título sale «Póliza POL-000245 · desde 15/01/2026».

### Buscadores de ARS y Agente
- Un `<input role="combobox">` de 48 px con lupa, encima del `<select>` de siempre (`#cARS`, `#cAgt`), que **sigue oculto y sigue siendo la fuente de verdad**: elegir hace `sel.value=v` y dispara `change`, igual que las fichas `nxOptChipPick`. `guardarCli` lee `$v('cAgt')` y `$v('cARS')` como antes y recibe el mismo id.
- Lista filtrable al escribir; al tocar sale completa; 44 px por opción; iniciales de color (logo de la ARS si existe); «Sin ARS» para vaciar; teclado: ↓/↑ (circular), Enter elige, Esc cierra sin tocar nada (y no cierra la ventana), Tab cierra. Sin librerías.
- Si el `<select>` cambia por fuera (CRM, `rAgtSelCli`, `editarCli`), el texto se refresca al abrir y con `change`.
- Las fichas `#cAgtChips` y `#cARSChips` se siguen pintando (ocultas): nada de lo que las lee se rompe.

### Plan
- Las mismas fichas (`nxOptChips` sobre `#cPlan`) en un segmento de 3 columnas; solo cambia el texto que se ve («Básico», no «Plan Básico»); el `value` no cambia.

### Dependientes con cédula y fecha de nacimiento (`addDep` / `rDepLM`, lógica de datos)
- `addDep()` lee `#dC` y `#dNac` **si existen**; con el interruptor apagado no existen y el dependiente queda `{nom, rel, id}` como siempre.
- `cedula` solo se agrega si se escribe: se valida con **el mismo verificador del titular** (`nxCedulaOk`, módulo 10 de la JCE) y se guarda `000-0000000-0`; si no es válida no se agrega, se avisa y el campo queda en rojo. `fecha_nacimiento` solo si se escribe: no futura ni antes de 1900.
- `rDepLM()` muestra «Hijo/a · 402-2000000-0 · nació el 09/04/2012». Con la capa apagada mantiene el `(parentesco)` de antes.

#### Quién lee `deps` y por qué no se rompe (grep en `index.html`, `parches-*.js` y `supabase/`)
| Dónde | Qué hace con `deps` | Efecto de las claves nuevas |
|---|---|---|
| `index.html` 9388 y 13320 | `JSON.parse` si viene como texto | Ninguno: sigue siendo un arreglo |
| 9557, 12059, 12419, 13796, 15319, 17595, 17734, 18544-18545, 19392-19401 | `(c.deps||[]).length` para primas, costos y reportes | Ninguno: cuenta elementos |
| 15915, 15981, 19250 | `d.nom` y `d.rel` para recibos, estado de cuenta y exportar | Ninguno: esas claves siguen |
| `editarCli` 17489 | copia a `tempDeps` | Conserva lo que haya |
| `guardarCli` 17709, 17748, 17761 | `JSON.stringify(tempDeps)` y lo guarda en memoria | Guarda las claves nuevas tal cual |
| `rmDep` | filtra por `d.id` | Igual |
| `nxCliFichaJs.estado()` | `JSON.stringify` para saber si hay cambios | Igual |
| `parches-crm.js` 37, 39, 215, 514, 523, 528, 555 | `deps(c).length` y `depHtml`, que **ya mostraba `x.cedula` si existía** | Ahora se ve la cédula en el CRM |
| `parches-seguros-base.js` 11077-11090 (TSS) | `deps.length` y `d.nom`, `d.rel` | Ninguno |
| `supabase/migrations` y `functions` | **Nadie lee `clientes.deps`** (los `deps` que salen son inyección de dependencias en `ecf-mseller` y `whatsapp-*`, y la columna `prima_deps`) | Ninguno |
- La columna `clientes.deps` es texto JSON: las claves nuevas no exigen migración.

### Capturas reales del iPhone del dueño (30-oct, 07:19, con la 59.73 en vivo): «aplícale mejoras»
Las tres capturas están en `docs/bitacora/img/2026-10-30-cliente-secciones/iphone-dueno-{1-asa-ars,2-fechas,3-nacimiento}.png`. Lo que se corrigió, en el bloque `style#nxCliIphone` + `script#nxCliIphoneJs` (llave `nx-fcli`, así vale también con las secciones apagadas):
1. **Los campos de fecha se salían por la derecha** (Fecha de nacimiento, Inicio y Fin de la póliza): en Safari iOS `input[type=date]` no respeta el ancho de la rejilla. Ahora `width:100%; min-width:0; max-width:100%; box-sizing:border-box; -webkit-appearance:none; display:block`, y la rejilla ya usaba `minmax(0,1fr)`. La fecha vacía muestra la guía gris «dd/mm/aaaa» solo en WebKit táctil (`@supports (-webkit-touch-callout:none)`), con `data-nx-vacio` que el JS pone y quita al escribir; en Chrome se ve su propio «mm/dd/yyyy» de siempre.
2. **El asa «❯» del menú tapaba la primera letra de los rótulos** («ependientes», «gente», «RS…»). No se pudo reproducir en Chromium ni con la emulación de iPhone de Playwright (no hay ningún elemento fijo en el borde izquierdo mientras `#mCli` está abierto; el único candidato es el menú lateral `nav#sbEl`, que queda en `translateX(-300px)` con `visibility:hidden` y `z-index:10700`, por encima de la ventana, que tiene 100). Corrección defensiva y reversible: mientras `#mCli` está abierto en el celular, `nav#sbEl:not(.mob-open)` y todo lo suyo quedan `visibility:hidden` + `pointer-events:none`, y el chevron `.nx-mc-tg` se oculta. **Hay que confirmarlo en el iPhone del dueño**; si el asa sigue, no viene de ese menú y habrá que identificarla con el inspector de Safari.
3. **«CÓNYUGE» en mayúsculas:** `#dR` y sus opciones con `text-transform:none` → «Cónyuge», como todas las opciones.
4. **Dirección sin guía:** `placeholder="Calle, número, sector, ciudad"` en el HTML de `#cDir` (único cambio en el HTML estático de la ventana).
5. **Título y ✕:** se confirma por medición que el título queda a 16 px (390) / 40 px (1280) del borde y la ✕ mide 44 × 44 a 16/40 del borde derecho.
6. **Orden como la maqueta:** en 59.73 «Estado y proceso» salía antes de ARS y la ARS lejos de Plan/Agente; con las 6 secciones la ARS va en «Seguro» junto a Plan y Agente, y «Estado y proceso» es la sección 5, antes de Dependientes.
- Límite: no hay WebKit instalado en este entorno (Playwright solo trae Chromium), así que los puntos 1 y 2 se comprobaron en Chromium a 390 con emulación de iPhone y con las reglas específicas de WebKit escritas según la documentación; la prueba definitiva es la del iPhone del dueño.

### Otros ajustes pequeños
- `#nxCliFichaJs`: `visible()` usa `checkVisibility()` (lo que está dentro de un `<details>` cerrado no cuenta para Tab ni para Enter→siguiente); Enter salta los campos de solo lectura; `summary` entra en la trampa de Tab.
- `#nx-cedula-aviso` (el aviso bajo la cédula de `parches-seguros-base`) pasa a 13 px y 4 px bajo la cajita, solo dentro de la capa.
- `APP_VERSION` → **59.74**.

## Archivos modificados
- `index.html`: bloques nuevos `style#nxCliIphone` + `script#nxCliIphoneJs` y `script#nxCliSecOn` + `style#nxCliSec` (8 ids de especificidad) + `script#nxCliSecJs` después de `#nxCliFichaJs`; `addDep` y `rDepLM`; dos retoques en `#nxCliFichaJs`; `placeholder` de `#cDir`; `APP_VERSION`.
- `docs/bitacora/img/2026-10-30-cliente-secciones/pruebas.js` (+ `pruebas-390.json`, `pruebas-1280.json`, `pruebas-390-off.json`, `pruebas-1280-off.json`).
- `docs/MEMORIA.md`.

## Migraciones, RPC, triggers y Edge Functions
**Ninguna.** No se escribió en la base.

## Pruebas (Playwright, administrador falso, red a Supabase bloqueada, API simulada en memoria)
Script `docs/bitacora/img/2026-10-30-cliente-secciones/pruebas.js`; amplía el de 59.73 (todas las pruebas B siguen) y suma las de C.
- **Capa encendida: 93/93 a 390 px y 93/93 a 1280 px.**
  - Paquete B completo (altas, cortesía, Cancelado/Suspendido, 15 validaciones, edición de cliente viejo, WhatsApp repetido en memoria y en la base, red caída y reintento con el mismo número de póliza, columna faltante, servidor lento 14 s con 3 clics, G4, CRM, cerrar con y sin cambios, teclados, accesibilidad, Tab, Enter, formato al salir, Ajustar deuda).
  - Orden: 6 secciones en orden y cada campo en la suya; lo viejo escondido; los 43 ids que lee el código siguen dentro de `#mCli`.
  - Buscadores: valor actual al abrir (Robinson / Sin ARS), lista completa al tocar con 44 px por opción, «est» filtra a ESTERLIN, Enter → `#cAgt='a2'`, ↓↓/↑ circulares con `aria-activedescendant`, Esc cierra sin cambiar nada ni cerrar la ventana, «hum» → ARS Humano, tocar elige, «Sin resultados», Tab cierra, «Sin ARS» vacía; guardar manda `agente_id='a2'` y `ars=null`; el CRM precarga LORIBEL en el buscador.
  - Plan: segmento con los mismos values y tocar cambia `#cPlan`.
  - Estado y proceso: abre plegado con resumen, se despliega al tocar, el resumen sigue los cambios (Suspendido · 1 pendiente · sin facturación), se repliega y vuelve plegado al reabrir.
  - Dependientes: sin cédula ni nacimiento → `{nom,rel,id}` sin claves extra; con cédula válida y nacimiento → `001-1882756-7` y `1984-11-02` en la tarjeta y en el `deps` guardado; dígito malo, «12» y fecha futura → no agregan y avisan; editar carga los viejos.
  - Editar: «Póliza POL-000245 · desde 15/01/2026», campo de solo lectura, buscadores con ESTERLIN y ARS Humano; Nuevo no muestra póliza; el PATCH no manda claves nuevas.
  - iPhone (las 6 del dueño): fechas con el ancho de su celda y dentro de la ventana, sin apariencia nativa, guía «dd/mm/aaaa» y marca de vacío; menú lateral y asa ocultos con la ventana abierta en el celular; «Cónyuge» en minúscula; Dirección con guía; título a 16/40 px y ✕ de 44 × 44 a 16/40 px del borde.
  - **Sin reflujo:** las posiciones (`offsetTop/Left/Width/Height`) de todos los elementos con id en el primer cuadro (`requestAnimationFrame`) son las mismas 300 ms después, y el orden de los hijos también. Dos cosas que sí movían la ventana después de abrir y se fijaron desde el primer cuadro: `#nxFichaPaneJs` le pone `.nxFcCaja` a «Precio personalizado» (relleno 14) y `#nxInfoI` mete la ⓘ en la etiqueta de la deuda (las etiquetas ahora son flex de 20 px). Nota: el primer intento comparaba `getBoundingClientRect` y fallaba por la animación `nxPopIn`, que escala la ventana; no era un reflujo.
  - **Regla de espaciado** (a 390 y a 1280, en Editar con el plegable abierto y 2 dependientes): borde→campo 16/40, borde→título 24/48, título de la ventana→1.ª sección 24, título de sección→etiqueta 8, etiqueta→cajita 8, campo→campo 20, sección→sección 24 (las 5), resumen del plegable 56, filas de dependientes 8; campos 48 px con letra 16; botón 54; todo lo que se toca ≥ 44; letras de controles ≥ 13; sin desborde horizontal.
- **Capa apagada (59.73): 64/64 a 390 y 64/64 a 1280** (incluye las 5 comprobaciones del iPhone, que valen también apagada). Sin secciones ni buscadores, rejillas `.gf2`, fichas de agente visibles, plegable de 59.44, «Empresa cotizante»; `deps` se guarda como antes.
- 0 errores de JavaScript en las 4 corridas.
- **Alto de la ventana** (scrollHeight, plegable cerrado, con «Precio personalizado» visible por ser administrador): Nuevo 2.384 → 2.444 a 390 y 2.172 → 2.388 a 1280; Editar 2.492 → 2.696 a 390 y 2.280 → 2.640 a 1280. Crece por la tarjeta para agregar dependientes (4 campos) y por las tarjetas de los dos dependientes de la prueba; a cambio, cada cosa está en su sección y «Estado y proceso» sigue plegado.

## Capturas
Carpeta `/tmp/claude-0/-home-user-nexus-pro/93030ade-f60e-5c69-95e5-b8cd3ec95121/scratchpad/auditoria-cliente/c/` (antes = 59.73 con el interruptor apagado; después = 59.74):
- `{antes|despues}-{nuevo|editar}-{claro|oscuro}-{390|1280}.png` (pantalla) y `-completa.png` (ventana entera);
- `comparativa-{nuevo|editar}-{claro|oscuro}-{390|1280}.png` lado a lado.
- Limitación del simulador: la fuente de iconos no carga, así que la ✕, el ✓ y el + se ven vacíos.

## Riesgos y pendientes
- **Alto total.** Con secciones la ventana no se acorta; gana orden. Si el dueño la quiere más corta, lo siguiente sería plegar también «Dependientes» o «Contacto» cuando están vacíos.
- **`<details>` en Chromium:** el contenido plegado sigue en el árbol (`content-visibility`), por eso `visible()` pasó a `checkVisibility()`. Si otro parche enfoca un campo de adentro con `focus()`, Chrome abre el plegable solo; es el comportamiento esperado.
- **Dependencia de la capa en vidrio:** la capa de secciones solo se enciende si `nx-fcli` está activa (`nx_ficha_pane_off` también la apaga).
- **Clientes con cédula de dependiente sin formato** no existen todavía; si algún día se cargan por otro camino, `rDepLM` la pasa por `nxCedFmt`, que deja el texto tal cual si no tiene 11 dígitos.
- La ⓘ y los textos largos siguen a cargo de `#nxInfoI`; no se tocaron.
- Falta que el dueño la vea en su iPhone (Nuevo y Editar, abrir el buscador de agente y el plegable) antes de publicar.

## Rama y estado
- Rama `claude/cliente-secciones` sobre `origin/main` 3a3e0fd. **Sin PR y sin publicar.**
- Siguiente paso: el dueño revisa; con su OK se abre el PR y se publica como 59.74.
