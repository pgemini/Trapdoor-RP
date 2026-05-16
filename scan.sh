#!/usr/bin/env bash
# Trapdoor — recursive folder scanner.
# Activates backend/.venv if present, then runs `python -m app.cli`.
# Keeps the caller's working directory so relative paths in argv work.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
VENV="$BACKEND/.venv"

if [ -d "$VENV" ]; then
  # shellcheck source=/dev/null
  . "$VENV/bin/activate"
fi

export PYTHONPATH="$BACKEND${PYTHONPATH:+:$PYTHONPATH}"

# Pre-flight: surface a friendly message instead of a 14-line traceback
# when the backend deps haven't been installed yet.
if ! python -c "import pydantic" >/dev/null 2>&1; then
  printf '\n  \033[33mTrapdoor backend dependencies are not installed.\033[0m\n'
  printf '  \033[90m------------------------------------------------\033[0m\n'
  printf '  Run this once from the repo root:\n\n'
  printf '    cd backend\n'
  printf '    python3 -m venv .venv\n'
  printf '    . .venv/bin/activate\n'
  printf '    pip install -r requirements.txt\n'
  printf '    cd ..\n'
  printf '    ./scan.sh %s\n\n' "$*"
  exit 2
fi

exec python -m app.cli "$@"
