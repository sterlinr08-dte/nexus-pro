# Orden del dueño: borrar Geriatra y crear la base de Pizzería Unive 2

**Autor:** Claude · **Rama:** `claude/pizzeria-unive2`

- **Dueño (25-oct-2026):** «Sí bórrala y vamos a usar la nueva empresa de pizzería unive 2».
- **Borrar Geriatra** (`xqcrpsqhjznltthnfysw`):
  - la herramienta de Supabase de esta sesión **no tiene la opción de borrar proyectos**;
  - lo hace el dueño en el panel: proyecto → Settings → General → Delete project;
  - el respaldo de datos ya se le entregó.
- **Crear «Pizzería Unive 2»** (org `gmjedhkktbffnanmebkf`, us-east-1):
  - `create_project` se llamó, pero se venció a los 60 s;
  - Supabase le pidió al dueño **confirmar el costo** y nadie respondió a tiempo;
  - no hay constancia de que se haya creado. Hay que verificarlo con `list_projects` antes de reintentar.
- **Siguiente paso:**
  1. El dueño confirma el costo, o crea el proyecto en el panel.
  2. Después se aplica el esquema POS como se hizo con STUDIO (`supabase/studio/`).
  3. Todo eso, después de que el dueño apruebe el plano.
