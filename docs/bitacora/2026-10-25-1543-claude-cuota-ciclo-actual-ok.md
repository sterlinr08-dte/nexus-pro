# Cuota de Supabase: el ciclo actual va bien

**Autor:** Claude · **Rama:** `claude/pizzeria-unive2` · solo lectura.

**Capturas del dueño** (página Usage, ciclo del 15-oct al 15-nov, con 10 días transcurridos):

| Renglón | Uso | Del tope |
|---|---:|---:|
| Edge Function Invocations | 151,807 de 2,000,000 | 8 % |
| Egress | 3.0 de 250 GB | 1 % |
| Storage | 4.8 de 100 GB | 5 % |
| Realtime | 104 mil de 5 millones | 2 % |
| MAU | 10 | <1 % |

- Disco: 0 de exceso.
- Ritmo: unas 470,000 llamadas en el mes, menos del 25 % del tope. **No hay nada por encima de la cuota.**
- **Conclusión probable:** la restricción del 27-oct no aplica, porque solo aplica «si la organización sigue por encima de la cuota». No hace falta quitar el tope de gasto.
- **Cómputo:** 1,554 horas Micro, que son US$20.89 en lo que va del ciclo.
  - Son 6 proyectos encendidos todo el día.
  - Cada proyecto cuesta unos US$10 al mes; el crédito del plan cubre uno.
  - Borrar Geriatra ahorraría unos US$10 al mes; Pizzería Unive 2 sumaría otros tantos.
- **Pendiente opcional:** ver «Previous billing cycle» por proyecto para saber qué disparó el exceso de septiembre.
