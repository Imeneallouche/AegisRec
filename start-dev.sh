#!/usr/bin/env bash
# Start AegisRec API (FastAPI) and React dev server together.
#
# Usage:
#   ./start-dev.sh
#   chmod +x start-dev.sh   # first time, if needed
#
# Optional environment (defaults shown):
#   AEGISREC_API_HOST=127.0.0.1
#   AEGISREC_API_PORT=8000
#   AEGISREC_JWT_SECRET=dev-local-change-me
#   AEGISREC_PROXY_TARGET=http://127.0.0.1:8000  → CRA dev proxy for /api only (default derived from host+port)
#   BROWSER=none            # set to empty to let CRA open a browser
#
# MITRE ICS learning API (separate process; default port 8090 per MITRE config/learning.yml):
#   cd MITRE-ATTACK-for-ICS-Detection-and-Correlation-Engine && python -m learning.cli serve
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT/app/server"
FRONTEND_DIR="$ROOT/app/client"
VENV="$BACKEND_DIR/.venv"

export AEGISREC_API_HOST="${AEGISREC_API_HOST:-127.0.0.1}"
export AEGISREC_API_PORT="${AEGISREC_API_PORT:-8000}"
export AEGISREC_JWT_SECRET="${AEGISREC_JWT_SECRET:-dev-local-change-me}"

# CRA setupProxy forwards /api only. Leave REACT_APP_API_URL unset so the SPA uses
# same-origin /api (avoids webpack HMR *.hot-update.json requests hitting FastAPI).
export AEGISREC_PROXY_TARGET="http://${AEGISREC_API_HOST}:${AEGISREC_API_PORT}"
unset REACT_APP_API_URL 2>/dev/null || true

export BROWSER="${BROWSER:-none}"

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  trap - INT TERM HUP EXIT
  if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
}

trap cleanup INT TERM HUP EXIT

if [[ ! -d "$BACKEND_DIR" ]] || [[ ! -d "$FRONTEND_DIR" ]]; then
  echo "error: expected $BACKEND_DIR and $FRONTEND_DIR under $ROOT" >&2
  exit 1
fi

if [[ ! -d "$VENV" ]]; then
  echo "==> Creating Python venv: $VENV"
  python3 -m venv "$VENV"
fi
# shellcheck source=/dev/null
source "$VENV/bin/activate"

if ! python -c "import fastapi, uvicorn" 2>/dev/null; then
  echo "==> Installing Python dependencies"
  pip install -r "$BACKEND_DIR/requirements.txt"
fi

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "==> Installing npm dependencies"
  (cd "$FRONTEND_DIR" && npm install)
fi

echo "==> API:   http://${AEGISREC_API_HOST}:${AEGISREC_API_PORT}  (docs: /docs)"
echo "==> UI:    http://localhost:3000"
echo "==> Stop:  Ctrl+C"
echo

(
  cd "$BACKEND_DIR"
  exec uvicorn aegisrec.main:app --host "$AEGISREC_API_HOST" --port "$AEGISREC_API_PORT"
) &
BACKEND_PID=$!

# Brief wait so the UI does not hit the API before it binds.
for _ in $(seq 1 50); do
  if python - "$AEGISREC_API_HOST" "$AEGISREC_API_PORT" <<'PY' 2>/dev/null; then
import socket, sys
h, p = sys.argv[1], int(sys.argv[2])
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(0.2)
try:
    s.connect((h, p))
except OSError:
    sys.exit(1)
else:
    sys.exit(0)
finally:
    s.close()
PY
    break
  fi
  sleep 0.1
done

(
  cd "$FRONTEND_DIR"
  exec npm start
) &
FRONTEND_PID=$!

wait "$FRONTEND_PID"
