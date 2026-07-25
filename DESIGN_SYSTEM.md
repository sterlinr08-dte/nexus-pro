# DESIGN_SYSTEM.md — NEXUS PRO

**Inventario medido de lo que EXISTE hoy + en qué se aparta de `NPGS.md` + plan de convergencia.**

`NPGS.md` dice **cómo debe ser**. Este archivo dice **cómo está hoy**, con números reales sacados
del código (no de memoria ni a ojo), y qué falta para cumplir el estándar. Es el puente entre los
dos.

Medido el 25-jul-2026 sobre `index.html` + `parches.js`. Estado: **v49.34** (C1 y C4 ya
aplicados; la tabla de alturas del §2 refleja el histograma de ANTES de normalizar, se conserva
como referencia del punto de partida).

---

## 1. Tokens de color — lo que existe

El sistema tiene **tres paletas con espacio de nombres propio**, no una sola. Las tres están
definidas como variables CSS, con su variante de tema oscuro.

### `.nxSf` — núcleo de Seguros (azul Enterprise)

| Token | Claro |
|---|---|
| `--sf-primary` / `-d` / `-l` | `#2563EB` · `#1D4ED8` · `#EAF1FF` |
| `--sf-ok` / `-d` / `-l` | `#22C55E` · `#0F9D50` · `#E8F9EF` |
| `--sf-warn` / `-d` / `-l` | `#F59E0B` · `#B45309` · `#FEF3DC` |
| `--sf-err` / `-d` / `-l` | `#EF4444` · `#DC2626` · `#FDEBEB` |
| `--sf-bg` · `--sf-card` · `--sf-line` | `#F6F8FB` · `#FFFFFF` · `#E7EBF3` |
| `--sf-tx` / `-tx2` / `-tx3` | `#111827` · `#6B7280` · `#94A0B4` |

### `.nxPf` — POS (azul, Plus Jakarta Sans)

| Token | Claro | Oscuro |
|---|---|---|
| `--pf-blue` / `-d` / `-l` | `#2563eb` · `#1d4ed8` · `#eff6ff` | `#3b82f6` · `#2563eb` · `#0f1b33` |
| `--pf-green` / `-l` | `#16a34a` · `#f0fdf4` | `#22c55e` · `#0c1f14` |
| `--pf-orange` / `-l` | `#d97706` · `#fffbeb` | `#fbbf24` · `#2a2004` |
| `--pf-purple` / `-l` | `#7c3aed` · `#f5f3ff` | `#a78bfa` · `#1e1b33` |
| `--pf-bg` · `--pf-panel` · `--pf-line` | `#f5f7fa` · `#fff` · `#e8ebf0` | `#0b0f19` · `#121826` · `#232b3d` |

### `.nxFP` — Financiamiento / Cuotas (morado, Plus Jakarta Sans)

Gradiente de marca `#4f46e5 → #7c3aed → #6d28d9`. Excepción de marca confirmada caso por caso con
el dueño (ver `CLAUDE.md`, v48.16/v48.17).

### Color de acento por app del hub Multiempresa

Medido en las llamadas reales a `nxMERegistrar`:

| App | Acento |
|---|---|
| Financiamiento | `#059669` verde |
| Vehículos | `#6d28d9` violeta |
| Punto de Venta | `#2563eb` azul |
| Rifas | `#4f46e5` índigo |
| Consultorio Médico | `#0d9488` teal |
| Panel del Dueño | `#b45309` ámbar |
| Clientes SaaS | `#047857` verde oscuro |
| NEXUS AI CONTENT | `#c026d3` morado |

> ⚠️ **Esto choca con NPGS §11 y §12.** Ver la sección "Conflictos" abajo.

---

## 2. Botones — lo que existe

Histograma real de alturas declaradas en `parches.js`:

| Altura | Ocurrencias | ¿Cumple NPGS §3? |
|---|---|---|
| 30 px | 40 | ❌ (por debajo del "pequeño" de 34 px) |
| 38 px | 24 | ❌ |
| 32 px | 20 | ❌ |
| 40 px | 18 | ✅ (Normal) |
| 26 px | 16 | ❌ (filas del menú lateral, decretadas así en v47.6) |
| 36 px | 13 | ❌ |
| 34 px | 13 | ✅ (Pequeño) |
| 42 px | 10 | ❌ (buscador `.nxBusca`, decretado así en el reglamento de buscadores) |

**Ninguna altura de 44 px** (el "Principal" de NPGS) existe hoy en el sistema.

