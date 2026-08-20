# Financiamiento Glass V1 — notas de implementación de ChatGPT

## Estado

**CANDIDATO PARA AUDITORÍA. NO ESTÁ APLICADO A `parches.js` NI A `main`.**

La propuesta de código quedó publicada en esta misma rama como:

- `GLASS_IMPLEMENTACION_CHATGPT.patch`

Se dejó como patch de referencia deliberadamente. El conector de GitHub usado por ChatGPT permite reemplazar archivos completos, pero `parches.js` es muy grande y la lectura por rangos del conector no entrega de forma segura un buffer completo para reescribirlo sin riesgo de truncación. Por eso **no se hizo un reemplazo parcial ni se tocó `main`**. Claude debe auditar/aplicar el patch contra el `parches.js` real de la rama y después ejecutar la batería visual.

## Alcance exacto del candidato

1. **Dashboard móvil de Financiamiento** (`renderLista(view)`)
   - Glass + Soft UI sobre fondo blanco espacial.
   - KPIs reales: Cartera activa, Cobros de hoy, Cuotas vencidas y Mora.
   - Buscador reutiliza `nxBuscaFiltroHTML`; no se inventa otro motor de búsqueda.
   - CTA `Nuevo financiamiento` reutiliza `window.nxPrestamoNuevo()`.
   - Accesos rápidos:
     - Cobrar cuota → `window.nxPrestamoFiltroTipo('vencidos')`.
     - Contratos → **Próximamente**, sin `onclick`.
     - MDM → **Próximamente**, sin `onclick`.
     - Reportes → `window.nxPrView('reportes')`.
   - Próximos pagos construidos únicamente con helpers existentes (`prProximoPago`, `saldoDe`, `prRef`, `prIniciales`, `prEstadoTabla`).

2. **Dock móvil** (`renderFPDock()`)
   - Orden: **Inicio / Clientes / Financiar / Cobros / Más**.
   - `Financiar` es el único botón central elevado y llama a `window.nxPrestamoNuevo()`.
   - `Cuotas` no desaparece: pasa al grupo **Cartera** dentro de `Más`.
   - El resto de destinos de la hoja `Más` se conserva.

3. **Historial Crediticio** (`hcRender()`)
   - Header Glass con score real (`sc.mil`, `sc.clas`) y gauge existente.
   - Tres hero cards con datos existentes: Monto financiado, Puntualidad, Balance pendiente.
   - Se conservan los **10 KPI existentes**, las **6 pestañas exactas**, tablas, recomendaciones, indicadores y alertas.
   - No se agrega ningún dato ni alerta ficticia.

4. **CSS** (`nxFPEnsureCSS()`)
   - Overrides Glass añadidos al final y escopeados a Financiamiento/Historial.
   - El dashboard Glass solo sustituye visualmente la portada móvil por debajo de 760px.
   - La pestaña POS Cuotas (`.nxFP-pos`) queda fuera del rediseño.
   - Se mantiene el acento morado/violeta de Financiamiento.

## Hallazgo de integración que Claude debe revisar

La guía `GLASS_REDISENO_GUIA_INTEGRACION.md` indica para el KPI **Cobros de hoy** reutilizar `prCobranzaCalcularModelo().pagosHoy`.

En el código real revisado, `prCobranzaCalcularModelo()` **devuelve `_prCobModelo` (array)** y no expone una propiedad `pagosHoy`. El cálculo real de pagos de hoy está actualmente inline dentro de `prCobranzaMainHTML()`.

El candidato resuelve esta discrepancia extrayendo **esa misma fórmula existente**, sin cambiarla, a un helper local `prPagosHoy()` y haciendo que tanto Cobranza como el dashboard Glass la reutilicen. Claude debe verificar que el diff conserve exactamente la semántica actual.

## No incluido / no autorizado

- Sin cambios de Supabase, SQL, RLS, RPC, tablas ni Storage.
- Sin cambios de cálculo financiero o reglas de negocio, salvo extraer la fórmula existente de pagos de hoy a un helper reutilizable.
- Sin funciones reales para Contratos o MDM.
- Sin cambios a `main`.
- Sin publicación directa.
- ChatGPT **no afirma** haber ejecutado Playwright ni una prueba real de navegador en esta ronda.

## Checklist obligatorio para Claude antes de aplicar/fusionar

- [ ] Revisar el patch contra el `parches.js` actual de `chatgpt/visual-draft` y resolver cualquier drift de contexto manualmente.
- [ ] Confirmar que `prPagosHoy()` es byte-semánticamente equivalente a la fórmula inline anterior.
- [ ] Aplicar solo al branch de trabajo; nunca directo a `main`.
- [ ] `node --check parches.js` sin errores.
- [ ] Playwright en **390px**: ancho de documento = ancho de viewport; cero overflow horizontal.
- [ ] Playwright en escritorio: sidebar, tabla, reportes, cobranza y demás vistas siguen operativas.
- [ ] Consola limpia al abrir Dashboard, Cobranza, Clientes, Historial Crediticio y `Más`.
- [ ] Buscador Glass abre el buscador compartido NPGS y filtra igual que antes.
- [ ] `Contratos` y `MDM` aparecen como **Próximamente** y no tienen acción.
- [ ] Dock exacto: Inicio / Clientes / Financiar / Cobros / Más.
- [ ] `Financiar` abre el formulario real existente.
- [ ] `Cuotas` sigue accesible desde `Más`.
- [ ] Los destinos existentes del sidebar/escritorio no se pierden.
- [ ] Historial conserva los 10 KPI y las 6 pestañas: Resumen / Préstamos / Pagos / Evaluaciones / Gestiones de cobro / Documentos.
- [ ] Click de préstamo en Historial sigue cerrando `nxPrHc` antes de abrir `nxPrestamoVer()`.
- [ ] POS Cuotas (`.nxFP-pos`) no cambia visual ni funcionalmente.
- [ ] Sin nuevas llamadas API/backend ni modificaciones de esquema.
- [ ] Capturas comparativas móvil + escritorio para auditoría visual.

## Criterio de salida

Solo considerar este rediseño listo para PR cuando Claude haya:

1. auditado el patch contra las funciones reales;
2. aplicado el candidato en una rama de trabajo;
3. ejecutado sintaxis + Playwright;
4. documentado cualquier ajuste necesario;
5. confirmado cero regresiones de lógica;
6. abierto/fusionado por el flujo normal de PR.
