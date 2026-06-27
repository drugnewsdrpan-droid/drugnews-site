#!/usr/bin/env zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUNDLED_NODE="/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"

if command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
elif [[ -x "$BUNDLED_NODE" ]]; then
  NODE_BIN="$BUNDLED_NODE"
else
  echo "Node.js was not found. Expected bundled Node at: $BUNDLED_NODE" >&2
  exit 1
fi

cd "$ROOT_DIR"
"$NODE_BIN" scripts/daily_social_update_check.mjs "$@"
