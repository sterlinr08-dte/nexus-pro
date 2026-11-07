# Reglas para pasar diseños de Figma a NEXUS PRO (MCP de Figma)

> Creado el 07-nov-2026 con `/mcp__Figma__create_design_system_rules`. Léase junto con **`DESIGN.md`**, que es la única línea gráfica del producto, y con `docs/REFERENCIAS-DISENO.md`.
> Vale igual para **Bayol Cell** (`bayolcell-taller`), que usa la misma arquitectura: capas `bc-*.js` y `conta-*.js`.

**Resumen para la IA:** Figma entrega React + Tailwind como **referencia**. NEXUS PRO **no** usa React, Tailwind ni un paso de compilación (*build*). Todo diseño de Figma se traduce a **una capa nueva en JavaScript puro**, con su CSS adentro, sus tokens `--nx-*`, sus íconos Tabler y el candado para apagarla.

---

## 1. Tokens de diseño

**Dónde están**
- **`DESIGN.md` §7b** define la línea gráfica única. En el código, los tokens son variables CSS que inyecta `parches-pos-stitch-visual.js` (capa `#nxLineaUnicaCSS`).
- **`DESIGN.md` §9** tiene el estilo común de los 3 proyectos: vidrio, color, tamaños y movimiento.
- **No hay archivo JSON de tokens ni un sistema que los transforme.** Los valores van escritos como propiedades `--nx-*` dentro de cada capa.

| Token | Valor | Uso |
|---|---|---|
| `--nx-bg` | `#F8FAFC` | Fondo de la página |
| `--nx-surface` | `#FFFFFF` | Tarjetas, ventanas, barra superior |
| `--nx-ink` / `--nx-steel` / `--nx-mute` | `#0F172A` / `#64748B` / `#94A3B8` | Texto: principal, secundario, apagado |
| `--nx-line` / `--nx-line-2` | `rgba(148,163,184,.12)` / `.18` | Separadores y bordes de tarjeta |
| `--nx-blue` / `-d` / `-l` / `-b` | `#2563EB` / `#1D4ED8` / `#EFF6FF` / `#BFDBFE` | El único acento: acción, foco, selección |
| `--nx-r` / `--nx-r-md` / `--nx-r-sm` | 16 / 12 / 10 px | Radio de superficies / barras / botones y campos |
| `--nx-font` | `Geist, Segoe UI, system-ui` | Todo el texto |
| `--nx-mono` | `JetBrains Mono, ui-monospace` | Montos, fechas y referencias (solo en NEXUS; en Bayol, la letra del sistema) |

Colores de estado (`DESIGN.md` §9):
- éxito `#15803d` sobre `#f0fdf4`;
- aviso `#b45309`;
- error `#b91c1c`;
- vidrio `rgba(255,255,255,.86)`, fuerte `.94` con `blur(24px) saturate(180%)`;
- fondo detrás de una ventana: `rgba(15,23,42,.35)` con `blur(6px)`.

**Al traer un diseño de Figma:**
- Cada color de Figma se convierte al token más cercano. Nunca se copia el hex nuevo tal cual.
- Si el diseño trae morado o índigo (`#6d28d9`, `#7c3aed`, `#4f46e5`), pasa a **azul NEXUS**.
- Nada de negro puro, brillos neón ni degradados sobre texto grande (`DESIGN.md` §7).

```css
/* Así se usan dentro de una capa */
#nxMiPane .tarjeta { background: var(--nx-surface, #fff); border: 1px solid var(--nx-line-2, rgba(148,163,184,.18));
  border-radius: var(--nx-r, 16px); color: var(--nx-ink, #0f172a); }
#nxMiPane .tarjeta:focus-within { box-shadow: 0 0 0 3px rgba(37,99,235,.12); }
```

## 2. Componentes

- **No hay librería de componentes, Storybook ni React.** La app es una sola página: `index.html` (unos 1.5 MB, con HTML, CSS y JS juntos).
- Todo lo nuevo entra como **capa** (`parches-*.js` o `parches-*.css`). Las capas se cargan desde la lista de `parches-seguros.js`, que es un arreglo `[['js','archivo.js'], …]`. **Ojo con las comas** al agregar una capa.
- Cada capa:
  1. se protege para no cargarse dos veces (`if (window.__nxAlgo) return;`);
  2. tiene un candado para apagarla (`localStorage.nx_<capa>_off='1'` o `NX_<CAPA>=false`);
  3. inyecta su `<style id="nx…">` una sola vez;
  4. envuelve las funciones existentes **sin editarlas**;
  5. limita su CSS a un id (`#nxCobroPane`, `#nxP7Pane`…) para no ensuciar otras pantallas.
- Los patrones que ya existen y se reusan: tarjeta KPI, píldora, ⓘ de ayuda (`#nxInfoI`), ventana de vidrio (`#nxCobroPane`), isla de avisos (`parches-isla-avisos.js`) y botones con luz (`style#nxLuz`).

