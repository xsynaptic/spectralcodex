#!/bin/bash
set -e

# Load environment from deploy/.env
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SITE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_DIR="$(cd "$SITE_DIR/.." && pwd)"

if [ -f "$DEPLOY_DIR/.env" ]; then
  source "$DEPLOY_DIR/.env"
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

echo "=== Deploy site ==="
echo "Target: $REMOTE_HOST"
echo ""

# Create server-side .env with only what docker-compose needs
echo "Preparing server environment..."
SERVER_ENV=$(cat <<EOF
# spectralcodex deployment paths
DEPLOY_MEDIA_PATH=${DEPLOY_MEDIA_PATH}

# Image server secret
IPX_SERVER_SECRET=${IPX_SERVER_SECRET}
EOF
)

# Sync Caddy config and certs to shared infra location
echo "Syncing Caddy config and certs..."
rsync -avz ${SSH_KEY:+-e "ssh -i $SSH_KEY"} \
  "$SITE_DIR/caddy/sites/" "$REMOTE_HOST:/opt/server/caddy/sites/"
rsync -avz ${SSH_KEY:+-e "ssh -i $SSH_KEY"} \
  "$SITE_DIR/certs/" "$REMOTE_HOST:/opt/server/certs/"

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
  "$SITE_DIR/" "$REMOTE_HOST:/opt/server/spectralcodex/"

# Write server-side .env
echo "Writing server environment..."
ssh $SSH_OPTS "$REMOTE_HOST" "cat > /opt/server/spectralcodex/.env << 'ENVEOF'
$SERVER_ENV
ENVEOF"

# Restart image server containers
echo "Restarting image server..."
ssh $SSH_OPTS "$REMOTE_HOST" "cd /opt/server/spectralcodex && docker compose pull && docker compose up -d --build"

echo ""
echo "Done! Check status:"
echo "  ssh $SSH_OPTS $REMOTE_HOST 'docker compose -f /opt/server/spectralcodex/docker-compose.yml ps'"
