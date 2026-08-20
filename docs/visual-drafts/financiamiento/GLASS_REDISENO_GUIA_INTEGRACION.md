# Financiamiento — Rediseño "Glass + Soft UI" (móvil) — Guía de integración

## Estado

El dueño pidió rediseñar el **look general** del módulo de Financiamiento ("no me gustó como
quedó"). Se acordó el estilo con él (Glassmorphism + Soft UI, blanco espacial, tarjetas de
vidrio) y se construyeron **2 prototipos ya aprobados por el dueño** — quedan en esta misma
carpeta:

- `GLASS_MOBILE_V1_PROTOTIPO.html` — Dashboard móvil de Financiamiento (pantalla principal).
- `GLASS_HISTORIAL_CREDITICIO_V1_PROTOTIPO.html` — Historial Crediticio ("ficha de cliente").

El dueño pidió que **ChatGPT haga la implementación** sobre el código real y que **Claude la
audite** antes de fusionar (mismo flujo ya establecido: "ChatGPT diseña, Claude implementa/
audita" — ver `CLAUDE.md`, sección "ChatGPT — nuevo flujo de trabajo para la parte visual").

**No publicar directo a `main`.** Todo el trabajo va en una rama nueva (sugerido:
`chatgpt/financiamiento-glass`) o se deja en `chatgpt/visual-draft` como código de referencia —
Claude lo revisa, lo audita contra el esquema/funciones reales, y lo fusiona por el camino
normal (rama → PR → merge).

## Reglas obligatorias (verbatim del dueño, no negociables)

- Usa las imágenes/prototipos **SOLO como referencia de estilo visual**. No copiar el diseño
  exacto — es una versión propia para NEXUS PRO.
- **Mantén toda la lógica existente funcionando.** Este es un reskin visual — toca SOLO HTML/CSS
  visual y, si hace falta, JS mínimo de interacción visual (abrir/cerrar un panel, alternar una
  clase). **NO cambies IDs, nombres de funciones, `onclick`, flujos, ni lógica de guardado.**
- **NO inventes funciones nuevas si no existen en la base.** Si algo del prototipo no tiene un
  dato real detrás, déjalo como "Próximamente" o sin acción — nunca fingir un botón que no hace
  nada real.
- Mantén el **acento morado/violeta** de Financiamiento (`#6d28d9`/`#4f46e5` — el mismo de
  siempre) — es una regla del proyecto ("cada app su color", nunca se mezcla entre módulos).
- Antes de decir "listo": verificar **sin desbordes en 390px, sin errores de consola, sin romper
  funciones, sin alterar la lógica actual**. Si algo no se pudo probar, decirlo claramente.

## Dónde vive el código real

Todo el módulo de Financiamiento es una IIFE autocontenida en `parches.js`
(`window.__NX_PRESTAMOS__`), aprox. líneas **11854–15455**. El CSS compartido del namespace
`.nxFP` (usado también por Cuotas del POS, no tocar esa parte) vive en
**`window.nxFPEnsureCSS()`**, aprox. líneas **25154–25710+** — es la única función que hay que
tocar para los tokens de color/vidrio.

---

## PANTALLA 1 — Dashboard móvil de Financiamiento

Función real: `renderLista(view)` (la vista por defecto, cuando `_prView==='prestamos' &&
_prFiltro==='todos'`). El prototipo `GLASS_MOBILE_V1_PROTOTIPO.html` es la referencia visual
completa (tokens de color, tipografía, glass, dock) — reproducirlo en el `<style>` de
`nxFPEnsureCSS()` y en el HTML que genera `renderLista()`.

### Mapa de datos real → elemento visual (NINGUNO se inventa, todos ya existen)

| Elemento del prototipo | Fuente real (`parches.js`) |
|---|---|
| Título "Financiamiento" + subtítulo | Título fijo. El subtítulo puede usar `clientesActivos` (ya calculado en `renderLista`) — ej. "N clientes activos". |
| Buscador | Ya existe el motor compartido `nxBuscaFiltroHTML`/`nxBuscaFiltroAbrir` (patrón NPGS §5) enganchado vía `pintarLupaPr()` — **no inventar un buscador nuevo**, solo darle el estilo `.search` de vidrio. |
| KPI "Cartera activa" | `totalSaldo` (ya calculado en `renderLista`, línea ~12478: `_prestamos.reduce((s,p)=>s+saldoDe(p),0)`). |
| KPI "Cobros de hoy" | **Reusar** `prCobranzaCalcularModelo().pagosHoy` (ya existe, línea ~12431 — suma los pagos de `_pagosByPrestamo` con fecha de hoy). Llamar esa función desde el dashboard también, no reinventar el cálculo. |
| KPI "Cuotas vencidas" | `nVencidos` (`_prestamos.filter(esVencido).length`, ya calculado). |
| KPI "Mora" | **Sumar `prMoraDe(p)`** sobre `_prestamos` (`_prestamos.reduce((s,p)=>s+prMoraDe(p),0)`) — `prMoraDe` ya existe (mismo patrón que usa `hcRender` para `moraAcum` por cliente). No hay un total ya calculado en `renderLista`, hay que agregarlo con esta única línea. |
| CTA "Nuevo financiamiento" | `window.nxPrestamoNuevo()` (ya existe, el botón "Nuevo préstamo" del sidebar de escritorio ya la llama). |
| Acceso rápido "Cobrar cuota" | `window.nxPrestamoFiltroTipo('vencidos')` (abre Cobranza). |
| Acceso rápido "Contratos" | **NO existe.** Dejar como "Próximamente" (atenuado, sin `onclick`) — igual que el prototipo ya lo marca con `.qtile.soon`. |
| Acceso rápido "MDM" | **NO existe.** Igual, "Próximamente". |
| Acceso rápido "Reportes" | `window.nxPrView('reportes')`. |
| Lista "Próximos pagos" | Construir desde `_prestamos` usando `prProximoPago(p)`, `saldoDe(p)`, `prRef(p)`, `prIniciales(p.nombre)`, `prEstadoInfo(p)` (mismos helpers reales que ya usa el resto del módulo). Tocar una fila → `window.nxPrestamoVer(p.id)`. |
| "Ver todos" (próximos pagos) | `window.nxPrestamoFiltroTipo('vencidos')` o `window.nxPrView('prestamos')` — el link no tiene una lista dedicada de "próximos pagos" hoy; usar Cobranza como destino más cercano. |

### El dock inferior (`renderFPDock()`, línea ~12960)

El dock REAL hoy tiene 5 botones: **Dashboard** (`nxPrestamoFiltroTipo('todos')`) / **Cobranza**
(`nxPrestamoFiltroTipo('vencidos')`) / **Cuotas** (`nxPrestamoFiltroTipo('cuotas')`) /
**Clientes** (`nxPrView('clientes')`) / **Más** (abre `.nxFP-dockSheet`, que ya tiene "Nuevo
préstamo" arriba del todo).

El prototipo pide 5 ítems distintos: **Inicio / Clientes / Financiar (centro, elevado) / Cobros
/ Más**. Para lograr esto sin perder ninguna función:

1. El botón central elevado **"Financiar"** debe llamar directo a `window.nxPrestamoNuevo()`
   (la misma función que hoy vive dentro de "Más" como `nxFP-popNew`) — se **promueve** a un
   botón propio del dock, con el estilo `.dock-item.center` del prototipo (cápsula elevada,
   degradado, sombra).
2. **"Cuotas" no se pierde** — como ya no cabe como uno de los 5 principales, se agrega como una
   opción más dentro de la hoja "Más" (`.nxFP-dockSheet`), en el mismo grupo "Cartera" donde ya
   están Activos/Pagados/Líneas de crédito (`moreItem('cuotas','Cuotas','ti-calendar-dollar')`,
   mismo patrón que las otras 3 líneas de ese grupo).
3. "Inicio" = el botón Dashboard de siempre (`nxPrestamoFiltroTipo('todos')`).
4. "Cobros" = el botón Cobranza de siempre (`nxPrestamoFiltroTipo('vencidos')`).
5. "Más" sigue igual (la hoja `.nxFP-dockSheet` ya existe, solo se le aplica el estilo de vidrio).

El CSS actual de `.nxFP-dock` (línea ~25684) **ya tiene** `backdrop-filter:blur(20px)
saturate(160%)` y fondo `rgba(255,255,255,.82)` — ya es parcialmente vidrio. Lo que falta es el
ítem central elevado (`.dock-item.center` del prototipo) y afinar sombras/bordes al nivel del
prototipo.

---

## PANTALLA 2 — Historial Crediticio ("ficha de cliente")

Función real: `hcRender()` (aprox. líneas 13832–13961), abierta por `window.nxPrHistCredito(cid)`.
El prototipo `GLASS_HISTORIAL_CREDITICIO_V1_PROTOTIPO.html` reproduce ESTA pantalla exacta con
estilo Glass — **cada dato del prototipo ya tiene su fuente real, no hay ningún dato inventado**:

| Elemento del prototipo | Fuente real en `hcRender()` |
|---|---|
| Header perfil (avatar, nombre, badge "Cliente activo") | `c.nombre`, iniciales de `c.nombre`. |
| Chip de score ("780/1000 · Excelente") | `sc.mil` + `sc.clas` (de `prHistScore(loans)`). |
| Datos (cédula, teléfono, correo, cliente desde, última actividad) | `c.cedula`, `c.telefono`, `c.email`, `c.created_at`, `prUltActividad(loans)` — helper `dato()` ya existente. |
| Gauge circular de score | Ya existe como clase `.ev-gauge`/`.ev-gaugein` (reusada en `hc-scorerow`, línea 13951) — el prototipo lo separa en el header, es válido reusar la misma clase ahí. |
| Tarjeta hero 1 "Monto financiado" | `financiado` (suma de `capital`) + `pagado` (suma de `pagadoDe(p)`). |
| Tarjeta hero 2 "Puntualidad de pago" + barra | `puntualidad` (%) + `promAtraso`. |
| Tarjeta hero 3 "Balance pendiente" | `balance` + `moraAcum`. |
| Tira de 8 KPI (Total préstamos, Activos, Pagados, Financiado, Pagado, Intereses, Mora, Prom. atraso) | Las 10 tiles ya existen en `hcRender()` (`kpis`, línea 13855-13857) — los 2 primeros valores (Total préstamos/Activos) ya se muestran en la fila hero 1 del prototipo, así que la tira de abajo puede mostrar los 8 restantes, o las 10 completas si hay espacio — decisión visual libre, pero **ninguna de las 10 se puede omitir sin mostrarla en algún lugar** (son datos reales, no decorativos). |
| 6 pestañas (Resumen/Préstamos/Pagos/Evaluaciones/Gestiones/Documentos) | `tabDef` (línea 13859) — nombres/orden EXACTOS, no agregar ni quitar ninguna. `onclick="window.nxPrHcTab('...')"` sin cambios. |
| "Comportamiento de pago" (puntos de color por mes) | `prTimelineMeses(loans)`, ya existe en la pestaña Resumen. |
| "Últimos préstamos" (filas) | `loans` ordenados por fecha, primeros 6 — ya existe (`ult.slice(0,6)`), con `loanTable()`/`loanRows()`. Tocar una fila → `window.nxPrestamoVer(p.id)` (ya lleva `document.getElementById('nxPrHc').remove()` antes, no tocar ese detalle). |
| Panel "Recomendación del sistema" | `rec` (línea 13935-13941) — monto/tasa/plazo sugeridos + nivel de riesgo, todos reales. |
| Panel "Indicadores del cliente" | `indicadores` (línea 13944-13952). |
| Panel "Alertas importantes" | `alertPanel` (línea 13954-13958) — **solo alertas con datos reales**, ya filtradas así en el código; el prototipo no debe agregar ninguna alerta que no salga de `alertas.push(...)`. |

### Lo que el prototipo NO debe copiar del estilo "Crextio" original (ya descartado)

El dueño mandó una imagen de referencia de un dashboard de RRHH ("Crextio") — se tomó SOLO el
concepto de estilo (tarjeta de perfil, fila de "hero cards", bento de tarjetas), nunca su
contenido. **No agregar**: time-tracker, checklist de onboarding, calendario semanal, badge de
salario — nada de eso existe en Financiamiento y no tiene sentido aquí.

---

## Tokens de diseño (extraídos de los 2 prototipos, listos para pegar en `nxFPEnsureCSS`)

```css
:root{
  --bg:#f3f4fa; --ink:#171a2b; --ink-2:#565b78; --ink-3:#9498b3;
  --accent:#6d28d9; --accent-2:#4f46e5; --accent-soft:rgba(109,40,217,.10);
  --glass:rgba(255,255,255,.62); --glass-strong:rgba(255,255,255,.82);
  --glass-border:rgba(255,255,255,.75);
  --glass-shadow:0 10px 34px -14px rgba(30,27,75,.20),0 1px 1px rgba(30,27,75,.03);
  --ok:#0f9d58; --ok-soft:rgba(15,157,88,.12);
  --warn:#c2760a; --warn-soft:rgba(194,118,10,.14);
  --danger:#d3374c; --danger-soft:rgba(211,55,76,.12);
  --info:#0891b2; --info-soft:rgba(8,145,178,.12);
  --r-xl:28px; --r-lg:22px; --r-md:16px; --r-sm:12px;
}
```

(Tipografía: el proyecto YA usa `'Plus Jakarta Sans','Segoe UI',system-ui,-apple-system,
sans-serif` dentro de `.nxFP` — `nxFPEnsureCSS()` ya carga la fuente de Google Fonts, no hay que
agregar nada ahí.)

**Regla de "vidrio":** `background: var(--glass); backdrop-filter: blur(16-20px) saturate(160%);
-webkit-backdrop-filter: ...; border: 1px solid var(--glass-border); box-shadow:
var(--glass-shadow);` — mismo patrón repetido en tarjetas KPI, filas, dock, tabs.

**Fondo del módulo:** blanco-espacial `#f3f4fa` con 2 manchas radiales suaves detrás (violeta muy
tenue arriba-izquierda, azul muy tenue arriba-derecha) — decorativo, no interfiere con la
lectura.

## Checklist obligatorio antes de dar el trabajo por terminado

1. `node --check parches.js` sin errores.
2. Los 3 `<script>` de `index.html` compilan con `new Function()` (si se tocó algo ahí).
3. Cero desborde horizontal a 390px en las 2 pantallas (`scrollWidth === clientWidth`).
4. Cero errores de consola al abrir el Dashboard, el dock, y `nxPrHistCredito(cid)` con un
   cliente real.
5. Ningún `id`, nombre de función, `onclick` ni flujo de guardado cambiado — solo HTML/CSS y el
   mínimo JS de interacción visual descrito arriba (promoción de "Financiar" en el dock).
6. Los 2 accesos "Próximamente" (Contratos, MDM) no tienen ningún `onclick` real.
7. Reportar explícitamente cualquier cosa que no se pudo probar (ej. comportamiento real de
   `backdrop-filter` en Safari/iOS, que este entorno no puede verificar).

Claude revisará este trabajo contra el esquema/funciones reales antes de fusionar a `main`.
