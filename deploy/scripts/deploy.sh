#!/bin/bash
set -e

# Load environment from project root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ -f "$PROJECT_ROOT/.env" ]; then
  source "$PROJECT_ROOT/.env"
fi

REMOTE_HOST="${DEPLOY_REMOTE_HOST:-deploy@spectralcodex.com}"
REMOTE_PATH="/opt/server"
SSH_KEY="${DEPLOY_SSH_KEY_PATH:-}"

SSH_OPTS=""
if [ -n "$SSH_KEY" ]; then
  SSH_OPTS="-i $SSH_KEY"
fi

echo "=== Deploy Server Configuration ==="
echo "Target: $REMOTE_HOST:$REMOTE_PATH"
echo ""

# Sync deploy directory to remote (Docker builds IPX on server)
echo "Syncing server configs..."
cd "$SCRIPT_DIR/.."
rsync -avz --delete \
  ${SSH_KEY:+-e "ssh -i $SSH_KEY"} \
  --exclude 'node_modules' \
  --exclude '.env' \
  . "$REMOTE_HOST:$REMOTE_PATH/"

# Restart containers on remote
echo "Restarting containers..."
ssh $SSH_OPTS "$REMOTE_HOST" "cd $REMOTE_PATH && docker compose pull && docker compose up -d --build"

echo ""
echo "Done! Check status:"
echo "  ssh $REMOTE_HOST 'cd $REMOTE_PATH && docker compose ps'"
