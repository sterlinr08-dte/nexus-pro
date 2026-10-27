# Skills de Obsidian instaladas (en rama)

**Dueño:** «Instalar obsidian skills».

## Origen y revisión
- **Origen:** https://github.com/kepano/obsidian-skills, commit `3ccff53` (15-sep-2026). Licencia MIT, de Steph Ango (@kepano), director de Obsidian. La licencia se copió en `.claude/skills/obsidian-markdown/LICENSE-obsidian-skills`.
- **Revisión:**
  - Son 6 `SKILL.md` con referencias; no traen scripts ni hooks.
  - Solo `defuddle` y `knap` sugieren `npm install -g`, y eso no se hizo. Necesita el OK del dueño.
  - `obsidian-cli` necesita Obsidian abierto en la PC del dueño, así que en la nube no sirve.

## Instaladas en `.claude/skills/`
- `obsidian-markdown`
- `obsidian-bases`
- `json-canvas`
- `obsidian-cli`
- `defuddle`
- `knap`

`HERRAMIENTAS.md` tiene la sección nueva «Obsidian (notas)».

## Estado
- Rama `claude/skills-obsidian`. El envío directo a `main` quedó bloqueado porque publica en producción.
- Para que las skills queden activas en todas las sesiones hay que unir la rama a `main`, con el «publícalo» del dueño.
