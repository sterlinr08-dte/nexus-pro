# 2026-11-27 19:56 RD · Claude — Temas Apple y Linear publicados

Sigue a `2026-11-27-1930-claude-temas-apple-linear.md`. El dueño tocó **«Publícalo»**.

- **PR #565 unido a `main`** (squash `9723df0`). Lo publicó Cloudflare.
- **Comprobado en vivo** (nexusprord.com, pantalla de entrada como iPhone 13), sin errores en ningún caso:

| Tema guardado | Clases en `<html>` | Color de acento | Reglas cambiadas |
|---|---|---|---|
| `stripe` | `tema-stripe tema-claro` | `#533afd` | 1,746 en 50 ms |
| `apple` | `tema-apple tema-claro` | `#0066cc` | 1,993 en 34 ms |
| `linear` | `tema-linear tema-glass-oscuro` | `#828fff` | 1,291 en 37 ms |
| `premium` | Glass oscuro | — | — |
| sin nada guardado | Glass oscuro (como antes) | — | — |

- **No verificado:** adentro, con la sesión real del dueño en su iPhone. Lo prueba él en Configuración → Apariencia.
- **Para apagar:** `NX_TEMA_APPLE=false` / `NX_TEMA_LINEAR=false` en el `<head>`, o revertir `9723df0`.
- **Pendiente menor:** en Apple, algunos avatares y el ícono de «Transferencia» siguen en morado.
