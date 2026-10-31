#!/bin/sh
# Production startup: prepares Python deps and the frontend build, then serves API + UI.
# Platform notes:
#   - Deployed on Azure App Service (Linux) or Azure Container Apps.
#   - Dependencies installed into /home/venv so they survive restarts.
#   - Set PORT (default 8000) and secrets as Azure App Settings:
#     GEMMA_API_KEY, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, SECRET_KEY,
#     SESSION_COOKIE_SECURE, REQUIRE_AUTH, CORS_ORIGINS, ALLOWED_SCAN_ROOTS
set -e
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

PORT="${PORT:-8000}"

DB_FILE="$ROOT_DIR/backend/exit_capsule.db"
if [ -f "$DB_FILE" ]; then
  if ! python3 -c "import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); sys.exit(0 if c.execute('PRAGMA integrity_check').fetchone()[0]=='ok' else 1)" "$DB_FILE" 2>/dev/null; then
    BACKUP_DIR="/home/db-backups"
    mkdir -p "$BACKUP_DIR"
    BACKUP="$BACKUP_DIR/exit_capsule.db.corrupt-$(date +%Y%m%d%H%M%S)"
    mv "$DB_FILE" "$BACKUP"
    [ -f "$DB_FILE-wal" ] && mv "$DB_FILE-wal" "$BACKUP-wal"
    [ -f "$DB_FILE-shm" ] && mv "$DB_FILE-shm" "$BACKUP-shm"
    echo "startup.sh: corrupt database quarantined at $BACKUP (a fresh database will be created)"
  fi
fi

VENV_DIR="/home/venv"
if [ ! -x "$VENV_DIR/bin/python" ]; then
  echo "startup.sh: creating virtualenv in ${VENV_DIR}..."
  python3 -m venv "$VENV_DIR"
  "$VENV_DIR/bin/pip" install --no-cache-dir --upgrade pip
fi

STAMP="$VENV_DIR/.requirements-installed"
if [ ! -f "$STAMP" ] || ! cmp -s "$ROOT_DIR/requirements.txt" "$STAMP"; then
  echo "startup.sh: installing backend requirements..."
  "$VENV_DIR/bin/pip" install --no-cache-dir -q -r "$ROOT_DIR/requirements.txt"
  cp "$ROOT_DIR/requirements.txt" "$STAMP"
fi

# Ensure frontend dist exists
if [ ! -d frontend/dist ]; then
  echo "startup.sh: WARNING - frontend/dist missing, UI will not be served"
else
  echo "startup.sh: using existing frontend/dist build"
fi

cd backend
echo "startup.sh: starting uvicorn on 0.0.0.0:${PORT} (${VENV_DIR}/bin/python)"
exec "$VENV_DIR/bin/python" -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT}"
