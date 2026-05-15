#!/usr/bin/env bash
# Trapdoor — one-command bootstrap (macOS / Linux)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
VENV="$BACKEND/.venv"

if [ ! -d "$VENV" ]; then
  echo "[+] Creating venv at $VENV"
  python3 -m venv "$VENV"
fi

# shellcheck source=/dev/null
. "$VENV/bin/activate"

echo "[+] Installing dependencies..."
pip install --upgrade pip >/dev/null
pip install -r "$BACKEND/requirements.txt"

if [ ! -f "$BACKEND/.env" ]; then
  echo "[i] No .env found — running in heuristic-only mode."
  echo "    Copy backend/.env.example to backend/.env and add Azure credentials to enable AI Foundry."
fi

HOST="${TRAPDOOR_HOST:-127.0.0.1}"
PORT="${TRAPDOOR_PORT:-8000}"

echo ""
echo "========================================================="
echo "  Trapdoor running at http://$HOST:$PORT"
echo "  - UI:           http://$HOST:$PORT/"
echo "  - API health:   http://$HOST:$PORT/api/healthz"
echo "  - API docs:     http://$HOST:$PORT/docs"
echo "========================================================="

cd "$BACKEND"
exec uvicorn app.main:app --host "$HOST" --port "$PORT" --reload