**Clases reales de botón:**
- `.nxPf .ab` + modificadores `g1` (verde/guardar) `g2` (azul) `g3` (WhatsApp) — POS
- `.nxSf .sf-btn` — Seguros
- `.btn` / `.btn.bsm` / `.btn.bghost` — núcleo, el más antiguo
- `.nx-inv-btn` / `.nx-inv-cobrar` / `.nx-inv-iconbtn` — Factura del POS
- `.nxFP-*` — Financiamiento

---

## 3. Buscadores — lo que existe

**Corrección (25-jul-2026):** el conteo de abajo reemplaza al de la primera versión de este
archivo (decía 47 y 7) — aquella cifra contaba coincidencias de texto sin distinguir llamada real
de definición/comentario. Recontado línea por línea con un agente de exploración:

| Patrón | Qué hace | Usos reales verificados |
|---|---|---|
| `nxBuscaHTML()` y sus 7 wrappers locales | Filtra **en línea** una lista ya visible | **34** (33 en memoria + 1 que además dispara una consulta a Supabase por tecla sin necesitarlo — Historial de pagos de Seguros, `pgBuscar`) |
| `ModalBusquedaBase` | Abre **ventana** para elegir de un catálogo grande | **1** (AguaPro → Nuevo pedido → elegir cliente). El motor soporta paginación real del servidor (`cfg.buscar`) pero NINGÚN módulo la usa hoy — solo el modo `datos` (filtra en memoria). |

Más `nxBuscadorUniversal()` (Ctrl+K en el POS) y `abrirGlobalSearch()`/`gsOverlay` (Ctrl+K en
Seguros) — dos búsquedas globales de pantalla completa, más cercanas en espíritu a NPGS §5
(ventana flotante) que a los otros dos patrones, pero sin Recientes/Favoritos documentados.

**Ninguno de los dos motores (`nxBuscaHTML` ni `ModalBusquedaBase`) tiene Recientes ni Favoritos
hoy** — los dos tendrían que construirse desde cero para cumplir NPGS §5 al pie de la letra.

> ⚠️ **NPGS §5 prohíbe el patrón en línea** ("nunca buscar desde una barra fija"). Son 34 sitios,
> no 47. Ver "Conflictos" — el tamaño real del trabajo es distinto, pero el problema de fondo
> (¿aplica igual a un buscador que ELIGE un registro que a uno que solo FILTRA la lista que ya
> estás viendo?) sigue siendo el mismo y sigue sin resolver.

---

## 4. Animaciones — lo que existe

| Animación | Duración | ¿Cumple NPGS §22 (200–300 ms)? |
|---|---|---|
| `nxPopIn` (modales) | 260 ms | ✅ |
| `nxFadeUp` (KPIs, accesos rápidos) | 300 / 340 ms | ✅ / ⚠️ (340 ms, un pelo largo) |
| `tIn` (toast) | 350 ms | ⚠️ |
| `nxs*` (pantalla de bienvenida) | 500–3000 ms | ❌ (decorativa, fuera del flujo de trabajo) |

Todas dentro de `@media (prefers-reduced-motion: no-preference)`.

---

## 5. Auditoría — lo que existe (§20)

`logAudit(accion, detalle, modulo, clienteId)` guarda **Usuario · Fecha · Hora · Sucursal ·
Dispositivo · IP** (IP y dispositivo los pone un trigger del servidor, no el navegador — no se
pueden falsear). Están enganchados ~111 puntos del sistema.

**Falta para cumplir §20:** el "Antes / Después" de cada acción. Hoy solo se guarda un texto
descriptivo, no los dos estados del registro. Es una columna nueva (`antes` / `despues` jsonb) más
tocar los ~111 puntos.

---

## 6. CONFLICTOS REALES entre NPGS y el sistema actual

NPGS ordena en su regla de prioridad: *"Si alguna implementación contradice este documento, debes
detenerte, explicarlo y proponer una solución"*. Estos son los cuatro que existen de verdad.
**Ninguno se resolvió por cuenta propia — esperan decisión del dueño.**

### C1 — Un color por app ✅ **RESUELTO — decisión del dueño, 25-jul-2026**

- **Era:** NPGS §12 exigía que TODO el ERP compartiera exactamente los mismos colores; la regla
  vigente del dueño (13 y 18-jul-2026) decía lo contrario — *"cada proyecto con su diseño
  independiente"*, con 8 acentos ya repartidos. Dos reglas suyas, contradictorias.
