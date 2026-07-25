# DESIGN_SYSTEM.md — NEXUS PRO

**Inventario medido de lo que EXISTE hoy + en qué se aparta de `NPGS.md` + plan de convergencia.**

`NPGS.md` dice **cómo debe ser**. Este archivo dice **cómo está hoy**, con números reales sacados
del código (no de memoria ni a ojo), y qué falta para cumplir el estándar. Es el puente entre los
dos.

Medido el 25-jul-2026 sobre `index.html` + `parches.js` en la v49.33.

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

Dos patrones, decretados en `CLAUDE.md` como reglamentos separados:

| Patrón | Qué hace | Usos medidos |
|---|---|---|
| `nxBuscaHTML()` y sus 8 wrappers locales | Filtra **en línea** una lista ya visible | **47** |
| `ModalBusquedaBase` | Abre **ventana** para elegir de un catálogo grande | **7** |

Más `nxBuscadorUniversal()` (Ctrl+K en el POS) y `abrirGlobalSearch()` (Ctrl+K en Seguros) — dos
búsquedas globales de pantalla completa.

> ⚠️ **NPGS §5 prohíbe el patrón en línea** ("nunca buscar desde una barra fija"). Son 47 sitios.
> Ver "Conflictos".

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

**Pendiente:** normalizar Cuotas a azul. Es un cambio de CSS acotado (el HTML, los ids y toda la
lógica de cobro de cuota se quedan igual), pero toca una pantalla de dinero en producción, así
que va con verificación Playwright y capturas antes/después. **Esperando el visto bueno del dueño
por ser una reversión de algo que él mismo aprobó antes.**

### C2 — Buscadores: 47 sitios contra el estándar 🟠

- **NPGS §5:** solo 🔍, siempre ventana flotante, nunca barra fija, con Recientes y Favoritos.
- **Hoy:** 47 buscadores en línea (patrón `nxBuscaHTML`, migración terminada con 174 pruebas
  Playwright) + 7 en ventana. Ninguno tiene Recientes ni Favoritos.
- **Propuesta:** convergencia por fases, no de golpe. Fase 1: agregar Recientes y Favoritos al
  motor `ModalBusquedaBase` que ya existe. Fase 2: migrar los buscadores que de verdad eligen un
  registro de un catálogo (los de "elegir cliente/artículo"). Fase 3: decidir si los que solo
  filtran una tabla ya visible (Clientes, Pólizas, Cobros) también pasan a ventana — ahí el
  estándar cuesta un clic extra en la acción más frecuente del día. Requiere el sí del dueño.

### C3 — Configuración de 12 secciones por módulo 🟡

- **NPGS §16** exige que todo módulo nuevo tenga Permisos, Campos, Estados, Notificaciones,
  Plantillas, Impresión, Automatizaciones, Integraciones, Variables, Numeración, Auditoría y
  Personalización.
- **Choca con una regla ya establecida y muy usada:** *no fingir funciones que no existen*. Doce
  pestañas de las cuales ocho dirían "Próximamente" sería exactamente eso.
- **Propuesta:** leerlo como *"toda sección de configuración que se construya debe salir de esta
  lista y llamarse igual en todos los módulos"* — no como *"los doce, siempre, aunque estén
  vacíos"*. Requiere el sí del dueño.

### C4 — Alturas de botón 🟡

- **NPGS §3:** 40 / 44 / 34 px.
- **Hoy:** el grueso está en 30, 32, 36 y 38 px; no existe ningún 44 px. Además hay dos alturas
  decretadas antes por el propio dueño que quedarían fuera: las filas del menú lateral a 26 px
  (v47.6, *"reducir la altura 20-30%"*) y el buscador a 42 px exactos (reglamento de buscadores).
- **Propuesta:** normalizar a la escala de NPGS con dos excepciones escritas y justificadas (menú
  lateral y buscador), o cambiar esas dos si el dueño prefiere el estándar puro. Es un barrido de
  CSS grande pero de bajo riesgo — cero lógica. Requiere el sí del dueño.

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
