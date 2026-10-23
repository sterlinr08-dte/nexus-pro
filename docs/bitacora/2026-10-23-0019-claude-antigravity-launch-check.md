# 23-Oct-2026 00:19 · Claude · «Instala las skills antigravity»: revisada la colección, instalado launch-check

**Dueño:** «Instala también las skills antigravity». La colección es `sickn33/agentic-awesome-skills` (antes
antigravity-awesome-skills): 2,743 skills agregadas de muchas fuentes. Instalarla entera llenaría el contexto y meter
cosas sin revisar va contra la regla. Se buscó en el catálogo lo que encaja con los negocios y se revisó por dentro:
- **Instalada:** `launch-check` (Ces107/agent-forge, MIT). Script local en Python sin dependencias; solo consulta el sitio
  que se audita. Corrida inicial (sin Playwright, modo pasivo):
  - bayolcell.com/taller.html → 54/100. Sin claves expuestas. Faltan: redirección forzada a HTTPS (HSTS), Content-Security-Policy,
    X-Frame-Options; robots.txt bloquea el rastreo del SEO.
  - nexusprord.com → 58/100. Sin claves expuestas. Faltan las mismas cabeceras; `sitemap.xml` no es XML válido; sin `<h1>`.
  Las cabeceras se arreglan en Cloudflare (Workers/Pages headers). Pendiente de que el dueño diga si lo hacemos.
- **No instaladas:** `production-audit` (envía el repo a api.commit.show), `verify-document` y `extract-document-data`
  (envían documentos a stipple.sh). Ya tenemos `comprobante-leer` con Claude para los bauches, sin terceros.
- Descartadas por repetidas: `supabase`, `supabase-postgres-best-practices` (ya instaladas en Bayol), `whatsapp-cloud-api`
  (en portugués y para Meta directo; usamos Zernio).
Instalado igual en `nexus-pro` y `bayolcell-taller`; `HERRAMIENTAS.md` actualizado.