- **Decisión: UN COLOR POR APP.** Enmienda oficial escrita en `NPGS.md` §12.
  - **Entre apps** → cada una conserva su acento (POS azul, Financiamiento morado, Rifas índigo,
    Consultorio teal…). Son negocios distintos; el color ubica al usuario.
  - **Dentro de una app** → un solo acento, **sin excepciones**. Todo lo demás (tipografía,
    iconos, botones, sombras, tablas, espaciados) sigue siendo idéntico en TODO el ERP.
  - Las excepciones de color/tipografía negociadas antes de esa fecha quedan **derogadas**.

#### Desviación real que deja abierta esta decisión (1 sola, medida)

| Pantalla | Vive en | Acento que usa | Debería usar |
|---|---|---|---|
| **Cuotas** (`renderCuotas`, `parches.js:23978`) | Punto de Venta (**azul** `#2563eb`) | `.nxFP` **morado** + Plus Jakarta Sans | `.nxPf` **azul** |

Es la única pantalla del sistema que rompe la regla nueva. Nació así en la v48.16 como excepción
deliberada que el dueño aprobó tras 4 preguntas — pero la enmienda del 25-jul la deroga.

Se verificó que los otros 3 sitios que cargan el CSS morado (`renderLista` y `abrirClienteForm`
en `parches.js:13134`/`13472`) **sí son correctos**: pertenecen al módulo Financiamiento, cuya app
ES morada.

**✅ NORMALIZADO en la v49.34** (el dueño dio el visto bueno). Cómo se hizo, porque el patrón
sirve para casos futuros: el motor de estilos `nxFPEnsureCSS()` lo comparten DOS apps, así que
**no se tocó el CSS base** (habría despintado Financiamiento). En su lugar, `renderCuotas()` pinta
`<div class="nxFP nxFP-pos">` y se agregó un bloque de anulación `.nxFP.nxFP-pos {...}` que remapea
solo el acento a azul. Doble clase = más especificidad, así que gana **sin necesidad de
`!important`**.

**Detalle que casi se escapa:** la primera pasada solo buscó los tres morados fuertes
(`#4f46e5`/`#6d28d9`/`#7c3aed`) y dejó los **fondos claros lila** (`#f5f3ff` en la pastilla REF,
`#ede9fe` en el ícono de tarjeta) y el índigo `#4338ca` de los íconos "blue". No lo detectaron las
aserciones — se vio en la captura de pantalla. Lección: al remapear una paleta hay que buscar
también los **tintes claros**, no solo el color de acento.

Verificado con 19 comprobaciones Playwright sobre el CSS real extraído del archivo, montando las
dos variantes lado a lado: Cuotas en azul sin ningún rastro de morado, y **Financiamiento intacto
en morado** (la comprobación que de verdad importaba). Sin desborde en 390 px, 0 errores de JS.

### C2 — Buscadores: 34 sitios contra el estándar 🟠 **EN CURSO — auditoría hecha, plan pendiente de decisión**

- **NPGS §5:** solo 🔍, siempre ventana flotante, nunca barra fija, con Recientes y Favoritos.
- **Recontado el 25-jul-2026** (la cifra de 47/7 de la primera versión de este archivo era de
  coincidencias de texto, no de llamadas reales — corregido en §3 arriba): **34 en línea** + **1
  en ventana** + 2 buscadores globales (Ctrl+K) que ya se parecen más al espíritu del §5.

#### El problema real no es el número — es que NPGS §5 describe UN patrón y hay DOS necesidades distintas

Clasificando los 34 sitios reales por lo que hacen de verdad:

| Tipo | Qué es | Cuántos | Ejemplos |
|---|---|---|---|
| **Elegir un registro** para meterlo en otro formulario | Exactamente lo que `ModalBusquedaBase` ya resuelve — abrir ventana, buscar, tocar una fila, listo | ~9 | Elegir cliente (Facturar/Cobrar/Financiamiento), elegir artículo, elegir cliente de AguaPro |
| **Filtrar la lista que ya estoy viendo** | La pantalla YA muestra una tabla; escribir solo la acota — no hay "elegir y usar en otro lado" | ~24 | Clientes, Pólizas, Facturas, Cobros (**las 4 pantallas de más uso diario de todo Seguros**), Vender, Inventario, Reparaciones, Cuotas del POS |
| Caso especial (ya roto, aparte de NPGS) | Historial de pagos: dispara una consulta a Supabase en cada tecla sin necesitarlo | 1 | `pgBuscar` — bug de rendimiento real, no relacionado con el diseño |

**Para el primer grupo, NPGS §5 aplica sin fricción** — es literalmente lo que ya hace
`ModalBusquedaBase`, solo le falta Recientes/Favoritos.

