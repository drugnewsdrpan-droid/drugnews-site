#!/usr/bin/env zsh
set -euo pipefail

DEBUG_PORT="${DRUGNEWS_CHROME_DEBUG_PORT:-9222}"
PROFILE_DIR="${DRUGNEWS_CHROME_PROFILE:-/Users/jojo/Documents/藥時事/.drugnews-social-capture-chrome}"
CHROME_APP="${DRUGNEWS_CHROME_APP:-/Applications/Google Chrome.app}"
FB_URL="https://www.facebook.com/profile.php?id=61568446257142"
DCARD_URL="${DRUGNEWS_DCARD_PAGE_URL:-https://www.dcard.tw/f/persona_drugnews}"
DEBUG_URL="http://127.0.0.1:${DEBUG_PORT}/json/version"
TABS_URL="http://127.0.0.1:${DEBUG_PORT}/json/list"
NEW_TAB_URL="http://127.0.0.1:${DEBUG_PORT}/json/new"

usage() {
  cat <<EOF
Usage: scripts/start_social_capture_chrome.sh [--check]

Starts a dedicated Drugnews Chrome window for Facebook/Dcard capture.

Environment overrides:
  DRUGNEWS_CHROME_DEBUG_PORT   default: 9222
  DRUGNEWS_CHROME_PROFILE      default: /Users/jojo/Documents/藥時事/.drugnews-social-capture-chrome
  DRUGNEWS_CHROME_APP          default: /Applications/Google Chrome.app
  DRUGNEWS_DCARD_PAGE_URL      default: https://www.dcard.tw/f/persona_drugnews

After the window opens, log in to Facebook and Dcard if needed, then run:
  npm run daily:social:capture
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

ensure_social_tabs() {
  local tabs
  tabs="$(curl -fsS "$TABS_URL" 2>/dev/null || true)"
  if [[ "$tabs" == *"facebook.com"* && "$tabs" == *"dcard.tw"* ]]; then
    return 0
  fi
  if [[ "$tabs" != *"facebook.com"* ]]; then
    curl -fsS -X PUT "${NEW_TAB_URL}?${FB_URL}" >/dev/null 2>&1 || true
  fi
  if [[ "$tabs" != *"dcard.tw"* ]]; then
    curl -fsS -X PUT "${NEW_TAB_URL}?${DCARD_URL}" >/dev/null 2>&1 || true
  fi
}

if [[ ! -d "$CHROME_APP" ]]; then
  echo "Google Chrome was not found at: $CHROME_APP" >&2
  exit 1
fi

if curl -fsS "$DEBUG_URL" >/dev/null 2>&1; then
  ensure_social_tabs
  echo "Chrome remote debugging is already available at http://127.0.0.1:${DEBUG_PORT}"
  echo "Ensured Facebook and Dcard capture tabs are open."
  exit 0
else
  if [[ "${1:-}" == "--check" ]]; then
    echo "Chrome remote debugging is not available at http://127.0.0.1:${DEBUG_PORT}" >&2
    exit 1
  fi
fi

mkdir -p "$PROFILE_DIR"

open -na "$CHROME_APP" --args \
  --remote-debugging-port="$DEBUG_PORT" \
  --user-data-dir="$PROFILE_DIR" \
  --no-first-run \
  --disable-features=Translate \
  "$FB_URL" \
  "$DCARD_URL"

for _ in {1..30}; do
  if curl -fsS "$DEBUG_URL" >/dev/null 2>&1; then
    echo "Opened Drugnews capture Chrome."
    echo "Profile: $PROFILE_DIR"
    echo "Debug endpoint: http://127.0.0.1:${DEBUG_PORT}"
    echo "If this is the first run, log in to Facebook and Dcard in that Chrome window, then run:"
    echo "  npm run daily:social:capture"
    exit 0
  fi
  sleep 0.5
done

echo "Opened Drugnews capture Chrome."
echo "Profile: $PROFILE_DIR"
echo "But Chrome remote debugging did not become available at http://127.0.0.1:${DEBUG_PORT} within 15 seconds." >&2
echo "Close any stale Drugnews capture Chrome windows and run this command again." >&2
exit 1
