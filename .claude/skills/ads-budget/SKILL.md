---
name: ads-budget
description: "Plan and review paid-media budgets, bidding, pacing, marginal return, forecasts, CPA, ROAS, MER, LTV:CAC, constraints, and allocation across supported platforms. Use for ad budget allocation, media budget, bidding strategy, scaling, spend pacing, budget forecast, ROAS target, or investment tradeoffs."
---

> **Nota de instalación (NEXUS PRO, 10-oct-2026):** copiada desde claude-ads v2.0.2 (MIT) solo como instrucciones; los scripts de Python del autor no están instalados, así que no hay puntuación numérica automática. Para datos reales usar el conector Meta Ads (solo lectura) y la Biblioteca de anuncios. **Nunca crear, activar, pausar ni cambiar presupuestos de campañas sin que el dueño apruebe cada cambio por escrito.** Los resultados se muestran en el chat; no guardar carpetas `.claude-ads/` en el repo. Escribir en español sencillo.

# Budget and Bidding

1. Establish objective, conversion value, gross margin, cash constraints, sales
   capacity, attribution uncertainty, seasonality, and platform minimum evidence.
2. Normalize spend and outcomes to comparable windows and definitions.
3. Calculate break-even boundaries and show formulas, inputs, uncertainty, and
   sensitivity cases.
4. Distinguish committed baseline, controlled experiments, and reserve capacity.
5. Compare hold, reallocate, scale, reduce, or experiment options using marginal
   evidence rather than blended averages alone.
6. Return a decision-complete plan with platform/campaign amount, timing, owner,
   guardrails, success measure, and rollback trigger.

Rules such as 70/20/10, fixed CPA multiples, fixed budget-to-CPA ratios, and fixed
percentage scaling are optional heuristics, never universal authorization.