**Para el segundo grupo (24 de 34, el 70%) hay una tensión real, no solo de gusto:** convertir un
filtro-en-vivo de una tabla ya visible en pantalla a "tocar lupa → se abre una ventana APARTE con
su propia lista de resultados → elegir una fila → ¿hace qué, si ya la estoy viendo en la tabla de
atrás?" no tiene el mismo sentido que "elegir un cliente para una factura". Y son, en su mayoría,
**las pantallas que se tocan más veces al día** (Clientes, Facturas, Cobros del núcleo de Seguros;
Vender del POS).

- **Decisión del dueño (25-jul-2026): cumplimiento literal.** Los 34 sitios pasan a lupa + ventana
  flotante con Recientes/Favoritos, sin excepción para el grupo de "filtrar lo que ya veo" — se le
  planteó la tensión explícitamente (con el costo real: un clic extra en las 4 pantallas de más uso
  diario) y eligió la lectura literal de NPGS §5 de todos modos.

- **Plan en 3 fases, EN CURSO:**
  1. ✅ **HECHA en v49.36** — Recientes + Favoritos construidos en `ModalBusquedaBase` (el motor
     compartido). Bajo riesgo: no tocó ninguna pantalla existente, solo agregó capacidad. El único
     consumidor real de hoy (AguaPro → elegir cliente) la heredó automáticamente sin cambiar una
     línea de su propia llamada.
  2. **Siguiente paso propuesto:** migrar los ~9 sitios de "elegir un registro" (Facturar/Cobrar/
     Financiamiento → elegir cliente; elegir artículo) al motor ya reforzado — son estructuralmente
     iguales al caso de AguaPro que ya funciona, así que es el riesgo más bajo de los que quedan.
  3. Migrar los ~24 sitios de "filtrar la lista que ya veo" (Clientes, Facturas, Cobros, Vender...)
     — el trabajo de mayor riesgo, deja para el final a propósito.

#### Detalle de la Fase 1 (v49.36)

`ModalBusquedaBase` guarda Recientes/Favoritos en `localStorage` del navegador (por
`o.id` del buscador) — es preferencia de quien usa el sistema, no un dato del negocio, así que no
necesita tabla ni columna nueva. Se guarda una **"foto" chica** del registro (id + título +
subcampos ya visibles en la fila), nunca el registro completo — así Recientes/Favoritos se siguen
viendo bien aunque el dato original cambie después. Al elegir una fila desde esas secciones (en modo
`datos`, el único que usa algún módulo hoy), se busca el registro **vivo** en el array en memoria por
su id — si ya no existe (se borró), cae honestamente a la foto guardada en vez de fallar.

**Bug real encontrado y corregido antes de publicar (no llegó a producción):** la navegación por
teclado (flechas + Enter) del modal asumía que la lista visible era solo "resultados" — con
Favoritos/Recientes antepuestos, el índice de las flechas apuntaba a la fila equivocada y Enter
podía elegir un registro distinto al resaltado. Se corrigió con `navOrder` (el orden real de las
filas en pantalla, en el mismo orden en que se arma el HTML) en vez de indexar directo sobre
`st.filas` (que solo tiene resultados). Verificado con una prueba específica: bajar con flechas
hasta la última fila visible y confirmar que Enter elige exactamente esa fila, no otra.

Verificado con **19 pruebas Playwright** contra el motor real extraído del archivo, montado en un
servidor HTTP local (no `about:blank` — `localStorage` necesita un origen real), reproduciendo el
caso real de AguaPro: marcar/quitar favorito, reabrir y ver las 2 secciones nuevas, elegir desde
Recientes con el registro vivo completo, escribir texto oculta ambas secciones, navegación mixta por
teclado. Sin desborde en 420px, 0 errores de JS. `node --check` no aplica aquí (index.html) — los 3
`<script>` pasan `new Function()`; `version.json` válido.

**Aún NO hecho** (para que quede claro qué falta, no se puede confundir con "buscadores resueltos"):
ninguno de los 34 buscadores en línea cambió de comportamiento todavía — siguen siendo barra fija
en producción. Esta fase solo construyó la capacidad que usarán cuando se migren.

### C3 — Configuración de 12 secciones por módulo 🟡

- **NPGS §16** exige que todo módulo nuevo tenga Permisos, Campos, Estados, Notificaciones,
  Plantillas, Impresión, Automatizaciones, Integraciones, Variables, Numeración, Auditoría y
  Personalización.
