#!/usr/bin/env zsh
set -euo pipefail

DEBUG_PORT="${DRUGNEWS_CHROME_DEBUG_PORT:-9222}"
PROFILE_DIR="${DRUGNEWS_CHROME_PROFILE:-/Users/jojo/Documents/藥時事/.drugnews-social-capture-chrome}"
CHROME_APP="${DRUGNEWS_CHROME_APP:-/Applications/Google Chrome.app}"
FB_URL="https://www.facebook.com/profile.php?id=61568446257142"
DCARD_URL="https://www.dcard.tw/@drugnews"

usage() {
  cat <<EOF
Usage: scripts/start_social_capture_chrome.sh [--check]

Starts a dedicated Drugnews Chrome window for Facebook/Dcard capture.

Environment overrides:
  DRUGNEWS_CHROME_DEBUG_PORT   default: 9222
  DRUGNEWS_CHROME_PROFILE      default: /Users/jojo/Documents/藥時事/.drugnews-social-capture-chrome
  DRUGNEWS_CHROME_APP          default: /Applications/Google Chrome.app

After the window opens, log in to Facebook and Dcard if needed, then run:
  npm run daily:social:capture
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ ! -d "$CHROME_APP" ]]; then
  echo "Google Chrome was not found at: $CHROME_APP" >&2
  exit 1
fi

if curl -fsS "http://127.0.0.1:${DEBUG_PORT}/json/version" >/dev/null 2>&1; then
  echo "Chrome remote debugging is already available at http://127.0.0.1:${DEBUG_PORT}"
  if [[ "${1:-}" == "--check" ]]; then
    exit 0
  fi
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

echo "Opened Drugnews capture Chrome."
echo "Profile: $PROFILE_DIR"
echo "Debug endpoint: http://127.0.0.1:${DEBUG_PORT}"
echo "If this is the first run, log in to Facebook and Dcard in that Chrome window, then run:"
echo "  npm run daily:social:capture"
