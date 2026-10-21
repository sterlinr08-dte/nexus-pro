#!/usr/bin/env bash
# Recarga la MEMORIA al iniciar o al compactar el chat (dueño, 21-oct-2026: «que no se te olvide lo que
# tenemos cuando se compacta»). Solo lee archivos; nunca escribe ni falla. Carga completa solo la MEMORIA del
# proyecto del chat (el sistema recorta la salida de un hook a ~10 mil caracteres) y señala las de al lado.
base="${CLAUDE_PROJECT_DIR:-$(pwd)}"
padre="$(dirname "$base")"
echo "=== MEMORIA de $(basename "$base") (se recarga sola al compactar). Léela antes de seguir; actualízala en cada entrega. ==="
[ -f "$base/docs/MEMORIA.md" ] && head -c 9600 "$base/docs/MEMORIA.md"
for repo in "$padre/nexus-pro" "$padre/bayolcell-taller" "$padre/studio-rd"; do
  [ "$repo" = "$base" ] && continue
  [ -f "$repo/docs/MEMORIA.md" ] && echo "-> Si el trabajo toca $(basename "$repo"), leer primero $repo/docs/MEMORIA.md"
done
exit 0
