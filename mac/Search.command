#!/bin/bash
# Double-click this file on a Mac. It starts search and opens it.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="/opt/homebrew/bin:/usr/local/bin:${PATH:-}"

if ! command -v node >/dev/null 2>&1; then
  osascript -e 'display alert "Node.js 22 or newer is required" message "Install Node from https://nodejs.org and try again."'
  exit 1
fi

if [[ ! -d node_modules ]]; then
  npm install
fi

if ! curl -sf -o /dev/null "http://127.0.0.1:${PORT:-4173}/"; then
  node src/server.js >>/tmp/search.log 2>&1 &
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
    if curl -sf -o /dev/null "http://127.0.0.1:${PORT:-4173}/"; then
      break
    fi
    sleep 0.3
  done
fi

open "http://127.0.0.1:${PORT:-4173}"
