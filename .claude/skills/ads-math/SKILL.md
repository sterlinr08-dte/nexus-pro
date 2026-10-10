---
name: ads-math
description: "Calculate and model paid-media CPA, CPL, CPC, CPM, ROAS, MER, break-even targets, contribution margin, LTV:CAC, impression-share opportunity, budgets, forecasts, and experiment economics. Use for PPC math, ad calculator, break-even analysis, ROAS calculator, CPA calculator, budget forecast, LTV CAC, or MER."
---

> **Nota de instalación (NEXUS PRO, 10-oct-2026):** copiada desde claude-ads v2.0.2 (MIT) solo como instrucciones; los scripts de Python del autor no están instalados, así que no hay puntuación numérica automática. Para datos reales usar el conector Meta Ads (solo lectura) y la Biblioteca de anuncios. **Nunca crear, activar, pausar ni cambiar presupuestos de campañas sin que el dueño apruebe cada cambio por escrito.** Los resultados se muestran en el chat; no guardar carpetas `.claude-ads/` en el repo. Escribir en español sencillo.

# Paid Media Financial Model

1. Identify the decision and collect units, currency, period, tax/refund treatment,
   margin, attribution basis, and uncertainty.
2. Show the formula and map every input to an operator value or cited artifact.
3. Validate denominators, sign, missing values, incompatible windows, and unit
   conversions.
4. Calculate base, downside, and upside cases where uncertainty affects the decision.
5. Keep platform-attributed revenue, blended business revenue, cash flow, and
   contribution margin distinct.
6. Return machine-readable inputs, formulas, outputs, sensitivities, and decision
   implications.

Never fabricate missing financial inputs, hide division-by-zero, or present a point
forecast without its assumptions.