- **Choca con una regla ya establecida y muy usada:** *no fingir funciones que no existen*. Doce
  pestañas de las cuales ocho dirían "Próximamente" sería exactamente eso.
- **Propuesta:** leerlo como *"toda sección de configuración que se construya debe salir de esta
  lista y llamarse igual en todos los módulos"* — no como *"los doce, siempre, aunque estén
  vacíos"*. Requiere el sí del dueño.

### C4 — Alturas de botón ✅ **RESUELTO en la v49.34**

**NPGS §3:** Principal 44 px · Normal 40 px · Pequeño 34 px. Aplicado a los botones de acción:

| Clase | Antes | Ahora | Rol |
|---|---|---|---|
| `.nxPf .ab` (Guardar, Cobrar) | 42 | **44** | Principal |
| `.nxPf .ab.sm` | 38 | **40** | Normal |
| `.nxPf .cartsavebtn` (Prefactura/Cotización) | 38 | **40** | Normal |
| `.nxPf .btn2` (+ Crear nivel) | 36 | **34** | Pequeño |
| `.nxPf .headbtn` | 36 | **34** | Pequeño |
| `.nxFP-menuBtn` (menú ⋮) | 28 | **34** | Pequeño — área tocable mucho mejor en móvil |
| `.nxFP-pgBtns button` (paginación) | 32 | **34** | Pequeño |
| `.btn.bsm.bghost` | 32 | **34** | Pequeño |
| `.btn` (núcleo de Seguros) | sin altura (~30) | **`min-height:34`** | Pequeño |
| `.nxSf .sf-btn` | 34 | 34 | ya cumplía |

`.btn` del núcleo se resolvió con **`min-height`**, no `height`: es la clase de botón más usada de
todo Seguros y solo tenía relleno. `min-height` **solo hace crecer lo que estaba corto, nunca
encoge nada** — riesgo mínimo frente a fijar una altura dura en cientos de sitios.

#### Excepciones escritas (NO son botones de acción — se dejaron a propósito)

| Elemento | Alto | Por qué |
|---|---|---|
| Filas del menú lateral | 26 px | Decretado por el dueño en v47.6 (*"reducir la altura 20-30%"*). Son filas de navegación, no botones. |
| Buscador `.nxBusca` | 42 px | Fijado por el reglamento de buscadores. Es un campo de texto, no un botón. |
| Chips de filtro (`.chip`, `.nxInvPill`) | 32 px | Pastillas de filtro, no acciones. |
| Steppers de cantidad (+/−) | 24–30 px | Viven dentro de una línea de tabla; agrandarlos rompería la fila. |
| Pestañas internas | 36 px | Navegación, no acción. |

Verificado con 11 comprobaciones Playwright midiendo la altura **renderizada real** (no la
declarada) del CSS extraído de los dos archivos, más que la barra de acciones completa no desborda
en 390 px y que las excepciones no cambiaron.

---

## 7. Lo que YA cumple NPGS

Para no rehacer lo que está bien:

- **§20 Auditoría** — usuario/fecha/hora/sucursal/dispositivo/IP, con la IP puesta por el servidor
  (no falseable). Falta solo el antes/después.
- **§22 Microanimaciones** — 260–300 ms, y respetan "reducir movimiento" del sistema operativo.
- **§18 Responsive** — un solo diseño adaptable; cada pantalla publicada se verifica con capturas
  reales en 390 px y 1280 px antes de salir.
- **§17 Impresión y compartir** — los documentos (facturas, recibos, contratos, estados de cuenta,
  comprobantes) ya salen con Imprimir/PDF + WhatsApp + Correo.
- **§15 Dashboard** — Inicio del POS abre con 8 indicadores, no con una tabla. Contabilidad,
  Reportes, Clientes, Facturas y Financiamiento abren con KPIs.
- **§21 Rendimiento** — carga perezosa en las pestañas pesadas (Historial del artículo, último
  costo de compra), paginación real en las listas largas, y caché de consultas repetidas.
- **§6 No duplicar** — se han eliminado varios duplicados reales (los 5 botones de pago que hacían
  todos lo mismo, "Agregar producto" vs. el buscador, los atajos de teclado que no existían).

---

## 8. Pendiente en este archivo

- **Capturas y ejemplos visuales por componente** (botón, tabla, formulario, modal, KPI, badge) —
  el dueño los pidió. Se harán con capturas reales de Playwright contra el código, no con dibujos,
  y conviene hacerlas **después** de resolver C1–C4: documentar en imágenes un sistema que está a
  punto de cambiar sería trabajo perdido.
