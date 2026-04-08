#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() {
  jobs -p | xargs -r kill 2>/dev/null || true
}

trap cleanup EXIT INT TERM

(
  cd "$ROOT_DIR/server"
  npm run dev 2>&1 | sed 's/^/[server] /'
) &
SERVER_PID=$!

(
  cd "$ROOT_DIR/frontend"
  npm run dev 2>&1 | sed 's/^/[frontend] /'
) &
FRONTEND_PID=$!

wait -n "$SERVER_PID" "$FRONTEND_PID"
EXIT_CODE=$?

cleanup
wait "$SERVER_PID" "$FRONTEND_PID" 2>/dev/null || true

exit "$EXIT_CODE"
