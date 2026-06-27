#!/usr/bin/env zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUNDLED_NODE="/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
STATUS_FILE="${DRUGNEWS_DAILY_STATUS_FILE:-/private/tmp/drugnews-codex-daily-status.json}"
PM_FILE="${DRUGNEWS_DAILY_PM_FILE:-/private/tmp/drugnews-codex-pm-health.json}"

START_CHROME=1
CAPTURE=1
STRICT=0

for arg in "$@"; do
  case "$arg" in
    --no-chrome) START_CHROME=0 ;;
    --no-capture) CAPTURE=0 ;;
    --strict) STRICT=1 ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: scripts/codex_daily_start.sh [--no-chrome] [--no-capture] [--strict]" >&2
      exit 2
      ;;
  esac
done

if command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
elif [[ -x "$BUNDLED_NODE" ]]; then
  NODE_BIN="$BUNDLED_NODE"
else
  echo "Node.js was not found. Expected bundled Node at: $BUNDLED_NODE" >&2
  exit 1
fi

cd "$ROOT_DIR"

echo "== Drugnews Codex Daily Start =="
echo "Repo: $ROOT_DIR"
echo "Node: $NODE_BIN"
echo

echo "== 1. PM preflight =="
"$NODE_BIN" scripts/audit_daily_pm_health.mjs || true
echo

if [[ "$START_CHROME" == "1" ]]; then
  echo "== 2. Ensure social-capture Chrome =="
  /bin/zsh scripts/start_social_capture_chrome.sh || true
  echo
fi

echo "== 3. Social capture and import =="
if [[ "$CAPTURE" == "1" ]]; then
  "$NODE_BIN" scripts/daily_social_update_check.mjs --capture-facebook --capture-dcard | tee "$STATUS_FILE"
else
  "$NODE_BIN" scripts/daily_social_update_check.mjs | tee "$STATUS_FILE"
fi
echo

echo "== 4. Reader and reference QA =="
"$NODE_BIN" scripts/audit_references.mjs
"$NODE_BIN" scripts/audit_reader_experience.mjs
echo

echo "== 5. PM health after daily run =="
"$NODE_BIN" scripts/audit_daily_pm_health.mjs | tee "$PM_FILE"
echo

echo "== 6. Worktree status =="
git status --short
echo

if [[ "$STRICT" == "1" ]]; then
  "$NODE_BIN" scripts/audit_references.mjs --strict
  "$NODE_BIN" scripts/audit_reader_experience.mjs --strict
  "$NODE_BIN" scripts/audit_daily_pm_health.mjs --strict
fi

echo "Daily status: $STATUS_FILE"
echo "PM health: $PM_FILE"
