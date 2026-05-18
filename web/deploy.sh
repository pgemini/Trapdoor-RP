#!/usr/bin/env bash
# Trapdoor web — build + deploy to Azure Static Web Apps.
#
# Reads configuration from web/.env.local (which is gitignored). The file
# must define at least AZURE_SWA_DEPLOY_TOKEN.
#
# Usage:
#   cd web
#   ./deploy.sh                 # build + deploy
#   ./deploy.sh --skip-build    # reuse existing out/
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$HERE/.env.local"
OUT_DIR="$HERE/out"
SWA_ENV="${SWA_ENV:-production}"
SKIP_BUILD=0
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=1 ;;
  esac
done

# Load .env.local into the shell.  Use `set -a` so each VAR= line becomes
# an environment variable without us having to enumerate them.
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

if [ -z "${AZURE_SWA_DEPLOY_TOKEN:-}" ]; then
  cat <<EOF

  $(tput setaf 3 2>/dev/null)Missing AZURE_SWA_DEPLOY_TOKEN.$(tput sgr0 2>/dev/null)
  ----------------------------------
  1) cp web/.env.local.example web/.env.local
  2) Set AZURE_SWA_DEPLOY_TOKEN in that file.
     Get the value from:
       Azure portal → Static Web Apps → <your SWA> → Manage deployment token
  3) Re-run ./deploy.sh

EOF
  exit 2
fi

export TRAPDOOR_STATIC_EXPORT="${TRAPDOOR_STATIC_EXPORT:-1}"

if [ "$SKIP_BUILD" -eq 0 ]; then
  echo "[1/2] Building static export..."
  ( cd "$HERE" && npm run build )
else
  echo "[1/2] --skip-build, reusing $OUT_DIR"
fi

if [ ! -d "$OUT_DIR" ]; then
  echo "Build output not found at $OUT_DIR — run without --skip-build." >&2
  exit 1
fi

echo "[2/2] Deploying to Azure Static Web Apps (env=$SWA_ENV)..."
npx --yes @azure/static-web-apps-cli deploy "$OUT_DIR" \
  --env "$SWA_ENV" \
  --deployment-token "$AZURE_SWA_DEPLOY_TOKEN"
