#!/bin/bash
set -e

# Load environment from project root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$DEPLOY_DIR/.." && pwd)"

if [ -f "$PROJECT_ROOT/.env" ]; then
  source "$PROJECT_ROOT/.env"
fi

if [ -z "$DEPLOY_REMOTE_HOST" ]; then
  echo "ERROR: DEPLOY_REMOTE_HOST environment variable is required"
  echo "Example: DEPLOY_REMOTE_HOST=deploy@your-server.com"
  exit 1
fi

REMOTE_HOST="$DEPLOY_REMOTE_HOST"
SSH_KEY="${DEPLOY_SSH_KEY_PATH:-}"

SSH_OPTS=""
if [ -n "$SSH_KEY" ]; then
  SSH_OPTS="-i $SSH_KEY"
fi

echo "=== Deploy server ==="
echo "Target: $REMOTE_HOST"
echo ""

# Sync Caddy config and certs to shared infra location
echo "Syncing Caddy config and certs..."
rsync -avz ${SSH_KEY:+-e "ssh -i $SSH_KEY"} \
  "$DEPLOY_DIR/caddy/sites/" "$REMOTE_HOST:/opt/server/caddy/sites/"
rsync -avz ${SSH_KEY:+-e "ssh -i $SSH_KEY"} \
  "$DEPLOY_DIR/certs/" "$REMOTE_HOST:/opt/server/certs/"

# Reload Caddy to pick up config changes
echo "Reloading Caddy..."
ssh $SSH_OPTS "$REMOTE_HOST" "docker exec caddy caddy reload --config /etc/caddy/Caddyfile" || echo "Warning: Caddy reload failed (container may not be running)"

# Sync image server to project-specific location
echo "Syncing image server..."
rsync -avz --delete ${SSH_KEY:+-e "ssh -i $SSH_KEY"} \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude 'caddy' \
  --exclude 'certs' \
  --exclude 'scripts' \
  "$DEPLOY_DIR/" "$REMOTE_HOST:/opt/server/spectralcodex/"

# Restart image server containers
echo "Restarting image server..."
ssh $SSH_OPTS "$REMOTE_HOST" "cd /opt/server/spectralcodex && docker compose pull && docker compose up -d --build"

echo ""
echo "Done! Check status:"
echo "  ssh $SSH_OPTS $REMOTE_HOST 'docker compose -f /opt/server/spectralcodex/docker-compose.yml ps'"
