#!/usr/bin/env bash
# Recarga la MEMORIA de los proyectos al iniciar o al compactar el chat (dueño, 21-oct-2026:
# «que no se te olvide lo que tenemos cuando se compacta»). Solo lee archivos; nunca escribe ni falla.
base="${CLAUDE_PROJECT_DIR:-$(pwd)}"
padre="$(dirname "$base")"
echo "=== MEMORIA DE LOS PROYECTOS (se recarga sola al compactar). Léela antes de seguir; actualízala en cada entrega. ==="
for repo in "$base" "$padre/nexus-pro" "$padre/bayolcell-taller" "$padre/studio-rd"; do
  f="$repo/docs/MEMORIA.md"
  [ -f "$f" ] || continue
  case " $vistos " in *" $repo "*) continue;; esac
  vistos="$vistos $repo"
  echo; echo "----- $(basename "$repo"): docs/MEMORIA.md -----"
  head -c 20000 "$f"
done
exit 0
