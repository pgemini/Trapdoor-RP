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
exec python -m app.cli "$@"
