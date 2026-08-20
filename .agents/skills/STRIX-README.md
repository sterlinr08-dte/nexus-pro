# Strix — instaladas 4 skills (preparadas, sin activar)

Instaladas 2026-08-12 con `npx skills add usestrix/strix` (repo oficial `usestrix/strix`, Apache
2.0), a pedido del dueño tras verlas en un reel — verificado en el momento contra el README real
del repo, no de memoria. El instalador es limpio: solo dejó 4 `SKILL.md` (12-16K cada uno, sin
scripts/maquinaria pesada) + su propio `skills-lock.json` — no tocó `git` (sin commits/branches
propios) ni `CLAUDE.md`, así que no hizo falta la curación quirúrgica que sí necesitó `gstack`
(ver `GSTACK-README.md`).

**Las 4:**
- `penetration-testing-with-strix` — correr un pentest (CLI local o nube gestionada) y leer
  resultados.
- `managed-pentesting-with-strix` — manejar `app.strix.ai` vía REST (sin Docker ni clave local).
- `fix-security-vulnerabilities-with-strix` — parchar hallazgos y re-escanear para confirmar.
- `ci-security-scanning-with-strix` — escaneo automático por PR en CI/CD.

## Estado real: instaladas, pero NO ejecutables todavía

Strix hace pentesting real — corre exploits de verdad contra el objetivo, no solo lee código —
así que necesita SIEMPRE una de estas dos cosas, ninguna presente por defecto en una sesión nueva:

1. **CLI local:** Docker con el daemon corriendo + una clave de API de un modelo
   (`STRIX_LLM`/`LLM_API_KEY`).
2. **Nube gestionada (`app.strix.ai`):** una cuenta del dueño + su propia clave de API de la
   plataforma.

**Verificado en la sesión de instalación:** Docker está instalado pero el daemon NO corre en este
tipo de entorno (sandbox), y no hay ninguna cuenta/clave de Strix configurada — así que, tal como
queda, ninguna de las 4 skills puede ejecutar un escaneo real todavía. Quedan preparadas para el
día que el dueño decida darle la clave/cuenta — no fingir que ya funciona si se invocan sin eso.

## Antes de apuntar Strix a NEXUS PRO

Este sistema es una app en producción con datos reales de clientes (ver `CLAUDE.md`). Un pentest
autónomo de verdad EJECUTA exploits — mismo criterio que
`docs/METODOLOGIA-PRUEBAS-DESTRUCTIVAS.md` (2026-08-12): preferir un objetivo que NO sea
producción (un branch de Supabase, una copia local) siempre que la prueba no exija
específicamente el entorno real; y si de verdad hace falta apuntar a producción, confirmarlo
explícitamente con el dueño antes, no lanzarlo por iniciativa propia.
