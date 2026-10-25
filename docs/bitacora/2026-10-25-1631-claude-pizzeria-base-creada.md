# Base Supabase de Pizzería Unive 2 creada (vacía)

**Autor:** Claude · **Rama:** `claude/pizzeria-unive2`

- El dueño la creó en el panel el 25-oct-2026 (`create_project` por la herramienta falló 2 veces por falta de confirmación del costo y por un incidente de Supabase).
- **Proyecto:** «Pizzería Unive 2», id **`gzdkzcspmvyxgfcytpgy`**, us-east-1, Micro (US$10 al mes), Postgres 17.11.
- Org: `sterlinr08`. Estado: `ACTIVE_HEALTHY`.
- **Verificado:** 0 tablas en public y 0 usuarios.
- **Seguridad elegida:**
  - Data API activo;
  - «Automatically expose new tables» desactivado (los scripts de `supabase/studio/09_grants_storage.sql` dan los permisos explícitos);
  - «Enable automatic RLS» activo.
- La contraseña de la base la guardó el dueño. No pasó por el chat.
- Postgres 17.11 es más nuevo que el de la madre (17.6). Al aplicar el esquema, vigilar diferencias.
- Se actualizó `docs/MEMORIA.md` §7.
- **Siguiente paso:**
  1. Llegan las respuestas del formulario.
  2. Se decide el subdominio.
  3. Se entrega el plano.
  4. Solo con el OK del dueño se aplica el esquema POS.
