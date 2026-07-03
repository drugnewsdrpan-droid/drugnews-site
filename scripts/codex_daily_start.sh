#!/usr/bin/env zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUNDLED_NODE="/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
STATUS_FILE="${DRUGNEWS_DAILY_STATUS_FILE:-/private/tmp/drugnews-codex-daily-status.json}"
RUN_LOG="${DRUGNEWS_DAILY_RUN_LOG:-/private/tmp/drugnews-codex-daily-run.log}"
PM_FILE="${DRUGNEWS_DAILY_PM_FILE:-/private/tmp/drugnews-codex-pm-health.json}"
CHROME_FILE="${DRUGNEWS_REGULAR_CHROME_FILE:-/private/tmp/drugnews-regular-chrome-readiness.json}"

START_CHROME=1
CAPTURE=1
STRICT=0
SOCIAL_ARGS=()

for arg in "$@"; do
  case "$arg" in
    --no-chrome) START_CHROME=0 ;;
    --no-capture) CAPTURE=0 ;;
    --strict) STRICT=1 ;;
    --facebook-post=*) SOCIAL_ARGS+=("$arg") ;;
    --dcard-post=*) SOCIAL_ARGS+=("$arg") ;;
    --facebook-current) SOCIAL_ARGS+=("$arg") ;;
    --facebook-regular-current) SOCIAL_ARGS+=("$arg") ;;
    --dcard-current) SOCIAL_ARGS+=("$arg") ;;
    --dcard-regular-current) SOCIAL_ARGS+=("$arg") ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: scripts/codex_daily_start.sh [--no-chrome] [--no-capture] [--strict] [--facebook-post=URL] [--dcard-post=URL] [--facebook-current] [--facebook-regular-current] [--dcard-current] [--dcard-regular-current]" >&2
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

echo "== 1B. Regular Chrome readiness =="
"$NODE_BIN" scripts/check_regular_chrome_readiness.mjs | tee "$CHROME_FILE" || true
echo

if [[ "$START_CHROME" == "1" ]]; then
  echo "== 2. Ensure social-capture Chrome =="
  /bin/zsh scripts/start_social_capture_chrome.sh || true
  echo
fi

echo "== 3. Social capture and import =="
if [[ "$CAPTURE" == "1" ]]; then
  "$NODE_BIN" scripts/daily_social_update_check.mjs --capture-facebook --capture-dcard "${SOCIAL_ARGS[@]}" | tee "$RUN_LOG"
else
  "$NODE_BIN" scripts/daily_social_update_check.mjs "${SOCIAL_ARGS[@]}" | tee "$RUN_LOG"
fi
"$NODE_BIN" scripts/daily_social_update_check.mjs "${SOCIAL_ARGS[@]}" > "$STATUS_FILE"
if [[ "$CAPTURE" == "1" ]]; then
  fallback_args=("${(@f)$("$NODE_BIN" scripts/social_capture_fallback_args.mjs "$STATUS_FILE")}")
  if (( ${#fallback_args[@]} )); then
    echo
    echo "== 3B. Profile capture was incomplete; retrying no-API single-post/current-page fallback =="
    "$NODE_BIN" scripts/daily_social_update_check.mjs --capture-facebook --capture-dcard "${fallback_args[@]}" | tee -a "$RUN_LOG"
    "$NODE_BIN" scripts/daily_social_update_check.mjs "${fallback_args[@]}" > "$STATUS_FILE"
  fi
fi
cat "$STATUS_FILE"
echo

echo "== 4. Reader and reference QA =="
"$NODE_BIN" scripts/audit_references.mjs
"$NODE_BIN" scripts/audit_reader_experience.mjs
"$NODE_BIN" scripts/audit_english_localization.mjs
"$NODE_BIN" scripts/audit_cover_visual_consistency.mjs
echo

echo "== 5. PM health after daily run =="
"$NODE_BIN" scripts/audit_daily_pm_health.mjs | tee "$PM_FILE"
echo

echo "== 6. Worktree status =="
git status --short
echo

echo "== 7. Human-readable daily report =="
"$NODE_BIN" scripts/summarize_daily_status.mjs
echo

echo "== 8. Search and influence growth brief =="
"$NODE_BIN" scripts/generate_daily_growth_brief.mjs
echo

echo "== 9. Submit search-engine update signal =="
"$NODE_BIN" scripts/submit_indexnow.mjs || true
echo

if [[ "$STRICT" == "1" ]]; then
  "$NODE_BIN" scripts/audit_references.mjs --strict
  "$NODE_BIN" scripts/audit_reader_experience.mjs --strict
  "$NODE_BIN" scripts/audit_cover_visual_consistency.mjs --strict
  "$NODE_BIN" scripts/audit_daily_pm_health.mjs --strict
fi

echo "Daily status: $STATUS_FILE"
echo "Daily run log: $RUN_LOG"
echo "PM health: $PM_FILE"
echo "Regular Chrome readiness: $CHROME_FILE"
echo "Growth brief: ${DRUGNEWS_GROWTH_BRIEF_MD:-/private/tmp/drugnews-growth-brief.md}"