```js
/* Esqueleto de una capa nueva a partir de un frame de Figma */
(function () {
  'use strict';
  if (window.__nxMiPantalla) return; window.__nxMiPantalla = true;
  try { if (localStorage.getItem('nx_mi_pantalla_off') === '1') return; } catch (e) {}
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  function estilos() {
    if (document.getElementById('nxMiPantallaCSS')) return;
    const s = document.createElement('style'); s.id = 'nxMiPantallaCSS';
    s.textContent = `#nxMiPane .btn{min-height:44px} #nxMiPane input{height:48px;font-size:16px}`;
    document.head.appendChild(s);
  }
  // Envolver la función que pinta la pantalla original, sin editarla
  const orig = window.renderAlgo;
  if (typeof orig === 'function') window.renderAlgo = function () { const r = orig.apply(this, arguments); estilos(); /* …ajustes… */ return r; };
})();
```

## 3. Marcos de trabajo y librerías

| Tema | Qué se usa |
|---|---|
| Interfaz | **HTML y JavaScript puro** (ES2017+), sin marco de trabajo |
| Estilos | CSS escrito a mano: en `<style>` dentro de `index.html`, en las capas y en algunos `.css` sueltos |
| Compilación | **Ninguna.** El repositorio se sirve tal cual. |
| Publicación | **Cloudflare Workers con archivos estáticos** (`wrangler.jsonc`, `assets.directory: "./"`), conectado a Git: `main` = producción en `nexusprord.com`. `worker.js` solo atiende `/boleto.html`. |
| Datos | Supabase (`@supabase/supabase-js`), Edge Functions en `supabase/functions/` |
| Otras librerías (por CDN) | Tabler Icons webfont, Sentry, EmailJS; SheetJS se carga solo cuando hace falta |

**Regla:** el React y Tailwind que entrega `get_design_context` **no se pegan**. Se traducen a una capa como la de arriba. No se agrega Tailwind, ni un paso de compilación, ni `npm` al frontend.

## 4. Imágenes y archivos

- Viven en la raíz y en carpetas sencillas:
  - `assets/`: fondos del login y la oficina, en `.webp`, con versión para PC y para celular;
  - `logos/` y `bancos-logos/`: bancos;
  - `ars-logos/`: aseguradoras;
  - `dash-icons/`: íconos PNG del tablero;
  - `icon-*.png`: íconos de la app.
- **Formato:** `.webp` para fotos y fondos, con un archivo aparte para el celular. Los PNG quedan solo para íconos.
- **Caché:** `sw.js` guarda solo los estáticos (manifest e íconos) y nunca los datos. Las capas se cargan con `?v=` para forzar la versión nueva.
- **No hay CDN propio:** Cloudflare sirve los estáticos.
- **Desde Figma:** bajar con `download_assets`, convertir a `.webp`, ponerlo en `assets/` y usar rutas relativas (`assets/nombre.webp`). Nada de imágenes en base64 dentro del JS.

## 5. Íconos

- **Tabler Icons webfont 3.46** por CDN: `<i class="ti ti-nombre"></i>`. Los más usados: `ti-x`, `ti-check`, `ti-plus`, `ti-file-spreadsheet`, `ti-brand-whatsapp`.
- **Nombres en kebab-case de Tabler.** Ejemplos: `ti-device-floppy` para guardar, `ti-refresh` para actualizar, `ti-info-circle` para ayuda.
- Los íconos de colores de los módulos son dibujos con significado. No se usan como fondos grandes (`DESIGN.md` §2).
- **Desde Figma:** el ícono del diseño se cambia por su equivalente en Tabler. No se importan SVG sueltos, salvo un logo.

## 6. Forma de escribir el CSS

- **Sin módulos CSS ni styled-components.** Cada capa limita su CSS con su propio id, y la que tenga el selector más específico gana la cascada.
- **Estilos globales:** los de `index.html`, más las capas globales (`parches-vidrio-global.js`, `parches-tamano-texto.js`, temas oscuro y claro).
- **Adaptación al celular:** se diseña primero para el celular, con quiebres en 480, 700, 768 y 900 px. Nunca debe haber desplazamiento hacia los lados.
- **Tamaños obligatorios** (regla del dueño, 18-oct-2026):
  - todo lo que se toca mide ≥ 44 × 44 px;
  - los campos miden 48 px de alto con letra de 16 px;
  - el botón principal mide 54 px;
  - la letra mínima de los controles es de 13 px.
- **Movimiento:**
  - se animan solo `transform` y `opacity`;
  - duraciones: 160 ms al tocar, 220 ms en cambios locales, de 320 a 420 ms en paneles;
  - curva: `cubic-bezier(.22,1,.36,1)`;
  - respetar `prefers-reduced-motion`.
- **Formularios** (`DESIGN.md` §4b): etiquetas en minúscula normal, de 13 px; casillas en fila con su texto; textos de usted, cortos y sin paréntesis.

## 7. Cómo está organizado el proyecto

```
index.html                 app completa (vistas #v-*, funciones globales)
parches.js / parches-seguros.js   cargadores de capas (lista ordenada)
parches-*.js|css           una capa por función o pantalla (WhatsApp, POS, CRM, vidrio…)
supabase/functions/        Edge Functions (Deno)
supabase/migrations/       copia de cada cambio de base de datos
scripts/                   pruebas qa-*.js (Playwright, simulador local)
docs/bitacora/             una entrada por cambio (obligatoria)
DESIGN.md · REGLAMENTOS.md · CLAUDE.md · AGENTS.md · docs/MEMORIA.md
```

## 8. Pasos para llevar un frame de Figma a código

1. Leer `DESIGN.md` y `docs/REFERENCIAS-DISENO.md`. Ubicar la pantalla real y su función de pintado en `index.html`; si no se conoce, usar `graphify-nexus`.
2. Usar `create_session`, luego `get_design_context` y luego `get_screenshot` del nodo. Tomar lo que devuelvan **como referencia**.
3. Convertir los colores, radios y letras a tokens `--nx-*`, y los íconos a Tabler.
4. Escribirlo como una capa nueva y aislada, que se pueda apagar y que se cargue desde el primer pintado. **Nada de rediseños masivos:** el antecedente de FOUC en iPhone es el PR #311.
5. Medir con Playwright a 390 y a 1280 px: botones ≥ 44, campos 48/16 y sin desplazamiento hacia los lados. Mandar las capturas al dueño.
6. Escribir la bitácora y trabajar en una rama `claude/*`. Publicar solo con «publícalo».
