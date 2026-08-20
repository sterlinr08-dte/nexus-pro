# Financiamiento Glass V1 — entrega de ChatGPT para auditoría

## Estado

Base visual recibida: commit `6968ac2` en `chatgpt/visual-draft`.

ChatGPT preparó una implementación determinística contra el `parches.js` REAL de esta rama, sin tocar `main`. Debido a que el conector de GitHub disponible para ChatGPT reemplaza archivos completos y `parches.js` es monolítico/grande, no se fuerza una sustitución remota riesgosa del archivo. La implementación queda publicada como aplicador + fragmentos revisables en:

- `scripts/financiamiento_glass_v1/apply.py`
- `scripts/financiamiento_glass_v1/dashboard_data.jsfrag`
- `scripts/financiamiento_glass_v1/dock.jsfrag`
- `scripts/financiamiento_glass_v1/history_header.jsfrag`
- `scripts/financiamiento_glass_v1/glass_v1.css`
- `scripts/financiamiento_glass_v1/glass_v1_desktop_guard.css`

## Aplicación en esta rama

```bash
python scripts/financiamiento_glass_v1/apply.py
git diff -- parches.js
```

El aplicador:

1. se niega a correr en `main/master`;
2. localiza el `renderLista()` correcto después de `prCobranzaMainHTML()` para no tocar el `renderLista` de Vehículos;
3. integra el Dashboard Glass solo en `prestamos/todos`;
4. reemplaza `renderFPDock()` conservando `#nxFPDockHost` colgado directo de `<body>`;
5. enriquece `hcRender()` sin reemplazar sus 6 pestañas ni sus paneles funcionales;
6. agrega CSS al final de `nxFPEnsureCSS()` para ganar por cascada y no reescribir el bloque compartido con `.nxFP-pos`;
7. ejecuta `node --check parches.js` si Node está disponible y restaura el original si falla.

## Decisiones contra código real

- El Dashboard aprobado es **móvil**. En `>900px` se conserva la composición desktop actual para no perder ni duplicar accesos de escritorio; el nuevo dock sigue siendo móvil.
- `Cobros de hoy`: la guía nombraba `prCobranzaCalcularModelo().pagosHoy`, pero la función real devuelve `_prCobModelo`; no tiene propiedad `pagosHoy`. Se reutiliza la misma fuente/cálculo real que ya usa `prCobranzaMainHTML()`: `_pagosByPrestamo` filtrado por `fecha === hoy()`.
- `Contratos` y `MDM`: quedan visualmente atenuados como **Próximamente**, sin `onclick`.
- Dock móvil final: **Inicio / Clientes / Financiar / Cobros / Más**. `Financiar` llama `window.nxPrestamoNuevo()`. `Cuotas` pasa al grupo Cartera dentro de Más.
- `Exportar Excel` y `Configuración` permanecen accesibles desde Más en móvil.
- Historial Crediticio conserva las pestañas exactas: Resumen / Préstamos / Pagos / Evaluaciones / Gestiones de cobro / Documentos, además de los 10 KPI reales, timeline, préstamos, recomendaciones, indicadores y alertas.

## Auditoría requerida antes de PR

Claude debe auditar el diff resultante contra las funciones/esquema reales y verificar al menos:

- `node --check parches.js` limpio.
- Playwright móvil a 390px: `scrollWidth <= innerWidth`, dock fijo, sin elementos tapados por safe-area, sin errores de consola.
- Dashboard: Cartera activa, Cobros de hoy, Cuotas vencidas y Mora coinciden con los cálculos existentes.
- `Contratos`/`MDM` no ejecutan ninguna acción.
- `Financiar`, `Cobros`, `Clientes`, `Más`, `Cuotas`, `Reportes`, `Excel` y `Configuración` conservan destino real.
- Historial: las 6 pestañas siguen navegando; filas siguen abriendo `nxPrestamoVer`; no desaparece ninguno de los 10 KPI.
- Escritorio: Dashboard anterior sigue operativo; no hay regresión en sidebar/topbar.
- `.nxFP-pos` (Cuotas del POS) no cambia visualmente por este reskin.
- Cero cambios de esquema, Supabase, persistencia, cálculo financiero o lógica de guardado.

Si todo pasa, commit en esta misma rama y PR normal hacia `main`. **Nunca publicar directo a `main`.**
