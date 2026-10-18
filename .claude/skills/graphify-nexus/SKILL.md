---
name: graphify-nexus
description: Mapa del código de NEXUS PRO con Graphify (grafo local, sin IA y sin enviar nada fuera) para saber dónde vive una función, quién la llama y qué rompe un cambio, sin releer index.html entero. Usar antes de tocar una función que no se conoce bien, para encontrar todas las capas/funciones relacionadas con una pantalla, o cuando la memoria de la sesión se está llenando por leer archivos grandes.
---

> **Nota de instalación (NEXUS PRO, 18-oct-2026):** Graphify (Apache-2.0) se revisó en el commit `86c57be` de `Graphify-Labs/graphify` (paquete `graphifyy==0.9.92`). No envía datos, no tiene telemetría y arma el mapa del código en la máquina, con tree-sitter. **Prohibido:**
> - usar Graphify Cloud o crear cuenta;
> - poner claves (`GEMINI_API_KEY`, etc.);
> - correr el pase «semántico» con IA;
> - usar `graphify add <url>`;
> - usar `graphify install`, que escribe hooks fuera del repo.
>
> El mapa vive en el *scratchpad*; **nunca subir `graphify-out/` al repo**.

# Mapa del código de NEXUS PRO

Graphify solo lee archivos de código (`.js`, `.ts`, `.py`…). Casi todo NEXUS está **dentro de `<script>` en `index.html`**, así que antes se copian esos bloques a `index.inline.js`. Esa copia solo existe en el *scratchpad*.

## Armar o actualizar el mapa (unos 30 s)

```bash
S=<scratchpad>/graphify            # carpeta de trabajo, nunca dentro del repo
[ -x "$S/venv/bin/graphify" ] || { python3 -m venv "$S/venv" && "$S/venv/bin/pip" install -q "graphifyy==0.9.92"; }
rm -rf "$S/src" && mkdir -p "$S/src"
git -C /home/user/nexus-pro archive HEAD | tar -x -C "$S/src"   # solo lo que está en git (sin secretos locales)
rm -rf "$S/src/docs/bitacora"                                    # la bitácora es texto: no aporta al mapa
python3 - "$S/src" <<'PY'
import re,sys,os
s=open(os.path.join(sys.argv[1],'index.html'),encoding='utf-8').read()
bl=re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>',s,re.S|re.I)
open(os.path.join(sys.argv[1],'index.inline.js'),'w',encoding='utf-8').write('\n'.join(f'// ---- bloque <script> #{i} de index.html ----\n'+b for i,b in enumerate(bl)))
PY
cd "$S/src" && "$S/venv/bin/graphify" update .
```

`git archive HEAD` toma lo **guardado** (commit). Si hay cambios sin guardar que importan, primero hay que hacer commit en la rama de trabajo.

## Preguntar al mapa (desde `$S/src`)

```bash
"$S/venv/bin/graphify" explain "regAbono"                  # qué llama y quién la llama
"$S/venv/bin/graphify" path "cobrarDesdeFact" "regAbono"   # cómo se conectan dos funciones
"$S/venv/bin/graphify" query "pagos pendientes por validar"
```

## Cómo usarlo bien

- **Las líneas son de la copia.** El mapa da números de línea de `index.inline.js`, no de `index.html`. Para editar, buscar el nombre con Grep en `index.html`.
- **Es una guía, no la verdad.** Las conexiones `[EXTRACTED]` se leyeron directamente del código. Las `[INFERRED]` son suposiciones de Graphify y hay que comprobarlas en el archivo real.
- **No ve las capas CSS.** Las capas (`style#nx…`) y los selectores no salen en el mapa. Para la cascada de CSS, seguir con Grep.
- **Rehacerlo después de cambios grandes**, antes de volver a preguntarle.
