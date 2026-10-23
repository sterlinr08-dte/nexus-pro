# 23-Oct-2026 00:12 · Claude · Sacar provecho de la comunidad: candado de secretos y skill redaccion-clara

**Dueño:** «Sacar provecho» → «Sí» a instalar Agent Guard y Avoid AI Writing. Se revisaron por dentro antes:
- **Agent Guard** (MIT, sin telemetría): sólido, pero exige un binario propio y `gitleaks` descargados en cada sesión de la
  nube y engancha cada herramienta (PreToolUse, PostToolUse, Stop, UserPromptSubmit). Demasiado peso y riesgo de fallos
  por sesión. Se tomó la idea y se hizo en casa: `.claude/hooks/secretos.sh` (PreToolUse · Bash) revisa lo preparado para
  commit o los commits por subir y bloquea si aparece algo que parece una clave. Probado: detecta `clave=…` de Info Plus
  y un JWT service_role; deja pasar la anon key y comandos normales; `SECRETOS_OFF=1` lo apaga para un caso puntual.
- **Avoid AI Writing** (MIT): el detector y las listas están calibrados para inglés; no hay versión en español (solo
  alemán y portugués). Se creó `redaccion-clara` en español con sus categorías adaptadas y la regla del dueño (REGLAMENTOS §4).
- Instalado igual en `nexus-pro` y `bayolcell-taller`. `HERRAMIENTAS.md` actualizado. Pendientes de decidir: anotifier y showreel.
