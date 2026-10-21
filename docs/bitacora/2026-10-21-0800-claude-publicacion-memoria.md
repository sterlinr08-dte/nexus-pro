# 21-oct-2026 · Publicada la MEMORIA y su recarga automática

Dueño: «Publícalo».

- Al reanudar este chat, el hook ya se disparó, pero mandó las dos MEMORIAS juntas (27 KB) y el sistema solo mostró un pedazo: corta la salida de un hook en unos 10 mil caracteres.
- Corrección:
  - cada MEMORIA quedó por debajo de unos 9.300 caracteres;
  - la parte técnica pasó a `docs/MEMORIA-TECNICA.md`, que se lee cuando hace falta;
  - el hook carga completa solo la MEMORIA del proyecto del chat y señala la de los otros proyectos.
- Se aplicaron sobre `main` solo los 3 commits de memoria: hook más regla en CLAUDE.md, MEMORIA y ajuste. Lo demás que está en las ramas sigue sin publicar.
- Comprobado: `main` tiene la regla, los dos archivos de MEMORIA, el hook y `.claude/settings.json`. La salida del hook mide unos 9.300–9.500 caracteres.
- No cambia nada de lo que ven los empleados ni los clientes.
