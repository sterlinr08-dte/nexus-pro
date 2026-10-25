# Cuota de Supabase: la causa son las llamadas a Edge Functions (ciclo anterior)

**Autor:** Claude · **Rama:** `claude/pizzeria-unive2` · solo lectura: no se cambió nada.

- **Captura del dueño (página Usage):**
  - «grace period… previous billing cycle (Edge Functions Invocations Exceeded)»;
  - el período de gracia termina el 27-oct-2026;
  - el ciclo actual va del 15-oct al 15-nov.
- Esto **corrige** lo que se supuso en `…-claude-supabase-cuota.md`: no era el egress.
- **Medido hoy** con los registros `function_edge_logs` de las últimas 24 h:

| Proyecto | Llamadas en 24 h |
|---|---:|
| BayolCell-taller | ~6,600 |
| NEXUS PRO Seguros | 147 |
| STUDIO RD | 135 |
| Deluxe | 2 |
| Amatista | 0 |

- **Total: unas 7,000 al día, que dan unas 210,000 al mes.**
- En BayolCell, las funciones que más llaman:

| Función | Llamadas en 24 h | Origen |
|---|---:|---|
| `whatsapp-webhook` | 1,502 | |
| `social-webhook` | 1,496 | |
| `alarma-agente` | 1,439 | tarea programada cada minuto |
| `social-automatizaciones` | 720 | tarea cada 2 minutos |
| `whatsapp-campanas` | 720 | tarea cada 2 minutos |
| `whatsapp-ia-responder` | 471 | |

- **Conclusión probable:**
  - el plan Pro incluye unos 2 millones de llamadas al mes, y el ritmo de hoy no llega a ese tope;
  - el exceso fue de **un pico del ciclo pasado** (15-sep a 15-oct) que ya no está activo;
  - eso **no se pudo confirmar**: los registros solo cubren 24 h.
- **Pendiente del dueño:** bajar en la página Usage hasta el renglón «Edge Function Invocations» del ciclo actual y mandar captura.
  - Si va por debajo del 100 %, la restricción del 27-oct no debería aplicar.
  - Si va por encima, hay que quitar el tope de gasto o bajar las tareas de BayolCell.
