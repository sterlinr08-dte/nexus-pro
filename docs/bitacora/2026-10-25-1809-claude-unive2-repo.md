# Unive 2: repositorio propio (bloqueado por permisos) y hallazgos en studio-rd

**Autor:** Claude · **Rama:** `claude/pizzeria-unive2`

- **El dueño dijo «Dale»** a la propuesta: sistema propio, repositorio `unive2` privado, a partir de la caja de STUDIO sin su marca.
- `mcp__github__create_repository` respondió **403 «Resource not accessible by integration»**: la integración no puede crear repositorios. **Lo crea el dueño** y le da acceso a la app Claude. Luego se usa `add_repo` con push.
- **Hallazgos en `studio-rd`** (clon de solo lectura):
  1. `docs/ECF-MSELLER.md`: **el dueño ya había elegido MSeller para STUDIO el 06-oct-2026**, con un plan por fases (`ecf-emitir`, `ecf-estado`, columnas e-CF en `pos_ventas`, secuencias E31/E32/E34). Todavía sin construir: no hay Edge Functions e-CF en el repo.
  2. El plan gratis tiene un tope de **1,000 llamadas al mes** (unas 4 por comprobante). Si se pasa, da **429 y no deja facturar** hasta el día 1. Por eso hace falta un contador propio con aviso al 80 %.
  3. La caja de STUDIO (`parches-pos.js`, 15,720 líneas) es más nueva que la de NEXUS (13,012) y ya tiene **variantes** (migración 37) y redondeo.
- **Decisión de diseño:** la conexión e-CF se construye **una sola vez y en común** para STUDIO, Unive 2 y los demás clientes, siguiendo `ECF-MSELLER.md`.
