# Decisión del dueño: una sola organización de Supabase; la pizzería la paga él

**Autor:** Claude · **Rama:** `claude/pizzeria-unive2`

- **Decisión (25-oct-2026):**
  - todos los clientes siguen en la organización `sterlinr08` (plan Pro);
  - **la base de Pizzería Unive 2 la paga el dueño.**
- Se explicaron las otras opciones y por qué no se eligieron:
  - una organización Pro por cliente cuesta unos US$25 al mes por cada una;
  - el plan gratis no tiene respaldos diarios y se apaga si pasa una semana sin uso.
- Si un cliente quiere ser dueño de sus datos, más adelante se le transfiere su proyecto a una organización a su nombre.
- **Segundo intento** de `create_project` («Pizzería Unive 2», us-east-1): se volvió a vencer a los 60 s sin que se aprobara el costo.
  - `list_projects` confirma que **no se creó**. Siguen 6 proyectos y Geriatra todavía existe.
- **Siguiente paso:** el dueño crea el proyecto en el panel (opción B) y borra Geriatra.
