# Pizzería Unive 2: subdominio elegido

**Autor:** Claude · **Rama:** `claude/pizzeria-unive2`

- **Dueño (25-oct-2026): `unive2.nexusprord.com`.**
- **Modelo, comprobado en `organizaciones` de la madre:**
  - igual que `deluxe.nexusprord.com` y `amatista.nexusprord.com` (`tipo='externa'`, `dominio`, `auth_url` = base propia), que responden 200;
  - `unive2.nexusprord.com` todavía no responde: está sin configurar.
- **Pendiente para la fase de montaje (con el OK del plano):**
  1. Fila en `organizaciones` de la madre: slug `unive2`, `dominio='unive2.nexusprord.com'`, `auth_url='https://gzdkzcspmvyxgfcytpgy.supabase.co'`. Nace con `activo=false`.
  2. Dominio personalizado en Cloudflare para el Worker que sirva la caja.
  3. Usuarios `usuario@unive2`.
- **Hallazgo:** la fila `geriatra` («AVÍCOLA ERP», `avicola.nexusprord.com`, `activo=false`) todavía apunta a la base borrada `xqcrpsqhjznltthnfysw`.
  - Está inactiva. No se tocó, porque cambiar datos de la madre requiere autorización.
  - Se le propone al dueño borrarla, junto con el dominio `avicola` en Cloudflare si existe.
