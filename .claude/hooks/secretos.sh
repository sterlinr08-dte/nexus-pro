#!/usr/bin/env bash
# Candado de secretos (23-oct-2026, dueño: «secretos nunca en el repo»). Idea tomada de Agent Guard (MIT), hecha en
# casa: sin descargas ni binarios. Corre antes de cada `git commit` / `git push` que lance Claude (PreToolUse · Bash).
# Si en lo que se va a confirmar o subir aparece algo que parece una clave, bloquea (exit 2) y dice dónde.
# Apagar en un caso puntual: SECRETOS_OFF=1 delante del comando.
set -u
IN=$(cat 2>/dev/null || true)
CMD=$(printf '%s' "$IN" | python3 -I -c 'import sys,json
try: print(json.load(sys.stdin).get("tool_input",{}).get("command",""))
except Exception: print("")' 2>/dev/null || true)
case "$CMD" in *"git commit"*|*"git push"*) ;; *) exit 0 ;; esac
case "$CMD" in *SECRETOS_OFF=1*) exit 0 ;; esac
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0
# Qué revisar: lo preparado para el commit; en un push, además los commits que todavía no están en origin.
DIFF=$(git diff --cached -U0 --no-color 2>/dev/null || true)
case "$CMD" in *"git commit -a"*|*"git commit -qa"*|*"git commit -am"*|*"git commit -qam"*) DIFF="$DIFF
$(git diff -U0 --no-color 2>/dev/null || true)";; esac
case "$CMD" in *"git push"*)
  UP=$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || echo origin/main)
  DIFF="$DIFF
$(git log -p -U0 --no-color "$UP..HEAD" 2>/dev/null || true)";; esac
ADDED=$(printf '%s\n' "$DIFF" | grep -E '^\+' | grep -vE '^\+\+\+' || true)
[ -n "$ADDED" ] || exit 0
# Patrones (clave de Info Plus en enlaces, JWT de Supabase service_role, Anthropic, Stripe, AWS, GitHub, Slack, llaves privadas, tokens largos junto a palabras clave).
PAT='(clave=[A-Za-z0-9._%-]{12,}|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9._-]{40,}|sk-ant-[A-Za-z0-9_-]{20,}|sk_(live|test)_[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|xox[baprs]-[A-Za-z0-9-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY|(api[_-]?key|apikey|secret|token|password|contrase[nñ]a|service_role)["'"'"']?\s*[:=]\s*["'"'"']?[A-Za-z0-9/+_.-]{24,})'
HITS=$(printf '%s\n' "$ADDED" | grep -nEi "$PAT" | grep -viE 'SUPABASE_ANON_KEY|publishable|anon_key|ejemplo|example|PLACEHOLDER|\*\*\*|<SECRET>|\[SECRET\]' | head -5 || true)
[ -n "$HITS" ] || exit 0
{
  echo "SECRETOS: se detectó algo que parece una clave en lo que se va a $( case "$CMD" in *push*) echo subir;; *) echo confirmar;; esac ). Bloqueado."
  printf '%s\n' "$HITS" | sed -E 's/([A-Za-z0-9._%+\/-]{8})[A-Za-z0-9._%+\/-]{8,}/\1…/g' | cut -c1-200
  echo "Quite la clave del archivo (va en el panel de Supabase o en Cloudflare, nunca en el repo). Si es un falso positivo seguro, anteponga SECRETOS_OFF=1 al comando."
} >&2
exit 2
